"use client";

/**
 * API client — fetch wrapper with Firebase auth token injection.
 *
 * All requests include the Firebase ID token in the Authorization header.
 * Responses are expected to conform to the standard API envelope:
 *
 *   { success: true,  data: T,    error: null,   meta?: PaginationMeta }
 *   { success: false, data: null, error: string, meta?: undefined       }
 */

import { getAuthToken } from "./firebase.js";

/* =========================================================================
   Types
   ========================================================================= */

export interface PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
  readonly meta?: PaginationMeta;
}

/**
 * Represents a successful API response with guaranteed non-null data.
 */
export interface ApiSuccess<T> extends ApiEnvelope<T> {
  readonly success: true;
  readonly data: T;
  readonly error: null;
}

/**
 * Represents a failed API response.
 */
export interface ApiError extends ApiEnvelope<never> {
  readonly success: false;
  readonly data: null;
  readonly error: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

/* =========================================================================
   Configuration
   ========================================================================= */

const API_BASE_URL =
  process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

/* =========================================================================
   Custom error class
   ========================================================================= */

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/* =========================================================================
   Core fetch wrapper
   ========================================================================= */

export interface RequestOptions extends Omit<RequestInit, "body"> {
  readonly body?: unknown;
  /** Skip auth token injection (for public endpoints). */
  readonly skipAuth?: boolean;
}

/**
 * Make an authenticated HTTP request to the LeaveFlow API.
 *
 * - Injects a fresh Firebase ID token into every request (unless skipAuth).
 * - Parses the standard API envelope.
 * - Throws ApiRequestError on network failure or non-2xx status.
 * - Never mutates the options argument.
 */
async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const { body, skipAuth = false, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  if (!skipAuth) {
    const token = await getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const url = `${API_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    throw new ApiRequestError(
      `Network error: failed to reach ${url}`,
      0,
      cause
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiRequestError(
      `Invalid JSON response from ${url}`,
      response.status
    );
  }

  if (!response.ok) {
    const errorMessage =
      isApiEnvelope(json) && typeof json.error === "string"
        ? json.error
        : `Request failed with status ${response.status}`;

    throw new ApiRequestError(errorMessage, response.status, json);
  }

  if (!isApiEnvelope(json)) {
    throw new ApiRequestError(
      `Unexpected response shape from ${url}`,
      response.status,
      json
    );
  }

  return json as ApiResult<T>;
}

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as Record<string, unknown>)["success"] === "boolean"
  );
}

/* =========================================================================
   HTTP method helpers
   ========================================================================= */

export const apiClient = {
  get<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<ApiResult<T>> {
    return request<T>(path, { ...options, method: "GET" });
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResult<T>> {
    return request<T>(path, { ...options, method: "POST", body });
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResult<T>> {
    return request<T>(path, { ...options, method: "PUT", body });
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResult<T>> {
    return request<T>(path, { ...options, method: "PATCH", body });
  },

  delete<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> {
    return request<T>(path, { ...options, method: "DELETE" });
  },
} as const;
