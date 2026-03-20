"use client";

/**
 * useAudit — hook for fetching audit trail entries.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient, type PaginationMeta } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export type AuditAction =
  | "created"
  | "approved"
  | "rejected"
  | "updated"
  | "deleted"
  | "cancelled";

export type AuditEntityType =
  | "leave_request"
  | "employee"
  | "workflow"
  | "team"
  | "leave_type";

export interface AuditEntry {
  readonly id: string;
  readonly action: AuditAction;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
  readonly entityLabel: string;
  readonly actorId: string;
  readonly actorName: string;
  readonly details: Record<string, unknown>;
  readonly createdAt: string;
}

export interface AuditFilters {
  readonly entityType?: AuditEntityType;
  readonly actorId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

/* =========================================================================
   Hook
   ========================================================================= */

interface UseAuditReturn {
  readonly entries: readonly AuditEntry[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly meta: PaginationMeta | null;
  readonly filters: AuditFilters;
  readonly setFilters: (filters: AuditFilters) => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly refresh: () => void;
}

const PAGE_SIZE = 25;

export function useAudit(): UseAuditReturn {
  const [entries, setEntries] = useState<readonly AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [page, setPage] = useState(1);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.actorId) params.set("actorId", filters.actorId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const result = await apiClient.get<AuditEntry[]>(
        `/api/audit?${params.toString()}`
      );
      if (result.success && result.data) {
        setEntries(result.data);
        setMeta(result.meta ?? null);
      } else {
        setError(result.error ?? "Failed to load audit trail");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit trail");
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const handleSetFilters = useCallback((newFilters: AuditFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  return {
    entries,
    isLoading,
    error,
    meta,
    filters,
    setFilters: handleSetFilters,
    page,
    setPage,
    refresh: fetchEntries,
  };
}
