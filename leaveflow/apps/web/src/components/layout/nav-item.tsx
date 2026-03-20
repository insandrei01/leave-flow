"use client";

/**
 * NavItem — a single navigation item in the sidebar.
 *
 * Features:
 * - Active state: indigo left border + indigo text + subtle background
 * - Collapse mode: icon-only with tooltip
 * - Badge: numeric count (e.g., pending approvals)
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface NavItemProps {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly isActive?: boolean;
  readonly badge?: number;
  readonly isCollapsed?: boolean;
}

/* =========================================================================
   Component
   ========================================================================= */

export function NavItem({
  href,
  label,
  icon,
  isActive = false,
  badge,
  isCollapsed = false,
}: NavItemProps) {
  return (
    <Link
      href={href}
      aria-label={isCollapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
        "transition-all duration-300 ease-spring",
        isActive
          ? [
              "bg-accent-indigo/10 text-accent-indigo",
              "before:absolute before:inset-y-1 before:left-0 before:w-0.5",
              "before:rounded-full before:bg-accent-indigo",
            ]
          : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
        isCollapsed && "justify-center px-2"
      )}
    >
      {/* Icon */}
      <span
        className={cn(
          "flex h-4 w-4 flex-shrink-0 items-center justify-center",
          isActive ? "text-accent-indigo" : "text-text-tertiary group-hover:text-text-secondary"
        )}
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Label — hidden when collapsed */}
      {!isCollapsed && (
        <span className="flex-1 truncate">{label}</span>
      )}

      {/* Badge */}
      {!isCollapsed && badge !== undefined && badge > 0 && (
        <span
          aria-label={`${badge} pending`}
          className={cn(
            "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5",
            "font-mono text-[10px] font-medium",
            isActive
              ? "bg-accent-indigo/30 text-accent-indigo"
              : "bg-white/10 text-text-secondary"
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      {/* Collapsed badge dot */}
      {isCollapsed && badge !== undefined && badge > 0 && (
        <span
          aria-label={`${badge} pending`}
          className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent-amber"
        />
      )}

      {/* Tooltip for collapsed mode */}
      {isCollapsed && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-full ml-3 z-50",
            "rounded-xl border border-border-glass bg-surface-secondary px-3 py-1.5",
            "text-xs font-medium text-text-primary shadow-lg",
            "opacity-0 translate-x-1 transition-all duration-200",
            "group-hover:opacity-100 group-hover:translate-x-0",
            "whitespace-nowrap"
          )}
        >
          {label}
          {badge !== undefined && badge > 0 && (
            <span className="ml-1.5 font-mono text-accent-amber">{badge}</span>
          )}
        </span>
      )}
    </Link>
  );
}
