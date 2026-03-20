"use client";

/**
 * StepTeams — Step 4 (skippable): Create teams with name and manager assignment.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OnboardingData, TeamEntry } from "@/hooks/use-onboarding";

/* =========================================================================
   Types
   ========================================================================= */

interface StepTeamsProps {
  readonly data: OnboardingData;
  readonly onChange: (patch: Partial<OnboardingData>) => void;
}

/* =========================================================================
   Team row
   ========================================================================= */

function TeamRow({
  team,
  onChangeName,
  onChangeManager,
  onDelete,
}: {
  readonly team: TeamEntry;
  readonly onChangeName: (name: string) => void;
  readonly onChangeManager: (managerId: string) => void;
  readonly onDelete: () => void;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-3">
      {/* Team color dot */}
      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-indigo/60" aria-hidden="true" />

      {/* Name */}
      <input
        type="text"
        value={team.name}
        onChange={(e) => onChangeName(e.target.value)}
        placeholder="Team name"
        aria-label="Team name"
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-indigo/60 focus:outline-none"
      />

      {/* Manager email / id */}
      <input
        type="text"
        value={team.managerId ?? ""}
        onChange={(e) => onChangeManager(e.target.value)}
        placeholder="Manager email"
        aria-label="Manager email or ID"
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-indigo/60 focus:outline-none"
      />

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove team ${team.name || "unnamed"}`}
        className="shrink-0 rounded-lg p-2 text-text-tertiary transition-colors duration-400 hover:bg-accent-rose/10 hover:text-accent-rose"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="M4 8h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

/* =========================================================================
   Main component
   ========================================================================= */

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function StepTeams({
  data,
  onChange,
}: StepTeamsProps): React.ReactElement {
  const [error, setError] = useState<string | null>(null);

  function addTeam(): void {
    const newTeam: TeamEntry = {
      id: generateId(),
      name: "",
      managerId: null,
    };
    onChange({ teams: [...data.teams, newTeam] });
    setError(null);
  }

  function updateTeam(id: string, patch: Partial<TeamEntry>): void {
    const updated = data.teams.map((t) =>
      t.id === id ? { ...t, ...patch } : t
    );
    onChange({ teams: updated });
    setError(null);
  }

  function removeTeam(id: string): void {
    onChange({ teams: data.teams.filter((t) => t.id !== id) });
  }

  const hasDuplicateNames =
    data.teams.length > 0 &&
    new Set(data.teams.map((t) => t.name.trim().toLowerCase())).size !==
      data.teams.length;

  if (hasDuplicateNames && !error) {
    setError("Team names must be unique.");
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          Create teams
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Organize employees into teams. You can skip this and add teams later
          from settings.
        </p>
      </div>

      {/* Column headers */}
      {data.teams.length > 0 && (
        <div className="flex items-center gap-3 px-3">
          <div className="w-2.5" aria-hidden="true" />
          <span className="flex-1 font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
            Team name
          </span>
          <span className="flex-1 font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
            Manager
          </span>
          <div className="w-8" aria-hidden="true" />
        </div>
      )}

      {/* Team list */}
      <div
        role="list"
        aria-label="Teams"
        className={cn("flex flex-col gap-2", data.teams.length === 0 && "hidden")}
      >
        {data.teams.map((team) => (
          <TeamRow
            key={team.id}
            team={team}
            onChangeName={(name) => updateTeam(team.id, { name })}
            onChangeManager={(managerId) =>
              updateTeam(team.id, { managerId: managerId || null })
            }
            onDelete={() => removeTeam(team.id)}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-accent-rose" role="alert">
          {error}
        </p>
      )}

      {/* Empty state */}
      {data.teams.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6 text-text-tertiary"
              aria-hidden="true"
            >
              <path
                d="M17 20h5v-1a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-1a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm text-text-tertiary">No teams yet</p>
        </div>
      )}

      {/* Add team button */}
      <button
        type="button"
        onClick={addTeam}
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
        Add team
      </button>
    </div>
  );
}
