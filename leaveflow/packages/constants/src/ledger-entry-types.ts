/**
 * Entry types for the append-only balance ledger.
 *
 * Positive entries increase balance; negative entries decrease it.
 * Current balance = SUM(amount) for (tenantId, employeeId, leaveTypeId).
 *
 * Rule: existing entries are NEVER modified or deleted.
 * Corrections always create new entries.
 */
export const LEDGER_ENTRY_TYPES = {
  /** Initial balance granted at hire or policy start. (+) */
  initial_allocation: "initial_allocation",
  /** Periodic balance increase per accrual rule. (+) */
  accrual: "accrual",
  /** Balance consumed when a request is approved. (-) */
  deduction: "deduction",
  /** Balance restored when an approved request is cancelled. (+) */
  restoration: "restoration",
  /** Manual correction by HR admin (positive or negative). (+/-) */
  manual_adjustment: "manual_adjustment",
  /** Unused balance carried into the next period per carryover rule. (+) */
  carryover: "carryover",
  /** Carried-over balance that has reached its expiry date. (-) */
  carryover_expiry: "carryover_expiry",
  /** Unused balance forfeited at year end (use-it-or-lose-it policy). (-) */
  year_end_forfeit: "year_end_forfeit",
} as const;

export type LedgerEntryType =
  (typeof LEDGER_ENTRY_TYPES)[keyof typeof LEDGER_ENTRY_TYPES];

/** Entry types that always produce a positive amount. */
export const POSITIVE_LEDGER_ENTRY_TYPES = [
  LEDGER_ENTRY_TYPES.initial_allocation,
  LEDGER_ENTRY_TYPES.accrual,
  LEDGER_ENTRY_TYPES.restoration,
  LEDGER_ENTRY_TYPES.carryover,
] as const satisfies readonly LedgerEntryType[];

/** Entry types that always produce a negative amount. */
export const NEGATIVE_LEDGER_ENTRY_TYPES = [
  LEDGER_ENTRY_TYPES.deduction,
  LEDGER_ENTRY_TYPES.carryover_expiry,
  LEDGER_ENTRY_TYPES.year_end_forfeit,
] as const satisfies readonly LedgerEntryType[];
