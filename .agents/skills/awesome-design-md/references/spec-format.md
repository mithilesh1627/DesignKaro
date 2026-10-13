# The DESIGN.md Specification Format

`DESIGN.md` is a human- and agent-readable markdown specification format (originating from Google Stitch and formalized in community standards by VoltAgent) that defines a project's visual design system.

---

## 1. Why DESIGN.md?

Unlike Figma exports (which require proprietary parsing) or rigid JSON schemas, `DESIGN.md` uses structured YAML frontmatter combined with descriptive Markdown.

| Layer | File | Read By | Role |
|---|---|---|---|
| **Behavior & Build** | `AGENTS.md` | Coding Agents | Project structure, build tools, commands |
| **Capabilities & Procedures** | `SKILL.md` | Agent Skills | Step-by-step procedures and runbooks |
| **Visual Language & Aesthetic** | `DESIGN.md` | Design & Coding Agents | Color tokens, typography scales, layout, UI states |

---

## 2. Standard Schema Sections

A comprehensive `DESIGN.md` contains the following sections:

### A. Frontmatter (`YAML`)
```yaml
---
version: alpha
name: Brand-Inspired-Design-Analysis
description: High-level visual identity summary describing mood, canvas, and density.

colors:
  primary: "#5e6ad2"
  on-primary: "#ffffff"
  canvas: "#010102"
  surface-1: "#0f1011"
  surface-2: "#141516"
  hairline: "#23252a"
  ink: "#f7f8f8"
  ink-muted: "#8a8f98"
  accent: "#5e6ad2"
  semantic-success: "#27a644"
  semantic-error: "#ea2261"

typography:
  display-xl:
    fontFamily: "Inter, sans-serif"
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -1.5px
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
---
```

### B. Core Sections in Markdown Body

1. **Design Philosophy & Atmosphere**
   - Core visual tone: e.g., "Dense, technical, and quietly luxurious."
   - Surface polarity: dark-mode primary, light-mode dashboard, or hybrid.

2. **Color Palette & Semantic Roles**
   - Backgrounds, surfaces, borders, text contrast levels.
   - Guidelines for when to use primary vs. secondary vs. accent colors.

3. **Typography Scale & Hierarchy**
   - Font families, sizes, weights, line heights, tracking.
   - Rules for numbers, code blocks, tabular data.

4. **Elevation, Borders & Depth**
   - Hairline borders vs. layered box shadows.
   - Blur/backdrop-filter usage (subtle acrylic or opaque panels).

5. **Component Standards**
   - Buttons (primary, secondary, ghost, icon-only) with hover, active, disabled states.
   - Inputs and form controls.
   - Cards, modals, drawers, and panels.

6. **Do's and Don'ts**
   - Explicit guardrails preventing category clichés and bad habits.
   - Example: "DO use negative tracking on display headings. DON'T use generic drop shadows."

7. **Agent Prompt Guide**
   - Copy-pasteable instructions for instructing AI agents to generate UI matching this system.
