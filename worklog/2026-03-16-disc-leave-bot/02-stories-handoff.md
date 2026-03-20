---
from_agent: product-owner
to_agent: business-analyst
run_id: 2026-03-16-disc-leave-bot
stage: 2 -> 3
created: 2026-03-16T13:30:00Z
---

# Handoff: User Stories -> Business Analysis

## Summary

Product Owner completed backlog creation for LeaveFlow MVP. 50 user stories organized into 10 epics, covering platform foundation, Slack/Teams bots, approval engine, leave policies, team management, HR dashboard, calendar integrations, notifications, and billing. Stories are prioritized using MoSCoW and mapped into 8 two-week sprints over 4 months. All 5 open questions from Stage 1 are resolved with recommendations.

## Key Decisions Made

1. **50 stories across 10 epics** — comprehensive breakdown of MVP scope
2. **36 Must Have stories** — these define the minimum shippable product
3. **11 Should Have stories** — important but can be deferred if time is tight
4. **3 Could Have stories** — nice-to-have, lowest MVP priority
5. **Half-day granularity** (not hourly) for MVP leave units
6. **CSV import only** for employee onboarding (no auto org-chart import at MVP)
7. **English-only** at MVP, but i18n-ready string format from day 1
8. **Notifications default to DM-only** with optional channel announcements
9. **No self-approval** — requests from an employee who is their own approver escalate
10. **Part-time employees** handled via manual balance adjustment, not native support at MVP

## Deliverables Produced

- `worklog/runs/2026-03-16-disc-leave-bot/02-stories.md` — Full story details with acceptance criteria
- `product-kb/features/leave-flow.md` — Updated with refined user stories section

## Requirements for Next Stage

The Business Analyst must:
- Validate story completeness against the original feature spec (FR-1 through FR-7)
- Identify any functional gaps between the spec and the story backlog
- Map stories to technical components (API, database, bot, web) for architecture planning
- Assess feasibility of the 8-sprint plan given expected team size
- Identify cross-cutting concerns (error handling patterns, i18n preparation, audit logging) that need architectural decisions
- Produce data flow diagrams for the core request lifecycle
- Define API contracts for the highest-priority stories (S1-S3)

## Constraints

- **Timeline**: 4 months (8 x 2-week sprints), no flexibility
- **Platform parity**: Slack and Teams must have identical bot capabilities at launch
- **Free tier**: Must be functional and not crippled — real value at 10 users
- **Security**: GDPR compliance from day 1; multi-tenant data isolation mandatory
- **Bot response time**: Under 2 seconds for all commands (NFR-1)

## Open Questions

1. **Team size assumption**: Sprint plan assumes a team capable of delivering 5-7 stories per sprint (mix of S/M/L). BA should validate this against actual team capacity.
2. **Design dependencies**: UI stories (LF-003, LF-042, LF-043, LF-050-055) need mockups before development. When does UX/UI design start?
3. **Slack/Teams app review timeline**: Submissions should start during S1 to avoid blocking S2. BA should confirm review SLAs.
4. **Stripe account setup**: Required before S7. Admin/ops should set up Stripe test and production accounts early.
5. **Holiday data source**: LF-033 depends on a reliable public holiday API. BA should evaluate Nager.Date, Calendarific, and AbstractAPI for reliability and cost.

## Context Files

- `product-kb/features/leave-flow.md` — Full feature specification (updated with stories)
- `worklog/runs/2026-03-16-disc-leave-bot/02-stories.md` — Complete story details
- `worklog/runs/2026-03-16-disc-leave-bot/01-vision.md` — Market research and strategy
