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

from data.database import db

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

def normalize_command(command: dict) -> dict:
    """Normalize fields like parameters -> data and recipient -> vendor."""
    if not isinstance(command, dict):
        return command
    if "data" not in command and "parameters" in command:
        command["data"] = command.get("parameters") or {}
    data = command.get("data")
    if isinstance(data, dict):
        if "recipient" in data and "vendor" not in data:
            data["vendor"] = data["recipient"]
        if "dueDate" in data and "due_date" not in data:
            data["due_date"] = data["dueDate"]
    return command

def validate_command(command: dict) -> dict:
    """Return ``{"valid": True/False, "errors": [...]}``."""

    errors = []

    if not command or not isinstance(command, dict):
        errors.append("Command must be a valid object")
        return {"valid": False, "errors": errors}

    normalize_command(command)

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
            if not data.get("vendor"):
                errors.append("Missing required field: data.vendor")
            if not data.get("amount"):
                errors.append("Missing required field: data.amount")
            amount = data.get("amount")
            if amount is not None and (
                not isinstance(amount, (int, float)) or amount <= 0
            ):
                errors.append("Amount must be a positive number")

    if action == "export_report":
        if not data or not data.get("period"):
            errors.append("Missing required field: data.period")

    if action == "set_reminder":
        if not data or not data.get("message"):
            errors.append("Missing required field: data.message")
        if not data or not data.get("date"):
            errors.append("Missing required field: data.date")

    if action == "add_client":
        if not data or not data.get("name"):
            errors.append("Missing required field: data.name")

    return {"valid": len(errors) == 0, "errors": errors}

_HANDLERS = {}

def execute_command(command: dict) -> dict:
    """Dispatch *command* to the matching handler and return its result."""

    normalize_command(command)

    handler = _HANDLERS.get(command["action"])
    if handler is None:
        raise CommandError(f"Unknown action: {command['action']}", 400)

    return handler(command.get("data") or {})

