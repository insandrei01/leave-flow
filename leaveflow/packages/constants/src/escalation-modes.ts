/**
 * Escalation behavior when an approval step exceeds its timeout threshold.
 */
export const ESCALATION_MODES = {
  /** Skip the current step and advance to the next approver. */
  escalate_next: "escalate_next",
  /** Send a reminder notification to the current approver (up to 3 times). */
  remind: "remind",
  /** Automatically approve the request after timeout. */
  auto_approve: "auto_approve",
  /** Notify the HR admin and leave the step pending. */
  notify_hr: "notify_hr",
} as const;

export type EscalationMode =
  (typeof ESCALATION_MODES)[keyof typeof ESCALATION_MODES];
