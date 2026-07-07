# JackFlash Icon Style Spec

The build contract for the custom icon set. Fill the **[FILL]** fields as you
design the golden references; the **Locked** sections are already determined by
JackFlash's design system — icons must honor them, don't change them here.
When the [FILL] fields and the golden SVGs are done, this file + those SVGs are
what `module-builder` reproduces the full set against. One sitting produces:
this filled spec, the golden SVGs, and the finalized inventory.

---

## 1. Locked (JackFlash design system — do not change)

- **Palette — use these tokens only.** Icons introduce no new colors.
  `bg #FFFBEB · black #1A1A1A · pink #FF6B9D · yellow #FFD43B · blue #4CC9F0 ·
  green #06D6A0 · orange #FF9F1C · purple #B388FF · red #FF5252 · cream #FFF8E7`
- **Outline / linework color:** `#1A1A1A` (black) — the neo-brutalist black
  used for every border and shadow in the app.
- **Module accent colors** (for module glyphs): multiply `#06D6A0`, add
  `#EF476F`, fractions `#FF9F1C`, placeValue `#B388FF`, connections `#FFB703`.
- **House style:** neo-brutalist — bright saturated fills, thick black
  outlines, hard offset shadows (no soft/gaussian shadows, no gradients unless
  you explicitly opt in below).
- **Must read at two sizes:** ~**24px** (progress grid, parent-zone list) and
  ~**64px+** (profile cards, achievement popups). Detail that vanishes at 24px
  is wasted.
- **Format out:** raw **SVG** (editable paths), not PNG. Delivered as inline
  React components in `src/icons/`, themed via the tokens above.

## 2. [FILL] — Geometry & construction

- **Canvas / viewBox:** `[FILL — e.g. 0 0 100 100]` (square recommended)
- **Stroke weight (outline):** `[FILL — px at the viewBox scale, e.g. 6]`
- **Corner radius / line caps:** `[FILL — rounded? mitred? cap style]`
- **Fill vs. stroke:** `[FILL — solid fills + black outline? or line-only?]`
- **Offset shadow on the icon itself?** `[FILL — yes: Xpx/Ypx black offset · or
  no, the container provides the shadow]`
- **Gradients / texture:** `[FILL — none (default) · or describe]`
- **Consistent light source / direction:** `[FILL — e.g. shadow down-right]`

## 3. [FILL] — Style character

- **Detail budget:** `[FILL — minimal geometric · medium · illustrative]`
- **Avatar/character treatment:** `[FILL — full body? face/bust only? how are
  the 16 named characters (Bolt, Rusty, Marmalade, Jade, Glimmer, Cocoa,
  Ember, Professor, Waddle, Roary, Zap, Twinkle, Blaze, Blip, Gus…) unified?]`
- **How each avatar gets its color:** `[FILL — each character owns one accent
  token? two-tone? see AVATARS ids like robot-blue / cat-orange]`
- **Expression / personality:** `[FILL — playful, calm, goofy? eye style?]`
- **Anything explicitly OUT:** `[FILL — no outlines thinner than X, no more than
  N colors per icon, etc.]`

## 4. [FILL] — Golden reference set (attach the raw SVGs)

Pick 2–4 that stress the style. Recommended coverage: one **avatar/character**
(hardest), one **simple glyph** (star/lightning), one **achievement badge**.
List the files as you add them to `docs/icon-golden/`:

- `[FILL — filename.svg → what it is]`
- `[FILL]`
- `[FILL]`

## 5. Inventory (finalize the counts — this drives production batching)

- **Avatars — 16**, ids + names already defined in `constants.js` `AVATARS`
  (schema is `{id, label, emoji}`; the `emoji` field is the placeholder we
  replace). Confirm all 16 stay, or edit the roster: `[FILL]`
- **Global achievement icons — ~8**: First Steps 👣, streak 🔥, on-fire 🔥,
  unstoppable ⚡, week/day 📅, century 💯, speed ⏱️, crown/legendary 👑.
  Confirm/rename: `[FILL]`
- **Per-module badges:** each module defines its own (e.g. Table Tamer, Group
  Clear, Fraction Master…). Produce as generic shapes tinted by module color,
  or bespoke per badge? `[FILL]`
- **Module glyphs (optional):** custom marks for multiply/add/fractions/etc.,
  or keep color-only identity? `[FILL]`

---

**When sections 2–5 are filled and the golden SVGs are in `docs/icon-golden/`:**
hand back to the main loop. It writes the per-batch build spec, `module-builder`
draws from this contract (simple glyphs first, avatars last), `ui` reviews each
batch against the golden set, and integration goes one surface at a time
(avatars → achievements) with a preview play-test each. Nothing is produced
before this spec is locked.
