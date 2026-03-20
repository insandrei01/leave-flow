/**
 * LeaveType model — leave type configuration per tenant.
 *
 * Seeded with defaults on tenant creation (BR-053).
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";

// ----------------------------------------------------------------
// Sub-document interfaces
// ----------------------------------------------------------------

export type AccrualType = "front_loaded" | "monthly" | "quarterly" | "custom" | "none";

export interface CustomScheduleEntry {
  month: number;
  day: number;
  amount: number;
}

export interface AccrualRule {
  type: AccrualType;
  dayOfMonth: number | null;
  customSchedule: CustomScheduleEntry[] | null;
}

export interface CarryoverRule {
  enabled: boolean;
  maxDays: number | null;
  expiryMonths: number | null;
}

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface ILeaveType extends Document {
  tenantId: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  isPaid: boolean;
  requiresApproval: boolean;
  defaultEntitlementDays: number;
  allowNegativeBalance: boolean;
  accrualRule: AccrualRule;
  carryoverRule: CarryoverRule;
  isUnlimited: boolean;
  isRetroactiveAllowed: boolean;
  isActive: boolean;
  sortOrder: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const CustomScheduleEntrySchema = new Schema<CustomScheduleEntry>(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    day: { type: Number, required: true, min: 1, max: 31 },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const AccrualRuleSchema = new Schema<AccrualRule>(
  {
    type: {
      type: String,
      enum: ["front_loaded", "monthly", "quarterly", "custom", "none"],
      default: "front_loaded",
    },
    dayOfMonth: { type: Number, default: 1 },
    customSchedule: { type: [CustomScheduleEntrySchema], default: null },
  },
  { _id: false }
);

const CarryoverRuleSchema = new Schema<CarryoverRule>(
  {
    enabled: { type: Boolean, default: false },
    maxDays: { type: Number, default: null },
    expiryMonths: { type: Number, default: null },
  },
  { _id: false }
);

const LeaveTypeSchema = new Schema<ILeaveType>(
  {
    tenantId: { type: String, required: true },
    name: { type: String, required: true, minlength: 1, maxlength: 50 },
    slug: { type: String, required: true },
    color: { type: String, default: "#818CF8" },
    icon: { type: String, default: "calendar" },
    isPaid: { type: Boolean, default: true },
    requiresApproval: { type: Boolean, default: true },
    defaultEntitlementDays: { type: Number, default: 20, min: 0 },
    allowNegativeBalance: { type: Boolean, default: false },
    accrualRule: { type: AccrualRuleSchema, default: () => ({}) },
    carryoverRule: { type: CarryoverRuleSchema, default: () => ({}) },
    isUnlimited: { type: Boolean, default: false },
    isRetroactiveAllowed: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "leave_types",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// tenant_slug — unique slug within tenant
LeaveTypeSchema.index(
  { tenantId: 1, slug: 1 },
  { unique: true, name: "tenant_slug" }
);
// tenant_active — for leave type listing in forms and dashboards
LeaveTypeSchema.index(
  { tenantId: 1, isActive: 1, sortOrder: 1 },
  { name: "tenant_active" }
);

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------

LeaveTypeSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const LeaveTypeModel =
  (mongoose.models["LeaveType"] as mongoose.Model<ILeaveType> | undefined) ??
  mongoose.model<ILeaveType>("LeaveType", LeaveTypeSchema);
