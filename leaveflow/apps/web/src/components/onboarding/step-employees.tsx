"use client";

/**
 * StepEmployees — Step 5 (skippable): Add employees manually or via CSV upload.
 *
 * Features:
 * - Drag-and-drop CSV upload zone
 * - Upload progress bar
 * - Import error report
 * - Manual add form
 */

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { OnboardingData, EmployeeEntry } from "@/hooks/use-onboarding";

/* =========================================================================
   Types
   ========================================================================= */

interface StepEmployeesProps {
  readonly data: OnboardingData;
  readonly onChange: (patch: Partial<OnboardingData>) => void;
}

interface CsvError {
  readonly row: number;
  readonly field: string;
  readonly message: string;
}

interface ImportState {
  readonly status: "idle" | "parsing" | "done" | "error";
  readonly progress: number;
  readonly fileName: string;
  readonly errors: readonly CsvError[];
  readonly importedCount: number;
}

/* =========================================================================
   CSV parsing
   ========================================================================= */

interface CsvRow {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly teamId: string;
}

function parseCsvText(text: string): {
  rows: CsvRow[];
  errors: CsvError[];
} {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, field: "file", message: "CSV must have at least a header row and one data row." }] };
  }

  const [headerLine, ...dataLines] = lines;
  const headers = (headerLine ?? "").split(",").map((h) => h.trim().toLowerCase());

  const requiredHeaders = ["firstname", "lastname", "email"];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          field: "header",
          message: `Missing columns: ${missingHeaders.join(", ")}. Required: firstName, lastName, email`,
        },
      ],
    };
  }

  const rows: CsvRow[] = [];
  const errors: CsvError[] = [];

  dataLines.forEach((line, idx) => {
    const rowNum = idx + 2;
    const values = line.split(",").map((v) => v.trim());

    const firstName = values[headers.indexOf("firstname")] ?? "";
    const lastName = values[headers.indexOf("lastname")] ?? "";
    const email = values[headers.indexOf("email")] ?? "";
    const teamId = values[headers.indexOf("teamid")] ?? "";

    if (!firstName) {
      errors.push({ row: rowNum, field: "firstName", message: "First name is required." });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, field: "email", message: "Valid email address is required." });
    }

    if (firstName && email) {
      rows.push({ firstName, lastName, email, teamId });
    }
  });

  return { rows, errors };
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* =========================================================================
   Sub-components
   ========================================================================= */

function DropZone({
  onFileSelected,
  isDragOver,
  onDragOver,
  onDragLeave,
}: {
  readonly onFileSelected: (file: File) => void;
  readonly isDragOver: boolean;
  readonly onDragOver: () => void;
  readonly onDragLeave: () => void;
}): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-10 transition-all duration-400",
        isDragOver
          ? "border-accent-indigo/60 bg-accent-indigo/5"
          : "border-white/15 bg-white/2 hover:border-white/25"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDragLeave();
        const file = e.dataTransfer.files[0];
        if (file) onFileSelected(file);
      }}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-400",
          isDragOver ? "bg-accent-indigo/20" : "bg-white/5"
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={cn(
            "h-6 w-6 transition-colors duration-400",
            isDragOver ? "text-accent-indigo" : "text-text-tertiary"
          )}
        >
          <path
            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-text-secondary">
          {isDragOver ? "Drop CSV here" : "Drag & drop a CSV file"}
        </p>
        <p className="mt-0.5 font-mono text-xs text-text-tertiary">
          Required columns: firstName, lastName, email
        </p>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-text-secondary transition-all duration-400 hover:border-accent-indigo/40 hover:text-accent-indigo"
      >
        Browse file
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="Upload CSV file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
    </div>
  );
}

function ImportProgress({
  state,
}: {
  readonly state: ImportState;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">
          {state.fileName}
        </span>
        <span
          className={cn(
            "font-mono text-xs",
            state.status === "done" && state.errors.length === 0
              ? "text-accent-emerald"
              : state.status === "error" || state.errors.length > 0
              ? "text-accent-rose"
              : "text-text-tertiary"
          )}
        >
          {state.status === "parsing" && `${state.progress}%`}
          {state.status === "done" && state.errors.length === 0 && `${state.importedCount} imported`}
          {state.status === "done" && state.errors.length > 0 && `${state.importedCount} imported, ${state.errors.length} errors`}
          {state.status === "error" && "Failed"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            state.errors.length > 0 ? "bg-accent-amber" : "bg-accent-emerald"
          )}
          style={{ width: `${state.progress}%` }}
          role="progressbar"
          aria-valuenow={state.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Import progress"
        />
      </div>
    </div>
  );
}

function ErrorReport({
  errors,
}: {
  readonly errors: readonly CsvError[];
}): React.ReactElement {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-accent-rose/20 bg-accent-rose/5 p-4"
      role="alert"
      aria-label="Import errors"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-accent-rose">
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 5v3M8 11h.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {errors.length} import {errors.length === 1 ? "error" : "errors"}
      </p>
      <ul className="flex flex-col gap-1">
        {errors.slice(0, 5).map((err, i) => (
          <li key={i} className="font-mono text-[11px] text-text-secondary">
            {err.row > 0 ? `Row ${err.row}: ` : ""}
            <span className="text-text-tertiary">[{err.field}]</span> {err.message}
          </li>
        ))}
        {errors.length > 5 && (
          <li className="font-mono text-[11px] text-text-tertiary">
            + {errors.length - 5} more errors
          </li>
        )}
      </ul>
    </div>
  );
}

