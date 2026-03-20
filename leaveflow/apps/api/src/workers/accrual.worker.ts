/**
 * Accrual worker — processes monthly leave accrual for a single leave type.
 *
 * Runs as a BullMQ repeatable job on the 1st of each month.
 * For each job:
 * 1. Load the leave type to get the accrual rule
 * 2. Find all active employees for the tenant
 * 3. Calculate accrual per employee (with probation reduction)
 * 4. Batch-insert all ledger entries via a single insertMany call
 * 5. Write a single "balance.accrual_batch" audit log entry
 */

import mongoose from "mongoose";
import type { AccrualJobData } from "../lib/bullmq.js";
import type { AccrualRule } from "../models/leave-type.model.js";

// ----------------------------------------------------------------
// Dependency interfaces (loose coupling)
// ----------------------------------------------------------------

export interface ILeaveTypeModelDep {
  findById(id: mongoose.Types.ObjectId | string): Promise<ILeaveTypeDoc | null>;
}

export interface ILeaveTypeDoc {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  defaultEntitlementDays: number;
  accrualRule: AccrualRule;
  carryoverRule: { enabled: boolean; maxDays: number | null; expiryMonths: number | null };
  isActive: boolean;
}

export interface IEmployeeModelDep {
  find(query: Record<string, unknown>): {
    lean<T>(): Promise<T[]>;
  };
}

export interface IEmployeeDoc {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  status: string;
  startDate: Date;
}

/** Shape of a ledger entry ready to be bulk-inserted */
export interface ILedgerEntryInput {
  tenantId: string;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  entryType: "accrual";
  amount: number;
  effectiveDate: Date;
  description: string;
  referenceType: "system";
  referenceId: null;
  actorId: null;
  fiscalYear: number;
  isCarryover: false;
}

export interface IBalanceLedgerModelDep {
  insertMany(docs: ILedgerEntryInput[]): Promise<unknown>;
}

export interface IAuditServiceDep {
  log(entry: {
    tenantId: string;
    actorId: string;
    actorType: "system";
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<void>;
}

export interface AccrualWorkerDeps {
  leaveTypeModel: ILeaveTypeModelDep;
  employeeModel: IEmployeeModelDep;
  balanceLedgerModel: IBalanceLedgerModelDep;
  auditService?: IAuditServiceDep;
}

// ----------------------------------------------------------------
// Probation constants
// ----------------------------------------------------------------

const PROBATION_MONTHS = 3;
const PROBATION_ACCRUAL_MULTIPLIER = 0.5;

// ----------------------------------------------------------------
// Pure calculation helper (exported for direct testing)
// ----------------------------------------------------------------

/**
 * Calculates the accrual amount for one employee for one period.
 *
 * Rules:
 * - monthly accrual: annualDays / 12
 * - quarterly accrual: annualDays / 4
 * - front_loaded / none / custom: 0 (not handled by this job)
 * - probation (< 3 months since startDate): multiply by 0.5
 */
export function calculateAccrualAmount(
  rule: AccrualRule,
  annualDays: number,
  effectiveDate: Date,
  employeeStartDate?: Date
): number {
  let base = 0;

  if (rule.type === "monthly") {
    base = annualDays / 12;
  } else if (rule.type === "quarterly") {
    base = annualDays / 4;
  } else {
    return 0;
  }

  if (employeeStartDate !== undefined) {
    const monthsEmployed = monthsBetween(employeeStartDate, effectiveDate);
    if (monthsEmployed < PROBATION_MONTHS) {
      base = base * PROBATION_ACCRUAL_MULTIPLIER;
    }
  }

  return base;
}

// ----------------------------------------------------------------
// Job processor
// ----------------------------------------------------------------

/**
 * Processes a single accrual job for one (tenant, leaveType) pair.
 *
 * Collects all ledger entries first, then performs a single batch
 * insertMany call instead of sequential per-employee awaits. This
 * reduces MongoDB round-trips from O(N) to O(1) for N employees.
 */
export async function processAccrualJob(
  data: AccrualJobData,
  deps: AccrualWorkerDeps
): Promise<void> {
  const { tenantId, leaveTypeId, effectiveDate } = data;

  const leaveType = await deps.leaveTypeModel.findById(
    new mongoose.Types.ObjectId(leaveTypeId)
  );

  if (leaveType === null) {
    console.warn(`[accrual] Leave type not found: ${leaveTypeId}`);
    return;
  }

  if (!leaveType.isActive) {
    console.info(`[accrual] Leave type inactive, skipping: ${leaveTypeId}`);
    return;
  }

  if (
    leaveType.accrualRule.type === "none" ||
    leaveType.accrualRule.type === "front_loaded"
  ) {
    console.info(
      `[accrual] No periodic accrual for type ${leaveType.accrualRule.type}, skipping`
    );
    return;
  }

  const date = new Date(effectiveDate);
  const fiscalYear = date.getFullYear();

  const employees = await deps.employeeModel
    .find({ tenantId, status: "active" })
    .lean<IEmployeeDoc>();

  // Collect entries without awaiting — build the batch first
  const entries: ILedgerEntryInput[] = [];
  let skipped = 0;

  for (const employee of employees) {
    const amount = calculateAccrualAmount(
      leaveType.accrualRule,
      leaveType.defaultEntitlementDays,
      date,
      employee.startDate
    );

    if (amount <= 0) {
      skipped++;
      continue;
    }

    entries.push({
      tenantId,
      employeeId: employee._id,
      leaveTypeId: leaveType._id,
      entryType: "accrual",
      amount,
      effectiveDate: date,
      description: `Accrual of ${amount} days`,
      referenceType: "system",
      referenceId: null,
      actorId: null,
      fiscalYear,
      isCarryover: false,
    });
  }

  // Single batch insert for all employees
  if (entries.length > 0) {
    await deps.balanceLedgerModel.insertMany(entries);
  }

  const employeeCount = entries.length;

  console.info(
    `[accrual] tenant=${tenantId} leaveType=${leaveTypeId} date=${effectiveDate} ` +
    `accrued=${employeeCount} skipped=${skipped}`
  );

  // Single audit log entry for the entire batch
  if (deps.auditService !== undefined && employeeCount > 0) {
    await deps.auditService.log({
      tenantId,
      actorId: "system",
      actorType: "system",
      action: "balance.accrual_batch",
      entityType: "balance_ledger",
      entityId: leaveTypeId,
      metadata: {
        employeeCount,
        leaveTypeId,
        amount: leaveType.defaultEntitlementDays,
        period: effectiveDate,
      },
    });
  }
}

// ----------------------------------------------------------------
// Private helpers
// ----------------------------------------------------------------

function monthsBetween(start: Date, end: Date): number {
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  return years * 12 + months;
}
