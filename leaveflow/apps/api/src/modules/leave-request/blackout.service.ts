/**
 * Blackout period service — CRUD and leave request validation.
 *
 * Blackout periods are date ranges when leave cannot be requested.
 * They can be scoped to specific teams or leave types (null = all).
 */

import { BlackoutPeriodModel } from "../../models/index.js";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface BlackoutPeriodInput {
  name: string;
  startDate: Date;
  endDate: Date;
  teamIds?: string[] | null;
  leaveTypeIds?: string[] | null;
  reason?: string | null;
}

export interface BlackoutPeriodRecord {
  id: string;
  tenantId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  teamIds: string[] | null;
  leaveTypeIds: string[] | null;
  reason: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlackoutConflict {
  blackoutId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
}

// ----------------------------------------------------------------
// Repository interface
// ----------------------------------------------------------------

export interface BlackoutRepository {
  create(tenantId: string, input: BlackoutPeriodInput): Promise<BlackoutPeriodRecord>;
  findAll(tenantId: string): Promise<BlackoutPeriodRecord[]>;
  findById(tenantId: string, id: string): Promise<BlackoutPeriodRecord | null>;
  delete(tenantId: string, id: string): Promise<boolean>;
  findConflicts(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    teamId?: string | null;
    leaveTypeId?: string | null;
  }): Promise<BlackoutPeriodRecord[]>;
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export interface BlackoutService {
  createBlackoutPeriod(
    tenantId: string,
    input: BlackoutPeriodInput
  ): Promise<BlackoutPeriodRecord>;
  listBlackoutPeriods(tenantId: string): Promise<BlackoutPeriodRecord[]>;
  deleteBlackoutPeriod(tenantId: string, id: string): Promise<void>;
  validateNoBlackout(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    teamId?: string | null;
    leaveTypeId?: string | null;
  }): Promise<BlackoutConflict[]>;
}

export function createBlackoutService(deps: {
  repo: BlackoutRepository;
}): BlackoutService {
  const { repo } = deps;

  return {
    async createBlackoutPeriod(
      tenantId: string,
      input: BlackoutPeriodInput
    ): Promise<BlackoutPeriodRecord> {
      if (!tenantId) {
        throw new Error("tenantId is required");
      }
      if (!input.name || input.name.trim().length === 0) {
        throw new Error("name is required");
      }
      if (!input.startDate) {
        throw new Error("startDate is required");
      }
      if (!input.endDate) {
        throw new Error("endDate is required");
      }
      if (input.startDate > input.endDate) {
        throw new Error("startDate must not be after endDate");
      }

      return repo.create(tenantId, {
        ...input,
        name: input.name.trim(),
      });
    },

    async listBlackoutPeriods(
      tenantId: string
    ): Promise<BlackoutPeriodRecord[]> {
      if (!tenantId) {
        throw new Error("tenantId is required");
      }
      return repo.findAll(tenantId);
    },

    async deleteBlackoutPeriod(tenantId: string, id: string): Promise<void> {
      if (!tenantId) {
        throw new Error("tenantId is required");
      }
      if (!id) {
        throw new Error("id is required");
      }

      const deleted = await repo.delete(tenantId, id);
      if (!deleted) {
        throw new Error(`Blackout period not found: ${id}`);
      }
    },

    async validateNoBlackout(params: {
      tenantId: string;
      startDate: Date;
      endDate: Date;
      teamId?: string | null;
      leaveTypeId?: string | null;
    }): Promise<BlackoutConflict[]> {
      const conflicts = await repo.findConflicts(params);

      return conflicts.map((bp) => ({
        blackoutId: bp.id,
        name: bp.name,
        startDate: bp.startDate,
        endDate: bp.endDate,
        reason: bp.reason,
      }));
    },
  };
}

// ----------------------------------------------------------------
// Concrete repository implementation (MongoDB)
// ----------------------------------------------------------------

type LeanBlackout = {
  _id: unknown;
  tenantId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  teamIds: unknown[] | null;
  leaveTypeIds: unknown[] | null;
  reason: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(raw: LeanBlackout): BlackoutPeriodRecord {
  return {
    id: String(raw._id),
    tenantId: raw.tenantId,
    name: raw.name,
    startDate: raw.startDate,
    endDate: raw.endDate,
    teamIds: raw.teamIds ? raw.teamIds.map(String) : null,
    leaveTypeIds: raw.leaveTypeIds ? raw.leaveTypeIds.map(String) : null,
    reason: raw.reason,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function createBlackoutRepository(): BlackoutRepository {
  return {
    async create(
      tenantId: string,
      input: BlackoutPeriodInput
    ): Promise<BlackoutPeriodRecord> {
      const doc = new BlackoutPeriodModel({
        tenantId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        teamIds: input.teamIds ?? null,
        leaveTypeIds: input.leaveTypeIds ?? null,
        reason: input.reason ?? null,
        isActive: true,
      });
      const saved = await doc.save();
      return toRecord(saved.toObject() as unknown as LeanBlackout);
    },

    async findAll(tenantId: string): Promise<BlackoutPeriodRecord[]> {
      const raws = await BlackoutPeriodModel.find({
        tenantId,
        isActive: true,
      })
        .sort({ startDate: 1 })
        .lean()
        .exec();
      return (raws as unknown as LeanBlackout[]).map(toRecord);
    },

    async findById(
      tenantId: string,
      id: string
    ): Promise<BlackoutPeriodRecord | null> {
      const raw = await BlackoutPeriodModel.findOne({ _id: id, tenantId })
        .lean()
        .exec();
      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanBlackout);
    },

    async delete(tenantId: string, id: string): Promise<boolean> {
      const result = await BlackoutPeriodModel.findOneAndUpdate(
        { _id: id, tenantId, isActive: true },
        { $set: { isActive: false } }
      );
      return result !== null;
    },

    async findConflicts(params: {
      tenantId: string;
      startDate: Date;
      endDate: Date;
      teamId?: string | null;
      leaveTypeId?: string | null;
    }): Promise<BlackoutPeriodRecord[]> {
      const query: Record<string, unknown> = {
        tenantId: params.tenantId,
        isActive: true,
        // Overlap: blackout.startDate <= request.endDate AND blackout.endDate >= request.startDate
        startDate: { $lte: params.endDate },
        endDate: { $gte: params.startDate },
      };

      const raws = await BlackoutPeriodModel.find(query).lean().exec();

      // Filter in-memory for team/leaveType scope
      const matching = (raws as unknown as LeanBlackout[]).filter((bp) => {
        // teamIds null = all teams
        const teamMatch =
          bp.teamIds === null ||
          (params.teamId !== undefined &&
            params.teamId !== null &&
            bp.teamIds.map(String).includes(params.teamId));

        // leaveTypeIds null = all types
        const typeMatch =
          bp.leaveTypeIds === null ||
          (params.leaveTypeId !== undefined &&
            params.leaveTypeId !== null &&
            bp.leaveTypeIds.map(String).includes(params.leaveTypeId));

        return teamMatch && typeMatch;
      });

      return matching.map(toRecord);
    },
  };
}
