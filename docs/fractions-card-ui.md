# Fractions — practice card layout and spacing pass (UI spec, 2026-11-04)

Decided by Adam (2026-11-04) after the same pass on the Add & Subtract card
(`docs/add-column-card-ui.md`, revision 2): picture before the answer
everywhere, the same 16px block rhythm, bigger labels on the pictures, no
skill pills, and two pre-answer pictures that gave the answer away now show
only the question.

Scope: `src/fractions-practice.jsx` only (the pre-answer practice card and
its `ScaffoldForItem`). **The wrong-answer reveal (`WrongAnswerReveal`,
`pictureFor`, `buildFractionLine`, the re-ask inputs) is not touched.**
Shared components in `src/shared/barComponents.jsx` are not edited; if a
prop is genuinely missing, add it opt-in with a default that leaves every
other caller's markup unchanged. Do not touch other modules.

## 1. One order for every card: dots → question → picture → answer

Today `ScaffoldForItem` (and its "Tap the picture to hide it" caption and the
"Show me" button) render **after** the answer input, so for E1, E2, E3,
A1–A4, F3/F4/C1 and C2 the picture is below Check / the choices and often
below the fold in Pictorial at 393×759. Move that whole block — the scaffold
wrapper with its tap-to-dismiss, the caption, and the "Show me" button — to
**directly after `QuestionDisplay` and before the answer input**, unchanged
in logic (same `scaffoldRendered`, `showScaffold`, `userHidScaffold`,
`scaffoldOpacity`, `missRun` pulse conditions). The "Not sure? Count the
picture." nudge chip stays just above the picture block.

- F1 and E4 already draw their picture inside `QuestionDisplay` (that's why
  `scaffoldRendered` is false for them) — no change.
- Concrete F2: the interactive bar is the input — no change.
- After the move, check the answer controls are still reachable without
  scrolling on load at 393×759 for every skill in Pictorial (they may sit
  lower; that is expected, but Check / the choice grid must not start below
  the bottom of the screen for the common cases). Report any skill where it
  does.

## 2. Spacing — a 16px rhythm between major blocks

- **Mastery dots:** centred row (as today), `marginBottom: 16` (was 12).
- **Skill pill: removed** (all skills). The header pill already names the
  group, and the question line says what to do. Keep the focus chip ("Only
  this skill · ✕ practise everything") when a skill is focused, as the first
  block after the dots, `marginBottom: 16`.
- Between the question, the picture block and the answer input: 16px each
  (normalise the scattered `marginTop: 16` / `12` / `marginBottom: 8`
  values on these blocks so the visible gaps come out at ~16px; collapsing
  margins count — measure, don't assume).
- The "Tap the picture to hide it" caption stays tight under the picture
  (6px) — it belongs to the picture.

## 3. Bigger labels on the card pictures

In `ScaffoldForItem`, the fraction labels drawn above/beside the bars use
`FractionDisplay size="small"` (13px). Change them to `size="normal"` (18px)
on the practice card. The reveal's pictures (`pictureFor`) keep their sizes —
the reveal must still fit one screen (R2).

## 4. Pre-answer pictures show only the question

The rule (memory "scaffold-no-pre-reveal", Add/Place Value): a picture before
the child answers states the question; the completed answer appears only
after an answer (the existing `feedback` gate) or in the reveal.

- **E2 "Missing number"** (`1/2 = ?/6`, or `2/3 = 4/?`): top bar = the given
  fraction, shaded and labelled (as today). Bottom bar **unshaded**:
  - numerator blank (`?/6`): split into the given denominator's parts, no
    shading, no label.
  - denominator blank (`4/?`): **not split** — one whole, unshaded, no label
    (the number of parts is the answer).
  - After `feedback` is set: today's picture (shaded target, label).
- **E3 "Simplest form"** (`2/4 → ?/?`): top bar = the given fraction (as
  today); bottom bar **one whole, unshaded, no label** until `feedback`.
- **E1 "Find the match!"**: the bottom bar IS one of the four choices (its
  parts and shading identify it). Pre-answer show **only the base bar**; the
  target bar appears once `feedback` is set.
- **F2 "Shade it!"** in Pictorial/Abstract (non-concrete): the pre-shaded
  hint bar is the answer. **Do not render it before `feedback`**; after
  `feedback` keep today's picture. (Concrete F2 is already excluded.)
- Unchanged on purpose: F3/F4/C1/C2 comparison bars (both fractions are the
  question; reading the bars is the skill), A1–A4 (result bar already "?"
  over an empty outline), E4.

If `TwoStackedBars` cannot draw an unshaded bar (`n: 0`) or an unsplit bar
(`d: 1`) cleanly, say so in the report rather than restyling the component.

## Must not change

Scoring, mastery, `itemKey`s, the reveal, "not sure" conversion (C2), Show
me / `pictureRequested` / `peeked`, the fade rule, focus and group locks,
the side pattern for F3/F4. Design tokens only; black text on chips; touch
targets ≥44px.

## QA (main loop, in the preview, 393×759 and 320×568)

One item of every answerType in every CPA mode with a wrong answer each
(Fractions: `choice4`, `buildBar`, `tapTwo`, `tapTwoOrEqual`, `orderThree`,
`fractionInput`, `singleNumber`); E1/E2 (both blank variants)/E3/F2 pre-answer
pictures show no answer; picture above the answer on every skill; Multiply
regression.

## As built (2026-11-04)

Built by module-builder, reviewed by ui, play-tested in the main loop at
393×759, 375×667 and 320×568. Changes after build and review:
- **F2 pre-answer picture:** the bar is drawn cut into its d parts, none
  shaded (also behind "Show me"), instead of hidden; the non-concrete
  prompt reads "How many parts will you shade?".
- **Focus chip removed** from the card too (Adam, 2026-11-04). A focused
  skill ends when the child leaves practice (home) or taps the Progress
  screen's main Practice button — `focusSkill` isn't saved.
- **A1–A4 labels:** `AddBarsScaffold` gained an opt-in `labelSize` (default
  "small", so the reveal is unchanged); the card passes "normal" and
  `compact` (24px bars) so the fraction input stays on screen.
- **C2 keeps small labels** (three labelled bars) so the order tiles fit at
  375×667. At 320×568 they still start just below the screen.
- "Show me" is ≥44px; focus/Show me wrappers are flex so gaps are exact.
- **Pre-existing reveal bug fixed:** the Concrete F2 re-ask bar sat in a
  wrapper with no width and collapsed to a few pixels ("|||"), so the
  re-ask couldn't be answered. The wrapper is width: 100%.
- Typed answers (A1–A4, E2, E3): with the picture first, the second input
  box and Check can sit at or just below the fold at 393×759; tapping the
  first box brings up the keypad and scrolls, as before.

Verified: E2 both blank variants, E3, E1 and F2 show only the question;
E2 wrong → reveal (full picture) → right; C1 Abstract wrong → reveal →
right; A1 Concrete wrong (2/8) → reveal → right; F2 Concrete wrong → reveal
bar now tappable → right; C2 wrong order → "Tap the smallest." → right;
no horizontal overflow at 320; no console errors.

