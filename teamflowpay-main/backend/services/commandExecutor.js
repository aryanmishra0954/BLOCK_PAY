const { v4: uuidv4 } = require("uuid");
const db = require("../data/database");

/**
 * Validate command structure
 */
function validateCommand(command) {
  const errors = [];

  if (!command || typeof command !== "object") {
    errors.push("Command must be a valid object");
    return { valid: false, errors };
  }

  if (!command.action) {
    errors.push("Missing required field: action");
  }

  const validActions = [
    "create_payment",
    "show_pending_payments",
    "export_report",
    "set_reminder",
    "add_client",
    "check_balance_reminders",
  ];

  if (command.action && !validActions.includes(command.action)) {
    errors.push(
      `Invalid action: ${command.action}. Valid actions: ${validActions.join(
        ", "
      )}`
    );
  }

  // Action-specific validation
  if (command.action === "create_payment") {
    if (!command.data) {
      errors.push("Missing required field: data");
    } else {
      if (!command.data.vendor)
        errors.push("Missing required field: data.vendor");
      if (!command.data.amount)
        errors.push("Missing required field: data.amount");
      if (
        command.data.amount &&
        (typeof command.data.amount !== "number" || command.data.amount <= 0)
      ) {
        errors.push("Amount must be a positive number");
      }
    }
  }

  if (command.action === "export_report") {
    if (!command.data?.period) {
      errors.push("Missing required field: data.period");
    }
  }

  if (command.action === "set_reminder") {
    if (!command.data?.message)
      errors.push("Missing required field: data.message");
    if (!command.data?.date) errors.push("Missing required field: data.date");
  }

  if (command.action === "add_client") {
    if (!command.data?.name) errors.push("Missing required field: data.name");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Execute a validated command
 */
async function executeCommand(command) {
  const handlers = {
    create_payment: handleCreatePayment,
    show_pending_payments: handleShowPendingPayments,
    export_report: handleExportReport,
    set_reminder: handleSetReminder,
    add_client: handleAddClient,
    check_balance_reminders: handleCheckBalanceReminders,
  };

  const handler = handlers[command.action];
  if (!handler) {
    throw createError(`Unknown action: ${command.action}`, 400);
  }

  return await handler(command.data || {});
}

/**
 * Handler: Create Payment
 */
async function handleCreatePayment(data) {
  const payment = {
    id: uuidv4(),
    vendor: data.vendor,
    amount: data.amount,
    currency: data.currency || "INR",
    due_date: data.due_date || null,
    description: data.description || "",
    status: "pending",
    created_at: new Date().toISOString(),
  };

  // Check if vendor exists
  const vendor = db.getClientByName(data.vendor);
  if (!vendor) {
    console.warn(`Vendor not found: ${data.vendor}. Creating payment anyway.`);
  }

  db.addPayment(payment);

  return {
    id: payment.id,
    vendor: payment.vendor,
    amount: payment.amount,
    currency: payment.currency,
    due_date: payment.due_date,
    status: payment.status,
    message: `Payment created successfully for ${payment.vendor}`,
  };
}

/**
 * Handler: Show Pending Payments
 */
async function handleShowPendingPayments(data) {
  const filter = data.filter || "all";
  const vendor = data.vendor || null;

  let payments = db.getPayments();

  // Filter by status (only pending)
  payments = payments.filter((p) => p.status === "pending");

  // Filter by vendor if specified
  if (vendor) {
    payments = payments.filter((p) =>
      p.vendor.toLowerCase().includes(vendor.toLowerCase())
    );
  }

  // Filter by time
  const today = new Date();
  if (filter === "overdue") {
    payments = payments.filter((p) => {
      if (!p.due_date) return false;
      return new Date(p.due_date) < today;
    });
  } else if (filter === "upcoming") {
    payments = payments.filter((p) => {
      if (!p.due_date) return true;
      return new Date(p.due_date) >= today;
    });
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    payments: payments.map((p) => ({
      id: p.id,
      vendor: p.vendor,
      amount: p.amount,
      currency: p.currency,
      due_date: p.due_date,
      status: p.status,
    })),
    count: payments.length,
    total_amount: totalAmount,
    filter: filter,
  };
}

/**
 * Handler: Export Report
 */
async function handleExportReport(data) {
  const period = data.period;
  const format = data.format || "csv";

  const payments = db.getPayments();
  const clients = db.getClients();

  // Filter by period (basic implementation)
  let filteredPayments = payments;
  const currentYear = new Date().getFullYear();

  if (period.toLowerCase().includes("november")) {
    filteredPayments = payments.filter((p) => {
      const date = new Date(p.created_at);
      return date.getMonth() === 10 && date.getFullYear() === currentYear;
    });
  }

  // Generate report data
  const reportData = {
    period: period,
    generated_at: new Date().toISOString(),
    total_payments: filteredPayments.length,
    total_amount: filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    payments: filteredPayments,
    clients: clients.length,
  };

  // In a real implementation, you would generate CSV/PDF here
  const filename = `flowpay_report_${period
    .toLowerCase()
    .replace(/\s+/g, "_")}_${Date.now()}.${format}`;

  return {
    filename: filename,
    format: format,
    records: filteredPayments.length,
    total_amount: reportData.total_amount,
    download_url: `/api/agent/download/${filename}`,
    message: `Report exported successfully: ${filteredPayments.length} records`,
  };
}

/**
 * Handler: Set Reminder
 */
async function handleSetReminder(data) {
  const reminder = {
    id: uuidv4(),
    message: data.message,
    date: data.date,
    time: data.time || "09:00",
    status: "active",
    created_at: new Date().toISOString(),
  };

  db.addReminder(reminder);

  return {
    id: reminder.id,
    message: reminder.message,
    date: reminder.date,
    time: reminder.time,
    status: reminder.status,
  };
}

/**
 * Handler: Add Client
 */
async function handleAddClient(data) {
  // Check if client already exists
  const existing = db.getClientByName(data.name);
  if (existing) {
    throw createError(`Client already exists: ${data.name}`, 400);
  }

  const client = {
    id: uuidv4(),
    name: data.name,
    email: data.email || null,
    wallet_address: data.wallet_address || null,
    phone: data.phone || null,
    created_at: new Date().toISOString(),
  };

  db.addClient(client);

  return {
    id: client.id,
    name: client.name,
    email: client.email,
    message: `Client ${client.name} added successfully`,
  };
}

/**
 * Create error object with status code
 */
function createError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Handler: Check Balance and Create Reminders
 * Checks if user has sufficient balance for upcoming payments
 * and creates reminders 1 day before if balance is low
 */
async function handleCheckBalanceReminders(data) {
  const userBalance = data?.balance || 0;
  const walletAddress = data?.walletAddress || "unknown";

  // Get all pending payments
  const allPayments = db.getPayments();
  const pendingPayments = allPayments.filter((p) => p.status === "pending");

  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Check each pending payment
  const lowBalancePayments = [];
  const remindersCreated = [];

  for (const payment of pendingPayments) {
    const dueDate = new Date(payment.due_date);
    const oneDayBefore = new Date(dueDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(0, 0, 0, 0);

    const oneDayBeforeStr = oneDayBefore.toISOString().split("T")[0];

    // Check if we should remind tomorrow (1 day before due date)
    if (oneDayBeforeStr === tomorrowStr && userBalance < payment.amount) {
      lowBalancePayments.push({
        vendor: payment.vendor,
        amount: payment.amount,
        currency: payment.currency,
        due_date: payment.due_date,
        shortfall: payment.amount - userBalance,
      });

      // Create reminder
      const reminder = {
        id: `r_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "low_balance",
        message: `⚠️ Low Balance Alert: Payment of ${
          payment.currency === "INR" ? "₹" : "$"
        }${payment.amount.toLocaleString()} to ${payment.vendor} is due on ${
          payment.due_date
        }. Current balance: ${
          payment.currency === "INR" ? "₹" : "$"
        }${userBalance.toLocaleString()}. Shortfall: ${
          payment.currency === "INR" ? "₹" : "$"
        }${(payment.amount - userBalance).toLocaleString()}`,
        date: oneDayBeforeStr,
        time: "09:00",
        status: "active",
        payment_id: payment.id,
        created_at: new Date().toISOString(),
      };

      db.addReminder(reminder);
      remindersCreated.push(reminder);
    }
  }

  return {
    success: true,
    action: "check_balance_reminders",
    data: {
      current_balance: userBalance,
      wallet_address: walletAddress,
      total_pending_payments: pendingPayments.length,
      low_balance_count: lowBalancePayments.length,
      low_balance_payments: lowBalancePayments,
      reminders_created: remindersCreated.length,
      reminders: remindersCreated,
      message:
        lowBalancePayments.length > 0
          ? `⚠️ Low balance detected! You have ${lowBalancePayments.length} upcoming payment(s) with insufficient balance.`
          : `✅ All good! You have sufficient balance for upcoming payments.`,
    },
  };
}

module.exports = {
  validateCommand,
  executeCommand,
};
