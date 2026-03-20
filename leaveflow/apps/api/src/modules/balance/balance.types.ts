/**
 * Type definitions for the balance module.
 *
 * The balance ledger is append-only. Balance = SUM(amount) aggregation.
 * Positive amounts are credits; negative amounts are debits.
 */

import type mongoose from "mongoose";

// ----------------------------------------------------------------
// Input types for service methods
// ----------------------------------------------------------------

export interface AllocateInitialInput {
  amount: number;
  fiscalYear: number;
  effectiveDate?: Date;
}

export interface DeductInput {
  amount: number;
  leaveRequestId: mongoose.Types.ObjectId | string;
  fiscalYear: number;
  effectiveDate?: Date;
}

export interface RestoreInput {
  amount: number;
  leaveRequestId: mongoose.Types.ObjectId | string;
  fiscalYear: number;
  effectiveDate?: Date;
}

export interface AccrueInput {
  amount: number;
  fiscalYear: number;
  effectiveDate?: Date;
}

export interface ManualAdjustInput {
  amount: number;
  reason: string;
  actorId: mongoose.Types.ObjectId | string;
  fiscalYear: number;
  effectiveDate?: Date;
}

// ----------------------------------------------------------------
// Output / query types
// ----------------------------------------------------------------

export interface BalanceSummary {
  leaveTypeId: mongoose.Types.ObjectId;
  balance: number;
}

export interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TeamBalanceSummary {
  leaveTypeId: mongoose.Types.ObjectId;
  averageBalance: number;
  employeeCount: number;
}
