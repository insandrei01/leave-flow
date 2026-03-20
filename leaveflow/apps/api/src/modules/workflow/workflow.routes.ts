/**
 * Workflow routes.
 *
 * GET  /workflows                  — list (any auth)
 * GET  /workflows/:id              — get by ID (any auth)
 * POST /workflows                  — create (hr_admin+)
 * PATCH /workflows/:id             — update with version increment (hr_admin+)
 * DELETE /workflows/:id            — delete if no teams assigned (hr_admin+)
 * POST /workflows/from-template    — instantiate template (hr_admin+)
 * POST /workflows/:id/clone        — clone (hr_admin+)
 * POST /workflows/:id/test         — dry-run simulation (hr_admin+)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../../lib/errors.js";
import type { WorkflowService } from "./workflow.service.js";
import {
  createWorkflowBodySchema,
  updateWorkflowBodySchema,
  workflowParamsSchema,
  fromTemplateBodySchema,
  cloneWorkflowBodySchema,
  testWorkflowBodySchema,
} from "./workflow.schema.js";
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
  if (message.toLowerCase().includes("cannot delete") || message.toLowerCase().includes("assigned")) {
    void reply.code(409).send({
      success: false,
      data: null,
      error: { code: "CONFLICT", message, details: null },
      meta: null,
    });
    return;
  }
  reply.log.error({ err }, "Unhandled error in workflow routes");
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

export function createWorkflowRoutes(service: WorkflowService) {
  return async function workflowRoutes(app: FastifyInstance): Promise<void> {
    // GET /workflows
    app.get(
      "/workflows",
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

    // POST /workflows/from-template — must be before /workflows/:id
    app.post(
      "/workflows/from-template",
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let body: { templateType: "simple" | "standard" | "enterprise"; name: string };
        try {
          body = fromTemplateBodySchema.parse(request.body);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        try {
          const created = await service.createFromTemplate(
            tenantId,
            body.templateType,
            body.name
          );
          return reply.code(201).send(buildSuccessResponse(created));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // GET /workflows/:id
    app.get(
      "/workflows/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        let params: { id: string };
        try {
          params = workflowParamsSchema.parse(request.params);
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

    // POST /workflows
    app.post(
      "/workflows",
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let body: unknown;
        try {
          body = createWorkflowBodySchema.parse(request.body);
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

    // PATCH /workflows/:id
    app.patch(
      "/workflows/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let params: { id: string };
        try {
          params = workflowParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        let body: unknown;
        try {
          body = updateWorkflowBodySchema.parse(request.body);
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

    // DELETE /workflows/:id
    app.delete(
      "/workflows/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let params: { id: string };
        try {
          params = workflowParamsSchema.parse(request.params);
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

    // POST /workflows/:id/clone
    app.post(
      "/workflows/:id/clone",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let params: { id: string };
        try {
          params = workflowParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        let body: { name: string };
        try {
          body = cloneWorkflowBodySchema.parse(request.body);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        try {
          const cloned = await service.clone(tenantId, params.id, body.name);
          return reply.code(201).send(buildSuccessResponse(cloned));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // POST /workflows/:id/test
    app.post(
      "/workflows/:id/test",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let params: { id: string };
        try {
          params = workflowParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        let body: { employeeId?: string; leaveTypeId?: string };
        try {
          body = testWorkflowBodySchema.parse(request.body ?? {});
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        try {
          // Dry-run simulation: return the workflow snapshot without creating a request
          const snapshot = await service.createSnapshot(tenantId, params.id);
          return reply.code(200).send(
            buildSuccessResponse({
              snapshot,
              simulatedInput: {
                employeeId: body.employeeId ?? null,
                leaveTypeId: body.leaveTypeId ?? null,
              },
              result: "simulation_ok",
            })
          );
        } catch (err) {
          handleError(err, reply);
        }
      }
    );
  };
}
