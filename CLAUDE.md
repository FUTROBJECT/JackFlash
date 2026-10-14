# JackFlash

Math-fact practice app for Jack (8, Grade 3 / P3), aligned with the **think!
Mathematics (Singapore Math)** curriculum. React + Vite, no TypeScript, no CSS
frameworks, no test framework. Neo-brutalist design. Ships to web (GitHub Pages)
and to iOS/Android via a Capacitor shell (`com.laserlabstudio.jackflash`).

## Commands

```
npm run dev          # Vite dev server (port 5173) — store shape
npm run dev:tester   # same with VITE_JF_TESTER=1 (staged modules on) — preview config `jackflash-dev-tester`
npm run build        # web build → dist/
npm run cap:sync     # CAP=1 build + npx cap sync (native shell) — the STORE build
npm run cap:sync:tester  # same, with VITE_JF_TESTER=1: every module open (Jack's phone only)
npm run cap:ios      # open Xcode project
# Web deploy: automatic. Pushing main (GitHub Desktop) runs .github/workflows/deploy.yml,
# which builds and publishes GitHub Pages. (There is no deploy script; the old gh-pages one was removed.)
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
| Add & Subtract | `add` | **shipping in 1.1** — $3.99 (`module.add.full`, RevenueCat entitlement `add`), **colAdd + facts free** (groups colAdd, colSub, mental, words, facts) — spec `docs/add-spec.md`, stories `docs/add-word-problems.md` |
| Connections (capstone word problems) | `connections` | built, **not wired** — v1.2 |
| Place Value | `placeValue` | **shipping in 1.2** — $3.99 (`module.placevalue.full`, RevenueCat entitlement `placeValue`), **Build & Read free** — spec `docs/place-value-spec.md` |

**Store builds:** 1.0 = Multiply (free, all of it) + Fractions (Foundations
free, rest $3.99). 1.1 adds Add & Subtract (colAdd + facts free). `main` is
now **1.2** = 1.1 + Place Value (Build & Read free) + the **$9.99 All-Modules
bundle** (every module, including future ones; shown only once 3 paid modules
are on sale AND it's cheaper than what the family still has to buy). A 1.1
fix build would need `placeValue` put back in `STAGED_MODULES` and its product
back to `available: false`. Staging mechanism (`STAGED_MODULES` in
`moduleRegistry.js`, empty right now): a staged module's screen is imported
but `registerModule` skips it unless `IS_TESTER_BUILD` (`VITE_JF_TESTER=1`),
so in the store build it exists only as a "Coming Soon" card.
A saved profile on an unregistered module is moved to Multiply at startup.
The tester build (Jack's phone) registers them and makes
`isModuleFullyUnlocked` always true. Never widen `freeContent` for testing,
and never archive a tester build.

To ship a staged module: remove it from `STAGED_MODULES`, flip its product's
`available: true` and entitlement mapping in `purchaseManager.js`
(Connections also needs its import + routing branch uncommented in
`App.jsx`), then play-test.

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

**Parent locks (per-profile `settings`, edited in ParentZone).** `lockedMode`
(concrete/pictorial/abstract), `lockedGroup` (a group id of the active
module) and `lockedOperation` (multiply/divide, Multiply only). All three are
**derived in the practice screen, never state**: read from the profile, and
an unknown or inaccessible id (a stale setting from another module) means
no lock. ParentZone offers only what the active module has — accessible
groups, non-`mixed` operations — and shows a foreign stored value as
"Any …". A group lock limits the pool, bypasses the readiness gate inside
the group, frames the header pill against it, and disables other groups'
skill rows in the progress grid; in Multiply it flows through
`isTableAccessible`, and a saved child table selection wholly outside the
lock falls back to the locked group rather than an empty draw. Locked UI
always says "🔒 Locked … by a parent in Parent Zone".

**Purchases (`purchaseManager.js`).** Product catalog (all modules $3.99,
bundle $9.99) → synchronous entitlement cache → async provider (simulated on
web via `window.confirm`; native provider is a stub until RevenueCat/StoreKit).
Gating helpers: `isContentAccessible(moduleId, groupId)` and
`isModuleLocked(moduleId)` (no `freeContent` + not purchased = locked
everywhere: onboarding, profile creation, home ModulePicker). The **All-Modules
bundle card is hidden until 3+ paid modules are `available`** (ParentZone
`BUNDLE_MIN_PAID_MODULES`) **and while it costs less than the modules the
family still has to buy** — an honest discount, never a pre-sale. Owning the
bundle counts as owning every module (`getProductsWithStatus`), so no $3.99
button shows and `purchase()` returns `already_owned`. On the public web build
(`canPurchaseHere()` false) the store shows "in the iPhone & iPad app" notes
instead of buy buttons; the dev server keeps the simulated `confirm()` buy.

## Launch (App Store / Play)

Full runbook: **`docs/LAUNCH-native-setup.md`** (native scaffold → RevenueCat →
submission). Read it before any store-facing work. Key state:

- **Launch shape:** Multiply (free) + Fractions ($3.99, Foundations free). Bundle
  and the other modules stay off until they ship.
- **Web and iOS are ready; Android is not.** Xcode 26 + CocoaPods are on the
  build machine and `ios/` is generated and tracked (Capacitor 8, SPM plugins;
  Xcode team `9BA8CS8TP8`, automatic signing). `android/` is not generated.
  `ios/App/App/public` is gitignored — it holds whatever was last synced, so
  **committing to `main` never updates the phone.**
- **Phone test build** (Adam's iPhone 16 is usually connected; find its UDID
  with `xcrun devicectl list devices`). Run from the primary checkout, where
  `ios/` lives:
  `npm run cap:sync:tester` (tester build: all modules open for Jack) →
  `xcodebuild -project ios/App/App.xcodeproj -scheme App
  -configuration Debug -destination id=<UDID> -allowProvisioningUpdates build`
  → `xcrun devicectl device install app --device <UDID> <…/Debug-iphoneos/App.app>`
  → `xcrun devicectl device process launch --device <UDID>
  com.laserlabstudio.jackflash`. Installs in place; profiles/progress survive.
- **IAP is scaffolded, not live.** The iOS RevenueCat key is set; the Android
  key is `…__TODO`. Still needed: `module.fractions.full` in both stores
  attached to the RevenueCat `fractions` entitlement, then a sandbox test.
- **Store URLs:** `public/privacy.html` + `public/support.html` → live at the
  GitHub Pages URLs, published automatically when `main` is pushed. Contact = Laser Lab Studio LLC /
  adamlaserlab@gmail.com (confirm before submitting).
- **Icons/splash:** generated into `ios/App/App/Assets.xcassets` from the
  sources in `assets/` (`npx capacitor-assets generate`; re-run after
  `android/` exists). The Xcode build's "Splash has 3 unassigned children"
  warning is harmless. See `assets/README.md`.

## Vocabulary

- **Table groups** (multiply): `easy` = 2s/5s/10s, `medium` = 3s/4s,
  `hard` = 6s–9s.
- **Fractions groups**: `foundations` (F1–F4), `equivalent` (E1–E4),
  `compare` (C1–C2), `addSubtract` (A1–A4). Skill codes appear in itemKeys
  and the progress grid.
- **Add groups** (no tier gate): `colAdd` (A1–A3), `colSub` (S1–S3, S3 =
  across zeros), `mental` (M1–M3, open number line), `words` (W1–W3, bar
  models; stories in `docs/add-word-problems.md`), and
  `facts` (F1–F2) — a `supporting: true` group that stays out of the default
  draw (reached by skill focus or a parent group lock).
- **answerType** (fractions/placeValue/add): `choice4`, `tapTwo(/OrEqual)`,
  `orderThree`, `fractionInput`, `singleNumber`, `buildBar`, `buildNumber`,
  `column` (Add's written column method: in-app right-to-left digit pad in
  `src/shared/ColumnMethod.jsx`, no `<input>`, no auto-submit) — the practice
  screen picks the input component by this field.

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
  works from `generateFacts()` OR `pool`; Lock CPA Mode / Lock Group / Lock
  Operation dropdowns), Modules store, settings
- `src/Onboarding.jsx` — first-run parent flow (module choice respects locks)
- `src/shared/` — cross-module bar components, illustrations, UI bits
- `src/modules/` + `src/*-practice.jsx` — one pair per module
- `docs/*-spec.md` — curriculum specs (the build contract for each module)
- `docs/voice-and-messaging.md` — copy rules for anything describing the app,
  its goals or success: math isn't a race; mastery means "from memory", never
  "fast"; the child is only compared with their own last week. Read before
  writing any copy.
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
