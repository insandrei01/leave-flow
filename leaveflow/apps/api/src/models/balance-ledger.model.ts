/**
 * BalanceLedger model — append-only ledger of balance mutations.
 *
 * Critical design constraints:
 * - NO updatedAt field (timestamps: { createdAt: true, updatedAt: false })
 * - updateOne, updateMany, findOneAndUpdate are BLOCKED via middleware
 * - Current balance = SUM(amount) for (tenantId, employeeId, leaveTypeId)
 * - Amounts are signed: positive = credit, negative = debit
 *
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";

// ----------------------------------------------------------------
// Type definitions
// ----------------------------------------------------------------

export type LedgerEntryType =
  | "initial_allocation"
  | "accrual"
  | "deduction"
  | "restoration"
  | "manual_adjustment"
  | "carryover"
  | "carryover_expiry"
  | "year_end_forfeit";

export type LedgerReferenceType = "leave_request" | "manual" | "system";

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface IBalanceLedger extends Document {
  tenantId: string;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  entryType: LedgerEntryType;
  amount: number;
  effectiveDate: Date;
  description: string;
  referenceType: LedgerReferenceType | null;
  referenceId: mongoose.Types.ObjectId | null;
  actorId: mongoose.Types.ObjectId | null;
  fiscalYear: number;
  isCarryover: boolean;
  createdAt: Date;
  // updatedAt intentionally omitted
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const BalanceLedgerSchema = new Schema<IBalanceLedger>(
  {
    tenantId: { type: String, required: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveTypeId: {
      type: Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    entryType: {
      type: String,
      enum: [
        "initial_allocation",
        "accrual",
        "deduction",
        "restoration",
        "manual_adjustment",
        "carryover",
        "carryover_expiry",
        "year_end_forfeit",
      ],
      required: true,
    },
    // Stored to 2 decimal places (BR-044). Positive = credit, negative = debit.
    amount: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    description: { type: String, required: true },
    referenceType: {
      type: String,
      enum: ["leave_request", "manual", "system"],
      default: null,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    fiscalYear: { type: Number, required: true },
    isCarryover: { type: Boolean, default: false },
  },
  {
    // NO updatedAt — ledger entries are immutable once created
    timestamps: { createdAt: true, updatedAt: false },
    collection: "balance_ledger",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// balance_query — THE critical index: supports balance SUM aggregation
BalanceLedgerSchema.index(
  { tenantId: 1, employeeId: 1, leaveTypeId: 1, effectiveDate: -1 },
  { name: "balance_query" }
);
// tenant_type_fiscal — annual balance report by leave type
BalanceLedgerSchema.index(
  { tenantId: 1, leaveTypeId: 1, fiscalYear: 1 },
  { name: "tenant_type_fiscal" }
);
// tenant_reference — find ledger entries for a specific leave request
BalanceLedgerSchema.index(
  { tenantId: 1, referenceType: 1, referenceId: 1 },
  { name: "tenant_reference" }
);
// tenant_entry_date — accrual worker: find last accrual date
BalanceLedgerSchema.index(
  { tenantId: 1, entryType: 1, effectiveDate: -1 },
  { name: "tenant_entry_date" }
);

// ----------------------------------------------------------------
// Append-only enforcement middleware
// ----------------------------------------------------------------

const APPEND_ONLY_ERROR =
  "balance_ledger is append-only. Updates are not permitted. " +
  "Create a new ledger entry instead.";

BalanceLedgerSchema.pre("updateOne", function () {
  throw new Error(APPEND_ONLY_ERROR);
});

BalanceLedgerSchema.pre("updateMany", function () {
  throw new Error(APPEND_ONLY_ERROR);
});

BalanceLedgerSchema.pre("findOneAndUpdate", function () {
  throw new Error(APPEND_ONLY_ERROR);
});

// ----------------------------------------------------------------
// tenantId guard
// ----------------------------------------------------------------

BalanceLedgerSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const BalanceLedgerModel =
  (mongoose.models["BalanceLedger"] as
    | mongoose.Model<IBalanceLedger>
    | undefined) ??
  mongoose.model<IBalanceLedger>("BalanceLedger", BalanceLedgerSchema);
