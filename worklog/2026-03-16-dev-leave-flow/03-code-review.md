---
stage: "03-code-review"
agent: "code-reviewer"
model: "opus"
run_id: "2026-03-16-dev-leave-flow"
started: "2026-03-17T10:00:00Z"
finished: "2026-03-17T11:45:00Z"
tools_used: [Read, Grep, Glob, Bash]
parent_agent: "pipeline-orchestrator"
sub_agents_invoked: []
output_files:
  - worklog/runs/2026-03-16-dev-leave-flow/03-code-review.md
---

# Code Review: LeaveFlow MVP

## Summary

Comprehensive code review of the LeaveFlow MVP covering ~447 source files across the Fastify API (14 models, 13+ route modules, 6 BullMQ workers), Next.js web app (stores, hooks, components), and 4 shared packages (shared-types, validation, constants, bot-messages).

**Overall assessment**: The codebase demonstrates strong architectural foundations — proper multi-tenancy enforcement, immutable append-only ledger design, clean FSM for approval states, dependency injection throughout, and consistent use of the response envelope pattern. However, there are several critical and high-severity issues that must be addressed before production, primarily around security (OAuth tokens stored in plaintext, OAuth state parameter tampering, missing tenant scoping in calendar-sync), race conditions in balance checking, and incomplete route wiring in app.ts.

## Files Reviewed

| File / Area | Status | Issues |
|---|---|---|
| `lib/config.ts` | PASS | Clean, immutable config with validation |
| `lib/db.ts` | PASS | Proper retry logic and shutdown handlers |
| `lib/errors.ts` | PASS | Clean hierarchy, good HTTP mapping |
| `lib/redis.ts` | PASS | Lazy connect, proper cleanup |
| `lib/response.ts` | PASS | Consistent envelope pattern |
| `lib/pagination.ts` | PASS | Safe defaults, validation via Zod |
| `lib/firebase-admin.ts` | PASS | Proper init guard |
| `lib/logger.ts` | PASS | Env-aware log levels |
| `lib/bullmq.ts` | PASS | Typed queues, good defaults |
| `lib/tenant-scope.ts` | PASS | Immutable filter merge |
| `models/*.model.ts` (14 models) | PASS | Proper indexes, tenant guard plugin |
| `models/plugins/require-tenant-id.ts` | PASS | Defense-in-depth for multi-tenancy |
| `models/balance-ledger.model.ts` | PASS | Append-only enforcement excellent |
| `models/audit-log.model.ts` | PASS | Full immutability enforcement |
| `plugins/auth.plugin.ts` | PASS | Clean JWT verification |
| `plugins/tenant.plugin.ts` | PASS | Proper tenantId extraction |
| `plugins/error-handler.plugin.ts` | PASS | Comprehensive error mapping |
| `plugins/rate-limiter.plugin.ts` | NEEDS CHANGES | Plan inference from role is incorrect |
| `plugins/security.plugin.ts` | PASS | Good null byte sanitization |
| `modules/approval-engine/fsm.ts` | PASS | Clean FSM with terminal state handling |
| `modules/approval-engine/service.ts` | NEEDS CHANGES | See findings |
| `modules/approval-engine/routes.ts` | NEEDS CHANGES | approverName set to employeeId |
| `modules/leave-request/service.ts` | NEEDS CHANGES | Race condition in balance check |
| `modules/leave-request/routes.ts` | NEEDS CHANGES | Hardcoded dummy workflowId |
| `modules/leave-request/repository.ts` | PASS | Clean tenant scoping |
| `modules/auth/service.ts` | PASS | Proper Firebase + tenant creation |
| `modules/auth/routes.ts` | PASS | Clean handler factoring |
| `modules/balance/service.ts` | PASS | Correct append-only ledger use |
| `modules/balance/repository.ts` | PASS | Proper aggregation pipeline |
| `modules/employee/gdpr.ts` | PASS | GDPR pseudonymization |
| `modules/calendar-sync/routes.ts` | NEEDS CHANGES | Critical security issues |
| `modules/bot-adapter/bot-mapping.service.ts` | PASS | Correct cross-tenant resolution |
| `modules/bot-slack/commands.ts` | PASS | Good user resolution flow |
| `workers/escalation.worker.ts` | PASS | Correct guards and action resolution |
| `workers/accrual.worker.ts` | PASS | Clean probation handling |
| `workers/csv-import.worker.ts` | PASS | Good batch + progress reporting |
| `app.ts` | NEEDS CHANGES | Most routes not wired |
| `apps/web/stores/auth.store.ts` | PASS | Clean custom store implementation |
| `packages/validation/` | PASS | Comprehensive Zod schemas |
| `packages/shared-types/` | PASS | Good type definitions |
| `packages/constants/` | PASS | Proper constant exports |
| `packages/bot-messages/` | PASS | Platform-specific renderers |
| `approval-engine.test.ts` | PASS | Thorough FSM + service tests |

