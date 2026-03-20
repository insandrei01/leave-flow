"use client";

/**
 * UserProfile — bottom-of-sidebar user card.
 *
 * Shows: avatar (initials fallback), display name, role badge, logout button.
 */

import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

/* =========================================================================
   Role label helper
   ========================================================================= */

const ROLE_LABELS: Record<string, string> = {
  company_admin: "Admin",
  hr_admin: "HR Admin",
  manager: "Manager",
  employee: "Employee",
};

const ROLE_COLORS: Record<string, string> = {
  company_admin: "text-accent-violet bg-accent-violet/10",
  hr_admin: "text-accent-indigo bg-accent-indigo/10",
  manager: "text-accent-cyan bg-accent-cyan/10",
  employee: "text-text-secondary bg-white/5",
};

/* =========================================================================
   Avatar
   ========================================================================= */

interface AvatarProps {
  readonly name: string;
  readonly imageUrl?: string | null;
  readonly size?: "sm" | "md";
}

function Avatar({ name, imageUrl, size = "md" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizeClass = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={cn("rounded-full object-cover ring-1 ring-border-glass", sizeClass)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br from-accent-indigo/60 to-accent-violet/60",
        "font-display font-semibold text-white ring-1 ring-border-glass",
        sizeClass
      )}
    >
      {initials}
    </div>
  );
}

/* =========================================================================
   Component
   ========================================================================= */

interface UserProfileProps {
  readonly isCollapsed?: boolean;
}

export function UserProfile({ isCollapsed = false }: UserProfileProps) {
  const employee = useAuthStore((s) => s.employee);
  const logout = useAuthStore((s) => s.logout);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (!employee) return null;

  const role = employee.role;
  const roleLabel = ROLE_LABELS[role] ?? role;
  const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS.employee;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Silently ignore — user will be redirected by the auth guard on next load
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border-glass bg-surface-glass p-3",
        "transition-colors duration-300 hover:border-border-glass-hover",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Avatar
        name={employee.displayName}
        imageUrl={employee.profileImageUrl}
      />

      {!isCollapsed && (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {employee.displayName}
            </p>
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-medium",
                roleColor
              )}
            >
              {roleLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoading}
            aria-label="Sign out"
            className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg",
              "text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-secondary",
              "disabled:opacity-50"
            )}
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
