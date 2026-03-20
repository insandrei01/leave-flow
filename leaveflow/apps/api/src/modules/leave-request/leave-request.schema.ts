/**
 * Route-level Zod schemas for leave-request routes.
 */

import { z } from "zod";
import {
  createLeaveRequestBodySchema,
  cancelLeaveRequestBodySchema,
  paginationQuerySchema,
} from "@leaveflow/validation";

export { createLeaveRequestBodySchema, cancelLeaveRequestBodySchema };

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const leaveRequestParamsSchema = z.object({
  id: z.string().regex(MONGO_ID_REGEX, "Must be a valid MongoDB ObjectId"),
});

export const leaveRequestListQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      "draft",
      "pending_approval",
      "approved",
      "auto_approved",
      "rejected",
      "cancelled",
      "cancellation_pending",
    ])
    .optional(),
  employeeId: z
    .string()
    .regex(MONGO_ID_REGEX, "employeeId must be a valid ObjectId")
    .optional(),
  teamId: z
    .string()
    .regex(MONGO_ID_REGEX, "teamId must be a valid ObjectId")
    .optional(),
  startDateFrom: z
    .string()
    .regex(DATE_REGEX, "startDateFrom must be YYYY-MM-DD")
    .optional(),
  startDateTo: z
    .string()
    .regex(DATE_REGEX, "startDateTo must be YYYY-MM-DD")
    .optional(),
});

export const validateLeaveRequestBodySchema = z
  .object({
    leaveTypeId: z
      .string()
      .regex(MONGO_ID_REGEX, "leaveTypeId must be a valid ObjectId"),
    startDate: z
      .string({ required_error: "Start date is required" })
      .regex(DATE_REGEX, "Start date must be in YYYY-MM-DD format"),
    endDate: z
      .string({ required_error: "End date is required" })
      .regex(DATE_REGEX, "End date must be in YYYY-MM-DD format"),
    halfDayStart: z.boolean().optional().default(false),
    halfDayEnd: z.boolean().optional().default(false),
  })
  .refine((b) => b.startDate <= b.endDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export type LeaveRequestParams = z.infer<typeof leaveRequestParamsSchema>;
export type LeaveRequestListQuery = z.infer<typeof leaveRequestListQuerySchema>;
export type CreateLeaveRequestBody = z.infer<typeof createLeaveRequestBodySchema>;
export type CancelLeaveRequestBody = z.infer<typeof cancelLeaveRequestBodySchema>;
export type ValidateLeaveRequestBody = z.infer<typeof validateLeaveRequestBodySchema>;
