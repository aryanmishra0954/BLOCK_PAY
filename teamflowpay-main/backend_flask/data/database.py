"""
Simple in-memory database for BlockPay.
Replace with real database (PostgreSQL, MongoDB, etc.) in production.
"""

class InMemoryDatabase:
    """In-memory data store with CRUD operations for payments, clients, and reminders."""

    def __init__(self):
        self.payments = []
        self.clients = []
        self.reminders = []
        self._initialize_sample_data()

    def _initialize_sample_data(self):
        """Populate the database with sample records."""

        self.clients = [
            {
                "id": "1",
                "name": "Ditre Italia",
                "email": "contact@ditreitalia.com",
                "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "phone": "+91 9876543210",
                "created_at": "2025-11-01T10:00:00Z",
            },
            {
                "id": "2",
                "name": "Gamma",
                "email": "info@gamma.com",
                "wallet_address": "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
                "phone": "+91 9876543211",
                "created_at": "2025-11-05T14:30:00Z",
            },
            {
                "id": "3",
                "name": "Acme Corp",
                "email": "sales@acmecorp.com",
                "wallet_address": None,
                "phone": "+91 9876543212",
                "created_at": "2025-11-10T09:15:00Z",
            },
        ]

        self.payments = [
            {
                "id": "p1",
                "vendor": "Ditre Italia",
                "amount": 5000,
                "currency": "INR",
                "due_date": "2025-12-05",
                "description": "Monthly service fee",
                "status": "pending",
                "created_at": "2025-11-15T10:00:00Z",
            },
            {
                "id": "p2",
                "vendor": "Gamma",
                "amount": 12000,
                "currency": "INR",
                "due_date": "2025-11-30",
                "description": "Project milestone payment",
                "status": "pending",
                "created_at": "2025-11-20T14:30:00Z",
            },
        ]

        self.reminders = [
            {
                "id": "r1",
                "message": "Review monthly expenses",
                "date": "2025-12-01",
                "time": "10:00",
                "status": "active",
                "created_at": "2025-11-25T12:00:00Z",
            },
        ]

    def get_payments(self):
        return list(self.payments)

    def get_payment_by_id(self, payment_id):
        return next((p for p in self.payments if p["id"] == payment_id), None)

    def add_payment(self, payment):
        self.payments.append(payment)
        return payment

    def update_payment(self, payment_id, updates):
        for i, p in enumerate(self.payments):
            if p["id"] == payment_id:
                self.payments[i] = {**p, **updates}
                return self.payments[i]
        return None

    def delete_payment(self, payment_id):
        for i, p in enumerate(self.payments):
            if p["id"] == payment_id:
                return self.payments.pop(i)
        return None

    def get_clients(self):
        return list(self.clients)

    def get_client_by_id(self, client_id):
        return next((c for c in self.clients if c["id"] == client_id), None)

    def get_client_by_name(self, name):
        return next(
            (c for c in self.clients if c["name"].lower() == name.lower()), None
        )

    def add_client(self, client):
        self.clients.append(client)
        return client

    def update_client(self, client_id, updates):
        for i, c in enumerate(self.clients):
            if c["id"] == client_id:
                self.clients[i] = {**c, **updates}
                return self.clients[i]
        return None

    def delete_client(self, client_id):
        for i, c in enumerate(self.clients):
            if c["id"] == client_id:
                return self.clients.pop(i)
        return None

    def get_reminders(self):
        return list(self.reminders)

    def get_reminder_by_id(self, reminder_id):
        return next((r for r in self.reminders if r["id"] == reminder_id), None)

    def add_reminder(self, reminder):
        self.reminders.append(reminder)
        return reminder

    def update_reminder(self, reminder_id, updates):
        for i, r in enumerate(self.reminders):
            if r["id"] == reminder_id:
                self.reminders[i] = {**r, **updates}
                return self.reminders[i]
        return None

    def delete_reminder(self, reminder_id):
        for i, r in enumerate(self.reminders):
            if r["id"] == reminder_id:
                return self.reminders.pop(i)
        return None

    def reset(self):
        """Reset all collections and reload sample data."""
        self.payments = []
        self.clients = []
        self.reminders = []
        self._initialize_sample_data()

    def get_stats(self):
        return {
            "payments": len(self.payments),
            "clients": len(self.clients),
            "reminders": len(self.reminders),
            "pending_payments": len(
                [p for p in self.payments if p["status"] == "pending"]
            ),
        }

db = InMemoryDatabase()
