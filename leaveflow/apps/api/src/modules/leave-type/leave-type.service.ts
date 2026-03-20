/**
 * Leave Type service — business logic for leave type management.
 *
 * Responsibilities:
 * - CRUD with name uniqueness validation per tenant
 * - Color format validation (#RRGGBB hex)
 * - entitlement > 0 validation
 * - Seed 3 default leave types on tenant creation (seedDefaults)
 */

import type { LeaveTypeRepository } from "./leave-type.repository.js";
import type {
  CreateLeaveTypeInput,
  UpdateLeaveTypeInput,
  LeaveTypeRecord,
} from "./leave-type.types.js";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const DEFAULT_LEAVE_TYPES: CreateLeaveTypeInput[] = [
  {
    name: "Annual Leave",
    color: "#818CF8",
    icon: "calendar",
    isPaid: true,
    requiresApproval: true,
    defaultEntitlementDays: 20,
    isDefault: true,
    sortOrder: 0,
  },
  {
    name: "Sick Leave",
    color: "#F87171",
    icon: "thermometer",
    isPaid: true,
    requiresApproval: false,
    defaultEntitlementDays: 10,
    isDefault: true,
    sortOrder: 1,
  },
  {
    name: "Personal Leave",
    color: "#34D399",
    icon: "user",
    isPaid: false,
    requiresApproval: true,
    defaultEntitlementDays: 3,
    isDefault: true,
    sortOrder: 2,
  },
];

// ----------------------------------------------------------------
// Service factory
// ----------------------------------------------------------------

export interface LeaveTypeService {
  findAll(tenantId: string): Promise<LeaveTypeRecord[]>;
  findById(tenantId: string, id: string): Promise<LeaveTypeRecord>;
  create(tenantId: string, input: CreateLeaveTypeInput): Promise<LeaveTypeRecord>;
  update(
    tenantId: string,
    id: string,
    input: UpdateLeaveTypeInput
  ): Promise<LeaveTypeRecord>;
  delete(tenantId: string, id: string): Promise<void>;
  seedDefaults(tenantId: string): Promise<LeaveTypeRecord[]>;
}

export function createLeaveTypeService(deps: {
  repo: LeaveTypeRepository;
}): LeaveTypeService {
  const { repo } = deps;

  return {
    async findAll(tenantId: string): Promise<LeaveTypeRecord[]> {
      return repo.findAll(tenantId);
    },

    async findById(tenantId: string, id: string): Promise<LeaveTypeRecord> {
      const record = await repo.findById(tenantId, id);
      if (record === null) {
        throw new Error(`Leave type not found: ${id}`);
      }
      return record;
    },

    async create(
      tenantId: string,
      input: CreateLeaveTypeInput
    ): Promise<LeaveTypeRecord> {
      validateCreateInput(input);

      const existing = await repo.findByName(tenantId, input.name);
      if (existing !== null) {
        throw new Error(
          `Leave type with name "${input.name}" already exists for this tenant`
        );
      }

      return repo.create(tenantId, input);
    },

    async update(
      tenantId: string,
      id: string,
      input: UpdateLeaveTypeInput
    ): Promise<LeaveTypeRecord> {
      validateUpdateInput(input);

      const existing = await repo.findById(tenantId, id);
      if (existing === null) {
        throw new Error(`Leave type not found: ${id}`);
      }

      if (input.name !== undefined && input.name !== existing.name) {
        const duplicate = await repo.findByName(tenantId, input.name);
        if (duplicate !== null) {
          throw new Error(
            `Leave type with name "${input.name}" already exists for this tenant`
          );
        }
      }

      const updated = await repo.update(tenantId, id, input);
      if (updated === null) {
        throw new Error(`Failed to update leave type: ${id}`);
      }

      return updated;
    },

    async delete(tenantId: string, id: string): Promise<void> {
      const existing = await repo.findById(tenantId, id);
      if (existing === null) {
        throw new Error(`Leave type not found: ${id}`);
      }

      await repo.delete(tenantId, id);
    },

    async seedDefaults(tenantId: string): Promise<LeaveTypeRecord[]> {
      const created: LeaveTypeRecord[] = [];

      for (const leaveType of DEFAULT_LEAVE_TYPES) {
        const exists = await repo.findByName(tenantId, leaveType.name);
        if (exists === null) {
          const record = await repo.create(tenantId, leaveType);
          created.push(record);
        }
      }

      return created;
    },
  };
}

// ----------------------------------------------------------------
// Private validators
// ----------------------------------------------------------------

function validateCreateInput(input: CreateLeaveTypeInput): void {
  if (!input.name || input.name.trim().length === 0) {
    throw new Error("Leave type name is required");
  }
  if (input.color !== undefined && !HEX_COLOR_REGEX.test(input.color)) {
    throw new Error(
      `Invalid color format: "${input.color}". Must be a 6-digit hex color (e.g. #818CF8)`
    );
  }
  if (input.defaultEntitlementDays <= 0) {
    throw new Error("defaultEntitlementDays must be greater than 0");
  }
}

function validateUpdateInput(input: UpdateLeaveTypeInput): void {
  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new Error("Leave type name cannot be empty");
  }
  if (input.color !== undefined && !HEX_COLOR_REGEX.test(input.color)) {
    throw new Error(
      `Invalid color format: "${input.color}". Must be a 6-digit hex color (e.g. #818CF8)`
    );
  }
  if (
    input.defaultEntitlementDays !== undefined &&
    input.defaultEntitlementDays <= 0
  ) {
    throw new Error("defaultEntitlementDays must be greater than 0");
  }
}
