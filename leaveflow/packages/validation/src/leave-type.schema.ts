/**
 * LeaveType request validation schemas.
 */

import { z } from 'zod';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const accrualTypeSchema = z.enum(['front_loaded', 'monthly', 'quarterly', 'custom', 'none'], {
  errorMap: () => ({
    message:
      "Accrual type must be one of: 'front_loaded', 'monthly', 'quarterly', 'custom', 'none'",
  }),
});

const accrualRuleSchema = z.object({
  type: accrualTypeSchema,
  dayOfMonth: z
    .number()
    .int('Day of month must be an integer')
    .min(1, 'Day of month must be between 1 and 31')
    .max(31, 'Day of month must be between 1 and 31')
    .nullable()
    .optional()
    .default(null),
  customSchedule: z
    .array(
      z.object({
        month: z.number().int().min(1).max(12),
        day: z.number().int().min(1).max(31),
        amount: z.number().positive('Accrual amount must be positive'),
      }),
    )
    .nullable()
    .optional()
    .default(null),
});

const carryoverRuleSchema = z.object({
  enabled: z.boolean().optional().default(false),
  maxDays: z
    .number()
    .int('Max carryover days must be an integer')
    .min(0, 'Max carryover days must be 0 or greater')
    .nullable()
    .optional()
    .default(null),
  expiryMonths: z
    .number()
    .int('Expiry months must be an integer')
    .min(1, 'Expiry months must be at least 1')
    .nullable()
    .optional()
    .default(null),
});

const leaveTypeBaseSchema = z.object({
  name: z
    .string({ required_error: 'Leave type name is required' })
    .min(1, 'Leave type name must not be empty')
    .max(50, 'Leave type name must not exceed 50 characters')
    .transform((v) => v.trim()),

  color: z
    .string()
    .regex(HEX_COLOR_REGEX, 'Color must be a valid 6-digit hex color (e.g. #818CF8)')
    .optional()
    .default('#818CF8'),

  icon: z
    .string()
    .max(50, 'Icon identifier must not exceed 50 characters')
    .optional()
    .default('calendar'),

  isPaid: z.boolean({ required_error: 'isPaid is required' }),

  requiresApproval: z.boolean({ required_error: 'requiresApproval is required' }),

  defaultEntitlementDays: z
    .number()
    .min(0, 'Default entitlement days must be 0 or greater')
    .max(365, 'Default entitlement days must not exceed 365')
    .optional()
    .default(20),

  allowNegativeBalance: z.boolean().optional().default(false),

  accrualRule: accrualRuleSchema.optional(),

  carryoverRule: carryoverRuleSchema.optional(),

  isUnlimited: z.boolean().optional().default(false),

  isRetroactiveAllowed: z.boolean().optional().default(false),

  sortOrder: z.number().int().min(0).optional().default(0),
});

/**
 * POST /leave-types — create a custom leave type.
 */
export const createLeaveTypeBodySchema = leaveTypeBaseSchema;

export type CreateLeaveTypeBody = z.infer<typeof createLeaveTypeBodySchema>;

/**
 * PATCH /leave-types/:leaveTypeId — update a leave type (all fields optional).
 */
export const updateLeaveTypeBodySchema = leaveTypeBaseSchema
  .partial()
  .extend({
    name: z
      .string()
      .min(1, 'Leave type name must not be empty')
      .max(50, 'Leave type name must not exceed 50 characters')
      .transform((v) => v.trim())
      .optional(),
  });

export type UpdateLeaveTypeBody = z.infer<typeof updateLeaveTypeBodySchema>;
