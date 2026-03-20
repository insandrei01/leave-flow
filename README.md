# LeaveFlow: A Production App Built Entirely by Claude Code Agents

This repository contains a full-stack SaaS application — and the complete execution log of how it was built. A single initial prompt was fed into [Scriptgun](#scriptgun), a multi-agent pipeline runner for Claude Code, and the output is everything you see here: product spec, architecture, three design variants, API contracts, data model, implementation, tests, reviews, bug fixes, and documentation.

One human decision was made during the process: selecting a design direction from three generated variants.

## What Is Scriptgun

Scriptgun is an npm package that bootstraps Claude Code with structured multi-agent configurations. It provides:

- **Specialized agents** — product manager, CTO, UX designer, tech lead, developer, code reviewer, security expert, QA engineer, technical writer — each with role-specific system prompts and tool access
- **Pipelines** — ordered sequences of agent stages (discovery, design, development) with defined inputs, outputs, and handoff documents between stages
- **Approval gates** — manual (human reviews and approves before proceeding), auto (passes if quality criteria are met), and auto-retry (fails, fixes, re-reviews up to N times)
- **Parallel execution** — independent agent streams run concurrently within a stage, with the orchestrator managing task distribution and result aggregation
- **Model routing** — Opus for planning, architecture, and review; Sonnet for implementation and documentation — cost-optimized by role

[Scriptgun on GitHub →](#scriptgun)

## What Was Generated

**LeaveFlow** is a multi-tenant leave management SaaS. Employees request time off via Slack/Teams bots or a web dashboard; requests flow through configurable approval chains (e.g., Employee → Manager → HR). Managers define their team's workflow via a visual builder. HR gets a dashboard with calendars, reports, and audit logs.

### Tech stack

| Layer | Technology |
|---|---|
| API | Fastify 5, MongoDB (Mongoose 8), Redis (ioredis), BullMQ 5 |
| Web | Next.js 15, React 19, Tailwind CSS 4 |
| Auth | Firebase Auth (custom claims for tenancy) |
| Workers | BullMQ (escalation, accrual, notifications, calendar sync, dashboard cache) |
| Bots | Slack Events API, Microsoft Teams Bot Framework |
| Billing | Stripe Checkout + Customer Portal |
| Language | TypeScript 5 (strict) throughout |
| Monorepo | pnpm 9 + Turborepo |

### Scale of the output

- ~460 source files across the monorepo
- 14 Mongoose models with 34 compound indexes
- 50+ REST endpoints across 20 route modules
- 14 web pages, 60+ React components, 15 hooks, 4 Zustand stores
- 7-state FSM approval engine with multi-step workflows
- Append-only balance ledger (no mutable balance field)
- 6 BullMQ background workers
- Slack + Teams bot adapters with shared business logic
- GDPR export and pseudonymization
- 630+ passing tests
- Dockerfiles for API and web

## What Happened

The entire run took ~12 hours wall clock across three pipeline stages, used ~35 agent invocations, and cost an estimated **~$117** in API usage.

### Stage 1: Discovery (~100 min, ~$6)

Pipeline: `discovery` — 3 agents, all manual gates.

| Step | Agent | What it produced |
|---|---|---|
| Vision & Strategy | product-manager (Opus) | Market research, 5 personas, 30+ functional requirements, pricing model, MVP scope |
| User Stories | product-owner (Opus) | Backlog with acceptance criteria (GIVEN/WHEN/THEN), MoSCoW prioritization, sprint grouping |
| Business Analysis | business-analyst (Sonnet) | Requirements analysis, risk register, integration constraints |

Each stage output was manually approved before proceeding.

### Stage 2: Design (~5.5 hrs, ~$29)

Pipeline: `design` — 6 agent invocations, mix of manual and auto gates.

| Step | Agent | What it produced |
|---|---|---|
| Architecture | cto (Opus) | Tech stack decisions, multi-tenancy model, FSM approval engine, bot adapter pattern, infrastructure plan, cost estimates |
| UI/UX — Conservative | ux-ui-expert (Opus) | Clean SaaS design, 6 web mockups, 4 mobile mockups, 6 bot message designs |
| UI/UX — Creative | ux-ui-expert (Opus) | Glassmorphism + SaaS hybrid, swimlane calendar, SVG progress rings, sparkline KPI cards |
| UI/UX — Experimental | ux-ui-expert (Opus) | Dark glassmorphic with bento grids, absence heatmap, conic-gradient charts, spring-curve animations |
| API Contracts | api-designer (Sonnet) | 50+ endpoint contracts across 15 modules, ran in parallel with data model |
| Data Model | database-architect (Opus) | 14 MongoDB collections, 34 indexes, append-only ledger design, migration script |

**Design selection:** The experimental (bold) variant was chosen. All three variants are preserved in `mockups/` with a comparison navigator (`mockups/index.html`).

### Stage 3: Development (~4.5 hrs, ~$82)

Pipeline: `develop` — 30+ agent invocations, all gates set to auto.

**Planning** — Tech lead (Opus) broke the MVP into 7 phases, 72 tasks.

**Implementation** — Sonnet developer agents worked in parallel streams:

| Phase | Tasks | Parallel streams | Duration | Output |
|---|---|---|---|---|
| P0: Scaffold | 10 | 5 | ~75 min | Monorepo, shared packages, models, plugins, test infra (119 files) |
| P1: Core Domain | 12 | 3 | ~60 min | FSM engine, balance ledger, all services, ~260 tests (62 files) |
| P2: API Layer | 12 | 3 | ~65 min | 50+ endpoints, rate limiting, role guards (59 files) |
| P3: Bot Integration | 8 | 2 | ~50 min | Slack + Teams adapters, slash commands, interactive buttons (77 tests) |
| P4: Web App | 14 | 4 | ~70 min | 14 pages, 60+ components, dark glassmorphic UI |
| P5: Workers | 6 | 1 | ~45 min | 6 BullMQ workers (48 tests) |
| P6: Integration | 10 | 1 | ~60 min | Stripe, email, GDPR, security, Docker (88 tests) |

**Review** — Three reviewers ran in parallel (code, security, performance). First pass found 16 critical/high issues:

- OAuth tokens stored in plaintext
- Missing CSRF verification on OAuth callbacks
- Any user could approve any request (no approver check)
- Race condition on balance check + request creation
- Most route modules commented out in app.ts
- 13 more issues across security, correctness, and performance

Four developer agents fixed all 16 issues in parallel (~35 min). Re-review confirmed all fixes; one minor wiring issue was caught and fixed inline.

**Testing** — QA engineer ran the full suite: 630 passed, 24 failed (4 real bugs). Developer agent fixed all four. Bug examples: missing tenantId guard on notification updates, Zod email validation ordering, sparse index conflicts.

**Documentation** — Technical writer and doc writer produced README, API reference, architecture docs, and changelog in parallel.

## Design Variants

Three UI/UX directions were generated, each with 6 web mockups (standalone HTML + Tailwind) and 4 mobile mockups (React Native JSX):

```
mockups/
├── index.html                    # Side-by-side comparison navigator
├── conservative/                 # Clean, traditional SaaS
│   ├── dashboard-home.html
│   ├── absence-calendar.html
│   ├── workflow-builder.html
│   ├── leave-request-detail.html
│   ├── onboarding-wizard.html
│   ├── employee-self-service.html
│   └── mobile/                   # 4 React Native screens
├── creative/                     # Glassmorphism + SaaS hybrid
│   ├── (same 6 pages)
│   └── mobile/
└── experimental/                 # Dark glassmorphic, bento grids ← SELECTED
    ├── (same 6 pages)
    ├── mobile/
    └── bot/                      # Slack + Teams message templates
```

Open `mockups/index.html` in a browser to compare all three side by side with keyboard navigation.

## Repository Structure

```
├── leaveflow/                    # The generated application
│   ├── apps/
│   │   ├── api/                  # Fastify REST API
│   │   └── web/                  # Next.js frontend
│   ├── packages/
│   │   ├── shared-types/         # Cross-package TypeScript interfaces
│   │   ├── validation/           # Zod schemas (API + forms)
│   │   ├── constants/            # Enumerated string constants
│   │   └── bot-messages/         # Slack Block Kit + Teams Adaptive Card renderers
│   ├── docs/                     # Architecture + API reference
│   ├── docker-compose.yml
│   └── README.md                 # Generated project README with setup instructions
├── worklog/                      # Complete execution logs
│   ├── 2026-03-16-disc-leave-bot/    # Discovery pipeline (vision, stories, analysis)
│   ├── 2026-03-16-design-leave-flow/ # Design pipeline (arch, UI/UX, API, data model)
│   └── 2026-03-16-dev-leave-flow/    # Dev pipeline (planning, impl, review, test, docs)
└── mockups/                      # Three design variants with comparison navigator
```

Each `worklog/` subfolder contains a `run-meta.md` with the full execution trace: agents invoked, models used, durations, costs, gate results, and files modified. The individual stage outputs (e.g., `01-vision.md`, `03-security-review.md`) contain the complete agent work product.

## Cost Breakdown

| Pipeline | Duration | Estimated Cost |
|---|---|---|
| Discovery | ~100 min | ~$6 |
| Design | ~5.5 hrs | ~$29 |
| Development | ~4.5 hrs | ~$82 |
| **Total** | **~12 hrs** | **~$117** |

Model routing: Opus for planning, architecture, review, and design; Sonnet for implementation, testing, and documentation.

## Scriptgun

Scriptgun is not yet publicly available. [Coming soon]

## Contact

Andrei — [GitHub](https://github.com/anthropics)
