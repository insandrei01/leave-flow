/**
 * Tenant routes — exposes current tenant read and settings update.
 *
 * GET  /tenants/current             — get current tenant (any auth)
 * PATCH /tenants/current            — update tenant name/core fields (company_admin)
 * PATCH /tenants/current/settings   — update operational settings (hr_admin+)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../../lib/errors.js";
import type { TenantService } from "./tenant.service.js";
import {
  updateTenantBodySchema,
  tenantSettingsBodySchema,
} from "./tenant.schema.js";
import { buildSuccessResponse } from "../../lib/pagination.js";

// ----------------------------------------------------------------
// Authorization helpers
// ----------------------------------------------------------------

const COMPANY_ADMIN_ROLES = new Set(["company_admin"]);
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
        message: "Insufficient permissions for this action",
        details: null,
      },
      meta: null,
    });
    return false;
  }
  return true;
}

function sendNotFound(reply: FastifyReply): void {
  void reply.code(404).send({
    success: false,
    data: null,
    error: { code: "NOT_FOUND", message: "Tenant not found", details: null },
    meta: null,
  });
}

function handleServiceError(
  err: unknown,
  reply: FastifyReply
): void {
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
    sendNotFound(reply);
    return;
  }
  reply.log.error({ err }, "Unhandled error in tenant routes");
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

export function createTenantRoutes(service: TenantService) {
  return async function tenantRoutes(app: FastifyInstance): Promise<void> {
    // GET /tenants/current
    app.get(
      "/tenants/current",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const tenantId = request.auth!.tenantId;
        try {
          const tenant = await service.getPlanLimits(tenantId);
          return reply.code(200).send(buildSuccessResponse(tenant));
        } catch (err) {
          handleServiceError(err, reply);
        }
      }
    );

    // PATCH /tenants/current
    app.patch(
      "/tenants/current",
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!assertRole(request, reply, COMPANY_ADMIN_ROLES)) return;

        const tenantId = request.auth!.tenantId;

        let body: unknown;
        try {
          body = updateTenantBodySchema.parse(request.body);
        } catch (err) {
          handleServiceError(err, reply);
          return;
        }

        try {
          const updated = await service.updateSettings(
            tenantId,
            body as Parameters<typeof service.updateSettings>[1]
          );
          return reply.code(200).send(buildSuccessResponse(updated));
        } catch (err) {
          handleServiceError(err, reply);
        }
      }
    );

    // PATCH /tenants/current/settings
    app.patch(
      "/tenants/current/settings",
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        const tenantId = request.auth!.tenantId;

        let body: unknown;
        try {
          body = tenantSettingsBodySchema.parse(request.body);
        } catch (err) {
          handleServiceError(err, reply);
          return;
        }

        try {
          const updated = await service.updateSettings(
            tenantId,
            body as Parameters<typeof service.updateSettings>[1]
          );
          return reply.code(200).send(buildSuccessResponse(updated));
        } catch (err) {
          handleServiceError(err, reply);
        }
      }
    );
  };
}
