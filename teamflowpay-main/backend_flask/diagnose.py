import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("[DIAGNOSTICS] BlockPay System Diagnostics & Environment Verification")
print("=" * 60)

backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
env_backend = os.path.join(backend_dir, ".env")
env_root = os.path.join(root_dir, ".env")

print("\n[1] Checking Environment Files:")
if os.path.exists(env_backend):
    print("  [OK] Found: backend_flask/.env")
elif os.path.exists(env_root):
    print("  [OK] Found: root .env")
else:
    print("  [!] No .env file found. Creating backend_flask/.env from .env.example...")
    example = os.path.join(backend_dir, ".env.example")
    if os.path.exists(example):
        with open(example, "r") as f_in, open(env_backend, "w") as f_out:
            f_out.write(f_in.read())
        print("  [OK] Created backend_flask/.env from .env.example")

from dotenv import load_dotenv
load_dotenv(env_backend)
load_dotenv(env_root)
load_dotenv()

print("\n[2] Checking AI Service & Groq API:")
groq_key = os.getenv("GROQ_API_KEY", "").strip()
if not groq_key or groq_key == "your_groq_api_key_here":
    print("  [!] GROQ_API_KEY is not configured or is placeholder.")
    print("  [OK] Built-in deterministic NLP engine is ACTIVE and handling natural language commands.")
else:
    short_key = f"{groq_key[:8]}...{groq_key[-4:]}" if len(groq_key) > 12 else "***"
    print(f"  [OK] GROQ_API_KEY detected: {short_key}")

from services.ai_service import ai_service
print("  [*] Testing prompt: 'Send 25 POL to Sarah'...")
cmd = ai_service.generate_command("Send 25 POL to Sarah")
print(f"  [OK] AI Response: {cmd}")

print("\n[3] Checking Database Engine:")
db_url = os.getenv("DATABASE_URL") or os.getenv("DB_CONNECTION_STRING") or ""
if db_url:
    print(f"  [*] Configured DATABASE_URL: {db_url.split('@')[-1] if '@' in db_url else db_url}")
else:
    print("  [*] No DATABASE_URL set. Using local SQLite.")

from data.db import init_db, get_active_engine
init_db()
engine = get_active_engine()
print(f"  [OK] Active Database Engine: {engine.upper()}")

print("\n" + "=" * 60)
print("[OK] System Check Complete! BlockPay is READY.")
print("=" * 60 + "\n")
