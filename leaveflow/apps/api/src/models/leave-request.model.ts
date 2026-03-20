/**
 * LeaveRequest model — core transactional entity with FSM status.
 *
 * Key design points:
 * - workflowSnapshot is embedded (frozen copy at submission time, BR-102)
 * - currentApproverEmployeeId is denormalized for fast manager queries
 * - currentStepStartedAt is denormalized for escalation worker queries
 * - approvalHistory is an embedded array (append-only within the document)
 *
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";
import type { WorkflowStep } from "./workflow.model.js";

// ----------------------------------------------------------------
// Type definitions
// ----------------------------------------------------------------

export type LeaveRequestStatus =
  | "pending_validation"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled"
  | "auto_approved"
  | "validation_failed";

export type ApprovalActionType =
  | "approved"
  | "rejected"
  | "escalated"
  | "skipped"
  | "force_approved"
  | "force_rejected";

export type ApprovalChannel = "slack" | "teams" | "web" | "system" | "email";

export interface ApprovalHistoryEntry {
  step: number;
  action: ApprovalActionType;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  actorRole: string;
  delegatedFromId?: mongoose.Types.ObjectId | null;
  reason?: string | null;
  via: ApprovalChannel;
  timestamp: Date;
}

export interface WorkflowSnapshot {
  workflowId: mongoose.Types.ObjectId;
  workflowVersion: number;
  name: string;
  steps: WorkflowStep[];
}

export interface CalendarEventIds {
  google?: string | null;
  outlook?: string | null;
}

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface ILeaveRequest extends Document {
  tenantId: string;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  halfDayStart: boolean;
  halfDayEnd: boolean;
  workingDays: number;
  reason: string | null;
  status: LeaveRequestStatus;
  currentStep: number;
  reminderCount: number;
  currentApproverEmployeeId: mongoose.Types.ObjectId | null;
  currentStepStartedAt: Date | null;
  workflowSnapshot: WorkflowSnapshot;
  autoApprovalRuleName: string | null;
  approvalHistory: ApprovalHistoryEntry[];
  cancellationReason: string | null;
  cancelledAt: Date | null;
  cancelledBy: mongoose.Types.ObjectId | null;
  calendarEventIds: CalendarEventIds;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const ApprovalHistoryEntrySchema = new Schema<ApprovalHistoryEntry>(
  {
    step: { type: Number, required: true },
    action: {
      type: String,
      enum: [
        "approved",
        "rejected",
        "escalated",
        "skipped",
        "force_approved",
        "force_rejected",
      ],
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    delegatedFromId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    reason: { type: String, default: null },
    via: {
      type: String,
      enum: ["slack", "teams", "web", "system", "email"],
      required: true,
    },
    timestamp: { type: Date, required: true },
  },
  { _id: false }
);

// Embedded workflow step (matches workflow.model WorkflowStep)
const SnapshotStepSchema = new Schema(
  {
    order: { type: Number, required: true },
    approverType: { type: String, required: true },
    approverUserId: { type: Schema.Types.ObjectId, default: null },
    approverGroupIds: { type: [Schema.Types.ObjectId], default: null },
    timeoutHours: { type: Number, default: 48 },
    escalationAction: { type: String, default: "remind" },
    maxReminders: { type: Number, default: 3 },
    allowDelegation: { type: Boolean, default: true },
  },
  { _id: false }
);

const WorkflowSnapshotSchema = new Schema<WorkflowSnapshot>(
  {
    workflowId: { type: Schema.Types.ObjectId, required: true },
    workflowVersion: { type: Number, required: true },
    name: { type: String, required: true },
    steps: { type: [SnapshotStepSchema], default: [] },
  },
  { _id: false }
);

const CalendarEventIdsSchema = new Schema<CalendarEventIds>(
  {
    google: { type: String, default: null },
    outlook: { type: String, default: null },
  },
  { _id: false }
);

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    tenantId: { type: String, required: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveTypeId: {
      type: Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    halfDayStart: { type: Boolean, default: false },
    halfDayEnd: { type: Boolean, default: false },
    workingDays: { type: Number, required: true, min: 0 },
    reason: { type: String, default: null, maxlength: 500 },
    status: {
      type: String,
      enum: [
        "pending_validation",
        "pending_approval",
        "approved",
        "rejected",
        "cancelled",
        "auto_approved",
        "validation_failed",
      ],
      required: true,
    },
    currentStep: { type: Number, required: true, default: 0 },
    reminderCount: { type: Number, default: 0 },
    currentApproverEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    currentStepStartedAt: { type: Date, default: null },
    workflowSnapshot: { type: WorkflowSnapshotSchema, required: true },
    autoApprovalRuleName: { type: String, default: null },
    approvalHistory: { type: [ApprovalHistoryEntrySchema], default: [] },
    cancellationReason: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    calendarEventIds: { type: CalendarEventIdsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    collection: "leave_requests",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes (7 compound indexes per data model spec)
// ----------------------------------------------------------------

// tenant_status_created — dashboard pending count, resolution rate
LeaveRequestSchema.index(
  { tenantId: 1, status: 1, createdAt: -1 },
  { name: "tenant_status_created" }
);
// tenant_employee_status — employee self-service, overlap check
LeaveRequestSchema.index(
  { tenantId: 1, employeeId: 1, status: 1, startDate: -1 },
  { name: "tenant_employee_status" }
);
// tenant_approver — manager view, bot approval routing
LeaveRequestSchema.index(
  { tenantId: 1, currentApproverEmployeeId: 1, status: 1 },
  { name: "tenant_approver" }
);
// tenant_dates — calendar view, absences in date range
LeaveRequestSchema.index(
  { tenantId: 1, status: 1, startDate: 1, endDate: 1 },
  { name: "tenant_dates" }
);
// tenant_team_dates — team coverage calculation
LeaveRequestSchema.index(
  { tenantId: 1, employeeId: 1, startDate: 1, endDate: 1 },
  { name: "tenant_team_dates" }
);
// tenant_stale — escalation worker, dashboard stale count
LeaveRequestSchema.index(
  { tenantId: 1, status: 1, currentStepStartedAt: 1 },
  { name: "tenant_stale" }
);
// tenant_created — activity feed
LeaveRequestSchema.index(
  { tenantId: 1, createdAt: -1 },
  { name: "tenant_created" }
);

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------

LeaveRequestSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const LeaveRequestModel =
  (mongoose.models["LeaveRequest"] as
    | mongoose.Model<ILeaveRequest>
    | undefined) ??
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
