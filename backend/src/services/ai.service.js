const axios = require("axios");
const env = require("../config/env.config");

class AiServiceUnavailableError extends Error {
  constructor(message = "AI service temporarily unavailable") {
    super(message);

    this.name = "AiServiceUnavailableError";
    this.statusCode = 503;
    this.code = "AI_SERVICE_DOWN";
    this.isAiServiceUnavailable = true;
  }
}

class AiServiceTimeoutError extends AiServiceUnavailableError {
  constructor(message) {
    super(message);
    this.name = "AiServiceTimeoutError";
    this.statusCode = 504;
    this.code = "AI_SERVICE_TIMEOUT";
  }
}

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

class AiIntegrationService {
  constructor(httpClient = axios, options = {}) {
    this.httpClient = httpClient;

    this.timeoutMs = options.timeoutMs ?? 35000;
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30000;

    this.failureCount = 0;
    this.circuitOpenedAt = null;
  }

  /**
   * Mengirim payload ke AI dengan timeout, klasifikasi error, dan circuit breaker.
   *
   * @param {string} endpoint Endpoint AI yang dituju
   * @param {object} payload Payload request AI
   * @returns {Promise<object>} Respons AI beserta metadata eksekusi
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
   * Membangun URL endpoint AI dari konfigurasi base URL.
   *
   * @param {string} endpoint Path endpoint AI
   * @returns {string} URL endpoint lengkap
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
   * Menentukan apakah error disebabkan oleh timeout request.
   *
   * @param {Error} error Error dari HTTP client
   * @returns {boolean} True jika error merupakan timeout
   */
  isTimeoutError(error) {
    return (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      /timeout/i.test(error.message || "")
    );
  }

  /**
   * Menentukan apakah error menunjukkan service AI tidak tersedia.
   *
   * @param {Error} error Error dari HTTP client
   * @returns {boolean} True jika service tidak tersedia
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
   * Mencatat detail error request AI untuk diagnosis operasional.
   *
   * @param {string} endpoint Endpoint AI
   * @param {string} url URL lengkap request
   * @param {Error} error Error yang terjadi
   * @returns {void} Tidak mengembalikan nilai
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
   * Memeriksa status circuit breaker dan membuka kembali setelah cooldown.
   *
   * @returns {boolean} True jika request AI harus ditolak
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
   * Mencatat kegagalan AI dan membuka circuit setelah ambang tercapai.
   *
   * @returns {void} Tidak mengembalikan nilai
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
   * Mereset kegagalan dan status circuit setelah request berhasil.
   *
   * @returns {void} Tidak mengembalikan nilai
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
   * Membentuk payload validasi laporan dan mengirimkannya ke AI.
   *
   * @param {object} reportData Data laporan yang divalidasi
   * @param {Array<object>} candidateReports Kandidat laporan serupa
   * @returns {Promise<object>} Respons validasi AI
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
   * Menjalankan agent intake sebagai alias proses validasi laporan.
   *
   * @param {object} reportData Data laporan intake
   * @param {Array<object>} candidateReports Kandidat laporan serupa
   * @returns {Promise<object>} Respons intake AI
   */
  runIntakeAgent(reportData, candidateReports = []) {
    return this.validate(reportData, candidateReports);
  }

  /**
   * Membentuk payload perencanaan dan mengirim konteks RAG ke AI.
   *
   * @param {object} reportData Data laporan target
   * @param {Array<object>} ragContext Konteks laporan serupa
   * @returns {Promise<object>} Respons rencana AI
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
   * Menjalankan agent planning sebagai alias proses perencanaan.
   *
   * @param {object} reportData Data laporan target
   * @param {Array<object>} ragContext Konteks laporan serupa
   * @returns {Promise<object>} Respons planning AI
   */
  runPlanningAgent(reportData, ragContext = []) {
    return this.plan(reportData, ragContext);
  }

  /**
   * Membentuk payload bukti verifikasi dan mengirimkannya ke AI.
   *
   * @param {object} report Data laporan yang diverifikasi
   * @param {object} proof Bukti perbaikan lapangan
   * @returns {Promise<object>} Respons verifikasi AI
   */
  verify(report, proof) {
    return this.request("verify", {
      ...proof,
      report,
    });
  }

  /**
   * Menjalankan agent verifikasi sebagai alias proses verifikasi.
   *
   * @param {object} report Data laporan yang diverifikasi
   * @param {object} proof Bukti perbaikan lapangan
   * @returns {Promise<object>} Respons verifikasi AI
   */
  runVerificationAgent(report, proof) {
    return this.verify(report, proof);
  }
}

module.exports = AiIntegrationService;
module.exports.AiServiceUnavailableError = AiServiceUnavailableError;
module.exports.AiServiceTimeoutError = AiServiceTimeoutError;
module.exports.AiServiceResponseError = AiServiceResponseError;

module.exports.AiServiceResponseError = AiServiceResponseError;
