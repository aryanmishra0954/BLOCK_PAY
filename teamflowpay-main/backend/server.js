const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const agentRouter = require("./routes/agent");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [
      "http://localhost:3000",
      "http://127.0.0.1:5500",
      "https://teamflowpay.vercel.app",
    ];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

app.get("/", (req, res) => {
  res.json({
    message: "FlowPay AI Backend API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "GET /health",
      aiCommand: "POST /api/agent/command",
      executeAction: "POST /api/agent/execute",
      availableActions: "GET /api/agent/actions",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "FlowPay AI Agent Backend",
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/agent", agentRouter);

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
    availableEndpoints: ["/health", "/api/agent/command", "/api/agent/execute"],
  });
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`\n🚀 FlowPay Backend running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(
      `🤖 AI Command API: http://localhost:${PORT}/api/agent/command`
    );
    console.log(`🔄 Execute API: http://localhost:${PORT}/api/agent/execute\n`);
  });
}

module.exports = app;
