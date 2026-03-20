/**
 * FSM states for leave requests.
 *
 * State transitions:
 *   pending_validation -> pending_approval | validation_failed
 *   pending_approval   -> approved | rejected | cancelled | auto_approved
 *   approved           -> cancelled (if not yet started)
 *   (all others)       -> terminal — no further transitions
 */
export const LEAVE_REQUEST_STATUS = {
  /** Initial state: background validation in progress. */
  pending_validation: "pending_validation",
  /** Validation passed; waiting for approver action. */
  pending_approval: "pending_approval",
  /** All approval steps completed with approval. */
  approved: "approved",
  /** At least one approver explicitly rejected. */
  rejected: "rejected",
  /** Withdrawn by the employee. */
  cancelled: "cancelled",
  /** All steps skipped via auto-approval rule. */
  auto_approved: "auto_approved",
  /** Validation failed (insufficient balance, blackout, overlap). */
  validation_failed: "validation_failed",
} as const;

export type LeaveRequestStatus =
  (typeof LEAVE_REQUEST_STATUS)[keyof typeof LEAVE_REQUEST_STATUS];

/** Terminal states — no further transitions are possible. */
export const TERMINAL_LEAVE_REQUEST_STATUSES = [
  LEAVE_REQUEST_STATUS.approved,
  LEAVE_REQUEST_STATUS.rejected,
  LEAVE_REQUEST_STATUS.cancelled,
  LEAVE_REQUEST_STATUS.auto_approved,
  LEAVE_REQUEST_STATUS.validation_failed,
] as const satisfies readonly LeaveRequestStatus[];
