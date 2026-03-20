---
stage: "01-architecture"
handoff_to: "02-ux-ui"
run_id: "2026-03-16-design-leave-flow"
---

# Handoff: Architecture -> UX/UI Design

## What Was Decided

The CTO completed all technology and architecture decisions for LeaveFlow. The full architecture document is at `worklog/runs/2026-03-16-design-leave-flow/01-architecture.md`. The primary ADR is at `product-kb/architecture/adr-001-leaveflow-tech-stack.md`.

## Key Decisions Affecting UX/UI

### 1. Frontend Stack
- **Next.js 15 (React)** with App Router
- **shadcn/ui** component library (Radix UI primitives + Tailwind CSS)
- **Zustand** for state management
- WCAG 2.1 AA accessibility required
- English-only at MVP; all strings must use i18n keys (`t('key')`) for Phase 2 localization

### 2. Bot Interface Constraints
- **Slack**: Block Kit modals and interactive messages. Max 25 blocks per message. Modal has 3-second acknowledgement deadline.
- **Teams**: Adaptive Cards. Max card payload ~28KB. Action.Execute for button clicks.
- Both platforms require **feature parity** — same user flows, different UI rendering.
- Bot messages are defined as platform-agnostic templates; each adapter converts to Block Kit or Adaptive Card format.

### 3. Web App Pages Required

| Page | Description | User Roles |
|------|-------------|-----------|
| Registration + Onboarding Wizard | 6-step setup (company, leave types, workflow, teams, employees, holidays) | company_admin |
| Dashboard Home | HR overview: pending approvals count, upcoming absences, quick stats | hr_admin |
| Absence Calendar | Monthly/weekly calendar with team/department filters | hr_admin, manager |
| Pending Approvals | Table of pending requests with age badge, reminder button, force approve | hr_admin |
| Leave Balance Report | Table by employee with export (CSV/PDF) | hr_admin |
| Audit Trail | Chronological log with entity/action filters | hr_admin, company_admin |
| Workflow Builder (form-based) | Sequential step editor: add/remove steps, set approver type, timeout, escalation | hr_admin |
| Leave Type Config | CRUD for leave types with accrual/carryover settings | hr_admin |
| Team Management | CRUD for teams with workflow assignment | hr_admin |
| Employee Management | Table with invite, CSV import, team assignment, role assignment | hr_admin, company_admin |
| Employee Self-Service | Own balance, request history, team absence calendar | employee |
| Manager View | Team calendar, pending approvals for their team, team balances | manager |
| Billing | Current plan, upgrade flow (Stripe Checkout), usage | company_admin |
| Settings | Company profile, timezone, fiscal year, work week, bot connections | company_admin |

### 4. Approval Flow Visualization
- Requests have a `currentStep` and `approvalHistory` array
- The "live request tracker" (package tracking UX) should show: submitted -> step 1 (name, status) -> step 2 -> ... -> approved/rejected
- This appears in both bot messages and the web app request detail view

### 5. Data Available for UI
- Leave requests with status, dates, working days, approval chain
- Employee balances per leave type (computed from append-only ledger)
- Team calendar (which team members are off on which dates)
- Audit log entries (actor, action, entity, timestamp)
- Workflow definitions with steps

### 6. Performance Targets
- Dashboard pages must load in under 3 seconds
- All list views must be paginated (server-side)
- Calendar view fetches one month at a time

## Files to Read

| File | Contains |
|------|----------|
| `worklog/runs/2026-03-16-design-leave-flow/01-architecture.md` | Full architecture with component diagram, data model, API module structure |
| `product-kb/features/leave-flow.md` | Feature spec with all user stories and acceptance criteria |
| `worklog/runs/2026-03-16-disc-leave-bot/03-analysis.md` | Business rules catalog (107 rules), process flow diagrams |
| `product-kb/architecture/adr-001-leaveflow-tech-stack.md` | Technology decisions and rationale |

## Constraints for UX/UI

1. Use shadcn/ui components as the design system foundation. Do not design custom components that conflict with Radix UI patterns.
2. The onboarding wizard must feel lightweight (target: complete in under 30 minutes including CSV import).
3. Bot interactions must work within Slack Block Kit and Teams Adaptive Card constraints — no arbitrary HTML or custom rendering.
4. The workflow builder in MVP is form-based (add/remove sequential steps), not visual drag-and-drop. The visual builder is Phase 2.
5. Employee privacy: team calendar shows name + absence dates only, not leave type (BR-092).
6. All interactive elements must meet WCAG 2.1 AA (keyboard navigation, screen reader support, color contrast).

## Open Questions for UX/UI

1. Should the employee self-service portal and manager view be separate pages or tabs within the same dashboard?
2. What is the preferred layout for the onboarding wizard: multi-page or single-page with sections?
3. Should the approval chain visualization in bot messages be text-based (emoji steps) or a custom image (generated server-side)?
4. How should the HR dashboard surface "stale" requests (pending > 48 hours) — badge, color, separate section?
