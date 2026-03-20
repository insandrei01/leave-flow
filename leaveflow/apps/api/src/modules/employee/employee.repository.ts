/**
 * Employee repository — data access layer for the employees collection.
 *
 * All queries are tenant-scoped. Returns plain objects via .lean().
 */

import mongoose from "mongoose";
import { EmployeeModel } from "../../models/index.js";
import { withTenant } from "../../lib/tenant-scope.js";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeRecord,
  EmployeeFilters,
  PaginationOptions,
  PaginatedResult,
} from "./employee.types.js";

// ----------------------------------------------------------------
// Type helpers
// ----------------------------------------------------------------

type LeanEmployee = {
  _id: unknown;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  teamId: unknown;
  firebaseUid: string | null;
  startDate: Date;
  primaryPlatform: string;
  timezone: string;
  profileImageUrl: string | null;
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  invitationStatus: string;
  status: string;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(raw: LeanEmployee): EmployeeRecord {
  const firstName = raw.firstName;
  const lastName = raw.lastName;
  return {
    id: String(raw._id),
    tenantId: raw.tenantId,
    email: raw.email,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    role: raw.role as EmployeeRecord["role"],
    teamId: raw.teamId ? String(raw.teamId) : null,
    firebaseUid: raw.firebaseUid,
    startDate: raw.startDate,
    primaryPlatform: raw.primaryPlatform as EmployeeRecord["primaryPlatform"],
    timezone: raw.timezone,
    profileImageUrl: raw.profileImageUrl,
    invitationToken: raw.invitationToken,
    invitationExpiresAt: raw.invitationExpiresAt,
    invitationStatus: raw.invitationStatus,
    status: raw.status as EmployeeRecord["status"],
    deactivatedAt: raw.deactivatedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ----------------------------------------------------------------
// Repository factory
// ----------------------------------------------------------------

export interface EmployeeRepository {
  findAll(
    tenantId: string,
    filters?: EmployeeFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<EmployeeRecord>>;
  findById(tenantId: string, id: string): Promise<EmployeeRecord | null>;
  findByEmail(tenantId: string, email: string): Promise<EmployeeRecord | null>;
  findByFirebaseUid(
    tenantId: string,
    firebaseUid: string
  ): Promise<EmployeeRecord | null>;
  create(tenantId: string, data: CreateEmployeeInput): Promise<EmployeeRecord>;
  update(
    tenantId: string,
    id: string,
    data: UpdateEmployeeInput
  ): Promise<EmployeeRecord | null>;
  deactivate(tenantId: string, id: string): Promise<EmployeeRecord | null>;
}

export function createEmployeeRepository(): EmployeeRepository {
  return {
    async findAll(
      tenantId: string,
      filters: EmployeeFilters = {},
      pagination: PaginationOptions = {}
    ): Promise<PaginatedResult<EmployeeRecord>> {
      const page = Math.max(1, pagination.page ?? 1);
      const limit = Math.min(100, Math.max(1, pagination.limit ?? 20));
      const skip = (page - 1) * limit;

      const baseFilter: Record<string, unknown> = {};
      if (filters.status !== undefined) baseFilter["status"] = filters.status;
      if (filters.role !== undefined) baseFilter["role"] = filters.role;
      if (filters.teamId !== undefined) {
        baseFilter["teamId"] = new mongoose.Types.ObjectId(filters.teamId);
      }

      const query = withTenant(tenantId, baseFilter);

      const [rawResults, total] = await Promise.all([
        EmployeeModel.find(query).skip(skip).limit(limit).lean().exec(),
        EmployeeModel.countDocuments(query).exec(),
      ]);

      return {
        data: (rawResults as unknown as LeanEmployee[]).map(toRecord),
        total,
        page,
        limit,
      };
    },

    async findById(
      tenantId: string,
      id: string
    ): Promise<EmployeeRecord | null> {
      const raw = await EmployeeModel.findOne(
        withTenant(tenantId, { _id: id })
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanEmployee);
    },

    async findByEmail(
      tenantId: string,
      email: string
    ): Promise<EmployeeRecord | null> {
      const raw = await EmployeeModel.findOne(
        withTenant(tenantId, { email: email.toLowerCase().trim() })
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanEmployee);
    },

    async findByFirebaseUid(
      tenantId: string,
      firebaseUid: string
    ): Promise<EmployeeRecord | null> {
      const raw = await EmployeeModel.findOne(
        withTenant(tenantId, { firebaseUid })
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanEmployee);
    },

    async create(
      tenantId: string,
      data: CreateEmployeeInput
    ): Promise<EmployeeRecord> {
      const doc = new EmployeeModel({
        tenantId,
        email: data.email.toLowerCase().trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? "employee",
        teamId: data.teamId
          ? new mongoose.Types.ObjectId(data.teamId)
          : null,
        startDate: data.startDate,
        primaryPlatform: data.primaryPlatform ?? "email",
        timezone: data.timezone ?? "",
        firebaseUid: data.firebaseUid ?? null,
        status: data.status ?? "invited",
      });

      const saved = await doc.save();
      return toRecord(saved.toObject() as unknown as LeanEmployee);
    },

    async update(
      tenantId: string,
      id: string,
      data: UpdateEmployeeInput
    ): Promise<EmployeeRecord | null> {
      const updatePayload: Record<string, unknown> = {};

      if (data.firstName !== undefined) updatePayload["firstName"] = data.firstName;
      if (data.lastName !== undefined) updatePayload["lastName"] = data.lastName;
      if (data.role !== undefined) updatePayload["role"] = data.role;
      if (data.primaryPlatform !== undefined)
        updatePayload["primaryPlatform"] = data.primaryPlatform;
      if (data.timezone !== undefined) updatePayload["timezone"] = data.timezone;
      if (data.profileImageUrl !== undefined)
        updatePayload["profileImageUrl"] = data.profileImageUrl;
      if (data.firebaseUid !== undefined)
        updatePayload["firebaseUid"] = data.firebaseUid;

      if (data.teamId !== undefined) {
        updatePayload["teamId"] = data.teamId
          ? new mongoose.Types.ObjectId(data.teamId)
          : null;
      }

      const raw = await EmployeeModel.findOneAndUpdate(
        withTenant(tenantId, { _id: id }),
        { $set: updatePayload },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanEmployee);
    },

    async deactivate(
      tenantId: string,
      id: string
    ): Promise<EmployeeRecord | null> {
      const raw = await EmployeeModel.findOneAndUpdate(
        withTenant(tenantId, { _id: id }),
        {
          $set: {
            status: "inactive",
            deactivatedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanEmployee);
    },
  };
}
