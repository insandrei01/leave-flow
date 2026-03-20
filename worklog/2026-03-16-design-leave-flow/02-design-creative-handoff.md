---
stage: "02-design-creative"
handoff_to: "03-api-design"
run_id: "2026-03-16-design-leave-flow"
---

# Handoff: UX/UI Design (Creative) -> API Design

## What Was Decided

The UX/UI Expert completed all design deliverables for LeaveFlow including design system tokens, 6 web mockups (HTML + Tailwind), 4 mobile mockups (React Native JSX), and 4 bot message templates (Slack Block Kit + Teams Adaptive Card). The full design document is at `worklog/runs/2026-03-16-design-leave-flow/02-design-creative.md`.

## Key Decisions Affecting API

### 1. Data Needed Per Page

| Page | API Endpoints Needed |
|------|---------------------|
| Dashboard Home | Pending approvals count + stale count, people out today, requests this week (with daily breakdown), avg approval time, upcoming absences (team swimlane), recent activity feed, leave usage breakdown by type |
| Absence Calendar | Team members with absences for date range, team coverage % per day, filterable by team/department |
| Leave Request Detail | Full request with approval chain (steps, approvers, timestamps, statuses), employee balance, team coverage for request date range, audit log entries for this request |
| Workflow Builder | Workflow definition (steps array), assigned teams, available approver types and persons |
| Employee Self-Service | Employee balances per leave type (remaining, total, used, pending), active requests with approval chain status, request history, team absences this week, next public holiday |
| Manager View | Team pending approvals with context (coverage, balance-after), team calendar |

### 2. Approval Chain Structure

The UI displays approval chains as a sequential timeline. Each step needs:
- `stepNumber`: integer position
- `approverType`: 'direct_manager' | 'specific_person' | 'role_based' | 'group'
- `approverName`: resolved display name
- `status`: 'completed' | 'current' | 'upcoming'
- `timestamp`: ISO 8601 (null if not yet reached)
- `duration`: human-readable time taken (null if not yet completed)

### 3. Stale Request Detection

Dashboard needs a way to identify stale requests (pending > 48h). Either:
- API returns a `stale: boolean` flag on each pending request
- API accepts a `staleSince` filter parameter
- Frontend calculates from `createdAt` (less ideal)

### 4. Team Coverage Calculation

Calendar view needs team coverage % per day. API should return:
```
GET /teams/{teamId}/coverage?start=2026-03-16&end=2026-03-20
-> [{ date, totalMembers, absentMembers, coveragePercent }]
```

### 5. Bot Message Data

Bot notifications need contextual data bundled with the request:
- Requester name, role, team
- Leave type, dates, duration, reason
- Balance remaining and balance-after-approval
- Team coverage % for the request dates
- Number of team members also off

## Design Files to Reference

| File | Contains |
|------|----------|
| `02-design-creative.md` | Full design system, component hierarchy, user flows, accessibility |
| `mockups/creative/dashboard-home.html` | Dashboard layout and data requirements |
| `mockups/creative/leave-request-detail.html` | Approval timeline structure |
| `mockups/creative/workflow-builder.html` | Workflow data model UI expectations |
| `mockups/creative/bot/bot-messages.md` | Bot message payload structures |

## Constraints for API Design

1. Dashboard must load under 3 seconds -- consider aggregation endpoints vs multiple calls
2. Calendar fetches one month at a time (pagination by date range)
3. All list views are server-side paginated
4. Audit trail entries are append-only and filterable by entity/action
5. Approval chain includes resolved approver names (not just IDs)
6. Bot messages need approval context in a single API call (avoid roundtrips from bot)
