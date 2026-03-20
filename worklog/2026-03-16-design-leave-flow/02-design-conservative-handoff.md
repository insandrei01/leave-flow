---
stage: "02-design-conservative"
handoff_to: "03-api-design"
run_id: "2026-03-16-design-leave-flow"
---

# Handoff: UX/UI Design -> API Design

## What Was Produced

The UX/UI Expert completed the conservative design for LeaveFlow. Full output is at `worklog/runs/2026-03-16-design-leave-flow/02-design-conservative.md`.

## Key Decisions Affecting API Design

### 1. Page-Level Data Requirements

| Page | API Endpoints Needed |
|------|---------------------|
| Dashboard Home | GET pending approvals (count + list), GET on-leave-today count, GET upcoming absences (7 days), GET employee count |
| Absence Calendar | GET team absences for month (grouped by team, filtered by department) |
| Pending Approvals | GET pending requests (paginated, sortable by age, filterable by team) |
| Leave Request Detail | GET request by ID (includes approval chain history, balance impact, team availability) |
| Workflow Builder | GET/PUT workflow with steps; GET assigned teams |
| Onboarding Wizard | GET/PUT company settings; GET/POST leave types; GET/POST workflows; GET/POST teams; POST employees (bulk CSV) |
| Employee Self-Service | GET my balances; GET my requests (paginated, filterable by status) |
| Manager View | GET team pending approvals; GET team calendar; GET team balances |
| Bot Status Check | GET my recent requests with approval chain status (limit 5) |
| Bot Balance Check | GET my balances with next holiday date |

### 2. Approval Actions Required

- `POST /leave-requests/:id/approve` — Advances to next step or finalizes
- `POST /leave-requests/:id/reject` — Body: `{ reason: string }` (min 10 chars)
- `POST /leave-requests/:id/force-approve` — HR only, bypasses chain
- `POST /leave-requests/:id/cancel` — Employee only, pending or future approved
- `POST /leave-requests/:id/remind` — HR sends reminder to current approver

### 3. Status Tracker Requirements

The request detail and bot status messages need:
- Full approval chain with step definitions (approver name, type, timeout)
- Per-step status: pending, approved, skipped, rejected
- Per-step timestamps (when action was taken)
- Current step indicator

This means the `GET /leave-requests/:id` response must include an `approvalHistory` array with step-level detail.

### 4. Calendar Endpoint Shape

The absence calendar renders employees as rows and days as columns. The API should return:
```json
{
  "month": "2026-03",
  "teams": [
    {
      "id": "team-1",
      "name": "Engineering",
      "memberCount": 6,
      "absences": [
        {
          "employeeId": "emp-1",
          "employeeName": "Lisa Wong",
          "startDate": "2026-03-17",
          "endDate": "2026-03-19",
          "status": "approved"
        }
      ]
    }
  ]
}
```

Note: Per BR-092, the employee-facing calendar must NOT include leave type. The HR-facing calendar may include it.

### 5. Dashboard Aggregation

The dashboard requires multiple data points. Options:
- **Option A**: Dedicated `GET /dashboard` endpoint returning all stats in one call
- **Option B**: Multiple parallel calls from the frontend

Recommendation: Option A for initial load performance (3-second target), with individual endpoints available for partial refreshes.

### 6. Bot Message Templates

Bot messages are rendered from request data. The API does not need to return pre-formatted messages. The bot adapters (SlackMessageBuilder, TeamsCardBuilder) take the request object and produce platform-specific JSON.

However, the API should include:
- Team availability for the requested dates (in approval notifications)
- Workflow step labels (not just IDs) for human-readable chain display
- Remaining balance per type (in balance responses)

## Files to Read

| File | Contains |
|------|----------|
| `02-design-conservative.md` | Full design system, component hierarchy, user flows, accessibility notes |
| `mockups/conservative/*.html` | Web mockups showing exact data displayed on each page |
| `mockups/conservative/bot/*.json` | Bot message structures showing required data fields |

## Constraints for API Design

1. All list endpoints must support pagination (page + limit params) per NFR-4
2. Calendar endpoint fetches one month at a time per performance target
3. All responses must scope to tenant (tenantId from auth token)
4. Approval chain detail must be in the request response (not a separate call)
5. Balance response must show both current balance and pending deductions
6. Stale threshold (48 hours) should be configurable per tenant, not hardcoded
