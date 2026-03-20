# Bot Message Designs - LeaveFlow

## Platform Constraints
- **Slack**: Block Kit -- max 25 blocks, 3s modal ack deadline
- **Teams**: Adaptive Cards -- max ~28KB payload
- Messages defined as platform-agnostic templates; adapters convert to Block Kit or Adaptive Card

---

## 1. Leave Request Confirmation (after submission)

### Template Structure
```
[HEADER] Leave Request Submitted
[DIVIDER]
[SECTION: Request Summary]
  Type: [dot color] Vacation
  Dates: Mar 18 - Mar 24, 2026
  Duration: 5 working days
  Reason: Family trip abroad
[DIVIDER]
[SECTION: Approval Chain Preview]
  Step 1: David Chen (Team Lead) ............ [waiting indicator]
  Step 2: Maria Santos (Dept Head)
  Step 3: Sarah Chen (HR)
[DIVIDER]
[CONTEXT] Request ID: REQ-2026-0342 | Submitted just now
[ACTIONS] [View Details] [Cancel Request]
```

### Slack Block Kit (visual representation)
```
+--------------------------------------------------+
|  [calendar icon]  Leave Request Submitted          |
+--------------------------------------------------+
|                                                    |
|  *Vacation*  |  Mar 18 - Mar 24, 2026             |
|  5 working days                                    |
|  _"Family trip abroad"_                            |
|                                                    |
+--------------------------------------------------+
|  *Approval Journey*                                |
|                                                    |
|  [1] David Chen (Team Lead)                        |
|   |    Notified -- awaiting action                 |
|  [2] Maria Santos (Dept Head)                      |
|   |    Queued                                      |
|  [3] Sarah Chen (HR)                               |
|       Queued                                       |
|                                                    |
+--------------------------------------------------+
|  REQ-2026-0342                     Submitted now   |
|                                                    |
|  [ View Details ]  [ Cancel Request ]              |
+--------------------------------------------------+
```

### Teams Adaptive Card
```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Leave Request Submitted",
      "weight": "bolder",
      "size": "medium"
    },
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "items": [
            { "type": "TextBlock", "text": "Type", "color": "light", "size": "small" },
            { "type": "TextBlock", "text": "Vacation", "weight": "bolder" }
          ]
        },
        {
          "type": "Column",
          "items": [
            { "type": "TextBlock", "text": "Dates", "color": "light", "size": "small" },
            { "type": "TextBlock", "text": "Mar 18 - 24, 2026", "weight": "bolder" }
          ]
        },
        {
          "type": "Column",
          "items": [
            { "type": "TextBlock", "text": "Duration", "color": "light", "size": "small" },
            { "type": "TextBlock", "text": "5 days", "weight": "bolder" }
          ]
        }
      ]
    }
  ],
  "actions": [
    { "type": "Action.OpenUrl", "title": "View Details" },
    { "type": "Action.Execute", "title": "Cancel Request", "verb": "cancelRequest" }
  ]
}
```

---

## 2. Approval Notification (sent to approver)

### Template Structure
```
[HEADER] New Leave Request for Your Approval
[DIVIDER]
[SECTION: Requester Info]
  [avatar] Tom Wilson -- DevOps Engineer, Engineering
[SECTION: Leave Details]
  Type: Vacation | Duration: 5 days
  Dates: Mar 18 - Mar 24, 2026
  Reason: Family trip abroad -- flights already booked
[SECTION: Context at a Glance]
  Balance After: 10/25 days
  Team Coverage: 75% (2 also off)
  Coverage Status: [green] Above minimum (60%)
[DIVIDER]
[SECTION: Your Action]
  You are Step 1 of 3 in the approval chain
[ACTIONS] [Approve] [Reject] [View Full Details]
```

### Slack Block Kit
```
+--------------------------------------------------+
|  [bell icon]  Leave Request Needs Your Approval    |
+--------------------------------------------------+
|                                                    |
|  [TW]  *Tom Wilson*                                |
|        DevOps Engineer -- Engineering              |
|                                                    |
+--------------------------------------------------+
|  *Vacation*  |  5 working days                     |
|  Mar 18 - Mar 24, 2026                             |
|  _"Family trip abroad -- flights already booked"_  |
|                                                    |
|  +---------+---------+-----------+                 |
|  | Balance | Coverage| Also Off  |                 |
|  | After   |         |           |                 |
|  | 10/25   |  75%    |  2 people |                 |
|  +---------+---------+-----------+                 |
|                                                    |
|  You are *Step 1* of 3                             |
|                                                    |
|  [ Approve ]  [ Reject ]  [ View Details ]         |
+--------------------------------------------------+
```

