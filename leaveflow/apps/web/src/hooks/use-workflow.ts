"use client";

/**
 * Workflow hooks — fetch and CRUD operations for approval workflows.
 *
 * All mutations return new data objects (immutable pattern).
 * Error handling is explicit at every call site.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export interface WorkflowStepSummary {
  readonly approverType: string;
  readonly approverLabel: string;
  readonly timeoutHours: number;
  readonly timeoutAction: string;
  readonly allowDelegation: boolean;
}

export interface WorkflowSummary {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly stepCount: number;
  readonly teamsAssigned: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkflowDetail extends WorkflowSummary {
  readonly steps: readonly WorkflowStepSummary[];
}

export interface CreateWorkflowPayload {
  readonly name: string;
  readonly steps: readonly WorkflowStepSummary[];
}

export interface UpdateWorkflowPayload {
  readonly name?: string;
  readonly steps?: readonly WorkflowStepSummary[];
}

/* =========================================================================
   useWorkflows — list all workflows
   ========================================================================= */

export interface UseWorkflowsResult {
  readonly workflows: readonly WorkflowSummary[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

export function useWorkflows(): UseWorkflowsResult {
  const [workflows, setWorkflows] = useState<readonly WorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchWorkflows(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<readonly WorkflowSummary[]>(
          "/workflows"
        );

        if (cancelled) return;

        if (result.success) {
          setWorkflows(result.data);
        } else {
          setError(result.error ?? "Failed to load workflows");
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Unexpected error loading workflows";
        setError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchWorkflows();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { workflows, isLoading, error, refetch };
}

/* =========================================================================
   useWorkflow — single workflow detail
   ========================================================================= */

export interface UseWorkflowResult {
  readonly workflow: WorkflowDetail | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

export function useWorkflow(id: string): UseWorkflowResult {
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchWorkflow(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<WorkflowDetail>(`/workflows/${id}`);

        if (cancelled) return;

        if (result.success) {
          setWorkflow(result.data);
        } else {
          setError(result.error ?? "Failed to load workflow");
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Unexpected error loading workflow";
        setError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchWorkflow();
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { workflow, isLoading, error, refetch };
}

/* =========================================================================
   useCreateWorkflow
   ========================================================================= */

export interface UseCreateWorkflowResult {
  readonly create: (payload: CreateWorkflowPayload) => Promise<WorkflowDetail | null>;
  readonly isCreating: boolean;
  readonly error: string | null;
}

export function useCreateWorkflow(): UseCreateWorkflowResult {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (payload: CreateWorkflowPayload): Promise<WorkflowDetail | null> => {
      setIsCreating(true);
      setError(null);

      try {
        const result = await apiClient.post<WorkflowDetail>(
          "/workflows",
          payload
        );

        if (result.success) {
          return result.data;
        }

        setError(result.error ?? "Failed to create workflow");
        return null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error creating workflow";
        setError(message);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { create, isCreating, error };
}

/* =========================================================================
   useUpdateWorkflow
   ========================================================================= */

export interface UseUpdateWorkflowResult {
  readonly update: (
    id: string,
    payload: UpdateWorkflowPayload
  ) => Promise<WorkflowDetail | null>;
  readonly isUpdating: boolean;
  readonly error: string | null;
}

export function useUpdateWorkflow(): UseUpdateWorkflowResult {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (
      id: string,
      payload: UpdateWorkflowPayload
    ): Promise<WorkflowDetail | null> => {
      setIsUpdating(true);
      setError(null);

      try {
        const result = await apiClient.put<WorkflowDetail>(
          `/workflows/${id}`,
          payload
        );

        if (result.success) {
          return result.data;
        }

        setError(result.error ?? "Failed to update workflow");
        return null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error updating workflow";
        setError(message);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return { update, isUpdating, error };
}

/* =========================================================================
   useDeleteWorkflow
   ========================================================================= */

export interface UseDeleteWorkflowResult {
  readonly remove: (id: string) => Promise<boolean>;
  readonly isDeleting: boolean;
  readonly error: string | null;
}

export function useDeleteWorkflow(): UseDeleteWorkflowResult {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = await apiClient.delete(`/workflows/${id}`);

      if (result.success) {
        return true;
      }

      setError(result.error ?? "Failed to delete workflow");
      return false;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error deleting workflow";
      setError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { remove, isDeleting, error };
}
