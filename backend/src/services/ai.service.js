const axios = require("axios");
const env = require("../config/env.config");

/**
 * Error raised when the AUMS AI service cannot be reached.
 */
class AiServiceUnavailableError extends Error {
  constructor(message = "AI service temporarily unavailable") {
    super(message);

    this.name = "AiServiceUnavailableError";
    this.statusCode = 503;
    this.code = "AI_SERVICE_DOWN";
    this.isAiServiceUnavailable = true;
  }
}

/**
 * Error raised when an AUMS AI service request exceeds its timeout.
 */
class AiServiceTimeoutError extends AiServiceUnavailableError {
  constructor(message) {
    super(message);
    this.name = "AiServiceTimeoutError";
    this.statusCode = 504;
    this.code = "AI_SERVICE_TIMEOUT";
  }
}

/**
 * Error raised when the AUMS AI service returns an unsuccessful response.
 */
class AiServiceResponseError extends Error {
  constructor(
    message = "AI service failed to process request",
    details = null,
  ) {
    super(message);

    this.name = "AiServiceResponseError";
    this.statusCode = 502;
    this.code = "AI_SERVICE_REQUEST_FAILED";
    this.isAiServiceUnavailable = false;
    this.details = details;
  }
}

/**
 * @typedef {Object} CircuitBreakerOptions
 * @property {number} [timeoutMs=35000] - Request execution timeout in milliseconds.
 * @property {number} [failureThreshold=3] - Number of consecutive infrastructure failures required to trip the circuit.
 * @property {number} [cooldownMs=30000] - Duration in milliseconds the circuit remains OPEN before probing recovery.
 */

/**
 * @typedef {Object} AiServiceExecutionResult
 * @property {Object} data - Raw or parsed data returned by the AI endpoint.
 * @property {number} executionTimeMs - Measured round-trip execution latency in milliseconds.
 * @property {string} usedProvider - AI microservice base URL.
 */

/**
 * Integrates the backend with the AUMS AI service and manages request failures.
 *
 * @description
 * Implements a resilient HTTP client layer communicating with the AI microservice (`Port: 3001`).
 * Embeds an automated Circuit Breaker pattern with failure thresholds, exponential timeouts,
 * constant-time internal service authentication headers (`x-internal-api-key`), and
 * graceful degradation error mapping (502 for bad model outputs, 503 for service outages, 504 for timeouts).
 */
class AiIntegrationService {
  /**
   * Initializes AiIntegrationService with HTTP client and circuit-breaker configuration.
   *
   * @param {import("axios").AxiosInstance} [httpClient=axios] - HTTP client used for AI requests.
   * @param {CircuitBreakerOptions} [options={}] - Circuit-breaker and timeout configuration overrides.
   */
  constructor(httpClient = axios, options = {}) {
    this.httpClient = httpClient;

    this.timeoutMs = options.timeoutMs ?? 35000;
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30000;

    this.failureCount = 0;
    this.circuitOpenedAt = null;
  }

