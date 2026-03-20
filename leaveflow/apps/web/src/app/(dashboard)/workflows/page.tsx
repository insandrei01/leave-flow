/**
 * Workflows list page — displays all approval workflows with metadata.
 *
 * Lists workflows with name, version, assigned teams, and step count.
 * Provides create new and edit actions.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useWorkflows, useDeleteWorkflow } from "@/hooks/use-workflow";

/* =========================================================================
   Page
   ========================================================================= */

export default function WorkflowsPage() {
  const { workflows, isLoading, error, refetch } = useWorkflows();
  const { remove, isDeleting } = useDeleteWorkflow();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete workflow "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await remove(id);
    setDeletingId(null);
    refetch();
  }

  return (
    <div className="min-h-screen p-6">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Approval Workflows
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure multi-step approval chains for leave requests
          </p>
        </div>
        <Link
          href="/workflows/new"
          className="flex items-center gap-2 rounded-xl bg-accent-indigo px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-indigo/90"
        >
          <PlusIcon />
          New Workflow
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-accent-rose/30 bg-accent-rose/10 p-4"
        >
          <p className="text-sm text-accent-rose">{error}</p>
          <button
            onClick={refetch}
            className="ml-auto text-xs text-accent-rose underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4" aria-busy="true" aria-label="Loading workflows">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && workflows.length === 0 && (
        <div className="glass-card flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-indigo/10">
            <WorkflowIcon />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-text-primary">
              No workflows yet
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Create your first approval workflow to get started
            </p>
          </div>
          <Link
            href="/workflows/new"
            className="rounded-xl bg-accent-indigo px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-indigo/90"
          >
            Create Workflow
          </Link>
        </div>
      )}

      {/* Workflow list */}
      {!isLoading && workflows.length > 0 && (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="glass-card group flex items-center gap-4 p-5"
            >
              {/* Workflow icon */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-indigo/10">
                <WorkflowIcon />
              </div>

              {/* Metadata */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-text-primary">
                    {workflow.name}
                  </h3>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-text-secondary">
                    v{workflow.version}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-indigo" />
                    {workflow.stepCount} step
                    {workflow.stepCount !== 1 ? "s" : ""}
                  </span>

                  {workflow.teamsAssigned.length > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
                      {workflow.teamsAssigned.length} team
                      {workflow.teamsAssigned.length !== 1 ? "s" : ""} assigned
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-accent-amber">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-amber" />
                      No teams assigned
                    </span>
                  )}

                  <span className="text-text-tertiary">
                    Updated{" "}
                    {new Date(workflow.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {/* Team pills */}
                {workflow.teamsAssigned.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {workflow.teamsAssigned.slice(0, 4).map((team) => (
                      <span
                        key={team}
                        className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-text-secondary"
                      >
                        {team}
                      </span>
                    ))}
                    {workflow.teamsAssigned.length > 4 && (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-text-tertiary">
                        +{workflow.teamsAssigned.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/workflows/${workflow.id}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-white/20 hover:text-text-primary"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete(workflow.id, workflow.name)}
                  disabled={isDeleting && deletingId === workflow.id}
                  aria-label={`Delete ${workflow.name}`}
                  className={cn(
                    "rounded-xl border border-white/10 px-3 py-2 text-sm font-medium transition-colors",
                    isDeleting && deletingId === workflow.id
                      ? "cursor-not-allowed opacity-50 text-text-tertiary"
                      : "text-text-secondary hover:border-accent-rose/30 hover:bg-accent-rose/10 hover:text-accent-rose"
                  )}
                >
                  {isDeleting && deletingId === workflow.id
                    ? "Deleting…"
                    : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Icons
   ========================================================================= */

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
    </svg>
  );
}

function WorkflowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-5 w-5 text-accent-indigo"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M3 3a2 2 0 1 1 4 0v1h2V3a2 2 0 1 1 1.5 1.937V5.5a.5.5 0 0 1-.5.5H8.5v1.5H10a2 2 0 1 1 0 1.5H8.5V10.5h.5a.5.5 0 0 1 .5.5v.563A2 2 0 1 1 8 13v-1.5H7V13a2 2 0 1 1-1.5-1.937V11a.5.5 0 0 1 .5-.5H7V9H5.5A2 2 0 1 1 5.5 7.5H7V6H6a.5.5 0 0 1-.5-.5V4.437A2 2 0 0 1 3 3Zm2 0a.5.5 0 1 0 1 0 .5.5 0 0 0-1 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
