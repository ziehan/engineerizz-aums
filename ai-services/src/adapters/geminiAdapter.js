const { GoogleGenAI } = require("@google/genai");
const { validateResponse } = require("./ollamaAdapter");
const { assertSafeExternalUrl } = require("../utils/ssrfGuard");

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_OUTPUT_TOKENS = 1000;
const MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = new Set([429, 503]);

/**
 * Membuat klien Gemini menggunakan API key dari environment.
 *
 * @returns {GoogleGenAI} Klien Gemini yang siap digunakan
 */
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

/**
 * Mengambil batas waktu request Gemini yang telah dinormalisasi.
 *
 * @returns {number} Batas waktu request dalam milidetik
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
 * Mem-parsing respons teks Gemini menjadi objek JSON.
 *
 * @param {string} rawText Teks respons dari Gemini
 * @returns {Object} Objek JSON hasil parsing
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
 * Membersihkan dan menyesuaikan data Base64 sebelum dikirim ke Gemini.
 *
 * @param {string} value Nilai Base64 atau data URI yang akan dibersihkan
 * @returns {string} Data Base64 yang telah disanitasi dan dipadding
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
 * Mengubah berbagai format gambar menjadi bagian konten Gemini.
 *
 * @param {string|Object} image String gambar atau objek image part
 * @param {string} [defaultMimeType="image/jpeg"] MIME type default gambar
 * @returns {Object|null} Objek inlineData/fileData atau null jika kosong
 */
function imagePart(image, defaultMimeType = "image/jpeg") {
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
    const safeUrl = assertSafeExternalUrl(normalizedImage);
    return {
      fileData: { fileUri: safeUrl, mimeType: defaultMimeType },
    };
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
 * Mengirim prompt multimodal ke Gemini dan memvalidasi respons terstruktur.
 *
 * @param {string} systemPrompt Instruksi sistem untuk model
 * @param {Object} input Data request yang tidak tepercaya
 * @param {Object} [options={}] Opsi model, schema, timeout, dan gambar
 * @returns {Promise<Object>} Respons JSON tervalidasi dari Gemini
 */
async function generateJson(systemPrompt, input, options = {}) {
  const primaryModel =
    options.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbackModel =
    options.fallbackModel || process.env.GEMINI_FALLBACK_MODEL;
  const models = [
    primaryModel,
    fallbackModel && fallbackModel !== primaryModel ? fallbackModel : null,
  ].filter(Boolean);
  const serializedInput =
    typeof input === "string" ? input : JSON.stringify(input);
  const text =
    typeof input === "string"
      ? input
      : `<user_data>\n${serializedInput}\n</user_data>`;
  const parts = [{ text }];
  for (const image of options.images || []) {
    const part = imagePart(image, options.defaultMimeType);
    if (part) parts.push(part);
  }
  for (const part of parts) {
    if (part.inlineData?.data) {
      console.log("[ai-services] Gemini image diagnostics:", {
        length: part.inlineData.data.length,
        modulo4: part.inlineData.data.length % 4,
        mimeType: part.inlineData.mimeType,
        validCharacters: /^[A-Za-z0-9+/]+={0,2}$/.test(part.inlineData.data),
      });
    }
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
          `[ai-services] Gemini model ${model} failed; trying fallback ${models[index + 1]}.`,
        );
        continue;
      }
    }
  }
  console.error("[ai-services] Gemini providers exhausted:", lastError);
  throw lastError;
}

/**
 * Menjalankan satu request generateContent ke Gemini dengan timeout.
 *
 * @param {string} model Nama model Gemini
 * @param {Array<Object>} parts Bagian prompt dan gambar
 * @param {Object} options Opsi request Gemini
 * @returns {Promise<Object>} Respons JSON yang telah diparsing
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
        `[ai-services] Gemini request returned ${getErrorStatus(error)}; retrying in ${backoffMs + jitterMs}ms.`,
      );
      await delay(backoffMs + jitterMs);
    }
  }
}

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
          ? { responseSchema: options.responseSchema }
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

function getErrorStatus(error) {
  const status = error?.status ?? error?.statusCode ?? error?.code;
  const numericStatus = Number(status);
  if (Number.isInteger(numericStatus)) return numericStatus;
  const match = String(error?.message || "").match(/\b(429|503)\b/);
  return match ? Number(match[1]) : undefined;
}

function isRetryableGeminiError(error) {
  return RETRYABLE_STATUS_CODES.has(getErrorStatus(error));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

module.exports = {
  cleanBase64: sanitizeBase64,
  generateJson,
  imagePart,
  parseJsonResponse,
  sanitizeBase64,
};
