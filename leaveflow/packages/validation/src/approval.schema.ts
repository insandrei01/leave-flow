/**
 * Approval action validation schemas.
 * BR-022: rejection reason must be at least 10 non-whitespace characters.
 */

import { z } from 'zod';

/**
 * POST /approvals/:requestId/approve
 */
export const approveBodySchema = z.object({
  note: z
    .string()
    .max(500, 'Note must not exceed 500 characters')
    .transform((v) => v.trim())
    .nullish()
    .transform((v) => v ?? null),
});

export type ApproveBody = z.infer<typeof approveBodySchema>;

/**
 * POST /approvals/:requestId/reject
 * BR-022: reason is required and must have at least 10 non-whitespace characters.
 */
export const rejectBodySchema = z.object({
  reason: z
    .string({ required_error: 'Rejection reason is required' })
    .max(500, 'Rejection reason must not exceed 500 characters')
    .transform((v) => v.trim())
    .refine(
      (v) => v.replace(/\s/g, '').length >= 10,
      { message: 'Rejection reason must contain at least 10 non-whitespace characters (BR-022)' },
    ),
});

export type RejectBody = z.infer<typeof rejectBodySchema>;

/**
 * POST /approvals/:requestId/force-approve — HR admin override.
 * Reason is required for audit purposes.
 */
export const forceApproveBodySchema = z.object({
  reason: z
    .string({ required_error: 'Reason is required for force approval audit trail' })
    .max(500, 'Reason must not exceed 500 characters')
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: 'Reason must not be empty' }),
});

export type ForceApproveBody = z.infer<typeof forceApproveBodySchema>;
