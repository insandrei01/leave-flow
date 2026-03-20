/**
 * Balance module — append-only ledger for employee leave balances.
 *
 * Balance = SUM(amount) from balance_ledger for (tenantId, employeeId, leaveTypeId).
 * This value is NEVER stored as a mutable field anywhere.
 */

export { BalanceRepository } from "./balance.repository.js";
export type { LedgerInsertInput } from "./balance.repository.js";

export { BalanceService, DefaultAuditService } from "./balance.service.js";
export type { IAuditService } from "./balance.service.js";

export type {
  AllocateInitialInput,
  DeductInput,
  RestoreInput,
  AccrueInput,
  ManualAdjustInput,
  BalanceSummary,
  PaginationInput,
  PaginatedResult,
  TeamBalanceSummary,
} from "./balance.types.js";

export { createBalanceRoutes } from "./balance.routes.js";
export type { BalanceRouteDeps } from "./balance.routes.js";
