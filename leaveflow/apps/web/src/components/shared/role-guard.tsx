/**
 * RoleGuard — conditionally renders children based on the user's role.
 *
 * Renders nothing (or a fallback) if the current user does not have
 * one of the required roles.
 */

import { useAuthStore } from "@/stores/auth.store";
import type { EmployeeRole } from "@leaveflow/shared-types";

/* =========================================================================
   Types
   ========================================================================= */

export interface RoleGuardProps {
  /** Roles that are allowed to see the children. */
  readonly allowedRoles: readonly EmployeeRole[];
  readonly children: React.ReactNode;
  /** Optional content to render when the user lacks the required role. */
  readonly fallback?: React.ReactNode;
}

/* =========================================================================
   Component
   ========================================================================= */

export function RoleGuard({
  allowedRoles,
  children,
  fallback = null,
}: RoleGuardProps) {
  const employee = useAuthStore((s) => s.employee);
  const role = employee?.role;

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
