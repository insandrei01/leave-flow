/**
 * Workflow entity types — approval chain definitions with versioned steps.
 */

export type ApproverType =
  | 'specific_user'
  | 'role_direct_manager'
  | 'role_team_lead'
  | 'role_hr'
  | 'group';

export type TimeoutAction = 'escalate_next' | 'remind' | 'auto_approve' | 'notify_hr' | 'none';

export interface WorkflowStep {
  readonly order: number;
  readonly approverType: ApproverType;
  readonly approverUserId: string | null;
  readonly approverGroupIds: readonly string[] | null;
  readonly timeoutHours: number;
  readonly escalationAction: TimeoutAction;
  readonly maxReminders: number;
  readonly allowDelegation: boolean;
}

export interface AutoApprovalRule {
  readonly leaveTypeId: string;
  readonly maxDurationDays: number;
  readonly isActive: boolean;
}

export interface Workflow {
  readonly _id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description: string | null;
  readonly steps: readonly WorkflowStep[];
  readonly autoApprovalRules: readonly AutoApprovalRule[];
  readonly isTemplate: boolean;
  readonly templateSlug: string | null;
  readonly version: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
