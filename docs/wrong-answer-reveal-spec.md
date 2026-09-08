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
Fact-family chip in "Show me"; Abstract-mode "Show me" pulse after two misses;
parent-facing assisted counters; end-of-session "with the picture" line.

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
