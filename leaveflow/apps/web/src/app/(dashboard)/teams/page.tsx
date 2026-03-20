"use client";

/**
 * Teams page — manage teams with manager and workflow assignments.
 */

import { useState } from "react";
import { useTeams, type Team } from "@/hooks/use-teams";
import { TeamForm } from "@/components/config/team-form";
import { GlassModal } from "@/components/ui/glass-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  GlassTable,
  GlassTableHead,
  GlassTableTh,
  GlassTableBody,
  GlassTableRow,
  GlassTableTd,
} from "@/components/ui/glass-table";
import { useEmployees } from "@/hooks/use-employees";

/* =========================================================================
   Mock workflows — real implementation would fetch from /api/workflows
   ========================================================================= */

const MOCK_WORKFLOWS = [
  { id: "wf_1", name: "Manager Approval" },
  { id: "wf_2", name: "Auto Approve" },
  { id: "wf_3", name: "HR + Manager" },
];

/* =========================================================================
   Page
   ========================================================================= */

export default function TeamsPage() {
  const { teams, isLoading, error, create, update, remove } = useTeams();
  const { employees } = useEmployees();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Team | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.name }));

  async function handleCreate(input: Parameters<typeof create>[0]) {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await create(input);
      setIsAddOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(input: Parameters<typeof update>[1]) {
    if (!editTarget) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await update(editTarget.id, input);
      setEditTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update team");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Keep dialog open for retry
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <PageHeader
        title="Teams"
        subtitle="Organize employees into teams with dedicated approval workflows."
        action={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-accent-indigo transition-colors hover:bg-accent-indigo/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Team
          </button>
        }
      />

      {error && (
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="glass-card p-8">
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="shimmer h-10 rounded-xl" />
            ))}
          </div>
        </div>
      ) : teams.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            title="No teams yet"
            description="Create a team to start organizing employees."
            action={
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-accent-indigo hover:bg-accent-indigo/30"
              >
                Create Team
              </button>
            }
          />
        </div>
      ) : (
        <GlassTable>
          <GlassTableHead>
            <GlassTableTh>Team name</GlassTableTh>
            <GlassTableTh>Manager</GlassTableTh>
            <GlassTableTh>Workflow</GlassTableTh>
            <GlassTableTh>Members</GlassTableTh>
            <GlassTableTh className="text-right">Actions</GlassTableTh>
          </GlassTableHead>
          <GlassTableBody>
            {teams.map((team) => (
              <GlassTableRow key={team.id}>
                <GlassTableTd>
                  <span className="font-medium text-text-primary">{team.name}</span>
                </GlassTableTd>
                <GlassTableTd>{team.managerName}</GlassTableTd>
                <GlassTableTd>{team.workflowName}</GlassTableTd>
                <GlassTableTd>
                  <span className="font-mono text-xs">{team.memberCount}</span>
                </GlassTableTd>
                <GlassTableTd className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTarget(team)}
                      className="rounded-lg px-2 py-1 text-xs text-text-tertiary transition-colors hover:bg-white/10 hover:text-text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(team)}
                      className="rounded-lg px-2 py-1 text-xs text-accent-rose/70 transition-colors hover:bg-accent-rose/10 hover:text-accent-rose"
                    >
                      Delete
                    </button>
                  </div>
                </GlassTableTd>
              </GlassTableRow>
            ))}
          </GlassTableBody>
        </GlassTable>
      )}

      {/* Add modal */}
      <GlassModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setFormError(null);
        }}
        title="Create Team"
      >
        {formError && (
          <p className="mb-4 text-sm text-accent-rose">{formError}</p>
        )}
        <TeamForm
          employees={employeeOptions}
          workflows={MOCK_WORKFLOWS}
          onSubmit={handleCreate}
          onCancel={() => {
            setIsAddOpen(false);
            setFormError(null);
          }}
          isSubmitting={isSubmitting}
        />
      </GlassModal>

      {/* Edit modal */}
      <GlassModal
        isOpen={!!editTarget}
        onClose={() => {
          setEditTarget(null);
          setFormError(null);
        }}
        title="Edit Team"
      >
        {formError && (
          <p className="mb-4 text-sm text-accent-rose">{formError}</p>
        )}
        {editTarget && (
          <TeamForm
            initial={editTarget}
            employees={employeeOptions}
            workflows={MOCK_WORKFLOWS}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEditTarget(null);
              setFormError(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}
      </GlassModal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Team"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Members will become unassigned.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
