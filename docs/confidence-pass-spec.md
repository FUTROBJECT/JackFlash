# Confidence pass — build spec (2026-09-14)

Applies to the two shipped practice screens (`src/multiplication-practice.jsx`,
`src/fractions-practice.jsx`), the shared reveal composition, `dataManager.js`
(one additive session field), `achievementEngine.js`, `ParentZone.jsx`,
`ProfilePicker.jsx`, `App.jsx` (end-of-session line only), `constants.js`.

## Why

Jack (8) has been seen typing a deliberately wrong answer to get past a hard
fact (6 × 9). In the current app that is the rational move: the reveal shows
the answer for ~0.5s, then asks him to type it back, so a wrong answer is the
cheapest way to see the answer. At the same time the app's rewards are about
speed and unbroken streaks (Speed Demon, streak praise, streak reset on any
miss) and the header greets him with "0/189 mastered". *Counted Out* argues
math identity is made, not born; the app's wrong-answer path already lives that
idea, and this pass makes the incentives match it. Four parts, all shipped
together.

## Rules

**C1 — On a first miss the answer is never on screen.** Nothing in the reveal
(picture, derivation line, the divide `extra` chip, the fractions line) shows
the correct answer while `retry.phase === "ask"`. The answer's slot is the
blank token from the moment the line/picture appears. It fills only on the
second miss (`"missed"`) or turns green on a correct re-answer (`"done"`).
There is no stage that shows the numeral first. Givens (the two operands, the
part counts, running totals *before* the final one) stay visible — counting
and adding on from them is the work.

**C2 — "Not sure" is cheaper than guessing.** Two paths, same result:
(a) tap "Show me" — available pre-answer in Abstract (as now) AND in Pictorial
whenever the scaffold is not at full opacity or is tapped-hidden; never in
Concrete (the builder is the picture). (b) A wrong answer submitted faster
than `GUESS_MS` (1500 ms from the item becoming answerable) is treated as
"not sure", not as a miss: **nothing is logged** (no `updateMastery`, no
`recordAnswerInSession`, no `sessionStats`, no streak change, no
achievements, no `missCount`/`missRun`), the scaffold shows at full opacity
(`setShowScaffold(true)`), the input clears, and a one-line nudge appears
under the problem: **"Not sure? Count the picture."** The nudge stays until the
next submit or the next item. Conversion happens **at most once per item**: if
the picture is already up (`pictureRequested`), a wrong answer is a real miss
and opens the reveal as today. `responseMs === undefined` never converts.

