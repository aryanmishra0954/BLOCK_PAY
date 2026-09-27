"""Amoy RPC access. Never derive settlement from client-supplied status or amounts."""
import os
import re
import requests
from decimal import Decimal

CHAIN_ID = 80002

def address(value):
    if not isinstance(value, str) or not re.fullmatch(r'0x[0-9a-fA-F]{40}', value):
        raise ValueError('A valid EVM wallet address is required.')
    if int(value, 16) == 0:
        raise ValueError('The zero address is not a payment recipient.')
    return value.lower()

def rpc(method, params):
    url = os.getenv('AMOY_RPC_URL', 'https://polygon-amoy.drpc.org')
    try:
        response = requests.post(url, json={'jsonrpc':'2.0','id':1,'method':method,'params':params}, timeout=12)
        response.raise_for_status()
        result = response.json()
        if result.get('error') or 'result' not in result:
            raise ValueError('RPC rejected the request.')
        return result['result']
    except (requests.RequestException, ValueError) as exc:
        raise ConnectionError('Amoy network is unavailable. Try again; do not resend an already submitted payment.') from exc

def ensure_network():
    if int(rpc('eth_chainId', []), 16) != CHAIN_ID:
        raise ConnectionError('The configured RPC is not Polygon Amoy.')

def balance_for(wallet):
    ensure_network()
    return str(Decimal(int(rpc('eth_getBalance', [address(wallet),'latest']),16)) / Decimal(10**18))

def inspect_transfer(tx_hash):
    if not isinstance(tx_hash,str) or not re.fullmatch(r'0x[0-9a-fA-F]{64}',tx_hash):
        raise ValueError('A valid transaction hash is required.')
    ensure_network()
    tx = rpc('eth_getTransactionByHash',[tx_hash])
    if not tx:
        raise LookupError('Transaction not yet visible on Amoy. Keep the hash and refresh history.')
    if tx.get('chainId') and int(tx['chainId'],16) != CHAIN_ID:
        raise ValueError('Wrong transaction network.')
    if tx.get('input','0x') not in ('0x','0x0') or not tx.get('to'):
        raise ValueError('Only native POL transfers are supported.')
    value = int(tx['value'],16)
    if value <= 0:
        raise ValueError('The transfer amount must be positive.')
    receipt = rpc('eth_getTransactionReceipt',[tx_hash])
    status = 'pending'
    fee = '0'
    confirmations = 0
    if receipt:
        if receipt.get('transactionHash','').lower() != tx_hash.lower() or receipt.get('blockHash') != tx.get('blockHash'):
            raise ValueError('Transaction receipt mismatch.')
        block = rpc('eth_getBlockByNumber',[receipt['blockNumber'],False])
        if not block or block.get('hash') != receipt['blockHash']:
            raise LookupError('Transaction is awaiting a canonical block. Refresh later.')
        latest = int(rpc('eth_blockNumber',[]),16)
        confirmations = max(0, latest-int(receipt['blockNumber'],16)+1)
        status = ('success' if int(receipt['status'],16)==1 else 'failed') if confirmations >= 2 else 'pending'
        fee = str(Decimal(int(receipt['gasUsed'],16)*int(receipt.get('effectiveGasPrice',tx.get('gasPrice','0x0')),16))/Decimal(10**18))
    return {'tx_hash':tx_hash.lower(),'sender':address(tx['from']),'recipient':address(tx['to']),
            'amount':str(Decimal(value)/Decimal(10**18)),'status':status,'fee':fee,'confirmations':confirmations}
