// Integration tests for authentication, lockout, token rotation/reuse, RBAC, and NoSQL injection (S-01..S-05)
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createRequire } from "module";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

const require = createRequire(import.meta.url);
const mongoose = require("mongoose");
const argon2 = require("argon2");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test_access_secret_key_for_vitest";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_key_for_vitest";
process.env.CORS_ORIGINS = "http://localhost:5173";

const app = require("../../src/app");
const User = require("../../src/models/User");
const RefreshToken = require("../../src/models/RefreshToken");

let mongoServer;

describe("Auth & Security (S-01 to S-05)", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});

    const adminHash = await argon2.hash("AdminPass12345!", {
      type: argon2.argon2id,
    });
    const staffHash = await argon2.hash("StaffPass1234!", {
      type: argon2.argon2id,
    });

    await User.create([
      {
        name: "Admin User",
        email: "admin@tranptech.mw",
        passwordHash: adminHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        name: "Staff User",
        email: "staff@tranptech.mw",
        passwordHash: staffHash,
        role: "STAFF",
        status: "ACTIVE",
      },
    ]);
  });

  it("S-02: rejects NoSQL operator injection in login body with 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@tranptech.mw", password: { $gt: "" } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("S-03: locks account after 5 failed login attempts within 15 minutes", async () => {
    for (let i = 0; i < 5; i += 1) {
      const failRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "admin@tranptech.mw", password: "WrongPassword!" });
      expect([401, 423]).toContain(failRes.status);
    }

    const sixthRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@tranptech.mw", password: "AdminPass12345!" });

    expect(sixthRes.status).toBe(423);
    expect(sixthRes.body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("S-01: denies STAFF access to ADMIN-only route with 403", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "staff@tranptech.mw", password: "StaffPass1234!" });

    const token = loginRes.body.data.accessToken;
    const forbiddenRes = await request(app)
      .get("/api/v1/_test-admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe("FORBIDDEN");
  });

  it("S-04: revokes token family when a rotated refresh token is reused", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@tranptech.mw", password: "AdminPass12345!" });

    const cookies = loginRes.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const refresh1 = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookies);
    expect(refresh1.status).toBe(200);

    const replayRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookies);
    expect(replayRes.status).toBe(401);

    const nextCookies = refresh1.headers["set-cookie"];
    const afterRevokeRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", nextCookies);
    expect(afterRevokeRes.status).toBe(401);
  });

  it("S-05: immediately rejects tokens when a user account is DISABLED", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "staff@tranptech.mw", password: "StaffPass1234!" });

    const token = loginRes.body.data.accessToken;
    await User.updateOne(
      { email: "staff@tranptech.mw" },
      { $set: { status: "DISABLED" } },
    );

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(401);
  });
});
