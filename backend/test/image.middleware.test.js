const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const {
  processImage,
  fileFilter,
  ALLOWED_MIME_TYPES,
  UNSUPPORTED_FORMAT_MESSAGE,
} = require("../src/middlewares/image.middleware");
const errorMiddleware = require("../src/middlewares/error.middleware");

test("AUMS image middleware processes uploaded images through Sharp", async () => {
  const source = await sharp({
    create: {
      width: 1400,
      height: 900,
      channels: 3,
      background: { r: 20, g: 40, b: 60 },
    },
  })
    .png()
    .toBuffer();
  const req = { file: { buffer: source } };
  let nextCalled = false;

  await processImage(req, {}, () => {
    nextCalled = true;
  });

  const metadata = await sharp(req.processedImage).metadata();
  assert.equal(nextCalled, true);
  assert.equal(metadata.format, "jpeg");
  assert.ok(metadata.width <= 1080);
  assert.match(req.processedImageBase64, /^[A-Za-z0-9+/]+={0,2}$/);
  assert.equal(req.processedImageMimeType, "image/jpeg");
});

test("AUMS image middleware rejects an invalid image buffer", async () => {
  const req = { file: { buffer: Buffer.from("not-an-image") } };
  let receivedError;

  await processImage(req, {}, (error) => {
    receivedError = error;
  });

  assert.equal(receivedError.statusCode, 422);
  assert.equal(receivedError.code, "INVALID_IMAGE_PAYLOAD");
});

test("AUMS image middleware ALLOWED_MIME_TYPES strictly allows only jpeg, png, webp", () => {
  assert.equal(ALLOWED_MIME_TYPES.has("image/jpeg"), true);
  assert.equal(ALLOWED_MIME_TYPES.has("image/png"), true);
  assert.equal(ALLOWED_MIME_TYPES.has("image/webp"), true);
  assert.equal(ALLOWED_MIME_TYPES.has("video/mp4"), false);
  assert.equal(ALLOWED_MIME_TYPES.has("video/quicktime"), false);
  assert.equal(ALLOWED_MIME_TYPES.has("image/gif"), false);
  assert.equal(ALLOWED_MIME_TYPES.has("application/pdf"), false);
});

test("AUMS fileFilter rejects video and non-image formats with HTTP 400 and Indonesian error message", () => {
  const testCases = [
    { mimetype: "video/mp4", expectedAccepted: false },
    { mimetype: "video/quicktime", expectedAccepted: false },
    { mimetype: "video/webm", expectedAccepted: false },
    { mimetype: "application/pdf", expectedAccepted: false },
    { mimetype: "image/gif", expectedAccepted: false },
    { mimetype: "image/jpeg", expectedAccepted: true },
    { mimetype: "image/png", expectedAccepted: true },
    { mimetype: "image/webp", expectedAccepted: true },
  ];

  for (const tc of testCases) {
    let callbackErr = null;
    let callbackAccepted = null;
    fileFilter({}, { mimetype: tc.mimetype }, (err, accept) => {
      callbackErr = err;
      callbackAccepted = accept;
    });

    if (tc.expectedAccepted) {
      assert.equal(callbackErr, null, `${tc.mimetype} should be accepted`);
      assert.equal(callbackAccepted, true);
    } else {
      assert.ok(callbackErr, `${tc.mimetype} should be rejected`);
      assert.equal(callbackErr.statusCode, 400);
      assert.equal(callbackErr.code, "INVALID_FILE_TYPE");
      assert.equal(callbackErr.message, UNSUPPORTED_FORMAT_MESSAGE);
      assert.equal(callbackAccepted, undefined);
    }
  }
});

test("AUMS errorMiddleware intercepts fileFilter rejection and returns HTTP 400 JSON", () => {
  const error = new Error(UNSUPPORTED_FORMAT_MESSAGE);
  error.statusCode = 400;
  error.code = "INVALID_FILE_TYPE";

  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return data;
    },
  };

  errorMiddleware(
    error,
    { method: "POST", originalUrl: "/upload" },
    res,
    assert.fail,
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    message:
      "Format file tidak didukung. Harap unggah foto dengan format JPEG, PNG, atau WebP.",
  });
});
