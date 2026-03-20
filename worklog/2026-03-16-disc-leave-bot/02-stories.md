# Stage 2: User Stories & Acceptance Criteria

**Agent**: product-owner
**Model**: opus
**Run**: 2026-03-16-disc-leave-bot
**Date**: 2026-03-16

---

## Table of Contents

1. [Epic Breakdown](#epic-breakdown)
2. [Story Details](#story-details)
3. [MoSCoW Prioritization](#moscow-prioritization)
4. [Sprint Plan](#sprint-plan)
5. [Open Questions Resolved](#open-questions-resolved)
6. [Edge Cases Identified](#edge-cases-identified)
7. [Definition of Done](#definition-of-done)
8. [Definition of Ready](#definition-of-ready)

---

## Epic Breakdown

| Epic ID | Epic Name | Story Count | MVP Scope |
|---------|-----------|-------------|-----------|
| E1 | Platform Foundation & Multi-Tenancy | 5 | Must Have |
| E2 | Bot Interface (Slack) | 7 | Must Have |
| E3 | Bot Interface (Teams) | 4 | Must Have |
| E4 | Approval Flow Engine | 7 | Must Have |
| E5 | Leave Policy Management | 6 | Must/Should |
| E6 | Team & Employee Management | 5 | Must Have |
| E7 | HR Dashboard (Web) | 6 | Must/Should |
| E8 | Calendar Integrations | 3 | Should Have |
| E9 | Notifications & Alerts | 4 | Must/Should |
| E10 | Billing & Pricing | 3 | Must Have |

**Total**: 50 stories

---

## Story Details

---

### EPIC E1: Platform Foundation & Multi-Tenancy

---

#### LF-001: Company Registration and Workspace Setup

**User Story**
As a Company Admin (P5),
I want to register my company on LeaveFlow and connect it to my Slack or Teams workspace,
so that my organization can start using the leave management system.

**Acceptance Criteria**
- [ ] GIVEN a new user visits the LeaveFlow website, WHEN they click "Get Started", THEN they see a registration form requesting company name, admin email, and password
- [ ] GIVEN a user completes registration, WHEN they submit the form, THEN a new tenant is created with a unique workspace ID and the user is assigned the Company Admin role
- [ ] GIVEN a registered Company Admin, WHEN they connect their Slack workspace via OAuth, THEN the LeaveFlow Slack bot is installed in their workspace
- [ ] GIVEN a registered Company Admin, WHEN they connect their Teams tenant via OAuth, THEN the LeaveFlow Teams bot is installed in their tenant
- [ ] GIVEN workspace connection succeeds, WHEN the admin returns to the web dashboard, THEN they see a guided setup wizard (add employees, configure leave types, set up a workflow)

**Edge Cases**
- [ ] WHEN a user attempts to register with an email domain already associated with an existing tenant, THEN show a message: "Your organization already has a LeaveFlow account. Contact your admin."
- [ ] WHEN Slack/Teams OAuth fails or is canceled, THEN display a clear error with a "Retry" button and troubleshooting link
- [ ] WHEN the Slack workspace has over 500 members, THEN import is paginated and shows progress

**Technical Notes**
- Use Firebase Auth for user authentication
- Multi-tenant data isolation via tenant ID on all database documents
- Slack OAuth uses Bot Token Scopes; Teams uses Microsoft Graph delegated permissions
- Store encrypted tokens per tenant

**Size**: L
**Priority**: Must Have (P1)
**Dependencies**: None (foundational)

---

#### LF-002: User Authentication and Role-Based Access

**User Story**
As a Company Admin (P5),
I want to invite team members and assign roles (Employee, Manager, HR Admin),
so that each user has appropriate access to LeaveFlow features.

**Acceptance Criteria**
- [ ] GIVEN a Company Admin is logged in, WHEN they navigate to Settings > Users, THEN they see a list of all users in their tenant with their roles
- [ ] GIVEN a Company Admin, WHEN they click "Invite User" and enter an email + role, THEN an invitation email is sent with a unique signup link
- [ ] GIVEN an invited user clicks the signup link, WHEN they complete registration, THEN they are added to the tenant with the pre-assigned role
- [ ] GIVEN a user with the Employee role, WHEN they access the web dashboard, THEN they can only see their own leave data, balance, and team calendar
- [ ] GIVEN a user with the HR Admin role, WHEN they access the web dashboard, THEN they can see all employees, all requests, and policy configuration
- [ ] GIVEN a user with the Manager role, WHEN they access the web dashboard, THEN they can see their direct reports' leave data and pending approvals for their team

**Edge Cases**
- [ ] WHEN an invitation link is used after 7 days, THEN it is expired and the user sees "This invitation has expired. Ask your admin for a new one."
- [ ] WHEN a user is removed from the tenant, THEN their active sessions are invalidated and bot access is revoked
- [ ] WHEN the last Company Admin tries to remove themselves, THEN the action is blocked with a message: "You must assign another admin before removing yourself."

**Technical Notes**
- Roles: company_admin, hr_admin, manager, employee
- Firebase Auth custom claims for role enforcement
- API middleware checks tenant ID + role on every request

**Size**: M
**Priority**: Must Have (P1)
**Dependencies**: LF-001

---

#### LF-003: Web Application Shell and Navigation

**User Story**
As any authenticated user,
I want a web application with navigation appropriate to my role,
so that I can access the features I need without clutter.

**Acceptance Criteria**
- [ ] GIVEN an authenticated user, WHEN they load the web app, THEN the sidebar navigation shows only links relevant to their role
- [ ] GIVEN an Employee, WHEN they see the sidebar, THEN it contains: My Leaves, Team Calendar, My Profile
- [ ] GIVEN a Manager, WHEN they see the sidebar, THEN it also contains: Approvals, My Team
- [ ] GIVEN an HR Admin, WHEN they see the sidebar, THEN it also contains: All Employees, Leave Policies, Workflows, Reports
- [ ] GIVEN a Company Admin, WHEN they see the sidebar, THEN it also contains: Settings, Billing, Integrations

**Edge Cases**
- [ ] WHEN a user's role changes while they are logged in, THEN navigation updates on the next page load without requiring logout

**Technical Notes**
- Angular 17+ with lazy-loaded feature modules per role
- Route guards enforce role-based access server-side as well

**Size**: M
**Priority**: Must Have (P1)
**Dependencies**: LF-002

---

#### LF-004: Tenant Settings and Company Profile

**User Story**
As a Company Admin (P5),
I want to configure my company profile (name, timezone, fiscal year start, work week),
so that LeaveFlow calculations align with our company calendar.

**Acceptance Criteria**
- [ ] GIVEN a Company Admin, WHEN they navigate to Settings > Company, THEN they see editable fields: company name, default timezone, fiscal year start month, work week days (checkboxes for Mon-Sun)
- [ ] GIVEN a Company Admin edits the default timezone, WHEN they save, THEN all date displays and calculations use the new timezone unless overridden by employee-level timezone
- [ ] GIVEN a Company Admin sets fiscal year to April, WHEN accrual calculations run, THEN they use April-March as the leave year
- [ ] GIVEN a Company Admin sets work week to Mon-Fri, WHEN an employee requests leave spanning a weekend, THEN weekend days are excluded from the leave day count

**Edge Cases**
- [ ] WHEN work week configuration changes mid-year, THEN only future requests are affected; existing approved requests are not recalculated
- [ ] WHEN an employee is in a different timezone than the company default, THEN their leave dates are interpreted in their local timezone

**Technical Notes**
- Store timezone as IANA timezone string (e.g., "America/New_York")
- Work week stored as array of ISO day numbers [1,2,3,4,5]

**Size**: S
**Priority**: Must Have (P2)
**Dependencies**: LF-001

---

#### LF-005: API Foundation and Rate Limiting

**User Story**
As a developer building the LeaveFlow platform,
I want a well-structured REST API with authentication, validation, and rate limiting,
so that all clients (web, bot) interact through a secure, consistent interface.

**Acceptance Criteria**
- [ ] GIVEN any API request, WHEN the request lacks a valid auth token, THEN return 401 Unauthorized
- [ ] GIVEN any API request, WHEN the auth token's tenant does not match the requested resource, THEN return 403 Forbidden
- [ ] GIVEN any API request with invalid body, WHEN validation fails, THEN return 400 with structured error messages indicating which fields failed
- [ ] GIVEN a tenant on the Free plan, WHEN they exceed 100 API requests per minute, THEN return 429 Too Many Requests with Retry-After header
- [ ] GIVEN any successful API response, WHEN data is returned, THEN it follows the envelope format: { success, data, error, meta }

**Edge Cases**
- [ ] WHEN a request targets a non-existent resource, THEN return 404 with a user-friendly message (no stack traces or internal IDs leaked)

**Technical Notes**
- Express.js middleware chain: auth -> tenant isolation -> validation -> rate limit -> handler
- Use Joi or Zod for request validation schemas
- Rate limiting via Redis or in-memory store

**Size**: M
**Priority**: Must Have (P1)
**Dependencies**: LF-001

---

### EPIC E2: Bot Interface (Slack)

---

#### LF-010: Slack Bot Installation and Onboarding

**User Story**
As a Company Admin (P5),
I want to install the LeaveFlow Slack bot in my workspace,
so that employees can interact with it to manage leave.

**Acceptance Criteria**
- [ ] GIVEN a Company Admin clicks "Add to Slack" on the web dashboard, WHEN OAuth flow completes, THEN the bot is installed in the workspace and visible in the app list
- [ ] GIVEN the bot is newly installed, WHEN an admin opens the bot DM, THEN the bot sends a welcome message with a quick-start guide and link to web setup
- [ ] GIVEN the bot is installed, WHEN any workspace member opens a DM with the bot, THEN the bot responds with a brief intro and available commands

**Edge Cases**
- [ ] WHEN the bot is uninstalled from Slack, THEN the web dashboard shows "Slack: Disconnected" with a "Reconnect" button
- [ ] WHEN the Slack workspace uses Enterprise Grid, THEN the bot is installed at the workspace level, not the org level (MVP limitation)

**Technical Notes**
- Use Slack Bolt framework for event handling
- Store bot token and team ID per tenant
- Listen for `app_uninstalled` event to update connection status

**Size**: M
**Priority**: Must Have (P1)
**Dependencies**: LF-001

---

#### LF-011: Request Leave via Slack Bot

**User Story**
As an Employee (P1),
I want to request leave by typing `/leave` in Slack,
so that I can submit a leave request without leaving my work tool.

**Acceptance Criteria**
- [ ] GIVEN an employee in a connected workspace, WHEN they type `/leave`, THEN a Slack modal opens with fields: leave type (dropdown), start date (date picker), end date (date picker), half-day toggle (start/end day), reason (optional text)
- [ ] GIVEN the modal is open, WHEN the employee selects a leave type, THEN the available balance for that type is displayed in the modal
- [ ] GIVEN the employee fills in valid dates, WHEN they click "Submit", THEN a leave request is created with status "pending" and the bot sends a confirmation DM: "Your [type] request for [dates] has been submitted. Approval chain: [Approver1] -> [Approver2]."
- [ ] GIVEN the request is submitted, WHEN the first approver in the chain is identified, THEN that approver receives a DM with the request details and Approve/Reject buttons
- [ ] GIVEN the employee requests 0 working days (e.g., Saturday-Sunday with Mon-Fri work week), WHEN they submit, THEN the modal shows a validation error: "Selected dates contain 0 working days."

**Edge Cases**
- [ ] WHEN the employee has insufficient balance for the requested type, THEN the modal shows a warning but still allows submission (unpaid leave fallback, configurable per policy)
- [ ] WHEN the employee has a pending request that overlaps with the new request dates, THEN the modal shows: "You have an overlapping request for [dates]. Please cancel it first or adjust your dates."
- [ ] WHEN the employee is not mapped to any team, THEN the bot responds: "You are not assigned to a team yet. Please contact your HR admin."
- [ ] WHEN the Slack API is temporarily unavailable, THEN the request is queued and processed when the API recovers, with the employee notified of the delay

**Technical Notes**
- Slack Block Kit for modal construction
- Slash command registered: `/leave`
- Date validation: start <= end, no past dates (except retroactive sick leave if policy allows)
- Calculate working days using company work week + public holidays

**Size**: L
**Priority**: Must Have (P1)
**Dependencies**: LF-005, LF-010, LF-030 (leave types), LF-040 (team mapping)

---

#### LF-012: Check Leave Balance via Slack Bot

**User Story**
As an Employee (P1),
I want to check my leave balance by typing `/leave balance` in Slack,
so that I know how many days I have available before making a request.

**Acceptance Criteria**
- [ ] GIVEN an employee in a connected workspace, WHEN they type `/leave balance`, THEN the bot sends an ephemeral message showing balance for each leave type: Type | Total | Used | Pending | Available
- [ ] GIVEN an employee has accrual-based leave, WHEN they check balance, THEN the displayed total reflects accrued-to-date, not full-year entitlement
- [ ] GIVEN an employee has carryover days, WHEN they check balance, THEN carryover is shown as a separate line with expiry date if applicable

**Edge Cases**
- [ ] WHEN an employee has no leave types assigned (new hire, policies not configured), THEN the bot responds: "No leave balances found. Your HR admin may need to set up your leave entitlements."
- [ ] WHEN balance data cannot be retrieved (API error), THEN the bot responds: "I could not retrieve your balance right now. Please try again in a moment."

**Technical Notes**
- Ephemeral messages visible only to the requesting user
- Balance calculation: entitlement + carryover - used - pending = available

**Size**: S
**Priority**: Must Have (P1)
**Dependencies**: LF-005, LF-010, LF-030

---

#### LF-013: Check Request Status via Slack Bot

**User Story**
As an Employee (P1),
I want to check the status of my leave requests by typing `/leave status` in Slack,
so that I can see where my request stands in the approval chain.

**Acceptance Criteria**
- [ ] GIVEN an employee, WHEN they type `/leave status`, THEN the bot shows their most recent 5 requests with: type, dates, status (pending/approved/rejected/cancelled), and current approver (if pending)
- [ ] GIVEN a request is pending at step 2 of 3, WHEN the employee views status, THEN the approval chain is displayed with checkmarks for completed steps and a pointer for the current step: "[x] Team Lead -> [current] Dept Head -> [ ] HR"
- [ ] GIVEN no requests exist, WHEN the employee types `/leave status`, THEN the bot responds: "You have no leave requests. Use /leave to create one."

**Edge Cases**
- [ ] WHEN the employee has more than 5 recent requests, THEN a "View all in web app" link is appended

**Technical Notes**
- Status display uses Slack Block Kit sections with emoji indicators
- Deep link to web app for full history

**Size**: S
**Priority**: Must Have (P1)
**Dependencies**: LF-005, LF-010, LF-011

---

#### LF-014: Cancel Leave Request via Slack Bot

**User Story**
As an Employee (P1),
I want to cancel a pending or future approved leave request via the Slack bot,
so that I can change my plans without contacting HR.

**Acceptance Criteria**
- [ ] GIVEN an employee, WHEN they type `/leave cancel`, THEN the bot shows a list of their cancellable requests (pending or approved with future start date) as a dropdown
- [ ] GIVEN the employee selects a request, WHEN they confirm cancellation, THEN the request status changes to "cancelled" and the balance is restored
- [ ] GIVEN a request was already approved, WHEN the employee cancels it, THEN all approvers in the chain receive a notification: "[Employee] cancelled their approved [type] leave for [dates]"
- [ ] GIVEN a request is pending with an approver, WHEN the employee cancels it, THEN the approver's pending DM is updated to show "Request cancelled by employee"

**Edge Cases**
- [ ] WHEN an approved request has a start date in the past (leave already started), THEN cancellation is blocked: "This leave has already started. Contact HR to modify."
- [ ] WHEN the employee has no cancellable requests, THEN the bot responds: "You have no requests that can be cancelled."

**Technical Notes**
- Cancellation triggers balance recalculation
- Audit log entry for every cancellation

**Size**: M
**Priority**: Must Have (P2)
**Dependencies**: LF-011

---

#### LF-015: One-Click Approve/Reject from Slack

**User Story**
As a Manager (P2),
I want to approve or reject a leave request directly from a Slack DM notification,
so that I can act on requests in seconds without opening a browser.

**Acceptance Criteria**
- [ ] GIVEN a leave request is submitted, WHEN the current approver is identified, THEN they receive a Slack DM with request details (employee name, type, dates, days count, reason) and two buttons: "Approve" and "Reject"
- [ ] GIVEN an approver clicks "Approve", WHEN the request has more approvers in the chain, THEN the request moves to the next approver and the employee is notified: "Your request was approved by [approver]. Now pending with [next approver]."
- [ ] GIVEN an approver clicks "Approve", WHEN this is the final approver, THEN the request status becomes "approved" and the employee is notified: "Your [type] leave for [dates] has been approved!"
- [ ] GIVEN an approver clicks "Reject", WHEN they click it, THEN a modal opens requesting a rejection reason (mandatory text field)
- [ ] GIVEN the approver submits a rejection reason, WHEN saved, THEN the request status becomes "rejected" and the employee is notified: "Your request was rejected by [approver]. Reason: [reason]"
- [ ] GIVEN an approver has already acted on a request, WHEN they click a button again, THEN the message shows: "You have already [approved/rejected] this request."

**Edge Cases**
- [ ] WHEN the approver is not a Slack user (e.g., web-only user), THEN the approval notification is sent via email with action links
- [ ] WHEN the approver clicks the button after the request was cancelled by the employee, THEN the message shows: "This request was cancelled by the employee."
- [ ] WHEN the Slack message is older than 30 days, THEN interactive buttons may expire; show a "View in web app" fallback link

**Technical Notes**
- Slack interactive messages with action IDs
- Idempotent approval/rejection (handle double-clicks)
- Message update after action to replace buttons with result text

**Size**: L
**Priority**: Must Have (P1)
**Dependencies**: LF-011, LF-020

---

#### LF-016: Slack Bot Help and Error Handling

**User Story**
As an Employee (P1),
I want the Slack bot to guide me when I use unknown commands or encounter errors,
so that I always know what I can do and how to get help.

**Acceptance Criteria**
- [ ] GIVEN a user types `/leave help`, WHEN the bot receives the command, THEN it lists all available commands with brief descriptions
- [ ] GIVEN a user types an unrecognized subcommand (e.g., `/leave foobar`), WHEN the bot receives it, THEN it responds: "Unknown command. Here are available commands:" followed by the help text
- [ ] GIVEN any bot interaction fails with a server error, WHEN the error occurs, THEN the bot responds: "Something went wrong. Please try again. If the issue persists, contact your admin." and logs the error server-side

**Edge Cases**
- [ ] WHEN a user DMs the bot with free-text instead of a command, THEN the bot responds with the help text (natural language processing is Phase 3)

**Size**: S
**Priority**: Must Have (P2)
**Dependencies**: LF-010

---

### EPIC E3: Bot Interface (Teams)

---

#### LF-017: Teams Bot Installation and Onboarding

**User Story**
As a Company Admin (P5),
I want to install the LeaveFlow Teams bot in my Microsoft Teams tenant,
so that employees on Teams can use the same leave management features.

**Acceptance Criteria**
- [ ] GIVEN a Company Admin clicks "Add to Teams" on the web dashboard, WHEN the Microsoft OAuth flow completes, THEN the bot is available in Teams for the tenant
- [ ] GIVEN the bot is installed, WHEN any user searches for "LeaveFlow" in the Teams app catalog, THEN they can find and open a chat with the bot
- [ ] GIVEN the bot is newly installed, WHEN an admin opens the bot chat, THEN it sends a welcome card with getting-started instructions

**Edge Cases**
- [ ] WHEN Teams admin policies restrict third-party app installation, THEN the admin sees a clear error message explaining the required permissions

**Technical Notes**
- Microsoft Bot Framework SDK
- Teams bot uses Adaptive Cards for rich interactions
- Store conversation references per user for proactive messaging

**Size**: M
**Priority**: Must Have (P1)
**Dependencies**: LF-001

---

#### LF-018: Request Leave via Teams Bot

**User Story**
As an Employee (P1),
I want to request leave by messaging the LeaveFlow bot in Teams,
so that I have the same experience as Slack users.

**Acceptance Criteria**
- [ ] GIVEN an employee opens the LeaveFlow bot chat in Teams, WHEN they type "request leave" or use the command menu, THEN an Adaptive Card is displayed with: leave type dropdown, start/end date pickers, half-day toggle, reason field
- [ ] GIVEN the employee fills the card and clicks Submit, WHEN validation passes, THEN a leave request is created and the bot sends a confirmation card with approval chain info
- [ ] GIVEN validation fails (0 working days, overlapping request), WHEN the submit action processes, THEN the bot replies with an error card explaining the issue

**Edge Cases**
- [ ] Same edge cases as LF-011 (insufficient balance, no team mapping, overlapping requests)

**Technical Notes**
- Adaptive Cards v1.5 for Teams compatibility
- Shared business logic with Slack bot (platform-agnostic service layer)

**Size**: L
**Priority**: Must Have (P1)
**Dependencies**: LF-005, LF-017, LF-030, LF-040

---

#### LF-019: Check Balance and Status via Teams Bot

**User Story**
As an Employee (P1),
I want to check my leave balance and request status via the Teams bot,
so that I have feature parity with Slack without switching tools.

**Acceptance Criteria**
- [ ] GIVEN an employee types "balance" in the Teams bot chat, WHEN the bot processes it, THEN an Adaptive Card is returned showing balance per leave type (same data as LF-012)
- [ ] GIVEN an employee types "status" in the Teams bot chat, WHEN the bot processes it, THEN an Adaptive Card is returned showing recent requests with approval chain progress (same data as LF-013)

**Edge Cases**
- [ ] Same edge cases as LF-012 and LF-013

**Size**: M
**Priority**: Must Have (P1)
**Dependencies**: LF-017, LF-030

---

#### LF-019B: One-Click Approve/Reject from Teams

**User Story**
As a Manager (P2),
I want to approve or reject leave requests directly from a Teams notification card,
so that I can act on requests without switching to a browser.

**Acceptance Criteria**
- [ ] GIVEN a leave request is pending, WHEN the current approver is a Teams user, THEN they receive a proactive Adaptive Card in the bot chat with request details and Approve/Reject buttons
- [ ] GIVEN an approver clicks "Approve" or "Reject", WHEN the action is processed, THEN behavior matches LF-015 (chain progression, employee notification, mandatory rejection reason)
- [ ] GIVEN an action is taken, WHEN the card is updated, THEN buttons are replaced with the action result text

**Edge Cases**
- [ ] Same edge cases as LF-015

**Technical Notes**
- Proactive messaging requires stored conversation references
- Teams Adaptive Card actions use Action.Execute for bot-handled responses

**Size**: M
**Priority**: Must Have (P1)
**Dependencies**: LF-017, LF-020

---

### EPIC E4: Approval Flow Engine

---

#### LF-020: Sequential Approval Chain Engine

**User Story**
As the LeaveFlow system,
I want to process leave requests through a configurable sequential approval chain,
so that requests are routed to the correct approvers in order.

**Acceptance Criteria**
- [ ] GIVEN a workflow with 3 approval steps, WHEN a request is submitted, THEN step 1 approver is notified; step 2 and 3 are not notified yet
- [ ] GIVEN step 1 approver approves, WHEN the system processes the approval, THEN step 2 approver is notified and the request status remains "pending"
- [ ] GIVEN the final step approver approves, WHEN the system processes it, THEN the request status changes to "approved" and the employee is notified
- [ ] GIVEN any approver in the chain rejects, WHEN the rejection is processed, THEN the request status changes to "rejected", remaining steps are skipped, and the employee is notified
- [ ] GIVEN a workflow with 1 step (simple approve), WHEN the approver approves, THEN the request is immediately "approved"

**Edge Cases**
- [ ] WHEN an approver in the chain has been deactivated or removed from the company, THEN the system skips that step and notifies HR of a workflow misconfiguration
- [ ] WHEN a workflow has 0 steps (auto-approve), THEN the request is immediately approved upon submission
- [ ] WHEN a request is submitted and the workflow for the employee's team does not exist, THEN the request is flagged for HR manual review

**Technical Notes**
- Approval chain stored as ordered array of steps on the workflow document
- Each request tracks current_step index and per-step action log
- State machine: pending -> (per step: awaiting -> approved/rejected) -> final status

**Size**: L
**Priority**: Must Have (P1)
**Dependencies**: LF-005, LF-021

---

#### LF-021: Workflow Configuration (Form-Based)

**User Story**
As an HR Admin (P3),
I want to create and edit approval workflows using a form-based web interface,
so that I can define approval chains for different teams without drag-and-drop.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin navigates to Workflows, WHEN they click "Create Workflow", THEN a form appears with: workflow name, description, and an ordered list of approval steps
- [ ] GIVEN the form, WHEN the admin adds an approval step, THEN they can choose the approver type: "Specific User" (dropdown) or "Role: Direct Manager" (auto-resolved at request time)
- [ ] GIVEN the admin has defined 1-5 steps, WHEN they click "Save", THEN the workflow is created and available for team assignment
- [ ] GIVEN an existing workflow is assigned to teams, WHEN the admin edits it, THEN a warning is shown: "Changes will apply to all new requests. Existing pending requests use the original workflow."
- [ ] GIVEN an admin, WHEN they click "Clone" on an existing workflow, THEN a copy is created with the name "[Original Name] (Copy)" that they can modify

**Edge Cases**
- [ ] WHEN an admin attempts to create a workflow with more than 5 steps, THEN the UI prevents adding more steps with a message: "MVP supports up to 5 approval levels."
- [ ] WHEN a workflow is deleted but teams are assigned to it, THEN deletion is blocked: "Remove all team assignments before deleting this workflow."
- [ ] WHEN the specific user selected as an approver is later deactivated, THEN the workflow shows a warning icon next to that step

**Technical Notes**
- Workflow schema: { id, name, tenantId, steps: [{ order, approverType, approverId?, role? }] }
- Pre-built templates: "Simple (1 step)", "Two-Level", "Three-Level with HR"

**Size**: M
**Priority**: Must Have (P1)
**Dependencies**: LF-003, LF-002

---

#### LF-022: Workflow Templates

**User Story**
As an HR Admin (P3),
I want to start from pre-built workflow templates,
so that I can quickly set up common approval patterns without building from scratch.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin creates a new workflow, WHEN they see the creation form, THEN a "Start from Template" option is available with at least 3 templates
- [ ] GIVEN the templates, WHEN the admin selects "Simple (Manager Only)", THEN a 1-step workflow is pre-filled with approver type "Direct Manager"
- [ ] GIVEN the templates, WHEN the admin selects "Two-Level (Manager + HR)", THEN a 2-step workflow is pre-filled
- [ ] GIVEN the templates, WHEN the admin selects "Three-Level (Lead + Dept Head + HR)", THEN a 3-step workflow is pre-filled
- [ ] GIVEN a template is selected, WHEN the admin reviews it, THEN they can modify any step before saving

**Edge Cases**
- [ ] WHEN the tenant has no HR Admin users defined, THEN templates referencing "HR" role show a warning: "Assign an HR Admin to use this template."

**Size**: S
**Priority**: Should Have (P3)
**Dependencies**: LF-021

---

#### LF-023: Auto-Approval Rules

**User Story**
As an HR Admin (P3),
I want to configure auto-approval rules for specific leave types or durations,
so that routine requests (e.g., 1-day sick leave) do not burden approvers.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin navigates to Leave Policies, WHEN they edit a leave type, THEN there is an "Auto-Approval" section with configurable conditions
- [ ] GIVEN auto-approval is enabled for sick leave up to 2 days, WHEN an employee submits a 1-day sick leave, THEN the request is automatically approved and the employee is notified: "Your request was auto-approved per company policy."
- [ ] GIVEN auto-approval is enabled for sick leave up to 2 days, WHEN an employee submits a 3-day sick leave, THEN the request follows the normal approval workflow
- [ ] GIVEN auto-approval fires, WHEN the request is auto-approved, THEN the audit log records "Auto-approved by system policy [policy name]"

**Edge Cases**
- [ ] WHEN auto-approval is combined with minimum team coverage rules, THEN team coverage is checked first; if violated, the request goes to manual approval even if auto-approval conditions are met
- [ ] WHEN auto-approval rules change, THEN only future requests are affected

**Size**: M
**Priority**: Should Have (P3)
**Dependencies**: LF-020, LF-030

---

#### LF-024: Auto-Escalation on Timeout

**User Story**
As an HR Admin (P3),
I want pending approvals to auto-escalate if not acted upon within a configurable time,
so that requests do not get stuck waiting indefinitely.

**Acceptance Criteria**
- [ ] GIVEN a workflow step, WHEN the HR Admin configures it, THEN there is an "Escalation timeout" field (default: 48 hours, configurable: 4h-168h)
- [ ] GIVEN an approver has not acted within the timeout, WHEN the deadline passes, THEN the system either escalates to the next step's approver or sends a reminder (configurable behavior)
- [ ] GIVEN escalation occurs, WHEN the request moves to the next approver, THEN both the original approver and the employee are notified: "Request escalated due to timeout."
- [ ] GIVEN escalation is set to "reminder" mode, WHEN the timeout passes, THEN the approver receives a reminder notification and the timeout resets (max 3 reminders before escalation)

**Edge Cases**
- [ ] WHEN the escalation target is also the timed-out approver (single-step workflow), THEN send a reminder to the approver and notify HR Admin
- [ ] WHEN the approver is on a configured OOO delegation period, THEN escalation routes to the delegate instead

**Technical Notes**
- Background job (cron or message queue) checks for overdue approvals every 15 minutes
- Store deadline timestamp per approval step on the request document

**Size**: M
**Priority**: Should Have (P4)
**Dependencies**: LF-020

---

#### LF-025: Delegation of Approval Authority

**User Story**
As a Manager (P2),
I want to delegate my approval authority to a colleague when I am out of office,
so that my team's leave requests are not blocked by my absence.

**Acceptance Criteria**
- [ ] GIVEN a Manager, WHEN they navigate to Settings > Delegation in the web app, THEN they can set a delegate (another user) with start/end dates
- [ ] GIVEN delegation is active, WHEN a leave request reaches the delegating manager, THEN the delegate receives the approval notification instead
- [ ] GIVEN delegation is active, WHEN the delegate approves/rejects, THEN the audit log records: "Approved by [delegate] on behalf of [manager]"
- [ ] GIVEN delegation end date has passed, WHEN a new request arrives, THEN it routes to the original manager

**Edge Cases**
- [ ] WHEN the delegate is also an approver in the same chain (different step), THEN they approve both steps separately
- [ ] WHEN a manager sets a delegate who does not have Manager role, THEN the system warns: "This user does not have manager permissions. They will only be able to approve requests delegated to them."

**Size**: M
**Priority**: Could Have (P5)
**Dependencies**: LF-020

---

#### LF-026: Reject with Mandatory Reason

**User Story**
As an Employee (P1),
I want to receive a clear reason when my leave request is rejected,
so that I understand the decision and can take appropriate action.

**Acceptance Criteria**
- [ ] GIVEN an approver clicks "Reject" on a request, WHEN the rejection form appears, THEN a reason text field is mandatory (min 10 characters)
- [ ] GIVEN a rejection reason is submitted, WHEN the employee is notified, THEN the notification includes the full rejection reason
- [ ] GIVEN a rejection, WHEN the employee views their request history, THEN the rejection reason is displayed alongside the request

**Edge Cases**
- [ ] WHEN the approver enters only whitespace or fewer than 10 characters, THEN validation fails: "Please provide a meaningful reason (at least 10 characters)."

**Size**: S
**Priority**: Must Have (P2)
**Dependencies**: LF-015 or LF-019B

---

### EPIC E5: Leave Policy Management

---

#### LF-030: Custom Leave Type Configuration

**User Story**
As an HR Admin (P3),
I want to create and configure custom leave types (vacation, sick, personal, etc.),
so that the system matches our company's specific leave categories.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin navigates to Leave Policies > Types, WHEN they click "Add Leave Type", THEN a form appears with: name, icon/color, paid/unpaid toggle, requires approval toggle, default annual entitlement (days), description
- [ ] GIVEN leave types are configured, WHEN an employee requests leave, THEN the leave type dropdown in the bot modal shows only active leave types
- [ ] GIVEN a leave type is set to "does not require approval", WHEN an employee submits a request of this type, THEN it is immediately approved (no workflow needed)
- [ ] GIVEN the default types, WHEN a new tenant is created, THEN seed types are pre-created: Vacation (paid, 20 days), Sick Leave (paid, 10 days), Personal (paid, 3 days), Unpaid Leave (unpaid, unlimited)

**Edge Cases**
- [ ] WHEN an HR Admin deactivates a leave type that has pending requests, THEN pending requests continue through the workflow but no new requests of that type can be submitted
- [ ] WHEN all leave types are deactivated, THEN the bot responds: "No leave types are currently available. Contact your HR admin."

**Technical Notes**
- Leave type schema: { id, tenantId, name, icon, color, isPaid, requiresApproval, defaultEntitlement, accrualRule, isActive }

**Size**: M
**Priority**: Must Have (P1)
**Dependencies**: LF-003

---

#### LF-031: Leave Balance Management

**User Story**
As an HR Admin (P3),
I want to manage individual employee leave balances (view, adjust, bulk-set),
so that I can handle entitlement exceptions and corrections.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin views an employee's profile, WHEN they click "Leave Balances", THEN they see current balance per leave type: entitlement, accrued-to-date, used, pending, available
- [ ] GIVEN an HR Admin, WHEN they click "Adjust Balance" on a leave type, THEN they can add or subtract days with a mandatory reason (e.g., "Joining bonus: +5 vacation days")
- [ ] GIVEN an adjustment is made, WHEN saved, THEN the audit log records the change with the reason, admin user, and timestamp
- [ ] GIVEN a new leave year starts, WHEN carryover rules are configured, THEN balances are automatically rolled over (up to the max carryover limit) and the new year entitlement is set

**Edge Cases**
- [ ] WHEN an admin adjusts balance below the already-used amount, THEN a warning is shown: "This employee has already used more than the new balance. Negative balance will be recorded."
- [ ] WHEN a mid-year hire starts, THEN their entitlement is pro-rated based on their start date and the fiscal year

**Size**: M
**Priority**: Must Have (P2)
**Dependencies**: LF-030, LF-040

---

#### LF-032: Accrual Rules Configuration

**User Story**
As an HR Admin (P3),
I want to configure how leave accrues over time (monthly, quarterly, annual, front-loaded),
so that our leave policy accurately reflects our company rules.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin edits a leave type, WHEN they open the "Accrual" section, THEN they can choose: Front-loaded (full balance on day 1), Monthly (1/12 per month), Quarterly (1/4 per quarter), or Custom (specific day-of-month)
- [ ] GIVEN monthly accrual is set for Vacation (20 days/year), WHEN the 1st of each month arrives, THEN 1.67 days are added to each employee's balance for that type
- [ ] GIVEN front-loaded accrual, WHEN a new leave year starts, THEN the full entitlement is available immediately
- [ ] GIVEN a mid-year hire with monthly accrual, WHEN their start date is June 15, THEN they accrue from July 1 onward (prorated for remaining months)

**Edge Cases**
- [ ] WHEN accrual results in fractional days (e.g., 1.67), THEN the system stores and displays to 2 decimal places; requests are in whole or half-day increments
- [ ] WHEN accrual rules change mid-year, THEN already-accrued balance is preserved; future accruals use the new rule

**Technical Notes**
- Background job runs accrual calculations on the 1st of each month (or configured day)
- Store accrual ledger per employee per leave type for audit trail

**Size**: M
**Priority**: Must Have (P2)
**Dependencies**: LF-030

---

#### LF-033: Public Holiday Calendar

**User Story**
As an HR Admin (P3),
I want to configure public holidays for our company/country,
so that holidays are excluded from leave day calculations.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin navigates to Leave Policies > Holidays, WHEN they select a country, THEN public holidays for the current and next year are auto-populated from a holiday data source
- [ ] GIVEN holidays are configured, WHEN an employee requests leave spanning a public holiday, THEN the holiday is excluded from the working day count
- [ ] GIVEN an HR Admin, WHEN they add a custom company holiday (e.g., Company Anniversary), THEN it is added to the calendar and excluded from working day counts
- [ ] GIVEN multiple office locations in different countries, WHEN the admin assigns holiday calendars per location, THEN employees in each location have the correct holidays applied

**Edge Cases**
- [ ] WHEN a public holiday falls on a weekend (non-work day), THEN it is not counted as a holiday (no "substitute day" logic in MVP unless manually added)
- [ ] WHEN the external holiday data source is unavailable, THEN the system uses a cached copy and notifies the admin: "Holiday data may be outdated. Last updated: [date]."

**Technical Notes**
- Use Nager.Date API or similar for public holiday data
- Cache holiday data locally per country per year

**Size**: M
**Priority**: Must Have (P2)
**Dependencies**: LF-004

---

#### LF-034: Carryover Rules

**User Story**
As an HR Admin (P3),
I want to configure carryover rules (max days, expiry date),
so that unused leave is handled according to company policy.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin edits a leave type, WHEN they open the "Carryover" section, THEN they can configure: allow carryover (yes/no), max carryover days, carryover expiry (e.g., "March 31 of next year")
- [ ] GIVEN carryover is enabled with max 5 days, WHEN a leave year ends and an employee has 8 unused days, THEN 5 days carry over and 3 days are forfeited
- [ ] GIVEN carried-over days have an expiry of March 31, WHEN March 31 arrives, THEN unused carryover days expire and the employee's balance is reduced
- [ ] GIVEN carryover occurs, WHEN the employee checks their balance, THEN carryover days are shown separately: "Carryover: 5 days (expires Mar 31)"

**Edge Cases**
- [ ] WHEN carryover rules are changed after carryover has already occurred for the year, THEN existing carryover is preserved; new rules apply to the next carryover cycle

**Size**: S
**Priority**: Should Have (P3)
**Dependencies**: LF-030, LF-032

---

#### LF-035: Blackout Periods

**User Story**
As an HR Admin (P3),
I want to define blackout periods when leave cannot be requested,
so that critical business periods are protected.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin navigates to Leave Policies > Blackout Periods, WHEN they click "Add Blackout", THEN they can define: name, start date, end date, affected teams (all or specific), affected leave types (all or specific)
- [ ] GIVEN a blackout period exists, WHEN an employee requests leave overlapping the blackout period, THEN the request is blocked with a message: "Leave cannot be requested during [blackout name] ([dates])."
- [ ] GIVEN a blackout applies only to specific teams, WHEN an employee on a non-affected team requests leave during that period, THEN the request proceeds normally

**Edge Cases**
- [ ] WHEN a blackout period is created after requests have already been approved for those dates, THEN existing approved requests are not affected, but a warning is shown to the HR Admin: "[N] approved requests overlap with this blackout period."

**Size**: S
**Priority**: Could Have (P5)
**Dependencies**: LF-030

---

### EPIC E6: Team & Employee Management

---

#### LF-040: Employee-to-Team Mapping

**User Story**
As an HR Admin (P3),
I want to assign employees to teams and map teams to approval workflows,
so that each employee's leave request follows the correct approval chain.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin navigates to Teams, WHEN they click "Create Team", THEN they can set a team name, department, and assign a workflow from the list of configured workflows
- [ ] GIVEN a team exists, WHEN the admin adds employees to the team (search by name/email), THEN those employees are associated with the team and its workflow
- [ ] GIVEN an employee is assigned to a team, WHEN they submit a leave request, THEN the request follows the workflow assigned to their team
- [ ] GIVEN an employee is moved from Team A to Team B, WHEN they submit a new request, THEN it follows Team B's workflow (pending requests under Team A's workflow continue as-is)

**Edge Cases**
- [ ] WHEN an employee is not assigned to any team, THEN they cannot submit leave requests via the bot; the bot responds: "You are not assigned to a team. Contact your HR admin."
- [ ] WHEN a team has no workflow assigned, THEN requests from that team are flagged for HR manual review
- [ ] WHEN a team is deleted, THEN its employees become unassigned and are notified

**Technical Notes**
- Employee can belong to only 1 team in MVP (multi-team is Phase 2)
- Team schema: { id, tenantId, name, department, workflowId, memberIds }

**Size**: M
**Priority**: Must Have (P1)
**Dependencies**: LF-002, LF-021

---

#### LF-041: Bulk Employee Import via CSV

**User Story**
As a Company Admin (P5),
I want to import employees from a CSV file,
so that I can onboard the entire company quickly without adding users one by one.

**Acceptance Criteria**
- [ ] GIVEN a Company Admin navigates to Settings > Import, WHEN they click "Import CSV", THEN a file upload form is shown with a downloadable CSV template
- [ ] GIVEN the template, WHEN the admin fills it with columns: email, first name, last name, team, role, start date, timezone, THEN the file is accepted for import
- [ ] GIVEN a valid CSV is uploaded, WHEN the import processes, THEN each row creates or updates an employee record, assigns them to the specified team, and sends an invitation email
- [ ] GIVEN the import completes, WHEN results are displayed, THEN a summary shows: X created, Y updated, Z errors (with row numbers and error descriptions)

**Edge Cases**
- [ ] WHEN a CSV contains duplicate emails, THEN deduplicate and report: "Row [N]: Duplicate email, skipped."
- [ ] WHEN a CSV references a team that does not exist, THEN the row fails: "Row [N]: Team '[name]' not found."
- [ ] WHEN the CSV has more than 10,000 rows, THEN reject with: "Maximum 10,000 employees per import."
- [ ] WHEN the CSV is malformed (wrong encoding, missing headers), THEN reject with a clear error before processing

**Technical Notes**
- Parse CSV server-side with streaming (do not load entire file into memory)
- Validate all rows before processing any (atomic: all succeed or report errors)
- Use background job for imports > 100 rows

**Size**: M
**Priority**: Must Have (P2)
**Dependencies**: LF-002, LF-040

---

#### LF-042: Employee Self-Service Profile

**User Story**
As an Employee (P1),
I want to view my profile, leave history, and balances in the web app,
so that I have a complete view of my leave information.

**Acceptance Criteria**
- [ ] GIVEN an authenticated employee, WHEN they navigate to "My Leaves", THEN they see a list of all their leave requests with: type, dates, status, approver actions
- [ ] GIVEN the list, WHEN they click on a request, THEN a detail view shows the full approval chain with timestamps and any rejection reasons
- [ ] GIVEN an employee, WHEN they view "My Profile", THEN they see their team, manager, timezone, and leave balances
- [ ] GIVEN an employee, WHEN they view the team calendar, THEN they see a calendar view of their team members' approved absences (names visible, leave types hidden for privacy)

**Edge Cases**
- [ ] WHEN an employee has 100+ historical requests, THEN paginate the list with 20 items per page
- [ ] WHEN an employee's team has 50+ members, THEN the team calendar supports filtering by sub-group or search

**Size**: M
**Priority**: Must Have (P2)
**Dependencies**: LF-003, LF-030

---

#### LF-043: Manager Team View

**User Story**
As a Manager (P2),
I want to see my team's upcoming absences and pending approvals in the web app,
so that I can make informed approval decisions and plan team capacity.

**Acceptance Criteria**
- [ ] GIVEN a Manager, WHEN they navigate to "My Team", THEN they see a list of their direct reports with: name, current leave status (in/out), next upcoming leave
- [ ] GIVEN a Manager, WHEN they view the team calendar, THEN they see a visual calendar with all team members' approved and pending leaves
- [ ] GIVEN a Manager, WHEN they navigate to "Approvals", THEN they see all pending requests assigned to them with: employee name, type, dates, days count, submitted date
- [ ] GIVEN pending approvals, WHEN the Manager clicks Approve or Reject, THEN the same workflow as the bot (LF-015) is triggered from the web UI

**Edge Cases**
- [ ] WHEN a Manager manages multiple teams, THEN they can toggle between team views
- [ ] WHEN there are no pending approvals, THEN the page shows: "No pending approvals. You are all caught up."

**Size**: M
**Priority**: Must Have (P2)
**Dependencies**: LF-003, LF-040

---

#### LF-044: Slack User-to-Employee Mapping

**User Story**
As the system,
I want to automatically map Slack workspace users to LeaveFlow employee records,
so that bot interactions are correctly attributed to the right employee.

**Acceptance Criteria**
- [ ] GIVEN a Slack workspace is connected, WHEN an employee uses the bot for the first time, THEN the system attempts to match their Slack email to a LeaveFlow employee record
- [ ] GIVEN a match is found, WHEN the employee interacts with the bot, THEN all actions are attributed to their employee record
- [ ] GIVEN no match is found, WHEN the user tries to use a command, THEN the bot responds: "I could not find your LeaveFlow account. Please ensure your Slack email matches your company email, or ask your admin to link your accounts."
- [ ] GIVEN an HR Admin, WHEN they navigate to Settings > Integrations > Slack, THEN they can manually link Slack users to employee records for mismatched emails

**Edge Cases**
- [ ] WHEN a Slack user changes their email, THEN the mapping continues to work via Slack user ID (not email)
- [ ] WHEN a single Slack workspace has multiple LeaveFlow tenants (unlikely but possible), THEN the user is prompted to select their company

**Technical Notes**
- Primary mapping key: Slack user ID (stable across email changes)
- Initial matching: Slack profile email -> employee email
- Store mapping: { slackUserId, slackTeamId, tenantId, employeeId }

**Size**: S
**Priority**: Must Have (P2)
**Dependencies**: LF-010, LF-002

---

### EPIC E7: HR Dashboard (Web)

---

#### LF-050: Absence Calendar

**User Story**
As an HR Admin (P3),
I want to view a company-wide absence calendar,
so that I can see who is off and identify potential coverage issues.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin, WHEN they navigate to Dashboard > Calendar, THEN they see a monthly calendar view with all approved and pending absences
- [ ] GIVEN the calendar, WHEN absences are displayed, THEN each entry shows: employee name, leave type (color-coded), and status indicator (approved=solid, pending=striped)
- [ ] GIVEN the calendar, WHEN the admin uses filters, THEN they can filter by: team, department, leave type, status (approved/pending)
- [ ] GIVEN the calendar, WHEN the admin clicks on a day, THEN a panel shows the list of employees absent on that day with details

**Edge Cases**
- [ ] WHEN a company has 500+ employees, THEN the calendar defaults to the admin's department and requires filters to expand
- [ ] WHEN no absences exist for the displayed month, THEN the calendar shows an empty state: "No absences scheduled for this month."

**Size**: M
**Priority**: Must Have (P2)
**Dependencies**: LF-003

---

#### LF-051: Pending Approvals Overview

**User Story**
As an HR Admin (P3),
I want to see all pending approvals across the company with bottleneck detection,
so that I can identify stale requests and nudge approvers.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin, WHEN they navigate to Dashboard > Pending Approvals, THEN they see a list of all pending requests sorted by age (oldest first)
- [ ] GIVEN the list, WHEN a request has been pending for more than 48 hours, THEN it is highlighted with a "Stale" badge
- [ ] GIVEN a stale request, WHEN the admin clicks "Send Reminder", THEN a notification is sent to the current approver
- [ ] GIVEN the overview, WHEN the admin sees bottleneck stats, THEN a summary shows: "Top bottlenecks: [Approver A]: 5 pending, [Approver B]: 3 pending"

**Edge Cases**
- [ ] WHEN an approver has 10+ pending requests, THEN a warning is shown: "This approver may need delegation or workflow adjustment."

**Size**: M
**Priority**: Must Have (P2)
**Dependencies**: LF-003, LF-020

---

#### LF-052: Leave Balance Report

**User Story**
As an HR Admin (P3),
I want to generate a leave balance report for all employees,
so that I can audit entitlements and plan for year-end.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin, WHEN they navigate to Reports > Balances, THEN they see a table: employee name, team, leave type, entitlement, used, pending, available
- [ ] GIVEN the report, WHEN the admin applies filters (team, department, leave type), THEN the table updates accordingly
- [ ] GIVEN the report, WHEN the admin clicks "Export CSV", THEN a CSV file is downloaded with all visible data
- [ ] GIVEN the report, WHEN the admin clicks "Export PDF", THEN a formatted PDF report is generated and downloaded

**Edge Cases**
- [ ] WHEN export has more than 5,000 rows, THEN generate asynchronously and notify: "Your report is being prepared. You will receive a download link shortly."

**Size**: M
**Priority**: Must Have (P3)
**Dependencies**: LF-003, LF-031

---

#### LF-053: Audit Trail

**User Story**
As an HR Admin (P3),
I want to view a full audit trail of all leave-related actions,
so that I can investigate issues and demonstrate compliance.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin, WHEN they navigate to Reports > Audit Trail, THEN they see a chronological log of all state-changing actions
- [ ] GIVEN the audit log, WHEN an entry is displayed, THEN it shows: timestamp, actor (user or system), action type, affected entity, old value, new value
- [ ] GIVEN the audit log, WHEN the admin filters by employee, THEN only actions related to that employee are shown
- [ ] GIVEN the audit log, WHEN the admin filters by action type (request_created, request_approved, balance_adjusted, policy_changed), THEN the log is filtered accordingly
- [ ] GIVEN any audit log entry, WHEN it exists in the database, THEN it is immutable (no edits or deletions)

**Edge Cases**
- [ ] WHEN the audit log has 100,000+ entries, THEN paginate with 50 per page and support date range filtering
- [ ] WHEN an action is performed by a system process (auto-approval, accrual), THEN the actor is recorded as "System: [process name]"

**Technical Notes**
- Append-only collection in MongoDB (no update or delete operations)
- Audit entry schema: { timestamp, tenantId, actorId, actorType, action, entityType, entityId, oldValue, newValue, metadata }

**Size**: M
**Priority**: Must Have (P3)
**Dependencies**: LF-003

---

#### LF-054: HR Dashboard Home

**User Story**
As an HR Admin (P3),
I want a dashboard home page with key metrics at a glance,
so that I can quickly assess the current state of leave management.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin, WHEN they open the dashboard, THEN they see summary cards: employees on leave today, pending approvals count, stale approvals (>48h), upcoming leaves this week
- [ ] GIVEN the summary cards, WHEN the admin clicks any card, THEN they navigate to the relevant detailed view
- [ ] GIVEN the dashboard, WHEN it loads, THEN data refreshes automatically and loads within 3 seconds

**Edge Cases**
- [ ] WHEN the tenant has no leave data yet (new setup), THEN show a getting-started checklist instead of empty metrics

**Size**: S
**Priority**: Should Have (P3)
**Dependencies**: LF-050, LF-051

---

#### LF-055: Request Management for HR

**User Story**
As an HR Admin (P3),
I want to view and manage all leave requests company-wide,
so that I can handle exceptions, corrections, and escalations.

**Acceptance Criteria**
- [ ] GIVEN an HR Admin, WHEN they navigate to "All Requests", THEN they see a filterable list of all requests across the company
- [ ] GIVEN a request in any status, WHEN the admin opens it, THEN they see full details: employee info, dates, type, approval chain with actions and timestamps
- [ ] GIVEN a pending request, WHEN the admin clicks "Force Approve" or "Force Reject", THEN the request is resolved immediately, bypassing remaining approval steps, with audit log entry: "Force [action] by HR Admin [name]"
- [ ] GIVEN an approved request, WHEN the admin clicks "Revoke", THEN the request is cancelled, balance is restored, and the employee is notified

**Edge Cases**
- [ ] WHEN an HR Admin force-approves a request that violates policy (negative balance), THEN a confirmation modal warns: "This action will result in a negative balance for [employee]."

**Size**: M
**Priority**: Should Have (P4)
**Dependencies**: LF-003, LF-020

---

### EPIC E8: Calendar Integrations

---

#### LF-060: Google Calendar Sync

**User Story**
As an Employee (P1),
I want my approved leave to automatically appear on my Google Calendar,
so that my colleagues can see my availability without checking LeaveFlow.

**Acceptance Criteria**
- [ ] GIVEN an employee connects their Google Calendar via OAuth, WHEN a leave request is approved, THEN an all-day OOO event is created on their calendar for the leave dates
- [ ] GIVEN a synced calendar event, WHEN the event is created, THEN it includes: title "[LeaveFlow] [Type] - [Employee Name]", description with leave details, and the calendar's OOO status
- [ ] GIVEN an approved leave is cancelled, WHEN the cancellation is processed, THEN the corresponding calendar event is deleted
- [ ] GIVEN an employee, WHEN they navigate to Settings > Integrations, THEN they can connect/disconnect Google Calendar

**Edge Cases**
- [ ] WHEN Google Calendar API returns an error during event creation, THEN the leave approval is not blocked; the sync failure is logged and retried up to 3 times
- [ ] WHEN an employee disconnects Google Calendar, THEN existing leave events are NOT deleted (to avoid accidental data loss)
- [ ] WHEN a half-day leave is approved, THEN the calendar event is created for the appropriate half of the day (AM or PM)

**Technical Notes**
- Google Calendar API v3 with OAuth2
- Store refresh tokens encrypted per user
- Background job processes calendar sync queue

**Size**: M
**Priority**: Should Have (P3)
**Dependencies**: LF-020

---

#### LF-061: Outlook Calendar Sync

**User Story**
As an Employee (P1),
I want my approved leave to automatically appear on my Outlook Calendar,
so that my Microsoft 365 colleagues can see my availability.

**Acceptance Criteria**
- [ ] GIVEN an employee connects their Outlook Calendar via Microsoft OAuth, WHEN a leave request is approved, THEN an all-day OOO event is created on their Outlook calendar
- [ ] GIVEN the same sync, cancel, and disconnect behaviors as LF-060 but using Microsoft Graph API
- [ ] GIVEN a company that uses Teams, WHEN the Teams bot is connected, THEN Outlook Calendar OAuth can be streamlined using the existing Microsoft token (with additional calendar scope)

**Edge Cases**
- [ ] Same edge cases as LF-060 adapted for Microsoft Graph API

**Technical Notes**
- Microsoft Graph API for calendar operations
- Shared calendar sync service with Google (adapter pattern)

**Size**: M
**Priority**: Should Have (P3)
**Dependencies**: LF-020

---

#### LF-062: Team Calendar View with Leave Overlay

**User Story**
As a Manager (P2),
I want to see my team's approved leaves overlaid on a shared calendar,
so that I can assess team coverage before approving new requests.

**Acceptance Criteria**
- [ ] GIVEN a Manager views the approval DM/card, WHEN they see a pending request, THEN a "View Team Calendar" link is included that opens the web app team calendar filtered to the request dates
- [ ] GIVEN the team calendar, WHEN displayed, THEN it shows all team members' approved and pending leaves for the relevant period
- [ ] GIVEN the calendar, WHEN 3+ team members are already off on a requested date, THEN that date is highlighted in amber/red as a coverage warning

**Edge Cases**
- [ ] WHEN the team has no approved leaves for the period, THEN the calendar shows all members as available

**Size**: S
**Priority**: Should Have (P4)
**Dependencies**: LF-043, LF-050

---

### EPIC E9: Notifications & Alerts

---

#### LF-070: Request Lifecycle Notifications

**User Story**
As an Employee (P1),
I want to receive notifications at every stage of my leave request lifecycle,
so that I always know the current status.

**Acceptance Criteria**
- [ ] GIVEN a request is submitted, WHEN the submission succeeds, THEN the employee receives a confirmation notification via bot DM
- [ ] GIVEN a request is approved by an intermediate approver, WHEN the approval is processed, THEN the employee is notified: "Approved by [name]. Now pending with [next approver]."
- [ ] GIVEN a request is fully approved, WHEN final approval is processed, THEN the employee is notified: "Your [type] leave for [dates] is approved!"
- [ ] GIVEN a request is rejected, WHEN the rejection is processed, THEN the employee is notified with the rejection reason
- [ ] GIVEN a request is cancelled by the employee, WHEN cancellation succeeds, THEN the employee receives confirmation

**Edge Cases**
- [ ] WHEN the employee is offline on both Slack and Teams, THEN notifications are stored and delivered when they come online
- [ ] WHEN a request goes through 5 approval steps, THEN the employee receives a notification for each step transition (not just final)

**Size**: S
**Priority**: Must Have (P1)
**Dependencies**: LF-020

---

#### LF-071: Approver Notifications

**User Story**
As a Manager (P2),
I want to receive notifications when a leave request needs my approval,
so that I can act promptly.

**Acceptance Criteria**
- [ ] GIVEN a request reaches a Manager's approval step, WHEN the step is activated, THEN the Manager receives a DM via their preferred platform (Slack/Teams) with request details and action buttons
- [ ] GIVEN a request is cancelled by the employee while pending with the Manager, WHEN the cancellation occurs, THEN the Manager is notified and the approval message is updated

**Edge Cases**
- [ ] WHEN a Manager is on both Slack and Teams, THEN the notification is sent to the platform where the bot was first installed for their tenant (configurable in future)

**Size**: S
**Priority**: Must Have (P1)
**Dependencies**: LF-015, LF-019B

---

#### LF-072: Leave Announcement to Team Channel

**User Story**
As a Manager (P2),
I want approved leaves to be announced in the team's Slack/Teams channel,
so that the whole team is aware of upcoming absences.

**Acceptance Criteria**
- [ ] GIVEN a team has a designated announcement channel configured, WHEN a leave request is approved (final approval), THEN a message is posted to that channel: "[Employee] will be on [type] leave from [start] to [end]."
- [ ] GIVEN a team announcement channel, WHEN a previously announced leave is cancelled, THEN an update is posted: "[Employee]'s [type] leave for [dates] has been cancelled."
- [ ] GIVEN an HR Admin, WHEN they configure a team, THEN they can optionally set an announcement channel (Slack channel ID or Teams channel)
- [ ] GIVEN no channel is configured, WHEN a leave is approved, THEN no channel announcement is sent (only DM notifications)

**Edge Cases**
- [ ] WHEN the bot is not a member of the designated channel, THEN channel announcement fails silently (logged as warning) and the team admin is notified to add the bot to the channel

**Size**: S
**Priority**: Should Have (P4)
**Dependencies**: LF-010 or LF-017, LF-040

---

#### LF-073: Email Fallback Notifications

**User Story**
As a user who may not always be on Slack/Teams,
I want to receive email notifications for critical leave events,
so that I do not miss important approvals or status changes.

**Acceptance Criteria**
- [ ] GIVEN an approver who is not on Slack or Teams, WHEN a request needs their approval, THEN an email is sent with request details and links to approve/reject in the web app
- [ ] GIVEN any user, WHEN they configure notification preferences, THEN they can enable/disable email notifications alongside bot notifications
- [ ] GIVEN email notifications are enabled, WHEN any leave lifecycle event occurs, THEN an email is sent in addition to the bot notification

**Edge Cases**
- [ ] WHEN email delivery fails, THEN retry up to 3 times with exponential backoff; log failure for admin visibility

**Technical Notes**
- Use transactional email service (SendGrid, Postmark, or AWS SES)
- Email templates with company branding

**Size**: M
**Priority**: Should Have (P4)
**Dependencies**: LF-070

---

### EPIC E10: Billing & Pricing

---

#### LF-080: Free Tier Enforcement

**User Story**
As the system,
I want to enforce free tier limits (10 users, 1 approval level, 1 leave type, 1 platform),
so that the freemium model works correctly.

**Acceptance Criteria**
- [ ] GIVEN a tenant on the Free plan, WHEN a Company Admin tries to add an 11th user, THEN the action is blocked with: "Free plan supports up to 10 users. Upgrade to Team for unlimited users."
- [ ] GIVEN a tenant on the Free plan, WHEN an HR Admin tries to create a workflow with more than 1 approval step, THEN it is blocked: "Free plan supports 1 approval level. Upgrade for multi-level workflows."
- [ ] GIVEN a tenant on the Free plan, WHEN they have already configured Slack, THEN "Add to Teams" shows: "Free plan supports 1 platform. Upgrade to connect both Slack and Teams."
- [ ] GIVEN a tenant on the Free plan, WHEN they try to add more than the default leave types, THEN custom types beyond the first are blocked with upgrade prompt

**Edge Cases**
- [ ] WHEN a tenant downgrades from Team to Free while having 15 users, THEN existing users remain active but no new users can be added until count is below 10

**Size**: M
**Priority**: Must Have (P2)
**Dependencies**: LF-001

---

#### LF-081: Stripe Integration for Team Plan

**User Story**
As a Company Admin (P5),
I want to subscribe to the Team plan ($2/user/month) and manage billing,
so that my company can access all MVP features.

**Acceptance Criteria**
- [ ] GIVEN a Company Admin navigates to Settings > Billing, WHEN they click "Upgrade to Team", THEN a Stripe Checkout session opens with the per-user pricing
- [ ] GIVEN a successful payment, WHEN the subscription is confirmed, THEN the tenant is upgraded to Team plan and all feature restrictions are lifted
- [ ] GIVEN an active Team subscription, WHEN the admin views Billing, THEN they see: current plan, next billing date, user count, estimated next charge, and payment method
- [ ] GIVEN an active subscription, WHEN the user count changes (employee added/removed), THEN the next invoice is prorated accordingly
- [ ] GIVEN a Company Admin, WHEN they click "Cancel Subscription", THEN the plan reverts to Free at the end of the current billing period

**Edge Cases**
- [ ] WHEN a payment fails, THEN the tenant has a 7-day grace period before downgrade to Free; admin receives email notifications on days 1, 3, and 7
- [ ] WHEN a tenant is downgraded due to payment failure, THEN existing data is preserved but feature restrictions apply

**Technical Notes**
- Stripe Billing with metered usage (user count)
- Webhook handling for subscription lifecycle events
- Store Stripe customer ID and subscription ID per tenant

**Size**: L
**Priority**: Must Have (P3)
**Dependencies**: LF-001, LF-080

---

#### LF-082: Billing Dashboard

**User Story**
As a Company Admin (P5),
I want to view invoices and manage my payment method,
so that I can track costs and keep billing information current.

**Acceptance Criteria**
- [ ] GIVEN a Company Admin, WHEN they navigate to Settings > Billing > Invoices, THEN they see a list of past invoices with: date, amount, status (paid/failed), and a download link (PDF)
- [ ] GIVEN a Company Admin, WHEN they click "Update Payment Method", THEN a Stripe-hosted form opens to update the card on file
- [ ] GIVEN a Company Admin, WHEN they view the billing page, THEN usage stats are shown: current user count, cost per user, estimated next invoice

**Edge Cases**
- [ ] WHEN no invoices exist (new subscription), THEN show: "Your first invoice will be generated at the end of your billing period."

**Size**: S
**Priority**: Should Have (P4)
**Dependencies**: LF-081

---

## MoSCoW Prioritization

### Must Have (MVP-critical — will not ship without these)

| ID | Story | Size | Sprint |
|----|-------|------|--------|
| LF-001 | Company Registration & Workspace Setup | L | S1 |
| LF-002 | User Auth & Role-Based Access | M | S1 |
| LF-003 | Web App Shell & Navigation | M | S1 |
| LF-005 | API Foundation & Rate Limiting | M | S1 |
| LF-004 | Tenant Settings & Company Profile | S | S2 |
| LF-010 | Slack Bot Installation | M | S2 |
| LF-017 | Teams Bot Installation | M | S2 |
| LF-021 | Workflow Configuration (Form-Based) | M | S2 |
| LF-030 | Custom Leave Type Config | M | S2 |
| LF-040 | Employee-to-Team Mapping | M | S3 |
| LF-044 | Slack User-to-Employee Mapping | S | S3 |
| LF-020 | Sequential Approval Chain Engine | L | S3 |
| LF-011 | Request Leave via Slack Bot | L | S3 |
| LF-018 | Request Leave via Teams Bot | L | S4 |
| LF-012 | Check Balance via Slack Bot | S | S4 |
| LF-019 | Check Balance & Status via Teams Bot | M | S4 |
| LF-013 | Check Status via Slack Bot | S | S4 |
| LF-015 | One-Click Approve/Reject from Slack | L | S4 |
| LF-019B | One-Click Approve/Reject from Teams | M | S5 |
| LF-070 | Request Lifecycle Notifications | S | S5 |
| LF-071 | Approver Notifications | S | S5 |
| LF-026 | Reject with Mandatory Reason | S | S5 |
| LF-014 | Cancel Leave Request via Slack Bot | M | S5 |
| LF-031 | Leave Balance Management | M | S5 |
| LF-032 | Accrual Rules Configuration | M | S6 |
| LF-033 | Public Holiday Calendar | M | S6 |
| LF-041 | Bulk Employee Import (CSV) | M | S6 |
| LF-042 | Employee Self-Service Profile | M | S6 |
| LF-043 | Manager Team View | M | S6 |
| LF-050 | Absence Calendar | M | S6 |
| LF-051 | Pending Approvals Overview | M | S7 |
| LF-052 | Leave Balance Report | M | S7 |
| LF-053 | Audit Trail | M | S7 |
| LF-080 | Free Tier Enforcement | M | S7 |
| LF-081 | Stripe Integration for Team Plan | L | S7 |
| LF-016 | Slack Bot Help & Error Handling | S | S4 |

### Should Have (Important, but MVP can ship without in worst case)

| ID | Story | Size | Sprint |
|----|-------|------|--------|
| LF-022 | Workflow Templates | S | S3 |
| LF-023 | Auto-Approval Rules | M | S5 |
| LF-034 | Carryover Rules | S | S6 |
| LF-054 | HR Dashboard Home | S | S7 |
| LF-055 | Request Management for HR | M | S7 |
| LF-060 | Google Calendar Sync | M | S8 |
| LF-061 | Outlook Calendar Sync | M | S8 |
| LF-062 | Team Calendar with Coverage Warning | S | S8 |
| LF-072 | Leave Announcement to Channel | S | S8 |
| LF-073 | Email Fallback Notifications | M | S8 |
| LF-082 | Billing Dashboard | S | S8 |

### Could Have (Nice to have for MVP)

| ID | Story | Size | Sprint |
|----|-------|------|--------|
| LF-024 | Auto-Escalation on Timeout | M | S8 |
| LF-025 | Delegation of Approval Authority | M | Post-MVP |
| LF-035 | Blackout Periods | S | Post-MVP |

### Won't Have (Explicitly out of MVP scope)

| Feature | Reason | Phase |
|---------|--------|-------|
| Visual drag-and-drop workflow builder | Complex; form-based is sufficient for MVP | Phase 2 |
| Conditional/branching workflows | Requires visual builder | Phase 2 |
| Parallel approval paths | Sequential covers 90% of use cases | Phase 2 |
| HRIS integrations (BambooHR, Personio) | Partnership-dependent | Phase 2 |
| SSO/SAML | Enterprise feature | Phase 2 |
| Advanced analytics & trends | Basic reports sufficient for MVP | Phase 2 |
| Payroll export | Requires standardized formats | Phase 3 |
| Mobile app | Bot + web sufficient for MVP | Phase 3 |
| NLP natural language requests | Slash commands sufficient for MVP | Phase 3 |
| Multi-language UI | English-only at MVP | Phase 2 |
| Data residency options | Enterprise feature | Phase 3 |
| Minimum team coverage rules | Complex policy engine | Phase 2 |
| Probation period support | Edge case for MVP | Phase 2 |

---

## Sprint Plan

### Sprint 1: Foundation (Weeks 1-2)
**Goal**: Core platform infrastructure — authentication, multi-tenancy, API, and web shell.

| ID | Story | Size | Priority |
|----|-------|------|----------|
| LF-001 | Company Registration & Workspace Setup | L | Must |
| LF-002 | User Auth & Role-Based Access | M | Must |
| LF-003 | Web App Shell & Navigation | M | Must |
| LF-005 | API Foundation & Rate Limiting | M | Must |

**Capacity**: ~4 stories (1L + 3M = ~2.5 weeks of dev work)
**Risks**: OAuth integration with Slack/Teams may require app review delays. Mitigation: start app submissions early.
**Sprint Deliverable**: Users can register, log in, and see a role-based web dashboard.

---

### Sprint 2: Configuration Core (Weeks 3-4)
**Goal**: Enable HR admins to configure leave types, workflows, and bot connections.

| ID | Story | Size | Priority |
|----|-------|------|----------|
| LF-004 | Tenant Settings & Company Profile | S | Must |
| LF-010 | Slack Bot Installation | M | Must |
| LF-017 | Teams Bot Installation | M | Must |
| LF-021 | Workflow Configuration (Form-Based) | M | Must |
| LF-030 | Custom Leave Type Config | M | Must |

**Capacity**: ~5 stories (1S + 4M = ~2.5 weeks)
**Risks**: Slack and Teams OAuth flows have different requirements. Mitigation: implement platform-agnostic auth service.
**Sprint Deliverable**: Admin can connect Slack/Teams, create leave types, and define approval workflows.

---

### Sprint 3: Core Request Flow (Weeks 5-6)
**Goal**: Employees can request leave via Slack and requests route through approval chains.

| ID | Story | Size | Priority |
|----|-------|------|----------|
| LF-040 | Employee-to-Team Mapping | M | Must |
| LF-044 | Slack User-to-Employee Mapping | S | Must |
| LF-020 | Sequential Approval Chain Engine | L | Must |
| LF-011 | Request Leave via Slack Bot | L | Must |
| LF-022 | Workflow Templates | S | Should |

**Capacity**: ~5 stories (2L + 1M + 2S = ~2.5 weeks)
**Risks**: Approval engine is the most complex backend component. Mitigation: thorough TDD with edge case coverage.
**Sprint Deliverable**: End-to-end leave request flow working via Slack.

---

### Sprint 4: Platform Parity & Approvals (Weeks 7-8)
**Goal**: Teams achieves feature parity with Slack; managers can approve from chat.

| ID | Story | Size | Priority |
|----|-------|------|----------|
| LF-018 | Request Leave via Teams Bot | L | Must |
| LF-015 | One-Click Approve/Reject from Slack | L | Must |
| LF-012 | Check Balance via Slack Bot | S | Must |
| LF-013 | Check Status via Slack Bot | S | Must |
| LF-019 | Check Balance & Status via Teams Bot | M | Must |
| LF-016 | Slack Bot Help & Error Handling | S | Must |

**Capacity**: ~6 stories (2L + 1M + 3S = ~2.5 weeks)
**Risks**: Adaptive Cards in Teams may have rendering quirks. Mitigation: test on Desktop, Web, and Mobile Teams clients.
**Sprint Deliverable**: Full bot experience on both platforms; managers can approve from Slack.

---

### Sprint 5: Approvals, Notifications & Cancellations (Weeks 9-10)
**Goal**: Complete approval experience with Teams approve, notifications, cancellations, and balance management.

| ID | Story | Size | Priority |
|----|-------|------|----------|
| LF-019B | One-Click Approve/Reject from Teams | M | Must |
| LF-070 | Request Lifecycle Notifications | S | Must |
| LF-071 | Approver Notifications | S | Must |
| LF-026 | Reject with Mandatory Reason | S | Must |
| LF-014 | Cancel Leave Request via Slack Bot | M | Must |
| LF-031 | Leave Balance Management | M | Must |
| LF-023 | Auto-Approval Rules | M | Should |

**Capacity**: ~7 stories (3M + 3S + 1M = ~2.5 weeks)
**Risks**: Notification delivery reliability across platforms. Mitigation: implement retry queues.
**Sprint Deliverable**: Complete request lifecycle with notifications on both platforms.

---

### Sprint 6: HR Features & Policy Engine (Weeks 11-12)
**Goal**: HR admins get calendar view, policy tools, and employee management.

| ID | Story | Size | Priority |
|----|-------|------|----------|
| LF-032 | Accrual Rules Configuration | M | Must |
| LF-033 | Public Holiday Calendar | M | Must |
| LF-034 | Carryover Rules | S | Should |
| LF-041 | Bulk Employee Import (CSV) | M | Must |
| LF-042 | Employee Self-Service Profile | M | Must |
| LF-043 | Manager Team View | M | Must |
| LF-050 | Absence Calendar | M | Must |

**Capacity**: ~7 stories (5M + 1S + 1M = ~3 weeks, stretch)
**Risks**: Sprint is heavy. Mitigation: LF-034 (carryover) can be moved to S7 if needed.
**Sprint Deliverable**: Full policy engine; employees and managers have web views; HR has absence calendar.

---

### Sprint 7: Reporting, Billing & Compliance (Weeks 13-14)
**Goal**: HR reporting suite, audit trail, and payment infrastructure.

| ID | Story | Size | Priority |
|----|-------|------|----------|
| LF-051 | Pending Approvals Overview | M | Must |
| LF-052 | Leave Balance Report | M | Must |
| LF-053 | Audit Trail | M | Must |
| LF-054 | HR Dashboard Home | S | Should |
| LF-055 | Request Management for HR | M | Should |
| LF-080 | Free Tier Enforcement | M | Must |
| LF-081 | Stripe Integration for Team Plan | L | Must |

**Capacity**: ~7 stories (1L + 5M + 1S = ~3 weeks, stretch)
**Risks**: Stripe integration complexity. Mitigation: use Stripe Checkout (hosted) to minimize custom UI.
**Sprint Deliverable**: HR can generate reports; billing is live; free tier is enforced.

---

### Sprint 8: Integrations, Polish & Launch Prep (Weeks 15-16)
**Goal**: Calendar integrations, quality polish, and launch readiness.

| ID | Story | Size | Priority |
|----|-------|------|----------|
| LF-060 | Google Calendar Sync | M | Should |
| LF-061 | Outlook Calendar Sync | M | Should |
| LF-062 | Team Calendar with Coverage Warning | S | Should |
| LF-072 | Leave Announcement to Channel | S | Should |
| LF-073 | Email Fallback Notifications | M | Should |
| LF-082 | Billing Dashboard | S | Should |
| LF-024 | Auto-Escalation on Timeout | M | Could |

**Capacity**: ~7 stories (3M + 3S + 1M = ~2.5 weeks)
**Risks**: Calendar API quota limits in production. Mitigation: implement rate limiting and retry logic.
**Sprint Deliverable**: Calendar sync working; email fallback; production-ready for launch.

**Buffer**: Sprint 8 is intentionally lighter on Must-Haves. Any spillover from S6/S7 lands here. If all Must-Haves are done, the "Should Have" and "Could Have" items provide launch polish.

---

## Open Questions Resolved

### Q1: Should MVP support auto org-chart import from Google Workspace / Entra ID?
**Recommendation: NO for MVP.** CSV import (LF-041) covers the use case. Auto-import from Google Workspace / Entra ID is Phase 2 alongside HRIS integrations. Rationale: reduces scope, avoids complex API permission requirements, and CSV is universally available.

### Q2: Half-day only or also hourly leave tracking in MVP?
**Recommendation: Half-day only.** The smallest unit in MVP is a half-day (AM/PM). Hourly leave tracking adds complexity to balance calculations, calendar integration, and bot UI. It is a Phase 2 feature. Most leave management competitors also start with day/half-day granularity.

### Q3: Leave announcements: shared channel, DM, or configurable?
**Recommendation: Configurable, default to DM-only.** Story LF-072 implements optional channel announcements (team can configure a channel). DMs are always sent (LF-070, LF-071). This respects privacy while giving teams the option to publicize absences. Default behavior: DM only, no channel announcement unless explicitly configured.

### Q4: English-only MVP or multi-language?
**Recommendation: English-only for MVP.** Multi-language is Phase 2 (as stated in NFR-7). All bot messages, web UI, and emails are in English. Store all user-facing strings in i18n-ready format from the start (key-value maps) so that adding languages later is a configuration change, not a code rewrite.

### Q5: Domain availability: leaveflow.io, leaveflow.app, getleaveflow.com?
**Recommendation: Not a PO decision — escalate to PM/Marketing.** However, from a product perspective, `leaveflow.app` is preferred for a SaaS product. Check availability and register all three as defensive registrations.

---

## Edge Cases Identified

These edge cases are addressed in individual stories but summarized here for completeness:

### Date & Time Edge Cases
1. **Timezone handling**: Employee timezone vs. company timezone. Recommendation: store all dates as UTC; display in employee's configured timezone; leave dates are "logical dates" (not timestamps) to avoid midnight-boundary issues.
2. **Weekend handling**: Work week is configurable (not hardcoded Mon-Fri). Islamic countries use Sun-Thu. Some companies work 6-day weeks.
3. **Half-day at boundaries**: Employee requests half-day on the start or end of a multi-day request. The half-day toggle applies to start day and/or end day independently.
4. **Past dates**: Retroactive sick leave should be allowed (configurable per policy); vacation requests for past dates should be blocked.
5. **Fiscal year boundary**: Requests spanning two fiscal years (e.g., Dec 28 - Jan 3) should deduct from the correct year's balance.

### Concurrency Edge Cases
6. **Overlapping requests**: Two requests from the same employee for overlapping dates. System should detect and warn at submission time.
7. **Simultaneous approvals**: Two approvers click "Approve" at the same time for different steps. Engine must handle idempotently with optimistic locking.
8. **Balance race condition**: Employee submits two requests simultaneously that would exceed balance. System should check balance atomically.

### Organizational Edge Cases
9. **Employee not in any team**: Cannot submit requests; bot provides guidance.
10. **Workflow has no steps**: Request is auto-approved (edge case of LF-020).
11. **Approver is the requestor's own manager AND the employee themselves**: Self-approval should be blocked; requests escalate to next level.
12. **Approver leaves the company**: Workflow step is skipped with HR notification.
13. **Part-time employees**: MVP treats all employees as full-time. Part-time entitlement is handled via manual balance adjustment (LF-031). Native part-time support is Phase 2.

### Integration Edge Cases
14. **Bot rate limits**: Slack and Teams have API rate limits. Implement queue with backoff for high-volume tenants.
15. **Calendar API downtime**: Leave approval must not be blocked by calendar sync failure. Sync is async and retried.
16. **Stale interactive messages**: Slack buttons expire after 30 minutes of inactivity in some cases. Always include a "View in web app" fallback link.

### Billing Edge Cases
17. **Downgrade with excess users**: Existing users preserved; new additions blocked.
18. **Payment failure**: 7-day grace period before downgrade.
19. **Mid-month user changes**: Prorated billing via Stripe.

---

## Definition of Done

Every story is considered DONE only when ALL of the following are met:

- [ ] **Code complete**: All acceptance criteria implemented
- [ ] **Code reviewed**: PR reviewed and approved by at least 1 team member
- [ ] **Unit tests**: Written and passing, covering happy path and edge cases
- [ ] **Integration tests**: API endpoints tested with realistic scenarios
- [ ] **Test coverage**: 80%+ line coverage for new/modified code
- [ ] **Security review**: No hardcoded secrets, input validation in place, auth/authz verified
- [ ] **Accessibility**: Web UI meets WCAG 2.1 AA for the feature
- [ ] **Error handling**: All error paths handled with user-friendly messages
- [ ] **Logging**: Appropriate server-side logging for debugging
- [ ] **Audit trail**: State-changing operations logged to audit collection (where applicable)
- [ ] **Documentation**: API endpoints documented (OpenAPI/Swagger)
- [ ] **Deployed to staging**: Feature running in staging environment
- [ ] **PO acceptance**: Product Owner has reviewed and accepted the feature against acceptance criteria
- [ ] **No regressions**: Existing tests still pass

---

## Definition of Ready

A story is READY for development when:

- [ ] User story is written in "As a / I want / So that" format
- [ ] Acceptance criteria are in GIVEN/WHEN/THEN format (at least 3 criteria)
- [ ] Edge cases are identified and documented
- [ ] Technical notes provide implementation guidance
- [ ] Dependencies are identified and either resolved or scheduled earlier
- [ ] Size estimate is assigned (S/M/L/XL)
- [ ] Design mockups are available (if UI story)
- [ ] API contracts are defined (if API story)
- [ ] The story is small enough to complete in one sprint
