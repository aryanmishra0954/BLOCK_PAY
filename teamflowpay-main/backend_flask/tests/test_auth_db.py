import sys
import os
import uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from data.db import get_user_by_email, get_user_transactions

def test_auth():
    app = create_app()
    client = app.test_client()
    test_email = f"user_{uuid.uuid4().hex[:8]}@blockpay.io"

    # 1. Test registration
    print("Testing /api/auth/register...")
    res = client.post("/api/auth/register", json={
        "email": test_email,
        "password": "supersecretpassword",
        "full_name": "Satoshi Nakamoto"
    })
    print(f"Register status: {res.status_code}, data: {res.get_json()}")
    assert res.status_code == 201
    token = res.get_json()["token"]

    # 2. Test duplicate registration prevention
    print("Testing duplicate registration...")
    res_dup = client.post("/api/auth/register", json={
        "email": test_email,
        "password": "anotherpassword",
        "full_name": "Satoshi Duplicate"
    })
    print(f"Duplicate status: {res_dup.status_code}, data: {res_dup.get_json()}")
    assert res_dup.status_code == 409

    # 3. Test login with wrong password
    print("Testing login with wrong password...")
    res_wrong = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "wrongpassword"
    })
    print(f"Wrong pass status: {res_wrong.status_code}, data: {res_wrong.get_json()}")
    assert res_wrong.status_code == 401

    # 4. Test login with correct password
    print("Testing login with correct password...")
    res_login = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "supersecretpassword"
    })
    print(f"Login status: {res_login.status_code}, data: {res_login.get_json()}")
    assert res_login.status_code == 200

    active_token = res_login.get_json()["token"]

    # 5. Test /api/auth/me
    print("Testing /api/auth/me...")
    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {active_token}"})
    print(f"Me status: {res_me.status_code}, data: {res_me.get_json()}")
    assert res_me.status_code == 200

    # 6. Test recording a transaction
    print("Testing /api/transactions...")
    res_tx = client.post("/api/transactions", json={
        "type": "sent",
        "amount": 250.0,
        "currency": "POL",
        "counterparty_address": "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
        "counterparty_name": "Gamma Protocol",
        "note": "Production test settlement"
    }, headers={"Authorization": f"Bearer {active_token}"})
    print(f"Transaction status: {res_tx.status_code}, data: {res_tx.get_json()}")
    assert res_tx.status_code == 201

    # 7. Test fetching transactions
    res_list = client.get("/api/transactions", headers={"Authorization": f"Bearer {active_token}"})
    print(f"List status: {res_list.status_code}, count: {len(res_list.get_json()['transactions'])}, balance: {res_list.get_json()['balance']}")
    assert len(res_list.get_json()["transactions"]) >= 1

    print("\nALL BACKEND AUTH & DATABASE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_auth()
