"""
BlockPay Tri-Auth Automated Test Suite
Tests Email/Password, Web3/MetaMask EIP-191 signatures, and Google OAuth workflows.
"""

import sys
import os
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from data.db import init_db
from eth_account import Account
from eth_account.messages import encode_defunct


def run_tests():
    print("==================================================")
    print("RUNNING BlockPay TRI-AUTH VERIFICATION TESTS")
    print("==================================================")

    init_db()
    app = create_app()
    client = app.test_client()

    # ----------------------------------------------------
    # Test 1: Email & Password Registration & Login
    # ----------------------------------------------------
    print("\n[Test 1] Testing Email / Password Auth...")
    test_email = f"test_{os.urandom(4).hex()}@blockpay.finance"
    test_password = "SecurePassword123!"

    reg_res = client.post("/api/auth/register", json={
        "email": test_email,
        "password": test_password,
        "full_name": "Satoshi Nakamoto",
    })
    assert reg_res.status_code == 201, f"Register failed: {reg_res.get_json()}"
    reg_data = reg_res.get_json()
    assert reg_data["success"] is True
    assert reg_data["user"]["email"] == test_email
    assert reg_data["user"]["balance"] == 10000.0
    assert reg_data["user"]["auth_provider"] == "email"
    token = reg_data["token"]
    print("[PASS] Email registration successful (seeded 10,000 POL)")

    # Login with same credentials
    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": test_password,
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.get_json()}"
    print("[PASS] Email sign-in successful with Werkzeug verification")

    # ----------------------------------------------------
    # Test 2: Web3 / MetaMask Cryptographic Signatures
    # ----------------------------------------------------
    print("\n[Test 2] Testing Web3 / MetaMask Cryptographic Auth...")
    # Generate test Ethereum wallet pair
    test_wallet = Account.create()
    wallet_address = test_wallet.address
    print(f"Generated test Ethereum wallet: {wallet_address}")

    # Request challenge nonce
    nonce_res = client.get(f"/api/auth/web3/nonce?address={wallet_address}")
    assert nonce_res.status_code == 200, f"Nonce request failed: {nonce_res.get_json()}"
    nonce_data = nonce_res.get_json()
    nonce = nonce_data["nonce"]
    challenge_message = nonce_data["message"]
    print(f"[PASS] Obtained challenge nonce: {nonce}")

    # Sign message using private key (simulating MetaMask personal_sign)
    signable = encode_defunct(text=challenge_message)
    signed = Account.sign_message(signable, test_wallet.key)
    signature_hex = signed.signature.hex()
    if not signature_hex.startswith("0x"):
        signature_hex = "0x" + signature_hex

    # Send signature to verify endpoint
    web3_verify_res = client.post("/api/auth/web3/verify", json={
        "address": wallet_address,
        "signature": signature_hex,
        "message": challenge_message,
    })
    assert web3_verify_res.status_code == 200, f"Web3 verify failed: {web3_verify_res.get_json()}"
    web3_data = web3_verify_res.get_json()
    assert web3_data["success"] is True
    assert web3_data["user"]["wallet_address"].lower() == wallet_address.lower()
    assert web3_data["user"]["balance"] == 10000.0
    assert web3_data["user"]["auth_provider"] == "web3"
    web3_token = web3_data["token"]
    print("[PASS] Web3 signature cryptographically verified! Session issued with 10,000 POL")

    # Replay attack prevention: same nonce should now fail
    replay_res = client.post("/api/auth/web3/verify", json={
        "address": wallet_address,
        "signature": signature_hex,
        "message": challenge_message,
    })
    assert replay_res.status_code == 400, "Replay attack was not prevented!"
    print("[PASS] Replay attack protection verified: consumed nonce correctly rejected")

    # ----------------------------------------------------
    # Test 3: Google Sign-In Verification
    # ----------------------------------------------------
    print("\n[Test 3] Testing Google Sign-In Auth...")
    google_email = f"user_{os.urandom(4).hex()}@gmail.com"
    google_name = "Alex Mercer"
    google_id = "google_oauth_sub_1092837465"
    google_avatar = "https://lh3.googleusercontent.com/a/default-user"

    google_res = client.post("/api/auth/google/verify", json={
        "email": google_email,
        "name": google_name,
        "google_id": google_id,
        "picture": google_avatar,
    })
    assert google_res.status_code == 200, f"Google verify failed: {google_res.get_json()}"
    google_data = google_res.get_json()
    assert google_data["success"] is True
    assert google_data["user"]["email"] == google_email
    assert google_data["user"]["auth_provider"] == "google"
    assert google_data["user"]["avatar_url"] == google_avatar
    assert google_data["user"]["balance"] == 10000.0
    print("[PASS] Google OAuth user onboarded and verified successfully")

    # ----------------------------------------------------
    # Test 4: Token Validation (/api/auth/me)
    # ----------------------------------------------------
    print("\n[Test 4] Testing Session Verification (/api/auth/me)...")
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {web3_token}"})
    assert me_res.status_code == 200
    me_data = me_res.get_json()
    assert me_data["user"]["wallet_address"].lower() == wallet_address.lower()
    print("[PASS] Session token validated via Bearer header")

    print("\n==================================================")
    print("ALL TRI-AUTH AUTOMATED TESTS PASSED (EMAIL, GOOGLE, WEB3)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