## Findings

### CRITICAL

#### [CR-001]: OAuth tokens stored in plaintext despite model claiming AES-256 encryption
- **File**: `leaveflow/apps/api/src/modules/calendar-sync/calendar-sync.routes.ts:228-238`
- **Issue**: The OAuthToken model comment says "Tokens are AES-256 encrypted before storage" and the schema fields are named `encryptedAccessToken` / `encryptedRefreshToken`. However, the calendar-sync routes store the raw tokens from the OAuth exchange directly into these fields without any encryption. The access token and refresh token are stored verbatim.
- **Impact**: If the database is compromised, all users' Google Calendar and Outlook calendar tokens are exposed in plaintext, violating NFR-3 (SOC 2) and the data model spec. An attacker can use refresh tokens to persistently access user calendars.
- **Fix**: Implement AES-256-GCM encryption using a key from environment config. Create `lib/crypto.ts` with `encrypt(plaintext: string): string` and `decrypt(ciphertext: string): string` functions. Apply encryption before storing and decryption before using tokens. The encryption key must be in env vars (e.g., `TOKEN_ENCRYPTION_KEY`).

#### [CR-002]: OAuth callback endpoints lack state verification — CSRF vulnerability
- **File**: `leaveflow/apps/api/src/modules/calendar-sync/calendar-sync.routes.ts:193-244`
- **Issue**: The OAuth callback endpoints (`/calendar-sync/google/callback`, `/calendar-sync/outlook/callback`) are marked `public: true` and parse the `state` parameter to extract `employeeId`. However, there is no server-side verification that this state was actually issued by the server. An attacker can craft a forged state with any `employeeId` and send a victim to the callback URL, linking the attacker's calendar tokens to the victim's account.
- **Impact**: Account takeover — an attacker can link their Google/Outlook calendar to any employee, then receive all OOO event details for that employee. This violates the OAuth security model (RFC 6749 Section 10.12).
- **Fix**: Generate a cryptographically random `state` token, store it in Redis with a short TTL (e.g., 10 minutes) keyed by the value and associated with the authenticated `employeeId`. On callback, validate that the `state` exists in Redis and matches the expected `employeeId`. Delete the state after use (one-time use).

#### [CR-003]: Calendar-sync queries bypass tenant scoping
- **File**: `leaveflow/apps/api/src/modules/calendar-sync/calendar-sync.routes.ts:321-333` and `:352-355`
- **Issue**: The `GET /calendar-sync/status` and `DELETE /calendar-sync/:provider` routes query the `OAuthTokenModel` using only `employeeId` without including `tenantId`. The OAuthToken model has `requireTenantIdPlugin` applied, so these queries will throw at runtime ("Query is missing required tenantId filter"). This means the status and disconnect features are completely broken.
- **Impact**: The calendar sync status endpoint and disconnect endpoint are non-functional. Users cannot check connection status or disconnect calendar integrations.
- **Fix**: Include `tenantId` from `request.auth!.tenantId` in all OAuthTokenModel queries. For example: `OAuthTokenModel.find({ tenantId, employeeId, isActive: true })`.

