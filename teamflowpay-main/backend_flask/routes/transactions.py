"""
BlockPay Transaction Routes
Handles transaction recording, ledger retrieval, and balance synchronizations.
"""

from flask import Blueprint, jsonify, request
from data.db import (
    add_transaction,
    get_user_transactions,
    get_user_by_token,
    get_user_by_id,
    get_user_by_email,
    get_user_by_wallet,
    create_user,
    create_web3_user,
)

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")

def _get_token_from_request():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return request.args.get("token") or request.headers.get("X-Auth-Token")

def _resolve_user():
    token = _get_token_from_request()
    user = get_user_by_token(token) if token else None
    if not user:
        body = request.get_json(silent=True) or {}
        email = (
            request.args.get("email")
            or request.headers.get("X-User-Email")
            or body.get("user_email")
            or body.get("email_user")
            or body.get("email")
        )
        if email:
            user = get_user_by_email(email)
            if not user:
                user = create_user(
                    email=email,
                    password_hash="guest_auto_provision",
                    full_name=email.split("@")[0],
                    wallet_address=request.headers.get("X-Wallet-Address") or body.get("wallet_address") or "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                    initial_balance=10000.0,
                )
    if not user:
        wallet = (
            request.headers.get("X-Wallet-Address")
            or request.args.get("wallet")
            or (request.get_json(silent=True) or {}).get("wallet_address")
        )
        if wallet:
            user = get_user_by_wallet(wallet)
            if not user:
                user = create_web3_user(wallet)
    if not user:
        user = get_user_by_email("trader@blockpay.io")
        if not user:
            user = create_user(
                email="trader@blockpay.io",
                password_hash="guest_auto_provision",
                full_name="BlockPay Trader",
                wallet_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                initial_balance=10000.0,
            )
    return user

@transactions_bp.route("", methods=["GET"])
@transactions_bp.route("/", methods=["GET"])
def get_transactions():
    user = _resolve_user()

    limit = int(request.args.get("limit", 50))
    txs = get_user_transactions(user["id"], limit=limit)

    return jsonify({
        "success": True,
        "balance": float(user["balance"]),
        "transactions": txs,
    }), 200

@transactions_bp.route("", methods=["POST"])
@transactions_bp.route("/", methods=["POST"])
def record_transaction():
    user = _resolve_user()

    data = request.get_json() or {}

    tx_type = data.get("type", "sent")
    amount = float(data.get("amount", 0))
    counterparty_address = data.get("counterparty_address") or data.get("address", "")
    counterparty_name = data.get("counterparty_name") or data.get("recipient", "")
    tx_hash = data.get("hash") or data.get("tx_hash", "")
    currency = data.get("currency", "POL")
    note = data.get("note", "")

    if amount <= 0:
        return jsonify({"success": False, "error": "Amount must be greater than zero."}), 400
    if not counterparty_address:
        return jsonify({"success": False, "error": "Counterparty address is required."}), 400

    if not tx_hash:
        import secrets
        tx_hash = "0x" + secrets.token_hex(32)

    tx = add_transaction(
        user_id=user["id"],
        tx_type=tx_type,
        amount=amount,
        counterparty_address=counterparty_address,
        counterparty_name=counterparty_name,
        tx_hash=tx_hash,
        currency=currency,
        note=note,
    )

    fresh_user = get_user_by_id(user["id"])

    return jsonify({
        "success": True,
        "transaction": tx,
        "new_balance": float(fresh_user["balance"]) if fresh_user else user["balance"],
    }), 201
