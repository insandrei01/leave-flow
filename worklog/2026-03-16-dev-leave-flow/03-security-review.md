---
stage: "03-security-review"
agent: "security-expert"
model: "opus"
run_id: "2026-03-16-dev-leave-flow"
started: "2026-03-17T10:00:00Z"
finished: "2026-03-17T10:45:00Z"
tools_used: [Read, Grep, Glob, Bash]
parent_agent: "pipeline-orchestrator"
sub_agents_invoked: []
output_files:
  - worklog/runs/2026-03-16-dev-leave-flow/03-security-review.md
---

# Security Review: LeaveFlow MVP

## Threat Model

### Attack Surface

| Surface | Entry Points | Auth Required |
|---------|-------------|---------------|
| REST API | All `/api/*` endpoints | Yes (Firebase JWT) |
| Stripe Webhooks | `POST /billing/webhooks` | No (signature verified) |
| Slack Bot Webhooks | `POST /slack/events`, `/slack/interactions`, `/slack/commands` | No (HMAC signature) |
| Teams Bot Webhooks | `POST /teams/messages` | No (Bearer token) |
| OAuth Callbacks | `GET /calendar-sync/google/callback`, `/calendar-sync/outlook/callback` | No (public routes) |
| Registration | `POST /auth/register` | No (public route) |

### Trust Boundaries

1. **Internet -> API**: Untrusted. All input must be validated. Auth required except public routes.
2. **API -> Firebase Auth**: Trusted. Token verification delegated to Firebase Admin SDK.
3. **API -> MongoDB**: Trusted internal network. Tenant isolation enforced at application layer.
4. **API -> Redis**: Trusted internal network. Used for rate limiting and BullMQ.
5. **Slack/Teams -> API**: Semi-trusted. Signature verification required.
6. **Stripe -> API**: Semi-trusted. Webhook signature verification required.
7. **OAuth Providers -> API**: Semi-trusted. State parameter used for CSRF protection.

### Sensitive Data

| Data | Classification | Storage | Encryption |
|------|---------------|---------|-----------|
| Employee PII (name, email) | Personal / GDPR | MongoDB | At rest (Atlas) |
| Firebase credentials | Secret | Environment variables | N/A (runtime) |
| Slack bot tokens | Secret | MongoDB (`encryptedBotToken`) | AES-256 (application-level) |
| OAuth access/refresh tokens | Secret | MongoDB (`encryptedAccessToken`) | Named "encrypted" but NOT ENCRYPTED (see SEC-001) |
| Stripe webhook secret | Secret | Environment variables | N/A (runtime) |
| User passwords | Secret | Firebase Auth | Firebase-managed (bcrypt) |
| Invitation tokens | Sensitive | MongoDB | None (plaintext) |

---

## Findings

### CRITICAL

#### [SEC-001]: OAuth Tokens Stored in Plaintext Despite Field Names Suggesting Encryption

- **File**: `leaveflow/apps/api/src/modules/calendar-sync/calendar-sync.routes.ts:228-229`
- **Category**: A02:2021 Cryptographic Failures (OWASP)
- **Description**: The OAuth token fields are named `encryptedAccessToken` and `encryptedRefreshToken`, but the `calendar-sync.routes.ts` callback handlers store the raw tokens returned from Google/Outlook directly into these fields without any encryption step. The `exchangeGoogleCode()` function at line 129 returns `data.access_token` as-is, and line 228 writes it directly to `encryptedAccessToken`. No encryption function is called anywhere in the calendar-sync routes.
- **Exploit Scenario**: An attacker who gains read access to the MongoDB database (via misconfiguration, injection, backup exposure, or compromised credentials) obtains plaintext Google/Outlook OAuth tokens for every user who has connected their calendar. These tokens grant the attacker ability to read/write calendar events for all connected employees across all tenants.
- **Remediation**: Implement AES-256-GCM encryption (similar to what the Slack OAuth handler does via `deps.encrypt()`) before storing tokens. Create a shared `encrypt()`/`decrypt()` utility using a secret key from environment variables. Apply encryption at the point of storage and decryption at the point of use.
- **Reference**: CWE-311 (Missing Encryption of Sensitive Data), CWE-312 (Cleartext Storage of Sensitive Information)

