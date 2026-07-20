# JackFlash

Math-fact practice app for Jack (8, Grade 3 / P3), aligned with the **think!
Mathematics (Singapore Math)** curriculum. React + Vite, no TypeScript, no CSS
frameworks, no test framework. Neo-brutalist design. Ships to web (gh-pages)
and to iOS/Android via a Capacitor shell (`com.laserlabstudios.jackflash`).

## Commands

```
npm run dev          # Vite dev server (port 5173)
npm run build        # web build → dist/
npm run cap:sync     # CAP=1 build + npx cap sync (native shell)
npm run cap:ios      # open Xcode project
npm run deploy       # gh-pages -d dist
```

Browser preview: `.claude/launch.json` defines `jackflash-dev` for the
preview tools. Always play-test in the preview at 375px (and 320px for
overflow) before calling UI work done.

## Git / push workflow

- This machine has **no CLI push credentials** (no `gh`, empty credential
  store). Claude commits **locally on `main`**; Adam pushes via **GitHub
  Desktop**. Never attempt `git push`.
- If working in a session worktree, hand changes to the primary checkout
  before ending (copy files or check the branch out here), since Desktop only
  pushes what the primary checkout has.
- Don't commit heavy binaries beyond the existing App Store screenshots.

## Architecture

**Module system.** Each practice module = a definition in `src/modules/*.jsx`
registered via `registerModule()` (`src/modules/moduleRegistry.js`) + a
practice screen at `src/<name>-practice.jsx`. Registration happens as an
import side effect of the practice screen; `App.jsx` imports the shipped
screens and its `"practice"` case routes on `profile.activeModule`. A module
definition carries: `id, name, groups, freeContent, skillLabels, pool` (or
`generateFacts()` for multiply), scaffold map, achievements, and optional
`checkExtraTrigger` for module-specific achievement triggers.

**Module status (v1, July 2026):**

| Module | id | State |
|---|---|---|
| Multiply & Divide | `multiply` | shipped — **the free module** (all groups free) |
| Fractions | `fractions` | shipped — $3.99, **Foundations group free** (sample to drive conversion) |
| Add & Subtract | `add` | built, **not wired** (imports commented in App.jsx) — v1.1 |
| Connections (capstone word problems) | `connections` | built, **not wired** — v1.2 |
| Place Value | `placeValue` | not built (spec pattern: docs/fractions-spec.md) |

To ship a staged module: uncomment its import + routing branch in `App.jsx`,
flip its product's `available: true` and entitlement mapping in
`purchaseManager.js`, then play-test.

**CPA modes.** Every module runs Concrete (interactive visual) → Pictorial
(visual fades with mastery: `opacity = max(0.15, 1 − 0.3 × level)`) →
Abstract (symbols + "Show me" fallback). Wrong answers always re-show the
scaffold at full opacity with a "because…" line, hint, and part-whole bond.
Understanding before memorization; the visual is never punished.

**Mastery model (shared, in `dataManager.js`).** Unit = one item key
(multiply `"6x2"`/`"12÷2"`; fractions prefixed `name:3/4`, `addL:1/4+2/4`…).
3 correct = mastered; wrong = −1 (floor 0). Weighted draw: struggling 6,
learning `(3−level+1)×2`, new 3 (≤3 unseen in rotation, pool order),
review-due 4 (Leitner 1/3/7/14/30 days), mastered 1, anti-repeat guard.
**Item pools must be finite, curated (~16–40 per skill), and deterministic** —
itemKeys are persisted mastery units, so pool generation can never be random.

**Storage.** One localStorage blob: `jackflash_data` (profiles with per-module
`mastery[moduleId][itemKey]`, purchases, unlocked modules, bundle flag, parent
settings, session history). Legacy key `jackflash_mastery` is migrated on
init. `storage.js` mirrors the blob to `@capacitor/preferences` in the native
shell (iOS can purge WKWebView localStorage) — no-op on web; don't make
dataManager async.

**Purchases (`purchaseManager.js`).** Product catalog (all modules $3.99,
bundle $9.99) → synchronous entitlement cache → async provider (simulated on
web via `window.confirm`; native provider is a stub until RevenueCat/StoreKit).
Gating helpers: `isContentAccessible(moduleId, groupId)` and
`isModuleLocked(moduleId)` (no `freeContent` + not purchased = locked
everywhere: onboarding, profile creation, home ModulePicker). The **All-Modules
bundle card is hidden until 3+ paid modules are `available`** (ParentZone
`BUNDLE_MIN_PAID_MODULES`) so it's an honest discount, not a pre-sale — it
auto-surfaces later; don't re-enable it earlier.

## Launch (App Store / Play)

Full runbook: **`docs/LAUNCH-native-setup.md`** (native scaffold → RevenueCat →
submission). Read it before any store-facing work. Key state:

