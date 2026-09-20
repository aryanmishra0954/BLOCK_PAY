"""
Tests for BlockPay Contacts / Address Book API
"""

import os
import sys
import unittest
import uuid

# Ensure backend_flask root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from data.db import create_user, delete_contact


class ContactsAPITestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

        # Create test user
        self.test_email = f"tester_{uuid.uuid4().hex[:8]}@blockpay.finance"
        self.user = create_user(
            email=self.test_email,
            password_hash="test_hash",
            full_name="Alex Contacts",
            wallet_address="0x" + os.urandom(20).hex(),
            initial_balance=5000.0,
        )

        # Login to obtain token
        login_res = self.client.post("/api/auth/login", json={
            "email": self.test_email,
            "password": "doesntmatterfortest",
        })
        # If login needs real hash, just use update_user_token directly
        from data.db import update_user_token
        self.token = uuid.uuid4().hex
        update_user_token(self.user["id"], self.token)
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_contact_crud(self):
        # 1. List initially empty or existing
        res = self.client.get("/api/contacts", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        initial_count = data["count"]

        # 2. Add invalid EVM address
        res = self.client.post("/api/contacts", headers=self.headers, json={
            "name": "Invalid Guy",
            "address": "not-an-eth-address",
        })
        self.assertEqual(res.status_code, 400)

        # 3. Add valid contact
        valid_addr = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        res = self.client.post("/api/contacts", headers=self.headers, json={
            "name": "Sarah Designer",
            "address": valid_addr,
            "email": "sarah@designstudio.xyz",
        })
        self.assertEqual(res.status_code, 201)
        created = res.get_json()["contact"]
        contact_id = created["id"]
        self.assertEqual(created["name"], "Sarah Designer")
        self.assertEqual(created["address"], valid_addr.lower())

        # 4. List again, should have +1
        res = self.client.get("/api/contacts", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["count"], initial_count + 1)

        # 5. Update contact
        res = self.client.put(f"/api/contacts/{contact_id}", headers=self.headers, json={
            "name": "Sarah Senior Designer",
            "address": valid_addr,
            "email": "sarah.lead@designstudio.xyz",
        })
        self.assertEqual(res.status_code, 200)
        updated = res.get_json()["contact"]
        self.assertEqual(updated["name"], "Sarah Senior Designer")
        self.assertEqual(updated["email"], "sarah.lead@designstudio.xyz")

        # 6. Delete contact
        res = self.client.delete(f"/api/contacts/{contact_id}", headers=self.headers)
        self.assertEqual(res.status_code, 200)

        # 7. Confirm deletion
        res = self.client.get("/api/contacts", headers=self.headers)
        self.assertEqual(res.get_json()["count"], initial_count)


if __name__ == "__main__":
    unittest.main()
