"use client";

/**
 * StatusBadge — colored pill for status and role labels.
 */

import { cn } from "@/lib/utils";

type BadgeVariant =
  | "approved"
  | "pending"
  | "rejected"
  | "cancelled"
  | "active"
  | "inactive"
  | "paid"
  | "unpaid"
  | "admin"
  | "manager"
  | "employee"
  | "created"
  | "updated"
  | "neutral";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  approved: "bg-accent-emerald/20 text-accent-emerald",
  pending: "bg-accent-amber/20 text-accent-amber",
  rejected: "bg-accent-rose/20 text-accent-rose",
  cancelled: "bg-white/10 text-text-tertiary",
  active: "bg-accent-emerald/20 text-accent-emerald",
  inactive: "bg-white/10 text-text-tertiary",
  paid: "bg-accent-indigo/20 text-accent-indigo",
  unpaid: "bg-white/10 text-text-secondary",
  admin: "bg-accent-violet/20 text-accent-violet",
  manager: "bg-accent-cyan/20 text-accent-cyan",
  employee: "bg-white/10 text-text-secondary",
  created: "bg-accent-cyan/20 text-accent-cyan",
  updated: "bg-accent-amber/20 text-accent-amber",
  neutral: "bg-white/10 text-text-secondary",
};

interface StatusBadgeProps {
  readonly label: string;
  readonly variant: BadgeVariant;
  readonly className?: string;
}

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-mono",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
