/**
 * Audit log request schemas — Zod validation.
 */

import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ----------------------------------------------------------------
// Query schemas
// ----------------------------------------------------------------

export const AuditLogsQuerySchema = z.object({
  entityType: z
    .enum([
      "leave_request",
      "employee",
      "team",
      "workflow",
      "leave_type",
      "tenant",
      "onboarding",
      "delegation",
      "balance_ledger",
    ])
    .optional(),
  entityId: z.string().optional(),
  actorId: z.string().optional(),
  action: z
    .union([z.string(), z.array(z.string())])
    .optional(),
  startDate: z
    .string()
    .regex(ISO_DATE_REGEX, "startDate must be YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(ISO_DATE_REGEX, "endDate must be YYYY-MM-DD")
    .optional(),
  page: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1))
    .optional()
    .default("1"),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(200))
    .optional()
    .default("50"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type AuditLogsQuery = z.infer<typeof AuditLogsQuerySchema>;

export const AuditExportQuerySchema = z.object({
  entityType: z
    .enum([
      "leave_request",
      "employee",
      "team",
      "workflow",
      "leave_type",
      "tenant",
      "onboarding",
      "delegation",
      "balance_ledger",
    ])
    .optional(),
  entityId: z.string().optional(),
  actorId: z.string().optional(),
  action: z
    .union([z.string(), z.array(z.string())])
    .optional(),
  startDate: z
    .string()
    .regex(ISO_DATE_REGEX, "startDate must be YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(ISO_DATE_REGEX, "endDate must be YYYY-MM-DD")
    .optional(),
});

export type AuditExportQuery = z.infer<typeof AuditExportQuerySchema>;
