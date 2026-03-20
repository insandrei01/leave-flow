"use client";

/**
 * PageHeader — top bar for dashboard pages.
 *
 * Contains: page title, optional breadcrumb, notification bell (with unread
 * count badge), and user avatar dropdown (logout + profile link).
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export interface PageHeaderProps {
  readonly title: string;
  readonly breadcrumb?: readonly BreadcrumbItem[];
  readonly unreadNotifications?: number;
}

/* =========================================================================
   Notification bell
   ========================================================================= */

function NotificationBell({ unread }: { readonly unread: number }) {
  return (
    <Link
      href="/notifications"
      aria-label={
        unread > 0 ? `${unread} unread notifications` : "Notifications"
      }
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-xl",
        "border border-border-glass bg-surface-glass",
        "text-text-secondary transition-colors hover:border-border-glass-hover hover:text-text-primary"
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
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-rose px-1 font-mono text-[9px] font-medium text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

/* =========================================================================
   Avatar dropdown
   ========================================================================= */

function AvatarDropdown() {
  const employee = useAuthStore((s) => s.employee);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!employee) return null;

  const initials = employee.displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    setOpen(false);
    try {
      await logout();
    } catch {
      // Ignore — auth guard handles redirect
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="User menu"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          "bg-gradient-to-br from-accent-indigo/60 to-accent-violet/60",
          "font-display text-sm font-semibold text-white",
          "ring-1 ring-border-glass transition-all hover:ring-border-glass-hover"
        )}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User menu"
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-52",
            "rounded-2xl border border-border-glass bg-surface-secondary",
            "shadow-lg backdrop-blur-glass",
            "animate-fade-in"
          )}
        >
          {/* User info */}
          <div className="border-b border-border-glass px-4 py-3">
            <p className="text-sm font-medium text-text-primary">
              {employee.displayName}
            </p>
            <p className="mt-0.5 truncate text-xs text-text-tertiary">
              {employee.email}
            </p>
          </div>

          {/* Menu items */}
          <div className="p-1">
            <Link
              href="/settings/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          </div>

          <div className="border-t border-border-glass p-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-accent-rose transition-colors hover:bg-accent-rose/10"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Page header
   ========================================================================= */

export function PageHeader({
  title,
  breadcrumb,
  unreadNotifications = 0,
}: PageHeaderProps) {
  return (
    <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-border-glass px-6">
      {/* Title + breadcrumb */}
      <div className="min-w-0 flex-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-0.5 flex items-center gap-1.5">
            {breadcrumb.map((item, index) => (
              <span key={item.label} className="flex items-center gap-1.5">
                {index > 0 && (
                  <svg aria-hidden="true" className="h-3 w-3 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-xs text-text-tertiary transition-colors hover:text-text-secondary"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-xs text-text-tertiary">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate font-display text-lg font-semibold text-text-primary">
          {title}
        </h1>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <NotificationBell unread={unreadNotifications} />
        <AvatarDropdown />
      </div>
    </header>
  );
}
