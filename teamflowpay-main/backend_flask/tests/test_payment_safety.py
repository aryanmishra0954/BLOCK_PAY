"""Regression checks use a temporary database, never the development ledger."""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import Config
from data import db
from flask import Flask
from routes.auth import auth_bp
from routes.transactions import transactions_bp
from routes.agent import agent_bp
from services.command_executor import execute_command, CommandError

class PaymentSafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.patches = [patch.object(db, 'DB_PATH', str(Path(self.temp.name)/'test.db')), patch.object(db, 'get_db_url', return_value='')]
        for p in self.patches: p.start()
        db.init_db()
        app = Flask(__name__)
        app.register_blueprint(auth_bp)
        app.register_blueprint(transactions_bp)
        app.register_blueprint(agent_bp)
        self.client = app.test_client()
        self.a = db.create_user('sender@test.local','GOOGLE_OAUTH_AUTHENTICATED','Sender','0x'+'1'*40,100)
        self.b = db.create_user('recipient@test.local','unused','Recipient','0x'+'2'*40,0)
        db.update_user_token(self.a['id'], 'test-token')
        self.headers = {'Authorization':'Bearer test-token'}
    def tearDown(self):
        for p in reversed(self.patches): p.stop()
        self.temp.cleanup()
    def command(self, **overrides):
        data = dict(recipient=self.b['wallet_address'], amount=10, currency='POL')
        data.update(overrides)
        return execute_command({'action':'create_payment','data':data}, self.a)
    def test_google_account_rejects_password_takeover(self):
        response = self.client.post('/api/auth/login',json={'email':self.a['email'],'password':'attacker-password'})
        self.assertEqual(response.status_code,401)
        self.assertEqual(db.get_user_by_id(self.a['id'])['password_hash'],'GOOGLE_OAUTH_AUTHENTICATED')
    def test_submitted_record_never_changes_balances(self):
        db.add_transaction(self.a['id'],'sent',50,self.b['wallet_address'],'pending-test',status='submitted')
        self.assertEqual(db.get_user_by_id(self.a['id'])['balance'],100)
        self.assertEqual(db.get_user_by_id(self.b['id'])['balance'],0)
        self.assertEqual(db.get_user_transactions(self.b['id']),[])
    def test_unverified_chain_request_rejected(self):
        response = self.client.post('/api/transactions', headers=self.headers, json={
            'type':'sent', 'amount':50, 'counterparty_address':self.b['wallet_address'],
            'tx_hash':'unverified-chain', 'mode':'on_chain'})
        self.assertEqual(response.status_code,400)
        self.assertEqual(db.get_user_by_id(self.b['id'])['balance'],0)
    def test_ai_route_returns_validation_error(self):
        response = self.client.post('/api/agent/execute', headers=self.headers, json={
            'action':'create_payment','data':{'recipient':self.b['wallet_address'],'amount':101}})
        self.assertEqual(response.status_code,400)

    def test_ai_rejects_invalid_payments(self):
        for change in [{'amount':101},{'amount':0},{'amount':-1},{'amount':True},{'amount':float('nan')},{'currency':'USD'},{'recipient':self.a['wallet_address']},{'recipient':'0x'+'3'*40}]:
            with self.subTest(change=change), self.assertRaises(CommandError): self.command(**change)
    def test_ambiguous_contact_rejected(self):
        db.create_contact(self.a['id'],'Alex One',self.b['wallet_address'])
        db.create_contact(self.a['id'],'Alex Two','0x'+'3'*40)
        with self.assertRaisesRegex(CommandError,'Multiple contacts'): self.command(recipient='Alex')
    def test_preparation_does_not_pay_and_internal_transfer_does(self):
        result = self.command()
        self.assertEqual(result['recipient'],self.b['wallet_address'])
        self.assertEqual(db.get_user_by_id(self.a['id'])['balance'],100)
        db.transfer_between_users(self.a['id'],self.b['wallet_address'],10,'confirmed-test')
        self.assertEqual(db.get_user_by_id(self.a['id'])['balance'],90)
        self.assertEqual(db.get_user_by_id(self.b['id'])['balance'],10)

if __name__ == '__main__': unittest.main()
