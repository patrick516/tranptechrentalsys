const { z } = require("zod");

const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().min(6).max(25),
  network: z.enum(["AIRTEL", "TNM", "OTHER"]).optional(),
  email: z
    .string()
    .trim()
    .email()
    .max(160)
    .optional()
    .or(z.literal(""))
    .default(""),
  isPrimary: z.boolean().optional().default(false),
  authorisesPayments: z.boolean().optional().default(false),
  smsOptOut: z.boolean().optional().default(false),
  idType: z.string().trim().max(60).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
});

const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z
    .enum(["SCHOOL", "CHURCH", "INDIVIDUAL", "BUSINESS", "OTHER"])
    .optional()
    .default("OTHER"),
  status: z
    .enum(["ACTIVE", "WATCHLIST", "BLOCKED"])
    .optional()
    .default("ACTIVE"),
  area: z.string().trim().max(120).optional().default(""),
  distanceNote: z.string().trim().max(200).optional().default(""),
  contacts: z.array(contactInputSchema).min(1),
  formAcceptedAt: z.string().datetime().optional().nullable().default(null),
  depositRequired: z.boolean().optional().default(false),
  notes: z.string().trim().max(1000).optional().default(""),
});

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  type: z
    .enum(["SCHOOL", "CHURCH", "INDIVIDUAL", "BUSINESS", "OTHER"])
    .optional(),
  status: z.enum(["ACTIVE", "WATCHLIST", "BLOCKED"]).optional(),
  area: z.string().trim().max(120).optional(),
  distanceNote: z.string().trim().max(200).optional(),
  formAcceptedAt: z.string().datetime().optional().nullable(),
  depositRequired: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
});

const statusChangeSchema = z.object({
  status: z.enum(["ACTIVE", "WATCHLIST", "BLOCKED"]),
  reason: z.string().trim().max(500).optional().default(""),
});

const addContactSchema = contactInputSchema;

const updateContactSchema = contactInputSchema.partial();

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  statusChangeSchema,
  addContactSchema,
  updateContactSchema,
};
