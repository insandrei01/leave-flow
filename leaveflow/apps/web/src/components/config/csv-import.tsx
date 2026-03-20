"use client";

/**
 * CsvImport — drag-and-drop CSV import zone with progress and result summary.
 */

import { useState, useRef, useCallback } from "react";
import { type CsvImportResult } from "@/hooks/use-employees";
import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

type ImportState =
  | { phase: "idle" }
  | { phase: "dragging" }
  | { phase: "uploading"; progress: number }
  | { phase: "done"; result: CsvImportResult }
  | { phase: "error"; message: string };

interface CsvImportProps {
  readonly onImport: (file: File) => Promise<CsvImportResult>;
  readonly onClose: () => void;
}

/* =========================================================================
   Component
   ========================================================================= */

export function CsvImport({ onImport, onClose }: CsvImportProps) {
  const [state, setState] = useState<ImportState>({ phase: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setState({ phase: "error", message: "Only .csv files are supported." });
      return;
    }

    setState({ phase: "uploading", progress: 30 });

    // Simulate progress while the upload runs
    const timer = setInterval(() => {
      setState((prev) => {
        if (prev.phase !== "uploading") {
          clearInterval(timer);
          return prev;
        }
        const next = Math.min(prev.progress + 20, 90);
        return { phase: "uploading", progress: next };
      });
    }, 400);

    try {
      const result = await onImport(file);
      clearInterval(timer);
      setState({ phase: "done", result });
    } catch (err) {
      clearInterval(timer);
      const message =
        err instanceof Error ? err.message : "Import failed. Please try again.";
      setState({ phase: "error", message });
    }
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setState({ phase: "idle" });
      const file = e.dataTransfer.files[0];
      if (file) await processFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      {(state.phase === "idle" || state.phase === "dragging") && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setState({ phase: "dragging" });
          }}
          onDragLeave={() => setState({ phase: "idle" })}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors",
            state.phase === "dragging"
              ? "border-accent-indigo/60 bg-accent-indigo/5"
              : "border-white/10 hover:border-white/20 hover:bg-white/5"
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-tertiary"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div className="text-center">
            <p className="text-sm text-text-secondary">
              Drop a CSV file here, or{" "}
              <span className="text-accent-indigo">browse</span>
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Columns: name, email, role, team
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Upload CSV file"
          />
        </div>
      )}

      {/* Progress bar */}
      {state.phase === "uploading" && (
        <div className="flex flex-col gap-2 py-4">
          <p className="text-sm text-text-secondary">Importing employees...</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent-indigo transition-all duration-500 ease-spring"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="text-xs text-text-tertiary">{state.progress}%</p>
        </div>
      )}

      {/* Result summary */}
      {state.phase === "done" && (
        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-center gap-2 rounded-xl border border-accent-emerald/20 bg-accent-emerald/10 px-4 py-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent-emerald"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-sm text-accent-emerald">
              {state.result.successCount} employee
              {state.result.successCount !== 1 ? "s" : ""} imported successfully
            </p>
          </div>

          {state.result.errors.length > 0 && (
            <div className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3">
              <p className="mb-2 text-sm font-medium text-accent-rose">
                {state.result.errors.length} row
                {state.result.errors.length !== 1 ? "s" : ""} had errors:
              </p>
              <ul className="space-y-1">
                {state.result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-accent-rose/80">
                    • {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {state.phase === "error" && (
        <div className="flex items-center gap-2 rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent-rose"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-sm text-accent-rose">{state.message}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-2">
        {(state.phase === "done" || state.phase === "error") && (
          <button
            type="button"
            onClick={() => setState({ phase: "idle" })}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
          >
            Import another file
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-white/5 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
        >
          Close
        </button>
      </div>
    </div>
  );
}
