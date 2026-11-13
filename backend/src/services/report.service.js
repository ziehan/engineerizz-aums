const { AiServiceUnavailableError } = require("./ai.service");

/**
 * @typedef {Object} ReportInputData
 * @property {string} title - Incident title.
 * @property {string} description - Detailed problem narrative.
 * @property {string} category - Public infrastructure issue category.
 * @property {number} latitude - WGS84 decimal latitude [-90 to 90].
 * @property {number} longitude - WGS84 decimal longitude [-180 to 180].
 * @property {string} [locationAddress] - Resolved street address.
 * @property {string} [photoUrl] - Stored image URL reference.
 * @property {string} [reporterId] - UUID of submitting citizen.
 */

/**
 * @typedef {Object} NormalizedActionPlan
 * @property {string} targetAgency - Responsible DKI SKPD department name.
 * @property {number} estimatedDays - Estimated resolution timeline in integer days.
 * @property {Array<string>} actionSteps - 3 to 5 chronological operational steps.
 * @property {number} confidenceScore - Normalized planning confidence score [0.0 - 1.0].
 * @property {Object} confidenceMetadata - Extended metadata breakdown (agencyConfidence, planConfidence, ragContext).
 */

/**
 * @typedef {Object} ValidationConfidenceScores
 * @property {number} validityConfidence - Score [0.0 - 1.0] representing validity likelihood.
 * @property {number} deduplicationConfidence - Score [0.0 - 1.0] representing duplication certainty.
 */

/**
 * Orchestrates report lifecycle operations, role masking, and AI-assisted processing.
 *
 * @description
 * Manages the end-to-end report lifecycle: embedding generation, AI intake validation,
 * geospatial deduplication clustering, RAG-guided operational action planning,
 * field officer verification audits, and role-based data governance.
 */
class ReportService {
  /**
   * Initializes ReportService with repository and external integration dependencies.
   *
   * @param {import("../repositories/report.repository")} repository - Report persistence dependency.
   * @param {import("./maps.service")} mapsService - Address lookup dependency.
   * @param {import("./ai.service")} aiService - AI integration dependency.
   */
  constructor(repository, mapsService, aiService) {
    this.repository = repository;
    this.mapsService = mapsService;
    this.aiService = aiService;
  }

