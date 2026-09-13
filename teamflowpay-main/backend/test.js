/**
 * Simple test script for FlowPay AI Agent Backend
 * Run with: node test.js
 */

const testCommands = [
  {
    name: "Create Payment",
    command: {
      action: "create_payment",
      data: {
        vendor: "Test Vendor",
        amount: 5000,
        currency: "INR",
        due_date: "2025-12-10",
      },
    },
  },
  {
    name: "Show Pending Payments",
    command: {
      action: "show_pending_payments",
      data: {
        filter: "all",
      },
    },
  },
  {
    name: "Export Report",
    command: {
      action: "export_report",
      data: {
        period: "November",
        format: "csv",
      },
    },
  },
  {
    name: "Set Reminder",
    command: {
      action: "set_reminder",
      data: {
        message: "Test reminder",
        date: "2025-12-01",
        time: "10:00",
      },
    },
  },
  {
    name: "Add Client",
    command: {
      action: "add_client",
      data: {
        name: "Test Client Inc",
        email: "test@testclient.com",
      },
    },
  },
];

async function runTests() {
  console.log("🧪 Testing FlowPay AI Agent Backend\n");
  console.log("Make sure the server is running on http://localhost:3000\n");

  const baseUrl = "http://localhost:3000";

  // Test health endpoint
  console.log("1. Testing health endpoint...");
  try {
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    console.log("✓ Health check:", data.status);
    console.log(`  Service: ${data.service}\n`);
  } catch (error) {
    console.error("✗ Health check failed:", error.message);
    console.log("  Make sure the server is running: npm start\n");
    return;
  }

  // Test each command
  for (const test of testCommands) {
    console.log(`${testCommands.indexOf(test) + 2}. Testing: ${test.name}`);
    try {
      const response = await fetch(`${baseUrl}/api/agent/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(test.command),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✓ ${test.name} succeeded`);
        console.log(`  Action: ${data.action}`);
        if (data.data.message) {
          console.log(`  Message: ${data.data.message}`);
        }
      } else {
        console.log(`✗ ${test.name} failed`);
        console.log(`  Error: ${data.error}`);
      }
    } catch (error) {
      console.log(`✗ ${test.name} error:`, error.message);
    }
    console.log("");
  }

  console.log("✅ Tests complete!\n");
}

// Run tests
runTests();
