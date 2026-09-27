"""Isolated migration tests: temporary SQLite and deterministic RPC fixtures."""
import sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from flask import Flask
from eth_account import Account
from eth_account.messages import encode_defunct
from data import db
from routes.chain import chain_bp,init_chain_tables
from routes.transactions import transactions_bp
from services.chain_service import inspect_transfer

class ChainTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.patches=[patch.object(db,'DB_PATH',str(Path(self.tmp.name)/'test.db')),patch.object(db,'get_db_url',return_value='')]
  for p in self.patches:p.start()
  db.init_db();init_chain_tables()
  app=Flask(__name__);app.register_blueprint(chain_bp);app.register_blueprint(transactions_bp);self.client=app.test_client()
  self.account=Account.create();self.user=db.create_user('chain@test.local','unused','Chain Test','0x'+'1'*40,123)
  db.update_user_token(self.user['id'],'token');self.headers={'Authorization':'Bearer token'}
 def tearDown(self):
  for p in reversed(self.patches):p.stop()
  self.tmp.cleanup()
 def link(self):
  result=self.client.post('/api/chain/challenge',headers=self.headers,json={'address':self.account.address})
  signature=Account.sign_message(encode_defunct(text=result.json['message']),self.account.key).signature.hex()
  return self.client.post('/api/chain/connect',headers=self.headers,json={'signature':signature}),signature
 def test_signature_and_replay(self):
  response,sig=self.link();self.assertEqual(response.status_code,200)
  self.assertEqual(self.client.post('/api/chain/connect',headers=self.headers,json={'signature':sig}).status_code,400)
 def test_invalid_signature(self):
  self.client.post('/api/chain/challenge',headers=self.headers,json={'address':self.account.address})
  self.assertEqual(self.client.post('/api/chain/connect',headers=self.headers,json={'signature':'invalid'}).status_code,400)
 def test_wallet_balance_is_not_database_balance(self):
  self.link()
  with patch('routes.chain.balance_for',return_value='0.125'):
   response=self.client.get('/api/chain/wallet',headers=self.headers)
  self.assertEqual(response.json['balance'],'0.125');self.assertEqual(db.get_user_by_id(self.user['id'])['balance'],123)
 def test_no_wallet_means_unknown_balance(self):
  self.assertIsNone(self.client.get('/api/chain/wallet',headers=self.headers).json['balance'])
 def test_legacy_mutations_retired(self):
  for path in ['/api/transactions','/api/transactions/fund','/api/transactions/invoices/old/pay']:
   self.assertEqual(self.client.post(path,headers=self.headers,json={'amount':10}).status_code,410)
 def test_authentication_required(self):
  self.assertEqual(self.client.get('/api/chain/wallet').status_code,401)
 def test_unrelated_transaction_rejected(self):
  self.link()
  with patch('routes.chain.inspect_transfer',return_value={'sender':'0x'+'2'*40,'recipient':'0x'+'3'*40}):
   self.assertEqual(self.client.post('/api/chain/transactions',headers=self.headers,json={'tx_hash':'ignored'}).status_code,400)
 def test_record_is_idempotent_and_never_changes_ledger(self):
  self.link();tx={'tx_hash':'0x'+'a'*64,'sender':self.account.address.lower(),'recipient':'0x'+'2'*40,'amount':'1','status':'success','fee':'0.001','confirmations':2}
  with patch('routes.chain.inspect_transfer',return_value=tx):
   for _ in range(2):self.assertEqual(self.client.post('/api/chain/transactions',headers=self.headers,json={'tx_hash':tx['tx_hash'],'amount':99999,'status':'success'}).status_code,200)
  history=self.client.get('/api/chain/transactions',headers=self.headers).json['transactions']
  self.assertEqual(len(history),1);self.assertEqual(history[0]['amount'],'1');self.assertEqual(db.get_user_by_id(self.user['id'])['balance'],123)

class ReceiptTests(unittest.TestCase):
 def inspect(self,receipt=None,network='0x13882',head='0xb',block_hash='0xblock'):
  tx={'from':'0x'+'1'*40,'to':'0x'+'2'*40,'value':hex(10**18),'input':'0x','blockHash':'0xblock','gasPrice':'0x2'}
  results={'eth_chainId':network,'eth_getTransactionByHash':tx,'eth_getTransactionReceipt':receipt,'eth_getBlockByNumber':{'hash':block_hash},'eth_blockNumber':head}
  with patch('services.chain_service.rpc',side_effect=lambda method,params:results[method]):return inspect_transfer('0x'+'a'*64)
 def receipt(self,status='0x1'):return {'transactionHash':'0x'+'a'*64,'blockHash':'0xblock','blockNumber':'0xa','status':status,'gasUsed':'0x5208','effectiveGasPrice':'0x2'}
 def test_pending_is_not_success(self):self.assertEqual(self.inspect()['status'],'pending')
 def test_single_confirmation_pending(self):self.assertEqual(self.inspect(self.receipt(),head='0xa')['status'],'pending')
 def test_confirmed_success(self):self.assertEqual(self.inspect(self.receipt())['status'],'success')
 def test_failed_receipt(self):self.assertEqual(self.inspect(self.receipt('0x0'))['status'],'failed')
 def test_wrong_network(self):
  with self.assertRaises(ConnectionError):self.inspect(network='0x89')
 def test_reorganized_block(self):
  with self.assertRaises(LookupError):self.inspect(self.receipt(),block_hash='different')

if __name__=='__main__':unittest.main()
