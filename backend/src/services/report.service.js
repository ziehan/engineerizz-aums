const { AiServiceUnavailableError } = require("./ai.service");

/**
 * Orchestrates report lifecycle operations and AI-assisted processing.
 */
class ReportService {
  /**
   * @param {ReportRepository} repository Report persistence dependency.
   * @param {MapsService} mapsService Address lookup dependency.
   * @param {AiIntegrationService} aiService AI integration dependency.
   */
  constructor(repository, mapsService, aiService) {
    this.repository = repository;
    this.mapsService = mapsService;
    this.aiService = aiService;
  }

  /**
   * Creates a report and runs AI validation, deduplication, and planning.
   *
   * @param {object} input New report data.
   * @returns {Promise<object>} Report and pipeline processing result.
   */
  async createReport(input = {}) {
    const candidateReports =
      await this.repository.findDeduplicationCandidates(input);
    const locationAddress =
      input.locationAddress ||
      (await this.mapsService.reverseGeocode(input.latitude, input.longitude));
    const report = await this.repository.create({
      ...input,
      locationAddress,
      status: "Pending",
      isDuplicate: false,
      aiProcessed: false,
    });

    try {
      const reportData = report;
      const validation = await this.aiService.validate(
        reportData,
        candidateReports,
      );
      const validationData = validation?.data?.data ?? validation?.data ?? {};
      const isValid =
        validationData.valid !== false && validationData.isValid !== false;
      const validationConfidence =
        this.extractValidationConfidence(validationData);
      void this.recordAiAudit(
        report.id,
        "INTAKE_AGENT",
        { report: reportData, candidateReports },
        validation,
        this.toConfidence(
          validationData.confidenceScore ??
            validationData.validityConfidence ??
            validationConfidence.validityConfidence,
          null,
        ),
      );
      await this.repository.addAuditLog(
        report.id,
        "AI_VALIDATED",
        this.buildAiAuditDetails(validation, {
          validityConfidence: validationConfidence.validityConfidence,
          deduplicationConfidence: validationConfidence.deduplicationConfidence,
        }),
      );
      const validationReview = this.getHumanReviewReasons({
        validityConfidence: validationConfidence.validityConfidence,
        deduplicationConfidence: validationConfidence.deduplicationConfidence,
      });
      if (!isValid) {
        return this.repository.update(report.id, { status: "Rejected" });
      }

      const parentReportId =
        validationData.primaryReportId ||
        validationData.parentReportId ||
        validationData.duplicateOfReportId ||
        candidateReports[0]?.id;
      const isKnownPrimary = candidateReports.some(
        (candidate) => candidate.id === parentReportId,
      );
      if (validationData.isDuplicate === true && isKnownPrimary) {
        const duplicate = await this.repository.markAsDuplicate(
          report.id,
          parentReportId,
        );
        if (validationReview.requiresHumanReview) {
          await this.markForHumanReview(report.id, validationReview.reasons);
        }
        await this.repository.addAuditLog(report.id, "REPORT_DUPLICATE", {
          parentReportId,
        });
        return {
          report: {
            ...duplicate,
            requiresHumanReview: validationReview.requiresHumanReview,
          },
          notice:
            "Laporan Anda dicatat sebagai duplikat dan memperkuat urgensi penanganan masalah ini.",
        };
      }

      const aiPlanResponse = await this.aiService.plan(reportData);
      const actionPlan = this.normalizePlan(aiPlanResponse);
      void this.recordAiAudit(
        report.id,
        "PLANNING_AGENT",
        { report: reportData },
        aiPlanResponse,
        actionPlan.confidenceScore,
      );
      await this.repository.upsertActionPlan(report.id, actionPlan);
      await this.repository.addAuditLog(
        report.id,
        "AI_PLANNED",
        this.buildAiAuditDetails(aiPlanResponse, {
          validityConfidence: validationConfidence.validityConfidence,
          deduplicationConfidence: validationConfidence.deduplicationConfidence,
          agencyConfidence: actionPlan.confidenceMetadata.agencyConfidence,
          planConfidence: actionPlan.confidenceMetadata.planConfidence,
        }),
      );
      const planReview = this.getHumanReviewReasons({
        validityConfidence: validationConfidence.validityConfidence,
        deduplicationConfidence: validationConfidence.deduplicationConfidence,
        confidenceScore: actionPlan.confidenceScore,
      });
      await this.repository.update(report.id, { aiProcessed: true });
      if (planReview.requiresHumanReview) {
        await this.markForHumanReview(report.id, planReview.reasons);
      }
      return {
        report: {
          ...(await this.repository.findById(report.id)),
          requiresHumanReview: planReview.requiresHumanReview,
        },
      };
    } catch (error) {
      await this.repository.addAuditLog(report.id, "AI_PIPELINE_FAILED", {
        message: error.message,
      });
      if (error instanceof AiServiceUnavailableError) {
        console.warn(
          "[Backend Warning] AI Service Offline/Failed. Report saved for manual/batch processing.",
        );
        return {
          report: await this.repository.findById(report.id),
          notice: "Report saved, AI processing queued",
        };
      }
      throw error;
    }
  }

