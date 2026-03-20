/**
 * Balance check template — data builder.
 */

import type { BalanceCheckData, BalanceEntry } from "../types.js";

export interface BalanceCheckInput {
  readonly employeeName: string;
  readonly balances: readonly BalanceEntry[];
  readonly nextAccrualDate?: string;
  readonly nextAccrualDays?: number;
  readonly fiscalYear: number;
}

/**
 * Builds a BalanceCheckData object with validation.
 */
export function buildBalanceCheckData(
  input: BalanceCheckInput
): BalanceCheckData {
  if (!input.employeeName || input.employeeName.trim().length === 0) {
    throw new Error("employeeName is required for balance check template");
  }
  if (!Array.isArray(input.balances)) {
    throw new Error("balances must be an array for balance check template");
  }

  return Object.freeze({
    employeeName: input.employeeName,
    balances: Object.freeze([...input.balances]),
    nextAccrualDate: input.nextAccrualDate,
    nextAccrualDays: input.nextAccrualDays,
    fiscalYear: input.fiscalYear,
  });
}
