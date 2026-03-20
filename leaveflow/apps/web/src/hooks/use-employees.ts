"use client";

/**
 * useEmployees — CRUD hook for employee management.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export type EmployeeRole = "admin" | "manager" | "employee";
export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: EmployeeRole;
  readonly teamId: string | null;
  readonly teamName: string | null;
  readonly status: EmployeeStatus;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateEmployeeInput {
  readonly name: string;
  readonly email: string;
  readonly role: EmployeeRole;
  readonly teamId: string | null;
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export interface EmployeeFilters {
  readonly teamId?: string;
  readonly role?: EmployeeRole;
  readonly status?: EmployeeStatus;
  readonly search?: string;
}

export interface CsvImportResult {
  readonly successCount: number;
  readonly errors: readonly string[];
}

/* =========================================================================
   Hook
   ========================================================================= */

interface UseEmployeesReturn {
  readonly employees: readonly Employee[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly filters: EmployeeFilters;
  readonly setFilters: (filters: EmployeeFilters) => void;
  readonly create: (input: CreateEmployeeInput) => Promise<void>;
  readonly update: (id: string, input: UpdateEmployeeInput) => Promise<void>;
  readonly deactivate: (id: string) => Promise<void>;
  readonly importCsv: (file: File) => Promise<CsvImportResult>;
  readonly refresh: () => void;
}

export function useEmployees(): UseEmployeesReturn {
  const [employees, setEmployees] = useState<readonly Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EmployeeFilters>({});

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.teamId) params.set("teamId", filters.teamId);
      if (filters.role) params.set("role", filters.role);
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);

      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiClient.get<Employee[]>(`/api/employees${query}`);
      if (result.success && result.data) {
        setEmployees(result.data);
      } else {
        setError(result.error ?? "Failed to load employees");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  const create = useCallback(
    async (input: CreateEmployeeInput) => {
      const result = await apiClient.post<Employee>("/api/employees", input);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to create employee");
      }
      await fetchEmployees();
    },
    [fetchEmployees]
  );

  const update = useCallback(
    async (id: string, input: UpdateEmployeeInput) => {
      const result = await apiClient.patch<Employee>(
        `/api/employees/${id}`,
        input
      );
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update employee");
      }
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...result.data } : e))
      );
    },
    []
  );

  const deactivate = useCallback(async (id: string) => {
    const result = await apiClient.patch<Employee>(`/api/employees/${id}`, {
      status: "inactive" as EmployeeStatus,
    });
    if (!result.success) {
      throw new Error(result.error ?? "Failed to deactivate employee");
    }
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: "inactive" as EmployeeStatus } : e
      )
    );
  }, []);

  const importCsv = useCallback(async (file: File): Promise<CsvImportResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001"}/api/employees/import`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`CSV import failed with status ${response.status}`);
    }

    const json = (await response.json()) as {
      data: CsvImportResult;
    };
    await fetchEmployees();
    return json.data;
  }, [fetchEmployees]);

  return {
    employees,
    isLoading,
    error,
    filters,
    setFilters,
    create,
    update,
    deactivate,
    importCsv,
    refresh: fetchEmployees,
  };
}
