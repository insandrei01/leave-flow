/**
 * Service-level types for the workflow module.
 */

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

export interface WorkflowStepInput {
  order: number;
  approverType: ApproverType;
  approverUserId?: string | null;
  approverGroupIds?: string[] | null;
  timeoutHours: number;
  escalationAction: EscalationAction;
  maxReminders?: number;
  allowDelegation?: boolean;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string | null;
  steps: WorkflowStepInput[];
  isTemplate?: boolean;
  templateSlug?: string | null;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string | null;
  steps?: WorkflowStepInput[];
  isActive?: boolean;
}

export interface WorkflowStepRecord {
  order: number;
  approverType: ApproverType;
  approverUserId: string | null;
  approverGroupIds: string[] | null;
  timeoutHours: number;
  escalationAction: EscalationAction;
  maxReminders: number;
  allowDelegation: boolean;
}

export interface WorkflowRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  steps: WorkflowStepRecord[];
  autoApprovalRules: unknown[];
  isTemplate: boolean;
  templateSlug: string | null;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowSnapshot {
  workflowId: string;
  workflowVersion: number;
  name: string;
  steps: WorkflowStepRecord[];
}

export type TemplateType = "simple" | "standard" | "enterprise";
