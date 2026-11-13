const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Clean surrounding quotes from environment variables injected by Docker / Cloud platforms
for (const [key, value] of Object.entries(process.env)) {
  if (typeof value === "string") {
    process.env[key] = value.trim().replace(/^["']+|["']+$/g, "");
  }
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

/**
 * Zod schema defining the required environment variables for the AUMS backend.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
  AI_SERVICE_URL: z.string().url(),
  JWT_SECRET: z.string().trim().min(1).optional(),
  INTERNAL_API_KEY: z.string().trim().min(1).optional(),
});

const parsedEnv = envSchema.safeParse(process.env);
const missing = parsedEnv.success
  ? []
  : parsedEnv.error.issues.map((issue) => issue.path.join("."));

if (missing.length > 0 && nodeEnv !== "test") {
  throw new Error(
    `Invalid or missing environment variables: ${missing.join(", ")}`,
  );
}

if (
  isProduction &&
  (!process.env.JWT_SECRET || !process.env.INTERNAL_API_KEY)
) {
  throw new Error("JWT_SECRET and INTERNAL_API_KEY are required in production");
}

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port number");
}
const host =
  process.env.HOST === "localhost" || !process.env.HOST
    ? "0.0.0.0"
    : process.env.HOST;

/**
 * Read-only configuration object holding application environment settings.
 * @module config/env
 */
module.exports = Object.freeze({
  databaseUrl: process.env.DATABASE_URL,
  port,
  host,
  aiServiceUrl: (process.env.AI_SERVICE_URL || "http://localhost:3001").replace(
    /\/+$/,
    "",
  ),
  jwtSecret:
    process.env.JWT_SECRET ||
    (isProduction ? "" : "development-only-change-this-jwt-secret"),
  internalApiKey:
    process.env.INTERNAL_API_KEY ||
    (isProduction ? "" : "development-only-internal-api-key"),
  enableAiFallbackDefault:
    String(process.env.ENABLE_AI_FALLBACK_DEFAULT).toLowerCase() === "true",
  mapsApiKey: process.env.MAPS_API_KEY || "",
  nominatimUrl: (
    process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org"
  ).replace(/\/+$/, ""),
  nominatimUserAgent:
    process.env.NOMINATIM_USER_AGENT || "aums/1.0 (contact: admin@aums.local)",
  nodeEnv,
});
