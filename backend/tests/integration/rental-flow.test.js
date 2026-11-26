// End-to-end integration test for customers, stock, bookings, payments, waivers, daily job, and reports
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
const Customer = require("../../src/models/Customer");
const StockMovement = require("../../src/models/StockMovement");
const Booking = require("../../src/models/Booking");
const LedgerEntry = require("../../src/models/LedgerEntry");
const Payment = require("../../src/models/Payment");
const PromiseModel = require("../../src/models/Promise");

let mongoServer;
let adminToken;

describe("End-to-End Chair Rental Flow", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      StockMovement.deleteMany({}),
      Booking.deleteMany({}),
      LedgerEntry.deleteMany({}),
      Payment.deleteMany({}),
      PromiseModel.deleteMany({}),
    ]);

    const passwordHash = await argon2.hash("AdminPass12345!", {
      type: argon2.argon2id,
    });
    await User.create({
      name: "Admin User",
      email: "admin@tranptech.mw",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@tranptech.mw", password: "AdminPass12345!" });

    adminToken = loginRes.body.data.accessToken;
  });

  it("runs customer -> stock -> booking -> pickup -> payment -> waiver -> daily job -> reports flow", async () => {
    // 1. Add initial chair stock (100 chairs)
    const stockRes = await request(app)
      .post("/api/v1/stock/movements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        type: "PURCHASE",
        qty: 100,
        date: "2026-11-01",
        note: "Initial batch",
      });
    expect(stockRes.status).toBe(201);

    // 2. Create a WATCHLIST customer and a BLOCKED customer
    const watchCustRes = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Lilongwe Events Hall",
        type: "BUSINESS",
        status: "WATCHLIST",
        area: "Area 3",
        contacts: [
          { name: "Chisomo Banda", phone: "0995049331", isPrimary: true },
        ],
      });
    expect(watchCustRes.status).toBe(201);
    expect(watchCustRes.body.data.contacts[0].phone).toBe("+265995049331");
    expect(watchCustRes.body.data.contacts[0].network).toBe("AIRTEL");

    const blockedCustRes = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Blocked Hall",
        type: "OTHER",
        status: "BLOCKED",
        contacts: [{ name: "John Doe", phone: "0888123456", isPrimary: true }],
      });
    expect(blockedCustRes.status).toBe(201);

    // BLOCKED customer must be denied a new booking
    const blockedBookingRes = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId: blockedCustRes.body.data._id,
        startDate: "2026-11-02",
        endDate: "2026-11-04",
        qty: 10,
      });
    expect(blockedBookingRes.status).toBe(403);
    expect(blockedBookingRes.body.error.code).toBe("CUSTOMER_BLOCKED");

    // 3. Create booking for WATCHLIST customer -> 201 with WATCHLIST_CUSTOMER warning
    const bookingRes = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId: watchCustRes.body.data._id,
        startDate: "2026-11-01",
        endDate: "2026-11-03",
        qty: 20,
        ratePerChairPerDay: 400,
        lateFeePerDay: 2000,
      });
    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.data.warnings).toContain("WATCHLIST_CUSTOMER");

    const bookingId = bookingRes.body.data.booking._id;

    // 4. Pick up booking (RESERVED -> OUT)
    const pickupRes = await request(app)
      .post(`/api/v1/bookings/${bookingId}/pickup`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pickupDate: "2026-11-01" });
    expect(pickupRes.status).toBe(200);
    expect(pickupRes.body.data.status).toBe("OUT");
    expect(pickupRes.body.data.qtyOut).toBe(20);

    // 5. Record partial payment of 20,000 MK (initial 3 days * 20 * 400 = 24,000 MK)
    const payRes = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId: watchCustRes.body.data._id,
        bookingId,
        amount: 20000,
        paidDate: "2026-11-01",
        method: "AIRTEL_MONEY",
        reference: "AM-1001",
      });
    expect(payRes.status).toBe(201);

    // 6. Run daily ledger job twice for 2026-11-05 (overstay + late fee + idempotency check)
    const job1 = await request(app)
      .post("/api/v1/reports/run-daily-job")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ businessDate: "2026-11-05" });
    expect(job1.status).toBe(200);
    expect(job1.body.data.status).toBe("COMPLETED");
    expect(job1.body.data.summary.insertedEntries).toBeGreaterThan(0);

    const job2 = await request(app)
      .post("/api/v1/reports/run-daily-job")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ businessDate: "2026-11-05" });
    expect(job2.status).toBe(200);
    expect(job2.body.data.summary.insertedEntries).toBe(0);

    // 7. Apply a negative ADJUSTMENT waiver and verify customer balance updates
    const waiverRes = await request(app)
      .post("/api/v1/ledger/adjustments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId: watchCustRes.body.data._id,
        bookingId,
        type: "ADJUSTMENT",
        amount: -2000,
        reason: "Partial late fee waiver",
      });
    expect(waiverRes.status).toBe(201);

    // 8. Check dashboard & debtors report
    const dashRes = await request(app)
      .get("/api/v1/reports/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.totalOwnedChairs).toBe(100);
    expect(dashRes.body.data.chairsOut).toBe(20);

    const debtorsRes = await request(app)
      .get("/api/v1/reports/debtors")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(debtorsRes.status).toBe(200);
    expect(debtorsRes.body.data.length).toBe(1);
    expect(debtorsRes.body.data[0].balance).toBeGreaterThan(0);
  });
});
