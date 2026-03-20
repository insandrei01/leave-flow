/**
 * Route-level Zod schemas for balance routes.
 */

import { z } from "zod";
import { manualAdjustmentBodySchema, paginationQuerySchema } from "@leaveflow/validation";

export { manualAdjustmentBodySchema };

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const employeeIdParamsSchema = z.object({
  employeeId: z
    .string()
    .regex(MONGO_ID_REGEX, "employeeId must be a valid MongoDB ObjectId"),
});

export const employeeLeaveTypeParamsSchema = z.object({
  employeeId: z
    .string()
    .regex(MONGO_ID_REGEX, "employeeId must be a valid MongoDB ObjectId"),
  leaveTypeId: z
    .string()
    .regex(MONGO_ID_REGEX, "leaveTypeId must be a valid MongoDB ObjectId"),
});

export const balanceHistoryQuerySchema = paginationQuerySchema;

export type EmployeeIdParams = z.infer<typeof employeeIdParamsSchema>;
export type EmployeeLeaveTypeParams = z.infer<
  typeof employeeLeaveTypeParamsSchema
>;
export type ManualAdjustmentBody = z.infer<typeof manualAdjustmentBodySchema>;