  /**
   * Sends a payload to the AI service with timeout and circuit-breaker handling.
   *
   * @description
   * Dispatches an HTTP POST request to the specified AI endpoint.
   * Verifies circuit-breaker state before sending. Injects `x-internal-api-key` header.
   * Monitors response statuses, records infrastructure failures, and trips circuit when threshold is met.
   *
   * @param {string} endpoint - AI endpoint path (e.g., 'validate', 'plan', 'verify', 'embed').
   * @param {Object} payload - AI request body data payload.
   * @returns {Promise<AiServiceExecutionResult>} AI response along with latency and provider metadata.
   * @throws {AiServiceUnavailableError} Throws 503 if circuit breaker is OPEN or connection refused.
   * @throws {AiServiceTimeoutError} Throws 504 if request exceeds timeout limit.
   * @throws {AiServiceResponseError} Throws 502 if AI processing failed or returned malformed structure.
   */
  async request(endpoint, payload) {
    if (this.isCircuitOpen()) {
      console.error("[Backend] AI Circuit Breaker: OPEN. Request rejected.");

      throw new AiServiceUnavailableError(
        "AI service circuit breaker is open. Please retry later.",
      );
    }

    const url = this.buildEndpointUrl(endpoint);
    const startedAt = Date.now();

    try {
      const response = await this.httpClient.post(url, payload, {
        timeout: this.timeoutMs,
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": env.internalApiKey,
        },
      });

      if (response.data?.success === false) {
        const message =
          response.data.message ||
          response.data.error ||
          "AI service failed to process request";

        console.error("[Backend] AI Processing Error:", {
          endpoint,
          message,
          responseStatus: response.status,
        });

        throw new AiServiceResponseError(message, response.data);
      }

      this.resetCircuit();

      const executionTimeMs = Date.now() - startedAt;

      console.info("[Backend] AI Request Successful:", {
        endpoint,
        executionTimeMs,
        usedProvider: env.aiServiceUrl,
      });

      return {
        data: response.data,
        executionTimeMs,
        usedProvider: env.aiServiceUrl,
      };
    } catch (error) {
      if (error instanceof AiServiceResponseError) {
        throw error;
      }

      this.logError(endpoint, url, error);

      if (this.isTimeoutError(error)) {
        this.recordFailure();

        throw new AiServiceTimeoutError(
          `AI service request timed out after ${this.timeoutMs}ms`,
        );
      }

      if (this.isUnavailableError(error)) {
        this.recordFailure();

        throw new AiServiceUnavailableError(
          "AI service temporarily unavailable",
        );
      }

      if (error.response?.status >= 400 && error.response.status < 500) {
        const clientError = new Error(
          "AI service rejected the request payload",
        );
        clientError.statusCode = error.response.status;
        clientError.code = "AI_SERVICE_BAD_REQUEST";
        clientError.details = {
          status: error.response.status,
          message: error.response.data?.message || null,
        };
        throw clientError;
      }

      throw error;
    }
  }

  /**
   * Builds an AI endpoint URL from the configured base URL.
   *
   * @param {string} endpoint AI endpoint path.
   * @returns {string} Complete endpoint URL.
   */
  buildEndpointUrl(endpoint) {
    const baseUrl = env.aiServiceUrl;

    if (!baseUrl || typeof baseUrl !== "string") {
      const error = new Error(
        "AI_SERVICE_URL is missing or invalid in environment configuration",
      );

      error.code = "AI_SERVICE_CONFIG_ERROR";
      throw error;
    }

    if (typeof endpoint !== "string" || !endpoint.trim()) {
      throw new Error("AI endpoint must be a non-empty string");
    }

    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

    if (endpoint.startsWith("/api/v1/ai/")) {
      return `${normalizedBaseUrl}${endpoint}`;
    }

    if (endpoint.startsWith("/api/ai/")) {
      return `${normalizedBaseUrl}/api/v1/ai/${endpoint.slice(
        "/api/ai/".length,
      )}`;
    }

    return `${normalizedBaseUrl}/api/v1/ai/${endpoint.replace(/^\/+/, "")}`;
  }

  /**
   * Determines whether an error was caused by a request timeout.
   *
   * @param {Error} error Error returned by the HTTP client.
   * @returns {boolean} Whether the error represents a timeout.
   */
  isTimeoutError(error) {
    return (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      /timeout/i.test(error.message || "")
    );
  }

  /**
   * Determines whether an error indicates that the AI service is unavailable.
   *
   * @param {Error} error Error returned by the HTTP client.
   * @returns {boolean} Whether the service is unavailable.
   */
  isUnavailableError(error) {
    const status = error.response?.status;

    if ([500, 502, 503, 504].includes(status)) {
      return true;
    }

    const networkErrors = [
      "ECONNREFUSED",
      "ECONNRESET",
      "ENOTFOUND",
      "EAI_AGAIN",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "EPIPE",
    ];

    if (networkErrors.includes(error.code)) {
      return true;
    }

    if (error.isAxiosError && !error.response) {
      return true;
    }

    return false;
  }

  /**
   * Logs AI request error details for operational diagnosis.
   *
   * @param {string} endpoint AI endpoint path.
   * @param {string} url Complete request URL.
   * @param {Error} error Error that occurred.
   * @returns {void}
   */
  logError(endpoint, url, error) {
    console.error("[Backend] AI Service Error:", {
      endpoint,
      url,
      message: error.message,
      code: error.code || null,
      status: error.response?.status || null,
      responseMessage:
        typeof error.response?.data === "string"
          ? error.response.data.slice(0, 200)
          : error.response?.data?.message ||
            error.response?.data?.error ||
            null,
    });
  }

  /**
   * Checks the circuit-breaker state and allows a retry after the cooldown period.
   *
   * @description
   * Evaluates circuit status:
   * - CLOSED: If circuitOpenedAt is null, returns false (allowing requests).
   * - OPEN: If circuit is tripped and elapsed time < cooldownMs, returns true (rejecting requests).
   * - HALF-OPEN: If cooldownMs has elapsed since tripping, resets state and allows a probe retry.
   *
   * @returns {boolean} True if the circuit breaker is OPEN and requests must be rejected.
   */
  isCircuitOpen() {
    if (!this.circuitOpenedAt) {
      return false;
    }

    const elapsed = Date.now() - this.circuitOpenedAt;

    if (elapsed >= this.cooldownMs) {
      console.info("[Backend] AI Circuit Breaker: HALF-OPEN. Allowing retry.");

      this.circuitOpenedAt = null;
      this.failureCount = 0;

      return false;
    }

    return true;
  }

  /**
   * Records an infrastructure failure and trips the circuit when threshold is reached.
   *
   * @description
   * Increments the failure counter. When failureCount >= failureThreshold (default 3),
   * transitions the circuit breaker from CLOSED to OPEN and records the timestamp.
   *
   * @returns {void}
   */
  recordFailure() {
    this.failureCount += 1;

    console.warn("[Backend] AI Failure Recorded:", {
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
    });

    if (this.failureCount >= this.failureThreshold) {
      this.circuitOpenedAt = Date.now();

      console.error("[Backend] AI Circuit Breaker: OPENED.");
    }
  }

  /**
   * Resets failure counts and circuit state after a successful request.
   *
   * @description
   * Called upon successful response from AI service. Clears failure counter and transitions
   * circuit back to CLOSED state.
   *
   * @returns {void}
   */
  resetCircuit() {
    const wasFailed = this.failureCount > 0 || this.circuitOpenedAt !== null;

    this.failureCount = 0;
    this.circuitOpenedAt = null;

    if (wasFailed) {
      console.info("[Backend] AI Circuit Breaker: CLOSED. Service recovered.");
    }
  }

  /**
   * Builds a report-validation payload and sends it to the AI service.
   *
   * @param {object} reportData Report data to validate.
   * @param {Array<object>} candidateReports Similar report candidates.
   * @returns {Promise<object>} AI validation response.
   */
  validate(reportData, candidateReports = []) {
    const payload = {
      title: String(reportData?.title || ""),
      description: String(reportData?.description || ""),
      category: String(reportData?.category || ""),

      locationAddress: String(
        reportData?.locationAddress || reportData?.location || "",
      ),

      latitude: Number(reportData?.latitude),
      longitude: Number(reportData?.longitude),

      photoUrl: reportData?.photoUrl || null,

      existingReports: Array.isArray(candidateReports) ? candidateReports : [],

      imageBase64: reportData?.imageBase64 || null,
      imageMimeType: reportData?.imageMimeType || null,

      embedding: Array.isArray(reportData?.embedding)
        ? reportData.embedding
        : null,
    };

    return this.request("validate", payload);
  }

  /**
   * Runs the intake agent as an alias for report validation.
   *
   * @param {object} reportData Report intake data.
   * @param {Array<object>} candidateReports Similar report candidates.
   * @returns {Promise<object>} AI intake response.
   */
  runIntakeAgent(reportData, candidateReports = []) {
    return this.validate(reportData, candidateReports);
  }

  /**
   * Builds a planning payload and sends RAG context to the AI service.
   *
   * @param {object} reportData Target report data.
   * @param {Array<object>} ragContext Similar-report context.
   * @returns {Promise<object>} AI planning response.
   */
  plan(reportData, ragContext = []) {
    const payload = {
      reportId: reportData?.id,
      title: reportData?.title,
      description: reportData?.description,
      category: reportData?.category,
      locationAddress: reportData?.locationAddress,

      duplicateCount: reportData?.duplicateCount || 0,

      ragContext: Array.isArray(ragContext) ? ragContext : [],
    };

    return this.request("plan", payload);
  }

  /**
   * Runs the planning agent as an alias for report planning.
   *
   * @param {object} reportData Target report data.
   * @param {Array<object>} ragContext Similar-report context.
   * @returns {Promise<object>} AI planning response.
   */
  runPlanningAgent(reportData, ragContext = []) {
    return this.plan(reportData, ragContext);
  }

  /**
   * Builds a verification-evidence payload and sends it to the AI service.
   *
   * @param {object} report Report data to verify.
   * @param {object} proof Field repair evidence.
   * @returns {Promise<object>} AI verification response.
   */
  verify(report, proof) {
    return this.request("verify", {
      ...proof,
      report,
    });
  }

  /**
   * Runs the verification agent as an alias for report verification.
   *
   * @param {object} report Report data to verify.
   * @param {object} proof Field repair evidence.
   * @returns {Promise<object>} AI verification response.
   */
  runVerificationAgent(report, proof) {
    return this.verify(report, proof);
  }

  /**
   * Generates a 768-dimensional vector embedding for text using the AI service.
   *
   * @param {string} text - Text to embed.
   * @returns {Promise<Array<number>|null>} 768-dimensional float embedding array or null.
   */
  async embed(text) {
    if (!text || typeof text !== "string" || !text.trim()) {
      return null;
    }
    const response = await this.request("embed", { text: text.trim() });
    const embedding =
      response?.data?.embedding ||
      response?.data?.data?.embedding ||
      response?.embedding;
    return Array.isArray(embedding) ? embedding : null;
  }

  /**
   * Alias for generating text embeddings.
   *
   * @param {string} text - Text to embed.
   * @returns {Promise<Array<number>|null>}
   */
  async generateEmbedding(text) {
    return this.embed(text);
  }
}

module.exports = AiIntegrationService;
module.exports.AiServiceUnavailableError = AiServiceUnavailableError;
module.exports.AiServiceTimeoutError = AiServiceTimeoutError;
module.exports.AiServiceResponseError = AiServiceResponseError;

module.exports.AiServiceResponseError = AiServiceResponseError;
