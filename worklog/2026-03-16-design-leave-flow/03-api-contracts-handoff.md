---
stage: "03-api-contracts"
handoff_to: "04-database-schema"
run_id: "2026-03-16-design-leave-flow"
---

# Handoff: API Design -> Database Architect

## What Was Decided

The API Designer completed the full REST API contract for LeaveFlow MVP. The full specification is at `worklog/runs/2026-03-16-design-leave-flow/03-api-contracts.md`.

---

## Collections Required

The API shapes imply the following MongoDB collections. Each must have a `tenantId` field for row-level tenant isolation.

| Collection | Purpose | Estimated Size (MVP @ 200 tenants) |
|------------|---------|-------------------------------------|
| `tenants` | Company profiles, settings, plan | 200 docs |
| `employees` | Employee records with role, team, platform links | ~20,000 docs |
| `teams` | Team definitions with workflow assignment | ~2,000 docs |
| `workflows` | Workflow definitions + versioned steps | ~1,000 docs |
| `leave_types` | Leave type config per tenant | ~1,000 docs |
| `leave_requests` | Core request documents with embedded `workflowSnapshot` and `approvalHistory` | ~100,000 docs/year |
| `balance_ledger` | Append-only balance entries | ~500,000 entries/year |
| `audit_log` | Immutable audit trail | ~1M entries/year |
| `bot_mappings` | Platform user ID -> employee mapping (Slack + Teams) | ~20,000 docs |
| `holiday_calendars` | Public holidays per country/year (shared across tenants) | ~250 docs |
| `oauth_tokens` | Encrypted OAuth tokens for Google/Outlook calendar sync | ~20,000 docs |
| `delegations` | Approval delegation records with date range | ~500 docs |
| `onboarding_progress` | Per-tenant onboarding wizard state (6 steps) | ~200 docs |
| `notifications` | In-app notification inbox per employee | ~200,000 docs |
| `notification_preferences` | Per-employee notification channel/event config | ~20,000 docs |
| `blackout_periods` | Date ranges when leave cannot be requested (per leave type) | ~1,000 docs |

---

## Critical Indexes Implied by API Query Patterns

### `leave_requests`

The most query-intensive collection. The API exposes several filtered list patterns:

| Query Pattern | Endpoint | Required Index |
|---------------|----------|----------------|
| All pending for a tenant, sorted by age | `GET /approvals/pending` | `{ tenantId, status, createdAt }` |
| By employee + status | `GET /leave-requests?employeeId=&status=` | `{ tenantId, employeeId, status }` |
| By team + status + date range | `GET /leave-requests?teamId=&startDate=&endDate=` | `{ tenantId, teamId, status, startDate, endDate }` |
| Active requests for current approver | `POST /approvals/:id/approve` guard | `{ tenantId, status, currentStep }` |
| Stale detection (pending > 48h) | `GET /dashboard/summary` needsAttention widget | `{ tenantId, status, updatedAt }` |
| Calendar date range overlap | `GET /calendar/absences` | `{ tenantId, status, startDate, endDate }` — requires range query; consider compound with teamId |
| Escalation worker scan | BullMQ worker every 15 min | `{ status, updatedAt }` — this is a cross-tenant query; the escalation worker needs a special index without tenantId prefix |

**Note on overlapping date range queries:** MongoDB does not have native range overlap index support. The recommended approach is to index on `startDate` and `endDate` separately and apply overlap logic in the query: `startDate <= rangeEnd AND endDate >= rangeStart`.

### `balance_ledger`

Always summed per employee per leave type. The balance calculation for `GET /balances/employees/:id` is:

```
SUM(amount) WHERE tenantId = X AND employeeId = Y AND leaveTypeId = Z AND effectiveDate <= TODAY
```

Required index: `{ tenantId, employeeId, leaveTypeId, effectiveDate }` — the exact compound the CTO specified. This is the primary read pattern. No caching recommended (must reflect latest state for validation).

### `audit_log`

Write-heavy, read for compliance and UI. Two query patterns:

| Query | Index |
|-------|-------|
| Chronological feed per tenant | `{ tenantId, timestamp: -1 }` |
| By entity (leave request detail, employee history) | `{ tenantId, entityType, entityId, timestamp: -1 }` |

Audit log entries are immutable. Never updated. No `updatedAt` field needed.

### `employees`

| Query | Index |
|-------|-------|
| Auth lookup by Firebase UID | `{ firebaseUid }` (unique, no tenantId — Firebase UIDs are globally unique) |
| Email uniqueness per tenant | `{ tenantId, email }` (unique) |
| By team (manager view, calendar) | `{ tenantId, teamId }` |
| Bot lookup by Slack user ID | `{ tenantId, slackUserId }` (sparse, only set employees) |
| Bot lookup by Teams user ID | `{ tenantId, teamsUserId }` (sparse) |

### `bot_mappings`

Used on every bot interaction to resolve platform user to employee:

Index: `{ tenantId, platform, platformUserId }` (unique compound)

### `holiday_calendars`

Shared across tenants (no `tenantId`). Lookup is by `{ countryCode, year }` (unique compound). This collection is read-only after initial seeding.

### `notifications`

High-volume writes (every approval event generates 1-3 notifications):

| Query | Index |
|-------|-------|
| Unread for a user | `{ tenantId, employeeId, isRead, createdAt: -1 }` |
| All for a user (inbox) | `{ tenantId, employeeId, createdAt: -1 }` |

Consider a TTL index to auto-delete notifications older than 90 days.

---

## Embedded vs Referenced Data Decisions

### Embed in `leave_requests`

