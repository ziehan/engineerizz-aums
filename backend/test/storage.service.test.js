const test = require("node:test");
const assert = require("node:assert/strict");
const { uploadImageBuffer } = require("../src/services/storage.service");
const ReportController = require("../src/controllers/report.controller");

test("storageService rejects non-buffer arguments", async () => {
  await assert.rejects(
    () => uploadImageBuffer("not-a-buffer", "test.jpg"),
    /Invalid buffer provided/,
  );
  await assert.rejects(
    () => uploadImageBuffer(null, "test.jpg"),
    /Invalid buffer provided/,
  );
});

test("storageService graceful fallback returns mock URL when Supabase env is missing", async () => {
  // Ensure offline testing environment without Supabase keys
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;

  try {
    const dummyBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const url = await uploadImageBuffer(
      dummyBuffer,
      "sample-report.jpg",
      "reports",
    );
    assert.equal(url, "https://mock.storage.local/reports/sample-report.jpg");

    const verifUrl = await uploadImageBuffer(
      dummyBuffer,
      "verif-1.jpg",
      "verifications",
    );
    assert.equal(
      verifUrl,
      "https://mock.storage.local/verifications/verif-1.jpg",
    );
  } finally {
    if (originalUrl) process.env.SUPABASE_URL = originalUrl;
    if (originalKey) process.env.SUPABASE_ANON_KEY = originalKey;
  }
});

test("ReportController integrates uploadImageBuffer on citizen complaints and officer verification", async () => {
  const uploads = [];
  const mockStorageService = {
    uploadImageBuffer: async (buffer, filename, folder) => {
      uploads.push({ filename, folder, length: buffer.length });
      return `https://supabase.co/storage/v1/object/public/aums-media/${folder}/${filename}`;
    },
  };

  let createdReportInput = null;
  const mockReportService = {
    createReport: async (input) => {
      createdReportInput = input;
      return { id: "rep-10", ...input };
    },
  };

  const updates = [];
  const mockRepo = {
    findById: async () => ({
      id: "rep-10",
      description: "Paving rusak",
      latitude: 0,
      longitude: 0,
      photoUrl: "https://example.com/before.jpg",
    }),
    update: async (id, data) => {
      updates.push({ id, data });
      return { id, ...data };
    },
    addAuditLog: async () => {},
    addAiAuditLog: async () => {},
  };

  const mockAi = {
    request: async () => ({
      data: {
        data: {
          isResolved: true,
          visualMatch: true,
          verificationConfidence: 0.9,
          auditNotes: "OK",
        },
      },
    }),
  };

  const controller = new ReportController({
    reportService: mockReportService,
    repository: mockRepo,
    aiService: mockAi,
    storageService: mockStorageService,
  });

  const res = {
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

  // 1. Citizen complaint creation with processed image buffer
  await controller.create(
    {
      body: { title: "Paving Rusak", description: "Rusak parah" },
      processedImageBuffer: Buffer.from("image-bytes-citizen"),
    },
    res,
    assert.fail,
  );

  assert.equal(uploads[0].folder, "reports");
  assert.ok(createdReportInput.photoUrl.includes("reports/"));

  // 2. Officer verification with processed image buffer
  await controller.verifyPipeline(
    {
      params: { id: "rep-10" },
      body: { latitude: "0", longitude: "0", notes: "Sudah diperbaiki" },
      processedImageBuffer: Buffer.from("image-bytes-officer"),
      processedImageBase64: "aW1hZ2UtYnl0ZXMtb2ZmaWNlcg==",
      processedImageMimeType: "image/jpeg",
    },
    res,
    assert.fail,
  );

  assert.equal(uploads[1].folder, "verifications");
  assert.ok(updates[0].data.officerPhotoUrl.includes("verifications/"));
});
