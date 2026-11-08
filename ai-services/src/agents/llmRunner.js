const {
  gemini,
  geminiModel,
  geminiFallbackModel,
  llmTimeoutMs,
} = require("../config/llm.config");
const { imagePart } = require("../adapters/geminiAdapter");

const MAX_OUTPUT_TOKENS = 1000;
const MAX_GEMINI_RETRIES = 3;

/**
 * Executes configured AI providers in deterministic priority order with automated fallback.
 *
 * @param {string} systemPrompt - System prompt instructions for the language model.
 * @param {*} input - Untrusted user input data to process.
 * @param {Object} schema - Expected JSON schema definition for response validation.
 * @param {Object} defaultValues - Fallback default values returned if all providers fail.
 * @param {Array<Object>} [images=[]] - Optional image references for multimodal reasoning.
 * @returns {Promise<{success: boolean, data: Object, fallbackUsed: boolean, usedProvider: string, executionTimeMs: number}>}
 */
async function runStructuredLlm(
  systemPrompt,
  input,
  schema,
  defaultValues,
  images = [],
) {
  const startedAt = Date.now();
  const prompt = `<user_data>\n${JSON.stringify(input)}\n</user_data>`;
  const normalizedImages = images.map((image) => imagePart(image));
  const contents = normalizedImages.length
    ? [{ role: "user", parts: [{ text: prompt }, ...normalizedImages] }]
    : prompt;
  const providers = [
    {
      name: "Gemini",
      label: geminiModel,
      call: () => callGemini(geminiModel, contents, schema, systemPrompt),
    },
    {
      name: "Gemini fallback",
      label: geminiFallbackModel,
      call: () =>
        callGemini(geminiFallbackModel, contents, schema, systemPrompt),
    },
  ];

  let fallbackUsed = false;
  for (const provider of providers) {
    if (provider.name.startsWith("Gemini") && !gemini) {
      console.warn(
        `[aums-ai-services] ${provider.name} API key missing; skipping ${provider.label}.`,
      );
      fallbackUsed = true;
      continue;
    }
    try {
      return {
        success: true,
        data: await provider.call(),
        fallbackUsed,
        usedProvider: provider.label,
        executionTimeMs: Date.now() - startedAt,
      };
    } catch (error) {
      fallbackUsed = true;
      logProviderError(provider.name, error);
    }
  }
  return {
    success: false,
    fallbackUsed: true,
    usedProvider: "safe-default",
    executionTimeMs: Date.now() - startedAt,
    data: defaultValues,
  };
}

/**
 * Invokes Gemini with a retry attempt when receiving malformed JSON.
 *
 * @param {string} model - Gemini model identifier.
 * @param {string|Array<Object>} contents - User contents or prompt array.
 * @param {Object} schema - Response schema for validation.
 * @param {string} systemPrompt - System prompt instructions.
 * @returns {Promise<Object>} Validated JSON response from Gemini.
 */
async function callGemini(model, contents, schema, systemPrompt) {
  let retryContents = contents;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestGeminiWithRetry(
        model,
        retryContents,
        systemPrompt,
        schema,
      );
    } catch (error) {
      if (attempt === 1 || !error.message.startsWith("Invalid LLM JSON")) {
        throw error;
      }
      retryContents = addJsonRetryInstruction(contents);
    }
  }
}

/**
 * Requests content generation from Gemini with exponential backoff on retryable HTTP errors.
 *
 * @param {string} model - Target model name.
 * @param {string|Array<Object>} contents - Request contents payload.
 * @param {string} systemPrompt - System instructions.
 * @param {Object} schema - Output response schema.
 * @returns {Promise<Object>} Parsed and validated JSON payload.
 */
async function requestGeminiWithRetry(model, contents, systemPrompt, schema) {
  for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt += 1) {
    try {
      return await withTimeout(async () => {
        const response = await gemini.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: sanitizeSchema(schema),
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0,
          },
        });
        return parseJsonOrThrow(response.text, schema);
      });
    } catch (error) {
      if (!isRetryableGeminiError(error) || attempt === MAX_GEMINI_RETRIES) {
        throw error;
      }
      const backoffMs = 1000 * 2 ** attempt;
      const jitterMs = Math.floor(Math.random() * 250);
      await delay(backoffMs + jitterMs);
    }
  }
}

/**
 * Extracts numeric status code from an error object.
 *
 * @param {Error|Object} error - Error instance to inspect.
 * @returns {number|undefined} HTTP status code if present.
 */
function getErrorStatus(error) {
  const status = error?.status ?? error?.statusCode ?? error?.code;
  const numericStatus = Number(status);
  if (Number.isInteger(numericStatus)) return numericStatus;
  const match = String(error?.message || "").match(/\b(429|503)\b/);
  return match ? Number(match[1]) : undefined;
}

/**
 * Determines whether an error returned from Gemini is transient and retryable.
 *
 * @param {Error|Object} error - Error instance to evaluate.
 * @returns {boolean} True if error matches status 429 or 503.
 */
