# Architecture

## System Overview

LeaveFlow is a multi-tenant leave management SaaS composed of three runnable applications and three shared packages inside a Turborepo monorepo.

```
┌────────────────────────────────────────────────────────────────┐
│  Browser / Mobile                                              │
│  Firebase SDK  →  gets ID token from Firebase Auth            │
└─────────────────────────┬──────────────────────────────────────┘
                          │  HTTPS + Bearer token
┌─────────────────────────▼──────────────────────────────────────┐
│  apps/web  (Next.js 15, React 19, Tailwind CSS)                │
│  Server components + API route handlers                        │
└─────────────────────────┬──────────────────────────────────────┘
                          │  Internal API calls
┌─────────────────────────▼──────────────────────────────────────┐
│  apps/api  (Fastify 5, TypeScript)                             │
│                                                                │
│  Plugins: authPlugin → tenantPlugin → corsPlugin →            │
│           securityPlugin → errorHandlerPlugin                  │
│                                                                │
│  Route modules: auth, tenant, employee, team, leave-type,      │
│  workflow, leave-request, approval, delegation, blackout,      │
│  balance, billing, dashboard, calendar, calendar-sync,         │
│  holidays, notifications, audit, onboarding, health,           │
│  bot-slack, bot-teams                                          │
│                                                                │
│  Workers (BullMQ): escalation, accrual, notification,          │
│  calendar-sync, dashboard-cache                                │
└──────────┬─────────────────────────────┬───────────────────────┘
           │                             │
   ┌───────▼───────┐             ┌───────▼───────┐
   │  MongoDB       │             │  Redis         │
   │  (Mongoose 8)  │             │  (ioredis 5)   │
   │  All documents │             │  BullMQ queues │
   │  keyed by      │             │  Session nonces│
   │  tenantId      │             │  Dashboard     │
   └───────────────┘             │  cache         │
                                 └───────────────┘
```

### Shared Packages

| Package | Purpose |
|---|---|
| `@leaveflow/shared-types` | TypeScript interfaces shared between API and web |
| `@leaveflow/validation` | Zod schemas used by both API validators and web forms |
| `@leaveflow/constants` | Enumerated string constants (roles, statuses, leave categories) |

---

## Multi-Tenancy Model

Every resource in the system belongs to exactly one tenant. Isolation is enforced at five layers.

| Layer | Mechanism |
|---|---|
| 1. JWT claims | Firebase ID tokens carry a `tenantId` custom claim set at registration time |
| 2. Auth plugin | Verifies the token and populates `request.auth.tenantId` |
| 3. Tenant plugin | Copies `request.auth.tenantId` to `request.tenantId`; blocks requests without it |
| 4. Repository layer | Every query includes `{ tenantId }` as a mandatory filter via the `withTenant()` helper |
| 5. Mongoose model | The `tenantId` field is indexed on every collection |

A route cannot access another tenant's data even if it constructs a valid object ID for a cross-tenant document — the repository layer will return null or an empty result.

---

## Authentication Flow

```
1. User registers (POST /auth/register)
   → Firebase user created
   → Tenant document created in MongoDB
   → Employee document created with role = "company_admin"
   → Firebase custom claims set: { tenantId, employeeId, role }

2. User signs in (client-side, Firebase SDK)
   → Firebase returns a signed ID token (JWT)

3. User calls any protected API endpoint
   → Client sends: Authorization: Bearer <ID token>

4. authPlugin (onRequest hook)
   → Calls firebase-admin.verifyIdToken(token)
   → Validates presence of tenantId, employeeId, role claims
   → Attaches { uid, tenantId, employeeId, role } to request.auth

5. tenantPlugin (preHandler hook)
   → Copies request.auth.tenantId → request.tenantId
   → Returns 403 if tenantId is missing

6. Route handler executes
   → Passes tenantId to repository for all DB queries
```

Public routes (`{ config: { public: true } }`) and bot webhook paths (`/slack/`, `/teams/`) skip steps 4–5.

---

## Approval Engine (FSM)

The approval engine models each leave request as a finite state machine.

### States

| State | Description |
|---|---|
| `draft` | Not yet submitted |
| `pending_validation` | Submitted; balance and blackout checks running |
| `pending_approval` | Validation passed; waiting for approver action |
| `approved` | All steps approved |
| `rejected` | Any step rejected |
| `cancelled` | Cancelled by the employee or HR |
| `escalated` | Approver did not act within the escalation deadline |

### Transitions

| From | Action | To |
|---|---|---|
| `draft` | `validation_passed` | `pending_approval` |
| `draft` | `validation_failed` | `rejected` |
| `pending_validation` | `validation_passed` | `pending_approval` |
| `pending_validation` | `validation_failed` | `rejected` |
| `pending_approval` | `approve` (step complete) | `approved` |
| `pending_approval` | `approve` (more steps) | `pending_approval` (next step) |
| `pending_approval` | `reject` | `rejected` |
| `pending_approval` | `cancel` | `cancelled` |
| `pending_approval` | `escalate` | `escalated` |
| `pending_approval` | `auto_approve` | `approved` |
| `approved` | `cancel` | `cancelled` |

### Multi-Step Workflows

A workflow defines an ordered list of approval steps. Each step specifies:

