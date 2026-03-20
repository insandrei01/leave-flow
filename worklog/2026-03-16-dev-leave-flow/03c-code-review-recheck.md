---
stage: "03c-code-review-recheck"
agent: "code-reviewer"
model: "opus"
run_id: "2026-03-16-dev-leave-flow"
started: "2026-03-17T14:00:00Z"
finished: "2026-03-17T14:45:00Z"
tools_used: [Read, Grep, Glob, Bash]
parent_agent: "pipeline-orchestrator"
sub_agents_invoked: []
output_files:
  - worklog/runs/2026-03-16-dev-leave-flow/03c-code-review-recheck.md
---

# Code Review Re-check: LeaveFlow MVP (Attempt 2)

## Summary

Re-review of all 16 CRITICAL+HIGH issues from the initial code review after Stage 3b fixes. 15 of 16 issues are fully resolved. One issue (CR-007 rate limiter plan resolution) has the correct plugin implementation but incomplete wiring in `app.ts`. One new HIGH issue was discovered during this re-review.

## Verification of Fixed Issues

### Stream 1 -- Calendar-sync Security (6 issues)

#### CR-001/SEC-001/PERF-008: OAuth tokens must be encrypted at rest
**Status: VERIFIED**

- `leaveflow/apps/api/src/lib/crypto.ts` implements AES-256-GCM with:
  - 96-bit random IV per encryption call (IND-CPA secure)
  - 128-bit authentication tag
  - Key loaded from `TOKEN_ENCRYPTION_KEY` env var (validated as 64-char hex)
  - Ciphertext format: `base64(iv):base64(authTag):base64(ciphertext)`
  - Input validation on decrypt (part count, IV length, auth tag length)
- `calendar-sync.routes.ts` calls `encrypt()` before storing tokens (lines 280-281 for Google, lines 342-343 for Outlook)
- `TOKEN_ENCRYPTION_KEY` is validated at startup via `loadConfig()` in `lib/config.ts:92,117`
- 10 unit tests cover encrypt/decrypt round-trip, missing key, invalid key length, tampered ciphertext

#### CR-002/SEC-004: OAuth callback CSRF state verification via Redis nonce
**Status: VERIFIED**

- `calendar-sync.routes.ts:95-123` implements `storeOAuthState()` and `consumeOAuthState()`:
  - `storeOAuthState()` generates 32 random bytes as nonce, stores JSON payload in Redis with 600s TTL
  - `consumeOAuthState()` uses `redis.getdel()` for atomic read-and-delete (one-time use)
- Connect endpoints (`/google/connect`, `/outlook/connect`) call `storeOAuthState({ employeeId, tenantId })` and pass the nonce as the OAuth `state` parameter
- Callback endpoints verify state: if `consumeOAuthState()` returns null, throws `ValidationError("Invalid or expired OAuth state")` (lines 269-271, 330-333)
- The `OAuthStatePayload` interface now includes both `employeeId` and `tenantId` (line 82-85)

#### CR-003/CR-004/SEC-005: Calendar-sync queries must include tenantId
**Status: VERIFIED**

- All OAuthTokenModel queries now include `tenantId`:
  - Google callback upsert: `{ tenantId, employeeId, service: "google_calendar" }` (line 277)
  - Outlook callback upsert: `{ tenantId, employeeId, service: "outlook_calendar" }` (line 339)
  - Status endpoint: `{ tenantId, employeeId, isActive: true }` (lines 368-371)
  - Disconnect endpoint: `{ tenantId, employeeId, service: params.data.provider, isActive: true }` (lines 402-406)
  - `$setOnInsert` includes `tenantId` for upserts (lines 286-288, 348-350)
- The `tenantId` is sourced from `request.auth!` on authenticated routes and from the Redis state payload on callback routes

### Stream 2 -- App Wiring + Tenant Plugin + Errors (4 issues)

#### SEC-003: requireTenantIdPlugin must cover write operations
**Status: VERIFIED**