#### [CR-004]: Callback routes also bypass tenant scoping on OAuth token upsert
- **File**: `leaveflow/apps/api/src/modules/calendar-sync/calendar-sync.routes.ts:221-239` and `:288-307`
- **Issue**: The OAuth callback upserts use `findOneAndUpdate` with filter `{ employeeId: state.employeeId, service: "google_calendar" }` — no `tenantId`. Since the OAuthTokenModel has `requireTenantIdPlugin`, these upserts will also throw. The `tenantId` is not even available in the state parameter, making the callback fundamentally broken.
- **Impact**: OAuth callbacks will crash with the tenant guard error. Users cannot complete calendar connection setup.
- **Fix**: Include `tenantId` in the OAuth state parameter during the connect step (from `request.auth!.tenantId`). Parse it in the callback and use it in the upsert filter. Also pass `tenantId` as a `$setOnInsert` field.

### HIGH

#### [CR-005]: Race condition in balance check during leave request creation
- **File**: `leaveflow/apps/api/src/modules/leave-request/leave-request.service.ts:91-102`
- **Issue**: The balance check (`checkSufficientBalance`) and the document creation are not atomic. Two concurrent leave requests for the same employee + leave type could both pass the balance check but together exceed the available balance. The balance deduction only happens later when the request is approved, but by then both requests may have been created.
- **Impact**: Employees can submit multiple concurrent requests that together exceed their balance. When both are approved, the balance goes negative. For a leave management SaaS, this is a core business logic failure.
- **Fix**: Either (a) use MongoDB transactions to atomically check balance and create the request, or (b) introduce a pessimistic lock using Redis (e.g., `SETNX` on `lock:balance:{tenantId}:{employeeId}:{leaveTypeId}`) with a short TTL. Option (b) is simpler for an MVP. The deduction on approval should also verify balance again.

#### [CR-006]: Hardcoded dummy workflowId in leave request routes
- **File**: `leaveflow/apps/api/src/modules/leave-request/leave-request.routes.ts:128, 226`
- **Issue**: Both the validate and create endpoints pass `workflowId: new mongoose.Types.ObjectId()` — a randomly generated, non-existent ObjectId. The service's `requireWorkflow` method will always throw "Workflow not found or inactive" because no workflow with this random ID exists. This means the leave request creation endpoint is completely non-functional.
- **Impact**: No leave requests can be created through the API. This blocks the core user flow (FR-1.2, LF-011, LF-018). The validate endpoint is also broken.
- **Fix**: Resolve the workflowId from the employee's team configuration. The Team model should have a `workflowId` field. The route should: (1) look up the employee's team, (2) get the team's assigned workflow, (3) pass that workflowId. Alternatively, accept `workflowId` as an optional field in the request body and fall back to the team's default workflow.

#### [CR-007]: Rate limiter infers plan from role instead of tenant plan
- **File**: `leaveflow/apps/api/src/plugins/rate-limiter.plugin.ts:87-93`
- **Issue**: The `extractPlanFromRole` function maps roles to plans (e.g., `company_admin` -> `enterprise`). This is fundamentally wrong: a `company_admin` on a free tier should get free-tier limits, and an `employee` on an enterprise tier should get enterprise limits. The rate limit is a tenant-level property, not a role-level one.
- **Impact**: Free-tier companies with a `company_admin` get enterprise-level (1200/min) rate limits, circumventing the plan enforcement. Enterprise companies' regular employees get throttled at free-tier levels (60/min), causing poor UX.
- **Fix**: Look up the tenant's plan from the database (cached in Redis for performance). The auth plugin or tenant plugin should attach the tenant's plan to the request context. Use `request.tenantPlan` instead of role-based inference.