function isRetryableGeminiError(error) {
  return getErrorStatus(error) === 429 || getErrorStatus(error) === 503;
}

/**
 * Asynchronously pauses execution for a specified duration.
 *
 * @param {number} milliseconds - Sleep duration in milliseconds.
 * @returns {Promise<void>} Resolves when timer expires.
 */
function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Appends explicit JSON-only retry instructions to the prompt payload.
 *
 * @param {string|Array<Object>} contents - Previous prompt content.
 * @returns {string|Array<Object>} Updated contents with strict JSON instruction.
 */
function addJsonRetryInstruction(contents) {
  const instruction =
    "\nRETRY: Return only one valid JSON object matching the schema. No Markdown or explanation.";
  if (typeof contents === "string") return `${contents}${instruction}`;
  return contents.map((content) => ({
    ...content,
    parts: [...content.parts, { text: instruction }],
  }));
}

/**
 * Wraps an asynchronous operation with an execution timeout and abort signal.
 *
 * @param {Function} operation - Asynchronous task receiving AbortSignal.
 * @returns {Promise<*>} Result of the operation.
 */
async function withTimeout(operation) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("LLM request timed out"));
        }, llmTimeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parses raw LLM text into JSON and validates it against the expected schema.
 *
 * @param {string} rawText - Raw string output from language model.
 * @param {Object} schema - Expected schema definition.
 * @returns {Object} Validated data object.
 * @throws {Error} If parsing or schema validation fails.
 */
function parseJsonOrThrow(rawText, schema) {
  const parsed = cleanAndParseJson(rawText, schema);
  if (!parsed.success) throw new Error(parsed.error);
  return parsed.data;
}

/**
 * Strips markdown fences and safely parses JSON without throwing uncaught SyntaxError.
 *
 * @param {*} rawText - Raw model response.
 * @param {Object} schema - Expected schema structure.
 * @returns {{success: boolean, data?: Object, error?: string}} Parsing status and outcome.
 */
function cleanAndParseJson(rawText, schema) {
  if (typeof rawText !== "string") {
    return { success: false, error: "LLM response was not text" };
  }
  const cleanJsonString = rawText.replace(/```json|```/gi, "").trim();
  try {
    const data = JSON.parse(cleanJsonString);
    validateResponse(data, schema);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Invalid LLM JSON response: ${error.message}`,
    };
  }
}

/**
 * Validates fields, types, and value boundaries against schema constraints.
 *
 * @param {Object} data - Parsed model response object.
 * @param {Object} schema - Schema specification.
 * @returns {void}
 * @throws {Error} If validation constraints are violated.
 */
function validateResponse(data, schema) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("response must be a JSON object");
  }
  for (const field of schema.required || []) {
    if (!(field in data)) throw new Error(`missing required field: ${field}`);
  }
  for (const [field, definition] of Object.entries(schema.properties || {})) {
    if (!(field in data)) continue;
    const value = data[field];
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
    if (
      definition.type === "INTEGER" &&
      typeof value === "number" &&
      !Number.isInteger(value)
    ) {
      throw new Error(`field must be an integer: ${field}`);
    }
  }
}

/**
 * Logs provider failures categorized by error classification.
 *
 * @param {string} provider - Name of the AI provider.
 * @param {Error} error - Encountered error instance.
 * @returns {void}
 */
function logProviderError(provider, error) {
  if (isAuthError(error)) {
    console.error("[aums-ai-services] Provider API Key Error:", error.message);
  } else if (isNotFoundError(error)) {
    console.warn(
      `[aums-ai-services] ${provider} model not found; skipping provider.`,
    );
  } else {
    console.error(`[aums-ai-services] ${provider} Error Detail:`, error);
  }
}

/**
 * Checks whether an error signifies an authentication or authorization failure.
 *
 * @param {Error|Object} error - Error object to inspect.
 * @returns {boolean} True if error status is 401 or 403.
 */
function isAuthError(error) {
  return [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.error?.status,
  ].some((status) => status === 401 || status === 403);
}

/**
 * Checks whether an error indicates that the requested model or resource was not found.
 *
 * @param {Error|Object} error - Error object to inspect.
 * @returns {boolean} True if error status is 404.
 */
function isNotFoundError(error) {
  return [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.error?.status,
  ].some((status) => status === 404);
}

/**
 * Strips non-standard schema flags (such as integer keys) before submitting to Gemini API.
 *
 * @param {*} schema - Schema definition to sanitize.
 * @returns {*} Cleaned schema compatible with Gemini SDK.
 */
function sanitizeSchema(schema) {
  if (Array.isArray(schema)) return schema.map(sanitizeSchema);
  if (!schema || typeof schema !== "object") return schema;
  const sanitized = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "integer") continue;
    sanitized[key] = sanitizeSchema(value);
  }
  return sanitized;
}

module.exports = { runStructuredLlm, cleanAndParseJson, sanitizeSchema };
