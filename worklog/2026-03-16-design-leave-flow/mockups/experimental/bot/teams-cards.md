# LeaveFlow Bot Message Designs — Microsoft Teams (Adaptive Cards)

## Design Philosophy

Leverage Adaptive Cards v1.5+ features: column sets for dense layout, fact sets
for key-value pairs, action sets for approve/reject, and container styles for
visual grouping. Keep under 28KB payload limit.

---

## 1. Approval Request Card

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Leave Request — Needs Your Approval",
      "weight": "Bolder",
      "size": "Medium",
      "wrap": true
    },
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "width": "auto",
          "items": [
            {
              "type": "Image",
              "url": "https://api.leaveflow.io/avatars/maria-santos.png",
              "size": "Small",
              "style": "Person",
              "altText": "Maria Santos"
            }
          ]
        },
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            {
              "type": "TextBlock",
              "text": "**Maria Santos**",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": "Engineering | PTO | 3 working days",
              "isSubtle": true,
              "spacing": "None",
              "size": "Small",
              "wrap": true
            }
          ]
        },
        {
          "type": "Column",
          "width": "auto",
          "items": [
            {
              "type": "TextBlock",
              "text": "Mar 25 - 27",
              "weight": "Bolder",
              "horizontalAlignment": "Right"
            }
          ]
        }
      ]
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Balance After", "value": "12 / 20 days" },
        { "title": "Team Coverage", "value": "92% OK" },
        { "title": "Others Out", "value": "Alex K., Rachel H." },
        { "title": "Reason", "value": "Family visiting from out of town" }
      ]
    },
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "TextBlock",
          "text": "**Approval Chain**",
          "size": "Small"
        },
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Submitted",
                  "size": "Small",
                  "color": "Good"
                }
              ]
            },
            {
              "type": "Column",
              "width": "auto",
              "items": [
                { "type": "TextBlock", "text": "->", "size": "Small", "isSubtle": true }
              ]
            },
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "**You (Manager)**",
                  "size": "Small",
                  "color": "Accent"
                }
              ]
            },
            {
              "type": "Column",
              "width": "auto",
              "items": [
                { "type": "TextBlock", "text": "->", "size": "Small", "isSubtle": true }
              ]
            },
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "HR Review",
                  "size": "Small",
                  "isSubtle": true
                }
              ]
            },
            {
              "type": "Column",
              "width": "auto",
              "items": [
                { "type": "TextBlock", "text": "->", "size": "Small", "isSubtle": true }
              ]
            },
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Done",
                  "size": "Small",
                  "isSubtle": true
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Submitted today at 10:24am | Auto-escalation in 24h",
      "size": "Small",
      "isSubtle": true,
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.Execute",
      "title": "Approve",
      "verb": "approve",
      "data": { "requestId": "LR-2026-0342" },
      "style": "positive"
    },
    {
      "type": "Action.Execute",
      "title": "Reject",
      "verb": "reject",
      "data": { "requestId": "LR-2026-0342" },
      "style": "destructive"
    },
    {
      "type": "Action.OpenUrl",
      "title": "View in LeaveFlow",
      "url": "https://app.leaveflow.io/requests/LR-2026-0342"
    }
  ]
}
```

---

## 2. Approved Notification Card

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Your leave request has been approved!",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Good",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Type", "value": "PTO" },
        { "title": "Dates", "value": "Mar 25 - Mar 27 (3 days)" },
        { "title": "New Balance", "value": "12 / 20 days" }
      ]
    },
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "TextBlock",
          "text": "Submitted -> Manager (Tom W.) -> HR (Sarah C.) -> **Done**",
          "size": "Small",
          "color": "Good",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Calendar event created | Team channel notified",
      "size": "Small",
      "isSubtle": true,
      "wrap": true
    }
  ]
}
```

---

## 3. Rejected Notification Card

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Your leave request was not approved",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Attention",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Type", "value": "PTO" },
        { "title": "Dates", "value": "Mar 25 - Mar 27" },
        { "title": "Rejected By", "value": "Tom Wilson (Manager)" }
      ]
    },
    {
      "type": "Container",
      "style": "attention",
      "items": [
        {
          "type": "TextBlock",
          "text": "**Reason:** \"Team has a critical deadline on Mar 26. Please try the following week.\"",
          "wrap": true,
          "size": "Small"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Your balance was not affected.",
      "size": "Small",
      "isSubtle": true,
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.Execute",
      "title": "Submit New Request",
      "verb": "new_request",
      "style": "positive"
    }
  ]
}
```

---

## 4. Balance Check Response Card

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Your Leave Balances",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            { "type": "TextBlock", "text": "**Vacation**", "size": "Small" },
            { "type": "TextBlock", "text": "15 / 20 days (75%)", "size": "Small", "isSubtle": true, "spacing": "None" }
          ]
        },
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            { "type": "TextBlock", "text": "**Sick Leave**", "size": "Small" },
            { "type": "TextBlock", "text": "9 / 10 days (90%)", "size": "Small", "isSubtle": true, "spacing": "None" }
          ]
        },
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            { "type": "TextBlock", "text": "**Personal**", "size": "Small" },
            { "type": "TextBlock", "text": "2 / 5 days (40%)", "size": "Small", "color": "Warning", "spacing": "None" }
          ]
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Next accrual: Apr 1 (+1.67 vacation days) | Fiscal year 2026",
      "size": "Small",
      "isSubtle": true,
      "wrap": true
    }
  ]
}
```

---

## Platform Parity Notes

| Feature | Slack (Block Kit) | Teams (Adaptive Cards) |
|---------|-------------------|----------------------|
| Approval buttons | `actions` block with `primary`/`danger` style | `Action.Execute` with `positive`/`destructive` |
| Approval chain | Emoji-based text in section | ColumnSet with color-coded text |
| Avatar | Section accessory image | Person-style image in ColumnSet |
| Balance bars | ASCII art in code block | ColumnSet with text percentages |
| Reason quote | Context block with italic | Container with `attention` style |
| Privacy | Channel announcement hides leave type | Same |
| Payload limit | 25 blocks max | 28KB max |
| Interactivity | 3-second acknowledgement deadline | Action.Execute verb handler |
