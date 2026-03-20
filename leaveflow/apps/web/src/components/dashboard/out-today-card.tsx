"use client";

/**
 * OutTodayCard — shows count + avatar stack of employees currently out.
 */

import type { OutTodayData } from "@/hooks/use-dashboard";

const MAX_AVATARS = 5;

interface OutTodayCardProps {
  readonly data: OutTodayData;
}

export function OutTodayCard({ data }: OutTodayCardProps): React.ReactElement {
  const visibleAvatars = data.employees.slice(0, MAX_AVATARS);
  const overflow = data.employees.length - MAX_AVATARS;

  return (
    <div className="glass-card flex flex-col gap-4 p-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            Out today
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-text-primary">
            {data.count}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-amber/15">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-5 w-5 text-accent-amber"
            aria-hidden="true"
          >
            <path
              d="M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 14s-5 0-5-2 5-4 5-4 5 2 5 4-5 2-5 2zM17 14s-2 0-2-1 2-2.5 2-2.5S19 12 19 13s-2 1-2 1z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Avatar stack */}
      {data.employees.length > 0 ? (
        <div className="flex items-center gap-2">
          <div
            className="flex"
            role="list"
            aria-label="Employees out today"
          >
            {visibleAvatars.map((emp, i) => (
              <div
                key={emp.id}
                role="listitem"
                title={emp.name}
                aria-label={emp.name}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-primary font-mono text-xs font-semibold"
                style={{
                  marginLeft: i === 0 ? 0 : -8,
                  backgroundColor: `${emp.color}30`,
                  color: emp.color,
                  zIndex: visibleAvatars.length - i,
                  position: "relative",
                }}
              >
                {emp.initials}
              </div>
            ))}
            {overflow > 0 && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-primary bg-white/10 font-mono text-xs font-semibold text-text-tertiary"
                style={{ marginLeft: -8, position: "relative", zIndex: 0 }}
                aria-label={`${overflow} more employees out`}
              >
                +{overflow}
              </div>
            )}
          </div>
          <span className="text-xs text-text-tertiary">
            {data.count === 1 ? "person" : "people"} away
          </span>
        </div>
      ) : (
        <p className="text-xs text-text-tertiary">Everyone is in today</p>
      )}
    </div>
  );
}