  /**
   * Retrieves reports using status, category, and priority filters.
   *
   * @param {object} query Report filter parameters.
   * @returns {Promise<Array<object>>} Matching reports.
   */
  async listReports(query) {
    const filters = {};
    if (query.status) filters.status = query.status;
    if (query.category) filters.category = query.category;
    if (query.priority) filters.priority = query.priority;
    return this.repository.findMany(filters);
  }

  /**
   * Retrieves one report and ensures it exists.
   *
   * @param {string} id Report ID.
   * @returns {Promise<object>} Report data.
   */
  async getReport(id) {
    const report = await this.repository.findById(id);
    if (!report) {
      const error = new Error("Report not found");
      error.statusCode = 404;
      throw error;
    }
    return report;
  }

  /**
   * Deletes a report after ensuring it exists.
   *
   * @param {string} id Report ID.
   * @returns {Promise<object>} Deletion result.
   */
  async deleteReport(id) {
    const report = await this.repository.findById(id);
    if (!report) {
      const error = new Error("Report not found");
      error.statusCode = 404;
      throw error;
    }
    await this.repository.deleteById(id);
    return { success: true, message: "Report deleted" };
  }

  /**
   * Deletes a duplicate report by ID.
   *
   * @param {string} duplicateId Duplicate report ID.
   * @returns {Promise<object>} Deletion result.
   */
  async deleteDuplicate(duplicateId) {
    const deleted = await this.repository.deleteDuplicateById(duplicateId);
    if (!deleted) {
      const error = new Error("Report not found");
      error.statusCode = 404;
      throw error;
    }
    return { success: true, message: "Duplicate report deleted" };
  }

  /**
   * Records an AI audit without interrupting the main report-processing flow.
   *
   * @param {string} reportId Report ID.
   * @param {string} agentName AI agent name.
   * @param {object} payload Payload sent to the AI service.
   * @param {object} response Raw AI response.
   * @param {number|null} confidenceScore Confidence score, when available.
   * @returns {Promise<void>} Resolves when audit recording completes.
   */
  async recordAiAudit(
    reportId,
    agentName,
    payload,
    response,
    confidenceScore = null,
  ) {
    try {
      if (!reportId) {
        throw new Error("Report id is required for AI audit logging");
      }
      if (typeof this.repository?.addAiAuditLog !== "function") {
        throw new Error("AI audit log repository method is unavailable");
      }

      await this.repository.addAiAuditLog(
        reportId,
        agentName,
        payload,
        response,
        confidenceScore,
      );
    } catch (error) {
      console.error("[Backend] AI audit log failed:", {
        reportId,
        agentName,
        message: error.message,
      });
    }
  }

  /**
   * Approves a report, updates its action plan, and records an audit event.
   *
   * @param {string} id Report ID.
   * @param {string} approvedBy Approver name.
   * @returns {Promise<object>} Approved report.
   */
  async approveReport(id, approvedBy) {
    await this.getReport(id);
    const updated = await this.repository.update(id, { status: "Approved" });
    if (approvedBy) {
      await this.repository.updateActionPlan(id, {
        approvedBy,
        approvedAt: new Date(),
      });
    }
    await this.repository.addAuditLog(id, "CRM_APPROVED", {
      approvedBy: approvedBy || "system",
    });
    return this.getReport(updated.id);
  }

