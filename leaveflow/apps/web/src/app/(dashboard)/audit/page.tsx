"use client";

/**
 * Audit Trail page — chronological log of all system actions.
 */

import { useState } from "react";
import {
  useAudit,
  type AuditAction,
  type AuditEntityType,
} from "@/hooks/use-audit";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { glassInputClass, glassSelectClass } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

/* =========================================================================
   Action badge
   ========================================================================= */

const ACTION_BADGE_STYLES: Record<AuditAction, string> = {
  created: "bg-accent-cyan/20 text-accent-cyan",
  approved: "bg-accent-emerald/20 text-accent-emerald",
  rejected: "bg-accent-rose/20 text-accent-rose",
  updated: "bg-accent-amber/20 text-accent-amber",
  deleted: "bg-accent-rose/20 text-accent-rose",
  cancelled: "bg-white/10 text-text-tertiary",
};

function ActionBadge({ action }: { readonly action: AuditAction }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-medium capitalize",
        ACTION_BADGE_STYLES[action]
      )}
    >
      {action.replace("_", " ")}
    </span>
  );
}

/* =========================================================================
   Details expander
   ========================================================================= */

function DetailsExpander({ details }: { readonly details: Record<string, unknown> }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails = Object.keys(details).length > 0;

  if (!hasDetails) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="text-xs text-text-tertiary transition-colors hover:text-text-secondary"
      >
        {isOpen ? "Hide details" : "Show details"}
      </button>
      {isOpen && (
        <pre className="mt-2 overflow-x-auto rounded-xl bg-white/5 px-3 py-2 font-mono text-xs text-text-secondary">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* =========================================================================
   Page
   ========================================================================= */

const ENTITY_TYPE_OPTIONS: { value: AuditEntityType; label: string }[] = [
  { value: "leave_request", label: "Leave Request" },
  { value: "employee", label: "Employee" },
  { value: "workflow", label: "Workflow" },
  { value: "team", label: "Team" },
  { value: "leave_type", label: "Leave Type" },
];

export default function AuditPage() {
  const { entries, isLoading, error, meta, filters, setFilters, page, setPage } =
    useAudit();

  const totalPages = meta?.totalPages ?? 1;

  function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <PageHeader
        title="Audit Trail"
        subtitle="Full chronological log of all system actions."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.entityType ?? ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              entityType: (e.target.value as AuditEntityType) || undefined,
            })
          }
          className={cn(glassSelectClass, "w-44")}
        >
          <option value="">All entity types</option>
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, dateFrom: e.target.value || undefined })
          }
          className={cn(glassInputClass, "w-40")}
          aria-label="From date"
        />
        <input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, dateTo: e.target.value || undefined })
          }
          className={cn(glassInputClass, "w-40")}
          aria-label="To date"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="shimmer h-16 rounded-2xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            title="No audit entries found"
            description="Audit entries appear here as your team performs actions."
          />
        </div>
      ) : (
        <div className="glass-card overflow-hidden p-0">
          <div className="divide-y divide-white/5">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-1.5 px-5 py-4 transition-colors hover:bg-white/5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ActionBadge action={entry.action} />
                  <span className="font-mono text-xs text-accent-indigo">
                    {entry.entityType.replace("_", " ")}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {entry.entityLabel}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
                  <span>{formatTimestamp(entry.createdAt)}</span>
                  <span>by</span>
                  <span className="text-text-secondary">{entry.actorName}</span>
                </div>

                <DetailsExpander details={entry.details} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
