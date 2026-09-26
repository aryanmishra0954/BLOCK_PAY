"""
API routes for the BlockPay AI Agent.
Flask Blueprint equivalent of backend/routes/agent.js.
"""

import io
import csv
from flask import Blueprint, request, jsonify, Response

from services.ai_service import ai_service
from services.command_executor import validate_command, execute_command, CommandError
from data.db import (
    get_user_by_token,
    get_user_by_email,
    get_user_by_wallet,
    get_user_transactions,
)

agent_bp = Blueprint("agent", __name__, url_prefix="/api/agent")

def _resolve_user():
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    if not token:
        token = request.args.get("token") or request.headers.get("X-Auth-Token")
    return get_user_by_token(token) if token else None

@agent_bp.route("/command", methods=["POST"])
def command():
    try:
        body = request.get_json(silent=True) or {}
        prompt = body.get("prompt")

        if not prompt or not isinstance(prompt, str) or not prompt.strip():
            return jsonify({
                "success": False,
                "error": "Missing or invalid 'prompt' field",
            }), 400

        print(f'[CMD] Received prompt: "{prompt}"')
        user = _resolve_user()
        if not user:
            return jsonify({"success": False, "error": "Authentication required."}), 401

        ai_command = ai_service.generate_command(prompt)
        print(f"[AI] Generated command: {ai_command}")

        validation = validate_command(ai_command, user=user)
        if not validation["valid"]:
            err_msg = validation["errors"][0] if validation["errors"] else "AI generated invalid command"
            return jsonify({
                "success": False,
                "error": err_msg,
                "details": validation["errors"],
                "command": ai_command,
            }), 400

        result = execute_command(ai_command, user=user)

        return jsonify({
            "success": True,
            "prompt": prompt,
            "action": ai_command["action"],
            "command": ai_command,
            "data": result,
        })

    except Exception as exc:
        print(f"[ERR] Command processing error: {exc}")
        return jsonify({
            "success": False,
            "error": str(exc) or "Command processing failed",
            "prompt": (request.get_json(silent=True) or {}).get("prompt"),
        }), 500

@agent_bp.route("/execute", methods=["POST"])
def execute():
    try:
        command_body = request.get_json(silent=True) or {}

        user = _resolve_user()
        if not user:
            return jsonify({"success": False, "error": "Authentication required."}), 401
        validation = validate_command(command_body, user=user)
        if not validation["valid"]:
            err_msg = validation["errors"][0] if validation["errors"] else "Invalid command"
            return jsonify({
                "error": err_msg,
                "details": validation["errors"],
            }), 400

        result = execute_command(command_body, user=user)

        return jsonify({
            "success": True,
            "action": command_body["action"],
            "data": result,
        })

    except CommandError as exc:
        print(f"Command execution error: {exc}")
        return jsonify({
            "success": False,
            "error": str(exc),
            "action": (request.get_json(silent=True) or {}).get("action"),
        }), exc.status_code

    except Exception as exc:
        print(f"Command execution error: {exc}")
        return jsonify({
            "success": False,
            "error": str(exc) or "Command execution failed",
            "action": (request.get_json(silent=True) or {}).get("action"),
        }), 500

@agent_bp.route("/download/<path:filename>", methods=["GET"])
def download_report(filename):
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401
    user_id = user["id"]
    txs = get_user_transactions(user_id, limit=200)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Type", "Counterparty Name", "Counterparty Address",
        "Amount", "Currency", "Status", "TxHash", "Note"
    ])
    for tx in txs:
        date_str = tx.get("created_at") or ""
        writer.writerow([
            date_str,
            tx.get("type", "sent"),
            tx.get("counterparty_name", ""),
            tx.get("counterparty_address", ""),
            tx.get("amount", "0"),
            tx.get("currency", "POL"),
            tx.get("status", "success"),
            tx.get("tx_hash", ""),
            tx.get("note", "")
        ])

    csv_bytes = output.getvalue().encode("utf-8")
    return Response(
        csv_bytes,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@agent_bp.route("/actions", methods=["GET"])
def actions():
    return jsonify({
        "actions": [
            {
                "name": "create_payment",
                "description": "Create a new payment entry",
                "required_fields": ["vendor", "amount"],
            },
            {
                "name": "show_pending_payments",
                "description": "Show pending payments",
                "required_fields": [],
            },
            {
                "name": "export_report",
                "description": "Export transaction report",
                "required_fields": ["period"],
            },
            {
                "name": "set_reminder",
                "description": "Set a payment reminder",
                "required_fields": ["message", "date"],
            },
            {
                "name": "add_client",
                "description": "Add a new client/vendor",
                "required_fields": ["name"],
            },
        ],
    })
