---
from_agent: product-manager
to_agent: product-owner
run_id: 2026-03-16-disc-leave-bot
stage: 1 -> 2
created: 2026-03-16T12:45:00Z
---

# Handoff: Vision & Strategy -> User Stories

## Summary

Product Manager completed market research and defined the product vision for LeaveFlow, a SaaS leave management bot for Slack/Teams. Core differentiator: configurable approval workflow builder per team. Full feature spec written with 5 personas, 7 FR groups (30+ requirements), 9 NFRs, and phased MVP scope.

## Key Decisions

1. Product name: "LeaveFlow"
2. Dual platform (Slack + Teams) at MVP
3. Free tier up to 10 users; paid at $2/user (Team) and $4/user (Business)
4. MVP ships form-based workflow builder (visual drag-and-drop is Phase 2)
5. Team-level workflow autonomy; HR sets guardrail policies
6. Live request tracker as UX differentiator
7. MVP target: 4 months

## Requirements for Next Stage

The Product Owner must:
- Refine the 12 user stories with granular acceptance criteria (GIVEN/WHEN/THEN)
- Prioritize MVP backlog using MoSCoW
- Identify missing stories (edge cases: overlapping requests, timezones, part-time)
- Define "Definition of Done" for each MVP story
- Estimate complexity (S/M/L/XL) and group into sprints
- Validate persona definitions

## Open Questions

1. Should MVP support auto org-chart import from Google Workspace / Entra ID?
2. Half-day only or also hourly leave tracking in MVP?
3. Leave announcements: shared channel, DM, or configurable?
4. English-only MVP or multi-language?
5. Domain availability: leaveflow.io, leaveflow.app, getleaveflow.com

## Context Files

- `product-kb/features/leave-flow.md` — Full feature specification
- `worklog/runs/2026-03-16-disc-leave-bot/01-vision.md` — Market research and strategy
