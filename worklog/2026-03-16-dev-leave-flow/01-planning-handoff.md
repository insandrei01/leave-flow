---
stage: "01-planning"
handoff_to: "02-implementation"
run_id: "2026-03-16-dev-leave-flow"
---

# Handoff: Planning -> Software Developers

## Summary

72 tasks across 7 phases. Estimated ~204 hours. 10 weeks with 4 developers.

Full plan: `worklog/runs/2026-03-16-dev-leave-flow/01-planning.md`

## Task Count by Phase

| Phase | Tasks | Hours | Description |
|-------|-------|-------|-------------|
| P0: Scaffold | 10 | 16 | Turborepo, packages, Fastify, Next.js, DB, auth, tests |
| P1: Core Domain | 12 | 36 | Services + repos, FSM, balance ledger, audit |
| P2: API Layer | 12 | 32 | All REST routes, validation, pagination, dashboard |
| P3: Bot Integration | 8 | 28 | Adapter pattern, Slack Bolt, Teams Bot Framework |
| P4: Web Application | 14 | 46 | All Next.js pages, glassmorphic components |
| P5: Background Jobs | 6 | 18 | BullMQ workers: escalation, accrual, sync, notify |
| P6: Integration | 10 | 28 | Stripe, Postmark, GDPR, holidays, hardening |

## Critical Path

```
P0-T01 -> P0-T05 -> P0-T08 -> P0-T10 -> P1-T01 -> P1-T07 -> P2-T06 -> P2-T07 -> P3-T04/P3-T06
```

Sequential bottleneck: ~38 hours. Everything else can run in parallel.

## Parallelization Map

**Phase 0** (4 parallel streams):
- Stream 1: T01 (monorepo) then T05 (Fastify) then T08 (auth) then T10 (test infra)
- Stream 2: T02 (types) + T03 (validation)
- Stream 3: T04 (constants) + T09 (Next.js skeleton)
- Stream 4: T06 (Mongoose models) + T07 (Redis/BullMQ)

**Phase 1** (3 parallel streams after T01):
- Stream 1: T02, T03, T05, T06, T08, T09, T10, T11 (independent services)
- Stream 2: T04 (needs T03 for team refs) then T07 (needs T05+T06)
- Stream 3: T12 (needs most services, runs last)

**Phase 2+3** can overlap: API routes and bot adapters can develop in parallel.

**Phase 4** can overlap with P3: web pages need API routes but not bot integration.

**Phase 5+6** can overlap: workers and integrations are independent.

## Monorepo Structure

```
leaveflow/
  apps/api/src/          # Fastify API (modules/, plugins/, workers/, models/, lib/)
  apps/web/src/          # Next.js (app/, components/, hooks/, stores/, lib/)
  packages/shared-types/ # TypeScript interfaces
  packages/validation/   # Zod schemas
  packages/bot-messages/ # Block Kit + Adaptive Card templates
  packages/constants/    # Enums and constants
```

Each API module follows: `routes.ts`, `service.ts`, `repository.ts`, `schema.ts`, `types.ts`, `test.ts`, `index.ts`

## Key Patterns (All Developers Must Follow)

1. **Immutable data**: Never mutate. Return new objects from services and repositories.
2. **TDD**: Write test first (RED), implement (GREEN), refactor. 80%+ coverage.
3. **tenantId everywhere**: Every Mongoose query must include `tenantId`. Middleware throws without it.
4. **Append-only balance**: Balance = SUM(ledger entries). Never store a mutable balance field. Never cache balance.
5. **FSM transitions**: All leave request state changes go through `approval-engine.fsm.ts`. No direct status updates.
6. **Audit on state change**: Every state-changing operation writes an audit log entry in the same call (not async).
7. **Workflow snapshot**: On request creation, embed full workflow copy (BR-102). Pending requests ignore workflow edits.
8. **Response envelope**: `{ success, data, error, meta }` on every response.
9. **Zod validation**: All request bodies validated via shared `packages/validation` schemas.
10. **Small files**: 200-400 lines typical, 800 max. Functions under 50 lines.

## Testing Requirements

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit (services, FSM, schemas) | Vitest | 90%+ |
| Integration (API routes) | Vitest + Supertest | 85%+ |
| Component (React) | Vitest + React Testing Library | 80%+ |
| E2E (critical flows) | Playwright | Key paths |

Critical test scenarios:
- Tenant isolation across all collections
- FSM: every valid transition + every invalid transition rejected
- Balance: concurrent deductions, restore after cancel
- Bot parity: Slack and Teams produce same results

## Design References

- UI: Dark glassmorphic, `02-design-experimental.md` (colors, typography, motion)
- API: `03-api-contracts.md` (all endpoints, request/response shapes)
- Data: `04-data-model.md` (14 collections, 34 indexes, FSM states, ledger design)
- Architecture: `01-architecture.md` (system diagram, module structure, bot adapter)

## First Tasks to Start

Developers can immediately begin these 4 parallel tasks after P0-T01 completes:

1. **Dev 1**: P0-T05 (Fastify bootstrap) then P0-T08 (auth plugin)
2. **Dev 2**: P0-T02 (shared types) then P0-T03 (validation schemas)
3. **Dev 3**: P0-T04 (constants) then P0-T09 (Next.js skeleton)
4. **Dev 4**: P0-T06 (Mongoose models) then P0-T07 (Redis/BullMQ)

---

*Full implementation plan with detailed scope, file paths, and dependencies for all 72 tasks is in `01-planning.md`.*
