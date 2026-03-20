/**
 * Tenant model — root entity representing a company workspace.
 *
 * tenants collection is NOT tenant-scoped (it IS the tenant root).
 * No tenantId guard middleware is applied here.
 */

import mongoose, { Schema, type Document } from "mongoose";

// ----------------------------------------------------------------
// Sub-document interfaces
// ----------------------------------------------------------------

export interface TenantSettings {
  timezone: string;
  fiscalYearStartMonth: number;
  workWeek: number[];
  coverageMinimumPercent: number;
  announcementChannelEnabled: boolean;
  locale: string;
}

export interface TenantPlanLimits {
  maxEmployees: number;
  maxWorkflowSteps: number;
  maxLeaveTypes: number;
  maxPlatforms: number;
}

export interface TenantOnboardingState {
  currentStep: number;
  completedSteps: number[];
  startedAt?: Date;
}

export interface SlackInstallation {
  teamId: string;
  botToken: string;
  botUserId: string;
  installedAt: Date;
  installedBy: string;
}

export interface TeamsInstallation {
  tenantId: string;
  botId: string;
  serviceUrl: string;
  installedAt: Date;
  installedBy: string;
}

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface ITenant extends Document {
  name: string;
  slug: string;
  settings: TenantSettings;
  plan: "free" | "team" | "business" | "enterprise";
  planLimits: TenantPlanLimits;
  onboardingState: TenantOnboardingState;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  slackInstallation?: SlackInstallation;
  teamsInstallation?: TeamsInstallation;
  isActive: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const TenantSettingsSchema = new Schema<TenantSettings>(
  {
    timezone: { type: String, default: "UTC" },
    fiscalYearStartMonth: { type: Number, default: 1, min: 1, max: 12 },
    workWeek: { type: [Number], default: [1, 2, 3, 4, 5] },
    coverageMinimumPercent: { type: Number, default: 50, min: 0, max: 100 },
    announcementChannelEnabled: { type: Boolean, default: true },
    locale: { type: String, default: "en" },
  },
  { _id: false }
);

const TenantPlanLimitsSchema = new Schema<TenantPlanLimits>(
  {
    maxEmployees: { type: Number, default: 10 },
    maxWorkflowSteps: { type: Number, default: 1 },
    maxLeaveTypes: { type: Number, default: 4 },
    maxPlatforms: { type: Number, default: 1 },
  },
  { _id: false }
);

const TenantOnboardingStateSchema = new Schema<TenantOnboardingState>(
  {
    currentStep: { type: Number, default: 0 },
    completedSteps: { type: [Number], default: [] },
    startedAt: { type: Date },
  },
  { _id: false }
);

const SlackInstallationSchema = new Schema<SlackInstallation>(
  {
    teamId: { type: String, required: true },
    botToken: { type: String, required: true },
    botUserId: { type: String, required: true },
    installedAt: { type: Date, required: true },
    installedBy: { type: String, required: true },
  },
  { _id: false }
);

const TeamsInstallationSchema = new Schema<TeamsInstallation>(
  {
    tenantId: { type: String, required: true },
    botId: { type: String, required: true },
    serviceUrl: { type: String, required: true },
    installedAt: { type: Date, required: true },
    installedBy: { type: String, required: true },
  },
  { _id: false }
);

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, minlength: 1, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50,
    },
    settings: { type: TenantSettingsSchema, default: () => ({}) },
    plan: {
      type: String,
      enum: ["free", "team", "business", "enterprise"],
      default: "free",
    },
    planLimits: { type: TenantPlanLimitsSchema, default: () => ({}) },
    onboardingState: {
      type: TenantOnboardingStateSchema,
      default: () => ({}),
    },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    slackInstallation: { type: SlackInstallationSchema },
    teamsInstallation: { type: TeamsInstallationSchema },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "tenants",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// slug_unique — already enforced by unique: true on field
// stripe_customer — partial unique (only indexes documents where stripeCustomerId is a string,
// avoids E11000 collisions on null since sparse indexes still index null values)
TenantSchema.index(
  { stripeCustomerId: 1 },
  { unique: true, partialFilterExpression: { stripeCustomerId: { $type: "string" } }, name: "stripe_customer" }
);
// slack_team — sparse unique
TenantSchema.index(
  { "slackInstallation.teamId": 1 },
  { sparse: true, unique: true, name: "slack_team" }
);
// teams_tenant — sparse unique (Microsoft tenant ID stored in teamsInstallation)
TenantSchema.index(
  { "teamsInstallation.tenantId": 1 },
  { sparse: true, unique: true, name: "teams_tenant" }
);
// active_plan
TenantSchema.index({ isActive: 1, plan: 1 }, { name: "active_plan" });

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const TenantModel =
  (mongoose.models["Tenant"] as mongoose.Model<ITenant> | undefined) ??
  mongoose.model<ITenant>("Tenant", TenantSchema);
