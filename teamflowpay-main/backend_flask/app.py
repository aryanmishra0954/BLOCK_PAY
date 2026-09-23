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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from data.db import init_db, get_active_engine
from routes.agent import agent_bp
from routes.auth import auth_bp
from routes.transactions import transactions_bp
from routes.contacts import contacts_bp

def create_app() -> Flask:
    """Create and configure the Flask application."""

    application = Flask(__name__)

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

    if Config.FLASK_ENV != "production":

        @application.before_request
        def _log_request():
            ts = datetime.now(timezone.utc).isoformat()
            print(f"[{ts}] {request.method} {request.path}")

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

    @application.route("/health")
    def health():
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "BlockPay AI Agent Backend (Flask)",
            "environment": Config.FLASK_ENV,
            "database": {
                "engine": get_active_engine(),
                "connected": True,
            },
        })

    init_db()

    application.register_blueprint(agent_bp)
    application.register_blueprint(auth_bp)
    application.register_blueprint(transactions_bp)
    application.register_blueprint(contacts_bp)

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

    @application.errorhandler(500)
    def server_error(error):
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "message": str(error) if Config.DEBUG else None,
        }), 500

    return application

app = create_app()

if __name__ == "__main__":
    port = Config.PORT
    print(f"\n[*] BlockPay Backend running on port {port}")
    print(f"[+] Health check: http://localhost:{port}/health")
    print(f"[+] AI Command API: http://localhost:{port}/api/agent/command")
    print(f"[+] Execute API: http://localhost:{port}/api/agent/execute\n")
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
