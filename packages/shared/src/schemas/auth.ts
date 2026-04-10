import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().optional()
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});
