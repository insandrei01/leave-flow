/**
 * Leave request module — lifecycle management and FSM delegation.
 */

export { delegationRoutes } from "./delegation.routes.js";
export { createDelegationService } from "./delegation.service.js";
export type {
  DelegationService,
  DelegationRecord,
  CreateDelegationInput,
} from "./delegation.service.js";

export { LeaveRequestRepository } from "./leave-request.repository.js";
export type { CreateLeaveRequestData } from "./leave-request.repository.js";

export { LeaveRequestService } from "./leave-request.service.js";
export type { IHolidayService } from "./leave-request.service.js";

export type {
  CreateLeaveRequestInput,
  ValidateLeaveRequestInput,
  LeaveRequestFilters,
  CalendarFilter,
  PaginationInput,
  PaginatedResult,
  ValidationResult,
  ValidationError,
} from "./leave-request.types.js";

export { createLeaveRequestRoutes } from "./leave-request.routes.js";
