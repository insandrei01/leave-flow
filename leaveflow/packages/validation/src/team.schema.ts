/**
 * Team request validation schemas.
 */

import { z } from 'zod';

const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const mongoIdSchema = z
  .string()
  .regex(MONGO_OBJECT_ID_REGEX, 'Must be a valid MongoDB ObjectId (24-char hex)');

/**
 * POST /teams — create a team.
 */
export const createTeamBodySchema = z.object({
  name: z
    .string({ required_error: 'Team name is required' })
    .min(1, 'Team name must not be empty')
    .max(100, 'Team name must not exceed 100 characters')
    .transform((v) => v.trim()),

  managerId: mongoIdSchema
    .nullish()
    .transform((v) => v ?? null),

  workflowId: mongoIdSchema
    .nullish()
    .transform((v) => v ?? null),
});

export type CreateTeamBody = z.infer<typeof createTeamBodySchema>;

/**
 * PATCH /teams/:teamId — update team name, manager, or assigned workflow (all optional).
 */
export const updateTeamBodySchema = z
  .object({
    name: z
      .string()
      .min(1, 'Team name must not be empty')
      .max(100, 'Team name must not exceed 100 characters')
      .transform((v) => v.trim())
      .optional(),

    managerId: mongoIdSchema.nullable().optional(),

    workflowId: mongoIdSchema.nullable().optional(),
  })
  .strict();

export type UpdateTeamBody = z.infer<typeof updateTeamBodySchema>;
