# Notes for the next module sessions (Add & Subtract, Place Value)

Written at the end of the Fractions session (branch `feature/fractions`, 2026-06-12).
Read this before building anything.

## Agent roster (already created — reuse it)

`.claude/agents/` (project scope) now has the four agents these sessions need:
`curriculum` (opus, spec-only), `module-builder` (sonnet, implements),
`ui` (sonnet, read-only design review), `qa` (haiku, smoke + regression).
They register on session start, so unlike the Fractions session you can
delegate to them directly by name. The project-scope `ui` agent shadows the
user-scope LocalCommons one — that's intentional.

## Spec template

`docs/fractions-spec.md` is the template the curriculum agent should follow:
scope-verification notes up top (verify against MOE 2021 / think! Mathematics
P3 — the agent caught that two requested fraction skills were P2 and one was
P4), then module identity → groups/skills with itemKey forms and pool sizes →
CPA behaviors → generation rules + named-misconception distractors → mastery
model → wrong-answer scaffolds → implementation deltas → achievements.
**Pool sizes are normative, not estimates** — the Fractions builder fully
enumerated the add/subtract pools (577 items) and we had to curate them back
to ~26/skill. Tell module-builder explicitly: curated pools, deterministic
(itemKeys are persisted mastery units, so the pool must be identical on every
load — no randomness in pool generation).

## Architecture: how a module plugs in

- **Registry:** `src/modules/moduleRegistry.js` — `registerModule()` with the
  same definition shape as `src/modules/multiply.jsx` and
  `src/modules/fractions.jsx` (groups, freeContent, item pools, scaffold map,
  achievements, `checkExtraTrigger` for module-specific achievement triggers).
- **Practice screen:** one file per module (`src/fractions-practice.jsx` is a
  sibling of `src/multiplication-practice.jsx`). `src/App.jsx`'s `"practice"`
  case switches on `profile.activeModule` — add one branch per module.
- **Mastery storage:** `profiles[].mastery[<moduleId>][itemKey]` inside the
  single `jackflash_data` localStorage blob, via `dataManager`. 3 correct =
  mastered, wrong = −1 (floor 0), Leitner review 1/3/7/14/30 days, weighted
  draw (struggling 6 / learning / new 3 with ≤3 unseen in rotation / review 4
  / mastered 1). Reuse, don't reimplement. Prefix itemKeys per skill
  (fractions uses `name:`, `addL:`, …) so keys can't collide across modules.
- **Achievements:** add icons to `MODULE_ACHIEVEMENT_ICONS` in
  `src/achievementEngine.js`; module-specific trigger types go through the
  `checkExtraTrigger` fallthrough added in this branch.

## Shared components created this session (reuse for Add & Subtract / Place Value)

In `src/fractions-practice.jsx` / `src/modules/fractions.jsx` (extract to a
shared file if a second module needs them — don't copy-paste a third time):
- `FractionDisplay` — stacked numerator/vinculum/denominator rendering.
- `FractionInputFields` — two-field stacked numeric input (the pattern to
  copy for any multi-field answer input).
- `useShuffledChoices` — shuffle-once-per-item-visit hook for choice grids
  (never `Math.random()` in render; that bug already happened once).
- Choice grid (4-tap), tap-one-of-two/three compare cards, tap-in-sequence
  order tiles (drag was skipped deliberately — no gesture lib allowed).
- `FractionBar` (interactive tap-to-shade; 60px-tall segments when
  interactive for touch targets), `TwoStackedBars`, number-line scaffold
  (responsive SVG: viewBox + width:100%, never fixed px width),
  `FractionPartWholeBond` (NumberBond with two part colors, blue/green).
  The bar components are the obvious basis for **bar models** in Add &
  Subtract and **place-value charts** strips in Place Value.

## Navigation pattern (already done — next modules get it for free)

Tapping a profile card on the home screen opens a `ModulePicker` bottom sheet
(in `src/ProfilePicker.jsx`) listing every registered module, persists the
choice via `updateProfile(profileId, { activeModule })`, and enters practice.
It renders from `getModuleList()`, so a newly registered module appears
automatically — no nav work needed beyond the App.jsx practice-case branch.

## Design-system rules the UI review enforced (save yourself the punch list)

- Header chrome is `COLORS.yellow` for every module; module identity lives in
  chips/accents, not the header.
- Tokens only: `COLORS.*`, `BRUTAL_BORDER` (3px), `BRUTAL_BORDER_SM`,
  `BRUTAL_SHADOW` (4px 4px), `BRUTAL_SHADOW_SM` (3px 3px); button press =
  `translate(3px, 3px)` (sinks into its own shadow). No one-off hex values or
  1.5px borders.
- Fonts: 'Space Grotesk' body, 'Space Mono' buttons/labels, 'Shrikhand' hero.
- Black text on color chips (white fails contrast on yellow/orange).
- Touch targets ≥ ~44px; number inputs need `WebkitAppearance: "none"` inline;
  test at 375px AND 320px width (a fixed-300px SVG overflowed 320px once).
- Don't touch the multiplication module: this branch's only edits to existing
  files were App.jsx (routing), ProfilePicker.jsx (ModulePicker), and
  achievementEngine.js (icons + trigger fallthrough).

## Play-test in the browser before calling it done

Static QA (build + code-reading + logic scripts) passed this module while two
real bugs survived: an infinite `while` loop in distractor generation that
froze the page the first time an F2 item was drawn (small denominators could
never yield 4 distinct choices), and a string-vs-number `correctAnswer`
mismatch that crashed the wrong-answer render AND silently marked every
correct pictorial F2 answer wrong. Both were found in minutes by driving the
app in the Claude preview browser (`.claude/launch.json` is set up; use
`preview_start` → resize to mobile → tap through one item of EVERY answerType
in every mode, including at least one wrong answer each). Make that a
standing QA step for Add & Subtract and Place Value. Watch for: item types
whose `correctAnswer` is a number vs string (evaluateAnswer compares
strictly), and any `while` loop over randomly generated choices.

## Grade 3 scope reminders for the next two specs (from the prompt)

- **Add & Subtract:** within 10,000, regrouping, mental-math strategies,
  number bonds, bar models for word-problem structure.
- **Place Value:** numbers to 10,000 — digit values, expanded form, comparing
  and ordering, place-value charts as the concrete/pictorial scaffold.
  (Have the curriculum agent verify both against think! Mathematics P3 — the
  fractions session proved the requested scope isn't always grade-accurate.)