#### [CR-008]: Most API routes are not wired in app.ts
- **File**: `leaveflow/apps/api/src/app.ts:72-80`
- **Issue**: The `buildApp` function only registers health, dashboard, calendar, audit, holidays, and notifications modules. The critical routes are commented out: auth, onboarding, approval, employee, team, leave-type, workflow, leave-request, balance, tenant, billing, and bot webhooks. This means the API is largely non-functional.
- **Impact**: The API can only serve health checks and a few read-only endpoints. All write operations (registration, leave requests, approvals, team management) are unreachable. This is expected for an in-progress implementation but must be completed before any form of testing.
- **Fix**: Wire all route modules by injecting their service dependencies. Use a dependency container or manual wiring in `buildApp`. At minimum, auth routes, leave-request routes, approval routes, employee routes, and team routes must be wired for the MVP to function.

#### [CR-009]: FSM allows cancelling `approved` but not `auto_approved` leave requests
- **File**: `leaveflow/apps/api/src/modules/approval-engine/approval-engine.fsm.ts:43-84`
- **Issue**: The transition table allows `approved -> cancelled` (via cancel action) but does not include `auto_approved -> cancelled`. Per the product spec (FR-1.7), employees should be able to cancel approved future requests. Since `auto_approved` is functionally equivalent to `approved` from the user's perspective, this is an inconsistency.
- **Impact**: Employees whose requests were auto-approved cannot cancel them. They must ask HR to force-cancel. This contradicts the "cancel pending or approved future requests" requirement.
- **Fix**: Add `{ from: "auto_approved", action: "cancel", to: "cancelled" }` to the TRANSITIONS array. Also remove `auto_approved` from the TERMINAL_STATES set. Update the test suite to cover this transition.

#### [CR-010]: Approval routes pass employeeId as approverName
- **File**: `leaveflow/apps/api/src/modules/approval-engine/approval.routes.ts:59, 85, 115`
- **Issue**: In all three handler factories (`makeApproveHandler`, `makeRejectHandler`, `makeForceApproveHandler`), the `approverName` is set to `employeeId` (a MongoDB ObjectId string). The approval history entry will record an ObjectId like `64f2a1b3c4d5e6f7a8b9c0d1` as the actor's name, which is displayed in the approval journey UI and bot messages.
- **Impact**: Users see cryptic ObjectId strings instead of human names in approval history. The bot's status command also renders these ObjectIds.
- **Fix**: Resolve the employee's display name from the database. Either pass the employee service as a dependency and look up the name, or attach the display name to the auth payload in the auth plugin.

### MEDIUM

#### [CR-011]: Escalation worker creates a random ObjectId as system actor
- **File**: `leaveflow/apps/api/src/modules/approval-engine/approval-engine.service.ts:305`
- **Issue**: `processEscalation` creates `actorId: new mongoose.Types.ObjectId()` — a new random ID on every escalation. This means every escalation produces a different system actor ID in the approval history, making it impossible to query or audit all system escalations.
- **Impact**: The audit trail cannot reliably filter escalation actions by actor. System-triggered actions appear as if done by different actors each time.
- **Fix**: Use a fixed, well-known constant ObjectId for the system actor (e.g., `new mongoose.Types.ObjectId("000000000000000000000000")`). Define it as `SYSTEM_ACTOR_ID` in a constants file.

#### [CR-012]: `PaginationMeta` type defined in two places
- **File**: `leaveflow/apps/api/src/lib/response.ts:15-22` and `leaveflow/apps/api/src/lib/pagination.ts:22-28`
- **Issue**: The `PaginationMeta` interface is defined identically in both `response.ts` and `pagination.ts`. This duplication risks divergence as changes to one might not be reflected in the other.
- **Impact**: Maintenance burden. If pagination meta shape changes, two files must be updated in sync.
- **Fix**: Export `PaginationMeta` from one file (pagination.ts) and import it in the other.

