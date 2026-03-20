/**
 * Approval route-level Zod schemas.
 * BR-022: rejection reason must be at least 10 non-whitespace characters.
 *
 * These mirror the schemas in packages/validation/src/approval.schema.ts.
 * They are duplicated here because @leaveflow/validation is not yet
 * declared as a workspace dependency of this app.
 */

import { z } from "zod";

/**
 * POST /approvals/:id/approve
 */
export const approveBodySchema = z.object({
  note: z
    .string()
    .max(500, "Note must not exceed 500 characters")
    .transform((v) => v.trim())
    .nullish()
    .transform((v) => v ?? null),
});

export type ApproveBody = z.infer<typeof approveBodySchema>;

/**
 * POST /approvals/:id/reject
 * BR-022: reason is required and must have at least 10 non-whitespace characters.
 */
export const rejectBodySchema = z.object({
  reason: z
    .string({ required_error: "Rejection reason is required" })
    .max(500, "Rejection reason must not exceed 500 characters")
    .transform((v) => v.trim())
    .refine(
      (v) => v.replace(/\s/g, "").length >= 10,
      {
        message:
          "Rejection reason must contain at least 10 non-whitespace characters (BR-022)",
      }
    ),
});

export type RejectBody = z.infer<typeof rejectBodySchema>;

/**
 * POST /approvals/:id/force-approve — HR admin override.
 * Reason is required for audit purposes.
 */
export const forceApproveBodySchema = z.object({
  reason: z
    .string({ required_error: "Reason is required for force approval audit trail" })
    .max(500, "Reason must not exceed 500 characters")
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: "Reason must not be empty" }),
});

export type ForceApproveBody = z.infer<typeof forceApproveBodySchema>;

/**
 * Path params — :id must be a 24-char hex MongoDB ObjectId.
 */
export const approvalIdParamsSchema = z.object({
  id: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      "Must be a valid MongoDB ObjectId (24-char hex)"
    ),
});

export type ApprovalIdParams = z.infer<typeof approvalIdParamsSchema>;

/**
 * Query params for GET /approvals/pending
 */
export const pendingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type PendingQuery = z.infer<typeof pendingQuerySchema>;
