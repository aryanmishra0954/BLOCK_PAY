import os
import uuid
import secrets
import sqlite3
import urllib.parse
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "BlockPay.db")
ACTIVE_ENGINE = "sqlite"
POSTGRES_CHECKED = False

def get_db_url() -> str:
    url = (os.environ.get("DATABASE_URL") or os.environ.get("DB_CONNECTION_STRING") or "").strip()
    return url

def ensure_postgres_database(db_url: str):
    if not PSYCOPG2_AVAILABLE:
        return
    try:
        parsed = urllib.parse.urlparse(db_url)
        target_db = parsed.path.lstrip("/")
        if not target_db or target_db in ["postgres", "template1"]:
            return
        maintenance_url = db_url.rsplit("/", 1)[0] + "/postgres"
        conn = psycopg2.connect(maintenance_url, connect_timeout=3)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (target_db,))
        exists = cur.fetchone()
        if not exists:
            print(f"[*] PostgreSQL database '{target_db}' does not exist. Creating automatically...")
            cur.execute(f'CREATE DATABASE "{target_db}"')
            print(f"[✓] Created PostgreSQL database '{target_db}' successfully!")
        cur.close()
        conn.close()
    except Exception:
        pass

class PostgresCursorWrapper:
    def __init__(self, raw_cursor):
        self.cursor = raw_cursor

    def execute(self, sql, params=None):
        pg_sql = sql.replace("?", "%s")
        pg_sql = pg_sql.replace("ORDER BY name COLLATE NOCASE", "ORDER BY LOWER(name)")
        if params is None:
            return self.cursor.execute(pg_sql)
        return self.cursor.execute(pg_sql, params)

    def fetchone(self):
        row = self.cursor.fetchone()
        return dict(row) if row else None

    def fetchall(self):
        rows = self.cursor.fetchall()
        return [dict(r) for r in rows]

    @property
    def rowcount(self):
        return self.cursor.rowcount

    def close(self):
        self.cursor.close()

class PostgresConnectionWrapper:
    def __init__(self, raw_conn):
        self.conn = raw_conn

    def cursor(self):
        return PostgresCursorWrapper(self.conn.cursor(cursor_factory=RealDictCursor))

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

class SqliteCursorWrapper:
    def __init__(self, raw_cursor):
        self.cursor = raw_cursor

    def execute(self, sql, params=None):
        if params is None:
            return self.cursor.execute(sql)
        return self.cursor.execute(sql, params)

    def fetchone(self):
        row = self.cursor.fetchone()
        return dict(row) if row else None

    def fetchall(self):
        rows = self.cursor.fetchall()
        return [dict(r) for r in rows]

    @property
    def rowcount(self):
        return self.cursor.rowcount

    def close(self):
        self.cursor.close()

class SqliteConnectionWrapper:
    def __init__(self, raw_conn):
        self.conn = raw_conn

    def cursor(self):
        return SqliteCursorWrapper(self.conn.cursor())

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

def get_active_engine() -> str:
    global ACTIVE_ENGINE
    return ACTIVE_ENGINE

