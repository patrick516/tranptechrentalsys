// Golden test cases G-01..G-08, G-10, G-11, and G-14 against pure ledger calculations
import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  buildInitialHireEntries,
  buildExtensionHireEntries,
  calcChargesTotal,
  calcPaymentsTotal,
  calcBalance,
  evaluateDailyLedgerForDate,
} = require("../../src/services/ledger.calc");
const {
  listBusinessDatesInclusive,
  addBusinessDays,
} = require("../../src/utils/dates");

describe("Golden Ledger Cases (G-01 to G-08, G-10, G-11, G-14)", () => {
  it("G-01: 40 chairs, 1 to 7 Nov, paid in full on 1 Nov -> 7 entries of 16,000, charges 112,000, balance 0", () => {
    const entries = buildInitialHireEntries({
      bookingId: "b1",
      customerId: "c1",
      qty: 40,
      ratePerChairPerDay: 400,
      startDate: "2026-11-01",
      endDate: "2026-11-07",
    });

    expect(entries).toHaveLength(7);
    expect(
      entries.every((e) => e.amount === 16000 && e.dueDate === "2026-11-01"),
    ).toBe(true);

    const payments = [
      { amount: 112000, paidDate: "2026-11-01", status: "CONFIRMED" },
    ];
    expect(calcChargesTotal(entries)).toBe(112000);
    expect(calcBalance(entries, payments)).toBe(0);
  });

  it("G-02 & G-03: 7-day extension on 8 Nov paid 12 Nov -> 8,000 late fees, then waived to 0 balance", () => {
    const baseEntries = buildInitialHireEntries({
      bookingId: "b2",
      customerId: "c1",
      qty: 40,
      ratePerChairPerDay: 400,
      startDate: "2026-11-01",
      endDate: "2026-11-07",
    });

    const ext = buildExtensionHireEntries({
      bookingId: "b2",
      customerId: "c1",
      qty: 40,
      ratePerChairPerDay: 400,
      currentEndDate: "2026-11-07",
      days: 7,
      requestedDate: "2026-11-08",
    });

    expect(ext.chargeTotal).toBe(112000);

    const entries = [...baseEntries, ...ext.entries];
    const payments = [
      { amount: 224000, paidDate: "2026-11-12", status: "CONFIRMED" },
    ];
    const keys = new Set(entries.map((e) => e.idempotencyKey));

    const booking = {
      _id: "b2",
      customerId: "c1",
      status: "OUT",
      qtyOut: 40,
      endDate: "2026-11-14",
      ratePerChairPerDay: 400,
      lateFeePerDay: 2000,
      graceDays: 0,
    };

    for (const d of listBusinessDatesInclusive("2026-11-09", "2026-11-13")) {
      const added = evaluateDailyLedgerForDate({
        booking,
        ledgerEntries: entries,
        payments,
        businessDate: d,
        existingKeys: keys,
      });
      for (const item of added) {
        keys.add(item.idempotencyKey);
        entries.push(item);
      }
    }

    const lateFees = entries.filter((e) => e.type === "LATE_FEE");
    expect(lateFees).toHaveLength(4);
    expect(calcPaymentsTotal(payments)).toBe(224000);
    expect(calcBalance(entries, payments)).toBe(8000);

    // G-03: ADMIN waives the 8,000 late fees with a negative ADJUSTMENT entry
    entries.push({
      bookingId: "b2",
      customerId: "c1",
      type: "ADJUSTMENT",
      date: "2026-11-13",
      dueDate: "2026-11-13",
      amount: -8000,
      reason: "Owner goodwill waiver",
      voidedAt: null,
    });
    expect(calcBalance(entries, payments)).toBe(0);
  });

  it("G-04 & G-05: school worked example from 20 Nov to 4 Dec and return 3 Dec", () => {
    const startLedger = [
      {
        bookingId: "b4",
        customerId: "c-school",
        type: "ADJUSTMENT",
        date: "2026-11-20",
        dueDate: "2026-11-20",
        amount: 608000,
        voidedAt: null,
      },
    ];
    const payments = [
      { amount: 400000, paidDate: "2026-11-27", status: "CONFIRMED" },
    ];

    const g04Entries = [...startLedger];
    const g04Keys = new Set(
      g04Entries.map((e) => e.idempotencyKey).filter(Boolean),
    );
    const bookingG04 = {
      _id: "b4",
      customerId: "c-school",
      status: "OUT",
      qtyOut: 40,
      endDate: "2026-11-07",
      ratePerChairPerDay: 400,
      lateFeePerDay: 2000,
      graceDays: 0,
    };

    for (const d of listBusinessDatesInclusive("2026-11-21", "2026-12-04")) {
      const added = evaluateDailyLedgerForDate({
        booking: bookingG04,
        ledgerEntries: g04Entries,
        payments,
        businessDate: d,
        existingKeys: g04Keys,
      });
      for (const item of added) {
        g04Keys.add(item.idempotencyKey);
        g04Entries.push(item);
      }
    }

    expect(calcChargesTotal(g04Entries)).toBe(860000);
    expect(calcBalance(g04Entries, payments)).toBe(460000);

    const g05Entries = [...startLedger];
    const g05Keys = new Set(
      g05Entries.map((e) => e.idempotencyKey).filter(Boolean),
    );
    const bookingG05 = { ...bookingG04, endDate: "2026-11-07" };

    for (const d of listBusinessDatesInclusive("2026-11-21", "2026-12-03")) {
      const added = evaluateDailyLedgerForDate({
        booking: bookingG05,
        ledgerEntries: g05Entries,
        payments,
        businessDate: d,
        existingKeys: g05Keys,
      });
      for (const item of added) {
        g05Keys.add(item.idempotencyKey);
        g05Entries.push(item);
      }
    }

    expect(calcChargesTotal(g05Entries)).toBe(842000);
    expect(calcBalance(g05Entries, payments)).toBe(442000);
  });

  it("G-06: 10 chairs ended 10 Nov paid in full, returned 13 Nov -> 3 overstay hire entries (12,000)", () => {
    const entries = buildInitialHireEntries({
      bookingId: "b6",
      customerId: "c2",
      qty: 10,
      ratePerChairPerDay: 400,
      startDate: "2026-11-01",
      endDate: "2026-11-10",
    });
    const payments = [
      { amount: 40000, paidDate: "2026-11-01", status: "CONFIRMED" },
    ];
    const keys = new Set(entries.map((e) => e.idempotencyKey));

    const booking = {
      _id: "b6",
      customerId: "c2",
      status: "OUT",
      qtyOut: 10,
      endDate: "2026-11-10",
      ratePerChairPerDay: 400,
      lateFeePerDay: 2000,
      graceDays: 0,
    };

    for (const d of listBusinessDatesInclusive("2026-11-11", "2026-11-13")) {
      const added = evaluateDailyLedgerForDate({
        booking,
        ledgerEntries: entries,
        payments,
        businessDate: d,
        existingKeys: keys,
      });
      for (const item of added) {
        keys.add(item.idempotencyKey);
        entries.push(item);
      }
    }

    const overstayHire = entries.filter(
      (e) => e.type === "HIRE" && e.date > "2026-11-10",
    );
    const lateFees = entries.filter((e) => e.type === "LATE_FEE");

    expect(overstayHire).toHaveLength(3);
    expect(overstayHire.reduce((s, e) => s + e.amount, 0)).toBe(12000);
    expect(lateFees).toHaveLength(2);
    expect(lateFees.reduce((s, e) => s + e.amount, 0)).toBe(4000);
    expect(calcBalance(entries, payments)).toBe(16000);
  });

  it("G-07: graceDays = 2 with extension due 8 Nov paid 12 Nov -> late fees only for 10 and 11 Nov (4,000)", () => {
    const ext = buildExtensionHireEntries({
      bookingId: "b7",
      customerId: "c3",
      qty: 40,
      ratePerChairPerDay: 400,
      currentEndDate: "2026-11-07",
      days: 7,
      requestedDate: "2026-11-08",
    });
    const entries = [...ext.entries];
    const payments = [
      { amount: 112000, paidDate: "2026-11-12", status: "CONFIRMED" },
    ];
    const keys = new Set(entries.map((e) => e.idempotencyKey));

    const booking = {
      _id: "b7",
      customerId: "c3",
      status: "OUT",
      qtyOut: 40,
      endDate: "2026-11-14",
      ratePerChairPerDay: 400,
      lateFeePerDay: 2000,
      graceDays: 2,
    };

    for (const d of listBusinessDatesInclusive("2026-11-09", "2026-11-13")) {
      const added = evaluateDailyLedgerForDate({
        booking,
        ledgerEntries: entries,
        payments,
        businessDate: d,
        existingKeys: keys,
      });
      for (const item of added) {
        keys.add(item.idempotencyKey);
        entries.push(item);
      }
    }

    const lateFees = entries.filter((e) => e.type === "LATE_FEE");
    expect(lateFees.map((f) => f.date)).toEqual(["2026-11-10", "2026-11-11"]);
    expect(lateFees.reduce((s, f) => s + f.amount, 0)).toBe(4000);
  });

  it("G-08: 40 chairs 1-7 Nov prepaid, 30 kept through 9 Nov -> 2 overstay hire entries (24,000)", () => {
    const entries = buildInitialHireEntries({
      bookingId: "b8",
      customerId: "c4",
      qty: 40,
      ratePerChairPerDay: 400,
      startDate: "2026-11-01",
      endDate: "2026-11-07",
    });
    const payments = [
      { amount: 112000, paidDate: "2026-11-01", status: "CONFIRMED" },
    ];
    const keys = new Set(entries.map((e) => e.idempotencyKey));

    expect(calcBalance(entries, payments)).toBe(0);

    const booking = {
      _id: "b8",
      customerId: "c4",
      status: "OUT",
      qtyOut: 30,
      endDate: "2026-11-07",
      ratePerChairPerDay: 400,
      lateFeePerDay: 2000,
      graceDays: 0,
    };

    for (const d of listBusinessDatesInclusive("2026-11-08", "2026-11-09")) {
      const added = evaluateDailyLedgerForDate({
        booking,
        ledgerEntries: entries,
        payments,
        businessDate: d,
        existingKeys: keys,
      });
      for (const item of added) {
        keys.add(item.idempotencyKey);
        entries.push(item);
      }
    }

    const overstay = entries.filter(
      (e) => e.type === "HIRE" && e.date > "2026-11-07",
    );
    const fees = entries.filter((e) => e.type === "LATE_FEE");
    expect(overstay).toHaveLength(2);
    expect(overstay.reduce((s, e) => s + e.amount, 0)).toBe(24000);
    expect(fees).toHaveLength(1);
    expect(fees.reduce((s, e) => s + e.amount, 0)).toBe(2000);
    expect(calcBalance(entries, payments)).toBe(26000);
    expect(addBusinessDays("2026-11-07", 2)).toBe("2026-11-09");
  });

  it("G-10 & G-11 & G-14: overpayment credit (-8,000), idempotent duplicate skip, and rate snapshot isolation", () => {
    const entries = buildInitialHireEntries({
      bookingId: "b10",
      customerId: "c5",
      qty: 40,
      ratePerChairPerDay: 400,
      startDate: "2026-11-01",
      endDate: "2026-11-07",
    });
    const overpay = [
      { amount: 120000, paidDate: "2026-11-01", status: "CONFIRMED" },
    ];
    expect(calcBalance(entries, overpay)).toBe(-8000);

    const keys = new Set(entries.map((e) => e.idempotencyKey));
    const dupAttempt = evaluateDailyLedgerForDate({
      booking: {
        _id: "b10",
        customerId: "c5",
        status: "OUT",
        qtyOut: 40,
        endDate: "2026-11-07",
        ratePerChairPerDay: 400,
        lateFeePerDay: 2000,
        graceDays: 0,
      },
      ledgerEntries: entries,
      payments: overpay,
      businessDate: "2026-11-08",
      existingKeys: keys,
    });

    const keysAfterFirst = new Set([
      ...keys,
      ...dupAttempt.map((x) => x.idempotencyKey),
    ]);
    const secondRun = evaluateDailyLedgerForDate({
      booking: {
        _id: "b10",
        customerId: "c5",
        status: "OUT",
        qtyOut: 40,
        endDate: "2026-11-07",
        ratePerChairPerDay: 400,
        lateFeePerDay: 2000,
        graceDays: 0,
      },
      ledgerEntries: [...entries, ...dupAttempt],
      payments: overpay,
      businessDate: "2026-11-08",
      existingKeys: keysAfterFirst,
    });
    expect(secondRun).toHaveLength(0);

    const oldBookingEntries = buildInitialHireEntries({
      bookingId: "b-old",
      customerId: "c5",
      qty: 10,
      ratePerChairPerDay: 400,
      startDate: "2026-11-01",
      endDate: "2026-11-01",
    });
    const newBookingEntries = buildInitialHireEntries({
      bookingId: "b-new",
      customerId: "c5",
      qty: 10,
      ratePerChairPerDay: 450,
      startDate: "2026-11-02",
      endDate: "2026-11-02",
    });
    expect(oldBookingEntries[0].amount).toBe(4000);
    expect(newBookingEntries[0].amount).toBe(4500);
  });
});
