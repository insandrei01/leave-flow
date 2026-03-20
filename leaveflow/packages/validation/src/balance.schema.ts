/**
 * Balance request validation schemas.
 */

import { z } from 'zod';

const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const mongoIdSchema = z
  .string()
  .regex(MONGO_OBJECT_ID_REGEX, 'Must be a valid MongoDB ObjectId (24-char hex)');

/**
 * POST /balances/adjustments — manual balance adjustment by HR admin.
 * Creates an append-only ledger entry; never modifies existing entries.
 */
export const manualAdjustmentBodySchema = z.object({
  employeeId: mongoIdSchema.describe('Employee to adjust balance for (required)'),

  leaveTypeId: mongoIdSchema.describe('Leave type to adjust (required)'),

  amount: z
    .number({ required_error: 'Amount is required' })
    .refine((v) => v !== 0, { message: 'Amount must not be zero' })
    .refine((v) => Math.abs(v) <= 365, {
      message: 'Amount must not exceed 365 days in absolute value',
    }),

  reason: z
    .string({ required_error: 'Reason is required for audit trail' })
    .min(1, 'Reason must not be empty')
    .max(500, 'Reason must not exceed 500 characters')
    .transform((v) => v.trim()),

  effectiveDate: z
    .string({ required_error: 'Effective date is required' })
    .regex(DATE_REGEX, 'Effective date must be in YYYY-MM-DD format'),
});

export type ManualAdjustmentBody = z.infer<typeof manualAdjustmentBodySchema>;
