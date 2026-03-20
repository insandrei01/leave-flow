/**
 * Workflow model — approval workflow definitions with versioned steps.
 *
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";

// ----------------------------------------------------------------
// Sub-document interfaces
// ----------------------------------------------------------------

export type ApproverType =
  | "specific_user"
  | "role_direct_manager"
  | "role_team_lead"
  | "role_hr"
  | "group";

export type EscalationAction =
  | "escalate_next"
  | "remind"
  | "auto_approve"
  | "notify_hr"
  | "none";

export interface WorkflowStep {
  order: number;
  approverType: ApproverType;
  approverUserId?: mongoose.Types.ObjectId | null;
  approverGroupIds?: mongoose.Types.ObjectId[] | null;
  timeoutHours: number;
  escalationAction: EscalationAction;
  maxReminders: number;
  allowDelegation: boolean;
}

export interface AutoApprovalRule {
  leaveTypeId: mongoose.Types.ObjectId;
  maxDurationDays: number;
  isActive: boolean;
}

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface IWorkflow extends Document {
  tenantId: string;
  name: string;
  description: string | null;
  steps: WorkflowStep[];
  autoApprovalRules: AutoApprovalRule[];
  isTemplate: boolean;
  templateSlug: string | null;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const WorkflowStepSchema = new Schema<WorkflowStep>(
  {
    order: { type: Number, required: true, min: 0 },
    approverType: {
      type: String,
      enum: [
        "specific_user",
        "role_direct_manager",
        "role_team_lead",
        "role_hr",
        "group",
      ],
      required: true,
    },
    approverUserId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    approverGroupIds: {
      type: [Schema.Types.ObjectId],
      ref: "Employee",
      default: null,
    },
    timeoutHours: { type: Number, default: 48, min: 1 },
    escalationAction: {
      type: String,
      enum: ["escalate_next", "remind", "auto_approve", "notify_hr", "none"],
      default: "remind",
    },
    maxReminders: { type: Number, default: 3, min: 0 },
    allowDelegation: { type: Boolean, default: true },
  },
  { _id: false }
);

const AutoApprovalRuleSchema = new Schema<AutoApprovalRule>(
  {
    leaveTypeId: {
      type: Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    maxDurationDays: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const WorkflowSchema = new Schema<IWorkflow>(
  {
    tenantId: { type: String, required: true },
    name: { type: String, required: true, minlength: 1, maxlength: 100 },
    description: { type: String, default: null },
    steps: { type: [WorkflowStepSchema], default: [] },
    autoApprovalRules: { type: [AutoApprovalRuleSchema], default: [] },
    isTemplate: { type: Boolean, default: false },
    templateSlug: { type: String, default: null },
    version: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "workflows",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// tenant_name_active
WorkflowSchema.index(
  { tenantId: 1, name: 1, isActive: 1 },
  { name: "tenant_name_active" }
);
// tenant_template
WorkflowSchema.index(
  { tenantId: 1, isTemplate: 1 },
  { name: "tenant_template" }
);
// system_templates (tenantId null for global templates)
WorkflowSchema.index(
  { isTemplate: 1, templateSlug: 1 },
  { name: "system_templates" }
);

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------

WorkflowSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const WorkflowModel =
  (mongoose.models["Workflow"] as mongoose.Model<IWorkflow> | undefined) ??
  mongoose.model<IWorkflow>("Workflow", WorkflowSchema);
