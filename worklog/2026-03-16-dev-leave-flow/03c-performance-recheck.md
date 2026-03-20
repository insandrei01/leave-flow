---
stage: "03c-performance-recheck"
agent: "performance-engineer"
model: "sonnet"
run_id: "2026-03-16-dev-leave-flow"
started: "2026-03-17T10:45:00Z"
finished: "2026-03-17T11:00:00Z"
tools_used: [Read, Glob, Grep, Bash]
parent_agent: "pipeline-orchestrator"
sub_agents_invoked: []
output_files:
  - worklog/runs/2026-03-16-dev-leave-flow/03c-performance-recheck.md
attempt: 2
---

# Performance Re-Review: LeaveFlow MVP (Stage 3b Fixes Verification)

This report verifies the three issues that were reported as fixed in Stage 3b and documents
the current status of the two P1 issues that were not addressed in that patch.

---

## Fixed Issues — Verification

### PERF-006: Dashboard Route — Redis Cache Read Path

**Status: VERIFIED**

File reviewed: `leaveflow/apps/api/src/modules/dashboard/dashboard.routes.ts`

The route handler now correctly implements the cache-aside pattern:

1. On entry it imports `readDashboardCache` from `dashboard-cache.worker.ts` and calls it
   with the tenant's ID and an injected Redis client (line 58).
2. On cache hit (`cached !== null`) it returns the serialized payload immediately without
   touching MongoDB (lines 59–66).
3. On cache miss it falls through to `service.getSummary(tenantId)` for a live computation
   (lines 68–74).

The Redis client is obtained via `getRedisClient()` at route registration time — a singleton
reference — so no new connection is opened per request.

No new performance issues introduced by this fix.

---

### PERF-008: OAuth Token Encryption

**Status: VERIFIED**

File reviewed: `leaveflow/apps/api/src/modules/calendar-sync/calendar-sync.routes.ts`

Both the Google OAuth callback (line 280–281) and the Outlook OAuth callback (line 342–343)
now call `encrypt(tokens.accessToken)` and `encrypt(tokens.refreshToken)` before storing
the values in `encryptedAccessToken` / `encryptedRefreshToken`. The `encrypt` function is
imported from `../../lib/crypto.js` (line 23), which is the project-wide AES-256-GCM
helper.

The file header comment explicitly states: "Access and refresh tokens are encrypted with
AES-256-GCM before storage."

No new performance issues introduced by this fix.

---

### PERF-001 / PERF-011: Accrual Worker — Serial Insert Loop

**Status: VERIFIED**

File reviewed: `leaveflow/apps/api/src/workers/accrual.worker.ts`

The serial per-employee await chain has been replaced with a batch pattern:

1. The worker iterates over employees using a synchronous `for` loop that builds an
   `ILedgerEntryInput[]` array without any `await` inside the loop (lines 184–211).
2. A single `await deps.balanceLedgerModel.insertMany(entries)` call is made after the loop
   completes, issuing one MongoDB round-trip for all employees (lines 214–216).
3. A single `await deps.auditService.log(...)` call with `action: "balance.accrual_batch"`
   and `metadata: { employeeCount, leaveTypeId, amount, period }` is made for the entire
   batch (lines 226–241). The audit entry is conditionally skipped when `employeeCount === 0`.

The fix correctly reduces O(N) DB round-trips to O(1) per accrual job. For a 1,000-employee
tenant this brings estimated job duration from 60–120 seconds down to ~200–500ms.

One minor observation: the `amount` field in the audit metadata is set to
`leaveType.defaultEntitlementDays` (the annual entitlement), not the per-period accrual
amount. This is cosmetically misleading in the audit log but has no performance impact.

No new performance issues introduced by this fix.

---

## Open P1 Issues — Status

### PERF-002: `buildTeamBalances` — Full Collection Scan on `balance_ledger`

**Status: STILL OPEN**

File reviewed: `leaveflow/apps/api/src/modules/dashboard/dashboard.service.ts` (lines 693–733)

