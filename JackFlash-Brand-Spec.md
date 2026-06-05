# JackFlash — Brand & Design Spec

Draft v1 · The single source of truth for JackFlash's visual system. Pairs with `jackflash-tokens.json` (Tokens Studio-formatted design tokens for Figma).

The app's working values live in `src/constants.js`. When this spec and the constants disagree, the spec is authoritative for the brand and the constants get updated to match.

---

## 1. What JackFlash is

JackFlash is a Singapore Math-style flashcard app that teaches multiplication and division as visual fact families, not drills. It runs on a parent's iPad or iPhone, supports multiple kids on one device, and is built around a five-category adaptive engine called **Smart Practice**. It's free to start, has no ads, no accounts, and no data collection.

The brand should feel like the inside of a kid's notebook — warm cream, hard ink lines, bold colors used with purpose — while still reading as a serious educational tool for parents.

---

## 2. The voice

Plain, parent-direct, and unsentimental. Concrete over abstract. The app never says "AI"; the engine is rule-based and we describe it concretely (five categories, spaced repetition on a widening schedule). When in doubt, write the way a teacher who respects the parent's intelligence would explain it.

Avoid: hype words ("revolutionary," "AI-powered," "smart" as a vague adjective), exclamation points outside celebratory moments, baby-talk, edtech filler.

---

## 3. Color system

The palette is small and load-bearing. Every color carries a meaning — pick by meaning, not preference.

**Brand accents** (used in modules, Smart Practice categories, and marketing frames)

- Yellow `#FFD43B` — primary brand accent · wordmark backdrop · marketing frame 1
- Green `#06D6A0` — Multiply module · Mastered category · marketing frame 2
- Blue `#4CC9F0` — Add module · New category · marketing frame 3
- Pink `#FF6B9D` — Struggling category · marketing frame 4
- Purple `#B388FF` — Place Value module · marketing frame 5
- Orange `#FF9F1C` — Fractions module · Review-due category · marketing frame 6
- Red `#FF5252` — Reserved for errors and destructive actions only. Never decorative.

**Surfaces**

- Background `#FFFBEB` — the warm cream everything sits on
- Cream `#FFF8E7` — secondary surface for nested panels
- White `#FFFFFF` — cards and tiles
- Ink `#1A1A1A` — every border, every shadow, all primary text. Never use pure black (`#000`).

**Text**

- Primary `#1A1A1A` (ink)
- Secondary `#555555`
- Tertiary `#999999` — hints and disabled states only

The color rule that does the most work: **module color = the category color you'll see when that module is on screen**. Multiply is green throughout — the module badge, the mastered category, the Frame 2 background — so a parent learns the visual association naturally.

---

## 4. Typography

Five fonts, each with a specific job. All are SIL OFL fonts available on Google Fonts, so they work in Figma without any special hosting.

- **Galindo** — display / marketing headlines. Friendly, rounded, single weight. Used for App Store screenshot headlines and any high-impact display moment.
- **Boldonse** — the JackFlash wordmark and the heaviest display moments only. Distinct retro feel; don't use it for body or running text.
- **Space Grotesk** (400 / 500 / 600 / 700) — all UI in the app: body, headings, button labels, captions.
- **Space Mono** (400 / 700) — numbers, stat counters, anything code-like (e.g. the `next day → 3 days → 7 days` schedule).
- **Shrikhand** — section headings inside the app (e.g. the onboarding "How JackFlash Works"). Playful editorial italic feel — use sparingly.

**Standing type styles** (see `jackflash-tokens.json` for full specs)

- `marketingHeadline` — Galindo, 122px, line-height 1.16. App Store screenshot caption. Auto-shrink to 106px for longer captions.
- `marketingSubline` — Space Grotesk Bold, 41px.
- `screenHeading` — Shrikhand, 26px.
- `cardTitle` — Space Grotesk Bold, 14px.
- `body` — Space Grotesk Regular, 12.5px, line-height 1.7.
- `captionUpper` — Space Grotesk SemiBold, 11px, ALL CAPS, letter-spacing 1px. For stat labels like `MASTERED`, `STREAK`, `STEP 2 OF 3`.
- `statNumber` — Space Mono Bold, 12.5px.

