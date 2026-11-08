const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { processImage } = require("../src/middlewares/image.middleware");

test("processes uploaded images through Sharp", async () => {
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

test("rejects an invalid image buffer", async () => {
  const req = { file: { buffer: Buffer.from("not-an-image") } };
  let receivedError;

  await processImage(req, {}, (error) => {
    receivedError = error;
  });

  assert.equal(receivedError.statusCode, 422);
  assert.equal(receivedError.code, "INVALID_IMAGE_PAYLOAD");
});
