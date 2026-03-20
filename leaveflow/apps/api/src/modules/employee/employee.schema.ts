/**
 * Route-level Zod schemas for employee routes.
 */

import { z } from "zod";
import {
  createEmployeeBodySchema,
  updateEmployeeBodySchema,
  csvImportBodySchema,
  paginationQuerySchema,
} from "@leaveflow/validation";

export {
  createEmployeeBodySchema,
  updateEmployeeBodySchema,
  csvImportBodySchema,
};

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const employeeParamsSchema = z.object({
  id: z.string().regex(MONGO_ID_REGEX, "Must be a valid MongoDB ObjectId"),
});

export const employeeListQuerySchema = paginationQuerySchema.extend({
  teamId: z
    .string()
    .regex(MONGO_ID_REGEX, "teamId must be a valid ObjectId")
    .optional(),
  role: z
    .enum(["employee", "manager", "hr_admin", "company_admin"])
    .optional(),
  status: z.enum(["active", "inactive", "invited"]).optional(),
});

export type EmployeeParams = z.infer<typeof employeeParamsSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
export type CreateEmployeeBody = z.infer<typeof createEmployeeBodySchema>;
export type UpdateEmployeeBody = z.infer<typeof updateEmployeeBodySchema>;
export type CsvImportBody = z.infer<typeof csvImportBodySchema>;