#### [SEC-002]: Teams Bot Webhook Token Validation is Effectively Bypassed

- **File**: `leaveflow/apps/api/src/modules/bot-teams/bot-teams.plugin.ts:40-52`
- **Category**: A07:2021 Identification and Authentication Failures
- **Description**: The `validateBotToken()` function only checks that a Bearer token is present and non-empty when `appId` is defined. It does NOT validate the JWT signature, issuer, audience, or claims. The Bot Framework requires validating the JWT against Microsoft's OpenID metadata endpoint, verifying the `aud` claim matches the app ID, and confirming the `iss` matches the Bot Framework token issuer. The current implementation accepts ANY non-empty string as a valid token.
- **Exploit Scenario**: An attacker crafts a POST request to `/teams/messages` with `Authorization: Bearer anything` and a forged activity payload. Since the token is not cryptographically verified, the attacker can impersonate any Teams user, approve/reject leave requests, or trigger any bot command. If `appId` is undefined (development mode accidentally enabled in production), ALL requests are accepted without any validation.
- **Remediation**: Use the official `botframework-connector` library's `JwtTokenValidation.authenticateRequest()` to validate the Bot Framework JWT. Verify the `aud` claim matches `TEAMS_APP_ID`, verify the `iss` matches `https://api.botframework.com`, and validate the token signature against Microsoft's JWKS endpoint. Never allow skipping validation in production -- gate `appId` as a required config in production.
- **Reference**: CWE-287 (Improper Authentication), CWE-345 (Insufficient Verification of Data Authenticity)

#### [SEC-003]: Tenant Isolation Gap in requireTenantIdPlugin -- findOneAndUpdate/deleteOne Not Guarded

- **File**: `leaveflow/apps/api/src/models/plugins/require-tenant-id.ts`
- **Category**: A01:2021 Broken Access Control
- **Description**: The Mongoose `requireTenantIdPlugin` only hooks into `find`, `findOne`, and `aggregate` middleware. It does NOT guard `findOneAndUpdate`, `updateOne`, `updateMany`, `deleteOne`, or `deleteMany` operations. Multiple repositories use `findOneAndUpdate` extensively (at least 12 call sites found across team, employee, leave-request, notification, workflow, holiday, leave-type, OAuth-token, delegation, and blackout-period repositories). While most repositories appear to manually include `tenantId` in their filter, the safety net that catches developer mistakes is incomplete.
- **Exploit Scenario**: A developer adds a new repository method using `findOneAndUpdate` and forgets to include `tenantId` in the filter. Unlike `find`/`findOne`, this mistake would silently succeed without throwing an error, allowing cross-tenant data modification. Given the high number of `findOneAndUpdate` usage sites, this is a high-probability developer error.
- **Remediation**: Extend `requireTenantIdPlugin` to hook into all write operations:
  ```typescript
  schema.pre("findOneAndUpdate", function () { /* check tenantId in filter */ });
  schema.pre("updateOne", function () { /* check tenantId in filter */ });
  schema.pre("updateMany", function () { /* check tenantId in filter */ });
  schema.pre("deleteOne", function () { /* check tenantId in filter */ });
  schema.pre("deleteMany", function () { /* check tenantId in filter */ });
  ```
- **Reference**: CWE-284 (Improper Access Control), CWE-863 (Incorrect Authorization)

### HIGH

#### [SEC-004]: Calendar Sync OAuth Callback Missing tenantId -- Cross-Tenant Token Hijacking via State Forgery