def get_db_connection():
    global ACTIVE_ENGINE, POSTGRES_CHECKED
    db_url = get_db_url()

    if PSYCOPG2_AVAILABLE and db_url and (db_url.startswith("postgresql://") or db_url.startswith("postgres://")):
        if not POSTGRES_CHECKED:
            ensure_postgres_database(db_url)
            POSTGRES_CHECKED = True

        try:
            raw_conn = psycopg2.connect(db_url, connect_timeout=3)
            ACTIVE_ENGINE = "postgresql"
            return PostgresConnectionWrapper(raw_conn)
        except Exception as e:
            if not POSTGRES_CHECKED:
                print(f"[DB] PostgreSQL unavailable ({e}). Using SQLite fallback.")
            POSTGRES_CHECKED = True

    ACTIVE_ENGINE = "sqlite"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return SqliteConnectionWrapper(conn)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    engine = get_active_engine()

    if engine == "postgresql":
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(64) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                wallet_address VARCHAR(64) UNIQUE NOT NULL,
                balance DOUBLE PRECISION DEFAULT 10000.0,
                token TEXT,
                token_expires_at VARCHAR(50),
                auth_provider VARCHAR(50) DEFAULT 'email',
                provider_id TEXT,
                avatar_url TEXT,
                created_at VARCHAR(50) NOT NULL,
                last_login VARCHAR(50)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS web3_nonces (
                address VARCHAR(64) PRIMARY KEY,
                nonce VARCHAR(128) NOT NULL,
                created_at VARCHAR(50) NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL REFERENCES users(id),
                type VARCHAR(50) NOT NULL,
                amount DOUBLE PRECISION NOT NULL,
                currency VARCHAR(20) DEFAULT 'POL',
                counterparty_address VARCHAR(64) NOT NULL,
                counterparty_name VARCHAR(255),
                tx_hash VARCHAR(128) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'success',
                note TEXT,
                created_at VARCHAR(50) NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL REFERENCES users(id),
                client_name VARCHAR(255) NOT NULL,
                client_email VARCHAR(255),
                amount DOUBLE PRECISION NOT NULL,
                currency VARCHAR(20) DEFAULT 'POL',
                due_date VARCHAR(50) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at VARCHAR(50) NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS contacts (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL REFERENCES users(id),
                name VARCHAR(255) NOT NULL,
                address VARCHAR(64) NOT NULL,
                email VARCHAR(255),
                created_at VARCHAR(50) NOT NULL
            )
        """)
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expires_at VARCHAR(50)")
        conn.commit()
        conn.close()
        print("[DB] Initialized PostgreSQL database tables")
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                wallet_address TEXT UNIQUE NOT NULL,
                balance REAL DEFAULT 10000.0,
                token TEXT,
                token_expires_at TEXT,
                auth_provider TEXT DEFAULT 'email',
                provider_id TEXT,
                avatar_url TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS web3_nonces (
                address TEXT PRIMARY KEY,
                nonce TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email'")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN provider_id TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN token_expires_at TEXT")
        except Exception:
            pass
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'POL',
                counterparty_address TEXT NOT NULL,
                counterparty_name TEXT,
                tx_hash TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'success',
                note TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                client_name TEXT NOT NULL,
                client_email TEXT,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'POL',
                due_date TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS contacts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                email TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        conn.commit()
        conn.close()
        print(f"[DB] Initialized SQLite database at {DB_PATH}")
    seed_initial_demo_data()

def seed_initial_demo_data():
    try:
        trader = get_user_by_email("trader@blockpay.io")
        if not trader:
            pwd_hash = generate_password_hash("password123")
            trader = create_user(
                email="trader@blockpay.io",
                password_hash=pwd_hash,
                full_name="Satoshi Nakamoto",
                wallet_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                initial_balance=0.0,
            )

        sarah = get_user_by_email("sarah@flowpay.xyz")
        if not sarah:
            pwd_hash = generate_password_hash("password123")
            sarah = create_user(
                email="sarah@flowpay.xyz",
                password_hash=pwd_hash,
                full_name="Sarah Chen",
                wallet_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                initial_balance=0.0,
            )

        if trader:
            contacts = get_user_contacts(trader["id"])
            if not contacts:
                create_contact(trader["id"], "Sarah Chen (UI Lead)", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "sarah@flowpay.xyz")
                create_contact(trader["id"], "Alex Mercer (Smart Contracts)", "0x90F79bf6EB2c4f870365E785982E1f101E93b906", "alex@ethereum.org")
                create_contact(trader["id"], "Ditre Italia (Vendor)", "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", "billing@ditreitalia.com")
                create_contact(trader["id"], "Gamma Logistics", "0x9965507D1a55bcC2695C58ba16FB37d819B0A4df", "ops@gammalogistics.io")

            txs = get_user_transactions(trader["id"], limit=5)
            # New demo accounts intentionally start at zero. Test funds are added
            # only through the explicit funding endpoint.

            invs = get_user_invoices(trader["id"])
            if not invs:
                create_invoice(
                    user_id=trader["id"],
                    client_name="Ditre Italia",
                    amount=500.0,
                    due_date="2026-10-15",
                    currency="POL",
                    client_email="billing@ditreitalia.com",
                    description="Monthly protocol licensing and UI maintenance",
                    status="pending"
                )
                create_invoice(
                    user_id=trader["id"],
                    client_name="Gamma Logistics",
                    amount=1200.0,
                    due_date="2026-10-30",
                    currency="POL",
                    client_email="ops@gammalogistics.io",
                    description="Q4 Settlement milestone",
                    status="pending"
                )
    except Exception as e:
        print(f"[DB] Seed notice: {e}")

def create_user(email: str, password_hash: str, full_name: str, wallet_address: str, initial_balance: float = 0.0) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO users (id, email, password_hash, full_name, wallet_address, balance, created_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, email.lower().strip(), password_hash, full_name.strip(), wallet_address, initial_balance, now, now))
    conn.commit()
    user = get_user_by_id(user_id)
    conn.close()
    return user

def get_user_by_email(email: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    return row

def get_user_by_id(user_id: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def get_user_by_token(token: str) -> dict:
    if not token:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE token = ?", (token,))
    row = cursor.fetchone()
    conn.close()
    if row and row.get("token_expires_at"):
        try:
            if datetime.fromisoformat(row["token_expires_at"]) <= datetime.now(timezone.utc):
                return None
        except (TypeError, ValueError):
            return None
    return row

def update_user_token(user_id: str, token: str):
    from config import Config
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    expires = (datetime.now(timezone.utc) + timedelta(hours=Config.SESSION_TTL_HOURS)).isoformat() if token else None
    cursor.execute("UPDATE users SET token = ?, token_expires_at = ?, last_login = ? WHERE id = ?", (token, expires, now, user_id))
    conn.commit()
    conn.close()

def update_user_password(user_id: str, password_hash: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
    conn.commit()
    conn.close()

def update_user_balance(user_id: str, new_balance: float):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))
    conn.commit()
    conn.close()

def get_user_by_wallet(wallet_address: str) -> dict:
    if not wallet_address:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(wallet_address) = ?", (wallet_address.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    return row

def create_web3_user(wallet_address: str, initial_balance: float = 0.0) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    clean_addr = wallet_address.strip()
    short_addr = f"{clean_addr[:6]}...{clean_addr[-4:]}"
    synthetic_email = f"{clean_addr.lower()}@blockpay.eth"
    full_name = f"Web3 Account ({short_addr})"
    password_hash = "WEB3_SIGNATURE_AUTHENTICATED"
    cursor.execute("""
        INSERT INTO users (id, email, password_hash, full_name, wallet_address, balance, auth_provider, provider_id, created_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?, 'web3', ?, ?, ?)
    """, (user_id, synthetic_email, password_hash, full_name, clean_addr, initial_balance, clean_addr.lower(), now, now))
    conn.commit()
    user = get_user_by_id(user_id)
    conn.close()
    return user

def create_or_get_google_user(email: str, full_name: str, google_id: str = None, avatar_url: str = None, wallet_address: str = None, initial_balance: float = 10000.0) -> dict:
    clean_email = email.lower().strip()
    user = get_user_by_email(clean_email)
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if user:
        if wallet_address and wallet_address.startswith("0x"):
            cursor.execute("""
                UPDATE users
                SET auth_provider = 'google', provider_id = COALESCE(?, provider_id),
                    avatar_url = COALESCE(?, avatar_url), wallet_address = ?, last_login = ?
                WHERE id = ?
            """, (google_id, avatar_url, wallet_address, now, user["id"]))
        else:
            cursor.execute("""
                UPDATE users
                SET auth_provider = 'google', provider_id = COALESCE(?, provider_id),
                    avatar_url = COALESCE(?, avatar_url), last_login = ?
                WHERE id = ?
            """, (google_id, avatar_url, now, user["id"]))
        conn.commit()
        updated_user = get_user_by_id(user["id"])
        conn.close()
        return updated_user

    user_id = str(uuid.uuid4())
    final_wallet = wallet_address if (wallet_address and wallet_address.startswith("0x")) else ("0x" + secrets.token_hex(20))
    password_hash = "GOOGLE_OAUTH_AUTHENTICATED"
    cursor.execute("""
        INSERT INTO users (id, email, password_hash, full_name, wallet_address, balance, auth_provider, provider_id, avatar_url, created_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?, 'google', ?, ?, ?, ?)
    """, (user_id, clean_email, password_hash, full_name.strip(), final_wallet, initial_balance, google_id, avatar_url, now, now))
    conn.commit()
    new_user = get_user_by_id(user_id)
    conn.close()
    return new_user

def set_web3_nonce(address: str, nonce: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO web3_nonces (address, nonce, created_at)
        VALUES (?, ?, ?)
        ON CONFLICT(address) DO UPDATE SET nonce = excluded.nonce, created_at = excluded.created_at
    """, (address.lower().strip(), nonce, now))
    conn.commit()
    conn.close()

