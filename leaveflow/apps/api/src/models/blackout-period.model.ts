/**
 * BlackoutPeriod model — date ranges when leave cannot be requested.
 *
 * Optionally scoped to specific teams or leave types.
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface IBlackoutPeriod extends Document {
  tenantId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  teamIds: mongoose.Types.ObjectId[] | null;
  leaveTypeIds: mongoose.Types.ObjectId[] | null;
  reason: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const BlackoutPeriodSchema = new Schema<IBlackoutPeriod>(
  {
    tenantId: { type: String, required: true },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // null = all teams; array = only these teams are affected
    teamIds: { type: [Schema.Types.ObjectId], ref: "Team", default: null },
    // null = all leave types; array = only these types blocked
    leaveTypeIds: {
      type: [Schema.Types.ObjectId],
      ref: "LeaveType",
      default: null,
    },
    reason: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "blackout_periods",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// tenant_dates — leave request validation: find active blackouts overlapping request dates (BR-009)
BlackoutPeriodSchema.index(
  { tenantId: 1, startDate: 1, endDate: 1, isActive: 1 },
  { name: "tenant_dates" }
);

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------

BlackoutPeriodSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const BlackoutPeriodModel =
  (mongoose.models["BlackoutPeriod"] as
    | mongoose.Model<IBlackoutPeriod>
    | undefined) ??
  mongoose.model<IBlackoutPeriod>("BlackoutPeriod", BlackoutPeriodSchema);