- **File**: `leaveflow/apps/api/src/modules/calendar-sync/calendar-sync.routes.ts:193-244`
- **Category**: A01:2021 Broken Access Control
- **Description**: The Google/Outlook OAuth callback routes are marked `{ config: { public: true } }`, which means they bypass authentication entirely. The `state` parameter (a base64url-encoded JSON with `employeeId`) is the only way the callback identifies the user. However: (1) The state is not signed or encrypted -- anyone can forge it. (2) The state does not contain `tenantId`, so the OAuthTokenModel upsert at line 221 uses only `employeeId` without tenant scoping, bypassing the `requireTenantIdPlugin` (which doesn't cover `findOneAndUpdate` anyway). (3) There is no CSRF token or nonce to prevent replay attacks.
- **Exploit Scenario**: Attacker initiates an OAuth flow, intercepts the callback, and replaces the `state` parameter with a forged base64url JSON containing a victim's `employeeId`. The attacker's Google tokens are then stored against the victim's account, giving the attacker the ability to write to the victim's calendar via the sync feature.
- **Remediation**: (1) Sign the state parameter with HMAC-SHA256 using a server-side secret. Verify the signature on callback. (2) Include `tenantId` in the state and verify it on callback. (3) Add a server-generated nonce stored in Redis with a short TTL. (4) Include `tenantId` in the OAuthTokenModel upsert filter.
- **Reference**: CWE-352 (Cross-Site Request Forgery), CWE-347 (Improper Verification of Cryptographic Signature)

#### [SEC-005]: Calendar Sync Status and Disconnect Endpoints Missing Tenant Scoping

- **File**: `leaveflow/apps/api/src/modules/calendar-sync/calendar-sync.routes.ts:320-322, 352-354`
- **Category**: A01:2021 Broken Access Control
- **Description**: The `GET /calendar-sync/status` endpoint queries `OAuthTokenModel.find({ employeeId, isActive: true })` without including `tenantId` in the filter. Similarly, `DELETE /calendar-sync/:provider` queries without `tenantId`. Since employeeIds are MongoDB ObjectIds which are partially sequential, an attacker in one tenant could potentially craft requests to view or disconnect calendar connections of employees in other tenants if they guess or enumerate ObjectIds.
- **Remediation**: Add `tenantId: request.auth!.tenantId` to all OAuthTokenModel queries in the calendar-sync routes. This ensures the `requireTenantIdPlugin` catches any tenant scoping issues (once SEC-003 is fixed for `findOneAndUpdate`).
- **Reference**: CWE-639 (Authorization Bypass Through User-Controlled Key / IDOR)

#### [SEC-006]: Internal Error Messages Leak Implementation Details to Clients

- **File**: `leaveflow/apps/api/src/modules/employee/employee.routes.ts:88-93` (and 6 other route files)
- **Category**: A04:2021 Insecure Design
- **Description**: The `handleError()` functions in employee, team, tenant, leave-type, workflow, leave-request, and balance route files send the raw `error.message` to clients in 500 responses: `error: { code: "INTERNAL_ERROR", message, details: null }`. These messages can contain database error details, stack traces, internal identifiers, and infrastructure information (e.g., MongoDB connection errors, file paths, internal service names). While the global `error-handler.plugin.ts` correctly returns a generic message for unhandled errors, these route-level handlers bypass it by catching errors and sending responses directly.
- **Remediation**: Replace `message` with a generic string in all 500 error responses: `message: "An unexpected error occurred"`. Log the original error server-side for debugging. Alternatively, remove the route-level error handlers and let errors propagate to the global error handler, which already handles this correctly.
- **Reference**: CWE-209 (Generation of Error Message Containing Sensitive Information)

#### [SEC-007]: Approval Routes Missing Authorization Check -- Any Authenticated User Can Approve/Reject

- **File**: `leaveflow/apps/api/src/modules/approval-engine/approval.routes.ts:45-68, 71-93`
- **Category**: A01:2021 Broken Access Control
- **Description**: The `POST /approvals/:id/approve` and `POST /approvals/:id/reject` routes do not verify that the authenticated user (`request.auth.employeeId`) matches the `currentApproverEmployeeId` on the leave request. Any authenticated user within the same tenant can approve or reject any pending leave request by knowing (or guessing) its ID. The `force-approve` route correctly checks for hr_admin/company_admin role, but the regular approve/reject routes have no such check.
- **Remediation**: Before processing the approval/rejection, verify that the actor is the designated current approver:
  ```typescript
  const leaveRequest = await repo.findById(tenantId, parseObjectId(id));
  if (leaveRequest.currentApproverEmployeeId?.toString() !== employeeId) {
    throw new ForbiddenError("You are not the designated approver for this step");
  }
  ```
  Also check for delegation -- if the actor has an active delegation from the designated approver, allow the action.
- **Reference**: CWE-862 (Missing Authorization), CWE-639 (IDOR)

#### [SEC-008]: Stripe Webhook Uses Fallback to JSON.stringify When rawBody Missing

- **File**: `leaveflow/apps/api/src/modules/billing/billing.routes.ts:138`
- **Category**: A08:2021 Software and Data Integrity Failures
- **Description**: The Stripe webhook handler falls back to `JSON.stringify(request.body)` if `rawBody` is not available: `const payload = (request as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(request.body)`. Stripe signature verification requires the exact raw bytes received. If `rawBody` is not configured (via `@fastify/rawbody`), `JSON.stringify` may produce different byte sequences than the original payload (different key ordering, whitespace), causing signature verification to always fail. However, in this failure case, an attacker could potentially bypass signature verification if the Stripe SDK does not properly reject the mismatched payload.
- **Remediation**: Make `rawBody` a hard requirement. Register `@fastify/rawbody` for the webhook route and throw a 500 error if `rawBody` is undefined rather than falling back to JSON.stringify. This ensures signature verification is always performed against the exact received payload.
- **Reference**: CWE-345 (Insufficient Verification of Data Authenticity)

### MEDIUM

#### [SEC-009]: Rate Limiter Infers Plan Tier from Role Instead of Tenant Plan

- **File**: `leaveflow/apps/api/src/plugins/rate-limiter.plugin.ts:87-93`
- **Category**: A04:2021 Insecure Design
- **Description**: The `extractPlanFromRole()` function maps user roles to rate limit tiers (e.g., `company_admin` -> enterprise, `hr_admin` -> business). This is incorrect -- the rate limit should be based on the tenant's subscription plan, not the individual user's role. A `company_admin` on a free plan gets enterprise-level rate limits (1200/min instead of 60/min), while regular employees on a business plan get free-tier limits (60/min). This creates both a privilege escalation vector and a denial-of-service risk for paying customers.
- **Remediation**: Look up the tenant's actual plan from the database (cached in Redis for performance) rather than inferring from the role. The rate limiter key generator already uses `tenantId`, so a per-tenant plan lookup is straightforward.
- **Reference**: CWE-269 (Improper Privilege Management)

#### [SEC-010]: Security Plugin Silently Skips Helmet When Package Not Installed

- **File**: `leaveflow/apps/api/src/plugins/security.plugin.ts:91-115`
- **Category**: A05:2021 Security Misconfiguration
- **Description**: The `@fastify/helmet` import is wrapped in a try/catch that silently continues if the package is not installed. Helmet provides critical security headers (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Content-Security-Policy, etc.). In production, if the package is accidentally missing from the Docker image (e.g., listed as devDependency), the API will run without any security headers, and only a warning log will be emitted.
- **Remediation**: In production (`NODE_ENV=production`), throw an error if `@fastify/helmet` is not available rather than silently continuing. Only allow the fallback in development/test environments.
- **Reference**: CWE-1021 (Improper Restriction of Rendered UI Layers)

#### [SEC-011]: CORS Allows Wildcard Origin

- **File**: `leaveflow/apps/api/src/plugins/cors.plugin.ts:22`
- **Category**: A05:2021 Security Misconfiguration
- **Description**: The CORS plugin allows `"*"` as a valid origin: `if (allowedOrigins.includes("*"))`. Combined with `credentials: true`, this is a dangerous configuration. If `CORS_ALLOWED_ORIGINS` is set to `*` in production (even accidentally), any website can make credentialed cross-origin requests to the API, enabling CSRF-like attacks even with Bearer token auth (if the token is stored in a cookie by a browser extension or SSO flow).
- **Remediation**: Reject the wildcard `"*"` when `credentials: true` is set. Most browsers already block `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`, but the validation should be explicit at the application level. Add a startup check that rejects `*` in production.
- **Reference**: CWE-942 (Permissive Cross-domain Policy with Untrusted Domains)

#### [SEC-012]: Request Body Size Check Relies on Content-Length Header (Bypassable)

- **File**: `leaveflow/apps/api/src/plugins/security.plugin.ts:121-143`
- **Category**: A04:2021 Insecure Design
- **Description**: The body size enforcement checks the `Content-Length` header, which the client controls. An attacker can set `Content-Length: 100` while sending a 50MB body (using chunked transfer encoding or simply lying). Fastify's built-in `bodyLimit` option would enforce actual received bytes.
- **Remediation**: Use Fastify's `bodyLimit` configuration option instead of or in addition to the `Content-Length` header check. Set `bodyLimit: 1 * 1024 * 1024` in the Fastify constructor and use route-level overrides for CSV import.
- **Reference**: CWE-400 (Uncontrolled Resource Consumption)

#### [SEC-013]: Webhook Plan Update Does Not Validate Plan Value

- **File**: `leaveflow/apps/api/src/modules/billing/billing.service.ts:277`
- **Category**: A08:2021 Software and Data Integrity Failures
- **Description**: The `updateTenantPlan()` function casts the plan value with `const validPlan = plan as "free" | "team" | "business" | "enterprise"` without actually validating that the string matches one of the valid values. A malformed webhook event could set a tenant's plan to an arbitrary string (e.g., `"admin"` or `"unlimited"`), which downstream code may not handle correctly.
- **Remediation**: Validate the plan value against an allowlist before updating:
  ```typescript
  const VALID_PLANS = new Set(["free", "team", "business", "enterprise"]);
  if (!VALID_PLANS.has(plan)) {
    logger.warn({ plan, tenantId }, "Invalid plan in webhook, ignoring");
    return;
  }
  ```
- **Reference**: CWE-20 (Improper Input Validation)

#### [SEC-014]: Registration Endpoint Leaks Email Existence

- **File**: `leaveflow/apps/api/src/modules/auth/auth.service.ts:113-118`
- **Category**: A07:2021 Identification and Authentication Failures
- **Description**: The registration endpoint returns a specific error message `"Email address already registered: {email}"` when an email is already in use. This allows attackers to enumerate valid email addresses by attempting to register with various emails and observing which ones return a conflict error.
- **Remediation**: Return a generic message like `"Registration failed. If this email is already registered, please use the login page."` This prevents email enumeration while still being helpful to legitimate users.
- **Reference**: CWE-204 (Observable Response Discrepancy)

### LOW

#### [SEC-015]: Invitation Token Stored Without Hashing

- **File**: `leaveflow/apps/api/src/models/employee.model.ts:28, 59`
- **Category**: A02:2021 Cryptographic Failures
- **Description**: The `invitationToken` field is stored as plaintext in the database with a unique sparse index. If the database is compromised, an attacker can use these tokens to accept invitations and gain access to tenant accounts.
- **Remediation**: Store a SHA-256 hash of the invitation token in the database. When validating, hash the incoming token and compare against the stored hash.
- **Reference**: CWE-312 (Cleartext Storage of Sensitive Information)

#### [SEC-016]: Request ID Trusted from Client Header

- **File**: `leaveflow/apps/api/src/middleware/request-context.ts:26-28`
- **Category**: A04:2021 Insecure Design
- **Description**: The request context middleware accepts the `X-Request-Id` header from the client without validation. While this is useful for request tracing through proxies, it allows clients to set arbitrary values which could be used for log injection (e.g., newlines, control characters in the ID).
- **Remediation**: Validate that incoming `X-Request-Id` values match a safe pattern (e.g., UUID format or alphanumeric with hyphens, max 64 chars). Reject or replace values that do not match.
- **Reference**: CWE-117 (Improper Output Neutralization for Logs)

#### [SEC-017]: Input Sanitization Only Strips Null Bytes

- **File**: `leaveflow/apps/api/src/plugins/security.plugin.ts:45-73`
- **Category**: A03:2021 Injection
- **Description**: The input sanitization hook only removes null bytes (`\0`) from string fields. While null byte injection is a real attack vector, other dangerous characters for NoSQL injection (e.g., `$` prefix in MongoDB operators) are not addressed at this layer. The Zod schemas and Mongoose schema validation provide additional layers of defense, but explicit NoSQL injection protection would strengthen defense-in-depth.
- **Remediation**: Consider adding sanitization for MongoDB operator injection: strip or reject keys starting with `$` in request body objects. Alternatively, use `mongo-sanitize` or a similar library as middleware.
- **Reference**: CWE-943 (Improper Neutralization of Special Elements in Data Query Logic)

#### [SEC-018]: Slack OAuth State Does Not Include Nonce for CSRF Protection

- **File**: `leaveflow/apps/api/src/modules/bot-slack/bot-slack.oauth.ts:129-136`
- **Category**: A07:2021 Identification and Authentication Failures
- **Description**: The Slack OAuth install URL builder accepts a `state` parameter, but the implementation does not verify that the state on callback matches a server-generated nonce. Without nonce verification, the OAuth flow is vulnerable to CSRF attacks where an attacker tricks an admin into installing the bot in the attacker's workspace.
- **Remediation**: Generate a cryptographically random nonce, store it in the user's session or Redis with a short TTL, include it in the `state` parameter, and verify it on the callback.
- **Reference**: CWE-352 (Cross-Site Request Forgery)

---

## Security Checklist

- [x] No hardcoded secrets in source code (all secrets via environment variables)
- [ ] **FAIL** — No injection vulnerabilities (SEC-003: tenantId guard incomplete for write ops)
- [x] Authentication properly implemented for API routes (Firebase JWT verification)
- [ ] **FAIL** — Authentication properly implemented for Teams bot (SEC-002: token not verified)
- [ ] **FAIL** — Authorization checked at every access point (SEC-007: approval routes missing)
- [ ] **FAIL** — Sensitive data encrypted at rest (SEC-001: OAuth tokens plaintext)
- [x] No secrets committed to source code
- [x] Input validated with Zod schemas at route boundaries
- [x] Output properly encoded (no HTML rendering, API-only)
- [x] CSRF protection via Bearer token architecture (no cookies for auth)
- [x] Security headers configured (Helmet, with caveat SEC-010)
- [ ] **PARTIAL** — Dependencies free of known vulnerabilities (not auditable without `npm audit`)
- [ ] **FAIL** — Error messages don't leak sensitive information (SEC-006: raw messages in 500s)
- [x] Rate limiting on all endpoints (with caveats SEC-009 and SEC-012)
- [x] GDPR pseudonymization implemented (employee.gdpr.ts)
- [x] Audit logging for all state-changing operations
- [x] Slack webhook signature verification (HMAC-SHA256 + timing-safe compare)
- [ ] **FAIL** — Stripe webhook signature against raw body (SEC-008: fallback to JSON.stringify)

---

## Risk Summary by Severity

| Severity | Count | Deployment Blocking? |
|----------|-------|---------------------|
| CRITICAL | 3 | YES -- must fix before any production deployment |
| HIGH | 5 | YES -- should fix before release |
| MEDIUM | 6 | Fix soon -- within first sprint post-MVP |
| LOW | 4 | Fix when convenient |

---

## Prioritized Remediation Plan

### Phase 0: Must Fix Before Deployment (CRITICAL)

1. **SEC-001**: Encrypt OAuth tokens before storage. Estimated effort: 2-4 hours.
2. **SEC-002**: Implement proper Bot Framework JWT validation for Teams. Estimated effort: 4-8 hours.
3. **SEC-003**: Extend `requireTenantIdPlugin` to cover all Mongoose operations. Estimated effort: 2-3 hours.

### Phase 1: Must Fix Before Release (HIGH)

4. **SEC-007**: Add approver authorization check to approval routes. Estimated effort: 2-3 hours.
5. **SEC-004**: Sign OAuth state parameter and include tenantId. Estimated effort: 3-4 hours.
6. **SEC-005**: Add tenantId to all calendar-sync OAuthTokenModel queries. Estimated effort: 1 hour.
7. **SEC-006**: Replace raw error messages with generic text in all route-level handlers. Estimated effort: 1-2 hours.
8. **SEC-008**: Make rawBody mandatory for Stripe webhook route. Estimated effort: 1 hour.

### Phase 2: Fix Soon (MEDIUM)

9. **SEC-009**: Use actual tenant plan for rate limiting. Estimated effort: 3-4 hours.
10. **SEC-010**: Fail hard if Helmet missing in production. Estimated effort: 30 minutes.
11. **SEC-011**: Block wildcard CORS in production. Estimated effort: 30 minutes.
12. **SEC-012**: Use Fastify bodyLimit instead of Content-Length header. Estimated effort: 1 hour.
13. **SEC-013**: Validate plan values from Stripe webhooks. Estimated effort: 30 minutes.
14. **SEC-014**: Remove email from registration conflict error message. Estimated effort: 15 minutes.

### Phase 3: Low Priority

15. **SEC-015**: Hash invitation tokens. Estimated effort: 2 hours.
16. **SEC-016**: Validate Request-ID header format. Estimated effort: 30 minutes.
17. **SEC-017**: Add MongoDB operator sanitization. Estimated effort: 2 hours.
18. **SEC-018**: Add nonce to Slack OAuth state. Estimated effort: 1-2 hours.

---

## Positive Observations

The codebase demonstrates several strong security practices that should be acknowledged:

1. **Layered tenant isolation**: 5-layer approach (auth plugin -> tenant plugin -> withTenant helper -> requireTenantIdPlugin -> DB indexes) provides excellent defense-in-depth for the happy path.
2. **Immutable auth payload**: `request.auth` is frozen with `Object.freeze()`, preventing middleware tampering.
3. **Slack signature verification**: Properly uses `crypto.timingSafeEqual()` to prevent timing attacks, with a 5-minute timestamp window to prevent replay attacks.
4. **Error envelope consistency**: All responses use a standard `{ success, data, error }` envelope.
5. **Zod validation at boundaries**: Every route validates input with Zod schemas before processing.
6. **Audit logging**: All state-changing operations are logged to an immutable audit trail (with blocked updateOne/deleteOne on the audit model).
7. **GDPR compliance**: Pseudonymization preserves audit trail integrity while removing PII.
8. **Secrets management**: All secrets are loaded from environment variables, validated at startup, no hardcoded values found in source.
9. **Firebase custom claims**: Tenant/employee/role embedded in JWT tokens, reducing DB lookups.
10. **Balance ledger immutability**: Update/delete operations are blocked at the Mongoose middleware level.

---

## Verdict: ISSUES FOUND

The LeaveFlow MVP has a solid security foundation but contains **3 CRITICAL** and **5 HIGH** severity issues that must be resolved before production deployment. The most impactful are:

1. **OAuth tokens stored unencrypted** (SEC-001) -- data breach risk
2. **Teams bot accepts any Bearer token** (SEC-002) -- impersonation risk
3. **Tenant isolation gaps in write operations** (SEC-003) -- cross-tenant data corruption risk
4. **Any user can approve leave requests** (SEC-007) -- authorization bypass

Estimated total remediation effort for CRITICAL + HIGH: **16-26 developer hours**.

The security architecture (layered tenant isolation, Firebase auth, audit trail, GDPR compliance) is well-designed. The issues found are implementation gaps rather than architectural flaws, making them straightforward to fix.
