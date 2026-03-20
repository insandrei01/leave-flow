/**
 * Balance ledger types — append-only ledger entries.
 * Balance is NEVER stored as a mutable field; it is always SUM(amount).
 */

export type LedgerEntryType =
  | 'initial_allocation'
  | 'accrual'
  | 'deduction'
  | 'restoration'
  | 'manual_adjustment'
  | 'carryover'
  | 'carryover_expiry'
  | 'year_end_forfeit';

export type LedgerReferenceType = 'leave_request' | 'manual' | 'system';

export interface BalanceLedgerEntry {
  readonly _id: string;
  readonly tenantId: string;
  readonly employeeId: string;
  readonly leaveTypeId: string;
  readonly entryType: LedgerEntryType;
  /** Positive = credit; negative = debit. Stored to 2 decimal places. */
  readonly amount: number;
  readonly effectiveDate: string;
  readonly description: string;
  readonly referenceType: LedgerReferenceType | null;
  readonly referenceId: string | null;
  readonly actorId: string | null;
  readonly fiscalYear: number;
  readonly isCarryover: boolean;
  /** Ledger entries are immutable — no updatedAt. */
  readonly createdAt: string;
}

export interface MonthlyUsageEntry {
  readonly month: string;
  readonly days: number;
}

export interface AccrualScheduleSummary {
  readonly type: string;
  readonly nextAccrualDate: string | null;
  readonly nextAccrualAmount: number | null;
}

export interface BalanceSummary {
  readonly leaveTypeId: string;
  readonly leaveTypeName: string;
  readonly leaveTypeColor: string;
  readonly total: number;
  readonly used: number;
  readonly pending: number;
  readonly available: number;
  readonly carried: number;
  readonly accrualSchedule: AccrualScheduleSummary;
  readonly carryoverLimit: number | null;
  readonly carryoverExpiresAt: string | null;
  readonly utilizationPercent: number;
  readonly monthlyUsage: readonly MonthlyUsageEntry[];
}
