const { z } = require("zod");

const runDailyJobSchema = z.object({
  businessDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "businessDate must be YYYY-MM-DD")
    .optional(),
});

const debtorsQuerySchema = z.object({
  minBalance: z.coerce.number().int().optional(),
});

module.exports = { runDailyJobSchema, debtorsQuerySchema };
