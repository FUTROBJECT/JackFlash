# Wrong-answer reveal ("Not yet") — build spec, phase 1: Multiply & Divide

Copy this file to `docs/wrong-answer-reveal-spec.md` in the build worktree.

## Why
On a wrong answer the explanation is appended *below* the problem in the same
scrolling column (`src/multiplication-practice.jsx` ~L948–997: scaffold, "It's
42", because-chip, skip-count strip, number bond, Next button), and Enter
advances past it (~L393–397). On a phone it lands below the fold; Jack (8)
scrolls past it or is confused that content appeared. The most important
teaching moment in the app is the easiest thing in it to skip.

## What
A wrong answer takes over the screen with a warm, house-style reveal. The
picture builds at full size, ONE derivation line states the step he didn't
have (including the answer, once), then **the same fact is asked again with the
picture still up and the answer token blanked** — he reads it back off the
picture. A correct re-answer flows on with the ordinary green beat. No Next
button. Enter submits the re-answer. Correct answers are unchanged.

## Rules (non-negotiable)

**R1 — Record once, at first submit; the re-answer is never logged.**
> The outcome of an item is recorded exactly once, at the first submission.
> When that answer is wrong the app calls `updateMastery(profileId, moduleId,
> itemKey, false)` (level −1, floor 0), increments `sessionStats.total` with no
> increment to `sessionStats.correct`, resets `streak` to 0, and enters the
> reveal. That is the complete record for the item.
> The re-answer inside the reveal is an assisted attempt (picture, derivation
> line on screen). It is understanding, not fluency, and is **not logged**. A
> re-answer — correct or wrong — must NOT: call `updateMastery` or change
> `correct`, `attempts`, `masteredAt`, `lastSeen` or the review interval;
> change `sessionStats`; change `streak` (stays 0 — the next *unassisted*
> correct starts it at 1); call `checkAfterAnswer` or any streak milestone;
> count toward the ≥10-problem daily-streak threshold. Put this paragraph as a
> comment above the retry handler.
Why: counting a scaffolded answer would let "3 correct = mastered" be reached
without one unaided recall; charging a second −1 would make the lesson cost
more than the miss, which is punishing the visual (CLAUDE.md).

**R2 — One phone screen, keyboard up.** The reveal fits 375×667 with the iOS
number keyboard open (~360px usable) and no internal scrolling. Bands (typed
case): header 32 · picture ≤150 · derivation line ≤44 (2 lines max) · re-ask
prompt 20 · input 64 · gaps ~40. The input sits **directly under the picture**
so both survive the keyboard. If it doesn't fit, cut a band; never scroll.

**R3 — One visual + one sentence + the re-ask. Nothing else.** No standalone
answer chip, no skip-count strip, no number bond (see Pedagogy). Anything
else moves to the pre-answer "Show me" path, which may be long because a
chosen detour is allowed to be long — a forced one is not.

**R4 — A lesson, not a penalty.** Cream/yellow, ink borders, house tokens. No
red panels, no ✗, no "oops", no exclamation marks. The existing red tint on the
input is the only wrong-state cue.

**R5 — No escape hatch.** Escape and scrim do nothing; Tab is trapped inside.
The only exits are a correct re-answer or the second-miss auto-continue.

**R6 — Same item, same orientation, same input.** Never flip `6 × 7` to `7 ×
6`; never change the answer modality.

**R7 — Correct-answer path untouched.** 900ms green pulse → `pickNewFact()`.

## Pedagogy (from the curriculum pass — decided)

**Header.** "Not yet" is the invariant opening; the tail rotates
**deterministically** (index = miss count within session, or an itemKey hash —
never `Math.random()` in render): "Not yet. Here's the picture." / "Not quite.
Look at it." / "Not yet — watch this."

**Derivation line** replaces "because …" (which was circular: "42 because
6×7=42"). Rule: it must state a step he did not already have.
- Multiply `a × b = c`: `a bs: b, 2b, 3b, …, [c]` e.g. `6 sevens: 7, 14, 21, 28,
  35, [42]`. (Spell the plural: sevens, eights; "ones", "tens".)
- Divide `c ÷ b = a`: `c in groups of b → [a] groups`.
`[…]` is the answer token: shown as the numeral when the line first appears;
**replaced by a yellow blank chip of the same width (no layout shift) when the
re-ask opens**; returns in green on a correct re-answer.

**Picture.**
- Multiply: `DotArray` at full opacity **with running totals labelled down the
  right edge of the rows** (7, 14, 21 … 42) — the skip count merged into the
  array. Implement as an opt-in prop on `DotArray` (`totals={true}`), default
  off, so the in-problem scaffold is unchanged. (Additive change to a shipped
  component, explicitly allowed here.)
- Divide: `BarModel` as it renders today (whole labelled, segments labelled),
  plus **one** extra chip under the derivation line, ≤24px: the multiplication
  partner `a × b = c` — the P3 "think multiplication" strategy.
- The number bond is **removed from the multiply/divide reveal** (and from the
  wrong-answer path entirely): a part-part-whole bond with 6 and 7 as the parts
  of 42 is false under Singapore Math's additive bond grammar.

**Re-ask prompt** (small, Space Mono): **"Now you — use the picture."** Same
string everywhere.

**Retry policy.** One retry.
- Correct → identical green beat to an ordinary correct (same 900ms), then
  `pickNewFact()`. No "you got it that time" flourish.
- Wrong → the correct answer **fills into the input** on a yellow chip
  background, input disabled; the picture stays; line: **"Still tricky. Here it
  is — we'll come back to it."**; auto-advance after ~2.5s, Enter advances
  immediately; **and the itemKey enters the comeback slot** (below).

**Comeback slot.** One slot. A second-miss itemKey is served again within the
next 3–5 draws (pick the offset deterministically, e.g. 3 + (hash % 3)),
bypassing the weighted draw and the anti-repeat guard. Serving it is an
ordinary, fully-logged attempt. If another item earns the slot while one is
pending, it queues behind. Implement inside `pickNewFact` as a pre-check
before the weighted selection; state lives in the practice screen (session
scope, not persisted).

**Timing.** Picture builds 0–400ms → derivation line at 400ms → re-ask (blank
chip, live input) at ~900ms → input focus at ~600ms after the picture finishes,
so the keyboard doesn't cover the animation he is meant to watch.

**CPA modes.** Same content in all three; only the entrance differs.
- Concrete / Pictorial: the reveal's scaffold mounts **without** the build
  animation (`animate={false}`) at full opacity — it reads as the picture he
  already had, brought forward.
- Abstract: builds from nothing (`animate={true}`, the existing `dotPop`).
- **Fix the shipped bug:** `multiplication-practice.jsx` ~L919 gates the whole
  scaffold block on `mode !== "abstract"`, so an Abstract miss shows no picture
  at all. Adopt the fractions guard (`if (mode === "abstract" && !showScaffold)
  return null`) on the card. A miss never changes the mode setting.
- Multiply has no "Show me" button (CLAUDE.md says Abstract = symbols + "Show
  me" fallback; `userHidScaffold` at ~L106 is dead state). Add the
  fractions-style "Show me" (see `fractions-practice.jsx` ~L1484–1490) to the
  multiply card in Abstract mode. Pre-answer only; it does not affect logging.

**Also fix in passing:** the correct-feedback strings are chosen with
`Math.random()` in render (~L956). Pick deterministically (e.g. by
`sessionStats.total % 5`).

## Architecture

**New shared shell:** `src/shared/WrongAnswerReveal.jsx` — presentational
overlay. Owns: fixed full-screen layer (`position:fixed; inset:0; z-index:900`
— below `AchievementPopup`'s 1000), the one-screen grid (`height:100dvh`,
rows: header auto / picture `minmax(0,1fr)` / line auto / prompt auto / input
auto; `overflow:hidden`), enter animation (`cardRiseIn` from `animations.css`),
focus trap, Escape/scrim no-ops, delayed autofocus of the input slot. Props are
named slots: `header`, `problem`, `picture`, `line`, `extra` (divide's partner
chip), `prompt`, `input`, plus `open`, `focusDelayMs`. **No knowledge of facts,
mastery, or evaluation** — those stay in the practice screen.

**Picture fit — a legibility problem, not a fitting one.** `DotArray` uses
6–11px dots (`src/modules/multiply.jsx` L9–13), so a 10×10 fact is ~100px
wide — tiny as a hero. The picture slot wraps the component in a measuring
wrapper (`ResizeObserver`) and applies `transform: scale(k)`, `k = clamp(1,
min(slotW/naturalW, slotH/naturalH), 2.5)`, `transform-origin:center`: scale
**up** to fill, capped so dots stay crisp, never past the slot. Scale, don't
restyle the shipped component.

**Multiply integration** (`src/multiplication-practice.jsx`):
- State: `retry = { phase: "idle"|"ask"|"done"|"missed", value: "" }`,
  `comeback = { itemKey, dueIn }|null`, `missCount` (session, for the header
  rotation).
- `handleSubmit` incorrect branch: keep `setStreak(0)`, `setFeedback("incorrect")`,
  `setShowScaffold(true)`; add `setRetry({phase:"ask", value:""})`,
  `setMissCount(n+1)`.
- Render `<WrongAnswerReveal open={feedback === "incorrect"} …>` with the slots
  above; the fact in the card's Shrikhand style; picture per Pedagogy; the
  derivation line with the blank-chip behaviour; number input styled like the
  card's (`WebkitAppearance:"none"`, Shrikhand, centred, ≥44px) + a "Check"
  `BrutalButton`; Enter submits.
- `handleRetrySubmit` (with the R1 comment above it): correct → phase `done`,
  green beat, `setTimeout(pickNewFact, 900)` — `pickNewFact` already resets
  `feedback`/`showScaffold`/`userAnswer`, which closes the reveal (also reset
  `retry`). Wrong → phase `missed`: fill the answer, show the second-miss line,
  set `comeback`, `setTimeout(pickNewFact, 2500)`; Enter → `pickNewFact()` now.
  **Nothing in this function touches mastery, stats, streak, or achievements.**
- `handleKeyDown` on the card input: remove the `feedback === "incorrect"`
  branch (the reveal owns Enter while open).
- Remove from the card: the appended incorrect block (feedback text, because,
  `HintComponent`, `NumberBond`) and the "Next →" button. `NumberBond` import
  becomes unused in this file if nothing else uses it — remove the import, not
  the shared component (Add & Fractions still use bonds legitimately).
- `pickNewFact`: comeback pre-check before the weighted draw (see Pedagogy).

**Fractions — phase 2 (not now).** Same shell; the `input` slot hosts the same
component for the item's `answerType`; wrong pick dimmed/disabled on choice
items, no reshuffle; `orderThree` re-ask reduces to one tap ("Tap the
smallest"); derivation lines per skill per the curriculum note (to be added to
this spec before phase 2). `correctAnswer` may be a number (buildBar) — coerce.

## Deferred (do not build now)
Fact-family chip in "Show me"; parent-facing assisted counters;
end-of-session "with the picture" line. (The Abstract-mode "Show me" pulse
was built 2026-09-11 — see "Show me pulse" at the end of this file.)

## Do NOT
No dependencies, TypeScript, CSS frameworks, test frameworks. Tokens only from
`constants.js`; black text on colour chips; touch targets ≥44px; number inputs
`WebkitAppearance:"none"`. No `Math.random()` in render paths. Don't restyle
shipped modules beyond what this spec names. Don't touch `App.jsx` routing,
`purchaseManager.js`, `dataManager.js` (no schema changes). Builders don't
commit — the main loop commits after play-testing.

## QA (CLAUDE.md: static QA is not sufficient — the main loop drives the preview)
At 375 and 320, in each mode (concrete / pictorial / abstract), for a multiply
AND a divide fact: wrong → reveal appears and fits (no scroll) → retry right →
green beat → next; and wrong → retry wrong → answer fills → line → auto-advance
(and Enter advances) → the item comes back within 3–5 draws. Escape/scrim do
nothing; Tab stays inside. Mastery sanity via `localStorage.jackflash_data`:
after wrong→retry-right, `correct` is down exactly 1 and never back up,
`attempts` +1 (first submit only), session total +1 / correct +0, streak 0.
Regression: correct answers pulse and advance; achievements and streak
milestones still fire on unassisted corrects; Progress grid unchanged; "Show
me" in Abstract shows the scaffold before answering.

# Wrong-answer reveal — visual polish (phase 1b)

Append this as a section to `docs/wrong-answer-reveal-spec.md` in the build
worktree. Rules R1–R7 and the Pedagogy section are unchanged. This is
presentation only: no logic, no timing, no state changes.

## Why
Adam's review of the working reveal: "It just needs to look better. Frame it
all in with the same white rounded rectangle. Bump up the text sizes. The
CTAs/directives are small. Bold some fonts or change some font types to be
more friendly. The dot diagrams could get smaller if need be."

Today the reveal is loose type on a cream sheet. The practice card the child
just left is a white rounded rectangle with an ink border and hard shadow —
the reveal should read as *that card, taken over*, not as a different screen.

## The frame
- The page behind stays the practice screen's ground (cream + the same grid
  lines the practice screen paints; reuse its `background` value). No dark
  scrim — this is a lesson card, not a modal.
- All reveal content sits in ONE card: `backgroundColor: "white"`, `border:
  BRUTAL_BORDER`, `boxShadow: BRUTAL_SHADOW`, and the same `borderRadius` the
  practice card uses — read it from the main card wrapper in
  `multiplication-practice.jsx` (the div containing `<MasteryDots …>` near the
  top of the card, ~L1030) and use the identical value. Match its horizontal
  page margin too, so the reveal card sits exactly where the practice card sat.
- Card padding: `clamp(14px, 4vw, 20px)`; internal row gap 10px. Card is
  top-anchored (`alignContent:start` stays) with the same top offset as the
  practice card's top edge, so the frame doesn't jump on open.
  **In practice this is resolved in R2's favour**: the practice card sits
  ~175px down (under the sticky header), but the reveal card sits at ~16px —
  the sticky header is gone during the takeover, so there's no header to
  match, and the card rises into place (`cardRiseIn`) rather than holding the
  practice card's exact top.
- Keep `height: 100dvh` on the outer layer; the card itself is `height:auto`
  (it must never scroll internally). Body scroll-lock stays.

## Typography (the app's own faces, one step up)
Fonts already loaded by the app: Space Grotesk (body), Space Mono (labels /
buttons), Shrikhand (hero numbers), Galindo (display). Bump everything one
step and move the *spoken* lines out of the label font.

| Slot | Now | New |
|---|---|---|
| Header ("Not yet. Here's the picture.") | Space Mono 700, 13–15px | **Space Grotesk 700, `clamp(20px, 6vw, 24px)`**, ink, `lineHeight 1.2` — the app's bold sans, same face as the prompt and second-miss line. (Galindo was tried and rejected: in-app it belongs to the wordmark only.) |
| Problem ("2 × 6") | Shrikhand 18–22px | **Shrikhand `clamp(28px, 8.5vw, 34px)`**, operator coloured like the card (`×` orange / `÷` green) |
| Derivation line ("2 sixes: 6, 12 / … → [7] groups") | Space Mono 700, 13–15px | **Space Mono 700, `clamp(16px, 4.8vw, 19px)`**, `lineHeight 1.45`; the yellow blank chip and the token scale with it (min-width tracks the numeral width — keep the no-layout-shift rule) |
| Divide partner chip ("2 × 2 = 4") | Space Mono 700 12px | **Space Mono 700 15px**, same cream chip |
| Prompt ("Now you — use the picture.") | Space Mono 700 12px, 0.7 opacity | **Space Grotesk 700, `clamp(16px, 4.6vw, 18px)`**, ink, full opacity, sentence case — a directive should read like a person, not a label |
| Second-miss line ("Still tricky. Here it is — we'll come back to it.") | as prompt | **Space Grotesk 700, same size as prompt**, ink |
| Retry input | Shrikhand 32–44px, 64px tall | unchanged size; keep `WebkitAppearance:"none"`, the 4px ink underline, and the tinted states |
| "Check" button | `BrutalButton` default | **the default (not `small`) `BrutalButton`, `minHeight 48`, `fontSize 18`, Space Mono 700**, full card width minus padding (`width: 100%`), yellow — the biggest tap target on the screen after the input |
| Running totals on the dot array | 10–12px labels | scale with the array; make sure they are ≥ 12px *after* the transform at the new cap (bump the label font in `DotArray`'s `totals` branch if needed — totals branch only) |

Contrast: black text on every coloured chip (yellow blank chip, cream partner
chip, green/yellow input states). No red panels, no exclamation marks (R4).

## The picture gets smaller to pay for the type
- Picture band cap: `min(150px, 24dvh)` → **`min(120px, 20dvh)`**. The
  scale-to-fill logic is unchanged (cap 2.5×); it will simply land lower.
- Reason: R2 still governs. At 375×667 the retry input's bottom edge must stay
  ≤ ~400px with the bigger type and the card padding/border added. Budget:
  card top ~16 · padding 16 · header 30 · problem 40 · picture ≤120 · line
  28 (up to 2 lines: 56) · prompt 24 · input 64 · gaps 6×10 · padding 16 ≈
  ~390–410. If the two-line derivation case pushes past ~410, reduce the
  picture cap to 110 before touching type sizes.

## Do NOT
No logic changes: `handleRetrySubmit`, the retry state machine, the comeback
slot, timings (400/900/focus), and R1 are untouched. No new dependencies. No
`Math.random()`. Tokens only. Don't touch `fractions-practice.jsx`.

## Verify (builder, static) / (main loop, preview)
Builder: `npm --prefix <worktree> run build` green; report each slot's final
font/size with file:line; report the computed budget arithmetic for 375×667
with a two-line derivation (e.g. `10 tens: 10, 20, … [100]`).
Main loop: measures card frame values equal the practice card's, input bottom
≤ ~410px at 375×667 for a two-line line, no inner scroll at 320×568, screenshots
in all three modes for Adam.

---

# Phase 1c — tall arrays: orientation rule + fold the line into the picture

Presentation + one small shared-component change. R1–R7, the Pedagogy
section and the phase 1b typography are unchanged. No logic changes to
`handleRetrySubmit`, the retry state machine, timings, or the comeback slot.

## Why
Adam on the 9s in the preview: "The array is small." The picture band is
height-capped by R2 (the keyboard), and a tall array spends that height on
one thin column of rows: 9 × 1 renders as nine rows of one dot inside a
~300×140 slot, and 9 × 9's natural height (~190px, with the 16px label rows)
is *larger* than the band, so it is scaled *down* to ~0.75×. Two levers,
both used here:

1. **Orientation rule** — draw the array along the axis we have room in.
2. **Fold the derivation line into the picture** for the long facts — the
   running totals already *are* the skip count, so the line is redundant and
   its ~50px goes back to the band.

Together: 9 × 1 … 9 × 5 become 1–5 rows tall and scale up to the 2.5× cap;
the square facts (6–9 × 6–9) go from ~0.75× to ~1.0–1.4×. Nothing in this
format can make 9 × 9 large — 81 dots in a 180px band is the ceiling — say
so in the report rather than fudging the budget.

## 1. Orientation rule (`DotArray`, `src/modules/multiply.jsx`)

Props stay `rows = a` (groups), `cols = b` (dots per group). Add the rule:

- `layout = cols < rows ? "columns" : "rows"` (ties → rows).
- **rows layout** (today's): `a` rows of `b` dots; running totals down the
  right edge (totals branch). Unchanged.
- **columns layout**: `a` columns side by side, each a vertical stack of `b`
  dots; running totals **under each column** (`(g + 1) × b`); the last total
  is the emphasised one (18px / 700 / ink), the others 12px `#888` as today.
  Picture height is now `min(a, b)` dots.

Meaning is preserved — still "a groups of b" — so the derivation line
("9 ones: 1, 2, …") and the columns picture agree; each column is one group.

Columns-layout details:
- Within a group the dot gap is the existing `gap`; **between groups use a
  wider gap (≈ 8–10px)** so the groups read as groups.
- Lay the columns on a uniform pitch wide enough for the widest
  *intermediate* label at 12px Space Mono (`String(a*b).length` ch); centre
  each column's dots and label in its cell. The emphasised final label may
  overflow its cell (`overflow: visible`); the container's 8px padding
  absorbs it. **Verify at 10 × 10 that nothing is clipped** by the
  container's `overflow: hidden`.
- `animate`: dots pop in group order (`g * cols + d`), each column's label
  fades up after its last dot — same delays scheme as the rows branch.
- **Totals mode uses a fixed `dotSize = 11`, `gap = 4`** regardless of count
  (the reveal's PictureSlot scales to fit; the dot-count heuristic exists
  for the 1× card, not for a scaled hero). Non-totals mode keeps the
  heuristic exactly as is.
- Apply the orientation rule to **both** branches (totals and non-totals) so
  the Pictorial card's scaffold and the reveal's picture are the same shape —
  Jack must not see a nine-tall column on the card and a nine-wide row a
  second later. Non-totals rows layout stays byte-identical; only the new
  columns branch is added. (Adam's call, made 2026-09-10: the card follows.)
- Pictorial caption under the card scaffold (`multiplication-practice.jsx`
  ~L1171, `"{a} rows × {b} columns"`): when layout is columns, read
  **`"{a} groups of {b}"`** instead. Rows layout caption unchanged.
- The Concrete-mode Equal-Groups Builder and Divide's BarModel are untouched.

## 2. Fold the line (the long facts)

Predicate: **`fold = operation !== "divide" && a >= 6`** — the same
predicate that already selects the taller band (`pictureMax`, ~L1234). It
tracks the *line* length (a steps → wraps to two lines at a ≥ 6), which is
what the fold is paying for; it is independent of the picture's orientation.

When `fold`:
- `line` slot is `null` in stages 0–2 and on `done`. The second-miss line
  ("Still tricky…", `retry.phase === "missed"`) still renders in the slot.
- The answer token moves onto the array's **final total**. New `DotArray`
  prop `finalToken: "numeral" | "blank" | "correct"` (default `"numeral"`,
  meaningful only with `totals`): `"blank"` renders the final total as the
  yellow blank chip (same width as the numeral — `${String(a*b).length}ch`
  at the 18px font — no layout shift), `"correct"` renders it green.
  Mapping from the practice screen: stage < 2 → `numeral`; stage ≥ 2 and
  phase `ask` → `blank`; phase `done` → `correct`; phase `missed` →
  `numeral`.
- Move `DerivationToken` from `multiplication-practice.jsx` to
  `src/shared/DerivationToken.jsx` and import it in both files, so the chip
  is one component in one place. Keep its API (`value`, `state`).
- Band: `pictureMax = "min(180px, 27dvh)"` for the fold case (was
  `min(140px, 22dvh)`). Non-fold facts keep the shell default (120 / 20dvh)
  and their derivation line exactly as today.
- Shell (`WrongAnswerReveal.jsx`): when `line` **and** `extra` are both null,
  don't render the line cell at all, so the prompt/input rows shift up and
  the empty auto track falls to the bottom of the grid (otherwise an empty
  row still costs a `rowGap`).
- Timings unchanged: picture (with totals, final total shown as the numeral —
  that *is* "the answer stated once") at 0 → nothing new at 400ms in the
  fold case → at ~900ms the final total blanks and the input goes live.

Budget, 375 × 667, fold case (compact shell): card top 16 · padding 16 ·
header 30 · problem 34 · gap 8 · picture ≤ 180 · gap 8 · prompt 24 · gap 8 ·
input 64 ≈ **388px** to the input's bottom edge (limit ~400–410). Report the
measured number.

## Do NOT
No changes to `handleRetrySubmit`, the retry/comeback state, timings,
mastery, stats, streak, or achievements (R1). No new dependencies, no
`Math.random()`, tokens only, black text on colour chips. Don't touch
`fractions-practice.jsx`, the Concrete builders, or `BarModel`.

## Verify (builder, static)
`npm --prefix <worktree> run build` green. Report: the layout chosen for
9×1, 9×5, 5×9, 8×9, 9×8, 9×9, 10×10; natural (unscaled) width × height of
the totals array for each; the resulting scale in a 300 × 180 slot; the
budget arithmetic above; confirmation the non-totals rows branch is
unchanged (diff shows only additions there). Builders don't commit.

## Verify (main loop, preview)
At 375 × 667 and 320 × 568: 9 × 1 (columns, one row, ≈2.5×), 9 × 9 (fold,
≥1.0×), 6 × 7 (rows layout, fold), 5 × 9 (rows, no fold, line present),
9 × 5 (columns, fold), 10 × 10 (no clipping). Re-ask blank sits on the
final total; correct → green on the final total → next; second miss →
numeral back + "Still tricky…" line + fill. Divide unchanged. Pictorial card
shows the same orientation as the reveal, caption reads "groups of" in the
columns case. R1 sanity via `localStorage.jackflash_data` unchanged from
phase 1.

---

# Phase 2 — Fractions

The same reveal, same shell, same rules (R1–R7), same timings (picture 0 →
line 400ms → re-ask ~900ms → focus ~1000ms), same header rotation, same
retry/comeback state machine as `multiplication-practice.jsx`. This section
is the fractions contract: per-skill lines and pictures (curriculum pass,
2026-09-11, decided), the re-ask per answerType, the pre-reveal leaks that
must be fixed in the same pass, and the architecture. Build it in two
parts, in order; each part builds green on its own.

## Governing rulings

- **One carrier per item.** The picture is countable (parts numbered); the
  derivation line holds the single `[token]`. Exactly one place states the
  answer. The phase-1c fold (no line, token on the picture) fires for **F2
  only** — the only fraction skill whose answer is a single count.
- **Fractions never appear inline** ("3/4") in child-facing text. The line
  is a segment array: `text` runs, `frac` slots (`<FractionDisplay
  size="small">`, inline-flex, `verticalAlign: middle`), and one `token`.
- **Denominators are ordinal words**, singular when the count is 1: half /
  halves, thirds, fourths (never "quarters"), fifths, sixths, sevenths,
  eighths, ninths, tenths, elevenths, twelfths.
- **Only `fractionInput` and `singleNumber` open a keyboard.** With
  `inputMode="numeric"` the iOS pad is ~216px and (as of 2026-09-11) has no
  accessory bar, so the usable height at 375×667 is ~450px — but the iOS
  number pad has **no Return key**, so a Check button is mandatory on the
  typed re-asks. Budgets:

| answerType | picture cap (`pictureMax`) | notes |
|---|---|---|
| `choice4`, `tapTwo`, `tapTwoOrEqual`, `orderThree`, `buildBar` | `min(220px, 34dvh)` | no keyboard; the shell must **not** autofocus anything; no Enter handling |
| `singleNumber` (E2) | `min(150px, 24dvh)` | as multiply: input 64 + full-width Check 48, input bottom ≤ ~400 |
| `fractionInput` (E3, A1–A4) | `min(120px, 19dvh)` | **input row = stacked fraction boxes + Check side by side** (row ≈ 96px, Check `minHeight 48`, `flex:1`); target: Check's bottom edge ≤ ~430 |

- The reveal's `problem` slot renders fractions at `size="normal"` (never
  `hero`) and the operator in the module colour, e.g. `[1/4] + [2/4]`,
  `Simplify [6/8]`, `[1/2] = [?/4]`, "What fraction is shaded?" for F1,
  "Which is greater?" for F3/F4/C1, "Order them" for C2, "Shade [3/4]" for F2.

## Per-skill contract

`[…]` is the token. `{frac n/d}` is a stacked slot in the line.

**Foundations**

| Skill | Line | Token | Picture (reveal) |
|---|---|---|---|
| F1 `choice4` | `4 equal parts in all, 3 shaded → [3/4]` | stacked n/d | the item's own `FractionBar` or `CircleFraction` (the question's visual, brought forward — `ScaffoldForItem` returns null for F1, so the reveal renders it itself) with `counts`: shaded parts numbered 1…n in ink on the fill, unshaded n+1…d in `#888` |
| F2 `buildBar` | **none — folded** | the picture's final shaded numeral (`finalToken`) | correctly-shaded `FractionBar` with `counts` and `finalToken` (numeral → blank at re-ask → green on correct → numeral on second miss) |
| F3 `tapTwo` | `More parts, smaller pieces → [1/3]` | stacked winner | `TwoStackedBars`, equal length, labels **stacked** (`FractionDisplay`), no counts |
| F4 `tapTwo` | `Same-size pieces — 5 is more than 3 → [5/8]` | stacked winner | `TwoStackedBars` with `counts` on both bars |

**Equivalent**

| Skill | Line | Token | Picture (reveal) |
|---|---|---|---|
| E1 `choice4` | `Cut every part into 2 → [2/4]` (2 = `item.mult`) | stacked target | `TwoStackedBars`: top = base; bottom = target with `groupEvery={mult}` (heavier divider every `mult` parts = the base's cuts) and `counts`; bottom **label suppressed** |
| E2 `singleNumber` | numerator blank: `2 parts became 8, so 1 shaded becomes [4]` · denominator blank: `1 shaded became 2, so 2 parts become [4]` | numeral | as E1 |
| E3 `fractionInput` | `Join the parts in 2s → [3/4]` (2 = `d / sd`) | stacked simplest form, **one chip covering both numbers** | `TwoStackedBars`: top = n/d with `counts` and `groupEvery={d/sd}`; bottom = sd parts with `counts`; bottom label suppressed |
| E4 `choice4` | `4 steps make 1 whole; the dot is on 3 → [3/4]` | stacked n/d | `NumberLineScaffold` with `showValue={false}` and new `stepLabels` (every tick numbered 0…d beneath the line; 0 and 1 keep their labels) |

**Compare & Order**

| Skill | Line | Token | Picture (reveal) |
|---|---|---|---|
| C1 `tapTwoOrEqual` | unequal: `Both in fourths: 2 vs 3 → [3/4]` · equal: `Both in fourths: 2 vs 2 → [the same]` | stacked winner, or a word chip `the same` | `TwoStackedBars`, the coarser bar with `groupEvery` at its own cuts and faint lcd sub-cuts (i.e. render it as lcd parts with `groupEvery = lcd / d_coarse`), `counts` on both in lcd units |
| C2 `orderThree` | `allUnit = fracs.every(f => f.n === 1)`. allUnit: `More parts, smaller pieces → smallest is [1/6]` · else: `All in eighths: 4, 6, 5 → smallest is [1/2]` (counts in **tile order**) | stacked smallest | **three** equal-length stacked bars in tile order, each labelled stacked; `counts` in lcd units on the non-unit branch only. Requires fixing B-1. Every shipped triple is `asc` — assert it, and if `direction === "desc"` ever appears use "greatest" wording |

**Add & Subtract** (all `fractionInput`, token = stacked answer, one chip)

| Skill | Line |
|---|---|
| A1 | `1 fourth and 2 fourths make [3/4]` · **override** when the entered denominator equals `a.d + b.d`: `Fourths plus fourths are still fourths → [3/4]` |
| A2 | ordinary: `5 sixths take away 3 leaves [2/6]` · `showAsWhole`: `1 whole is 8 eighths; take 3 → [5/8]` |
| A3 | `1 half is 2 fourths → 2 and 1 make [3/4]` · same override as A1 |
| A4 | `1 half is 2 fourths → 3 take 2 leaves [1/4]` (the renamed one is `b`, the coarse fraction) |

Picture for A1–A4: `AddBarsScaffold` **compact** (24px segments; three bars
must fit the 120px band): addend bars with `counts`; result bar shaded with
`counts` and **no `= n/d` caption**; A3/A4's coarse bar rendered in lcd
parts with `groupEvery` at its original cuts. Second addend line wraps to
two lines at 375 for the A2 whole case — allowed (≤ 2 lines).

## Re-ask and second miss, per answerType

Inside the reveal there is **no red and no shake** (R4): the wrong state is a
dim. The card's own first-answer feedback outside the reveal is untouched.

| answerType | blanked / disabled at re-ask | the child does | second-miss fill |
|---|---|---|---|
| `choice4` | line token; his wrong pick greyed `#EEE` @ 0.45 + disabled; **same four positions, no reshuffle** (reuse the `useShuffledChoices` value) | taps one of the other three | correct chip `COLORS.yellow` + ink border, all disabled, wrong stays grey |
| `tapTwo` / `tapTwoOrEqual` | line token only — **both cards (and "They're equal") stay live and undimmed** (with two options, dimming the wrong one leaves nothing to read) | re-taps; prompt is specialised: **"Look at the bars. Tap the longer one."** (C1 equal items: "Look at the bars. Tap your answer.") | correct option yellow, others 0.45, all disabled |
| `orderThree` | line token; tiles reset to white, un-numbered, same positions, all live | **one tap**; prompt **"Tap the smallest."** (`desc` → "Tap the greatest."); a correct first tap ends the re-ask | smallest tile yellow with a "1" badge, others 0.45, all disabled |
| `fractionInput` | line token (one chip over both numbers); **both boxes emptied**, numerator focused after the delay | types both numbers, Check; `evaluateAnswer` unchanged (canonical, `altAnswer`, or any equivalent) | both boxes filled with the **canonical** `correctAnswer` (never `altAnswer`) on yellow, disabled |
| `singleNumber` | line token; box emptied and focused | types the number, Check | box filled on yellow, disabled |
| `buildBar` (concrete) | picture's `finalToken` → blank chip; the **input bar resets to 0 shaded**, live | counts the shaded parts in the picture, re-shades, Check | input bar auto-shades to n (existing 40ms stagger), yellow frame, disabled; picture numeral returns |
| `buildBar` (pictorial/abstract) | picture's `finalToken` → blank; the wrong number button greyed + disabled, no reshuffle | taps one of the rest | correct button yellow, all disabled |

Prompt everywhere else: "Now you — use the picture." Second-miss line
unchanged: "Still tricky. Here it is — we'll come back to it." (for F2 the
line slot appears for this message only, as in phase 1c).

## Part 1 — shared components and the pre-reveal leaks (build first)

All new props are **opt-in, default off**; with defaults the rendered markup
of every shipped scaffold is unchanged (the `DotArray totals` precedent).

1. **`FractionBar`** (`src/shared/barComponents.jsx`): add `counts`
   (numbers each segment: 1…n ink `COLORS.black` 700 on shaded, n+1…d `#888`
   400 on unshaded; Space Mono; `fontSize` 12 at 36px segments, 11 at
   compact 24px; centred), `groupEvery` (integer k: the left edge of every
   k-th segment gets a 3px ink divider so groups read as the original cuts;
   segment borders stay 2px), and `finalToken` (`"numeral"|"blank"|"correct"`,
   only with `counts`: the last **shaded** segment's number is rendered
   through `DerivationToken`). The bar's `label` prop may now also be a React
   node (a `<FractionDisplay>`), not just a string.
2. **`CircleFraction`** (`fractions-practice.jsx`): add `counts` (slice
   numbers at the slice centroid, same colours as the bar).
3. **`TwoStackedBars`**: `top`/`bottom` accept `label` as a node, and pass
   through `counts`, `groupEvery`, `finalToken`. Add optional `third` (a
   third bar, for C2), rendered under the same 8px gap.
4. **`NumberLineScaffold`** (`src/modules/fractions.jsx`): add `stepLabels`
   (every tick i=0…d labelled beneath the line in Space Mono 11 `#888`; the
   existing 0 and 1 labels stay in ink). `showValue` unchanged.
5. **`AddBarsScaffold`**: add `compact` (24px segments), `counts`
   (addends + result), `resultLabel` (`"value"` today's `= n/d` — but
   rendered stacked via `FractionDisplay`, not a string — | `"question"` →
   an empty outline result bar with a "?" label | `"none"`), `groupEvery`
   for the renamed coarse bar (render it in lcd parts with the heavier
   divider at its original cuts). Default `resultLabel="value"`.
6. **`DerivationToken`** (`src/shared/DerivationToken.jsx`): accept
   `children` (a stacked `FractionDisplay` or a word) as the token content.
   Blank-chip width rule: when `state === "blank"` render the real content
   inside the chip with `visibility: hidden` so the chip's width and height
   are exact and nothing shifts (the `ch` trick only works for numerals —
   keep it for the numeral-only case). Keep the 1.25em floor.
7. **New `src/shared/DerivationLine.jsx`**: renders a segment array
   `[{t:"text", v}, {t:"frac", n, d}, {t:"token", state, children | value}]`
   in the phase-1b line style (Space Mono 700, `clamp(16px, 4.8vw, 19px)`,
   `lineHeight 1.45`, centred, ≤ 2 lines). Frac slots are `size="small"`.
8. **Pre-reveal leaks — fix now** (memory: scaffolds must not pre-reveal):
   - `ScaffoldForItem` A1–A4: pass `resultLabel="question"` (empty outline
     + "?") when `!feedback`; `"none"` inside the reveal (the reveal draws
     the shaded result with counts). The `= n/d` caption never appears
     pre-answer again.
   - `ScaffoldForItem` E2/E3: the bottom bar keeps its shaded length (the
     concept) but its label is dropped pre-answer (it printed the missing
     number / the simplified answer).
   - `ScaffoldForItem` C2 (B-1): draw **all three** bars (`third`), in tile
     order — today the third fraction is never drawn.
   - E4's `NumberLineScaffold` in `QuestionDisplay`: `showValue` stays off
     during the reveal (the reveal owns the answer); keep it off entirely
     — the reveal shows the token, and the inline `{n}/{d}` text violated
     the stacked rule anyway.
   - Every bar label in `ScaffoldForItem` and `AddBarsScaffold` that is an
     inline `"n/d"` string becomes a `<FractionDisplay size="small">` node.
9. **`WrongAnswerReveal`** (`src/shared/WrongAnswerReveal.jsx`): add
   `fit="scale"|"width"` on the picture slot (default `"scale"`, multiply's
   behaviour). `"width"`: the inner box is `width: 100%` (bars are
   width-driven — as an inline block they'd collapse), no upscale; if the
   natural height exceeds the cap, scale down by height only. Add
   `autoFocus` (default `true`); when `false` the focus poll doesn't run and
   Enter is not intercepted (tap-only re-asks). Everything else unchanged.

## Part 2 — the practice screen (`src/fractions-practice.jsx`)

Mirror multiply's integration exactly: `retry { phase: idle|ask|done|missed,
value }` (value is `{ n, d }` for `fractionInput`, a string for
`singleNumber`, a count for concrete `buildBar`, the picked value for taps),
`missCount`, `revealStage` (0/1/2 timers keyed on `retry.phase === "ask"`),
`comebackQueueRef` (offset `3 + hashString(itemKey) % 3`; queued keys
excluded from the weighted pool; drop a pending comeback if `focusSkill` or
`activeGroups` changes; a served comeback bypasses `shouldAllowSkill` — it
was already served once).

- `handleAnswer` incorrect branch: keep everything it does today (that is
  the one logged record) and add `setRetry({ phase: "ask", value: <empty> })`,
  `setMissCount(n => n + 1)`, `setOrderSubmitted(false)` / `setPickedChoice(null)`
  are **not** reset (the card keeps its first-answer state; the reveal keeps
  its own picked state).
- `handleRetrySubmit` — with the **R1 paragraph as a comment above it** —
  evaluates via the same `evaluateAnswer(currentItem, payload)`; correct →
  `done`, green beat, `setTimeout(pickNewItem, 900)`; wrong → `missed`,
  fill per the table, `setTimeout(pickNewItem, 2500)`, Enter/Tap advances
  immediately, queue the comeback. **Nothing in it calls `updateMastery`,
  `recordAnswerInSession`, `checkAfterAnswer`, the streak-milestone block,
  `updateStreak`, or touches `sessionStats` / `streak`.**
- `handleKeyDown`: remove the `feedback === "incorrect"` → `pickNewItem`
  branch; the reveal owns Enter while open.
- Remove from the card: the "It's [answer]" feedback line for the incorrect
  case, `WrongAnswerHelpers` (delete the component: the `because` texts,
  `FractionFamilyStrip` hint and `FractionPartWholeBond` bond leave the
  wrong-answer path entirely — the strip and bond components stay for the
  "Show me" path, unchanged), and the "Next →" button for `feedback ===
  "incorrect"` (the orderThree "Next →" for a submitted-but-unanswered
  state goes too: a submitted order is either correct or opens the reveal).
- `<WrongAnswerReveal open={feedback === "incorrect"} pictureMax={…by
  answerType} fit="width" autoFocus={typed} focusDelayMs={1000} …>` with
  the slots per the contract; `line` built by a `buildFractionLine(item,
  tokenState, retryValue)` that returns a segment array (the A1/A3
  denominator override reads the **first-submit** `userDen`). `picture`
  mounts with `animate={mode === "abstract"}`.
- Re-ask components: give `Choice4Grid`, `TapTwoCards`, `OrderThreeTiles`
  and the non-concrete buildBar buttons an opt-in `reveal` prop
  `{ wrong: value|null, fill: value|null, singleTap?: boolean }`: `wrong`
  → that option grey `#EEE` @0.45 + disabled; `fill` → that option yellow +
  ink border, all disabled, others 0.45; no red, no shake, `animation:
  "none"`; `singleTap` (orderThree) → one tap submits. With the prop
  absent the components are byte-identical. Typed re-asks reuse
  `FractionInputFields` (boxes at `fontSize 32`, width 90, so the row is
  ≈ 96px) and the multiply retry input style for `singleNumber`.
- Coerce `item.correctAnswer` to a string before any `.split("/")` —
  `buildBar` stores a number (a shipped crash).
- The correct-feedback strings: replace `Math.random()` in render with
  `sessionStats.total % 5` (as multiply did).

## Do NOT
No changes to `evaluateAnswer`, `pickNewItem`'s weights, mastery, stats,
streaks, achievements, `multiplication-practice.jsx`, `DotArray`. No
dependencies, no `Math.random()` in render, tokens only, black text on
colour chips, touch targets ≥ 44px, number inputs `WebkitAppearance:
"none"` + `inputMode="numeric"`. Builders don't commit.

## Verify
Builder (static, each part): `npm --prefix <worktree> run build` green; Part 1
reports that with default props the shipped scaffolds' JSX is unchanged
(diff shows additions only inside the new-prop branches) and lists every
pre-reveal leak fixed with file:line; Part 2 reports the R2 arithmetic for
E3 (fractionInput) and E2 (singleNumber) at 375×667 and confirms the R1
list above by grep of `handleRetrySubmit`.
Main loop (preview): every answerType in every CPA mode with a wrong first
answer (7 × 3), plus second-miss for each answerType, at 375×667 and
320×568; no inner scroll; `localStorage.jackflash_data` unchanged by any
re-answer; Progress grid unchanged; pre-answer cards no longer show the
result (A group), the missing number (E2) or the simplified form (E3);
C2 shows three bars; Multiply regression: one wrong answer, reveal works.

## As built (2026-09-11, play-tested at 375×667 and 320×568)
- `fractionInput` re-ask: boxes at 28px Shrikhand, `dense` (no padding) so
  the row is ~68px; Check beside them. Measured denominator-box bottom edge:
  A4 420px, E3 377px at 375×667.
- `singleNumber` re-ask: input and Check share one row (Check bottom 397px).
- Tap prompts shortened to one line at 320px: "Tap the longer bar." /
  "Tap your answer." / "Tap the smallest.". Inside the reveal the two-card
  re-ask is compact (64px cards, `large` fractions) so C1 fits 320×568.
- Second-miss fill colour is passed as `reveal.fillColor` (green for a
  correct re-answer's beat, yellow for the fill) — additive to the
  `{ wrong, fill, singleTap }` contract.
- `orderThree` re-ask compares the single tap to `item.order[0]` directly
  (`evaluateAnswer` expects a 3-array and is unchanged).
- `OrderThreeTiles` is keyed by `itemKey` in the card and the reveal: its
  local tap state used to survive an item change, which froze the next
  consecutive C2 item (pre-existing bug).
- F2's final count on the bar is emphasised (18px / 700) like the dot
  array's final total, so the blank chip is a real target.
- Pre-answer leaks fixed in `ScaffoldForItem`: A-group result bar is an
  empty outline with "?", E1/E2/E3 bottom-bar labels dropped, C2 draws all
  three bars, E4 never prints the marked value.
- `modules/fractions.jsx` carries its own `FractionBar`/`TwoStackedBars`
  (the practice screen imports from there, not from `shared/barComponents`);
  the new props exist on both copies. Folding the two into one is a cleanup
  for later.

# Show me pulse (built 2026-09-11)

In Abstract mode, after **two consecutive unassisted misses**, the pre-answer
"Show me" button pulses (scale 1 → 1.06 → 1, 1.4s, ease-in-out, infinite) on
every following item until an unassisted correct answer resets the run. It is
an invitation to look at the picture before answering, not a penalty: the
picture is never forced, the button's tap and press behaviour are unchanged,
and nothing about logging changes.

- State: `missRun` in both practice screens, beside `missCount`. `+1` in
  `handleSubmit`'s incorrect branch, `0` in its correct branch. The reveal's
  re-answer (`handleRetrySubmit`) never touches it (R1 — a scaffolded
  re-answer is neither a miss nor a recovery).
- Trigger: `mode === "abstract" && missRun >= 2`, on the same `!feedback`
  condition the button already has. Pictorial's finish-line "Show me" (the
  `userHidScaffold` on-ramp) does not pulse.
- Mechanics: the animation is on a wrapping `<span class="showMePulse">`
  (inline-block), not on the button, so the button's own pressed transform
  is unaffected. `@media (prefers-reduced-motion: reduce)` disables it.
- Tapping "Show me" does not reset the run; the next unassisted correct does.
