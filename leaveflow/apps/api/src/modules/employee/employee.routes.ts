/**
 * Employee routes.
 *
 * GET  /employees              — list (paginated, filter by team/role/status)
 * GET  /employees/:id          — get by ID
 * POST /employees              — create (hr_admin+)
 * PATCH /employees/:id         — update (hr_admin+)
 * POST /employees/:id/deactivate — soft delete (hr_admin+)
 * POST /employees/import       — CSV import (hr_admin+)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../../lib/errors.js";
import type { EmployeeService } from "./employee.service.js";
import type { EmployeeFilters, PaginationOptions } from "./employee.types.js";
import {
  createEmployeeBodySchema,
  updateEmployeeBodySchema,
  employeeParamsSchema,
  employeeListQuerySchema,
} from "./employee.schema.js";
import {
  parsePagination,
  buildPaginatedResponse,
  buildSuccessResponse,
} from "../../lib/pagination.js";

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
  reply.log.error({ err }, "Unhandled error in employee routes");
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

export function createEmployeeRoutes(service: EmployeeService) {
  return async function employeeRoutes(app: FastifyInstance): Promise<void> {
    // GET /employees
    app.get(
      "/employees",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const tenantId = request.auth!.tenantId;
        const rawQuery = request.query as Record<string, string | undefined>;

        let query: {
          teamId?: string;
          role?: EmployeeFilters["role"];
          status?: EmployeeFilters["status"];
          page?: string;
          limit?: string;
          sortBy?: string;
          sortOrder?: string;
        };
        try {
          query = employeeListQuerySchema.parse(rawQuery);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const pagination = parsePagination(rawQuery);
        const paginationOptions: PaginationOptions = {
          page: pagination.page,
          limit: pagination.limit,
        };

        const filters: EmployeeFilters = {};
        if (query.teamId !== undefined) filters.teamId = query.teamId;
        if (query.role !== undefined) filters.role = query.role;
        if (query.status !== undefined) filters.status = query.status;

        try {
          const result = await service.findAll(tenantId, filters, paginationOptions);
          return reply
            .code(200)
            .send(
              buildPaginatedResponse(result.data, result.total, pagination)
            );
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // GET /employees/:id
    app.get(
      "/employees/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        let params: { id: string };
        try {
          params = employeeParamsSchema.parse(request.params);
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

    // POST /employees/import  — must be registered before /employees/:id
    app.post(
      "/employees/import",
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        const tenantId = request.auth!.tenantId;

        // Body is expected to be an array of CSV rows
        const rows = request.body as Array<{
          email: string;
          firstName: string;
          lastName: string;
          role?: string;
          teamId?: string;
          startDate?: string;
        }>;

        if (!Array.isArray(rows)) {
          void reply.code(422).send({
            success: false,
            data: null,
            error: {
              code: "VALIDATION_ERROR",
              message: "Request body must be an array of employee rows",
              details: null,
            },
            meta: null,
          });
          return;
        }

        try {
          const result = await service.importFromCsv(tenantId, rows);
          return reply.code(200).send(buildSuccessResponse(result));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // POST /employees
    app.post(
      "/employees",
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let body: unknown;
        try {
          body = createEmployeeBodySchema.parse(request.body);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;

        // Map validation schema shape to service input shape
        const parsed = body as {
          email: string;
          name: string;
          role: string;
          teamId: string | null;
          startDate: string;
          managerId: string | null;
        };

        const nameParts = parsed.name.split(" ");
        const firstName = nameParts[0] ?? parsed.name;
        const lastName = nameParts.slice(1).join(" ") || firstName;

        try {
          const created = await service.create(tenantId, {
            email: parsed.email,
            firstName,
            lastName,
            role: parsed.role as Parameters<typeof service.create>[1]["role"],
            teamId: parsed.teamId,
            startDate: new Date(parsed.startDate),
          });
          return reply.code(201).send(buildSuccessResponse(created));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // PATCH /employees/:id
    app.patch(
      "/employees/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let params: { id: string };
        try {
          params = employeeParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        let body: unknown;
        try {
          body = updateEmployeeBodySchema.parse(request.body);
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

    // POST /employees/:id/deactivate
    app.post(
      "/employees/:id/deactivate",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let params: { id: string };
        try {
          params = employeeParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        try {
          const deactivated = await service.deactivate(tenantId, params.id);
          return reply.code(200).send(buildSuccessResponse(deactivated));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );
  };
}
