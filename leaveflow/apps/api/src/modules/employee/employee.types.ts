/**
 * Service-level types for the employee module.
 */

export type EmployeeRole = "company_admin" | "hr_admin" | "manager" | "employee";
export type EmployeeStatus = "active" | "inactive" | "invited";
export type PrimaryPlatform = "slack" | "teams" | "email";

export interface EmployeeFilters {
  status?: EmployeeStatus;
  role?: EmployeeRole;
  teamId?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateEmployeeInput {
  email: string;
  firstName: string;
  lastName: string;
  role?: EmployeeRole;
  teamId?: string | null;
  startDate: Date;
  primaryPlatform?: PrimaryPlatform;
  timezone?: string;
  firebaseUid?: string | null;
  status?: EmployeeStatus;
}

export interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  role?: EmployeeRole;
  teamId?: string | null;
  primaryPlatform?: PrimaryPlatform;
  timezone?: string;
  profileImageUrl?: string | null;
  firebaseUid?: string | null;
}

export interface EmployeeRecord {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: EmployeeRole;
  teamId: string | null;
  firebaseUid: string | null;
  startDate: Date;
  primaryPlatform: PrimaryPlatform;
  timezone: string;
  profileImageUrl: string | null;
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  invitationStatus: string;
  status: EmployeeStatus;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CsvImportRow {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  teamId?: string;
  startDate?: string;
}

export interface CsvImportResult {
  created: EmployeeRecord[];
  errors: Array<{ row: number; email?: string; reason: string }>;
}
