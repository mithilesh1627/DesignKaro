---
version: 1.0.0
name: DesignKaro-Background-And-Typography-Spec
slug: designkaro-background-typography
description: "Exact specification for DesignKaro's living distributed architecture background telemetry simulation, atmospheric dual-aurora depth system, and optical developer-workbench typography scale. Designed following Awesome DESIGN.md guidelines (Linear, Vercel, Cursor, Stripe)."

tokens:
  canvas:
    ground: "#09090b"
    obsidian: "#030712"
    void: "#010102"
    dot-matrix: "rgba(255, 255, 255, 0.05)"
    grid-tick: "rgba(255, 255, 255, 0.04)"
  aurora:
    indigo-glow: "rgba(79, 70, 229, 0.10)"
    blue-glow: "rgba(37, 99, 235, 0.10)"
    emerald-accent: "rgba(16, 185, 129, 0.05)"
  nodes:
    gateway:
      core: "rgba(186, 230, 253, 0.75)"
      ring: "rgba(56, 189, 248, 0.35)"
      baseRadius: 3.6
      ringExpansion: 5.0
    service:
      core: "rgba(165, 180, 252, 0.55)"
      baseRadius: 2.4
    cache:
      core: "rgba(110, 231, 183, 0.70)"
      ring: "rgba(52, 211, 153, 0.35)"
      baseRadius: 2.8
      ringExpansion: 3.5
    database:
      core: "rgba(253, 230, 138, 0.75)"
      ring: "rgba(245, 158, 11, 0.30)"
      baseRadius: 3.2
      ringExpansion: 4.0
  traffic:
    http:
      color: "rgba(56, 189, 248, 0.95)"
      speed: 0.38
      size: 2.0
    rpc:
      color: "rgba(129, 140, 248, 0.95)"
      speed: 0.44
      size: 2.0
    cache:
      color: "rgba(52, 211, 153, 0.95)"
      speed: 0.52
      size: 2.2
    db:
      color: "rgba(251, 191, 36, 0.95)"
      speed: 0.32
      size: 1.9
  hud:
    reticle: "rgba(56, 189, 248, 0.50)"
    text-primary: "rgba(186, 230, 253, 0.85)"
    text-accent: "rgba(52, 211, 153, 0.85)"
    cursorRadius: 160
    reticleRadius: 18

typography:
  display-xl:
    fontFamily: "Outfit, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 5.25rem)"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  display-lg:
    fontFamily: "Outfit, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.030em"
  card-title:
    fontFamily: "Outfit, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.020em"
  eyebrow:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.40
    letterSpacing: "0.20em"
    textTransform: uppercase
  mono-stats:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.40
    fontVariantNumeric: "tabular-nums"
  body-hero:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "clamp(1rem, 2vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "-0.015em"
---

# DesignKaro Background Animation & Typography Specifications

This document defines the exact visual and mathematical specifications for the **DesignKaro** landing page hero background simulation and typography system, established in accordance with the `awesome-design-md` design standard.

---

## 1. Living Telemetry Background Animation (`HeroTelemetryBackground.tsx`)

### 1.1 Canvas Viewport & Clamped DPR
- **Container**: `position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; select-none;`
- **Mask Vignette**:
  ```css
  mask-image: radial-gradient(ellipse 85% 70% at 50% 45%, black 25%, transparent 85%);
  -webkit-mask-image: radial-gradient(ellipse 85% 70% at 50% 45%, black 25%, transparent 85%);
  ```
  *Purpose*: Concentrates contrast on the hero copy, keeping the center dark and legible while maintaining peripheral network activity.
- **DPR Clamping Scale**:
  - `Mobile / Coarse Pointer (<640px)`: Cap DPR at `1.0` (16 nodes, 3 packets, 4 ripples).
  - `Tablet (640px - 1023px)`: Cap DPR at `1.25` (26 nodes, 5 packets, 8 ripples).
  - `Desktop (>=1024px)`: Cap DPR at `1.5` (38 nodes, 7 packets, 12 ripples).

---

### 1.2 Multi-Tier Architectural Topology (Node Clustering)
Rather than random Brownian motion, nodes are seeded into **3 functional distributed systems zones**:

| Tier | Horizontal Bound (`X`) | Primary Roles | Default Labels | Visual Characteristics |
|---|---|---|---|---|
| **Ingress / Edge** | `5%` to `33%` of width | `gateway` | `EDGE-L7`, `INGRESS`, `ENVOY-GW`, `ANYCAST-01` | Double radar beacon sweep, outer ring $R = R_{base} + 5 + 3\sin(\theta)$, sky-blue core |
| **Compute / Services** | `32%` to `68%` of width | `service` | `SVC:AUTH`, `WORKER:01`, `WORKER:02`, `STREAM:PROC` | Violet/sky core $R_{base}=2.4\text{px}$, organic heartbeat pulse |
| **Storage / Cache** | `66%` to `95%` of width | `cache`, `database` | `REDIS:CACHE`, `MEM:L1`, `RAFT:LEADER`, `PG:PRIMARY` | Emerald glow ($R_{base}=2.8\text{px}$) for cache; Amber glow ($R_{base}=3.2\text{px}$) for DB |

