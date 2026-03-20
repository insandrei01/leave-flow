/**
 * Team routes.
 *
 * GET    /teams               — list all (any auth)
 * GET    /teams/:id           — get by ID (any auth)
 * GET    /teams/:id/members   — list members (any auth)
 * POST   /teams               — create (hr_admin+)
 * PATCH  /teams/:id           — update (hr_admin+)
 * DELETE /teams/:id           — delete (hr_admin+)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../../lib/errors.js";
import type { TeamService } from "./team.service.js";
import {
  createTeamBodySchema,
  updateTeamBodySchema,
  teamParamsSchema,
} from "./team.schema.js";
import { buildSuccessResponse } from "../../lib/pagination.js";

// ----------------------------------------------------------------
// Authorization
// ----------------------------------------------------------------

const HR_PLUS_ROLES = new Set(["company_admin", "hr_admin"]);

function assertRole(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: Set<string>
): boolean {
  const role = request.auth?.role;
  if (role === undefined || !allowedRoles.has(role)) {
    void reply.code(403).send({
      success: false,
      data: null,
      error: { code: "FORBIDDEN", message: "Insufficient permissions", details: null },
      meta: null,
    });
    return false;
  }
  return true;
}

function handleError(err: unknown, reply: FastifyReply): void {
  if (err instanceof ZodError) {
    void reply.code(422).send({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      meta: null,
    });
    return;
  }
  if (err instanceof AppError) {
    void reply.code(err.statusCode).send({
      success: false,
      data: null,
      error: { code: err.code, message: err.message, details: err.details ?? null },
      meta: null,
    });
    return;
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  if (message.toLowerCase().includes("not found")) {
    void reply.code(404).send({
      success: false,
      data: null,
      error: { code: "NOT_FOUND", message, details: null },
      meta: null,
    });
    return;
  }
  if (message.toLowerCase().includes("already exists")) {
    void reply.code(409).send({
      success: false,
      data: null,
      error: { code: "CONFLICT", message, details: null },
      meta: null,
    });
    return;
  }
  reply.log.error({ err }, "Unhandled error in team routes");
  void reply.code(500).send({
    success: false,
    data: null,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", details: null },
    meta: null,
  });
}

// ----------------------------------------------------------------
// Route factory
// ----------------------------------------------------------------

export function createTeamRoutes(service: TeamService) {
  return async function teamRoutes(app: FastifyInstance): Promise<void> {
    // GET /teams
    app.get(
      "/teams",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const tenantId = request.auth!.tenantId;
        try {
          const items = await service.findAll(tenantId);
          return reply.code(200).send(buildSuccessResponse(items));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // GET /teams/:id
    app.get(
      "/teams/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        let params: { id: string };
        try {
          params = teamParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }
        const tenantId = request.auth!.tenantId;
        try {
          const item = await service.findById(tenantId, params.id);
          return reply.code(200).send(buildSuccessResponse(item));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // GET /teams/:id/members
    app.get(
      "/teams/:id/members",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        let params: { id: string };
        try {
          params = teamParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }
        const tenantId = request.auth!.tenantId;
        try {
          const members = await service.findMembers(tenantId, params.id);
          return reply.code(200).send(buildSuccessResponse(members));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // POST /teams
    app.post(
      "/teams",
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let body: unknown;
        try {
          body = createTeamBodySchema.parse(request.body);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        try {
          const created = await service.create(
            tenantId,
            body as Parameters<typeof service.create>[1]
          );
          return reply.code(201).send(buildSuccessResponse(created));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // PATCH /teams/:id
    app.patch(
      "/teams/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let params: { id: string };
        try {
          params = teamParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        let body: unknown;
        try {
          body = updateTeamBodySchema.parse(request.body);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        try {
          const updated = await service.update(
            tenantId,
            params.id,
            body as Parameters<typeof service.update>[2]
          );
          return reply.code(200).send(buildSuccessResponse(updated));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // DELETE /teams/:id
    app.delete(
      "/teams/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let params: { id: string };
        try {
          params = teamParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        try {
          await service.delete(tenantId, params.id);
          return reply.code(204).send();
        } catch (err) {
          handleError(err, reply);
        }
      }
    );
  };
}