- **Launch shape:** Multiply (free) + Fractions ($3.99, Foundations free). Bundle
  and the other modules stay off until they ship.
- **Web is ready; native is not.** Capacitor deps + `capacitor.config.json` are
  in, but `ios/`/`android/` aren't generated (needs Xcode/CocoaPods/Android
  Studio — absent on the build machine as of this writing).
- **IAP is scaffolded, not live.** RevenueCat keys are `…__TODO`; create
  `module.fractions.full` in both stores + a RevenueCat `fractions` entitlement.
- **Store URLs:** `public/privacy.html` + `public/support.html` → live at the
  gh-pages URLs after `npm run deploy`. Contact = Laser Lab Studios /
  adamlaserlab@gmail.com (confirm before submitting).
- **Icons/splash:** source assets ready in `assets/` — `npx capacitor-assets
  generate` after platforms exist. See `assets/README.md`.

## Vocabulary

- **Table groups** (multiply): `easy` = 2s/5s/10s, `medium` = 3s/4s,
  `hard` = 6s–9s.
- **Fractions groups**: `foundations` (F1–F4), `equivalent` (E1–E4),
  `compare` (C1–C2), `addSubtract` (A1–A4). Skill codes appear in itemKeys
  and the progress grid.
- **Add groups**: tiered — N Number Bonds, M Make a Ten, F Facts,
  K Fact Families, X Missing Numbers (tier 1); R Big-Number Adding,
  S Mental Tricks (tier 2).
- **answerType** (fractions/add): `choice4`, `tapTwo(/OrEqual)`, `orderThree`,
  `fractionInput`, `singleNumber`, `buildBar` — the practice screen picks the
  input component by this field.

## File map

- `src/App.jsx` — screen state machine (onboarding → profilePicker →
  parentGate → parentZone → practice), module routing
- `src/dataManager.js` — data blob, profiles, mastery updates, streaks
- `src/purchaseManager.js` — catalog, entitlements, providers
- `src/achievementEngine.js` — shared triggers + `MODULE_ACHIEVEMENT_ICONS`;
  module-specific triggers go through the `checkExtraTrigger` fallthrough
- `src/constants.js` — design tokens (COLORS, BRUTAL_*, MODULE_COLORS, AVATARS)
- `src/ProfilePicker.jsx` — home screen, profile cards, ModulePicker sheet,
  CreateProfile 3-step flow
- `src/ParentZone.jsx` — children editor (module-agnostic ProgressReport —
  works from `generateFacts()` OR `pool`), Modules store, settings
- `src/Onboarding.jsx` — first-run parent flow (module choice respects locks)
- `src/shared/` — cross-module bar components, illustrations, UI bits
- `src/modules/` + `src/*-practice.jsx` — one pair per module
- `docs/*-spec.md` — curriculum specs (the build contract for each module)
- `NOTES-next-modules.md` — cross-session build notes; read before building
  a new module

## Design system (non-negotiable)

Tokens only, from `constants.js`: `BRUTAL_BORDER` 3px / `_SM` 2.5px solid
#1A1A1A; `BRUTAL_SHADOW` 4px 4px / `_SM` 3px 3px; button press =
`translate(3px, 3px)` sinking into its own shadow. Fonts: Space Grotesk
(body), Space Mono (buttons/labels), Shrikhand (hero numbers). Header chrome
is always `COLORS.yellow`; module identity lives in chips/accents. Black text
on color chips (white fails contrast on yellow/orange). Touch targets ≥44px;
number inputs need inline `WebkitAppearance: "none"`. Fractions render
stacked (numerator/vinculum/denominator), never inline "3/4".

## Do NOT

- Refactor or restyle shipped modules when adding a new one — navigation
  hookup only.
- Add dependencies, TypeScript, CSS frameworks, or test frameworks.
- Call `Math.random()` in render paths — shuffle once per item visit
  (`useShuffledChoices` pattern; a render-reshuffle bug shipped once).
- Assume `correctAnswer` is a string — buildBar items use numbers and
  `evaluateAnswer` compares strictly (a crash + silent mis-scoring shipped
  once). Coerce before string ops.
- Write unbounded `while` loops over randomly generated choice sets (froze
  the app once — small denominators can't yield 4 distinct choices).
- Exceed P3 curriculum scope without checking the spec (e.g. fraction-of-a-set
  is P4; denominators cap at 12).

## QA convention

Static QA (build + logic checks) is **not sufficient** — it has missed an
infinite loop and a type-mismatch crash that five minutes of preview driving
caught. For any module work: drive the preview and answer **one item of every
answerType in every CPA mode, including at least one wrong answer each**, and
regression-check multiplication. Project agents (`.claude/agents/`):
`curriculum` (spec, opus) → `module-builder` (sonnet) → `ui` (review-only,
sonnet) → `qa` (haiku). Agents must exist before the session starts to be
delegable by name.
