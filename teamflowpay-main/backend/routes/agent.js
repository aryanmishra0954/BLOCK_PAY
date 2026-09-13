const express = require("express");
const router = express.Router();
const aiService = require("../services/aiService");
const {
  executeCommand,
  validateCommand,
} = require("../services/commandExecutor");

router.post("/command", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid 'prompt' field",
      });
    }

    console.log(`📝 Received prompt: "${prompt}"`);

    const command = await aiService.generateCommand(prompt);
    console.log("🎯 Generated command:", JSON.stringify(command));

    const validation = validateCommand(command);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "AI generated invalid command",
        details: validation.errors,
        command,
      });
    }

    const result = await executeCommand(command);

    res.json({
      success: true,
      prompt,
      action: command.action,
      command,
      data: result,
    });
  } catch (error) {
    console.error("❌ Command processing error:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Command processing failed",
      prompt: req.body?.prompt,
    });
  }
});

router.post("/execute", async (req, res) => {
  try {
    const command = req.body;

    const validation = validateCommand(command);
    if (!validation.valid) {
      return res.status(400).json({
        error: "Invalid command",
        details: validation.errors,
      });
    }

    const result = await executeCommand(command);

    res.json({
      success: true,
      action: command.action,
      data: result,
    });
  } catch (error) {
    console.error("Command execution error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Command execution failed",
      action: req.body?.action,
    });
  }
});

router.get("/actions", (req, res) => {
  res.json({
    actions: [
      {
        name: "create_payment",
        description: "Create a new payment entry",
        required_fields: ["vendor", "amount"],
      },
      {
        name: "show_pending_payments",
        description: "Show pending payments",
        required_fields: [],
      },
      {
        name: "export_report",
        description: "Export transaction report",
        required_fields: ["period"],
      },
      {
        name: "set_reminder",
        description: "Set a payment reminder",
        required_fields: ["message", "date"],
      },
      {
        name: "add_client",
        description: "Add a new client/vendor",
        required_fields: ["name"],
      },
    ],
  });
});

module.exports = router;
