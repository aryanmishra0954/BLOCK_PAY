"""
Simple test script for BlockPay AI Agent Flask Backend.
Port of backend/test.js -- same test cases, same output format.

Run with:
    python tests/test_api.py
"""

import sys
import requests

BASE_URL = "http://localhost:3000"

TEST_COMMANDS = [
    {
        "name": "Create Payment",
        "command": {
            "action": "create_payment",
            "data": {
                "vendor": "Test Vendor",
                "amount": 5000,
                "currency": "INR",
                "due_date": "2025-12-10",
            },
        },
    },
    {
        "name": "Show Pending Payments",
        "command": {
            "action": "show_pending_payments",
            "data": {
                "filter": "all",
            },
        },
    },
    {
        "name": "Export Report",
        "command": {
            "action": "export_report",
            "data": {
                "period": "November",
                "format": "csv",
            },
        },
    },
    {
        "name": "Set Reminder",
        "command": {
            "action": "set_reminder",
            "data": {
                "message": "Test reminder",
                "date": "2025-12-01",
                "time": "10:00",
            },
        },
    },
    {
        "name": "Add Client",
        "command": {
            "action": "add_client",
            "data": {
                "name": "Test Client Inc",
                "email": "test@testclient.com",
            },
        },
    },
]


def run_tests():
    print("[TEST] Testing BlockPay AI Agent Flask Backend\n")
    print(f"Make sure the server is running on {BASE_URL}\n")

    # 1. Health check
    print("1. Testing health endpoint...")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        data = resp.json()
        print(f"  [PASS] Health check: {data['status']}")
        print(f"  Service: {data['service']}\n")
    except Exception as exc:
        print(f"  [FAIL] Health check failed: {exc}")
        print("  Make sure the server is running: python app.py\n")
        return

    # 2-6. Execute each test command
    for idx, test in enumerate(TEST_COMMANDS, start=2):
        print(f"{idx}. Testing: {test['name']}")
        try:
            resp = requests.post(
                f"{BASE_URL}/api/agent/execute",
                json=test["command"],
                timeout=10,
            )
            data = resp.json()

            if data.get("success"):
                print(f"  [PASS] {test['name']} succeeded")
                print(f"  Action: {data['action']}")
                msg = data.get("data", {}).get("message")
                if msg:
                    print(f"  Message: {msg}")
            else:
                print(f"  [FAIL] {test['name']} failed")
                print(f"  Error: {data.get('error')}")

        except Exception as exc:
            print(f"  [FAIL] {test['name']} error: {exc}")

        print()

    print("[DONE] Tests complete!\n")


if __name__ == "__main__":
    run_tests()
