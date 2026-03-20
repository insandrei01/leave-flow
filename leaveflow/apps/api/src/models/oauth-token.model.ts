/**
 * OAuthToken model — encrypted OAuth tokens for calendar integrations.
 *
 * Tokens are AES-256 encrypted before storage.
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";

// ----------------------------------------------------------------
// Type definitions
// ----------------------------------------------------------------

export type OAuthService = "google_calendar" | "outlook_calendar";

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface IOAuthToken extends Document {
  tenantId: string;
  employeeId: mongoose.Types.ObjectId;
  service: OAuthService;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  tokenExpiresAt: Date;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const OAuthTokenSchema = new Schema<IOAuthToken>(
  {
    tenantId: { type: String, required: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    service: {
      type: String,
      enum: ["google_calendar", "outlook_calendar"],
      required: true,
    },
    encryptedAccessToken: { type: String, required: true },
    encryptedRefreshToken: { type: String, required: true },
    tokenExpiresAt: { type: Date, required: true },
    scopes: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "oauth_tokens",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// tenant_employee_service — calendar sync: find token for employee + service
OAuthTokenSchema.index(
  { tenantId: 1, employeeId: 1, service: 1 },
  { unique: true, name: "tenant_employee_service" }
);

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------

OAuthTokenSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const OAuthTokenModel =
  (mongoose.models["OAuthToken"] as mongoose.Model<IOAuthToken> | undefined) ??
  mongoose.model<IOAuthToken>("OAuthToken", OAuthTokenSchema);
