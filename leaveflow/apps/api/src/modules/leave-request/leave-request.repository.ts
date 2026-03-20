/**
 * Leave request repository — data access layer.
 *
 * Status updates are only permitted through the FSM (updateStatus method).
 * This repository does NOT contain business logic — that belongs in the service.
 */

import mongoose from "mongoose";
import { LeaveRequestModel } from "../../models/index.js";
import { withTenant } from "../../lib/tenant-scope.js";
import type { ILeaveRequest } from "../../models/index.js";
import type {
  LeaveRequestFilters,
  CalendarFilter,
  PaginationInput,
  PaginatedResult,
} from "./leave-request.types.js";
import type { LeaveRequestUpdate } from "../approval-engine/approval-engine.service.js";

// ----------------------------------------------------------------
// Input type for create
// ----------------------------------------------------------------

export interface CreateLeaveRequestData {
  tenantId: string;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  halfDayStart: boolean;
  halfDayEnd: boolean;
  workingDays: number;
  reason: string | null;
  status: ILeaveRequest["status"];
  currentStep: number;
  currentApproverEmployeeId: mongoose.Types.ObjectId | null;
  currentStepStartedAt: Date | null;
  workflowSnapshot: ILeaveRequest["workflowSnapshot"];
}

// ----------------------------------------------------------------
// Repository
// ----------------------------------------------------------------

export class LeaveRequestRepository {
  /**
   * Returns all leave requests for a tenant matching the given filters.
   */
  async findAll(
    tenantId: string,
    filters: LeaveRequestFilters,
    pagination: PaginationInput
  ): Promise<PaginatedResult<ILeaveRequest>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const query = this.buildFilterQuery(tenantId, filters);

    const [items, total] = await Promise.all([
      LeaveRequestModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<ILeaveRequest[]>(),
      LeaveRequestModel.countDocuments(query),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Finds a single leave request by ID within the tenant scope.
   */
  async findById(
    tenantId: string,
    id: mongoose.Types.ObjectId
  ): Promise<ILeaveRequest | null> {
    return LeaveRequestModel.findOne(withTenant(tenantId, { _id: id })).lean<ILeaveRequest>();
  }

  /**
   * Creates and persists a new leave request document.
   */
  async create(data: CreateLeaveRequestData): Promise<ILeaveRequest> {
    const doc = new LeaveRequestModel({ ...data });
    return doc.save();
  }

  /**
   * Updates leave request status and related fields.
   * This is the ONLY method that modifies a leave request document.
   * Always go through the FSM before calling this method.
   */
  async updateStatus(
    tenantId: string,
    id: mongoose.Types.ObjectId,
    update: LeaveRequestUpdate
  ): Promise<void> {
    await LeaveRequestModel.findOneAndUpdate(
      withTenant(tenantId, { _id: id }),
      { $set: update },
      { new: false }
    );
  }

  /**
   * Returns all pending_approval requests for a tenant.
   * Used by the escalation worker.
   */
  async findPending(tenantId: string): Promise<ILeaveRequest[]> {
    return LeaveRequestModel.find(
      withTenant(tenantId, { status: "pending_approval" })
    ).lean<ILeaveRequest[]>();
  }

  /**
   * Returns all leave requests for a specific employee.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    pagination: PaginationInput
  ): Promise<PaginatedResult<ILeaveRequest>> {
    return this.findAll(tenantId, { employeeId }, pagination);
  }

  /**
   * Returns leave requests in a date range for calendar display.
   * Only returns approved and auto_approved requests (confirmed absences).
   */
  async findForCalendar(
    tenantId: string,
    filter: CalendarFilter
  ): Promise<ILeaveRequest[]> {
    const query = withTenant(tenantId, {
      status: { $in: ["approved", "auto_approved"] },
      startDate: { $lte: filter.endDate },
      endDate: { $gte: filter.startDate },
    });

    return LeaveRequestModel.find(query)
      .sort({ startDate: 1 })
      .lean<ILeaveRequest[]>();
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private buildFilterQuery(
    tenantId: string,
    filters: LeaveRequestFilters
  ): Record<string, unknown> {
    const extras: Record<string, unknown> = {};

    if (filters.status !== undefined) {
      extras["status"] = Array.isArray(filters.status)
        ? { $in: filters.status }
        : filters.status;
    }

    if (filters.employeeId !== undefined) {
      extras["employeeId"] = filters.employeeId;
    }

    if (filters.leaveTypeId !== undefined) {
      extras["leaveTypeId"] = filters.leaveTypeId;
    }

    if (filters.startDateFrom !== undefined || filters.startDateTo !== undefined) {
      const dateFilter: Record<string, Date> = {};
      if (filters.startDateFrom !== undefined) {
        dateFilter["$gte"] = filters.startDateFrom;
      }
      if (filters.startDateTo !== undefined) {
        dateFilter["$lte"] = filters.startDateTo;
      }
      extras["startDate"] = dateFilter;
    }

    if (filters.currentApproverEmployeeId !== undefined) {
      extras["currentApproverEmployeeId"] = filters.currentApproverEmployeeId;
    }

    return withTenant(tenantId, extras);
  }
}