def get_web3_nonce(address: str) -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nonce FROM web3_nonces WHERE address = ?", (address.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    return row["nonce"] if row else None

def delete_web3_nonce(address: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM web3_nonces WHERE address = ?", (address.lower().strip(),))
    conn.commit()
    conn.close()

def add_transaction(user_id: str, tx_type: str, amount: float, counterparty_address: str,
                    tx_hash: str, currency: str = "POL", counterparty_name: str = None,
                    status: str = "success", note: str = None) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    tx_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO transactions (id, user_id, type, amount, currency, counterparty_address, counterparty_name, tx_hash, status, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (tx_id, user_id, tx_type, amount, currency, counterparty_address, counterparty_name, tx_hash, status, note, now))
    user = get_user_by_id(user_id)
    if user and status != "submitted":
        current_bal = float(user["balance"])
        if tx_type == "sent":
            new_bal = max(0.0, current_bal - amount)
        else:
            new_bal = current_bal + amount
        cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (new_bal, user_id))

    # Bi-directional P2P transfer: if counterparty is another registered user, credit their ledger
    if tx_type == "sent" and counterparty_address:
        clean_addr = counterparty_address.strip().lower()
        cursor.execute("SELECT * FROM users WHERE LOWER(wallet_address) = ? OR LOWER(email) = ?", (clean_addr, clean_addr))
        recipient_user = cursor.fetchone()
        if recipient_user and recipient_user["id"] != user_id:
            rec_id = str(uuid.uuid4())
            rec_hash = f"{tx_hash}-rx"
            sender_addr = user["wallet_address"] if user else "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
            sender_name = user["full_name"] if user else "BlockPay User"
            cursor.execute("""
                INSERT INTO transactions (id, user_id, type, amount, currency, counterparty_address, counterparty_name, tx_hash, status, note, created_at)
                VALUES (?, ?, 'received', ?, ?, ?, ?, ?, 'success', ?, ?)
            """, (rec_id, recipient_user["id"], amount, currency, sender_addr, sender_name, rec_hash, note or f"Transfer from {sender_name}", now))
            rec_new_bal = float(recipient_user["balance"]) + amount
            cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (rec_new_bal, recipient_user["id"]))

    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def transfer_between_users(sender_id: str, recipient_address: str, amount: float,
                           tx_hash: str, currency: str = "POL", note: str = "") -> tuple:
    """Atomically move test-ledger funds between two registered BlockPay users."""
    import math
    if not isinstance(amount, (int, float)) or not math.isfinite(float(amount)) or float(amount) <= 0:
        raise ValueError("Amount must be a finite positive number.")
    if currency.upper() != "POL":
        raise ValueError("Internal transfers currently support POL test funds only.")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if get_active_engine() == "sqlite":
            cursor.execute("BEGIN IMMEDIATE")
        cursor.execute("SELECT * FROM users WHERE id = ?", (sender_id,))
        sender = cursor.fetchone()
        cursor.execute("SELECT * FROM users WHERE LOWER(wallet_address) = ? OR LOWER(email) = ?",
                       (recipient_address.strip().lower(), recipient_address.strip().lower()))
        recipient = cursor.fetchone()
        if not sender or not recipient:
            raise LookupError("Recipient must be a registered BlockPay account.")
        if sender["id"] == recipient["id"]:
            raise ValueError("Sender and recipient must be different accounts.")
        sender_balance = float(sender["balance"])
        amount = float(amount)
        if sender_balance < amount:
            raise ValueError("Insufficient test-fund balance.")
        now = datetime.now(timezone.utc).isoformat()
        sender_tx_id = str(uuid.uuid4())
        recipient_tx_id = str(uuid.uuid4())
        cursor.execute("UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
                       (amount, sender_id, amount))
        if cursor.rowcount != 1:
            raise ValueError("Insufficient test-fund balance.")
        cursor.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (amount, recipient["id"]))
        cursor.execute("""INSERT INTO transactions
            (id,user_id,type,amount,currency,counterparty_address,counterparty_name,tx_hash,status,note,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""", (sender_tx_id, sender_id, "sent", amount, currency.upper(),
            recipient["wallet_address"], recipient["full_name"], tx_hash, "success", note, now))
        cursor.execute("""INSERT INTO transactions
            (id,user_id,type,amount,currency,counterparty_address,counterparty_name,tx_hash,status,note,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""", (recipient_tx_id, recipient["id"], "received", amount, currency.upper(),
            sender["wallet_address"], sender["full_name"], f"{tx_hash}-rx", "success", note, now))
        conn.commit()
        return get_user_by_id(sender_id), get_user_by_id(recipient["id"]), sender_tx_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def record_test_funding(user_id: str, amount: float, tx_hash: str = None) -> dict:
    import math
    if not isinstance(amount, (int, float)) or not math.isfinite(float(amount)) or float(amount) <= 0:
        raise ValueError("Funding amount must be a finite positive number.")
    tx_hash = tx_hash or ("testfund-" + uuid.uuid4().hex)
    from config import Config
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user: raise LookupError("Account not found.")
        cursor.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = ? AND note = ?", (user_id, "Explicit test-fund allocation"))
        funded = float((cursor.fetchone() or {}).get("total", 0) or 0)
        if funded + float(amount) > Config.TEST_FUNDING_LIMIT:
            raise ValueError(f"Test funding limit is {Config.TEST_FUNDING_LIMIT:.2f} POL per account.")
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (float(amount), user_id))
        cursor.execute("""INSERT INTO transactions
            (id,user_id,type,amount,currency,counterparty_address,counterparty_name,tx_hash,status,note,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""", (str(uuid.uuid4()), user_id, "received", float(amount), "POL",
            "0x0000000000000000000000000000000000000000", "BlockPay Test Fund", tx_hash, "success",
            "Explicit test-fund allocation", now))
        conn.commit()
        return get_user_by_id(user_id)
    except Exception:
        conn.rollback(); raise
    finally:
        conn.close()

