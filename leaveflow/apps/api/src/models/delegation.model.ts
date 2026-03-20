/**
 * Delegation model — approval delegation records.
 *
 * When a manager is OOO, they delegate approval authority to another employee.
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface IDelegation extends Document {
  tenantId: string;
  delegatorId: mongoose.Types.ObjectId;
  delegateId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  isActive: boolean;
  revokedAt: Date | null;
  revokedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const DelegationSchema = new Schema<IDelegation>(
  {
    tenantId: { type: String, required: true },
    delegatorId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    delegateId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    revokedAt: { type: Date, default: null },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "delegations",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// tenant_delegator_active — approval engine: check if current approver has active delegation
DelegationSchema.index(
  { tenantId: 1, delegatorId: 1, startDate: 1, endDate: 1 },
  { name: "tenant_delegator_active" }
);
// tenant_delegate — "what am I delegated to approve?" manager query
DelegationSchema.index(
  { tenantId: 1, delegateId: 1, isActive: 1 },
  { name: "tenant_delegate" }
);

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------

DelegationSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const DelegationModel =
  (mongoose.models["Delegation"] as mongoose.Model<IDelegation> | undefined) ??
  mongoose.model<IDelegation>("Delegation", DelegationSchema);