---

### 1.3 Harmonic Lissajous Drift Physics
Nodes drift around designated home equilibrium coordinates $(X_{home}, Y_{home})$:

$$X(t) = X_{home} + A_x \cdot \sin(\omega_x t + \phi_x)$$
$$Y(t) = Y_{home} + A_y \cdot \cos(\omega_y t + \phi_y)$$

- **Drift Radii**: $A_x \in [12\text{px}, 36\text{px}]$, $A_y \in [10\text{px}, 28\text{px}]$
- **Angular Frequencies**: $\omega_x \in [0.35, 0.80]\text{ rad/s}$, $\omega_y \in [0.28, 0.68]\text{ rad/s}$
- **Damped Relaxation**: $X_{curr} \leftarrow X_{curr} + (X_{target} - X_{curr}) \cdot \min(1, 2.5 \cdot \Delta t)$

---

### 1.4 Network Bus Connections & Curved Routing
- **Max Neighbor Distance**: `160px` (Desktop), `135px` (Tablet), `110px` (Mobile).
- **Max Degree ($k$)**: $k = 3$ nearest neighbors.
- **Topology Affinity**: Connections across tiers ($Ingress \to Compute \to Storage$) receive a $0.8\times$ Euclidean distance preference multiplier.
- **Quadratic Bezier Bus Routing**:
  $$\vec{P}_{mid} = \frac{\vec{U} + \vec{V}}{2} + \begin{pmatrix} 0 \\ \pm 8\text{px} \end{pmatrix}$$
- **Connection Alpha Falloff**:
  $$\alpha = \left(1 - \frac{d}{d_{max}}\right)^2 \times 0.18$$

---

### 1.5 Traffic Packets & Impact Shockwaves
- **Transit Packets**:
  - `HTTP Packet`: Sky Blue (`rgba(56, 189, 248, 0.95)`), Speed `0.38` (2.6s traversal), Size `2.0px`.
  - `RPC Packet`: Indigo (`rgba(129, 140, 248, 0.95)`), Speed `0.44` (2.2s traversal), Size `2.0px`.
  - `Cache Query`: Emerald (`rgba(52, 211, 153, 0.95)`), Speed `0.52` (1.9s traversal), Size `2.2px`.
  - `DB Commit`: Amber (`rgba(251, 191, 36, 0.95)`), Speed `0.32` (3.1s traversal), Size `1.9px`.
- **Comet Trail**: Linear gradient extending $12\%$ along the Bezier path behind the head.
- **Arrival Shockwaves (`TelemetryRipple`)**:
  - Expansion speed: $32\text{px/s} \text{ to } 46\text{px/s}$.
  - Max Radius: $24\text{px} \text{ to } 28\text{px}$.
  - Alpha Decay: $\alpha(r) = (1 - r / r_{max}) \times 0.6$.
  - Target Node Flash: $I_{glow} = 1.0 \to 0.0$ with exponential decay $\Delta t \cdot 3.0$.

---

### 1.6 Interactive Magnetic Probe & Cursor HUD
- **Tracking**: Exponential low-pass filter on cursor coordinates $(\alpha = 10 \cdot \Delta t)$.
- **Magnetic Proximity Bubble**: $R_{cursor} = 160\text{px}$.
- **Attraction Force**:
  $$\vec{F}_{pull} = \left(1 - \frac{d}{R_{cursor}}\right) \times 12\text{px} \times I_{mouse}$$
- **Targeting Reticle**:
  - Outer circle: $R = 18\text{px}$, stroke `rgba(56, 189, 248, 0.50)`.
  - 4 crosshair tick segments extending to $24\text{px}$.
  - Micro-HUD readout: `JetBrains Mono, 9px`, displaying coordinate telemetry:
    ```
    PROBE :: 842, 318
    QPS 52.4K · 3.8ms
    ```
- **Laser Reactive Links**: Gradient lines drawn from cursor to the 3 nearest active nodes.

---

### 1.7 Dual-Aurora Atmosphere & Blueprint Tick Matrix
- **Atmospheric Backdrop Gradients**:
  - Radial 1 (Top-Left): `width: 24rem; height: 24rem; bg-blue-600/10; blur-[120px]; animate-pulse-slow;`
  - Radial 2 (Top-Right): `width: 28rem; height: 28rem; bg-indigo-600/10; blur-[140px]; animate-pulse-slow (delay 2.5s);`
  - Radial 3 (Center-Bottom): `width: 20rem; height: 20rem; bg-emerald-500/5; blur-[100px];`
