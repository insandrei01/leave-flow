/**
 * Mock Firebase auth helpers for integration and unit tests.
 *
 * These helpers produce fake bearer tokens and auth payloads without
 * involving the real Firebase Admin SDK. Tests that need to exercise
 * authenticated routes should use createAuthHeaders() to build the
 * Authorization header passed to supertest / Fastify inject.
 */

import type { AuthPayload } from "../../src/types/fastify.js";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

export const TEST_TENANT_ID = "test-tenant-id";
export const TEST_EMPLOYEE_ID = "test-employee-id";
export const TEST_UID = "test-firebase-uid";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface TestTokenOptions {
  readonly uid?: string;
  readonly tenantId?: string;
  readonly employeeId?: string;
  readonly role?: string;
}

export interface AuthHeaderOptions extends TestTokenOptions {
  /** When true the Authorization header is omitted entirely (no auth). */
  readonly omit?: boolean;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Generates a deterministic fake JWT-like token string for tests.
 * The token encodes the provided options as a base64 JSON payload so
 * that any middleware that decodes (but does not cryptographically
 * verify) the token can still read the claims.
 *
 * Note: This token is NOT cryptographically signed. Tests that exercise
 * the actual auth plugin must mock verifyIdToken via vi.mock.
 */
export function generateTestToken(options: TestTokenOptions = {}): string {
  const payload = {
    uid: options.uid ?? TEST_UID,
    tenantId: options.tenantId ?? TEST_TENANT_ID,
    employeeId: options.employeeId ?? TEST_EMPLOYEE_ID,
    role: options.role ?? "hr_admin",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  // Fake signature — not cryptographically valid
  const signature = Buffer.from("test-signature").toString("base64url");

  return `${header}.${body}.${signature}`;
}

/**
 * Returns an Authorization header object for use with supertest or
 * Fastify's inject API.
 *
 * @example
 * ```ts
 * await request(app.server)
 *   .get('/api/employees')
 *   .set(createAuthHeaders())
 *   .expect(200);
 * ```
 */
export function createAuthHeaders(
  options: AuthHeaderOptions = {}
): Record<string, string> {
  if (options.omit === true) {
    return {};
  }

  const { omit: _omit, ...tokenOptions } = options;
  const token = generateTestToken(tokenOptions);

  return { Authorization: `Bearer ${token}` };
}

/**
 * Creates an AuthPayload object with sensible test defaults.
 * Useful for unit tests that need to populate request.auth directly.
 */
export function mockAuthPayload(options: TestTokenOptions = {}): AuthPayload {
  return Object.freeze({
    uid: options.uid ?? TEST_UID,
    tenantId: options.tenantId ?? TEST_TENANT_ID,
    employeeId: options.employeeId ?? TEST_EMPLOYEE_ID,
    role: options.role ?? "hr_admin",
  });
}
