// Detailed period report PDF: GET /reports/export/pdf returns a real PDF and
// the service builder produces a %PDF buffer (even on a nearly empty DB).
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
const Customer = require("../../src/models/Customer");
const {
  loadReportBundle,
  generateReportPdfBuffer,
} = require("../../src/services/exports/reportPdf");

let mongoServer;
let token;

async function loginFirstAdmin() {
  await request(app).post("/api/v1/auth/register").send({
    name: "Owner",
    email: "owner@tranptech.mw",
    password: "FirstAdmin123!",
  });
  const login = await request(app).post("/api/v1/auth/login").send({
    email: "owner@tranptech.mw",
    password: "FirstAdmin123!",
  });
  expect(login.status).toBe(200);
  return login.body.data.accessToken;
}

describe("Detailed report PDF export", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    token = await loginFirstAdmin();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await Customer.deleteMany({});
  });

  it("builds a real PDF buffer (%PDF header, multi-page capable)", async () => {
    await Customer.create({
      code: "C-0001",
      name: "Rainbow Primary School",
      type: "SCHOOL",
      area: "Area 47",
      contacts: [{ name: "Head Teacher", phone: "+265991000111" }],
    });

    const bundle = await loadReportBundle({ from: "2026-11-01", to: "2026-11-30" });
    const buffer = await generateReportPdfBuffer(bundle);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(buffer.subarray(buffer.length - 64).toString("utf8")).toContain("%%EOF");
    // Page count marker: pdfkit writes at least one /Type /Page object.
    expect(buffer.toString("latin1")).toContain("/Type /Page");
  });

  it("GET /reports/export/pdf returns the PDF as an attachment", async () => {
    const res = await request(app)
      .get("/api/v1/reports/export/pdf?from=2026-11-01&to=2026-11-30")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain(
      'filename="TranpTech_Report_2026-11-01_2026-11-30.pdf"',
    );
    expect(res.body.length).toBeGreaterThan(2000);
  });

  it("rejects the PDF export without a token", async () => {
    const res = await request(app).get(
      "/api/v1/reports/export/pdf?from=2026-11-01&to=2026-11-30",
    );
    expect(res.status).toBe(401);
  });

  it("rejects an invalid date range", async () => {
    const res = await request(app)
      .get("/api/v1/reports/export/pdf?from=01-11-2026&to=2026-11-30")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
