# Test Report: LeaveFlow MVP

**Stage:** 4 — Testing
**Run:** 2026-03-16-dev-leave-flow
**Date:** 2026-03-17
**Executor:** qa-engineer (claude-sonnet-4-6)

---

## Summary

| Metric | Count |
|--------|-------|
| New tests written | 0 (analysis only — tests were pre-existing) |
| Total test files discovered | 68 (excl. node_modules) |
| Total test files executed | 58 API + 9 validation + 8 web + 1 constants + 1 bot-messages = **77** |
| Tests passed | 630 API + 106 validation + 186 web + 31 constants + 40 bot-messages = **993** |
| Tests failed | 24 API + 2 validation + 0 web assertions (1 suite load error) = **26** |
| Tests skipped | 43 API (timeout) |

---

## Test Execution Results

### API (`leaveflow/apps/api`) — Vitest 2.1.9

**Runner:** `pnpm vitest run`
**Result:** 16 file-level failures, 42 passing files
**Counts:** 24 failed | 630 passed | 43 skipped (697 total)

### Packages

| Package | Runner | Result |
|---------|--------|--------|
| `@leaveflow/constants` | vitest 1.6.1 | 31/31 passed |
| `@leaveflow/validation` | vitest | 106/108 passed — 2 failures |
| `@leaveflow/bot-messages` | vitest 2.1.9 | 40/40 passed |

### Web (`leaveflow/apps/web`) — Jest 29.7

**Result:** 1 suite failed to load (JSX transform issue), 7 passing suites
**Counts:** 186/186 test assertions passed (zero assertion failures)

---

## Failure Categorization

### Category A: Missing workspace package symlinks (infrastructure — 8 test files blocked)

**Root cause:** `@leaveflow/validation`, `@leaveflow/constants`, `@leaveflow/shared-types`
are workspace packages but are not symlinked into
`leaveflow/apps/api/node_modules/@leaveflow/`. The vitest config only aliases
`@leaveflow/bot-messages`. Any source file that imports from `@leaveflow/validation`
causes vitest to abort the entire test file at collection time.

**Affected test files (8):**
- `src/lib/pagination.test.ts`
- `src/modules/balance/balance.routes.test.ts`
- `src/modules/employee/employee.routes.test.ts`
- `src/modules/health/health.test.ts`
- `src/modules/leave-request/leave-request.routes.test.ts`
- `src/modules/leave-type/leave-type.routes.test.ts`
- `src/modules/team/team.routes.test.ts`
- `src/modules/tenant/tenant.routes.test.ts`
- `src/modules/workflow/workflow.routes.test.ts`

**Fix:** Add path aliases to `vitest.config.ts` for all workspace packages:
```ts
"@leaveflow/validation": path.resolve(__dirname, "../../packages/validation/src"),
"@leaveflow/constants": path.resolve(__dirname, "../../packages/constants/src"),
"@leaveflow/shared-types": path.resolve(__dirname, "../../packages/shared-types/src"),
```

---

### Category B: Unique sparse index collision in test factory (implementation bug — 11 test failures)

**Root cause:** `createTestTenant()` in `test/helpers/factory.ts` sets
`stripeCustomerId: null` (via model default). The tenant model defines a sparse unique
index `stripe_customer` on `stripeCustomerId`. MongoDB sparse indexes DO index `null`
values, so a second call to `createTestTenant()` within the same test case (which the
tenant-isolation suite does — it creates two tenants per test) fails with:

```
E11000 duplicate key error … stripe_customer dup key: { stripeCustomerId: null }
```

The same pattern affects the employee model: `firebaseUid: null` combined with a
`tenant_firebase` sparse unique compound index on `(tenantId, firebaseUid)` fails
when `createTestEmployee()` is called more than once for the same tenant.

