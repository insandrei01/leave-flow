/**
 * Employee service — business logic for employee management.
 *
 * Responsibilities:
 * - CRUD with email uniqueness per tenant
 * - Valid teamId and role validation
 * - CSV import with row-level error reporting
 * - Invitation flow (create with status: 'invited')
 * - Deactivation (soft delete)
 */

import type { EmployeeRepository } from "./employee.repository.js";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeRecord,
  EmployeeFilters,
  PaginationOptions,
  PaginatedResult,
  CsvImportRow,
  CsvImportResult,
  EmployeeRole,
} from "./employee.types.js";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const VALID_ROLES: ReadonlySet<string> = new Set([
  "company_admin",
  "hr_admin",
  "manager",
  "employee",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ----------------------------------------------------------------
// Dependency interfaces
// ----------------------------------------------------------------

export interface TeamExistenceChecker {
  teamExists(tenantId: string, teamId: string): Promise<boolean>;
}

// ----------------------------------------------------------------
// Service factory
// ----------------------------------------------------------------

export interface EmployeeService {
  findAll(
    tenantId: string,
    filters?: EmployeeFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<EmployeeRecord>>;
  findById(tenantId: string, id: string): Promise<EmployeeRecord>;
  create(tenantId: string, input: CreateEmployeeInput): Promise<EmployeeRecord>;
  update(
    tenantId: string,
    id: string,
    input: UpdateEmployeeInput
  ): Promise<EmployeeRecord>;
  deactivate(tenantId: string, id: string): Promise<EmployeeRecord>;
  invite(tenantId: string, input: CreateEmployeeInput): Promise<EmployeeRecord>;
  importFromCsv(
    tenantId: string,
    rows: CsvImportRow[]
  ): Promise<CsvImportResult>;
}

export function createEmployeeService(deps: {
  repo: EmployeeRepository;
  teamChecker?: TeamExistenceChecker;
}): EmployeeService {
  const { repo, teamChecker } = deps;

  return {
    async findAll(
      tenantId: string,
      filters?: EmployeeFilters,
      pagination?: PaginationOptions
    ): Promise<PaginatedResult<EmployeeRecord>> {
      return repo.findAll(tenantId, filters, pagination);
    },

    async findById(tenantId: string, id: string): Promise<EmployeeRecord> {
      const record = await repo.findById(tenantId, id);
      if (record === null) {
        throw new Error(`Employee not found: ${id}`);
      }
      return record;
    },

    async create(
      tenantId: string,
      input: CreateEmployeeInput
    ): Promise<EmployeeRecord> {
      await validateCreateInput(tenantId, input, repo, teamChecker);

      return repo.create(tenantId, input);
    },

    async update(
      tenantId: string,
      id: string,
      input: UpdateEmployeeInput
    ): Promise<EmployeeRecord> {
      const existing = await repo.findById(tenantId, id);
      if (existing === null) {
        throw new Error(`Employee not found: ${id}`);
      }

      if (input.role !== undefined && !VALID_ROLES.has(input.role)) {
        throw new Error(`Invalid role: ${input.role}`);
      }

      if (input.teamId !== undefined && input.teamId !== null) {
        await validateTeamId(tenantId, input.teamId, teamChecker);
      }

      const updated = await repo.update(tenantId, id, input);
      if (updated === null) {
        throw new Error(`Failed to update employee: ${id}`);
      }

      return updated;
    },

    async deactivate(tenantId: string, id: string): Promise<EmployeeRecord> {
      const existing = await repo.findById(tenantId, id);
      if (existing === null) {
        throw new Error(`Employee not found: ${id}`);
      }
      if (existing.status === "inactive") {
        throw new Error(`Employee is already inactive: ${id}`);
      }

      const updated = await repo.deactivate(tenantId, id);
      if (updated === null) {
        throw new Error(`Failed to deactivate employee: ${id}`);
      }

      return updated;
    },

    async invite(
      tenantId: string,
      input: CreateEmployeeInput
    ): Promise<EmployeeRecord> {
      const inviteInput: CreateEmployeeInput = { ...input, status: "invited" };
      await validateCreateInput(tenantId, inviteInput, repo, teamChecker);

      return repo.create(tenantId, inviteInput);
    },

    async importFromCsv(
      tenantId: string,
      rows: CsvImportRow[]
    ): Promise<CsvImportResult> {
      const created: EmployeeRecord[] = [];
      const errors: CsvImportResult["errors"] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row === undefined) continue;

        const rowNum = i + 1;

        try {
          const input = parseCsvRow(row, rowNum);
          const existing = await repo.findByEmail(tenantId, input.email);
          if (existing !== null) {
            errors.push({
              row: rowNum,
              email: input.email,
              reason: `Email already exists: ${input.email}`,
            });
            continue;
          }

          if (input.role !== undefined && !VALID_ROLES.has(input.role)) {
            errors.push({
              row: rowNum,
              email: input.email,
              reason: `Invalid role: ${input.role}`,
            });
            continue;
          }

          const record = await repo.create(tenantId, {
            ...input,
            status: "invited",
          });
          created.push(record);
        } catch (err) {
          const reason =
            err instanceof Error ? err.message : "Unknown error";
          errors.push({ row: rowNum, email: row.email, reason });
        }
      }

      return { created, errors };
    },
  };
}

// ----------------------------------------------------------------
// Private helpers
// ----------------------------------------------------------------

async function validateCreateInput(
  tenantId: string,
  input: CreateEmployeeInput,
  repo: EmployeeRepository,
  teamChecker?: TeamExistenceChecker
): Promise<void> {
  if (!input.email || input.email.trim().length === 0) {
    throw new Error("Email is required");
  }
  if (!EMAIL_REGEX.test(input.email.trim())) {
    throw new Error(`Invalid email format: ${input.email}`);
  }
  if (!input.firstName || input.firstName.trim().length === 0) {
    throw new Error("First name is required");
  }
  if (!input.lastName || input.lastName.trim().length === 0) {
    throw new Error("Last name is required");
  }
  if (!input.startDate) {
    throw new Error("Start date is required");
  }
  if (input.role !== undefined && !VALID_ROLES.has(input.role)) {
    throw new Error(`Invalid role: ${input.role}`);
  }

  const existing = await repo.findByEmail(tenantId, input.email);
  if (existing !== null) {
    throw new Error(
      `An employee with email "${input.email}" already exists for this tenant`
    );
  }

  if (input.teamId !== undefined && input.teamId !== null) {
    await validateTeamId(tenantId, input.teamId, teamChecker);
  }
}

async function validateTeamId(
  tenantId: string,
  teamId: string,
  checker?: TeamExistenceChecker
): Promise<void> {
  if (checker === undefined) return;

  const exists = await checker.teamExists(tenantId, teamId);
  if (!exists) {
    throw new Error(`Team not found: ${teamId}`);
  }
}

function parseCsvRow(
  row: CsvImportRow,
  rowNum: number
): CreateEmployeeInput {
  if (!row.email || !EMAIL_REGEX.test(row.email.trim())) {
    throw new Error(`Row ${rowNum}: invalid or missing email`);
  }
  if (!row.firstName || row.firstName.trim().length === 0) {
    throw new Error(`Row ${rowNum}: firstName is required`);
  }
  if (!row.lastName || row.lastName.trim().length === 0) {
    throw new Error(`Row ${rowNum}: lastName is required`);
  }

  const startDate = row.startDate
    ? new Date(row.startDate)
    : new Date();

  if (row.startDate !== undefined && isNaN(startDate.getTime())) {
    throw new Error(`Row ${rowNum}: invalid startDate "${row.startDate}"`);
  }

  return {
    email: row.email.trim(),
    firstName: row.firstName.trim(),
    lastName: row.lastName.trim(),
    role: (row.role as EmployeeRole | undefined) ?? "employee",
    teamId: row.teamId ?? null,
    startDate,
  };
}
