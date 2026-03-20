# Changelog

All notable changes to LeaveFlow will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
LeaveFlow adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.1.0] - 2026-03-17

### Added

#### Core Platform
- Multi-tenant Fastify 5 REST API with Firebase authentication and tenant isolation
- Next.js 15 web application with dark glassmorphic UI design system
- Turborepo monorepo with shared packages: `shared-types`, `validation`, `constants`
- Docker Compose configuration for local MongoDB and Redis development environment

#### Authentication
- Firebase ID token verification via `authPlugin` (onRequest hook)
- Custom JWT claims (`tenantId`, `employeeId`, `role`) enforced on all protected routes
- Tenant context plugin (`tenantPlugin`) that gates requests without a valid tenant
- Public route bypass for health checks, Stripe webhooks, and bot webhook paths

#### Onboarding
- 6-step guided company onboarding flow for new company admins
- Steps: company settings, leave type setup, workflow template selection, team creation, employee import, holiday calendar seeding
- Idempotent step saves and explicit completion endpoint

#### Tenant Management
- Tenant CRUD with plan limits model (`starter`, `pro`, `enterprise`)
- Operational settings: country code, timezone, work-week days, coverage threshold

#### Employee Management
- Full CRUD with pagination and filtering by team, role, and status
- Soft deactivation (status-based, not hard delete)
- CSV bulk import endpoint with per-row error reporting
- Background CSV import worker for large files

#### Team Management
- Team CRUD with manager assignment and workflow association
- Team member listing endpoint

#### Leave Types
- Configurable leave types: paid/unpaid, requires-approval flag, default entitlement, accrual policy, max carry-over days
- Full CRUD with conflict detection on slug uniqueness

#### Approval Workflows
- 7-state FSM: `draft` → `pending_validation` → `pending_approval` → `approved` / `rejected` / `cancelled` / `escalated`
- Multi-step workflows with configurable approver types (`manager`, `hr_admin`, `specific_employee`)
- Escalation policies per step: `auto_approve`, `notify_hr`, `escalate`
- Workflow templates: `simple`, `standard`, `enterprise`
- Clone and dry-run simulation endpoints
- Version increment on workflow update

#### Leave Requests
- Self-service leave request creation with automatic workflow resolution
- Dry-run validation endpoint (balance, blackout, working days)
- Half-day start and end support
- Cancellation by owner or HR admin
- Approval delegation: approvers can delegate authority to another employee for a date range
- Blackout periods: global or team/leave-type scoped date ranges that block new requests

#### Approval Engine
- Approval, rejection, and force-approval endpoints
- Delegation-aware approver verification
- Pending approvals list and badge count endpoint

#### Balance Ledger
- Append-only ledger model with entry types: `initial_grant`, `accrual`, `debit`, `credit`, `manual_adjustment`, `carry_over`, `expiry`
- Balance computed by `SUM` aggregation — no mutable balance field
- Manual adjustment endpoint for HR admins
- Paginated ledger history per employee/leave-type

#### Dashboard
- Single-call `GET /dashboard/summary` returning all 9 widget payloads
- Redis-backed cache pre-computed every 5 minutes by dashboard cache worker
- Widgets: pending approvals, today's absences, upcoming absences, balance summary, leave by type, team coverage, recent activity, leave calendar, top absentees

#### Calendar
- Swim-lane absence view grouped by team
- Per-day coverage percentage with configurable threshold warnings
- Manager role scoped to own team; HR admin sees all teams

#### Calendar Sync
- Google Calendar OAuth 2.0 integration with CSRF-safe Redis nonce
- Outlook Calendar OAuth 2.0 integration
- AES-256-GCM encryption for stored OAuth tokens
- Calendar connection status and disconnect endpoints
- Calendar sync worker: creates/deletes OOO events on approval and cancellation

#### Holiday Management
- Built-in public holiday data by country code
- Custom company-specific holidays per year
- Holiday calendar automatically considered during working-day calculations

#### Notifications
- In-app notification inbox with read/unread state
- Unread badge count endpoint
- Mark-single and mark-all-read endpoints
- Notification worker: dispatches to Slack, Teams, and in-app channels with 100 jobs/second rate limit

#### Billing
- Stripe Checkout session creation for plan upgrades
- Stripe Customer Portal session for subscription management
- Stripe webhook handler with signature verification
- Plan limit enforcement at service layer

#### Audit
- Immutable audit log on all write operations across every module
- Paginated, filterable read endpoint for HR admins
- CSV streaming export for company admins

#### Bot Integration
- Adapter pattern isolating platform-specific logic from shared business logic
- Slack bot: event handling with signing-secret HMAC verification
- Microsoft Teams bot: activity handling
- `BotMappingService` linking platform user IDs to employee records

#### GDPR Compliance
- Employee data export (full JSON snapshot)
- Employee pseudonymization: replaces PII with `[DELETED:<id>]` token, retaining audit trail integrity

#### Background Workers (BullMQ)
- Escalation worker: scans overdue approval steps every 15 minutes
- Accrual worker: runs monthly leave accruals
- Notification worker: concurrency 10, 100 jobs/second, up to 5 retry attempts
- Calendar sync worker: on-demand OOO event management
- Dashboard cache worker: repeatable 5-minute pre-computation
- Graceful shutdown: all workers drain in-flight jobs on SIGTERM/SIGINT
- Bull Board admin UI at `GET /admin/queues` (company_admin only)

#### Operations
- Liveness probe: `GET /health`
- Readiness probe: `GET /health/deep` (MongoDB + Redis latency checks)
- Structured JSON logging via Pino
- Graceful shutdown with 30-second drain timeout
- Dockerfile for API and web applications

[0.1.0]: https://github.com/leaveflow/leaveflow/releases/tag/v0.1.0
