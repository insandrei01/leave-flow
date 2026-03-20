"use client";

/**
 * Calendar OAuth connections page.
 *
 * Allows employees to connect/disconnect Google Calendar and Outlook Calendar
 * via OAuth 2.0 authorization flows.
 */

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface CalendarConnection {
  provider: "google_calendar" | "outlook_calendar";
  isActive: boolean;
  expiresAt: string;
}

interface CalendarStatus {
  connections: CalendarConnection[];
}

// ----------------------------------------------------------------
// API helpers
// ----------------------------------------------------------------

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "/api";

async function fetchCalendarStatus(): Promise<CalendarStatus> {
  const response = await fetch(`${API_BASE}/calendar-sync/status`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to load calendar connections");
  }
  const json = (await response.json()) as { data: CalendarStatus };
  return json.data;
}

async function disconnectCalendar(provider: string): Promise<void> {
  const response = await fetch(`${API_BASE}/calendar-sync/${provider}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to disconnect ${provider}`);
  }
}

// ----------------------------------------------------------------
// Calendar provider card
// ----------------------------------------------------------------

interface ProviderCardProps {
  readonly title: string;
  readonly description: string;
  readonly iconPath: React.ReactNode;
  readonly isConnected: boolean;
  readonly expiresAt?: string;
  readonly connectUrl: string;
  readonly onDisconnect: () => Promise<void>;
}

function ProviderCard({
  title,
  description,
  iconPath,
  isConnected,
  expiresAt,
  connectUrl,
  onDisconnect,
}: ProviderCardProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect() {
    setIsDisconnecting(true);
    setError(null);
    try {
      await onDisconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <div className="glass-card flex flex-col gap-4 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
          {iconPath}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold text-text-primary">
              {title}
            </h3>
            {isConnected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-emerald/20 px-2 py-0.5 text-xs font-medium text-accent-emerald">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
                Connected
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
          {isConnected && expiresAt && (
            <p className="mt-1 text-xs text-text-tertiary">
              Token expires{" "}
              {new Date(expiresAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <a
          href={connectUrl}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-all",
            isConnected
              ? "border border-white/10 text-text-secondary hover:bg-white/5 hover:text-text-primary"
              : "bg-accent-indigo/20 text-accent-indigo hover:bg-accent-indigo/30"
          )}
        >
          {isConnected ? "Reconnect" : "Connect"}
        </a>

        {isConnected && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="rounded-xl border border-accent-rose/20 px-4 py-2 text-sm font-medium text-accent-rose transition-all hover:bg-accent-rose/10 disabled:opacity-50"
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function CalendarSettingsPage() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCalendarStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Check for OAuth redirect params in URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const oauthError = params.get("error");

    if (connected !== null || oauthError !== null) {
      // Clean up URL params after reading
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());

      if (connected !== null) {
        void loadStatus();
      }
      if (oauthError !== null) {
        setError(`Calendar connection failed: ${oauthError}`);
      }
    }
  }, [loadStatus]);

  function isProviderConnected(provider: string): boolean {
    return status?.connections.some((c) => c.provider === provider) ?? false;
  }

  function getProviderExpiry(provider: string): string | undefined {
    return status?.connections.find((c) => c.provider === provider)?.expiresAt;
  }

  async function handleDisconnect(provider: string): Promise<void> {
    await disconnectCalendar(provider);
    await loadStatus();
  }

  const connectBaseUrl = `${API_BASE}/calendar-sync`;

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <PageHeader
        title="Calendar Sync"
        subtitle="Connect your calendar to automatically block time off when leave is approved."
      />

      {error && (
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="shimmer h-40 rounded-2xl" />
          <div className="shimmer h-40 rounded-2xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ProviderCard
            title="Google Calendar"
            description="Automatically create out-of-office events in your Google Calendar when leave is approved."
            iconPath={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className="text-text-secondary"
              >
                <path
                  fill="currentColor"
                  d="M19.5 3h-3V1.5H15V3H9V1.5H7.5V3h-3A1.5 1.5 0 0 0 3 4.5v15A1.5 1.5 0 0 0 4.5 21h15a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 19.5 3zm0 16.5h-15V9h15v10.5zm0-12h-15V4.5h3V6H9V4.5h6V6h1.5V4.5h3v3z"
                />
              </svg>
            }
            isConnected={isProviderConnected("google_calendar")}
            expiresAt={getProviderExpiry("google_calendar")}
            connectUrl={`${connectBaseUrl}/google/connect`}
            onDisconnect={() => handleDisconnect("google_calendar")}
          />

          <ProviderCard
            title="Outlook Calendar"
            description="Automatically create out-of-office events in your Outlook Calendar when leave is approved."
            iconPath={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className="text-text-secondary"
              >
                <path
                  fill="currentColor"
                  d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                />
              </svg>
            }
            isConnected={isProviderConnected("outlook_calendar")}
            expiresAt={getProviderExpiry("outlook_calendar")}
            connectUrl={`${connectBaseUrl}/outlook/connect`}
            onDisconnect={() => handleDisconnect("outlook_calendar")}
          />
        </div>
      )}

      <section className="glass-card p-6">
        <h2 className="mb-2 font-display text-base font-semibold text-text-primary">
          How it works
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-text-secondary">
          <li>1. Connect your calendar using the buttons above.</li>
          <li>
            2. When a leave request is approved, an event is automatically
            created in your connected calendar(s).
          </li>
          <li>
            3. If a leave request is cancelled, the calendar event is removed.
          </li>
          <li>
            4. You can disconnect at any time without affecting existing
            leave requests.
          </li>
        </ul>
      </section>
    </div>
  );
}
