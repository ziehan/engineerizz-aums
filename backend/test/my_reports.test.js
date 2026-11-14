const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const jwt = require("jsonwebtoken");
const env = require("../src/config/env.config");
const ReportService = require("../src/services/report.service");
const ReportController = require("../src/controllers/report.controller");
const reportRoutes = require("../src/routes/report.routes");
const {
  authenticate,
  optionalAuthenticate,
  requireRoles,
} = require("../src/middlewares/auth.middleware");

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return value;
    },
  };
}

test("ReportService.listMyReports filters reports by reporterId and masks sensitive data", async () => {
  let capturedFilters = null;
  const mockRepo = {
    findMany: async (filters) => {
      capturedFilters = filters;
      return [
        {
          id: "rep-101",
          title: "Lampu Rusak",
          description: "Mati total",
          category: "Penerangan",
          status: "Pending",
          priority: "Low",
          locationAddress: "Jl. Mawar",
          latitude: -6.1,
          longitude: 106.8,
          reporterId: "user-123",
          auditLogs: [{ sensitive: true }],
          embedding: [0.1, 0.2],
        },
      ];
    },
  };

  const service = new ReportService(mockRepo, {}, {});
  const results = await service.listMyReports(
    "user-123",
    { status: "Pending" },
    "CITIZEN",
  );

  assert.equal(capturedFilters.reporterId, "user-123");
  assert.equal(capturedFilters.status, "Pending");
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "rep-101");
  assert.equal(results[0].reporterId, "user-123");
  assert.equal(results[0].auditLogs, undefined);
  assert.equal(results[0].embedding, undefined);
});

test("ReportService.listReports supports query.myReports = true with userId", async () => {
  let capturedFilters = null;
  const mockRepo = {
    findMany: async (filters) => {
      capturedFilters = filters;
      return [];
    },
  };

  const service = new ReportService(mockRepo, {}, {});
  await service.listReports({ myReports: "true" }, "CITIZEN", "user-456");

  assert.equal(capturedFilters.reporterId, "user-456");
});

test("ReportController.getMyReports returns reports for authenticated user", async () => {
  let queriedUser = null;
  const mockReportService = {
    listMyReports: async (userId, query, role) => {
      queriedUser = userId;
      return [{ id: "rep-user-1", title: "Sampah menumpuk" }];
    },
  };

  const controller = new ReportController({
    reportService: mockReportService,
  });

  const req = {
    user: { id: "citizen-uuid-99", role: "CITIZEN" },
    query: {},
  };
  const res = response();

  await controller.getMyReports(req, res, assert.fail);

  assert.equal(queriedUser, "citizen-uuid-99");
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].id, "rep-user-1");
});

test("ReportController.create attaches reporterId from req.user to input payload", async () => {
  let capturedInput = null;
  const mockReportService = {
    createReport: async (input) => {
      capturedInput = input;
      return { id: "created-1", ...input };
    },
  };

  const controller = new ReportController({
    reportService: mockReportService,
  });

  const req = {
    user: { userId: "user-creator-77" },
    body: {
      title: "Pohon Tumbang",
      description: "Menutupi jalan",
      category: "Pertamanan",
    },
  };
  const res = response();

  await controller.create(req, res, assert.fail);

  assert.equal(res.statusCode, 201);
  assert.equal(capturedInput.reporterId, "user-creator-77");
  assert.equal(capturedInput.title, "Pohon Tumbang");
});

