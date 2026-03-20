/**
 * Actions that can be recorded in the approval history of a leave request.
 */
export const APPROVAL_ACTIONS = {
  /** Approver explicitly approved the request. */
  approved: "approved",
  /** Approver explicitly rejected the request (reason required). */
  rejected: "rejected",
  /** Request was escalated to the next step due to timeout. */
  escalated: "escalated",
  /** Step was skipped (e.g., approver is the requester). */
  skipped: "skipped",
  /** Authority was transferred to a delegate. */
  delegated: "delegated",
  /** HR admin overrode and force-approved a stale request. */
  force_approved: "force_approved",
} as const;

export type ApprovalAction =
  (typeof APPROVAL_ACTIONS)[keyof typeof APPROVAL_ACTIONS];