---

## 5. The neobrutalist treatment

JackFlash's signature visual move. Every interactive surface — cards, buttons, devices, badges — gets:

- A **thick ink border**: 3px (`borderWidth.md`) for standard, 2.5px (`borderWidth.sm`) for smaller elements.
- A **hard offset shadow**: 4px right / 4px down, zero blur, ink color. (3px / 3px for the small variant.)
- **No** soft drop shadows, no gradients, no inner glows, no semi-transparent overlays. Flat color, hard edges.

The shadow is *part of the element*, not a depth effect. It reads as a deliberate stylistic offset, not as physics.

In CSS: `border: 3px solid #1A1A1A; box-shadow: 4px 4px 0 #1A1A1A;`

In Figma: the shadow is a Drop Shadow with X 4, Y 4, Blur 0, Spread 0, color `#1A1A1A`. Save this as a shared effect style called `Brutal / shadow`.

**Special case — colored left border on category cards.** The Smart Practice category cards keep the 2.5px ink border on three sides and replace the *left* border with a 6px colored bar (the category color). In code, declare the colored `borderLeft` *after* the `border` shorthand or the shorthand will reset it (this is the bug we fixed in `SmartPracticeExplainer.jsx`).

---

## 6. Logo and the lightning bolt

The JackFlash wordmark uses **Boldonse** with a custom lightning-bolt mark to its left. The lightning bolt is the only standalone brand mark; everywhere else, the bolt and the wordmark appear together as a lockup.

Mark file: `GraphicAssets/JF_LogoMark_01.svg`. Colors inside the mark: ink `#111`, light blue `#98e9f4`, yellow `#fbca52`, orange `#ea9836`. (These are the legacy logo palette and are *not* the brand palette — keep them inside the logo mark only.)

The lightning bolt can stand alone as a 1-color silhouette in any single brand accent + ink outline. Use sparingly as a decorative element; don't stamp it into every layout.

---

## 7. Smart Practice — the branded feature

**Smart Practice is always capitalized as a proper noun.** It names the five-category adaptive engine and should appear consistently across the app, the App Store listing, the FAQ, screenshots, and the landing page. Never write it as "smart practice" — that's a generic adjective, and the entire point of the branded name is to anchor a specific definition.

The five categories and their colors are part of the brand, not just a visual choice:

| Category   | Color  | Meaning |
|------------|--------|---------|
| New        | Blue `#4CC9F0`   | Only 2–3 unseen facts introduced at a time |
| Learning   | Yellow `#FFD43B` | Seen before, not yet mastered — shown often |
| Struggling | Pink `#FF6B9D`   | Missed repeatedly — top priority |
| Mastered   | Green `#06D6A0`  | 3 correct — moves into long-term review |
| Review-due | Orange `#FF9F1C` | Mastered fact whose review window came up |

The colored left border on each category card is how this system makes itself visible. Keep that pattern consistent everywhere a category is shown.

---

## 8. Component patterns

These are the recurring building blocks. Build each as a Figma component with its design tokens linked.

**Card / Brutal** — white surface, 3px ink border, 4px / 4px ink shadow, 8px or 12px radius. The default content container.

**Card / Category** — same as Brutal, but the left border is replaced with a 6px colored bar (one of the five Smart Practice colors). Used in the Smart Practice explainer and anywhere a category appears.

**Button / Brutal** — same border and shadow as the card, but filled with a brand color (yellow for primary, white for secondary). Active press: scale to 0.98 and reduce shadow to 1px / 1px.

**Pill / Nav** — bottom navigation. Pill-radius (999px) white surface with the brutal border and shadow. Active tab fills with that tab's color (yellow for Players, purple for Modules, green for Settings). Inactive tab icons are gray `#999`.