  /**
   * Verifies field repair evidence through the AI service.
   *
   * @param {string} id Report ID.
   * @param {object} proof Field verification evidence.
   * @returns {Promise<object>} Verified report.
   */
  async verifyReport(id, proof) {
    const report = await this.getReport(id);
    const verification = await this.aiService.verify(report, proof);
    await this.repository.addAuditLog(id, "AI_FIELD_VERIFIED", verification);
    if (verification.verified === false || verification.valid === false) {
      const error = new Error("Field verification was not accepted");
      error.statusCode = 422;
      throw error;
    }
    await this.repository.update(id, { status: "Resolved" });
    await this.repository.addAuditLog(id, "FIELD_VERIFIED", proof);
    return this.getReport(id);
  }

  /**
   * Normalizes an AI response into the application's action-plan structure.
   *
   * @param {object} aiPlanResponse AI planning response.
   * @returns {object} Normalized action plan.
   */
  normalizePlan(aiPlanResponse = {}) {
    const planData = aiPlanResponse?.data?.data ?? aiPlanResponse?.data ?? {};
    const estimatedDays = parseInt(
      String(planData.estimatedDays).replace(/\D/g, ""),
      10,
    );
    const confidenceScore = parseFloat(planData.confidenceScore) || 0.85;
    const agencyConfidence = this.toConfidence(
      planData.agencyConfidence,
      confidenceScore,
    );
    const planConfidence = this.toConfidence(
      planData.planConfidence,
      confidenceScore,
    );

    return {
      targetAgency: String(planData.targetAgency || "Dinas Terkait"),
      estimatedDays: Number.isFinite(estimatedDays) ? estimatedDays : 3,
      actionSteps: Array.isArray(planData.actionSteps)
        ? planData.actionSteps
        : [],
      confidenceScore,
      confidenceMetadata: {
        agencyConfidence,
        planConfidence,
        reasoning: planData.reasoning || null,
        usedProvider: aiPlanResponse?.usedProvider || null,
        executionTimeMs: aiPlanResponse?.executionTimeMs || null,
      },
    };
  }

  /**
   * Extracts and normalizes AI validation confidence scores.
   *
   * @param {object} validationData AI validation data.
   * @returns {object} Validity and deduplication scores.
   */
  extractValidationConfidence(validationData = {}) {
    const confidence = validationData.confidence || {};
    return {
      validityConfidence: this.toConfidence(
        validationData.validityConfidence ?? confidence.validityConfidence,
        0,
      ),
      deduplicationConfidence: this.toConfidence(
        validationData.deduplicationConfidence ??
          confidence.deduplicationConfidence,
        0,
      ),
    };
  }

  /**
   * Converts a confidence value to a number or fallback.
   *
   * @param {*} value Confidence value.
   * @param {number} fallback Fallback value.
   * @returns {number} Numeric confidence value.
   */
  toConfidence(value, fallback) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /**
   * Determines why a report requires manual review based on confidence.
   *
   * @param {object} scores Pipeline confidence scores.
   * @returns {{requiresHumanReview: boolean, reasons: Array<string>}} Review status and reasons.
   */
  getHumanReviewReasons(scores) {
    const reasons = [];
    if (scores.validityConfidence < 0.7) {
      reasons.push("validityConfidence is below 0.70");
    }
    if (scores.deduplicationConfidence < 0.7) {
      reasons.push("deduplicationConfidence is below 0.70");
    }
    if (scores.confidenceScore !== undefined && scores.confidenceScore < 0.7) {
      reasons.push("confidenceScore is below 0.70");
    }
    return { requiresHumanReview: reasons.length > 0, reasons };
  }

  /**
   * Builds audit details from an AI response and pipeline scores.
   *
   * @param {object} response AI service response.
   * @param {object} scores Pipeline confidence scores.
   * @returns {object} Structured audit details.
   */
  buildAiAuditDetails(response, scores) {
    const data = response?.data?.data ?? response?.data ?? {};
    return {
      usedProvider: response?.usedProvider || null,
      executionTimeMs: response?.executionTimeMs || null,
      reasoning: data.reasoning || null,
      ...scores,
    };
  }

  /**
   * Marks a report for human review and records the reasons.
   *
   * @param {string} reportId Report ID.
   * @param {Array<string>} reasons Review reasons.
   * @returns {Promise<void>} Resolves when the review status is updated.
   */
  async markForHumanReview(reportId, reasons) {
    await this.repository.update(reportId, { requiresHumanReview: true });
    await this.repository.addAuditLog(reportId, "NEEDS_HUMAN_REVIEW", {
      reasons,
    });
  }
}

module.exports = ReportService;
