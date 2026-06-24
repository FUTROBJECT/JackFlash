# Illustration & Intro-Animation Style — working notes

Status: **art being developed off-Claude.** This doc is the handoff spec so custom
artwork drops straight into code. Implementation (the motion + wiring) is done in
the app; this captures the decisions and the asset requirements.

---

## 1. Tech decision (locked)

Animations are **hand-authored SVG + CSS keyframes** — no Lottie, Rive, video, or
animation runtime.

Why: the app ships **offline-first** inside a Capacitor native wrap (no runtime
CDN), the bundle is kept lean (~380 KB), and the neo-brutalist style is bold flat
shapes that animate cleanly with CSS transforms. This matches how reference sites
(unstructured.io, quipo-app.com) do their "simple animated illustrations" —
SVG assets + CSS/light-JS motion, no heavy player.

Escalate only if a future need appears:
- **Rive** — only if we want an *interactive mascot* that reacts to right/wrong
  answers (state machines). Bundle the `.riv` locally to stay offline.
- **Lottie** — only for designer-made complex loops we don't want to hand-code.

---

## 2. What already exists in code

So new art composes with, not duplicates, what's there:

- `src/shared/illustrations.jsx` — 4 looping module illustrations (pure SVG+CSS):
  `MultiplyArray`, `NumberBond`, `FractionBar`, `BarModel`. Module-colored.
- `src/animations.css` — shared keyframes:
  - `fadeSlideUp` — generic entrance
  - `illoCycle` / `illoDraw` / `illoGrowX` / `illoGrowY` — looping illustration motion
  - `illoPopIn` / `illoPopInFaint` — onboarding CPA dot entrance
  - `cardPopIn` / `cardRiseIn` — staggered list-card entrance
  - all gated by `@media (prefers-reduced-motion: reduce)`
- `src/LightningBolt.jsx` — the real bolt (filled multi-path SVG, accent-color prop)
- `src/LogoLockup.jsx` — bolt + "JackFlash" wordmark (Galindo), responsive em-scaled

---

## 3. Brand tokens (use these, not raw hex)

From `src/constants.js`:
- `COLORS`: black `#1A1A1A`, pink `#FF6B9D`, yellow `#FFD43B`, blue/cyan `#4CC9F0`,
  green `#06D6A0`, orange `#FF9F1C`, purple `#B388FF`, red `#FF5252`, cream `#FFF8E7`,
  bg `#FFFBEB`
- `MODULE_COLORS`: multiply = green, add = `#EF476F`, fractions = orange,
  placeValue = purple, connections = `#FFB703` (gold)
- Borders/shadows: `BRUTAL_BORDER` (3px solid black), `BRUTAL_BORDER_SM` (2.5px),
  `BRUTAL_SHADOW` (4px 4px 0 black), `BRUTAL_SHADOW_SM` (3px 3px 0)
- Fonts: Shrikhand (display), Galindo (wordmark), Space Grotesk (body), Space Mono (labels)

---

## 4. Asset prep checklist (for handing art back for wiring)

- [ ] **SVG, not PNG** — vector stays crisp at any size and is offline-safe in the
      native wrap. No raster.
- [ ] **One object per file** — bolt, wordmark, and each math object (×, ÷, +, −, =,
      fraction pie, ten-frame, number bond, bar model, dot array, …) as separate
      SVGs or clearly named `<g>` groups. Don't ship one flattened scene.
- [ ] **Animatable structure** — parts that should move independently are separate
      elements (e.g. each dot its own `<circle>`, each bar its own `<rect>`), not
      merged paths.
- [ ] **Clean coordinates** — tidy `viewBox`, flattened transforms, no editor cruft,
      run through SVGO.
- [ ] **Use brand colors** — fills from the palette above so module theming + dark/
      light handling stays consistent. Black outlines = `#1A1A1A`.
- [ ] **Note motion intent per object** — e.g. "flies in, replaces the first *a*",
      "orbits and holds", "strikes from top". The choreography matches the design.
- [ ] **Drop location** — `src/assets/` (create it), or alongside the relevant
      component.

---

## 5. Intro / splash concept (parked, art-pending)

Direction explored (quipo-app.com style): a brief **app-load splash** where
Singapore-math objects and operators **zoom/spin in from the edges**, the bolt
**strikes**, and the wordmark assembles with **some letters replaced by math
objects** (e.g. the two `a`s → fraction pies).

Implementation plan once art lands:
- A `SplashScreen` component (wraps `LogoLockup` / `LightningBolt` + new objects),
  mounted over the app in `src/main.jsx`.
- **Plays once per cold launch** (module-level / sessionStorage flag — not on every
  navigation), **~1.5 s**, **tap-to-skip**, dismisses into profile picker / onboarding.
- **Reduced-motion**: show the static lockup briefly (or skip) — no zooming.
- **Native handoff**: the OS static splash (Capacitor config PNG) should match the
  bolt art so the static→animated handoff is seamless.

Two-layer reality on device: native static splash (pre-JS) → animated web splash
(first paint) → app.
