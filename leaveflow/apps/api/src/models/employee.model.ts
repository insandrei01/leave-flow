/**
 * Employee model — every user within a tenant is an employee.
 *
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";

export type EmployeeRole = "company_admin" | "hr_admin" | "manager" | "employee";
export type InvitationStatus = "pending" | "accepted" | "expired";
export type EmployeeStatus = "active" | "inactive" | "invited";
export type PrimaryPlatform = "slack" | "teams" | "email";

export interface IEmployee extends Document {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: EmployeeRole;
  teamId: mongoose.Types.ObjectId | null;
  firebaseUid: string | null;
  startDate: Date;
  primaryPlatform: PrimaryPlatform;
  timezone: string;
  profileImageUrl: string | null;
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  invitationStatus: InvitationStatus;
  status: EmployeeStatus;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    tenantId: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, minlength: 1, maxlength: 100 },
    lastName: { type: String, required: true, minlength: 1, maxlength: 100 },
    // displayName is a virtual (computed: firstName + ' ' + lastName)
    role: {
      type: String,
      enum: ["company_admin", "hr_admin", "manager", "employee"],
      default: "employee",
    },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    firebaseUid: { type: String, default: null },
    startDate: { type: Date, required: true },
    primaryPlatform: {
      type: String,
      enum: ["slack", "teams", "email"],
      default: "email",
    },
    timezone: { type: String, default: "" },
    profileImageUrl: { type: String, default: null },
    invitationToken: { type: String, default: null },
    invitationExpiresAt: { type: Date, default: null },
    invitationStatus: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "invited"],
      default: "invited",
    },
    deactivatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "employees",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Virtuals
// ----------------------------------------------------------------

EmployeeSchema.virtual("displayName").get(function (this: IEmployee) {
  return `${this.firstName} ${this.lastName}`;
});

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// tenant_email — unique within tenant
EmployeeSchema.index(
  { tenantId: 1, email: 1 },
  { unique: true, name: "tenant_email" }
);
// tenant_team
EmployeeSchema.index(
  { tenantId: 1, teamId: 1, status: 1 },
  { name: "tenant_team" }
);
// tenant_firebase — partial unique (only indexes documents where firebaseUid is a string,
// avoids E11000 collisions on null since sparse indexes still index null values)
EmployeeSchema.index(
  { tenantId: 1, firebaseUid: 1 },
  { unique: true, partialFilterExpression: { firebaseUid: { $type: "string" } }, name: "tenant_firebase" }
);
// tenant_role
EmployeeSchema.index(
  { tenantId: 1, role: 1, status: 1 },
  { name: "tenant_role" }
);
// tenant_status
EmployeeSchema.index({ tenantId: 1, status: 1 }, { name: "tenant_status" });
// invitation_token — sparse unique (no tenantId in invite URL)
EmployeeSchema.index(
  { invitationToken: 1 },
  { sparse: true, unique: true, name: "invitation_token" }
);

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------

EmployeeSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const EmployeeModel =
  (mongoose.models["Employee"] as mongoose.Model<IEmployee> | undefined) ??
  mongoose.model<IEmployee>("Employee", EmployeeSchema);
