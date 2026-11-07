const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:3b";
const DEFAULT_TIMEOUT_MS = 30000;

class OllamaConnectionError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "OllamaConnectionError";
    this.code = "OLLAMA_CONNECTION_ERROR";
    this.cause = options.cause;
    this.status = options.status;
  }
}

/**
 * Mengambil URL dasar layanan Ollama tanpa slash penutup.
 *
 * @returns {string} URL dasar Ollama
 */
function getBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

/**
 * Mengambil batas waktu request Ollama yang telah dinormalisasi.
 *
 * @returns {number} Batas waktu request dalam milidetik
 */
function getTimeoutMs() {
  const configured = Number(
    process.env.OLLAMA_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

/**
 * Mem-parsing teks respons Ollama menjadi objek JSON.
 *
 * @param {string} rawText Teks respons Ollama
 * @param {string} [context="Ollama"] Nama konteks respons
 * @returns {Object} Objek JSON hasil parsing
 */
function parseJsonResponse(rawText, context = "Ollama") {
  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new Error(`${context} returned an empty response`);
  }
  const cleaned = rawText.replace(/```json|```/gi, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("response must be a JSON object");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid ${context} JSON response: ${error.message}`);
  }
}

/**
 * Memvalidasi dan menormalisasi respons model berdasarkan schema.
 *
 * @param {Object} data Data respons model
 * @param {Object} schema Schema respons yang diharapkan
 * @returns {Object} Data respons yang telah divalidasi
 */
function validateResponse(data, schema) {
  const normalizedData = { ...data };
  for (const field of schema.required || []) {
    if (!(field in normalizedData)) {
      throw new Error(`missing required field: ${field}`);
    }
  }
  for (const [field, definition] of Object.entries(schema.properties || {})) {
    if (!(field in normalizedData)) continue;
    const rawValue = normalizedData[field];
    const value =
      definition.normalizePercentage &&
      typeof rawValue === "number" &&
      rawValue > 1 &&
      rawValue <= 100
        ? rawValue / 100
        : rawValue;
    if (value !== rawValue) normalizedData[field] = value;
    if (value === null && definition.nullable) continue;
    const valid =
      (definition.type === "BOOLEAN" && typeof value === "boolean") ||
      ((definition.type === "NUMBER" || definition.type === "INTEGER") &&
        typeof value === "number" &&
        Number.isFinite(value)) ||
      (definition.type === "STRING" && typeof value === "string") ||
      (definition.type === "ARRAY" &&
        Array.isArray(value) &&
        value.every((item) => typeof item === "string"));
    if (!valid || (definition.enum && !definition.enum.includes(value))) {
      throw new Error(`invalid field: ${field}`);
    }
    if (
      typeof value === "number" &&
      ((definition.minimum !== undefined && value < definition.minimum) ||
        (definition.maximum !== undefined && value > definition.maximum))
    ) {
      throw new Error(`out-of-range field: ${field}`);
    }
    if (definition.type === "INTEGER" && !Number.isInteger(value)) {
      throw new Error(`field must be an integer: ${field}`);
    }
  }
  return normalizedData;
}

/**
 * Mengirim HTTP request ke layanan Ollama dengan timeout dan error terstruktur.
 *
 * @param {string} path Path endpoint Ollama
 * @param {Object} [options={}] Opsi fetch
 * @returns {Promise<Response>} Respons HTTP dari Ollama
 */
async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs || getTimeoutMs(),
  );
  try {
    return await fetch(`${getBaseUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    const detail =
      error.name === "AbortError" ? "request timed out" : error.message;
    console.error(`[ai-services] Ollama connection failed: ${detail}`);
    throw new OllamaConnectionError(
      `Unable to connect to Ollama at ${getBaseUrl()}: ${detail}`,
      {
        cause: error,
      },
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Menjalankan percakapan JSON melalui model Ollama.
 *
 * @param {Array<Object>} messages Pesan percakapan model
 * @param {Object} [options={}] Opsi model dan request
 * @returns {Promise<Object>} Respons JSON dari model
 */
async function chat(messages, options = {}) {
  const model = options.model || process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  const payload = {
    model,
    messages,
    stream: false,
    format: "json",
    options: { temperature: 0, ...(options.modelOptions || {}) },
  };

  try {
    const response = await request("/api/chat", {
      method: "POST",
      body: JSON.stringify(payload),
      timeoutMs: options.timeoutMs,
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new OllamaConnectionError(
        `Ollama returned HTTP ${response.status}: ${raw.slice(0, 500)}`,
        { status: response.status },
      );
    }
    const envelope = parseJsonResponse(raw, "Ollama envelope");
    return parseJsonResponse(envelope.message?.content, "Ollama model");
  } catch (error) {
    if (error instanceof OllamaConnectionError) {
      console.error("[ai-services] Ollama request error:", error.message);
      throw error;
    }
    console.error("[ai-services] Ollama response error:", error);
    throw error;
  }
}

/**
 * Memeriksa ketersediaan layanan Ollama.
 *
 * @param {Object} [options={}] Opsi timeout health check
 * @returns {Promise<boolean>} True jika layanan tersedia
 */
async function healthCheck(options = {}) {
  try {
    const response = await request("/api/tags", {
      method: "GET",
      timeoutMs: options.timeoutMs || 5000,
    });
    if (!response.ok) {
      throw new OllamaConnectionError(
        `Ollama health check returned HTTP ${response.status}`,
        {
          status: response.status,
        },
      );
    }
    return true;
  } catch (error) {
    if (error instanceof OllamaConnectionError) throw error;
    throw new OllamaConnectionError(
      `Ollama health check failed: ${error.message}`,
      {
        cause: error,
      },
    );
  }
}

module.exports = {
  OllamaConnectionError,
  chat,
  healthCheck,
  parseJsonResponse,
  validateResponse,
};
