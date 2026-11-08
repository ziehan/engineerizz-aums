const test = require("node:test");
const assert = require("node:assert/strict");
const ReportController = require("../src/controllers/report.controller");

function createController(
  aiResult,
  photoUrl = "https://example.test/before.jpg",
) {
  const updates = [];
  const audits = [];
  const controller = new ReportController({
    reportService: {},
    repository: {
      findById: async () => ({
        id: "report-1",
        description: "Road repair",
        latitude: 0,
        longitude: 0,
        photoUrl,
      }),
      update: async (id, data) => {
        updates.push({ id, data });
        return { id, ...data };
      },
      addAuditLog: async (id, action, data) =>
        audits.push({ id, action, data }),
    },
    aiService: { request: async () => aiResult },
  });
  return { controller, updates, audits };
}

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

test("uses processed image data in verification payload", async () => {
  let payload;
  const { controller, updates } = createController({
    data: {
      data: {
        isResolved: true,
        visualMatch: true,
        verificationConfidence: 0.9,
        auditNotes: "verified",
      },
    },
  });
  controller.aiService.request = async (endpoint, body) => {
    payload = { endpoint, body };
    return {
      data: {
        data: {
          isResolved: true,
          visualMatch: true,
          verificationConfidence: 0.9,
          auditNotes: "verified",
        },
      },
    };
  };
  const res = response();
  await controller.verifyPipeline(
    {
      body: { reportId: "report-1", latitude: "0", longitude: "0" },
      params: {},
      processedImageBase64: "cHJvY2Vzc2Vk",
      processedImageMimeType: "image/jpeg",
    },
    res,
    assert.fail,
  );

  assert.equal(payload.endpoint, "/api/ai/verify");
  assert.equal(
    payload.body.afterPhotoUrl,
    "data:image/jpeg;base64,cHJvY2Vzc2Vk",
  );
  assert.equal(payload.body.distance, 0);
  assert.equal(updates[0].data.status, "Resolved");
});

test("rejects missing images before calling AI", async () => {
  const { controller } = createController({ data: {} });
  let called = false;
  controller.aiService.request = async () => {
    called = true;
  };
  const res = response();
  let nextError;
  await controller.verifyPipeline(
    {
      body: { reportId: "report-1", latitude: "0", longitude: "0" },
      params: {},
    },
    res,
    (error) => {
      nextError = error;
    },
  );

  assert.equal(nextError.statusCode, 400);
  assert.equal(called, false);
});

test("rejects a report without a before image", async () => {
  const { controller } = createController({ data: {} }, null);
  const res = response();
  let nextError;
  await controller.verifyPipeline(
    {
      body: { reportId: "report-1", latitude: "0", longitude: "0" },
      params: {},
      processedImageBase64: "cHJvY2Vzc2Vk",
      processedImageMimeType: "image/jpeg",
    },
    res,
    (error) => {
      nextError = error;
    },
  );

  assert.equal(nextError.statusCode, 400);
  assert.equal(nextError.code, "INVALID_IMAGE_PAYLOAD");
});

test("flags negative AI verification for human review", async () => {
  const { controller, updates, audits } = createController({
    data: {
      data: {
        isResolved: false,
        visualMatch: false,
        verificationConfidence: 0.8,
        auditNotes: "not fixed",
      },
    },
  });
  const res = response();
  await controller.verifyPipeline(
    {
      body: { reportId: "report-1", latitude: "0", longitude: "0" },
      params: {},
      processedImageBase64: "cHJvY2Vzc2Vk",
      processedImageMimeType: "image/jpeg",
    },
    res,
    assert.fail,
  );

  assert.equal(updates[0].data.requiresHumanReview, true);
  assert.equal(updates[0].data.status, undefined);
  assert.equal(audits[0].action, "AI_FIELD_VERIFICATION_REJECTED");
});

test("rejects malformed AI verification response without updating report", async () => {
  const { controller, updates } = createController({
    data: { data: { isResolved: true } },
  });
  const res = response();
  let nextError;
  await controller.verifyPipeline(
    {
      body: { reportId: "report-1", latitude: "0", longitude: "0" },
      params: {},
      processedImageBase64: "cHJvY2Vzc2Vk",
      processedImageMimeType: "image/jpeg",
    },
    res,
    (error) => {
      nextError = error;
    },
  );

  assert.equal(nextError.code, "INVALID_AI_RESPONSE");
  assert.equal(nextError.statusCode, 502);
  assert.equal(updates.length, 0);
});

test("rejects verification outside the 100 meter geofence", async () => {
  const { controller } = createController({ data: {} });
  let called = false;
  controller.aiService.request = async () => {
    called = true;
  };
  const res = response();

  await controller.verifyPipeline(
    {
      body: { reportId: "report-1", latitude: "0.01", longitude: "0" },
      params: {},
    },
    res,
    assert.fail,
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Lokasi Anda terlalu jauh/);
  assert.equal(called, false);
});
