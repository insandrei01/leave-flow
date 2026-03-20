# Stage 2: UI/UX Design (Creative) -- LeaveFlow

**Agent**: ux-ui-expert
**Model**: opus
**Run**: 2026-03-16-design-leave-flow
**Date**: 2026-03-16
**Design Approach**: CREATIVE -- balanced innovation (Figma/Vercel/Raycast-inspired)
**Input**: 01-architecture-handoff.md, product-kb/features/leave-flow.md, 03-analysis.md

---

## Table of Contents

1. [Design System](#design-system)
2. [Design Decisions](#design-decisions)
3. [Component Hierarchy](#component-hierarchy)
4. [User Flows](#user-flows)
5. [Web Mockups](#web-mockups)
6. [Mobile Mockups](#mobile-mockups)
7. [Bot Message Designs](#bot-message-designs)
8. [Accessibility](#accessibility)
9. [Deliverables Summary](#deliverables-summary)

---

## Design System

### Foundation

**Style**: Glassmorphism meets clean SaaS -- frosted glass overlays on a neutral white canvas. Depth is created through subtle backdrop blur, layered cards, and soft shadows rather than heavy gradients or 3D effects.

**Typography**: Plus Jakarta Sans -- a friendly, modern geometric sans-serif that balances approachability with professionalism. Used for both headings and body to maintain simplicity; weight variation (300-800) creates hierarchy.

**Grid**: 4px base unit. All spacing is a multiple of 4: 4, 8, 12, 16, 20, 24, 32, 48, 64.

### Color Palette

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `primary-50` | `#EEF2FF` | 238, 242, 255 | Backgrounds, hover states |
| `primary-100` | `#E0E7FF` | 224, 231, 255 | Active nav items, badges |
| `primary-200` | `#C7D2FE` | 199, 210, 254 | Progress tracks, borders |
| `primary-300` | `#A5B4FC` | 165, 180, 252 | Inactive steps |
| `primary-400` | `#818CF8` | 129, 140, 248 | Secondary actions |
| `primary-500` | `#6366F1` | 99, 102, 241 | Primary actions, current step |
| `primary-600` | `#4F46E5` | 79, 70, 229 | Hover on primary |
| `primary-700` | `#4338CA` | 67, 56, 202 | Pressed state, emphasis text |
| `primary-900` | `#312E81` | 49, 46, 129 | Headings, logo text |
| `accent-500` | `#22C55E` | 34, 197, 94 | Approved, success, completed |
| `accent-600` | `#16A34A` | 22, 163, 74 | Hover success |
| `coral-400` | `#FB7185` | 251, 113, 133 | Sick leave, rejected, alerts |
| `coral-500` | `#F43F5E` | 244, 63, 94 | Danger, stale warnings |
| `amber-400` | `#FBBF24` | 251, 191, 36 | Personal leave, pending, warnings |
| `amber-500` | `#F59E0B` | 245, 158, 11 | Hover warning |
| `surface-50` | `#FAFBFF` | 250, 251, 255 | Page background |
| `gray-900` | `#111827` | 17, 24, 39 | Primary text |
| `gray-500` | `#6B7280` | 107, 114, 128 | Secondary text |
| `gray-400` | `#9CA3AF` | 156, 163, 175 | Placeholder, labels |
| `gray-100` | `#F3F4F6` | 243, 244, 246 | Borders, dividers |

### Status Color Mapping

| Status | Color | Background | Border |
|--------|-------|------------|--------|
| Approved | `accent-500` | `accent-50` | `accent-100` |
| Pending | `amber-400` | `amber-50` | `amber-100` |
| Rejected | `coral-500` | `coral-100` | `coral-400/20` |
| Current Step | `primary-500` | `primary-50` | `primary-200` |
| Upcoming | `gray-400` | `gray-50` | `gray-200` |
| Stale (>48h) | `coral-500` | `coral-400/5` | `coral-400/15` |

### Leave Type Colors

| Leave Type | Dot Color | Card Background | Card Border |
|------------|-----------|-----------------|-------------|
| Vacation | `primary-500` | `primary-100` | `primary-200/60` |
| Sick Leave | `coral-400` | `coral-100` | `coral-400/20` |
| Personal | `amber-400` | `amber-100` | `amber-200` |
| Remote Work | `primary-400` | `primary-100` | `primary-200/60` |

### Typography Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display` | 36px | 800 | 1.2 | Onboarding hero, empty states |
| `h1` | 24px | 700 | 1.3 | Page titles |
| `h2` | 20px | 700 | 1.3 | Section headers |
| `h3` | 16px | 600 | 1.4 | Card titles |
| `body` | 14px | 400 | 1.5 | Main text |
| `body-medium` | 14px | 500 | 1.5 | Labels, navigation |
| `small` | 12px | 400 | 1.4 | Secondary text, timestamps |
| `tiny` | 10px | 500 | 1.3 | Badges, micro-labels |

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps, inner padding |
| `space-2` | 8px | Icon gaps, list item padding |
| `space-3` | 12px | Form field gaps |
| `space-4` | 16px | Card padding (compact) |
| `space-5` | 20px | Card padding (standard) |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Page sections |
| `space-12` | 48px | Major page sections |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 8px | Badges, small buttons |
| `radius-md` | 12px | Buttons, inputs |
| `radius-lg` | 16px | Cards (compact) |
| `radius-xl` | 20px | Cards (main) |
| `radius-2xl` | 24px | Hero cards, modals |
| `radius-full` | 9999px | Avatars, pills |

### Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Buttons, tags |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.05)` | Cards on hover |
| `shadow-lg` | `0 10px 25px rgba(0,0,0,0.06)` | Elevated cards, dropdowns |
| `shadow-primary` | `0 4px 12px rgba(99,102,241,0.25)` | Primary button |
| `shadow-glass` | `0 8px 32px rgba(0,0,0,0.08)` | Glass overlays |

### Micro-Interactions

| Element | Trigger | Animation | Duration |
|---------|---------|-----------|----------|
| Button hover | `hover` | `background-color` transition | 200ms |
| Card hover | `hover` | `border-color` + `shadow` transition | 300ms |
| KPI number | Page load | Count-up + `translateY` fade | 500ms |
| Activity feed row | Page load | `translateX` slide-in, staggered | 400ms, 50ms stagger |
| Stale badge | Continuous | `box-shadow` pulse ring | 2s infinite |
| Current step dot | Continuous | Glow pulse | 2s infinite |
| Progress bar | Page load | Width from 0 to target | 1000ms ease-out |
| Progress ring (mobile) | Page load | `stroke-dashoffset` draw | 1000ms ease-out |
| Toggle switch | Tap | Thumb translate + color | 200ms |
| Notification badge | New item | Scale bounce | 300ms spring |

### Glass Effect

```css
.glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.35);
}
```

Used on: sticky header bar, modal overlays, dropdowns.

---

## Design Decisions

### Open Questions from Architecture (Resolved)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Employee self-service vs manager view: separate pages or tabs? | **Separate pages** | Different personas, different mental models. Employee sees "my stuff", manager sees "my team's stuff". Keeps navigation simple. |
| Onboarding wizard: multi-page or single-page? | **Multi-page with step sidebar** | Each step is a focused task. Progress bar + step sidebar gives orientation. Single-page would overwhelm with scroll. Target: <30 min total. |
| Bot approval chain: text-based or generated image? | **Text-based** | Text is accessible, searchable, loads instantly. Block Kit/Adaptive Cards handle formatting. Generated images add latency and complexity. |
| Stale requests: badge, color, or separate section? | **Both badge + separate section** | Badge on nav item (7 pending). Separate "Stale Requests" card on dashboard for high-visibility. Color coding (coral tint) on stale items in all views. |

### Creative Design Choices

1. **Swimlane calendar** instead of traditional month grid: Team members as rows, days as columns. Shows at-a-glance who is off when. Coverage % bars above each day column. Pending requests shown with dashed borders.

2. **Package tracking metaphor** for request detail: Vertical timeline with dot+line connectors, completed steps in green, current step pulsing in primary, upcoming steps grayed. Inspired by delivery tracking UX (FedEx, Amazon).

3. **Progress rings** for balance display: SVG donut charts that animate on load. Visually satisfying, immediately conveys "how much is left" without reading numbers. Color-coded per leave type.

4. **Bento-style KPI cards**: Dashboard uses varied-information-density cards rather than uniform metrics. Sparkline bar charts, progress indicators, avatar stacks all within the KPI row.

5. **Live preview panel** in workflow builder: Right sidebar shows the approval chain as a visual flow diagram. Updates in real-time as the user adds/removes/edits steps. Provides confidence before saving.

6. **Carryover alert card**: Prominent gradient card in employee self-service warning about expiring carryover days. Creates urgency without being annoying.

---

## Component Hierarchy

### Layout Components

```
AppShell
  Sidebar
    SidebarLogo
    SidebarNav
      SidebarNavItem (with optional badge count)
    SidebarUserFooter
  MainContent
    StickyHeader (glass effect)
      Breadcrumb
      SearchBar
      NotificationBell (with badge)
    PageContent
```

### Core Components

```
Button
  variants: primary, secondary, ghost, danger, accent
  sizes: sm, md, lg
  states: default, hover, active, disabled, loading

Card
  variants: default, interactive (hover effect), glass, gradient
  padding: compact (16px), standard (20px), spacious (24px)

Badge
  variants: status (approved/pending/rejected), count, label
  sizes: sm, md

Avatar
  variants: initials (gradient bg), image
  sizes: xs (24px), sm (28px), md (36px), lg (56px)

ProgressBar
  variants: linear, circular (ring)
  with label, with percentage

Input
  variants: text, select, textarea, date-picker
  states: default, focus, error, disabled

Tag/Chip
  variants: removable, static
  with dot indicator

StatusIndicator
  variants: dot (sm), badge (with text), timeline-node

Toggle
  with label

Table
  with sorting, pagination, row hover
  responsive: collapses to card view on mobile
```

### Composite Components

```
KPICard
  icon + label + value + trend badge + sparkline

ApprovalTimeline
  vertical timeline with step nodes
  variants: compact (bot/mobile), expanded (web detail)

SwimlanCalendar
  team-grouped rows + day columns
  coverage bar headers
  leave type blocks (solid=approved, dashed=pending)

WorkflowPreview
  vertical step chain with connectors
  start node -> step nodes -> end node

BalanceRing
  SVG progress ring with center label
  animated draw on mount

ActivityFeedItem
  icon + description + timestamp
  hover state

StaleRequestCard
  avatar + name + leave info + elapsed time + reminder button
  coral-tinted background

OnboardingStepNav
  step list with completed/current/upcoming states
  sidebar layout
```

### Page-Specific Components

```
DashboardPage
  GreetingBar
  KPICardRow (4 cards)
  SwimlanCalendar (mini, this week)
  StaleRequestsList
  ActivityFeed
  LeaveTypeBreakdownChart

AbsenceCalendarPage
  ViewToggle (swimlane/calendar/list)
  WeekNavigator
  CoverageWarningBanner
  SwimlanCalendar (full, multi-team)
  Legend

LeaveRequestDetailPage
  RequestSummaryCard
  ApprovalTimeline (expanded)
  BalanceImpactCard
  TeamImpactCard
  AuditLogTimeline

WorkflowBuilderPage
  WorkflowInfoForm
  StepEditor (list of step cards)
  AddStepButton
  WorkflowPreview (sticky sidebar)
  TemplateSelector

OnboardingWizardPage
  StepSidebar
  GlobalProgressBar
  StepContent (varies per step)
  NavigationFooter

EmployeeSelfServicePage
  BalanceRingRow (4 cards)
  ActiveRequestTracker (horizontal)
  RequestHistory
  TeamAbsencesList
  NextHolidayCard

ManagerViewPage
  TeamCalendarPreview
  PendingApprovalsForTeam
  TeamBalanceSummary
```

---

## User Flows

### Flow 1: Employee Requests Leave (Happy Path)

```
[Bot] Employee types /leave in Slack
  -> Bot shows modal (leave type, dates, half-day, reason)
  -> Employee fills form, submits
  -> Bot confirms: "Request submitted! Here's your approval chain..."
  -> Bot shows chain preview: Step 1 -> Step 2 -> Step 3
  -> [Background] API creates request, notifies Step 1 approver

[Web alternative] Employee logs into web
  -> Clicks "Request Leave" button
  -> Same form fields in a dialog/page
  -> Submits, sees confirmation with timeline
```

**States**:
- **Default**: Form with pre-filled leave type (most common)
- **Loading**: Submit button shows spinner, disabled
- **Success**: Confirmation message with chain preview
- **Error**: Validation error inline (insufficient balance, blackout period, overlap)
- **Empty**: No leave types configured (admin not done onboarding)

### Flow 2: Manager Approves Leave

```
[Bot] Manager receives DM from bot
  -> Approval card shows: requester, dates, duration, reason
  -> Context panel: team coverage %, balance after, who else is off
  -> One-click [Approve] or [Reject]
  -> On Approve: bot confirms, notifies employee, moves to next step
  -> On Reject: modal asks for mandatory reason, then notifies employee

[Web] Manager visits Pending Approvals page or Manager View
  -> Table/list of pending requests
  -> Click to expand detail
  -> Same approve/reject flow
```

**States**:
- **Default**: Card with context, action buttons active
- **Loading**: Button shows spinner after click
- **Approved**: Card updates to "You approved this request" with timestamp
- **Rejected**: Card updates to "You rejected this request" with reason shown
- **Stale**: Coral-tinted card with "Pending X hours" badge
- **Delegated**: Card shows delegate info ("Acting for [Manager Name]")

### Flow 3: HR Reviews Dashboard

```
HR Admin opens web dashboard
  -> Sees KPI cards: pending approvals (with stale count), out today, weekly requests, avg approval time
  -> Swimlane calendar shows this week's absences
  -> Stale requests panel highlights bottlenecks
  -> Activity feed shows recent actions
  -> HR can: send reminders, force approve/reject, export reports
```

**States**:
- **Default**: All data loaded, interactive
- **Loading**: Skeleton cards with shimmer animation
- **Empty**: "No pending approvals" illustration + congratulatory message
- **Error**: Error banner at top, retry button
- **Filtered**: Active filter badges shown, data updates

### Flow 4: Company Onboarding

```
Admin clicks "Get Started"
  -> Registration form (company name, admin email, password)
  -> Email verification
  -> Optional: Connect Slack or Teams (OAuth flow)
  -> 6-step wizard:
    1. Company Profile (timezone, fiscal year, work week)
    2. Leave Types (defaults provided, customizable)
    3. Approval Workflow (template selection + customize)
    4. Create Teams (name teams, assign workflows)
    5. Add Employees (manual or CSV import)
    6. Holiday Calendar (select country)
  -> "You're all set!" celebration screen
```

**States per step**:
- **Default**: Form with sensible defaults
- **Validation error**: Inline error messages
- **Skipped**: "Skipped -- you can configure later" badge
- **Complete**: Green checkmark in step sidebar
- **CSV Import**: Upload zone, preview table, error rows highlighted

### Flow 5: Employee Checks Balance

```
[Bot] Employee types /leave balance
  -> Bot shows balance card per leave type
  -> Progress bars with remaining/total
  -> Alerts for carryover expiry
  -> Quick actions: Request Leave, View Calendar

[Web] Employee visits My Dashboard
  -> Progress ring cards for each leave type
  -> Carryover alert card (if applicable)
  -> Active request tracker (if pending)
  -> Recent request history
```

### Flow 6: Stale Request Escalation

```
Request pending > configured timeout (e.g., 48h)
  -> System sends reminder to approver (bot DM)
  -> After N reminders, escalation action triggers:
    Option A: Auto-escalate to next step
    Option B: Notify HR admin
    Option C: Continue reminding (max 3)
  -> HR dashboard shows stale request in dedicated panel
  -> HR can force-approve or force-reject
  -> All actions logged in audit trail
```

---

## Web Mockups

All mockups are fully interactive HTML files using Tailwind CSS v4, located at:

| Page | File | Key Design Elements |
|------|------|---------------------|
| Dashboard Home | `mockups/creative/dashboard-home.html` | Bento KPI cards with sparklines, swimlane calendar preview, stale requests panel, activity feed, donut chart breakdown |
| Absence Calendar | `mockups/creative/absence-calendar.html` | Swimlane view with team grouping, coverage % bars, dashed pending blocks, low-coverage warning banner |
| Leave Request Detail | `mockups/creative/leave-request-detail.html` | Package tracking timeline (vertical), pulsing current step, balance impact ring, team coverage indicator |
| Workflow Builder | `mockups/creative/workflow-builder.html` | Form-based step editor with live preview sidebar, template selector, visual chain connector |
| Onboarding Wizard | `mockups/creative/onboarding-wizard.html` | Multi-page with step sidebar, template selection cards, global progress bar, time estimate |
| Employee Self-Service | `mockups/creative/employee-self-service.html` | SVG progress rings, horizontal request tracker, carryover alert gradient card, team absences |

### Design Patterns Used

- **Glassmorphism header**: Sticky top bar with `backdrop-filter: blur(16px)` for depth
- **Card-based layout**: Every data grouping is a distinct card with rounded corners and subtle border
- **Color-coded status**: Consistent color language across all views (green=approved, amber=pending, coral=rejected/stale)
- **Progressive disclosure**: Details hidden behind hover states and click-to-expand
- **Consistent navigation**: 264px sidebar with icon+label nav, active state with primary-50 background

---

## Mobile Mockups

React Native JSX mockup components, located at `mockups/creative/mobile/`:

| Screen | File | Key Design Elements |
|--------|------|---------------------|
| Leave Request Form | `LeaveRequestForm.jsx` | Balance card at top, leave type chips, gesture-hint calendar with swipe-to-select date range, approval chain preview |
| Balance Overview | `BalanceOverview.jsx` | Large animated SVG progress ring, per-type cards with progress bars and details, accrual/carryover info |
| Approval Notification | `ApprovalNotification.jsx` | Swipe-to-approve cards with context (coverage, balance), stale badge, action buttons fallback |
| Request Timeline | `RequestTimeline.jsx` | Vertical timeline with animated dots, horizontal progress bar, step detail cards |

### Mobile Design Principles

- **44px minimum touch targets** on all interactive elements
- **16px minimum body text** for readability
- **Bottom sheet** for date picker (native gesture-based)
- **Swipe gestures** with visual affordance (instruction banner)
- **Haptic feedback** on swipe threshold (implementation note)
- **Safe area** handling for notch/home indicator devices

---

## Bot Message Designs

Platform-agnostic templates with Slack Block Kit and Teams Adaptive Card representations, located at `mockups/creative/bot/bot-messages.md`:

| Message | Purpose | Key Elements |
|---------|---------|-------------|
| Leave Request Confirmation | Sent to employee after submission | Summary card + approval chain preview with step indicators |
| Approval Notification | Sent to approver | Requester info + leave details + team context (coverage %, balance) + approve/reject buttons |
| Status Tracker | Response to `/leave status` | Vertical step tracker with completed/current/upcoming indicators |
| Balance Check | Response to `/leave balance` | Progress bars per leave type + carryover alerts |

### Bot Design Principles

1. **No emojis as icons**: Text-based indicators (`[check]`, `[>>]`, `[!]`) that render consistently across platforms
2. **Context-rich**: Approval notifications include balance-after, team coverage, who else is off
3. **Consistent structure**: Header -> Content -> Context -> Actions across all message types
4. **Platform parity**: Same information in both Slack Block Kit and Teams Adaptive Card formats
5. **Actionable**: Every message includes at least one CTA button
6. **Under 25 blocks** (Slack) and **under 28KB** (Teams) for all messages

---

## Accessibility

### WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|----------------|
| Color contrast 4.5:1 | Primary text `gray-900` on `white` = 15.4:1. Secondary text `gray-500` on `white` = 5.9:1. All pass. |
| Focus indicators | `focus:ring-2 focus:ring-primary-500/30` on all interactive elements. Visible 2px ring. |
| Keyboard navigation | All sidebar nav, buttons, form fields reachable via Tab. Logical tab order matches visual order. |
| Screen reader support | `aria-label` on icon-only buttons, `aria-pressed` on toggles, `role="radio"` on leave type chips. |
| Touch targets | Minimum 44x44px on all mobile interactive elements. Sidebar nav items have 40px height + 8px padding. |
| Color not sole indicator | Status always has text label alongside color dot. Progress bars have percentage text. |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` disables all animations. |
| Form labels | All inputs have associated `<label>` elements with `for` attribute or `aria-label`. |
| Alt text | SVG icons have `aria-hidden="true"` (decorative) or descriptive `aria-label`. |
| Semantic HTML | `<header>`, `<nav>`, `<main>`, `<aside>`, `<section>` used appropriately. |

### Dark Mode

Dark mode is deferred to Phase 2 per architecture decision. The design system tokens are structured to support a dark mode variant when ready (all colors referenced via tokens, no hardcoded values in components).

---

## Deliverables Summary

### Files Created

| Path | Type | Description |
|------|------|-------------|
| `mockups/creative/dashboard-home.html` | Web Mockup | HR dashboard with KPIs, calendar, activity feed |
| `mockups/creative/absence-calendar.html` | Web Mockup | Swimlane team calendar with coverage bars |
| `mockups/creative/leave-request-detail.html` | Web Mockup | Package tracking approval journey |
| `mockups/creative/workflow-builder.html` | Web Mockup | Form-based step editor with live preview |
| `mockups/creative/onboarding-wizard.html` | Web Mockup | 6-step setup wizard with template selection |
| `mockups/creative/employee-self-service.html` | Web Mockup | Balance rings, request tracker, team view |
| `mockups/creative/mobile/LeaveRequestForm.jsx` | Mobile Mockup | Gesture-based date picker, chain preview |
| `mockups/creative/mobile/BalanceOverview.jsx` | Mobile Mockup | Animated progress rings per leave type |
| `mockups/creative/mobile/ApprovalNotification.jsx` | Mobile Mockup | Swipe-to-approve with team context |
| `mockups/creative/mobile/RequestTimeline.jsx` | Mobile Mockup | Vertical animated timeline |
| `mockups/creative/bot/bot-messages.md` | Bot Designs | 4 message templates (Slack + Teams) |
| `assets/hero-bg.png` | Image Asset | Abstract indigo gradient background |
| `assets/feature-workflow.png` | Image Asset | Workflow illustration |
| `assets/feature-team.png` | Image Asset | Team management illustration |

### Design System Summary

- **Style**: Glassmorphism + Clean SaaS hybrid
- **Colors**: Indigo primary (#6366F1), Green accent (#22C55E), Coral alerts (#FB7185), Amber warnings (#FBBF24)
- **Typography**: Plus Jakarta Sans (300-800)
- **Grid**: 4px base, spacing scale 4-64px
- **Radius**: 8-24px scale, rounded-full for avatars
- **Animations**: 150-300ms micro-interactions, prefers-reduced-motion respected
- **Components**: shadcn/ui compatible (Radix UI primitives + Tailwind CSS)
- **Framework**: Next.js 15 + React + Tailwind CSS v4

### Answers to Architecture Open Questions

1. **Employee self-service vs manager view**: Separate pages. Different personas need different information architecture.
2. **Onboarding wizard layout**: Multi-page with persistent step sidebar. Each step is focused; progress bar + step list provides orientation.
3. **Bot approval chain visualization**: Text-based. Accessible, fast-loading, consistent across Slack/Teams.
4. **Stale request surfacing**: Badge on nav item + dedicated "Stale Requests" card on dashboard + coral color coding in all list views.
