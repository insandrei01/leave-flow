/**
 * Route-level Zod schemas for leave-type routes.
 */

import { z } from "zod";
import {
  createLeaveTypeBodySchema,
  updateLeaveTypeBodySchema,
} from "@leaveflow/validation";

export { createLeaveTypeBodySchema, updateLeaveTypeBodySchema };

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const leaveTypeParamsSchema = z.object({
  id: z.string().regex(MONGO_ID_REGEX, "Must be a valid MongoDB ObjectId"),
});

export type LeaveTypeParams = z.infer<typeof leaveTypeParamsSchema>;
export type CreateLeaveTypeBody = z.infer<typeof createLeaveTypeBodySchema>;
export type UpdateLeaveTypeBody = z.infer<typeof updateLeaveTypeBodySchema>;