def _handle_create_payment(data: dict) -> dict:
    payment = {
        "id": str(uuid.uuid4()),
        "vendor": data["vendor"],
        "amount": data["amount"],
        "currency": data.get("currency", "INR"),
        "due_date": data.get("due_date"),
        "description": data.get("description", ""),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    vendor = db.get_client_by_name(data["vendor"])
    if not vendor:
        print(f"Vendor not found: {data['vendor']}. Creating payment anyway.")

    db.add_payment(payment)

    return {
        "id": payment["id"],
        "vendor": payment["vendor"],
        "amount": payment["amount"],
        "currency": payment["currency"],
        "due_date": payment["due_date"],
        "status": payment["status"],
        "message": f"Payment created successfully for {payment['vendor']}",
    }

def _handle_show_pending_payments(data: dict) -> dict:
    filter_type = data.get("filter", "all")
    vendor_filter = data.get("vendor")

    payments = [p for p in db.get_payments() if p["status"] == "pending"]

    if vendor_filter:
        payments = [
            p
            for p in payments
            if vendor_filter.lower() in p["vendor"].lower()
        ]

    today = datetime.utcnow()
    if filter_type == "overdue":
        payments = [
            p
            for p in payments
            if p.get("due_date") and datetime.fromisoformat(p["due_date"]) < today
        ]
    elif filter_type == "upcoming":
        payments = [
            p
            for p in payments
            if not p.get("due_date")
            or datetime.fromisoformat(p["due_date"]) >= today
        ]

    total_amount = sum(p["amount"] for p in payments)

    return {
        "payments": [
            {
                "id": p["id"],
                "vendor": p["vendor"],
                "amount": p["amount"],
                "currency": p["currency"],
                "due_date": p["due_date"],
                "status": p["status"],
            }
            for p in payments
        ],
        "count": len(payments),
        "total_amount": total_amount,
        "filter": filter_type,
    }

def _handle_export_report(data: dict) -> dict:
    period = data["period"]
    fmt = data.get("format", "csv")

    payments = db.get_payments()
    clients = db.get_clients()

    filtered = payments
    current_year = datetime.utcnow().year

    if "november" in period.lower():
        filtered = [
            p
            for p in payments
            if _parse_month_year(p.get("created_at")) == (10, current_year)
        ]

    total_amount = sum(p["amount"] for p in filtered)

    safe_period = re.sub(r"\s+", "_", period.lower())
    filename = f"BlockPay_report_{safe_period}_{int(datetime.utcnow().timestamp() * 1000)}.{fmt}"

    return {
        "filename": filename,
        "format": fmt,
        "records": len(filtered),
        "total_amount": total_amount,
        "download_url": f"/api/agent/download/{filename}",
        "message": f"Report exported successfully: {len(filtered)} records",
    }

def _handle_set_reminder(data: dict) -> dict:
    reminder = {
        "id": str(uuid.uuid4()),
        "message": data["message"],
        "date": data["date"],
        "time": data.get("time", "09:00"),
        "status": "active",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    db.add_reminder(reminder)

    return {
        "id": reminder["id"],
        "message": reminder["message"],
        "date": reminder["date"],
        "time": reminder["time"],
        "status": reminder["status"],
    }

def _handle_add_client(data: dict) -> dict:
    existing = db.get_client_by_name(data["name"])
    if existing:
        raise CommandError(f"Client already exists: {data['name']}", 400)

    client = {
        "id": str(uuid.uuid4()),
        "name": data["name"],
        "email": data.get("email"),
        "wallet_address": data.get("wallet_address"),
        "phone": data.get("phone"),
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    db.add_client(client)

    return {
        "id": client["id"],
        "name": client["name"],
        "email": client["email"],
        "message": f"Client {client['name']} added successfully",
    }

def _handle_check_balance_reminders(data: dict) -> dict:
    user_balance = data.get("balance", 0)
    wallet_address = data.get("walletAddress", "unknown")

    pending_payments = [p for p in db.get_payments() if p["status"] == "pending"]

    tomorrow = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow += timedelta(days=1)
    tomorrow_str = tomorrow.strftime("%Y-%m-%d")

    low_balance_payments = []
    reminders_created = []

    for payment in pending_payments:
        if not payment.get("due_date"):
            continue

        due_date = datetime.fromisoformat(payment["due_date"])
        one_day_before = (due_date - timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        one_day_before_str = one_day_before.strftime("%Y-%m-%d")

        if one_day_before_str == tomorrow_str and user_balance < payment["amount"]:
            shortfall = payment["amount"] - user_balance
            currency_symbol = "₹" if payment["currency"] == "INR" else "$"

            low_balance_payments.append(
                {
                    "vendor": payment["vendor"],
                    "amount": payment["amount"],
                    "currency": payment["currency"],
                    "due_date": payment["due_date"],
                    "shortfall": shortfall,
                }
            )

            rand_suffix = "".join(
                random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=9)
            )
            reminder = {
                "id": f"r_{int(datetime.utcnow().timestamp() * 1000)}_{rand_suffix}",
                "type": "low_balance",
                "message": (
                    f"⚠️ Low Balance Alert: Payment of "
                    f"{currency_symbol}{payment['amount']:,} to {payment['vendor']} "
                    f"is due on {payment['due_date']}. "
                    f"Current balance: {currency_symbol}{user_balance:,}. "
                    f"Shortfall: {currency_symbol}{shortfall:,}"
                ),
                "date": one_day_before_str,
                "time": "09:00",
                "status": "active",
                "payment_id": payment["id"],
                "created_at": datetime.utcnow().isoformat() + "Z",
            }

            db.add_reminder(reminder)
            reminders_created.append(reminder)

    warning_msg = (
        f"⚠️ Low balance detected! You have {len(low_balance_payments)} "
        f"upcoming payment(s) with insufficient balance."
        if low_balance_payments
        else "✅ All good! You have sufficient balance for upcoming payments."
    )

    return {
        "success": True,
        "action": "check_balance_reminders",
        "data": {
            "current_balance": user_balance,
            "wallet_address": wallet_address,
            "total_pending_payments": len(pending_payments),
            "low_balance_count": len(low_balance_payments),
            "low_balance_payments": low_balance_payments,
            "reminders_created": len(reminders_created),
            "reminders": reminders_created,
            "message": warning_msg,
        },
    }

def _parse_month_year(iso_string):
    """Return (month_index_0_based, year) from an ISO datetime string."""
    if not iso_string:
        return (None, None)
    try:
        dt = datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
        return (dt.month - 1, dt.year)
    except (ValueError, AttributeError):
        return (None, None)

_HANDLERS = {
    "create_payment": _handle_create_payment,
    "show_pending_payments": _handle_show_pending_payments,
    "export_report": _handle_export_report,
    "set_reminder": _handle_set_reminder,
    "add_client": _handle_add_client,
    "check_balance_reminders": _handle_check_balance_reminders,
}