**Profile card** — white brutal card, large avatar emoji centered, child name in cardTitle, progress bar below in the module color. Each card has a separate "Progress" button beneath it (also a brutal pill).

**Achievement badge** — brutal card, ~88×88px, white surface, emoji or small icon, name in 11px caption underneath. Locked badges fade to gray and show a lock icon.

**Marketing frame** — see Section 10.

---

## 9. App style vs. marketing style

Both share the neobrutalist treatment, but they're tuned differently.

**In-app style** is calm. Most surfaces are white on cream. Color appears as accents (module badges, category cards, active states), not as full backgrounds. This is so a child practicing for 5 minutes doesn't get visually overwhelmed.

**Marketing style** is loud. Full-bleed color backgrounds, very large headlines in Galindo, the app screen sitting on the color as a device mockup. This is so a parent skimming the App Store gets the pitch in one glance.

The link between the two is the device frame in marketing — it's the same neobrutalist black-bordered, offset-shadow treatment scaled up. The app's interior visible inside that frame should look familiar when the parent later opens it.

---

## 10. Marketing screenshot frame system

Used for App Store screenshots, landing-page hero shots, and social posts. Full anatomy lives in `JackFlash-Screenshot-Spec.md`. The system in brief:

- **iPhone canvas**: 1320 × 2868 px portrait. **iPad canvas**: 2064 × 2752 px portrait.
- Caption at the top in Galindo, left-aligned with a 96px margin, max 3 lines.
- Subline beneath in Space Grotesk Bold.
- A device mockup centered below — black rounded rect (78px radius), 26px black bezel, the real screen capture inset and clipped to a 50px radius. The bottom of the device bleeds off the frame edge to feel immersive.
- A darker version of the frame's background color sits behind the device as the brutal offset shadow.
- One frame = one brand accent color as the background.

The six current marketing frames map to: yellow (profiles), green (Smart Practice), blue (practice/CPA), pink (mastery), purple (parent zone with a privacy ribbon), orange (streaks & achievements).

---

## 11. Don'ts

- Don't use pure black `#000` — always ink `#1A1A1A`.
- Don't add soft drop shadows, glows, or gradients anywhere.
- Don't introduce a new color without retiring one — the palette is small on purpose.
- Don't write "smart practice" lowercase. It's Smart Practice. Always.
- Don't use "AI" anywhere in marketing copy. Describe the engine concretely.
- Don't use Boldonse outside the wordmark or one-off display headlines.
- Don't stack more than two of the brand accents in a single layout — color is a punctuation mark, not a decoration scheme.

---

## 12. Using this in Figma

1. Create a new Figma file: **JackFlash Design System**.
2. Install the **Tokens Studio for Figma** plugin (free).
3. Plugins menu → Tokens Studio → "Tools" tab → "Load from file or preset" → upload `jackflash-tokens.json` from this folder.
4. Tokens Studio will create a single set called `jackflash`. Click "Apply to document" — this generates Figma variables for colors, dimensions, and typography styles in one shot.
5. Confirm Galindo, Boldonse, Space Grotesk, Space Mono, and Shrikhand are available (they're on Google Fonts; Figma should detect them automatically).
6. Build the component library using Section 8 as the checklist. Link each component's properties to the imported tokens so updates flow downstream.

When this spec changes, regenerate `jackflash-tokens.json` first, re-import into Tokens Studio, then update components. Don't edit colors directly in Figma without updating the tokens — the spec is the source of truth.

---

## Related documents

- `jackflash-tokens.json` — the design tokens, Tokens Studio format
- `JackFlash-AppStore-Listing.md` — App Store copy, captions, keywords
- `JackFlash-Smart-Practice-FAQ.md` — the public explainer for the Smart Practice engine
- `JackFlash-Screenshot-Spec.md` — full marketing screenshot anatomy
- `JackFlash-Multiply-Build-Plan.docx` — engineering build plan
- `JackFlash-Product-Family-Spec.docx` — long-range product family roadmap
- `src/constants.js` — the live values used by the app
