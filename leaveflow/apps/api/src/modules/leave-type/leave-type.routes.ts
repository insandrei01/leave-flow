/**
 * Leave type routes.
 *
 * GET    /leave-types        — list all (any auth)
 * GET    /leave-types/:id    — get by ID (any auth)
 * POST   /leave-types        — create (hr_admin+)
 * PATCH  /leave-types/:id    — update (hr_admin+)
 * DELETE /leave-types/:id    — delete (hr_admin+)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../../lib/errors.js";
import type { LeaveTypeService } from "./leave-type.service.js";
import {
  createLeaveTypeBodySchema,
  updateLeaveTypeBodySchema,
  leaveTypeParamsSchema,
} from "./leave-type.schema.js";
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
      error: {
        code: "FORBIDDEN",
        message: "Insufficient permissions",
        details: null,
      },
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
  reply.log.error({ err }, "Unhandled error in leave-type routes");
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

export function createLeaveTypeRoutes(service: LeaveTypeService) {
  return async function leaveTypeRoutes(app: FastifyInstance): Promise<void> {
    // GET /leave-types
    app.get(
      "/leave-types",
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

    // GET /leave-types/:id
    app.get(
      "/leave-types/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        let params: { id: string };
        try {
          params = leaveTypeParamsSchema.parse(request.params);
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

    // POST /leave-types
    app.post(
      "/leave-types",
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let body: unknown;
        try {
          body = createLeaveTypeBodySchema.parse(request.body);
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

    // PATCH /leave-types/:id
    app.patch(
      "/leave-types/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let params: { id: string };
        try {
          params = leaveTypeParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        let body: unknown;
        try {
          body = updateLeaveTypeBodySchema.parse(request.body);
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

    // DELETE /leave-types/:id
    app.delete(
      "/leave-types/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let params: { id: string };
        try {
          params = leaveTypeParamsSchema.parse(request.params);
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
