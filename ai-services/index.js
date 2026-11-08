require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { port } = require("./src/config/llm.config");
const aiRoutes = require("./src/routes/ai.routes");
const errorMiddleware = require("./src/middlewares/error.middleware");

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-internal-api-key"],
  }),
);
app.use(express.json({ limit: "10mb" }));

/**
 * Health check endpoint for monitoring service availability and LLM configuration.
 */
app.get("/health", (req, res) =>
  res.json({
    status: "ok",
    service: "aums-ai-services",
    memory: process.memoryUsage(),
    aiAdapter: {
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      internalAuthConfigured: Boolean(process.env.INTERNAL_API_KEY),
    },
  }),
);

app.use("/api/v1/ai", aiRoutes);

app.use((req, res) =>
  res.status(200).json({
    success: false,
    fallbackUsed: false,
    usedProvider: "none",
    executionTimeMs: 0,
    error: "Route not found",
    data: null,
  }),
);
app.use(errorMiddleware);

let server;

/**
 * Starts the HTTP server listener for AUMS AI microservice.
 *
 * @returns {import("http").Server} Initialized HTTP server instance.
 */
function startServer() {
  server = app.listen(port, () =>
    console.log(`[aums-ai-services] AI service listening on port ${port}`),
  );
  return server;
}

/**
 * Gracefully shuts down the HTTP server upon receiving OS lifecycle signals.
 *
 * @param {string} signal - Signal received (e.g. SIGTERM, SIGINT).
 * @returns {void}
 */
function gracefulShutdown(signal) {
  console.log(`[aums-ai-services] ${signal} received; shutting down gracefully.`);
  if (!server) return process.exit(0);
  return server.close((error) => {
    if (error) {
      console.error("[aums-ai-services] Graceful shutdown failed:", error);
      process.exitCode = 1;
    }
    process.exit();
  });
}

if (require.main === module) {
  startServer();
  process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.once("SIGINT", () => gracefulShutdown("SIGINT"));
}

module.exports = app;
module.exports.startServer = startServer;
