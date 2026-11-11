const test = require("node:test");
const assert = require("node:assert/strict");
const ReportService = require("../src/services/report.service");
const ReportController = require("../src/controllers/report.controller");

test("ReportService.createReport requests 768-dim embedding and logs INTAKE_AGENT and PLANNING_AGENT", async () => {
  let createdEmbedding = null;
  const auditLogsCreated = [];
  const actionPlansUpserted = [];

  const mockRepo = {
    findDeduplicationCandidates: async () => [],
    createWithEmbedding: async (data, embedding) => {
      createdEmbedding = embedding;
      return { id: "report-uuid-1", ...data };
    },
    update: async (id, data) => ({ id, ...data }),
    upsertActionPlan: async (id, data) => {
      actionPlansUpserted.push({ id, data });
      return { id, ...data };
    },
    addAuditLog: async (id, action, data) => {},
    addAiAuditLog: async (options) => {
      auditLogsCreated.push(options);
      return options;
    },
    findById: async (id) => ({
      id,
      title: "Jalan Rusak Parah",
      description: "Ada lubang besar di tengah jalan",
      category: "Jalan & Jembatan",
      status: "Pending",
      actionPlan: actionPlansUpserted[0]?.data || null,
      auditLogs: auditLogsCreated,
    }),
  };

  const mockMaps = {
    reverseGeocode: async () => "Jl. Sudirman No. 1, Jakarta Pusat",
  };

  const dummyEmbedding768 = new Array(768).fill(0.0123);
  const mockAi = {
    embed: async (text) => {
      assert.ok(text.includes("Jalan Rusak"));
      return dummyEmbedding768;
    },
    validate: async () => ({
      data: {
        isValid: true,
        validityConfidence: 0.94,
        isDuplicate: false,
        priorityScore: 85,
        category: "Jalan & Jembatan",
        reasoning: "Valid road defect photo",
      },
    }),
    plan: async () => ({
      data: {
        targetAgency: "Dinas Bina Marga",
        agencyConfidence: 0.96,
        planConfidence: 0.91,
        confidenceScore: 0.93,
        estimatedDays: 3,
        actionSteps: ["Survei lapangan", "Pengaspalan", "Finishing"],
        dispatchReason: "Kewenangan Bina Marga DKI",
      },
    }),
  };

  const service = new ReportService(mockRepo, mockMaps, mockAi);

  const result = await service.createReport({
    title: "Jalan Rusak Parah",
    description: "Ada lubang besar di tengah jalan",
    category: "Jalan & Jembatan",
    latitude: -6.2,
    longitude: 106.8,
    photoUrl: "https://example.com/lubang.jpg",
  });

  // 1. Verify embedding was passed with 768 dimensions
  assert.equal(createdEmbedding.length, 768);
  assert.equal(createdEmbedding[0], 0.0123);

  // 2. Verify Agent 1 (INTAKE_AGENT) AuditLog
  const intakeAudit = auditLogsCreated.find(
    (log) => log.agentName === "INTAKE_AGENT",
  );
  assert.ok(intakeAudit, "INTAKE_AGENT audit log should exist");
  assert.equal(intakeAudit.action, "AI_INTAKE_COMPLETED");
  assert.equal(intakeAudit.reportId, "report-uuid-1");
  assert.equal(intakeAudit.payload.title, "Jalan Rusak Parah");
  assert.equal(
    intakeAudit.payload.description,
    "Ada lubang besar di tengah jalan",
  );
  assert.equal(intakeAudit.payload.category, "Jalan & Jembatan");
  assert.equal(intakeAudit.payload.latitude, -6.2);
  assert.equal(intakeAudit.payload.longitude, 106.8);
  assert.equal(intakeAudit.payload.photoUrl, "https://example.com/lubang.jpg");
  assert.equal(intakeAudit.response.isValid, true);
  assert.equal(intakeAudit.confidenceScore, 0.94);

  // 3. Verify Agent 2 (PLANNING_AGENT) AuditLog & ActionPlan
  const planAudit = auditLogsCreated.find(
    (log) => log.agentName === "PLANNING_AGENT",
  );
  assert.ok(planAudit, "PLANNING_AGENT audit log should exist");
  assert.equal(planAudit.action, "AI_PLANNING_COMPLETED");
  assert.equal(planAudit.reportId, "report-uuid-1");
  assert.equal(
    planAudit.payload.description,
    "Ada lubang besar di tengah jalan",
  );
  assert.equal(planAudit.payload.category, "Jalan & Jembatan");
  assert.equal(planAudit.response.targetAgency, "Dinas Bina Marga");
  assert.equal(planAudit.response.estimatedDays, 3);
  assert.equal(planAudit.response.actionSteps.length, 3);
  assert.equal(planAudit.confidenceScore, 0.93);
  assert.equal(actionPlansUpserted[0].data.targetAgency, "Dinas Bina Marga");
});

