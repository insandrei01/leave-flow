---
stage: "01-planning"
agent: "tech-lead"
model: "opus"
run_id: "2026-03-16-dev-leave-flow"
started: "2026-03-16T18:00:00Z"
finished: "2026-03-16T19:30:00Z"
tools_used: [Read, Write, Grep]
parent_agent: "scrum-master"
sub_agents_invoked: []
output_files:
  - worklog/runs/2026-03-16-dev-leave-flow/01-planning.md
  - worklog/runs/2026-03-16-dev-leave-flow/01-planning-handoff.md
---

# Implementation Plan: LeaveFlow MVP

## Table of Contents

1. [Overview](#1-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Phase 0: Project Scaffold](#3-phase-0-project-scaffold)
4. [Phase 1: Core Domain](#4-phase-1-core-domain)
5. [Phase 2: API Layer](#5-phase-2-api-layer)
6. [Phase 3: Bot Integration](#6-phase-3-bot-integration)
7. [Phase 4: Web Application](#7-phase-4-web-application)
8. [Phase 5: Background Jobs](#8-phase-5-background-jobs)
9. [Phase 6: Integration and Polish](#9-phase-6-integration-and-polish)
10. [Execution Order and Critical Path](#10-execution-order-and-critical-path)
11. [File Change Map](#11-file-change-map)
12. [Testing Strategy](#12-testing-strategy)
13. [Risk Register](#13-risk-register)

---

## 1. Overview

LeaveFlow is a greenfield, multi-tenant leave management SaaS. This plan breaks the MVP into 7 phases and 72 tasks. The architecture is a modular monolith (Fastify API + Next.js web) in a Turborepo monorepo with MongoDB Atlas and Redis (Upstash).

**Key references:**

| Artifact | Location |
|----------|----------|
| Feature spec | `product-kb/features/leave-flow.md` |
| Architecture | `worklog/runs/2026-03-16-design-leave-flow/01-architecture.md` |
| UI design | `worklog/runs/2026-03-16-design-leave-flow/02-design-experimental.md` |
| API contracts | `worklog/runs/2026-03-16-design-leave-flow/03-api-contracts.md` |
| Data model | `worklog/runs/2026-03-16-design-leave-flow/04-data-model.md` |
| ADR-001 | `product-kb/architecture/adr-001-leaveflow-tech-stack.md` |

**Effort summary:**

| Phase | Tasks | Small | Medium | Large | Estimated Hours |
|-------|-------|-------|--------|-------|-----------------|
| P0: Scaffold | 10 | 5 | 4 | 1 | 16 |
| P1: Core Domain | 12 | 2 | 7 | 3 | 36 |
| P2: API Layer | 12 | 3 | 7 | 2 | 32 |
| P3: Bot Integration | 8 | 2 | 3 | 3 | 28 |
| P4: Web Application | 14 | 3 | 7 | 4 | 46 |
| P5: Background Jobs | 6 | 1 | 4 | 1 | 18 |
| P6: Integration | 10 | 3 | 5 | 2 | 28 |
| **Total** | **72** | **19** | **37** | **16** | **~204** |

---

## 2. Monorepo Structure

```
leaveflow/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── tenant/
│   │   │   │   │   ├── tenant.routes.ts
│   │   │   │   │   ├── tenant.service.ts
│   │   │   │   │   ├── tenant.repository.ts
│   │   │   │   │   ├── tenant.schema.ts
│   │   │   │   │   ├── tenant.types.ts
│   │   │   │   │   ├── tenant.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.schema.ts
│   │   │   │   │   ├── auth.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── employee/
│   │   │   │   │   ├── employee.routes.ts
│   │   │   │   │   ├── employee.service.ts
│   │   │   │   │   ├── employee.repository.ts
│   │   │   │   │   ├── employee.schema.ts
│   │   │   │   │   ├── employee.types.ts
│   │   │   │   │   ├── employee.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── team/
│   │   │   │   │   ├── team.routes.ts
│   │   │   │   │   ├── team.service.ts
│   │   │   │   │   ├── team.repository.ts
│   │   │   │   │   ├── team.schema.ts
│   │   │   │   │   ├── team.types.ts
│   │   │   │   │   ├── team.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── leave-type/
│   │   │   │   │   ├── leave-type.routes.ts
│   │   │   │   │   ├── leave-type.service.ts
│   │   │   │   │   ├── leave-type.repository.ts
│   │   │   │   │   ├── leave-type.schema.ts
│   │   │   │   │   ├── leave-type.types.ts
│   │   │   │   │   ├── leave-type.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── workflow/
│   │   │   │   │   ├── workflow.routes.ts
│   │   │   │   │   ├── workflow.service.ts
│   │   │   │   │   ├── workflow.repository.ts
│   │   │   │   │   ├── workflow.schema.ts
│   │   │   │   │   ├── workflow.types.ts
│   │   │   │   │   ├── workflow.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── leave-request/
│   │   │   │   │   ├── leave-request.routes.ts
│   │   │   │   │   ├── leave-request.service.ts
│   │   │   │   │   ├── leave-request.repository.ts
│   │   │   │   │   ├── leave-request.schema.ts
│   │   │   │   │   ├── leave-request.types.ts
│   │   │   │   │   ├── leave-request.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── approval-engine/
│   │   │   │   │   ├── approval-engine.service.ts
│   │   │   │   │   ├── approval-engine.fsm.ts
│   │   │   │   │   ├── approval-engine.types.ts
│   │   │   │   │   ├── approval-engine.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── balance/
│   │   │   │   │   ├── balance.routes.ts
│   │   │   │   │   ├── balance.service.ts
│   │   │   │   │   ├── balance.repository.ts
│   │   │   │   │   ├── balance.schema.ts
│   │   │   │   │   ├── balance.types.ts
│   │   │   │   │   ├── balance.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── audit/
│   │   │   │   │   ├── audit.routes.ts
│   │   │   │   │   ├── audit.service.ts
│   │   │   │   │   ├── audit.repository.ts
│   │   │   │   │   ├── audit.schema.ts
│   │   │   │   │   ├── audit.types.ts
│   │   │   │   │   ├── audit.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── holiday/
│   │   │   │   │   ├── holiday.routes.ts
│   │   │   │   │   ├── holiday.service.ts
│   │   │   │   │   ├── holiday.repository.ts
│   │   │   │   │   ├── holiday.schema.ts
│   │   │   │   │   ├── holiday.types.ts
│   │   │   │   │   ├── holiday.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── onboarding/
│   │   │   │   │   ├── onboarding.routes.ts
│   │   │   │   │   ├── onboarding.service.ts
│   │   │   │   │   ├── onboarding.repository.ts
│   │   │   │   │   ├── onboarding.schema.ts
│   │   │   │   │   ├── onboarding.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── notification/
│   │   │   │   │   ├── notification.routes.ts
│   │   │   │   │   ├── notification.service.ts
│   │   │   │   │   ├── notification.repository.ts
│   │   │   │   │   ├── notification.schema.ts
│   │   │   │   │   ├── notification.types.ts
│   │   │   │   │   ├── notification.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── dashboard.routes.ts
│   │   │   │   │   ├── dashboard.service.ts
│   │   │   │   │   ├── dashboard.schema.ts
│   │   │   │   │   ├── dashboard.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── calendar/
│   │   │   │   │   ├── calendar.routes.ts
│   │   │   │   │   ├── calendar.service.ts
│   │   │   │   │   ├── calendar.schema.ts
│   │   │   │   │   ├── calendar.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── billing/
│   │   │   │   │   ├── billing.routes.ts
│   │   │   │   │   ├── billing.service.ts
│   │   │   │   │   ├── billing.schema.ts
│   │   │   │   │   ├── billing.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── bot-adapter/
│   │   │   │   │   ├── bot-adapter.interface.ts
│   │   │   │   │   ├── bot-adapter.types.ts
│   │   │   │   │   ├── bot-adapter.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── bot-slack/
│   │   │   │   │   ├── bot-slack.adapter.ts
│   │   │   │   │   ├── bot-slack.commands.ts
│   │   │   │   │   ├── bot-slack.interactions.ts
│   │   │   │   │   ├── bot-slack.plugin.ts
│   │   │   │   │   ├── bot-slack.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── bot-teams/
│   │   │   │   │   ├── bot-teams.adapter.ts
│   │   │   │   │   ├── bot-teams.commands.ts
│   │   │   │   │   ├── bot-teams.interactions.ts
│   │   │   │   │   ├── bot-teams.plugin.ts
│   │   │   │   │   ├── bot-teams.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── calendar-sync/
│   │   │   │   │   ├── calendar-sync.service.ts
│   │   │   │   │   ├── calendar-sync.google.ts
│   │   │   │   │   ├── calendar-sync.outlook.ts
│   │   │   │   │   ├── calendar-sync.types.ts
│   │   │   │   │   ├── calendar-sync.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── health/
│   │   │   │       ├── health.routes.ts
│   │   │   │       └── index.ts
│   │   │   ├── plugins/
│   │   │   │   ├── auth.plugin.ts
│   │   │   │   ├── tenant.plugin.ts
│   │   │   │   ├── error-handler.plugin.ts
│   │   │   │   ├── rate-limiter.plugin.ts
│   │   │   │   └── cors.plugin.ts
│   │   │   ├── middleware/
│   │   │   │   └── request-context.ts
│   │   │   ├── workers/
│   │   │   │   ├── escalation.worker.ts
│   │   │   │   ├── accrual.worker.ts
│   │   │   │   ├── calendar-sync.worker.ts
│   │   │   │   ├── notification.worker.ts
│   │   │   │   ├── csv-import.worker.ts
│   │   │   │   └── dashboard-cache.worker.ts
│   │   │   ├── lib/
│   │   │   │   ├── db.ts
│   │   │   │   ├── redis.ts
│   │   │   │   ├── bullmq.ts
│   │   │   │   ├── firebase-admin.ts
│   │   │   │   ├── logger.ts
│   │   │   │   └── config.ts
│   │   │   ├── models/
│   │   │   │   ├── tenant.model.ts
│   │   │   │   ├── employee.model.ts
│   │   │   │   ├── team.model.ts
│   │   │   │   ├── workflow.model.ts
│   │   │   │   ├── leave-type.model.ts
│   │   │   │   ├── leave-request.model.ts
│   │   │   │   ├── balance-ledger.model.ts
│   │   │   │   ├── audit-log.model.ts
│   │   │   │   ├── bot-mapping.model.ts
│   │   │   │   ├── holiday-calendar.model.ts
│   │   │   │   ├── delegation.model.ts
│   │   │   │   ├── oauth-token.model.ts
│   │   │   │   ├── blackout-period.model.ts
│   │   │   │   ├── notification.model.ts
│   │   │   │   └── index.ts
│   │   │   ├── server.ts
│   │   │   └── app.ts
│   │   ├── test/
│   │   │   ├── setup.ts
│   │   │   ├── helpers/
│   │   │   │   ├── db.helper.ts
│   │   │   │   ├── auth.helper.ts
│   │   │   │   ├── factory.ts
│   │   │   │   └── supertest.helper.ts
│   │   │   └── integration/
│   │   │       ├── tenant-isolation.test.ts
│   │   │       └── approval-flow.test.ts
│   │   ├── vitest.config.ts
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── globals.css
│       │   │   ├── (auth)/
│       │   │   │   ├── login/page.tsx
│       │   │   │   ├── register/page.tsx
│       │   │   │   └── verify-email/page.tsx
│       │   │   ├── (onboarding)/
│       │   │   │   └── onboarding/page.tsx
│       │   │   ├── (dashboard)/
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── dashboard/page.tsx
│       │   │   │   ├── calendar/page.tsx
│       │   │   │   ├── requests/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [id]/page.tsx
│       │   │   │   ├── approvals/page.tsx
│       │   │   │   ├── workflows/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [id]/page.tsx
│       │   │   │   ├── employees/page.tsx
│       │   │   │   ├── teams/page.tsx
│       │   │   │   ├── leave-types/page.tsx
│       │   │   │   ├── balances/page.tsx
│       │   │   │   ├── audit/page.tsx
│       │   │   │   ├── billing/page.tsx
│       │   │   │   ├── settings/page.tsx
│       │   │   │   └── self-service/page.tsx
│       │   │   └── (manager)/
│       │   │       └── my-team/page.tsx
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   │   └── (shadcn components installed here)
│       │   │   ├── layout/
│       │   │   │   ├── app-shell.tsx
│       │   │   │   ├── sidebar.tsx
│       │   │   │   ├── nav-item.tsx
│       │   │   │   ├── page-header.tsx
│       │   │   │   └── user-profile.tsx
│       │   │   ├── shared/
│       │   │   │   ├── glass-card.tsx
│       │   │   │   ├── stat-card.tsx
│       │   │   │   ├── balance-ring.tsx
│       │   │   │   ├── journey-timeline.tsx
│       │   │   │   ├── journey-step.tsx
│       │   │   │   ├── pulse-dot.tsx
│       │   │   │   ├── shimmer-badge.tsx
│       │   │   │   ├── absence-bar.tsx
│       │   │   │   ├── heatmap-cell.tsx
│       │   │   │   ├── approval-donut.tsx
│       │   │   │   ├── activity-item.tsx
│       │   │   │   ├── request-row.tsx
│       │   │   │   ├── team-balance-card.tsx
│       │   │   │   ├── workflow-node.tsx
│       │   │   │   ├── workflow-connector.tsx
│       │   │   │   ├── progress-ring.tsx
│       │   │   │   ├── empty-state.tsx
│       │   │   │   ├── loading-state.tsx
│       │   │   │   └── error-state.tsx
│       │   │   ├── dashboard/
│       │   │   │   ├── kpi-grid.tsx
│       │   │   │   ├── absence-heatmap.tsx
│       │   │   │   ├── activity-feed.tsx
│       │   │   │   ├── needs-attention.tsx
│       │   │   │   └── team-balances.tsx
│       │   │   ├── calendar/
│       │   │   │   ├── swim-lane-grid.tsx
│       │   │   │   ├── team-group.tsx
│       │   │   │   ├── employee-lane.tsx
│       │   │   │   ├── coverage-warning-row.tsx
│       │   │   │   └── calendar-legend.tsx
│       │   │   ├── workflow/
│       │   │   │   ├── workflow-step-list.tsx
│       │   │   │   ├── approval-step-card.tsx
│       │   │   │   ├── trigger-node.tsx
│       │   │   │   ├── end-node.tsx
│       │   │   │   ├── live-preview.tsx
│       │   │   │   ├── mini-node-diagram.tsx
│       │   │   │   └── template-selector.tsx
│       │   │   └── onboarding/
│       │   │       ├── progress-sidebar.tsx
│       │   │       ├── step-content.tsx
│       │   │       └── wizard-nav.tsx
│       │   ├── hooks/
│       │   │   ├── use-auth.ts
│       │   │   ├── use-api.ts
│       │   │   ├── use-tenant.ts
│       │   │   └── use-theme.ts
│       │   ├── stores/
│       │   │   ├── auth.store.ts
│       │   │   ├── tenant.store.ts
│       │   │   ├── workflow-builder.store.ts
│       │   │   └── calendar-filter.store.ts
│       │   ├── lib/
│       │   │   ├── api-client.ts
│       │   │   ├── firebase.ts
│       │   │   └── utils.ts
│       │   └── styles/
│       │       └── design-tokens.ts
│       ├── public/
│       ├── tailwind.config.ts
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── shared-types/
│   │   ├── src/
│   │   │   ├── tenant.types.ts
│   │   │   ├── employee.types.ts
│   │   │   ├── team.types.ts
│   │   │   ├── workflow.types.ts
│   │   │   ├── leave-type.types.ts
│   │   │   ├── leave-request.types.ts
│   │   │   ├── balance.types.ts
│   │   │   ├── audit.types.ts
│   │   │   ├── notification.types.ts
│   │   │   ├── api-envelope.types.ts
│   │   │   ├── roles.types.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── validation/
│   │   ├── src/
│   │   │   ├── auth.schema.ts
│   │   │   ├── tenant.schema.ts
│   │   │   ├── employee.schema.ts
│   │   │   ├── team.schema.ts
│   │   │   ├── workflow.schema.ts
│   │   │   ├── leave-type.schema.ts
│   │   │   ├── leave-request.schema.ts
│   │   │   ├── balance.schema.ts
│   │   │   ├── onboarding.schema.ts
│   │   │   ├── pagination.schema.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── bot-messages/
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── templates/
│   │   │   │   ├── approval-request.ts
│   │   │   │   ├── approved-notification.ts
│   │   │   │   ├── rejected-notification.ts
│   │   │   │   ├── balance-check.ts
│   │   │   │   ├── stale-reminder.ts
│   │   │   │   └── team-announcement.ts
│   │   │   ├── slack/
│   │   │   │   └── block-kit.renderer.ts
│   │   │   ├── teams/
│   │   │   │   └── adaptive-card.renderer.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── constants/
│       ├── src/
│       │   ├── roles.ts
│       │   ├── leave-request-status.ts
│       │   ├── approval-actions.ts
│       │   ├── escalation-modes.ts
│       │   ├── plans.ts
│       │   ├── ledger-entry-types.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── turbo.json
├── package.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── tsconfig.base.json
```

---

## 3. Phase 0: Project Scaffold

**Goal:** Boot the monorepo, establish dev tooling, database connection, auth, and test infrastructure. No business logic.

### P0-T01: Initialize Turborepo Monorepo

| Field | Value |
|-------|-------|
| **ID** | P0-T01 |
| **Title** | Initialize Turborepo monorepo |
| **Scope** | Run `npx create-turbo@latest` with pnpm. Set up root `package.json`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `docker-compose.yml` (MongoDB 8 + Redis 7). Configure Turborepo pipelines for build, dev, test, lint. |
| **Files** | `package.json`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `docker-compose.yml`, `pnpm-workspace.yaml` |
| **Dependencies** | None |
| **Tests** | Verify `pnpm build` succeeds, `pnpm dev` starts, Docker containers launch |
| **Size** | M (1-3hr) |
| **Parallel** | No (first task) |

### P0-T02: Shared Types Package

| Field | Value |
|-------|-------|
| **ID** | P0-T02 |
| **Title** | Create `packages/shared-types` package |
| **Scope** | Define all TypeScript interfaces and type unions: `Tenant`, `Employee`, `Team`, `Workflow`, `WorkflowStep`, `LeaveType`, `LeaveRequest`, `LeaveRequestStatus`, `ApprovalAction`, `BalanceLedgerEntry`, `AuditLogEntry`, `BotMapping`, `HolidayCalendar`, `Delegation`, `Notification`, `ApiEnvelope`, `PaginationMeta`, `Role`. Must match the data model spec exactly. |
| **Files** | `packages/shared-types/src/*.types.ts`, `packages/shared-types/package.json`, `packages/shared-types/tsconfig.json` |
| **Dependencies** | P0-T01 |
| **Tests** | Type compilation check only (no runtime tests needed for pure types) |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P0-T03, P0-T04) |

### P0-T03: Validation Schemas Package

| Field | Value |
|-------|-------|
| **ID** | P0-T03 |
| **Title** | Create `packages/validation` with Zod schemas |
| **Scope** | Zod schemas for every API request/response body. Schemas export both the Zod object and the inferred TypeScript type. Includes: auth (register, login), onboarding (steps 1-6), tenant (update), employee (create, update, import), team (create, update), workflow (create, update), leave-type (create, update), leave-request (create, validate, cancel), balance (query), pagination (page, limit, sortBy, sortOrder). |
| **Files** | `packages/validation/src/*.schema.ts`, `packages/validation/package.json`, `packages/validation/tsconfig.json` |
| **Dependencies** | P0-T01, P0-T02 |
| **Tests** | Unit tests for every schema: valid input passes, invalid input rejected with correct error messages |
| **Size** | L (3-6hr) |
| **Parallel** | Yes (with P0-T02, P0-T04) |

### P0-T04: Constants Package

| Field | Value |
|-------|-------|
| **ID** | P0-T04 |
| **Title** | Create `packages/constants` |
| **Scope** | Enum-like constants: `ROLES` (employee, manager, hr_admin, company_admin), `LEAVE_REQUEST_STATUS` (all 7 states), `APPROVAL_ACTIONS` (approved, rejected, escalated, skipped), `ESCALATION_MODES` (escalate_next, remind, none), `PLANS` (free, team, business, enterprise), `LEDGER_ENTRY_TYPES` (initial_allocation, accrual, deduction, restoration, manual_adjustment, carryover, carryover_expiry, year_end_forfeit). |
| **Files** | `packages/constants/src/*.ts`, `packages/constants/package.json`, `packages/constants/tsconfig.json` |
| **Dependencies** | P0-T01 |
| **Tests** | Snapshot tests to prevent accidental value changes |
| **Size** | S (<1hr) |
| **Parallel** | Yes (with P0-T02, P0-T03) |

### P0-T05: Fastify API Bootstrap

| Field | Value |
|-------|-------|
| **ID** | P0-T05 |
| **Title** | Bootstrap Fastify API application |
| **Scope** | `apps/api` with Fastify 5.x. Entry point `server.ts` that creates app via `app.ts` factory function. Register CORS plugin, Pino logger, graceful shutdown, health check route (`GET /health`). Environment config via `lib/config.ts` using `@fastify/env` or `dotenv`. Verify Docker Compose connectivity. |
| **Files** | `apps/api/src/server.ts`, `apps/api/src/app.ts`, `apps/api/src/lib/config.ts`, `apps/api/src/lib/logger.ts`, `apps/api/src/modules/health/health.routes.ts`, `apps/api/src/plugins/cors.plugin.ts`, `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/vitest.config.ts` |
| **Dependencies** | P0-T01 |
| **Tests** | Health endpoint returns 200; graceful shutdown works |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P0-T02, P0-T03, P0-T04) |

### P0-T06: MongoDB Connection and Mongoose Models

| Field | Value |
|-------|-------|
| **ID** | P0-T06 |
| **Title** | Database connection and all 14 Mongoose models |
| **Scope** | `lib/db.ts`: Mongoose connection with retry and graceful shutdown. Define all 14 Mongoose schemas matching the data model spec exactly. Each model in its own file under `models/`. Every schema includes `tenantId` (except `holiday_calendars`). Define all 34 compound indexes per the data model. Add Mongoose middleware that throws on queries missing `tenantId` filter (for tenant-scoped collections). Export all models from `models/index.ts`. |
| **Files** | `apps/api/src/lib/db.ts`, `apps/api/src/models/*.model.ts`, `apps/api/src/models/index.ts` |
| **Dependencies** | P0-T01, P0-T02 |
| **Tests** | Integration tests: connect to MongoDB, create/read documents, verify indexes exist, verify tenantId guard throws |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P0-T05) |

### P0-T07: Redis and BullMQ Setup

| Field | Value |
|-------|-------|
| **ID** | P0-T07 |
| **Title** | Redis connection and BullMQ queue definitions |
| **Scope** | `lib/redis.ts`: ioredis connection with Upstash config. `lib/bullmq.ts`: define 5 queues (escalation, accrual, notification, calendar-sync, csv-import) with default job options. Export queue instances and typed job interfaces. No workers yet (Phase 5). |
| **Files** | `apps/api/src/lib/redis.ts`, `apps/api/src/lib/bullmq.ts` |
| **Dependencies** | P0-T01 |
| **Tests** | Integration test: connect to Redis, add and retrieve a test job |
| **Size** | S (<1hr) |
| **Parallel** | Yes (with P0-T05, P0-T06) |

### P0-T08: Firebase Auth Plugin

| Field | Value |
|-------|-------|
| **ID** | P0-T08 |
| **Title** | Firebase Admin SDK and auth plugin |
| **Scope** | `lib/firebase-admin.ts`: initialize Firebase Admin SDK from service account. `plugins/auth.plugin.ts`: Fastify `onRequest` hook that verifies Firebase JWT, extracts `tenantId`, `employeeId`, `role` from custom claims, attaches to `request.auth`. Skips bot webhook routes. Supports role-based route guards via route-level `config.requiredRoles` array. |
| **Files** | `apps/api/src/lib/firebase-admin.ts`, `apps/api/src/plugins/auth.plugin.ts` |
| **Dependencies** | P0-T05 |
| **Tests** | Unit tests with mocked Firebase: valid token passes, expired token rejects, missing claims rejects, role guard works |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P0-T06, P0-T07) |

### P0-T09: Next.js Web Skeleton

| Field | Value |
|-------|-------|
| **ID** | P0-T09 |
| **Title** | Bootstrap Next.js 15 web application |
| **Scope** | `apps/web` with Next.js 15, App Router, Tailwind CSS v4, shadcn/ui init. Set up design tokens from the experimental design spec (dark glassmorphic: colors, typography with Space Grotesk / DM Sans / JetBrains Mono, spacing, border radius, motion). Configure `globals.css` with gradient mesh background, glass card utilities. Install shadcn/ui components: Button, Input, Select, Dialog, Tooltip, Badge. Create `lib/firebase.ts` (client-side Firebase init), `lib/api-client.ts` (fetch wrapper with auth token), `lib/utils.ts` (cn utility). |
| **Files** | `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/tailwind.config.ts`, `apps/web/next.config.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/styles/design-tokens.ts`, `apps/web/src/lib/firebase.ts`, `apps/web/src/lib/api-client.ts`, `apps/web/src/lib/utils.ts` |
| **Dependencies** | P0-T01 |
| **Tests** | Next.js builds successfully; Tailwind classes render; shadcn components import |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P0-T05 through P0-T08) |

### P0-T10: Test Infrastructure

| Field | Value |
|-------|-------|
| **ID** | P0-T10 |
| **Title** | Vitest + Supertest test infrastructure |
| **Scope** | `apps/api/vitest.config.ts` with MongoDB memory server setup. `test/setup.ts`: connect to in-memory MongoDB, seed test tenant. `test/helpers/db.helper.ts`: reset DB between tests. `test/helpers/auth.helper.ts`: generate fake Firebase tokens with configurable claims. `test/helpers/factory.ts`: factory functions for creating test entities (tenant, employee, team, workflow, leave request). `test/helpers/supertest.helper.ts`: create Fastify app instance for Supertest. |
| **Files** | `apps/api/vitest.config.ts`, `apps/api/test/setup.ts`, `apps/api/test/helpers/*.ts` |
| **Dependencies** | P0-T05, P0-T06, P0-T08 |
| **Tests** | Meta-test: a sample test that creates a tenant, authenticates, and queries succeeds |
| **Size** | M (1-3hr) |
| **Parallel** | No (depends on P0-T05, T06, T08) |

---

## 4. Phase 1: Core Domain

**Goal:** Implement all domain services and repositories with no routes. Pure business logic, fully tested. TDD approach: write tests first.

### P1-T01: Multi-Tenancy Middleware

| Field | Value |
|-------|-------|
| **ID** | P1-T01 |
| **Title** | Tenant isolation plugin |
| **Scope** | `plugins/tenant.plugin.ts`: after auth hook, extract `tenantId` from `request.auth`, set `request.tenantScope`. Create a `withTenant(tenantId, query)` utility that prepends `tenantId` to any Mongoose filter object. Write integration test that verifies Tenant A cannot read Tenant B data across all 14 collections. |
| **Files** | `apps/api/src/plugins/tenant.plugin.ts`, `apps/api/test/integration/tenant-isolation.test.ts` |
| **Dependencies** | P0-T08, P0-T06, P0-T10 |
| **Tests** | Cross-tenant isolation test for each collection; middleware rejects requests without tenantId |
| **Size** | M (1-3hr) |
| **Parallel** | No (blocks all other P1 tasks) |

### P1-T02: Leave Type CRUD Service

| Field | Value |
|-------|-------|
| **ID** | P1-T02 |
| **Title** | Leave type service and repository |
| **Scope** | `leave-type.repository.ts`: findAll, findById, create, update, delete (soft). `leave-type.service.ts`: CRUD with validation (name uniqueness per tenant, color format, entitlement > 0). Seed 3 default types (Vacation, Sick, Personal) on tenant creation. Immutable pattern: return new objects from all operations. |
| **Files** | `apps/api/src/modules/leave-type/leave-type.repository.ts`, `apps/api/src/modules/leave-type/leave-type.service.ts`, `apps/api/src/modules/leave-type/leave-type.types.ts`, `apps/api/src/modules/leave-type/leave-type.test.ts` |
| **Dependencies** | P1-T01 |
| **Tests** | Unit: create, read, update, delete, uniqueness constraint, default seeding |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P1-T03, P1-T04) |

### P1-T03: Team CRUD Service

| Field | Value |
|-------|-------|
| **ID** | P1-T03 |
| **Title** | Team service and repository |
| **Scope** | `team.repository.ts`: findAll, findById, create, update, delete. `team.service.ts`: CRUD with validation (name uniqueness per tenant, valid managerId referencing an employee, valid workflowId). Assign/unassign employees to teams. Get team members. |
| **Files** | `apps/api/src/modules/team/team.repository.ts`, `apps/api/src/modules/team/team.service.ts`, `apps/api/src/modules/team/team.types.ts`, `apps/api/src/modules/team/team.test.ts` |
| **Dependencies** | P1-T01 |
| **Tests** | Unit: CRUD, uniqueness, manager assignment, member listing |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P1-T02, P1-T04) |

### P1-T04: Employee CRUD Service

| Field | Value |
|-------|-------|
| **ID** | P1-T04 |
| **Title** | Employee service and repository |
| **Scope** | `employee.repository.ts`: findAll (paginated, filtered by team/role/status), findById, findByEmail, findByFirebaseUid, create, update, deactivate (soft delete). `employee.service.ts`: CRUD with validation (email uniqueness per tenant, valid teamId, valid role). CSV import parsing (validate rows, create employees, return error report). Invitation workflow: create employee record with `status: invited`, send invite email via notification queue. |
| **Files** | `apps/api/src/modules/employee/employee.repository.ts`, `apps/api/src/modules/employee/employee.service.ts`, `apps/api/src/modules/employee/employee.types.ts`, `apps/api/src/modules/employee/employee.test.ts` |
| **Dependencies** | P1-T01, P1-T03 |
| **Tests** | Unit: CRUD, email uniqueness, CSV parsing (valid/invalid rows), deactivation, role assignment |
| **Size** | L (3-6hr) |
| **Parallel** | Yes (with P1-T02) |

### P1-T05: Workflow CRUD Service with Versioning

| Field | Value |
|-------|-------|
| **ID** | P1-T05 |
| **Title** | Workflow service with version control |
| **Scope** | `workflow.repository.ts`: findAll, findById, create, update, delete (only if no teams assigned). `workflow.service.ts`: CRUD with version increment on every update. Template instantiation (Simple: 1 step direct manager; Standard: 2 steps manager + HR; Enterprise: 3 steps). Clone workflow. Validate step configuration (approverType, timeoutHours > 0, valid escalationMode). Snapshot method: returns a frozen copy for embedding in leave requests (BR-102). |
| **Files** | `apps/api/src/modules/workflow/workflow.repository.ts`, `apps/api/src/modules/workflow/workflow.service.ts`, `apps/api/src/modules/workflow/workflow.types.ts`, `apps/api/src/modules/workflow/workflow.test.ts` |
| **Dependencies** | P1-T01 |
| **Tests** | Unit: CRUD, version increment, template instantiation, clone, snapshot immutability, delete guard |
| **Size** | L (3-6hr) |
| **Parallel** | Yes (with P1-T02, P1-T03) |

### P1-T06: Balance Ledger Service (Append-Only)

| Field | Value |
|-------|-------|
| **ID** | P1-T06 |
| **Title** | Balance ledger service (append-only, SUM-based) |
| **Scope** | `balance.repository.ts`: appendEntry (insert only, never update), getBalance (aggregate SUM by tenantId + employeeId + leaveTypeId where effectiveDate <= today), getHistory (paginated ledger entries). `balance.service.ts`: allocateInitial (on employee creation), deduct (on approval), restore (on cancellation), adjust (manual HR correction), accrue (monthly). Every method creates a new ledger entry with signed amount. **Critical**: getBalance must NOT be cached -- always compute fresh to prevent over-approval race conditions. |
| **Files** | `apps/api/src/modules/balance/balance.repository.ts`, `apps/api/src/modules/balance/balance.service.ts`, `apps/api/src/modules/balance/balance.types.ts`, `apps/api/src/modules/balance/balance.test.ts` |
| **Dependencies** | P1-T01 |
| **Tests** | Unit: allocate + check balance, deduct + check, restore after cancellation, concurrent deduction race condition, history pagination |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P1-T02 through P1-T05) |

### P1-T07: Leave Request Service and FSM

| Field | Value |
|-------|-------|
| **ID** | P1-T07 |
| **Title** | Leave request service with FSM state machine |
| **Scope** | `leave-request.repository.ts`: findAll (filtered by status, employee, team, date range), findById, create, updateStatus. `leave-request.service.ts`: create request (validate dates, check balance via P1-T06, check overlaps, calculate working days excluding weekends + holidays, snapshot workflow, set initial state `pending_validation`). Cancel request (only if pending or approved-future). Query requests by employee, by team, by status. `approval-engine.fsm.ts`: explicit state transition table mapping (currentState, action) -> nextState. Validate transition legality. `approval-engine.service.ts`: submitRequest (validate -> auto-approve or route to step 0), processAction (approve/reject at current step, advance or finalize), processEscalation. Every state change writes audit log entry and emits notification event. |
| **Files** | `apps/api/src/modules/leave-request/leave-request.repository.ts`, `apps/api/src/modules/leave-request/leave-request.service.ts`, `apps/api/src/modules/leave-request/leave-request.types.ts`, `apps/api/src/modules/leave-request/leave-request.test.ts`, `apps/api/src/modules/approval-engine/approval-engine.fsm.ts`, `apps/api/src/modules/approval-engine/approval-engine.service.ts`, `apps/api/src/modules/approval-engine/approval-engine.types.ts`, `apps/api/src/modules/approval-engine/approval-engine.test.ts` |
| **Dependencies** | P1-T01, P1-T05, P1-T06 |
| **Tests** | Unit: full FSM transition table, single-step approval, multi-step approval, rejection at any step, cancellation, auto-approval, escalation, invalid transitions rejected. Integration: end-to-end approval flow with real DB |
| **Size** | L (3-6hr) |
| **Parallel** | No (depends on P1-T05, P1-T06) |

### P1-T08: Audit Trail Service

| Field | Value |
|-------|-------|
| **ID** | P1-T08 |
| **Title** | Immutable audit log service |
| **Scope** | `audit.repository.ts`: insert only (no update, no delete methods). Query by tenant + timestamp range, by entity type + entity ID. `audit.service.ts`: log method that accepts actor, action, entityType, entityId, metadata. Called by leave-request, approval-engine, workflow, employee, team services after state changes. Must be called in the same service method as the state change (not async/queued). |
| **Files** | `apps/api/src/modules/audit/audit.repository.ts`, `apps/api/src/modules/audit/audit.service.ts`, `apps/api/src/modules/audit/audit.types.ts`, `apps/api/src/modules/audit/audit.test.ts` |
| **Dependencies** | P1-T01 |
| **Tests** | Unit: insert succeeds, no update method exists, query by entity, query by time range, GDPR pseudonymization helper |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P1-T02 through P1-T06) |

### P1-T09: Holiday Service

| Field | Value |
|-------|-------|
| **ID** | P1-T09 |
| **Title** | Holiday calendar service |
| **Scope** | `holiday.repository.ts`: find by country + year, upsert custom holidays per tenant. `holiday.service.ts`: fetch public holidays from Nager.Date API (or seed from local JSON for 50 countries), merge with tenant custom holidays, calculate working days between two dates (excluding weekends per tenant work week config + holidays). This service is called by leave-request validation. |
| **Files** | `apps/api/src/modules/holiday/holiday.repository.ts`, `apps/api/src/modules/holiday/holiday.service.ts`, `apps/api/src/modules/holiday/holiday.types.ts`, `apps/api/src/modules/holiday/holiday.test.ts` |
| **Dependencies** | P1-T01 |
| **Tests** | Unit: working days calculation (weekdays only, with holidays, with custom work week), holiday seeding, custom holiday CRUD |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P1-T02 through P1-T08) |

### P1-T10: Tenant Service

| Field | Value |
|-------|-------|
| **ID** | P1-T10 |
| **Title** | Tenant service and repository |
| **Scope** | `tenant.repository.ts`: findById, create, update. `tenant.service.ts`: create tenant (on registration), update settings (timezone, work week, coverage threshold, country), get current plan and limits. Plan limits (planLimits object) are pre-computed on plan change. |
| **Files** | `apps/api/src/modules/tenant/tenant.repository.ts`, `apps/api/src/modules/tenant/tenant.service.ts`, `apps/api/src/modules/tenant/tenant.types.ts`, `apps/api/src/modules/tenant/tenant.test.ts` |
| **Dependencies** | P1-T01 |
| **Tests** | Unit: create, update settings, plan limits enforcement |
| **Size** | S (<1hr) |
| **Parallel** | Yes (with P1-T02 through P1-T09) |

### P1-T11: Notification Service (Core)

| Field | Value |
|-------|-------|
| **ID** | P1-T11 |
| **Title** | Notification router service |
| **Scope** | `notification.repository.ts`: create, markRead, findByEmployee (paginated). `notification.service.ts`: route notification to correct channel based on employee preference and platform connection. Enqueue BullMQ jobs for async delivery. Track delivery status. In-app notification creation. Does NOT implement the actual delivery (that is in workers, Phase 5) -- only enqueues. |
| **Files** | `apps/api/src/modules/notification/notification.repository.ts`, `apps/api/src/modules/notification/notification.service.ts`, `apps/api/src/modules/notification/notification.types.ts`, `apps/api/src/modules/notification/notification.test.ts` |
| **Dependencies** | P1-T01, P0-T07 |
| **Tests** | Unit: enqueue job for correct channel, in-app notification created, mark-read works |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P1-T02 through P1-T10) |