- **`workflowSnapshot`**: The entire workflow definition at the time of submission is embedded in the request document. This is a business rule (BR-102) — changes to the workflow after submission must not affect in-flight requests. The snapshot is immutable after creation.
- **`approvalHistory`**: Array of `{ step, approverId, action, reason, delegatedFrom, timestamp }` objects. These are small, bounded in size (max ~5 steps per request), and always read together with the request. Embed.

### Reference (separate collections)

- **Employee details**: Store `employeeId` in leave requests; resolve names at query time via `$lookup` or application-level join. Never embed mutable employee data in requests.
- **Leave type details**: Store `leaveTypeId`; resolve at display time. `leaveTypeName` and `leaveTypeColor` in API responses are computed at read time, not stored in the request.
- **Workflow definition**: Store `workflowId` + embedded `workflowSnapshot`. The snapshot is frozen; the referenced workflow may evolve.

---

## Access Patterns Requiring Special Attention

### Dashboard Aggregate Endpoint

`GET /dashboard/summary` must return 9 widget payloads in a single response within 3 seconds. This is the highest-complexity query in the entire API.

**Widget query breakdown:**

| Widget | Query | Complexity |
|--------|-------|-----------|
| Out Today | Count + list of employees with `startDate <= today <= endDate AND status = approved` | Medium |
| Pending Approvals | Count and stale count (pending > 48h) | Low |
| Utilization Rate | Average of `(used/total)` across all employees — requires balance ledger aggregate | High |
| Upcoming Week | Per-day count for next 5 working days | Medium |
| Absence Heatmap | Per-day count for current month | Medium |
| Resolution Rate | Approved/rejected/pending counts for current month | Low |
| Activity Feed | Last 10 audit log events | Low |
| Needs Attention | Pending requests sorted by age with >48h flag | Low |
| Team Balances | Per-team average balance across all employees | High (balance ledger) |

**Recommendation for Database Architect:** Consider a `dashboard_cache` collection or Redis keys that store pre-computed widget snapshots with per-widget TTLs (matching the `cacheTtlSeconds` values in the response). The utilization rate and team balances widgets in particular are expensive to compute on the fly. The BullMQ accrual worker (or a dedicated dashboard pre-compute job) could refresh these on a schedule.

### Calendar Overlap Query

`GET /calendar/absences` fetches all approved/pending requests overlapping a given month. With large tenants, this could return hundreds of rows. The query must use the date overlap pattern:

```javascript
{
  tenantId: X,
  status: { $in: ["approved", "pending_approval"] },
  startDate: { $lte: rangeEnd },
  endDate: { $gte: rangeStart }
}
```

The compound index should be ordered: `{ tenantId, status, startDate, endDate }` so the status filter narrows the set before the date range scan.

### Balance Computation

Balance is computed by summing all ledger entries. For a typical employee with 3 leave types over 2 years, this is ~20-50 ledger entries. The query is fast with the compound index. Do not cache. The `GET /leave-requests/validate` endpoint must call this in real-time to prevent race conditions.

### Escalation Worker Cross-Tenant Scan

The BullMQ escalation worker runs every 15 minutes and needs to find all pending requests across all tenants whose current step has exceeded its timeout. This is the only query that crosses tenant boundaries intentionally. It requires:

```javascript
{
  status: "pending_approval",
  "approvalHistory.N.timestamp": { $lt: escalationThreshold }
}
```

Recommended index: `{ status, updatedAt }` (no tenantId prefix) specifically for this query. Keep this index separate from tenant-scoped indexes.

---

## Schema Constraints Summary

| Rule | Implication |
|------|-------------|
| Every document has `tenantId` (except `holiday_calendars`) | Compound indexes must start with `tenantId` for all tenant-scoped queries |
| `balance_ledger` is append-only | No update operations; no `updatedAt`; TTL on old entries optional |
| `audit_log` is immutable | No update operations; `timestamp` is the sort key; never delete |
| `workflowSnapshot` in `leave_requests` is frozen at submission | Validate schema on write; treat as an opaque embedded doc on read |
| `leave_requests.approvalHistory` is append-only within a doc | Use `$push` to add entries; never mutate existing entries |
| Soft-delete for employees (`status: inactive`) | Filter `status: active` on all employee queries by default |
| GDPR pseudonymization | Replacement of PII fields on delete must propagate across all collections that store `employeeName` denormalized — prefer storing `employeeId` and resolving at read time |

---

## Denormalization Decisions

The API responses include resolved names (`employeeName`, `teamName`, `workflowName`, etc.) that are not stored in the primary document. Two options:

1. **Application-level join**: Load the main document, then load referenced documents in parallel. Simpler schema, more round-trips.
2. **Aggregation pipeline**: Use MongoDB `$lookup` stages in a single query.

**Recommendation:** Use option 1 (application join) for individual document endpoints. Use `$lookup` aggregations only for the dashboard and list endpoints where joining in memory would require too many sequential queries. This keeps the repository layer simple and testable.

The one exception: `employeeName` and `teamName` in the activity feed and needs-attention widget. These should use `$lookup` in the aggregate dashboard query to avoid N+1 queries.

---

## Files Produced

| File | Contents |
|------|----------|
| `worklog/runs/2026-03-16-design-leave-flow/03-api-contracts.md` | Full API design: all endpoints, request/response schemas, error catalog, conventions, data models |

## Next Stage

The Database Architect (Stage 4) should:

1. Define Mongoose schemas for all 16 collections listed above
2. Implement the compound indexes identified in this handoff
3. Design the aggregation pipelines for the dashboard queries
4. Define the `dashboard_cache` strategy (Redis vs MongoDB collection)
5. Plan the data migration/seeding scripts for public holidays (50 countries)
6. Design the GDPR pseudonymization procedure for employee deletion
7. Specify the MongoDB Atlas tier and configuration for the index memory footprint