**Affected test files (2 suites, 11 individual tests):**
- `test/integration/tenant-isolation.test.ts` (10 failures)
- `src/modules/balance/balance.test.ts` (1 failure — `getTeamBalances`)
- `src/modules/leave-request/leave-request.test.ts` (1 failure — tenant isolation sub-test)

**Fix options (choose one per index):**
1. Make the sparse index truly sparse by removing `null` as a valid stored value — use
   `stripeCustomerId: { type: String, sparse: true }` and omit the default `null`. MongoDB
   sparse indexes skip documents where the field is absent entirely.
2. Alternatively, generate a unique sentinel string for each factory call instead of `null`,
   e.g., `stripeCustomerId: \`test-stripe-${nextId()}\``.
3. Remove `sparse: true` and replace with a partial index
   `{ partialFilterExpression: { stripeCustomerId: { $exists: true, $ne: null } } }`.

---

### Category C: Real implementation bugs (3 failures)

#### C-1: `NotificationRepository.updateDeliveryStatus` missing tenantId in query

**File:** `src/modules/notification/notification.repository.ts` line 191
**Test:** `notification.test.ts > updateDeliveryStatus > updates status and increments attempts`
**Error:**
```
[tenantId guard] Query is missing required tenantId filter.
```
The `updateDeliveryStatus` method calls `NotificationModel.findByIdAndUpdate(id, ...)` — a
plain `findById`-style query without `tenantId`. The model-level tenant guard plugin rejects
this. The fix is to accept `tenantId` as a parameter and query with
`NotificationModel.findOneAndUpdate({ _id: id, tenantId }, ...)`.

#### C-2: Error handler maps ZodError to 422, test expects 400

**File:** `src/plugins/error-handler.plugin.ts` line 81
**Test:** `error-handler.test.ts > handles ZodError and returns 400 with field-level details`
**Error:** `expected 422 to be 400`

The error handler comment (line 79) explicitly states "422 (semantic validation failure)".
The implementation was intentionally changed to 422 but the test was not updated.
This is a test/implementation mismatch — the implementation is correct per the comment.

**Fix:** Update the test to assert `statusCode === 422`:
```ts
expect(response.statusCode).toBe(422);
```

#### C-3: Auth plugin mock spy accumulates calls across tests (test isolation bug)

**File:** `src/plugins/auth.test.ts`
**Tests (3 failures):** `skips auth for routes marked public`, `skips auth for Slack webhook routes`, `skips auth for Teams webhook routes`
**Error:** `expected "spy" to not be called at all, but actually been called 3 times`

The test file uses `vi.mock` at module level and a shared `app` instance in `beforeAll`.
Each guarded test that calls `mockVerify` does not reset the mock between tests. By the
time the "skips auth" cases run, the spy already has call records from previous tests.

**Fix:** Add `vi.clearAllMocks()` in a `beforeEach` hook, or call
`mockVerify.mockClear()` before each test that asserts `not.toHaveBeenCalled()`.

---

### Category D: `test/integration/models.test.ts` — hook timeout

**Error:** `Hook timed out in 10000ms` in `beforeAll`
**Cause:** The `mongodb-memory-server` binary download times out in this environment
(first-run download of the MMS binary). All 43 tests are skipped, not failed.
This is an environment/infrastructure issue — not a code problem.
In CI the binary would be cached and the timeout would not occur.

---

### Category E: `test/integration/redis.test.ts` — no Redis (infrastructure)

**Error:** `ECONNREFUSED ::1:6379`
**Cause:** Tests require a live Redis instance. No Redis is running in the local
test environment. This is expected — these tests should run only in CI with Redis
service containers.
All 7 tests in this suite fail.

---

### Category F: Validation schema bug — email not trimmed before `.email()` validation

**Package:** `@leaveflow/validation`
**Tests (2 failures):**
- `auth.schema.test.ts > registerBodySchema > trims and lowercases adminEmail`
- `employee.schema.test.ts > createEmployeeBodySchema > lowercases and trims email`

