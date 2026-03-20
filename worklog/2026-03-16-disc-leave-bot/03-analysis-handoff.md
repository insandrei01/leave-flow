---
from_agent: business-analyst
to_agent: architect
run_id: 2026-03-16-disc-leave-bot
stage: 3 -> 4
created: 2026-03-16T14:30:00Z
---

# Handoff: Business Analysis -> Architecture

## Summary

Business Analyst completed a comprehensive requirements analysis for LeaveFlow MVP. The analysis produced: 7 Mermaid process flow diagrams, 107 explicit business rules across 7 categories, a full gap analysis, a requirements traceability matrix mapping all 47 functional requirements to stories, a risk registry with 13 items, and a data flow overview including a PII map.

## Critical Findings for Architecture

### P0 Gaps (Must Resolve Before Design)

1. **GDPR Right-to-Erasure vs. Immutable Audit Log (OQ-1)**: The audit log must be immutable (BR-100, NFR-3) but GDPR requires erasure of personal data. Strategy: pseudonymize employee references in audit log on erasure request. Architect must design the pseudonymization mechanism — this affects the audit log schema and the employee deletion flow.

2. **Teams User-to-Employee Mapping Missing (OQ-10)**: LF-044 covers Slack mapping but no equivalent story exists for Teams. Without this, Teams approver notifications cannot be routed correctly. Must create LF-045 or extend LF-044 before Sprint 3 design.

3. **Team Coverage Minimum Has No Story (OQ-4)**: FR-4.6 (minimum team coverage enforcement) is referenced in business rules BR-010 and BR-028 but has no dedicated story. Must be assigned to LF-021 or a new story LF-036.

### Architectural Decisions Required

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Bot platform abstraction | Single codebase with conditional logic / Adapter pattern | Adapter pattern: `BotAdapter` interface with Slack and Teams implementations. Non-negotiable for platform parity maintenance. |
| Background job infrastructure | Railway cron / BullMQ + Redis / Managed scheduler | BullMQ + Railway Redis: supports retry, dead-letter queue, job visibility. Required for: accrual (monthly), escalation check (every 15 min), calendar sync queue, email retry. |
| Notification routing | Direct platform calls from handlers / Dedicated NotificationService | `NotificationService` that accepts events and routes to: Slack DM, Teams proactive message, email. Decouples approval engine from platform specifics. |
| MongoDB multi-tenancy | Shared collections with tenantId field / One DB per tenant | Shared collections with tenantId on all documents + compound indices. Validated by architecture for SaaS at this scale. |
| Token/secret storage | Environment variables / Encrypted in MongoDB / KMS | Encrypted in MongoDB with AES-256; encryption keys in environment per deployment tier. Stripe/Firebase keys in environment only. |

### Data Model Priorities

Collections requiring schema design before Sprint 1 coding starts:
- `tenants` — workspace ID, plan, settings, Stripe IDs
- `users` — Firebase UID, tenantId, role, email
- `employees` — tenantId, userId, team, timezone, start date, Slack/Teams mapping
- `teams` — tenantId, name, department, workflowId, memberIds
- `workflows` — tenantId, steps array (order, approverType, approverId, role, escalationTimeout)
- `leave_types` — tenantId, properties, accrual config, auto-approval rules
- `leave_requests` — tenantId, employeeId, type, dates, status, current_step, step_log
- `balance_ledger` — tenantId, employeeId, leaveTypeId, amount, reason, timestamp (append-only)
- `audit_log` — tenantId, actor, action, entity, old/new values, timestamp (append-only)
- `holiday_calendars` — country, year, dates (shared) + tenantId custom entries
- `bot_mappings` — slackUserId/teamsUserId, tenantId, employeeId

Critical index patterns:
- All collections: `{ tenantId: 1, _id: 1 }` for baseline isolation
- `leave_requests`: `{ tenantId: 1, employeeId: 1, status: 1 }`, `{ tenantId: 1, status: 1, current_step_deadline: 1 }` (escalation job)
- `balance_ledger`: `{ tenantId: 1, employeeId: 1, leaveTypeId: 1, timestamp: -1 }`
- `audit_log`: `{ tenantId: 1, timestamp: -1 }`, `{ tenantId: 1, entityId: 1 }`

### Third-Party Integration Timeline Constraints

| Service | Action Required | Deadline |
|---------|----------------|----------|
| Slack App Directory | Submit app for review | End of Sprint 1 |
| Teams App Store | Submit app for review | End of Sprint 1 |
| Stripe | Provision account; configure per-seat product and pricing | End of Sprint 2 |
| Google Calendar API | Submit OAuth consent screen for verification | Sprint 7 |
| Transactional email (SendGrid/Postmark) | Configure DNS (SPF/DKIM); provision sending domain | Sprint 1 |
| Nager.Date / Holiday API | Evaluate and select; implement caching layer | Sprint 5-6 |

### Key Business Rules for Implementation

The following rules have the most complex implementation implications:

- **BR-010 + BR-028**: Team coverage minimum overrides auto-approval — requires coverage query at both submission and approval time.
- **BR-020**: Self-approval prevention — approval engine must resolve "Direct Manager" role at request time and compare to requester identity.
- **BR-022**: Rejection reason minimum 10 non-whitespace characters — server-side validation required (not client only).
- **BR-032**: Escalation after timeout — background job must query on `current_step_deadline`; field must exist on every active approval step.
- **BR-102**: Workflow version isolation — pending requests must store a snapshot of the workflow at submission time, not a reference to the live workflow document.

## Open Questions for Architect

- OQ-1: GDPR pseudonymization mechanism for audit log (P0)
- OQ-5: Background job infrastructure decision
- OQ-3: Multi-platform approver preference (which platform gets the DM?)

## Files Produced

- `worklog/runs/2026-03-16-disc-leave-bot/03-analysis.md` — Full BRD (107 business rules, 7 diagrams, gap analysis, traceability matrix, risk registry, data flow)
- `worklog/runs/2026-03-16-disc-leave-bot/03-analysis-handoff.md` — This file

## Context Files for Next Stage

- `product-kb/features/leave-flow.md` — Full feature spec with stories
- `worklog/runs/2026-03-16-disc-leave-bot/02-stories.md` — All 50 stories with acceptance criteria
- `worklog/runs/2026-03-16-disc-leave-bot/03-analysis.md` — Business rules, data flows, gap analysis
