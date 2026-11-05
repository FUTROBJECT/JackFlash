# Place Value — practice card layout and spacing pass (UI spec, 2026-11-05)

Third card in the series after Add & Subtract (`docs/add-column-card-ui.md`,
revision 2) and Fractions (`docs/fractions-card-ui.md`). Adam, 2026-11-05:
"edit the Place Value module with these layout edits". Same rules so the
three modules read as one system.

Scope: `src/place-value-practice.jsx` (the pre-answer practice card and its
`ScaffoldForItem`), plus **opt-in** props in `src/shared/barComponents.jsx`
only where named below (default off, so Add & Subtract's `QuestionChart` and
the reveals render byte-identically). **The wrong-answer reveal
(`WrongAnswerReveal`, `buildPlaceValueLine`, the reveal's picture and re-ask
inputs) is not touched.** No other module.

## 1. One order for every card: dots → question → picture → answer

Today the picture block (scaffold wrapper with tap-to-dismiss, "Tap the
picture to hide it" caption, "Show me" button) renders **after** the answer
input (`BuildNumberInput` / `PVChoiceGrid` / tapTwo cards / orderThree tiles
/ singleNumber input + Check). On "Read the discs" (B1) the chart *is* the
question, yet it sits under Check. Move the whole picture block — unchanged
logic (`scaffoldRendered`, `showScaffold`, `userHidScaffold`,
`scaffoldOpacity`, `missRun` pulse) — to **directly after `QuestionDisplay`
and before the answer input**. The "Not sure? Count the picture." nudge sits
just above the picture block (as in Fractions).

- Concrete B2 ("Build it"): the interactive chart *is* the answer input —
  leave it where the answer goes (after the question). If B2 has a separate
  pre-answer scaffold, it must not duplicate the input chart.
- After the move, report, per skill, whether the answer controls start on
  screen at 393×759 on load (choice grid / cards / tiles: at least their top
  row; typed answers: the input box). Typed answers may push Check to the
  fold — acceptable, as in Fractions (tapping the box raises the keypad).

## 2. Spacing — 16px between major blocks; no pills

- Mastery dots: centred row, `marginBottom: 16`.
- **Skill pill removed** (all skills). The header pill names the group and
  the question says what to do. (The focus chip is already gone.)
- Question → picture block → answer: ~16px each. Measure with margin
  collapse in mind; wrappers holding an inline-level button should be
  `display: flex; justify-content: center` so the gap is exact (the
  Fractions review caught 3–4px baseline extras).
- "Tap the picture to hide it" stays tight under the picture (6px).
- "Show me" ≥44px tall (`style={{ minHeight: 44 }}`).

## 3. Bigger labels on the card's charts

The disc chart's column headings ("Thousands", "Hundreds", "Tens", "Ones")
are `clamp(9px, 2.8vw, 11px)` and "tap to count" is 11px light grey — easy to
miss (same note as the Add grid's H/T/O). Add an opt-in prop on
`PlaceValueChart` → `PlaceValueDiscChart`, e.g. `largeLabels = false`:
headings `clamp(11px, 3.4vw, 14px)` with `#1A1A1A`, "tap to count" / "✓ n"
12px `#666` (still clearly secondary), and the per-column count chip digits
one step larger if they currently read small. **Must not wrap or clip at
320px with four columns** — "Thousands" is the longest; if it can't fit at
the larger size, let it shrink via the clamp, never wrap. The practice
card's non-compact charts pass `largeLabels`; **compact charts (C1/C2
stacked, C3 mini, X2 pre-answer) keep their sizes** — they must stay small
to fit. The strips (`PlaceValueStrips`) are unchanged.

## 4. Pre-answer pictures

Already compliant with the module's own rule (§3 of `place-value-spec.md`:
the chart shows the model; counts shown are digits *given* in the question;
the answer is always a blank chip). **Do not change what the pictures show.**
Just confirm nothing in the reorder makes an answer visible earlier.

## Must not change

Scoring, mastery, itemKeys, the reveal, "not sure" conversion, Show me /
`pictureRequested`, the fade rule, group locks, B1 tap-to-count behaviour,
B2 steppers, design tokens, touch targets ≥44px.

## QA (main loop, preview, 393×759 / 375×667 / 320×568)

One item of each answerType (`singleNumber`, `choice4`, `tapTwo`,
`orderThree`, `buildNumber`) in each CPA mode with a wrong answer each;
B1 tap-to-count; no heading wrap/clip at 320; Add & Subtract column card
unchanged (its chart doesn't opt in).

## As built (2026-11-05)

Built by module-builder, reviewed by ui, play-tested in the main loop at
393×759, 375×667 and 320×568. Changes after build and review:
- **Heading sizes (measured, not estimated):** "Thousands" in Space Mono 700
  fits a 4-column chart's column only up to 12px at 393pt and 9px at 320pt.
  `largeLabels` now carries the column count: 4 columns use
  `clamp(9px, calc(5.5vw - 8.6px), 12px)` (9px at 320 → 12px from ~375),
  3 columns `clamp(11px, 3.6vw, 14px)`; the column's side padding drops to
  2px with large labels. No clipping at 320/375/393.
- "Build it" (B2) opts in too (`BuildNumberInput largeLabels`); the reveal's
  build chart doesn't.
- "tap to count" gets a two-line minimum height so the first tap ("✓ 1")
  doesn't shift the answer below it.
- B2/B3/X3 Shrikhand numerals and B4's words get a tight line height so the
  gap below them is ~16px, not 28–36.
- Count-chip digits unchanged (they read fine).

Verified at 393×759: B1 Concrete (tap-to-count ✓ 1, wrong → reveal → right),
V2 Pictorial (wrong → reveal), C1 Abstract (wrong → reveal → right), C2
Pictorial (wrong order → "Tap the smallest." → right; tiles top on screen),
B2 Concrete (wrong build → reveal → right), X1 Pictorial (input and Check on
screen). Add & Subtract's chart unchanged (no opt-in). No console errors.

