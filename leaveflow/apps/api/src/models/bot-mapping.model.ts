/**
 * BotMapping model — maps platform user IDs to LeaveFlow employees.
 *
 * IMPORTANT: This model is the one exception to the tenantId-first-in-index rule.
 * Bot webhook events arrive with a platform user ID and platform team ID.
 * Tenant is resolved FROM this mapping. The primary index starts with `platform`.
 *
 * The requireTenantIdPlugin is NOT applied here — bot resolution queries
 * legitimately omit tenantId.
 */

import mongoose, { Schema, type Document } from "mongoose";

// ----------------------------------------------------------------
// Type definitions
// ----------------------------------------------------------------

export type BotPlatform = "slack" | "teams";

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface IBotMapping extends Document {
  tenantId: string;
  platform: BotPlatform;
  platformUserId: string;
  platformTeamId: string;
  employeeId: mongoose.Types.ObjectId;
  conversationReference: Record<string, unknown> | null;
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const BotMappingSchema = new Schema<IBotMapping>(
  {
    tenantId: { type: String, required: true },
    platform: {
      type: String,
      enum: ["slack", "teams"],
      required: true,
    },
    platformUserId: { type: String, required: true },
    platformTeamId: { type: String, required: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    conversationReference: { type: Schema.Types.Mixed, default: null },
    lastInteractionAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    collection: "bot_mappings",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// platform_user — PRIMARY index (NO tenantId prefix — bot events arrive without tenant context)
// Unique: one employee per platform per workspace
BotMappingSchema.index(
  { platform: 1, platformUserId: 1, platformTeamId: 1 },
  { unique: true, name: "platform_user" }
);
// tenant_employee_platform — find bot mapping for an employee (to send notifications)
BotMappingSchema.index(
  { tenantId: 1, employeeId: 1, platform: 1 },
  { unique: true, name: "tenant_employee_platform" }
);

// NOTE: requireTenantIdPlugin is intentionally NOT applied to this model.
// Bot resolution queries use platform IDs and must be allowed without tenantId.

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const BotMappingModel =
  (mongoose.models["BotMapping"] as mongoose.Model<IBotMapping> | undefined) ??
  mongoose.model<IBotMapping>("BotMapping", BotMappingSchema);
