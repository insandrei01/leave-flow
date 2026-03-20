/**
 * Leave request service — business logic for leave request lifecycle.
 *
 * Responsibilities:
 * - Validate dates, calculate working days, check balance
 * - Snapshot the workflow at submission time (BR-102)
 * - Set initial FSM status
 * - Delegate status transitions to ApprovalEngineService
 */

import mongoose from "mongoose";
import { WorkflowModel, EmployeeModel } from "../../models/index.js";
import { withTenant } from "../../lib/tenant-scope.js";
import { getRedisClient } from "../../lib/redis.js";
import { ConflictError } from "../../lib/errors.js";
import type { ILeaveRequest } from "../../models/index.js";
import type { IWorkflow } from "../../models/index.js";
import type { LeaveRequestRepository } from "./leave-request.repository.js";
import type { BalanceService } from "../balance/balance.service.js";
import type { ApprovalEngineService } from "../approval-engine/approval-engine.service.js";
import type { IAuditServiceDep } from "../approval-engine/approval-engine.service.js";
import type {
  CreateLeaveRequestInput,
  ValidateLeaveRequestInput,
  LeaveRequestFilters,
  CalendarFilter,
  PaginationInput,
  PaginatedResult,
  ValidationResult,
  ValidationError,
} from "./leave-request.types.js";

// ----------------------------------------------------------------
// Holiday service interface (loose coupling)
// ----------------------------------------------------------------

