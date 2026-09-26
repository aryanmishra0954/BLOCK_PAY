"""
BlockPay Authentication Routes
Handles real user registration, secure password hashing, and session management.
"""

import os
import secrets
import requests
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
from eth_account.messages import encode_defunct
from eth_account import Account

from data.db import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_token,
    get_user_by_wallet,
    create_web3_user,
    create_or_get_google_user,
    update_user_token,
    update_user_password,
    set_web3_nonce,
    get_web3_nonce,
    delete_web3_nonce,
)
from config import Config

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

def _sanitize_user(user: dict) -> dict:
    """Return a safe user dict without password hash."""
    if not user:
        return None
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "wallet_address": user["wallet_address"],
        "balance": float(user["balance"]),
        "auth_provider": user.get("auth_provider") or "email",
        "avatar_url": user.get("avatar_url"),
        "created_at": user["created_at"],
        "last_login": user.get("last_login"),
    }

def _get_token_from_request():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return request.args.get("token") or request.headers.get("X-Auth-Token")

@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user with real hashed password and deterministic or custom wallet."""
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    wallet_address = data.get("wallet_address", "").strip()

    if not email or "@" not in email:
        return jsonify({"success": False, "error": "A valid email address is required."}), 400
    if not password or len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters."}), 400
    if not full_name:
        full_name = email.split("@")[0].capitalize()

    existing = get_user_by_email(email)
    if existing:
        return jsonify({"success": False, "error": "An account with this email already exists. Please sign in."}), 409

    if not wallet_address or not wallet_address.startswith("0x"):
        wallet_address = "0x" + secrets.token_hex(20)

    password_hash = generate_password_hash(password)
    user = create_user(
        email=email,
        password_hash=password_hash,
        full_name=full_name,
        wallet_address=wallet_address,
        initial_balance=0.0,
    )

    token = secrets.token_hex(32)
    update_user_token(user["id"], token)
    user["token"] = token

    return jsonify({
        "success": True,
        "message": "Account created successfully.",
        "token": token,
        "user": _sanitize_user(user),
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user with email and password."""
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required."}), 400

    user = get_user_by_email(email)
    if not user:
        return jsonify({"success": False, "error": "Invalid email or password."}), 401

    if user.get("password_hash") == "GOOGLE_OAUTH_AUTHENTICATED":
        new_hash = generate_password_hash(password)
        update_user_password(user["id"], new_hash)
        user["password_hash"] = new_hash
    elif not check_password_hash(user["password_hash"], password):
        return jsonify({"success": False, "error": "Invalid email or password."}), 401

    token = secrets.token_hex(32)
    update_user_token(user["id"], token)

    return jsonify({
        "success": True,
        "message": "Signed in successfully.",
        "token": token,
        "user": _sanitize_user(user),
    }), 200

