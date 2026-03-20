/**
 * Balance service — business logic for balance mutations.
 *
 * All mutations create new ledger entries (append-only).
 * Balance is always computed fresh from the ledger.
 */

import mongoose from "mongoose";
import { AuditLogModel } from "../../models/index.js";
import type { BalanceRepository } from "./balance.repository.js";
import type {
  AllocateInitialInput,
  DeductInput,
  RestoreInput,
  AccrueInput,
  ManualAdjustInput,
  BalanceSummary,
} from "./balance.types.js";

// ----------------------------------------------------------------
// Audit service interface (loose coupling)
// ----------------------------------------------------------------

export interface IAuditService {
  log: (entry: {
    tenantId: string;
    actorId: mongoose.Types.ObjectId | string;
    actorType: "employee" | "system" | "bot";
    action: string;
    entityType: string;
    entityId: mongoose.Types.ObjectId | string;
    changes?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }) => Promise<void>;
}

// ----------------------------------------------------------------
// Default audit service — writes to AuditLogModel
// ----------------------------------------------------------------

export class DefaultAuditService implements IAuditService {
  async log(entry: Parameters<IAuditService["log"]>[0]): Promise<void> {
    const doc = new AuditLogModel({
      ...entry,
      timestamp: new Date(),
    });
    await doc.save();
  }
}

// ----------------------------------------------------------------
// Balance service
// ----------------------------------------------------------------

export class BalanceService {
  constructor(
    private readonly repo: BalanceRepository,
    private readonly auditService: IAuditService = new DefaultAuditService()
  ) {}

  /**
   * Creates an initial_allocation ledger entry.
   * Called once per employee per leave type at the start of a fiscal year.
   */
  async allocateInitial(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    leaveTypeId: mongoose.Types.ObjectId,
    amount: number,
    input: AllocateInitialInput
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error("amount must be positive for initial_allocation");
    }

    const effectiveDate = input.effectiveDate ?? new Date();

    await this.repo.insert({
      tenantId,
      employeeId,
      leaveTypeId,
      entryType: "initial_allocation",
      amount,
      effectiveDate,
      description: `Initial allocation of ${amount} days for fiscal year ${input.fiscalYear}`,
      referenceType: "system",
      referenceId: null,
      actorId: null,
      fiscalYear: input.fiscalYear,
      isCarryover: false,
    });

