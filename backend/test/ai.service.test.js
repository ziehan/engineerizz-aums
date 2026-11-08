const test = require("node:test");
const assert = require("node:assert/strict");
const AiService = require("../src/services/ai.service");

function axiosError(code, status) {
  const error = new Error(code);
  error.code = code;
  error.isAxiosError = true;
  if (status) error.response = { status, data: { message: "failure" } };
  return error;
}

test("AUMS AI service maps timeout to 504 without crashing", async () => {
  const ai = new AiService({
    post: async () => {
      throw axiosError("ECONNABORTED");
    },
  });

  await assert.rejects(
    () => ai.request("verify", {}),
    (error) => {
      assert.equal(error.code, "AI_SERVICE_TIMEOUT");
      assert.equal(error.statusCode, 504);
      return true;
    },
  );
});

test("AUMS AI service maps connection refusal and 5xx to unavailable", async () => {
  for (const error of [
    axiosError("ECONNREFUSED"),
    axiosError("EHTTP", 500),
    axiosError("EHTTP", 503),
  ]) {
    const ai = new AiService({
      post: async () => {
        throw error;
      },
    });
    await assert.rejects(
      () => ai.request("verify", {}),
      (result) => {
        assert.equal(result.code, "AI_SERVICE_DOWN");
        assert.equal(result.statusCode, 503);
        return true;
      },
    );

    test("AUMS AI service resets infrastructure failures after success", async () => {
      const ai = new AiService({
        post: async () => ({ status: 200, data: { success: true, data: {} } }),
      });
      ai.failureCount = 2;
      const result = await ai.request("verify", {});
      assert.equal(result.data.success, true);
      assert.equal(ai.failureCount, 0);
      assert.equal(ai.circuitOpenedAt, null);
    });
  }
});

test("AUMS AI service separates application failures from infrastructure failures", async () => {
  const ai = new AiService({
    post: async () => ({
      status: 200,
      data: { success: false, error: "invalid verification payload" },
    }),
  });

  await assert.rejects(
    () => ai.request("verify", {}),
    (error) => {
      assert.equal(error.code, "AI_SERVICE_REQUEST_FAILED");
      assert.equal(error.statusCode, 502);
      assert.equal(ai.failureCount, 0);
      return true;
    },
  );
});

test("AUMS AI service opens and recovers the circuit breaker", async () => {
  let calls = 0;
  const ai = new AiService(
    {
      post: async () => {
        calls += 1;
        throw axiosError("ECONNREFUSED");
      },
    },
    { failureThreshold: 2, cooldownMs: 100 },
  );

  await assert.rejects(() => ai.request("verify", {}));
  await assert.rejects(() => ai.request("verify", {}));
  await assert.rejects(() => ai.request("verify", {}));
  assert.equal(calls, 2);
  await new Promise((resolve) => setTimeout(resolve, 120));
  await assert.rejects(() => ai.request("verify", {}));
  assert.equal(calls, 3);
});