- `approverType` — `manager`, `hr_admin`, `specific_employee`
- `escalationDays` — days before the escalation action triggers
- `escalationAction` — `auto_approve`, `notify_hr`, or `escalate`

When a step is approved, the engine sets `currentApproverEmployeeId` to the next step's approver and advances `currentStep`. When the final step is approved, the request transitions to `approved`.

### Delegation

An approver can delegate their authority to another employee for a date range. The `assertIsDesignatedApprover` guard checks both direct assignment and active delegations before allowing an approve/reject action.

---

## Balance Ledger

Leave balances use an **append-only ledger** design. There is no mutable "current balance" field.

### Ledger Entry Types

| Type | When created |
|---|---|
| `initial_grant` | Onboarding or new leave type assignment |
| `accrual` | Monthly accrual job |
| `debit` | Leave request approved |
| `credit` | Leave request cancelled after approval |
| `manual_adjustment` | HR manual adjustment via `POST /balances/adjust` |
| `carry_over` | Year-end carry-over job |
| `expiry` | Carry-over balance expiry |

### Balance Calculation

```
current balance = SUM(amount) for all ledger entries
                  where tenantId = X
                    AND employeeId = Y
                    AND leaveTypeId = Z
                    AND fiscalYear = current
```

This design makes any historical point-in-time balance trivially reproducible and eliminates race conditions from concurrent updates.

---

## Background Job Architecture

All background processing uses **BullMQ** backed by Redis. Workers are registered as a single unit and share graceful shutdown with the main server.

### Queues and Workers

| Queue | Worker | Schedule | Description |
|---|---|---|---|
| `escalation` | `EscalationWorker` | Repeatable, every 15 minutes | Finds `pending_approval` requests past their escalation deadline and triggers the configured escalation action |
| `accrual` | `AccrualWorker` | Repeatable, monthly | Runs leave accruals for all active employees according to their leave type's accrual policy |
| `notification` | `NotificationWorker` | On demand | Dispatches notifications to Slack, Teams, and in-app channels; concurrency 10, rate-limited to 100 jobs/second |
| `calendar-sync` | `CalendarSyncWorker` | On demand | Creates or deletes Google Calendar / Outlook out-of-office events when a leave request is approved or cancelled |
| `dashboard-cache` | `DashboardCacheWorker` | Repeatable, every 5 minutes | Pre-computes all 9 dashboard widget payloads and writes them to Redis; `GET /dashboard/summary` reads from cache first |

### Job Retry Policy

- All workers: maximum 5 attempts with exponential backoff.
- After 5 failures a job moves to the dead-letter queue.
- Bull Board is exposed at `GET /admin/queues` (requires `company_admin` role) for queue inspection.

---

## Bot Integration

Slack and Teams bots follow the **adapter pattern**. All platform-specific logic is isolated in `modules/bot-slack` and `modules/bot-teams`; shared business logic lives in `modules/bot-adapter`.

```
Slack event / Teams activity
        │
        ▼
Platform-specific webhook handler
  (validates signature / HMAC)
        │
        ▼
BotAdapterInterface
  .handleMessage(context)
  .sendMessage(channel, payload)
        │
        ▼
Shared leave request / notification logic
```

Bot webhook paths (`/slack/*`, `/teams/*`) are excluded from the JWT auth plugin since they use their own platform-level signature verification (Slack signing secret, Teams HMAC).

---

## GDPR Compliance

LeaveFlow implements GDPR-compliant data handling for employee records:

- **Export** (`gdprExport`) — produces a complete JSON snapshot of all data associated with an employee.
- **Pseudonymization** (`gdprDelete`) — replaces personal identifiers (`firstName`, `lastName`, `email`, `firebaseUid`) with the token `[DELETED:<employeeId>]`. The employee ID is retained so audit log entries remain traceable without exposing PII. The employee is set to `inactive` status.

These operations are available as service functions in `modules/employee/employee.gdpr.ts` and can be exposed via HR admin tooling.

---

## Calendar Sync Security

The OAuth flow for Google Calendar and Outlook Calendar is protected against CSRF attacks:

1. When a user initiates the OAuth flow, a 32-byte random nonce is stored in Redis with a 600-second TTL.
2. The nonce is passed as the `state` parameter in the OAuth redirect.
3. On callback, the nonce is **atomically consumed** (read + delete) from Redis using `GETDEL`.
4. If the nonce is missing or expired, the callback returns an error.

Access and refresh tokens are encrypted with **AES-256-GCM** before being stored in MongoDB's `OAuthToken` collection.

---

## Technology Decisions

| Decision | Rationale |
|---|---|
| **Fastify** over Express | Faster request parsing, first-class TypeScript support, built-in schema validation |
| **Mongoose** over raw MongoDB driver | Schema enforcement and typed models reduce accidental cross-tenant data access |
| **Append-only balance ledger** | Eliminates race conditions; enables full audit history without extra tables |
| **Firebase Auth** | Offloads credential management, MFA, and social login; custom claims carry tenancy context |
| **BullMQ** over cron jobs | Persistent, observable, retry-safe background processing with Redis |
| **Turborepo** monorepo | Incremental builds and shared type packages without publishing overhead |
