/**
 * GDPR compliance operations for the employee module.
 *
 * - gdprExport: produces a JSON export of all data associated with an employee
 * - gdprDelete: pseudonymizes the employee record (retains audit trail integrity)
 *
 * GDPR pseudonymization strategy:
 *   - Personal identifiers (name, email, firebaseUid) are replaced with
 *     "[DELETED:<employeeId>]" so references remain resolvable for audit logs
 *     but the actual PII is removed.
 *   - The employee is deactivated with status "inactive".
 *   - Related audit log entries retain the employeeId (pseudonymized reference).
 */

import type { EmployeeRepository } from "./employee.repository.js";
import type { EmployeeRecord } from "./employee.types.js";

// ----------------------------------------------------------------
// Dependency interfaces
// ----------------------------------------------------------------

export interface GdprExportData {
  exportedAt: string;
  employee: EmployeeRecord;
}

export interface GdprPseudonymizeResult {
  employeeId: string;
  pseudonymizedAt: string;
}

// ----------------------------------------------------------------
// GDPR Repository extension
// ----------------------------------------------------------------

export interface GdprEmployeeRepository extends EmployeeRepository {
  pseudonymize(tenantId: string, id: string): Promise<EmployeeRecord | null>;
}

// ----------------------------------------------------------------
// Service factory
// ----------------------------------------------------------------

export interface GdprService {
  exportEmployeeData(
    tenantId: string,
    employeeId: string
  ): Promise<GdprExportData>;
  pseudonymizeEmployee(
    tenantId: string,
    employeeId: string
  ): Promise<GdprPseudonymizeResult>;
}

export function createGdprService(deps: {
  repo: GdprEmployeeRepository;
}): GdprService {
  const { repo } = deps;

  return {
    async exportEmployeeData(
      tenantId: string,
      employeeId: string
    ): Promise<GdprExportData> {
      if (!tenantId) {
        throw new Error("tenantId is required");
      }
      if (!employeeId) {
        throw new Error("employeeId is required");
      }

      const employee = await repo.findById(tenantId, employeeId);
      if (employee === null) {
        throw new Error(`Employee not found: ${employeeId}`);
      }

      return {
        exportedAt: new Date().toISOString(),
        employee: { ...employee },
      };
    },

    async pseudonymizeEmployee(
      tenantId: string,
      employeeId: string
    ): Promise<GdprPseudonymizeResult> {
      if (!tenantId) {
        throw new Error("tenantId is required");
      }
      if (!employeeId) {
        throw new Error("employeeId is required");
      }

      const existing = await repo.findById(tenantId, employeeId);
      if (existing === null) {
        throw new Error(`Employee not found: ${employeeId}`);
      }

      const result = await repo.pseudonymize(tenantId, employeeId);
      if (result === null) {
        throw new Error(`Failed to pseudonymize employee: ${employeeId}`);
      }

      return {
        employeeId,
        pseudonymizedAt: new Date().toISOString(),
      };
    },
  };
}