### P1-T12: Onboarding Service

| Field | Value |
|-------|-------|
| **ID** | P1-T12 |
| **Title** | Onboarding wizard service |
| **Scope** | `onboarding.repository.ts`: get/update progress per tenant. `onboarding.service.ts`: initialize on tenant creation (6 steps, all pending). Save each step (idempotent). Mark complete (steps 4-6 skippable). Uses tenant, leave-type, workflow, team, employee, holiday services to execute step saves. |
| **Files** | `apps/api/src/modules/onboarding/onboarding.repository.ts`, `apps/api/src/modules/onboarding/onboarding.service.ts`, `apps/api/src/modules/onboarding/onboarding.test.ts` |
| **Dependencies** | P1-T02, P1-T03, P1-T04, P1-T05, P1-T09, P1-T10 |
| **Tests** | Unit: initialize, save each step, skip steps, complete, resume interrupted wizard |
| **Size** | M (1-3hr) |
| **Parallel** | No (depends on most P1 services) |

---

## 5. Phase 2: API Layer

**Goal:** Wire all services to Fastify routes. Implement request validation, response envelope, error middleware, and pagination.

### P2-T01: Error Handler and Response Envelope

| Field | Value |
|-------|-------|
| **ID** | P2-T01 |
| **Title** | Global error handler and response envelope plugin |
| **Scope** | `plugins/error-handler.plugin.ts`: catch all errors, format as API envelope `{ success, data, error, meta }`. Map Zod validation errors to 422 with details array. Map known business errors (not found, conflict, forbidden) to correct HTTP status. Never leak stack traces. `middleware/request-context.ts`: attach request ID for tracing. |
| **Files** | `apps/api/src/plugins/error-handler.plugin.ts`, `apps/api/src/middleware/request-context.ts` |
| **Dependencies** | P0-T05 |
| **Tests** | Unit: each error type maps to correct status + envelope format; unknown errors return 500 |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (first P2 task, can start immediately) |

