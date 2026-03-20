---
stage: "04-data-model"
handoff_to: "05-development"
run_id: "2026-03-16-design-leave-flow"
---

# Handoff: Data Model -> API Design / Development

## What Was Decided

The Database Architect completed the full MongoDB data model for LeaveFlow MVP. The complete document is at `worklog/runs/2026-03-16-design-leave-flow/04-data-model.md`.

## Schema Summary

14 collections, 34 compound indexes, designed for 10x growth (2K tenants, 200K employees, ~30M documents).

| Collection | Docs (6mo) | Purpose | Key Pattern |
|-----------|-----------|---------|-------------|
| `tenants` | 200 | Company workspace root entity | Settings, plan, Slack/Teams installation |
| `employees` | 20K | Employee records | Role, team assignment, invitation state |
| `teams` | 2K | Organizational units | Manager + workflow assignment |
| `workflows` | 1K | Approval chain definitions | Versioned steps array, auto-approval rules |
| `leave_types` | 1K | Leave type config | Accrual rules, carryover rules per tenant |
| `leave_requests` | 50K | Core transactional entity | FSM status, workflow snapshot, approval history |
| `balance_ledger` | 250K | **Append-only** balance mutations | Signed amounts, never updated/deleted |
| `audit_logs` | 500K | **Immutable** audit trail | Insert-only, no update/delete permitted |
| `bot_mappings` | 20K | Slack/Teams user -> employee | Resolves platform events to tenants |
| `holiday_calendars` | 250 | Public + custom holidays | Shared system data + tenant overlay |
| `delegations` | 500 | Approval delegation | Date-ranged authority transfer |
| `oauth_tokens` | 10K | Encrypted calendar tokens | Per-employee per-service |
| `blackout_periods` | 500 | No-leave date ranges | Scoped to teams/leave types |
| `notifications` | 200K | Delivery tracking | Status, retry, platform message IDs |

## Three Critical Patterns

### 1. Append-Only Balance Ledger

**Balance is NEVER stored as a mutable field.** Current balance = `SUM(amount)` from `balance_ledger` where `(tenantId, employeeId, leaveTypeId)`.

Entry types: `initial_allocation` (+), `accrual` (+), `deduction` (-), `restoration` (+), `manual_adjustment` (+/-), `carryover` (+), `carryover_expiry` (-), `year_end_forfeit` (-).

Key implications for API/dev:
- Deduction entry is created on **approval** (not submission)
- Restoration entry is created on **cancellation** of approved leave
- Corrections create new entries, never modify existing ones
- Balance check at validation uses `SUM(amount)` aggregation (~1ms with index)
- No cache for balance — always compute fresh to prevent over-approval

### 2. FSM State Machine for Leave Requests

States: `pending_validation` -> `pending_approval` -> `approved` | `rejected` | `cancelled` | `auto_approved` | `validation_failed`

Key fields on `leave_requests`:
- `status` — Current FSM state
- `currentStep` — 0-indexed step in workflow (-1 for terminal states)
- `currentApproverEmployeeId` — **Denormalized** for fast "my approvals" queries
- `currentStepStartedAt` — **Denormalized** for escalation timeout queries
- `workflowSnapshot` — Full copy of workflow at submission time (BR-102: immutable)
- `approvalHistory[]` — Embedded array of all actions taken

Transitions are handled by the approval engine service. Every transition writes an audit log entry.

### 3. Multi-Tenancy (5 layers)

1. **Firebase custom claims**: JWT carries `tenantId`
2. **Fastify plugin**: Extracts `tenantId` to request context
3. **Repository methods**: `tenantId` is a required first parameter
4. **Mongoose middleware**: Throws if any query lacks `tenantId` filter
5. **Integration tests**: Cross-tenant access verification suite

Every compound index starts with `tenantId` (exception: `bot_mappings` primary index starts with `platform` because bot events arrive without tenant context).

## Key Denormalization Decisions

| Field | Why | Update Trigger |
|-------|-----|---------------|
| `leave_requests.currentApproverEmployeeId` | "Requests awaiting my approval" is the most frequent manager query | Updated on every step transition |
| `leave_requests.currentStepStartedAt` | Escalation worker scans all tenants every 15 min | Updated on every step transition |
| `leave_requests.workflowSnapshot` | BR-102: pending requests must not be affected by workflow edits | Write-once at submission |
| `approvalHistory[].actorName/actorRole` | Bot messages show historical names | Write-once per action |

## Index Strategy Highlights

- Total: 34 compound indexes across 14 collections
- All tenant-scoped indexes start with `tenantId`
- `balance_ledger` primary index `{ tenantId, employeeId, leaveTypeId, effectiveDate }` is the most critical — supports the balance SUM aggregation
- `leave_requests` has 7 indexes covering dashboard, employee, manager, calendar, and escalation query patterns
- `audit_logs` has 4 indexes for chronological browsing, entity history, actor history, and activity feed

## Caching (Redis)

Cached: employee context (5min), leave types (15min), holidays (24h), tenant settings (10min), dashboard widgets (30s-1h).

**NOT cached**: balance (always fresh), workflow definitions (infrequent reads).

Key pattern: `lf:{tenantId}:{entity}:{qualifier}`

## Files to Read

| File | Contains |
|------|----------|
| `worklog/runs/2026-03-16-design-leave-flow/04-data-model.md` | Full data model with all schemas, indexes, access patterns, migration scripts |

## Non-Obvious Decisions

1. **`bot_mappings` index does not start with `tenantId`**: Bot events arrive with platform IDs only. Tenant is resolved from the mapping. This is the sole exception to the tenantId-first-in-index rule.

2. **No `updatedAt` on `balance_ledger` and `audit_logs`**: These are append-only. No document is ever updated.

3. **`workflowSnapshot` is a full embed, not a reference**: At MVP scale (1K workflows), this adds ~1KB per leave request. The trade-off is worth it to avoid a versioned workflow table and the complexity of snapshot lookups.

4. **Audit log uses IDs, not names**: `actorId` references an employee ID. Names are resolved at display time. This supports GDPR pseudonymization — replacing `actorId` with a hash severs the link to PII without destroying the audit chain.

5. **`holiday_calendars` has nullable `tenantId`**: System-level holiday data (from Nager.Date API) is shared across all tenants with `tenantId: null`. Tenant-specific custom holidays have `tenantId` set.

6. **`notifications` collection exists alongside BullMQ**: BullMQ handles job execution and retry. The `notifications` collection provides a persistent delivery log for the UI (notification history) and for updating bot messages on cancellation (needs `platformMessageId`).

7. **Free tier enforcement is via `tenants.planLimits`**: Plan limits are pre-computed on the tenant document at plan change time. The API checks these limits without querying Stripe.

## Constraints for API Design

1. Every API endpoint MUST include tenantId scoping. The Mongoose middleware will throw if it is missing.
2. Balance queries MUST use the `balance_ledger` aggregation, never a stored balance field.
3. Leave request status changes MUST go through the FSM transition table. Direct status updates are forbidden.
4. Audit log writes MUST happen in the same service call as the state change (not as a separate async step — audit must not be lost).
5. Rejection actions MUST include a reason with minimum 10 non-whitespace characters (BR-022).
6. Workflow edits MUST increment the `version` field and MUST NOT affect pending requests.
7. Employee deletion MUST pseudonymize audit log entries (replace actorId with hash) rather than deleting them.
