/**
 * Onboarding wizard step validation schemas (steps 1–6).
 * Each step is idempotent and persists partial state.
 */

import { z } from 'zod';

const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

const mongoIdSchema = z
  .string()
  .regex(MONGO_OBJECT_ID_REGEX, 'Must be a valid MongoDB ObjectId (24-char hex)');

/**
 * PUT /onboarding/steps/1 — Company Profile.
 */
export const onboardingStep1Schema = z.object({
  timezone: z
    .string({ required_error: 'Timezone is required' })
    .max(64, 'Timezone must not exceed 64 characters'),

  fiscalYearStartMonth: z
    .number({ required_error: 'Fiscal year start month is required' })
    .int('Fiscal year start month must be an integer')
    .min(1, 'Fiscal year start month must be between 1 and 12')
    .max(12, 'Fiscal year start month must be between 1 and 12'),

  workWeek: z.object({
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
    sunday: z.boolean(),
  }),

  country: z
    .string({ required_error: 'Country code is required' })
    .regex(ISO_COUNTRY_CODE_REGEX, 'Country must be a 2-letter ISO 3166-1 alpha-2 code'),
});

export type OnboardingStep1Body = z.infer<typeof onboardingStep1Schema>;

/**
 * PUT /onboarding/steps/2 — Leave Types.
 */
const leaveTypeEntrySchema = z.object({
  name: z
    .string({ required_error: 'Leave type name is required' })
    .min(1, 'Leave type name must not be empty')
    .max(50, 'Leave type name must not exceed 50 characters')
    .transform((v) => v.trim()),

  color: z.string().optional().default('#818CF8'),

  isPaid: z.boolean({ required_error: 'isPaid is required' }),

  requiresApproval: z.boolean({ required_error: 'requiresApproval is required' }),

  defaultEntitlementDays: z
    .number()
    .min(0, 'Default entitlement days must be 0 or greater')
    .max(365, 'Default entitlement days must not exceed 365'),
});

export const onboardingStep2Schema = z.object({
  leaveTypes: z
    .array(leaveTypeEntrySchema)
    .min(1, 'At least one leave type is required')
    .max(20, 'Must not exceed 20 leave types'),
});

export type OnboardingStep2Body = z.infer<typeof onboardingStep2Schema>;

/**
 * PUT /onboarding/steps/3 — Workflow.
 * Either templateId or customSteps must be provided.
 */
const customStepEntrySchema = z.object({
  order: z.number().int().min(0),
  approverType: z.enum([
    'specific_user',
    'role_direct_manager',
    'role_team_lead',
    'role_hr',
    'group',
  ]),
  timeoutHours: z.number().int().min(1).max(720).optional().default(48),
  escalationMode: z
    .enum(['escalate_next', 'remind', 'auto_approve', 'notify_hr', 'none'])
    .optional()
    .default('remind'),
  maxReminders: z.number().int().min(0).max(10).optional().default(3),
  allowDelegation: z.boolean().optional().default(true),
});

export const onboardingStep3Schema = z
  .object({
    templateId: z.string().nullable().optional(),
    workflowName: z
      .string({ required_error: 'Workflow name is required' })
      .min(1, 'Workflow name must not be empty')
      .max(100, 'Workflow name must not exceed 100 characters')
      .transform((v) => v.trim()),
    customSteps: z.array(customStepEntrySchema).nullable().optional(),
  })
  .refine(
    (body) =>
      (body.templateId !== null && body.templateId !== undefined) ||
      (body.customSteps !== null && body.customSteps !== undefined && body.customSteps.length > 0),
    { message: 'Either a templateId or at least one customStep must be provided' },
  );

export type OnboardingStep3Body = z.infer<typeof onboardingStep3Schema>;

/**
 * PUT /onboarding/steps/4 — Teams.
 */
const teamEntrySchema = z.object({
  name: z
    .string({ required_error: 'Team name is required' })
    .min(1, 'Team name must not be empty')
    .max(100, 'Team name must not exceed 100 characters')
    .transform((v) => v.trim()),

  workflowId: mongoIdSchema
    .nullish()
    .transform((v) => v ?? null),
});

export const onboardingStep4Schema = z.object({
  teams: z
    .array(teamEntrySchema)
    .min(1, 'At least one team is required')
    .max(100, 'Must not exceed 100 teams'),
});

export type OnboardingStep4Body = z.infer<typeof onboardingStep4Schema>;

/**
 * PUT /onboarding/steps/5 — Employees.
 */
const employeeEntrySchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.string().email('Must be a valid email address')),

  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .transform((v) => v.trim()),

  teamId: mongoIdSchema
    .nullish()
    .transform((v) => v ?? null),

  role: z
    .enum(['employee', 'manager', 'hr_admin', 'company_admin'])
    .optional()
    .default('employee'),

  startDate: z
    .string({ required_error: 'Start date is required' })
    .regex(DATE_REGEX, 'Start date must be in YYYY-MM-DD format'),
});

export const onboardingStep5Schema = z.object({
  employees: z
    .array(employeeEntrySchema)
    .min(0)
    .max(500, 'Must not exceed 500 employees in a single step'),
});

export type OnboardingStep5Body = z.infer<typeof onboardingStep5Schema>;

/**
 * PUT /onboarding/steps/6 — Holidays.
 */
const customHolidayEntrySchema = z.object({
  date: z
    .string({ required_error: 'Holiday date is required' })
    .regex(DATE_REGEX, 'Holiday date must be in YYYY-MM-DD format'),

  name: z
    .string({ required_error: 'Holiday name is required' })
    .min(1, 'Holiday name must not be empty')
    .max(100, 'Holiday name must not exceed 100 characters')
    .transform((v) => v.trim()),
});

export const onboardingStep6Schema = z.object({
  countryCode: z
    .string({ required_error: 'Country code is required' })
    .regex(ISO_COUNTRY_CODE_REGEX, 'Country must be a 2-letter ISO 3166-1 alpha-2 code'),

  year: z
    .number({ required_error: 'Year is required' })
    .int('Year must be an integer')
    .min(2020, 'Year must be 2020 or later')
    .max(2100, 'Year must be 2100 or earlier'),

  customHolidays: z.array(customHolidayEntrySchema).optional().default([]),
});

export type OnboardingStep6Body = z.infer<typeof onboardingStep6Schema>;
