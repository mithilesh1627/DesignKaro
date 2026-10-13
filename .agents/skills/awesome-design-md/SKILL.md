---
name: awesome-design-md
description: >-
  Use when the user wants to browse, search, inspect, pull, adopt, or implement design systems
  from the curated Awesome DESIGN.md collection (70+ top tech brands like Stripe, Linear, Vercel,
  Apple, Notion, Claude, Supabase, Tailwind, etc.). Guides fetching design specs, adapting tokens
  into Tailwind CSS and CSS variables, building brand-aligned UI components, and auditing interfaces
  against DESIGN.md guardrails.
---

# Awesome DESIGN.md Skill

The **Awesome DESIGN.md** skill empowers the agent to source, analyze, and implement production-grade design systems from the [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) repository containing 70+ reverse-engineered design system analyses of leading tech companies.

---

## 1. What is `DESIGN.md`?

`DESIGN.md` is a plain-text markdown and YAML specification that serves as the **visual source of truth** for AI coding agents.

```
┌────────────────────────────────────────────────────────┐
│                      PROJECT STACK                     │
├────────────────────────────────────────────────────────┤
│  AGENTS.md   → How to build, test, and run code       │
│  SKILL.md    → Procedural capabilities & workflows     │
│  DESIGN.md   → Visual language, tokens, styles, guards │
└────────────────────────────────────────────────────────┘
```

A complete `DESIGN.md` defines:
- **Palette & Tokens**: Semantic color roles (`canvas`, `surface-1`, `hairline`, `primary`, `ink`, `ink-muted`).
- **Typography**: Complete type scales with exact `fontSize`, `fontWeight`, `lineHeight`, and `letterSpacing`.
- **Component Specs**: Button variants, input states, card containers, dialog overlays.
- **Elevation & Depth**: Hairline borders, shadow scales, and backdrop blurs.
- **Do's & Don'ts**: Concrete guardrails preventing generic styling and category clichés.

---

## 2. Browsing & Discovering Brands

The collection includes 70+ brand design systems across distinct categories:
- **AI & LLM**: Claude, Mistral, Cohere, ElevenLabs, Replicate, Runway, VoltAgent, xAI, Ollama.
- **Developer Tools**: Linear, Vercel, Cursor, Raycast, Warp, Framer, Figma, Superhuman, Expo.
- **Databases & Cloud**: Supabase, ClickHouse, MongoDB, HashiCorp, Resend, Sentry, PostHog.
- **Fintech & Payments**: Stripe, Coinbase, Revolut, Kraken, Binance.
- **Collaboration & Consumer**: Notion, Apple, Slack, Spotify, Airbnb, Cal.com.

👉 **Full Catalog**: Consult [references/brands.md](./references/brands.md) for the complete list of 70+ brands, visual characteristics, and primary accents.
👉 **Format Guide**: Consult [references/spec-format.md](./references/spec-format.md) for the complete schema specification.

---

## 3. Pulling a Design System

Use the included helper script in this skill to fetch any brand's `DESIGN.md` into the project root or a target directory:

### CLI Usage

```powershell
# List all 70+ available brands
node .agents/skills/awesome-design-md/scripts/fetch-design.js --list

# Search for matching brands by keyword
node .agents/skills/awesome-design-md/scripts/fetch-design.js --search <keyword>

# Inspect a brand's visual identity summary
node .agents/skills/awesome-design-md/scripts/fetch-design.js --inspect <brand>

# Download DESIGN.md directly to project root
node .agents/skills/awesome-design-md/scripts/fetch-design.js <brand>

# Or download to a custom directory
node .agents/skills/awesome-design-md/scripts/fetch-design.js <brand> --out ./DESIGN.md
```

### Pre-Bundled Curated References (Offline Ready)
The skill includes pre-bundled, offline copies of the most popular design systems in [references/curated/](./references/curated/):
- [Stripe (`stripe.md`)](./references/curated/stripe.md) — Electric indigo, Sohne typography, atmospheric mesh gradients, tabular figures.
- [Linear (`linear.md`)](./references/curated/linear.md) — Void black canvas (`#010102`), hairline borders, charcoal surfaces, single lavender accent (`#5e6ad2`).
- [Vercel (`vercel.md`)](./references/curated/vercel.md) — Monochromatic precision, Geist typography, stark contrast, multi-color mesh hero accent.
- [Supabase (`supabase.md`)](./references/curated/supabase.md) — Dark canvas, emerald accent (`#3ecf8e`), clean developer cards, technical clarity.

---

## 4. Translating `DESIGN.md` into Code

When adopting or applying a `DESIGN.md` specification to a frontend project, follow this 4-step implementation procedure:

### Step 1: Extract Semantic Color Tokens
Map the colors from the YAML frontmatter into CSS variables in `globals.css` or Tailwind configuration:

```css
/* globals.css */
:root {
  --canvas: #010102;
  --surface-base: #0f1011;
  --surface-elevated: #141516;
  --surface-border: #23252a;
  --surface-border-strong: #34343a;
  --text-primary: #f7f8f8;
  --text-muted: #8a8f98;
  --accent-primary: #5e6ad2;
}
```

### Step 2: Configure Tailwind Theme
Extend `tailwind.config.ts` using the tokens:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: {
          base: "var(--surface-base)",
          elevated: "var(--surface-elevated)",
          border: "var(--surface-border)",
        },
        brand: {
          primary: "var(--accent-primary)",
        },
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
};
```

### Step 3: Implement Core Components
Follow the component specifications defined in `DESIGN.md`:
- **Buttons**: Strict padding, rounded radii (`pill` vs `md`), precise hover and active transforms.
- **Cards**: Single hairline borders (`border border-zinc-800`), dark elevated surfaces, avoid zero-blur block shadows unless neobrutalist.
- **Badges / Tags**: Subtle low-opacity background with matching tinted text.

### Step 4: Verify Guardrails & Anti-Patterns
Check the generated code against the **Do's and Don'ts** section in `DESIGN.md`:
1. **Typography Check**: Ensure optical letter spacing is applied to large headings (negative tracking for display sizes).
2. **Contrast Check**: Verify body text achieves at least 4.5:1 WCAG AA contrast ratio against surfaces.
3. **No Hallucinated Decoration**: Do not add random gradient borders, generic stock drop shadows, or unprompted emojis unless explicitly defined in the design spec.
