"use client";

/**
 * GlassTable — reusable glass card table wrapper with consistent styling.
 */

import { cn } from "@/lib/utils";

interface GlassTableProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function GlassTable({ children, className }: GlassTableProps) {
  return (
    <div
      className={cn(
        "glass-card overflow-hidden",
        className
      )}
    >
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-max">{children}</table>
      </div>
    </div>
  );
}

interface GlassTableHeadProps {
  readonly children: React.ReactNode;
}

export function GlassTableHead({ children }: GlassTableHeadProps) {
  return (
    <thead className="border-b border-white/5 bg-white/5">
      <tr>{children}</tr>
    </thead>
  );
}

interface GlassTableThProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function GlassTableTh({ children, className }: GlassTableThProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary",
        className
      )}
    >
      {children}
    </th>
  );
}

interface GlassTableBodyProps {
  readonly children: React.ReactNode;
}

export function GlassTableBody({ children }: GlassTableBodyProps) {
  return (
    <tbody className="divide-y divide-white/5">{children}</tbody>
  );
}

interface GlassTableRowProps {
  readonly children: React.ReactNode;
  readonly onClick?: () => void;
  readonly className?: string;
}

export function GlassTableRow({
  children,
  onClick,
  className,
}: GlassTableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-white/5",
        className
      )}
    >
      {children}
    </tr>
  );
}

interface GlassTableTdProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function GlassTableTd({ children, className }: GlassTableTdProps) {
  return (
    <td className={cn("px-4 py-3 text-sm text-text-secondary", className)}>
      {children}
    </td>
  );
}
