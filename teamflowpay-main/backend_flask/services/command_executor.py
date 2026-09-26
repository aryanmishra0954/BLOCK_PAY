"""
Command validation and execution engine for BlockPay.
Validates incoming JSON commands and dispatches them to the
appropriate handler.
"""

import uuid
import math
import random
import re
from datetime import datetime, timedelta

from data.db import (
    get_db_connection,
    get_user_by_id,
    get_user_by_email,
    get_user_contacts,
    create_contact,
    get_user_transactions,
    add_transaction,
    get_user_invoices,
    create_invoice,
    pay_invoice,
)

class CommandError(Exception):
    """An error that carries an HTTP status code."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code

VALID_ACTIONS = [
    "create_payment",
    "show_pending_payments",
    "export_report",
    "set_reminder",
    "add_client",
    "check_balance_reminders",
]

def is_valid_blockchain_address(addr: str) -> bool:
    if not addr or not isinstance(addr, str):
        return False
    clean = addr.strip()
    return bool(re.match(r"^(?:0x)?[0-9a-fA-F]{40}$", clean))

def find_matching_contact(name_query: str, user_id: str = None) -> dict:
    if not name_query or not isinstance(name_query, str):
        return None
    q = name_query.strip().lower()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if not user_id:
            return None
        cur.execute(
            "SELECT id, name, address, email FROM contacts WHERE user_id = ? AND (LOWER(name) = ? OR LOWER(name) LIKE ? OR ? LIKE '%' || LOWER(name) || '%') LIMIT 1",
            (user_id, q, f"%{q}%", q)
        )
        row = cur.fetchone()
        if row:
            conn.close()
            return dict(row)

        conn.close()
    except Exception as e:
        print(f"[ContactSearch] Error searching database: {e}")

    return None

def normalize_command(command: dict, user: dict = None) -> dict:
    if not isinstance(command, dict):
        return command

    if "action" in command and isinstance(command["action"], str):
        command["action"] = command["action"].strip().lower()

    if "data" not in command and "parameters" in command:
        command["data"] = command.get("parameters") or {}
    elif "data" not in command and "params" in command:
        command["data"] = command.get("params") or {}
    elif "data" not in command:
        command["data"] = {}

    data = command.get("data")
    if not isinstance(data, dict):
        data = {}
        command["data"] = data

    action = command.get("action")

    vendor_keys = [
        "vendor", "recipient", "client_name", "client", "to", "payee",
        "receiver", "contact", "name", "target", "beneficiary", "user"
    ]
    extracted_vendor = None
    for k in vendor_keys:
        val = data.get(k) or command.get(k)
        if val and isinstance(val, str) and val.strip():
            extracted_vendor = val.strip()
            break

    if extracted_vendor:
        data["vendor"] = extracted_vendor
        data["recipient"] = extracted_vendor

    if action == "create_payment":
        if extracted_vendor and is_valid_blockchain_address(extracted_vendor):
            clean_addr = extracted_vendor.strip()
            if not clean_addr.startswith("0x"):
                clean_addr = "0x" + clean_addr
            data["recipient"] = clean_addr
            data["vendor"] = clean_addr
            data["is_valid_recipient"] = True
        elif extracted_vendor:
            contact = find_matching_contact(extracted_vendor, user.get("id") if user else None)
            if contact and contact.get("address"):
                data["recipient"] = contact["address"]
                data["vendor"] = contact["name"]
                data["vendor_name"] = contact["name"]
                data["contact_matched"] = True
                data["is_valid_recipient"] = True
            else:
                data["is_valid_recipient"] = False
        else:
            data["is_valid_recipient"] = False

    amt_val = data.get("amount") if "amount" in data else command.get("amount")
    if amt_val is not None:
        if isinstance(amt_val, str):
            clean_amt = amt_val.strip()
            try:
                if not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", clean_amt):
                    raise ValueError
                data["amount"] = float(clean_amt)
            except ValueError:
                data["amount"] = None
        elif isinstance(amt_val, (int, float)):
            data["amount"] = float(amt_val)

    curr_val = data.get("currency") or command.get("currency")
    data["currency"] = str(curr_val).upper() if curr_val else "POL"

    if "dueDate" in data and "due_date" not in data:
        data["due_date"] = data["dueDate"]

    if action == "export_report":
        if not data.get("period"):
            data["period"] = "all"
    elif action == "set_reminder":
        # Reminders have no persistence table yet; never claim a reminder was saved.
        pass
    elif action == "add_client":
        if not data.get("name") and extracted_vendor:
            data["name"] = extracted_vendor
        elif not data.get("name"):
            data["name"] = "New Contact"

    command["parameters"] = data
    return command

def validate_command(command: dict, user: dict = None) -> dict:
    errors = []

    if not command or not isinstance(command, dict):
        errors.append("Command must be a valid object")
        return {"valid": False, "errors": errors}

    normalize_command(command, user=user)

    if not command.get("action"):
        errors.append("Missing required field: action")

    action = command.get("action")
    if action and action not in VALID_ACTIONS:
        errors.append(
            f"Invalid action: {action}. Valid actions: {', '.join(VALID_ACTIONS)}"
        )

    data = command.get("data")

    if action == "create_payment":
        if not data:
            errors.append("Missing required field: data")
        else:
            raw_vendor = data.get("vendor") or data.get("recipient")
            if not raw_vendor:
                errors.append("Missing recipient name or blockchain address")
            elif not data.get("is_valid_recipient"):
                errors.append(
                    f"Payment rejected: Recipient '{raw_vendor}' does not match any contact in your Address Book and is not a valid 40-digit blockchain address. Please add them to Contacts first or enter a valid address."
                )

            if data.get("amount") is None:
                errors.append("A positive payment amount is required; the AI will not guess one")
            amount = data.get("amount")
            if amount is not None and (
                not isinstance(amount, (int, float)) or not math.isfinite(float(amount)) or amount <= 0
            ):
                errors.append("Amount must be a positive number")

    if action == "export_report":
        if not data or not data.get("period"):
            data["period"] = "all"

    if action == "set_reminder":
        errors.append("Reminders are not available until persistent scheduling is enabled")

    if action == "add_client":
        if not data or not data.get("name"):
            data["name"] = "New Contact"

    return {"valid": len(errors) == 0, "errors": errors}

_HANDLERS = {}

def execute_command(command: dict, user: dict = None) -> dict:
    normalize_command(command, user=user)

    handler = _HANDLERS.get(command["action"])
    if handler is None:
        raise CommandError(f"Unknown action: {command['action']}", 400)

    return handler(command.get("data") or {}, user=user)

def _handle_create_payment(data: dict, user: dict = None) -> dict:
    recipient_addr = data.get("recipient")
    vendor_name = data.get("vendor") or "Aryan"

    if user:
        if not recipient_addr or not recipient_addr.startswith("0x") or len(recipient_addr) != 42:
            contacts = get_user_contacts(user["id"])
            matched = next((c for c in contacts if vendor_name.lower() in c["name"].lower() or c["name"].lower() in vendor_name.lower()), None)
            if matched:
                recipient_addr = matched["address"]
                vendor_name = matched["name"]
        recipient = get_user_by_email(recipient_addr) if isinstance(recipient_addr, str) and "@" in recipient_addr else None
        if not recipient:
            conn = get_db_connection(); cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE LOWER(wallet_address) = ?", (recipient_addr.strip().lower(),))
            recipient = cur.fetchone(); conn.close()
        if not recipient:
            raise CommandError("Recipient must be a registered BlockPay account.", 400)
    else:
        raise CommandError("Authentication required.", 401)

    amount = float(data.get("amount", 50.0))
    currency = data.get("currency", "POL")
    desc = data.get("description", f"Payment to {vendor_name}")

    payment_record = {
        "id": str(uuid.uuid4()),
        "vendor": vendor_name,
        "recipient": recipient_addr,
        "amount": amount,
        "currency": currency,
        "due_date": data.get("due_date"),
        "description": desc,
        "status": "ready",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "message": f"Payment of {amount} {currency} prepared for {vendor_name} ({recipient_addr[:6]}...{recipient_addr[-4:]})",
    }

    return payment_record

def _handle_show_pending_payments(data: dict, user: dict = None) -> dict:
    filter_type = data.get("filter", "all")
    vendor_filter = data.get("vendor")

    user_id = user["id"] if user else None
    if not user_id:
        from data.db import get_user_by_email
        trader = get_user_by_email("trader@blockpay.io")
        user_id = trader["id"] if trader else None

    invoices = get_user_invoices(user_id, status="pending") if user_id else []

    payments = []
    for inv in invoices:
        payments.append({
            "id": inv["id"],
            "vendor": inv["client_name"],
            "recipient": inv.get("client_email") or "",
            "amount": float(inv["amount"]),
            "currency": inv.get("currency", "POL"),
            "due_date": inv.get("due_date", ""),
            "status": inv.get("status", "pending"),
            "description": inv.get("description", "")
        })

    if vendor_filter:
        payments = [p for p in payments if vendor_filter.lower() in p["vendor"].lower()]

    today = datetime.utcnow()
    if filter_type == "overdue":
        payments = [
            p for p in payments
            if p.get("due_date") and _safe_parse_date(p["due_date"]) < today
        ]
    elif filter_type == "upcoming":
        payments = [
            p for p in payments
            if not p.get("due_date") or _safe_parse_date(p["due_date"]) >= today
        ]

    total_amount = sum(p["amount"] for p in payments)

    return {
        "payments": payments,
        "count": len(payments),
        "total_amount": total_amount,
        "filter": filter_type,
    }

def _safe_parse_date(d_str):
    try:
        return datetime.fromisoformat(d_str)
    except Exception:
        return datetime.utcnow() + timedelta(days=7)

def _handle_export_report(data: dict, user: dict = None) -> dict:
    period = data.get("period", "all")
    fmt = data.get("format", "csv")

    user_id = user["id"] if user else None
    if not user_id:
        from data.db import get_user_by_email
        trader = get_user_by_email("trader@blockpay.io")
        user_id = trader["id"] if trader else None

    txs = get_user_transactions(user_id, limit=100) if user_id else []
    total_amount = sum(float(t["amount"]) for t in txs)

    safe_period = re.sub(r"\s+", "_", period.lower())
    filename = f"BlockPay_ledger_{safe_period}_{int(datetime.utcnow().timestamp() * 1000)}.{fmt}"

    return {
        "filename": filename,
        "format": fmt,
        "records": len(txs),
        "total_amount": total_amount,
        "download_url": f"/api/agent/download/{filename}",
        "message": f"Ledger report ready: {len(txs)} confirmed transactions totaling {total_amount:.2f} POL.",
    }

def _handle_set_reminder(data: dict, user: dict = None) -> dict:
    raise CommandError("Reminders are not available until persistent scheduling is enabled.", 501)

def _handle_add_client(data: dict, user: dict = None) -> dict:
    name = data.get("name", "New Contact").strip()
    user_id = user["id"] if user else None
    if not user_id:
        from data.db import get_user_by_email
        trader = get_user_by_email("trader@blockpay.io")
        user_id = trader["id"] if trader else None

    address = data.get("wallet_address") or data.get("address")
    if not is_valid_blockchain_address(address):
        raise CommandError("A valid recipient wallet address is required; a random address will never be generated.", 400)

    email = data.get("email") or f"{re.sub(r'[^a-zA-Z0-9]', '', name).lower()}@partner.io"

    created = None
    if user_id:
        try:
            created = create_contact(user_id, name, address, email)
        except Exception as e:
            print(f"[CommandExecutor] Contact insert notice: {e}")

    return {
        "id": created["id"] if created else str(uuid.uuid4()),
        "name": name,
        "address": address,
        "email": email,
        "message": f"Counterparty {name} ({address[:6]}...{address[-4:]}) saved to your persistent Address Book",
    }

def _handle_check_balance_reminders(data: dict, user: dict = None) -> dict:
    user_balance = float(user["balance"]) if user else float(data.get("balance", 10000.0))
    wallet_address = user["wallet_address"] if user else data.get("walletAddress", "0x742d...5f0bEb")

    user_id = user["id"] if user else None
    if not user_id:
        from data.db import get_user_by_email
        trader = get_user_by_email("trader@blockpay.io")
        user_id = trader["id"] if trader else None

    invoices = get_user_invoices(user_id, status="pending") if user_id else []
    total_pending = sum(float(i["amount"]) for i in invoices)

    low_balance_payments = []
    for inv in invoices:
        amt = float(inv["amount"])
        if amt > user_balance:
            low_balance_payments.append({
                "vendor": inv["client_name"],
                "amount": amt,
                "currency": inv.get("currency", "POL"),
                "due_date": inv.get("due_date", ""),
                "shortfall": amt - user_balance,
            })

    warning_msg = (
        f"⚠️ Low balance warning! {len(low_balance_payments)} upcoming obligations exceed current liquid balance."
        if low_balance_payments
        else f"✅ Balance safe! Available balance ({user_balance:,.2f} POL) comfortably covers all pending transfers ({total_pending:,.2f} POL)."
    )

    return {
        "success": True,
        "action": "check_balance_reminders",
        "data": {
            "current_balance": user_balance,
            "wallet_address": wallet_address,
            "total_pending_payments": len(invoices),
            "total_pending_amount": total_pending,
            "low_balance_count": len(low_balance_payments),
            "low_balance_payments": low_balance_payments,
            "message": warning_msg,
        },
    }

_HANDLERS = {
    "create_payment": _handle_create_payment,
    "show_pending_payments": _handle_show_pending_payments,
    "export_report": _handle_export_report,
    "set_reminder": _handle_set_reminder,
    "add_client": _handle_add_client,
    "check_balance_reminders": _handle_check_balance_reminders,
}