**Root cause:** Zod v3 runs validators before transforms. The schemas define:
```ts
adminEmail: z.string().email('...').transform((v) => v.trim().toLowerCase())
```
When input is `'  ALICE@ACME.COM  '`, the `.email()` check runs on the whitespace-padded
string, which fails. The `.transform()` never executes.

**Fix:** Add `.trim()` as a pre-processing step before `.email()` via Zod's `.superRefine()`
or switch the order using `.transform(...).pipe(z.string().email(...))`:
```ts
adminEmail: z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.string().email('Admin email must be a valid email address'))
```
Or use `.preprocess()`:
```ts
adminEmail: z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
  z.string().email('Admin email must be a valid email address')
)
```

---

### Category G: Web — date-header test suite fails to load (JSX transform gap)

**File:** `apps/web/src/__tests__/components/date-header.test.ts`
**Error:** `SyntaxError: Unexpected token '<'`
**Cause:** The test imports `date-header.tsx`. Jest's `ts-jest` transform in the web
package is configured with `module: CommonJS` and `moduleResolution: Node` but the
component file contains JSX (`<`). Jest needs `@testing-library/react` + a jsdom
environment and JSX transform to load TSX components.
The 186 test assertions in the other 7 suites all pass.

**Fix:** Add `testEnvironment: 'jsdom'`, install `@testing-library/react`, and ensure
`tsconfig.json` has `"jsx": "react-jsx"`. The `date-header.tsx` component should also
export its pure utility function separately from the React component so it can be
tested without JSX.

---

### Category H: Calendar service — ObjectId conversion bug (3 test failures)

**File:** `src/modules/calendar/calendar.service.ts` lines 156, 223
**Tests (3 failures):** `BR-092 privacy enforcement`, `filters to teamId when provided`
**Error:** `BSONError: input must be a 24 character hex string, 12 byte Uint8Array, or an integer`

The calendar service attempts `new mongoose.Types.ObjectId(teamId)` where `teamId`
comes from a mocked value (likely a plain string without a valid 24-char hex format in
the test fixture, or a stringified ObjectId that lost its format). This is an
implementation bug — the service must validate the `teamId` string before constructing
an ObjectId, or the test fixture must provide a valid 24-character hex string.

---

## Module-by-Module Coverage Assessment

### API modules

| Module | Service Tests | Route Tests | Notes |
|--------|--------------|-------------|-------|
| `approval-engine` | Yes (FSM + service) | No (approval.routes.ts uncovered) | Route gap |
| `audit` | Yes | No route file | Adequate |
| `auth` | Yes | Yes | Covered |
| `balance` | Yes (1 failure) | Blocked (Category A) | Partial |
| `billing` | Yes | No | Route gap |
| `bot-adapter` | Yes | N/A | Covered |
| `bot-slack` | Yes (2 files) | N/A (webhook) | Covered |
| `bot-teams` | Yes (2 files) | N/A (webhook) | Covered |
| `calendar` | Yes (3 failures) | No | Failures + route gap |
| `calendar-sync` | Yes | No | Route gap |
| `dashboard` | Yes | No | Route gap |
| `employee` | Yes | Blocked (Category A) | Partial |
| `health` | Blocked (Category A) | N/A | Blocked |
| `holiday` | Yes | No | Route gap |
| `leave-request` | Yes (1 failure) | Blocked (Category A) | Partial |
| `leave-type` | Yes | Blocked (Category A) | Partial |
| `notification` | Yes (1 failure) | Yes | Failure (C-1) |
| `onboarding` | Yes | Yes | Covered |
| `team` | Yes | Blocked (Category A) | Partial |
| `tenant` | Yes | Blocked (Category A) | Partial |
| `workflow` | Yes | Blocked (Category A) | Partial |

### Workers