### P2-T02: Rate Limiter Plugin

| Field | Value |
|-------|-------|
| **ID** | P2-T02 |
| **Title** | Redis-based rate limiting plugin |
| **Scope** | `plugins/rate-limiter.plugin.ts`: token bucket per tenant using `@fastify/rate-limit` with Redis store. Limits per plan tier (Free: 60/min, Team: 300/min, Business: 600/min). Separate limit for bot webhooks (1000/min). Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`. |
| **Files** | `apps/api/src/plugins/rate-limiter.plugin.ts` |
| **Dependencies** | P0-T07, P1-T10 |
| **Tests** | Integration: exceed limit returns 429 with correct headers; different plans have different limits |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P2-T01) |

### P2-T03: Auth Routes

| Field | Value |
|-------|-------|
| **ID** | P2-T03 |
| **Title** | Auth module routes |
| **Scope** | `POST /auth/register` (create tenant + admin employee + Firebase user + set custom claims), `POST /auth/verify-email`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout`. Zod validation on all request bodies. Registration creates tenant, employee, fires onboarding init. |
| **Files** | `apps/api/src/modules/auth/auth.routes.ts`, `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.schema.ts`, `apps/api/src/modules/auth/auth.test.ts` |
| **Dependencies** | P2-T01, P1-T10, P1-T04, P1-T12, P0-T08 |
| **Tests** | Integration: register flow, login, me endpoint, logout; validation errors |
| **Size** | L (3-6hr) |
| **Parallel** | No (depends on P2-T01) |

