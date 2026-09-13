/**
 * Simple in-memory database for FlowPay
 * Replace with real database (MongoDB, PostgreSQL, etc.) in production
 */

class InMemoryDatabase {
  constructor() {
    this.payments = [];
    this.clients = [];
    this.reminders = [];
    this.initializeSampleData();
  }

  /**
   * Initialize with sample data
   */
  initializeSampleData() {
    // Sample clients
    this.clients = [
      {
        id: "1",
        name: "Ditre Italia",
        email: "contact@ditreitalia.com",
        wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        phone: "+91 9876543210",
        created_at: "2025-11-01T10:00:00Z",
      },
      {
        id: "2",
        name: "Gamma",
        email: "info@gamma.com",
        wallet_address: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
        phone: "+91 9876543211",
        created_at: "2025-11-05T14:30:00Z",
      },
      {
        id: "3",
        name: "Acme Corp",
        email: "sales@acmecorp.com",
        wallet_address: null,
        phone: "+91 9876543212",
        created_at: "2025-11-10T09:15:00Z",
      },
    ];

    // Sample payments
    this.payments = [
      {
        id: "p1",
        vendor: "Ditre Italia",
        amount: 5000,
        currency: "INR",
        due_date: "2025-12-05",
        description: "Monthly service fee",
        status: "pending",
        created_at: "2025-11-15T10:00:00Z",
      },
      {
        id: "p2",
        vendor: "Gamma",
        amount: 12000,
        currency: "INR",
        due_date: "2025-11-30",
        description: "Project milestone payment",
        status: "pending",
        created_at: "2025-11-20T14:30:00Z",
      },
    ];

    // Sample reminders
    this.reminders = [
      {
        id: "r1",
        message: "Review monthly expenses",
        date: "2025-12-01",
        time: "10:00",
        status: "active",
        created_at: "2025-11-25T12:00:00Z",
      },
    ];
  }

  // Payment methods
  getPayments() {
    return [...this.payments];
  }

  getPaymentById(id) {
    return this.payments.find((p) => p.id === id);
  }

  addPayment(payment) {
    this.payments.push(payment);
    return payment;
  }

  updatePayment(id, updates) {
    const index = this.payments.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.payments[index] = { ...this.payments[index], ...updates };
      return this.payments[index];
    }
    return null;
  }

  deletePayment(id) {
    const index = this.payments.findIndex((p) => p.id === id);
    if (index !== -1) {
      return this.payments.splice(index, 1)[0];
    }
    return null;
  }

  // Client methods
  getClients() {
    return [...this.clients];
  }

  getClientById(id) {
    return this.clients.find((c) => c.id === id);
  }

  getClientByName(name) {
    return this.clients.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
  }

  addClient(client) {
    this.clients.push(client);
    return client;
  }

  updateClient(id, updates) {
    const index = this.clients.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.clients[index] = { ...this.clients[index], ...updates };
      return this.clients[index];
    }
    return null;
  }

  deleteClient(id) {
    const index = this.clients.findIndex((c) => c.id === id);
    if (index !== -1) {
      return this.clients.splice(index, 1)[0];
    }
    return null;
  }

  // Reminder methods
  getReminders() {
    return [...this.reminders];
  }

  getReminderById(id) {
    return this.reminders.find((r) => r.id === id);
  }

  addReminder(reminder) {
    this.reminders.push(reminder);
    return reminder;
  }

  updateReminder(id, updates) {
    const index = this.reminders.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.reminders[index] = { ...this.reminders[index], ...updates };
      return this.reminders[index];
    }
    return null;
  }

  deleteReminder(id) {
    const index = this.reminders.findIndex((r) => r.id === id);
    if (index !== -1) {
      return this.reminders.splice(index, 1)[0];
    }
    return null;
  }

  // Utility methods
  reset() {
    this.payments = [];
    this.clients = [];
    this.reminders = [];
    this.initializeSampleData();
  }

  getStats() {
    return {
      payments: this.payments.length,
      clients: this.clients.length,
      reminders: this.reminders.length,
      pending_payments: this.payments.filter((p) => p.status === "pending")
        .length,
    };
  }
}

// Create singleton instance
const db = new InMemoryDatabase();

module.exports = db;
