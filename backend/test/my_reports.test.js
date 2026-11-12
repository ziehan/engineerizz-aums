const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const ReportService = require("../src/services/report.service");
const ReportController = require("../src/controllers/report.controller");
const { optionalAuthenticate } = require("../src/middlewares/auth.middleware");

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