export interface IHolidayService {
  countWorkingDays(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    halfDayStart?: boolean,
    halfDayEnd?: boolean
  ): Promise<number>;
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class LeaveRequestService {
  constructor(
    private readonly repo: LeaveRequestRepository,
    private readonly balanceService: BalanceService,
    private readonly approvalEngine: ApprovalEngineService,
    private readonly auditService: IAuditServiceDep,
    private readonly holidayService: IHolidayService
  ) {}

  /**
   * Creates a new leave request.
   *
   * Steps:
   * 1. Load and validate the workflow
   * 2. Calculate working days (via holiday service)
   * 3. Check sufficient balance
   * 4. Snapshot the workflow (BR-102)
   * 5. Determine first approver
   * 6. Create document with status = pending_validation
   * 7. Run validation; transition to pending_approval or validation_failed
   */
  async create(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    input: CreateLeaveRequestInput
  ): Promise<ILeaveRequest> {
    this.validateDateRange(input.startDate, input.endDate);

    const workflow = await this.requireWorkflow(tenantId, input.workflowId);

    const workingDays = await this.holidayService.countWorkingDays(
      tenantId,
      input.startDate,
      input.endDate,
      input.halfDayStart,
      input.halfDayEnd
    );

    if (workingDays <= 0) {
      throw new Error("Leave request must cover at least one working day");
    }

    // CR-005: acquire a distributed lock to prevent concurrent overdraw
    const lockKey = `lock:balance:${tenantId}:${employeeId.toString()}:${input.leaveTypeId.toString()}`;
    const redis = getRedisClient();
    const lockAcquired = await redis.set(lockKey, "1", "EX", 10, "NX");

    if (lockAcquired === null) {
      throw new ConflictError(
        "Another leave request is being processed, please try again"
      );
    }

    let leaveRequest: ILeaveRequest;

    try {
      const hasSufficientBalance =
        await this.balanceService.checkSufficientBalance(
          tenantId,
          employeeId,
          input.leaveTypeId,
          workingDays
        );

      if (!hasSufficientBalance) {
        throw new Error(
          `Insufficient balance: ${workingDays} working days required`
        );
      }

      // BR-102: snapshot the workflow at submission time
      const workflowSnapshot: ILeaveRequest["workflowSnapshot"] = {
        workflowId: workflow._id as mongoose.Types.ObjectId,
        workflowVersion: workflow.version,
        name: workflow.name,
        steps: workflow.steps.map((s) => ({ ...s })),
      };

      const firstStep = workflow.steps[0];
      const firstApproverId = firstStep?.approverUserId ?? null;

      leaveRequest = await this.repo.create({
        tenantId,
        employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        halfDayStart: input.halfDayStart ?? false,
        halfDayEnd: input.halfDayEnd ?? false,
        workingDays,
        reason: input.reason ?? null,
        status: "pending_approval",
        currentStep: 0,
        currentApproverEmployeeId:
          firstApproverId instanceof mongoose.Types.ObjectId
            ? firstApproverId
            : null,
        currentStepStartedAt: new Date(),
        workflowSnapshot,
      });
    } finally {
      await redis.del(lockKey);
    }

    await this.auditService.log({
      tenantId,
      actorId: employeeId,
      actorType: "employee",
      action: "leave_request.created",
      entityType: "leave_request",
      entityId: leaveRequest._id as mongoose.Types.ObjectId,
      metadata: {
        leaveTypeId: input.leaveTypeId,
        workingDays,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });

    return leaveRequest;
  }

  /**
   * Dry-run validation — checks dates, balance, and working days without creating.
   * Used by the validate endpoint.
   */
  async validate(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    input: ValidateLeaveRequestInput
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Date range check
    if (input.startDate > input.endDate) {
      errors.push({
        code: "INVALID_DATE_RANGE",
        message: "Start date must be before or equal to end date",
      });
      return { valid: false, workingDays: 0, errors };
    }

    let workingDays = 0;
    try {
      workingDays = await this.holidayService.countWorkingDays(
        tenantId,
        input.startDate,
        input.endDate,
        input.halfDayStart,
        input.halfDayEnd
      );
    } catch {
      errors.push({
        code: "WORKING_DAYS_CALCULATION_ERROR",
        message: "Failed to calculate working days",
      });
      return { valid: false, workingDays: 0, errors };
    }

    if (workingDays <= 0) {
      errors.push({
        code: "NO_WORKING_DAYS",
        message: "Leave request must cover at least one working day",
      });
    }

    // Balance check
    const hasSufficientBalance = await this.balanceService.checkSufficientBalance(
      tenantId,
      employeeId,
      input.leaveTypeId,
      workingDays
    );

    if (!hasSufficientBalance) {
      errors.push({
        code: "INSUFFICIENT_BALANCE",
        message: `Insufficient balance: ${workingDays} working days required`,
      });
    }

    return {
      valid: errors.length === 0,
      workingDays,
      errors,
    };
  }

  /**
   * Cancels a leave request, delegating to the approval engine.
   */
  async cancel(
    tenantId: string,
    leaveRequestId: mongoose.Types.ObjectId,
    employeeId: mongoose.Types.ObjectId,
    reason?: string | null
  ): Promise<void> {
    await this.approvalEngine.processCancellation(tenantId, leaveRequestId, {
      employeeId,
      reason: reason ?? null,
    });
  }

  /**
   * Finds a leave request by ID within the tenant scope.
   */
  async findById(
    tenantId: string,
    id: mongoose.Types.ObjectId
  ): Promise<ILeaveRequest | null> {
    return this.repo.findById(tenantId, id);
  }

  /**
   * Returns paginated leave requests matching the given filters.
   */
  async findAll(
    tenantId: string,
    filters: LeaveRequestFilters,
    pagination: PaginationInput
  ): Promise<PaginatedResult<ILeaveRequest>> {
    return this.repo.findAll(tenantId, filters, pagination);
  }

  /**
   * Returns confirmed leave requests (approved/auto_approved) in a date range.
   * Optionally scoped to a team.
   */
  async findForCalendar(
    tenantId: string,
    filter: CalendarFilter
  ): Promise<ILeaveRequest[]> {
    // If teamId is provided, resolve to employee IDs first
    if (filter.teamId !== undefined) {
      const employees = await EmployeeModel.find(
        withTenant(tenantId, { teamId: filter.teamId })
      )
        .select("_id")
        .lean<{ _id: mongoose.Types.ObjectId }[]>();

      const employeeIds = employees.map((e) => e._id);

      // Use findAll with employee IDs
      const result = await this.repo.findAll(
        tenantId,
        {
          status: ["approved", "auto_approved"],
          startDateFrom: filter.startDate,
          startDateTo: filter.endDate,
        },
        { page: 1, limit: 1000 }
      );

      return result.items.filter((r) =>
        employeeIds.some(
          (id) => id.toString() === r.employeeId.toString()
        )
      );
    }

    return this.repo.findForCalendar(tenantId, filter);
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate > endDate) {
      throw new Error("Start date must be before or equal to end date");
    }
  }

  private async requireWorkflow(
    tenantId: string,
    workflowId: mongoose.Types.ObjectId
  ): Promise<IWorkflow> {
    const workflow = await WorkflowModel.findOne(
      withTenant(tenantId, { _id: workflowId, isActive: true })
    ).lean<IWorkflow>();

    if (workflow === null) {
      throw new Error(
        `Workflow not found or inactive: ${workflowId.toString()}`
      );
    }

    return workflow;
  }
}
