# LeaveFlow

LeaveFlow is a multi-tenant leave management SaaS that lets companies configure leave types, approval workflows, and team calendars while giving employees a self-service portal to request, track, and manage their time off. It ships as a Turborepo monorepo with a Fastify REST API, a Next.js web application, shared type packages, and Slack/Teams bot integration.

## Tech Stack

| Layer | Technology |
|---|---|
| API | Fastify 5, MongoDB (Mongoose 8), Redis (ioredis), BullMQ 5 |
| Web | Next.js 15, React 19, Tailwind CSS 3 |
| Auth | Firebase Admin SDK (server), Firebase SDK (client) |
| Background jobs | BullMQ workers (escalation, accrual, notifications, calendar sync, dashboard cache) |
| Bot integration | Slack Events API, Microsoft Teams bot framework |
| Billing | Stripe Checkout + Customer Portal |
| Language | TypeScript 5 (strict) throughout |
| Package manager | pnpm 9 with Turborepo |

## Monorepo Structure

```
leaveflow/
├── apps/
│   ├── api/                  # Fastify REST API
│   │   └── src/
│   │       ├── lib/          # db, redis, bullmq, config, errors, response helpers
│   │       ├── middleware/   # shared middleware
│   │       ├── models/       # Mongoose models
│   │       ├── modules/      # feature modules (routes, service, repository)
│   │       ├── plugins/      # auth, tenant, cors, security, error-handler
│   │       ├── types/        # Fastify type augmentations
│   │       └── workers/      # BullMQ background workers
│   └── web/                  # Next.js frontend
│       └── src/
│           ├── app/          # Next.js App Router pages
│           ├── components/   # React components
│           ├── hooks/        # custom hooks
│           ├── lib/          # API client, Firebase client
│           └── stores/       # Zustand state stores
├── packages/
│   ├── constants/            # shared enum-like constants
│   ├── shared-types/         # cross-package TypeScript types
│   └── validation/           # shared Zod schemas
├── docker-compose.yml        # local MongoDB + Redis
├── turbo.json                # Turborepo pipeline config
└── pnpm-workspace.yaml
```

## Prerequisites

- **Node.js** 20 or later
- **pnpm** 9 (`npm install -g pnpm@9`)
- **MongoDB** 7 — local instance or Atlas URI
- **Redis** 7 — local instance or Redis Cloud URL
- **Firebase** project with Authentication enabled (separate projects recommended for staging/production)

## Getting Started

```bash
# 1. Clone the repository
git clone <repo-url>
cd test-proj/leaveflow

# 2. Install all workspace dependencies
pnpm install

# 3. Set up environment variables
cp .env.example apps/api/.env
# Edit apps/api/.env with your values (see table below)

# 4. Start infrastructure (MongoDB + Redis) with Docker
docker compose up -d

# 5. Start all apps in development mode (parallel, with hot reload)
pnpm dev

# API runs on http://localhost:3001
# Web runs on http://localhost:3000
```

## Environment Variables

Create `apps/api/.env` based on the following table. All variables are required unless marked optional.

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API server port | `3001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/leaveflow` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `leaveflow-dev` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | `firebase-adminsdk@...iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key (PEM, newlines as `\n`) | `-----BEGIN PRIVATE KEY-----\n...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM (OAuth token encryption) | `<64 hex chars>` |
| `GOOGLE_OAUTH_CLIENT_ID` | Google Calendar OAuth client ID | (optional) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Calendar OAuth client secret | (optional) |
| `GOOGLE_OAUTH_REDIRECT_URI` | Google OAuth redirect URI | `http://localhost:3001/calendar-sync/google/callback` |
| `OUTLOOK_OAUTH_CLIENT_ID` | Outlook Calendar OAuth client ID | (optional) |
| `OUTLOOK_OAUTH_CLIENT_SECRET` | Outlook Calendar OAuth client secret | (optional) |
| `OUTLOOK_OAUTH_REDIRECT_URI` | Outlook OAuth redirect URI | `http://localhost:3001/calendar-sync/outlook/callback` |
| `OUTLOOK_AZURE_TENANT_ID` | Azure AD tenant ID | (optional) |
| `APP_BASE_URL` | Public base URL for OAuth redirects | `http://localhost:3000` |
| `SLACK_BOT_TOKEN` | Slack bot OAuth token | (optional) |
| `SLACK_SIGNING_SECRET` | Slack request signing secret | (optional) |
| `TEAMS_APP_ID` | Microsoft Teams app ID | (optional) |
| `TEAMS_APP_PASSWORD` | Microsoft Teams app password | (optional) |

## Available Scripts

Run from the `leaveflow/` workspace root unless noted.

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in watch/development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run all test suites across the monorepo |
| `pnpm lint` | TypeScript type-check all packages |
| `pnpm clean` | Remove all build artifacts and `node_modules` |

Run from `apps/api/`:

| Command | Description |
|---|---|
| `pnpm dev` | Start the API with `tsx watch` (hot reload) |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run the compiled API server |
| `pnpm test` | Run Vitest unit/integration tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests and generate v8 coverage report |

Run from `apps/web/`:

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js with Turbopack |
| `pnpm build` | Build Next.js for production |
| `pnpm test` | Run Jest component tests |
| `pnpm test:coverage` | Run Jest tests with coverage |

## Architecture Overview

LeaveFlow follows a modular, multi-tenant architecture:

- **Multi-tenancy** — every MongoDB document carries a `tenantId` field enforced at the repository layer. The `tenantPlugin` Fastify plugin copies the JWT `tenantId` claim to `request.tenantId` and blocks requests that lack it.
- **Authentication** — Firebase ID tokens are verified on every request by the `authPlugin`. Verified claims (`uid`, `tenantId`, `employeeId`, `role`) are attached to `request.auth`.
- **Approval engine** — leave requests move through a 7-state FSM (`draft` → `pending_validation` → `pending_approval` → `approved` / `rejected` / `cancelled` / `escalated`).
- **Balance ledger** — leave balances are stored as an append-only ledger; the current balance is always derived by `SUM` aggregation, never mutated in place.
- **Background workers** — five BullMQ workers handle escalation, monthly accrual, notification dispatch, calendar sync, and dashboard cache pre-computation.

See [`docs/architecture.md`](docs/architecture.md) for a full description.

## API Reference

See [`docs/api-reference.md`](docs/api-reference.md) for the complete endpoint listing with request/response shapes.

## License

MIT
