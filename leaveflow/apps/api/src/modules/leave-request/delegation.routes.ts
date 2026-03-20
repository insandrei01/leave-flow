/**
 * Delegation routes.
 *
 * POST   /delegations        — create a new delegation
 * GET    /delegations/active — current user's active delegations
 * DELETE /delegations/:id    — revoke a delegation
 */

import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { z } from "zod";
import { sendCreated, sendSuccess, sendNoContent } from "../../lib/response.js";
import { ValidationError } from "../../lib/errors.js";
import type { DelegationService } from "./delegation.service.js";

// ----------------------------------------------------------------
// Schemas
// ----------------------------------------------------------------

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const createDelegationBodySchema = z.object({
  delegateId: z
    .string({ required_error: "delegateId is required" })
    .regex(/^[0-9a-fA-F]{24}$/, "delegateId must be a valid MongoDB ObjectId"),

  startDate: z
    .string({ required_error: "startDate is required" })
    .regex(DATE_REGEX, "startDate must be in YYYY-MM-DD format")
    .transform((v) => new Date(v)),

  endDate: z
    .string({ required_error: "endDate is required" })
    .regex(DATE_REGEX, "endDate must be in YYYY-MM-DD format")
    .transform((v) => new Date(v)),

  reason: z.string().max(500).nullish().transform((v) => v ?? null),
});

const delegationIdParamsSchema = z.object({
  id: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      "Must be a valid MongoDB ObjectId (24-char hex)"
    ),
});

type CreateDelegationBody = z.infer<typeof createDelegationBodySchema>;

// ----------------------------------------------------------------
// Handlers
// ----------------------------------------------------------------

function makeCreateHandler(delegationService: DelegationService) {
  return async function createHandler(
    request: FastifyRequest<{ Body: CreateDelegationBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const body = createDelegationBodySchema.parse(request.body);
    const { tenantId, employeeId } = request.auth!;

    if (body.startDate >= body.endDate) {
      throw new ValidationError("startDate must be before endDate");
    }

    const result = await delegationService.create(tenantId, {
      delegatorId: employeeId,
      delegateId: body.delegateId,
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason,
    });

    sendCreated(reply, result);
  };
}

function makeActiveHandler(delegationService: DelegationService) {
  return async function activeHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const { tenantId, employeeId } = request.auth!;
    const delegations = await delegationService.findActive(tenantId, employeeId);
    sendSuccess(reply, delegations);
  };
}

function makeRemoveHandler(delegationService: DelegationService) {
  return async function removeHandler(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = delegationIdParamsSchema.parse(request.params);
    const { tenantId, employeeId } = request.auth!;
    await delegationService.remove(tenantId, id, employeeId);
    sendNoContent(reply);
  };
}

// ----------------------------------------------------------------
// Route plugin
// ----------------------------------------------------------------

export async function delegationRoutes(
  fastify: FastifyInstance,
  opts: { delegationService: DelegationService }
): Promise<void> {
  const { delegationService } = opts;

  fastify.post("/delegations", {}, makeCreateHandler(delegationService));
  fastify.get(
    "/delegations/active",
    {},
    makeActiveHandler(delegationService)
  );
  fastify.delete(
    "/delegations/:id",
    {},
    makeRemoveHandler(delegationService)
  );
}
