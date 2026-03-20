/**
 * Leave Type repository — data access layer for the leave_types collection.
 *
 * All queries are tenant-scoped (tenantId always included in the filter).
 * Returns plain objects via .lean() for immutable use in the service layer.
 */

import { LeaveTypeModel } from "../../models/index.js";
import { withTenant } from "../../lib/tenant-scope.js";
import type {
  CreateLeaveTypeInput,
  UpdateLeaveTypeInput,
  LeaveTypeRecord,
} from "./leave-type.types.js";

// ----------------------------------------------------------------
// Type helpers
// ----------------------------------------------------------------

type LeanLeaveType = {
  _id: unknown;
  tenantId: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  isPaid: boolean;
  requiresApproval: boolean;
  defaultEntitlementDays: number;
  allowNegativeBalance: boolean;
  isUnlimited: boolean;
  isRetroactiveAllowed: boolean;
  isActive: boolean;
  sortOrder: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(raw: LeanLeaveType): LeaveTypeRecord {
  return {
    id: String(raw._id),
    tenantId: raw.tenantId,
    name: raw.name,
    slug: raw.slug,
    color: raw.color,
    icon: raw.icon,
    isPaid: raw.isPaid,
    requiresApproval: raw.requiresApproval,
    defaultEntitlementDays: raw.defaultEntitlementDays,
    allowNegativeBalance: raw.allowNegativeBalance,
    isUnlimited: raw.isUnlimited,
    isRetroactiveAllowed: raw.isRetroactiveAllowed,
    isActive: raw.isActive,
    sortOrder: raw.sortOrder,
    isDefault: raw.isDefault,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ----------------------------------------------------------------
// Repository factory
// ----------------------------------------------------------------

export interface LeaveTypeRepository {
  findAll(tenantId: string): Promise<LeaveTypeRecord[]>;
  findById(tenantId: string, id: string): Promise<LeaveTypeRecord | null>;
  findByName(tenantId: string, name: string): Promise<LeaveTypeRecord | null>;
  create(tenantId: string, data: CreateLeaveTypeInput): Promise<LeaveTypeRecord>;
  update(
    tenantId: string,
    id: string,
    data: UpdateLeaveTypeInput
  ): Promise<LeaveTypeRecord | null>;
  delete(tenantId: string, id: string): Promise<boolean>;
}

export function createLeaveTypeRepository(): LeaveTypeRepository {
  return {
    async findAll(tenantId: string): Promise<LeaveTypeRecord[]> {
      const results = await LeaveTypeModel.find(withTenant(tenantId, {}))
        .sort({ sortOrder: 1, name: 1 })
        .lean()
        .exec();

      return (results as unknown as LeanLeaveType[]).map(toRecord);
    },

    async findById(
      tenantId: string,
      id: string
    ): Promise<LeaveTypeRecord | null> {
      const raw = await LeaveTypeModel.findOne(
        withTenant(tenantId, { _id: id })
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanLeaveType);
    },

    async findByName(
      tenantId: string,
      name: string
    ): Promise<LeaveTypeRecord | null> {
      const raw = await LeaveTypeModel.findOne(
        withTenant(tenantId, { name })
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanLeaveType);
    },

    async create(
      tenantId: string,
      data: CreateLeaveTypeInput
    ): Promise<LeaveTypeRecord> {
      const slug = nameToSlug(data.name);
      const doc = new LeaveTypeModel({
        tenantId,
        slug,
        ...data,
      });

      const saved = await doc.save();
      return toRecord(saved.toObject() as unknown as LeanLeaveType);
    },

    async update(
      tenantId: string,
      id: string,
      data: UpdateLeaveTypeInput
    ): Promise<LeaveTypeRecord | null> {
      const updatePayload: Record<string, unknown> = { ...data };

      if (data.name !== undefined) {
        updatePayload["slug"] = nameToSlug(data.name);
      }

      const raw = await LeaveTypeModel.findOneAndUpdate(
        withTenant(tenantId, { _id: id }),
        { $set: updatePayload },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanLeaveType);
    },

    async delete(tenantId: string, id: string): Promise<boolean> {
      const result = await LeaveTypeModel.deleteOne(
        withTenant(tenantId, { _id: id })
      ).exec();

      return result.deletedCount > 0;
    },
  };
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