**C3 — Rewards are for sticking with it, not for speed.** Speed Demon is
retired (trigger `speedRun` deleted). New shared achievement `comeback-kid`
("Comeback Kid — came back to 5 missed facts and got them right", trigger
`comebacks`, params `{ count: 5 }`): in one session, a fact that was logged as
a miss earlier and is later answered correctly **unassisted** (a normal
submit, not the reveal's re-answer) counts once. The in-session streak no
longer resets on a first miss: it is unchanged by a miss that Jack then
recovers with the picture, and resets to 0 on a second miss. A converted
"not sure" attempt doesn't touch it. Milestones still fire only on unassisted
corrects. The correct-answer praise line is a flat rotation — the two
streak-escalation strings ("🔥 STREAK! KEEP GOING!", "OUTSTANDING! ⚡") are
gone. Daily (practice-day) streaks are unchanged — showing up is still
rewarded.

**C4 — Progress is framed against something reachable.** The header's
MASTERED pill shows the current item's group, not the whole module:
`mastered/total` for that group with the group label under it (Multiply:
the table group containing the current fact, e.g. `⭐ 8/30` / `2S, 5S & 10S`;
Fractions: the current item's group, e.g. `⭐ 3/25` / `FOUNDATIONS`). No
current item → fall back to today's totals.

**R1 (docs/wrong-answer-reveal-spec.md) is amended, not broken.** The first
submit is still the only logged record and the re-answer is still never
logged. The only change to R1 is its streak clause: see C3.

## Part 1 — First miss never shows the answer

`multiplication-practice.jsx`
- `revealFinalToken`: for **every** fact (fold or not), `"correct"` when
  `done`, `"numeral"` when `missed`, otherwise `"blank"`. (Today the non-fold
  case is hard-coded `"numeral"` — the picture's last running total showed the
  answer throughout the re-ask. That is the 2 × 2 leak.)
- Derivation line token state: `done → "correct"`, `missed → "numeral"`,
  else `"blank"` (no `revealStage >= 2 ? "blank" : "numeral"`). Stage timers
  stay (stage 1 = line appears, stage 2 = input enabled).
- Divide `extra` chip `b × answer = a`: render `answer` through
  `<DerivationToken value={answer} state={…}>` with the same state rule. The
  chip may keep appearing at stage ≥ 1.
- `DotArray` and the shared components are unchanged — they already take
  `finalToken`.

`fractions-practice.jsx`
- `tokenState` (the reveal composition, ~L2331): same rule — `"numeral"` only
  when `missed`.
- Audit every skill's derivation-line builder for a second leak: during
  `ask`, no number that *is* the answer may appear outside the token (e.g. a
  line that restates "= 6/8" beside a blank token, or the E-group's target
  fraction when the target is the answer). Givens and intermediate counts stay.
  Report each line checked in the build report.
- Second-miss fill unchanged.

## Part 2 — "Not sure"

`constants.js`: `export const GUESS_MS = 1500;` with a comment.

Both practice screens:
- State: `pictureRequested` (bool, reset on every new item) and `nudge`
  (`null | "notSure"`, reset on new item and on any submit).
- "Show me" tap → `setShowScaffold(true)`, `setPictureRequested(true)`.
  Pictorial: show the button pre-answer whenever
  `!showScaffold && (userHidScaffold || scaffoldOpacity < 1)`; tapping it sets
  `showScaffold` (full opacity) rather than only un-hiding. Existing
  finish-line on-ramp behaviour (`userHidScaffold`) still works through it.
  Abstract unchanged. Concrete: no button.
- `handleSubmit`, first thing after computing `isCorrect`:
  ```
  const responseMs = factShownAtRef.current ? Date.now() - factShownAtRef.current : undefined;
  if (!isCorrect && !pictureRequested && responseMs !== undefined && responseMs < GUESS_MS) {
    setShowScaffold(true); setPictureRequested(true); setNudge("notSure");
    setUserAnswer(""); /* fractions: clear the tap/selection state for the item's answerType */
    return;   // nothing logged — see C2
  }
  ```
  Fractions already tracks `factShownAtRef` at item show; Multiply sets it on
  input focus — also set it when the item is shown so a tap-only path has a
  value.
- Nudge render: under the problem, above the scaffold: "Not sure? Count the
  picture." — Space Grotesk 700, `clamp(14px, 4vw, 16px)`, `COLORS.black`, on
  a cream chip (`COLORS.cream`, `BRUTAL_BORDER_SM`, radius 8, padding
  `6px 12px`). No emoji, no exclamation mark.
- A later **correct** submit with `pictureRequested` → also call
  `recordPeekInSession(profileId, moduleId)` (below). Scoring of that answer
  is unchanged (it is scaffolded; mastery gates already handle that).
- A later **wrong** submit with `pictureRequested` → normal miss path.

`dataManager.js`
- Live session gains `peeked: 0`; `recordPeekInSession(profileId, moduleId)`
  mirrors `recordAssistedInSession` (bumps `peeked` on the matching live
  session; touches nothing else). `_finalizeLiveSessionOn` copies
  `peeked: live.peeked || 0`.

`ParentZone.jsx` — Helped column value = `assisted + peeked` (either may be
missing on old rows → still "–" only when *both* are undefined). Caption
becomes: "Helped = got it with the picture, after a miss or after asking for
it. Understanding, not fluency — never counted in the score or toward
mastery."

`App.jsx` / `ProfilePicker.jsx` — `lastSession` gains `peeked`; the line is
`{total} tried · {correct − peeked} on your own · {assisted + peeked} with
the picture`, zero parts dropped as now.

## Part 3 — Rewards

`achievementEngine.js`
- Delete `speed-demon` and the `speedRun` case. Add
  `{ id: "comeback-kid", name: "Comeback Kid", description: "Came back to 5
  missed facts and got them right", trigger: "comebacks", params: { count: 5 } }`
  → `case "comebacks": return values.comebacks >= params.count;`.
  `checkAfterAnswer` accepts `comebacks` (default 0). Update
  `MODULE_ACHIEVEMENT_ICONS` / any icon map keyed by `speed-demon`.
- Profiles that already unlocked `speed-demon` keep the stored id; it simply
  no longer renders. Verify the achievements grid tolerates an unknown stored
  id (skip, don't crash).

Both practice screens:
- `missedKeysRef` (Set, session-scoped, cleared on mount): add the item key
  when a miss is logged. On a logged **correct** submit whose key is in the
  set: delete it, `comebacksRef.current += 1`, pass `comebacks:
  comebacksRef.current` to `checkAfterAnswer`.
- Streak: in `handleSubmit`'s incorrect branch **remove** `setStreak(0)`. In
  the reveal's second-miss branch (`handleRetrySubmit` / `finishRetry`,
  `phase: "missed"`) add `setStreak(0)`. The reveal's correct re-answer leaves
  `streak` untouched (still not incremented). `newStreak` for achievements on
  a miss = current `streak` (unchanged), not 0.
- Praise: `["NICE!", "GOT IT!", "YES!", "CORRECT!", "BOOM!"][sessionStats.total % 5]`
  only.

## Part 4 — Header

`multiplication-practice.jsx` — MASTERED pill: find the group in `mod.groups`
whose `tables` include the current fact's table (multiply: `a`; divide: `b`,
falling back to `answer`), restricted to the deduped facts of that group's
tables; value `masteredInGroup/groupTotal`, label = the group's `label`
(uppercased by the pill's existing style; e.g. "2S, 5S & 10S"). No
`currentFact` → today's totals with "MASTERED".

`fractions-practice.jsx` — same over `FRACTION_POOL.filter(i => i.group ===
currentItem.group)` (accessible items only, as now); label = the group's
label from `fractionsModule.groups`.

Pill width may grow; it must still fit three pills across at 320px (shrink the
label to 9px and letter-spacing 0.5px if needed; never wrap the number).

## Do NOT

No dependencies, TypeScript, CSS frameworks, test frameworks. Tokens only from
`constants.js`; black text on colour chips; touch targets ≥ 44px. No
`Math.random()` in render. Don't restyle anything this spec doesn't name.
Don't change item pools, itemKeys, mastery maths, or `purchaseManager.js`.
Builders don't commit — the main loop commits after play-testing.

## Verify (builder, static)

`npm run build` green. Report: the token-state rule at each site (multiply
line, multiply picture, divide chip, fractions line, fractions picture); the
list of fractions derivation lines audited for C1 with the verdict per skill;
grep of `speedRun`/`speed-demon` = 0 hits; grep of `setStreak(0)` shows it only
in the second-miss branches; `GUESS_MS` referenced from both screens.

## Verify (main loop, preview at 375×667 and 320×568)

Multiply, each mode: (1) wrong answer after > 1.5 s → reveal with **no
answer anywhere** during the re-ask (line blank, picture's last total blank,
divide chip's quotient blank), correct re-answer → green, streak pill
unchanged; (2) wrong answer in < 1.5 s → no reveal, picture up, "Not sure?
Count the picture.", nothing logged (session pill unchanged, mastery
unchanged), then a correct answer → logged, `peeked` +1; a second fast wrong
answer with the picture up → real miss; (3) second miss → answer fills,
streak resets to 0; (4) a fact missed then later answered right unassisted →
`comebacks` +1 (5 of them → Comeback Kid). Fractions: one item of every
answerType, same checks (tap-based: a wrong tap in < 1.5 s converts). Header
shows the group count and label in both modules and fits at 320. Parent Zone
Helped includes peeks; end-of-session line arithmetic matches. Achievements
grid renders for a profile with a stored `speed-demon` id.

## As built (2026-09-14, play-tested at 375×667 and 320×568)

- **Division picture leak found and fixed in the main loop.** `BarModel`'s
  caption under the bar says "N groups" — N is the quotient. It now takes
  `countToken` (`"blank" | "numeral" | "correct"`) and renders the count
  through `DerivationToken`; the reveal passes the shared `tokenState`, and
  the pre-answer Pictorial card passes `"blank"` until a correct answer. The
  bar still draws one segment per group — counting them is the work.
- One `tokenState` per reveal (`done → correct`, `missed → numeral`, else
  `blank`) drives the multiply line, the array's final total (fold and
  non-fold), the divide chip, the fractions line and F2's bar token. Verified
  on 2 × 2 (array total and line blank, 4 nowhere), 2 ÷ 2 and 5 ÷ 1 (chip
  `1 × ▢ = 5`, caption `▢ groups`), F1 (line "4 equal parts in all, 2 shaded
  → ▢").
- E4's derivation line restated the target fraction beside the token; it now
  reads "{d} steps make 1 whole — count to the dot → [token]".
- Fractions' converted "not sure" remounts `BuildBarInput` / the card's
  `OrderThreeTiles` via a `retryResetKey` (their tap state is local), since
  the item doesn't change.
- Verified: fast wrong answer (< 1.5 s from the item appearing) → nudge, no
  reveal, nothing logged, input cleared; a correct answer with the picture up
  → `peeked` +1 and scored normally (Multiply 2 × 10, Fractions F1). "Show
  me" in Abstract → `peeked` +1 on the correct answer. Slow miss → reveal,
  streak unchanged after a picture recovery (stayed 1, then 2); second miss →
  fill and streak 0. Praise is the flat rotation. Header: `0/81 · 2S, 5S &
  10S` (mixed), `0/51` under a divide lock, `0/82 · FOUNDATIONS`; no
  horizontal overflow at 320. Parent Zone Helped = assisted + peeked, new
  caption. End-of-session line: "6 tried · 4 on your own · 2 with the
  picture" for 6 total / 5 correct / 1 assisted / 1 peeked.
- Known, pre-existing: with Fractions active the Parent Zone's Lock
  Operation dropdown shows blank (Fractions has no operations; a stored
  Multiply lock has no matching option). Cosmetic; not changed here.

