const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const secret = "test-jwt-secret";
process.env.JWT_SECRET = secret;
const AuthController = require("../src/controllers/auth.controller");

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

test("AUMS registration hashes passwords and omits them from responses", async () => {
  const created = {
    id: "user-1",
    email: "citizen@example.com",
    name: "Citizen",
    role: "CITIZEN",
    password: await bcrypt.hash("password123", 4),
  };
  let input;
  const controller = new AuthController({
    prisma: {
      user: {
        create: async ({ data }) => {
          input = data;
          return created;
        },
      },
    },
  });
  const res = response();
  await controller.register(
    {
      body: {
        email: "Citizen@Example.com",
        name: "Citizen",
        password: "password123",
      },
    },
    res,
    assert.fail,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(input.email, "citizen@example.com");
  assert.notEqual(input.password, "password123");
  assert.equal(res.body.data.password, undefined);
});

test("AUMS login returns a signed token and public user profile", async () => {
  const user = {
    id: "user-1",
    email: "citizen@example.com",
    name: "Citizen",
    role: "CITIZEN",
    password: await bcrypt.hash("password123", 4),
  };
  const controller = new AuthController({
    prisma: {
      user: { findUnique: async () => user },
    },
  });
  const res = response();
  await controller.login(
    { body: { email: user.email, password: "password123" } },
    res,
    assert.fail,
  );

  const payload = jwt.verify(res.body.data.token, secret);
  assert.deepEqual(
    { userId: payload.userId, email: payload.email, role: payload.role },
    { userId: user.id, email: user.email, role: user.role },
  );
  assert.equal(res.body.data.user.password, undefined);
});
