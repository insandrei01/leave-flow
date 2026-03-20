# Stage 2: UI/UX Design (Experimental) — LeaveFlow

**Agent**: ux-ui-expert
**Model**: opus
**Run**: 2026-03-16-design-leave-flow
**Date**: 2026-03-16
**Approach**: EXPERIMENTAL — bold, distinctive, memorable
**Input**: 01-architecture-handoff.md, product-kb/features/leave-flow.md, 03-analysis.md

---

## Table of Contents

1. [Design System Tokens](#1-design-system-tokens)
2. [Web Mockups](#2-web-mockups)
3. [Mobile Mockups](#3-mobile-mockups)
4. [Bot Message Designs](#4-bot-message-designs)
5. [Component Hierarchy](#5-component-hierarchy)
6. [User Flows](#6-user-flows)
7. [Summary](#7-summary)

---

## 1. Design System Tokens

### Design Direction

**Experimental approach**: Dark-first glassmorphic SaaS with bento grid layouts. Inspired by Arc Browser's spatial organization, Amie Calendar's tactile animations, and Linear's dark-mode data density. This deliberately breaks from the typical light-themed HR tool aesthetic to position LeaveFlow as a modern, developer-friendly product.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#0A0E1A` | Base background — near-black with blue undertone |
| `surface-raised` | `#111827` | Elevated surfaces (cards, modals) |
| `surface-overlay` | `#1F2937` | Overlay backgrounds |
| `glass` | `rgba(255,255,255,0.04)` | Glassmorphic card backgrounds |
| `glass-border` | `rgba(255,255,255,0.06)` | Card borders |
| `glass-hover` | `rgba(255,255,255,0.10)` | Card hover state |
| `accent-indigo` | `#818CF8` | Primary — actions, links, active states |
| `accent-violet` | `#A78BFA` | Secondary — support, secondary actions |
| `accent-emerald` | `#34D399` | Success — approved, completed, positive |
| `accent-amber` | `#FBBF24` | Warning — pending, attention needed |
| `accent-rose` | `#FB7185` | Danger — rejected, errors, urgent |
| `accent-cyan` | `#22D3EE` | Info — informational, links |
| `text-primary` | `#FFFFFF` | Primary text |
| `text-secondary` | `#9CA3AF` | Secondary text |
| `text-tertiary` | `#6B7280` | Muted text, labels |

**Gradient mesh background**: Radial gradients of indigo, violet, and emerald at low opacity (5-12%) create ambient depth without distraction.

### Typography

| Token | Font | Size Range | Weight | Usage |
|-------|------|-----------|--------|-------|
| `display` | Space Grotesk | 28-48px | 600-700 | Headlines, page titles, large numbers |
| `body` | DM Sans | 13-16px | 400-500 | Body text, descriptions, labels |
| `mono` | JetBrains Mono | 9-13px | 400-500 | Data, timestamps, codes, badges, IDs |

**Experimental typography choices:**
- Space Grotesk for display gives a technical-but-warm personality
- JetBrains Mono for data creates precision and a developer-tool aesthetic
- Monospace is used extensively for timestamps, IDs, and metrics — treating data as a first-class visual element

### Spacing Scale

Based on 4px grid: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`

Key spacing patterns:
- Card padding: `24px` (p-6)
- Grid gap: `16px` (gap-4)
- Section spacing: `32px` (gap-8)
- Component internal: `12-16px`

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-lg` | 8px | Small elements (badges, inputs) |
| `rounded-xl` | 12px | Buttons, small cards |
| `rounded-2xl` | 16px | Primary cards, containers |
| `rounded-full` | 9999px | Avatars, pills, badges |

### Motion Design Language

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `slide-up` | 600ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Card entrance, page transitions |
| `slide-right` | 500ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Sidebar, list item entrance |
| `fade-in` | 400ms | `ease-out` | Subtle element appearance |
| `hover-scale` | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Card hover (scale 1.02) |
| `pulse-slow` | 4000ms | default pulse | Ambient background orbs |
| `glow` | 2000ms | ease-in-out, alternate | Logo, active indicators |
| `shimmer` | 3000ms | ease-in-out, infinite | Loading/awaiting states |

**Reduced motion**: All animations respect `prefers-reduced-motion: reduce` with instant fallback.

### Effects

| Effect | Implementation | Usage |
|--------|---------------|-------|
| Glassmorphism | `backdrop-filter: blur(24px)` + 4% white bg | All cards |
| Gradient mesh | Radial gradients on body | Page background |
| Ambient orbs | Blurred circles with pulse animation | Background decoration |
| Glow ring | `box-shadow` animation on logo | Brand identity |
| Shimmer bar | Moving gradient background | Loading/awaiting states |
| Conic gradient | `conic-gradient()` for donut charts | Data visualization |
| Balance rings | SVG circle `stroke-dashoffset` | Employee balance display |

### Anti-patterns to Avoid

- NO emoji as icons (use SVG: Heroicons/Lucide)
- NO flat/light-themed cards — maintain dark glass aesthetic
- NO layout-shifting hover animations (use color/opacity/subtle scale only)
- NO heavy continuous animations (ambient only, respect reduced-motion)
- NO linear easing for UI transitions (use spring curves)
- NO custom scrollbars visible (hide with `scrollbar-none`)

---

## 2. Web Mockups

All mockups are standalone HTML files using Tailwind CSS CDN, viewable by opening in any browser.

### 2.1 Dashboard Home — `dashboard-home.html`
**Layout**: Bento grid (4-column) with glassmorphic cards
**Key features**:
- Gradient mesh background with animated ambient orbs
- KPI row: 4 stat cards (out today, pending approvals, utilization rate, upcoming week)
- Absence heatmap: GitHub-contribution-style grid for the month, color intensity = absence density, coverage warnings highlighted in rose
- Resolution donut: Conic-gradient ring chart showing approve/pending/reject ratio
- Activity feed: Timeline with color-coded event dots and relative timestamps
- Needs-attention section: Stale requests with urgency indicators and quick actions (Remind, Force Approve)
- Team balances: Mini bar charts per team showing vacation/sick/personal remaining

### 2.2 Absence Calendar — `absence-calendar.html`
**Layout**: Swim-lane Gantt chart (innovative departure from traditional monthly grid)
**Key features**:
- Teams as collapsible row groups, employees as individual lanes
- Absence bars: colored by leave type, solid for approved, dashed border for pending, strikethrough for rejected
- Today column: highlighted with indigo background strip
- Coverage warning row: alerts when any day drops below coverage threshold
- View toggles: Month / Week / Heatmap modes
- Filter/search in header
- Legend footer with status explanations

### 2.3 Workflow Builder — `workflow-builder.html`
**Layout**: 2/3 form + 1/3 live preview split
**Key features**:
- Left (2 cols): Stacked form cards for each workflow step with connectors between them (CSS pseudo-elements)
- Each step card has: approver type selector, timeout action, timeout hours, delegation toggle
- Step cards have colored left borders (emerald for trigger/end, indigo/violet for approval steps)
- Move up/down and delete controls per step
- Add Step button at bottom
- Right (1 col): Live visual preview — mini node-based diagram that updates as form changes
- Preview shows estimated resolution time with progress bar
- Template selector: 4 quick-start templates (Simple, Standard, Enterprise, Custom)
- Assigned teams list

### 2.4 Leave Request Detail — `leave-request-detail.html`
**Layout**: Single-column, centered, story-like
**Key features**:
- Request header card: employee avatar, name, department, dates, type, working days
- Impact grid: balance after, working days, team impact, holiday overlap
- **Approval Journey**: Package-tracking-inspired vertical timeline
  - Completed steps: green checkmark dot
  - Active step: animated pulsing indigo dot with expanded card showing approver details, approve/reject buttons, and countdown timer
  - Future steps: dimmed/translucent
  - Gradient vertical line connecting all steps
  - Shimmer animation on "Awaiting" badge
- Audit trail: chronological log with colored action badges (CREATE, VALIDATE, NOTIFY)

### 2.5 Onboarding Wizard — `onboarding-wizard.html`
**Layout**: 3/9 progress sidebar + 9/9 content area
**Key features**:
- Circular progress ring (SVG with gradient stroke) showing completion
- Step list with completed (green checkmark, strikethrough), active (highlighted), and future (dimmed) states
- Estimated time remaining
- Template selection for workflow step: 3 cards with mini flow previews (Simple, Standard, Enterprise)
- Selected card has ring highlight
- Inline customization form for selected template
- Skip option + Back/Continue navigation
- Gamification through visual progress and time estimates

### 2.6 Employee Self-Service — `employee-self-service.html`
**Layout**: Bento grid (3-column)
**Key features**:
- Balance rings: SVG radial charts per leave type (vacation/sick/personal) with animated `stroke-dashoffset`
- Low balance highlighted in amber
- Accrual/carryover info footer
- Active request tracker: mini vertical journey timeline showing real-time status
- Request history: chronological list with colored type indicators and status badges
- Team calendar mini: shows who is out this week with day-by-day presence bars
- Upcoming holidays: horizontal scroll strip with countdown

---

## 3. Mobile Mockups

All mockups are React Native JSX components using Expo, Reanimated 3, and Gesture Handler.

### 3.1 Leave Request — `LeaveRequestScreen.jsx`
- AI suggestion banner with spring-animated press feedback and haptic tap
- Leave type selector with animated selection highlight and haptic feedback
- Date range display with working-days badge connector
- Half-day toggle
- Impact preview with balance, coverage, holiday overlap
- Gradient submit button with type/date summary

### 3.2 Balance — `BalanceScreen.jsx`
- Summary card with total days/used/percentage in 3-column layout
- Individual balance cards with large numbers, progress bars, and low-balance warnings
- Monthly usage sparkline bar chart
- Accrual and carryover info
- Uses Skia for radial chart rendering

### 3.3 Approval — `ApprovalScreen.jsx`
- Swipeable approval cards: swipe right to approve, left to reject
- Background reveal behind card shows action text
- Pan gesture with spring physics and haptic feedback at action threshold
- Tap-based approve/reject buttons as alternative interaction
- Recently resolved list
- Reanimated 3 spring animations on all press interactions

### 3.4 Status Journey — `StatusJourneyScreen.jsx`
- Animated pulse dot on active step with repeating scale/opacity animation
- Package-tracking-style vertical timeline
- Completed steps have green dots and "Done" badges
- Active step expanded with approver details, timing info, notification source
- Future steps dimmed
- Request summary card at top
- Cancel request button at bottom

---

## 4. Bot Message Designs

### 4.1 Slack (Block Kit) — `bot/slack-messages.md`
6 message templates:
1. **Approval request**: Header + avatar section + 2x2 fields + quoted reason + approval chain with emoji progress + approve/reject/view buttons + auto-escalation countdown
2. **Approved notification**: Celebration header + fields + complete journey chain + side-effects footer
3. **Rejected notification**: Attention header + fields + quoted reason in blockquote + "Submit New Request" CTA
4. **Stale reminder**: Hourglass header + fields + approve/reject buttons + escalation countdown warning
5. **Balance check**: ASCII progress bars in code block for visual density
6. **Team announcement**: Single minimal context block (privacy: no leave type)

### 4.2 Teams (Adaptive Cards) — `bot/teams-cards.md`
4 card templates with feature parity:
1. **Approval request**: Person-style avatar + ColumnSet + FactSet + emphasized approval chain container + Action.Execute buttons
2. **Approved notification**: Good-colored header + FactSet + emphasized journey + side-effects
3. **Rejected notification**: Attention-colored header + FactSet + attention container for reason + new request action
4. **Balance check**: 3-column balance display with warning color for low balances

### Platform Parity Notes
- Both platforms show identical data and support identical actions
- Approval chain visualization: emoji-based in Slack, ColumnSet-based in Teams
- Balance display: ASCII bars in Slack, ColumnSet percentages in Teams
- Privacy rule (BR-092): both hide leave type in team channel announcements

---

## 5. Component Hierarchy

### Core UI Components (shadcn/ui foundation)

```
LeaveFlowApp
+-- AppShell
|   +-- Sidebar
|   |   +-- Logo
|   |   +-- NavItem (active, default, with badge)
|   |   +-- UserProfile
|   +-- MainContent
|       +-- PageHeader
|       |   +-- Title + Subtitle
|       |   +-- SearchBar (glass-card)
|       |   +-- NotificationBell (with count badge)
|       +-- [Page content]
|
+-- Components (shared library)
|   +-- GlassCard (base container, hover states)
|   +-- StatCard (icon, number, label, trend badge)
|   +-- BalanceRing (SVG radial chart)
|   +-- JourneyTimeline
|   |   +-- JourneyStep (completed, active, upcoming)
|   |   +-- PulseDot
|   |   +-- ShimmerBadge
|   +-- AbsenceBar (approved, pending, rejected variants)
|   +-- HeatmapCell (intensity-based color)
|   +-- ApprovalDonut (conic-gradient ring)
|   +-- ActivityItem (icon dot + text + timestamp)
|   +-- RequestRow (avatar, details, status, actions)
|   +-- TeamBalanceCard (mini bar chart)
|   +-- WorkflowNode (trigger, step, end variants)
|   +-- WorkflowConnector (vertical line + arrow)
|   +-- ProgressRing (SVG circular progress)
|   +-- Badge (status, count, tag variants)
|   +-- Button (primary, secondary, ghost, danger, icon-only)
|   +-- Toggle (switch with label)
|   +-- Select (dropdown with glass styling)
|   +-- Input (text, number with glass styling)
|   +-- DatePicker (range, single)
|   +-- Avatar (initials, gradient background)
|   +-- Tooltip (glass overlay)
|   +-- EmptyState (icon, title, description, CTA)
|   +-- LoadingState (skeleton cards, shimmer)
|   +-- ErrorState (icon, message, retry)
|
+-- Pages
    +-- DashboardHome
    |   +-- KPIGrid (4x StatCard)
    |   +-- AbsenceHeatmap
    |   +-- ApprovalDonut
    |   +-- ActivityFeed
    |   +-- NeedsAttention (RequestRow list)
    |   +-- TeamBalances (TeamBalanceCard grid)
    +-- AbsenceCalendar
    |   +-- ViewToggle (Month/Week/Heatmap)
    |   +-- MonthNav
    |   +-- SwimLaneGrid
    |   |   +-- TeamGroup (collapsible)
    |   |   +-- EmployeeLane (AbsenceBar instances)
    |   |   +-- CoverageWarningRow
    |   +-- CalendarLegend
    +-- WorkflowBuilder
    |   +-- WorkflowStepList
    |   |   +-- TriggerNode
    |   |   +-- ApprovalStepCard (form fields, reorderable)
    |   |   +-- EndNode
    |   |   +-- AddStepButton
    |   +-- LivePreview
    |   |   +-- MiniNodeDiagram
    |   |   +-- ResolutionEstimate
    |   +-- TemplateSelector
    |   +-- AssignedTeams
    +-- LeaveRequestDetail
    |   +-- RequestHeader (avatar, summary, dates)
    |   +-- ImpactGrid
    |   +-- JourneyTimeline
    |   +-- AuditTrail
    +-- OnboardingWizard
    |   +-- ProgressSidebar
    |   |   +-- ProgressRing
    |   |   +-- StepList
    |   |   +-- TimeEstimate
    |   +-- StepContent (varies per step)
    |   +-- TemplateCards
    |   +-- WizardNav (Back/Continue/Skip)
    +-- EmployeeSelfService
    |   +-- BalanceRings (3x)
    |   +-- ActiveRequestTracker
    |   +-- RequestHistory
    |   +-- TeamCalendarMini
    |   +-- UpcomingHolidays
    +-- PendingApprovals
    +-- LeaveBalanceReport
    +-- AuditTrail
    +-- LeaveTypeConfig
    +-- TeamManagement
    +-- EmployeeManagement
    +-- ManagerView
    +-- BillingPage
    +-- SettingsPage
```

### Mobile Components (React Native)

```
LeaveFlowMobile
+-- Navigation (Tab Navigator)
|   +-- HomeTab -> BalanceScreen
|   +-- RequestTab -> LeaveRequestScreen
|   +-- ApprovalsTab -> ApprovalScreen (manager only)
|   +-- StatusTab -> StatusJourneyScreen
|
+-- Shared Components
    +-- GlassCard (LinearGradient + border)
    +-- BalanceRing (Skia Canvas)
    +-- PulseDot (Reanimated)
    +-- SwipeableCard (Gesture Handler + Reanimated)
    +-- AISuggestionBanner
    +-- LeaveTypeCard (selectable, animated)
    +-- DateRangeDisplay
    +-- JourneyStep
    +-- SparklineChart
    +-- HapticButton (press feedback)
```

---

## 6. User Flows

### 6.1 Leave Request Flow (Employee)

```
Employee opens LeaveFlow (bot or web)
  |
  +--> [Web] Navigate to Self-Service > "Request Leave" button
  |    OR
  +--> [Slack] Type /leave
  |    OR
  +--> [Teams] Type /leave
  |    OR
  +--> [Mobile] Tap "Request Leave" button
  |
  +--> Leave Request Form appears
  |    States:
  |    - DEFAULT: Form with leave type selector, date picker, half-day toggle, reason
  |    - LOADING: Fetching leave types and balances (skeleton)
  |    - ERROR: Failed to load employee context
  |    - AI_SUGGESTION: Smart suggestion banner appears (bridge holidays, etc.)
  |
  +--> Employee selects type, dates
  |    Validation (real-time):
  |    - Balance check (insufficient = inline error)
  |    - Overlap check (duplicate dates = inline error)
  |    - Blackout period check (blocked = inline error)
  |    - Working days calculation (auto-excludes weekends/holidays)
  |    - Coverage check (preview only, not blocking)
  |
  +--> Employee submits
  |    States:
  |    - SUBMITTING: Button disabled, spinner
  |    - SUCCESS: Confirmation with approval chain preview
  |    - VALIDATION_ERROR: Inline errors on fields
  |    - SERVER_ERROR: Error toast with retry
  |
  +--> Confirmation shown
       - Request ID displayed
       - Approval chain preview (who will review)
       - Estimated timeline
       - Link to track status
```

### 6.2 Approval Flow (Manager)

```
Approver receives notification
  |
  +--> [Slack] DM with Block Kit card (approve/reject buttons)
  +--> [Teams] DM with Adaptive Card (Action.Execute)
  +--> [Web] Dashboard > Pending Approvals badge
  +--> [Mobile] Push notification + Approvals tab
  |
  +--> Approver reviews request
  |    Information shown:
  |    - Employee name, team, leave type
  |    - Dates, working days, reason
  |    - Balance after approval
  |    - Team coverage impact
  |    - Others out on same dates
  |    - Approval chain position
  |
  +--> APPROVE path:
  |    +--> [Bot] One-click approve button
  |    +--> [Web] Approve button on detail page
  |    +--> [Mobile] Swipe right or tap Approve
  |    |
  |    +--> States:
  |         - CONFIRMING: Brief confirmation (no modal for single-step)
  |         - PROCESSING: Spinner
  |         - SUCCESS: Card updates to "Approved" state
  |         - FORWARDED: If multi-step, "Forwarded to next approver" state
  |
  +--> REJECT path:
       +--> [Bot] Reject button -> modal for mandatory reason
       +--> [Web] Reject button -> inline reason field
       +--> [Mobile] Swipe left -> reason input sheet
       |
       +--> States:
            - REASON_REQUIRED: Reason field appears
            - SUBMITTING: Processing rejection
            - SUCCESS: Card updates to "Rejected" state
```

### 6.3 HR Dashboard Flow

```
HR Admin logs in
  |
  +--> Dashboard Home (default view)
  |    States:
  |    - DEFAULT: Bento grid with all widgets populated
  |    - LOADING: Skeleton cards
  |    - EMPTY: Zero state for new companies (setup prompt)
  |    - ERROR: Partial error (individual widget shows error, others work)
  |
  +--> Key actions from dashboard:
  |    - Click "Pending Approvals" KPI -> Pending Approvals page
  |    - Click "Needs Attention" row -> Request Detail page
  |    - Click heatmap cell -> Calendar filtered to that day
  |    - Click team balance card -> Balance Report filtered to team
  |    - Click activity item -> Related entity (request, policy, etc.)
  |
  +--> Absence Calendar
  |    States:
  |    - DEFAULT: Swim lanes with current month
  |    - FILTERED: By team, department, or search
  |    - EXPANDED: Team group expanded showing individuals
  |    - COLLAPSED: Team group collapsed showing aggregated density
  |    - COVERAGE_WARNING: Row highlighted when below threshold
  |    - EMPTY: No absences for the selected period
  |
  +--> Pending Approvals
       States:
       - DEFAULT: Table sorted by age (oldest first)
       - FILTERED: By team, age threshold
       - STALE_HIGHLIGHTED: Rows >48h highlighted in rose
       - EMPTY: "All caught up" state
       - AFTER_ACTION: Row animates out after approve/reject
```

### 6.4 Onboarding Flow (Company Admin)

```
Visitor clicks "Get Started"
  |
  +--> Registration Form
  |    Fields: company name, admin email, password
  |    States: DEFAULT, VALIDATING, ERROR, SUCCESS
  |
  +--> Email Verification
  |    States: SENT, VERIFIED, EXPIRED (resend link)
  |
  +--> Platform Connection (optional)
  |    - Connect Slack (OAuth flow)
  |    - Connect Teams (OAuth flow)
  |    - Skip for now
  |
  +--> Setup Wizard (6 steps)
       |
       +--> Step 1: Company Profile
       |    Fields: timezone, fiscal year start, work week config
       |    States: DEFAULT, SAVING, SAVED
       |
       +--> Step 2: Leave Types
       |    - Seeded defaults shown (Vacation, Sick, Personal)
       |    - Add custom types
       |    - Configure paid/unpaid, approval required
       |    States: DEFAULT, CUSTOM_ADDING, SAVED
       |
       +--> Step 3: Workflow (shown in mockup)
       |    - Template selection (Simple, Standard, Enterprise)
       |    - Inline customization
       |    States: SELECTING, CUSTOMIZING, SAVED
       |
       +--> Step 4: Teams
       |    - Create teams, assign workflows
       |    States: DEFAULT, CREATING, ASSIGNING
       |
       +--> Step 5: Employees
       |    - Manual add or CSV upload
       |    - Bulk import with progress bar
       |    States: DEFAULT, IMPORTING, IMPORT_ERRORS, COMPLETE
       |
       +--> Step 6: Holidays
       |    - Country selector (auto-loads public holidays)
       |    - Manual add/remove
       |    States: DEFAULT, LOADING_CALENDAR, SAVED
       |
       +--> Completion
            - "You are all set!" celebration state
            - Summary of what was configured
            - CTA: "Go to Dashboard"
```

### 6.5 Status Tracking Flow (Employee)

```
Employee wants to check status
  |
  +--> [Slack] /leave status
  |    Bot shows most recent request with journey chain
  |
  +--> [Web] Self-Service > Active Request card
  |    Mini journey tracker visible on main page
  |    Click for full detail view
  |
  +--> [Mobile] Status tab
  |    Full journey screen with animated timeline
  |
  +--> States per step:
       - COMPLETED: Green dot, checkmark, timestamp
       - ACTIVE: Pulsing indigo dot, expanded card, countdown
       - UPCOMING: Dimmed, future state
       - REJECTED: Red X at the step that rejected
       - CANCELLED: Gray, "Cancelled by employee" note
```

### 6.6 Escalation Flow

```
Approval step timeout reached
  |
  +--> Escalation mode = "Reminder"
  |    - Send reminder notification to approver
  |    - Max 3 reminders with counter badge
  |    - States: REMINDED (1/3), REMINDED (2/3), REMINDED (3/3)
  |    - After 3rd reminder: notify HR admin
  |
  +--> Escalation mode = "Escalate"
       - Skip to next step in workflow
       - Notify original approver (skipped)
       - Notify next approver
       - Notify employee of progress
       - States: ESCALATED (show both original and new approver in journey)
```

---

## 7. Summary

### Design Decisions

1. **Dark-first glassmorphism**: Positions LeaveFlow as a modern, premium tool — differentiated from the light-themed HR commodity space. Dark themes reduce eye strain for HR admins who use the tool daily.

2. **Bento grid dashboard**: Replaces the traditional linear dashboard with a spatial, scannable layout. Each card is a self-contained information unit that can be understood at a glance.

3. **Swim-lane calendar**: More information-dense than a traditional monthly grid. Shows individual absences, team grouping, approval status, and coverage warnings in a single view.

4. **Package-tracking journey**: The approval chain visualization is the most distinctive UI pattern. It transforms an opaque process into a transparent, trackable journey — the core product differentiator.

5. **Form + live preview workflow builder**: Even without the Phase 2 drag-and-drop, the live visual preview gives immediate feedback on workflow structure. The mini node diagram bridges the gap between form-based input and visual understanding.

6. **Monospace data accent**: JetBrains Mono for timestamps, IDs, and metrics gives the product a precision/developer-tool feel. This is intentional positioning: LeaveFlow is a tool for companies that value craft.

7. **Swipe-to-approve mobile**: Physical gesture for approval adds tactile satisfaction and speed. Combined with haptic feedback, it makes the approval action feel consequential but fast.

8. **AI suggestion banner**: Forward-looking pattern for Phase 3 NLP features. Even in MVP, the banner can surface simple date optimization suggestions.

### Open Questions Resolved

| Question | Decision |
|----------|----------|
| Self-service vs manager view: separate or tabs? | **Separate pages** — different data needs and nav patterns |
| Onboarding wizard: multi-page or single? | **Multi-page** with sidebar progress ring — 6 focused steps |
| Bot approval chain: text or image? | **Text-based** with emoji (Slack) / styled text (Teams) — no server-side image generation needed |
| Stale request surfacing? | **Dedicated "Needs Attention" section** on dashboard + color-coded urgency bars + reminder/force-approve actions |

### Accessibility Compliance

- WCAG 2.1 AA color contrast verified for all text on glass backgrounds
- All interactive elements have visible focus indicators
- `aria-label` on all icon-only buttons
- `role` and `aria-*` attributes on custom controls (radio groups, switches, grids)
- `prefers-reduced-motion` respected — all animations have instant fallback
- Minimum touch target 44x44px on mobile
- Keyboard navigation support (tab order matches visual order)
- Screen reader landmarks (`role="region"`, `aria-label`)

### File Manifest

| File | Type | Description |
|------|------|-------------|
| `mockups/experimental/dashboard-home.html` | Web | HR dashboard with bento grid |
| `mockups/experimental/absence-calendar.html` | Web | Swim-lane absence visualization |
| `mockups/experimental/workflow-builder.html` | Web | Form + live preview builder |
| `mockups/experimental/leave-request-detail.html` | Web | Journey timeline request view |
| `mockups/experimental/onboarding-wizard.html` | Web | 6-step gamified setup |
| `mockups/experimental/employee-self-service.html` | Web | Personal balance & history |
| `mockups/experimental/mobile/LeaveRequestScreen.jsx` | Mobile | AI-assisted leave request |
| `mockups/experimental/mobile/BalanceScreen.jsx` | Mobile | Creative balance visualization |
| `mockups/experimental/mobile/ApprovalScreen.jsx` | Mobile | Swipe-to-approve with haptics |
| `mockups/experimental/mobile/StatusJourneyScreen.jsx` | Mobile | Animated journey tracker |
| `mockups/experimental/bot/slack-messages.md` | Bot | 6 Slack Block Kit templates |
| `mockups/experimental/bot/teams-cards.md` | Bot | 4 Teams Adaptive Card templates |

### Technology Alignment

- **shadcn/ui compatibility**: Glass card styles can be implemented as shadcn/ui variants. All components follow Radix UI patterns (accessible primitives with custom styling).
- **Next.js App Router**: Page structure maps to route groups. Dashboard, calendar, and builder are separate route segments.
- **Zustand**: State for workflow builder (step list), calendar filters, and approval actions.
- **Tailwind CSS v4**: All mockups use Tailwind utilities. Custom theme extends with design tokens via `@theme` directive.

---

*Design complete. Ready for handoff to API Designer, Database Architect, and Software Developer.*