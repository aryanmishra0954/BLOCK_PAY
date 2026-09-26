"""
BlockPay Transaction Routes
Handles transaction recording, ledger retrieval, and balance synchronizations.
"""

from datetime import datetime, timezone, timedelta
import math
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
    get_user_invoices,
    create_invoice,
    pay_invoice,
    transfer_between_users,
    record_test_funding,
    get_transaction_by_hash,
)

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")

def _get_token_from_request():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return request.args.get("token") or request.headers.get("X-Auth-Token")

def _resolve_user():
    token = _get_token_from_request()
    return get_user_by_token(token) if token else None

@transactions_bp.route("", methods=["GET"])
@transactions_bp.route("/", methods=["GET"])
def get_transactions():
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    limit = int(request.args.get("limit", 50))
    txs = get_user_transactions(user["id"], limit=limit)
    invoices = get_user_invoices(user["id"], status="pending")

    return jsonify({
        "success": True,
        "balance": float(user["balance"]),
        "transactions": txs,
        "pending_invoices": invoices,
        "pending_invoices_count": len(invoices),
    }), 200

@transactions_bp.route("", methods=["POST"])
@transactions_bp.route("/", methods=["POST"])
def record_transaction():
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    data = request.get_json() or {}

    tx_type = data.get("type", "sent")
    try:
        amount = float(data.get("amount", 0))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Amount must be a valid number."}), 400
    counterparty_address = data.get("counterparty_address") or data.get("address", "")
    counterparty_name = data.get("counterparty_name") or data.get("recipient", "")
    tx_hash = data.get("hash") or data.get("tx_hash", "")
    currency = data.get("currency", "POL")
    note = data.get("note", "")

    if not math.isfinite(amount) or amount <= 0:
        return jsonify({"success": False, "error": "Amount must be a finite number greater than zero."}), 400
    if not counterparty_address:
        return jsonify({"success": False, "error": "Counterparty address is required."}), 400

    if tx_type not in ("sent", "received"):
        return jsonify({"success": False, "error": "Unsupported transaction type."}), 400
    if tx_type == "received":
        return jsonify({"success": False, "error": "Incoming funds must use the test-funding flow."}), 400

    if not tx_hash:
        import secrets
        tx_hash = "0x" + secrets.token_hex(32)

    mode = data.get("mode", "internal")
    try:
        existing = get_transaction_by_hash(tx_hash, user["id"])
        if existing:
            same_request = (float(existing["amount"]) == amount and
                            str(existing.get("counterparty_address", "")).lower() == str(counterparty_address).lower())
            if not same_request:
                return jsonify({"success": False, "error": "Transaction hash was already used for a different payment."}), 409
            fresh = get_user_by_id(user["id"])
            return jsonify({"success": True, "idempotent_replay": True, "transaction": existing,
                            "new_balance": float(fresh["balance"]) if fresh else user["balance"]}), 200
        if mode == "internal":
            sender, _recipient, tx_id = transfer_between_users(user["id"], counterparty_address, amount, tx_hash, currency, note)
            tx = get_user_transactions(user["id"], limit=1)[0]
        elif mode == "on_chain":
            tx = add_transaction(user_id=user["id"], tx_type="sent", amount=amount,
                counterparty_address=counterparty_address, counterparty_name=counterparty_name,
                tx_hash=tx_hash, currency=currency, note=note, status="submitted")
            sender = get_user_by_id(user["id"])
        else:
            return jsonify({"success": False, "error": "Unsupported transfer mode."}), 400
    except (ValueError, LookupError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    fresh_user = get_user_by_id(user["id"])

    return jsonify({
        "success": True,
        "transaction": tx,
        "new_balance": float(fresh_user["balance"]) if fresh_user else user["balance"],
    }), 201

@transactions_bp.route("/fund", methods=["POST"])
def fund_test_balance():
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401
    try:
        amount = float((request.get_json() or {}).get("amount", 0))
        updated = record_test_funding(user["id"], amount)
    except (TypeError, ValueError, LookupError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    return jsonify({"success": True, "amount": amount, "balance": float(updated["balance"])}), 201

@transactions_bp.route("/invoices", methods=["GET"])
def get_invoices():
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401
    status = request.args.get("status")
    invs = get_user_invoices(user["id"], status=status)
    return jsonify({
        "success": True,
        "invoices": invs,
        "count": len(invs),
    }), 200

@transactions_bp.route("/invoices", methods=["POST"])
def record_invoice():
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401
    data = request.get_json() or {}
    client_name = data.get("client_name") or data.get("vendor", "Client")
    amount = float(data.get("amount", 0))
    if amount <= 0:
        return jsonify({"success": False, "error": "Amount must be greater than zero."}), 400

    due_date = data.get("due_date") or (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%d")
    currency = data.get("currency", "POL")
    client_email = data.get("client_email", "")
    description = data.get("description", "")

    inv = create_invoice(user["id"], client_name, amount, due_date, currency, client_email, description)
    return jsonify({
        "success": True,
        "invoice": inv,
    }), 201

@transactions_bp.route("/invoices/<invoice_id>/pay", methods=["POST"])
def pay_invoice_route(invoice_id):
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401
    try:
        inv = pay_invoice(invoice_id, user["id"])
    except (TypeError, ValueError, LookupError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    if not inv:
        return jsonify({"success": False, "error": "Invoice not found."}), 404
    return jsonify({
        "success": True,
        "invoice": inv,
    }), 200
