---
stage: "02-design-experimental"
handoff_to: "03-api-design"
run_id: "2026-03-16-design-leave-flow"
---

# Handoff: UX/UI Design -> API Design

## What Was Decided

The UX/UI Expert completed the experimental design system and mockups for LeaveFlow. The full design document is at `worklog/runs/2026-03-16-design-leave-flow/02-design-experimental.md`.

## Key Design Decisions Affecting API

### 1. Dashboard Data Requirements

The HR dashboard bento grid requires these data endpoints:

| Widget | Data Needed | Update Frequency |
|--------|-------------|-----------------|
| Out Today | Count + employee list for current date | Real-time / 1 min cache |
| Pending Approvals | Count + stale count (>48h) | Real-time |
| Utilization Rate | Average balance utilization across company | Hourly cache OK |
| Upcoming Week | Per-day absence count for next 5 work days | 5 min cache |
| Absence Heatmap | Per-day absence count for full month | 5 min cache |
| Resolution Rate | Approved/pending/rejected counts for current month | 5 min cache |
| Activity Feed | Last 10 events (approvals, rejections, submissions, policy changes) | Real-time |
| Needs Attention | Pending requests sorted by age, with >48h flag | Real-time |
| Team Balances | Average remaining balance per leave type, per team | Hourly cache |

### 2. Approval Journey Visualization

The "package tracking" journey view requires:
- `approvalHistory`: Array of `{ stepNumber, approverName, approverRole, status, timestamp, via }` per step
- `currentStep`: Integer indicating active step
- `workflowSteps`: Array of all steps with their configuration (for showing future steps)
- `timeoutInfo`: Hours remaining until auto-escalation on current step

This data must be available on both the web request detail page AND in bot messages.

### 3. Swim-Lane Calendar

The absence calendar needs:
- Team-grouped employee absences for a date range
- Each absence: `{ employeeId, employeeName, teamId, startDate, endDate, leaveType, status }`
- Coverage warning calculation: when `(absences / teamSize)` exceeds threshold for any day
- Privacy: team channel announcements and team calendar do NOT expose leave type (BR-092)

### 4. Bot Message Data

Bot approval messages show dense information. API response for approval notifications must include:
- Employee name, team, department
- Leave type, dates, working days
- Balance after approval
- Team coverage percentage
- Names of others out on same dates
- Full approval chain with current position
- Auto-escalation countdown
- Request ID

### 5. Employee Balance Visualization

The radial balance rings require:
- Per-employee, per-leave-type: `{ used, total, accrualSchedule, nextAccrualDate, nextAccrualAmount, carryoverLimit }`
- Monthly usage breakdown for sparkline chart

### 6. Workflow Builder

The form-based builder needs:
- CRUD for workflow steps (sequential array)
- Reorder steps
- Step fields: approverType (role-based | specific | group), approverId, timeoutHours, timeoutAction (remind | escalate | auto-approve | notify-hr), allowDelegation
- Template instantiation endpoint
- Workflow versioning
- Test simulation endpoint (dry-run a request through workflow)

### 7. Onboarding Wizard

The 6-step wizard requires progress tracking:
- Save partial progress per step
- Resume from last completed step
- Template selection in step 3 instantiates a workflow

## Files to Read

| File | Contains |
|------|----------|
| `worklog/runs/2026-03-16-design-leave-flow/02-design-experimental.md` | Complete design doc with tokens, mockups, components, user flows |
| `mockups/experimental/dashboard-home.html` | Dashboard data widget requirements |
| `mockups/experimental/absence-calendar.html` | Calendar data structure |
| `mockups/experimental/workflow-builder.html` | Workflow CRUD requirements |
| `mockups/experimental/leave-request-detail.html` | Journey timeline data structure |
| `mockups/experimental/bot/slack-messages.md` | Slack Block Kit templates with data fields |
| `mockups/experimental/bot/teams-cards.md` | Teams Adaptive Card templates |

## Constraints for API Design

1. Dashboard must load in under 3 seconds — consider a single dashboard aggregate endpoint vs multiple calls.
2. Bot messages must be sent within 3 seconds of trigger event (Slack acknowledgement deadline).
3. Calendar fetches one month at a time with team-level filtering.
4. All list views are server-side paginated.
5. Audit trail must be immutable and chronologically queryable.
6. Balance calculations come from an append-only ledger (not direct updates).
