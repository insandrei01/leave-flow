---
stage: "04-data-model"
agent: "database-architect"
model: "opus"
run_id: "2026-03-16-design-leave-flow"
started: "2026-03-16T16:00:00Z"
finished: "2026-03-16T17:45:00Z"
tools_used: [Read, Write, Bash, Grep]
parent_agent: "pipeline-orchestrator"
sub_agents_invoked: []
output_files:
  - worklog/runs/2026-03-16-design-leave-flow/04-data-model.md
  - worklog/runs/2026-03-16-design-leave-flow/04-data-model-handoff.md
---

# Stage 4: Data Model — LeaveFlow

## Table of Contents

1. [Overview](#1-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Collections](#3-collections)
4. [FSM State Transitions](#4-fsm-state-transitions)
5. [Append-Only Balance Ledger Design](#5-append-only-balance-ledger-design)
6. [Multi-Tenancy Enforcement](#6-multi-tenancy-enforcement)
7. [Audit Trail Design](#7-audit-trail-design)
8. [Access Patterns](#8-access-patterns)
9. [Caching Strategy](#9-caching-strategy)
10. [Data Volume Estimates](#10-data-volume-estimates)
11. [Migration Plan](#11-migration-plan)
12. [Performance Considerations](#12-performance-considerations)
13. [Backup and Recovery](#13-backup-and-recovery)

---

## 1. Overview

LeaveFlow is a multi-tenant leave management SaaS. The data model is designed for MongoDB Atlas 8.x with Mongoose 8.x ODM. It serves three client surfaces (Slack bot, Teams bot, Next.js web app) through a single Fastify API.

**Core design principles:**

- **Row-level tenant isolation**: Every document contains `tenantId` as the first field in every compound index. No cross-tenant queries are permitted.
- **Append-only balance ledger**: Employee balances are never stored as a mutable field. Balance = SUM(ledger entries). This provides a complete audit trail and prevents race conditions.
- **Finite state machine for approvals**: Leave request status transitions are deterministic and auditable. The workflow definition is snapshotted at submission time.
- **Immutable audit trail**: The `audit_logs` collection permits inserts only. No updates, no deletes. Actor references use IDs (not names) to support GDPR pseudonymization.

**Collections (14 total):**

| # | Collection | Purpose |
|---|-----------|---------|
| 1 | `tenants` | Company profiles, settings, billing, onboarding state |
| 2 | `employees` | Employee records, role, team assignment, platform preferences |
| 3 | `teams` | Team definitions, workflow assignment, manager |
| 4 | `workflows` | Approval workflow definitions with versioned steps |
| 5 | `leave_types` | Leave type configuration per tenant |
| 6 | `leave_requests` | Leave request lifecycle, approval history, workflow snapshot |
| 7 | `balance_ledger` | Append-only balance mutations (accrual, deduction, adjustment, carryover) |
| 8 | `audit_logs` | Immutable audit trail for all state-changing operations |
| 9 | `bot_mappings` | Platform user ID to employee mapping (Slack, Teams) |
| 10 | `holiday_calendars` | Public holiday data by country/year + custom company holidays |
| 11 | `delegations` | Approval delegation records |
| 12 | `oauth_tokens` | Encrypted OAuth tokens for calendar sync and bot platforms |
| 13 | `blackout_periods` | Date ranges when leave cannot be requested |
| 14 | `notifications` | Notification delivery log for tracking and retry |

---

## 2. Entity Relationship Diagram

```
                            +------------------+
                            |     tenants      |
                            |------------------|
                            | _id              |
                            | name             |
                            | slug             |
                            | settings         |
                            | plan             |
                            | onboardingState  |
                            | stripeCustomerId |
                            +--------+---------+
                                     |
                    tenantId (every collection below)
                                     |
          +-----------+-----------+--+---------+-----------+-----------+
          |           |           |            |           |           |
    +-----v----+ +---v------+ +-v--------+ +-v-------+ +-v-------+ +-v---------+
    | employees | |  teams   | | workflows| | leave   | | holiday | | blackout  |
    |----------| |----------| |----------| | _types  | | _cals   | | _periods  |
    | tenantId | | tenantId | | tenantId | |---------|  |---------|  |----------|
    | email    | | name     | | name     | | tenantId| | tenantId| | tenantId |
    | name     | | managerId| | steps[]  | | name    | | country | | leaveType|
    | role     | | workflowId| version  | | accrual | | year    | | startDate|
    | teamId --+>|          | |          | | carry   | | holidays| | endDate  |
    | status   | +----+-----+ +----+-----+ +---------+ +---------+ +----------+
    +----+-----+      |           |
         |            |           |
         |     +------v-----------v--------+
         |     |     leave_requests        |
         |     |---------------------------|
         +---->| tenantId                  |
               | employeeId               |
               | leaveTypeId              |
               | status (FSM)             |
               | currentStep              |
               | workflowSnapshot (frozen)|
               | approvalHistory[]        |
               | startDate, endDate       |
               +----------+---------------+
                          |
              +-----------+-----------+
              |                       |
    +---------v--------+   +----------v---------+
    |  balance_ledger  |   |    audit_logs      |
    |------------------|   |--------------------|
    | tenantId         |   | tenantId           |
    | employeeId       |   | actorId            |
    | leaveTypeId      |   | action             |
    | entryType        |   | entityType         |
    | amount (+/-)     |   | entityId           |
    | effectiveDate    |   | timestamp          |
    | referenceId      |   | changes            |
    +------------------+   +--------------------+
              |
    +---------v--------+   +--------------------+   +-------------------+
    |  bot_mappings    |   |   delegations      |   |  oauth_tokens     |
    |------------------|   |--------------------|   |-------------------|
    | tenantId         |   | tenantId           |   | tenantId          |
    | platform         |   | delegatorId        |   | employeeId        |
    | platformUserId   |   | delegateId         |   | service           |
    | platformTeamId   |   | startDate          |   | encryptedToken    |
    | employeeId       |   | endDate            |   | expiresAt         |
    +------------------+   +--------------------+   +-------------------+

    +--------------------+
    |   notifications    |
    |--------------------|
    | tenantId           |
    | recipientId        |
    | channel            |
    | eventType          |
    | status             |
    | referenceId        |
    | deliveredAt        |
    +--------------------+
```

**Key Relationships:**

| Parent | Child | Type | FK Field |
|--------|-------|------|----------|
| `tenants` | All collections | 1:N | `tenantId` |
| `employees` | `leave_requests` | 1:N | `employeeId` |
| `employees` | `balance_ledger` | 1:N | `employeeId` |
| `employees` | `bot_mappings` | 1:N | `employeeId` |
| `employees` | `oauth_tokens` | 1:N | `employeeId` |
| `teams` | `employees` | 1:N | `teamId` |
| `teams` | `teams.managerId` | N:1 | `managerId` -> `employees._id` |
| `workflows` | `teams` | 1:N | `workflowId` |
| `leave_types` | `leave_requests` | 1:N | `leaveTypeId` |
| `leave_types` | `balance_ledger` | 1:N | `leaveTypeId` |
| `leave_requests` | `balance_ledger` | 1:N | `referenceId` |

---

## 3. Collections

### 3.1 tenants

The root entity. Represents a company workspace.

```json
{
  "_id": "ObjectId",
  "name": "String — Company name (required, 1-100 chars)",
  "slug": "String — URL-safe workspace identifier (required, unique, lowercase, 3-50 chars)",
  "settings": {
    "timezone": "String — IANA timezone, default 'UTC'",
    "fiscalYearStartMonth": "Number — 1-12, default 1 (January)",
    "workWeek": "[Number] — Days of week that are work days, default [1,2,3,4,5] (Mon-Fri)",
    "coverageMinimumPercent": "Number — Minimum team coverage %, default 50",
    "announcementChannelEnabled": "Boolean — Post team channel announcements, default true",
    "locale": "String — UI locale, default 'en'"
  },
  "plan": "String — Enum: 'free' | 'team' | 'business' | 'enterprise', default 'free'",
  "planLimits": {
    "maxEmployees": "Number — Plan-derived limit (free=10, team=Infinity, etc.)",
    "maxWorkflowSteps": "Number — free=1, team=10, business=20",
    "maxLeaveTypes": "Number — free=4 (seeded), team=Infinity",
    "maxPlatforms": "Number — free=1, team=Infinity"
  },
  "onboardingState": {
    "currentStep": "Number — 0-6, 6=complete",
    "completedSteps": "[Number] — Array of completed step numbers",
    "startedAt": "Date — When onboarding began"
  },
  "stripeCustomerId": "String | null — Stripe customer ID",
  "stripeSubscriptionId": "String | null — Stripe subscription ID",
  "slackInstallation": {
    "teamId": "String — Slack workspace ID",
    "botToken": "String — Encrypted Slack bot token",
    "botUserId": "String — Bot user ID in Slack",
    "installedAt": "Date",
    "installedBy": "String — Employee ID who installed"
  },
  "teamsInstallation": {
    "tenantId": "String — Microsoft tenant ID (AAD)",
    "botId": "String — Bot registration ID",
    "serviceUrl": "String — Teams service URL for proactive messaging",
    "installedAt": "Date",
    "installedBy": "String — Employee ID who installed"
  },
  "isActive": "Boolean — Soft delete flag, default true",
  "deactivatedAt": "Date | null — When soft-deleted",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| slug_unique | `{ slug: 1 }` | Unique | Workspace URL lookup during onboarding and login |
| stripe_customer | `{ stripeCustomerId: 1 }` | Sparse, Unique | Stripe webhook processing resolves tenant by customer ID |
| slack_team | `{ "slackInstallation.teamId": 1 }` | Sparse, Unique | Bot event routing: Slack event -> tenant lookup |
| teams_tenant | `{ "teamsInstallation.tenantId": 1 }` | Sparse, Unique | Bot event routing: Teams event -> tenant lookup |
| active_plan | `{ isActive: 1, plan: 1 }` | Regular | Billing queries, tenant admin listing |

---

### 3.2 employees

Employee records. Every user except the tenant entity itself is an employee.

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "email": "String — Required, validated email format",
  "firstName": "String — Required, 1-100 chars",
  "lastName": "String — Required, 1-100 chars",
  "displayName": "String — Computed: firstName + lastName",
  "role": "String — Enum: 'company_admin' | 'hr_admin' | 'manager' | 'employee', default 'employee'",
  "teamId": "ObjectId | null — ref teams._id",
  "firebaseUid": "String | null — Firebase Auth UID",
  "startDate": "Date — Employment start date (for pro-rated accrual)",
  "primaryPlatform": "String — Enum: 'slack' | 'teams' | 'email', default 'email'",
  "timezone": "String — IANA timezone, falls back to tenant setting",
  "profileImageUrl": "String | null",
  "invitationToken": "String | null — For onboarding; cleared after registration",
  "invitationExpiresAt": "Date | null — 7 days from invitation (BR-094)",
  "invitationStatus": "String — Enum: 'pending' | 'accepted' | 'expired', default 'pending'",
  "status": "String — Enum: 'active' | 'inactive' | 'invited', default 'invited'",
  "deactivatedAt": "Date | null",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| tenant_email | `{ tenantId: 1, email: 1 }` | Unique | Login lookup, duplicate prevention, CSV import dedup (BR-106) |
| tenant_team | `{ tenantId: 1, teamId: 1, status: 1 }` | Regular | Team member listing, coverage calculation |
| tenant_firebase | `{ tenantId: 1, firebaseUid: 1 }` | Sparse, Unique | Auth token -> employee resolution |
| tenant_role | `{ tenantId: 1, role: 1, status: 1 }` | Regular | Role-based queries (list all managers, all HR admins) |
| tenant_status | `{ tenantId: 1, status: 1 }` | Regular | Active employee count for billing seat sync |
| invitation_token | `{ invitationToken: 1 }` | Sparse, Unique | Invitation link lookup (no tenantId in URL) |

**Constraints:**

- At least one `company_admin` per tenant must exist (BR-093 — enforced at application level)
- `email` is unique within a tenant, not globally
- `teamId` can be null (unassigned employees cannot submit leave requests per BR-004)

---

### 3.3 teams

Team organizational units. Each team has one workflow and one manager.

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "name": "String — Required, 1-100 chars",
  "managerId": "ObjectId | null — ref employees._id (must have role manager or above)",
  "workflowId": "ObjectId | null — ref workflows._id",
  "announcementChannelSlack": "String | null — Slack channel ID for team announcements",
  "announcementChannelTeams": "String | null — Teams channel ID",
  "isActive": "Boolean — default true",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| tenant_name | `{ tenantId: 1, name: 1 }` | Unique | Team listing, name uniqueness within tenant |
| tenant_workflow | `{ tenantId: 1, workflowId: 1 }` | Regular | Workflow deletion guard (BR-104): check if any team references a workflow |
| tenant_manager | `{ tenantId: 1, managerId: 1 }` | Regular | Find teams managed by an employee (manager view) |

---

### 3.4 workflows

Approval workflow definitions. Workflows are versioned: editing creates a new version. Pending requests use the snapshotted version (BR-102).

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "name": "String — Required, 1-100 chars",
  "description": "String | null — Optional description",
  "steps": [
    {
      "order": "Number — 0-indexed step position",
      "approverType": "String — Enum: 'specific_user' | 'role_direct_manager' | 'role_team_lead' | 'role_hr' | 'group'",
      "approverUserId": "ObjectId | null — For 'specific_user' type only",
      "approverGroupIds": "[ObjectId] | null — For 'group' type (any of these can approve)",
      "timeoutHours": "Number — Hours before escalation, default 48",
      "escalationAction": "String — Enum: 'escalate_next' | 'remind' | 'auto_approve' | 'notify_hr' | 'none', default 'remind'",
      "maxReminders": "Number — Max reminders before escalation, default 3",
      "allowDelegation": "Boolean — Whether this step supports delegation, default true"
    }
  ],
  "autoApprovalRules": [
    {
      "leaveTypeId": "ObjectId — ref leave_types._id",
      "maxDurationDays": "Number — Auto-approve if request <= this many days",
      "isActive": "Boolean — default true"
    }
  ],
  "isTemplate": "Boolean — System template or user-created, default false",
  "templateSlug": "String | null — 'simple' | 'standard' | 'enterprise' for system templates",
  "version": "Number — Incremented on edit, starts at 1",
  "isActive": "Boolean — default true (inactive = soft deleted)",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| tenant_name_active | `{ tenantId: 1, name: 1, isActive: 1 }` | Regular | Workflow listing and search |
| tenant_template | `{ tenantId: 1, isTemplate: 1 }` | Regular | Template listing during onboarding wizard step 3 |
| system_templates | `{ isTemplate: 1, templateSlug: 1 }` | Regular | Load system templates (tenantId null for global templates) |

**Design decisions:**

- `autoApprovalRules` are embedded in the workflow (not a separate collection) because they are small, always read with the workflow, and snapshotted together.
- `steps` is an embedded array (not references) because steps have no independent identity and are always accessed as part of the workflow.
- Version history is not stored in MVP. The `version` field increments but old versions are only preserved in `leave_requests.workflowSnapshot`. Phase 2 adds a `workflow_versions` collection.

---

### 3.5 leave_types

Leave type configuration per tenant. Seeded with defaults on tenant creation (BR-053).

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "name": "String — Required, 1-50 chars (e.g., 'Vacation', 'Sick Leave')",
  "slug": "String — URL-safe identifier within tenant",
  "color": "String — Hex color for UI display, default '#818CF8'",
  "icon": "String — Icon identifier for UI, default 'calendar'",
  "isPaid": "Boolean — Paid vs unpaid leave, default true",
  "requiresApproval": "Boolean — Whether approval workflow applies, default true",
  "defaultEntitlementDays": "Number — Annual entitlement in days, default 20",
  "allowNegativeBalance": "Boolean — Allow requests exceeding balance, default false",
  "accrualRule": {
    "type": "String — Enum: 'front_loaded' | 'monthly' | 'quarterly' | 'custom' | 'none'",
    "dayOfMonth": "Number | null — Day accrual posts (for monthly/custom), default 1",
    "customSchedule": "[{ month: Number, day: Number, amount: Number }] | null — For custom type"
  },
  "carryoverRule": {
    "enabled": "Boolean — default false",
    "maxDays": "Number | null — Max days to carry over",
    "expiryMonths": "Number | null — Months after fiscal year start when carryover expires"
  },
  "isUnlimited": "Boolean — For types like unpaid leave with no balance cap, default false",
  "isRetroactiveAllowed": "Boolean — Allow past-date requests (e.g., sick leave), default false",
  "isActive": "Boolean — Deactivated types reject new requests but allow pending ones (BR-052), default true",
  "sortOrder": "Number — Display order in UI, default 0",
  "isDefault": "Boolean — Seeded leave types, default false",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| tenant_slug | `{ tenantId: 1, slug: 1 }` | Unique | API lookups by slug, dedup within tenant |
| tenant_active | `{ tenantId: 1, isActive: 1, sortOrder: 1 }` | Regular | Leave type listing in forms and dashboards |

---

### 3.6 leave_requests

The core transactional entity. Represents a leave request and its approval lifecycle.

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "employeeId": "ObjectId — Required, ref employees._id",
  "leaveTypeId": "ObjectId — Required, ref leave_types._id",
  "startDate": "Date — First day of leave (inclusive)",
  "endDate": "Date — Last day of leave (inclusive)",
  "halfDayStart": "Boolean — First day is half-day, default false",
  "halfDayEnd": "Boolean — Last day is half-day, default false",
  "workingDays": "Number — Calculated at submission: excludes weekends/holidays, accounts for half-days",
  "reason": "String | null — Optional reason from employee (max 500 chars)",
  "status": "String — FSM state (see Section 4), required",
  "currentStep": "Number — 0-indexed current approval step, -1 for terminal states",
  "reminderCount": "Number — Reminders sent for current step, default 0",
  "currentApproverEmployeeId": "ObjectId | null — Resolved approver for current step (for quick query)",
  "currentStepStartedAt": "Date | null — When current step began (for timeout calculation)",
  "workflowSnapshot": {
    "workflowId": "ObjectId — Original workflow ID",
    "workflowVersion": "Number — Version at time of snapshot",
    "name": "String — Workflow name",
    "steps": "[WorkflowStep] — Full step array, frozen at submission (BR-102)"
  },
  "autoApprovalRuleName": "String | null — If auto-approved, which rule matched (BR-027)",
  "approvalHistory": [
    {
      "step": "Number — Step index",
      "action": "String — Enum: 'approved' | 'rejected' | 'escalated' | 'skipped' | 'force_approved' | 'force_rejected'",
      "actorId": "ObjectId — Employee ID of person who acted",
      "actorName": "String — Display name at time of action (for bot messages)",
      "actorRole": "String — Role description (e.g., 'Team Lead', 'HR Admin')",
      "delegatedFromId": "ObjectId | null — If delegation was active, original approver",
      "reason": "String | null — Mandatory for rejection (BR-022, min 10 chars)",
      "via": "String — Enum: 'slack' | 'teams' | 'web' | 'system' | 'email'",
      "timestamp": "Date"
    }
  ],
  "cancellationReason": "String | null — Reason for cancellation if status is cancelled",
  "cancelledAt": "Date | null",
  "cancelledBy": "ObjectId | null — Employee who cancelled (self or HR force-cancel)",
  "calendarEventIds": {
    "google": "String | null — Google Calendar event ID",
    "outlook": "String | null — Outlook Calendar event ID"
  },
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| tenant_status_created | `{ tenantId: 1, status: 1, createdAt: -1 }` | Regular | Dashboard: pending approvals count, resolution rate, filtered request lists |
| tenant_employee_status | `{ tenantId: 1, employeeId: 1, status: 1, startDate: -1 }` | Regular | Employee self-service: my requests; overlap check (BR-003); balance query join |
| tenant_approver | `{ tenantId: 1, currentApproverEmployeeId: 1, status: 1 }` | Regular | Manager view: requests awaiting my approval; bot approval routing |
| tenant_dates | `{ tenantId: 1, status: 1, startDate: 1, endDate: 1 }` | Regular | Calendar view: absences in date range; out-today count; upcoming week |
| tenant_team_dates | `{ tenantId: 1, "employeeId": 1, startDate: 1, endDate: 1 }` | Regular | Team coverage calculation (join with employee.teamId at app level) |
| tenant_stale | `{ tenantId: 1, status: 1, currentStepStartedAt: 1 }` | Regular | Escalation worker: find overdue requests; dashboard stale count |
| tenant_created | `{ tenantId: 1, createdAt: -1 }` | Regular | Activity feed: recent requests |

**Design decisions — denormalization:**

- `currentApproverEmployeeId`: Denormalized from `workflowSnapshot.steps[currentStep]` resolved against the employee who fills that role. Updated on every step transition. Rationale: the "requests awaiting my approval" query runs on every manager page load and bot interaction. Without this field, every query would require loading and interpreting the workflow snapshot. This is a read-optimization trade-off.
- `currentStepStartedAt`: Denormalized for the escalation worker's timeout query. Without it, the worker would need to scan `approvalHistory` arrays.
- `actorName` and `actorRole` in `approvalHistory`: Snapshot of display-time values. If the employee's name or role changes later, the historical record remains accurate.
- `workflowSnapshot`: Full copy of workflow definition at submission time. This is the most significant denormalization. Rationale: BR-102 requires that workflow changes do not affect pending requests. Embedding the snapshot avoids a versioned workflow table in MVP.

---

### 3.7 balance_ledger

Append-only ledger. Every balance change is an immutable entry. Current balance = SUM(amount) for a given (tenantId, employeeId, leaveTypeId).

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "employeeId": "ObjectId — Required, ref employees._id",
  "leaveTypeId": "ObjectId — Required, ref leave_types._id",
  "entryType": "String — Enum: 'initial_allocation' | 'accrual' | 'deduction' | 'restoration' | 'manual_adjustment' | 'carryover' | 'carryover_expiry' | 'year_end_forfeit'",
  "amount": "Number — Positive for credit, negative for debit. Stored to 2 decimal places (BR-044)",
  "effectiveDate": "Date — When this entry takes effect (for accrual: accrual date; for deduction: leave start date)",
  "description": "String — Human-readable description (e.g., 'Monthly accrual - March 2026', 'Leave request LR-12345')",
  "referenceType": "String | null — Enum: 'leave_request' | 'manual' | 'system'",
  "referenceId": "ObjectId | null — ref leave_requests._id (for deduction/restoration) or null (for accrual/manual)",
  "actorId": "ObjectId | null — Who initiated: system for accrual, HR admin for manual adjustment",
  "fiscalYear": "Number — Fiscal year this entry belongs to (for annual reporting)",
  "isCarryover": "Boolean — Whether this entry represents carried-over balance, default false",
  "createdAt": "Date — Auto-generated (immutable: no updatedAt)"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| balance_query | `{ tenantId: 1, employeeId: 1, leaveTypeId: 1, effectiveDate: -1 }` | Regular | **Primary query**: compute current balance via aggregation SUM(amount). Also supports monthly breakdown for sparkline. This is the most critical index in the system. |
| tenant_type_fiscal | `{ tenantId: 1, leaveTypeId: 1, fiscalYear: 1 }` | Regular | Annual balance report by leave type across all employees |
| tenant_reference | `{ tenantId: 1, referenceType: 1, referenceId: 1 }` | Regular | Find ledger entries for a specific leave request (e.g., on cancellation to verify deduction exists before restoration) |
| tenant_entry_date | `{ tenantId: 1, entryType: 1, effectiveDate: -1 }` | Regular | Accrual worker: find last accrual date to prevent duplicates |

**Balance calculation query (pseudo-aggregation):**

```javascript
// Current balance for one employee, one leave type
db.balance_ledger.aggregate([
  { $match: { tenantId, employeeId, leaveTypeId } },
  { $group: { _id: null, balance: { $sum: "$amount" } } }
]);

// Balance breakdown for dashboard balance rings
db.balance_ledger.aggregate([
  { $match: { tenantId, employeeId } },
  { $group: {
    _id: "$leaveTypeId",
    total: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
    used: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
    balance: { $sum: "$amount" }
  }}
]);
```

**Design decisions:**

- No `updatedAt` field: ledger entries are immutable once created.
- `fiscalYear` is pre-computed at insert time to avoid runtime calculation in reports.
- `isCarryover` flag enables separate tracking of carried-over vs. fresh entitlement.
- Negative `amount` for deductions makes balance = SUM(amount) trivially correct.
- Restoration on cancellation creates a new positive entry (not a delete of the deduction).

---

### 3.8 audit_logs

Immutable audit trail. Insert-only. No update or delete operations permitted (BR-100).

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "actorId": "ObjectId — Employee who performed the action (or 'system' sentinel)",
  "actorType": "String — Enum: 'employee' | 'system' | 'bot'",
  "action": "String — Verb describing the action",
  "entityType": "String — Collection/entity type affected",
  "entityId": "ObjectId | String — ID of the affected entity",
  "changes": "Object | null — Before/after snapshot of changed fields (for updates)",
  "metadata": "Object | null — Additional context (e.g., { via: 'slack', ip: '...', userAgent: '...' })",
  "timestamp": "Date — When the action occurred"
}
```

**Action vocabulary (standardized):**

| entityType | Possible actions |
|-----------|-----------------|
| `leave_request` | `created`, `approved`, `rejected`, `escalated`, `cancelled`, `force_approved`, `force_rejected` |
| `employee` | `created`, `invited`, `activated`, `deactivated`, `role_changed`, `team_changed`, `pseudonymized` |
| `team` | `created`, `updated`, `deactivated`, `workflow_assigned` |
| `workflow` | `created`, `updated`, `deactivated`, `cloned` |
| `leave_type` | `created`, `updated`, `deactivated` |
| `tenant` | `created`, `settings_updated`, `plan_changed`, `slack_installed`, `teams_installed` |
| `balance` | `manual_adjustment`, `accrual_batch`, `carryover_batch`, `year_end_forfeit_batch` |
| `delegation` | `created`, `revoked`, `expired` |
| `policy` | `blackout_created`, `blackout_updated`, `blackout_deleted` |

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| tenant_timestamp | `{ tenantId: 1, timestamp: -1 }` | Regular | Chronological audit trail browsing (main audit page) |
| tenant_entity | `{ tenantId: 1, entityType: 1, entityId: 1, timestamp: -1 }` | Regular | Audit history for a specific entity (request detail page audit section) |
| tenant_actor | `{ tenantId: 1, actorId: 1, timestamp: -1 }` | Regular | "What did this person do?" queries (for compliance investigations) |
| tenant_action | `{ tenantId: 1, action: 1, timestamp: -1 }` | Regular | Activity feed: recent approvals, rejections, submissions |
| ttl_index | `{ timestamp: 1 }` | TTL (optional) | Future: auto-expire after retention period. Not enabled in MVP (7-year retention managed by backup policy). |

**Immutability enforcement:**

1. Mongoose middleware: `pre('updateOne')`, `pre('updateMany')`, `pre('findOneAndUpdate')`, `pre('deleteOne')`, `pre('deleteMany')` all throw errors on the audit_logs model.
2. API layer: no PUT, PATCH, or DELETE routes exist for the audit endpoint.
3. MongoDB Atlas: optionally enforce via a database trigger that rejects updates/deletes on the collection.

**GDPR pseudonymization strategy:**

When an employee exercises the right to erasure, the `actorId` field in audit logs is replaced with a one-way hash. The audit entries remain (preserving the audit chain) but can no longer be linked to a specific individual. A new audit entry records the pseudonymization event itself.

---

### 3.9 bot_mappings

Maps platform user IDs to LeaveFlow employees.

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "platform": "String — Enum: 'slack' | 'teams'",
  "platformUserId": "String — Platform-specific user ID (Slack user ID or Teams user AAD ID)",
  "platformTeamId": "String — Slack workspace ID or Teams tenant ID",
  "employeeId": "ObjectId — ref employees._id",
  "conversationReference": "Object | null — Teams ConversationReference for proactive messaging",
  "lastInteractionAt": "Date — Last time this user interacted with the bot",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| platform_user | `{ platform: 1, platformUserId: 1, platformTeamId: 1 }` | Unique | Bot event -> employee resolution. Note: tenantId is NOT first because bot events arrive with platform IDs, not tenant IDs. Tenant is resolved from this mapping. |
| tenant_employee_platform | `{ tenantId: 1, employeeId: 1, platform: 1 }` | Unique | Find bot mapping for an employee (to send notifications) |

**Design decision — tenantId not first in primary index:**

This is the one collection where the primary query does NOT lead with `tenantId`. Bot webhook events arrive with a platform user ID and platform team ID. We must resolve the tenant from the mapping. After resolution, all subsequent queries use `tenantId`. This is acceptable because the collection is small (~20K docs at 200 tenants) and the lookup is point-query on a unique index.

---

### 3.10 holiday_calendars

Public holiday data and custom company holidays.

```json
{
  "_id": "ObjectId",
  "tenantId": "String | null — null for shared/system calendars, set for custom company holidays",
  "countryCode": "String — ISO 3166-1 alpha-2 (e.g., 'US', 'DE', 'BR')",
  "year": "Number — Calendar year",
  "source": "String — Enum: 'system' | 'custom'",
  "holidays": [
    {
      "date": "Date — Holiday date",
      "name": "String — Holiday name (English)",
      "localName": "String | null — Holiday name in local language",
      "isFixed": "Boolean — Whether this holiday is the same date every year",
      "isCustom": "Boolean — Added by tenant admin, default false"
    }
  ],
  "lastFetchedAt": "Date | null — Last time system data was refreshed from API",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| country_year | `{ tenantId: 1, countryCode: 1, year: 1 }` | Unique | Holiday lookup for working day calculation. System calendars have tenantId=null. |

**Design decisions:**

- System-level holiday data (from Nager.Date API) has `tenantId: null` and `source: 'system'`. Shared across all tenants.
- Tenant-specific custom holidays have `tenantId` set and `source: 'custom'`.
- Working day calculation merges system + custom holidays for the tenant's configured country.
- Holiday data is cached in Redis (24h TTL) to avoid repeated DB reads during bulk operations.

---

### 3.11 delegations

Approval delegation records. When a manager is OOO, they can delegate their approval authority.

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "delegatorId": "ObjectId — Employee delegating (ref employees._id)",
  "delegateId": "ObjectId — Employee receiving delegation (ref employees._id)",
  "startDate": "Date — Delegation start date (inclusive)",
  "endDate": "Date — Delegation end date (inclusive)",
  "reason": "String | null — Why delegation was set up",
  "isActive": "Boolean — Computed: true if now() between start and end, but stored for query efficiency",
  "revokedAt": "Date | null — If manually revoked early",
  "revokedBy": "ObjectId | null",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| tenant_delegator_active | `{ tenantId: 1, delegatorId: 1, startDate: 1, endDate: 1 }` | Regular | Approval engine: check if current approver has active delegation (BR-029, BR-030) |
| tenant_delegate | `{ tenantId: 1, delegateId: 1, isActive: 1 }` | Regular | "What am I delegated to approve?" query for managers |

---

### 3.12 oauth_tokens

Encrypted OAuth tokens for calendar integrations and other per-employee authorizations.

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "employeeId": "ObjectId — Required, ref employees._id",
  "service": "String — Enum: 'google_calendar' | 'outlook_calendar'",
  "encryptedAccessToken": "String — AES-256 encrypted",
  "encryptedRefreshToken": "String — AES-256 encrypted",
  "tokenExpiresAt": "Date — When access token expires",
  "scopes": "[String] — Authorized OAuth scopes",
  "isActive": "Boolean — default true",
  "lastUsedAt": "Date | null",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| tenant_employee_service | `{ tenantId: 1, employeeId: 1, service: 1 }` | Unique | Calendar sync: find token for employee + service |

---

### 3.13 blackout_periods

Date ranges when leave cannot be requested. Per-tenant, optionally scoped to teams or leave types.

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "name": "String — Required (e.g., 'Year-End Freeze', 'Product Launch Sprint')",
  "startDate": "Date — Blackout start (inclusive)",
  "endDate": "Date — Blackout end (inclusive)",
  "teamIds": "[ObjectId] | null — If set, only these teams are affected. Null = all teams.",
  "leaveTypeIds": "[ObjectId] | null — If set, only these leave types blocked. Null = all types.",
  "reason": "String | null — Explanation shown to employees",
  "isActive": "Boolean — default true",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| tenant_dates | `{ tenantId: 1, startDate: 1, endDate: 1, isActive: 1 }` | Regular | Leave request validation: find active blackouts overlapping request dates (BR-009) |

---

### 3.14 notifications

Notification delivery tracking. Used for retry logic and delivery status display.

```json
{
  "_id": "ObjectId",
  "tenantId": "String — Required, ref tenants._id",
  "recipientEmployeeId": "ObjectId — ref employees._id",
  "eventType": "String — Enum: 'request_submitted' | 'approval_pending' | 'request_approved_step' | 'request_approved_final' | 'request_rejected' | 'request_cancelled' | 'request_escalated' | 'approval_reminder' | 'channel_announcement'",
  "channel": "String — Enum: 'slack_dm' | 'teams_dm' | 'email' | 'slack_channel' | 'teams_channel'",
  "status": "String — Enum: 'queued' | 'sent' | 'delivered' | 'failed' | 'retry'",
  "referenceType": "String — Enum: 'leave_request' | 'delegation'",
  "referenceId": "ObjectId — ID of related entity",
  "platformMessageId": "String | null — Slack ts or Teams activityId (for message updates)",
  "attempts": "Number — Delivery attempts, default 0",
  "lastError": "String | null — Last delivery error message",
  "sentAt": "Date | null",
  "deliveredAt": "Date | null",
  "createdAt": "Date — Auto-generated",
  "updatedAt": "Date — Auto-updated"
}
```

**Indexes:**

| Index | Fields | Type | Rationale |
|-------|--------|------|-----------|
| tenant_recipient_event | `{ tenantId: 1, recipientEmployeeId: 1, eventType: 1, createdAt: -1 }` | Regular | Find notifications for an employee (notification history) |
| tenant_reference | `{ tenantId: 1, referenceType: 1, referenceId: 1 }` | Regular | Find all notifications for a specific request (to update approval cards on cancellation, BR-065) |
| retry_queue | `{ status: 1, createdAt: 1 }` | Regular | Notification retry worker: find failed/queued notifications |
| platform_message | `{ platformMessageId: 1, channel: 1 }` | Sparse | Update existing bot messages (e.g., mark approval card as "cancelled") |

---

## 4. FSM State Transitions

The leave request `status` field follows a finite state machine. Transitions are the only way to change status.

### State Diagram

```
                            submit()
                               |
                               v
                      [pending_validation]
                        /        |        \
            validation fails    auto-approve   normal
                  |              rule matches    flow
                  v                  |             |
          [validation_failed]  [auto_approved]  [pending_approval]
                                                    |
                                          route to step 0
                                                    |
                                                    v
                                            [pending_step_N]
                                           /    |        \
                                    approve  reject   escalate
                                      |        |        |
                              more steps?      |     advance to
                               /    \          |     next step
                             yes    no         |        |
                              |      |         v        v
                              |      v     [rejected]  [pending_step_N+1]
                              |  [approved]
                              |      |
                              v      |
                     [pending_step_N+1]
                              |
                         (loop until final)
                              |
                              v
                         [approved]
                              |
                        employee cancels
                         (future date)
                              |
                              v
                        [cancelled]
```

### Transition Table

| From State | Event | Guard Condition | To State | Side Effects |
|-----------|-------|-----------------|----------|-------------|
| (new) | `submit` | — | `pending_validation` | Validate dates, balance, overlaps, blackout |
| `pending_validation` | `validation_pass` | No auto-approval rule matches | `pending_approval` | Snapshot workflow, route to step 0 |
| `pending_validation` | `validation_pass` | Auto-approval rule matches AND coverage OK (BR-028) | `auto_approved` | Write audit log, deduct balance, sync calendar |
| `pending_validation` | `validation_pass` | Auto-approval rule matches BUT coverage violated (BR-028) | `pending_approval` | Override auto-approval, route to manual workflow |
| `pending_validation` | `validation_fail` | Balance/overlap/blackout/zero-days | `validation_failed` | Return error details |
| `pending_approval` | `approve_step` | Approver matches current step; not self (BR-020) | `pending_approval` (next step) | Advance currentStep, notify next approver, notify employee |
| `pending_approval` | `approve_step` | Final step approved | `approved` | Deduct balance, sync calendar, notify employee, post channel |
| `pending_approval` | `reject_step` | Reason provided (BR-022, min 10 chars) | `rejected` | Notify employee with reason |
| `pending_approval` | `escalate` | Timeout reached (BR-032) | `pending_approval` (next step or same with reminder) | Audit log, notify parties |
| `pending_approval` | `cancel` | Requested by employee (BR-024) | `cancelled` | Update bot messages (BR-065), notify approvers |
| `pending_approval` | `force_approve` | Actor is HR Admin (BR-031) | `approved` | Skip remaining steps, deduct balance, audit "force approved" |
| `pending_approval` | `force_reject` | Actor is HR Admin (BR-096) | `rejected` | Skip remaining steps, audit "force rejected" |
| `approved` | `cancel` | Leave start date is in the future | `cancelled` | Restore balance, delete calendar event, notify approvers (BR-064), post channel update (BR-067) |
| `auto_approved` | `cancel` | Leave start date is in the future | `cancelled` | Restore balance, delete calendar event |

**States that are terminal (no further transitions):**

- `validation_failed` — Employee must submit a new request
- `rejected` — Employee must submit a new request
- `cancelled` — Closed; balance restored if applicable

**Idempotency (BR-023):**

If an approve/reject action is received for a request that has already transitioned past that step, return a message indicating the action was already taken. No state change occurs.

---

## 5. Append-Only Balance Ledger Design

### Principles

1. **No mutable balance field exists anywhere.** Balance is always computed from ledger entries.
2. **Every mutation is an INSERT**, never an UPDATE or DELETE.
3. **Corrections create new entries**, not modifications. A wrong accrual is corrected by a `manual_adjustment` entry, not by editing the accrual entry.
4. **Amounts are signed**: positive = credit (accrual, allocation, restoration), negative = debit (deduction, forfeiture).

### Entry Types

| Entry Type | Amount Sign | When Created | Example |
|-----------|------------|-------------|---------|
| `initial_allocation` | + | Employee onboarded; front-loaded accrual | +20.00 days Vacation |
| `accrual` | + | Monthly/quarterly accrual job | +1.67 days Vacation (monthly) |
| `deduction` | - | Leave request approved or auto-approved | -3.00 days Vacation |
| `restoration` | + | Approved leave request cancelled | +3.00 days Vacation |
| `manual_adjustment` | +/- | HR admin manual balance change | +2.00 days (correction) |
| `carryover` | + | Fiscal year transition; carry forward unused days | +5.00 days (from previous year) |
| `carryover_expiry` | - | Carryover days expire after configured period (BR-046) | -5.00 days (expired carryover) |
| `year_end_forfeit` | - | Fiscal year end; use-it-or-lose-it beyond carryover cap (BR-045) | -8.00 days (forfeited) |

### Balance Computation Examples

**Current available balance:**
```
SUM(amount) WHERE tenantId=T AND employeeId=E AND leaveTypeId=LT
```

**Balance breakdown for UI rings:**
```
Total Entitlement = SUM(amount) WHERE amount > 0
Total Used = ABS(SUM(amount)) WHERE amount < 0
Current Balance = Total Entitlement - Total Used
```

**Monthly usage for sparkline chart:**
```
GROUP BY month(effectiveDate) WHERE entryType IN ('deduction', 'restoration')
```

### Race Condition Prevention

When two leave requests are submitted simultaneously for the same employee:

1. Balance check happens at validation time (optimistic).
2. Balance deduction happens at approval time (not submission).
3. The deduction is a simple INSERT (no read-modify-write cycle), so no race condition on the write.
4. If two requests are approved nearly simultaneously and the second would overdraw, the approval engine re-checks balance before creating the deduction entry. This is a serialized check using MongoDB's `findOneAndUpdate` with a condition on the computed balance.
5. For extra safety at scale, a distributed lock (Redis `SETNX` with TTL) on the key `balance-lock:{tenantId}:{employeeId}:{leaveTypeId}` can be acquired during approval.

### Materialized Balance View (Optimization for Scale)

At MVP scale (200 tenants, ~20K employees), computing SUM from the ledger on every request is fast (~1ms with the compound index).

At 10x scale (2K tenants, 200K employees), consider a materialized `balance_snapshots` collection:

```json
{
  "tenantId": "String",
  "employeeId": "ObjectId",
  "leaveTypeId": "ObjectId",
  "balance": "Number — Precomputed SUM",
  "lastLedgerEntryId": "ObjectId — Last entry included in this snapshot",
  "computedAt": "Date"
}
```

This snapshot is rebuilt periodically (nightly) or on every ledger write (event-driven). Queries first check the snapshot, then add any ledger entries created after `lastLedgerEntryId`. This is a Phase 2 optimization; MVP uses direct aggregation.

---

## 6. Multi-Tenancy Enforcement

### Layer 1: Authentication (Firebase Custom Claims)

Every authenticated request carries a JWT with `{ tenantId, role, employeeId }` in custom claims. The Fastify auth plugin extracts and verifies these claims.

### Layer 2: Request Context (Fastify Plugin)

A `tenantPlugin` runs as a Fastify `onRequest` hook after authentication:

```
1. Extract tenantId from req.auth.tenantId
2. Verify tenant exists and is active
3. Attach tenantId to req.tenantScope
4. All downstream code uses req.tenantScope (never reads tenantId from request body/params)
```

### Layer 3: Repository Pattern (Data Access)

Every repository method signature includes `tenantId` as the first parameter:

```typescript
// CORRECT
findByStatus(tenantId: string, status: string): Promise<LeaveRequest[]>

// FORBIDDEN — will not compile
findByStatus(status: string): Promise<LeaveRequest[]>
```

Repository methods ALWAYS prepend `{ tenantId }` to query filters. This is the inner defense ring.

### Layer 4: Mongoose Middleware (Safety Net)

A Mongoose plugin applied to all models (except `tenants` and `holiday_calendars` with null tenantId):

```
pre('find'):        if query lacks tenantId filter -> throw Error
pre('findOne'):     if query lacks tenantId filter -> throw Error
pre('updateOne'):   if query lacks tenantId filter -> throw Error
pre('deleteOne'):   if query lacks tenantId filter -> throw Error
pre('aggregate'):   if first $match stage lacks tenantId -> throw Error
```

This middleware is the final safety net. It catches any accidental omission in repository code.

### Layer 5: Testing

A dedicated integration test suite creates two tenants with identical data and verifies:
- Tenant A's API calls never return Tenant B's data
- Tenant A's employee cannot approve Tenant B's request
- Bot mappings resolve to the correct tenant
- Aggregation queries (dashboard, reports) are properly scoped

### Index Enforcement

Every compound index on tenant-scoped collections starts with `tenantId`. MongoDB query planner uses the index prefix, ensuring that queries without `tenantId` result in a collection scan (caught by the Mongoose middleware before it reaches the DB).

Exception: `bot_mappings` primary index starts with `platform` + `platformUserId` because bot events arrive without tenant context. See Section 3.9.

---

## 7. Audit Trail Design

### What Gets Audited

Every state-changing operation in the system produces an audit log entry:

| Category | Operations |
|---------|-----------|
| Leave Requests | create, approve, reject, escalate, cancel, force_approve, force_reject |
| Employees | create, invite, activate, deactivate, role_change, team_change |
| Teams | create, update, deactivate, workflow_assign |
| Workflows | create, update, deactivate, clone |
| Leave Types | create, update, deactivate |
| Balances | manual_adjustment, accrual_batch, carryover_batch |
| Tenant Settings | settings_update, plan_change, platform_install |
| Delegations | create, revoke |
| Blackout Periods | create, update, delete |

### Audit Entry Structure

Each entry captures:
- **Who**: `actorId` + `actorType`
- **What**: `action` + `entityType` + `entityId`
- **When**: `timestamp`
- **How**: `metadata.via` (slack/teams/web/system)
- **Details**: `changes` (before/after diff for updates)

### Changes Diff Format

For update operations, the `changes` field contains a before/after snapshot:

```json
{
  "changes": {
    "status": { "from": "pending_approval", "to": "approved" },
    "currentStep": { "from": 0, "to": -1 }
  }
}
```

For create operations, `changes` is null (the full entity can be retrieved by `entityId`).

### Dashboard Activity Feed Query

The dashboard activity feed shows the 10 most recent events across specific action types:

```javascript
db.audit_logs.find({
  tenantId: T,
  action: { $in: ['created', 'approved', 'rejected', 'cancelled', 'force_approved'] },
  entityType: 'leave_request'
}).sort({ timestamp: -1 }).limit(10);
// Uses index: tenant_action
```

---

## 8. Access Patterns

### Dashboard Widgets

| Widget | Query | Collection | Index Used | Frequency |
|--------|-------|-----------|-----------|-----------|
| Out Today | `{ tenantId, status: { $in: ['approved', 'auto_approved'] }, startDate: { $lte: today }, endDate: { $gte: today } }` | `leave_requests` | `tenant_dates` | Real-time / 1min cache |
| Pending Approvals Count | `{ tenantId, status: 'pending_approval' }` + `countDocuments` | `leave_requests` | `tenant_status_created` | Real-time |
| Stale Count (>48h) | `{ tenantId, status: 'pending_approval', currentStepStartedAt: { $lt: 48h_ago } }` | `leave_requests` | `tenant_stale` | Real-time |
| Utilization Rate | Aggregate: per-employee balance used/total ratio, averaged | `balance_ledger` | `balance_query` | Hourly cache |
| Upcoming Week | `{ tenantId, status: { $in: ['approved', 'auto_approved'] }, startDate: { $lte: friday }, endDate: { $gte: monday } }` grouped by day | `leave_requests` | `tenant_dates` | 5min cache |
| Absence Heatmap | Same as above but for full month, count per day | `leave_requests` | `tenant_dates` | 5min cache |
| Resolution Rate | `{ tenantId, createdAt: { $gte: monthStart } }` grouped by status | `leave_requests` | `tenant_status_created` | 5min cache |
| Activity Feed | `{ tenantId, entityType: 'leave_request', action: { $in: [...] } }` sort by timestamp desc, limit 10 | `audit_logs` | `tenant_action` | Real-time |
| Needs Attention | `{ tenantId, status: 'pending_approval' }` sort by currentStepStartedAt asc, limit 10 | `leave_requests` | `tenant_stale` | Real-time |
| Team Balances | Aggregate balance_ledger grouped by employee.teamId and leaveTypeId | `balance_ledger` + `employees` (lookup) | `balance_query` + `tenant_team` | Hourly cache |

### Employee Self-Service

| Pattern | Query | Collection | Index Used |
|---------|-------|-----------|-----------|
| My Balances | Aggregate SUM(amount) grouped by leaveTypeId | `balance_ledger` | `balance_query` |
| My Requests | `{ tenantId, employeeId, status: { $ne: 'validation_failed' } }` sort by createdAt desc | `leave_requests` | `tenant_employee_status` |
| My Active Request | `{ tenantId, employeeId, status: 'pending_approval' }` | `leave_requests` | `tenant_employee_status` |
| Team Calendar (mini) | `{ tenantId, status: { $in: ['approved', 'auto_approved'] }, startDate/endDate overlap this week }` filtered by team | `leave_requests` | `tenant_dates` |
| Overlap Check | `{ tenantId, employeeId, status: { $in: ['pending_approval', 'approved', 'auto_approved'] }, startDate/endDate overlap }` | `leave_requests` | `tenant_employee_status` |

### Manager View

| Pattern | Query | Collection | Index Used |
|---------|-------|-----------|-----------|
| Pending for Me | `{ tenantId, currentApproverEmployeeId: me, status: 'pending_approval' }` | `leave_requests` | `tenant_approver` |
| Team Absences | `{ tenantId, employeeId: { $in: myTeamMemberIds }, status: 'approved', date range }` | `leave_requests` | `tenant_dates` |
| Team Balances | Aggregate balance_ledger for my team member IDs | `balance_ledger` | `balance_query` |

### Bot Commands

| Command | Query | Collection | Index Used |
|---------|-------|-----------|-----------|
| `/leave` (resolve user) | `{ platform, platformUserId, platformTeamId }` | `bot_mappings` | `platform_user` |
| `/leave balance` | Aggregate SUM(amount) | `balance_ledger` | `balance_query` |
| `/leave status` | `{ tenantId, employeeId }` sort by createdAt desc, limit 5 | `leave_requests` | `tenant_employee_status` |
| Approve button | `{ _id: requestId, tenantId }` + advance FSM | `leave_requests` | `_id` + tenant check |

### Approval Engine

| Pattern | Query | Collection | Index Used |
|---------|-------|-----------|-----------|
| Check delegation | `{ tenantId, delegatorId, startDate <= now, endDate >= now, revokedAt: null }` | `delegations` | `tenant_delegator_active` |
| Escalation scan | `{ tenantId, status: 'pending_approval', currentStepStartedAt: { $lt: threshold } }` (all tenants) | `leave_requests` | `tenant_stale` |
| Working day calc | `{ tenantId, countryCode, year }` | `holiday_calendars` | `country_year` |
| Blackout check | `{ tenantId, startDate/endDate overlap, isActive: true }` | `blackout_periods` | `tenant_dates` |

### Calendar View (Swim Lane)

| Pattern | Query | Collection | Index Used |
|---------|-------|-----------|-----------|
| Team-grouped absences | `{ tenantId, status: { $in: ['approved', 'auto_approved', 'pending_approval'] }, date range }` joined with employees for team grouping | `leave_requests` + `employees` | `tenant_dates` + `tenant_team` |
| Coverage calculation | Count absences per team per day / team size | `leave_requests` + `teams` | `tenant_dates` |

---

## 9. Caching Strategy

All caching uses Redis (Upstash). Key naming convention: `lf:{tenantId}:{entity}:{qualifier}`.

| Data | Cache Key Pattern | TTL | Invalidation | Rationale |
|------|------------------|-----|-------------|-----------|
| Employee context (bot) | `lf:{tenantId}:emp:{employeeId}:ctx` | 5 min | On employee update, team change | Bot commands need employee + team + leave types. Avoid 3 DB reads per bot interaction. |
| Leave type definitions | `lf:{tenantId}:lt:all` | 15 min | On leave type create/update/deactivate | Leave types change rarely. Read on every request form and validation. |
| Holiday calendar | `lf:holidays:{countryCode}:{year}` | 24 hours | Manual refresh, annual API sync | Holiday data is static per year. Read during working-day calculation. |
| Tenant settings | `lf:{tenantId}:settings` | 10 min | On settings update | Work week, timezone, coverage minimum. Read on every validation. |
| Dashboard: out-today count | `lf:{tenantId}:dash:out-today` | 1 min | On leave approval/cancellation | High-read widget, simple count. |
| Dashboard: pending count | `lf:{tenantId}:dash:pending` | 30 sec | On request submit/approve/reject | Real-time important for approvers. Short TTL over event invalidation for simplicity. |
| Dashboard: heatmap | `lf:{tenantId}:dash:heatmap:{yearMonth}` | 5 min | On leave approval/cancellation in that month | Medium-cost aggregation. |
| Dashboard: utilization | `lf:{tenantId}:dash:utilization` | 1 hour | On balance ledger entry | Expensive aggregation across all employees. Hourly is acceptable. |
| Dashboard: team balances | `lf:{tenantId}:dash:team-balances` | 1 hour | On balance ledger entry | Same rationale as utilization. |
| Workflow definitions | Not cached | — | — | Small collection, infrequent reads, always need latest version. |
| Balance (per employee) | Not cached | — | — | **Critical**: balance must reflect latest ledger state for accurate validation. Ledger aggregation with compound index is fast (~1ms). Caching risks stale balance leading to over-approval. |

**Cache invalidation strategy:**

- **Event-driven invalidation**: Service methods call `cache.invalidate(key)` after writes. Simple and predictable.
- **TTL as safety net**: Even without explicit invalidation, TTL ensures eventual consistency.
- **No cache-aside for balance**: Balance is always computed fresh. This is a deliberate choice to prevent approval of leave when balance is insufficient due to a stale cache.

---

## 10. Data Volume Estimates

### Baseline: 200 tenants, 6 months post-launch

| Collection | Docs (6 months) | Avg Doc Size | Total Size | Growth/Month |
|-----------|-----------------|-------------|-----------|-------------|
| `tenants` | 200 | 2 KB | 400 KB | +30 docs |
| `employees` | 20,000 | 500 B | 10 MB | +3,000 docs |
| `teams` | 2,000 | 300 B | 600 KB | +300 docs |
| `workflows` | 1,000 | 1 KB | 1 MB | +100 docs |
| `leave_types` | 1,000 | 500 B | 500 KB | +100 docs |
| `leave_requests` | 50,000 | 3 KB | 150 MB | +10,000 docs |
| `balance_ledger` | 250,000 | 300 B | 75 MB | +50,000 entries |
| `audit_logs` | 500,000 | 400 B | 200 MB | +100,000 entries |
| `bot_mappings` | 20,000 | 500 B | 10 MB | +3,000 docs |
| `holiday_calendars` | 250 | 5 KB | 1.25 MB | +50 docs/year |
| `delegations` | 500 | 300 B | 150 KB | +100 docs |
| `oauth_tokens` | 10,000 | 500 B | 5 MB | +1,500 docs |
| `blackout_periods` | 500 | 300 B | 150 KB | +50 docs |
| `notifications` | 200,000 | 400 B | 80 MB | +40,000 entries |
| **Total** | ~1.05M | — | **~530 MB** | ~208K docs/mo |

### 10x Scale: 2,000 tenants, 18 months

| Collection | Docs | Total Size |
|-----------|------|-----------|
| `leave_requests` | 1.5M | 4.5 GB |
| `balance_ledger` | 7.5M | 2.25 GB |
| `audit_logs` | 15M | 6 GB |
| `notifications` | 6M | 2.4 GB |
| **Total** | ~30M | **~16 GB** |

MongoDB Atlas M10 handles this comfortably (10 GB storage, 2 GB RAM). At 10x scale, upgrade to M30 (40 GB, 8 GB RAM) with read replicas for reporting.

### Index Size Estimates (10x Scale)

| Collection | Index Count | Estimated Index Size |
|-----------|------------|---------------------|
| `leave_requests` | 7 | ~600 MB |
| `balance_ledger` | 4 | ~1.2 GB |
| `audit_logs` | 4 | ~2.4 GB |
| `notifications` | 4 | ~1 GB |
| Others | ~15 | ~200 MB |
| **Total** | ~34 | **~5.4 GB** |

At 10x scale, indexes must fit in RAM for performant queries. M30 (8 GB RAM) provides adequate headroom. Working set (hot data + indexes) should stay under 70% of available RAM.

---

## 11. Migration Plan

### Migration 001: Initial Schema Creation

This is the foundational migration that creates all collections, indexes, and seed data.

**Up:**

```javascript
// Migration: 001-initial-schema.js
// Creates all 14 collections with indexes and validation

module.exports = {
  async up(db) {
    // 1. Create collections with JSON Schema validation
    await db.createCollection('tenants', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'slug', 'plan', 'isActive'],
          properties: {
            name: { bsonType: 'string', minLength: 1, maxLength: 100 },
            slug: { bsonType: 'string', minLength: 3, maxLength: 50, pattern: '^[a-z0-9-]+$' },
            plan: { enum: ['free', 'team', 'business', 'enterprise'] },
            isActive: { bsonType: 'bool' }
          }
        }
      }
    });

    await db.createCollection('employees');
    await db.createCollection('teams');
    await db.createCollection('workflows');
    await db.createCollection('leave_types');
    await db.createCollection('leave_requests');
    await db.createCollection('balance_ledger');
    await db.createCollection('audit_logs');
    await db.createCollection('bot_mappings');
    await db.createCollection('holiday_calendars');
    await db.createCollection('delegations');
    await db.createCollection('oauth_tokens');
    await db.createCollection('blackout_periods');
    await db.createCollection('notifications');

    // 2. Create indexes (in parallel where possible)
    // --- tenants ---
    await db.collection('tenants').createIndexes([
      { key: { slug: 1 }, unique: true },
      { key: { stripeCustomerId: 1 }, sparse: true, unique: true },
      { key: { 'slackInstallation.teamId': 1 }, sparse: true, unique: true },
      { key: { 'teamsInstallation.tenantId': 1 }, sparse: true, unique: true },
      { key: { isActive: 1, plan: 1 } }
    ]);

    // --- employees ---
    await db.collection('employees').createIndexes([
      { key: { tenantId: 1, email: 1 }, unique: true },
      { key: { tenantId: 1, teamId: 1, status: 1 } },
      { key: { tenantId: 1, firebaseUid: 1 }, sparse: true, unique: true },
      { key: { tenantId: 1, role: 1, status: 1 } },
      { key: { tenantId: 1, status: 1 } },
      { key: { invitationToken: 1 }, sparse: true, unique: true }
    ]);

    // --- teams ---
    await db.collection('teams').createIndexes([
      { key: { tenantId: 1, name: 1 }, unique: true },
      { key: { tenantId: 1, workflowId: 1 } },
      { key: { tenantId: 1, managerId: 1 } }
    ]);

    // --- workflows ---
    await db.collection('workflows').createIndexes([
      { key: { tenantId: 1, name: 1, isActive: 1 } },
      { key: { tenantId: 1, isTemplate: 1 } },
      { key: { isTemplate: 1, templateSlug: 1 } }
    ]);

    // --- leave_types ---
    await db.collection('leave_types').createIndexes([
      { key: { tenantId: 1, slug: 1 }, unique: true },
      { key: { tenantId: 1, isActive: 1, sortOrder: 1 } }
    ]);

    // --- leave_requests ---
    await db.collection('leave_requests').createIndexes([
      { key: { tenantId: 1, status: 1, createdAt: -1 } },
      { key: { tenantId: 1, employeeId: 1, status: 1, startDate: -1 } },
      { key: { tenantId: 1, currentApproverEmployeeId: 1, status: 1 } },
      { key: { tenantId: 1, status: 1, startDate: 1, endDate: 1 } },
      { key: { tenantId: 1, status: 1, currentStepStartedAt: 1 } },
      { key: { tenantId: 1, createdAt: -1 } }
    ]);

    // --- balance_ledger ---
    await db.collection('balance_ledger').createIndexes([
      { key: { tenantId: 1, employeeId: 1, leaveTypeId: 1, effectiveDate: -1 } },
      { key: { tenantId: 1, leaveTypeId: 1, fiscalYear: 1 } },
      { key: { tenantId: 1, referenceType: 1, referenceId: 1 } },
      { key: { tenantId: 1, entryType: 1, effectiveDate: -1 } }
    ]);

    // --- audit_logs ---
    await db.collection('audit_logs').createIndexes([
      { key: { tenantId: 1, timestamp: -1 } },
      { key: { tenantId: 1, entityType: 1, entityId: 1, timestamp: -1 } },
      { key: { tenantId: 1, actorId: 1, timestamp: -1 } },
      { key: { tenantId: 1, action: 1, timestamp: -1 } }
    ]);

    // --- bot_mappings ---
    await db.collection('bot_mappings').createIndexes([
      { key: { platform: 1, platformUserId: 1, platformTeamId: 1 }, unique: true },
      { key: { tenantId: 1, employeeId: 1, platform: 1 }, unique: true }
    ]);

    // --- holiday_calendars ---
    await db.collection('holiday_calendars').createIndexes([
      { key: { tenantId: 1, countryCode: 1, year: 1 }, unique: true }
    ]);

    // --- delegations ---
    await db.collection('delegations').createIndexes([
      { key: { tenantId: 1, delegatorId: 1, startDate: 1, endDate: 1 } },
      { key: { tenantId: 1, delegateId: 1, isActive: 1 } }
    ]);

    // --- oauth_tokens ---
    await db.collection('oauth_tokens').createIndexes([
      { key: { tenantId: 1, employeeId: 1, service: 1 }, unique: true }
    ]);

    // --- blackout_periods ---
    await db.collection('blackout_periods').createIndexes([
      { key: { tenantId: 1, startDate: 1, endDate: 1, isActive: 1 } }
    ]);

    // --- notifications ---
    await db.collection('notifications').createIndexes([
      { key: { tenantId: 1, recipientEmployeeId: 1, eventType: 1, createdAt: -1 } },
      { key: { tenantId: 1, referenceType: 1, referenceId: 1 } },
      { key: { status: 1, createdAt: 1 } },
      { key: { platformMessageId: 1, channel: 1 }, sparse: true }
    ]);

    // 3. Seed system workflow templates
    await db.collection('workflows').insertMany([
      {
        tenantId: null,
        name: 'Simple (1-step)',
        description: 'Direct manager approves all requests.',
        steps: [
          { order: 0, approverType: 'role_direct_manager', timeoutHours: 48, escalationAction: 'remind', maxReminders: 3, allowDelegation: true }
        ],
        autoApprovalRules: [],
        isTemplate: true,
        templateSlug: 'simple',
        version: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: null,
        name: 'Standard (2-step)',
        description: 'Team lead approves, then HR confirms.',
        steps: [
          { order: 0, approverType: 'role_team_lead', timeoutHours: 48, escalationAction: 'remind', maxReminders: 3, allowDelegation: true },
          { order: 1, approverType: 'role_hr', timeoutHours: 24, escalationAction: 'auto_approve', maxReminders: 0, allowDelegation: false }
        ],
        autoApprovalRules: [],
        isTemplate: true,
        templateSlug: 'standard',
        version: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: null,
        name: 'Enterprise (3-step)',
        description: 'Team lead, then department head, then HR.',
        steps: [
          { order: 0, approverType: 'role_team_lead', timeoutHours: 48, escalationAction: 'escalate_next', maxReminders: 0, allowDelegation: true },
          { order: 1, approverType: 'specific_user', approverUserId: null, timeoutHours: 72, escalationAction: 'remind', maxReminders: 3, allowDelegation: true },
          { order: 2, approverType: 'role_hr', timeoutHours: 24, escalationAction: 'auto_approve', maxReminders: 0, allowDelegation: false }
        ],
        autoApprovalRules: [],
        isTemplate: true,
        templateSlug: 'enterprise',
        version: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // 4. Seed seeded leave types function (called per tenant on registration)
    // This is not executed here but defined as a reference.
    // See: tenant.service.ts -> seedLeaveTypes(tenantId)
  },

  async down(db) {
    // Drop all collections (DESTRUCTIVE)
    const collections = [
      'tenants', 'employees', 'teams', 'workflows', 'leave_types',
      'leave_requests', 'balance_ledger', 'audit_logs', 'bot_mappings',
      'holiday_calendars', 'delegations', 'oauth_tokens', 'blackout_periods',
      'notifications'
    ];
    for (const name of collections) {
      await db.collection(name).drop().catch(() => {});
    }
  }
};
```

**Estimated Duration:** < 30 seconds (index creation on empty collections is fast).

**Rollback:** Drop all collections. This is safe only before any tenant data exists.

### Seed Data: Leave Types per Tenant

When a tenant registers, the `tenant.service.ts` seeds four default leave types (BR-053):

```javascript
const SEEDED_LEAVE_TYPES = [
  {
    name: 'Vacation', slug: 'vacation', color: '#818CF8', icon: 'sun',
    isPaid: true, requiresApproval: true, defaultEntitlementDays: 20,
    accrualRule: { type: 'front_loaded' }, carryoverRule: { enabled: false },
    isDefault: true, sortOrder: 0
  },
  {
    name: 'Sick Leave', slug: 'sick', color: '#FB7185', icon: 'heart',
    isPaid: true, requiresApproval: true, defaultEntitlementDays: 10,
    accrualRule: { type: 'front_loaded' }, carryoverRule: { enabled: false },
    isRetroactiveAllowed: true, isDefault: true, sortOrder: 1
  },
  {
    name: 'Personal', slug: 'personal', color: '#34D399', icon: 'user',
    isPaid: true, requiresApproval: true, defaultEntitlementDays: 3,
    accrualRule: { type: 'front_loaded' }, carryoverRule: { enabled: false },
    isDefault: true, sortOrder: 2
  },
  {
    name: 'Unpaid Leave', slug: 'unpaid', color: '#9CA3AF', icon: 'clock',
    isPaid: false, requiresApproval: true, isUnlimited: true,
    accrualRule: { type: 'none' }, carryoverRule: { enabled: false },
    isDefault: true, sortOrder: 3
  }
];
```

### Seed Data: Initial Balance Allocation

When an employee is added to a team, the system creates `initial_allocation` ledger entries for each accrual-based leave type:

```javascript
// For each leave type with accrualRule.type === 'front_loaded':
// amount = defaultEntitlementDays * (remainingMonths / 12)  if mid-year hire (BR-047)
// amount = defaultEntitlementDays                           if start-of-year or new tenant
```

---

## 12. Performance Considerations

### Denormalization Decisions

| Field | Location | Denormalized From | Rationale | Consistency Mechanism |
|-------|---------|-------------------|-----------|----------------------|
| `currentApproverEmployeeId` | `leave_requests` | Resolved from `workflowSnapshot.steps[currentStep]` + employee lookup | "Requests awaiting my approval" query runs on every manager page load. Without this, each query requires loading and interpreting the workflow snapshot for every pending request. | Updated atomically during step transition in approval engine. |
| `currentStepStartedAt` | `leave_requests` | Could be derived from `approvalHistory[currentStep].timestamp` | Escalation worker runs every 15 minutes across ALL tenants. Scanning approvalHistory arrays is expensive. | Updated atomically during step transition. |
| `workflowSnapshot` | `leave_requests` | Full copy of `workflows` document | BR-102: pending requests must use the workflow version at submission time. Without snapshot, a versioned workflow table is needed. | Write-once at submission. Never updated. |
| `actorName`, `actorRole` | `leave_requests.approvalHistory[]` | `employees.displayName`, `employees.role` | Bot messages and approval journey UI show historical actor names. If employee is renamed, the approval history should reflect the name at time of action. | Write-once per approval action. |
| `displayName` | `employees` | `firstName + ' ' + lastName` | Avoids string concatenation in every query and template. | Updated via Mongoose pre-save hook. |

### Compound Index Strategy

All tenant-scoped indexes begin with `tenantId`. This ensures:

1. **Index prefix matching**: MongoDB can use any prefix of a compound index. Since all queries include `tenantId`, every compound index is usable.
2. **Index intersection avoidance**: MongoDB rarely uses index intersection effectively. Compound indexes that match the full query filter + sort are preferred.
3. **Covered queries**: Where possible, indexes include all fields needed by the query (projection) to avoid document fetches.

### Covered Query Examples

| Query | Index | Covered Fields |
|-------|-------|---------------|
| Pending approvals count | `{ tenantId: 1, status: 1, createdAt: -1 }` | `countDocuments()` only needs index scan, no doc fetch |
| Out-today count | `{ tenantId: 1, status: 1, startDate: 1, endDate: 1 }` | Count with date range filter, no doc fetch |
| Employee exists check | `{ tenantId: 1, email: 1 }` | Existence check, no doc fetch |

### Aggregation Pipeline Optimization

For the dashboard widgets that use aggregation pipelines:

1. **$match first**: Always filter by `tenantId` and `status` in the first pipeline stage. This uses indexes and reduces the working set.
2. **$project before $group**: Remove unnecessary fields before grouping to reduce memory usage.
3. **allowDiskUse: false**: Dashboard aggregations should fit in memory (100 MB limit). If they do not, the query needs optimization.
4. **$facet for dashboard**: Consider using `$facet` to run multiple widget aggregations in a single pipeline (reduces round trips).

### Write Concerns

| Collection | Write Concern | Rationale |
|-----------|--------------|-----------|
| `leave_requests` | `{ w: 'majority' }` | Financial/compliance data — must survive primary failure |
| `balance_ledger` | `{ w: 'majority' }` | Financial data — append-only, must not be lost |
| `audit_logs` | `{ w: 'majority' }` | Compliance — immutable audit trail |
| `notifications` | `{ w: 1 }` | Best-effort delivery tracking — can be rebuilt from events |
| `bot_mappings` | `{ w: 1 }` | Can be re-established on next bot interaction |
| Others | `{ w: 'majority' }` | Default for all other collections |

### Read Preferences

| Query Type | Read Preference | Rationale |
|-----------|----------------|-----------|
| Leave request submission | `primary` | Must read latest state for overlap/balance validation |
| Approval action | `primary` | Must read latest state for FSM transition |
| Dashboard widgets | `primaryPreferred` | Slight staleness acceptable; falls back if primary busy |
| Reports/exports | `secondaryPreferred` | Read-heavy, stale-tolerant; offload from primary (when read replicas exist) |
| Holiday calendar | `secondaryPreferred` | Static data, any replica is fine |

---

## 13. Backup and Recovery

### MongoDB Atlas Built-in Backups

| Feature | Configuration |
|---------|-------------|
| Continuous backup | Enabled (Atlas M10+ includes this) |
| Point-in-time recovery | Last 7 days with 1-second granularity |
| Snapshot schedule | Daily snapshots retained for 7 days |
| Weekly snapshots | Retained for 4 weeks |
| Monthly snapshots | Retained for 12 months |
| On-demand snapshots | Before schema migrations, before destructive operations |

### Data Recovery Scenarios

| Scenario | Recovery Method | RTO | RPO |
|---------|----------------|-----|-----|
| Accidental document deletion | Point-in-time recovery to before deletion, extract document, restore | 30 min | 0 (exact point-in-time) |
| Accidental collection drop | Point-in-time recovery | 1 hour | 0 |
| Tenant data corruption | Restore tenant's data from snapshot; filter by tenantId | 2 hours | < 24 hours (daily snapshot) |
| Full cluster failure | Atlas automatic failover to secondary | < 60 seconds | 0 (replica set) |
| Region failure | Atlas multi-region cluster (Phase 3) | 5 min | < 1 second |
| Migration rollback | Run migration down script; restore from pre-migration snapshot | 30 min | 0 |

### Backup Verification

- **Monthly**: Restore a snapshot to a test cluster and verify data integrity (automated script).
- **Quarterly**: Full disaster recovery drill — restore to a fresh cluster, verify application connectivity, run integration tests.

### Data Retention Enforcement

| Data | Retention Period | Enforcement |
|------|-----------------|-------------|
| Active tenant data | Indefinite while subscribed | No action needed |
| Soft-deleted tenant | 90 days | Background job: purge after 90 days (BR, GDPR) |
| Leave requests | 5 years | Background job: archive to cold storage after 5 years |
| Audit logs | 7 years | Background job: archive after 7 years (SOC 2) |
| Balance ledger | 5 years | Matches leave request retention |
| OAuth tokens | Until revoked/employee removed | Cleanup on employee deactivation |
| Bot mappings | Until employee removed + 30 days | Cleanup job |
| Notifications | 1 year | TTL index or background cleanup |

### Redis Data (Non-Persistent)

Redis (Upstash) is used for caching and job queues. Data loss in Redis results in:

- **Cache miss**: Application falls back to MongoDB. No data loss.
- **Job queue loss**: In-progress jobs are lost. BullMQ jobs should be re-creatable from the source of truth (MongoDB). The escalation worker re-scans on its next 15-minute cycle. Notification jobs can be rebuilt from audit log events.

Redis persistence (AOF or RDB) is handled by Upstash. For BullMQ job reliability, enable Redis persistence in the Upstash configuration.

---

*Data model design complete. Ready for handoff to API Designer and Software Developer.*
