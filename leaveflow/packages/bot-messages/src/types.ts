/**
 * Template data interfaces for bot message renderers.
 *
 * Each interface represents the data required to render a specific
 * message type on any platform. Renderers transform these into
 * platform-specific payloads (Slack Block Kit, Teams Adaptive Cards).
 *
 * All fields are readonly — renderers must never mutate input data.
 */

// ----------------------------------------------------------------
// Shared sub-types
// ----------------------------------------------------------------

export interface BalanceEntry {
  readonly leaveTypeName: string;
  readonly used: number;
  readonly total: number;
}

export interface ApprovalStep {
  readonly name: string;
  /** "completed" | "active" | "pending" */
  readonly state: "completed" | "active" | "pending";
}

// ----------------------------------------------------------------
// Template data interfaces
// ----------------------------------------------------------------

/**
 * Data for the approval request card sent to an approver.
 */
export interface ApprovalRequestData {
  readonly requestId: string;
  readonly employeeName: string;
  readonly employeeAvatarUrl?: string;
  readonly leaveTypeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly reason: string | null;
  readonly teamName: string;
  readonly balanceAfter: number;
  readonly balanceTotal: number;
  readonly teamCoverage: number;
  readonly othersOut: readonly string[];
  readonly approvalChain: readonly ApprovalStep[];
  readonly submittedAt: string;
  readonly autoEscalateInHours?: number;
  readonly appBaseUrl: string;
}

/**
 * Data for the approved notification sent to the requesting employee.
 */
export interface ApprovedNotificationData {
  readonly requestId: string;
  readonly leaveTypeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly newBalance: number;
  readonly totalBalance: number;
  readonly approvalChain: readonly ApprovalStep[];
}

/**
 * Data for the rejected notification sent to the requesting employee.
 */
export interface RejectedNotificationData {
  readonly requestId: string;
  readonly leaveTypeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly rejectedByName: string;
  readonly rejectedByRole: string;
  readonly rejectionReason: string;
  readonly approvalChain: readonly ApprovalStep[];
  readonly appBaseUrl: string;
}

/**
 * Data for the stale reminder sent to an approver who has not acted.
 */
export interface StaleReminderData {
  readonly requestId: string;
  readonly employeeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly leaveTypeName: string;
  readonly workingDays: number;
  readonly waitingHours: number;
  readonly waitingSince: string;
  readonly reminderNumber: number;
  readonly totalReminders: number;
  readonly autoEscalateInHours?: number;
  readonly appBaseUrl: string;
}

/**
 * Data for the balance check response shown to an employee.
 */
export interface BalanceCheckData {
  readonly employeeName: string;
  readonly balances: readonly BalanceEntry[];
  readonly nextAccrualDate?: string;
  readonly nextAccrualDays?: number;
  readonly fiscalYear: number;
}

/**
 * Data for a team channel announcement when leave is approved.
 * Deliberately minimal to respect privacy (BR-092: no leave type exposed).
 */
export interface TeamAnnouncementData {
  readonly employeeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
}
