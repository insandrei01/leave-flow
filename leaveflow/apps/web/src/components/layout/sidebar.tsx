"use client";

/**
 * Sidebar — dark glass navigation sidebar.
 *
 * Features:
 * - Logo at top
 * - Role-based nav sections (employee sees subset, hr_admin/admin sees all)
 * - Active item detection via current pathname
 * - Badge count on Pending Approvals
 * - Collapse toggle (icon-only mode)
 * - UserProfile at bottom
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { NavItem } from "./nav-item";
import { UserProfile } from "./user-profile";
import { cn } from "@/lib/utils";

/* =========================================================================
   Icons (inline SVG — no external icon lib dependency)
   ========================================================================= */

const Icons = {
  dashboard: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  calendar: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  myRequests: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  approvals: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  employees: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  teams: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  leaveTypes: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  workflows: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  balances: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  audit: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  settings: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  billing: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  chevronLeft: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chevronRight: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
};

/* =========================================================================
   Nav structure
   ========================================================================= */

interface NavSection {
  readonly label: string;
  readonly items: NavItemDef[];
}

interface NavItemDef {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly roles?: readonly string[];
  readonly badgeKey?: "pendingApprovals";
}

const NAV_SECTIONS: readonly NavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Icons.dashboard },
      { href: "/calendar", label: "Calendar", icon: Icons.calendar },
    ],
  },
  {
    label: "Requests",
    items: [
      { href: "/requests", label: "My Requests", icon: Icons.myRequests },
      {
        href: "/approvals",
        label: "Pending Approvals",
        icon: Icons.approvals,
        roles: ["company_admin", "hr_admin", "manager"],
        badgeKey: "pendingApprovals",
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        href: "/employees",
        label: "Employees",
        icon: Icons.employees,
        roles: ["company_admin", "hr_admin"],
      },
      {
        href: "/teams",
        label: "Teams",
        icon: Icons.teams,
        roles: ["company_admin", "hr_admin"],
      },
      {
        href: "/leave-types",
        label: "Leave Types",
        icon: Icons.leaveTypes,
        roles: ["company_admin", "hr_admin"],
      },
      {
        href: "/workflows",
        label: "Workflows",
        icon: Icons.workflows,
        roles: ["company_admin", "hr_admin"],
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        href: "/balances",
        label: "Balances",
        icon: Icons.balances,
        roles: ["company_admin", "hr_admin", "manager"],
      },
      {
        href: "/audit",
        label: "Audit Trail",
        icon: Icons.audit,
        roles: ["company_admin", "hr_admin"],
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings", label: "Settings", icon: Icons.settings },
      {
        href: "/billing",
        label: "Billing",
        icon: Icons.billing,
        roles: ["company_admin"],
      },
    ],
  },
];

/* =========================================================================
   Component
   ========================================================================= */

interface SidebarProps {
  /** Badge counts for nav items */
  readonly pendingApprovals?: number;
}

export function Sidebar({ pendingApprovals = 0 }: SidebarProps) {
  const pathname = usePathname();
  const employee = useAuthStore((s) => s.employee);
  const role = employee?.role ?? "employee";

  const [isCollapsed, setIsCollapsed] = useState(false);

  const badges: Record<string, number> = {
    pendingApprovals,
  };

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "flex h-full flex-col border-r border-border-glass bg-surface-primary/80",
        "backdrop-blur-glass transition-all duration-500 ease-spring",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 flex-shrink-0 items-center border-b border-border-glass px-4",
          isCollapsed && "justify-center px-2"
        )}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-accent-indigo/20 ring-1 ring-accent-indigo/40 animate-glow">
          <svg
            aria-hidden="true"
            className="h-4 w-4 text-accent-indigo"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        {!isCollapsed && (
          <span className="ml-2.5 font-display text-base font-bold text-text-primary">
            LeaveFlow
          </span>
        )}
      </div>

      {/* Nav sections */}
      <nav className="scrollbar-none flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (!item.roles) return true;
            return item.roles.includes(role);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-5">
              {!isCollapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  return (
                    <li key={item.href}>
                      <NavItem
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        isActive={isActive}
                        badge={badge}
                        isCollapsed={isCollapsed}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom: user profile + collapse toggle */}
      <div className="flex-shrink-0 space-y-2 border-t border-border-glass p-3">
        <UserProfile isCollapsed={isCollapsed} />

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-1.5 text-xs",
            "text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-secondary"
          )}
        >
          {isCollapsed ? Icons.chevronRight : (
            <>
              {Icons.chevronLeft}
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
