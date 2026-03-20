---
stage: "01-vision"
agent: "product-manager"
model: "opus"
run_id: "2026-03-16-disc-leave-bot"
started: "2026-03-16T12:05:00Z"
finished: "2026-03-16T12:45:00Z"
tools_used: [WebSearch, Read, Glob, Grep]
parent_agent: "pipeline-orchestrator"
sub_agents_invoked: []
---

# Stage 1: Vision & Strategy — LeaveFlow

## Market Research Summary

The leave management bot market in 2026 is active but fragmented.

**Market Trends:**
- Leave management bots are now "core HR infrastructure" for modern teams
- Market shifting from standalone HR portals to "in-workflow" solutions in Slack/Teams
- Companies automating time off report 30%+ reduction in administrative overhead
- 50,000+ companies use Day Off; 200,000+ users on Timetastic; Vacation Tracker growing rapidly

**8 Competitors Evaluated:**

| Product | Price Range | Platforms | Workflow Depth | Rating |
|---------|------------|-----------|---------------|--------|
| Vacation Tracker | $1-3/user | Slack, Teams, GWS | Basic (1-2 levels) | Strong all-rounder |
| AttendanceBot | $4+/user | Slack, Teams | Medium (2-3 levels) | Feature-rich but complex |
| Timetastic | $1.50-2.50/user | Web (Slack notifs) | Basic (1 level) | Great UI, not chat-native |
| Flamingo | Free-$2/user | Slack only | Basic (1 level) | Simple, Slack-only |
| Day Off | $1-2/user | Slack, Teams | Basic (1-2 levels) | Clean, mobile-first |
| absence.io | EUR 2+/user | Web (Slack notifs) | Basic (1-2 levels) | Full HR suite |
| Calamari | Mid-range | Slack, Teams | Medium (2 levels) | Attendance + Leave combo |
| Kissflow | Enterprise | Web only | Advanced (visual) | Generic workflow platform |

**Critical Gap:** No product combines ALL THREE of:
1. Native chat-bot experience on BOTH Slack and Teams
2. Truly configurable, multi-level approval workflows with conditional logic
3. Visual workflow builder accessible to non-technical managers

## Product Vision

**Vision Statement:** Every leave request should be as simple as sending a message and as transparent as tracking a package.

**Mission:** LeaveFlow eliminates the friction between employees, approvers, and HR by embedding leave management directly into the tools teams already use, with approval workflows that adapt to how each organization actually works.

## Strategic Positioning

LeaveFlow sits at the intersection of:
- **Chat-native PTO bots** (simple, limited workflows) — Flamingo, Vacation Tracker
- **Enterprise workflow platforms** (powerful, not leave-specific) — Kissflow

New category: **"Workflow-First Leave Management"**

## Key Differentiators

| Differentiator | Description |
|---------------|-------------|
| **Visual Workflow Builder** | Drag-and-drop UI for approval chains with unlimited levels, conditional branching, parallel approvals |
| **Dual Platform Native** | First-class bot on both Slack AND Teams from day one |
| **Live Request Tracker** | Employees see real-time status moving through the approval chain |
| **Team-Level Autonomy** | Each team lead configures their own workflow; HR sets guardrails |
| **Smart Conflict Detection** | Bot warns about team availability conflicts before approving |

## Go-to-Market Strategy

- **Phase 1 (Months 1-4):** MVP targeting Slack-heavy SMBs. Form-based workflow builder. Free tier for viral adoption.
- **Phase 2 (Months 5-8):** Visual workflow builder, conditional routing, HRIS integrations. Mid-market target.
- **Phase 3 (Months 9-12):** Enterprise features (SSO, data residency, compliance). Mobile app. AI-powered NL requests.

**Distribution:** Slack/Teams App Stores, content marketing, Product Hunt launch, HRIS partnerships.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Slack/Teams API changes | Medium | High | Abstract platform layer; follow changelogs |
| Competitors add workflow builders | Medium | Medium | Move fast; build switching costs |
| Enterprise sales cycle too long | High | Medium | Focus self-serve SMB first |
| Low free-to-paid conversion | Medium | High | Design clear upgrade triggers |
| Regulatory complexity (GDPR) | Medium | Medium | Legal review at launch; data residency Phase 3 |

## Key Decisions

1. **Product name: LeaveFlow** — distinctive, communicates domain + differentiator
2. **Dual platform from day one** — Slack AND Teams at MVP
3. **Free tier at 10 users** — balances viral adoption with conversion
4. **MVP uses form-based workflow builder** — visual drag-and-drop is Phase 2
5. **Workflow autonomy per team** — team leads configure; HR sets policies
6. **Live request tracker** — "package tracking for leave" as UX differentiator
7. **Pricing at $2-4/user** — competitive with market range

## Sources

- The 6 Best Slack & Microsoft Teams PTO Bots for 2026 (day-off.app)
- Slack Leave Management Reclaims 40+ Admin Hours (attendancebot.com)
- Vacation Tracker Features & Pricing (saasworthy.com)
- Timetastic Reviews 2026 (selecthub.com)
- AttendanceBot Pricing & Features (attendancebot.com)
- absence.io Product Information
- Flamingo Leave Management for Slack (flamingoapp.com)
- Kissflow Multi-Level Approval Workflows (kissflow.com)
- 8 Best Leave Management Software for Small Businesses 2026 (attendancebot.com)
