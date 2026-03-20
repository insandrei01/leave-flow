/**
 * BotMappingService — manages platform user ↔ LeaveFlow employee mappings.
 *
 * This service is the single source of truth for resolving platform identities.
 * It is used by all bot adapters to map incoming webhook events to tenants/employees.
 */

import mongoose from "mongoose";
import { BotMappingModel, type BotPlatform } from "../../models/bot-mapping.model.js";

// ----------------------------------------------------------------
// Input / output types
// ----------------------------------------------------------------

export interface CreateMappingInput {
  readonly tenantId: string;
  readonly employeeId: mongoose.Types.ObjectId;
  readonly platform: BotPlatform;
  readonly platformUserId: string;
  readonly platformTeamId: string;
  readonly conversationReference?: Record<string, unknown> | null;
}

export interface ResolvedMapping {
  readonly tenantId: string;
  readonly employeeId: string;
  readonly conversationReference: Record<string, unknown> | null;
}

export interface EmployeePlatformMapping {
  readonly platform: BotPlatform;
  readonly platformUserId: string;
  readonly platformTeamId: string;
  readonly conversationReference: Record<string, unknown> | null;
  readonly lastInteractionAt: Date;
}

export interface WorkspaceMember {
  readonly platformUserId: string;
  readonly platformTeamId: string;
  readonly employeeId: mongoose.Types.ObjectId;
  readonly conversationReference?: Record<string, unknown> | null;
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class BotMappingService {
  /**
   * Creates or updates a bot mapping for an employee on a specific platform.
   *
   * Uses upsert semantics: if a mapping already exists for the given
   * platform + platformUserId + platformTeamId combination, it is updated
   * with the new employeeId and tenantId. Otherwise a new document is created.
   */
  async createMapping(input: CreateMappingInput): Promise<void> {
    const filter = {
      platform: input.platform,
      platformUserId: input.platformUserId,
      platformTeamId: input.platformTeamId,
    };

    const update = {
      $set: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        conversationReference: input.conversationReference ?? null,
        lastInteractionAt: new Date(),
      },
    };

    await BotMappingModel.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
    });
  }

  /**
   * Resolves a platform user ID to a LeaveFlow tenant + employee.
   *
   * Returns null when no mapping exists.
   * Note: does NOT require tenantId — bot events arrive without tenant context.
   */
  async resolveUser(
    platform: BotPlatform,
    platformUserId: string
  ): Promise<ResolvedMapping | null> {
    const mapping = await BotMappingModel.findOne({
      platform,
      platformUserId,
    })
      .select("tenantId employeeId conversationReference")
      .lean();

    if (mapping === null) {
      return null;
    }

    return {
      tenantId: mapping.tenantId,
      employeeId: mapping.employeeId.toString(),
      conversationReference: mapping.conversationReference,
    };
  }

  /**
   * Returns all platform connections for a specific employee.
   * Used when sending notifications to determine which platforms to use.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId
  ): Promise<EmployeePlatformMapping[]> {
    const mappings = await BotMappingModel.find({
      tenantId,
      employeeId,
    })
      .select("platform platformUserId platformTeamId conversationReference lastInteractionAt")
      .lean();

    return mappings.map((m) => ({
      platform: m.platform,
      platformUserId: m.platformUserId,
      platformTeamId: m.platformTeamId,
      conversationReference: m.conversationReference,
      lastInteractionAt: m.lastInteractionAt,
    }));
  }

  /**
   * Bulk upserts workspace member mappings.
   *
   * Called during OAuth installation to pre-populate mappings for known members.
   * Uses ordered: false for performance (failures don't block other upserts).
   */
  async syncWorkspaceMembers(
    tenantId: string,
    platform: BotPlatform,
    members: WorkspaceMember[]
  ): Promise<void> {
    if (members.length === 0) {
      return;
    }

    const bulkOps = members.map((member) => ({
      updateOne: {
        filter: {
          platform,
          platformUserId: member.platformUserId,
          platformTeamId: member.platformTeamId,
        },
        update: {
          $set: {
            tenantId,
            employeeId: member.employeeId,
            conversationReference: member.conversationReference ?? null,
            lastInteractionAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await BotMappingModel.bulkWrite(bulkOps, { ordered: false });
  }
}