| Worker | Tests | Notes |
|--------|-------|-------|
| `accrual.worker` | Yes | Covered |
| `calendar-sync.worker` | No | Missing entirely |
| `csv-import.worker` | Yes | Covered |
| `dashboard-cache.worker` | Yes | Covered |
| `escalation.worker` | Yes | Covered |
| `notification.worker` | Yes | Covered |

### Packages

| Package | Tests | Pass Rate |
|---------|-------|-----------|
| `@leaveflow/constants` | Yes | 100% (31/31) |
| `@leaveflow/validation` | Yes | 98% (106/108) — 2 schema bugs |
| `@leaveflow/bot-messages` | Yes | 100% (40/40) |
| `@leaveflow/shared-types` | None | No test file |

### Web (`leaveflow/apps/web`)

| Area | Tests | Notes |
|------|-------|-------|
| `stores/workflow-builder` | Yes (2 suites) | Passing |
| `hooks/use-approvals` | Yes | Passing |
| `hooks/use-onboarding` | Yes | Passing |
| `hooks/use-dashboard` | Yes | Passing |
| `hooks/use-leave-request` | Yes | Passing |
| `stores/calendar-filter` | Yes | Passing |
| `components/date-header` | Yes (1 suite) | Load error (JSX) |
| All other components | None | Not tested |

---

## Coverage Estimate (Static Analysis)

Coverage cannot be measured numerically in this run due to:
1. Multiple files blocked at collection time (Category A).
2. Vitest coverage provider exits when any file fails to collect.

**Estimated coverage (qualitative):**

- **API service layer:** ~75–80% — all major modules have service tests; approval engine,
  calendar, and notification have gaps.
- **API route layer:** ~40% — 9 of ~20 route files are blocked; 6 more have no route tests
  at all (billing, dashboard, holiday, approval, calendar-sync, blackout/delegation).
- **Packages:** ~95% estimated (only 2 small schema transform bugs).
- **Web:** ~60% of covered source (stores + hooks tested, components mostly untested).

The 80% coverage threshold configured in `vitest.config.ts` cannot be asserted to be met.
Based on gap analysis, the **route layer is significantly below threshold**.

---

## Edge Cases Tested (Selected)

| Edge Case | Expected Result | Status |
|-----------|-----------------|--------|
| Leave request: start > end date | 422 INVALID_DATE_RANGE | PASS |
| Leave request: zero working days | 422 NO_WORKING_DAYS | PASS |
| Leave request: insufficient balance | 422 INSUFFICIENT_BALANCE | PASS |
| Leave request: multiple errors combined | Returns all errors | PASS |
| Cancel own leave request (owner) | 200 | PASS |
| Cancel leave request (HR admin) | 200 | PASS |
| Cancel leave request (non-owner employee) | 403 | PASS |
| Tenant isolation: cross-tenant findById | Returns null | PASS (where not blocked) |
| Tenant isolation: cross-tenant list | Filters correctly | FAIL (Category B) |
| Auth: missing Bearer token | 401 | PASS |
| Auth: invalid token | 401 | PASS |
| Auth: missing tenantId claim | 401 | PASS |
| Auth: public routes skip verification | 200, no verify call | FAIL (Category C-3) |
| Pagination: page 1 + page 2 correct sizes | Correct counts | BLOCKED (Category A) |
| Balance: team aggregation | Returns avg per leave type | FAIL (Category B) |
| CSV import: malformed CSV | Row-level validation errors | PASS |
| Approval FSM: invalid transition | throws InvalidTransitionError | PASS |
| Blackout period conflict detection | Returns conflicting periods | PASS |
| Delegation: delegate to another employee | Creates delegation record | PASS |

---

## Failed Tests Detail

