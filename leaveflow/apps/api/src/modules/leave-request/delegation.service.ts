/**
 * Delegation service — manages approval delegation records.
 *
 * Responsibilities:
 * - create: validate no overlap, delegate exists, not self-delegation
 * - findActive: active delegations for a user
 * - remove: delete (revoke) a delegation
 * - findActiveDelegateFor: find who is delegating to this person right now
 */

import mongoose from "mongoose";
import { DelegationModel, type IDelegation } from "../../models/delegation.model.js";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors.js";
import { withTenant } from "../../lib/tenant-scope.js";

// ----------------------------------------------------------------
// Input / Output types
// ----------------------------------------------------------------

export interface CreateDelegationInput {
  delegatorId: string;
  delegateId: string;
  startDate: Date;
  endDate: Date;
  reason?: string | null;
}

export interface DelegationRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly delegatorId: string;
  readonly delegateId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly reason: string | null;
  readonly isActive: boolean;
  readonly revokedAt: Date | null;
  readonly revokedBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ----------------------------------------------------------------
// Mapper
// ----------------------------------------------------------------

function toRecord(doc: IDelegation): DelegationRecord {
  return Object.freeze({
    id: (doc._id as mongoose.Types.ObjectId).toHexString(),
    tenantId: doc.tenantId,
    delegatorId: doc.delegatorId.toHexString(),
    delegateId: doc.delegateId.toHexString(),
    startDate: doc.startDate,
    endDate: doc.endDate,
    reason: doc.reason,
    isActive: doc.isActive,
    revokedAt: doc.revokedAt,
    revokedBy: doc.revokedBy
      ? (doc.revokedBy as mongoose.Types.ObjectId).toHexString()
      : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}

// ----------------------------------------------------------------
// Service interface
// ----------------------------------------------------------------

export interface DelegationService {
  create(tenantId: string, input: CreateDelegationInput): Promise<DelegationRecord>;
  findActive(tenantId: string, employeeId: string): Promise<DelegationRecord[]>;
  remove(tenantId: string, delegationId: string, revokedBy: string): Promise<void>;
  findActiveDelegateFor(tenantId: string, approverId: string): Promise<DelegationRecord | null>;
}

// ----------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------

export function createDelegationService(): DelegationService {
  return {
    async create(
      tenantId: string,
      input: CreateDelegationInput
    ): Promise<DelegationRecord> {
      // Self-delegation check
      if (input.delegatorId === input.delegateId) {
        throw new ValidationError("Cannot delegate approval authority to yourself");
      }

      // Date range check
      if (input.startDate >= input.endDate) {
        throw new ValidationError("startDate must be before endDate");
      }

      // Check for overlapping active delegation from same delegator
      const overlap = await DelegationModel.findOne(
        withTenant(tenantId, {
          delegatorId: new mongoose.Types.ObjectId(input.delegatorId),
          isActive: true,
          startDate: { $lt: input.endDate },
          endDate: { $gt: input.startDate },
        })
      );

      if (overlap !== null) {
        throw new ConflictError(
          "An active delegation already exists for this period",
          "DELEGATION_OVERLAP"
        );
      }

      const doc = await DelegationModel.create({
        tenantId,
        delegatorId: new mongoose.Types.ObjectId(input.delegatorId),
        delegateId: new mongoose.Types.ObjectId(input.delegateId),
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason ?? null,
        isActive: true,
      });

      return toRecord(doc);
    },

    async findActive(
      tenantId: string,
      employeeId: string
    ): Promise<DelegationRecord[]> {
      const now = new Date();
      const docs = await DelegationModel.find(
        withTenant(tenantId, {
          delegatorId: new mongoose.Types.ObjectId(employeeId),
          isActive: true,
          startDate: { $lte: now },
          endDate: { $gte: now },
        })
      ).lean<IDelegation[]>();

      return docs.map(toRecord);
    },

    async remove(
      tenantId: string,
      delegationId: string,
      revokedBy: string
    ): Promise<void> {
      if (!mongoose.Types.ObjectId.isValid(delegationId)) {
        throw new ValidationError(`Invalid delegation ID: ${delegationId}`);
      }

      const updated = await DelegationModel.findOneAndUpdate(
        withTenant(tenantId, {
          _id: new mongoose.Types.ObjectId(delegationId),
          isActive: true,
        }),
        {
          $set: {
            isActive: false,
            revokedAt: new Date(),
            revokedBy: new mongoose.Types.ObjectId(revokedBy),
          },
        },
        { new: false }
      );

      if (updated === null) {
        throw new NotFoundError("Delegation", delegationId);
      }
    },

    async findActiveDelegateFor(
      tenantId: string,
      approverId: string
    ): Promise<DelegationRecord | null> {
      const now = new Date();
      const doc = await DelegationModel.findOne(
        withTenant(tenantId, {
          delegateId: new mongoose.Types.ObjectId(approverId),
          isActive: true,
          startDate: { $lte: now },
          endDate: { $gte: now },
        })
      ).lean<IDelegation>();

      return doc !== null ? toRecord(doc) : null;
    },
  };
}