- `leaveflow/apps/api/src/models/plugins/require-tenant-id.ts` now hooks all 8 operation types:
  - Read: `find` (line 63), `findOne` (line 67), `aggregate` (line 71)
  - Write: `findOneAndUpdate` (line 82), `updateOne` (line 86), `updateMany` (line 90), `deleteOne` (line 94), `deleteMany` (line 98)
- Each write hook calls `assertFilterHasTenantId()` on `this.getFilter()`

#### CR-008/CR-016: All route modules registered, security + rate limiter plugins active
**Status: VERIFIED**

- `leaveflow/apps/api/src/app.ts` registers all plugins in correct order (lines 140-146):
  1. errorHandlerPlugin, 2. requestContextPlugin, 3. securityPlugin, 4. rateLimiterPlugin, 5. corsPlugin, 6. authPlugin, 7. tenantPlugin
- All route modules are wired with proper DI (lines 343-357):
  - authRoutes, onboardingRoutes, tenantRoutes, employeeRoutes, teamRoutes, leaveTypeRoutes, workflowRoutes, leaveRequestRoutes, delegationRoutes, approvalRoutes, balanceRoutes, billingRoutes
  - Plus infrastructure modules: health, dashboard, calendar, audit, holidays, notifications
- Full dependency injection graph is set up (repositories, services, adapters) in lines 170-339

#### SEC-006: 500 error messages sanitized in route files
**Status: VERIFIED**

All 7 route files now return a generic message for unhandled errors:
- `employee.routes.ts:99-104` -- `"An unexpected error occurred"`
- `team.routes.ts:96` -- `"An unexpected error occurred"`
- `tenant.routes.ts:95` -- `"An unexpected error occurred"`
- `leave-type.routes.ts:99` -- `"An unexpected error occurred"`
- `workflow.routes.ts:110` -- `"An unexpected error occurred"`
- `leave-request.routes.ts:91` -- `"An unexpected error occurred"`
- `balance.routes.ts:94` -- `"An unexpected error occurred"`

All log the raw error server-side via `reply.log.error()` before sending the generic response.

### Stream 3 -- Approval Auth + Business Logic (5 issues)

#### SEC-007: Approval routes verify designated approver
**Status: VERIFIED**

- `approval.routes.ts:76-113` implements `assertIsDesignatedApprover()`:
  - Checks if actor matches `currentApproverEmployeeId` on the leave request
  - Falls back to delegation check: queries `DelegationModel` for active delegation where delegator is the designated approver and delegatee is the actor, with date range validation
  - Throws `ForbiddenError` if neither condition is met
- Both `makeApproveHandler` (line 142-147) and `makeRejectHandler` (line 191-197) call `assertIsDesignatedApprover()` before processing
- `makeForceApproveHandler` correctly skips this check (force-approve is an HR admin override, guarded by role check at line 226)

#### CR-010: Approver display name resolved from database
**Status: VERIFIED**

- `approval.routes.ts:50-66` implements `resolveApproverName()`:
  - Queries `EmployeeModel` by `_id` and `tenantId` (tenant-scoped)
  - Returns `"${firstName} ${lastName}"` if found, falls back to raw employeeId if not
- Called in all three handlers: approve (line 150), reject (line 200), force-approve (line 234)
- The resolved name is passed as `approverName` to `processApproval()` / `processRejection()`

#### CR-006: workflowId resolved from team/tenant
**Status: VERIFIED**

- `leave-request.routes.ts:109-150` implements `resolveWorkflowId()`:
  - Step 1: Fetches employee's `teamId` from `EmployeeModel` (tenant-scoped via `withTenant`)
  - Step 2: If team found, fetches team's `workflowId` from `TeamModel` (tenant-scoped, active only)
  - Step 3: Falls back to first active workflow for the tenant from `WorkflowModel`
  - Throws descriptive error if no active workflow exists
- Both create (line 279) and validate (line 182) endpoints call `resolveWorkflowId()` instead of using a dummy ObjectId

#### CR-005: Distributed lock on balance check + request creation
**Status: VERIFIED**

