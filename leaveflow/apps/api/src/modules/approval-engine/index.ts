/**
 * Approval engine module — FSM and service for leave request state transitions.
 *
 * All status changes MUST go through the FSM. Direct status updates are forbidden.
 */

export { approvalRoutes } from "./approval.routes.js";

export {
  transition,
  isTerminal,
  canTransition,
  InvalidTransitionError,
} from "./approval-engine.fsm.js";

export { ApprovalEngineService } from "./approval-engine.service.js";
export type {
  ILeaveRequestRepository,
  LeaveRequestUpdate,
  IBalanceServiceDep,
  IAuditServiceDep,
  WorkflowWithAutoRules,
} from "./approval-engine.service.js";

export type {
  ApprovalEngineAction,
  FsmTransition,
  ProcessApprovalInput,
  ProcessRejectionInput,
  ProcessEscalationInput,
  ProcessCancellationInput,
  ApprovalResult,
} from "./approval-engine.types.js";