### P2-T04: Onboarding Routes

| Field | Value |
|-------|-------|
| **ID** | P2-T04 |
| **Title** | Onboarding wizard routes |
| **Scope** | `GET /onboarding/progress`, `PUT /onboarding/steps/:stepNumber` (1-6), `POST /onboarding/complete`. Each step validates its specific payload via Zod. Only `company_admin` role. Idempotent saves. |
| **Files** | `apps/api/src/modules/onboarding/onboarding.routes.ts`, `apps/api/src/modules/onboarding/onboarding.schema.ts`, `apps/api/src/modules/onboarding/onboarding.test.ts` |
| **Dependencies** | P2-T01, P2-T03, P1-T12 |
| **Tests** | Integration: complete wizard flow, resume interrupted, skip steps, role guard |
| **Size** | M (1-3hr) |
| **Parallel** | No (depends on P2-T03) |

### P2-T05: CRUD Routes (Tenant, Leave Type, Team, Employee, Workflow)

| Field | Value |
|-------|-------|
| **ID** | P2-T05 |
| **Title** | CRUD routes for configuration entities |
| **Scope** | Wire routes for all 5 config modules. Each module: list (paginated + filtered + sorted), get by ID, create, update, delete. Zod validation on all bodies. Role guards per the authorization matrix. Employee module includes `POST /employees/import` for CSV upload (multipart form). |
| **Files** | `apps/api/src/modules/tenant/tenant.routes.ts`, `apps/api/src/modules/tenant/tenant.schema.ts`, `apps/api/src/modules/leave-type/leave-type.routes.ts`, `apps/api/src/modules/leave-type/leave-type.schema.ts`, `apps/api/src/modules/team/team.routes.ts`, `apps/api/src/modules/team/team.schema.ts`, `apps/api/src/modules/employee/employee.routes.ts`, `apps/api/src/modules/employee/employee.schema.ts`, `apps/api/src/modules/workflow/workflow.routes.ts`, `apps/api/src/modules/workflow/workflow.schema.ts` |
| **Dependencies** | P2-T01, P1-T02, P1-T03, P1-T04, P1-T05, P1-T10 |
| **Tests** | Integration per module: list, create, read, update, delete, pagination, filtering, role guards, validation errors |
| **Size** | L (3-6hr) |
| **Parallel** | Yes (with P2-T03, P2-T04) |

### P2-T06: Leave Request Routes

| Field | Value |
|-------|-------|
| **ID** | P2-T06 |
| **Title** | Leave request lifecycle routes |
| **Scope** | `POST /leave-requests` (create), `GET /leave-requests` (list with filters: status, employeeId, teamId, date range), `GET /leave-requests/:id`, `POST /leave-requests/:id/cancel`, `POST /leave-requests/validate` (dry-run validation without creating). |
| **Files** | `apps/api/src/modules/leave-request/leave-request.routes.ts`, `apps/api/src/modules/leave-request/leave-request.schema.ts` |
| **Dependencies** | P2-T01, P1-T07 |
| **Tests** | Integration: create request, validate endpoint, list with filters, cancel, role-based access |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P2-T05) |

### P2-T07: Approval Routes

| Field | Value |
|-------|-------|
| **ID** | P2-T07 |
| **Title** | Approval action routes |
| **Scope** | `POST /approvals/:id/approve`, `POST /approvals/:id/reject` (mandatory reason, min 10 chars), `GET /approvals/pending` (for current user as approver), `GET /approvals/pending/count`. |
| **Files** | `apps/api/src/modules/leave-request/leave-request.routes.ts` (approval routes added here or separate file) |
| **Dependencies** | P2-T06, P1-T07 |
| **Tests** | Integration: approve single-step, approve multi-step, reject with reason, reject without reason fails, pending list for approver |
| **Size** | M (1-3hr) |
| **Parallel** | No (depends on P2-T06) |

### P2-T08: Balance Routes

| Field | Value |
|-------|-------|
| **ID** | P2-T08 |
| **Title** | Balance query routes |
| **Scope** | `GET /balances/employees/:employeeId` (all balances for employee), `GET /balances/employees/:employeeId/leave-types/:leaveTypeId` (specific type), `GET /balances/employees/:employeeId/history` (ledger entries, paginated). `POST /balances/adjust` (HR manual adjustment). |
| **Files** | `apps/api/src/modules/balance/balance.routes.ts`, `apps/api/src/modules/balance/balance.schema.ts` |
| **Dependencies** | P2-T01, P1-T06 |
| **Tests** | Integration: get balance after allocation, after deduction, history pagination, manual adjustment |
| **Size** | S (<1hr) |
| **Parallel** | Yes (with P2-T05, P2-T06) |

### P2-T09: Dashboard Aggregate Route

| Field | Value |
|-------|-------|
| **ID** | P2-T09 |
| **Title** | Dashboard summary aggregate endpoint |
| **Scope** | `GET /dashboard/summary`: return all 9 dashboard widgets in a single response. Uses MongoDB aggregation pipelines and `$lookup` for activity feed and needs-attention widgets. Each widget has a `cacheTtlSeconds` hint for the client. This is the most complex query in the API -- use pipeline stages to compute outToday, pendingApprovals, utilizationRate, upcomingWeek, absenceHeatmap, resolutionRate, activityFeed, needsAttention, teamBalances. `dashboard.service.ts` with separate methods per widget for testability. |
| **Files** | `apps/api/src/modules/dashboard/dashboard.routes.ts`, `apps/api/src/modules/dashboard/dashboard.service.ts`, `apps/api/src/modules/dashboard/dashboard.schema.ts`, `apps/api/src/modules/dashboard/dashboard.test.ts` |
| **Dependencies** | P2-T01, P1-T07, P1-T06, P1-T08 |
| **Tests** | Integration: each widget returns correct data shape; empty tenant returns zero values; performance test (< 3s with 1000 requests) |
| **Size** | L (3-6hr) |
| **Parallel** | No (depends on most P1 services) |

### P2-T10: Calendar and Audit Routes

