/**
 * Approval engine FSM — finite state machine for leave request status transitions.
 *
 * All status changes MUST go through this module. Direct status updates are forbidden.
 * Terminal states accept no further transitions.
 */

import type { LeaveRequestStatus } from "../../models/leave-request.model.js";
import type { ApprovalEngineAction, FsmTransition } from "./approval-engine.types.js";

// ----------------------------------------------------------------
// Custom error
// ----------------------------------------------------------------

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: LeaveRequestStatus,
    public readonly action: ApprovalEngineAction
  ) {
    super(
      `Invalid FSM transition: cannot apply action "${action}" to status "${from}"`
    );
    this.name = "InvalidTransitionError";
  }
}

// ----------------------------------------------------------------
// FSM transition table
// ----------------------------------------------------------------

/**
 * Complete FSM transition table.
 *
 * pending_validation -> pending_approval     (validation_passed)
 * pending_validation -> validation_failed    (validation_failed)
 * pending_approval   -> approved             (approve)
 * pending_approval   -> rejected             (reject)
 * pending_approval   -> cancelled            (cancel)
 * pending_approval   -> auto_approved        (auto_approve)
 * pending_approval   -> pending_approval     (escalate — may advance step)
 * approved           -> cancelled            (cancel — employee cancels approved leave)
 */
const TRANSITIONS: readonly FsmTransition[] = [
  {
    from: "pending_validation",
    action: "validation_passed",
    to: "pending_approval",
  },
  {
    from: "pending_validation",
    action: "validation_failed",
    to: "validation_failed",
  },
  {
    from: "pending_approval",
    action: "approve",
    to: "approved",
  },
  {
    from: "pending_approval",
    action: "reject",
    to: "rejected",
  },
  {
    from: "pending_approval",
    action: "cancel",
    to: "cancelled",
  },
  {
    from: "pending_approval",
    action: "auto_approve",
    to: "auto_approved",
  },
  {
    from: "pending_approval",
    action: "escalate",
    to: "pending_approval", // stays pending; currentStep may advance
  },
  {
    from: "approved",
    action: "cancel",
    to: "cancelled",
  },
  {
    from: "auto_approved",
    action: "cancel",
    to: "cancelled",
  },
] as const;

/**
 * Terminal states — no further transitions are possible once reached.
 */
const TERMINAL_STATES = new Set<LeaveRequestStatus>([
  "approved",
  "rejected",
  "cancelled",
  "validation_failed",
]);

// Build a lookup map for O(1) transition resolution
const TRANSITION_MAP = new Map<string, LeaveRequestStatus>(
  TRANSITIONS.map((t) => [`${t.from}:${t.action}`, t.to])
);

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Returns the new status for a valid transition, or throws InvalidTransitionError.
 */
export function transition(
  currentStatus: LeaveRequestStatus,
  action: ApprovalEngineAction
): LeaveRequestStatus {
  const key = `${currentStatus}:${action}`;
  const nextStatus = TRANSITION_MAP.get(key);

  if (nextStatus === undefined) {
    throw new InvalidTransitionError(currentStatus, action);
  }

  return nextStatus;
}

/**
 * Returns true if the given status is a terminal state.
 * Terminal states accept no further FSM transitions.
 */
export function isTerminal(status: LeaveRequestStatus): boolean {
  return TERMINAL_STATES.has(status);
}

/**
 * Returns true if the given action can be applied to the current status.
 */
export function canTransition(
  currentStatus: LeaveRequestStatus,
  action: ApprovalEngineAction
): boolean {
  return TRANSITION_MAP.has(`${currentStatus}:${action}`);
}
