"use client";

/**
 * Leave Types page — manage leave type configuration.
 */

import { useState } from "react";
import { useLeaveTypes, type LeaveType } from "@/hooks/use-leave-types";
import { LeaveTypeForm } from "@/components/config/leave-type-form";
import { GlassModal } from "@/components/ui/glass-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
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

/* =========================================================================
   Page
   ========================================================================= */

export default function LeaveTypesPage() {
  const { leaveTypes, isLoading, error, create, update, remove } =
    useLeaveTypes();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleCreate(
    input: Parameters<typeof create>[0]
  ) {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await create(input);
      setIsAddOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create");
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
      setFormError(err instanceof Error ? err.message : "Failed to update");
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
      // Keep the dialog open so the user can retry
    } finally {
      setIsDeleting(false);
    }
  }

  const accrualLabels: Record<string, string> = {
    none: "Fixed",
    monthly: "Monthly",
    annual: "Annual",
    per_pay_period: "Per period",
  };

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <PageHeader
        title="Leave Types"
        subtitle="Configure the types of leave your organization offers."
        action={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-accent-indigo transition-colors hover:bg-accent-indigo/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Leave Type
          </button>
        }
      />

      {/* Error banner */}
      {error && (
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {error}
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="glass-card p-8">
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="shimmer h-10 rounded-xl" />
            ))}
          </div>
        </div>
      ) : leaveTypes.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            title="No leave types configured"
            description="Add your first leave type to get started."
            action={
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-accent-indigo hover:bg-accent-indigo/30"
              >
                Add Leave Type
              </button>
            }
          />
        </div>
      ) : (
        <GlassTable>
          <GlassTableHead>
            <GlassTableTh className="w-8" />
            <GlassTableTh>Name</GlassTableTh>
            <GlassTableTh>Pay type</GlassTableTh>
            <GlassTableTh>Entitlement</GlassTableTh>
            <GlassTableTh>Accrual</GlassTableTh>
            <GlassTableTh className="text-right">Actions</GlassTableTh>
          </GlassTableHead>
          <GlassTableBody>
            {leaveTypes.map((lt) => (
              <GlassTableRow key={lt.id}>
                <GlassTableTd>
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: lt.color }}
                    aria-hidden="true"
                  />
                </GlassTableTd>
                <GlassTableTd>
                  <span className="font-medium text-text-primary">{lt.name}</span>
                </GlassTableTd>
                <GlassTableTd>
                  <StatusBadge
                    label={lt.paid ? "Paid" : "Unpaid"}
                    variant={lt.paid ? "paid" : "unpaid"}
                  />
                </GlassTableTd>
                <GlassTableTd>{lt.entitlementDays} days/year</GlassTableTd>
                <GlassTableTd>{accrualLabels[lt.accrualType] ?? lt.accrualType}</GlassTableTd>
                <GlassTableTd className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTarget(lt)}
                      className="rounded-lg px-2 py-1 text-xs text-text-tertiary transition-colors hover:bg-white/10 hover:text-text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(lt)}
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
        title="Add Leave Type"
      >
        {formError && (
          <p className="mb-4 text-sm text-accent-rose">{formError}</p>
        )}
        <LeaveTypeForm
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
        title="Edit Leave Type"
      >
        {formError && (
          <p className="mb-4 text-sm text-accent-rose">{formError}</p>
        )}
        {editTarget && (
          <LeaveTypeForm
            initial={editTarget}
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
        title="Delete Leave Type"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
