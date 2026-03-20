/**
 * Team model — organizational unit within a tenant.
 *
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";

export interface ITeam extends Document {
  tenantId: string;
  name: string;
  managerId: mongoose.Types.ObjectId | null;
  workflowId: mongoose.Types.ObjectId | null;
  announcementChannelSlack: string | null;
  announcementChannelTeams: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    tenantId: { type: String, required: true },
    name: { type: String, required: true, minlength: 1, maxlength: 100 },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: "Workflow",
      default: null,
    },
    announcementChannelSlack: { type: String, default: null },
    announcementChannelTeams: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "teams",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// tenant_name — unique name within tenant
TeamSchema.index(
  { tenantId: 1, name: 1 },
  { unique: true, name: "tenant_name" }
);
// tenant_workflow
TeamSchema.index(
  { tenantId: 1, workflowId: 1 },
  { name: "tenant_workflow" }
);
// tenant_manager
TeamSchema.index(
  { tenantId: 1, managerId: 1 },
  { name: "tenant_manager" }
);

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------

TeamSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const TeamModel =
  (mongoose.models["Team"] as mongoose.Model<ITeam> | undefined) ??
  mongoose.model<ITeam>("Team", TeamSchema);
