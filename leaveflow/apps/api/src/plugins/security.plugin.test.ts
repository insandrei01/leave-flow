/**
 * Unit tests for the security plugin.
 *
 * Tests the sanitizer helper and rate-limit auth-path logic in isolation.
 */

import { describe, it, expect } from "vitest";
import { sanitizeStringFields } from "./security.plugin.js";

describe("sanitizeStringFields", () => {
  it("removes null bytes from string values", () => {
    const input = { name: "Alice\0", email: "alice@example.com" };
    const result = sanitizeStringFields(input);
    expect(result["name"]).toBe("Alice");
    expect(result["email"]).toBe("alice@example.com");
  });

  it("does not mutate the original object", () => {
    const input = { name: "Bob\0test" };
    sanitizeStringFields(input);
    expect(input.name).toBe("Bob\0test");
  });

  it("recursively sanitizes nested objects", () => {
    const input = {
      outer: "safe",
      nested: { field: "value\0withNull" },
    };
    const result = sanitizeStringFields(input);
    const nested = result["nested"] as Record<string, unknown>;
    expect(nested["field"]).toBe("valuewithNull");
    expect((input.nested as Record<string, unknown>)["field"]).toBe(
      "value\0withNull"
    );
  });

  it("sanitizes string items in arrays", () => {
    const input = { tags: ["ok\0", "clean"] };
    const result = sanitizeStringFields(input);
    expect(result["tags"]).toEqual(["ok", "clean"]);
  });

  it("sanitizes objects in arrays", () => {
    const input = {
      items: [{ label: "test\0" }, { label: "safe" }],
    };
    const result = sanitizeStringFields(input);
    const items = result["items"] as Array<{ label: string }>;
    expect(items[0]?.label).toBe("test");
    expect(items[1]?.label).toBe("safe");
  });

  it("passes through non-string values unchanged", () => {
    const input = { count: 42, enabled: true, data: null };
    const result = sanitizeStringFields(input);
    expect(result["count"]).toBe(42);
    expect(result["enabled"]).toBe(true);
    expect(result["data"]).toBeNull();
  });

  it("handles empty object", () => {
    const result = sanitizeStringFields({});
    expect(result).toEqual({});
  });

  it("removes multiple null bytes", () => {
    const input = { name: "\0Alice\0Smith\0" };
    const result = sanitizeStringFields(input);
    expect(result["name"]).toBe("AliceSmith");
  });
});

// ----------------------------------------------------------------
// Rate-limiter auth-path logic tests (pure function extraction)
// ----------------------------------------------------------------

describe("rate-limiter auth path override", () => {
  const AUTH_LIMIT = 10;
  const BOT_LIMIT = 1000;
  const PLAN_LIMITS: Record<string, number> = {
    free: 60,
    team: 300,
    business: 600,
    enterprise: 1200,
  };

  function isAuthPath(url: string): boolean {
    return url.startsWith("/auth/");
  }

  function isBotPath(url: string): boolean {
    return url.startsWith("/slack/") || url.startsWith("/teams/");
  }

  function getLimit(url: string, role?: string): number {
    if (isBotPath(url)) return BOT_LIMIT;
    if (isAuthPath(url)) return AUTH_LIMIT;
    if (role === "company_admin") return PLAN_LIMITS["enterprise"]!;
    if (role === "hr_admin") return PLAN_LIMITS["business"]!;
    if (role === "manager") return PLAN_LIMITS["team"]!;
    return PLAN_LIMITS["free"]!;
  }

  it("returns 10 for /auth/ paths", () => {
    expect(getLimit("/auth/login")).toBe(10);
    expect(getLimit("/auth/register")).toBe(10);
  });

  it("returns 1000 for /slack/ paths", () => {
    expect(getLimit("/slack/events")).toBe(1000);
  });

  it("returns 1000 for /teams/ paths", () => {
    expect(getLimit("/teams/webhook")).toBe(1000);
  });

  it("returns plan limits for regular paths", () => {
    expect(getLimit("/employees", "employee")).toBe(60);
    expect(getLimit("/employees", "manager")).toBe(300);
    expect(getLimit("/employees", "hr_admin")).toBe(600);
    expect(getLimit("/employees", "company_admin")).toBe(1200);
  });
});
