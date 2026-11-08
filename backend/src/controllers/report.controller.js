const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates great-circle distance between two geographic coordinates using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of origin (e.g. officer coordinates).
 * @param {number} lon1 - Longitude of origin.
 * @param {number} lat2 - Latitude of destination (e.g. report site).
 * @param {number} lon2 - Longitude of destination.
 * @returns {number} Distance in meters.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const latitudeDifference = ((lat2 - lat1) * Math.PI) / 180;
  const longitudeDifference = ((lon2 - lon1) * Math.PI) / 180;
  const firstLatitude = (lat1 * Math.PI) / 180;
  const secondLatitude = (lat2 * Math.PI) / 180;

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    EARTH_RADIUS_METERS *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

/**
 * Controller orchestrating citizen report intake, lifecycle, AI triage, and verification.
 */
class ReportController {
  /**
   * @param {Object} options - Services and repositories injected into the controller.
   */
  constructor(options) {
    if (options && options.reportService) {
      Object.assign(this, options);
    } else {
      this.reportService = options;
    }

    for (const method of [
      "create",
      "list",
      "get",
      "approve",
      "verify",
      "delete",
      "deleteDuplicate",
      "intake",
      "plan",
    ]) {
      this[method] = this[method].bind(this);
    }
  }

  /**
   * Creates a new citizen report through the report service.
   *
   * @param {import("express").Request} req - Express request with report body.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   */
  async create(req, res, next) {
    try {
      res.status(201).json({
        data: await this.reportService.createReport(req.body ?? {}),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a filtered list of citizen reports.
   *
   * @param {import("express").Request} req - Express request with filter query parameters.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   */
  async list(req, res, next) {
    try {
      res.json({ data: await this.reportService.listReports(req.query) });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a single report by unique identifier.
   *
   * @param {import("express").Request} req - Express request containing report ID in params.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   */
  async get(req, res, next) {
    try {
      res.json({ data: await this.reportService.getReport(req.params.id) });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approves a report and transitions it to the approved state.
   *
   * @param {import("express").Request} req - Express request containing approver details.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>}
   */
  async approve(req, res, next) {
    try {
      const updatedReport = await this.reportService.approveReport(
        req.params.id,
        req.body?.approvedBy || "Petugas CRM AUMS",
      );
      return res.status(200).json({ success: true, data: updatedReport });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dispatches verification to the AI pipeline or standard verification service.
   *
   * @param {import("express").Request} req - Express request with verification parameters.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   */
  async verify(req, res, next) {
    if (this.repository && this.aiService) {
      return this.verifyPipeline(req, res, next);
    }
    try {
      res.json({
        data: await this.reportService.verifyReport(
          req.params.id,
          req.body ?? {},
        ),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a report by unique ID.
   *
   * @param {import("express").Request} req - Express request with report ID parameter.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   */
  async delete(req, res, next) {
    try {
      res.json(await this.reportService.deleteReport(req.params.id));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Removes a report marked as duplicate and adjusts aggregate counts.
   *
   * @param {import("express").Request} req - Express request with duplicate report ID parameter.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   */
  async deleteDuplicate(req, res, next) {
    try {
      res.json(
        await this.reportService.deleteDuplicate(req.params.duplicateId),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Processes report intake, geospatial deduplication, and initial triage classification via AI.
   *
   * @param {import("express").Request} req - Express request with report details and photo buffer.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>}
   */
  async intake(req, res, next) {
    try {
      const input = {
        ...req.body,
        latitude: Number(req.body.latitude),
        longitude: Number(req.body.longitude),
        locationAddress: req.body.locationAddress,
        imageBase64: req.processedImageBase64 || null,
        imageMimeType: req.processedImageMimeType || null,
      };
      if (!input.locationAddress) {
        const address = this.geoService
          ? await this.geoService.reverseGeocode(
              input.latitude,
              input.longitude,
            )
          : {
              displayName: await this.mapsService.reverseGeocode(
                input.latitude,
                input.longitude,
              ),
            };
        input.locationAddress = address.displayName;
      }

      const candidates =
        await this.repository.findDeduplicationCandidates(input);
      const response = await this.aiService.runIntakeAgent(input, candidates);
      const aiData = response?.data?.data || response?.data || {};
      const report = await this.repository.createWithEmbedding(
        {
          title: String(input.title),
          description: String(input.description),
          category: String(aiData.category || input.category),
          locationAddress: input.locationAddress,
          latitude: input.latitude,
          longitude: input.longitude,
          photoUrl:
            input.photoUrl ||
            (input.imageBase64
              ? `data:${input.imageMimeType};base64,${input.imageBase64}`
              : null),
          status: aiData.isValid === false ? "Rejected" : "Pending",
          priority: this.priorityFromScore(aiData.priorityScore),
          isDuplicate: false,
          aiProcessed: true,
        },
        input.embedding || aiData.embedding,
      );
      void this.recordAiAudit(
        report.id,
        "INTAKE_AGENT",
        { input, candidates },
        response,
      );

      await this.repository.addAuditLog(report.id, "AI_INTAKE_COMPLETED", {
        response: aiData,
        executionTimeMs: response?.executionTimeMs || null,
      });
      return res.status(201).json({ success: true, data: report });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Generates operational dispatch and action plans based on RAG context.
   *
   * @param {import("express").Request} req - Express request with report ID.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>}
   */
  async plan(req, res, next) {
    try {
      const report = await this.getPipelineReport(
        req.params.id || req.body?.reportId,
      );
      const similarReports = await this.ragService.getSimilarReports(report);
      const ragContext = this.ragService.formatContext(similarReports);
      const response = await this.aiService.runPlanningAgent(
        report,
        ragContext,
      );
      void this.recordAiAudit(
        report.id,
        "PLANNING_AGENT",
        { report, ragContext },
        response,
      );
      const data = response?.data?.data || response?.data || {};
      const actionPlan = await this.repository.upsertActionPlan(report.id, {
        targetAgency: String(data.targetAgency || "Dinas Terkait"),
        confidenceScore: this.numberOr(data.confidenceScore, 0),
        estimatedDays: Math.max(
          0,
          Math.trunc(this.numberOr(data.estimatedDays, 0)),
        ),
        actionSteps: Array.isArray(data.actionSteps) ? data.actionSteps : [],
        confidenceMetadata: {
          agencyConfidence: this.numberOr(data.agencyConfidence, 0),
          planConfidence: this.numberOr(data.planConfidence, 0),
          dispatchReason: data.dispatchReason || data.dispatchNotes || null,
          ragContext,
        },
      });
      const updated = await this.repository.update(report.id, {
        priority: this.priorityFromScore(
          data.priorityScore || data.confidenceScore * 100,
        ),
        aiProcessed: true,
      });
      return res.json({
        success: true,
        data: { report: updated, actionPlan, ragContext },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Verifies field repair resolution with geofence proximity checking and AI multimodal vision analysis.
   *
   * @param {import("express").Request} req - Express request with officer GPS and completion photo.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>}
   */
  async verifyPipeline(req, res, next) {
    try {
      const reportId = req.body?.reportId || req.params.id;
      const report = await this.getPipelineReport(reportId);
      const latitude = Number.parseFloat(req.body?.latitude);
      const longitude = Number.parseFloat(req.body?.longitude);
      const reportLatitude = Number(report.latitude);
      const reportLongitude = Number(report.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(reportLatitude) ||
        !Number.isFinite(reportLongitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message: "Koordinat lokasi verifikasi tidak valid.",
        });
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        reportLatitude,
        reportLongitude,
      );
      if (distance > 100) {
        return res.status(400).json({
          success: false,
          message: `Lokasi Anda terlalu jauh (${distance.toFixed(
            2,
          )} meter) dari titik laporan. Verifikasi harus dilakukan di lokasi kejadian.`,
        });
      }

      const beforePhotoUrl = report.photoUrl || report.imageUrl;

      const afterPhotoUrl = req.processedImageBase64
        ? this.toDataUri(req.processedImageMimeType, req.processedImageBase64)
        : req.file?.buffer
          ? this.toDataUri(
              req.file.mimetype || "image/jpeg",
              req.file.buffer.toString("base64"),
            )
          : null;

      if (!this.isSupportedImageReference(beforePhotoUrl)) {
        const error = new Error("Before report image is missing or invalid");
        error.statusCode = 400;
        error.code = "INVALID_IMAGE_PAYLOAD";
        throw error;
      }
      if (!this.isSupportedImageReference(afterPhotoUrl)) {
        const error = new Error("After repair image is missing or invalid");
        error.statusCode = 400;
        error.code = "INVALID_IMAGE_PAYLOAD";
        throw error;
      }

      const payload = {
        reportId,
        beforePhotoUrl,
        afterPhotoUrl,
        reportDescription: report.description,
        auditNotes: req.body.auditNotes || null,
        distance,
      };
      const response = await this.aiService.request("/api/ai/verify", payload);
      void this.recordAiAudit(
        reportId,
        "VERIFICATION_AGENT",
        payload,
        response,
      );
      const data = this.extractVerificationResult(response);
      if (!this.isValidVerificationResult(data)) {
        const error = new Error("AI returned an invalid verification response");
        error.statusCode = 502;
        error.code = "INVALID_AI_RESPONSE";
        throw error;
      }

      const confidenceScore = this.getVerificationConfidence(data);
      const isResolved =
        data.isResolved === true &&
        data.visualMatch === true &&
        confidenceScore >= 0.8;
      const updated = await this.repository.update(
        reportId,
        isResolved
          ? { status: "Resolved", requiresHumanReview: false }
          : { requiresHumanReview: true },
      );
      await this.repository.addAuditLog(
        reportId,
        isResolved ? "AI_FIELD_VERIFIED" : "AI_FIELD_VERIFICATION_REJECTED",
        data,
      );
      return res.json({ success: true, data: updated, verification: data });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Converts MIME type and Base64 string into a valid Data URI.
   *
   * @param {string} mimeType - Image MIME type (e.g. image/jpeg).
   * @param {string} base64 - Base64 encoded image string.
   * @returns {string} Formatted data URI string.
   */
  toDataUri(mimeType, base64) {
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Validates whether an image reference is a valid HTTP(S) URL or Data URI.
   *
   * @param {string} value - Image reference string to validate.
   * @returns {boolean} True if reference is supported.
   */
  isSupportedImageReference(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    if (/^https?:\/\/\S+$/i.test(value)) return true;
    const match = value.match(
      /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i,
    );
    return Boolean(match && match[2].length % 4 === 0);
  }

  /**
   * Extracts verification data object from heterogeneous AI service response shapes.
   *
   * @param {Object} response - Raw AI service response.
   * @returns {Object|null} Extracted verification payload.
   */
  extractVerificationResult(response) {
    return response?.data?.data || response?.data || null;
  }

  /**
   * Asserts structural validity and range constraints of AI verification responses.
   *
   * @param {Object|null} data - Verification response object.
   * @returns {boolean} True if data adheres to verification contract.
   */
  isValidVerificationResult(data) {
    return Boolean(
      data &&
      typeof data.isResolved === "boolean" &&
      typeof data.visualMatch === "boolean" &&
      Number.isFinite(this.getVerificationConfidence(data)) &&
      this.getVerificationConfidence(data) >= 0 &&
      this.getVerificationConfidence(data) <= 1 &&
      typeof data.auditNotes === "string",
    );
  }

  /**
   * Resolves the numeric verification confidence score from response properties.
   *
   * @param {Object} data - Verification response object.
   * @returns {number} Confidence value normalized between 0 and 1.
   */
  getVerificationConfidence(data) {
    return Number(data?.verificationConfidence ?? data?.confidenceScore);
  }

  /**
   * Persists an audit record for AI agent invocations asynchronously.
   *
   * @param {string} reportId - Target report ID.
   * @param {string} agentName - Name of the executing AI agent.
   * @param {Object} payload - Input payload dispatched to AI.
   * @param {Object} response - Output received from AI service.
   * @returns {Promise<void>}
   */
  async recordAiAudit(reportId, agentName, payload, response) {
    if (!reportId || typeof this.repository?.addAiAuditLog !== "function") {
      return;
    }
    const data = this.extractVerificationResult(response) || {};
    const confidenceScore = this.numberOr(
      data.confidenceScore ?? data.verificationConfidence,
      null,
    );
    try {
      await this.repository.addAiAuditLog(
        reportId,
        agentName,
        payload,
        response,
        confidenceScore,
      );
    } catch (error) {
      console.error("[AUMS Backend] AI audit log failed:", {
        reportId,
        agentName,
        message: error.message,
      });
    }
  }

  /**
   * Retrieves a report and asserts existence before pipeline processing.
   *
   * @param {string} id - Target report UUID.
   * @returns {Promise<Object>} Found report record.
   * @throws {Error} If report ID is missing or record does not exist.
   */
  async getPipelineReport(id) {
    if (!id) {
      const error = new Error("Report id is required");
      error.statusCode = 400;
      throw error;
    }
    const report = await this.repository.findById(id);
    if (!report) {
      const error = new Error("Report not found");
      error.statusCode = 404;
      throw error;
    }
    return report;
  }

  /**
   * Parses input as a finite number or returns a fallback value.
   *
   * @param {*} value - Candidate value.
   * @param {number} fallback - Default fallback number.
   * @returns {number}
   */
  numberOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  /**
   * Maps numerical priority scores into categorical priority tiers.
   *
   * @param {number|string} value - Priority score from 1-100.
   * @returns {"Low"|"Medium"|"High"} Standard priority tier.
   */
  priorityFromScore(value) {
    const score = this.numberOr(value, 50);
    return score >= 75 ? "High" : score <= 35 ? "Low" : "Medium";
  }
}

module.exports = ReportController;
module.exports.calculateDistance = calculateDistance;
