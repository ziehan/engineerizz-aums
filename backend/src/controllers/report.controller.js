const EARTH_RADIUS_METERS = 6371000;
const { uploadImageBuffer } = require("../services/storage.service");

/**
 * @typedef {Object} GeoCoordinates
 * @property {number} latitude - Decimal degrees [-90 to 90].
 * @property {number} longitude - Decimal degrees [-180 to 180].
 */

/**
 * @typedef {Object} VerificationPayload
 * @property {number|string} latitude - Officer GPS latitude from Web Geolocation API.
 * @property {number|string} longitude - Officer GPS longitude from Web Geolocation API.
 * @property {string} [notes] - Operational field resolution notes.
 * @property {string} [auditNotes] - Additional audit observations.
 * @property {string} [reportId] - Target report identifier.
 */

/**
 * @typedef {Object} VerificationResult
 * @property {boolean} isResolved - True if defect is resolved in after photo.
 * @property {boolean} visualMatch - True if physical landmarks match before photo.
 * @property {number} verificationConfidence - Model confidence score between 0 and 1.
 * @property {number} confidenceScore - Overall assessment score.
 * @property {string} auditNotes - Audit narrative in Bahasa Indonesia.
 */

/**
 * Calculates great-circle distance between two geographic coordinates using the Haversine formula.
 *
 * @description
 * Implements the spherical law of haversines to calculate the surface distance between two points
 * on Earth (mean radius = 6,371,000 meters). Converts latitude and longitude coordinates from
 * degrees to radians, computes the haversine of central angles, and calculates arc distance.
 *
 * Formula:
 * a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
 * c = 2 * atan2(√a, √(1-a))
 * d = R * c
 *
 * @param {number} lat1 - Latitude of origin point in decimal degrees (e.g., officer browser GPS).
 * @param {number} lon1 - Longitude of origin point in decimal degrees.
 * @param {number} lat2 - Latitude of destination point in decimal degrees (e.g., incident report site).
 * @param {number} lon2 - Longitude of destination point in decimal degrees.
 * @returns {number} Great-circle distance between the two points in meters.
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
 *
 * @description
 * Handles incoming HTTP requests for citizen complaint intake, operational planning,
 * CRM review and approval, and field officer proof verification using multimodal AI vision.
 */
