const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(200),
});

// First-run registration: only accepted while the user collection is empty.
const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160).toLowerCase(),
  password: z.string().min(10).max(200),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
});

module.exports = {
  loginSchema,
  registerSchema,
  changePasswordSchema,
};
