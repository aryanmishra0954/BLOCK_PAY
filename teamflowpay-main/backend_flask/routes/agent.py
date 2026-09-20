"""
API routes for the BlockPay AI Agent.
Flask Blueprint equivalent of backend/routes/agent.js.
"""

from flask import Blueprint, request, jsonify

from services.ai_service import ai_service
from services.command_executor import validate_command, execute_command, CommandError

agent_bp = Blueprint("agent", __name__, url_prefix="/api/agent")


# ------------------------------------------------------------------ #
#  POST /api/agent/command                                            #
#  Natural-language prompt  →  AI  →  validate  →  execute            #
# ------------------------------------------------------------------ #

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

        # Step 1 — AI generates a structured command
        ai_command = ai_service.generate_command(prompt)
        print(f"[AI] Generated command: {ai_command}")

        # Step 2 — Validate
        validation = validate_command(ai_command)
        if not validation["valid"]:
            return jsonify({
                "success": False,
                "error": "AI generated invalid command",
                "details": validation["errors"],
                "command": ai_command,
            }), 400

        # Step 3 — Execute
        result = execute_command(ai_command)

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


# ------------------------------------------------------------------ #
#  POST /api/agent/execute                                            #
#  Pre-formed JSON command  →  validate  →  execute                   #
# ------------------------------------------------------------------ #

@agent_bp.route("/execute", methods=["POST"])
def execute():
    try:
        command_body = request.get_json(silent=True) or {}

        validation = validate_command(command_body)
        if not validation["valid"]:
            return jsonify({
                "error": "Invalid command",
                "details": validation["errors"],
            }), 400

        result = execute_command(command_body)

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


# ------------------------------------------------------------------ #
#  GET /api/agent/actions                                             #
#  List available actions                                             #
# ------------------------------------------------------------------ #

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
