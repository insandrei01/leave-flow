"use client";

/**
 * StepLeaveTypes — Step 2: Configure leave types.
 *
 * Add/edit leave types with name, color, paid flag, and entitlement days.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OnboardingData, LeaveTypeEntry } from "@/hooks/use-onboarding";

/* =========================================================================
   Constants
   ========================================================================= */

const PRESET_COLORS = [
  "#818CF8", // indigo
  "#A78BFA", // violet
  "#34D399", // emerald
  "#FBBF24", // amber
  "#FB7185", // rose
  "#22D3EE", // cyan
  "#F97316", // orange
  "#EC4899", // pink
] as const;

/* =========================================================================
   Types
   ========================================================================= */

interface StepLeaveTypesProps {
  readonly data: OnboardingData;
  readonly onChange: (patch: Partial<OnboardingData>) => void;
}

type EditMode = { id: string; draft: LeaveTypeEntry } | null;

/* =========================================================================
   Sub-components
   ========================================================================= */

function LeaveTypeCard({
  leaveType,
  onEdit,
  onDelete,
}: {
  readonly leaveType: LeaveTypeEntry;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}): React.ReactElement {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 transition-colors duration-400 hover:bg-white/5"
      role="listitem"
    >
      {/* Color swatch */}
      <div
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: leaveType.color }}
        aria-hidden="true"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-text-primary">
          {leaveType.name}
        </span>
        <span className="font-mono text-[11px] text-text-tertiary">
          {leaveType.entitlementDays} days/year &middot;{" "}
          {leaveType.paid ? "Paid" : "Unpaid"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${leaveType.name}`}
          className="rounded-lg p-1.5 text-text-tertiary transition-colors duration-400 hover:bg-white/5 hover:text-text-secondary"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M11.333 2.667a1.886 1.886 0 1 1 2.667 2.666L5.333 14H2.667v-2.667l8.666-8.666z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${leaveType.name}`}
          className="rounded-lg p-1.5 text-text-tertiary transition-colors duration-400 hover:bg-accent-rose/10 hover:text-accent-rose"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M2.667 4h10.666M6.667 7.333V11m2.666-3.667V11M3.333 4l.667 8.667c0 .736.597 1.333 1.333 1.333h5.334a1.333 1.333 0 0 0 1.333-1.333L12.667 4M6 4V2.667A.667.667 0 0 1 6.667 2h2.666A.667.667 0 0 1 10 2.667V4"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function LeaveTypeForm({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  readonly draft: LeaveTypeEntry;
  readonly onChange: (patch: Partial<LeaveTypeEntry>) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-accent-indigo/30 bg-accent-indigo/5 p-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="lt-name"
          className="font-mono text-xs uppercase tracking-wider text-text-secondary"
        >
          Name
        </label>
        <input
          id="lt-name"
          type="text"
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Parental Leave"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-indigo/60 focus:outline-none"
        />
      </div>

      <div className="flex gap-4">
        {/* Entitlement */}
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="lt-days"
            className="font-mono text-xs uppercase tracking-wider text-text-secondary"
          >
            Days / year
          </label>
          <input
            id="lt-days"
            type="number"
            min={0}
            max={365}
            value={draft.entitlementDays}
            onChange={(e) =>
              onChange({ entitlementDays: Math.max(0, Number(e.target.value)) })
            }
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-text-primary focus:border-accent-indigo/60 focus:outline-none"
          />
        </div>

        {/* Paid toggle */}
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">
            Paid
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.paid}
            onClick={() => onChange({ paid: !draft.paid })}
            className={cn(
              "relative h-10 w-16 rounded-xl border transition-all duration-400",
              draft.paid
                ? "border-accent-emerald/40 bg-accent-emerald/20"
                : "border-white/10 bg-white/5"
            )}
          >
            <span
              className={cn(
                "font-mono text-xs font-semibold transition-colors duration-400",
                draft.paid ? "text-accent-emerald" : "text-text-tertiary"
              )}
            >
              {draft.paid ? "Yes" : "No"}
            </span>
          </button>
        </div>
      </div>

      {/* Color picker */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">
          Color
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ color })}
              aria-label={`Select color ${color}`}
              aria-pressed={draft.color === color}
              className={cn(
                "h-7 w-7 rounded-full transition-all duration-400",
                draft.color === color
                  ? "ring-2 ring-white/60 ring-offset-2 ring-offset-surface-primary"
                  : "hover:scale-110"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm text-text-secondary transition-colors duration-400 hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!draft.name.trim()}
          className="rounded-xl bg-accent-indigo px-4 py-2 text-sm font-semibold text-white transition-all duration-400 hover:bg-[#6366F1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   Main component
   ========================================================================= */

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_NEW_TYPE: Omit<LeaveTypeEntry, "id"> = {
  name: "",
  color: "#818CF8",
  paid: true,
  entitlementDays: 14,
};

export function StepLeaveTypes({
  data,
  onChange,
}: StepLeaveTypesProps): React.ReactElement {
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newDraft, setNewDraft] = useState<LeaveTypeEntry>({
    id: generateId(),
    ...DEFAULT_NEW_TYPE,
  });

  function handleEdit(id: string): void {
    const type = data.leaveTypes.find((lt) => lt.id === id);
    if (!type) return;
    setEditMode({ id, draft: { ...type } });
    setAddingNew(false);
  }

  function handleSaveEdit(): void {
    if (!editMode) return;
    const updated = data.leaveTypes.map((lt) =>
      lt.id === editMode.id ? editMode.draft : lt
    );
    onChange({ leaveTypes: updated });
    setEditMode(null);
  }

  function handleDelete(id: string): void {
    onChange({ leaveTypes: data.leaveTypes.filter((lt) => lt.id !== id) });
    if (editMode?.id === id) setEditMode(null);
  }

  function handleSaveNew(): void {
    if (!newDraft.name.trim()) return;
    onChange({ leaveTypes: [...data.leaveTypes, newDraft] });
    setAddingNew(false);
    setNewDraft({ id: generateId(), ...DEFAULT_NEW_TYPE });
  }

  function handleCancelNew(): void {
    setAddingNew(false);
    setNewDraft({ id: generateId(), ...DEFAULT_NEW_TYPE });
  }

  function handleStartAdd(): void {
    setAddingNew(true);
    setEditMode(null);
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          Configure leave types
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Define the categories of leave available in your company. You can
          add more later.
        </p>
      </div>

      {/* Leave type list */}
      <div
        role="list"
        aria-label="Leave types"
        className="flex flex-col gap-2"
      >
        {data.leaveTypes.map((lt) =>
          editMode?.id === lt.id ? (
            <LeaveTypeForm
              key={lt.id}
              draft={editMode.draft}
              onChange={(patch) =>
                setEditMode((prev) =>
                  prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev
                )
              }
              onSave={handleSaveEdit}
              onCancel={() => setEditMode(null)}
            />
          ) : (
            <LeaveTypeCard
              key={lt.id}
              leaveType={lt}
              onEdit={() => handleEdit(lt.id)}
              onDelete={() => handleDelete(lt.id)}
            />
          )
        )}
      </div>

      {/* New type form / add button */}
      {addingNew ? (
        <LeaveTypeForm
          draft={newDraft}
          onChange={(patch) =>
            setNewDraft((prev) => ({ ...prev, ...patch }))
          }
          onSave={handleSaveNew}
          onCancel={handleCancelNew}
        />
      ) : (
        <button
          type="button"
          onClick={handleStartAdd}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-sm font-medium text-text-tertiary transition-all duration-400 hover:border-accent-indigo/40 hover:text-accent-indigo"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Add leave type
        </button>
      )}
    </div>
  );
}
