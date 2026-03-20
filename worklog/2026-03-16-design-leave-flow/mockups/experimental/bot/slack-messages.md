# LeaveFlow Bot Message Designs — Slack (Block Kit)

## Design Philosophy

Push Block Kit to its limits: dense information display, visual hierarchy via
section dividers and context blocks, emoji as accent color (not as icons),
and interactive elements that make the approval feel like a product experience
rather than a notification.

---

## 1. Approval Request Message (sent to approver DM)

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "Leave Request — Needs Your Approval"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Maria Santos* is requesting time off\n`PTO` | `3 working days` | `Mar 25 - Mar 27`"
      },
      "accessory": {
        "type": "image",
        "image_url": "https://api.leaveflow.io/avatars/maria-santos.png",
        "alt_text": "Maria Santos"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Team:*\nEngineering"
        },
        {
          "type": "mrkdwn",
          "text": "*Balance After:*\n12 / 20 days"
        },
        {
          "type": "mrkdwn",
          "text": "*Team Coverage:*\n92% :white_check_mark:"
        },
        {
          "type": "mrkdwn",
          "text": "*Others Out:*\nAlex K., Rachel H."
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": ":speech_balloon: _\"Family visiting from out of town\"_"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Approval Chain*\n:white_check_mark: Submitted  >  :arrow_right: *You (Manager)*  >  :white_circle: HR Review  >  :white_circle: Done"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Approve"
          },
          "style": "primary",
          "action_id": "approve_request",
          "value": "LR-2026-0342"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Reject"
          },
          "style": "danger",
          "action_id": "reject_request",
          "value": "LR-2026-0342"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View in LeaveFlow"
          },
          "action_id": "view_request",
          "url": "https://app.leaveflow.io/requests/LR-2026-0342"
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": ":clock3: Submitted today at 10:24am | Request `LR-2026-0342` | Auto-escalation in 24h"
        }
      ]
    }
  ]
}
```

### Design Notes:
- Header block creates visual weight at top
- Avatar via accessory image personalizes the request
- Fields section uses 2x2 grid for dense-but-scannable info
- Context block for reason uses italic + speech balloon for personality
- Approval chain uses emoji as progress indicator (checkmark / arrow / circle)
- Primary/danger button styles for clear approve/reject distinction
- Footer context shows timing + auto-escalation countdown

---

## 2. Status Update — Approved (sent to employee DM)

```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":tada: *Your leave request has been approved!*"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Type:*\nPTO"
        },
        {
          "type": "mrkdwn",
          "text": "*Dates:*\nMar 25 - Mar 27"
        },
        {
          "type": "mrkdwn",
          "text": "*Working Days:*\n3"
        },
        {
          "type": "mrkdwn",
          "text": "*New Balance:*\n12 / 20 days"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Journey Complete*\n:white_check_mark: Submitted  >  :white_check_mark: Manager (Tom W.)  >  :white_check_mark: HR (Sarah C.)  >  :white_check_mark: *Done*"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": ":calendar: Calendar event created | :bell: Team channel notified | Request `LR-2026-0342`"
        }
      ]
    }
  ]
}
```

### Design Notes:
- Celebration emoji creates positive emotional moment
- Journey chain shows all-green checkmarks for completion
- Context footer shows side-effects (calendar sync, team notification)

---

## 3. Status Update — Rejected (sent to employee DM)

```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":x: *Your leave request was not approved*"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Type:*\nPTO"
        },
        {
          "type": "mrkdwn",
          "text": "*Dates:*\nMar 25 - Mar 27"
        },
        {
          "type": "mrkdwn",
          "text": "*Rejected By:*\nTom Wilson (Manager)"
        },
        {
          "type": "mrkdwn",
          "text": "*At Step:*\n1 of 2"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Reason:*\n> _\"Team has a critical deadline on Mar 26. Please try the following week.\"_"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Journey*\n:white_check_mark: Submitted  >  :x: Manager (Tom W.)  >  :black_circle: HR  >  :black_circle: Done"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Submit New Request"
          },
          "style": "primary",
          "action_id": "new_request"
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": ":information_source: Your balance was not affected | Request `LR-2026-0342`"
        }
      ]
    }
  ]
}
```

---

## 4. Stale Request Reminder (sent to approver)

```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":hourglass: *Reminder: Pending leave request*\n\nDan Kim's vacation request has been waiting for *52 hours*."
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Employee:*\nDan Kim"
        },
        {
          "type": "mrkdwn",
          "text": "*Dates:*\nMar 20 - Mar 24"
        },
        {
          "type": "mrkdwn",
          "text": "*Days:*\n5 (Annual Leave)"
        },
        {
          "type": "mrkdwn",
          "text": "*Waiting Since:*\nMar 14, 2:30pm"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Approve Now"
          },
          "style": "primary",
          "action_id": "approve_request",
          "value": "LR-2026-0338"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Reject"
          },
          "style": "danger",
          "action_id": "reject_request",
          "value": "LR-2026-0338"
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": ":warning: This request will auto-escalate to HR in *~20 hours* | Reminder 2 of 3"
        }
      ]
    }
  ]
}
```

---

## 5. Balance Check Response (inline in channel or DM)

```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":bar_chart: *Your Leave Balances*"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "```\nVacation     |========------| 15/20 days (75%)\nSick Leave   |==========----|  9/10 days (90%)\nPersonal     |====----------|  2/5  days (40%)\n```"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": ":calendar: Next accrual: Apr 1 (+1.67 vacation days) | :information_source: Fiscal year 2026"
        }
      ]
    }
  ]
}
```

### Design Notes:
- ASCII progress bars in code block for visual density within Slack constraints
- Monospace alignment makes the data scannable
- Context block for next accrual keeps it informational

---

## 6. Team Channel Announcement (when leave is approved)

```json
{
  "blocks": [
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": ":palm_tree: *Maria Santos* will be out *Mar 25 - Mar 27* (3 days)"
        }
      ]
    }
  ]
}
```

### Design Notes:
- Deliberately minimal — single context block
- No leave type exposed (privacy rule BR-092)
- Palm tree emoji is the only decorative element
- Does not disrupt channel conversation flow