/* =========================================================================
   Main component
   ========================================================================= */

export function StepEmployees({
  data,
  onChange,
}: StepEmployeesProps): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);
  const [importState, setImportState] = useState<ImportState>({
    status: "idle",
    progress: 0,
    fileName: "",
    errors: [],
    importedCount: 0,
  });

  const [manualForm, setManualForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleFileSelected = useCallback(
    async (file: File): Promise<void> => {
      if (!file.name.endsWith(".csv")) {
        setImportState({
          status: "error",
          progress: 0,
          fileName: file.name,
          errors: [{ row: 0, field: "file", message: "Only CSV files are supported." }],
          importedCount: 0,
        });
        return;
      }

      setImportState({
        status: "parsing",
        progress: 10,
        fileName: file.name,
        errors: [],
        importedCount: 0,
      });

      try {
        const text = await file.text();
        setImportState((prev) => ({ ...prev, progress: 50 }));

        const { rows, errors } = parseCsvText(text);

        const newEmployees: EmployeeEntry[] = rows.map((r) => ({
          id: generateId(),
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          teamId: r.teamId || null,
        }));

        // Merge, de-dup by email
        const existingEmails = new Set(data.employees.map((e) => e.email));
        const uniqueNew = newEmployees.filter(
          (e) => !existingEmails.has(e.email)
        );
        onChange({ employees: [...data.employees, ...uniqueNew] });

        setImportState({
          status: "done",
          progress: 100,
          fileName: file.name,
          errors,
          importedCount: uniqueNew.length,
        });
      } catch {
        setImportState({
          status: "error",
          progress: 0,
          fileName: file.name,
          errors: [{ row: 0, field: "file", message: "Failed to parse CSV file." }],
          importedCount: 0,
        });
      }
    },
    [data.employees, onChange]
  );

  function handleAddManual(): void {
    if (!manualForm.firstName.trim() || !manualForm.email.trim()) {
      setFormError("First name and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualForm.email)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    const duplicate = data.employees.find(
      (e) => e.email === manualForm.email.trim()
    );
    if (duplicate) {
      setFormError("An employee with this email already exists.");
      return;
    }

    const newEmployee: EmployeeEntry = {
      id: generateId(),
      firstName: manualForm.firstName.trim(),
      lastName: manualForm.lastName.trim(),
      email: manualForm.email.trim(),
      teamId: null,
    };
    onChange({ employees: [...data.employees, newEmployee] });
    setManualForm({ firstName: "", lastName: "", email: "" });
    setFormError(null);
  }

  function removeEmployee(id: string): void {
    onChange({ employees: data.employees.filter((e) => e.id !== id) });
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          Add employees
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Add employees manually or import from a CSV. You can skip this and
          invite employees via email later.
        </p>
      </div>

      {/* Upload zone */}
      <DropZone
        onFileSelected={(f) => void handleFileSelected(f)}
        isDragOver={isDragOver}
        onDragOver={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
      />

      {/* Import progress */}
      {importState.status !== "idle" && (
        <ImportProgress state={importState} />
      )}

      {/* Errors */}
      {importState.errors.length > 0 && (
        <ErrorReport errors={importState.errors} />
      )}

      {/* Manual add */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/3 p-4">
        <p className="font-mono text-xs uppercase tracking-wider text-text-secondary">
          Add manually
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualForm.firstName}
            onChange={(e) =>
              setManualForm((prev) => ({ ...prev, firstName: e.target.value }))
            }
            placeholder="First name"
            aria-label="First name"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-indigo/60 focus:outline-none"
          />
          <input
            type="text"
            value={manualForm.lastName}
            onChange={(e) =>
              setManualForm((prev) => ({ ...prev, lastName: e.target.value }))
            }
            placeholder="Last name"
            aria-label="Last name"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-indigo/60 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={manualForm.email}
            onChange={(e) =>
              setManualForm((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="Email address"
            aria-label="Email address"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-indigo/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddManual}
            className="rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-semibold text-accent-indigo transition-all duration-400 hover:bg-accent-indigo/30"
          >
            Add
          </button>
        </div>
        {formError && (
          <p className="text-xs text-accent-rose" role="alert">
            {formError}
          </p>
        )}
      </div>

      {/* Employee list */}
      {data.employees.length > 0 && (
        <div className="flex flex-col gap-1" role="list" aria-label="Employees">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
              {data.employees.length}{" "}
              {data.employees.length === 1 ? "employee" : "employees"} added
            </span>
          </div>
          {data.employees.map((emp) => (
            <div
              key={emp.id}
              role="listitem"
              className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 px-3 py-2.5"
            >
              {/* Avatar initials */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-indigo/20 font-mono text-xs font-semibold text-accent-indigo"
                aria-hidden="true"
              >
                {(emp.firstName[0] ?? "?").toUpperCase()}
                {(emp.lastName[0] ?? "").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="truncate font-mono text-[11px] text-text-tertiary">
                  {emp.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeEmployee(emp.id)}
                aria-label={`Remove ${emp.firstName} ${emp.lastName}`}
                className="shrink-0 rounded-lg p-1.5 text-text-tertiary transition-colors duration-400 hover:bg-accent-rose/10 hover:text-accent-rose"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                  <path
                    d="M4 8h8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
