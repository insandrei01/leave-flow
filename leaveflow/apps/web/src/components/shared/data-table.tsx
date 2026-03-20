"use client";

/**
 * DataTable — reusable table with sorting, pagination controls,
 * loading skeleton, and empty state.
 *
 * Generic over row shape T.
 */

import { useState } from "react";
import { TableRowSkeleton } from "./loading-skeleton";
import { EmptyState } from "./empty-state";
import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export type SortDirection = "asc" | "desc";

export interface ColumnDef<T> {
  readonly key: string;
  readonly header: string;
  readonly render: (row: T) => React.ReactNode;
  readonly sortable?: boolean;
  readonly width?: string;
  readonly align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  readonly columns: readonly ColumnDef<T>[];
  readonly rows: readonly T[];
  readonly keyExtractor: (row: T) => string;
  readonly isLoading?: boolean;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly emptyAction?: React.ReactNode;
  readonly skeletonRows?: number;
  readonly className?: string;
  readonly onSort?: (key: string, direction: SortDirection) => void;
}

/* =========================================================================
   Sort icon
   ========================================================================= */

function SortIcon({
  direction,
  isActive,
}: {
  readonly direction: SortDirection | null;
  readonly isActive: boolean;
}) {
  return (
    <span aria-hidden="true" className="ml-1 inline-flex flex-col">
      <svg
        className={cn(
          "h-3 w-3 transition-colors",
          isActive && direction === "asc"
            ? "text-accent-indigo"
            : "text-text-tertiary"
        )}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 3l6 7H4l6-7z" />
      </svg>
      <svg
        className={cn(
          "h-3 w-3 -mt-1 transition-colors",
          isActive && direction === "desc"
            ? "text-accent-indigo"
            : "text-text-tertiary"
        )}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 17l-6-7h12l-6 7z" />
      </svg>
    </span>
  );
}

/* =========================================================================
   Component
   ========================================================================= */

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  isLoading = false,
  emptyTitle = "No results",
  emptyDescription,
  emptyAction,
  skeletonRows = 5,
  className,
  onSort,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (key: string) => {
    const newDir: SortDirection =
      sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(newDir);
    onSort?.(key, newDir);
  };

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border-glass", className)}>
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full border-collapse text-sm">
          {/* Head */}
          <thead>
            <tr className="border-b border-border-glass bg-surface-glass">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={{ width: col.width }}
                  className={cn(
                    "px-4 py-3 font-medium text-text-tertiary",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    !col.align && "text-left",
                    col.sortable && "cursor-pointer select-none hover:text-text-secondary"
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center">
                    {col.header}
                    {col.sortable && (
                      <SortIcon
                        direction={sortKey === col.key ? sortDir : null}
                        isActive={sortKey === col.key}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRowSkeleton key={i} columns={columns.length} />
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    className="py-12"
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="border-b border-border-glass transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-text-secondary",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right"
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
