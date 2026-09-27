"""Authenticated wallet binding and independently verified Amoy records."""
import secrets
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from eth_account import Account
from eth_account.messages import encode_defunct
from data.db import get_db_connection, get_user_by_token
from services.chain_service import address, balance_for, inspect_transfer

chain_bp = Blueprint('chain',__name__,url_prefix='/api/chain')

def init_chain_tables():
    conn=get_db_connection()
    try:
        cur=conn.cursor()
        cur.execute('CREATE TABLE IF NOT EXISTS chain_wallets (user_id TEXT PRIMARY KEY, address TEXT UNIQUE NOT NULL)')
        cur.execute('CREATE TABLE IF NOT EXISTS chain_challenges (user_id TEXT PRIMARY KEY, address TEXT NOT NULL, message TEXT NOT NULL, expires_at TEXT NOT NULL)')
        cur.execute('CREATE TABLE IF NOT EXISTS chain_transfers (tx_hash TEXT PRIMARY KEY, sender TEXT NOT NULL, recipient TEXT NOT NULL, amount TEXT NOT NULL, status TEXT NOT NULL, fee TEXT NOT NULL, confirmations INTEGER NOT NULL, created_at TEXT NOT NULL)')
        conn.commit()
    finally: conn.close()

def current_user():
    token=request.headers.get('Authorization','')
    user=get_user_by_token(token[7:]) if token.startswith('Bearer ') else None
    if not user: raise PermissionError('Sign in to BlockPay first.')
    return user

def wallet_for(user_id):
    conn=get_db_connection()
    try:
        cur=conn.cursor(); cur.execute('SELECT address FROM chain_wallets WHERE user_id=?',(user_id,)); row=cur.fetchone()
        return row['address'] if row else None
    finally: conn.close()

@chain_bp.errorhandler(Exception)
def error(exc):
    if isinstance(exc, PermissionError): code=401
    elif isinstance(exc, (ValueError,LookupError)): code=400
    elif isinstance(exc, ConnectionError): code=503
    else: return jsonify(success=False,error='Unable to complete the wallet operation.'),500
    return jsonify(success=False,error=str(exc)),code

@chain_bp.route('/challenge',methods=['POST'])
def challenge():
    user=current_user(); wallet=address((request.get_json() or {}).get('address'))
    expiry=(datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat()
    message=f'BlockPay wallet connection\nAccount: {user["id"]}\nWallet: {wallet}\nNetwork: Polygon Amoy (80002)\nNonce: {secrets.token_hex(24)}\nExpires: {expiry}\nThis signature links your wallet to this BlockPay account. It does not authorize a payment.'
    conn=get_db_connection()
    try:
        cur=conn.cursor(); cur.execute('INSERT INTO chain_challenges (user_id,address,message,expires_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET address=excluded.address,message=excluded.message,expires_at=excluded.expires_at',(user['id'],wallet,message,expiry)); conn.commit()
    finally: conn.close()
    return jsonify(message=message)

@chain_bp.route('/connect',methods=['POST'])
def connect():
    user=current_user(); signature=(request.get_json() or {}).get('signature','')
    conn=get_db_connection()
    try:
        cur=conn.cursor(); cur.execute('SELECT * FROM chain_challenges WHERE user_id=?',(user['id'],)); challenge=cur.fetchone()
        if not challenge or datetime.fromisoformat(challenge['expires_at']) < datetime.now(timezone.utc): raise ValueError('Wallet challenge expired. Connect again.')
        try: recovered=Account.recover_message(encode_defunct(text=challenge['message']),signature=signature).lower()
        except Exception: raise ValueError('Invalid wallet signature.')
        if recovered != challenge['address']: raise ValueError('The wallet signature does not match.')
        cur.execute('SELECT user_id FROM chain_wallets WHERE address=?',(recovered,)); owner=cur.fetchone()
        if owner and owner['user_id'] != user['id']: raise ValueError('This wallet is already linked to another BlockPay account.')
        cur.execute('DELETE FROM chain_challenges WHERE user_id=? AND message=?',(user['id'],challenge['message']))
        if cur.rowcount != 1: raise ValueError('Challenge already used.')
        cur.execute('INSERT INTO chain_wallets (user_id,address) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET address=excluded.address',(user['id'],recovered)); conn.commit()
    except Exception:
        conn.rollback(); raise
    finally: conn.close()
    return jsonify(success=True,address=recovered)

@chain_bp.route('/wallet')
def wallet():
    linked=wallet_for(current_user()['id'])
    return jsonify(success=True,address=linked,balance=balance_for(linked) if linked else None,chain_id=80002)

def save_transfer(tx):
    conn=get_db_connection()
    try:
        cur=conn.cursor(); cur.execute('INSERT INTO chain_transfers (tx_hash,sender,recipient,amount,status,fee,confirmations,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(tx_hash) DO UPDATE SET status=excluded.status,fee=excluded.fee,confirmations=excluded.confirmations', (tx['tx_hash'],tx['sender'],tx['recipient'],tx['amount'],tx['status'],tx['fee'],tx['confirmations'],datetime.now(timezone.utc).isoformat())); conn.commit()
    finally: conn.close()

@chain_bp.route('/transactions',methods=['POST'])
def record():
    linked=wallet_for(current_user()['id'])
    if not linked: raise ValueError('Connect and verify a wallet first.')
    tx=inspect_transfer((request.get_json() or {}).get('tx_hash'))
    if linked not in (tx['sender'],tx['recipient']): raise ValueError('This transaction does not involve your linked wallet.')
    save_transfer(tx)
    return jsonify(success=True,transaction=tx)

@chain_bp.route('/transactions')
def history():
    linked=wallet_for(current_user()['id'])
    if not linked: return jsonify(success=True,transactions=[])
    conn=get_db_connection()
    try:
        cur=conn.cursor(); cur.execute('SELECT * FROM chain_transfers WHERE sender=? OR recipient=? ORDER BY created_at DESC LIMIT 150',(linked,linked)); rows=cur.fetchall()
    finally: conn.close()
    result=[]; warnings=[]
    for row in rows:
        if row['status']=='pending':
            try:
                updated=inspect_transfer(row['tx_hash']); save_transfer(updated); row.update(updated)
            except (ConnectionError,LookupError,ValueError): warnings.append('Some pending transfers could not be refreshed. Check the explorer before resending.')
        sent=row['sender']==linked
        row.update(type='sent' if sent else 'received',currency='POL',counterparty_address=row['recipient'] if sent else row['sender'],is_on_chain=True)
        result.append(row)
    return jsonify(success=True,transactions=result,warnings=list(set(warnings)),pending_invoices_count=0)
