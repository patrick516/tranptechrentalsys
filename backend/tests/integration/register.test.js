// First-run setup: the portal may register exactly one account while the user
// collection is empty; after that /auth/register is closed (spec 11.x / 12.x).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createRequire } from "module";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

const require = createRequire(import.meta.url);
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test_access_secret_key_for_vitest";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_key_for_vitest";
process.env.CORS_ORIGINS = "http://localhost:5173";

const app = require("../../src/app");
const User = require("../../src/models/User");
const RefreshToken = require("../../src/models/RefreshToken");

let mongoServer;

describe("First-run registration (SETUP-01..05)", () => {
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
  });

  it("SETUP-01: reports needsSetup=true when there are no users", async () => {
    const res = await request(app).get("/api/v1/auth/setup");
    expect(res.status).toBe(200);
    expect(res.body.data.needsSetup).toBe(true);
  });

  it("SETUP-02: rejects a short password on register", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Owner",
      email: "owner@tranptech.mw",
      password: "short",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("SETUP-03: registers the first account as ADMIN and signs it in", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Owner Banda",
      email: "Owner@Tranptech.mw",
      password: "FirstAdmin123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("ADMIN");
    expect(res.body.data.user.status).toBe("ACTIVE");
    expect(res.body.data.user.email).toBe("owner@tranptech.mw");
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(typeof res.body.data.accessToken).toBe("string");
    expect(res.headers["set-cookie"]?.[0] || "").toContain("tp_refresh_token");

    const stored = await User.findOne({ email: "owner@tranptech.mw" }).lean();
    expect(stored).toBeTruthy();
    expect(stored.role).toBe("ADMIN");

    const login = await request(app).post("/api/v1/auth/login").send({
      email: "owner@tranptech.mw",
      password: "FirstAdmin123!",
    });
    expect(login.status).toBe(200);
  });

  it("SETUP-04: reports needsSetup=false once a user exists", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Owner",
      email: "owner@tranptech.mw",
      password: "FirstAdmin123!",
    });

    const res = await request(app).get("/api/v1/auth/setup");
    expect(res.status).toBe(200);
    expect(res.body.data.needsSetup).toBe(false);
  });

  it("SETUP-05: closes registration for good once any user exists", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Owner",
      email: "owner@tranptech.mw",
      password: "FirstAdmin123!",
    });

    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Intruder",
      email: "intruder@tranptech.mw",
      password: "AnotherPass123!",
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SETUP_COMPLETE");

    const count = await User.countDocuments({});
    expect(count).toBe(1);
  });
});
