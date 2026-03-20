"use client";

/**
 * PagePagination — pagination controls (prev, page numbers, next).
 *
 * Shows up to 7 page numbers with ellipsis for large page counts.
 * Fully keyboard-navigable and screen-reader friendly.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface PagePaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly className?: string;
}

/* =========================================================================
   Page range builder
   ========================================================================= */

function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // Always show first, last, current ± 1, with ellipsis gaps
  const pages: (number | "…")[] = [];

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  pages.push(1);

  if (start > 2) pages.push("…");

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total - 1) pages.push("…");

  pages.push(total);

  return pages;
}

/* =========================================================================
   Page button
   ========================================================================= */

interface PageButtonProps {
  readonly page: number | "…";
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
}

function PageButton({ page, currentPage, onPageChange }: PageButtonProps) {
  if (page === "…") {
    return (
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center text-sm text-text-tertiary"
      >
        …
      </span>
    );
  }

  const isActive = page === currentPage;

  return (
    <button
      type="button"
      onClick={() => onPageChange(page)}
      aria-current={isActive ? "page" : undefined}
      aria-label={`Page ${page}`}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium",
        "transition-all duration-300",
        isActive
          ? "bg-accent-indigo/20 text-accent-indigo ring-1 ring-accent-indigo/40"
          : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
      )}
    >
      {page}
    </button>
  );
}

/* =========================================================================
   Component
   ========================================================================= */

export function PagePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PagePaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageRange(currentPage, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const navButtonClass = cn(
    "flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-medium",
    "text-text-secondary transition-all duration-300",
    "hover:bg-white/5 hover:text-text-primary",
    "disabled:cursor-not-allowed disabled:opacity-40"
  );

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {/* Previous */}
      <button
        type="button"
        onClick={() => hasPrev && onPageChange(currentPage - 1)}
        disabled={!hasPrev}
        aria-label="Previous page"
        className={navButtonClass}
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>

      {/* Page numbers */}
      {pages.map((page, i) => (
        <PageButton
          key={`${page}-${i}`}
          page={page}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      ))}

      {/* Next */}
      <button
        type="button"
        onClick={() => hasNext && onPageChange(currentPage + 1)}
        disabled={!hasNext}
        aria-label="Next page"
        className={navButtonClass}
      >
        Next
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