#### [CR-013]: `findForCalendar` does client-side filtering instead of database query
- **File**: `leaveflow/apps/api/src/modules/leave-request/leave-request.service.ts:274-288`
- **Issue**: When `teamId` is provided, the service fetches up to 1000 results from the database and then filters in memory using `.filter()`. This defeats the purpose of database indexing and will not scale with large tenants.
- **Impact**: Performance degrades linearly with the number of leave requests. For a 500-employee company with years of history, this could return and filter thousands of records.
- **Fix**: Pass the resolved `employeeIds` to the repository and use a `$in` filter in the database query. Add an `employeeIds` filter option to `LeaveRequestFilters`.

#### [CR-014]: Notification worker missing from calendar-sync callback
- **File**: `leaveflow/apps/api/src/modules/calendar-sync/calendar-sync.routes.ts`
- **Issue**: After a successful OAuth token exchange, no notification or BullMQ job is queued to create calendar events for existing approved leave requests. A user who connects their calendar will only get events for future approvals, not past ones.
- **Impact**: Users who connect their calendar after having approved leave will not see those events synced. This is a UX gap noted in the spec (LF-060, LF-061).
- **Fix**: After successful token storage, queue a `calendar-sync` BullMQ job to backfill calendar events for all currently approved leave requests for that employee.

#### [CR-015]: `displayName` is a virtual in Employee model but schema declares it as string property
- **File**: `leaveflow/apps/api/src/models/employee.model.ts:20, 43, 85-87`
- **Issue**: The `IEmployee` interface declares `displayName: string` as a regular property, and the schema comment says "displayName is a virtual". However, the virtual is defined after the schema but the property is not actually in the schema fields — this means `.lean()` calls will NOT include `displayName` since Mongoose virtuals are not included in lean results by default.
- **Impact**: Any code using `.lean()` on EmployeeModel (which most repository methods do for performance) will get `undefined` for `displayName`. The `getMe` response depends on this field.
- **Fix**: Either (a) make `displayName` a stored field populated via pre-save middleware, or (b) ensure lean queries include virtuals by adding `{ virtuals: true }` to lean options, or (c) compute `displayName` in the service/DTO layer instead of relying on the virtual.

#### [CR-016]: `leaveflow/apps/api/src/app.ts` missing security plugin and rate limiter plugin
- **File**: `leaveflow/apps/api/src/app.ts:46-51`
- **Issue**: The `buildApp` function registers cors, error handler, auth, and tenant plugins, but does not register the `securityPlugin` or `rateLimiterPlugin`. These plugins exist and are fully implemented but never activated.
- **Impact**: No HTTP security headers (Helmet), no request size limits, no input sanitization, and no rate limiting in the running application. All the security and rate limiting code is dead.
- **Fix**: Add `await app.register(securityPlugin);` and `await app.register(rateLimiterPlugin, { redis: getRedisClient() });` to the plugin registration chain.

### LOW

#### [CR-017]: `console.log/warn/error` used instead of logger in workers and db.ts
- **File**: `leaveflow/apps/api/src/lib/db.ts:44-45`, `leaveflow/apps/api/src/workers/escalation.worker.ts:96`, `leaveflow/apps/api/src/workers/accrual.worker.ts:140-142`
- **Issue**: Several files use `console.log/warn/error` for logging instead of the pino `logger` singleton exported from `lib/logger.ts`. This means these logs are not structured and will not be captured by log aggregation services in production.
- **Impact**: Reduced observability in production. Worker logs are invisible to log aggregation.
- **Fix**: Import `logger` from `lib/logger.ts` and replace `console.*` calls with `logger.info/warn/error`.

