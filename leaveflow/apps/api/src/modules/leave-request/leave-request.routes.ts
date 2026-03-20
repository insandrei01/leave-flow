/**
 * Leave request routes.
 *
 * POST /leave-requests           — create (any authenticated user for themselves)
 * GET  /leave-requests           — list with filters (paginated)
 * GET  /leave-requests/:id       — detail with full approval journey
 * POST /leave-requests/:id/cancel — cancel (owner or hr_admin+)
 * POST /leave-requests/validate  — dry-run validation
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { AppError } from "../../lib/errors.js";
import type { LeaveRequestService } from "./leave-request.service.js";
import type { LeaveRequestFilters } from "./leave-request.types.js";
import {
  createLeaveRequestBodySchema,
  cancelLeaveRequestBodySchema,
  leaveRequestParamsSchema,
  leaveRequestListQuerySchema,
  validateLeaveRequestBodySchema,
} from "./leave-request.schema.js";
import {
  parsePagination,
  buildPaginatedResponse,
  buildSuccessResponse,
} from "../../lib/pagination.js";
import { EmployeeModel, TeamModel, WorkflowModel } from "../../models/index.js";
import { withTenant } from "../../lib/tenant-scope.js";

// ----------------------------------------------------------------
// Authorization
// ----------------------------------------------------------------

const HR_PLUS_ROLES = new Set(["company_admin", "hr_admin"]);

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
  if (
    message.toLowerCase().includes("insufficient balance") ||
    message.toLowerCase().includes("no working day") ||
    message.toLowerCase().includes("invalid date")
  ) {
    void reply.code(422).send({
      success: false,
      data: null,
      error: { code: "VALIDATION_ERROR", message, details: null },
      meta: null,
    });
    return;
  }
  reply.log.error({ err }, "Unhandled error in leave-request routes");
  void reply.code(500).send({
    success: false,
    data: null,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", details: null },
    meta: null,
  });
}

function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

/**
 * Resolves the active workflow ID for an employee.
 *
 * Resolution order:
 *   1. The workflow assigned to the employee's team (if any)
 *   2. The first active workflow for the tenant (tenant-level default)
 *
 * Throws if no active workflow can be found.
 */
async function resolveWorkflowId(
  tenantId: string,
  employeeId: string
): Promise<mongoose.Types.ObjectId> {
  // Step 1: fetch the employee's teamId
  const employee = await EmployeeModel.findOne(
    withTenant(tenantId, { _id: new mongoose.Types.ObjectId(employeeId) })
  )
    .select("teamId")
    .lean<{ teamId: mongoose.Types.ObjectId | null }>();

  if (employee?.teamId !== undefined && employee.teamId !== null) {
    // Step 2: fetch the team's workflowId
    const team = await TeamModel.findOne(
      withTenant(tenantId, {
        _id: employee.teamId,
        isActive: true,
      })
    )
      .select("workflowId")
      .lean<{ workflowId: mongoose.Types.ObjectId | null }>();

    if (team?.workflowId !== undefined && team.workflowId !== null) {
      return team.workflowId;
    }
  }

  // Step 3: fall back to the tenant's first active workflow
  const defaultWorkflow = await WorkflowModel.findOne(
    withTenant(tenantId, { isActive: true })
  )
    .select("_id")
    .lean<{ _id: mongoose.Types.ObjectId }>();

  if (defaultWorkflow === null) {
    throw new Error(
      "No active workflow found for this tenant. Please configure a workflow."
    );
  }

  return defaultWorkflow._id;
}

// ----------------------------------------------------------------
// Route factory
// ----------------------------------------------------------------