test("optionalAuthenticate attaches req.user when valid Bearer token provided", () => {
  const secret =
    process.env.JWT_SECRET ||
    "default_jwt_secret_key_aums_dev_change_in_production";
  const token = jwt.sign(
    { userId: "auth-user-88", email: "auth@test.com", role: "CITIZEN" },
    secret,
  );

  const req = {
    get: (header) =>
      header.toLowerCase() === "authorization" ? `Bearer ${token}` : null,
  };
  let nextCalled = false;
  optionalAuthenticate(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.ok(req.user);
  assert.equal(req.user.userId, "auth-user-88");
  assert.equal(req.user.role, "CITIZEN");
});

test("optionalAuthenticate gracefully continues without req.user when header is absent", () => {
  const req = {
    get: () => null,
  };
  let nextCalled = false;
  optionalAuthenticate(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user, undefined);
});

test("ReportController.create ignores req.body.reporterId spoofing", async () => {
  let capturedInput = null;
  const controller = new ReportController({
    reportService: {
      createReport: async (input) => {
        capturedInput = input;
        return { id: "created-2", ...input };
      },
    },
  });

  const res = response();
  await controller.create(
    {
      user: { userId: "real-user-1" },
      body: {
        title: "Jalan Berlubang",
        description: "Bahaya",
        category: "Jalan",
        reporterId: "spoofed-user-99",
      },
    },
    res,
    assert.fail,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(capturedInput.reporterId, "real-user-1");

  const resNoUser = response();
  await controller.create(
    {
      body: {
        title: "Jalan Berlubang",
        description: "Bahaya",
        category: "Jalan",
        reporterId: "spoofed-user-99",
      },
    },
    resNoUser,
    assert.fail,
  );

  assert.equal(capturedInput.reporterId, undefined);
});

test("ReportController.intake uses req.user.userId and ignores req.body.reporterId", async () => {
  let savedReportData = null;
  const controller = new ReportController({
    reportService: {
      recordAiAudit: async () => {},
    },
    repository: {
      findDeduplicationCandidates: async () => [],
      createWithEmbedding: async (data) => {
        savedReportData = data;
        return { id: "intake-1", ...data };
      },
      addAuditLog: async () => {},
      findById: async (id) => ({ id, ...savedReportData }),
    },
    geoService: {
      reverseGeocode: async () => ({ displayName: "Jl. Sudirman" }),
    },
    aiService: {
      runIntakeAgent: async () => ({
        data: { data: { isValid: true, priorityScore: 50 } },
      }),
      runPlanningAgent: async () => ({ data: { data: {} } }),
    },
  });

  const res = response();
  await controller.intake(
    {
      user: { userId: "real-citizen-1" },
      body: {
        title: "Trotoar Rusak",
        description: "Pecah",
        category: "Infrastruktur",
        latitude: "-6.2",
        longitude: "106.8",
        reporterId: "spoofed-citizen-99",
      },
    },
    res,
    assert.fail,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(savedReportData.reporterId, "real-citizen-1");
});

test("Report intake and create routes enforce authenticated CITIZEN role", async () => {
  let intakeCalls = 0;
  let createCalls = 0;
  const stubController = {
    intake: (_req, res) => {
      intakeCalls += 1;
      res.status(201).json({ success: true });
    },
    create: (_req, res) => {
      createCalls += 1;
      res.status(201).json({ success: true });
    },
    getMyReports: (_req, res) => res.json({ data: [] }),
    list: (_req, res) => res.json({ data: [] }),
    deleteDuplicate: (_req, res) => res.json({}),
    get: (_req, res) => res.json({}),
    delete: (_req, res) => res.json({}),
    approve: (_req, res) => res.json({}),
    verify: (_req, res) => res.json({}),
    plan: (_req, res) => res.json({}),
  };
  const passThrough = (_req, _res, next) => next();
  const app = express();
  app.use(express.json());
  app.use(
    "/reports",
    reportRoutes(
      stubController,
      passThrough,
      stubController,
      { uploadImage: passThrough, processImage: passThrough },
      passThrough,
      authenticate,
      requireRoles("CITIZEN", "FIELD_OFFICER", "CRM_OFFICER", "ADMIN"),
      requireRoles("FIELD_OFFICER", "CRM_OFFICER", "ADMIN"),
      requireRoles("CRM_OFFICER", "ADMIN"),
      passThrough,
      passThrough,
      optionalAuthenticate,
      requireRoles("CITIZEN"),
    ),
  );

  const dispatchPost = (url, headers = {}) =>
    new Promise((resolve, reject) => {
      const req = new http.IncomingMessage(null);
      req.method = "POST";
      req.url = url;
      req.headers = Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
      );
      req.push(null);

      const res = new http.ServerResponse(req);
      const chunks = [];
      res.write = (chunk) => {
        if (chunk)
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };
      res.end = (chunk) => {
        if (chunk)
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      };

      app.handle(req, res, (err) => {
        if (err) reject(err);
      });
    });

  for (const path of ["/intake", "/"]) {
    const unauthRes = await dispatchPost(`/reports${path}`);
    assert.equal(unauthRes.status, 401);

    for (const role of ["ADMIN", "CRM_OFFICER", "FIELD_OFFICER"]) {
      const token = jwt.sign(
        { userId: `user-${role}`, email: `${role}@aums.test`, role },
        env.jwtSecret,
      );
      const forbiddenRes = await dispatchPost(`/reports${path}`, {
        Authorization: `Bearer ${token}`,
      });
      assert.equal(forbiddenRes.status, 403);
    }

    const citizenToken = jwt.sign(
      { userId: "citizen-1", email: "warga@aums.test", role: "CITIZEN" },
      env.jwtSecret,
    );
    const okRes = await dispatchPost(`/reports${path}`, {
      Authorization: `Bearer ${citizenToken}`,
    });
    assert.equal(okRes.status, 201);
  }

  assert.equal(intakeCalls, 1);
  assert.equal(createCalls, 1);
});