#### [CR-018]: Some test files use `async` in `it` callbacks for sync assertions
- **File**: `leaveflow/apps/api/src/modules/approval-engine/approval-engine.test.ts:474, 506, 533, 559`
- **Issue**: The `checkAutoApproval` tests use `async` in their `it` callbacks even though `checkAutoApproval` is a synchronous method. This is harmless but adds unnecessary overhead.
- **Impact**: None functional. Slight style inconsistency.
- **Fix**: Remove `async` from `it` callbacks that don't use `await`.

#### [CR-019]: Bot Slack commands import uses deep relative path to package
- **File**: `leaveflow/apps/api/src/modules/bot-slack/bot-slack.commands.ts:17`
- **Issue**: The import `from "../../../../../packages/bot-messages/src/slack/block-kit.renderer.js"` uses a deeply nested relative path. This should use the monorepo package alias `@leaveflow/bot-messages`.
- **Impact**: Fragile import that breaks on any directory restructuring. Also violates the monorepo package boundary convention.
- **Fix**: Import via `from "@leaveflow/bot-messages"` or the specific subpath export if configured in the package.json exports field.

#### [CR-020]: Tenant slug may collide if two companies register with very similar names
- **File**: `leaveflow/apps/api/src/modules/auth/auth.service.ts:123-124`
- **Issue**: The slug is generated as `${baseSlug}-${firebaseUser.uid.slice(0, 6)}`. With only 6 chars of the Firebase UID for uniqueness, collisions are possible though unlikely. The database has a unique constraint so it would fail cleanly, but the error message would be confusing.
- **Impact**: Rare edge case. Registration would fail with a MongoDB duplicate key error instead of a friendly message.
- **Fix**: Add retry logic (regenerate with more UID chars on conflict) or use a longer suffix. Alternatively, catch the duplicate key error and retry with a different slug.

## Checklist

- [x] Code matches implementation plan (monorepo structure, module organization, 14 models, workers)
- [ ] Tests present and passing (approval-engine well-tested; many modules lack tests; route tests exist but not for all modules)
- [x] Error handling comprehensive (AppError hierarchy, error handler plugin, ZodError handling)
- [x] No mutations (immutable patterns) (Object.freeze on responses, ledger/audit append-only, tenant-scope immutable merge)
- [x] Input validation at boundaries (Zod schemas in validation package, schema parsing in routes)
- [ ] No hardcoded secrets or values (OAuth tokens stored unencrypted = CR-001)
- [ ] No unnecessary scope creep (implementation aligns with MVP spec)
- [x] Naming is clear and consistent (kebab-case files, camelCase JSON, snake_case enums)

## Verdict: NEEDS CHANGES

The codebase has a strong architectural foundation but has **4 CRITICAL** and **6 HIGH** issues that must be resolved before the MVP can be considered functional or secure.

### Must Fix (Blocks Merge)

1. **CR-001**: Encrypt OAuth tokens before storage
2. **CR-002**: Add server-side OAuth state verification
3. **CR-003 + CR-004**: Fix tenant scoping in all calendar-sync OAuthToken queries
4. **CR-006**: Wire workflowId resolution from employee's team (or accept in request body)
5. **CR-008**: Wire remaining route modules in app.ts
6. **CR-009**: Allow cancellation of auto_approved requests
7. **CR-016**: Register security and rate limiter plugins in app.ts

### Should Fix (Before Launch)

1. **CR-005**: Add balance check locking to prevent race conditions
2. **CR-007**: Fix rate limit plan inference (read from tenant, not role)
3. **CR-010**: Resolve approver display name instead of passing employeeId
4. **CR-011**: Use a fixed system actor ID for escalations
5. **CR-013**: Move team calendar filtering to database query
6. **CR-015**: Fix displayName virtual not appearing in lean queries

### Next Steps

1. Address all CRITICAL findings first (security issues in calendar-sync)
2. Wire remaining routes in app.ts to make the API functional
3. Fix HIGH issues (workflowId resolution, FSM gap, rate limiter)
4. Run full test suite to verify no regressions
5. Add integration tests for the approval flow end-to-end
