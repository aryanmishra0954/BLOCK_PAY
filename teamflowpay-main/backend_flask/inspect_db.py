"""
BlockPay Database Inspector CLI
Utility script to quickly inspect tables, schemas, and live rows in the database.

Usage:
    python backend_flask/inspect_db.py               # Summary of all tables and row counts
    python backend_flask/inspect_db.py users         # View users table
    python backend_flask/inspect_db.py transactions  # View transactions ledger
    python backend_flask/inspect_db.py invoices      # View invoices
    python backend_flask/inspect_db.py contacts      # View contacts
"""

import sys
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "BlockPay.db")

def format_cell(val, max_len=28):
    if val is None:
        return "NULL"
    s = str(val).replace("\n", " ")
    if len(s) > max_len:
        return s[:max_len - 3] + "..."
    return s

def print_table_data(cursor, table_name, limit=20):
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns_info = cursor.fetchall()
    col_names = [c[1] for c in columns_info]

    cursor.execute(f"SELECT * FROM {table_name} ORDER BY rowid DESC LIMIT {limit}")
    rows = cursor.fetchall()

    print(f"\n{'='*70}")
    print(f" TABLE: {table_name.upper()} (showing latest {len(rows)} rows)")
    print(f"{'='*70}")

    if not rows:
        print("  (Empty table - 0 records)")
        return

    # Filter out long sensitive fields like password_hash from console width if desired
    display_cols = [c for c in col_names if c not in ("password_hash", "token")]
    col_indices = [col_names.index(c) for c in display_cols]

    # Calculate column widths
    widths = {}
    for c in display_cols:
        widths[c] = max(len(c), 10)

    formatted_rows = []
    for row in rows:
        formatted_row = {}
        for c, idx in zip(display_cols, col_indices):
            cell = format_cell(row[idx])
            formatted_row[c] = cell
            widths[c] = min(max(widths[c], len(cell)), 35)
        formatted_rows.append(formatted_row)

    # Header
    header = " | ".join(c.ljust(widths[c]) for c in display_cols)
    divider = "-+-".join("-" * widths[c] for c in display_cols)
    print(header)
    print(divider)

    for r in formatted_rows:
        line = " | ".join(r[c].ljust(widths[c]) for c in display_cols)
        print(line)

def inspect_summary():
    if not os.path.exists(DB_PATH):
        print(f"[!] Database file not found at: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [t[0] for t in cursor.fetchall()]

    print("\n" + "="*60)
    print(f" BLOCKPAY DATABASE OVERVIEW ({os.path.basename(DB_PATH)})")
    print(f" Path: {DB_PATH}")
    print("="*60)

    for t in sorted(tables):
        cursor.execute(f"SELECT COUNT(*) FROM {t}")
        count = cursor.fetchone()[0]
        cursor.execute(f"PRAGMA table_info({t})")
        cols = [c[1] for c in cursor.fetchall()]
        print(f"\n* {t.upper()} ({count} records)")
        print(f"  Columns: {', '.join(cols)}")

    conn.close()
    print("\n" + "="*60)
    print("Tip: Run `python backend_flask/inspect_db.py <table_name>` to see rows.")
    print("Examples:")
    print("  python backend_flask/inspect_db.py users")
    print("  python backend_flask/inspect_db.py transactions")
    print("  python backend_flask/inspect_db.py invoices")
    print("  python backend_flask/inspect_db.py contacts")
    print("="*60 + "\n")

def main():
    if not os.path.exists(DB_PATH):
        print(f"[!] Database file does not exist at: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if len(sys.argv) > 1:
        target = sys.argv[1].strip().lower()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?;", (target,))
        if not cursor.fetchone():
            print(f"[!] Table '{target}' does not exist.")
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            print("Available tables:", [t[0] for t in cursor.fetchall()])
            sys.exit(1)
        print_table_data(cursor, target)
    else:
        inspect_summary()

    conn.close()

if __name__ == "__main__":
    main()
