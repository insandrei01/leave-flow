/**
 * Type definitions for the leave request module.
 */

import type mongoose from "mongoose";
import type { LeaveRequestStatus } from "../../models/leave-request.model.js";

// ----------------------------------------------------------------
// Input types
// ----------------------------------------------------------------

export interface CreateLeaveRequestInput {
  leaveTypeId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
  reason?: string | null;
  /** Workflow ID to use (resolved from team config or tenant default). */
  workflowId: mongoose.Types.ObjectId;
}

export interface ValidateLeaveRequestInput {
  leaveTypeId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
  workflowId: mongoose.Types.ObjectId;
}

// ----------------------------------------------------------------
// Filter / query types
// ----------------------------------------------------------------

export interface LeaveRequestFilters {
  status?: LeaveRequestStatus | LeaveRequestStatus[];
  employeeId?: mongoose.Types.ObjectId;
  leaveTypeId?: mongoose.Types.ObjectId;
  startDateFrom?: Date;
  startDateTo?: Date;
  /** Filter by the current approver (used by approval routes for pending list) */
  currentApproverEmployeeId?: mongoose.Types.ObjectId;
}

export interface CalendarFilter {
  teamId?: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
}

export interface PaginationInput {
  page: number;
  limit: number;
}

// ----------------------------------------------------------------
// Result types
// ----------------------------------------------------------------

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ValidationResult {
  valid: boolean;
  workingDays: number;
  errors: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
}
