// Unit & golden tests for money, Africa/Blantyre business dates (G-09), and Malawi phone routing (G-16)
import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  assertWholeKwacha,
  calcDailyHireCharge,
  formatKwacha,
} = require("../../src/utils/money");
const {
  BUSINESS_TZ,
  toBusinessDate,
  addBusinessDays,
  diffBusinessDays,
  listBusinessDatesInclusive,
} = require("../../src/utils/dates");
const {
  normalizePhone,
  detectNetwork,
  maskPhone,
} = require("../../src/utils/phone");

describe("Money utility (whole kwacha)", () => {
  it("validates non-negative integers and rejects decimals or negative numbers", () => {
    expect(assertWholeKwacha(0)).toBe(0);
    expect(assertWholeKwacha(16000)).toBe(16000);
    expect(() => assertWholeKwacha(-100)).toThrow();
    expect(() => assertWholeKwacha(400.5)).toThrow();
  });

  it("calculates daily hire charge and formats Malawi Kwacha", () => {
    // 40 chairs * MK 400/day = MK 16,000/day
    expect(calcDailyHireCharge(400, 40)).toBe(16000);
    expect(formatKwacha(400000)).toBe("MK 400,000");
  });
});

describe("Dates utility & Golden Case G-09 (Africa/Blantyre UTC+2)", () => {
  it("uses Africa/Blantyre business timezone", () => {
    expect(BUSINESS_TZ).toBe("Africa/Blantyre");
  });

  it("G-09: maps 2026-11-27T21:30:00Z to 2026-11-27 and 2026-11-27T22:30:00Z to 2026-11-28", () => {
    // 21:30 UTC on 27 Nov = 23:30 CAT (Africa/Blantyre) on 27 Nov
    expect(toBusinessDate("2026-11-27T21:30:00Z")).toBe("2026-11-27");
    // 22:30 UTC on 27 Nov = 00:30 CAT (Africa/Blantyre) on 28 Nov
    expect(toBusinessDate("2026-11-27T22:30:00Z")).toBe("2026-11-28");
  });

  it("adds days and lists inclusive business date ranges accurately", () => {
    expect(addBusinessDays("2026-11-01", 6)).toBe("2026-11-07");
    expect(diffBusinessDays("2026-11-01", "2026-11-07")).toBe(6);
    expect(listBusinessDatesInclusive("2026-11-01", "2026-11-03")).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
  });
});

describe("Phone utility & Golden Case G-16 (+265 & AIRTEL/TNM)", () => {
  it("G-16: normalises valid formats to +265995049331 and detects AIRTEL vs TNM", () => {
    const variants = [
      "0995049331",
      "0995 049 331",
      "265995049331",
      "+265995049331",
    ];
    for (const raw of variants) {
      const normalized = normalizePhone(raw);
      expect(normalized).toBe("+265995049331");
      expect(detectNetwork(normalized)).toBe("AIRTEL");
    }

    const tnmPhone = normalizePhone("0882 781 930");
    expect(tnmPhone).toBe("+265882781930");
    expect(detectNetwork(tnmPhone)).toBe("TNM");
  });

  it("supports manual network override and masks numbers in logs", () => {
    expect(detectNetwork("+265995049331", undefined, "TNM")).toBe("TNM");
    expect(normalizePhone("12345")).toBeNull();
    expect(maskPhone("+265995049331")).toBe("+26599504****");
  });
});