- `leave-request.service.ts:93-153` implements Redis distributed lock:
  - Lock key: `lock:balance:{tenantId}:{employeeId}:{leaveTypeId}` (line 94)
  - Uses `redis.set(lockKey, "1", "EX", 10, "NX")` for atomic acquire with 10s TTL (line 96)
  - Throws `ConflictError` if lock cannot be acquired (lines 98-101)
  - Lock is released in `finally` block via `redis.del(lockKey)` (line 152), ensuring cleanup on both success and error
  - Balance check + document creation both happen inside the lock scope

#### CR-009: FSM allows auto_approved -> cancelled
**Status: VERIFIED**

- `approval-engine.fsm.ts:85-88` adds the transition:
  ```
  { from: "auto_approved", action: "cancel", to: "cancelled" }
  ```
- `auto_approved` is NOT in `TERMINAL_STATES` (line 94-99), which is correct -- it must accept the cancel transition
- The `TERMINAL_STATES` set contains only: `approved`, `rejected`, `cancelled`, `validation_failed`

### Stream 4 -- Bot Auth + Billing + Rate Limiter + Perf (5 issues)

#### SEC-002: Teams bot JWT validation
**Status: VERIFIED**

- `bot-teams.jwt.ts` implements full Bot Framework JWT validation:
  - Fetches JWKS from `login.botframework.com` OpenID configuration (line 89)
  - Caches keys in-memory for 24 hours (line 28, 84-86)
  - Validates: RS256 algorithm, `kid` presence, audience (`aud` must match appId), issuer (`iss` must be `https://api.botframework.com`), expiry (`exp`), not-before (`nbf`)
  - Builds RSA public key PEM from JWK `n` and `e` values (lines 138-199)
  - Verifies signature using `crypto.createVerify("RSA-SHA256")` (lines 272-278)
- `bot-teams.plugin.ts:63-75` calls `validateBotFrameworkToken(token, appId)` on every request
- Production guard: throws at plugin registration if `appId` is undefined and `NODE_ENV=production` (lines 50-55)

#### SEC-008: Stripe webhook hard-fails without rawBody
**Status: VERIFIED**

- `billing.routes.ts:139-146`: If `rawBody` is undefined or empty, throws `AppError` with status 500 and code `WEBHOOK_RAW_BODY_MISSING`
- No `JSON.stringify(request.body)` fallback exists -- the webhook is completely blocked without raw body
- This prevents signature verification bypass

#### CR-007/SEC-009: Rate limiter reads tenant plan from DB
**Status: PARTIALLY VERIFIED (see NEW-001 below)**

- The `rate-limiter.plugin.ts` implementation is correct:
  - `resolveTenantPlan()` (lines 90-133) checks Redis cache first, falls back to DB lookup, caches result with 300s TTL
  - Returns "free" as safe default on any error
  - `max` function (lines 165-183) calls `resolveTenantPlan()` with the tenant's ID
- **However**, `app.ts:143` registers the plugin without options: `await app.register(rateLimiterPlugin)`. No `redis` or `tenantPlanModel` is passed. This means `resolveTenantPlan()` will always return "free" because both dependencies are `undefined`. See NEW-001 below.

#### PERF-006: Dashboard route reads Redis cache first
**Status: VERIFIED**

- `dashboard.routes.ts:58-66` calls `readDashboardCache()` before computing live data
- On cache hit, returns cached payload immediately (lines 60-65)
- On cache miss, falls through to `service.getSummary()` (line 69)
- `readDashboardCache()` in `dashboard-cache.worker.ts:87-104` reads from Redis and parses JSON, returning null on miss or parse failure

#### PERF-001/PERF-011: Accrual worker uses batch insert
**Status: VERIFIED**

- `accrual.worker.ts:181-211` collects all ledger entries in a plain array without awaiting
- Single `deps.balanceLedgerModel.insertMany(entries)` call at line 215 (replaces serial per-employee inserts)
- Single audit log entry for the entire batch at lines 226-241 (action: `"balance.accrual_batch"`, metadata includes `employeeCount`)
- Reduces MongoDB round-trips from O(N) to O(1) for N employees

## New Issues Found During Re-review

### HIGH

