# Add & Subtract — column card declutter (UI spec, 2026-11-04)

Source: Adam's annotated screenshot of the Concrete column-adding card
(403 + 251). Two notes: (1) the stacked top cluster — mastery dots, the skill
pill "Add to 1,000", the restated problem "403 + 251" and "Start with the
ones." — is "small and confusing… maybe delete all of it"; (2) the "Start
over" link between the disc chart and the column grid is "awkward
placement".

Scope: `src/add-practice.jsx` and the opt-in props it needs in
`src/shared/ColumnMethod.jsx`. **Column items only** (`answerType ===
"column"`, groups `colAdd` / `colSub`) unless a bullet says otherwise. Mental
(`mental`), word problems (`words`) and facts (`singleNumber`) keep their
current card except bullet A1. Do not touch any other module.

## A. Card top — one quiet row, then straight to the math

1. **Mastery dots move to the card's top-right corner** (all Add items, for
   consistency within the module): small, absolutely positioned inside the
   card padding (`top: 12, right: 12`), same `MasteryDots` component and
   level, `aria-label="Mastery: N of 3"`. They no longer take a centered row.
2. **No skill pill on column items.** The header pill already names the
   group ("COLUMN ADDING"); the item-level label ("Add to 1,000") is noise on
   this card. Mental / words / facts keep their pill.
3. **No restated problem line on column items** (`QuestionDisplay` returns
   null for `answerType === "column"`). The grid already shows both operands
   in place-value columns. Consequence (accepted): 4-digit operands no longer
   appear with a thousands comma anywhere on the card — the grid never had
   commas (spec §5.1). Note this in `docs/add-spec.md` §5.1.
4. **"Start with the ones." is replaced by a live column cue in the grid**
   (bullet C). No prompt text above the chart.
5. The focus chip ("Only this skill · ✕ practise everything") stays exactly
   as it is when a skill is focused — it is the only way out of the focus.
6. `questionRef` / `getClampEl` (the sticky-pad scroll clamp) must still get
   a valid element when the question line is gone: fall back to the chart
   wrapper, or the grid, so the alignGrid logic keeps the answer row above
   the pad. Verify the answer row is not under the pad at 393×759 and
   375×667.

## B. Start over moves into the keypad

1. Remove the "Start over" link under the disc chart (column items).
2. `ColumnPad` gets opt-in props `onStartOver` and `startOverEnabled`
   (default: not shown — the reveal's compact re-ask pad and any other
   caller render byte-identically). When `onStartOver` is given, the bottom
   row becomes **[⌫ span 1] [Start over span 2] [Check span 2]** in the
   existing 5-column grid. Same `KEY_STYLE`, same press behaviour, ≥44px
   tall, Space Mono 700 ~12–13px label "Start over" (never wraps at 320px —
   check). Disabled look when `!startOverEnabled` (same treatment as a
   disabled Check: opacity 0.45, default cursor) and it does nothing.
3. `ColumnAnswerInput` passes the props through; only the practice card's
   instance (sticky, live) passes `onStartOver`.
4. Start over is available in **every CPA mode** on column items now (it
   clears what the child has done to this problem: typed digits, the chart's
   disc moves in Concrete, the top-row marks in Pictorial/Abstract). Enabled
   when `chartMoved || answerTyped || marksPresent(cardMarks)`. The existing
   `handleStartOver` already resets chart, marks and digits (remount via
   `retryResetKey`).
5. Mental math's own "Start over" under the number line is unchanged.

## C. Live column cue in the grid (replaces "Start with the ones.")

`ColumnGrid` already receives `active` (the cursor's column index). Add an
opt-in prop `cueActiveHead` (default false — reveal grids unchanged): the
place heading over the active column (Th / H / T / O) is drawn as a small
yellow chip (`COLORS.yellow`, `BRUTAL_BORDER_SM`, black Space Mono 700),
other headings unchanged. It follows the cursor right-to-left as the child
types, so on a fresh item the **O** is lit — "start with the ones" without a
sentence. No chip when `active` is null (after Check / not live).

## Must not change

- Scoring, mastery, reveal (R1–R7, C1), "not sure" conversion, regroup
  marks, the chart, the pad's digit/⌫/Check behaviour, hardware keys.
- The sticky-pad contract (pad is the card's last child).
- Any other module's markup. Design tokens only; black text on chips;
  touch targets ≥44px.

## QA (main loop, in the preview)

Concrete / Pictorial / Abstract × one column add and one column subtract,
with a wrong answer each; Start over enabled/disabled states; 393×759 and
320×568 (no wrap, no overflow, answer row clear of the pad); mental and a
word problem still show their pill and question; reveal re-ask pad has no
Start over.

## As built (2026-11-04)

Built by module-builder, reviewed by ui, play-tested in the main loop.
Follow-ups applied after review: the focus chip on column items starts 16px
lower so it clears the corner dots (they overlapped); the lit heading chip
fits its 14px slot (9px line + 2.5px borders) so it can't touch a regroup
mark; Start over is cream (secondary) beside the yellow Check, never wraps;
Enter on a focused Start over no longer submits; the dots carry
`role="img"`. Verified: Concrete add (cue O→T after a digit, Start over
enables and clears back to O, wrong answer → reveal pad has no Start over
or cue → right answer), Abstract subtract with focus (no overlap, wrong →
reveal → right), Pictorial 4-digit subtract at 320×568 (grid scrolls up
after the first digit, no wrap, no overflow), mental keeps its pill and
question; no console errors.

