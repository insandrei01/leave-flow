/**
 * AuditLog model — immutable audit trail for all state-changing operations.
 *
 * Critical design constraints (BR-100):
 * - NO updatedAt field (timestamps: { createdAt: true, updatedAt: false })
 * - updateOne, updateMany, findOneAndUpdate, deleteOne, deleteMany are BLOCKED
 * - actorId uses IDs (not names) to support GDPR pseudonymization
 *
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";

// ----------------------------------------------------------------
// Type definitions
// ----------------------------------------------------------------

export type AuditActorType = "employee" | "system" | "bot";

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface IAuditLog extends Document {
  tenantId: string;
  actorId: mongoose.Types.ObjectId | string;
  actorType: AuditActorType;
  action: string;
  entityType: string;
  entityId: mongoose.Types.ObjectId | string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
  createdAt: Date;
  // updatedAt intentionally omitted
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const AuditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: { type: String, required: true },
    // actorId may be an ObjectId or a pseudonymized hash string (GDPR)
    actorId: { type: Schema.Types.Mixed, required: true },
    actorType: {
      type: String,
      enum: ["employee", "system", "bot"],
      required: true,
    },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    // entityId may be an ObjectId or a string identifier
    entityId: { type: Schema.Types.Mixed, required: true },
    changes: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
    timestamp: { type: Date, required: true, default: () => new Date() },
  },
  {
    // NO updatedAt — audit log entries are immutable once created
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_logs",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// tenant_timestamp — chronological audit trail browsing
AuditLogSchema.index(
  { tenantId: 1, timestamp: -1 },
  { name: "tenant_timestamp" }
);
// tenant_entity — audit history for a specific entity
AuditLogSchema.index(
  { tenantId: 1, entityType: 1, entityId: 1, timestamp: -1 },
  { name: "tenant_entity" }
);
// tenant_actor — compliance investigations ("what did this person do?")
AuditLogSchema.index(
  { tenantId: 1, actorId: 1, timestamp: -1 },
  { name: "tenant_actor" }
);
// tenant_action — activity feed: recent approvals, rejections, submissions
AuditLogSchema.index(
  { tenantId: 1, action: 1, timestamp: -1 },
  { name: "tenant_action" }
);

// ----------------------------------------------------------------
// Immutability enforcement middleware
// ----------------------------------------------------------------

const IMMUTABLE_ERROR =
  "audit_logs is immutable. Updates and deletes are not permitted. " +
  "This collection is insert-only.";

AuditLogSchema.pre("updateOne", function () {
  throw new Error(IMMUTABLE_ERROR);
});

AuditLogSchema.pre("updateMany", function () {
  throw new Error(IMMUTABLE_ERROR);
});

AuditLogSchema.pre("findOneAndUpdate", function () {
  throw new Error(IMMUTABLE_ERROR);
});

AuditLogSchema.pre("deleteOne", function () {
  throw new Error(IMMUTABLE_ERROR);
});

AuditLogSchema.pre("deleteMany", function () {
  throw new Error(IMMUTABLE_ERROR);
});

// ----------------------------------------------------------------
// tenantId guard
// ----------------------------------------------------------------

AuditLogSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const AuditLogModel =
  (mongoose.models["AuditLog"] as mongoose.Model<IAuditLog> | undefined) ??
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
