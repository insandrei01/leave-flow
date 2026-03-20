/**
 * Workflow repository — data access layer for the workflows collection.
 *
 * All queries are tenant-scoped. Returns plain objects via .lean().
 */

import mongoose from "mongoose";
import { WorkflowModel, TeamModel } from "../../models/index.js";
import { withTenant } from "../../lib/tenant-scope.js";
import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowRecord,
  WorkflowStepRecord,
} from "./workflow.types.js";

// ----------------------------------------------------------------
// Type helpers
// ----------------------------------------------------------------

type LeanWorkflowStep = {
  order: number;
  approverType: string;
  approverUserId: unknown;
  approverGroupIds: unknown[] | null;
  timeoutHours: number;
  escalationAction: string;
  maxReminders: number;
  allowDelegation: boolean;
};

type LeanWorkflow = {
  _id: unknown;
  tenantId: string;
  name: string;
  description: string | null;
  steps: LeanWorkflowStep[];
  autoApprovalRules: unknown[];
  isTemplate: boolean;
  templateSlug: string | null;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toStepRecord(raw: LeanWorkflowStep): WorkflowStepRecord {
  return {
    order: raw.order,
    approverType: raw.approverType as WorkflowStepRecord["approverType"],
    approverUserId: raw.approverUserId ? String(raw.approverUserId) : null,
    approverGroupIds: Array.isArray(raw.approverGroupIds)
      ? raw.approverGroupIds.map(String)
      : null,
    timeoutHours: raw.timeoutHours,
    escalationAction:
      raw.escalationAction as WorkflowStepRecord["escalationAction"],
    maxReminders: raw.maxReminders,
    allowDelegation: raw.allowDelegation,
  };
}

function toRecord(raw: LeanWorkflow): WorkflowRecord {
  return {
    id: String(raw._id),
    tenantId: raw.tenantId,
    name: raw.name,
    description: raw.description,
    steps: raw.steps.map(toStepRecord),
    autoApprovalRules: raw.autoApprovalRules ?? [],
    isTemplate: raw.isTemplate,
    templateSlug: raw.templateSlug,
    version: raw.version,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ----------------------------------------------------------------
// Repository factory
// ----------------------------------------------------------------

export interface WorkflowRepository {
  findAll(tenantId: string): Promise<WorkflowRecord[]>;
  findById(tenantId: string, id: string): Promise<WorkflowRecord | null>;
  findByName(tenantId: string, name: string): Promise<WorkflowRecord | null>;
  create(tenantId: string, data: CreateWorkflowInput): Promise<WorkflowRecord>;
  update(
    tenantId: string,
    id: string,
    data: UpdateWorkflowInput & { version: number }
  ): Promise<WorkflowRecord | null>;
  delete(tenantId: string, id: string): Promise<boolean>;
  hasAssignedTeams(tenantId: string, workflowId: string): Promise<boolean>;
}

export function createWorkflowRepository(): WorkflowRepository {
  return {
    async findAll(tenantId: string): Promise<WorkflowRecord[]> {
      const results = await WorkflowModel.find(withTenant(tenantId, {}))
        .sort({ name: 1 })
        .lean()
        .exec();

      return (results as unknown as LeanWorkflow[]).map(toRecord);
    },

    async findById(
      tenantId: string,
      id: string
    ): Promise<WorkflowRecord | null> {
      const raw = await WorkflowModel.findOne(
        withTenant(tenantId, { _id: id })
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanWorkflow);
    },

    async findByName(
      tenantId: string,
      name: string
    ): Promise<WorkflowRecord | null> {
      const raw = await WorkflowModel.findOne(withTenant(tenantId, { name }))
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanWorkflow);
    },

    async create(
      tenantId: string,
      data: CreateWorkflowInput
    ): Promise<WorkflowRecord> {
      const steps = (data.steps ?? []).map((s) => ({
        order: s.order,
        approverType: s.approverType,
        approverUserId: s.approverUserId
          ? new mongoose.Types.ObjectId(s.approverUserId)
          : null,
        approverGroupIds: s.approverGroupIds
          ? s.approverGroupIds.map((id) => new mongoose.Types.ObjectId(id))
          : null,
        timeoutHours: s.timeoutHours,
        escalationAction: s.escalationAction,
        maxReminders: s.maxReminders ?? 3,
        allowDelegation: s.allowDelegation ?? true,
      }));

      const doc = new WorkflowModel({
        tenantId,
        name: data.name,
        description: data.description ?? null,
        steps,
        isTemplate: data.isTemplate ?? false,
        templateSlug: data.templateSlug ?? null,
        version: 1,
      });

      const saved = await doc.save();
      return toRecord(saved.toObject() as unknown as LeanWorkflow);
    },

    async update(
      tenantId: string,
      id: string,
      data: UpdateWorkflowInput & { version: number }
    ): Promise<WorkflowRecord | null> {
      const updatePayload: Record<string, unknown> = {
        version: data.version,
      };

      if (data.name !== undefined) updatePayload["name"] = data.name;
      if (data.description !== undefined)
        updatePayload["description"] = data.description;
      if (data.isActive !== undefined) updatePayload["isActive"] = data.isActive;

      if (data.steps !== undefined) {
        updatePayload["steps"] = data.steps.map((s) => ({
          order: s.order,
          approverType: s.approverType,
          approverUserId: s.approverUserId
            ? new mongoose.Types.ObjectId(s.approverUserId)
            : null,
          approverGroupIds: s.approverGroupIds
            ? s.approverGroupIds.map((gid) => new mongoose.Types.ObjectId(gid))
            : null,
          timeoutHours: s.timeoutHours,
          escalationAction: s.escalationAction,
          maxReminders: s.maxReminders ?? 3,
          allowDelegation: s.allowDelegation ?? true,
        }));
      }

      const raw = await WorkflowModel.findOneAndUpdate(
        withTenant(tenantId, { _id: id }),
        { $set: updatePayload },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanWorkflow);
    },

    async delete(tenantId: string, id: string): Promise<boolean> {
      const result = await WorkflowModel.deleteOne(
        withTenant(tenantId, { _id: id })
      ).exec();

      return result.deletedCount > 0;
    },

    async hasAssignedTeams(
      tenantId: string,
      workflowId: string
    ): Promise<boolean> {
      const count = await TeamModel.countDocuments(
        withTenant(tenantId, {
          workflowId: new mongoose.Types.ObjectId(workflowId),
        })
      ).exec();

      return count > 0;
    },
  };
}
