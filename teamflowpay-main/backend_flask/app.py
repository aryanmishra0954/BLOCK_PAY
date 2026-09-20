"""
BlockPay AI Backend — Flask Application
Equivalent of backend/server.js (Express).

Run locally:
    python app.py

The app is also exposed as ``app`` for WSGI / Vercel deployment.
"""

import sys
import os
from datetime import datetime, timezone

from flask import Flask, jsonify, request

# Ensure the package root is on sys.path so absolute imports work
# regardless of how the file is invoked.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from data.db import init_db
from routes.agent import agent_bp
from routes.auth import auth_bp
from routes.transactions import transactions_bp
from routes.contacts import contacts_bp


# ------------------------------------------------------------------ #
#  App Factory                                                        #
# ------------------------------------------------------------------ #

def create_app() -> Flask:
    """Create and configure the Flask application."""

    application = Flask(__name__)

    # ---- CORS (mirrors the Express CORS setup) ----
    # The Express backend uses a custom origin callback that allows:
    #   1. Requests with no Origin header (e.g. server-to-server)
    #   2. Origins in the ALLOWED_ORIGINS list
    #   3. Any *.vercel.app subdomain
    # flask-cors doesn't support a function for origins, so we use
    # a manual @after_request handler instead.
    allowed_origins = set(Config.ALLOWED_ORIGINS)

    @application.before_request
    def _handle_preflight():
        if request.method == "OPTIONS":
            resp = application.make_default_options_response()
            return resp

    @application.after_request
    def _apply_cors(response):
        origin = request.headers.get("Origin")
        if origin is None:
            # No Origin header — allow (same behaviour as Express)
            return response
        if (
            origin in allowed_origins
            or origin == "null"
            or origin.startswith("http://localhost:")
            or origin.startswith("http://127.0.0.1:")
            or origin.endswith(".vercel.app")
        ):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization"
            )
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, DELETE, OPTIONS"
            )
        return response

    # ---- Request logging (development only) ----
    if Config.FLASK_ENV != "production":

        @application.before_request
        def _log_request():
            ts = datetime.now(timezone.utc).isoformat()
            print(f"[{ts}] {request.method} {request.path}")

    # ---- Root endpoint ----
    @application.route("/")
    def index():
        return jsonify({
            "message": "BlockPay AI Backend API",
            "version": "1.0.0",
            "status": "running",
            "endpoints": {
                "health": "GET /health",
                "aiCommand": "POST /api/agent/command",
                "executeAction": "POST /api/agent/execute",
                "availableActions": "GET /api/agent/actions",
            },
        })

    # ---- Health check ----
    @application.route("/health")
    def health():
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "BlockPay AI Agent Backend (Flask)",
            "environment": Config.FLASK_ENV,
        })

    # ---- Initialize Persistent Database ----
    init_db()

    # ---- Agent & Business API routes ----
    application.register_blueprint(agent_bp)
    application.register_blueprint(auth_bp)
    application.register_blueprint(transactions_bp)
    application.register_blueprint(contacts_bp)

    # ---- 404 handler ----
    @application.errorhandler(404)
    def not_found(_error):
        return jsonify({
            "error": "Endpoint not found",
            "path": request.path,
            "availableEndpoints": [
                "/health",
                "/api/agent/command",
                "/api/agent/execute",
            ],
        }), 404

    # ---- 500 handler ----
    @application.errorhandler(500)
    def server_error(error):
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "message": str(error) if Config.DEBUG else None,
        }), 500

    return application


# ------------------------------------------------------------------ #
#  Module-level app (used by Vercel / gunicorn)                       #
# ------------------------------------------------------------------ #

app = create_app()

# ------------------------------------------------------------------ #
#  Dev server                                                         #
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    port = Config.PORT
    print(f"\n[*] BlockPay Backend running on port {port}")
    print(f"[+] Health check: http://localhost:{port}/health")
    print(f"[+] AI Command API: http://localhost:{port}/api/agent/command")
    print(f"[+] Execute API: http://localhost:{port}/api/agent/execute\n")
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
