/**
 * Balance ledger repository — append-only persistence layer.
 *
 * Critical constraints:
 * - NO update or delete methods — this repository is insert-only.
 * - Balance = SUM(amount) aggregation, never stored as a mutable field.
 * - All queries are scoped by tenantId (first in every compound index).
 */

import mongoose from "mongoose";
import { BalanceLedgerModel, EmployeeModel } from "../../models/index.js";
import { withTenant } from "../../lib/tenant-scope.js";
import type { IBalanceLedger } from "../../models/index.js";
import type {
  BalanceSummary,
  PaginationInput,
  PaginatedResult,
  TeamBalanceSummary,
} from "./balance.types.js";

// ----------------------------------------------------------------
// Input type for insert (mirrors IBalanceLedger without document fields)
// ----------------------------------------------------------------

export interface LedgerInsertInput {
  tenantId: string;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  entryType: IBalanceLedger["entryType"];
  amount: number;
  effectiveDate: Date;
  description: string;
  referenceType: IBalanceLedger["referenceType"];
  referenceId: mongoose.Types.ObjectId | null;
  actorId: mongoose.Types.ObjectId | null;
  fiscalYear: number;
  isCarryover: boolean;
}

// ----------------------------------------------------------------
// Repository
// ----------------------------------------------------------------

export class BalanceRepository {
  /**
   * Appends a new ledger entry. This is the ONLY write method.
   * Updates and deletes are not supported.
   */
  async insert(input: LedgerInsertInput): Promise<IBalanceLedger> {
    const doc = new BalanceLedgerModel({ ...input });
    return doc.save();
  }

  /**
   * Computes current balance as SUM(amount) for the given dimensions.
   * Returns 0 if no entries exist.
   */
  async getBalance(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    leaveTypeId: mongoose.Types.ObjectId
  ): Promise<number> {
    const result = await BalanceLedgerModel.aggregate<{ total: number }>([
      {
        $match: withTenant(tenantId, {
          employeeId,
          leaveTypeId,
        }),
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    return result[0]?.total ?? 0;
  }

  /**
   * Returns balance per leave type for a given employee.
   * Each entry is the SUM(amount) for that (tenantId, employeeId, leaveTypeId).
   */
  async getBalances(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId
  ): Promise<BalanceSummary[]> {
    const result = await BalanceLedgerModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      balance: number;
    }>([
      {
        $match: withTenant(tenantId, { employeeId }),
      },
      {
        $group: {
          _id: "$leaveTypeId",
          balance: { $sum: "$amount" },
        },
      },
    ]);

    return result.map((r) => ({
      leaveTypeId: r._id,
      balance: r.balance,
    }));
  }

  /**
   * Returns paginated ledger history for a specific (employee, leaveType) pair.
   * Sorted by effectiveDate descending (most recent first).
   */
  async getHistory(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    leaveTypeId: mongoose.Types.ObjectId,
    pagination: PaginationInput
  ): Promise<PaginatedResult<IBalanceLedger>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const filter = withTenant(tenantId, { employeeId, leaveTypeId });

    const [items, total] = await Promise.all([
      BalanceLedgerModel.find(filter)
        .sort({ effectiveDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IBalanceLedger[]>(),
      BalanceLedgerModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Returns average balance per leave type for all employees in a team.
   * Used for the team dashboard widget.
   */
  async getTeamBalances(
    tenantId: string,
    teamId: mongoose.Types.ObjectId
  ): Promise<TeamBalanceSummary[]> {
    // First, find all employee IDs in the team
    const employees = await EmployeeModel.find(withTenant(tenantId, { teamId }))
      .select("_id")
      .lean<{ _id: mongoose.Types.ObjectId }[]>();

    if (employees.length === 0) {
      return [];
    }

    const employeeIds = employees.map((e) => e._id);

    // Compute per-employee balances per leave type, then average
    const result = await BalanceLedgerModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      averageBalance: number;
      employeeCount: number;
    }>([
      {
        $match: withTenant(tenantId, { employeeId: { $in: employeeIds } }),
      },
      {
        $group: {
          _id: { leaveTypeId: "$leaveTypeId", employeeId: "$employeeId" },
          employeeBalance: { $sum: "$amount" },
        },
      },
      {
        $group: {
          _id: "$_id.leaveTypeId",
          averageBalance: { $avg: "$employeeBalance" },
          employeeCount: { $sum: 1 },
        },
      },
    ]);

    return result.map((r) => ({
      leaveTypeId: r._id,
      averageBalance: r.averageBalance,
      employeeCount: r.employeeCount,
    }));
  }
}
