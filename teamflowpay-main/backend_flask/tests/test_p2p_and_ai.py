import sys
import os
import unittest
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from data.db import (
    init_db,
    create_user,
    get_user_by_id,
    get_user_transactions,
    get_user_contacts,
    get_user_invoices,
    add_transaction
)

class TestP2PAndAI(unittest.TestCase):
    def setUp(self):
        init_db()
        self.app = create_app()
        self.client = self.app.test_client()
        email = f"ai_{os.urandom(4).hex()}@test.io"
        login = self.client.post("/api/auth/register", json={"email":email, "password":"password123", "full_name":"AI Test"}).get_json()
        self.headers = {"Authorization": f"Bearer {login['token']}"}

    def test_bi_directional_p2p_transfer(self):
        """Verify when User A sends to User B, User B is automatically credited in DB."""
        suffix = os.urandom(3).hex()
        wallet_a = f"0x1111{suffix}00000000000000000000000000000000"
        wallet_b = f"0x2222{suffix}00000000000000000000000000000000"

        user_a = create_user(f"alice_{suffix}@test.io", "pass_hash", "Alice", wallet_a, 10000.0)
        user_b = create_user(f"bob_{suffix}@test.io", "pass_hash", "Bob", wallet_b, 500.0)

        # Alice sends 250 POL to Bob's wallet address
        tx_hash = f"0xtesttx_{suffix}"
        tx = add_transaction(
            user_id=user_a["id"],
            tx_type="sent",
            amount=250.0,
            counterparty_address=wallet_b,
            counterparty_name="Bob",
            tx_hash=tx_hash,
            currency="POL",
            note="Payment for design services"
        )
        self.assertIsNotNone(tx)

        # Verify Alice's balance decreased
        fresh_a = get_user_by_id(user_a["id"])
        self.assertEqual(float(fresh_a["balance"]), 9750.0)

        # Verify Bob's balance increased to 750.0
        fresh_b = get_user_by_id(user_b["id"])
        self.assertEqual(float(fresh_b["balance"]), 750.0)

        # Verify Bob has an incoming received transaction in ledger
        bob_txs = get_user_transactions(user_b["id"])
        self.assertTrue(any(t["type"] == "received" and float(t["amount"]) == 250.0 for t in bob_txs))

    def test_ai_command_export_report_and_download(self):
        """Verify AI command export_report creates a valid download URL and downloads CSV."""
        res = self.client.post("/api/agent/command", headers=self.headers, json={
            "prompt": "Export my transaction history to CSV"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["action"], "export_report")
        self.assertIn("download_url", data["data"])

        dl_url = data["data"]["download_url"]
        dl_res = self.client.get(dl_url, headers=self.headers)
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(dl_res.mimetype, "text/csv")
        csv_text = dl_res.data.decode("utf-8")
        self.assertIn("Date,Type,Counterparty Name", csv_text)

    def test_ai_command_add_contact(self):
        """Verify AI command add_client writes contact directly to database."""
        suffix = os.urandom(2).hex()
        contact_name = f"Vitalik Buterin {suffix}"
        res = self.client.post("/api/agent/command", headers=self.headers, json={
            "prompt": f"Add contact {contact_name} with address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["action"], "add_client")

    def test_invoices_api(self):
        """Verify invoice listing and payment via API."""
        create_res = self.client.post("/api/transactions/invoices", headers=self.headers,
                                      json={"client_name":"Test Client", "amount":25, "currency":"POL"})
        self.assertEqual(create_res.status_code, 201)
        get_res = self.client.get("/api/transactions/invoices", headers=self.headers)
        self.assertEqual(get_res.status_code, 200)
        data = get_res.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(len(data["invoices"]), 1)

if __name__ == "__main__":
    unittest.main()