The aggregation pipeline's initial `$match` stage remains `{ $match: { tenantId } }` with no
`employeeId` pre-filter. Teams are fetched first (lines 676–678) and their IDs are collected
(line 691), but neither the team IDs nor the employee IDs are pushed into the `$match`
before the `$lookup`. The pipeline still scans every ledger entry for the tenant before
pruning by team membership inside the `$lookup` + `$unwind` stages.

The dashboard cache worker mitigates this in steady state (the expensive query runs in the
background worker, not on the hot request path). However:
- Cold requests (first request after deploy, or any cache miss within the 5-minute window)
  still execute the full scan live.
- The background worker also runs this query — it is not free even when results are cached.

Recommended fix (unchanged from original report): before the aggregation, fetch all employee
IDs for the relevant teams with a single `EmployeeModel.find({ tenantId, teamId: { $in: teamIds } })
.select('_id').lean()` call, then add `employeeId: { $in: employeeIds }` to the initial
`$match`. This is a small, isolated change.

**Blocking: No** — the cache layer makes this acceptable for MVP but it should be scheduled
for the next sprint before beta with tenants above 200 employees.

---

### PERF-003: `findForCalendar` with Team Filter — N+1 and In-Process Filtering

**Status: STILL OPEN**

File reviewed: `leaveflow/apps/api/src/modules/leave-request/leave-request.service.ts`
(lines 279–312)

The implementation remains unchanged from the original review:

1. When `filter.teamId` is provided, the service makes a first DB query to resolve employee
   IDs from the team (lines 285–291).
2. It then calls `this.repo.findAll(tenantId, ..., { page: 1, limit: 1000 })` without
   passing the resolved employee IDs as a DB-side filter (lines 294–302).
3. The result is filtered in JavaScript with `result.items.filter(r => employeeIds.some(...))`
   — an O(N × M) string-comparison loop (lines 304–308).
4. The hardcoded `limit: 1000` remains, which will silently truncate large result sets.

**Blocking: No** — acceptable at MVP scale, but the `limit: 1000` creates a data correctness
risk for tenants with high leave volume within a date range. Should be addressed before GA.

---

## New Performance Concerns

No new performance issues were introduced by the three fixes applied in Stage 3b. The fixes
are each well-scoped:

- The dashboard route fix only adds a Redis GET before the existing service call.
- The OAuth encryption fix only wraps token values with the existing `encrypt()` function
  before passing them to the existing model update.
- The accrual worker fix replaces an in-loop `await` with an in-memory array accumulation
  followed by a single `insertMany`, with no new I/O paths.

One pre-existing concern worth noting for completeness (not introduced by the fixes): the
`buildTeamBalances` aggregation at line 741 uses `[...existing, row]` to accumulate rows
into the `teamBalanceMap`, creating a new array on each iteration. For tenants with many
(leaveType, team) combinations this is O(K²) in memory allocations. This is a coding-style
issue (immutability misapplied to a hot path) rather than a blocking concern at MVP scale.
The correct pattern is to push into a pre-allocated array or use a `Map<string, BalanceAggRow[]>`
with mutable accumulation inside the worker, then freeze the result before returning it.
This is a low-priority cleanup item.

---

## Summary

| Issue | Original Severity | Fix Status | Notes |
|-------|------------------|------------|-------|
| PERF-006: Dashboard no cache read | P0 | VERIFIED | Cache-aside correctly wired |
| PERF-008: OAuth tokens plaintext | P0 | VERIFIED | AES-256-GCM via `encrypt()` applied |
| PERF-001/011: Accrual serial inserts | P1 | VERIFIED | `insertMany` + single batch audit |
| PERF-002: `buildTeamBalances` full scan | P1 | STILL OPEN | Mitigated by cache, not blocking |
| PERF-003: `findForCalendar` N+1 | P1 | STILL OPEN | Limit:1000 risk, not blocking |

---

## Verdict: PASS

All three issues marked as fixed in Stage 3b have been correctly implemented. The two
remaining P1 issues (PERF-002, PERF-003) were not in scope for Stage 3b and remain open
but non-blocking for MVP deployment. They should be tracked in the backlog for resolution
before general availability.