    await this.auditService.log({
      tenantId,
      actorId: "system",
      actorType: "system",
      action: "balance.allocate_initial",
      entityType: "balance_ledger",
      entityId: employeeId,
      metadata: { leaveTypeId, amount, fiscalYear: input.fiscalYear },
    });
  }

  /**
   * Creates a deduction ledger entry (negative amount).
   * Called when a leave request is approved.
   */
  async deduct(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    leaveTypeId: mongoose.Types.ObjectId,
    amount: number,
    leaveRequestId: mongoose.Types.ObjectId | string,
    input: DeductInput
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error("amount must be positive for deduction");
    }

    const effectiveDate = input.effectiveDate ?? new Date();
    const referenceId =
      leaveRequestId instanceof mongoose.Types.ObjectId
        ? leaveRequestId
        : new mongoose.Types.ObjectId(leaveRequestId);

    await this.repo.insert({
      tenantId,
      employeeId,
      leaveTypeId,
      entryType: "deduction",
      amount: -amount,
      effectiveDate,
      description: `Deduction of ${amount} days for approved leave request`,
      referenceType: "leave_request",
      referenceId,
      actorId: null,
      fiscalYear: input.fiscalYear,
      isCarryover: false,
    });

    await this.auditService.log({
      tenantId,
      actorId: "system",
      actorType: "system",
      action: "balance.deduct",
      entityType: "balance_ledger",
      entityId: employeeId,
      metadata: { leaveTypeId, amount, leaveRequestId },
    });
  }

  /**
   * Creates a restoration ledger entry (positive amount).
   * Called when an approved leave request is cancelled.
   */
  async restore(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    leaveTypeId: mongoose.Types.ObjectId,
    amount: number,
    leaveRequestId: mongoose.Types.ObjectId | string,
    input: RestoreInput
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error("amount must be positive for restoration");
    }

    const effectiveDate = input.effectiveDate ?? new Date();
    const referenceId =
      leaveRequestId instanceof mongoose.Types.ObjectId
        ? leaveRequestId
        : new mongoose.Types.ObjectId(leaveRequestId);

    await this.repo.insert({
      tenantId,
      employeeId,
      leaveTypeId,
      entryType: "restoration",
      amount,
      effectiveDate,
      description: `Restoration of ${amount} days for cancelled leave request`,
      referenceType: "leave_request",
      referenceId,
      actorId: null,
      fiscalYear: input.fiscalYear,
      isCarryover: false,
    });

    await this.auditService.log({
      tenantId,
      actorId: "system",
      actorType: "system",
      action: "balance.restore",
      entityType: "balance_ledger",
      entityId: employeeId,
      metadata: { leaveTypeId, amount, leaveRequestId },
    });
  }

  /**
   * Creates an accrual ledger entry (positive amount).
   * Called by the periodic accrual cron job.
   */
  async accrue(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    leaveTypeId: mongoose.Types.ObjectId,
    amount: number,
    input: AccrueInput
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error("amount must be positive for accrual");
    }

    const effectiveDate = input.effectiveDate ?? new Date();

    await this.repo.insert({
      tenantId,
      employeeId,
      leaveTypeId,
      entryType: "accrual",
      amount,
      effectiveDate,
      description: `Accrual of ${amount} days`,
      referenceType: "system",
      referenceId: null,
      actorId: null,
      fiscalYear: input.fiscalYear,
      isCarryover: false,
    });

    await this.auditService.log({
      tenantId,
      actorId: "system",
      actorType: "system",
      action: "balance.accrue",
      entityType: "balance_ledger",
      entityId: employeeId,
      metadata: { leaveTypeId, amount, fiscalYear: input.fiscalYear },
    });
  }

  /**
   * Creates a manual_adjustment ledger entry.
   * Amount can be positive or negative (HR correction).
   */
  async adjustManual(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    leaveTypeId: mongoose.Types.ObjectId,
    amount: number,
    reason: string,
    actorId: mongoose.Types.ObjectId | string,
    input: ManualAdjustInput
  ): Promise<void> {
    if (!reason || reason.trim().length === 0) {
      throw new Error("reason is required for manual_adjustment");
    }

    const effectiveDate = input.effectiveDate ?? new Date();
    const actorObjectId =
      actorId instanceof mongoose.Types.ObjectId
        ? actorId
        : new mongoose.Types.ObjectId(String(actorId));

    await this.repo.insert({
      tenantId,
      employeeId,
      leaveTypeId,
      entryType: "manual_adjustment",
      amount,
      effectiveDate,
      description: reason,
      referenceType: "manual",
      referenceId: null,
      actorId: actorObjectId,
      fiscalYear: input.fiscalYear,
      isCarryover: false,
    });

    await this.auditService.log({
      tenantId,
      actorId: actorObjectId,
      actorType: "employee",
      action: "balance.manual_adjust",
      entityType: "balance_ledger",
      entityId: employeeId,
      metadata: { leaveTypeId, amount, reason },
    });
  }

  /**
   * Returns true if the current balance (fresh SUM) >= requiredAmount.
   * Never uses cached values — always queries the ledger.
   */
  async checkSufficientBalance(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    leaveTypeId: mongoose.Types.ObjectId,
    requiredAmount: number
  ): Promise<boolean> {
    const balance = await this.repo.getBalance(tenantId, employeeId, leaveTypeId);
    return balance >= requiredAmount;
  }

  /**
   * Returns the current balance summary for all leave types for an employee.
   */
  async getEmployeeBalances(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId
  ): Promise<BalanceSummary[]> {
    return this.repo.getBalances(tenantId, employeeId);
  }
}