---

## 3. Status Tracker (employee checks /leave status)

### Template Structure
```
[HEADER] Request Status: REQ-2026-0342
[DIVIDER]
[SECTION: Summary]
  Vacation | Mar 18 - Mar 24 | 5 days
[SECTION: Live Tracker]
  [completed] Submitted .................. Mar 13, 9:14 AM
  [completed] Team Lead (David Chen) ..... Mar 13, 11:32 AM
  [current]   Dept Head (Maria Santos) ... Pending 72h
  [upcoming]  HR (Sarah Chen) ............ Queued
[DIVIDER]
[CONTEXT] 2 reminders sent to Maria Santos
[ACTIONS] [Cancel Request] [View on Web]
```

### Slack Block Kit - Text-based visualization
```
+--------------------------------------------------+
|  [package icon]  Your Request Status               |
+--------------------------------------------------+
|                                                    |
|  *Vacation*  Mar 18-24  |  5 working days          |
|                                                    |
+--------------------------------------------------+
|  *Approval Journey*                                |
|                                                    |
|  [check] *Submitted*                               |
|   |      Mar 13, 9:14 AM                           |
|   |                                                |
|  [check] *Team Lead -- David Chen*                 |
|   |      Approved in 2h 18m                        |
|   |                                                |
|  [>>]    *Dept Head -- Maria Santos*               |
|   |      Pending 72h -- 2 reminders sent           |
|   |                                                |
|  [  ]    *HR Review -- Sarah Chen*                 |
|          Queued                                    |
|                                                    |
+--------------------------------------------------+
|  Progress: Step 2 of 3                             |
|  [=======>      ] 50%                              |
|                                                    |
|  [ Cancel Request ]  [ Open in Browser ]           |
+--------------------------------------------------+
```

---

## 4. Balance Check (/leave balance)

### Template Structure
```
[HEADER] Your Leave Balances
[DIVIDER]
[SECTION: Balance Cards]
  Vacation:  15 / 25 days  [=========>     ] 60%
  Sick:       9 / 10 days  [===============] 90%
  Personal:   3 /  5 days  [========>      ] 60%
[DIVIDER]
[SECTION: Alerts]
  [warning] 3 carryover days expire Jun 30
  [info] Next public holiday: Good Friday (Apr 3)
[ACTIONS] [Request Leave] [View Calendar] [View History]
```

### Slack Block Kit
```
+--------------------------------------------------+
|  [chart icon]  Your Leave Balances                 |
+--------------------------------------------------+
|                                                    |
|  *Vacation*                                        |
|  15 of 25 days remaining                           |
|  [===========--------] 60%                         |
|  _5 days pending approval_                         |
|                                                    |
|  *Sick Leave*                                      |
|  9 of 10 days remaining                            |
|  [================---] 90%                         |
|                                                    |
|  *Personal*                                        |
|  3 of 5 days remaining                             |
|  [===========--------] 60%                         |
|                                                    |
+--------------------------------------------------+
|  [!] 3 carryover days expire *Jun 30, 2026*        |
|  Next holiday: *Good Friday* (Apr 3)               |
|                                                    |
|  [ Request Leave ]  [ View Calendar ]              |
+--------------------------------------------------+
```

---

## Design Principles for Bot Messages

1. **Information density**: Pack context into compact layouts without overwhelming
2. **Visual hierarchy**: Bold for names and key data, muted for metadata
3. **Actionable**: Every message has at least one CTA button
4. **Progress visibility**: The "approval journey" tracker appears in multiple message types
5. **No emojis as icons**: Use text-based indicators ([check], [>>], [!]) that adapt to platform rendering
6. **Context-rich**: Include balance-after, team coverage, approver identity in approval notifications
7. **Consistent structure**: Header -> Content -> Context -> Actions pattern across all messages
8. **Platform parity**: Same information, adapted to Block Kit (Slack) and Adaptive Cards (Teams)