export function createLeaveRequestRoutes(service: LeaveRequestService) {
  return async function leaveRequestRoutes(
    app: FastifyInstance
  ): Promise<void> {
    // POST /leave-requests/validate — must be before /:id
    app.post(
      "/leave-requests/validate",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const employeeId = request.auth!.employeeId;
        const tenantId = request.auth!.tenantId;

        let body: {
          leaveTypeId: string;
          startDate: string;
          endDate: string;
          halfDayStart: boolean;
          halfDayEnd: boolean;
        };
        try {
          body = validateLeaveRequestBodySchema.parse(request.body);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        try {
          const workflowId = await resolveWorkflowId(tenantId, employeeId);

          const result = await service.validate(
            tenantId,
            toObjectId(employeeId),
            {
              leaveTypeId: toObjectId(body.leaveTypeId),
              startDate: new Date(body.startDate),
              endDate: new Date(body.endDate),
              halfDayStart: body.halfDayStart,
              halfDayEnd: body.halfDayEnd,
              workflowId,
            }
          );
          return reply.code(200).send(buildSuccessResponse(result));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // GET /leave-requests
    app.get(
      "/leave-requests",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const tenantId = request.auth!.tenantId;
        const rawQuery = request.query as Record<string, string | undefined>;

        let query: {
          status?: string;
          employeeId?: string;
          teamId?: string;
          startDateFrom?: string;
          startDateTo?: string;
        };
        try {
          query = leaveRequestListQuerySchema.parse(rawQuery);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const pagination = parsePagination(rawQuery);

        const filters: LeaveRequestFilters = {};
        if (query.status !== undefined) {
          filters.status = query.status as LeaveRequestFilters["status"];
        }
        if (query.employeeId !== undefined) {
          filters.employeeId = toObjectId(query.employeeId);
        }
        if (query.startDateFrom !== undefined) {
          filters.startDateFrom = new Date(query.startDateFrom);
        }
        if (query.startDateTo !== undefined) {
          filters.startDateTo = new Date(query.startDateTo);
        }

        try {
          const result = await service.findAll(tenantId, filters, {
            page: pagination.page,
            limit: pagination.limit,
          });
          return reply
            .code(200)
            .send(
              buildPaginatedResponse(result.items, result.total, pagination)
            );
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // POST /leave-requests
    app.post(
      "/leave-requests",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const employeeId = request.auth!.employeeId;
        const tenantId = request.auth!.tenantId;

        let body: {
          leaveTypeId: string;
          startDate: string;
          endDate: string;
          halfDayStart: boolean;
          halfDayEnd: boolean;
          reason: string | null;
        };
        try {
          body = createLeaveRequestBodySchema.parse(request.body);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        try {
          const workflowId = await resolveWorkflowId(tenantId, employeeId);

          const created = await service.create(
            tenantId,
            toObjectId(employeeId),
            {
              leaveTypeId: toObjectId(body.leaveTypeId),
              startDate: new Date(body.startDate),
              endDate: new Date(body.endDate),
              halfDayStart: body.halfDayStart,
              halfDayEnd: body.halfDayEnd,
              reason: body.reason,
              workflowId,
            }
          );
          return reply.code(201).send(buildSuccessResponse(created));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // GET /leave-requests/:id
    app.get(
      "/leave-requests/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        let params: { id: string };
        try {
          params = leaveRequestParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        try {
          const item = await service.findById(
            tenantId,
            toObjectId(params.id)
          );
          if (item === null) {
            void reply.code(404).send({
              success: false,
              data: null,
              error: {
                code: "NOT_FOUND",
                message: `Leave request not found: ${params.id}`,
                details: null,
              },
              meta: null,
            });
            return;
          }
          return reply.code(200).send(buildSuccessResponse(item));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // POST /leave-requests/:id/cancel
    app.post(
      "/leave-requests/:id/cancel",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        let params: { id: string };
        try {
          params = leaveRequestParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        let body: { reason: string | null };
        try {
          body = cancelLeaveRequestBodySchema.parse(request.body ?? {});
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        const actorEmployeeId = request.auth!.employeeId;
        const actorRole = request.auth?.role;

        // Authorization: owner or hr_admin+
        const leaveRequest = await service.findById(
          tenantId,
          toObjectId(params.id)
        );

        if (leaveRequest === null) {
          void reply.code(404).send({
            success: false,
            data: null,
            error: {
              code: "NOT_FOUND",
              message: `Leave request not found: ${params.id}`,
              details: null,
            },
            meta: null,
          });
          return;
        }

        const isOwner =
          leaveRequest.employeeId.toString() === actorEmployeeId;
        const isHrPlus =
          actorRole !== undefined && HR_PLUS_ROLES.has(actorRole);

        if (!isOwner && !isHrPlus) {
          void reply.code(403).send({
            success: false,
            data: null,
            error: {
              code: "FORBIDDEN",
              message: "You can only cancel your own leave requests",
              details: null,
            },
            meta: null,
          });
          return;
        }

        try {
          await service.cancel(
            tenantId,
            toObjectId(params.id),
            toObjectId(actorEmployeeId),
            body.reason
          );
          return reply.code(200).send(buildSuccessResponse({ cancelled: true }));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );
  };
}
