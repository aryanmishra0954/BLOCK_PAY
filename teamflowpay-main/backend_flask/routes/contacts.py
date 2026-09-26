"""
BlockPay Contacts / Address Book Routes
Handles contact creation, retrieval, updating, and deletion.
"""

import re
from flask import Blueprint, jsonify, request
from data.db import (
    get_user_contacts,
    get_contact_by_id,
    create_contact,
    update_contact,
    delete_contact,
    get_user_by_token,
    get_user_by_email,
    get_user_by_wallet,
    create_user,
    create_web3_user,
)

contacts_bp = Blueprint("contacts", __name__, url_prefix="/api/contacts")

def _get_token_from_request():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return request.args.get("token") or request.headers.get("X-Auth-Token")

def _resolve_user():
    token = _get_token_from_request()
    return get_user_by_token(token) if token else None

def _is_valid_eth_address(address: str) -> bool:
    if not address or not isinstance(address, str):
        return False
    return bool(re.match(r"^0x[0-9a-fA-F]{40}$", address.strip()))

@contacts_bp.route("", methods=["GET"])
@contacts_bp.route("/", methods=["GET"])
def list_contacts():
    """List all saved contacts for the authenticated user."""
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    contacts = get_user_contacts(user["id"])
    return jsonify({
        "success": True,
        "contacts": contacts,
        "count": len(contacts),
    }), 200

@contacts_bp.route("", methods=["POST"])
@contacts_bp.route("/", methods=["POST"])
def add_contact():
    """Add a new contact to the user's address book."""
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    address = (data.get("address") or "").strip()
    email = (data.get("email") or "").strip()

    if not name:
        return jsonify({"success": False, "error": "Contact name is required."}), 400

    if not _is_valid_eth_address(address):
        return jsonify({
            "success": False,
            "error": "A valid 42-character Ethereum/Polygon address (0x...) is required.",
        }), 400

    contact = create_contact(
        user_id=user["id"],
        name=name,
        address=address,
        email=email,
    )

    return jsonify({
        "success": True,
        "message": "Contact added successfully.",
        "contact": contact,
    }), 201

@contacts_bp.route("/<contact_id>", methods=["PUT"])
def edit_contact(contact_id):
    """Update an existing contact."""
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    existing = get_contact_by_id(contact_id, user["id"])
    if not existing:
        return jsonify({"success": False, "error": "Contact not found."}), 404

    data = request.get_json() or {}
    name = (data.get("name") or existing["name"]).strip()
    address = (data.get("address") or existing["address"]).strip()
    email = (data.get("email") if "email" in data else existing.get("email") or "").strip()

    if not name:
        return jsonify({"success": False, "error": "Contact name is required."}), 400

    if not _is_valid_eth_address(address):
        return jsonify({
            "success": False,
            "error": "A valid 42-character Ethereum/Polygon address (0x...) is required.",
        }), 400

    updated = update_contact(
        contact_id=contact_id,
        user_id=user["id"],
        name=name,
        address=address,
        email=email,
    )

    return jsonify({
        "success": True,
        "message": "Contact updated successfully.",
        "contact": updated,
    }), 200

@contacts_bp.route("/<contact_id>", methods=["DELETE"])
def remove_contact(contact_id):
    """Delete a contact from the address book."""
    user = _resolve_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    success = delete_contact(contact_id, user["id"])
    if not success:
        return jsonify({"success": False, "error": "Contact not found or already deleted."}), 404

    return jsonify({
        "success": True,
        "message": "Contact deleted successfully.",
        "id": contact_id,
    }), 200
