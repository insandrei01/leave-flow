/**
 * Route-level Zod schemas for workflow routes.
 */

import { z } from "zod";
import {
  createWorkflowBodySchema,
  updateWorkflowBodySchema,
} from "@leaveflow/validation";

export { createWorkflowBodySchema, updateWorkflowBodySchema };

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const workflowParamsSchema = z.object({
  id: z.string().regex(MONGO_ID_REGEX, "Must be a valid MongoDB ObjectId"),
});

export const fromTemplateBodySchema = z.object({
  templateType: z.enum(["simple", "standard", "enterprise"], {
    errorMap: () => ({
      message: "templateType must be one of: simple, standard, enterprise",
    }),
  }),
  name: z
    .string({ required_error: "Workflow name is required" })
    .min(1, "Workflow name must not be empty")
    .max(100, "Workflow name must not exceed 100 characters")
    .transform((v) => v.trim()),
});

export const cloneWorkflowBodySchema = z.object({
  name: z
    .string({ required_error: "New workflow name is required" })
    .min(1, "Name must not be empty")
    .max(100, "Name must not exceed 100 characters")
    .transform((v) => v.trim()),
});

export const testWorkflowBodySchema = z.object({
  employeeId: z
    .string()
    .regex(MONGO_ID_REGEX, "employeeId must be a valid ObjectId")
    .optional(),
  leaveTypeId: z
    .string()
    .regex(MONGO_ID_REGEX, "leaveTypeId must be a valid ObjectId")
    .optional(),
});

export type WorkflowParams = z.infer<typeof workflowParamsSchema>;
export type FromTemplateBody = z.infer<typeof fromTemplateBodySchema>;
export type CloneWorkflowBody = z.infer<typeof cloneWorkflowBodySchema>;
export type TestWorkflowBody = z.infer<typeof testWorkflowBodySchema>;
export type CreateWorkflowBody = z.infer<typeof createWorkflowBodySchema>;
export type UpdateWorkflowBody = z.infer<typeof updateWorkflowBodySchema>;