def get_user_transactions(user_id: str, limit: int = 50) -> list:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    """, (user_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_transaction_by_hash(tx_hash: str, user_id: str = None) -> dict:
    conn = get_db_connection(); cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM transactions WHERE tx_hash = ? AND user_id = ?", (tx_hash, user_id))
    else:
        cursor.execute("SELECT * FROM transactions WHERE tx_hash = ?", (tx_hash,))
    row = cursor.fetchone(); conn.close(); return row

def get_user_contacts(user_id: str) -> list:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM contacts
        WHERE user_id = ?
        ORDER BY LOWER(name) ASC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_contact_by_id(contact_id: str, user_id: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM contacts
        WHERE id = ? AND user_id = ?
    """, (contact_id, user_id))
    row = cursor.fetchone()
    conn.close()
    return row

def create_contact(user_id: str, name: str, address: str, email: str = "") -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    contact_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO contacts (id, user_id, name, address, email, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (contact_id, user_id, name.strip(), address.strip().lower(), email.strip().lower() if email else "", now))
    conn.commit()
    cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def update_contact(contact_id: str, user_id: str, name: str, address: str, email: str = "") -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE contacts
        SET name = ?, address = ?, email = ?
        WHERE id = ? AND user_id = ?
    """, (name.strip(), address.strip().lower(), email.strip().lower() if email else "", contact_id, user_id))
    conn.commit()
    cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def delete_contact(contact_id: str, user_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM contacts
        WHERE id = ? AND user_id = ?
    """, (contact_id, user_id))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_contact_by_name(user_id: str, name: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM contacts
        WHERE user_id = ? AND LOWER(name) = LOWER(?)
    """, (user_id, name.strip()))
    row = cursor.fetchone()
    if not row:
        cursor.execute("""
            SELECT * FROM contacts
            WHERE user_id = ? AND LOWER(name) LIKE ?
            LIMIT 1
        """, (user_id, f"%{name.strip().lower()}%"))
        row = cursor.fetchone()
    conn.close()
    return row

def create_invoice(user_id: str, client_name: str, amount: float, due_date: str,
                   currency: str = "POL", client_email: str = "", description: str = "",
                   status: str = "pending") -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    inv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO invoices (id, user_id, client_name, client_email, amount, currency, due_date, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (inv_id, user_id, client_name.strip(), client_email.strip().lower() if client_email else "",
          float(amount), currency.upper(), due_date, description or f"Invoice for {client_name}", status, now))
    conn.commit()
    cursor.execute("SELECT * FROM invoices WHERE id = ?", (inv_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def get_user_invoices(user_id: str, status: str = None) -> list:
    conn = get_db_connection()
    cursor = conn.cursor()
    if status and status != "all":
        cursor.execute("""
            SELECT * FROM invoices
            WHERE user_id = ? AND status = ?
            ORDER BY created_at DESC
        """, (user_id, status))
    else:
        cursor.execute("""
            SELECT * FROM invoices
            WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_invoice_by_id(invoice_id: str, user_id: str = None) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM invoices WHERE id = ? AND user_id = ?", (invoice_id, user_id))
    else:
        cursor.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def pay_invoice(invoice_id: str, user_id: str) -> dict:
    """Settle an invoice by atomically moving POL from payer to invoice owner."""
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        if get_active_engine() == "sqlite":
            cursor.execute("BEGIN IMMEDIATE")
        cursor.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,))
        invoice = cursor.fetchone()
        if not invoice:
            return None
        if invoice["status"] == "paid":
            raise ValueError("Invoice has already been paid.")
        if invoice["user_id"] == user_id:
            raise ValueError("The invoice owner cannot pay their own invoice.")
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)); payer = cursor.fetchone()
        cursor.execute("SELECT * FROM users WHERE id = ?", (invoice["user_id"],)); owner = cursor.fetchone()
        if not payer or not owner:
            raise LookupError("Invoice account not found.")
        amount = float(invoice["amount"])
        if float(payer["balance"]) < amount:
            raise ValueError("Insufficient test-fund balance.")
        now = datetime.now(timezone.utc).isoformat(); tx_hash = "invoice-" + uuid.uuid4().hex
        cursor.execute("UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?", (amount, user_id, amount))
        if cursor.rowcount != 1: raise ValueError("Insufficient test-fund balance.")
        cursor.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (amount, owner["id"]))
        for uid, typ, addr, name, suffix in ((user_id, "sent", owner["wallet_address"], owner["full_name"], ""), (owner["id"], "received", payer["wallet_address"], payer["full_name"], "-rx")):
            cursor.execute("""INSERT INTO transactions (id,user_id,type,amount,currency,counterparty_address,counterparty_name,tx_hash,status,note,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)""", (str(uuid.uuid4()), uid, typ, amount, invoice["currency"], addr, name, tx_hash + suffix, "success", f"Invoice {invoice_id}", now))
        cursor.execute("UPDATE invoices SET status = 'paid' WHERE id = ? AND status = 'pending'", (invoice_id,))
        if cursor.rowcount != 1: raise ValueError("Invoice has already been paid.")
        conn.commit(); cursor.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)); return cursor.fetchone()
    except Exception:
        conn.rollback(); raise
    finally:
        conn.close()
