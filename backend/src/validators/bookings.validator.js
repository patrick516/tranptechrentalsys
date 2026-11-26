const { z } = require("zod");

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const createBookingSchema = z.object({
  customerId: z.string().trim().min(1),
  startDate: dateStr,
  endDate: dateStr,
  qty: z.number().int().positive(),
  ratePerChairPerDay: z.number().int().nonnegative().optional(),
  lateFeePerDay: z.number().int().nonnegative().optional(),
  graceDays: z.number().int().nonnegative().optional(),
  depositHeld: z.number().int().nonnegative().optional().default(0),
  venue: z.string().trim().max(200).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

const pickupBookingSchema = z.object({
  pickupDate: dateStr.optional(),
  notes: z.string().trim().max(500).optional().default(""),
});

const returnBookingSchema = z.object({
  returnDate: dateStr.optional(),
  qtyReturned: z.number().int().nonnegative(),
  qtyLost: z.number().int().nonnegative().optional().default(0),
  qtyDamaged: z.number().int().nonnegative().optional().default(0),
  lossFeePerChair: z.number().int().nonnegative().optional().default(0),
  damageFeePerChair: z.number().int().nonnegative().optional().default(0),
  notes: z.string().trim().max(500).optional().default(""),
});

const extendBookingSchema = z.object({
  days: z.number().int().positive(),
  requestedDate: dateStr.optional(),
  notes: z.string().trim().max(500).optional().default(""),
});

const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional().default(""),
});

module.exports = {
  createBookingSchema,
  pickupBookingSchema,
  returnBookingSchema,
  extendBookingSchema,
  cancelBookingSchema,
};
