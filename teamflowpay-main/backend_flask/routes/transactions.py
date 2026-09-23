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
)

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")

def _get_token_from_request():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return request.args.get("token") or request.headers.get("X-Auth-Token")

@transactions_bp.route("", methods=["GET"])
@transactions_bp.route("/", methods=["GET"])
def get_transactions():
    """Get all transactions for the authenticated user."""
    token = _get_token_from_request()
    user = get_user_by_token(token) if token else None

    if not user:
        email = request.args.get("email")
        if email:
            user = get_user_by_email(email)

    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

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
    """Record a new on-chain or off-chain transfer."""
    token = _get_token_from_request()
    user = get_user_by_token(token) if token else None

    data = request.get_json() or {}
    if not user:
        email = data.get("user_email")
        if email:
            user = get_user_by_email(email)

    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

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
