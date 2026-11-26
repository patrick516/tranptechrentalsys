// Development seed script for TranpTech Chair Rentals (run with: node src/seed.js)
require("dotenv").config();
const mongoose = require("mongoose");
const argon2 = require("argon2");
const User = require("./models/User");
const Settings = require("./models/Settings");
const Customer = require("./models/Customer");
const StockMovement = require("./models/StockMovement");
const Booking = require("./models/Booking");
const LedgerEntry = require("./models/LedgerEntry");
const Payment = require("./models/Payment");
const PromiseModel = require("./models/Promise");
const { toBusinessDate } = require("./utils/dates");
const { buildInitialHireEntries } = require("./services/ledger.calc");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tranptech_dev";

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI}`);

  const today = toBusinessDate();

  // 1. Default Settings
  await Settings.findOneAndUpdate(
    { key: "default" },
    {
      $setOnInsert: {
        key: "default",
        businessName: "TranpTech Chair Rentals",
        ratePerChairPerDay: 400,
        lateFeePerDay: 2000,
        graceDays: 0,
        depositRequiredDefault: false,
        smsDailyCap: 100,
        smsMode: "log",
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  // 2. Initial ADMIN user
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@tranptech.mw";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "AdminPass12345!";
  let adminUser = await User.findOne({ email: adminEmail });
  if (!adminUser) {
    const passwordHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
    });
    adminUser = await User.create({
      name: "System Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    });
    console.log(`Created ADMIN user: ${adminEmail}`);
  }

  // 3. Initial Chair Stock
  const existingStock = await StockMovement.countDocuments();
  if (existingStock === 0) {
    await StockMovement.create({
      date: today,
      type: "PURCHASE",
      qty: 250,
      note: "Seeded starting inventory",
      createdBy: adminUser._id,
    });
    console.log("Seeded 250 chairs stock movement");
  }

  // 4. Sample Customers
  let schoolCust = await Customer.findOne({ code: "C-0001" });
  if (!schoolCust) {
    schoolCust = await Customer.create({
      code: "C-0001",
      name: "Blantyre Secondary Events",
      type: "SCHOOL",
      status: "ACTIVE",
      area: "Chichiri",
      contacts: [
        {
          name: "Grace Phiri",
          role: "Bursar",
          phone: "+265995049331",
          network: "AIRTEL",
          isPrimary: true,
          authorisesPayments: true,
        },
      ],
      createdBy: adminUser._id,
    });
  }

  let churchCust = await Customer.findOne({ code: "C-0002" });
  if (!churchCust) {
    churchCust = await Customer.create({
      code: "C-0002",
      name: "Limbe Faith Assembly",
      type: "CHURCH",
      status: "WATCHLIST",
      area: "Limbe",
      contacts: [
        {
          name: "Peter Mwale",
          role: "Elder",
          phone: "+265888123456",
          network: "TNM",
          isPrimary: true,
        },
      ],
      createdBy: adminUser._id,
    });
  }

  // 5. Sample Booking, Ledger Entries, Payment & Promise
  let booking = await Booking.findOne({ code: "B-0001" });
  if (!booking) {
    booking = await Booking.create({
      code: "B-0001",
      customerId: schoolCust._id,
      status: "OUT",
      startDate: today,
      endDate: today,
      qty: 40,
      qtyOut: 40,
      ratePerChairPerDay: 400,
      lateFeePerDay: 2000,
      graceDays: 0,
      pickupDate: today,
      venue: "Assembly Hall",
      createdBy: adminUser._id,
    });

    const hireEntries = buildInitialHireEntries({
      bookingId: booking._id,
      customerId: schoolCust._id,
      qty: 40,
      ratePerChairPerDay: 400,
      startDate: today,
      endDate: today,
      createdBy: adminUser._id,
    });
    await LedgerEntry.insertMany(hireEntries);

    await Payment.create({
      customerId: schoolCust._id,
      bookingId: booking._id,
      amount: 10000,
      paidDate: today,
      method: "MPAMBA",
      reference: "SEED-PAY-001",
      status: "CONFIRMED",
      createdBy: adminUser._id,
    });

    await PromiseModel.create({
      customerId: churchCust._id,
      kind: "PAYMENT",
      promisedDate: today,
      promisedAmount: 16000,
      status: "PENDING",
      notes: "Follow up after service",
      createdBy: adminUser._id,
    });
    console.log("Seeded booking B-0001, ledger entries, payment, and promise");
  }

  await mongoose.disconnect();
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