class ReportController {
  /**
   * Initializes the ReportController instance with service dependencies.
   *
   * @description
   * Injects repositories, maps services, AI integration, and media storage dependencies.
   * Binds instance methods to retain class execution context across Express middleware pipelines.
   *
   * @param {Object} options - Injected dependency services and repository instances.
   * @param {import("../services/report.service")} [options.reportService] - Report lifecycle orchestrator.
   * @param {import("../repositories/report.repository")} [options.repository] - Database persistence repository.
   * @param {import("../services/maps.service")} [options.mapsService] - Address geocoding service.
   * @param {import("../services/geo.service")} [options.geoService] - OpenStreetMap Nominatim reverse geocoder.
   * @param {import("../services/ai.service")} [options.aiService] - AI microservice integration layer.
   * @param {import("../services/storage.service")} [options.storageService] - Supabase media storage service.
   * @param {import("../services/rag.service")} [options.ragService] - Historical context RAG retrieval service.
   * @param {Function} [options.uploadImageBuffer] - Direct image upload function override.
   */
  constructor(options) {
    if (options && options.reportService) {
      Object.assign(this, options);
    } else {
      this.reportService = options;
    }

    this.uploadImage =
      options?.storageService?.uploadImageBuffer ||
      options?.uploadImageBuffer ||
      uploadImageBuffer;

    for (const method of [
      "create",
      "list",
      "get",
      "getMyReports",
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
   * @description
   * Handles POST /api/v1/reports endpoint. Receives complaint metadata and optional processed
   * image buffer, persists the report in PostgreSQL with PostGIS geometry, generates Gemini
   * vector embeddings (768d), and triggers AI Intake validation.
   *
   * @param {import("express").Request} req - Express request with validated report body.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>} Sends HTTP 201 Created with persisted report data.
   * @throws {Error} Passes database or validation errors to errorMiddleware.
   */
  async create(req, res, next) {
    try {
      const input = { ...(req.body ?? {}) };
      const reporterId =
        req.user?.userId || req.user?.id || req.body?.reporterId || null;
      if (reporterId) {
        input.reporterId = reporterId;
      }
      const imageBuffer =
        req.processedImageBuffer || req.processedImage || req.file?.buffer;
      if (imageBuffer) {
        try {
          const uploadedUrl = await this.uploadImage(
            imageBuffer,
            `${Date.now()}-citizen.jpg`,
            "reports",
          );
          if (uploadedUrl) {
            input.photoUrl = uploadedUrl;
          }
        } catch (uploadError) {
          console.warn(
            "[ReportController] Storage upload failed for complaint:",
            uploadError.message,
          );
        }
      }

      res.status(201).json({
        data: await this.reportService.createReport(input),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a filtered list of citizen reports.
   *
   * @description
   * Handles GET /api/v1/reports endpoint. Applies query filters (`status`, `category`, `priority`)
   * and enforces role-based data masking (`maskReport`) depending on user authentication role
   * (CITIZEN, FIELD_OFFICER, CRM_OFFICER, or ADMIN).
   *
   * @param {import("express").Request} req - Express request with filter query parameters and authenticated user.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>} Sends HTTP 200 OK with array of masked reports.
   * @throws {Error} Passes database lookup errors to errorMiddleware.
   */
  async list(req, res, next) {
    try {
      const role = req.user?.role || "CITIZEN";
      const userId = req.user?.userId || req.user?.id || null;
      res.json({
        data: await this.reportService.listReports(req.query, role, userId),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves reports submitted specifically by the authenticated citizen.
   *
   * @description
   * Handles GET /api/v1/reports/me endpoint.
   *
   * @param {import("express").Request} req - Express request with authenticated user.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>} Sends HTTP 200 OK with array of user's own reports.
   */
  async getMyReports(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }
      const role = req.user?.role || "CITIZEN";
      const reports =
        typeof this.reportService?.listMyReports === "function"
          ? await this.reportService.listMyReports(userId, req.query, role)
          : await this.reportService.listReports(
              { ...req.query, reporterId: userId },
              role,
              userId,
            );
      return res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a single report by unique identifier.
   *
   * @description
   * Handles GET /api/v1/reports/:id endpoint. Fetches report with action plans and audit logs,
   * applying role-based data masking based on requesting client's privileges.
   *
   * @param {import("express").Request} req - Express request containing report ID UUID in params.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>} Sends HTTP 200 OK with masked report details.
   * @throws {Error} Throws 404 if report does not exist.
   */
  async get(req, res, next) {
    try {
      if (req.params.id === "me") {
        return this.getMyReports(req, res, next);
      }
      const role = req.user?.role || "CITIZEN";
      res.json({
        data: await this.reportService.getReport(req.params.id, role),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approves a report and transitions it to the approved state.
   *
   * @description
   * Handles PATCH /api/v1/reports/:id/approve endpoint. Transition report status from Pending to
   * Approved, records CRM approver metadata in ActionPlan, and appends CRM_APPROVED audit log.
   *
   * @param {import("express").Request} req - Express request containing report UUID and approver info.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} Sends HTTP 200 OK with approved report.
   * @throws {Error} Throws 404 if report not found.
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
   * @description
   * Handles POST /api/v1/reports/:id/verify endpoint. Routes requests to verifyPipeline when
   * repository and aiService dependencies are configured, or delegates to reportService.verifyReport.
   *
   * @param {import("express").Request} req - Express request with verification parameters and after photo.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>} Sends HTTP 200 OK or passes error to errorMiddleware.
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
   * @description
   * Handles DELETE /api/v1/reports/:id endpoint (ADMIN role only). Permanently removes report
   * record and associated cascade records (ActionPlan, AuditLog).
   *
   * @param {import("express").Request} req - Express request with report UUID parameter.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>} Sends HTTP 200 OK with success confirmation.
   * @throws {Error} Throws 404 if report is not found.
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
   * @description
   * Handles DELETE /api/v1/reports/duplicates/:duplicateId endpoint. Atomically deletes duplicate
   * record and decrements duplicateCount on the primary parent report.
   *
   * @param {import("express").Request} req - Express request with duplicate report UUID parameter.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>} Sends HTTP 200 OK with deletion outcome.
   * @throws {Error} Throws 400 if report is not a duplicate, 404 if not found.
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
   * @description
   * Handles POST /api/v1/reports/intake endpoint.
   * Alur proses:
   * 1. Parsing koordinat desimal dari browser Web Geolocation API (latitude, longitude).
   * 2. Reverse geocoding alamat via GeoService / MapsService jika belum ada.
   * 3. Penelusuran kandidat duplikat dalam radius spasial 100 meter.
   * 4. Eksekusi IntakeAgent via AI service untuk analisis keabsahan dan urgensi (1-100).
   * 5. Upload buffer gambar JPEG hasil olahan Sharp ke Supabase Storage bucket 'aums-media'.
   * 6. Generate embedding 768 dimensi menggunakan text-embedding-004.
   * 7. Simpan laporan dengan PostGIS geometry dan pgvector embedding.
   * 8. Rekam AuditLog untuk INTAKE_AGENT dengan action AI_INTAKE_COMPLETED.
   *
   * @param {import("express").Request} req - Express multipart request with photo and coordinates.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} Sends HTTP 201 Created with intake result.
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
      const reporterId =
        req.user?.userId || req.user?.id || req.body?.reporterId || null;
      if (reporterId) {
        input.reporterId = reporterId;
      }
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

      const imageBuffer =
        req.processedImageBuffer || req.processedImage || req.file?.buffer;
      if (imageBuffer) {
        try {
          const uploadedUrl = await this.uploadImage(
            imageBuffer,
            `${Date.now()}-intake.jpg`,
            "reports",
          );
          if (uploadedUrl) {
            input.photoUrl = uploadedUrl;
          }
        } catch (uploadError) {
          console.warn(
            "[ReportController] Storage upload failed for intake:",
            uploadError.message,
          );
        }
      }

      let embedding = input.embedding || aiData.embedding || null;
      if (!embedding && typeof this.aiService?.embed === "function") {
        try {
          const textToEmbed =
            `${input.title}\n${input.description}\n${input.category || ""}`.trim();
          embedding = await this.aiService.embed(textToEmbed);
        } catch (embedError) {
          console.warn(
            "[Backend] Intake embedding failed:",
            embedError.message,
          );
        }
      }

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
          ...(reporterId ? { reporterId } : {}),
        },
        embedding,
      );

      const intakePayload = {
        title: input.title,
        description: input.description,
        category: input.category,
        latitude: input.latitude,
        longitude: input.longitude,
        photoUrl: report.photoUrl || input.photoUrl || null,
      };
      const validityConfidence = this.numberOr(
        aiData.validityConfidence ?? aiData.confidenceScore,
        0.85,
      );

      void this.recordAiAudit({
        reportId: report.id,
        agentName: "INTAKE_AGENT",
        action: "AI_INTAKE_COMPLETED",
        details: `AI Intake completed with validity confidence ${validityConfidence}`,
        payload: intakePayload,
        response: aiData,
        confidenceScore: validityConfidence,
      });

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
   * @description
   * Handles POST /api/v1/reports/plan and POST /api/v1/reports/plan/:id endpoints.
   * Alur proses:
   * 1. Mengambil detail laporan target berdasarkan UUID.
   * 2. Menjalankan penelusuran RAG spasial-vektor (ST_DWithin 100m + pgvector <=> cosine distance).
   * 3. Menyusun ranked historical context laporan terselesaikan serupa sebelumnya.
   * 4. Memanggil PlanningAgent via AI service untuk menetapkan dinas SKPD dan 3-5 langkah kerja lapangan.
   * 5. Upsert model ActionPlan dan update status prioritas laporan.
   * 6. Rekam AuditLog PLANNING_AGENT dengan action AI_PLANNING_COMPLETED.
   *
   * @param {import("express").Request} req - Express request with report ID in params or body.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} Sends HTTP 200 OK with action plan and RAG context.
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
      const data = response?.data?.data || response?.data || {};
      const actionPlan = await this.repository.upsertActionPlan(report.id, {
        targetAgency: String(data.targetAgency || "Dinas Terkait"),
        confidenceScore: this.numberOr(data.confidenceScore, 0.85),
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

      const planningPayload = {
        description: report.description,
        category: report.category,
        ragContext: ragContext || [],
      };
      void this.recordAiAudit({
        reportId: report.id,
        agentName: "PLANNING_AGENT",
        action: "AI_PLANNING_COMPLETED",
        details: `AI Planning completed for target agency: ${actionPlan.targetAgency}`,
        payload: planningPayload,
        response: {
          targetAgency: data.targetAgency || actionPlan.targetAgency,
          actionSteps: data.actionSteps || actionPlan.actionSteps,
          estimatedDays: data.estimatedDays || actionPlan.estimatedDays,
          dispatchReason: data.dispatchReason || data.dispatchNotes || null,
          ...data,
        },
        confidenceScore: actionPlan.confidenceScore,
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
   * @description
   * Handles canonical POST /api/v1/reports/:id/verify pipeline for field officers.
   *
   * Alur Lengkap Verifikasi Lapangan:
   * 1. Validasi Koordinat: Mengecek validitas floating-point desimal latitude [-90..90] dan longitude [-180..180].
   * 2. Geofencing Haversine: Menghitung jarak garis lengkung bumi antara GPS browser petugas dan titik laporan.
   *    Jika jarak > 100 meter, request ditolak dengan HTTP 400 Bad Request tanpa memanggil model AI.
   * 3. Pengolahan Citra & Upload: Mengunggah buffer JPEG hasil olahan Sharp ke folder 'verifications' Supabase Storage.
   * 4. Resolusi Gambar: Memastikan keberadaan foto awal (beforePhotoUrl) dan foto bukti perbaikan (afterPhotoUrl).
   * 5. Eksekusi VerificationAgent: Mengirim payload perbandingan foto ke AI service (/api/ai/verify).
   * 6. Analisis Multimodal & Anti-Fraud:
   *    - Memvalidasi konsistensi tengara fisik permanen (landmark matching).
   *    - Memeriksa keberadaan watermark koordinat dan timestamp yang dibubuhkan HTML5 Canvas browser.
   *    - Mendeteksi indikasi penipuan visual (foto layar kaca / moiré / foto daur ulang).
   * 7. Pencatatan AuditLog: Merekam hasil verifikasi dengan agen VERIFICATION_AGENT, action FIELD_VERIFIED
   *    atau FIELD_VERIFICATION_REJECTED beserta seluruh metadata penugasan.
   * 8. Transisi Status: Jika valid dan confidence >= 0.8, status laporan diubah menjadi 'Resolved' dengan timestamp
   *    resolvedAt dan URL bukti perbaikan. Jika ditolak, ditandai requiresHumanReview = true.
   *
   * @param {import("express").Request} req - Express multipart request with officer coordinates and after photo.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} Sends HTTP 200 OK on success, or HTTP 400/422/502 on failure.
   * @throws {Error} Throws 400 if images or coordinates are invalid; 502 if AI response is malformed.
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

      const imageBuffer =
        req.processedImageBuffer || req.processedImage || req.file?.buffer;
      let uploadedOfficerPhotoUrl = null;
      if (imageBuffer) {
        try {
          uploadedOfficerPhotoUrl = await this.uploadImage(
            imageBuffer,
            `${reportId}-verified-${Date.now()}.jpg`,
            "verifications",
          );
        } catch (uploadError) {
          console.warn(
            "[ReportController] Verification image storage upload failed:",
            uploadError.message,
          );
        }
      }

      const afterPhotoUrl =
        uploadedOfficerPhotoUrl ||
        (req.processedImageBase64
          ? this.toDataUri(req.processedImageMimeType, req.processedImageBase64)
          : req.file?.buffer
            ? this.toDataUri(
                req.file.mimetype || "image/jpeg",
                req.file.buffer.toString("base64"),
              )
            : null);

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

      const verificationPayload = {
        officerLatitude: latitude,
        officerLongitude: longitude,
        distanceMeters: Math.round(distance * 100) / 100,
        officerNotes:
          req.body.notes ||
          req.body.officerNotes ||
          req.body.auditNotes ||
          null,
        officerPhotoUrl: afterPhotoUrl,
      };

      const verificationAction =
        data.visualMatch === true && data.isResolved === true
          ? "FIELD_VERIFIED"
          : "FIELD_VERIFICATION_REJECTED";

      void this.recordAiAudit({
        reportId,
        agentName: "VERIFICATION_AGENT",
        action: verificationAction,
        details:
          verificationAction === "FIELD_VERIFIED"
            ? "Field repair verified successfully by AI vision"
            : "Field repair verification rejected by AI vision",
        payload: verificationPayload,
        response: {
          visualMatch: data.visualMatch,
          isResolved: data.isResolved,
          auditNotes: data.auditNotes || null,
          verificationConfidence: confidenceScore,
          ...data,
        },
        confidenceScore,
      });

      const updated = await this.repository.update(
        reportId,
        isResolved
          ? {
              status: "Resolved",
              officerPhotoUrl: afterPhotoUrl,
              officerNotes: verificationPayload.officerNotes,
              assignedOfficerName:
                req.user?.name ||
                report.assignedOfficerName ||
                "Petugas Lapangan",
              resolvedAt: new Date(),
              requiresHumanReview: false,
            }
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
   * @description
   * Formats raw binary base64 string into an inline RFC 2397 Data URI scheme: data:[<mediatype>][;base64],<data>.
   *
   * @param {string} mimeType - Image MIME type (e.g. image/jpeg, image/png).
   * @param {string} base64 - Base64 encoded image content string.
   * @returns {string} Formatted data URI string.
   */
  toDataUri(mimeType, base64) {
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Validates whether an image reference is a valid HTTP(S) URL or Data URI.
   *
   * @description
   * Tests candidate string against regular expressions for valid http/https URLs
   * and base64-encoded RFC 2397 data URIs with proper padding.
   *
   * @param {string} value - Image reference string to validate.
   * @returns {boolean} True if reference is a supported URL or Data URI.
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
   * @description
   * Safely navigates nested response structures (e.g., response.data.data or response.data).
   *
   * @param {Object} response - Raw AI service response.
   * @returns {Object|null} Extracted verification payload object or null.
   */
  extractVerificationResult(response) {
    return response?.data?.data || response?.data || null;
  }

  /**
   * Asserts structural validity and range constraints of AI verification responses.
   *
   * @description
   * Validates that AI verification response exhibits boolean flags for isResolved and visualMatch,
   * a finite confidence score between 0 and 1, and a non-empty auditNotes string.
   *
   * @param {Object|null} data - Verification response object.
   * @returns {boolean} True if data adheres strictly to verification contract.
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
   * @description
   * Extracts verification confidence score with fallback between verificationConfidence and confidenceScore.
   *
   * @param {Object} data - Verification response object.
   * @returns {number} Confidence value normalized as a number.
   */
  getVerificationConfidence(data) {
    return Number(data?.verificationConfidence ?? data?.confidenceScore);
  }

  /**
   * Persists an audit record for AI agent invocations asynchronously.
   *
   * @description
   * Non-blocking persistence helper that delegates to reportRepository.addAiAuditLog.
   * Catches errors internally to prevent logging failures from aborting the primary transaction.
   *
   * @param {Object|string} optionsOrReportId - Target report ID or audit options object.
   * @param {string} [agentName] - Name of the executing AI agent (INTAKE_AGENT, PLANNING_AGENT, VERIFICATION_AGENT).
   * @param {Object} [payload] - Input payload dispatched to AI.
   * @param {Object} [response] - Output received from AI service.
   * @returns {Promise<void>} Resolves when logging completes or fails silently.
   */
  async recordAiAudit(optionsOrReportId, agentName, payload, response) {
    if (!this.repository) {
      return;
    }
    try {
      if (typeof optionsOrReportId === "object" && optionsOrReportId !== null) {
        if (typeof this.repository.addAiAuditLog === "function") {
          await this.repository.addAiAuditLog(optionsOrReportId);
        }
      } else {
        if (
          !optionsOrReportId ||
          typeof this.repository.addAiAuditLog !== "function"
        ) {
          return;
        }
        const data = this.extractVerificationResult(response) || {};
        const confidenceScore = this.numberOr(
          data.confidenceScore ?? data.verificationConfidence,
          null,
        );
        await this.repository.addAiAuditLog(
          optionsOrReportId,
          agentName,
          payload,
          response,
          confidenceScore,
        );
      }
    } catch (error) {
      console.error("[AUMS Backend] AI audit log failed:", {
        optionsOrReportId,
        agentName,
        message: error.message,
      });
    }
  }

  /**
   * Retrieves a report and asserts existence before pipeline processing.
   *
   * @description
   * Validates presence of report ID and looks up report in database.
   *
   * @param {string} id - Target report UUID.
   * @returns {Promise<Object>} Found report record from repository.
   * @throws {Error} Throws 400 if ID is missing; throws 404 if record does not exist.
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
   * @description
   * Casts candidate value to Number and checks Number.isFinite.
   *
   * @param {*} value - Candidate value.
   * @param {number} fallback - Default fallback number.
   * @returns {number} Finite number or fallback.
   */
  numberOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  /**
   * Maps numerical priority scores into categorical priority tiers.
   *
   * @description
   * Maps score (1-100) to Prisma Priority enum: score >= 75 -> "High", score <= 35 -> "Low", otherwise "Medium".
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