@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    """Retrieve current authenticated user from token."""
    token = _get_token_from_request()
    if not token:
        return jsonify({"success": False, "error": "Missing authorization token."}), 401

    user = get_user_by_token(token)
    if not user:
        return jsonify({"success": False, "error": "Invalid or expired session token."}), 401

    return jsonify({
        "success": True,
        "user": _sanitize_user(user),
    }), 200

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Invalidate current session."""
    token = _get_token_from_request()
    if token:
        user = get_user_by_token(token)
        if user:
            update_user_token(user["id"], None)
    return jsonify({"success": True, "message": "Successfully logged out."}), 200

@auth_bp.route("/web3/nonce", methods=["GET"])
def get_nonce():
    """Generate a cryptographic challenge nonce for a wallet address."""
    address = request.args.get("address", "").strip()
    if not address or not address.startswith("0x") or len(address) != 42:
        return jsonify({"success": False, "error": "A valid 42-character EVM address is required."}), 400

    nonce = secrets.token_hex(16)
    set_web3_nonce(address, nonce)
    issued_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    message = (
        f"Sign in to BlockPay\n\n"
        f"Wallet: {address}\n"
        f"Nonce: {nonce}\n"
        f"Issued: {issued_at}\n\n"
        f"Sign this one-time challenge to authenticate with your wallet."
    )

    return jsonify({
        "success": True,
        "address": address,
        "nonce": nonce,
        "message": message,
    }), 200

@auth_bp.route("/web3/verify", methods=["POST"])
def verify_web3():
    """Verify cryptographic signature from MetaMask / Web3 wallet."""
    data = request.get_json() or {}
    address = data.get("address", "").strip()
    signature = data.get("signature", "").strip()
    message = data.get("message", "").strip()

    if not address or not signature or not message:
        return jsonify({"success": False, "error": "Address, signature, and message are required."}), 400

    expected_nonce = get_web3_nonce(address)
    if not expected_nonce or expected_nonce not in message:
        return jsonify({
            "success": False,
            "error": "Invalid or expired challenge nonce. Please request a new signature."
        }), 400

    try:
        signable_message = encode_defunct(text=message)
        recovered_address = Account.recover_message(signable_message, signature=signature)
        if recovered_address.lower() != address.lower():
            return jsonify({
                "success": False,
                "error": f"Signature verification failed. Recovered address ({recovered_address}) does not match supplied wallet ({address})."
            }), 401
    except Exception as err:
        return jsonify({"success": False, "error": f"Cryptographic verification error: {str(err)}"}), 400

    delete_web3_nonce(address)

    user = get_user_by_wallet(address)
    if not user:
        user = create_web3_user(wallet_address=address, initial_balance=0.0)

    token = secrets.token_hex(32)
    update_user_token(user["id"], token)
    user["token"] = token

    return jsonify({
        "success": True,
        "message": "Authenticated successfully with MetaMask.",
        "token": token,
        "user": _sanitize_user(user),
    }), 200

@auth_bp.route("/google/verify", methods=["POST"])
def verify_google():
    """Verify a Google OpenID Connect ID token and create/retrieve user."""
    data = request.get_json() or {}
    id_token = (data.get("id_token") or data.get("credential") or "").strip()
    if not id_token:
        return jsonify({"success": False, "error": "A signed Google ID token is required."}), 401
    try:
        token_resp = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=5,
        )
        claims = token_resp.json() if token_resp.ok else {}
        if not token_resp.ok or claims.get("email_verified") not in (True, "true"):
            raise ValueError("Google token is invalid or the email is not verified.")
        if Config.GOOGLE_CLIENT_ID and claims.get("aud") != Config.GOOGLE_CLIENT_ID:
            raise ValueError("Google token audience does not match this application.")
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 401

    # Claims from the verified token are authoritative; browser-supplied profile fields are ignored.
    data = {**data, "email": claims.get("email"), "name": claims.get("name"),
            "picture": claims.get("picture"), "google_id": claims.get("sub")}
    email = data.get("email", "").strip().lower()
    full_name = data.get("name", "").strip() or data.get("full_name", "").strip()
    google_id = data.get("google_id") or data.get("sub") or data.get("id")
    avatar_url = data.get("picture") or data.get("avatar_url")
    wallet_address = data.get("wallet_address") or data.get("address")

    if not email or "@" not in email:
        return jsonify({"success": False, "error": "A valid Google email address is required."}), 400

    if not full_name:
        full_name = email.split("@")[0].capitalize()

    user = create_or_get_google_user(
        email=email,
        full_name=full_name,
        google_id=str(google_id) if google_id else None,
        avatar_url=avatar_url,
        wallet_address=wallet_address,
        initial_balance=0.0,
    )

    token = secrets.token_hex(32)
    update_user_token(user["id"], token)
    user["token"] = token

    return jsonify({
        "success": True,
        "message": "Signed in successfully with Google.",
        "token": token,
        "user": _sanitize_user(user),
    }), 200
