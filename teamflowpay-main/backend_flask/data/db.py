"""
BlockPay SQLite Database Manager
Provides persistent storage for users, transactions, invoices, and audit logs.
"""

import os
import sqlite3
import uuid
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "BlockPay.db")


def get_db_connection():
    """Create and return a database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            wallet_address TEXT UNIQUE NOT NULL,
            balance REAL DEFAULT 10000.0,
            token TEXT,
            auth_provider TEXT DEFAULT 'email',
            provider_id TEXT,
            avatar_url TEXT,
            created_at TEXT NOT NULL,
            last_login TEXT
        )
    """)

    # Web3 challenge nonces table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS web3_nonces (
            address TEXT PRIMARY KEY,
            nonce TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    # Safe column migrations if database already existed
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN provider_id TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
    except sqlite3.OperationalError:
        pass

    # Transactions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL, -- 'sent', 'received'
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'POL',
            counterparty_address TEXT NOT NULL,
            counterparty_name TEXT,
            tx_hash TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'success', -- 'success', 'pending', 'failed'
            note TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Invoices table
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
            status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Contacts table
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


# ------------------------------------------------------------------ #
# User Operations
# ------------------------------------------------------------------ #

def create_user(email: str, password_hash: str, full_name: str, wallet_address: str, initial_balance: float = 10000.0) -> dict:
    """Create a new user record."""
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
    """Retrieve user by email."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> dict:
    """Retrieve user by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_token(token: str) -> dict:
    """Retrieve user by active session token."""
    if not token:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE token = ?", (token,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_user_token(user_id: str, token: str):
    """Set or clear a user session token."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("UPDATE users SET token = ?, last_login = ? WHERE id = ?", (token, now, user_id))
    conn.commit()
    conn.close()


def update_user_password(user_id: str, password_hash: str):
    """Update user password hash."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
    conn.commit()
    conn.close()


def update_user_balance(user_id: str, new_balance: float):
    """Update a user's current POL balance."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))
    conn.commit()
    conn.close()


def get_user_by_wallet(wallet_address: str) -> dict:
    """Retrieve user by EVM wallet address."""
    if not wallet_address:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(wallet_address) = ?", (wallet_address.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def create_web3_user(wallet_address: str, initial_balance: float = 10000.0) -> dict:
    """Create a new Web3 user authenticating via wallet signature."""
    conn = get_db_connection()
    cursor = conn.cursor()
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    clean_addr = wallet_address.strip()
    short_addr = f"{clean_addr[:6]}...{clean_addr[-4:]}"
    synthetic_email = f"{clean_addr.lower()}@BlockPay.eth"
    full_name = f"Web3 Account ({short_addr})"
    # Use empty/placeholder hash for signature-based users
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
    """Retrieve existing user or create a new user from Google / Web3Auth profile."""
    clean_email = email.lower().strip()
    user = get_user_by_email(clean_email)
    now = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()

    if user:
        # Update provider details, wallet address (if provided), and last login
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

    # Create new Google/Web3Auth user
    user_id = str(uuid.uuid4())
    import secrets
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


# ------------------------------------------------------------------ #
# Web3 Nonce Operations
# ------------------------------------------------------------------ #

def set_web3_nonce(address: str, nonce: str):
    """Store or update cryptographic challenge nonce for a wallet address."""
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
    """Retrieve challenge nonce for address."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nonce FROM web3_nonces WHERE address = ?", (address.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    return row["nonce"] if row else None


def delete_web3_nonce(address: str):
    """Consume challenge nonce."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM web3_nonces WHERE address = ?", (address.lower().strip(),))
    conn.commit()
    conn.close()


# ------------------------------------------------------------------ #
# Transaction Operations
# ------------------------------------------------------------------ #

def add_transaction(user_id: str, tx_type: str, amount: float, counterparty_address: str,
                    tx_hash: str, currency: str = "POL", counterparty_name: str = None,
                    status: str = "success", note: str = None) -> dict:
    """Record a transaction in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    tx_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO transactions (id, user_id, type, amount, currency, counterparty_address, counterparty_name, tx_hash, status, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (tx_id, user_id, tx_type, amount, currency, counterparty_address, counterparty_name, tx_hash, status, note, now))

    # Adjust user balance
    user = get_user_by_id(user_id)
    if user:
        current_bal = float(user["balance"])
        if tx_type == "sent":
            new_bal = max(0.0, current_bal - amount)
        else:
            new_bal = current_bal + amount
        cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (new_bal, user_id))

    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_transactions(user_id: str, limit: int = 50) -> list:
    """Get all transactions for a specific user ordered by created_at DESC."""
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
    return [dict(r) for r in rows]


# ------------------------------------------------------------------ #
# Contact Operations
# ------------------------------------------------------------------ #

def get_user_contacts(user_id: str) -> list:
    """Retrieve all contacts for a user ordered by name."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM contacts
        WHERE user_id = ?
        ORDER BY name COLLATE NOCASE ASC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_contact_by_id(contact_id: str, user_id: str) -> dict:
    """Get a specific contact belonging to a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM contacts
        WHERE id = ? AND user_id = ?
    """, (contact_id, user_id))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def create_contact(user_id: str, name: str, address: str, email: str = "") -> dict:
    """Create a new contact for a user."""
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
    return dict(row) if row else None


def update_contact(contact_id: str, user_id: str, name: str, address: str, email: str = "") -> dict:
    """Update an existing contact belonging to a user."""
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
    return dict(row) if row else None


def delete_contact(contact_id: str, user_id: str) -> bool:
    """Delete a contact belonging to a user."""
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
    """Search for a contact by exact or case-insensitive partial name."""
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
    return dict(row) if row else None

