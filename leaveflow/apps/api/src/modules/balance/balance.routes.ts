/**
 * Balance routes.
 *
 * GET  /balances/me                                           — current user's balances
 * GET  /balances/employees/:employeeId                        — all balances for employee (hr_admin+)
 * GET  /balances/employees/:employeeId/leave-types/:leaveTypeId — specific type balance
 * GET  /balances/employees/:employeeId/history                — ledger entries, paginated
 * POST /balances/adjust                                       — manual adjustment (hr_admin only)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { AppError } from "../../lib/errors.js";
import type { BalanceService } from "./balance.service.js";
import type { BalanceRepository } from "./balance.repository.js";
import {
  manualAdjustmentBodySchema,
  employeeIdParamsSchema,
  employeeLeaveTypeParamsSchema,
  balanceHistoryQuerySchema,
} from "./balance.schema.js";
import {
  parsePagination,
  buildPaginatedResponse,
  buildSuccessResponse,
} from "../../lib/pagination.js";

// ----------------------------------------------------------------
// Authorization
// ----------------------------------------------------------------

const HR_PLUS_ROLES = new Set(["company_admin", "hr_admin"]);
const MANAGER_PLUS_ROLES = new Set(["company_admin", "hr_admin", "manager"]);

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
  reply.log.error({ err }, "Unhandled error in balance routes");
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

// ----------------------------------------------------------------
// Route factory
// The balance route needs both the service and repo access.
// We accept both or provide repo access via the service constructor.
// ----------------------------------------------------------------

export interface BalanceRouteDeps {
  service: BalanceService;
  repo: BalanceRepository;
}

export function createBalanceRoutes(deps: BalanceRouteDeps) {
  const { service, repo } = deps;

  return async function balanceRoutes(app: FastifyInstance): Promise<void> {
    // GET /balances/me
    app.get(
      "/balances/me",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const tenantId = request.auth!.tenantId;
        const employeeId = request.auth!.employeeId;

        try {
          const balances = await service.getEmployeeBalances(
            tenantId,
            toObjectId(employeeId)
          );
          return reply.code(200).send(buildSuccessResponse(balances));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // GET /balances/employees/:employeeId
    app.get(
      "/balances/employees/:employeeId",
      async (
        request: FastifyRequest<{ Params: { employeeId: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, MANAGER_PLUS_ROLES)) return;

        let params: { employeeId: string };
        try {
          params = employeeIdParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        try {
          const balances = await service.getEmployeeBalances(
            tenantId,
            toObjectId(params.employeeId)
          );
          return reply.code(200).send(buildSuccessResponse(balances));
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // GET /balances/employees/:employeeId/leave-types/:leaveTypeId
    app.get(
      "/balances/employees/:employeeId/leave-types/:leaveTypeId",
      async (
        request: FastifyRequest<{
          Params: { employeeId: string; leaveTypeId: string };
        }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, MANAGER_PLUS_ROLES)) return;

        let params: { employeeId: string; leaveTypeId: string };
        try {
          params = employeeLeaveTypeParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        try {
          const balance = await repo.getBalance(
            tenantId,
            toObjectId(params.employeeId),
            toObjectId(params.leaveTypeId)
          );
          return reply.code(200).send(
            buildSuccessResponse({
              employeeId: params.employeeId,
              leaveTypeId: params.leaveTypeId,
              balance,
            })
          );
        } catch (err) {
          handleError(err, reply);
        }
      }
    );

    // GET /balances/employees/:employeeId/history
    app.get(
      "/balances/employees/:employeeId/history",
      async (
        request: FastifyRequest<{ Params: { employeeId: string } }>,
        reply: FastifyReply
      ) => {
        if (!assertRole(request, reply, MANAGER_PLUS_ROLES)) return;

        let params: { employeeId: string };
        try {
          params = employeeIdParamsSchema.parse(request.params);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const rawQuery = request.query as Record<string, string | undefined>;
        let query: { leaveTypeId?: string };

        try {
          balanceHistoryQuerySchema.parse(rawQuery);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const pagination = parsePagination(rawQuery);
        const tenantId = request.auth!.tenantId;

        // leaveTypeId may be passed as query param
        query = rawQuery as { leaveTypeId?: string };
        const leaveTypeId = query["leaveTypeId"];

        if (leaveTypeId === undefined) {
          void reply.code(422).send({
            success: false,
            data: null,
            error: {
              code: "VALIDATION_ERROR",
              message: "leaveTypeId query parameter is required",
              details: null,
            },
            meta: null,
          });
          return;
        }

        try {
          const result = await repo.getHistory(
            tenantId,
            toObjectId(params.employeeId),
            toObjectId(leaveTypeId),
            { page: pagination.page, limit: pagination.limit }
          );
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

    // POST /balances/adjust
    app.post(
      "/balances/adjust",
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!assertRole(request, reply, HR_PLUS_ROLES)) return;

        let body: {
          employeeId: string;
          leaveTypeId: string;
          amount: number;
          reason: string;
          effectiveDate: string;
        };
        try {
          body = manualAdjustmentBodySchema.parse(request.body);
        } catch (err) {
          handleError(err, reply);
          return;
        }

        const tenantId = request.auth!.tenantId;
        const actorId = request.auth!.employeeId;
        const currentYear = new Date(body.effectiveDate).getFullYear();

        try {
          await service.adjustManual(
            tenantId,
            toObjectId(body.employeeId),
            toObjectId(body.leaveTypeId),
            body.amount,
            body.reason,
            toObjectId(actorId),
            {
              amount: body.amount,
              reason: body.reason,
              actorId: toObjectId(actorId),
              fiscalYear: currentYear,
              effectiveDate: new Date(body.effectiveDate),
            }
          );
          return reply.code(200).send(
            buildSuccessResponse({
              adjusted: true,
              employeeId: body.employeeId,
              leaveTypeId: body.leaveTypeId,
              amount: body.amount,
            })
          );
        } catch (err) {
          handleError(err, reply);
        }
      }
    );
  };
}
