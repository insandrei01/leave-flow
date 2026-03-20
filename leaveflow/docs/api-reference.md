# API Reference

Base URL: `http://localhost:3001` (development) / `https://api.leaveflow.io` (production)

All authenticated endpoints require:

```
Authorization: Bearer <Firebase ID token>
```

The ID token must carry custom claims `tenantId`, `employeeId`, and `role`, which are set during the registration flow.

## Response Envelope

Every response uses a consistent envelope.

### Success (single resource)

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": null
}
```

### Success (paginated list)

```json
{
  "success": true,
  "data": [ ... ],
  "error": null,
  "meta": {
    "total": 120,
    "page": 2,
    "limit": 20
  }
}
```

### Error

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Invalid email address" }
    ]
  },
  "meta": null
}
```

### Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid Bearer token |
| 403 | `FORBIDDEN` | Authenticated but insufficient role |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource or state conflict |
| 422 | `VALIDATION_ERROR` | Input failed schema validation |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## Roles

| Role | Description |
|---|---|
| `company_admin` | Full access; manages billing, onboarding, and tenant settings |
| `hr_admin` | Manages employees, leave types, workflows, and can force-approve |
| `manager` | Views team calendars and coverage; cannot modify configuration |
| `employee` | Self-service leave requests; reads own notifications and balances |

---

## Health

### `GET /health`

Liveness probe. No authentication required.

**Response 200**

```json
{
  "status": "ok",
  "uptime": 3600,
  "version": "0.0.1",
  "timestamp": "2026-03-17T12:00:00.000Z"
}
```

### `GET /health/deep`

Readiness probe — checks MongoDB and Redis connectivity. No authentication required.

**Response 200 / 503**

```json
{
  "status": "ok",
  "uptime": 3600,
  "version": "0.0.1",
  "timestamp": "2026-03-17T12:00:00.000Z",
  "dependencies": {
    "mongodb": { "status": "ok", "latencyMs": 3 },
    "redis":   { "status": "ok", "latencyMs": 1 }
  }
}
```

---

## Auth

### `POST /auth/register`

Creates a new tenant, a Firebase user, and the first company admin employee in a single atomic operation. **Public — no token required.**

**Request body**

```json
{
  "email": "admin@acme.com",
  "password": "SecurePass123!",
  "companyName": "Acme Ltd",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**Response 201** — returns tenant ID, employee ID, and Firebase custom token.

### `GET /auth/me`

Returns the authenticated user's employee profile and tenant context.

**Response 200**

```json
{
  "success": true,
  "data": {
    "uid": "firebase-uid",
    "tenantId": "...",
    "employeeId": "...",
    "role": "company_admin",
    "employee": { ... }
  }
}
```

---

## Onboarding

All endpoints require `company_admin` role.

### `GET /onboarding/progress`

Returns the current onboarding state (steps 1–6 and completion status).

**Response 200** — `data` contains step completion map and `isComplete` flag.

### `PUT /onboarding/steps/:stepNumber`

Saves onboarding step data. Idempotent — can be called multiple times.

| Step | Data |
|---|---|
| 1 | Company country, timezone, work-week days |
| 2 | Leave type definitions (name, paid/unpaid, default entitlement) |
| 3 | Approval workflow template selection |
| 4 | Department/team names |
| 5 | Initial employee list |
| 6 | Holiday calendar country and year |

**Response 200** — updated progress object.

### `POST /onboarding/complete`

Marks onboarding as complete and activates the tenant.

**Response 201** — final progress object.

---

## Tenant

### `GET /tenants/current`

Returns the current tenant record including plan limits. Any authenticated role.

**Response 200**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Acme Ltd",
    "plan": "pro",
    "settings": {
      "countryCode": "GB",
      "timezone": "Europe/London",
      "workWeekDays": [1, 2, 3, 4, 5]
    }
  }
}
```

### `PATCH /tenants/current`

Updates core tenant fields (name). Requires `company_admin`.

**Request body** — any subset of `{ name: string }`.

**Response 200** — updated tenant record.

### `PATCH /tenants/current/settings`

Updates operational settings (country, timezone, work week). Requires `hr_admin` or `company_admin`.

**Request body** — any subset of `{ countryCode, timezone, workWeekDays, coverageThresholdPercent }`.

**Response 200** — updated tenant record.

---

## Employees

### `GET /employees`

