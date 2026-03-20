"use client";

/**
 * Employees page — manage employees with filtering and CSV import.
 */

import { useState } from "react";
import { useEmployees, type Employee, type EmployeeFilters } from "@/hooks/use-employees";
import { useTeams } from "@/hooks/use-teams";
import { EmployeeForm } from "@/components/config/employee-form";
import { CsvImport } from "@/components/config/csv-import";
import { GlassModal } from "@/components/ui/glass-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { glassSelectClass, glassInputClass } from "@/components/ui/form-field";
import {
  GlassTable,
  GlassTableHead,
  GlassTableTh,
  GlassTableBody,
  GlassTableRow,
  GlassTableTd,
} from "@/components/ui/glass-table";
import { cn } from "@/lib/utils";

/* =========================================================================
   Avatar
   ========================================================================= */

function EmployeeAvatar({
  name,
  avatarUrl,
}: {
  readonly name: string;
  readonly avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-indigo/60 to-accent-violet/60 font-display text-xs font-semibold text-white">
      {initials}
    </div>
  );
}

/* =========================================================================
   Page
   ========================================================================= */

export default function EmployeesPage() {
  const { employees, isLoading, error, filters, setFilters, create, update, deactivate, importCsv } =
    useEmployees();
  const { teams } = useTeams();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const teamOptions = teams.map((t) => ({ id: t.id, name: t.name }));

  function handleFilterChange(patch: Partial<EmployeeFilters>) {
    setFilters({ ...filters, ...patch });
  }

  async function handleCreate(input: Parameters<typeof create>[0]) {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await create(input);
      setIsAddOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add employee");
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
      setFormError(err instanceof Error ? err.message : "Failed to update employee");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await deactivate(deactivateTarget.id);
      setDeactivateTarget(null);
    } catch {
      // Keep dialog open
    } finally {
      setIsDeactivating(false);
    }
  }

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "admin" as const;
    if (role === "manager") return "manager" as const;
    return "employee" as const;
  };

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <PageHeader
        title="Employees"
        subtitle="Manage your organization's workforce."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import CSV
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-accent-indigo transition-colors hover:bg-accent-indigo/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Employee
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filters.search ?? ""}
          onChange={(e) => handleFilterChange({ search: e.target.value || undefined })}
          placeholder="Search by name or email..."
          className={cn(glassInputClass, "w-64")}
        />
        <select
          value={filters.teamId ?? ""}
          onChange={(e) => handleFilterChange({ teamId: e.target.value || undefined })}
          className={cn(glassSelectClass, "w-44")}
        >
          <option value="">All teams</option>
          {teamOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={filters.role ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            handleFilterChange({ role: v ? (v as "admin" | "manager" | "employee") : undefined });
          }}
          className={cn(glassSelectClass, "w-36")}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
        <select
          value={filters.status ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            handleFilterChange({ status: v ? (v as "active" | "inactive") : undefined });
          }}
          className={cn(glassSelectClass, "w-36")}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

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
            {[...Array(5)].map((_, i) => (
              <div key={i} className="shimmer h-12 rounded-xl" />
            ))}
          </div>
        </div>
      ) : employees.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            title="No employees found"
            description="Add your first employee or adjust the filters."
            action={
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-accent-indigo hover:bg-accent-indigo/30"
              >
                Add Employee
              </button>
            }
          />
        </div>
      ) : (
        <GlassTable>
          <GlassTableHead>
            <GlassTableTh>Employee</GlassTableTh>
            <GlassTableTh>Email</GlassTableTh>
            <GlassTableTh>Role</GlassTableTh>
            <GlassTableTh>Team</GlassTableTh>
            <GlassTableTh>Status</GlassTableTh>
            <GlassTableTh className="text-right">Actions</GlassTableTh>
          </GlassTableHead>
          <GlassTableBody>
            {employees.map((emp) => (
              <GlassTableRow key={emp.id}>
                <GlassTableTd>
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar name={emp.name} avatarUrl={emp.avatarUrl} />
                    <span className="font-medium text-text-primary">{emp.name}</span>
                  </div>
                </GlassTableTd>
                <GlassTableTd>{emp.email}</GlassTableTd>
                <GlassTableTd>
                  <StatusBadge
                    label={emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                    variant={roleBadgeVariant(emp.role)}
                  />
                </GlassTableTd>
                <GlassTableTd>
                  {emp.teamName ?? <span className="text-text-tertiary">—</span>}
                </GlassTableTd>
                <GlassTableTd>
                  <StatusBadge
                    label={emp.status === "active" ? "Active" : "Inactive"}
                    variant={emp.status === "active" ? "active" : "inactive"}
                  />
                </GlassTableTd>
                <GlassTableTd className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTarget(emp)}
                      className="rounded-lg px-2 py-1 text-xs text-text-tertiary transition-colors hover:bg-white/10 hover:text-text-primary"
                    >
                      Edit
                    </button>
                    {emp.status === "active" && (
                      <button
                        type="button"
                        onClick={() => setDeactivateTarget(emp)}
                        className="rounded-lg px-2 py-1 text-xs text-accent-amber/70 transition-colors hover:bg-accent-amber/10 hover:text-accent-amber"
                      >
                        Deactivate
                      </button>
                    )}
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
        title="Add Employee"
      >
        {formError && (
          <p className="mb-4 text-sm text-accent-rose">{formError}</p>
        )}
        <EmployeeForm
          teams={teamOptions}
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
        title="Edit Employee"
      >
        {formError && (
          <p className="mb-4 text-sm text-accent-rose">{formError}</p>
        )}
        {editTarget && (
          <EmployeeForm
            initial={editTarget}
            teams={teamOptions}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEditTarget(null);
              setFormError(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}
      </GlassModal>

      {/* CSV Import modal */}
      <GlassModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Employees via CSV"
        className="max-w-xl"
      >
        <CsvImport
          onImport={importCsv}
          onClose={() => setIsImportOpen(false)}
        />
      </GlassModal>

      {/* Deactivate confirmation */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Employee"
        message={`Deactivate "${deactivateTarget?.name}"? They will no longer be able to log in or submit requests.`}
        confirmLabel="Deactivate"
        isLoading={isDeactivating}
      />
    </div>
  );
}
