import os
import sys
import sqlite3

try:
    import psycopg2
    from psycopg2.extras import execute_batch
except ImportError:
    print("Error: psycopg2 is required. Run: pip install psycopg2-binary")
    sys.exit(1)

SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "BlockPay.db")
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

def migrate(db_url: str = None):
    target_url = db_url or DATABASE_URL
    if not target_url or not (target_url.startswith("postgresql://") or target_url.startswith("postgres://")):
        print("Usage: python migrate_sqlite_to_postgres.py [POSTGRES_DATABASE_URL]")
        print("Error: DATABASE_URL must be a valid PostgreSQL connection string.")
        sys.exit(1)

    if not os.path.exists(SQLITE_PATH):
        print(f"Error: SQLite database not found at {SQLITE_PATH}")
        sys.exit(1)

    print(f"[*] Reading SQLite database from: {SQLITE_PATH}")
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    print(f"[*] Connecting to PostgreSQL at: {target_url.split('@')[-1] if '@' in target_url else target_url}")
    pg_conn = psycopg2.connect(target_url)
    pg_cur = pg_conn.cursor()

    # Import and run init_db with the target DATABASE_URL
    os.environ["DATABASE_URL"] = target_url
    from db import init_db
    init_db()

    # 1. Migrate users
    sqlite_cur.execute("SELECT * FROM users")
    users = [dict(r) for r in sqlite_cur.fetchall()]
    print(f"[+] Found {len(users)} users in SQLite")
    if users:
        pg_cur.executemany("""
            INSERT INTO users (id, email, password_hash, full_name, wallet_address, balance, token, auth_provider, provider_id, avatar_url, created_at, last_login)
            VALUES (%(id)s, %(email)s, %(password_hash)s, %(full_name)s, %(wallet_address)s, %(balance)s, %(token)s, %(auth_provider)s, %(provider_id)s, %(avatar_url)s, %(created_at)s, %(last_login)s)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                balance = EXCLUDED.balance,
                wallet_address = EXCLUDED.wallet_address,
                last_login = EXCLUDED.last_login
        """, users)
        pg_conn.commit()
        print(f"[✓] Migrated {len(users)} users to PostgreSQL")

    # 2. Migrate web3_nonces
    sqlite_cur.execute("SELECT * FROM web3_nonces")
    nonces = [dict(r) for r in sqlite_cur.fetchall()]
    if nonces:
        pg_cur.executemany("""
            INSERT INTO web3_nonces (address, nonce, created_at)
            VALUES (%(address)s, %(nonce)s, %(created_at)s)
            ON CONFLICT (address) DO UPDATE SET nonce = EXCLUDED.nonce
        """, nonces)
        pg_conn.commit()
        print(f"[✓] Migrated {len(nonces)} nonces to PostgreSQL")

    # 3. Migrate contacts
    sqlite_cur.execute("SELECT * FROM contacts")
    contacts = [dict(r) for r in sqlite_cur.fetchall()]
    print(f"[+] Found {len(contacts)} contacts in SQLite")
    if contacts:
        pg_cur.executemany("""
            INSERT INTO contacts (id, user_id, name, address, email, created_at)
            VALUES (%(id)s, %(user_id)s, %(name)s, %(address)s, %(email)s, %(created_at)s)
            ON CONFLICT (id) DO NOTHING
        """, contacts)
        pg_conn.commit()
        print(f"[✓] Migrated {len(contacts)} contacts to PostgreSQL")

    # 4. Migrate transactions
    sqlite_cur.execute("SELECT * FROM transactions")
    txs = [dict(r) for r in sqlite_cur.fetchall()]
    print(f"[+] Found {len(txs)} transactions in SQLite")
    if txs:
        pg_cur.executemany("""
            INSERT INTO transactions (id, user_id, type, amount, currency, counterparty_address, counterparty_name, tx_hash, status, note, created_at)
            VALUES (%(id)s, %(user_id)s, %(type)s, %(amount)s, %(currency)s, %(counterparty_address)s, %(counterparty_name)s, %(tx_hash)s, %(status)s, %(note)s, %(created_at)s)
            ON CONFLICT (id) DO NOTHING
        """, txs)
        pg_conn.commit()
        print(f"[✓] Migrated {len(txs)} transactions to PostgreSQL")

    sqlite_conn.close()
    pg_conn.close()
    print("\n[SUCCESS] SQLite to PostgreSQL migration complete!")

if __name__ == "__main__":
    url_arg = sys.argv[1] if len(sys.argv) > 1 else None
    migrate(url_arg)
