const { GoogleGenAI } = require("@google/genai");

/**
 * Validates mandatory environment variables for AUMS AI services.
 */
const requiredEnvironment = ["GEMINI_API_KEY", "INTERNAL_API_KEY", "PORT"];
const missingEnvironment = requiredEnvironment.filter(
  (name) => !String(process.env[name] || "").trim(),
);
if (missingEnvironment.length) {
  throw new Error(
    `Missing required environment variables: ${missingEnvironment.join(", ")}`,
  );
}

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

/**
 * Primary Google Generative AI client instance.
 * @type {GoogleGenAI|null}
 */
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

/**
 * LLM and microservice configuration for AUMS AI Services.
 * @module config/llm
 */
module.exports = {
  gemini,
  port,
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "qwen2.5:3b",
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS || 30000),
};