test("ReportController.verifyPipeline logs VERIFICATION_AGENT and updates report attributes", async () => {
  const auditLogs = [];
  const updates = [];

  const mockRepo = {
    findById: async () => ({
      id: "report-uuid-2",
      description: "Saluran mampet",
      latitude: -6.2,
      longitude: 106.8,
      photoUrl: "https://example.com/before.jpg",
      assignedOfficerName: "Budi Santoso",
    }),
    update: async (id, data) => {
      updates.push({ id, data });
      return { id, ...data };
    },
    addAuditLog: async () => {},
    addAiAuditLog: async (options) => {
      auditLogs.push(options);
      return options;
    },
  };

  const mockAi = {
    request: async (endpoint, payload) => {
      assert.equal(endpoint, "/api/ai/verify");
      return {
        data: {
          data: {
            visualMatch: true,
            isResolved: true,
            verificationConfidence: 0.95,
            auditNotes: "Pembersihan saluran air selesai sempurna",
          },
        },
      };
    },
  };

  const controller = new ReportController({
    reportService: {},
    repository: mockRepo,
    aiService: mockAi,
  });

  const res = {
    body: null,
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return data;
    },
  };

  await controller.verifyPipeline(
    {
      params: { id: "report-uuid-2" },
      body: {
        latitude: "-6.2001",
        longitude: "106.8001",
        notes: "Selesai dibersihkan petugas SDA",
      },
      user: { name: "Ahmad Petugas" },
      processedImageBase64: "YWZ0ZXJwaG90bw==",
      processedImageMimeType: "image/jpeg",
    },
    res,
    assert.fail,
  );

  // Verify Agent 3 (VERIFICATION_AGENT) AuditLog
  const verifAudit = auditLogs.find(
    (log) => log.agentName === "VERIFICATION_AGENT",
  );
  assert.ok(verifAudit, "VERIFICATION_AGENT audit log should exist");
  assert.equal(verifAudit.action, "FIELD_VERIFIED");
  assert.equal(verifAudit.reportId, "report-uuid-2");
  assert.equal(verifAudit.payload.officerLatitude, -6.2001);
  assert.equal(verifAudit.payload.officerLongitude, 106.8001);
  assert.ok(verifAudit.payload.distanceMeters < 100);
  assert.equal(
    verifAudit.payload.officerNotes,
    "Selesai dibersihkan petugas SDA",
  );
  assert.equal(
    verifAudit.payload.officerPhotoUrl,
    "data:image/jpeg;base64,YWZ0ZXJwaG90bw==",
  );
  assert.equal(verifAudit.response.visualMatch, true);
  assert.equal(verifAudit.response.isResolved, true);
  assert.equal(verifAudit.confidenceScore, 0.95);

  // Verify report was marked Resolved with officer details
  assert.equal(updates[0].data.status, "Resolved");
  assert.equal(
    updates[0].data.officerPhotoUrl,
    "data:image/jpeg;base64,YWZ0ZXJwaG90bw==",
  );
  assert.equal(updates[0].data.assignedOfficerName, "Ahmad Petugas");
  assert.ok(updates[0].data.resolvedAt instanceof Date);
});

test("maskReport hides raw auditLogs for CITIZEN and preserves full observability for CRM_OFFICER & ADMIN", () => {
  const service = new ReportService({}, {}, {});

  const fullReport = {
    id: "rep-1",
    title: "Pohon Tumbang",
    description: "Menghalangi jalan raya",
    category: "Pertamanan",
    status: "Pending",
    priority: "High",
    locationAddress: "Jl. Gatot Subroto",
    latitude: -6.23,
    longitude: 106.81,
    actionPlan: {
      id: "plan-1",
      reportId: "rep-1",
      targetAgency: "Dinas Pertamanan dan Hutan Kota",
      estimatedDays: 1,
      actionSteps: ["Evakuasi batang", "Pembersihan ranting"],
      confidenceScore: 0.95,
      confidenceMetadata: { internalTokens: 123 },
    },
    auditLogs: [
      {
        id: "log-1",
        agentName: "INTAKE_AGENT",
        action: "AI_INTAKE_COMPLETED",
        payload: { sensitive: "data" },
      },
    ],
    embedding: [0.1, 0.2, 0.3],
  };

  // 1. CITIZEN Role
  const citizenView = service.maskReport(fullReport, "CITIZEN");
  assert.equal(citizenView.id, "rep-1");
  assert.equal(citizenView.targetAgency, "Dinas Pertamanan dan Hutan Kota");
  assert.equal(citizenView.auditLogs, undefined);
  assert.equal(citizenView.embedding, undefined);
  assert.equal(citizenView.actionPlan, undefined);

  // 2. FIELD_OFFICER Role
  const officerView = service.maskReport(fullReport, "FIELD_OFFICER");
  assert.equal(officerView.id, "rep-1");
  assert.ok(officerView.actionPlan);
  assert.equal(
    officerView.actionPlan.targetAgency,
    "Dinas Pertamanan dan Hutan Kota",
  );
  assert.equal(officerView.actionPlan.actionSteps.length, 2);
  assert.equal(officerView.actionPlan.confidenceMetadata, undefined);
  assert.equal(officerView.auditLogs, undefined);
  assert.equal(officerView.embedding, undefined);

  // 3. CRM_OFFICER Role
  const crmView = service.maskReport(fullReport, "CRM_OFFICER");
  assert.ok(crmView.auditLogs);
  assert.equal(crmView.auditLogs.length, 1);
  assert.equal(crmView.auditLogs[0].agentName, "INTAKE_AGENT");
  assert.equal(crmView.actionPlan.confidenceMetadata.internalTokens, 123);

  // 4. ADMIN Role
  const adminView = service.maskReport(fullReport, "ADMIN");
  assert.ok(adminView.auditLogs);
  assert.equal(adminView.auditLogs.length, 1);
  assert.equal(adminView.actionPlan.confidenceMetadata.internalTokens, 123);
});
