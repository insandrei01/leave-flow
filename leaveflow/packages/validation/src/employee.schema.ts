/**
 * Employee request validation schemas.
 */

import { z } from 'zod';

const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const mongoIdSchema = z
  .string()
  .regex(MONGO_OBJECT_ID_REGEX, 'Must be a valid MongoDB ObjectId (24-char hex)');

const roleLiteralSchema = z.enum(['employee', 'manager', 'hr_admin', 'company_admin'], {
  errorMap: () => ({
    message: "Role must be one of: 'employee', 'manager', 'hr_admin', 'company_admin'",
  }),
});

/**
 * POST /employees — create a single employee.
 */
export const createEmployeeBodySchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.string().email('Must be a valid email address')),

  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .transform((v) => v.trim()),

  role: roleLiteralSchema.optional().default('employee'),

  teamId: mongoIdSchema
    .nullish()
    .transform((v) => v ?? null),

  startDate: z
    .string({ required_error: 'Start date is required' })
    .regex(DATE_REGEX, 'Start date must be in YYYY-MM-DD format'),

  managerId: mongoIdSchema
    .nullish()
    .transform((v) => v ?? null),
});

export type CreateEmployeeBody = z.infer<typeof createEmployeeBodySchema>;

/**
 * PATCH /employees/:employeeId — update an employee record (all fields optional).
 */
export const updateEmployeeBodySchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters')
      .transform((v) => v.trim())
      .optional(),

    role: roleLiteralSchema.optional(),

    teamId: mongoIdSchema.nullable().optional(),

    managerId: mongoIdSchema.nullable().optional(),

    startDate: z
      .string()
      .regex(DATE_REGEX, 'Start date must be in YYYY-MM-DD format')
      .optional(),

    status: z
      .enum(['active', 'inactive'], {
        errorMap: () => ({ message: "Status must be 'active' or 'inactive'" }),
      })
      .optional(),
  })
  .strict();

export type UpdateEmployeeBody = z.infer<typeof updateEmployeeBodySchema>;

/**
 * POST /employees/import — CSV bulk import metadata (the file itself is multipart).
 */
export const csvImportBodySchema = z.object({
  sendInvitations: z
    .boolean({ required_error: 'sendInvitations flag is required' })
    .default(true),
});

export type CsvImportBody = z.infer<typeof csvImportBodySchema>;
