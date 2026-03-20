/**
 * Team repository — data access layer for the teams collection.
 *
 * All queries are tenant-scoped. Returns plain objects via .lean().
 */

import mongoose from "mongoose";
import { TeamModel, EmployeeModel } from "../../models/index.js";
import { withTenant } from "../../lib/tenant-scope.js";
import type {
  CreateTeamInput,
  UpdateTeamInput,
  TeamRecord,
  TeamMemberRecord,
} from "./team.types.js";

// ----------------------------------------------------------------
// Type helpers
// ----------------------------------------------------------------

type LeanTeam = {
  _id: unknown;
  tenantId: string;
  name: string;
  managerId: unknown;
  workflowId: unknown;
  announcementChannelSlack: string | null;
  announcementChannelTeams: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type LeanEmployee = {
  _id: unknown;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  teamId: unknown;
};

function toRecord(raw: LeanTeam): TeamRecord {
  return {
    id: String(raw._id),
    tenantId: raw.tenantId,
    name: raw.name,
    managerId: raw.managerId ? String(raw.managerId) : null,
    workflowId: raw.workflowId ? String(raw.workflowId) : null,
    announcementChannelSlack: raw.announcementChannelSlack,
    announcementChannelTeams: raw.announcementChannelTeams,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toMemberRecord(raw: LeanEmployee): TeamMemberRecord {
  return {
    id: String(raw._id),
    tenantId: raw.tenantId,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    role: raw.role,
    status: raw.status,
    teamId: raw.teamId ? String(raw.teamId) : null,
  };
}

// ----------------------------------------------------------------
// Repository factory
// ----------------------------------------------------------------

export interface TeamRepository {
  findAll(tenantId: string): Promise<TeamRecord[]>;
  findById(tenantId: string, id: string): Promise<TeamRecord | null>;
  findByName(tenantId: string, name: string): Promise<TeamRecord | null>;
  create(tenantId: string, data: CreateTeamInput): Promise<TeamRecord>;
  update(
    tenantId: string,
    id: string,
    data: UpdateTeamInput
  ): Promise<TeamRecord | null>;
  delete(tenantId: string, id: string): Promise<boolean>;
  findMembers(tenantId: string, teamId: string): Promise<TeamMemberRecord[]>;
}

export function createTeamRepository(): TeamRepository {
  return {
    async findAll(tenantId: string): Promise<TeamRecord[]> {
      const results = await TeamModel.find(withTenant(tenantId, {}))
        .sort({ name: 1 })
        .lean()
        .exec();

      return (results as unknown as LeanTeam[]).map(toRecord);
    },

    async findById(tenantId: string, id: string): Promise<TeamRecord | null> {
      const raw = await TeamModel.findOne(withTenant(tenantId, { _id: id }))
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanTeam);
    },

    async findByName(
      tenantId: string,
      name: string
    ): Promise<TeamRecord | null> {
      const raw = await TeamModel.findOne(withTenant(tenantId, { name }))
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanTeam);
    },

    async create(tenantId: string, data: CreateTeamInput): Promise<TeamRecord> {
      const doc = new TeamModel({
        tenantId,
        name: data.name,
        managerId: data.managerId
          ? new mongoose.Types.ObjectId(data.managerId)
          : null,
        workflowId: data.workflowId
          ? new mongoose.Types.ObjectId(data.workflowId)
          : null,
        announcementChannelSlack: data.announcementChannelSlack ?? null,
        announcementChannelTeams: data.announcementChannelTeams ?? null,
      });

      const saved = await doc.save();
      return toRecord(saved.toObject() as unknown as LeanTeam);
    },

    async update(
      tenantId: string,
      id: string,
      data: UpdateTeamInput
    ): Promise<TeamRecord | null> {
      const updatePayload: Record<string, unknown> = {};

      if (data.name !== undefined) updatePayload["name"] = data.name;
      if (data.isActive !== undefined) updatePayload["isActive"] = data.isActive;
      if (data.announcementChannelSlack !== undefined)
        updatePayload["announcementChannelSlack"] = data.announcementChannelSlack;
      if (data.announcementChannelTeams !== undefined)
        updatePayload["announcementChannelTeams"] = data.announcementChannelTeams;

      if (data.managerId !== undefined) {
        updatePayload["managerId"] = data.managerId
          ? new mongoose.Types.ObjectId(data.managerId)
          : null;
      }
      if (data.workflowId !== undefined) {
        updatePayload["workflowId"] = data.workflowId
          ? new mongoose.Types.ObjectId(data.workflowId)
          : null;
      }

      const raw = await TeamModel.findOneAndUpdate(
        withTenant(tenantId, { _id: id }),
        { $set: updatePayload },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanTeam);
    },

    async delete(tenantId: string, id: string): Promise<boolean> {
      const result = await TeamModel.deleteOne(
        withTenant(tenantId, { _id: id })
      ).exec();

      return result.deletedCount > 0;
    },

    async findMembers(
      tenantId: string,
      teamId: string
    ): Promise<TeamMemberRecord[]> {
      const results = await EmployeeModel.find(
        withTenant(tenantId, {
          teamId: new mongoose.Types.ObjectId(teamId),
          status: "active",
        })
      )
        .lean()
        .exec();

      return (results as unknown as LeanEmployee[]).map(toMemberRecord);
    },
  };
}
