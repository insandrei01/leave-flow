/**
 * LeaveRequest request validation schemas.
 */

import { z } from 'zod';

const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const mongoIdSchema = z
  .string()
  .regex(MONGO_OBJECT_ID_REGEX, 'Must be a valid MongoDB ObjectId (24-char hex)');

/**
 * POST /leave-requests — submit a new leave request.
 */
export const createLeaveRequestBodySchema = z
  .object({
    leaveTypeId: mongoIdSchema.describe('Leave type identifier (required)'),

    startDate: z
      .string({ required_error: 'Start date is required' })
      .regex(DATE_REGEX, 'Start date must be in YYYY-MM-DD format'),

    endDate: z
      .string({ required_error: 'End date is required' })
      .regex(DATE_REGEX, 'End date must be in YYYY-MM-DD format'),

    halfDayStart: z.boolean().optional().default(false),

    halfDayEnd: z.boolean().optional().default(false),

    reason: z
      .string()
      .max(500, 'Reason must not exceed 500 characters')
      .transform((v) => v.trim())
      .nullish()
      .transform((v) => v ?? null),
  })
  .refine(
    (body) => body.startDate <= body.endDate,
    { message: 'End date must be on or after start date', path: ['endDate'] },
  );

export type CreateLeaveRequestBody = z.infer<typeof createLeaveRequestBodySchema>;

/**
 * GET /leave-requests/validate query parameters.
 * Used for real-time form feedback without submitting.
 */
export const validateLeaveRequestBodySchema = z
  .object({
    leaveTypeId: mongoIdSchema.describe('Leave type identifier (required)'),

    startDate: z
      .string({ required_error: 'Start date is required' })
      .regex(DATE_REGEX, 'Start date must be in YYYY-MM-DD format'),

    endDate: z
      .string({ required_error: 'End date is required' })
      .regex(DATE_REGEX, 'End date must be in YYYY-MM-DD format'),

    halfDayStart: z
      .string()
      .transform((v) => v === 'true')
      .pipe(z.boolean())
      .optional()
      .default('false'),

    halfDayEnd: z
      .string()
      .transform((v) => v === 'true')
      .pipe(z.boolean())
      .optional()
      .default('false'),
  })
  .refine(
    (body) => body.startDate <= body.endDate,
    { message: 'End date must be on or after start date', path: ['endDate'] },
  );

export type ValidateLeaveRequestBody = z.infer<typeof validateLeaveRequestBodySchema>;

/**
 * DELETE /leave-requests/:requestId — cancel a leave request.
 */
export const cancelLeaveRequestBodySchema = z.object({
  reason: z
    .string()
    .max(500, 'Cancellation reason must not exceed 500 characters')
    .transform((v) => v.trim())
    .nullish()
    .transform((v) => v ?? null),
});

export type CancelLeaveRequestBody = z.infer<typeof cancelLeaveRequestBodySchema>;
