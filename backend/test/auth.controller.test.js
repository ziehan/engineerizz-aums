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
  assert.equal(input.role, "CITIZEN");
  assert.equal(input.nip, null);
  assert.equal(input.departmentId, null);
  assert.notEqual(input.password, "password123");
  assert.equal(res.body.data.password, undefined);
});

test("AUMS public registration rejects non-CITIZEN roles and strips staff fields", async () => {
  for (const role of ["ADMIN", "CRM_OFFICER", "FIELD_OFFICER"]) {
    let created = false;
    const controller = new AuthController({
      prisma: {
        user: {
          create: async () => {
            created = true;
            return {};
          },
        },
      },
    });
    const res = response();
    await controller.register(
      {
        body: {
          email: "attacker@example.com",
          name: "Attacker",
          password: "password123",
          role,
        },
      },
      res,
      assert.fail,
    );

    assert.equal(res.statusCode, 400);
    assert.equal(created, false);
  }

  let capturedData;
  const controller = new AuthController({
    prisma: {
      user: {
        create: async ({ data }) => {
          capturedData = data;
          return { id: "user-2", ...data };
        },
      },
    },
  });
  const res = response();
  await controller.register(
    {
      body: {
        email: "warga@example.com",
        name: "Warga",
        password: "password123",
        role: "CITIZEN",
        nip: "199001012020011001",
        departmentId: "550e8400-e29b-41d4-a716-446655440000",
      },
    },
    res,
    assert.fail,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(capturedData.role, "CITIZEN");
  assert.equal(capturedData.nip, null);
  assert.equal(capturedData.departmentId, null);
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