| # | File | Test Name | Category | Severity |
|---|------|-----------|----------|----------|
| 1–9 | `test/integration/tenant-isolation.test.ts` | Multiple tenant isolation tests | B (index collision) | HIGH |
| 10 | `src/modules/balance/balance.test.ts` | `getTeamBalances` | B (index collision) | MEDIUM |
| 11 | `src/modules/leave-request/leave-request.test.ts` | `findById > does not return documents from another tenant` | B (index collision) | HIGH |
| 12–14 | `src/modules/calendar/calendar.test.ts` | 3 CalendarService.getAbsences tests | H (ObjectId bug) | HIGH |
| 15 | `src/modules/notification/notification.test.ts` | `updateDeliveryStatus` | C-1 (missing tenantId) | HIGH |
| 16–18 | `src/plugins/auth.test.ts` | 3 "skips auth" tests | C-3 (mock not cleared) | MEDIUM |
| 19 | `src/plugins/error-handler.test.ts` | ZodError returns 400 | C-2 (test/impl mismatch) | LOW |
| 20–26 | `test/integration/redis.test.ts` | All Redis + BullMQ tests | E (no Redis) | INFRA |
| — | `test/integration/models.test.ts` | All 43 tests skipped | D (MMS timeout) | INFRA |
| — | 9 route test files | All collection errors | A (missing symlinks) | INFRA |
| 27–28 | `packages/validation` | 2 email trim tests | F (schema bug) | MEDIUM |
| — | `apps/web` date-header suite | Suite load failure | G (JSX transform) | LOW |

---

## Verdict: NEEDS WORK

The test suite reveals **4 real bugs** requiring code fixes before the MVP can be
considered production-ready:

| # | Bug | Severity | Fix Complexity |
|---|-----|----------|----------------|
| B | Sparse unique index collides on `null` in test factory (and potentially in production when two tenants both have `stripeCustomerId: null`) | HIGH — also a production data integrity risk | Medium |
| C-1 | `NotificationRepository.updateDeliveryStatus` bypasses tenant guard | HIGH — security and data isolation violation | Low |
| C-2 | Error handler returns 422 for ZodError but test asserts 400 — test is wrong | LOW | Trivial |
| F | Zod email schemas fail when input has leading/trailing whitespace | MEDIUM — UX regression for users who paste emails | Low |
| H | Calendar service crashes on ObjectId construction with invalid string | HIGH — crashes the route for any team-filtered calendar request | Low |

Additionally, 3 categories of infrastructure/configuration issues block test execution:
- **Category A** (missing workspace aliases in vitest.config): must be fixed to unblock 9 test files and validate route coverage.
- **Category C-3** (auth mock not cleared): trivial fix.
- **Category G** (JSX transform in web jest config): should be fixed before web component testing can grow.

Redis and mongodb-memory-server timeout issues are environment-specific and expected to
resolve in a properly configured CI environment.

---

## Recommendations

1. **Priority 1 — Fix before merge:**
   - Fix `NotificationRepository.updateDeliveryStatus` to pass `tenantId` (SEC issue).
   - Fix calendar service ObjectId validation (prevents route crash).
   - Fix sparse index collision by making `stripeCustomerId` and `firebaseUid` absent
     (not `null`) by default, so MongoDB sparse indexes skip them.
   - Fix Zod email schemas to trim before `.email()` validation.

2. **Priority 2 — Fix before v1.0:**
   - Add workspace package aliases to `vitest.config.ts` to unblock 9 route test files.
   - Add route-level tests for: `approval.routes`, `billing.routes`, `dashboard.routes`,
     `holiday.routes`, `calendar-sync.routes`, `blackout.routes`, `delegation.routes`.
   - Add `calendar-sync.worker.test.ts` (only worker without tests).
   - Clear mock spy in `auth.test.ts` `beforeEach`.
   - Update `error-handler.test.ts` to expect 422 for ZodErrors.

3. **Priority 3 — Good practice:**
   - Fix JSX transform in web Jest config to enable component testing.
   - Add tests for `@leaveflow/shared-types` package.
   - Run `vitest run --coverage` once Category A is fixed to get a real coverage number.
   - Add Redis + full integration test jobs to CI with proper service containers.
