/**
 * Tenant repository — data access layer for the tenants collection.
 *
 * The tenants collection is NOT tenant-scoped itself (it IS the root entity),
 * so no tenantId filter is applied on read. findById and update operations
 * use the document _id as the lookup key.
 *
 * Returns plain objects via .lean() to prevent accidental mutation of
 * Mongoose documents in service/business layers.
 */

import { TenantModel } from "../../models/index.js";
import type { CreateTenantInput, TenantRecord } from "./tenant.types.js";

// ----------------------------------------------------------------
// Type helpers
// ----------------------------------------------------------------

type LeanTenant = {
  _id: unknown;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  settings: TenantRecord["settings"];
  planLimits: TenantRecord["planLimits"];
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(raw: LeanTenant): TenantRecord {
  return {
    id: String(raw._id),
    name: raw.name,
    slug: raw.slug,
    plan: raw.plan,
    isActive: raw.isActive,
    settings: { ...raw.settings },
    planLimits: { ...raw.planLimits },
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ----------------------------------------------------------------
// Repository factory
// ----------------------------------------------------------------

export interface TenantRepository {
  findById(tenantId: string): Promise<TenantRecord | null>;
  create(data: CreateTenantInput): Promise<TenantRecord>;
  update(
    tenantId: string,
    data: Partial<CreateTenantInput> & { settings?: Partial<TenantRecord["settings"]> }
  ): Promise<TenantRecord | null>;
}

export function createTenantRepository(): TenantRepository {
  return {
    async findById(tenantId: string): Promise<TenantRecord | null> {
      const raw = await TenantModel.findById(tenantId).lean().exec();
      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanTenant);
    },

    async create(data: CreateTenantInput): Promise<TenantRecord> {
      const settingsOverride = data.timezone
        ? { timezone: data.timezone }
        : {};

      const doc = new TenantModel({
        name: data.name,
        slug: data.slug,
        ...(data.plan !== undefined ? { plan: data.plan } : {}),
        settings: settingsOverride,
      });

      const saved = await doc.save();
      const raw = saved.toObject() as unknown as LeanTenant;
      return toRecord(raw);
    },

    async update(
      tenantId: string,
      data: Partial<CreateTenantInput> & { settings?: Partial<TenantRecord["settings"]> }
    ): Promise<TenantRecord | null> {
      const updatePayload: Record<string, unknown> = {};

      if (data.name !== undefined) updatePayload["name"] = data.name;
      if (data.slug !== undefined) updatePayload["slug"] = data.slug;
      if (data.plan !== undefined) updatePayload["plan"] = data.plan;

      if (data.settings !== undefined) {
        for (const [key, value] of Object.entries(data.settings)) {
          updatePayload[`settings.${key}`] = value;
        }
      }

      const raw = await TenantModel.findByIdAndUpdate(
        tenantId,
        { $set: updatePayload },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanTenant);
    },
  };
}