Returns a paginated, filterable list of employees for the tenant.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `teamId` | string | Filter by team ID |
| `role` | string | Filter by role (`employee`, `manager`, `hr_admin`, `company_admin`) |
| `status` | string | Filter by status (`active`, `inactive`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Page size (default: 20, max: 100) |

**Response 200** — paginated list of employee records.

### `GET /employees/:id`

Returns a single employee by ID.

**Response 200** — employee record, or 404 if not found.

### `POST /employees`

Creates a new employee. Requires `hr_admin` or `company_admin`.

**Request body**

```json
{
  "email": "alice@acme.com",
  "name": "Alice Smith",
  "role": "employee",
  "teamId": "...",
  "startDate": "2026-01-15",
  "managerId": null
}
```

**Response 201** — created employee record.

### `PATCH /employees/:id`

Updates an employee. Requires `hr_admin` or `company_admin`.

**Request body** — any subset of employee fields.

**Response 200** — updated employee record.

### `POST /employees/:id/deactivate`

Soft-deletes an employee (sets status to `inactive`). Requires `hr_admin` or `company_admin`.

**Response 200** — `{ "deactivated": true }`.

### `POST /employees/import`

Bulk-imports employees from a parsed CSV payload. Requires `hr_admin` or `company_admin`.

**Request body** — array of objects:

```json
[
  {
    "email": "bob@acme.com",
    "firstName": "Bob",
    "lastName": "Jones",
    "role": "employee",
    "teamId": "...",
    "startDate": "2026-02-01"
  }
]
```

**Response 200** — import result with `created`, `skipped`, and `errors` counts.

---

## Teams

### `GET /teams`

Returns all teams for the tenant. Any authenticated role.

**Response 200** — array of team records.

### `GET /teams/:id`

Returns a single team. Any authenticated role.

**Response 200** — team record, or 404.

### `GET /teams/:id/members`

Returns the members of a team. Any authenticated role.

**Response 200** — array of employee records.

### `POST /teams`

Creates a team. Requires `hr_admin` or `company_admin`.

**Request body**

```json
{
  "name": "Engineering",
  "managerId": "...",
  "workflowId": "..."
}
```

**Response 201** — created team record.

### `PATCH /teams/:id`

Updates a team. Requires `hr_admin` or `company_admin`.

**Request body** — any subset of team fields.

**Response 200** — updated team record.

### `DELETE /teams/:id`

Deletes a team if it has no active employees. Requires `hr_admin` or `company_admin`.

**Response 204** — no content.

---

## Leave Types

### `GET /leave-types`

Returns all leave types for the tenant. Any authenticated role.

**Response 200** — array of leave type records.

### `GET /leave-types/:id`

Returns a single leave type. Any authenticated role.

**Response 200** — leave type record, or 404.

### `POST /leave-types`

Creates a leave type. Requires `hr_admin` or `company_admin`.

**Request body**

```json
{
  "name": "Annual Leave",
  "slug": "annual_leave",
  "isPaid": true,
  "requiresApproval": true,
  "defaultEntitlementDays": 25,
  "accrualPolicy": "monthly",
  "maxCarryOverDays": 5
}
```

**Response 201** — created leave type record.

### `PATCH /leave-types/:id`

Updates a leave type. Requires `hr_admin` or `company_admin`.

**Response 200** — updated record.

### `DELETE /leave-types/:id`

Deletes a leave type. Requires `hr_admin` or `company_admin`.

**Response 204** — no content.

---

## Workflows

### `GET /workflows`

Returns all approval workflows for the tenant. Any authenticated role.

**Response 200** — array of workflow records.

### `GET /workflows/:id`

Returns a single workflow. Any authenticated role.

**Response 200** — workflow record, or 404.

### `POST /workflows`

Creates a custom workflow. Requires `hr_admin` or `company_admin`.

**Request body**

```json
{
  "name": "Engineering Approval",
  "steps": [
    {
      "order": 1,
      "approverType": "manager",
      "escalationDays": 3,
      "escalationAction": "auto_approve"
    }
  ]
}
```

**Response 201** — created workflow record.

### `POST /workflows/from-template`

Instantiates a pre-built workflow template. Requires `hr_admin` or `company_admin`.

**Request body**

```json
{
  "templateType": "standard",
  "name": "Standard Workflow"
}
```

Template types: `simple` (direct manager), `standard` (manager + HR), `enterprise` (manager + HR + exec).

**Response 201** — created workflow record.

### `PATCH /workflows/:id`

Updates a workflow (increments version). Requires `hr_admin` or `company_admin`.

**Response 200** — updated workflow record.

### `DELETE /workflows/:id`

Deletes a workflow if no teams are assigned to it. Requires `hr_admin` or `company_admin`.

**Response 204** — no content. Returns 409 if the workflow is still in use.

### `POST /workflows/:id/clone`

Clones a workflow under a new name. Requires `hr_admin` or `company_admin`.

**Request body** — `{ "name": "Copy of Engineering Approval" }`.

**Response 201** — cloned workflow record.

### `POST /workflows/:id/test`

Dry-run simulation — returns the workflow snapshot without creating a leave request. Requires `hr_admin` or `company_admin`.

**Request body** (optional) — `{ "employeeId": "...", "leaveTypeId": "..." }`.

**Response 200** — `{ snapshot, simulatedInput, result: "simulation_ok" }`.

---

## Leave Requests

### `POST /leave-requests/validate`

Dry-run validation — checks balance, blackout periods, and working days without creating the request. Any authenticated role (validates for the current user).

**Request body**

```json
{
  "leaveTypeId": "...",
  "startDate": "2026-04-01",
  "endDate": "2026-04-05",
  "halfDayStart": false,
  "halfDayEnd": false
}
```

**Response 200** — validation result with `valid` flag, `workingDays`, and any `errors`.

### `GET /leave-requests`

Returns a paginated list of leave requests. Results are scoped to the current tenant. `hr_admin` and `company_admin` see all; other roles see only their own.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `status` | string | `draft`, `pending_validation`, `pending_approval`, `approved`, `rejected`, `cancelled`, `escalated` |
| `employeeId` | string | Filter by employee (hr_admin+) |
| `teamId` | string | Filter by team |
| `startDateFrom` | date | ISO date lower bound |
| `startDateTo` | date | ISO date upper bound |
| `page` | number | Page number |
| `limit` | number | Page size |

**Response 200** — paginated list of leave request records.

### `POST /leave-requests`

Creates a leave request for the authenticated employee.

**Request body**

```json
{
  "leaveTypeId": "...",
  "startDate": "2026-04-01",
  "endDate": "2026-04-05",
  "halfDayStart": false,
  "halfDayEnd": false,
  "reason": "Family holiday"
}
```

**Response 201** — created leave request record. The request enters state `pending_validation` immediately and transitions to `pending_approval` if validation passes.

### `GET /leave-requests/:id`

Returns a single leave request with the full approval journey. Any authenticated role (subject to visibility rules).

**Response 200** — leave request record including `approvalSteps` array.

### `POST /leave-requests/:id/cancel`

Cancels a leave request. Allowed for the request owner or `hr_admin`/`company_admin`.

**Request body** (optional) — `{ "reason": "Plans changed" }`.

**Response 200** — `{ "cancelled": true }`.

---

## Approvals

### `GET /approvals/pending`

Returns leave requests pending the current user's approval.

**Query parameters** — `page`, `limit`.

**Response 200** — paginated list of pending leave requests.

### `GET /approvals/pending/count`

Returns the count of requests pending the current user's approval (for badge display).

**Response 200** — `{ "count": 7 }`.

### `POST /approvals/:id/approve`

Approves a leave request. The caller must be the designated approver for the current step, or hold an active delegation from that approver.

**Request body** (optional) — `{ "note": "Approved — enjoy your break." }`.

**Response 200** — `{ previousStatus, newStatus, stepAdvanced, isTerminal }`.

### `POST /approvals/:id/reject`

Rejects a leave request. Reason is mandatory.

**Request body** — `{ "reason": "Team coverage too low during this period." }`.

**Response 200** — `{ previousStatus, newStatus, stepAdvanced, isTerminal }`.

### `POST /approvals/:id/force-approve`

Force-approves a leave request, bypassing step checks. Requires `hr_admin` or `company_admin`.

**Request body** — `{ "reason": "Director override." }`.

**Response 200** — `{ previousStatus, newStatus, stepAdvanced, isTerminal }`.

---

## Delegations

An approver can delegate their approval authority to another employee for a date range.

### `POST /delegations`

Creates a delegation. The current user becomes the delegator.

**Request body**

```json
{
  "delegateId": "<employeeId>",
  "startDate": "2026-04-01",
  "endDate": "2026-04-14",
  "reason": "Annual leave"
}
```

**Response 201** — delegation record.

### `GET /delegations/active`

Returns the current user's active delegations.

**Response 200** — array of active delegation records.

### `DELETE /delegations/:id`

Revokes a delegation. The current user must be the delegator.

**Response 204** — no content.

---

## Blackout Periods

Blackout periods prevent leave requests from being submitted during critical dates.

### `POST /blackout-periods`

Creates a blackout period. Requires `hr_admin` or `company_admin`.

**Request body**

```json
{
  "name": "Year-End Close",
  "startDate": "2026-12-20",
  "endDate": "2026-12-31",
  "teamIds": ["..."],
  "leaveTypeIds": ["..."],
  "reason": "Financial close period"
}
```

`teamIds` and `leaveTypeIds` are optional; if omitted the period applies globally.

**Response 201** — blackout period record.

### `GET /blackout-periods`

Returns all active blackout periods. Any authenticated role.

**Response 200** — array of blackout period records.

### `DELETE /blackout-periods/:id`

Deletes a blackout period. Requires `hr_admin` or `company_admin`.

**Response 204** — no content.

---

## Balance

### `GET /balances/me`

Returns the current user's leave balances across all leave types.

**Response 200** — array of `{ leaveTypeId, leaveTypeName, balance }` objects.

### `GET /balances/employees/:employeeId`

Returns all leave balances for a specific employee. Requires `manager`, `hr_admin`, or `company_admin`.

**Response 200** — array of balance objects.

### `GET /balances/employees/:employeeId/leave-types/:leaveTypeId`

Returns the balance for a single leave type. Requires `manager`, `hr_admin`, or `company_admin`.

**Response 200** — `{ employeeId, leaveTypeId, balance }`.

### `GET /balances/employees/:employeeId/history`

Returns the paginated ledger history for an employee/leave type combination. Requires `manager`, `hr_admin`, or `company_admin`.

**Query parameters** — `leaveTypeId` (required), `page`, `limit`.

**Response 200** — paginated list of ledger entries with `amount`, `reason`, `type`, and `effectiveDate`.

### `POST /balances/adjust`

Creates a manual adjustment ledger entry. Requires `hr_admin` or `company_admin`.

**Request body**

```json
{
  "employeeId": "...",
  "leaveTypeId": "...",
  "amount": 2.5,
  "reason": "Carry-over adjustment",
  "effectiveDate": "2026-01-01"
}
```

**Response 200** — `{ adjusted: true, employeeId, leaveTypeId, amount }`.

---

## Billing

All billing endpoints require `company_admin` role except the webhook.

### `GET /billing`

Returns the current billing plan and usage metrics.

**Response 200** — `{ plan, employeeCount, limits, stripeCustomerId }`.

### `POST /billing/create-checkout-session`

Initiates a Stripe Checkout session for plan upgrade.

**Request body**

```json
{
  "plan": "pro",
  "successUrl": "https://app.leaveflow.io/billing?success=true",
  "cancelUrl": "https://app.leaveflow.io/billing"
}
```

**Response 201** — `{ url: "<Stripe Checkout URL>" }`.

### `POST /billing/create-portal-session`

Opens the Stripe Customer Portal for subscription management.

**Request body** — `{ "returnUrl": "https://app.leaveflow.io/billing" }`.

**Response 200** — `{ url: "<Stripe Portal URL>" }`.

### `POST /billing/webhooks`

Receives Stripe webhook events. **Public** — verified by `Stripe-Signature` header.

**Response 200** — `{ received: true }`.

---

## Dashboard

### `GET /dashboard/summary`

Returns all 9 bento widget payloads in a single response. Served from Redis cache when available (refreshed every 5 minutes by the dashboard cache worker). Requires `hr_admin` or `company_admin`.

**Response 200**

```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-03-17T12:00:00.000Z",
    "widgets": {
      "pendingApprovals": { ... },
      "todayAbsences": { ... },
      "upcomingAbsences": { ... },
      "balanceSummary": { ... },
      "leaveByType": { ... },
      "teamCoverage": { ... },
      "recentActivity": { ... },
      "leaveCalendar": { ... },
      "topAbsentees": { ... }
    }
  }
}
```

---

## Calendar

### `GET /calendar/absences`

Returns team-grouped absence data for the swim-lane calendar view. Requires `manager`, `hr_admin`, or `company_admin`. Employees receive 403.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `startDate` | date | ISO date — start of range (required) |
| `endDate` | date | ISO date — end of range (required) |
| `teamId` | string | Filter to a specific team (managers default to own team) |

**Response 200** — `{ startDate, endDate, teams: [{ teamId, teamName, members: [{ employeeId, name, absences: [...] }] }] }`.

### `GET /calendar/coverage`

Returns per-day coverage percentages and threshold warnings. Requires `manager`, `hr_admin`, or `company_admin`.

**Query parameters** — `startDate`, `endDate`, `teamId` (optional).

**Response 200** — `{ startDate, endDate, coverageThresholdPercent, days: [{ date, percent, warning }] }`.

---

## Calendar Sync (Google & Outlook)

Employees can connect their Google Calendar or Outlook Calendar to automatically create out-of-office events.

### `GET /calendar-sync/google/connect`

Redirects the user to Google OAuth consent screen. Requires authentication.

**Response 302** — redirect to Google.

### `GET /calendar-sync/google/callback`

Handles Google OAuth callback. **Public** (verified via Redis nonce).

**Response 302** — redirect to `APP_BASE_URL/settings/calendar?connected=google`.

### `GET /calendar-sync/outlook/connect`

Redirects the user to Microsoft OAuth consent screen. Requires authentication.

**Response 302** — redirect to Microsoft.

### `GET /calendar-sync/outlook/callback`

Handles Outlook OAuth callback. **Public** (verified via Redis nonce).

**Response 302** — redirect to `APP_BASE_URL/settings/calendar?connected=outlook`.

### `GET /calendar-sync/status`

Returns the current user's active calendar connections.

**Response 200** — `{ connections: [{ provider, isActive, expiresAt }] }`.

### `DELETE /calendar-sync/:provider`

Disconnects a calendar integration. `provider` must be `google_calendar` or `outlook_calendar`.

**Response 204** — no content.

---

## Holidays

### `GET /holidays`

Returns public and custom holidays for a year and country. Any authenticated role.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `year` | number | Calendar year (required) |
| `countryCode` | string | ISO 3166-1 alpha-2 code (defaults to tenant setting) |

**Response 200** — `{ countryCode, year, holidays: [{ date, name, type }] }`.

### `POST /holidays/custom`

Adds a company-specific custom holiday. Requires `hr_admin` or `company_admin`.

**Request body** — `{ date: "YYYY-MM-DD", name: "Company Day", countryCode: "GB", year: 2026 }`.

**Response 201** — `{ date, name, type: "custom" }`.

### `DELETE /holidays/custom/:date`

Removes a custom holiday by date (`YYYY-MM-DD`). Requires `hr_admin` or `company_admin`.

**Response 200** — `{ date, deleted: true }`.

---

## Notifications

### `GET /notifications`

Returns the authenticated user's paginated notification inbox.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `read` | boolean | `true` = read only, `false` = unread only, omit = all |
| `page` | number | Page number |
| `limit` | number | Page size |

**Response 200** — paginated list of notifications.

### `GET /notifications/unread-count`

Returns the unread notification count for badge display.

**Response 200** — `{ count: 3 }`.

### `PATCH /notifications/read-all`

Marks all notifications as read for the current user.

**Response 200** — `{ markedRead: 12 }`.

### `PATCH /notifications/:id/read`

Marks a single notification as read.

**Response 200** — `{ notificationId, isRead: true }`.

---

## Audit

### `GET /audit/logs`

Returns a paginated, filtered audit log. Requires `hr_admin` or `company_admin`.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `entityType` | string | Entity type filter (e.g. `leave_request`, `employee`) |
| `entityId` | string | Specific entity ID |
| `actorId` | string | Filter by actor employee ID |
| `action` | string | Filter by action name |
| `startDate` | date | ISO date lower bound |
| `endDate` | date | ISO date upper bound |
| `page` | number | Page number |
| `limit` | number | Page size |

**Response 200** — paginated list of audit log entries.

### `GET /audit/logs/export`

Streams audit log entries as a CSV file. Requires `company_admin`.

**Response 200** — `Content-Type: text/csv`, attachment download. Columns: `logId`, `timestamp`, `action`, `entityType`, `entityId`, `actorId`, `actorType`, `actorDisplayName`.

---

## Rate Limiting

The API uses `@fastify/rate-limit`. Default limits (subject to configuration):

| Tier | Limit | Window |
|---|---|---|
| Standard | 100 requests | 1 minute |
| Webhook (`/billing/webhooks`) | Not rate-limited (Stripe origin) |
| Health (`/health`, `/health/deep`) | Not rate-limited |
