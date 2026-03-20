---
stage: "03-api-contracts"
agent: "api-designer"
model: "sonnet"
run_id: "2026-03-16-design-leave-flow"
started: "2026-03-16T16:00:00Z"
finished: "2026-03-16T17:30:00Z"
tools_used: [Read, Glob, Write]
parent_agent: "pipeline-orchestrator"
output_files:
  - worklog/runs/2026-03-16-design-leave-flow/03-api-contracts.md
  - worklog/runs/2026-03-16-design-leave-flow/03-api-contracts-handoff.md
---

# API Design: LeaveFlow MVP

## Table of Contents

1. [Overview](#1-overview)
2. [API Conventions](#2-api-conventions)
3. [Authentication and Authorization](#3-authentication-and-authorization)
4. [Rate Limiting](#4-rate-limiting)
5. [Module: Auth](#5-module-auth)
6. [Module: Onboarding](#6-module-onboarding)
7. [Module: Tenants](#7-module-tenants)
8. [Module: Employees](#8-module-employees)
9. [Module: Teams](#9-module-teams)
10. [Module: Leave Types](#10-module-leave-types)
11. [Module: Workflows](#11-module-workflows)
12. [Module: Leave Requests](#12-module-leave-requests)
13. [Module: Approvals](#13-module-approvals)
14. [Module: Balances](#14-module-balances)
15. [Module: Calendar](#15-module-calendar)
16. [Module: Holidays](#16-module-holidays)
17. [Module: Dashboard](#17-module-dashboard)
18. [Module: Audit](#18-module-audit)
19. [Module: Notifications](#19-module-notifications)
20. [Module: Billing](#20-module-billing)
21. [Module: Bot Webhooks](#21-module-bot-webhooks)
22. [Webhook and Event Payloads](#22-webhook-and-event-payloads)
23. [Error Catalog](#23-error-catalog)
24. [Data Models Reference](#24-data-models-reference)

---

## 1. Overview

LeaveFlow is a multi-tenant leave management SaaS. The REST API serves three client surfaces:

- **Web application** (Next.js) — HR dashboard, workflow builder, employee self-service
- **Slack bot** — slash commands, interactive approvals via Block Kit
- **Teams bot** — leave requests and approvals via Adaptive Cards

The API is a **Fastify modular monolith** deployed on Railway. All modules share a single base URL. The bot handlers run inside the same process and call service methods directly; the bot webhook endpoints are listed for completeness.

**Base URL:**
```
https://api.leaveflow.app/api/v1
```

**API Versioning strategy:** URI versioning (`/api/v1/`). Breaking changes increment the major version. Non-breaking additions (new optional fields, new endpoints) are deployed without a version bump. The `v1` prefix is present from day one to avoid future migration pain.

---

## 2. API Conventions

### 2.1 Response Envelope

Every response, including errors, uses this envelope:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` for 2xx responses, `false` for 4xx/5xx |
| `data` | object \| array \| null | Response payload; `null` on errors |
| `error` | object \| null | Error detail; `null` on success |
| `meta` | object \| null | Pagination metadata; `null` for non-list endpoints |

**Error object structure:**

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "LEAVE_REQUEST_NOT_FOUND",
    "message": "Leave request not found.",
    "details": []
  },
  "meta": null
}
```

**Validation error (422) `details` array:**

```json
{
  "details": [
    { "field": "startDate", "message": "startDate must be a future date" },
    { "field": "leaveTypeId", "message": "leaveTypeId is required" }
  ]
}
```

### 2.2 Pagination

All list endpoints support server-side cursor-less pagination using `page` + `limit`:

**Request query parameters:**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | — | Page number (1-indexed) |
| `limit` | integer | 20 | 100 | Items per page |
| `sortBy` | string | varies | — | Sort field (documented per endpoint) |
| `sortOrder` | `asc` \| `desc` | `desc` | — | Sort direction |

**`meta` object for list responses:**

```json
{
  "meta": {
    "total": 247,
    "page": 1,
    "limit": 20,
    "totalPages": 13,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 2.3 Filtering

Filter parameters are passed as query strings. Multi-value filters use repeated parameters:

```
GET /leave-requests?status=pending_approval&status=approved&teamId=team_abc
```

Date range filters use `startDate` and `endDate` parameters (ISO 8601 dates).

### 2.4 Date and Time Format

- All dates: ISO 8601 date string `YYYY-MM-DD` (no time component for calendar dates)
- All timestamps: ISO 8601 UTC datetime `YYYY-MM-DDTHH:mm:ssZ`
- Timezone: stored as IANA timezone string (e.g., `Europe/Berlin`)
- Working days: integer count (excludes weekends and public holidays)

### 2.5 Naming Conventions

- URL paths: lowercase kebab-case, plural nouns (`/leave-requests`, `/leave-types`)
- JSON fields: camelCase
- Enum values: snake_case (`pending_approval`, `role_direct_manager`)
- IDs: MongoDB ObjectId as 24-character hex string

### 2.6 Tenant Scoping

Every authenticated request is automatically scoped to the caller's tenant via the `tenantId` from Firebase custom claims. Clients never pass `tenantId` in request bodies or query strings. The API silently enforces tenant boundaries at the repository layer.

### 2.7 Resource IDs in URLs

Use the MongoDB `_id` field (24-char hex). Example: `/leave-requests/64f2a1b3c4d5e6f7a8b9c0d1`

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

All non-bot endpoints require a Firebase Auth JWT in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

The Fastify auth plugin verifies the JWT using the Firebase Admin SDK and extracts:

```json
{
  "tenantId": "tenant_abc123",
  "userId": "emp_xyz789",
  "role": "hr_admin",
  "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1"
}
```

Bot webhook endpoints (`/slack/*`, `/teams/*`) use HMAC-SHA256 request signing instead.

### 3.2 Role Hierarchy

| Role | Scope | Inherits From |
|------|-------|---------------|
| `company_admin` | Tenant-wide | All roles |
| `hr_admin` | Tenant-wide | `manager` |
| `manager` | Own teams only | `employee` |
| `employee` | Own data only | — |

### 3.3 Authorization Matrix per Module

| Module | `employee` | `manager` | `hr_admin` | `company_admin` |
|--------|-----------|-----------|------------|-----------------|
| Auth | own profile | — | — | — |
| Onboarding | — | — | — | full |
| Tenant settings | read | read | read+write | full |
| Employees | read self | read own team | full | full |
| Teams | read | read own | full | full |
| Leave types | read | read | full | full |
| Workflows | read | read | full | full |
| Leave requests | own | own team | full | full |
| Approvals | submit/cancel own | approve own team | full | full |
| Balances | read own | read own team | full | full |
| Calendar | read (no type) | read team | full | full |
| Dashboard | self-service | manager view | full | full |
| Audit | — | — | read | full |
| Billing | — | — | read | full |
| Notifications | read own | — | full | full |

---

## 4. Rate Limiting

Rate limiting uses a Redis token bucket per tenant, per endpoint tier.

### 4.1 Limits

| Plan | Default tier | Burst allowance |
|------|-------------|-----------------|
| Free | 60 req/min | 90 req/min (10s window) |
| Team | 300 req/min | 450 req/min |
| Business | 600 req/min | 900 req/min |
| Enterprise | Custom | Custom |

Bot webhook endpoints have a separate limit of 1,000 req/min (Slack/Teams can send bursts).

### 4.2 Rate Limit Headers

All responses include:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1710601200
Retry-After: 13   (only on 429 responses)
```

### 4.3 429 Response

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Retry after 13 seconds.",
    "details": []
  },
  "meta": null
}
```

---

## 5. Module: Auth

Base path: `/auth`

### POST /auth/register

Register a new company and its first admin user. Creates tenant, employee record, and fires the onboarding wizard initialization.

**Auth:** None (public)

**Request body:**

```json
{
  "companyName": "string — company display name, 2-100 chars",
  "adminEmail": "string — valid email address",
  "adminName": "string — full name, 2-100 chars",
  "password": "string — min 8 chars, at least 1 uppercase, 1 number",
  "timezone": "string — IANA timezone, e.g. Europe/London (optional, defaults to UTC)"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "tenantId": "tenant_abc123",
    "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
    "firebaseUid": "firebase_uid_xyz",
    "onboardingToken": "onb_tok_abc123",
    "emailVerificationSent": true
  },
  "error": null,
  "meta": null
}
```

**Error responses:**

| Status | Code | Description |
|--------|------|-------------|
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |
| 409 | `EMAIL_ALREADY_REGISTERED` | Email address already in use |

---

### POST /auth/verify-email

Verify email address using the token sent to the admin's inbox.

**Auth:** None (public)

**Request body:**

```json
{
  "token": "string — email verification token"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": { "verified": true },
  "error": null,
  "meta": null
}
```

---

### POST /auth/refresh

Exchange a Firebase refresh token for a new ID token. This is handled client-side by the Firebase SDK; this endpoint exists for server-side token refresh use cases (e.g., bot backend sessions).

**Auth:** None (public)

**Request body:**

```json
{
  "refreshToken": "string"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "idToken": "string",
    "expiresIn": 3600
  },
  "error": null,
  "meta": null
}
```

---

### GET /auth/me

Return the authenticated user's profile and resolved permissions.

**Auth:** Any authenticated role

**Response 200:**

```json
{
  "success": true,
  "data": {
    "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
    "firebaseUid": "firebase_uid_xyz",
    "name": "Alice Chen",
    "email": "alice@acme.com",
    "role": "hr_admin",
    "tenantId": "tenant_abc123",
    "tenantName": "Acme Corp",
    "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
    "primaryPlatform": "slack",
    "avatarUrl": null,
    "createdAt": "2026-01-15T09:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### POST /auth/logout

Revoke the current session and Firebase refresh token.

**Auth:** Any authenticated role

**Response 200:**

```json
{
  "success": true,
  "data": { "revoked": true },
  "error": null,
  "meta": null
}
```

---

## 6. Module: Onboarding

Base path: `/onboarding`

The onboarding wizard has 6 steps. State is persisted per step so admins can close the browser and resume. Each step endpoint is idempotent (safe to re-submit).

### GET /onboarding/progress

Return current onboarding wizard state.

**Auth:** `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "currentStep": 3,
    "completedSteps": [1, 2],
    "totalSteps": 6,
    "steps": [
      { "number": 1, "name": "company-profile", "status": "completed", "completedAt": "2026-01-15T09:05:00Z" },
      { "number": 2, "name": "leave-types", "status": "completed", "completedAt": "2026-01-15T09:10:00Z" },
      { "number": 3, "name": "workflow", "status": "in_progress", "completedAt": null },
      { "number": 4, "name": "teams", "status": "pending", "completedAt": null },
      { "number": 5, "name": "employees", "status": "pending", "completedAt": null },
      { "number": 6, "name": "holidays", "status": "pending", "completedAt": null }
    ],
    "isComplete": false,
    "estimatedMinutesRemaining": 12
  },
  "error": null,
  "meta": null
}
```

---

### PUT /onboarding/steps/1

Save step 1: Company Profile.

**Auth:** `company_admin`

**Request body:**

```json
{
  "timezone": "Europe/London",
  "fiscalYearStartMonth": 1,
  "workWeek": {
    "monday": true,
    "tuesday": true,
    "wednesday": true,
    "thursday": true,
    "friday": true,
    "saturday": false,
    "sunday": false
  },
  "country": "GB"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "stepNumber": 1,
    "status": "completed",
    "savedAt": "2026-01-15T09:05:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### PUT /onboarding/steps/2

Save step 2: Leave Types. Upserts the provided leave types (seeded defaults are pre-loaded).

**Auth:** `company_admin`

**Request body:**

```json
{
  "leaveTypes": [
    {
      "name": "Vacation",
      "color": "#818CF8",
      "isPaid": true,
      "requiresApproval": true,
      "defaultEntitlementDays": 25
    },
    {
      "name": "Sick Leave",
      "color": "#34D399",
      "isPaid": true,
      "requiresApproval": false,
      "defaultEntitlementDays": 10
    }
  ]
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "stepNumber": 2,
    "status": "completed",
    "leaveTypesCreated": 2
  },
  "error": null,
  "meta": null
}
```

---

### PUT /onboarding/steps/3

Save step 3: Workflow. Instantiates from a template or accepts custom steps.

**Auth:** `company_admin`

**Request body:**

```json
{
  "templateId": "template_simple",
  "workflowName": "Default Approval Workflow",
  "customSteps": null
}
```

_Or, with custom steps:_

```json
{
  "templateId": null,
  "workflowName": "Custom Workflow",
  "customSteps": [
    {
      "order": 0,
      "approverType": "role_direct_manager",
      "timeoutHours": 48,
      "escalationMode": "escalate_next",
      "maxReminders": 3,
      "allowDelegation": true
    },
    {
      "order": 1,
      "approverType": "role_hr",
      "timeoutHours": 72,
      "escalationMode": "remind",
      "maxReminders": 2,
      "allowDelegation": false
    }
  ]
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "stepNumber": 3,
    "status": "completed",
    "workflowId": "64f2a1b3c4d5e6f7a8b9c0f3"
  },
  "error": null,
  "meta": null
}
```

---

### PUT /onboarding/steps/4

Save step 4: Teams. Creates initial team structure.

**Auth:** `company_admin`

**Request body:**

```json
{
  "teams": [
    {
      "name": "Engineering",
      "workflowId": "64f2a1b3c4d5e6f7a8b9c0f3"
    },
    {
      "name": "Marketing",
      "workflowId": "64f2a1b3c4d5e6f7a8b9c0f3"
    }
  ]
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "stepNumber": 4,
    "status": "completed",
    "teamsCreated": 2
  },
  "error": null,
  "meta": null
}
```

---

### PUT /onboarding/steps/5

Save step 5: Employees. Manually add employees or initiate a CSV import (see `POST /employees/import`).

**Auth:** `company_admin`

**Request body:**

```json
{
  "employees": [
    {
      "email": "bob@acme.com",
      "name": "Bob Smith",
      "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
      "role": "employee",
      "startDate": "2025-06-01"
    }
  ]
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "stepNumber": 5,
    "status": "completed",
    "employeesCreated": 1,
    "employeesSkipped": 0
  },
  "error": null,
  "meta": null
}
```

---

### PUT /onboarding/steps/6

Save step 6: Holidays. Select a country to load public holidays and optionally add custom ones.

**Auth:** `company_admin`

**Request body:**

```json
{
  "countryCode": "GB",
  "year": 2026,
  "customHolidays": [
    { "date": "2026-12-24", "name": "Company Day Off" }
  ]
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "stepNumber": 6,
    "status": "completed",
    "holidaysLoaded": 8,
    "customHolidaysAdded": 1,
    "onboardingComplete": true
  },
  "error": null,
  "meta": null
}
```

---

### POST /onboarding/complete

Mark onboarding as complete and redirect to the dashboard. Can be called before all steps are done (steps 4-6 are skippable).

**Auth:** `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "redirectUrl": "/dashboard"
  },
  "error": null,
  "meta": null
}
```

---

## 7. Module: Tenants

Base path: `/tenants`

### GET /tenants/me

Return the current tenant's settings and plan.

**Auth:** `company_admin`, `hr_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "tenantId": "tenant_abc123",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "plan": "team",
    "timezone": "Europe/London",
    "country": "GB",
    "fiscalYearStartMonth": 1,
    "workWeek": {
      "monday": true,
      "tuesday": true,
      "wednesday": true,
      "thursday": true,
      "friday": true,
      "saturday": false,
      "sunday": false
    },
    "minimumCoveragePercent": 50,
    "slackConnected": true,
    "teamsConnected": false,
    "activeEmployeeCount": 47,
    "createdAt": "2026-01-15T09:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### PATCH /tenants/me

Update tenant settings.

**Auth:** `company_admin`, `hr_admin`

**Request body** (all fields optional):

```json
{
  "name": "string",
  "timezone": "string — IANA timezone",
  "fiscalYearStartMonth": "integer 1-12",
  "workWeek": "object — see GET /tenants/me",
  "minimumCoveragePercent": "integer 0-100"
}
```

**Response 200:** Same shape as `GET /tenants/me`.

---

### GET /tenants/me/platforms

Return bot platform connection status for Slack and Teams.

**Auth:** `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "slack": {
      "connected": true,
      "workspaceName": "Acme Corp",
      "workspaceId": "T01234567",
      "connectedAt": "2026-01-15T10:00:00Z",
      "botScopes": ["commands", "chat:write", "im:write", "users:read"]
    },
    "teams": {
      "connected": false,
      "workspaceName": null,
      "connectedAt": null
    }
  },
  "error": null,
  "meta": null
}
```

---

### DELETE /tenants/me/platforms/:platform

Disconnect a bot platform (`slack` or `teams`).

**Auth:** `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": { "platform": "slack", "disconnected": true },
  "error": null,
  "meta": null
}
```

---

## 8. Module: Employees

Base path: `/employees`

### GET /employees

List employees with filtering and pagination.

**Auth:** `hr_admin`, `company_admin`; `manager` sees own team only

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `teamId` | string | Filter by team |
| `role` | string | Filter by role enum |
| `status` | `active` \| `inactive` | Default: `active` |
| `search` | string | Name or email prefix search |
| `page` | integer | Default 1 |
| `limit` | integer | Default 20, max 100 |
| `sortBy` | `name` \| `createdAt` \| `startDate` | Default: `name` |
| `sortOrder` | `asc` \| `desc` | Default: `asc` |

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
      "name": "Alice Chen",
      "email": "alice@acme.com",
      "role": "hr_admin",
      "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
      "teamName": "Engineering",
      "startDate": "2023-03-01",
      "status": "active",
      "primaryPlatform": "slack",
      "avatarUrl": null,
      "createdAt": "2026-01-15T09:00:00Z"
    }
  ],
  "error": null,
  "meta": {
    "total": 47,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### POST /employees

Create a single employee.

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "email": "string — required, unique within tenant",
  "name": "string — required, 2-100 chars",
  "role": "string — employee | manager | hr_admin | company_admin",
  "teamId": "string — optional MongoDB ObjectId",
  "startDate": "string — YYYY-MM-DD, required",
  "managerId": "string — optional, employee ObjectId"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
    "email": "bob@acme.com",
    "name": "Bob Smith",
    "role": "employee",
    "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
    "startDate": "2026-01-20",
    "status": "active",
    "invitationSent": true,
    "createdAt": "2026-01-15T09:00:00Z"
  },
  "error": null,
  "meta": null
}
```

**Error responses:**

| Status | Code | Description |
|--------|------|-------------|
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered for this tenant |
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |
| 402 | `PLAN_LIMIT_REACHED` | Free tier 10-user limit exceeded |

---

### GET /employees/:employeeId

Get a single employee by ID.

**Auth:** `hr_admin`, `company_admin`; `manager` for own team; `employee` for own record only

**Response 200:**

```json
{
  "success": true,
  "data": {
    "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
    "name": "Alice Chen",
    "email": "alice@acme.com",
    "role": "hr_admin",
    "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
    "teamName": "Engineering",
    "managerId": "64f2a1b3c4d5e6f7a8b9c0d9",
    "managerName": "David Park",
    "startDate": "2023-03-01",
    "status": "active",
    "primaryPlatform": "slack",
    "slackUserId": "U01234567",
    "teamsUserId": null,
    "googleCalendarConnected": true,
    "outlookCalendarConnected": false,
    "avatarUrl": null,
    "createdAt": "2026-01-15T09:00:00Z",
    "updatedAt": "2026-03-01T11:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### PATCH /employees/:employeeId

Update an employee record.

**Auth:** `hr_admin`, `company_admin`; `employee` for own profile fields only (`name`, `avatarUrl`)

**Request body** (all fields optional):

```json
{
  "name": "string",
  "role": "string — role enum",
  "teamId": "string — ObjectId",
  "managerId": "string — ObjectId",
  "startDate": "string — YYYY-MM-DD",
  "status": "active | inactive"
}
```

**Response 200:** Same shape as `GET /employees/:employeeId`.

---

### DELETE /employees/:employeeId

Soft-delete an employee. Triggers GDPR pseudonymization for deleted employees; sets `status: inactive`.

**Auth:** `company_admin`, `hr_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
    "status": "inactive",
    "deletedAt": "2026-03-16T12:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### POST /employees/import

Upload a CSV file to bulk-import employees. Enqueues a background job and returns an import job ID. CSV columns: `email`, `name`, `role`, `teamName`, `startDate`.

**Auth:** `company_admin`, `hr_admin`

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | file | CSV, max 5MB |
| `sendInvitations` | boolean | Whether to send email invitations |

**Response 202:**

```json
{
  "success": true,
  "data": {
    "importJobId": "job_import_abc123",
    "status": "queued",
    "rowCount": 143,
    "estimatedSeconds": 30
  },
  "error": null,
  "meta": null
}
```

---

### GET /employees/import/:importJobId

Poll the status of a bulk import job.

**Auth:** `company_admin`, `hr_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "importJobId": "job_import_abc123",
    "status": "completed",
    "totalRows": 143,
    "successCount": 140,
    "errorCount": 3,
    "errors": [
      { "row": 12, "email": "bad-email", "reason": "Invalid email format" },
      { "row": 45, "email": "dup@acme.com", "reason": "Email already exists" }
    ],
    "completedAt": "2026-03-16T12:01:00Z"
  },
  "error": null,
  "meta": null
}
```

Status values: `queued`, `processing`, `completed`, `failed`

---

### GET /employees/me/data-export

GDPR right-to-access data export for the authenticated employee.

**Auth:** Any authenticated user (returns own data only)

**Response 200:** `application/json` download containing all personal data.

---

## 9. Module: Teams

Base path: `/teams`

### GET /teams

List all teams for the tenant.

**Auth:** All roles; `manager` sees own team(s) only

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `includeEmployeeCount` | boolean | Include member count in response |
| `page` | integer | Default 1 |
| `limit` | integer | Default 50 |

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
      "name": "Engineering",
      "managerId": "64f2a1b3c4d5e6f7a8b9c0d9",
      "managerName": "David Park",
      "workflowId": "64f2a1b3c4d5e6f7a8b9c0f3",
      "workflowName": "Default Approval Workflow",
      "employeeCount": 12,
      "createdAt": "2026-01-15T09:00:00Z"
    }
  ],
  "error": null,
  "meta": {
    "total": 6,
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### POST /teams

Create a team.

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "name": "string — required, unique within tenant",
  "managerId": "string — optional employee ObjectId",
  "workflowId": "string — optional workflow ObjectId"
}
```

**Response 201:** Single team object (same as list item shape).

---

### GET /teams/:teamId

Get a single team with its member list.

**Auth:** All roles; `employee` sees own team only

**Response 200:**

```json
{
  "success": true,
  "data": {
    "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
    "name": "Engineering",
    "managerId": "64f2a1b3c4d5e6f7a8b9c0d9",
    "managerName": "David Park",
    "workflowId": "64f2a1b3c4d5e6f7a8b9c0f3",
    "workflowName": "Default Approval Workflow",
    "members": [
      {
        "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
        "name": "Alice Chen",
        "role": "hr_admin",
        "avatarUrl": null
      }
    ],
    "createdAt": "2026-01-15T09:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### PATCH /teams/:teamId

Update team name, manager, or assigned workflow.

**Auth:** `hr_admin`, `company_admin`

**Request body** (all optional):

```json
{
  "name": "string",
  "managerId": "string",
  "workflowId": "string"
}
```

**Response 200:** Single team object.

---

### DELETE /teams/:teamId

Delete a team. Employees in the team are set to `teamId: null`.

**Auth:** `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": { "teamId": "64f2a1b3c4d5e6f7a8b9c0e2", "deleted": true },
  "error": null,
  "meta": null
}
```

**Error responses:**

| Status | Code | Description |
|--------|------|-------------|
| 409 | `TEAM_HAS_PENDING_REQUESTS` | Team has active leave requests; must resolve before deleting |

---

## 10. Module: Leave Types

Base path: `/leave-types`

### GET /leave-types

List all leave types configured for the tenant.

**Auth:** All roles

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "leaveTypeId": "64f2a1b3c4d5e6f7a8b9c0a1",
      "name": "Vacation",
      "color": "#818CF8",
      "isPaid": true,
      "requiresApproval": true,
      "accrualRule": {
        "type": "front_loaded",
        "amount": 25,
        "unit": "days",
        "resetMonth": 1
      },
      "carryoverRule": {
        "maxDays": 5,
        "expiresMonthsAfterYearEnd": 3
      },
      "allowHalfDays": true,
      "minNoticeDays": 2,
      "maxConsecutiveDays": 30,
      "isActive": true,
      "createdAt": "2026-01-15T09:00:00Z"
    },
    {
      "leaveTypeId": "64f2a1b3c4d5e6f7a8b9c0a2",
      "name": "Sick Leave",
      "color": "#34D399",
      "isPaid": true,
      "requiresApproval": false,
      "accrualRule": {
        "type": "front_loaded",
        "amount": 10,
        "unit": "days",
        "resetMonth": 1
      },
      "carryoverRule": null,
      "allowHalfDays": true,
      "minNoticeDays": 0,
      "maxConsecutiveDays": null,
      "isActive": true,
      "createdAt": "2026-01-15T09:00:00Z"
    }
  ],
  "error": null,
  "meta": null
}
```

---

### POST /leave-types

Create a custom leave type.

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "name": "string — required, unique within tenant",
  "color": "string — hex color code",
  "isPaid": "boolean — required",
  "requiresApproval": "boolean — required",
  "accrualRule": {
    "type": "front_loaded | monthly | quarterly | annual | custom",
    "amount": "number — days per accrual period",
    "unit": "days",
    "resetMonth": "integer 1-12 — for front_loaded/annual"
  },
  "carryoverRule": {
    "maxDays": "integer | null (null = unlimited)",
    "expiresMonthsAfterYearEnd": "integer | null"
  },
  "allowHalfDays": "boolean — default true",
  "minNoticeDays": "integer — default 0",
  "maxConsecutiveDays": "integer | null"
}
```

**Response 201:** Single leave type object.

**Error responses:**

| Status | Code | Description |
|--------|------|-------------|
| 402 | `PLAN_LIMIT_REACHED` | Free tier limited to 1 leave type |
| 409 | `LEAVE_TYPE_NAME_EXISTS` | Name already in use for this tenant |

---

### GET /leave-types/:leaveTypeId

Get a single leave type.

**Auth:** All roles

**Response 200:** Single leave type object.

---

### PATCH /leave-types/:leaveTypeId

Update a leave type configuration.

**Auth:** `hr_admin`, `company_admin`

**Request body:** Same optional fields as POST.

**Response 200:** Single leave type object.

---

### DELETE /leave-types/:leaveTypeId

Deactivate a leave type (soft delete; historical requests are preserved).

**Auth:** `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": { "leaveTypeId": "64f2a1b3c4d5e6f7a8b9c0a1", "isActive": false },
  "error": null,
  "meta": null
}
```

---

### GET /leave-types/:leaveTypeId/blackout-periods

List blackout periods for a leave type.

**Auth:** All roles

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "blackoutId": "64f2a1b3c4d5e6f7a8b9c0b1",
      "leaveTypeId": "64f2a1b3c4d5e6f7a8b9c0a1",
      "startDate": "2026-12-20",
      "endDate": "2027-01-03",
      "reason": "Year-end freeze",
      "createdAt": "2026-01-15T09:00:00Z"
    }
  ],
  "error": null,
  "meta": null
}
```

---

### POST /leave-types/:leaveTypeId/blackout-periods

Create a blackout period.

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "reason": "string — optional"
}
```

**Response 201:** Single blackout period object.

---

### DELETE /leave-types/:leaveTypeId/blackout-periods/:blackoutId

Remove a blackout period.

**Auth:** `hr_admin`, `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": { "blackoutId": "64f2a1b3c4d5e6f7a8b9c0b1", "deleted": true },
  "error": null,
  "meta": null
}
```

---

## 11. Module: Workflows

Base path: `/workflows`

### GET /workflows

List all workflow definitions for the tenant.

**Auth:** All roles

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "workflowId": "64f2a1b3c4d5e6f7a8b9c0f3",
      "name": "Standard Approval",
      "version": 3,
      "stepCount": 2,
      "assignedTeamCount": 4,
      "isTemplate": false,
      "isActive": true,
      "createdAt": "2026-01-15T09:00:00Z",
      "updatedAt": "2026-03-10T14:00:00Z"
    }
  ],
  "error": null,
  "meta": null
}
```

---

### GET /workflows/templates

List available workflow templates (system-provided starting points).

**Auth:** All roles

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "templateId": "template_simple",
      "name": "Simple",
      "description": "Direct manager approves. Best for small teams.",
      "stepCount": 1,
      "estimatedResolutionHours": 24,
      "steps": [
        {
          "order": 0,
          "approverType": "role_direct_manager",
          "timeoutHours": 48,
          "escalationMode": "remind",
          "maxReminders": 3,
          "allowDelegation": true
        }
      ]
    },
    {
      "templateId": "template_standard",
      "name": "Standard",
      "description": "Direct manager then HR. Best for 10-100 person companies.",
      "stepCount": 2,
      "estimatedResolutionHours": 48,
      "steps": [
        {
          "order": 0,
          "approverType": "role_direct_manager",
          "timeoutHours": 48,
          "escalationMode": "escalate_next",
          "maxReminders": 2,
          "allowDelegation": true
        },
        {
          "order": 1,
          "approverType": "role_hr",
          "timeoutHours": 72,
          "escalationMode": "remind",
          "maxReminders": 3,
          "allowDelegation": false
        }
      ]
    },
    {
      "templateId": "template_enterprise",
      "name": "Enterprise",
      "description": "Manager, department head, then HR. For large organizations.",
      "stepCount": 3,
      "estimatedResolutionHours": 96,
      "steps": []
    }
  ],
  "error": null,
  "meta": null
}
```

---

### POST /workflows

Create a new workflow definition.

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "name": "string — required",
  "steps": [
    {
      "order": 0,
      "approverType": "specific_user | role_direct_manager | role_team_lead | role_hr",
      "approverUserId": "string — required only for specific_user",
      "timeoutHours": 48,
      "escalationMode": "escalate_next | remind | none",
      "maxReminders": 3,
      "allowDelegation": true
    }
  ]
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "workflowId": "64f2a1b3c4d5e6f7a8b9c0f4",
    "name": "Engineering Workflow",
    "version": 1,
    "steps": [
      {
        "order": 0,
        "approverType": "role_direct_manager",
        "approverUserId": null,
        "timeoutHours": 48,
        "escalationMode": "escalate_next",
        "maxReminders": 2,
        "allowDelegation": true
      }
    ],
    "isTemplate": false,
    "isActive": true,
    "assignedTeams": [],
    "createdAt": "2026-03-16T12:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### GET /workflows/:workflowId

Get a full workflow definition including all steps.

**Auth:** All roles

**Response 200:** Full workflow object (same as POST response shape).

---

### PUT /workflows/:workflowId

Replace all workflow steps. Increments version. Steps are replaced atomically; in-flight requests keep their frozen `workflowSnapshot` and are not affected.

**Auth:** `hr_admin`, `company_admin`

**Request body:** Same as POST (name + steps array).

**Response 200:** Full workflow object with incremented `version`.

---

### PATCH /workflows/:workflowId

Update workflow name only (without changing steps or version).

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "name": "string"
}
```

**Response 200:** Full workflow object.

---

### DELETE /workflows/:workflowId

Deactivate a workflow. Cannot delete if teams are currently assigned to it.

**Auth:** `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": { "workflowId": "64f2a1b3c4d5e6f7a8b9c0f3", "isActive": false },
  "error": null,
  "meta": null
}
```

**Error responses:**

| Status | Code | Description |
|--------|------|-------------|
| 409 | `WORKFLOW_HAS_ASSIGNED_TEAMS` | Unassign teams before deactivating |

---

### POST /workflows/:workflowId/clone

Clone a workflow under a new name.

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "name": "string — required, new name"
}
```

**Response 201:** New workflow object with `version: 1`.

---

### POST /workflows/:workflowId/simulate

Dry-run a hypothetical request through the workflow to preview which steps would activate and estimated timeline.

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "employeeId": "string — ObjectId",
  "leaveTypeId": "string — ObjectId",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "workflowId": "64f2a1b3c4d5e6f7a8b9c0f3",
    "simulatedSteps": [
      {
        "stepNumber": 1,
        "approverType": "role_direct_manager",
        "resolvedApproverId": "64f2a1b3c4d5e6f7a8b9c0d9",
        "resolvedApproverName": "David Park",
        "timeoutHours": 48,
        "escalationMode": "escalate_next"
      },
      {
        "stepNumber": 2,
        "approverType": "role_hr",
        "resolvedApproverId": "64f2a1b3c4d5e6f7a8b9c0d1",
        "resolvedApproverName": "Alice Chen",
        "timeoutHours": 72,
        "escalationMode": "remind"
      }
    ],
    "estimatedResolutionHours": 120,
    "workingDays": 5,
    "validationResult": {
      "valid": true,
      "warnings": [
        "3 other team members are already off on these dates (coverage: 58%)."
      ]
    }
  },
  "error": null,
  "meta": null
}
```

---

## 12. Module: Leave Requests

Base path: `/leave-requests`

### GET /leave-requests

List leave requests with filters. HR/admins see all; managers see own team; employees see own only.

**Auth:** All roles (scope enforced server-side)

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `employeeId` | string | Filter by employee (hr_admin+) |
| `teamId` | string | Filter by team (manager+) |
| `status` | string (repeatable) | e.g., `status=pending_approval&status=approved` |
| `leaveTypeId` | string | Filter by leave type |
| `startDate` | YYYY-MM-DD | Include requests overlapping this date range |
| `endDate` | YYYY-MM-DD | Include requests overlapping this date range |
| `staleOnly` | boolean | Only requests pending >48h (hr_admin+) |
| `page` | integer | Default 1 |
| `limit` | integer | Default 20 |
| `sortBy` | `createdAt` \| `startDate` \| `updatedAt` | Default: `createdAt` |
| `sortOrder` | `asc` \| `desc` | Default: `desc` |

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
      "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
      "employeeName": "Alice Chen",
      "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
      "teamName": "Engineering",
      "leaveTypeId": "64f2a1b3c4d5e6f7a8b9c0a1",
      "leaveTypeName": "Vacation",
      "leaveTypeColor": "#818CF8",
      "startDate": "2026-04-07",
      "endDate": "2026-04-11",
      "halfDayStart": false,
      "halfDayEnd": false,
      "workingDays": 5,
      "status": "pending_approval",
      "currentStep": 1,
      "totalSteps": 2,
      "currentApproverName": "David Park",
      "isStale": false,
      "pendingHours": 6,
      "reason": "Spring break",
      "createdAt": "2026-03-16T08:00:00Z",
      "updatedAt": "2026-03-16T08:00:00Z"
    }
  ],
  "error": null,
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### POST /leave-requests

Submit a new leave request. The API validates against leave policy (balance, blackouts, duplicates, coverage), snapshots the workflow, and routes to the first approver.

**Auth:** Any authenticated role (submitting for self)

**Request body:**

```json
{
  "leaveTypeId": "string — required",
  "startDate": "YYYY-MM-DD — required, must be future date",
  "endDate": "YYYY-MM-DD — required, >= startDate",
  "halfDayStart": "boolean — default false",
  "halfDayEnd": "boolean — default false",
  "reason": "string — optional, max 500 chars"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
    "status": "pending_approval",
    "workingDays": 5,
    "balanceAfterApproval": 15.5,
    "approvalChain": [
      {
        "stepNumber": 1,
        "approverName": "David Park",
        "approverRole": "Direct Manager",
        "status": "pending",
        "timeoutHours": 48
      },
      {
        "stepNumber": 2,
        "approverName": "Alice Chen",
        "approverRole": "HR Admin",
        "status": "upcoming",
        "timeoutHours": 72
      }
    ],
    "notificationsSent": ["slack"],
    "createdAt": "2026-03-16T08:00:00Z"
  },
  "error": null,
  "meta": null
}
```

**Error responses:**

| Status | Code | Description |
|--------|------|-------------|
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |
| 409 | `OVERLAPPING_REQUEST` | Date range overlaps an existing approved/pending request |
| 422 | `INSUFFICIENT_BALANCE` | Not enough leave balance remaining |
| 422 | `BLACKOUT_PERIOD` | Requested dates fall within a configured blackout period |
| 422 | `PAST_DATE` | Start date is in the past |
| 422 | `NO_WORKFLOW_ASSIGNED` | Employee's team has no workflow configured |
| 402 | `PLAN_LIMIT_REACHED` | Tenant on free plan, approval levels restricted |

---

### GET /leave-requests/:requestId

Get full detail of a single leave request, including the approval journey and impact data.

**Auth:** All roles (employee owns own; manager sees own team; hr_admin sees all)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
    "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
    "employeeName": "Alice Chen",
    "employeeAvatarUrl": null,
    "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
    "teamName": "Engineering",
    "department": "Product",
    "leaveTypeId": "64f2a1b3c4d5e6f7a8b9c0a1",
    "leaveTypeName": "Vacation",
    "leaveTypeColor": "#818CF8",
    "startDate": "2026-04-07",
    "endDate": "2026-04-11",
    "halfDayStart": false,
    "halfDayEnd": false,
    "workingDays": 5,
    "reason": "Spring break",
    "status": "pending_approval",
    "currentStep": 1,
    "approvalJourney": {
      "steps": [
        {
          "stepNumber": 1,
          "approverName": "David Park",
          "approverRole": "Direct Manager",
          "approverAvatarUrl": null,
          "status": "pending",
          "timestamp": null,
          "timeoutInfo": {
            "timeoutHours": 48,
            "hoursRemaining": 42,
            "escalationMode": "escalate_next"
          },
          "via": "slack"
        },
        {
          "stepNumber": 2,
          "approverName": "Alice Chen",
          "approverRole": "HR Admin",
          "approverAvatarUrl": null,
          "status": "upcoming",
          "timestamp": null,
          "timeoutInfo": null,
          "via": null
        }
      ],
      "currentStep": 1,
      "totalSteps": 2
    },
    "impact": {
      "balanceBefore": 20.5,
      "balanceAfterApproval": 15.5,
      "teamSize": 12,
      "teamMembersOut": 2,
      "coveragePercent": 83,
      "holidayOverlap": [],
      "othersOutOnSameDates": [
        { "employeeName": "Charlie Brown", "dates": "Apr 8-9" }
      ]
    },
    "auditTrail": [
      {
        "action": "submitted",
        "actorName": "Alice Chen",
        "timestamp": "2026-03-16T08:00:00Z",
        "note": null
      }
    ],
    "createdAt": "2026-03-16T08:00:00Z",
    "updatedAt": "2026-03-16T08:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### DELETE /leave-requests/:requestId

Cancel a leave request. Employee can cancel own pending or approved future requests. HR admin can cancel any request.

**Auth:** `employee` (own pending/future-approved only); `hr_admin`, `company_admin` (any)

**Request body:**

```json
{
  "reason": "string — optional"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
    "status": "cancelled",
    "cancelledAt": "2026-03-16T09:00:00Z",
    "calendarEventDeleted": true
  },
  "error": null,
  "meta": null
}
```

**Error responses:**

| Status | Code | Description |
|--------|------|-------------|
| 409 | `CANNOT_CANCEL_PAST_REQUEST` | Leave has already started or ended |
| 403 | `NOT_AUTHORIZED` | Employee attempting to cancel another's request |

---

### GET /leave-requests/validate

Pre-validate a potential request without submitting it. Used for real-time form feedback.

**Auth:** Any authenticated role

**Query parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `leaveTypeId` | string | Yes |
| `startDate` | YYYY-MM-DD | Yes |
| `endDate` | YYYY-MM-DD | Yes |
| `halfDayStart` | boolean | No |
| `halfDayEnd` | boolean | No |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "workingDays": 5,
    "balanceBefore": 20.5,
    "balanceAfterApproval": 15.5,
    "warnings": [
      "2 team members are already out on Apr 8. Coverage will be 75%."
    ],
    "errors": [],
    "holidayOverlap": [
      { "date": "2026-04-10", "name": "Good Friday" }
    ]
  },
  "error": null,
  "meta": null
}
```

If invalid, `valid: false` and `errors` array is populated (balance, blackout, overlap, etc.).

---

## 13. Module: Approvals

Base path: `/approvals`

### GET /approvals/pending

List leave requests awaiting action by the authenticated approver. For HR admins, returns all pending requests across the tenant.

**Auth:** `manager`, `hr_admin`, `company_admin`

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `teamId` | string | Filter by team (hr_admin+) |
| `staleOnly` | boolean | Only requests pending >48h |
| `page` | integer | Default 1 |
| `limit` | integer | Default 20 |
| `sortBy` | `createdAt` \| `startDate` | Default: `createdAt` |
| `sortOrder` | `asc` \| `desc` | Default: `asc` (oldest first) |

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
      "employeeName": "Alice Chen",
      "employeeAvatarUrl": null,
      "teamName": "Engineering",
      "leaveTypeName": "Vacation",
      "leaveTypeColor": "#818CF8",
      "startDate": "2026-04-07",
      "endDate": "2026-04-11",
      "workingDays": 5,
      "reason": "Spring break",
      "balanceAfterApproval": 15.5,
      "teamCoveragePercent": 83,
      "othersOutCount": 2,
      "approvalChainPosition": "Step 1 of 2",
      "pendingHours": 6,
      "isStale": false,
      "autoEscalateAt": "2026-03-18T08:00:00Z",
      "hoursUntilEscalation": 42,
      "createdAt": "2026-03-16T08:00:00Z"
    }
  ],
  "error": null,
  "meta": {
    "total": 7,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### POST /approvals/:requestId/approve

Approve a leave request at the current step. If this is the final step, the request is marked approved and calendar/notification jobs are enqueued.

**Auth:** Authenticated approver who is the current step's approver; `hr_admin` can approve any

**Request body:**

```json
{
  "note": "string — optional comment, max 500 chars"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
    "action": "approved",
    "newStatus": "approved",
    "isFinalStep": true,
    "nextApproverName": null,
    "notificationsSent": ["slack", "slack_channel"],
    "calendarEventQueued": true,
    "timestamp": "2026-03-16T09:00:00Z"
  },
  "error": null,
  "meta": null
}
```

If not the final step, `newStatus` is `pending_approval` and `nextApproverName` is set.

**Error responses:**

| Status | Code | Description |
|--------|------|-------------|
| 403 | `NOT_AUTHORIZED_APPROVER` | Caller is not the current step's approver |
| 409 | `REQUEST_ALREADY_RESOLVED` | Request is already approved, rejected, or cancelled |
| 409 | `REQUEST_CANCELLED` | Request was cancelled before approval |

---

### POST /approvals/:requestId/reject

Reject a leave request. Reason is mandatory.

**Auth:** Authenticated approver for current step; `hr_admin` can reject any

**Request body:**

```json
{
  "reason": "string — required, 1-500 chars"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
    "action": "rejected",
    "newStatus": "rejected",
    "reason": "Team coverage too low during peak period.",
    "notificationsSent": ["slack"],
    "timestamp": "2026-03-16T09:30:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### POST /approvals/:requestId/force-approve

HR admin override: approve a request regardless of workflow step or approver assignment.

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "reason": "string — required for audit purposes"
}
```

**Response 200:** Same shape as standard approve response, with `action: "force_approved"`.

---

### POST /approvals/:requestId/remind

Send a manual reminder to the current step's approver.

**Auth:** `hr_admin`, `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
    "reminderSentTo": "David Park",
    "via": "slack",
    "timestamp": "2026-03-16T09:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### POST /approvals/delegations

Create an approval delegation (approver delegates authority while OOO).

**Auth:** `manager`, `hr_admin`, `company_admin`

**Request body:**

```json
{
  "delegateId": "string — employee ObjectId who will approve on your behalf",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "note": "string — optional"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "delegationId": "64f2a1b3c4d5e6f7a8b9c0d5",
    "delegatorId": "64f2a1b3c4d5e6f7a8b9c0d9",
    "delegatorName": "David Park",
    "delegateId": "64f2a1b3c4d5e6f7a8b9c0d2",
    "delegateName": "Emma Wilson",
    "startDate": "2026-04-01",
    "endDate": "2026-04-05",
    "isActive": true,
    "createdAt": "2026-03-16T09:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### GET /approvals/delegations

List active and future delegations for the tenant.

**Auth:** `manager` (own); `hr_admin`, `company_admin` (all)

**Response 200:** Array of delegation objects.

---

### DELETE /approvals/delegations/:delegationId

Revoke a delegation.

**Auth:** Delegation owner; `hr_admin`, `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": { "delegationId": "64f2a1b3c4d5e6f7a8b9c0d5", "revoked": true },
  "error": null,
  "meta": null
}
```

---

## 14. Module: Balances

Base path: `/balances`

Balances are always computed from the append-only ledger. No direct balance fields are mutable.

### GET /balances/employees/:employeeId

Get current balance summary per leave type for a specific employee, including radial ring visualization data.

**Auth:** `employee` (own only); `manager` (own team); `hr_admin`, `company_admin` (any)

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | integer | Balance year (default: current year) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
    "employeeName": "Alice Chen",
    "year": 2026,
    "balances": [
      {
        "leaveTypeId": "64f2a1b3c4d5e6f7a8b9c0a1",
        "leaveTypeName": "Vacation",
        "leaveTypeColor": "#818CF8",
        "total": 25.0,
        "used": 5.0,
        "pending": 5.0,
        "available": 15.0,
        "carried": 2.0,
        "accrualSchedule": {
          "type": "front_loaded",
          "nextAccrualDate": null,
          "nextAccrualAmount": null
        },
        "carryoverLimit": 5,
        "carryoverExpiresAt": "2027-03-31",
        "utilizationPercent": 40,
        "monthlyUsage": [
          { "month": "2026-01", "days": 3.0 },
          { "month": "2026-02", "days": 2.0 },
          { "month": "2026-03", "days": 0 }
        ]
      },
      {
        "leaveTypeId": "64f2a1b3c4d5e6f7a8b9c0a2",
        "leaveTypeName": "Sick Leave",
        "leaveTypeColor": "#34D399",
        "total": 10.0,
        "used": 2.0,
        "pending": 0,
        "available": 8.0,
        "carried": 0,
        "accrualSchedule": {
          "type": "front_loaded",
          "nextAccrualDate": null,
          "nextAccrualAmount": null
        },
        "carryoverLimit": null,
        "carryoverExpiresAt": null,
        "utilizationPercent": 20,
        "monthlyUsage": [
          { "month": "2026-01", "days": 0 },
          { "month": "2026-02", "days": 2.0 },
          { "month": "2026-03", "days": 0 }
        ]
      }
    ],
    "computedAt": "2026-03-16T12:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### GET /balances/teams/:teamId

Aggregate balance summary per leave type for all members of a team. Used for the Team Balances widget.

**Auth:** `manager` (own team); `hr_admin`, `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
    "teamName": "Engineering",
    "memberCount": 12,
    "year": 2026,
    "balances": [
      {
        "leaveTypeId": "64f2a1b3c4d5e6f7a8b9c0a1",
        "leaveTypeName": "Vacation",
        "leaveTypeColor": "#818CF8",
        "averageTotal": 25.0,
        "averageUsed": 6.2,
        "averageAvailable": 18.8,
        "averageUtilizationPercent": 25,
        "lowBalanceEmployeeCount": 2
      }
    ],
    "computedAt": "2026-03-16T12:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### POST /balances/adjustments

Manual balance adjustment (HR admin correcting an error or granting extra days).

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "employeeId": "string — required",
  "leaveTypeId": "string — required",
  "amount": "number — positive to add, negative to deduct",
  "reason": "string — required for audit trail",
  "effectiveDate": "YYYY-MM-DD"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "adjustmentId": "64f2a1b3c4d5e6f7a8b9c0l1",
    "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
    "leaveTypeId": "64f2a1b3c4d5e6f7a8b9c0a1",
    "amount": 2.0,
    "reason": "Granting extra days for exceptional performance",
    "balanceAfterAdjustment": 17.5,
    "effectiveDate": "2026-03-16",
    "createdAt": "2026-03-16T10:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

### GET /balances/ledger/:employeeId

View the raw balance ledger entries for an employee. Useful for audit and debugging.

**Auth:** `hr_admin`, `company_admin`

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `leaveTypeId` | string | Filter by leave type |
| `startDate` | YYYY-MM-DD | From date |
| `endDate` | YYYY-MM-DD | To date |
| `type` | string (repeatable) | Entry types: `accrual`, `deduction`, `adjustment`, `carryover`, `expiry` |
| `page` | integer | Default 1 |
| `limit` | integer | Default 50 |

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "ledgerId": "64f2a1b3c4d5e6f7a8b9c0l2",
      "leaveTypeName": "Vacation",
      "type": "deduction",
      "amount": -5.0,
      "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
      "reason": "Approved leave Apr 7-11",
      "effectiveDate": "2026-04-07",
      "createdAt": "2026-03-16T09:00:00Z"
    }
  ],
  "error": null,
  "meta": {
    "total": 24,
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

## 15. Module: Calendar

Base path: `/calendar`

### GET /calendar/absences

Return team-grouped absences for a date range. Powers the swim-lane calendar. Privacy rule BR-092: leave type is omitted when `includeLeaveType: false` (default for team channel views and non-HR roles).

**Auth:** All roles (data scoped by role)

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | YYYY-MM-DD | Yes | Start of date range |
| `endDate` | YYYY-MM-DD | Yes | End of date range (max 31 days) |
| `teamId` | string (repeatable) | No | Filter to specific team(s); default all |
| `includeLeaveType` | boolean | No | Default `false` for employee/manager; forced `false` for team views; HR can pass `true` |
| `status` | string (repeatable) | No | Default: `approved,pending_approval` |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "startDate": "2026-04-01",
    "endDate": "2026-04-30",
    "teams": [
      {
        "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
        "teamName": "Engineering",
        "teamSize": 12,
        "members": [
          {
            "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
            "employeeName": "Alice Chen",
            "absences": [
              {
                "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
                "startDate": "2026-04-07",
                "endDate": "2026-04-11",
                "workingDays": 5,
                "status": "pending_approval",
                "leaveTypeName": null,
                "leaveTypeColor": "#818CF8"
              }
            ]
          }
        ],
        "coverageWarnings": [
          {
            "date": "2026-04-08",
            "membersOut": 4,
            "coveragePercent": 67,
            "belowThreshold": true
          }
        ]
      }
    ]
  },
  "error": null,
  "meta": null
}
```

Note: `leaveTypeName` is `null` when `includeLeaveType` is false. `leaveTypeColor` is always returned to allow color-coding without revealing type name.

---

### GET /calendar/heatmap

Return per-day absence counts for a month. Used for the absence heatmap widget.

**Auth:** `hr_admin`, `company_admin`; `manager` scoped to own team

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | Yes | Year (e.g., 2026) |
| `month` | integer | Yes | Month 1-12 |
| `teamId` | string | No | Filter to one team |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "year": 2026,
    "month": 4,
    "totalEmployees": 47,
    "days": [
      { "date": "2026-04-01", "absenceCount": 3, "isWeekend": false, "isHoliday": false, "coverageWarning": false },
      { "date": "2026-04-02", "absenceCount": 1, "isWeekend": false, "isHoliday": false, "coverageWarning": false },
      { "date": "2026-04-05", "absenceCount": 0, "isWeekend": false, "isHoliday": false, "coverageWarning": false },
      { "date": "2026-04-06", "absenceCount": 5, "isWeekend": false, "isHoliday": false, "coverageWarning": true }
    ]
  },
  "error": null,
  "meta": null
}
```

---

### GET /calendar/upcoming-week

Return per-day absence counts for the next 5 working days. Used for the Upcoming Week dashboard widget.

**Auth:** `hr_admin`, `company_admin`, `manager`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "days": [
      { "date": "2026-03-17", "dayName": "Tue", "absenceCount": 2, "isHoliday": false },
      { "date": "2026-03-18", "dayName": "Wed", "absenceCount": 1, "isHoliday": false },
      { "date": "2026-03-19", "dayName": "Thu", "absenceCount": 4, "isHoliday": false },
      { "date": "2026-03-20", "dayName": "Fri", "absenceCount": 2, "isHoliday": false },
      { "date": "2026-03-23", "dayName": "Mon", "absenceCount": 0, "isHoliday": false }
    ]
  },
  "error": null,
  "meta": null
}
```

---

## 16. Module: Holidays

Base path: `/holidays`

### GET /holidays

Return public and custom holidays for the tenant's configured country.

**Auth:** All roles

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | Yes | Year |
| `countryCode` | string | No | Override tenant default (e.g., for multi-country companies) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "countryCode": "GB",
    "year": 2026,
    "holidays": [
      { "date": "2026-01-01", "name": "New Year's Day", "type": "public" },
      { "date": "2026-04-10", "name": "Good Friday", "type": "public" },
      { "date": "2026-12-24", "name": "Company Day Off", "type": "custom" }
    ]
  },
  "error": null,
  "meta": null
}
```

---

### POST /holidays/custom

Add a company-specific holiday.

**Auth:** `hr_admin`, `company_admin`

**Request body:**

```json
{
  "date": "YYYY-MM-DD",
  "name": "string — required",
  "year": "integer"
}
```

**Response 201:** Single holiday object.

---

### DELETE /holidays/custom/:date

Remove a custom holiday by date.

**Auth:** `hr_admin`, `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": { "date": "2026-12-24", "deleted": true },
  "error": null,
  "meta": null
}
```

---

## 17. Module: Dashboard

Base path: `/dashboard`

The dashboard aggregate endpoint returns all 9 bento widget payloads in a single HTTP call to meet the 3-second load target. Each widget section has its own cache TTL.

### GET /dashboard/summary

Return the full HR dashboard data aggregate.

**Auth:** `hr_admin`, `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-03-16T12:00:00Z",
    "widgets": {
      "outToday": {
        "count": 4,
        "employees": [
          {
            "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
            "name": "Alice Chen",
            "teamName": "Engineering",
            "avatarUrl": null,
            "returnDate": "2026-03-18"
          }
        ],
        "cacheTtlSeconds": 60
      },
      "pendingApprovals": {
        "count": 7,
        "staleCount": 2,
        "oldestPendingHours": 52,
        "cacheTtlSeconds": 30
      },
      "utilizationRate": {
        "averageUtilizationPercent": 34,
        "trend": "up",
        "trendPercent": 3,
        "cacheTtlSeconds": 3600
      },
      "upcomingWeek": {
        "days": [
          { "date": "2026-03-17", "dayName": "Tue", "absenceCount": 2 },
          { "date": "2026-03-18", "dayName": "Wed", "absenceCount": 1 },
          { "date": "2026-03-19", "dayName": "Thu", "absenceCount": 4 },
          { "date": "2026-03-20", "dayName": "Fri", "absenceCount": 2 },
          { "date": "2026-03-23", "dayName": "Mon", "absenceCount": 0 }
        ],
        "cacheTtlSeconds": 300
      },
      "absenceHeatmap": {
        "year": 2026,
        "month": 3,
        "days": [
          { "date": "2026-03-01", "absenceCount": 1, "coverageWarning": false },
          { "date": "2026-03-16", "absenceCount": 4, "coverageWarning": true }
        ],
        "cacheTtlSeconds": 300
      },
      "resolutionRate": {
        "periodLabel": "March 2026",
        "approved": 23,
        "pending": 7,
        "rejected": 3,
        "total": 33,
        "approvalRatePercent": 70,
        "cacheTtlSeconds": 300
      },
      "activityFeed": {
        "events": [
          {
            "eventId": "64f2a1b3c4d5e6f7a8b9c0v1",
            "type": "request_approved",
            "actorName": "David Park",
            "targetName": "Alice Chen",
            "description": "Approved 5-day vacation request",
            "entityId": "64f2a1b3c4d5e6f7a8b9c0c1",
            "entityType": "leave_request",
            "timestamp": "2026-03-16T11:30:00Z",
            "relativeTime": "30 minutes ago"
          }
        ],
        "cacheTtlSeconds": 30
      },
      "needsAttention": {
        "requests": [
          {
            "requestId": "64f2a1b3c4d5e6f7a8b9c0c2",
            "employeeName": "Bob Smith",
            "teamName": "Marketing",
            "leaveTypeName": "Vacation",
            "startDate": "2026-03-20",
            "workingDays": 3,
            "pendingHours": 52,
            "isStale": true,
            "currentApproverName": "Carol Davis",
            "autoEscalateAt": "2026-03-18T08:00:00Z"
          }
        ],
        "cacheTtlSeconds": 30
      },
      "teamBalances": {
        "teams": [
          {
            "teamId": "64f2a1b3c4d5e6f7a8b9c0e2",
            "teamName": "Engineering",
            "balances": [
              {
                "leaveTypeName": "Vacation",
                "leaveTypeColor": "#818CF8",
                "averageAvailableDays": 18.8,
                "averageTotalDays": 25.0,
                "averageUtilizationPercent": 25
              }
            ]
          }
        ],
        "cacheTtlSeconds": 3600
      }
    }
  },
  "error": null,
  "meta": null
}
```

---

### GET /dashboard/manager

Manager-specific dashboard view: pending approvals for own team, team calendar mini, team balances.

**Auth:** `manager`, `hr_admin`, `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "pendingForMyTeams": {
      "count": 2,
      "requests": []
    },
    "teamAbsencesToday": {
      "count": 1,
      "employees": []
    },
    "upcomingWeek": {
      "days": []
    }
  },
  "error": null,
  "meta": null
}
```

---

### GET /dashboard/employee

Employee self-service data aggregate: own balances, active request status, team mini calendar, upcoming holidays.

**Auth:** Any authenticated role

**Response 200:**

```json
{
  "success": true,
  "data": {
    "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
    "balances": [],
    "activeRequests": [
      {
        "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
        "leaveTypeName": "Vacation",
        "leaveTypeColor": "#818CF8",
        "startDate": "2026-04-07",
        "endDate": "2026-04-11",
        "workingDays": 5,
        "status": "pending_approval",
        "currentStep": 1,
        "totalSteps": 2,
        "currentApproverName": "David Park"
      }
    ],
    "teamAbsencesThisWeek": {
      "days": []
    },
    "upcomingHolidays": [
      { "date": "2026-04-10", "name": "Good Friday", "daysUntil": 25 }
    ]
  },
  "error": null,
  "meta": null
}
```

---

## 18. Module: Audit

Base path: `/audit`

The audit log is immutable (append-only). No write endpoints are exposed to clients.

### GET /audit/logs

Query the audit trail with filtering. Ordered by timestamp descending by default.

**Auth:** `hr_admin`, `company_admin`

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `entityType` | string | `leave_request`, `employee`, `workflow`, `leave_type`, `team`, `balance`, `tenant` |
| `entityId` | string | Filter by specific entity |
| `actorId` | string | Filter by who performed the action |
| `action` | string (repeatable) | Filter by action type |
| `startDate` | YYYY-MM-DD | From date |
| `endDate` | YYYY-MM-DD | To date |
| `page` | integer | Default 1 |
| `limit` | integer | Default 50, max 200 |
| `sortOrder` | `asc` \| `desc` | Default `desc` |

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "logId": "64f2a1b3c4d5e6f7a8b9c0g1",
      "action": "leave_request.approved",
      "entityType": "leave_request",
      "entityId": "64f2a1b3c4d5e6f7a8b9c0c1",
      "actorId": "64f2a1b3c4d5e6f7a8b9c0d9",
      "actorName": "David Park",
      "actorRole": "manager",
      "changes": {
        "status": { "from": "pending_approval", "to": "approved" },
        "currentStep": { "from": 1, "to": null }
      },
      "metadata": {
        "note": "Approved via Slack",
        "platform": "slack"
      },
      "timestamp": "2026-03-16T09:00:00Z"
    }
  ],
  "error": null,
  "meta": {
    "total": 1284,
    "page": 1,
    "limit": 50,
    "totalPages": 26,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Action types enumeration:**

```
leave_request.submitted
leave_request.approved
leave_request.rejected
leave_request.force_approved
leave_request.cancelled
leave_request.escalated
leave_request.reminded
employee.created
employee.updated
employee.deleted
employee.role_changed
workflow.created
workflow.updated
workflow.deleted
leave_type.created
leave_type.updated
balance.adjusted
tenant.settings_changed
tenant.platform_connected
tenant.platform_disconnected
billing.plan_upgraded
billing.plan_downgraded
```

---

### GET /audit/logs/export

Export audit logs as CSV. Returns a streaming response.

**Auth:** `company_admin`

**Query parameters:** Same as `GET /audit/logs` (without pagination).

**Response 200:** `text/csv` download.

---

## 19. Module: Notifications

Base path: `/notifications`

### GET /notifications

Return notification inbox for the authenticated user (approver notifications, status updates).

**Auth:** Any authenticated role

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `read` | boolean | Filter by read status |
| `page` | integer | Default 1 |
| `limit` | integer | Default 20 |

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "notificationId": "64f2a1b3c4d5e6f7a8b9c0n1",
      "type": "approval_request",
      "title": "Leave Request to Approve",
      "body": "Alice Chen requested 5 days vacation (Apr 7-11).",
      "entityType": "leave_request",
      "entityId": "64f2a1b3c4d5e6f7a8b9c0c1",
      "isRead": false,
      "createdAt": "2026-03-16T08:00:00Z"
    }
  ],
  "error": null,
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### PATCH /notifications/:notificationId/read

Mark a notification as read.

**Auth:** Any authenticated role (own notifications only)

**Response 200:**

```json
{
  "success": true,
  "data": { "notificationId": "64f2a1b3c4d5e6f7a8b9c0n1", "isRead": true },
  "error": null,
  "meta": null
}
```

---

### POST /notifications/read-all

Mark all notifications as read for the authenticated user.

**Auth:** Any authenticated role

**Response 200:**

```json
{
  "success": true,
  "data": { "markedRead": 5 },
  "error": null,
  "meta": null
}
```

---

### GET /notifications/preferences

Get notification preferences for the authenticated user.

**Auth:** Any authenticated role

**Response 200:**

```json
{
  "success": true,
  "data": {
    "employeeId": "64f2a1b3c4d5e6f7a8b9c0d1",
    "channels": {
      "slack": { "enabled": true },
      "teams": { "enabled": false },
      "email": { "enabled": true, "address": "alice@acme.com" },
      "inApp": { "enabled": true }
    },
    "events": {
      "requestStatusChange": true,
      "approvalRequired": true,
      "approvalReminder": true,
      "teamAnnouncement": true
    }
  },
  "error": null,
  "meta": null
}
```

---

### PATCH /notifications/preferences

Update notification preferences.

**Auth:** Any authenticated role (own preferences only)

**Request body:** Partial update of `channels` and/or `events` objects.

**Response 200:** Full preferences object.

---

## 20. Module: Billing

Base path: `/billing`

### GET /billing/subscription

Return current plan and usage.

**Auth:** `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "plan": "team",
    "status": "active",
    "activeEmployeeCount": 47,
    "planLimits": {
      "maxEmployees": null,
      "maxLeaveTypes": null,
      "maxApprovalLevels": null,
      "platforms": ["slack", "teams"],
      "calendarSync": true,
      "advancedReporting": false
    },
    "currentPeriodStart": "2026-03-01",
    "currentPeriodEnd": "2026-03-31",
    "nextInvoiceAmount": 94.00,
    "nextInvoiceCurrency": "USD",
    "paymentMethod": {
      "brand": "visa",
      "last4": "4242",
      "expiryMonth": 12,
      "expiryYear": 2028
    },
    "stripeCustomerId": "cus_abc123"
  },
  "error": null,
  "meta": null
}
```

---

### POST /billing/checkout

Create a Stripe Checkout session for plan upgrade.

**Auth:** `company_admin`

**Request body:**

```json
{
  "plan": "team | business",
  "successUrl": "string — redirect URL after payment",
  "cancelUrl": "string — redirect URL if cancelled"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/...",
    "sessionId": "cs_abc123"
  },
  "error": null,
  "meta": null
}
```

---

### POST /billing/portal

Create a Stripe Billing Portal session for self-service plan management and payment method updates.

**Auth:** `company_admin`

**Request body:**

```json
{
  "returnUrl": "string"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": { "portalUrl": "https://billing.stripe.com/..." },
  "error": null,
  "meta": null
}
```

---

### GET /billing/invoices

List past invoices.

**Auth:** `company_admin`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "invoiceId": "in_abc123",
      "amount": 94.00,
      "currency": "USD",
      "status": "paid",
      "periodStart": "2026-02-01",
      "periodEnd": "2026-02-28",
      "paidAt": "2026-02-01T00:00:00Z",
      "downloadUrl": "https://..."
    }
  ],
  "error": null,
  "meta": null
}
```

---

## 21. Module: Bot Webhooks

Bot webhook endpoints receive events from Slack and Teams. They use platform-specific request verification (HMAC-SHA256 signing) instead of Firebase Auth. The bot handlers resolve the platform user to an employee via the `bot_mappings` collection and invoke service methods directly.

### POST /slack/events

Slack Events API endpoint. Handles `url_verification` challenge and all subscribed events.

**Auth:** Slack HMAC-SHA256 request signing (`X-Slack-Signature` header)

**Handled events:**

| Event | Action |
|-------|--------|
| `url_verification` | Respond with `challenge` value |
| `app_mention` | Respond with help message |

**Response 200:** Slack-specific acknowledgement.

---

### POST /slack/interactions

Slack interactive components endpoint. Handles block action button clicks (approve, reject) and modal submissions (leave request form, rejection reason).

**Auth:** Slack HMAC-SHA256 request signing

**Handled interaction types:**

| Type | Payload | Action |
|------|---------|--------|
| `block_actions` | `approve_request` | Call `POST /approvals/:id/approve` |
| `block_actions` | `reject_request` | Open rejection reason modal |
| `view_submission` | `reject_reason_modal` | Call `POST /approvals/:id/reject` |
| `view_submission` | `leave_request_modal` | Call `POST /leave-requests` |

**Response 200:** Empty body (Slack requires acknowledgement within 3 seconds).

---

### POST /slack/commands

Slack slash commands endpoint.

**Auth:** Slack HMAC-SHA256 request signing

**Handled commands:**

| Command | Response |
|---------|----------|
| `/leave` | Open leave request modal |
| `/leave balance` | Return balance summary as ephemeral message |
| `/leave status` | Return most recent request status as ephemeral message |
| `/leave help` | Return command list as ephemeral message |

**Response 200:** Immediate acknowledgement; detailed response sent asynchronously via `response_url`.

---

### POST /teams/messages

Microsoft Bot Framework messaging endpoint. Handles all Teams bot activities (messages, card actions).

**Auth:** Bot Framework JWT verification (`Authorization: Bearer <bot-framework-token>`)

**Handled activity types:**

| Type | Action |
|------|--------|
| `message` | Parse text command; respond with card |
| `invoke` | Handle Adaptive Card `Action.Execute` (approve, reject) |
| `conversationUpdate` | Store `ConversationReference` for proactive messaging |

**Response 200:** Bot Framework activity response.

---

### POST /webhooks/stripe

Stripe webhook endpoint for billing lifecycle events.

**Auth:** Stripe webhook signature (`Stripe-Signature` header)

**Handled events:**

| Event | Action |
|-------|--------|
| `invoice.paid` | Confirm active subscription |
| `invoice.payment_failed` | Start grace period counter; notify admin |
| `customer.subscription.updated` | Sync plan tier and seat count |
| `customer.subscription.deleted` | Downgrade to free tier |

**Response 200:**

```json
{ "received": true }
```

---

## 22. Webhook and Event Payloads

The internal `NotificationRouter` dispatches these structured event payloads to the bot adapters. The shapes below define what data the bot message templates receive.

### Approval Request Notification

Sent to the approver when a request enters their step.

```json
{
  "event": "request.submitted",
  "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
  "employeeName": "Alice Chen",
  "employeeTeam": "Engineering",
  "employeeDepartment": "Product",
  "leaveTypeName": "Vacation",
  "startDate": "2026-04-07",
  "endDate": "2026-04-11",
  "workingDays": 5,
  "reason": "Spring break",
  "balanceAfterApproval": 15.5,
  "balanceUnit": "days",
  "teamCoveragePercent": 83,
  "othersOut": [{ "name": "Charlie Brown", "dates": "Apr 8-9" }],
  "approvalChain": "Step 1 of 2",
  "autoEscalateAt": "2026-03-18T08:00:00Z",
  "hoursUntilEscalation": 42,
  "webUrl": "https://app.leaveflow.app/requests/64f2a1b3c4d5e6f7a8b9c0c1"
}
```

### Approved Final Notification (to employee)

```json
{
  "event": "request.approved_final",
  "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
  "leaveTypeName": "Vacation",
  "startDate": "2026-04-07",
  "endDate": "2026-04-11",
  "workingDays": 5,
  "approvedBy": "David Park",
  "approvedAt": "2026-03-16T09:00:00Z",
  "balanceRemaining": 15.5,
  "calendarEventCreated": true
}
```

### Rejected Notification (to employee)

```json
{
  "event": "request.rejected",
  "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
  "leaveTypeName": "Vacation",
  "startDate": "2026-04-07",
  "endDate": "2026-04-11",
  "rejectedBy": "David Park",
  "reason": "Team coverage too low during peak period.",
  "rejectedAt": "2026-03-16T09:30:00Z"
}
```

### Escalation Notification (to approver and HR)

```json
{
  "event": "request.escalated",
  "requestId": "64f2a1b3c4d5e6f7a8b9c0c1",
  "employeeName": "Alice Chen",
  "originalApproverName": "David Park",
  "newApproverName": "Alice Chen",
  "escalationReason": "No response after 48 hours",
  "startDate": "2026-04-07",
  "endDate": "2026-04-11",
  "escalatedAt": "2026-03-18T08:00:00Z"
}
```

### Team Channel Announcement (BR-092 compliant — no leave type)

```json
{
  "event": "request.approved_announcement",
  "employeeName": "Alice Chen",
  "startDate": "2026-04-07",
  "endDate": "2026-04-11",
  "workingDays": 5
}
```

---

## 23. Error Catalog

### HTTP Status Codes

| Status | Meaning | When Used |
|--------|---------|-----------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST that creates a resource |
| 202 | Accepted | POST that enqueues background work (e.g., CSV import) |
| 400 | Bad Request | Malformed JSON, invalid query parameter types |
| 401 | Unauthorized | Missing or expired Firebase JWT |
| 403 | Forbidden | Valid JWT but insufficient role/ownership |
| 404 | Not Found | Resource does not exist or belongs to another tenant |
| 409 | Conflict | Business rule conflict (overlapping request, duplicate email, etc.) |
| 422 | Unprocessable Entity | Validation error (field-level errors in `details`) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service failure (Stripe, Firebase, etc.) |
| 503 | Service Unavailable | Maintenance or circuit breaker open |

### Error Code Reference

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 422 | One or more fields failed validation; see `details` |
| `EMAIL_ALREADY_REGISTERED` | 409 | Email address already has an account |
| `EMAIL_ALREADY_EXISTS` | 409 | Email already exists in this tenant |
| `NOT_FOUND` | 404 | Generic not found |
| `NOT_AUTHORIZED` | 403 | Role/ownership check failed |
| `NOT_AUTHORIZED_APPROVER` | 403 | Caller is not the current step's approver |
| `UNAUTHORIZED` | 401 | JWT missing, expired, or invalid |
| `OVERLAPPING_REQUEST` | 409 | Date range conflicts with existing request |
| `INSUFFICIENT_BALANCE` | 422 | Not enough leave balance |
| `BLACKOUT_PERIOD` | 422 | Dates fall within a blackout period |
| `PAST_DATE` | 422 | Start date is in the past |
| `NO_WORKFLOW_ASSIGNED` | 422 | Team has no workflow configured |
| `REQUEST_ALREADY_RESOLVED` | 409 | Request already approved, rejected, or cancelled |
| `REQUEST_CANCELLED` | 409 | Request was cancelled |
| `CANNOT_CANCEL_PAST_REQUEST` | 409 | Leave has already started or ended |
| `TEAM_HAS_PENDING_REQUESTS` | 409 | Cannot delete team with active requests |
| `WORKFLOW_HAS_ASSIGNED_TEAMS` | 409 | Cannot deactivate workflow with assigned teams |
| `LEAVE_TYPE_NAME_EXISTS` | 409 | Leave type name already in use |
| `PLAN_LIMIT_REACHED` | 402 | Action exceeds current plan limits |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `UPSTREAM_ERROR` | 502 | External service failure |

---

## 24. Data Models Reference

### LeaveRequest

| Field | Type | Description |
|-------|------|-------------|
| `requestId` | string (ObjectId) | Unique identifier |
| `tenantId` | string | Tenant scope |
| `employeeId` | string (ObjectId) | Requesting employee |
| `leaveTypeId` | string (ObjectId) | Leave type reference |
| `startDate` | date | Inclusive start date |
| `endDate` | date | Inclusive end date |
| `halfDayStart` | boolean | First day is half-day |
| `halfDayEnd` | boolean | Last day is half-day |
| `workingDays` | number | Calculated net working days |
| `reason` | string \| null | Optional employee note |
| `status` | enum | `pending_validation`, `pending_approval`, `approved`, `auto_approved`, `rejected`, `cancelled`, `validation_failed` |
| `currentStep` | integer | 0-indexed approval step |
| `workflowSnapshot` | object | Frozen copy of workflow at submission |
| `approvalHistory` | array | Step-level approval actions |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### Employee

| Field | Type | Description |
|-------|------|-------------|
| `employeeId` | string (ObjectId) | |
| `tenantId` | string | |
| `firebaseUid` | string | Firebase Auth UID |
| `email` | string | Unique within tenant |
| `name` | string | Display name |
| `role` | enum | `employee`, `manager`, `hr_admin`, `company_admin` |
| `teamId` | string (ObjectId) \| null | |
| `managerId` | string (ObjectId) \| null | Direct manager |
| `startDate` | date | Employment start |
| `status` | `active` \| `inactive` | |
| `primaryPlatform` | `slack` \| `teams` \| `email` \| null | |
| `slackUserId` | string \| null | |
| `teamsUserId` | string \| null | |
| `googleCalendarConnected` | boolean | |
| `outlookCalendarConnected` | boolean | |

### WorkflowStep

| Field | Type | Description |
|-------|------|-------------|
| `order` | integer | 0-indexed position in workflow |
| `approverType` | enum | `specific_user`, `role_direct_manager`, `role_team_lead`, `role_hr` |
| `approverUserId` | string \| null | Required for `specific_user` |
| `timeoutHours` | integer | Hours before escalation triggers |
| `escalationMode` | enum | `escalate_next`, `remind`, `none` |
| `maxReminders` | integer | Max reminders before notifying HR |
| `allowDelegation` | boolean | |

### BalanceLedgerEntry

| Field | Type | Description |
|-------|------|-------------|
| `ledgerId` | string (ObjectId) | |
| `tenantId` | string | |
| `employeeId` | string (ObjectId) | |
| `leaveTypeId` | string (ObjectId) | |
| `type` | enum | `accrual`, `deduction`, `adjustment`, `carryover`, `expiry` |
| `amount` | number | Positive = credit, negative = debit |
| `requestId` | string \| null | For deductions |
| `reason` | string | Human-readable reason |
| `effectiveDate` | date | Date the change applies |
| `createdAt` | timestamp | Immutable |

### AuditLogEntry

| Field | Type | Description |
|-------|------|-------------|
| `logId` | string (ObjectId) | |
| `tenantId` | string | |
| `action` | string | Dot-notation action name |
| `entityType` | string | Resource type |
| `entityId` | string | Resource ID |
| `actorId` | string (ObjectId) | Who performed the action |
| `actorRole` | string | Role at time of action |
| `changes` | object | Before/after diff for updates |
| `metadata` | object | Platform, note, etc. |
| `timestamp` | timestamp | Immutable, indexed |
