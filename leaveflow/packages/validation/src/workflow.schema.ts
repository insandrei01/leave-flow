/**
 * Workflow request validation schemas.
 */

import { z } from 'zod';

const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const mongoIdSchema = z
  .string()
  .regex(MONGO_OBJECT_ID_REGEX, 'Must be a valid MongoDB ObjectId (24-char hex)');

const approverTypeSchema = z.enum(
  ['specific_user', 'role_direct_manager', 'role_team_lead', 'role_hr', 'group'],
  {
    errorMap: () => ({
      message:
        "Approver type must be one of: 'specific_user', 'role_direct_manager', 'role_team_lead', 'role_hr', 'group'",
    }),
  },
);

const escalationActionSchema = z.enum(
  ['escalate_next', 'remind', 'auto_approve', 'notify_hr', 'none'],
  {
    errorMap: () => ({
      message:
        "Escalation action must be one of: 'escalate_next', 'remind', 'auto_approve', 'notify_hr', 'none'",
    }),
  },
);

/**
 * Individual workflow step schema.
 */
export const workflowStepSchema = z
  .object({
    order: z
      .number({ required_error: 'Step order is required' })
      .int('Step order must be an integer')
      .min(0, 'Step order must be 0 or greater'),

    approverType: approverTypeSchema,

    approverUserId: mongoIdSchema
      .nullish()
      .transform((v) => v ?? null),

    approverGroupIds: z
      .array(mongoIdSchema)
      .nullish()
      .transform((v) => v ?? null),

    timeoutHours: z
      .number()
      .int('Timeout hours must be an integer')
      .min(1, 'Timeout hours must be at least 1')
      .max(720, 'Timeout hours must not exceed 720 (30 days)')
      .optional()
      .default(48),

    escalationAction: escalationActionSchema.optional().default('remind'),

    maxReminders: z
      .number()
      .int('Max reminders must be an integer')
      .min(0, 'Max reminders must be 0 or greater')
      .max(10, 'Max reminders must not exceed 10')
      .optional()
      .default(3),

    allowDelegation: z.boolean().optional().default(true),
  })
  .refine(
    (step) => {
      if (step.approverType === 'specific_user' && step.approverUserId === null) {
        return false;
      }
      return true;
    },
    { message: 'approverUserId is required when approverType is specific_user' },
  );

export type WorkflowStep = z.infer<typeof workflowStepSchema>;

const workflowBaseSchema = z.object({
  name: z
    .string({ required_error: 'Workflow name is required' })
    .min(1, 'Workflow name must not be empty')
    .max(100, 'Workflow name must not exceed 100 characters')
    .transform((v) => v.trim()),

  steps: z
    .array(workflowStepSchema, { required_error: 'Steps array is required' })
    .min(1, 'Workflow must have at least one step')
    .max(20, 'Workflow must not exceed 20 steps'),
});

/**
 * POST /workflows — create a new workflow definition.
 */
export const createWorkflowBodySchema = workflowBaseSchema;

export type CreateWorkflowBody = z.infer<typeof createWorkflowBodySchema>;

/**
 * PUT /workflows/:workflowId — replace all workflow steps (increments version).
 */
export const updateWorkflowBodySchema = workflowBaseSchema;

export type UpdateWorkflowBody = z.infer<typeof updateWorkflowBodySchema>;
