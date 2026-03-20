# Stage 2: UI/UX Design (Conservative) — LeaveFlow

**Agent**: ux-ui-expert
**Model**: opus
**Run**: 2026-03-16-design-leave-flow
**Date**: 2026-03-16
**Input**: 01-architecture-handoff.md, product-kb/features/leave-flow.md, 03-analysis.md

---

## Table of Contents

1. [Design Rationale](#design-rationale)
2. [Design System Tokens](#design-system-tokens)
3. [Component Hierarchy](#component-hierarchy)
4. [User Flows](#user-flows)
5. [Web Mockups](#web-mockups)
6. [Mobile Mockups](#mobile-mockups)
7. [Bot Message Designs](#bot-message-designs)
8. [Accessibility Notes](#accessibility-notes)
9. [Open Questions Resolution](#open-questions-resolution)
10. [File Manifest](#file-manifest)

---

## Design Rationale

**Approach: Conservative / Enterprise SaaS**

LeaveFlow is a B2B HR tool handling sensitive employee data and workflow approvals. The design must project trustworthiness, clarity, and efficiency. We follow the visual language of proven enterprise SaaS products (Linear, Notion, Stripe Dashboard) rather than experimental or consumer-oriented aesthetics.

Key design principles:

1. **Clarity over decoration** — Every element serves a functional purpose. No gratuitous gradients, animations, or visual noise. Data-dense views (calendar, tables) use whitespace and typographic hierarchy to organize information.

2. **Progressive disclosure** — Show the minimum information needed at each level. Dashboard shows summaries; drill-down views show details. Avoids overwhelming new users while giving power users the depth they need.

3. **Consistent status vocabulary** — A single, unified visual language for request statuses used across web, mobile, and bot interfaces:
   - Approved: Green (`success-600` / `#16a34a`)
   - Pending: Amber (`warning-600` / `#d97706`)
   - Rejected: Red (`danger-600` / `#dc2626`)
   - Cancelled: Gray (`gray-400`)

4. **"Package tracking" as core metaphor** — The approval chain visualization borrows directly from shipment tracking UX (FedEx, UPS). Vertical stepper with completed/current/upcoming states. This metaphor is used identically in the web app request detail, the mobile status tracker, and the bot status message (using emoji).

5. **shadcn/ui alignment** — All components follow Radix UI patterns (the foundation of shadcn/ui). This means accessible primitives, keyboard navigation, and focus management built in from day one.

---

## Design System Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `primary-50` | `#eff6ff` | Light primary backgrounds, selected states |
| `primary-100` | `#dbeafe` | Hover backgrounds, avatar backgrounds |
| `primary-500` | `#3b82f6` | Secondary actions, progress bars |
| `primary-600` | `#2563eb` | Primary buttons, links, active nav indicators |
| `primary-700` | `#1d4ed8` | Primary button hover |
| `success-50` | `#f0fdf4` | Approved badge background |
| `success-500` | `#22c55e` | Approved stepper icon |
| `success-600` | `#16a34a` | Approve button, approved text |
| `warning-50` | `#fffbeb` | Pending badge background, stale row highlight |
| `warning-100` | `#fef3c7` | Stale badge background |
| `warning-500` | `#f59e0b` | Pending stepper icon |
| `warning-600` | `#d97706` | Pending text, stale indicators |
| `danger-50` | `#fef2f2` | Rejected badge background |
| `danger-500` | `#ef4444` | Rejected stepper icon |
| `danger-600` | `#dc2626` | Reject button, rejected text, destructive actions |
| `gray-50` | `#f9fafb` | Page background |
| `gray-100` | `#f3f4f6` | Card secondary backgrounds |
| `gray-200` | `#e5e7eb` | Borders, dividers |
| `gray-400` | `#9ca3af` | Placeholder text, muted icons |
| `gray-500` | `#6b7280` | Secondary text, labels |
| `gray-700` | `#374151` | Body text |
| `gray-900` | `#111827` | Headings, primary text |

#### Leave Type Colors

| Leave Type | Badge BG | Badge Text | Calendar Bar |
|------------|----------|------------|-------------|
| Vacation | `blue-50` | `blue-700` | `blue-200` |
| Sick Leave | `emerald-50` | `emerald-700` | `emerald-200` |
| Personal | `violet-50` | `violet-700` | `violet-200` |
| Unpaid | `gray-100` | `gray-600` | `gray-300` |

### Typography

| Token | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `heading-1` | System (Inter) | 24px / 1.5rem | 600 (Semibold) | Page titles |
| `heading-2` | System (Inter) | 18px / 1.125rem | 600 (Semibold) | Section headings |
| `heading-3` | System (Inter) | 16px / 1rem | 600 (Semibold) | Card titles |
| `body` | System (Inter) | 14px / 0.875rem | 400 (Regular) | Body text |
| `body-medium` | System (Inter) | 14px / 0.875rem | 500 (Medium) | Emphasized body |
| `small` | System (Inter) | 12px / 0.75rem | 400 (Regular) | Captions, timestamps |
| `label` | System (Inter) | 12px / 0.75rem | 500 (Medium) | Form labels, uppercase labels |
| `mono` | System Mono | 12px / 0.75rem | 400 (Regular) | Reference IDs, code |

### Spacing

4px base grid: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`

Key spacing values:
- **Card padding**: 24px (`p-6`)
- **Section gap**: 32px (`gap-8`)
- **Table cell padding**: 16px horizontal, 16px vertical (`px-6 py-4`)
- **Page margin**: 32px (`px-8`)
- **Component internal gap**: 12-16px (`gap-3` to `gap-4`)

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Badges, chips |
| `radius-md` | 8px | Buttons, inputs, small cards |
| `radius-lg` | 12px | Cards, modals |
| `radius-full` | 9999px | Avatars, status dots |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Cards, dropdowns |
| `ring-1` | `0 0 0 1px rgb(0 0 0 / 0.05)` | Card borders (combined with shadow) |

### Component Styles

#### Buttons

| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| Primary | `primary-600` | White | None | `primary-500` |
| Secondary | White | `gray-700` | `gray-300` | `gray-50` bg |
| Ghost | Transparent | `gray-500` | None | `gray-50` bg |
| Danger | White | `danger-600` | `danger-300` | `danger-50` bg |
| Danger Filled | `danger-600` | White | None | `danger-500` |
| Success | `success-600` | White | None | `success-500` |

All buttons: `rounded-lg`, `px-4 py-2`, `text-sm font-semibold`, `focus-visible:outline-2 focus-visible:outline-offset-2`

#### Status Badges

| Status | Background | Text Color | Dot Color |
|--------|-----------|------------|-----------|
| Approved | `success-50` | `success-700` | `success-500` |
| Pending | `warning-100` | `warning-700` | `warning-500` |
| Rejected | `danger-50` | `danger-600` | `danger-500` |
| Cancelled | `gray-100` | `gray-600` | `gray-400` |
| Stale | `warning-100` | `warning-600` | N/A (text badge) |
| Active | `success-50` | `success-700` | N/A |

### Responsive Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| Mobile | < 640px | Single column, stacked cards |
| Tablet | 640 - 1024px | Two columns, condensed tables |
| Desktop | > 1024px | Full layout, sidebar + main content |

All mockups use mobile-first approach with `sm:`, `md:`, `lg:` Tailwind breakpoints.

---

## Component Hierarchy

```
App
├── Layout
│   ├── TopNav
│   │   ├── Logo
│   │   ├── NavLinks (Dashboard, Calendar, Approvals, Reports, Settings)
│   │   ├── NotificationBell (with badge count)
│   │   └── UserMenu (avatar + name + dropdown)
│   └── MainContent
│       └── [Page Component]
│
├── Pages
│   ├── DashboardHome
│   │   ├── PageHeader (title + subtitle)
│   │   ├── StatsCardGrid
│   │   │   ├── StatCard (Pending Approvals, with stale badge)
│   │   │   ├── StatCard (On Leave Today)
│   │   │   ├── StatCard (Upcoming This Week)
│   │   │   └── StatCard (Total Employees)
│   │   ├── PendingApprovalsTable (sortable, filterable)
│   │   │   └── RequestRow (avatar, type badge, dates, waiting badge, actions)
│   │   ├── UpcomingAbsencesList
│   │   │   └── AbsenceItem (avatar, dates, type badge)
│   │   └── QuickActionsCard
│   │       └── ActionLink (icon + label)
│   │
│   ├── AbsenceCalendar
│   │   ├── CalendarToolbar
│   │   │   ├── MonthNavigator (prev/next + month label)
│   │   │   ├── TodayButton
│   │   │   └── FilterBar (team, department dropdowns + legend)
│   │   └── CalendarGrid (table: employees as rows, working days as columns)
│   │       ├── TeamGroupHeader
│   │       └── EmployeeRow
│   │           ├── EmployeeCell (sticky left, avatar + name)
│   │           └── DayCell[] (empty or absence bar with leave type color)
│   │
│   ├── WorkflowBuilder
│   │   ├── Breadcrumb
│   │   ├── WorkflowNameForm
│   │   ├── ApprovalStepList
│   │   │   ├── FlowStart (employee icon + label)
│   │   │   ├── StepConnector (vertical line)
│   │   │   ├── ApprovalStepCard (step number, approver type, timeout, on-timeout)
│   │   │   ├── StepConnector
│   │   │   ├── AddStepButton (dashed border)
│   │   │   ├── StepConnector
│   │   │   └── FlowEnd (checkmark icon + label)
│   │   ├── WorkflowInfoSidebar
│   │   ├── AssignedTeamsSidebar
│   │   └── ActiveRequestsWarning
│   │
│   ├── LeaveRequestDetail
│   │   ├── Breadcrumb
│   │   ├── RequestHeaderCard (employee info, status badge, details grid)
│   │   ├── ApprovalProgressStepper ("package tracking")
│   │   │   └── StepItem (icon, label, status badge, approver, timestamp, actions)
│   │   ├── BalanceImpactCard (current / deduction / after)
│   │   ├── RequestInfoSidebar (reference, submitted via, workflow, step)
│   │   ├── TeamAvailabilitySidebar
│   │   └── ActivityLogSidebar (chronological event list)
│   │
│   ├── OnboardingWizard
│   │   ├── MinimalHeader (logo + "Setup Wizard")
│   │   ├── ProgressSteps (6-step horizontal stepper)
│   │   ├── StepContent
│   │   │   ├── Step1: CompanyProfileForm
│   │   │   ├── Step2: LeaveTypesList (with defaults + add custom)
│   │   │   ├── Step3: WorkflowTemplateSelector
│   │   │   ├── Step4: TeamCreation
│   │   │   ├── Step5: EmployeeImport (manual + CSV)
│   │   │   └── Step6: HolidayCalendarSelector
│   │   ├── HelpTip (informational banner)
│   │   └── NavigationButtons (Back / Skip / Continue)
│   │
│   ├── EmployeeSelfService
│   │   ├── PageHeader (title + New Request button)
│   │   ├── BalanceCardGrid
│   │   │   └── BalanceCard (type, emoji, remaining/total, progress bar, usage text)
│   │   └── RequestHistoryTable (reference, type, dates, days, status badge, actions)
│   │
│   ├── ManagerView (extends EmployeeSelfService)
│   │   ├── TeamPendingApprovals
│   │   ├── TeamCalendar (mini version of AbsenceCalendar)
│   │   └── TeamBalanceOverview
│   │
│   └── [Settings Pages]
│       ├── LeaveTypeConfig
│       ├── TeamManagement
│       ├── EmployeeManagement
│       ├── AuditTrail
│       ├── BillingPage
│       └── CompanySettings
│
├── Shared Components
│   ├── StatusBadge (variant: approved | pending | rejected | cancelled | stale)
│   ├── LeaveTypeBadge (variant: vacation | sick | personal | unpaid | custom)
│   ├── AvatarInitials (size: sm | md | lg, color: auto from name)
│   ├── EmptyState (icon, title, description, action button)
│   ├── LoadingState (spinner + text)
│   ├── ErrorState (icon, title, description, retry button)
│   ├── DataTable (sortable headers, pagination, responsive)
│   ├── StepperVertical (steps with icons, connectors, content)
│   ├── ProgressBar (value, max, color)
│   ├── PageHeader (title, subtitle, actions)
│   ├── Breadcrumb (links + current)
│   ├── FilterBar (dropdowns + reset)
│   └── ConfirmDialog (title, description, confirm/cancel actions)
│
└── Mobile Components
    ├── LeaveRequestForm (modal)
    ├── BalanceOverview (screen)
    ├── ApprovalNotification (card with actions)
    └── RequestStatusTracker (screen with vertical stepper)
```

---

## User Flows

### Flow 1: Employee Requesting Leave

```
[Entry Points]
├── Slack: /leave command
├── Teams: "request leave" message
└── Web: "New Request" button on self-service page

[Flow]
1. SELECT LEAVE TYPE
   ├── Default: Show available types with remaining balance
   ├── Loading: Spinner while fetching balances
   ├── Empty: "No leave types configured. Contact your HR admin."
   └── Error: "Unable to load leave types. Please try again."

2. ENTER DATES
   ├── Default: Date picker with start/end, half-day toggle
   ├── Validation Error: Inline — "Start date cannot be in the past" (BR-002)
   ├── Overlap: Inline warning — "You have an overlapping request for [dates]" (BR-003)
   ├── Blackout: Inline error — "These dates fall in a blackout period: [name]" (BR-009)
   └── Zero days: Inline error — "Selected dates contain 0 working days" (BR-001)

3. REVIEW & SUBMIT
   ├── Default: Summary card with type, dates, working days, balance impact, approval chain preview
   ├── Balance Warning: Yellow banner — "Insufficient balance (3 days available, 5 requested)" (BR-006)
   ├── Loading: "Submitting request..." overlay
   └── Error: "Failed to submit. Please try again." with retry button

4. CONFIRMATION
   ├── Default: Success message + approval chain with step-by-step tracker
   ├── Auto-Approved: "Your request was automatically approved!" (BR-027)
   └── Bot: DM with confirmation message (Slack Block Kit / Teams Adaptive Card)

[Post-Submit Tracking]
├── Web: Request detail page with live stepper
├── Bot: /leave status shows emoji-based tracking
└── Notifications: DM on each status change
```

### Flow 2: Manager Approving/Rejecting

```
[Entry Points]
├── Slack DM: Approval card with Approve/Reject buttons
├── Teams DM: Adaptive Card with Action.Execute
├── Web: Pending Approvals page or notification click
└── Email: "View in LeaveFlow" link (fallback)

[Approve Flow]
1. REVIEW REQUEST
   ├── Default: Request details + team availability + reason
   ├── Loading: Fetching request details
   └── Error: "Unable to load request. Please try again."

2. APPROVE
   ├── Default: Confirmation dialog — "Approve 5 days of vacation for John Doe?"
   ├── Bot: One-click approve (Slack primary button / Teams Action.Execute)
   ├── Loading: "Processing approval..."
   ├── Success (not final step): "Approved. Forwarded to next approver: [name]"
   ├── Success (final step): "Approved. Employee notified and calendar synced."
   ├── Error: "Failed to approve. Please try again."
   ├── Already Acted: "You have already approved this request." (BR-023)
   └── Cancelled: "This request was cancelled by the employee." (BR-024)

[Reject Flow]
1. CLICK REJECT
   ├── Default: Modal with mandatory reason field (min 10 chars) (BR-022)
   └── Bot: Opens a Slack modal or Teams task module

2. SUBMIT REJECTION
   ├── Validation: "Please provide at least 10 characters." (inline error)
   ├── Loading: "Processing rejection..."
   ├── Success: "Rejected. Employee has been notified with your reason."
   └── Error: "Failed to reject. Please try again."
```

### Flow 3: HR Configuring a Workflow

```
[Entry Points]
├── Settings > Workflows > Create New
├── Settings > Workflows > [existing] > Edit
└── Onboarding Wizard Step 3

[Flow]
1. START
   ├── Default: Workflow name input + template selector
   ├── Template Selected: Pre-populate steps from template (Simple/Two-Level/Enterprise)
   └── Clone: Copy existing workflow with "(Copy)" suffix

2. CONFIGURE STEPS
   ├── Default: Sequential step list with add/remove/edit
   ├── For each step:
   │   ├── Select approver type (Role: Direct Manager, Specific User, Group)
   │   ├── Set timeout (24h, 48h, 72h, 1 week)
   │   └── Set on-timeout action (Send Reminder, Escalate to Next Step)
   ├── Empty (0 steps): "Add at least one approval step."
   ├── Max Steps: No hard limit but show warning at 5+ steps
   └── Error: "Failed to save. Please check your configuration."

3. REVIEW SIDEBAR
   ├── Workflow metadata (created, last modified, step count, status)
   ├── Assigned teams list
   └── Active request warning — "[N] pending requests use this workflow. Changes affect new requests only." (BR-102)

4. SAVE
   ├── Loading: "Saving workflow..."
   ├── Success: Redirect to workflow list with success toast
   ├── Validation Error: Inline errors on problematic fields
   └── Error: "Failed to save. Please try again."

5. DELETE
   ├── Guard: "Remove all team assignments before deleting." (BR-104)
   ├── Confirmation: "Are you sure? This cannot be undone."
   └── Success: Redirect to workflow list
```

---

## Web Mockups

All mockups are complete, self-contained HTML files using Tailwind CSS via CDN. Open them directly in a browser.

| File | Page | Description |
|------|------|-------------|
| `mockups/conservative/dashboard-home.html` | HR Dashboard Home | Stats cards (pending, on leave, upcoming, total), pending approvals table with stale highlighting, upcoming absences sidebar, quick actions |
| `mockups/conservative/absence-calendar.html` | Absence Calendar | Monthly grid view with team members as rows, working days as columns. Color-coded bars per leave type. Pending requests shown with dashed borders. Filters for team/department. |
| `mockups/conservative/workflow-builder.html` | Workflow Builder | Form-based sequential step editor with add/remove steps, approver type/timeout/escalation config per step. Visual flow (start -> steps -> end). Sidebar with metadata and assigned teams. |
| `mockups/conservative/leave-request-detail.html` | Leave Request Detail | Full request details with "package tracking" approval stepper. Approve/Reject/Remind buttons for current approver. Balance impact visualization. Team availability sidebar. Activity log. |
| `mockups/conservative/onboarding-wizard.html` | Onboarding Wizard (Step 2) | 6-step horizontal progress bar. Step 2: Leave Types with seeded defaults (Vacation, Sick, Personal, Unpaid). Add custom type button. Helpful tip. Back/Skip/Continue navigation. |
| `mockups/conservative/employee-self-service.html` | Employee Self-Service | Balance cards with progress bars per leave type. Request history table with status badges, actions (Track, Cancel, View). Status filter dropdown. |

---

## Mobile Mockups

React Native JSX components with StyleSheet. Ready for integration into an Expo project.

| File | Component | Description |
|------|-----------|-------------|
| `mockups/conservative/mobile/LeaveRequestForm.jsx` | Leave Request Form | Bottom-sheet modal with type selection (2x2 grid with balance), date pickers, half-day toggle, working days summary, reason textarea, submit button. Loading state with spinner overlay. |
| `mockups/conservative/mobile/BalanceOverview.jsx` | Balance Overview | Balance cards with progress bars, used/pending/available legend. Upcoming holidays section. FAB for new request. Includes loading and error states. |
| `mockups/conservative/mobile/ApprovalNotification.jsx` | Approval Notification | Card with employee info, request details, team availability, approve/reject buttons. Reject shows mandatory reason modal (min 10 chars). Post-action state shows result banner. |
| `mockups/conservative/mobile/RequestStatusTracker.jsx` | Request Status Tracker | Vertical stepper with completed/current/upcoming steps. Request summary card at top. Cancel button for pending requests. |

---

## Bot Message Designs

### Slack (Block Kit JSON)

| File | Message Type | Description |
|------|-------------|-------------|
| `bot/slack-leave-confirmation.json` | Leave Request Confirmation | Header + details fields + approval chain text + context link. 8 blocks. |
| `bot/slack-approval-notification.json` | Approval Notification | Header + employee info + details + team availability + Approve/Reject/View buttons with confirmation dialog. 10 blocks. |
| `bot/slack-status-tracker.json` | Request Status Tracker | Emoji-based "package tracking" for up to 5 recent requests. Uses arrow_right between checkmark/hourglass/x emoji for step visualization. |
| `bot/slack-balance-check.json` | Balance Check | ASCII progress bars per leave type + next holiday. Ephemeral message. |

### Teams (Adaptive Cards JSON)

| File | Message Type | Description |
|------|-------------|-------------|
| `bot/teams-leave-confirmation.json` | Leave Request Confirmation | ColumnSets for details + approval chain text + "View in LeaveFlow" button. |
| `bot/teams-approval-notification.json` | Approval Notification | Employee info + details + FactSet for team availability + Action.Execute for Approve/Reject + OpenUrl for web view. |

### Bot Message Design Principles

1. **Feature parity between Slack and Teams** — Same information and actions, adapted to each platform's capabilities (Block Kit vs. Adaptive Cards).

2. **Status tracker emoji vocabulary** (consistent across all bot messages):
   - `:white_check_mark:` — Step completed
   - `:hourglass_flowing_sand:` — Currently waiting
   - `:white_circle:` — Upcoming step
   - `:x:` — Rejected
   - `:arrow_right:` — Connector between steps

3. **Balance check ASCII progress bars**: `[======----]` format for quick at-a-glance reading in a text-only environment.

4. **All messages include a "View in LeaveFlow" web link** — Handles edge cases where bot interactive elements expire (Slack 30-day limit) or when users need the full web interface.

5. **Block count budget**: All Slack messages stay well under the 25-block limit. The most complex message (approval notification) uses 10 blocks.

---

## Accessibility Notes

### WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|---------------|
| **Color Contrast** | All text/background combinations meet 4.5:1 minimum. Primary-600 on white = 4.56:1. Gray-500 on white = 4.64:1. Warning-600 on warning-50 = 5.2:1. |
| **Focus Indicators** | All interactive elements use `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600`. Visible on keyboard navigation, hidden on mouse click. |
| **Color Not Sole Indicator** | Status badges include both color AND text label. Calendar uses color + dashed borders for pending. Stepper uses icons (checkmark/clock/circle) in addition to color. |
| **Keyboard Navigation** | All interactive elements are focusable. Tab order follows visual layout. Action buttons and links are accessible via keyboard. |
| **Screen Reader Support** | All images/icons have `aria-label`. Tables use `scope="col"` for headers. Calendar cells have `role="img"` with descriptive `aria-label`. Progress bars use `role="progressbar"` with `aria-valuenow`. |
| **Touch Targets** | Mobile components enforce `minHeight: 44` or `minHeight: 48` on all touchable elements. Calendar cells and table rows exceed 44px height. |
| **Semantic HTML** | Navigation uses `<nav>` with `aria-label`. Tables use proper `<thead>`, `<tbody>`, `<th>` with `scope`. Headings follow h1-h3 hierarchy. |
| **Form Labels** | All inputs have associated `<label>` elements or `aria-label`. Select dropdowns include `sr-only` labels for screen readers. |
| **Error States** | Error messages are inline near the relevant field. They use red color + text description. They are announced to screen readers via `aria-live` regions (to be implemented). |

### Mobile-Specific Accessibility

- All `TouchableOpacity` components have `accessibilityRole` and `accessibilityLabel`
- Toggle switches have `accessibilityLabel` describing their purpose
- Radio-like selections (leave type cards) use `accessibilityRole="radio"` and `accessibilityState={{ checked }}`
- Loading states use `ActivityIndicator` which is automatically announced by VoiceOver/TalkBack

---

## Open Questions Resolution

Answers to the open questions raised in the architecture handoff:

### Q1: Should employee self-service and manager view be separate pages or tabs?

**Decision: Separate pages** with shared navigation.

Rationale: Role-based routing is simpler to implement, reason about, and test. Employees see "My Leave" and "Team Calendar". Managers see the same plus a "Team" section with pending approvals and team balances. HR admins see the full navigation. This follows the principle of showing users only what they need.

### Q2: Multi-page or single-page onboarding wizard?

**Decision: Multi-page wizard** with 6 steps.

Rationale: Multi-page keeps each step focused and reduces cognitive load. The horizontal stepper shows progress clearly. Each step is independently saveable (user can leave and resume). "Skip for now" on optional steps allows a <10 minute quick path. The target of <30 minutes for full setup is achievable because most steps have seeded defaults.

### Q3: Bot approval chain — text-based (emoji) or custom image?

**Decision: Text-based (emoji steps)**.

Rationale: Custom images would require server-side rendering infrastructure, add latency, and create accessibility problems (no screen reader support for text within images). Emoji-based tracking is universally rendered across Slack and Teams, requires zero additional infrastructure, and is accessible to screen readers. The visual vocabulary is intuitive: checkmark = done, hourglass = waiting, circle = upcoming, X = rejected.

### Q4: How to surface stale requests?

**Decision: Multi-layered approach**.

1. **Stats card badge**: Pending Approvals card shows "3 stale" amber badge
2. **Table row highlight**: Stale rows get `bg-warning-50/30` background
3. **Waiting column**: Shows duration with amber badge for >48h
4. **Remind button**: Appears on stale rows, sends notification to current approver
5. **Bot context**: Approval notifications show "Auto-escalation in [N] hours"

This surfaces staleness at every touchpoint without being intrusive.

---

## File Manifest

### Web Mockups
```
mockups/conservative/
├── dashboard-home.html          — HR Dashboard overview
├── absence-calendar.html        — Monthly team absence calendar
├── workflow-builder.html        — Form-based workflow step editor
├── leave-request-detail.html    — Request detail with approval tracker
├── onboarding-wizard.html       — Setup wizard (Step 2: Leave Types)
└── employee-self-service.html   — Employee balance cards + request history
```

### Mobile Mockups
```
mockups/conservative/mobile/
├── LeaveRequestForm.jsx         — Leave request modal
├── BalanceOverview.jsx          — Balance cards + holidays (with loading/error states)
├── ApprovalNotification.jsx     — Approve/reject card with reason modal
└── RequestStatusTracker.jsx     — Vertical stepper status tracker
```

### Bot Message Designs
```
mockups/conservative/bot/
├── slack-leave-confirmation.json       — Slack: submission confirmation
├── slack-approval-notification.json    — Slack: approve/reject with buttons
├── slack-status-tracker.json           — Slack: emoji-based tracking
├── slack-balance-check.json            — Slack: ASCII balance bars
├── teams-leave-confirmation.json       — Teams: submission confirmation
└── teams-approval-notification.json    — Teams: approve/reject with actions
```

---

## Handoff Notes for Next Stage

1. **Design system tokens** are defined inline in each mockup via Tailwind config. For implementation, extract these to a shared `tailwind.config.ts` with the color tokens and extend shadcn/ui's default theme.

2. **Component library priority** — Implement shared components first: `StatusBadge`, `LeaveTypeBadge`, `AvatarInitials`, `StepperVertical`, `EmptyState`, `ErrorState`, `LoadingState`. These are used across every page.

3. **Bot template system** — The JSON structures in the `bot/` folder represent the output format. Implementation needs a template engine that accepts request data and produces platform-specific JSON. Implement as `SlackMessageBuilder` and `TeamsCardBuilder` classes following the `BotAdapter` pattern from the architecture.

4. **Calendar performance** — The absence calendar fetches one month at a time (per architecture NFR). The sticky left column with employee names requires `position: sticky` + `z-index` coordination, which is already implemented in the mockup.

5. **i18n readiness** — All mockup text is hardcoded for demonstration. Implementation must wrap every user-facing string in `t('key')` from day one, per the architecture handoff i18n requirement.
