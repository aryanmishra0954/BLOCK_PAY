import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.db import PostgresCursorWrapper

class TestPostgresEngine(unittest.TestCase):
    def test_query_placeholder_conversion(self):
        class MockRawCursor:
            def __init__(self):
                self.executed_sql = None
                self.executed_params = None
                self.rowcount = 1
            def execute(self, sql, params=None):
                self.executed_sql = sql
                self.executed_params = params
            def fetchone(self):
                return {"id": "test_id", "email": "dev@blockpay.finance"}
            def fetchall(self):
                return [{"id": "test_id", "email": "dev@blockpay.finance"}]
            def close(self):
                pass

        raw = MockRawCursor()
        wrapper = PostgresCursorWrapper(raw)

        # 1. Test ? -> %s conversion
        wrapper.execute("SELECT * FROM users WHERE email = ? AND token = ?", ("dev@blockpay.finance", "sample_token"))
        self.assertEqual(raw.executed_sql, "SELECT * FROM users WHERE email = %s AND token = %s")
        self.assertEqual(raw.executed_params, ("dev@blockpay.finance", "sample_token"))

        # 2. Test ORDER BY case conversion
        wrapper.execute("SELECT * FROM contacts WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC", ("user_123",))
        self.assertEqual(raw.executed_sql, "SELECT * FROM contacts WHERE user_id = %s ORDER BY LOWER(name) ASC")

        # 3. Test fetch returns dict
        record = wrapper.fetchone()
        self.assertIsInstance(record, dict)
        self.assertEqual(record["email"], "dev@blockpay.finance")

if __name__ == "__main__":
    unittest.main()
