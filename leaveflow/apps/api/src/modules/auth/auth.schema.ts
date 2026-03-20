/**
 * Auth route-level Zod schemas.
 *
 * These mirror the schemas in packages/validation/src/auth.schema.ts.
 * They are duplicated here because @leaveflow/validation is not yet
 * declared as a workspace dependency of this app.
 */

import { z } from "zod";

/**
 * POST /auth/register — create a new company and its first admin user.
 */
export const registerBodySchema = z.object({
  companyName: z
    .string({ required_error: "Company name is required" })
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must not exceed 100 characters")
    .transform((v) => v.trim()),

  adminEmail: z
    .string({ required_error: "Admin email is required" })
    .email("Admin email must be a valid email address")
    .transform((v) => v.trim().toLowerCase()),

  adminName: z
    .string({ required_error: "Admin name is required" })
    .min(2, "Admin name must be at least 2 characters")
    .max(100, "Admin name must not exceed 100 characters")
    .transform((v) => v.trim()),

  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),

  timezone: z
    .string()
    .max(64, "Timezone must not exceed 64 characters")
    .optional()
    .default("UTC"),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

/**
 * POST /auth/login schema placeholder.
 */
export const loginBodySchema = z.object({
  idToken: z
    .string({ required_error: "Firebase ID token is required" })
    .min(1, "Firebase ID token must not be empty"),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
