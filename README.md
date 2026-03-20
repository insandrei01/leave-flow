# One Prompt → Production App

This repo is the output of a single experiment: can a structured multi-agent Claude Code setup generate a production-grade application from one prompt?

**Yes.** one human decision (picking a design variant).

The result is **LeaveFlow** — a multi-tenant leave management SaaS with a Fastify API, Next.js frontend, Slack/Teams bots, Stripe billing, and 630+ passing tests. ~460 source files across a pnpm monorepo.

## How it worked

The prompt was fed into **Scriptgun**, an npm package that bootstraps Claude Code with multi-agent pipelines — specialized agents (PM, CTO, designer, developer, reviewer, etc.), ordered stages with handoff documents, approval gates, and model routing (Opus for thinking, Sonnet for building).

Three pipelines ran in sequence:

1. **Discovery** — Product vision, user stories, requirements
2. **Design** — Architecture, three UI/UX variants, API contracts, data model
3. **Development** — Implementation in parallel streams, code/security/perf review, bug fixes, tests, docs

The review stage found 16 critical issues (plaintext OAuth tokens, missing CSRF, broken authorization). Four developer agents fixed all of them in parallel. QA caught 4 more bugs in the test suite. All resolved automatically.

## See the design variants

Three UI directions were generated. [**Browse all three live →**](https://insandrei01.github.io/leave-flow/mockups/index.html)

- [Conservative](https://insandrei01.github.io/leave-flow/mockups/conservative/dashboard-home.html) — Clean traditional SaaS
- [Creative](https://insandrei01.github.io/leave-flow/mockups/creative/dashboard-home.html) — Glassmorphism + SaaS hybrid
- [Experimental](https://insandrei01.github.io/leave-flow/mockups/experimental/dashboard-home.html) ← selected — Dark glassmorphic, bento grids

## What's in the repo

```
leaveflow/    → The generated app (API, web, shared packages, docs, Docker)
worklog/      → Full execution logs for each pipeline stage
mockups/      → Three design variants with a comparison navigator
```

Every agent invocation, model used, duration, cost, and gate result is logged in `worklog/`.

## Scriptgun

The multi-agent framework that orchestrated this. Coming soon as open source.

## Contact

Andrei — [GitHub](https://github.com/insandrei01)
