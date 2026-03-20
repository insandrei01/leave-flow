/**
 * User roles within a tenant.
 * Roles are ordered by privilege level (ascending).
 */
export const ROLES = {
  employee: "employee",
  manager: "manager",
  hr_admin: "hr_admin",
  company_admin: "company_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