| Field | Value |
|-------|-------|
| **ID** | P2-T10 |
| **Title** | Calendar absences and audit trail routes |
| **Scope** | `GET /calendar/absences` (date range, team filter, status filter -- swim-lane data), `GET /calendar/coverage` (per-day coverage percentage). `GET /audit-logs` (paginated, filtered by entityType + entityId + dateRange). `GET /holidays` (by country + year). |
| **Files** | `apps/api/src/modules/calendar/calendar.routes.ts`, `apps/api/src/modules/calendar/calendar.service.ts`, `apps/api/src/modules/calendar/calendar.schema.ts`, `apps/api/src/modules/audit/audit.routes.ts`, `apps/api/src/modules/audit/audit.schema.ts`, `apps/api/src/modules/holiday/holiday.routes.ts`, `apps/api/src/modules/holiday/holiday.schema.ts` |
| **Dependencies** | P2-T01, P1-T07, P1-T08, P1-T09 |
| **Tests** | Integration: calendar with overlapping absences, coverage calculation, audit log pagination and filtering, holiday list |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P2-T06 through P2-T09) |

### P2-T11: Notification Routes

| Field | Value |
|-------|-------|
| **ID** | P2-T11 |
| **Title** | In-app notification routes |
| **Scope** | `GET /notifications` (paginated, filtered by isRead), `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `GET /notifications/unread-count`. |
| **Files** | `apps/api/src/modules/notification/notification.routes.ts`, `apps/api/src/modules/notification/notification.schema.ts` |
| **Dependencies** | P2-T01, P1-T11 |
| **Tests** | Integration: list, mark read, mark all read, unread count |
| **Size** | S (<1hr) |
| **Parallel** | Yes (with all P2 route tasks) |

### P2-T12: Delegation Routes

| Field | Value |
|-------|-------|
| **ID** | P2-T12 |
| **Title** | Approval delegation routes |
| **Scope** | `POST /delegations` (create delegation: delegator, delegate, start/end dates), `GET /delegations/active` (current user's active delegations), `DELETE /delegations/:id`. Delegation check integrated into approval engine: when routing to approver, check if they have an active delegation and redirect. |
| **Files** | `apps/api/src/modules/leave-request/delegation.routes.ts`, `apps/api/src/modules/leave-request/delegation.service.ts`, `apps/api/src/modules/leave-request/delegation.test.ts` |
| **Dependencies** | P2-T07, P1-T07 |
| **Tests** | Integration: create delegation, approve routes to delegate, delegation expires, overlap prevention |
| **Size** | M (1-3hr) |
| **Parallel** | No (depends on P2-T07) |

---

## 6. Phase 3: Bot Integration

**Goal:** Implement Slack and Teams bots with full command support and interactive approvals.

### P3-T01: Bot Adapter Interface

| Field | Value |
|-------|-------|
| **ID** | P3-T01 |
| **Title** | Platform-agnostic bot adapter interface |
| **Scope** | `bot-adapter.interface.ts`: define `BotAdapter` interface with methods: `sendLeaveRequestForm`, `sendApprovalCard`, `updateApprovalCard`, `sendDirectMessage`, `postToChannel`, `resolveUser`. `bot-adapter.types.ts`: define platform-agnostic message types (`LeaveFormContext`, `LeaveRequestSummary`, `NotificationPayload`, `MessageReference`, `CardUpdate`, `ChannelReference`). |
| **Files** | `apps/api/src/modules/bot-adapter/bot-adapter.interface.ts`, `apps/api/src/modules/bot-adapter/bot-adapter.types.ts`, `apps/api/src/modules/bot-adapter/index.ts` |
| **Dependencies** | P0-T02 |
| **Tests** | Type-level only (interface compliance checked at compile time) |
| **Size** | S (<1hr) |
| **Parallel** | Yes (can start at any time after P0) |

### P3-T02: Bot Message Templates Package

| Field | Value |
|-------|-------|
| **ID** | P3-T02 |
| **Title** | Bot message templates (Block Kit + Adaptive Cards) |
| **Scope** | `packages/bot-messages`: 6 message templates (approval request, approved notification, rejected notification, stale reminder, balance check, team announcement). Each template has a platform-agnostic data interface and two renderers: `slack/block-kit.renderer.ts` (Block Kit JSON), `teams/adaptive-card.renderer.ts` (Adaptive Card JSON). Templates match the designs in `02-design-experimental.md` bot section. |
| **Files** | `packages/bot-messages/src/templates/*.ts`, `packages/bot-messages/src/slack/block-kit.renderer.ts`, `packages/bot-messages/src/teams/adaptive-card.renderer.ts`, `packages/bot-messages/src/types.ts`, `packages/bot-messages/package.json`, `packages/bot-messages/tsconfig.json` |
| **Dependencies** | P3-T01 |
| **Tests** | Unit: each template renders valid Block Kit JSON (validate against Slack schema), each renders valid Adaptive Card JSON |
| **Size** | L (3-6hr) |
| **Parallel** | Yes (with P3-T03, P3-T05) |

### P3-T03: Slack Bot Adapter

| Field | Value |
|-------|-------|
| **ID** | P3-T03 |
| **Title** | Slack adapter implementing BotAdapter |
| **Scope** | `bot-slack.adapter.ts`: implements `BotAdapter` using `@slack/bolt`. `sendLeaveRequestForm`: opens Block Kit modal via `views.open`. `sendApprovalCard`: `chat.postMessage` with Block Kit card. `updateApprovalCard`: `chat.update`. `resolveUser`: lookup `bot_mappings` by Slack user ID. Store `platformMessageId` (Slack `ts`) in notifications collection for message updates. |
| **Files** | `apps/api/src/modules/bot-slack/bot-slack.adapter.ts`, `apps/api/src/modules/bot-slack/bot-slack.test.ts` |
| **Dependencies** | P3-T01, P3-T02 |
| **Tests** | Unit with mocked Slack client: form opens, approval card sent, card updated, user resolved |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P3-T05) |

### P3-T04: Slack Command Handlers

| Field | Value |
|-------|-------|
| **ID** | P3-T04 |
| **Title** | Slack slash command and interaction handlers |
| **Scope** | `bot-slack.commands.ts`: `/leave` (opens leave request modal), `/leave balance` (returns balance Block Kit message), `/leave status` (returns latest request status), `/leave cancel` (cancel pending request), `/leave help`. `bot-slack.interactions.ts`: handle modal submission (create leave request via service), handle approve/reject button clicks (call approval engine), handle cancel confirmation. `bot-slack.plugin.ts`: register Slack Bolt app as Fastify plugin, handle webhook verification. |
| **Files** | `apps/api/src/modules/bot-slack/bot-slack.commands.ts`, `apps/api/src/modules/bot-slack/bot-slack.interactions.ts`, `apps/api/src/modules/bot-slack/bot-slack.plugin.ts` |
| **Dependencies** | P3-T03, P1-T07, P1-T06 |
| **Tests** | Integration: slash command creates request, button click approves, balance check returns correct data |
| **Size** | L (3-6hr) |
| **Parallel** | No (depends on P3-T03) |

### P3-T05: Teams Bot Adapter

| Field | Value |
|-------|-------|
| **ID** | P3-T05 |
| **Title** | Teams adapter implementing BotAdapter |
| **Scope** | `bot-teams.adapter.ts`: implements `BotAdapter` using `botbuilder`. `sendLeaveRequestForm`: send Adaptive Card with form inputs. `sendApprovalCard`: proactive message with Adaptive Card. `updateApprovalCard`: `updateActivity`. `resolveUser`: lookup `bot_mappings` by Teams user ID. Store `ConversationReference` for proactive messaging. |
| **Files** | `apps/api/src/modules/bot-teams/bot-teams.adapter.ts`, `apps/api/src/modules/bot-teams/bot-teams.test.ts` |
| **Dependencies** | P3-T01, P3-T02 |
| **Tests** | Unit with mocked Teams client: card sent, card updated, user resolved |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P3-T03) |

### P3-T06: Teams Command Handlers

| Field | Value |
|-------|-------|
| **ID** | P3-T06 |
| **Title** | Teams command and interaction handlers |
| **Scope** | `bot-teams.commands.ts`: `/leave` (sends Adaptive Card form), `/leave balance`, `/leave status`. `bot-teams.interactions.ts`: handle `Action.Execute` for approve/reject, form submission. `bot-teams.plugin.ts`: register Bot Framework adapter as Fastify plugin, handle webhook routing. |
| **Files** | `apps/api/src/modules/bot-teams/bot-teams.commands.ts`, `apps/api/src/modules/bot-teams/bot-teams.interactions.ts`, `apps/api/src/modules/bot-teams/bot-teams.plugin.ts` |
| **Dependencies** | P3-T05, P1-T07, P1-T06 |
| **Tests** | Integration: command creates request, Action.Execute approves, balance returns data |
| **Size** | L (3-6hr) |
| **Parallel** | No (depends on P3-T05) |

### P3-T07: Bot Mapping Service

| Field | Value |
|-------|-------|
| **ID** | P3-T07 |
| **Title** | Platform user to employee mapping |
| **Scope** | Service to create/query `bot_mappings`. On Slack/Teams app installation: sync workspace members to employee records. Lookup by platformUserId + platform to resolve tenantId and employeeId on every bot interaction. This is the entry point for bot events into the tenant context. |
| **Files** | `apps/api/src/modules/bot-adapter/bot-mapping.service.ts`, `apps/api/src/modules/bot-adapter/bot-mapping.test.ts` |
| **Dependencies** | P1-T04, P0-T06 |
| **Tests** | Unit: create mapping, resolve user, handle unmapped user gracefully |
| **Size** | S (<1hr) |
| **Parallel** | Yes (with P3-T02 through P3-T06) |

### P3-T08: Slack/Teams OAuth Installation Flow

| Field | Value |
|-------|-------|
| **ID** | P3-T08 |
| **Title** | Bot installation OAuth flows |
| **Scope** | Slack OAuth: `GET /slack/install` (redirect to Slack OAuth), `GET /slack/oauth/callback` (exchange code for tokens, store in tenant, create bot mappings for workspace members). Teams OAuth: `GET /teams/install`, `GET /teams/oauth/callback`. Store OAuth tokens in `oauth_tokens` collection (encrypted). Update tenant `slackConnected`/`teamsConnected` flags. |
| **Files** | `apps/api/src/modules/bot-slack/bot-slack.oauth.ts`, `apps/api/src/modules/bot-teams/bot-teams.oauth.ts` |
| **Dependencies** | P3-T03, P3-T05, P3-T07, P1-T10 |
| **Tests** | Integration with mocked OAuth: callback stores tokens, tenant flags updated, mappings created |
| **Size** | M (1-3hr) |
| **Parallel** | No (depends on adapters and mapping service) |

---

## 7. Phase 4: Web Application

**Goal:** Build all Next.js pages using the design system from `02-design-experimental.md`.

### P4-T01: Auth Pages (Login, Register, Verify Email)

| Field | Value |
|-------|-------|
| **ID** | P4-T01 |
| **Title** | Authentication pages |
| **Scope** | `(auth)/login/page.tsx`: email + password form, Firebase Auth sign-in, redirect to dashboard. `(auth)/register/page.tsx`: company name, admin email, admin name, password form. Calls `POST /auth/register`. `(auth)/verify-email/page.tsx`: token verification. Dark glassmorphic styling. Error states. Loading states. |
| **Files** | `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/register/page.tsx`, `apps/web/src/app/(auth)/verify-email/page.tsx`, `apps/web/src/hooks/use-auth.ts`, `apps/web/src/stores/auth.store.ts` |
| **Dependencies** | P0-T09, P2-T03 |
| **Tests** | E2E: register flow, login flow, invalid credentials, email verification |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (first P4 task) |

### P4-T02: App Shell (Sidebar, Layout, Navigation)

| Field | Value |
|-------|-------|
| **ID** | P4-T02 |
| **Title** | Dashboard layout with sidebar navigation |
| **Scope** | `(dashboard)/layout.tsx`: app shell with sidebar. `components/layout/sidebar.tsx`: dark glass sidebar with Logo, NavItems (Dashboard, Calendar, Requests, Approvals, Workflows, Employees, Teams, Leave Types, Balances, Audit, Billing, Settings), UserProfile at bottom. Active state with indigo highlight. Badge counts for pending approvals. `components/layout/page-header.tsx`: title, subtitle, search bar, notification bell. Role-based nav item visibility. |
| **Files** | `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/components/layout/app-shell.tsx`, `apps/web/src/components/layout/sidebar.tsx`, `apps/web/src/components/layout/nav-item.tsx`, `apps/web/src/components/layout/page-header.tsx`, `apps/web/src/components/layout/user-profile.tsx` |
| **Dependencies** | P0-T09, P4-T01 |
| **Tests** | Component: sidebar renders all items, active state works, role filtering works |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P4-T01) |

### P4-T03: Shared UI Components

| Field | Value |
|-------|-------|
| **ID** | P4-T03 |
| **Title** | Reusable shared components library |
| **Scope** | Build all shared components from the component hierarchy: `glass-card.tsx` (base container with backdrop-blur, hover states), `stat-card.tsx` (icon, number, label, trend), `balance-ring.tsx` (SVG radial chart), `journey-timeline.tsx` + `journey-step.tsx` + `pulse-dot.tsx` + `shimmer-badge.tsx` (package-tracking approval journey), `absence-bar.tsx` (approved/pending/rejected variants), `heatmap-cell.tsx`, `approval-donut.tsx` (conic gradient), `activity-item.tsx`, `request-row.tsx`, `team-balance-card.tsx`, `workflow-node.tsx` + `workflow-connector.tsx`, `progress-ring.tsx`, `empty-state.tsx`, `loading-state.tsx` (skeleton), `error-state.tsx`. |
| **Files** | `apps/web/src/components/shared/*.tsx` (18 component files) |
| **Dependencies** | P0-T09 |
| **Tests** | Storybook-style component tests: each component renders with sample data, handles empty/error states |
| **Size** | L (3-6hr) |
| **Parallel** | Yes (with P4-T01, P4-T02) |

### P4-T04: Onboarding Wizard

| Field | Value |
|-------|-------|
| **ID** | P4-T04 |
| **Title** | 6-step onboarding wizard |
| **Scope** | `(onboarding)/onboarding/page.tsx`: 3/9 progress sidebar + 9/9 content. `progress-sidebar.tsx`: circular progress ring (SVG gradient stroke), step list with completed/active/future states, time estimate. 6 step content panels: company profile, leave types, workflow (template selection with mini flow preview), teams, employees (manual + CSV upload), holidays (country selector). Back/Continue/Skip navigation. Calls onboarding API endpoints. |
| **Files** | `apps/web/src/app/(onboarding)/onboarding/page.tsx`, `apps/web/src/components/onboarding/progress-sidebar.tsx`, `apps/web/src/components/onboarding/step-content.tsx`, `apps/web/src/components/onboarding/wizard-nav.tsx` |
| **Dependencies** | P4-T01, P4-T03, P2-T04 |
| **Tests** | E2E: complete wizard flow, skip optional steps, resume interrupted |
| **Size** | L (3-6hr) |
| **Parallel** | No (depends on P4-T03) |

### P4-T05: HR Dashboard (Bento Grid)

| Field | Value |
|-------|-------|
| **ID** | P4-T05 |
| **Title** | HR dashboard home with bento grid |
| **Scope** | `(dashboard)/dashboard/page.tsx`: bento grid layout. `kpi-grid.tsx` (4 stat cards: out today, pending approvals, utilization rate, upcoming week). `absence-heatmap.tsx` (GitHub-contribution-style monthly grid). `approval-donut.tsx` (conic gradient ring). `activity-feed.tsx` (timeline with color-coded dots). `needs-attention.tsx` (stale requests with urgency bars + quick actions). `team-balances.tsx` (mini bar charts per team). Fetch from `GET /dashboard/summary`. Loading skeletons. Empty state for new companies. |
| **Files** | `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/web/src/components/dashboard/kpi-grid.tsx`, `apps/web/src/components/dashboard/absence-heatmap.tsx`, `apps/web/src/components/dashboard/activity-feed.tsx`, `apps/web/src/components/dashboard/needs-attention.tsx`, `apps/web/src/components/dashboard/team-balances.tsx` |
| **Dependencies** | P4-T02, P4-T03, P2-T09 |
| **Tests** | Component: each widget renders with mock data; loading state; empty state |
| **Size** | L (3-6hr) |
| **Parallel** | No (depends on shared components and layout) |

### P4-T06: Absence Calendar (Swim-Lane)

| Field | Value |
|-------|-------|
| **ID** | P4-T06 |
| **Title** | Absence calendar with swim-lane Gantt view |
| **Scope** | `(dashboard)/calendar/page.tsx`: swim-lane grid. `swim-lane-grid.tsx`: teams as collapsible row groups, employees as individual lanes. `employee-lane.tsx`: absence bars colored by leave type (solid=approved, dashed=pending, strikethrough=rejected). Today column highlighted. `coverage-warning-row.tsx`: alerts below threshold. View toggles: Month/Week. Filter by team/search. `calendar-legend.tsx`. Fetch from `GET /calendar/absences`. `calendar-filter.store.ts` for filter state. |
| **Files** | `apps/web/src/app/(dashboard)/calendar/page.tsx`, `apps/web/src/components/calendar/swim-lane-grid.tsx`, `apps/web/src/components/calendar/team-group.tsx`, `apps/web/src/components/calendar/employee-lane.tsx`, `apps/web/src/components/calendar/coverage-warning-row.tsx`, `apps/web/src/components/calendar/calendar-legend.tsx`, `apps/web/src/stores/calendar-filter.store.ts` |
| **Dependencies** | P4-T02, P4-T03, P2-T10 |
| **Tests** | Component: renders absences correctly, collapse/expand teams, coverage warning appears |
| **Size** | L (3-6hr) |
| **Parallel** | Yes (with P4-T05) |

### P4-T07: Leave Request Detail Page

| Field | Value |
|-------|-------|
| **ID** | P4-T07 |
| **Title** | Leave request detail with approval journey |
| **Scope** | `(dashboard)/requests/[id]/page.tsx`: request header (employee, dates, type, working days), impact grid (balance after, team impact, holiday overlap), **approval journey timeline** (package-tracking style: completed=green, active=pulsing indigo with approve/reject buttons, future=dimmed), audit trail chronological log. Approve/reject actions for managers. Cancel button for employees. |
| **Files** | `apps/web/src/app/(dashboard)/requests/[id]/page.tsx` |
| **Dependencies** | P4-T03, P2-T06, P2-T07 |
| **Tests** | Component: renders all states (pending, approved, rejected, cancelled), approve/reject actions work |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P4-T05, P4-T06) |

### P4-T08: Workflow Builder

| Field | Value |
|-------|-------|
| **ID** | P4-T08 |
| **Title** | Workflow builder (form + live preview) |
| **Scope** | `(dashboard)/workflows/[id]/page.tsx`: 2/3 form + 1/3 live preview split. `workflow-step-list.tsx`: stacked form cards with connectors. `approval-step-card.tsx`: approver type selector, timeout hours, escalation mode, delegation toggle, move up/down, delete. `trigger-node.tsx` + `end-node.tsx`. `live-preview.tsx` + `mini-node-diagram.tsx`: visual preview that updates in real-time. `template-selector.tsx`: 4 templates (Simple, Standard, Enterprise, Custom). `workflow-builder.store.ts`: Zustand store for step management. Assigned teams list. |
| **Files** | `apps/web/src/app/(dashboard)/workflows/[id]/page.tsx`, `apps/web/src/app/(dashboard)/workflows/page.tsx`, `apps/web/src/components/workflow/workflow-step-list.tsx`, `apps/web/src/components/workflow/approval-step-card.tsx`, `apps/web/src/components/workflow/trigger-node.tsx`, `apps/web/src/components/workflow/end-node.tsx`, `apps/web/src/components/workflow/live-preview.tsx`, `apps/web/src/components/workflow/mini-node-diagram.tsx`, `apps/web/src/components/workflow/template-selector.tsx`, `apps/web/src/stores/workflow-builder.store.ts` |
| **Dependencies** | P4-T02, P4-T03, P2-T05 |
| **Tests** | Component: add/remove/reorder steps, template selection, live preview updates, save workflow |
| **Size** | L (3-6hr) |
| **Parallel** | Yes (with P4-T05 through P4-T07) |

### P4-T09: Employee Self-Service Page

| Field | Value |
|-------|-------|
| **ID** | P4-T09 |
| **Title** | Employee self-service portal |
| **Scope** | `(dashboard)/self-service/page.tsx`: bento grid. Balance rings (SVG radial per leave type, low balance amber). Active request tracker (mini journey timeline). Request history (chronological list with colored type indicators). Team calendar mini (who is out this week). Upcoming holidays strip. "Request Leave" button opens request creation flow. |
| **Files** | `apps/web/src/app/(dashboard)/self-service/page.tsx` |
| **Dependencies** | P4-T03, P2-T06, P2-T08 |
| **Tests** | Component: balance rings render correctly, request history displays, request creation works |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P4-T05 through P4-T08) |

### P4-T10: Manager Team View

| Field | Value |
|-------|-------|
| **ID** | P4-T10 |
| **Title** | Manager team view page |
| **Scope** | `(manager)/my-team/page.tsx`: team members list with upcoming absences, pending approvals for this manager (with approve/reject actions), team calendar mini-view, balance summary per team member. Only visible to manager and above roles. |
| **Files** | `apps/web/src/app/(manager)/my-team/page.tsx` |
| **Dependencies** | P4-T03, P2-T07, P2-T10 |
| **Tests** | Component: renders team members, pending approvals with actions, role guard |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P4-T05 through P4-T09) |

### P4-T11: Pending Approvals Page

| Field | Value |
|-------|-------|
| **ID** | P4-T11 |
| **Title** | Pending approvals management page |
| **Scope** | `(dashboard)/approvals/page.tsx`: table of all pending approvals (HR view) sorted by age. Stale requests (>48h) highlighted in rose. Quick approve/reject actions. Filter by team, age. Batch actions for HR. |
| **Files** | `apps/web/src/app/(dashboard)/approvals/page.tsx` |
| **Dependencies** | P4-T03, P2-T07 |
| **Tests** | Component: renders pending list, stale highlighting, approve/reject actions |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P4-T05 through P4-T10) |

### P4-T12: Configuration Pages (Leave Types, Teams, Employees)

| Field | Value |
|-------|-------|
| **ID** | P4-T12 |
| **Title** | CRUD management pages |
| **Scope** | `leave-types/page.tsx`: list + create/edit leave types (name, color, paid/unpaid, entitlement, accrual rules). `teams/page.tsx`: list + create/edit teams (name, manager, workflow assignment). `employees/page.tsx`: list + create/edit employees (name, email, role, team), CSV import with progress + error report. All pages: glass card table, search, pagination, create dialog, edit inline or modal. |
| **Files** | `apps/web/src/app/(dashboard)/leave-types/page.tsx`, `apps/web/src/app/(dashboard)/teams/page.tsx`, `apps/web/src/app/(dashboard)/employees/page.tsx` |
| **Dependencies** | P4-T02, P4-T03, P2-T05 |
| **Tests** | Component: CRUD operations, CSV import, pagination, search |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P4-T05 through P4-T11) |

### P4-T13: Remaining Pages (Balances, Audit, Settings)

| Field | Value |
|-------|-------|
| **ID** | P4-T13 |
| **Title** | Balance report, audit trail, and settings pages |
| **Scope** | `balances/page.tsx`: balance report by employee/team/department with bar charts. `audit/page.tsx`: chronological audit log with entity type filters, colored action badges. `settings/page.tsx`: tenant settings (timezone, work week, coverage threshold, company profile). |
| **Files** | `apps/web/src/app/(dashboard)/balances/page.tsx`, `apps/web/src/app/(dashboard)/audit/page.tsx`, `apps/web/src/app/(dashboard)/settings/page.tsx` |
| **Dependencies** | P4-T02, P4-T03, P2-T08, P2-T10 |
| **Tests** | Component: data renders, filters work, settings save |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with all P4 tasks) |

### P4-T14: Requests List Page

| Field | Value |
|-------|-------|
| **ID** | P4-T14 |
| **Title** | Leave requests list page |
| **Scope** | `(dashboard)/requests/page.tsx`: paginated list/table of leave requests. Filter by status, employee, team, date range. Sortable columns. Status badges with color coding. Click row to navigate to detail page. New request button. |
| **Files** | `apps/web/src/app/(dashboard)/requests/page.tsx` |
| **Dependencies** | P4-T02, P4-T03, P2-T06 |
| **Tests** | Component: renders list, filters work, pagination, navigation to detail |
| **Size** | S (<1hr) |
| **Parallel** | Yes (with all P4 tasks) |

---

## 8. Phase 5: Background Jobs

**Goal:** Implement all BullMQ workers for async processing.

### P5-T01: BullMQ Worker Infrastructure

| Field | Value |
|-------|-------|
| **ID** | P5-T01 |
| **Title** | Worker process setup and Bull Board |
| **Scope** | Configure workers to run in the same process (MVP) with option to extract later. `lib/bullmq.ts`: create Worker instances for each queue. Error handling with dead-letter queue. Bull Board integration for monitoring at `/admin/queues` (protected by company_admin role). |
| **Files** | `apps/api/src/lib/bullmq.ts` (update), `apps/api/src/workers/index.ts` |
| **Dependencies** | P0-T07 |
| **Tests** | Integration: worker processes test job, failed job goes to DLQ, Bull Board accessible |
| **Size** | S (<1hr) |
| **Parallel** | Yes (first P5 task) |

### P5-T02: Escalation Worker

| Field | Value |
|-------|-------|
| **ID** | P5-T02 |
| **Title** | Approval escalation worker |
| **Scope** | `escalation.worker.ts`: runs every 15 minutes (BullMQ repeatable). Queries all `pending_approval` requests across tenants where current step has exceeded `timeoutHours`. For each: check escalation mode (remind/escalate_next/none), send reminders (track count), escalate to next step, or notify HR. Writes audit log entries. Uses the cross-tenant index `{ status, updatedAt }`. |
| **Files** | `apps/api/src/workers/escalation.worker.ts` |
| **Dependencies** | P5-T01, P1-T07, P1-T08, P1-T11 |
| **Tests** | Integration: overdue request gets reminder, max reminders triggers HR notification, escalation advances step |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P5-T03 through P5-T06) |

### P5-T03: Accrual Worker

| Field | Value |
|-------|-------|
| **ID** | P5-T03 |
| **Title** | Monthly balance accrual worker |
| **Scope** | `accrual.worker.ts`: BullMQ repeatable job running monthly. For each active tenant: get leave types with accrual rules, get active employees, calculate accrual amount per employee per leave type, create `accrual` ledger entries. Handle carryover at fiscal year boundary: calculate carryover vs forfeit per policy. Handle probation period (reduced accrual for new hires). |
| **Files** | `apps/api/src/workers/accrual.worker.ts` |
| **Dependencies** | P5-T01, P1-T06, P1-T02 |
| **Tests** | Integration: monthly accrual creates correct entries, carryover at year boundary, probation reduced rate |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P5-T02) |

### P5-T04: Calendar Sync Worker

| Field | Value |
|-------|-------|
| **ID** | P5-T04 |
| **Title** | Google Calendar and Outlook sync worker |
| **Scope** | `calendar-sync.worker.ts`: triggered on leave approval/cancellation. `calendar-sync.google.ts`: create/delete OOO event via Google Calendar API. `calendar-sync.outlook.ts`: create/delete OOO event via Microsoft Graph API. Read OAuth tokens from `oauth_tokens` (decrypt). Handle token refresh. Retry with exponential backoff. |
| **Files** | `apps/api/src/workers/calendar-sync.worker.ts`, `apps/api/src/modules/calendar-sync/calendar-sync.service.ts`, `apps/api/src/modules/calendar-sync/calendar-sync.google.ts`, `apps/api/src/modules/calendar-sync/calendar-sync.outlook.ts`, `apps/api/src/modules/calendar-sync/calendar-sync.types.ts`, `apps/api/src/modules/calendar-sync/calendar-sync.test.ts` |
| **Dependencies** | P5-T01, P1-T07 |
| **Tests** | Unit with mocked APIs: event created on approval, event deleted on cancel, token refresh on expiry |
| **Size** | L (3-6hr) |
| **Parallel** | Yes (with P5-T02, P5-T03) |

### P5-T05: Notification Dispatch Worker

| Field | Value |
|-------|-------|
| **ID** | P5-T05 |
| **Title** | Multi-channel notification worker |
| **Scope** | `notification.worker.ts`: processes notification queue jobs. Routes to correct channel: Slack DM (via Slack adapter), Teams message (via Teams adapter), email (via Postmark). Tracks delivery status in `notifications` collection. Stores `platformMessageId` for future message updates. Retry with exponential backoff (5 attempts). |
| **Files** | `apps/api/src/workers/notification.worker.ts` |
| **Dependencies** | P5-T01, P1-T11, P3-T03, P3-T05 |
| **Tests** | Integration with mocked adapters: Slack notification delivered, Teams notification delivered, email sent, retry on failure |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P5-T02 through P5-T04) |

### P5-T06: Dashboard Pre-Compute Worker

| Field | Value |
|-------|-------|
| **ID** | P5-T06 |
| **Title** | Dashboard cache pre-computation |
| **Scope** | `dashboard-cache.worker.ts`: BullMQ repeatable (every 5 minutes). Pre-computes expensive dashboard widgets (utilization rate, team balances) per tenant. Stores results in Redis with TTL. `GET /dashboard/summary` reads from cache when available, falls back to live query. |
| **Files** | `apps/api/src/workers/dashboard-cache.worker.ts` |
| **Dependencies** | P5-T01, P2-T09 |
| **Tests** | Integration: cache populated, dashboard reads from cache, cache miss triggers live query |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P5-T02 through P5-T05) |

---

## 9. Phase 6: Integration and Polish

**Goal:** External service integrations, billing, compliance, and production hardening.

### P6-T01: Stripe Billing Integration

| Field | Value |
|-------|-------|
| **ID** | P6-T01 |
| **Title** | Stripe subscription and billing |
| **Scope** | `billing.service.ts`: create Stripe customer on registration, create/update subscription, handle plan changes (free -> team -> business). Webhook handler for Stripe events (invoice.paid, subscription.updated, subscription.deleted). `billing.routes.ts`: `GET /billing`, `POST /billing/create-checkout-session`, `POST /billing/create-portal-session`, `POST /billing/webhooks` (Stripe webhook). Update `tenant.plan` and `tenant.planLimits` on plan change. Free tier enforcement: check limits before creating resources. |
| **Files** | `apps/api/src/modules/billing/billing.routes.ts`, `apps/api/src/modules/billing/billing.service.ts`, `apps/api/src/modules/billing/billing.schema.ts`, `apps/api/src/modules/billing/billing.test.ts` |
| **Dependencies** | P2-T01, P1-T10 |
| **Tests** | Integration with Stripe test mode: checkout session created, webhook updates plan, limit enforcement works |
| **Size** | L (3-6hr) |
| **Parallel** | Yes (first P6 task) |

### P6-T02: Billing Page (Web)

| Field | Value |
|-------|-------|
| **ID** | P6-T02 |
| **Title** | Billing dashboard page |
| **Scope** | `(dashboard)/billing/page.tsx`: current plan display, usage metrics (employee count vs limit), upgrade/downgrade buttons, Stripe portal link for invoice management. Plan comparison cards. |
| **Files** | `apps/web/src/app/(dashboard)/billing/page.tsx` |
| **Dependencies** | P4-T02, P6-T01 |
| **Tests** | Component: renders plan info, upgrade button works |
| **Size** | S (<1hr) |
| **Parallel** | No (depends on P6-T01) |

### P6-T03: Email Notifications (Postmark)

| Field | Value |
|-------|-------|
| **ID** | P6-T03 |
| **Title** | Transactional email via Postmark |
| **Scope** | Email templates: welcome, email verification, leave request submitted, leave approved, leave rejected, approval reminder, password reset. Postmark client wrapper with template rendering. Email worker enhancements in notification worker. |
| **Files** | `apps/api/src/modules/notification/email.service.ts`, `apps/api/src/modules/notification/email.templates.ts`, `apps/api/src/modules/notification/email.test.ts` |
| **Dependencies** | P5-T05 |
| **Tests** | Unit with mocked Postmark: each template renders, email sent with correct recipient and subject |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P6-T01) |

### P6-T04: Holiday Data Seeding

| Field | Value |
|-------|-------|
| **ID** | P6-T04 |
| **Title** | Public holiday data for 50 countries |
| **Scope** | Seed script that fetches holidays from Nager.Date API for 50 countries, 2026-2027. Store in `holiday_calendars` with `tenantId: null`. Fallback: local JSON file if API unavailable. Run on deployment and as a BullMQ job annually. |
| **Files** | `apps/api/src/modules/holiday/holiday.seed.ts`, `apps/api/src/modules/holiday/holiday-data/` (fallback JSON) |
| **Dependencies** | P1-T09 |
| **Tests** | Unit: seed creates correct document count, country codes valid, no duplicates |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P6-T01 through P6-T03) |

### P6-T05: GDPR Compliance

| Field | Value |
|-------|-------|
| **ID** | P6-T05 |
| **Title** | GDPR data export and pseudonymization |
| **Scope** | `POST /employees/:id/gdpr-export`: generate JSON export of all employee data across collections. `DELETE /employees/:id` with GDPR pseudonymization: replace PII in audit logs (actorId -> hash), deactivate employee, purge balance details (keep aggregates), delete bot mappings, revoke OAuth tokens. Consent tracking field on employee. |
| **Files** | `apps/api/src/modules/employee/employee.gdpr.ts`, `apps/api/src/modules/employee/employee.gdpr.test.ts` |
| **Dependencies** | P1-T04, P1-T08 |
| **Tests** | Integration: export includes all data, pseudonymization replaces PII, audit trail preserved with hashes |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P6-T01 through P6-T04) |

### P6-T06: Rate Limiting Hardening

| Field | Value |
|-------|-------|
| **ID** | P6-T06 |
| **Title** | Production rate limiting and security headers |
| **Scope** | Enhance rate limiter: per-endpoint tier overrides (auth endpoints: 10/min, bot webhooks: 1000/min). Add security headers (`@fastify/helmet`). CSRF protection for web. Input sanitization for XSS. Request size limits. |
| **Files** | `apps/api/src/plugins/rate-limiter.plugin.ts` (update), `apps/api/src/plugins/security.plugin.ts` |
| **Dependencies** | P2-T02 |
| **Tests** | Integration: auth endpoint rate limited, security headers present, XSS input sanitized |
| **Size** | S (<1hr) |
| **Parallel** | Yes (with all P6 tasks) |

### P6-T07: Calendar OAuth Setup Pages

| Field | Value |
|-------|-------|
| **ID** | P6-T07 |
| **Title** | Google Calendar and Outlook OAuth connection pages |
| **Scope** | Settings sub-page for connecting Google Calendar and Outlook. OAuth consent flow: redirect to Google/Microsoft, handle callback, store encrypted tokens. Per-employee calendar connection. Status indicators (connected/disconnected). Disconnect button. |
| **Files** | `apps/web/src/app/(dashboard)/settings/calendar/page.tsx`, `apps/api/src/modules/calendar-sync/calendar-sync.routes.ts` |
| **Dependencies** | P5-T04, P4-T13 |
| **Tests** | E2E: OAuth flow mock, connection status displayed, disconnect works |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with P6-T01 through P6-T06) |

### P6-T08: Blackout Periods

| Field | Value |
|-------|-------|
| **ID** | P6-T08 |
| **Title** | Blackout period management |
| **Scope** | `POST /blackout-periods`, `GET /blackout-periods`, `DELETE /blackout-periods/:id`. Scoped to teams and/or leave types. Leave request validation checks blackout periods and rejects if dates overlap. UI: settings page section for managing blackout periods. |
| **Files** | `apps/api/src/modules/leave-request/blackout.service.ts`, `apps/api/src/modules/leave-request/blackout.routes.ts`, `apps/api/src/modules/leave-request/blackout.test.ts` |
| **Dependencies** | P2-T06, P1-T07 |
| **Tests** | Integration: create blackout, leave request in blackout rejected, blackout scoped to team |
| **Size** | S (<1hr) |
| **Parallel** | Yes (with all P6 tasks) |

### P6-T09: CSV Import Worker

| Field | Value |
|-------|-------|
| **ID** | P6-T09 |
| **Title** | Bulk CSV employee import worker |
| **Scope** | `csv-import.worker.ts`: process CSV upload asynchronously. Parse rows, validate each (email format, team exists, role valid), create employees, generate error report. Progress tracking via BullMQ job progress. Limit: 5000 rows per import. |
| **Files** | `apps/api/src/workers/csv-import.worker.ts` |
| **Dependencies** | P5-T01, P1-T04 |
| **Tests** | Integration: valid CSV creates employees, invalid rows reported, progress tracked |
| **Size** | M (1-3hr) |
| **Parallel** | Yes (with all P6 tasks) |

### P6-T10: Production Readiness Checklist

| Field | Value |
|-------|-------|
| **ID** | P6-T10 |
| **Title** | Dockerfile, CI config, environment validation |
| **Scope** | `apps/api/Dockerfile`: multi-stage build. `apps/web/Dockerfile`: Next.js standalone output. Environment variable validation at startup (all required vars present). Health check endpoint enhanced with DB and Redis connectivity. Graceful shutdown with in-flight request draining. Sentry error tracking initialization. Pino structured logging. |
| **Files** | `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/api/src/lib/config.ts` (update), `apps/api/src/modules/health/health.routes.ts` (update) |
| **Dependencies** | All previous phases |
| **Tests** | Docker build succeeds; health check reports connectivity; missing env var fails startup |
| **Size** | M (1-3hr) |
| **Parallel** | No (last task) |

---

## 10. Execution Order and Critical Path

### Critical Path (Sequential Dependencies)

```
P0-T01 (monorepo)
  -> P0-T02/T03/T04/T05 (parallel: types, validation, constants, fastify)
    -> P0-T06 (mongoose models, needs types)
      -> P0-T08 (auth plugin)
        -> P0-T10 (test infra)
          -> P1-T01 (tenant isolation)
            -> P1-T07 (leave request FSM + approval engine)
              -> P2-T06 (leave request routes)
                -> P2-T07 (approval routes)
                  -> P3-T04 (Slack commands) + P3-T06 (Teams commands)
```

**Critical path estimated duration: ~38 hours** (sequential)

### Parallelization Map

```
Phase 0 (parallel groups):
  Group A: P0-T02, P0-T03, P0-T04 (packages)     -- after T01
  Group B: P0-T05, P0-T06, P0-T07, P0-T09         -- after T01
  Group C: P0-T08                                    -- after T05
  Group D: P0-T10                                    -- after T05 + T06 + T08

Phase 1 (parallel groups):
  Group A: P1-T02, P1-T03, P1-T05, P1-T06, P1-T08, P1-T09, P1-T10, P1-T11  -- after T01
  Group B: P1-T04                                    -- after T01 + T03
  Group C: P1-T07                                    -- after T05 + T06
  Group D: P1-T12                                    -- after T02-T05, T09, T10

Phase 2 (parallel groups):
  Group A: P2-T01, P2-T02                           -- after P0
  Group B: P2-T03, P2-T04                           -- sequential, after T01
  Group C: P2-T05, P2-T06, P2-T08, P2-T10, P2-T11 -- after T01
  Group D: P2-T07                                    -- after T06
  Group E: P2-T09                                    -- after most P1 services
  Group F: P2-T12                                    -- after T07

Phase 3 (parallel groups):
  Group A: P3-T01, P3-T02                           -- after P0
  Group B: P3-T03, P3-T05                           -- after T01 + T02
  Group C: P3-T04                                    -- after T03
  Group D: P3-T06                                    -- after T05
  Group E: P3-T07, P3-T08                           -- after adapters

Phase 4 (parallel groups):
  Group A: P4-T01, P4-T02, P4-T03                  -- after P0-T09
  Group B: P4-T04                                    -- after T03
  Group C: P4-T05 through P4-T14                    -- after T02 + T03 + P2 routes

Phase 5 (parallel after P5-T01):
  All workers: P5-T02 through P5-T06               -- parallel after T01

Phase 6 (mostly parallel):
  All tasks can run in parallel                     -- after relevant dependencies
```

### Gantt Summary (4 Developers)

| Week | Dev 1 | Dev 2 | Dev 3 | Dev 4 |
|------|-------|-------|-------|-------|
| 1 | P0-T01, P0-T05 | P0-T02, P0-T03 | P0-T04, P0-T09 | P0-T06, P0-T07 |
| 2 | P0-T08, P0-T10 | P1-T02, P1-T03 | P1-T05, P1-T06 | P1-T08, P1-T09, P1-T10 |
| 3 | P1-T01, P1-T07 | P1-T04, P1-T11 | P1-T12, P2-T01 | P2-T02, P3-T01 |
| 4 | P2-T03, P2-T04 | P2-T05 | P2-T06, P2-T07 | P3-T02 |
| 5 | P2-T08, P2-T09 | P2-T10, P2-T11, P2-T12 | P3-T03, P3-T04 | P3-T05, P3-T06 |
| 6 | P3-T07, P3-T08 | P4-T01, P4-T02 | P4-T03 | P4-T04 |
| 7 | P4-T05 | P4-T06 | P4-T07, P4-T08 | P4-T09, P4-T10 |
| 8 | P4-T11, P4-T12 | P4-T13, P4-T14 | P5-T01, P5-T02 | P5-T03, P5-T04 |
| 9 | P5-T05, P5-T06 | P6-T01 | P6-T03, P6-T04 | P6-T05, P6-T06 |
| 10 | P6-T02, P6-T07 | P6-T08, P6-T09 | P6-T10 | Buffer / Bug fixes |

**Estimated total: 10 weeks with 4 developers**

---

## 11. File Change Map

### New Files by Location

| Directory | Files | Action |
|-----------|-------|--------|
| `/` (root) | `package.json`, `turbo.json`, `tsconfig.base.json`, `pnpm-workspace.yaml`, `docker-compose.yml`, `.env.example`, `.gitignore` | Create |
| `packages/shared-types/src/` | 12 type definition files | Create |
| `packages/validation/src/` | 11 Zod schema files | Create |
| `packages/constants/src/` | 7 constant files | Create |
| `packages/bot-messages/src/` | 10 template and renderer files | Create |
| `apps/api/src/lib/` | 6 infrastructure files (db, redis, bullmq, firebase, logger, config) | Create |
| `apps/api/src/models/` | 15 Mongoose model files | Create |
| `apps/api/src/plugins/` | 5 Fastify plugin files | Create |
| `apps/api/src/modules/` | ~120 files across 20 modules (routes, services, repos, schemas, types, tests) | Create |
| `apps/api/src/workers/` | 6 BullMQ worker files | Create |
| `apps/api/test/` | 6 test infrastructure files | Create |
| `apps/web/src/app/` | ~25 page files across route groups | Create |
| `apps/web/src/components/` | ~45 component files | Create |
| `apps/web/src/hooks/` | 4 hook files | Create |
| `apps/web/src/stores/` | 4 Zustand store files | Create |
| `apps/web/src/lib/` | 3 utility files | Create |
| `apps/web/src/styles/` | 1 design token file | Create |

**Approximate total: ~290 new files**

---

## 12. Testing Strategy

### Per Phase

| Phase | Unit Tests | Integration Tests | E2E Tests |
|-------|-----------|------------------|-----------|
| P0 | Validation schemas | DB connection, auth plugin | Build succeeds |
| P1 | All service methods, FSM transitions | Tenant isolation, approval flow | -- |
| P2 | Route validation, error formatting | Full API request/response cycle per endpoint | -- |
| P3 | Command parsing, message rendering | Bot webhook handling, approval via button | -- |
| P4 | Component rendering, state management | -- | Register -> onboard -> request -> approve |
| P5 | Worker job processing | Escalation triggers, accrual creates entries | -- |
| P6 | Stripe webhook handling, GDPR export | Billing flow, rate limiting | Full user journey |

### Coverage Targets

| Package/App | Target | Tool |
|-------------|--------|------|
| `packages/shared-types` | Compile check only | TypeScript compiler |
| `packages/validation` | 95%+ | Vitest |
| `packages/constants` | 100% (snapshot) | Vitest |
| `packages/bot-messages` | 90%+ | Vitest |
| `apps/api` (services) | 90%+ | Vitest |
| `apps/api` (routes) | 85%+ | Vitest + Supertest |
| `apps/api` (workers) | 80%+ | Vitest |
| `apps/web` (components) | 80%+ | Vitest + React Testing Library |
| E2E | Critical paths | Playwright |

### Key Test Scenarios

1. **Tenant isolation**: Tenant A cannot access Tenant B data (every collection)
2. **FSM completeness**: every valid state transition works; every invalid transition rejected
3. **Balance integrity**: concurrent deductions cannot overdraw; restore after cancel is exact
4. **Workflow snapshot immutability**: editing workflow does not affect pending requests
5. **Bot parity**: Slack and Teams produce equivalent results for same actions
6. **Escalation timing**: overdue requests escalate at correct intervals
7. **GDPR**: pseudonymization replaces PII without breaking audit chain
8. **Rate limiting**: per-tenant limits enforced correctly per plan

---

## 13. Risk Register

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|------------|
| R1 | Slack/Teams API rate limits during high-volume approval notifications | Delayed notifications | Medium | Notification queue with exponential backoff; batch notifications where possible |
| R2 | MongoDB aggregation performance for dashboard at scale | Slow dashboard (>3s) | Medium | Pre-compute expensive widgets via dashboard cache worker (P5-T06); paginate heavy queries |
| R3 | Firebase Auth custom claims limited to 1000 bytes | Cannot store complex permissions | Low | Current claims (tenantId, role, employeeId) use ~100 bytes; if ABAC needed, move to DB lookup |
| R4 | Balance ledger SUM query becomes slow with millions of entries | Slow balance check, blocks request creation | Low | Compound index optimizes to ~1ms even at 50 entries/employee; archive old entries if needed |
| R5 | Workflow snapshot embedded in leave request bloats document size | Larger DB, slower queries | Low | ~1KB per snapshot at MVP scale; acceptable. If workflows grow complex (Phase 2 conditional), compress or reference |
| R6 | Teams Bot Framework proactive messaging requires stored ConversationReference | Cannot send notifications if reference lost | Medium | Store ConversationReference on first interaction; refresh on each bot event; fallback to email |
| R7 | Turborepo build cache invalidation causes stale shared types | Runtime type mismatches | Low | Configure Turborepo dependencies correctly; run full build in CI |
| R8 | Calendar sync OAuth token expiry during off-hours | Failed calendar events | Medium | Token refresh in calendar sync worker; alert on repeated failures; re-auth prompt in UI |
| R9 | CSV import with 5000+ rows times out | Import fails, user retries | Medium | Async processing via BullMQ worker; progress tracking; chunked processing |
| R10 | Cross-tenant data leak via Mongoose query without tenantId | Security breach | High | Mongoose middleware throws on missing tenantId; integration test suite verifies all collections; code review gate |

---

*Plan complete. Ready for handoff to Software Developer agents.*
