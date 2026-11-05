# In-app number pad for every typed answer (spec, 2026-11-05)

Adam (TestFlight 1.2 (7), a word problem): "the iphone keypad blocks the
screen. can't we have the custom number pad for all of these problems?" On an
iPhone the system number keyboard covers the bottom ~40% of the screen —
the story, the picture and Check disappear behind it. Add & Subtract's column
problems already use an in-app pad (`ColumnPad` in
`src/shared/ColumnMethod.jsx`, sticky at the bottom of the card, no
`<input>`), and that is the model for every other typed answer.

Also: **remove the remaining skill pills** on Add & Subtract's non-column
cards ("Word problem", "Add in your head", facts…), as on every other card.

## Scope — every `<input>` a child types an answer into

| Module | Card | Reveal re-ask |
|---|---|---|
| Multiply & Divide (`src/multiplication-practice.jsx`) | ~1304 | ~1554 |
| Add & Subtract singleNumber: mental, words, facts (`src/add-practice.jsx`) | ~1553 | ~1696 |
| Fractions singleNumber E2 (`src/fractions-practice.jsx`) | ~2408 | ~2625 |
| Fractions fractionInput E3, A1–A4 (`FractionInputFields`, ~175) | card | reveal |
| Place Value singleNumber B1, B4, X1, X2, C3 (`src/place-value-practice.jsx`) | ~2181 | ~2323 |

After this change **no practice or reveal screen renders an `<input>`**
(the parent gate and name entry are not practice and keep theirs).

## 1. One shared component: `src/shared/NumberPad.jsx`

- **`NumberAnswer`** — the answer display + the pad, for a single number.
  Props: `value` (string of digits), `onChange(next)`, `onSubmit()`,
  `maxDigits` (default 5), `live` (accepts input; default true), `sticky`
  (pad sticks to the viewport bottom inside the card, exactly as
  `ColumnAnswerInput`'s sticky mode — the component must be the card's LAST
  child), `compact` (reveal), `state` ("input" | "correct" | "missed" for the
  green / yellow fill colours the existing inputs show), `display` (render
  prop or a style hook so each module keeps its current answer look — Multiply
  and Place Value show a big Shrikhand "?" over an underline; keep that look,
  just not an `<input>`).
  - The display is a non-focusable box (role="textbox" aria-readonly, aria-label
    "Answer"), showing the typed digits or the "?" placeholder, with a
    blinking caret when live. No `<input>`, so iOS never raises its keyboard.
  - Pad: reuse **`ColumnPad`** (digits 0–9, ⌫, Check) — same keys, same 44px
    height, same press behaviour, so the whole app has one keypad. Check is
    disabled until there is at least one digit.
  - Hardware keys (desktop/iPad keyboards): digits, Backspace, Enter → Check,
    via a window listener while `live`, the same rules as ColumnAnswerInput
    (ignore when focus is in a real text field; Enter on a non-pad button is
    left alone).
- **`FractionAnswer`** — Fractions' stacked numerator/denominator version:
  two display boxes over a vinculum, one **active** at a time (highlighted
  border; tapping a box makes it active; starts on the numerator). Digits go
  to the active box; ⌫ deletes from the active box and, if empty, moves to
  the numerator. No auto-advance (numerators can be two digits). Same pad,
  same Check rule (both boxes non-empty). Replace `FractionInputFields`'
  inputs with this, keeping its visual size (`fieldWidth`, `fieldFontSize`,
  `dense`) props working.

## 2. Wiring rules (all modules)

- Keep each screen's existing answer **state and handlers** (`userAnswer` /
  `numVal` / `denVal`, `handleSubmit`, the retry submit): the pad just
  writes the same strings the input used to. Scoring, `evaluateAnswer`, the
  "not sure" fast-wrong conversion (C2, timed from the item becoming
  answerable), mastery, `responseMs` (Multiply's invisible fluency window),
  the reveal state machine — **unchanged**.
- Remove the input-focus calls (`inputRef.current?.focus(...)`) that only
  existed to raise the keyboard; keep the `window.scrollTo(0, 0)` behaviour
  where it is meant for the practice screen (Multiply's `viewRef` guard stays).
- Card: the `NumberAnswer`/`FractionAnswer` is the **last child of the card**
  with `sticky` on, so the pad sits at the bottom and the question/picture
  stay visible above it. Any Check button the screen rendered separately for
  typed answers goes (the pad's Check replaces it). The existing scroll
  alignment idea from ColumnAnswerInput applies: on load, keep the answer
  display just above the pad without pushing the question/picture's top under
  the header; reuse ColumnAnswerInput's measured `alignGrid` approach (factor
  it out if that's cleaner, without changing Add's column behaviour).
- Reveal re-ask: `compact`, not sticky, live only while `retry.phase ===
  "ask"` (and the reveal's own stage gate). The reveal must still fit one
  phone screen (R2) — use the compact pad (as Add's column reveal does).
- Concrete Multiply: the array builder and its interactions are untouched;
  only the typed answer changes.
- **Add & Subtract pills:** the non-column skill pill (incl. the W1/W2
  "Word problem" label) is removed; the card opens dots → question.

## Must not change

Item pools, itemKeys, scoring, mastery, reveal logic, achievements, fluency
timing, locks, Add's column grid/pad behaviour, design tokens, touch targets
≥44px, no new dependencies.

## QA (main loop, preview + iPhone 17 simulator)

Every typed-answer skill in every CPA mode: type, ⌫, Check disabled/enabled,
right answer, wrong answer → reveal re-ask with the compact pad → right;
second miss fill; "not sure" fast wrong; Fractions two-box switching; desktop
hardware keys; no `<input>` left on any practice/reveal screen; the question
and picture stay visible above the pad at 393×759; Multiply regression with
its fluency window (`[JF] responseMs` log still appears); iOS simulator: no
system keyboard ever appears on a practice screen.

## As built (2026-11-05)

Built by module-builder (`src/shared/NumberPad.jsx`: NumberAnswer,
NumberDisplay + NumberPadBar for Multiply's mid-card box, FractionAnswer,
useStickyAlign, useHardwareKeys; ColumnPad reused unchanged), reviewed by ui,
play-tested in the main loop. After review:
- FractionAnswer: the inactive box gets a faint dashed outline ("tap me");
  hardware Tab / "/" / ↓ go to the denominator, ↑ back, and Enter with only
  the numerator filled moves down instead of doing nothing.
- Caret is `.jfCaret` in animations.css and stops blinking under Reduce
  Motion; Enter ignores key-repeat.
- Card answer boxes go green on a correct answer in every module (only
  Multiply passed `state` before).
- **Typed digits take priority:** on a short screen the answer box can start
  behind the pad (Place Value X1/C3 at 375×667, C3 at 393×759); after the
  first digit the view scrolls so the box sits just above the pad (instant
  scroll — smooth scrolling was skipped in the preview WebView).

Verified: no `<input>` on any practice/reveal screen; Multiply type / ⌫ /
Check disabled when empty / wrong → compact-pad reveal → right; correct
answer and the `[JF] responseMs` debug log still recorded; Add word problem
(the "Mia's school" item) wrong → reveal → right, mental and facts cards
with the pad and no pill; Fractions two-box switching, wrong → reveal → right,
reveal fits at 375×667 (Check at 590/667); Place Value B1/X1/C3 with the
pad, C3 wrong → reveal.

Open (Adam to decide): Multiply's dot array sits below the answer box, so on
big facts in Pictorial (e.g. 8 × 5 at 393×759) the sticky pad covers most of
it — the iOS keyboard covered more before, so it's not a regression on a
phone.