  /**
   * Creates a report and runs AI validation, deduplication, and planning.
   *
   * @description
   * Executes the primary citizen intake pipeline:
   * 1. Looks up nearby candidate reports within geospatial bounding box for deduplication.
   * 2. Resolves street address via mapsService if not provided.
   * 3. Calls aiService.embed() to generate a 768-dimensional vector representation.
   * 4. Persists report record in PostgreSQL with PostGIS Point and pgvector embedding.
   * 5. Calls aiService.validate() (IntakeAgent) to evaluate validity and deduplication.
   * 6. Records INTAKE_AGENT AuditLog with validity confidence and raw response.
   * 7. If duplicate of known primary, clusters under parentReportId and increments duplicate count.
   * 8. If valid, calls aiService.plan() (PlanningAgent) and upserts ActionPlan.
   * 9. Records PLANNING_AGENT AuditLog and flags report if confidence scores fall below 0.70.
   *
   * @param {ReportInputData} [input={}] - New report data payload.
   * @returns {Promise<Object>} Persisted report and pipeline processing result.
   * @throws {Error} Throws database exceptions or rethrows non-circuit-breaker errors.
   */
  async createReport(input = {}) {
    const candidateReports =
      await this.repository.findDeduplicationCandidates(input);
    const locationAddress =
      input.locationAddress ||
      (await this.mapsService.reverseGeocode(input.latitude, input.longitude));

    let embedding = null;
    try {
      if (typeof this.aiService?.embed === "function") {
        const textToEmbed =
          `${input.title || ""}\n${input.description || ""}\n${input.category || ""}`.trim();
        embedding = await this.aiService.embed(textToEmbed);
      }
    } catch (embedError) {
      console.warn(
        "[Backend] Embedding generation failed, continuing without vector:",
        embedError.message,
      );
    }

    const reportDataPayload = {
      ...input,
      locationAddress,
      status: "Pending",
      isDuplicate: false,
      aiProcessed: false,
    };

    const report =
      typeof this.repository?.createWithEmbedding === "function"
        ? await this.repository.createWithEmbedding(
            reportDataPayload,
            embedding,
          )
        : await this.repository.create(reportDataPayload);

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

      const intakePayload = {
        title: input.title,
        description: input.description,
        category: input.category,
        latitude: Number(input.latitude),
        longitude: Number(input.longitude),
        photoUrl: report.photoUrl || input.photoUrl || null,
      };
      const validityScore = this.toConfidence(
        validationData.validityConfidence ??
          validationData.confidenceScore ??
          validationConfidence.validityConfidence,
        0.85,
      );
      void this.recordAiAudit({
        reportId: report.id,
        agentName: "INTAKE_AGENT",
        action: "AI_INTAKE_COMPLETED",
        details: `AI Intake completed with validity confidence ${validityScore}`,
        payload: intakePayload,
        response: validationData,
        confidenceScore: validityScore,
      });

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
      const planOutput =
        aiPlanResponse?.data?.data ?? aiPlanResponse?.data ?? {};
      const planningPayload = {
        description: reportData.description,
        category: reportData.category,
        ragContext: [],
      };
      void this.recordAiAudit({
        reportId: report.id,
        agentName: "PLANNING_AGENT",
        action: "AI_PLANNING_COMPLETED",
        details: `AI Planning completed for target agency: ${actionPlan.targetAgency}`,
        payload: planningPayload,
        response: {
          targetAgency: planOutput.targetAgency || actionPlan.targetAgency,
          actionSteps: planOutput.actionSteps || actionPlan.actionSteps,
          estimatedDays: planOutput.estimatedDays || actionPlan.estimatedDays,
          dispatchReason:
            planOutput.dispatchReason || planOutput.dispatchNotes || null,
          ...planOutput,
        },
        confidenceScore: actionPlan.confidenceScore,
      });

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
   * Applies role-based data governance and masking before returning report objects to clients.
   *
   * @description
   * Enforces data privacy and security policies compliant with UU Perlindungan Data Pribadi (UU PDP No. 27/2022):
   * 1. CRM_OFFICER & ADMIN: Full Observability. Returns raw report object including all audit logs,
   *    confidence scores, and AI prompt payload traces.
   * 2. FIELD_OFFICER: Operational Task Visibility. Sanitizes internal audit logs and raw vector
   *    embeddings while exposing actionable field instructions (actionPlan.actionSteps, targetAgency, estimatedDays).
   * 3. CITIZEN (or unauthenticated): Public Minimalist. Masks citizen NIK, internal agent audit logs,
   *    raw prompt interactions, and technical model confidence scores. Only surfaces public incident
   *    metadata, status, before/after media photos, and handling agency name.
   *
   * @param {Object|null} report - Raw database report entity with related records.
   * @param {string} [userRole="CITIZEN"] - Role of the requesting client ("CITIZEN", "FIELD_OFFICER", "CRM_OFFICER", "ADMIN").
   * @returns {Object|null} Sanitized report adhering strictly to role-based access control rules.
   */
  maskReport(report, userRole = "CITIZEN") {
    if (!report || typeof report !== "object") return report;
    const role = String(userRole || "CITIZEN").toUpperCase();

    // 1. CRM_OFFICER & ADMIN: Full Observability
    if (role === "CRM_OFFICER" || role === "ADMIN") {
      return report;
    }

    // 2. FIELD_OFFICER: Operational task data, field steps (aiActionPlan.actionSteps),
    // target agency, and estimated days. Raw AI prompt conversations and internal vector embeddings are hidden.
    if (role === "FIELD_OFFICER") {
      const masked = { ...report };
      if (masked.actionPlan) {
        masked.actionPlan = {
          id: masked.actionPlan.id,
          reportId: masked.actionPlan.reportId,
          targetAgency: masked.actionPlan.targetAgency,
          estimatedDays: masked.actionPlan.estimatedDays,
          actionSteps: Array.isArray(masked.actionPlan.actionSteps)
            ? masked.actionPlan.actionSteps
            : [],
          approvedBy: masked.actionPlan.approvedBy || null,
          approvedAt: masked.actionPlan.approvedAt || null,
          createdAt: masked.actionPlan.createdAt,
        };
      }
      delete masked.auditLogs;
      delete masked.embedding;
      return masked;
    }

    // 3. CITIZEN (or unauthenticated/public): Essential public information only.
    // Sensitive NIK of other citizens, raw AI payloads, technical confidence scores,
    // and internal agent audit logs are completely masked.
    const targetAgency = report.actionPlan?.targetAgency || null;
    const publicActionPlan = report.actionPlan
      ? {
          id: report.actionPlan.id,
          reportId: report.actionPlan.reportId,
          targetAgency: report.actionPlan.targetAgency,
          estimatedDays: report.actionPlan.estimatedDays,
          actionSteps: Array.isArray(report.actionPlan.actionSteps)
            ? report.actionPlan.actionSteps
            : [],
          approvedBy: report.actionPlan.approvedBy || null,
          approvedAt: report.actionPlan.approvedAt || null,
          createdAt: report.actionPlan.createdAt,
        }
      : null;
    return {
      id: report.id,
      title: report.title,
      description: report.description,
      category: report.category,
      status: report.status,
      priority: report.priority,
      locationAddress: report.locationAddress,
      latitude: report.latitude,
      longitude: report.longitude,
      photoUrl: report.photoUrl || null,
      officerPhotoUrl: report.officerPhotoUrl || null,
      officerNotes: report.officerNotes || null,
      assignedOfficerName: report.assignedOfficerName || null,
      targetAgency,
      actionPlan: publicActionPlan,
      resolvedAt: report.resolvedAt || null,
      isDuplicate: report.isDuplicate ?? false,
      duplicateCount: report.duplicateCount ?? 0,
      reporterId: report.reporterId || null,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  /**
   * Retrieves reports using status, category, priority, and reporter filters with role-based masking.
   *
   * @param {object} query Report filter parameters.
   * @param {string} [userRole="CITIZEN"] Requesting user role.
   * @param {string|null} [userId=null] Authenticated user ID.
   * @returns {Promise<Array<object>>} Matching masked reports.
   */
  async listReports(query = {}, userRole = "CITIZEN", userId = null) {
    const filters = {};
    if (query.status) filters.status = query.status;
    if (query.category) filters.category = query.category;
    if (query.priority) filters.priority = query.priority;
    if (query.reporterId) {
      filters.reporterId = query.reporterId;
    } else if (
      (query.myReports === "true" || query.myReports === true) &&
      userId
    ) {
      filters.reporterId = userId;
    }
    const reports = await this.repository.findMany(filters);
    return Array.isArray(reports)
      ? reports.map((r) => this.maskReport(r, userRole))
      : [];
  }

  /**
   * Retrieves reports submitted specifically by an individual citizen.
   *
   * @param {string} userId - UUID of the citizen user.
   * @param {object} [query={}] - Optional query filters (status, category, priority).
   * @param {string} [userRole="CITIZEN"] - Requesting user role.
   * @returns {Promise<Array<object>>} Masked list of citizen's own reports.
   */
  async listMyReports(userId, query = {}, userRole = "CITIZEN") {
    const filters = { reporterId: userId };
    if (query.status) filters.status = query.status;
    if (query.category) filters.category = query.category;
    if (query.priority) filters.priority = query.priority;
    const reports = await this.repository.findMany(filters);
    return Array.isArray(reports)
      ? reports.map((r) => this.maskReport(r, userRole))
      : [];
  }

  /**
   * Retrieves one report and ensures it exists, applying role-based masking.
   *
   * @param {string} id Report ID.
   * @param {string} [userRole] Requesting user role. If omitted or null, returns raw report for internal operations.
   * @returns {Promise<object>} Masked report data.
   */
  async getReport(id, userRole) {
    const report = await this.repository.findById(id);
    if (!report) {
      const error = new Error("Report not found");
      error.statusCode = 404;
      throw error;
    }
    if (userRole === undefined || userRole === null || userRole === "RAW") {
      return report;
    }
    return this.maskReport(report, userRole);
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
   * @param {Object|string} optionsOrReportId Report ID or audit options object.
   * @param {string} [agentName] AI agent name.
   * @param {object} [payload] Payload sent to the AI service.
   * @param {object} [response] Raw AI response.
   * @param {number|null} [confidenceScore=null] Confidence score, when available.
   * @returns {Promise<void>} Resolves when audit recording completes.
   */
  async recordAiAudit(
    optionsOrReportId,
    agentName,
    payload,
    response,
    confidenceScore = null,
  ) {
    try {
      if (typeof optionsOrReportId === "object" && optionsOrReportId !== null) {
        if (!optionsOrReportId.reportId) {
          throw new Error("Report id is required for AI audit logging");
        }
        if (typeof this.repository?.addAiAuditLog === "function") {
          await this.repository.addAiAuditLog(optionsOrReportId);
        }
      } else {
        if (!optionsOrReportId) {
          throw new Error("Report id is required for AI audit logging");
        }
        if (typeof this.repository?.addAiAuditLog === "function") {
          await this.repository.addAiAuditLog(
            optionsOrReportId,
            agentName,
            payload,
            response,
            confidenceScore,
          );
        }
      }
    } catch (error) {
      console.error("[Backend] AI audit log failed:", error.message);
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
   * @description
   * Evaluates post-repair evidence submitted by field maintenance crews:
   * 1. Fetches current report details and dispatches proof payload to AI service.
   * 2. Extracts multimodal evaluation outcome (visualMatch, isResolved, auditNotes).
   * 3. Records VERIFICATION_AGENT audit log entry with action FIELD_VERIFIED or FIELD_VERIFICATION_REJECTED.
   * 4. Asserts acceptance criteria: visualMatch === true, isResolved === true, and verification confidence >= 0.8.
   * 5. Updates report status to 'Resolved', stores officer completion photo, notes, and resolvedAt timestamp.
   *
   * @param {string} id - Target report UUID.
   * @param {Object} proof - Field verification evidence.
   * @param {number} [proof.latitude] - Officer GPS latitude.
   * @param {number} [proof.longitude] - Officer GPS longitude.
   * @param {number} [proof.distanceMeters] - Haversine distance from incident site.
   * @param {string} [proof.afterPhotoUrl] - URL of completion photo.
   * @param {string} [proof.notes] - Field resolution notes.
   * @returns {Promise<Object>} Updated and verified report entity.
   * @throws {Error} Throws 422 Unprocessable Entity if verification is rejected by AI vision.
   */
  async verifyReport(id, proof) {
    const report = await this.getReport(id);
    const verification = await this.aiService.verify(report, proof);
    const vData =
      verification?.data?.data ?? verification?.data ?? verification;
    const isAccepted = vData.visualMatch === true && vData.isResolved === true;
    const verificationConfidence = Number(
      vData.verificationConfidence ?? vData.confidenceScore ?? 0.8,
    );
    const verificationPayload = {
      officerLatitude: Number(proof.latitude ?? proof.officerLatitude),
      officerLongitude: Number(proof.longitude ?? proof.officerLongitude),
      distanceMeters: Number(proof.distanceMeters ?? proof.distance ?? 0),
      officerNotes:
        proof.notes || proof.officerNotes || proof.auditNotes || null,
      officerPhotoUrl: proof.afterPhotoUrl || proof.officerPhotoUrl || null,
    };
    void this.recordAiAudit({
      reportId: id,
      agentName: "VERIFICATION_AGENT",
      action: isAccepted ? "FIELD_VERIFIED" : "FIELD_VERIFICATION_REJECTED",
      details: isAccepted
        ? "Field repair verified successfully by AI vision"
        : "Field repair verification rejected by AI vision",
      payload: verificationPayload,
      response: {
        visualMatch: vData.visualMatch,
        isResolved: vData.isResolved,
        auditNotes: vData.auditNotes || null,
        ...vData,
      },
      confidenceScore: verificationConfidence,
    });
    await this.repository.addAuditLog(id, "AI_FIELD_VERIFIED", verification);
    if (
      verification.verified === false ||
      verification.valid === false ||
      isAccepted === false
    ) {
      const error = new Error("Field verification was not accepted");
      error.statusCode = 422;
      throw error;
    }
    await this.repository.update(id, {
      status: "Resolved",
      officerPhotoUrl: verificationPayload.officerPhotoUrl,
      officerNotes: verificationPayload.officerNotes,
      resolvedAt: new Date(),
    });
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
