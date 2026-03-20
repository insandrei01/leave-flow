"use client";

/**
 * useTeams — CRUD hook for team management.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export interface Team {
  readonly id: string;
  readonly name: string;
  readonly managerId: string;
  readonly managerName: string;
  readonly workflowId: string;
  readonly workflowName: string;
  readonly memberCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateTeamInput {
  readonly name: string;
  readonly managerId: string;
  readonly workflowId: string;
}

export type UpdateTeamInput = Partial<CreateTeamInput>;

/* =========================================================================
   Hook
   ========================================================================= */

interface UseTeamsReturn {
  readonly teams: readonly Team[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly create: (input: CreateTeamInput) => Promise<void>;
  readonly update: (id: string, input: UpdateTeamInput) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
  readonly refresh: () => void;
}

export function useTeams(): UseTeamsReturn {
  const [teams, setTeams] = useState<readonly Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<Team[]>("/api/teams");
      if (result.success && result.data) {
        setTeams(result.data);
      } else {
        setError(result.error ?? "Failed to load teams");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  const create = useCallback(
    async (input: CreateTeamInput) => {
      const result = await apiClient.post<Team>("/api/teams", input);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to create team");
      }
      await fetchTeams();
    },
    [fetchTeams]
  );

  const update = useCallback(
    async (id: string, input: UpdateTeamInput) => {
      const result = await apiClient.patch<Team>(`/api/teams/${id}`, input);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update team");
      }
      setTeams((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...result.data } : t))
      );
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    const result = await apiClient.delete<void>(`/api/teams/${id}`);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to delete team");
    }
    setTeams((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { teams, isLoading, error, create, update, remove, refresh: fetchTeams };
}