- **Blueprint Schematic Matrix**:
  - Intersection crosses drawn every $72\text{px}$ horizontally and vertically with stroke `rgba(255, 255, 255, 0.04)`.
  - Cross width: $6\text{px} \times 6\text{px}$ ($[-3, +3]$ in each dimension).

---

### 1.8 Performance & Lifecycle Guardrails
1. **IntersectionObserver**: Pauses the `requestAnimationFrame` loop completely when `<HeroTelemetryBackground />` leaves the viewport ($100\text{px}$ margin).
2. **Tab Visibility**: Pauses the loop on `document.hidden === true` via `visibilitychange`.
3. **Accessibility**: Listens to `(prefers-reduced-motion: reduce)`. If triggered, renders a single clean static topology blueprint frame and exits the animation loop ($0\%$ CPU utilization).
4. **Zero Allocation in Loop**: Reuses preallocated object pools for nodes, edges, packets, and ripples; no garbage collection pauses.

---

## 2. Typography Token Scale (`page.tsx`)

Following the **Linear** and **Vercel** typography playbooks:

### 2.1 Optical Tracking & Scale Matrix

| Role | Font Family | Size | Weight | Line Height | Letter Spacing | CSS Utility |
|---|---|---|---|---|---|---|
| **Display XL (Hero)** | Outfit / Plus Jakarta Sans | $56\text{px} - 84\text{px}$ | 800 | 1.06 | `-0.035em` | `font-display font-extrabold tracking-[-0.035em] text-white` |
| **Display LG (Section)** | Outfit / Plus Jakarta Sans | $36\text{px} - 48\text{px}$ | 800 | 1.12 | `-0.030em` | `font-display font-extrabold tracking-[-0.03em] text-white` |
| **Card Title** | Outfit / Plus Jakarta Sans | $20\text{px}$ | 700 | 1.25 | `-0.020em` | `font-display font-bold tracking-[-0.02em] text-white` |
| **Eyebrow Taxonomy** | JetBrains Mono | $12\text{px}$ | 600 | 1.40 | `+0.20em` | `font-mono text-xs uppercase tracking-[0.2em] font-semibold` |
| **Tabular Metrics** | JetBrains Mono | $11\text{px} - 13\text{px}$ | 600 | 1.30 | `-0.010em` | `font-mono tabular-nums font-semibold` |
| **Hero Subtitle** | Plus Jakarta Sans | $18\text{px} - 20\text{px}$ | 400 | 1.62 | `-0.015em` | `font-sans text-zinc-300 max-w-2xl leading-relaxed` |
| **Card Description** | Plus Jakarta Sans | $14\text{px}$ | 400 | 1.55 | `-0.010em` | `font-sans text-sm text-zinc-400 leading-relaxed` |

---

### 2.2 Tactile Component Badges

#### A. Rotating Action Verb Badge
```tsx
<div className="relative inline-flex items-center justify-center px-4 sm:px-6 py-1.5 rounded-xl border border-sky-500/35 bg-zinc-900/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_0_24px_rgba(56,189,248,0.18)] overflow-hidden transition-all duration-300">
  <span className="font-mono text-sky-400 font-bold tracking-tight">
    {ROTATING_ACTIONS[actionIdx]}
  </span>
</div>
```

#### B. Engineering Eyebrow Tag
```tsx
<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-500/25 bg-sky-950/40 text-sky-300 text-xs font-mono tracking-widest uppercase mb-6 sm:mb-8 shadow-[inset_0_1px_0_rgba(56,189,248,0.2),0_0_16px_rgba(56,189,248,0.12)]">
  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
  <span>Architectural Rigor · Mathematically Verified</span>
</div>
```

#### C. Hairline Elevating Surface Cards
```css
border: 1px solid rgba(39, 39, 42, 0.9);
background: rgba(24, 24, 27, 0.4);
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
border-radius: 0.75rem; /* 12px */
```

---

## 3. Quick Reference Color Map

```
Canvas Ground:       #09090b
Obsidian Void:       #010102
Surface Border:      #27272a (zinc-800)
Border Subtle:       rgba(255, 255, 255, 0.08)
Primary Sky Accent:  #38bdf8 (sky-400)
Primary Blue CTA:    #2563eb (blue-600)
Telemetry Emerald:   #34d399 (emerald-400)
Telemetry Amber:     #fbbf24 (amber-400)
Telemetry Rose:      #f43f5e (rose-500)
Text Primary:        #ffffff
Text Subtitle:       #d4d4d8 (zinc-300)
Text Muted:          #a1a1aa (zinc-400)
```
