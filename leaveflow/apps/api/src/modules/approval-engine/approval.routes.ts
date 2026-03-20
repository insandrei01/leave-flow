/**
 * Approval routes.
 *
 * POST /approvals/:id/approve       — approve with optional note
 * POST /approvals/:id/reject        — reject with mandatory reason (BR-022)
 * POST /approvals/:id/force-approve — hr_admin only
 * GET  /approvals/pending           — list pending for current user as approver
 * GET  /approvals/pending/count     — count for badge
 */

import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import mongoose from "mongoose";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors.js";
import { sendSuccess, sendPaginated } from "../../lib/response.js";
import { EmployeeModel, DelegationModel } from "../../models/index.js";
import type { ApprovalEngineService } from "./approval-engine.service.js";
import type { LeaveRequestRepository } from "../leave-request/leave-request.repository.js";
import {
  approvalIdParamsSchema,
  approveBodySchema,
  rejectBodySchema,
  forceApproveBodySchema,
  pendingQuerySchema,
} from "./approval.schema.js";
import type { ApproveBody, RejectBody, ForceApproveBody } from "./approval.schema.js";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function parseObjectId(id: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ObjectId: ${id}`);
  }
  return new mongoose.Types.ObjectId(id);
}

/**
 * Resolves the display name for an employee by their ObjectId string.
 * Falls back to the raw ID string if the employee record is not found.
 */
async function resolveApproverName(
  employeeId: string,
  tenantId: string
): Promise<string> {
  const employee = await EmployeeModel.findOne({
    _id: new mongoose.Types.ObjectId(employeeId),
    tenantId,
  })
    .select("firstName lastName")
    .lean<{ firstName: string; lastName: string }>();

  if (employee === null) {
    return employeeId;
  }

  return `${employee.firstName} ${employee.lastName}`;
}

/**
 * Verifies that the acting employee is the designated approver for the given leave request.
 * Accepts the actor if:
 *   1. They are the currentApproverEmployeeId on the request, OR
 *   2. They hold an active delegation from the designated approver.
 *
 * Throws ForbiddenError if neither condition is met.
 */
async function assertIsDesignatedApprover(
  tenantId: string,
  leaveRequestId: mongoose.Types.ObjectId,
  actorEmployeeId: string,
  currentApproverEmployeeId: mongoose.Types.ObjectId | null
): Promise<void> {
  // If there is no designated approver set, we cannot verify — deny.
  if (currentApproverEmployeeId === null) {
    throw new ForbiddenError(
      "You are not the designated approver for this request"
    );
  }

  const isDirectApprover =
    currentApproverEmployeeId.toString() === actorEmployeeId;

  if (isDirectApprover) {
    return;
  }

  // Check for an active delegation where the actor is the delegatee and the
  // designated approver is the delegator.
  const now = new Date();
  const delegation = await DelegationModel.findOne({
    tenantId,
    delegatorId: currentApproverEmployeeId,
    delegateId: new mongoose.Types.ObjectId(actorEmployeeId),
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();

  if (delegation === null) {
    throw new ForbiddenError(
      "You are not the designated approver for this request"
    );
  }
}

// ----------------------------------------------------------------
// Handler factories
// ----------------------------------------------------------------

function makeApproveHandler(
  approvalEngine: ApprovalEngineService,
  leaveRequestRepo: LeaveRequestRepository
) {
  return async function approveHandler(
    request: FastifyRequest<{ Params: { id: string }; Body: ApproveBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = approvalIdParamsSchema.parse(request.params);
    const body = approveBodySchema.parse(request.body ?? {});
    const { tenantId, employeeId, role } = request.auth!;

    const leaveRequestId = parseObjectId(id);

    // SEC-007: verify the actor is the designated approver (or has delegation)
    const leaveRequest = await leaveRequestRepo.findById(
      tenantId,
      leaveRequestId
    );
    if (leaveRequest === null) {
      throw new NotFoundError("Leave request", id);
    }

    await assertIsDesignatedApprover(
      tenantId,
      leaveRequestId,
      employeeId,
      leaveRequest.currentApproverEmployeeId
    );

    // CR-010: resolve the approver's display name
    const approverName = await resolveApproverName(employeeId, tenantId);

    const result = await approvalEngine.processApproval(
      tenantId,
      leaveRequestId,
      {
        approverId: parseObjectId(employeeId),
        approverName,
        approverRole: role,
        via: "web",
        action: "approved",
        reason: body.note ?? null,
      }
    );

    sendSuccess(reply, result);
  };
}

function makeRejectHandler(
  approvalEngine: ApprovalEngineService,
  leaveRequestRepo: LeaveRequestRepository
) {
  return async function rejectHandler(
    request: FastifyRequest<{ Params: { id: string }; Body: RejectBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = approvalIdParamsSchema.parse(request.params);
    const body = rejectBodySchema.parse(request.body);
    const { tenantId, employeeId, role } = request.auth!;

    const leaveRequestId = parseObjectId(id);

    // SEC-007: verify the actor is the designated approver (or has delegation)
    const leaveRequest = await leaveRequestRepo.findById(
      tenantId,
      leaveRequestId
    );
    if (leaveRequest === null) {
      throw new NotFoundError("Leave request", id);
    }

    await assertIsDesignatedApprover(
      tenantId,
      leaveRequestId,
      employeeId,
      leaveRequest.currentApproverEmployeeId
    );

    // CR-010: resolve the approver's display name
    const approverName = await resolveApproverName(employeeId, tenantId);

    const result = await approvalEngine.processRejection(
      tenantId,
      leaveRequestId,
      {
        approverId: parseObjectId(employeeId),
        approverName,
        approverRole: role,
        via: "web",
        reason: body.reason,
      }
    );

    sendSuccess(reply, result);
  };
}

function makeForceApproveHandler(
  approvalEngine: ApprovalEngineService
) {
  return async function forceApproveHandler(
    request: FastifyRequest<{ Params: { id: string }; Body: ForceApproveBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const { role, tenantId, employeeId } = request.auth!;
    if (role !== "hr_admin" && role !== "company_admin") {
      throw new ForbiddenError("Force approval requires hr_admin or company_admin role");
    }

    const { id } = approvalIdParamsSchema.parse(request.params);
    const body = forceApproveBodySchema.parse(request.body);

    // CR-010: resolve the approver's display name
    const approverName = await resolveApproverName(employeeId, tenantId);

    const result = await approvalEngine.processApproval(
      tenantId,
      parseObjectId(id),
      {
        approverId: parseObjectId(employeeId),
        approverName,
        approverRole: role,
        via: "web",
        action: "approved",
        reason: body.reason,
      }
    );

    sendSuccess(reply, result);
  };
}

function makePendingHandler(repo: LeaveRequestRepository) {
  return async function pendingHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const { tenantId, employeeId } = request.auth!;
    const query = pendingQuerySchema.parse(request.query);

    const approverId = parseObjectId(employeeId);

    const result = await repo.findAll(
      tenantId,
      {
        status: "pending_approval",
        currentApproverEmployeeId: approverId,
      },
      { page: query.page, limit: query.limit }
    );

    sendPaginated(reply, result.items, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  };
}

function makePendingCountHandler(repo: LeaveRequestRepository) {
  return async function pendingCountHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const { tenantId, employeeId } = request.auth!;
    const approverId = parseObjectId(employeeId);

    const result = await repo.findAll(
      tenantId,
      {
        status: "pending_approval",
        currentApproverEmployeeId: approverId,
      },
      { page: 1, limit: 1 }
    );

    sendSuccess(reply, { count: result.total });
  };
}

// ----------------------------------------------------------------
// Route plugin
// ----------------------------------------------------------------

export async function approvalRoutes(
  fastify: FastifyInstance,
  opts: {
    approvalEngine: ApprovalEngineService;
    leaveRequestRepo: LeaveRequestRepository;
  }
): Promise<void> {
  const { approvalEngine, leaveRequestRepo } = opts;

  // Note: /pending/count must be registered BEFORE /pending to avoid route conflicts
  fastify.get(
    "/approvals/pending/count",
    {},
    makePendingCountHandler(leaveRequestRepo)
  );

  fastify.get(
    "/approvals/pending",
    {},
    makePendingHandler(leaveRequestRepo)
  );

  fastify.post(
    "/approvals/:id/approve",
    {},
    makeApproveHandler(approvalEngine, leaveRequestRepo)
  );

  fastify.post(
    "/approvals/:id/reject",
    {},
    makeRejectHandler(approvalEngine, leaveRequestRepo)
  );

  fastify.post(
    "/approvals/:id/force-approve",
    {},
    makeForceApproveHandler(approvalEngine)
  );
}
