/**
 * Unit tests for pagination helpers.
 */

import { describe, it, expect } from "vitest";
import {
  parsePagination,
  buildPaginatedResponse,
  buildSuccessResponse,
} from "./pagination.js";

describe("parsePagination", () => {
  it("returns defaults when no query params are provided", () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBeUndefined();
    expect(result.sortOrder).toBe("desc");
  });

  it("parses valid page and limit", () => {
    const result = parsePagination({ page: "3", limit: "50" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it("parses sortBy and sortOrder", () => {
    const result = parsePagination({ sortBy: "name", sortOrder: "asc" });
    expect(result.sortBy).toBe("name");
    expect(result.sortOrder).toBe("asc");
  });

  it("falls back to defaults when page is invalid", () => {
    const result = parsePagination({ page: "0", limit: "20" });
    // page 0 is below min(1), falls back
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("falls back to defaults when limit exceeds maximum", () => {
    const result = parsePagination({ page: "1", limit: "200" });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("falls back to defaults when values are non-numeric strings", () => {
    const result = parsePagination({ page: "abc", limit: "xyz" });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("ignores array values for page and limit (uses default)", () => {
    const result = parsePagination({
      page: ["1", "2"],
      limit: ["10", "20"],
    });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});

describe("buildPaginatedResponse", () => {
  it("builds correct meta for first page", () => {
    const data = ["a", "b", "c"];
    const response = buildPaginatedResponse(data, 50, {
      page: 1,
      limit: 20,
      sortBy: undefined,
      sortOrder: "desc",
    });

    expect(response.success).toBe(true);
    expect(response.data).toEqual(["a", "b", "c"]);
    expect(response.error).toBeNull();
    expect(response.meta.total).toBe(50);
    expect(response.meta.page).toBe(1);
    expect(response.meta.limit).toBe(20);
    expect(response.meta.totalPages).toBe(3);
    expect(response.meta.hasNextPage).toBe(true);
    expect(response.meta.hasPrevPage).toBe(false);
  });

  it("builds correct meta for last page", () => {
    const response = buildPaginatedResponse(["x"], 41, {
      page: 3,
      limit: 20,
      sortBy: undefined,
      sortOrder: "asc",
    });

    expect(response.meta.totalPages).toBe(3);
    expect(response.meta.hasNextPage).toBe(false);
    expect(response.meta.hasPrevPage).toBe(true);
  });

  it("handles empty dataset", () => {
    const response = buildPaginatedResponse([], 0, {
      page: 1,
      limit: 20,
      sortBy: undefined,
      sortOrder: "desc",
    });

    expect(response.meta.total).toBe(0);
    expect(response.meta.totalPages).toBe(1);
    expect(response.meta.hasNextPage).toBe(false);
    expect(response.meta.hasPrevPage).toBe(false);
  });

  it("returns an immutable (frozen) response", () => {
    const response = buildPaginatedResponse([], 0, {
      page: 1,
      limit: 20,
      sortBy: undefined,
      sortOrder: "desc",
    });

    expect(Object.isFrozen(response)).toBe(true);
  });
});

describe("buildSuccessResponse", () => {
  it("wraps data in success envelope", () => {
    const response = buildSuccessResponse({ id: "123", name: "Test" });
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ id: "123", name: "Test" });
    expect(response.error).toBeNull();
    expect(response.meta).toBeNull();
  });

  it("returns an immutable (frozen) response", () => {
    const response = buildSuccessResponse({ id: "1" });
    expect(Object.isFrozen(response)).toBe(true);
  });
});
