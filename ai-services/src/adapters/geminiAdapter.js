const { GoogleGenAI } = require("@google/genai");
const { assertSafeExternalUrl } = require("../utils/ssrfGuard");

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
];
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const DEFAULT_EMBEDDING_DIMENSIONS = 768;
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_OUTPUT_TOKENS = 1000;
const MAX_RETRIES = 1;
const RETRYABLE_STATUS_CODES = new Set([429, 503]);

/**
 * Creates an instance of GoogleGenAI using environment configuration.
 *
 * @returns {GoogleGenAI} Initialized Google Generative AI client.
 * @throws {Error} If GEMINI_API_KEY is not defined.
 */
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

/**
 * Retrieves the normalized timeout limit in milliseconds for Gemini API requests.
 *
 * @returns {number} Request timeout in milliseconds.
 */
function getTimeoutMs() {
  const configured = Number(
    process.env.GEMINI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

/**
 * Parses raw text response from Gemini into a valid JSON object.
 *
 * @param {string} rawText - Raw text output from Gemini.
 * @returns {Object} Parsed JSON object.
 * @throws {Error} If input is empty or invalid JSON.
 */
function parseJsonResponse(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("Gemini returned an empty response");
  }
  const cleaned = rawText.replace(/```json|```/gi, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("response must be a JSON object");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid Gemini JSON response: ${error.message}`);
  }
}

/**
 * Cleans, sanitizes, and normalizes Base64 image strings.
 *
 * @param {string} value - Raw Base64 string or data URL.
 * @returns {string} Sanitized Base64 payload with valid padding.
 */
function sanitizeBase64(value) {
  if (typeof value !== "string") return "";

  let cleaned = value
    .replace(/\\"/g, '"')
    .replace(/\\[nrt]/gi, "")
    .replace(/\s+/g, "")
    .replace(/^["'\\]+|["'\\]+$/g, "")
    .replace(/^data:[^,]+;base64,/i, "")
    .replace(/["'\\]/g, "")
    .replace(/^["'\\]+|["'\\]+$/g, "")
    .trim();

  const mod = cleaned.length % 4;
  if (mod === 2) cleaned += "==";
  else if (mod === 3) cleaned += "=";
  else if (mod === 1) cleaned = cleaned.slice(0, -1);

  return cleaned;
}

/**
 * Converts various image formats into standard Gemini inlineData or fileData parts.
 *
 * @param {string|Object} image - Base64 string, data URL, external URL, or image part object.
 * @param {string} [defaultMimeType="image/jpeg"] - Fallback MIME type.
 * @returns {Object|null} Gemini-compatible image part or null if empty.
 * @throws {TypeError} If image format is unsupported.
 */
async function imagePart(image, defaultMimeType = "image/jpeg") {
  if (!image) return null;

  if (typeof image === "object" && image.inlineData) {
    const data = sanitizeBase64(image.inlineData.data);
    return {
      inlineData: {
        mimeType: image.inlineData.mimeType || defaultMimeType,
        data,
      },
    };
  }

  if (typeof image === "object" && image.inline_data) {
    const data = sanitizeBase64(image.inline_data.data);
    return {
      inlineData: {
        mimeType:
          image.inline_data.mime_type ||
          image.inline_data.mimeType ||
          defaultMimeType,
        data,
      },
    };
  }

  if (typeof image === "object" && image.fileData) {
    if (typeof image.fileData.fileUri === "string") {
      return {
        ...image,
        fileData: {
          ...image.fileData,
          fileUri: assertSafeExternalUrl(image.fileData.fileUri),
        },
      };
    }
    return image;
  }

  if (typeof image === "object" && image.data) {
    const data = sanitizeBase64(image.data);
    return {
      inlineData: {
        mimeType: image.mimeType || defaultMimeType,
        data,
      },
    };
  }

  if (typeof image !== "string") {
    throw new TypeError(
      "Image must be a Base64 string, data URL, URL, or image part",
    );
  }

  const normalizedImage = image
    .trim()
    .replace(/\\"/g, '"')
    .replace(/\\[nrt]/gi, "")
    .replace(/\s+/g, "")
    .replace(/^["'\\]+|["'\\]+$/g, "");

  if (/^data:[^,]+;base64,/i.test(normalizedImage)) {
    const match = normalizedImage.match(/^data:([^;]+);base64,(.*)$/i);
    if (!match) throw new TypeError("Image data URL must contain Base64 data");
    const data = sanitizeBase64(match[2]);
    return {
      inlineData: {
        mimeType: match[1],
        data,
      },
    };
  }

  if (/^https?:\/\//i.test(normalizedImage)) {
    if (/generativelanguage\.googleapis\.com/i.test(normalizedImage)) {
      const safeUrl = assertSafeExternalUrl(normalizedImage);
      return {
        fileData: { fileUri: safeUrl, mimeType: defaultMimeType },
      };
    }

    try {
      const safeUrl = assertSafeExternalUrl(normalizedImage);
      const res = await fetch(safeUrl, {
        headers: { "User-Agent": "AUMS-AI-Service/1.0" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        console.warn(
          `[geminiAdapter] Failed to download image from URL: ${safeUrl} (HTTP ${res.status})`,
        );
        return null;
      }
      const arrayBuffer = await res.arrayBuffer();
      const mimeType = res.headers.get("content-type") || defaultMimeType;
      const data = Buffer.from(arrayBuffer).toString("base64");
      return {
        inlineData: {
          data,
          mimeType,
        },
      };
    } catch (fetchErr) {
      console.warn(
        `[geminiAdapter] Could not download image URL: ${normalizedImage} - ${fetchErr.message}`,
      );
      return null;
    }
  }

  const data = sanitizeBase64(normalizedImage);
  return {
    inlineData: {
      data,
      mimeType: defaultMimeType,
    },
  };
}

/**
 * Sends a multimodal prompt to Gemini and validates the structured JSON response.
 *
 * @description
 * Calls Google GenAI SDK to generate structured JSON responses from Gemini models:
 * 1. Resolves primary model (`gemini-3.5-flash-lite`) and fallback model (`gemini-2.5-flash`).
 * 2. Wraps untrusted user text within `<user_data>` XML fences to prevent prompt injection.
 * 3. Normalizes image references (Base64 data URIs, local buffers, or safe external URLs) into Gemini image parts.
 * 4. Configures responseMimeType: "application/json", temperature: 0, and responseSchema.
 * 5. Executes requests with automatic retry on 429/503 errors and failover across configured models.
 *
 * @param {string} systemPrompt - System prompt instructions.
 * @param {Object|string} input - User input data.
 * @param {Object} [options={}] - Execution options including schema, models, and images.
 * @param {string} [options.model="gemini-3.5-flash-lite"] - Primary Gemini model name.
 * @param {string} [options.fallbackModel="gemini-2.5-flash"] - Fallback Gemini model name.
 * @param {Object} [options.responseSchema] - Target JSON schema for model output constraint.
 * @param {Array<string|Object>} [options.images] - Attached image references.
 * @returns {Promise<Object>} Validated structured JSON response.
 * @throws {Error} Throws if all configured Gemini models fail.
 */
async function generateJson(systemPrompt, input, options = {}) {
  const primaryModel =
    options.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const rawFallback =
    options.fallbackModel || process.env.GEMINI_FALLBACK_MODEL || "";
  const envFallbackModels = String(rawFallback)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const models = [
    ...new Set(
      [primaryModel, ...envFallbackModels, ...DEFAULT_FALLBACK_MODELS].filter(
        Boolean,
      ),
    ),
  ];
  const serializedInput =
    typeof input === "string" ? input : JSON.stringify(input);
  const text =
    typeof input === "string"
      ? input
      : `<user_data>\n${serializedInput}\n</user_data>`;
  const parts = [{ text }];
  for (const image of options.images || []) {
    const part = await imagePart(image, options.defaultMimeType);
    if (part) parts.push(part);
  }

  let lastError;
  for (const [index, model] of models.entries()) {
    try {
      return await requestGeminiJson(model, parts, {
        ...options,
        systemPrompt,
      });
    } catch (error) {
      lastError = error;
      if (index < models.length - 1) {
        console.warn(
          `[aums-ai-services] Gemini model ${model} failed (${getErrorStatus(error) || "ERR"}: ${error?.message || error}); trying fallback ${models[index + 1]}.`,
        );
        continue;
      }
    }
  }
  console.error("[aums-ai-services] Gemini providers exhausted:", lastError);
  throw lastError;
}

/**
 * Dispatches a content generation request to Gemini with exponential retry handling.
 *
 * @param {string} model - Target Gemini model name.
 * @param {Array<Object>} parts - Prompt text and image parts.
 * @param {Object} options - Request options.
 * @returns {Promise<Object>} Parsed JSON response.
 */
async function requestGeminiJson(model, parts, options) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await requestGeminiJsonOnce(model, parts, options);
    } catch (error) {
      if (!isRetryableGeminiError(error) || attempt === MAX_RETRIES) {
        throw error;
      }
      const backoffMs = 1000 * 2 ** attempt;
      const jitterMs = Math.floor(Math.random() * 250);
      console.warn(
        `[aums-ai-services] Gemini request returned ${getErrorStatus(error)}; retrying in ${backoffMs + jitterMs}ms.`,
      );
      await delay(backoffMs + jitterMs);
    }
  }
}

/**
 * Strips custom local validation attributes (e.g. normalizePercentage, integer)
 * from the schema before sending it to the Google Gemini API.
 *
 * @param {*} schema - Raw schema definition.
 * @returns {*} Cleaned OpenAPI-compatible schema for Gemini.
 */
function sanitizeGeminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(sanitizeGeminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  const cleaned = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "normalizePercentage" || key === "integer") continue;
    cleaned[key] = sanitizeGeminiSchema(value);
  }
  return cleaned;
}

/**
 * Executes a single generateContent call to Gemini within a timeout wrapper.
 *
 * @param {string} model - Target Gemini model name.
 * @param {Array<Object>} parts - Prompt parts.
 * @param {Object} options - Generation configuration and schema.
 * @returns {Promise<Object>} Parsed and validated JSON object.
 */
async function requestGeminiJsonOnce(model, parts, options) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || getTimeoutMs();
  let rejectTimeout;
  const timeoutPromise = new Promise((_, reject) => {
    rejectTimeout = reject;
  });
  const timer = setTimeout(() => {
    controller.abort();
    rejectTimeout(new Error("Gemini request timed out"));
  }, timeoutMs);
  try {
    const request = getClient().models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0,
        ...(options.systemPrompt
          ? { systemInstruction: options.systemPrompt }
          : {}),
        ...(options.responseSchema
          ? { responseSchema: sanitizeGeminiSchema(options.responseSchema) }
          : {}),
      },
      signal: controller.signal,
    });
    const response = await Promise.race([request, timeoutPromise]);
    const parsed = parseJsonResponse(response.text);
    const result = options.responseSchema
      ? validateResponse(parsed, options.responseSchema)
      : parsed;
    console.log(
      JSON.stringify({
        endpoint: "gemini.models.generateContent",
        latencyMs: Date.now() - startedAt,
        status: "SUCCESS",
        estimatedTokens:
          response.usageMetadata?.totalTokenCount ??
          response.usageMetadata?.candidatesTokenCount ??
          null,
      }),
    );
    return result;
  } catch (error) {
    console.log(
      JSON.stringify({
        endpoint: "gemini.models.generateContent",
        latencyMs: Date.now() - startedAt,
        status: "FAILED",
        estimatedTokens: null,
        errorStatus: getErrorStatus(error) ?? null,
      }),
    );
    if (error.name === "AbortError") {
      throw new Error("Gemini request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves the numeric error status from error properties or message substrings.
 *
 * @param {Error|Object} error - Error object to inspect.
 * @returns {number|undefined} Status code if found.
 */
function getErrorStatus(error) {
  const status = error?.status ?? error?.statusCode ?? error?.code;
  const numericStatus = Number(status);
  if (Number.isInteger(numericStatus)) return numericStatus;
  const match = String(error?.message || "").match(/\b(429|503)\b/);
  return match ? Number(match[1]) : undefined;
}

/**
 * Determines whether a Gemini request error can be retried.
 *
 * @param {Error|Object} error - Error object.
 * @returns {boolean} True if status is 429 or 503.
 */
function isRetryableGeminiError(error) {
  return RETRYABLE_STATUS_CODES.has(getErrorStatus(error));
}

/**
 * Asynchronously pauses execution for a given number of milliseconds.
 *
 * @param {number} milliseconds - Duration in milliseconds.
 * @returns {Promise<void>} Resolves after timeout.
 */
function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Validates and normalizes structured model responses against schema constraints.
 *
 * @param {Object} data - Parsed model response object.
 * @param {Object} schema - Expected response schema.
 * @returns {Object} Normalized and validated response object.
 * @throws {Error} If missing required fields or encountering invalid types.
 */
function validateResponse(data, schema) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("response must be a JSON object");
  }
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
 * Generates vector embeddings for a text string using Gemini text-embedding-004.
 *
 * @description
 * Calls official Google GenAI model `text-embedding-004` to generate semantic vector representations
 * normalized to 768 dimensions (`outputDimensionality: 768`). The generated float array is used by
 * the Backend Core to persist in PostgreSQL pgvector (`vector(768)`) and power spatial-semantic RAG queries.
 *
 * @param {string} text - Input text content to embed (title, description, category).
 * @param {Object} [options={}] - Embedding configuration options.
 * @param {string} [options.model="text-embedding-004"] - Embedding model name.
 * @param {number} [options.dimensions=768] - Target dimensionality (768 dimensions standard).
 * @returns {Promise<Array<number>>} 768-dimensional float embedding vector.
 * @throws {Error} Throws if text is empty or Gemini fails to produce a non-empty vector.
 */
async function generateEmbedding(text, options = {}) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Text must be a non-empty string for embedding");
  }

  const model =
    options.model ||
    process.env.GEMINI_EMBEDDING_MODEL ||
    DEFAULT_EMBEDDING_MODEL;
  const outputDimensionality =
    options.dimensions || DEFAULT_EMBEDDING_DIMENSIONS;

  const client = getClient();
  const response = await client.models.embedContent({
    model,
    contents: text.trim(),
    config: {
      outputDimensionality,
    },
  });

  const values =
    response?.embedding?.values ||
    response?.embeddings?.[0]?.values ||
    response?.values;

  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Gemini returned invalid or empty embedding vector");
  }

  return values;
}

module.exports = {
  cleanBase64: sanitizeBase64,
  generateEmbedding,
  generateJson,
  imagePart,
  parseJsonResponse,
  sanitizeBase64,
  validateResponse,
};