#### [NEW-001]: Rate limiter plugin registered without Redis or TenantModel dependencies
- **File**: `leaveflow/apps/api/src/app.ts:143`
- **Issue**: The `rateLimiterPlugin` is registered as `await app.register(rateLimiterPlugin)` without passing `redis` or `tenantPlanModel` options. The plugin's `resolveTenantPlan()` function requires these dependencies to look up the tenant's plan. Without them, it always falls through to the default "free" plan (60 req/min), meaning the CR-007 fix is architecturally correct but not wired up.
- **Impact**: All tenants get the free-tier rate limit (60 req/min) regardless of their actual plan. Enterprise customers will be incorrectly throttled. This is the same end result as the original CR-007 issue, just caused by missing wiring rather than wrong logic.
- **Fix**: Pass dependencies when registering the plugin:
  ```typescript
  import { getRedisClient } from "./lib/redis.js";
  import { TenantModel } from "./models/index.js";
  // ...
  await app.register(rateLimiterPlugin, {
    redis: getRedisClient(),
    tenantPlanModel: TenantModel,
  });
  ```

### MEDIUM

#### [NEW-002]: Bot Teams invoke error response leaks internal error message
- **File**: `leaveflow/apps/api/src/modules/bot-teams/bot-teams.plugin.ts:170-175`
- **Issue**: When an invoke handler throws, the error message is passed directly to the response: `value: { code: "InternalServerError", message: msg }`. This may leak internal details (stack traces, database error messages) to the Teams client.
- **Impact**: Potential information disclosure via Teams bot error responses. Lower severity than web API leakage since the audience is limited to Teams users, but still a violation of SEC-006 principles.
- **Fix**: Return a generic error message: `message: "An error occurred processing your request"`. Log the real error (already done at line 166).

#### [NEW-003]: `findForCalendar` still performs client-side filtering (CR-013 still open)
- **File**: `leaveflow/apps/api/src/modules/leave-request/leave-request.service.ts:294-308`
- **Issue**: When `teamId` is provided, the service fetches up to 1000 results and filters in memory with `.filter()`. The resolved `employeeIds` are not passed to the database query. This was flagged as CR-013 (MEDIUM) in the original review and remains unfixed.
- **Impact**: Performance degrades linearly with leave request volume for team-scoped calendar queries. Acceptable for MVP but should be addressed before scaling.

## Previously Open MEDIUM Issues -- Status

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| CR-011 | Random system actor ID for escalations | Still open | Not addressed in 3b fixes. Low risk for MVP. |
| CR-012 | PaginationMeta type duplication | Still open | Cosmetic. |
| CR-013 | findForCalendar client-side filtering | Still open | See NEW-003 above. |
| CR-014 | No backfill job after calendar connect | Still open | UX gap, not a blocker. |
| CR-015 | displayName virtual missing from lean() | Still open | Can cause undefined in getMe response. |

## Checklist

- [x] Code matches implementation plan
- [x] All 16 CRITICAL+HIGH issues from initial review addressed in code
- [ ] Rate limiter wiring incomplete (NEW-001) -- plan resolution returns "free" for all tenants
- [x] Error handling comprehensive (generic 500 messages, detailed server-side logging)
- [x] No mutations (immutable patterns)
- [x] Input validation at boundaries (Zod schemas, type checks)
- [x] No hardcoded secrets (tokens encrypted, keys from env vars)
- [x] Naming is clear and consistent
- [x] Security fixes are correct (CSRF nonce, JWT validation, tenant scoping, approver verification)

## Verdict: NEEDS CHANGES (1 remaining issue)

**15 of 16 original issues are fully VERIFIED and correctly fixed.**

The rate limiter fix (CR-007) is architecturally correct in the plugin but not wired in `app.ts` (NEW-001). This is a **one-line fix** -- pass `redis` and `tenantPlanModel` when registering the plugin.

### Must Fix Before Merge
1. **NEW-001**: Wire `redis` and `tenantPlanModel` into `rateLimiterPlugin` registration in `app.ts`

### Should Fix (non-blocking)
1. **NEW-002**: Sanitize error messages in bot-teams invoke responses
2. **CR-013/NEW-003**: Move team calendar filtering to database query
3. **CR-011**: Use a fixed system actor ID for escalations
4. **CR-015**: Fix displayName virtual not appearing in lean queries
