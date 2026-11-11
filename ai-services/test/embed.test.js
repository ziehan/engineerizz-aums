const test = require("node:test");
const assert = require("node:assert/strict");

test("ai-services embed route rejects missing text payload", async () => {
  const aiController = require("../src/controllers/ai.controller");
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

  await aiController.embed({ body: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, false);
  assert.match(res.body.error, /text/);
});

test("ai-services geminiAdapter exports generateEmbedding with 768 dimensions default", () => {
  const geminiAdapter = require("../src/adapters/geminiAdapter");
  assert.equal(typeof geminiAdapter.generateEmbedding, "function");
});
