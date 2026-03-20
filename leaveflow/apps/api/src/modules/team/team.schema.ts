/**
 * Route-level Zod schemas for team routes.
 */

import { z } from "zod";
import { createTeamBodySchema, updateTeamBodySchema } from "@leaveflow/validation";

export { createTeamBodySchema, updateTeamBodySchema };

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const teamParamsSchema = z.object({
  id: z.string().regex(MONGO_ID_REGEX, "Must be a valid MongoDB ObjectId"),
});

export type TeamParams = z.infer<typeof teamParamsSchema>;
export type CreateTeamBody = z.infer<typeof createTeamBodySchema>;
export type UpdateTeamBody = z.infer<typeof updateTeamBodySchema>;
