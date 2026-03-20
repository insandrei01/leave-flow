# LeaveFlow Design Assets Manifest

## Status: PENDING GENERATION

The nanobanana Python dependencies are not installed. Run the following to install
and then re-execute the generation commands below:

```bash
pip3 install -r .claude/skills/nanobanana/requirements.txt
```

---

## Assets to Generate

### 1. Dashboard Background
- **File**: `bg-dashboard.png`
- **Size**: 1344x768 (16:9)
- **Resolution**: 2K
- **Model**: gemini-3-pro-image-preview (final quality)
- **Prompt**: "Modern dark-themed SaaS dashboard abstract background, deep navy blue #0A0E1A base with subtle radial gradient mesh of indigo #818CF8 and violet #A78BFA at very low opacity, minimalist, clean, professional, no text, suitable as web app background behind glassmorphic cards"

```bash
python3 .claude/skills/nanobanana/nanobanana.py \
  --prompt "Modern dark-themed SaaS dashboard abstract background, deep navy blue #0A0E1A base with subtle radial gradient mesh of indigo #818CF8 and violet #A78BFA at very low opacity, minimalist, clean, professional, no text, suitable as web app background behind glassmorphic cards" \
  --size 1344x768 --resolution 2K \
  --output "worklog/runs/2026-03-16-design-leave-flow/mockups/experimental/assets/bg-dashboard.png"
```

### 2. Workflow Feature Illustration
- **File**: `feature-workflow.png`
- **Size**: 1024x1024 (1:1)
- **Resolution**: 1K
- **Model**: gemini-3.1-flash-image-preview
- **Prompt**: "Flat minimalist illustration of a workflow approval chain, three connected nodes with arrows between them, indigo #818CF8 and emerald #34D399 color scheme on dark navy #0A0E1A background, clean vector style, no text, centered composition, suitable for SaaS feature illustration"

```bash
python3 .claude/skills/nanobanana/nanobanana.py \
  --prompt "Flat minimalist illustration of a workflow approval chain, three connected nodes with arrows between them, indigo #818CF8 and emerald #34D399 color scheme on dark navy #0A0E1A background, clean vector style, no text, centered composition" \
  --size 1024x1024 \
  --output "worklog/runs/2026-03-16-design-leave-flow/mockups/experimental/assets/feature-workflow.png"
```

### 3. Mobile App Background
- **File**: `mobile-bg.png`
- **Size**: 768x1344 (9:16)
- **Resolution**: 2K
- **Model**: gemini-3-pro-image-preview
- **Prompt**: "Abstract gradient mesh background for mobile app, deep navy #0A0E1A transitioning to dark purple, subtle indigo #818CF8 and violet #A78BFA radial glows, modern and clean, very subtle noise texture, suitable as React Native app background"

```bash
python3 .claude/skills/nanobanana/nanobanana.py \
  --prompt "Abstract gradient mesh background for mobile app, deep navy #0A0E1A transitioning to dark purple, subtle indigo #818CF8 and violet #A78BFA radial glows, modern and clean, very subtle noise texture" \
  --size 768x1344 --resolution 2K \
  --output "worklog/runs/2026-03-16-design-leave-flow/mockups/experimental/assets/mobile-bg.png"
```

### 4. Calendar Feature Illustration
- **File**: `feature-calendar.png`
- **Size**: 1024x1024 (1:1)
- **Prompt**: "Flat minimalist illustration of a calendar with colored blocks representing absences, swim-lane style horizontal bars, indigo #818CF8 and cyan #22D3EE on dark navy #0A0E1A background, clean vector style, no text"

```bash
python3 .claude/skills/nanobanana/nanobanana.py \
  --prompt "Flat minimalist illustration of a calendar with colored blocks representing absences, swim-lane style horizontal bars, indigo #818CF8 and cyan #22D3EE on dark navy #0A0E1A background, clean vector style, no text" \
  --size 1024x1024 \
  --output "worklog/runs/2026-03-16-design-leave-flow/mockups/experimental/assets/feature-calendar.png"
```

### 5. Bot Integration Illustration
- **File**: `feature-bot.png`
- **Size**: 1024x1024 (1:1)
- **Prompt**: "Flat minimalist illustration of a chat bot conversation with approval buttons, speech bubbles with checkmark and X icons, Slack and Teams logos subtly referenced, indigo #818CF8 and amber #FBBF24 on dark navy #0A0E1A background, clean vector style, no text"

```bash
python3 .claude/skills/nanobanana/nanobanana.py \
  --prompt "Flat minimalist illustration of a chat bot conversation with approval buttons, speech bubbles with checkmark and X icons, indigo #818CF8 and amber #FBBF24 on dark navy #0A0E1A background, clean vector style, no text" \
  --size 1024x1024 \
  --output "worklog/runs/2026-03-16-design-leave-flow/mockups/experimental/assets/feature-bot.png"
```
