/**
 * Tenant request validation schemas.
 */

import { z } from 'zod';

const workWeekSchema = z.object({
  monday: z.boolean(),
  tuesday: z.boolean(),
  wednesday: z.boolean(),
  thursday: z.boolean(),
  friday: z.boolean(),
  saturday: z.boolean(),
  sunday: z.boolean(),
});

/**
 * PATCH /tenants/me — update tenant settings (all fields optional).
 */
export const updateTenantBodySchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name must not be empty')
      .max(100, 'Name must not exceed 100 characters')
      .transform((v) => v.trim())
      .optional(),

    timezone: z
      .string()
      .max(64, 'Timezone must not exceed 64 characters')
      .optional(),

    fiscalYearStartMonth: z
      .number()
      .int('Fiscal year start month must be an integer')
      .min(1, 'Fiscal year start month must be between 1 and 12')
      .max(12, 'Fiscal year start month must be between 1 and 12')
      .optional(),

    workWeek: workWeekSchema.optional(),

    minimumCoveragePercent: z
      .number()
      .int('Coverage percent must be an integer')
      .min(0, 'Coverage percent must be between 0 and 100')
      .max(100, 'Coverage percent must be between 0 and 100')
      .optional(),
  })
  .strict();

export type UpdateTenantBody = z.infer<typeof updateTenantBodySchema>;

/**
 * Tenant settings sub-object schema (used in onboarding step 1).
 */
export const tenantSettingsBodySchema = z.object({
  timezone: z.string().max(64, 'Timezone must not exceed 64 characters'),
  fiscalYearStartMonth: z
    .number()
    .int('Fiscal year start month must be an integer')
    .min(1, 'Fiscal year start month must be between 1 and 12')
    .max(12, 'Fiscal year start month must be between 1 and 12'),
  workWeek: workWeekSchema,
  coverageMinimumPercent: z
    .number()
    .int('Coverage percent must be an integer')
    .min(0, 'Coverage percent must be between 0 and 100')
    .max(100, 'Coverage percent must be between 0 and 100')
    .optional()
    .default(50),
  locale: z.string().max(10, 'Locale must not exceed 10 characters').optional().default('en'),
  announcementChannelEnabled: z.boolean().optional().default(true),
});

export type TenantSettingsBody = z.infer<typeof tenantSettingsBodySchema>;
