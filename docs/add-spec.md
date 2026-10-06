# JackFlash Module Specification: **Add & Subtract** (Grade 3 / Primary 3)

**Author:** Curriculum agent · **Date:** 2026-10-05 · **Status:** Draft for Adam's review. It replaces the 2026-06-20 draft. The build can start on the defaults in §16.
**Audience:** A React developer with no pedagogy background. Every behaviour is spelled out.
**Template:** `docs/place-value-spec.md`, followed section by section, including its "As built" conventions.
**Binding companions (reuse as-is, do not reinvent):** `docs/wrong-answer-reveal-spec.md` (R1–R7 + Phase 2), `docs/confidence-pass-spec.md` (C1–C4), `docs/mastery-fluency-spec.md`, `docs/fact-selection-policy.md` (multiply-only selector; read for context, do not port).

> **Main-loop verification (2026-10-06):** every column item in §6.1 (112 items) was checked by script: arithmetic, key uniqueness, and the exact regroup places against each item's tag. All pass. The §7 worked bug outputs (367 + 256 → 513, 503 − 178 → 475, 72 − 38 → 46) also check. F1 = 20 and F2 = 36 confirmed by enumeration; M1/M2/M3 crossing claims checked by hand.

> **The wrong-answer block in `fractions-spec.md` §6 and in the old add draft §8 is dead**: scaffold + because + hint + bond + "Next →". This spec writes only to the full-screen reveal: **picture + ONE derivation line whose answer is a blank token + the same item re-asked**.

---

## Scope verification notes (READ FIRST)

I checked this against the MOE 2021 Primary Mathematics Syllabus (P1–P6), which think! Mathematics implements, and against P2/P3 school curriculum briefings. I also cross-checked it against the Grade 3A tables of contents of two sibling Singapore series. **I could not find the think! Mathematics 3A table of contents online.** The chapter mapping below therefore rests on the MOE P3 outcomes and on the 3A sequence that the sibling series share. Adam should check it against Jack's book (Open decision D9). The default is to proceed.

1. **Confirmed P3 core: addition and subtraction algorithms up to 4 digits** (numbers within 10,000), with and without regrouping. P2 caps algorithms at 3 digits. Sibling 3A books open this chapter with "Addition and Subtraction within 1,000" before moving to "within 10,000". That is why the 3-digit items here are **in-chapter warm-up, not off-level review**.
2. **Confirmed P3 core: regrouping in every place.** That covers ones→tens, tens→hundreds and hundreds→thousands, more than one regroup in a single sum, and the carry rippling through 9s (2,995 + 1,007). For subtraction it also covers **regrouping across zeros** (5,003 − 1,478 and 3,000 − 2,264), the chapter's hardest and most practised pattern. The Place Value spec (§Scope 7) explicitly handed "renaming for computation" (1 thousand = 10 hundreds) to this module. Here it is taught through the trade action and the S3 reveal lines, not as separate item types (one skill, one mastery unit).
3. **Confirmed P3 core, with a narrower range than the old draft: mental calculation of two 2-digit numbers.** That is the P3 outcome. Mental work on "a 3-digit number ± ones/tens/hundreds" is P2. **4-digit mental arithmetic is not expected**; 4-digit work is done by the algorithm. The old draft's near-doubles (P1/P2 strategy) and "295 + 30" (P2 mental range) are removed.
4. **Confirmed P3 core: word problems up to 2 steps involving addition and subtraction, solved with the bar model** (part-whole and comparison). The model method is named in the syllabus as a problem-solving strategy.
5. **Flagged as P4, excluded: rounding and estimation**, including "estimate to check" and the ≈ symbol. This matches the Place Value ruling. US-adapted 3A books (Dimensions, Primary Mathematics 2022) put rounding in 3A, but think! follows MOE, which puts it in P4. **Do not build.**
6. **Flagged as P1/P2, kept only as an optional supporting group: facts within 20.** Number bonds, make-ten, fact families and missing addends are P1 outcomes, with P2 consolidation. Jack is P3. Only the **facts that cross ten** are kept (7 + 8, 13 − 5), because they are exactly the single-column facts the column method runs on. The group is free, has no gate, and is **out of the default draw** (§2).
7. **Flagged, excluded: "numbers close to hundreds / making 1,000" strategies** (3,456 + 998). These appear in Dimensions 3A but not in the MOE P3 mental outcome. See D12.
8. **Flagged, not built: "check subtraction by adding."** Teachers use it in class, but it is not a separately assessed outcome. Not built in v1 (D13).
9. **Excluded outright:** results above 9,999 (the P3 ceiling, never a 5-digit answer); negative results; three or more addends; 3-step word problems; money with cents, measurement or unit conversion; any ×/÷ (multiply module; the ×÷ word problems belong to Connections); decimals; fractions.

### Chapter mapping

| Group / skill | MOE 2021 outcome | Chapter position (sibling 3A order) |
|---|---|---|
| A1, S1 (3-digit) | P3 algorithms (P2 range, chapter opener) | "Addition and subtraction within 1,000" |
| A2, A3, S2 (4-digit) | P3 algorithms up to 4 digits | "Addition and subtraction within 10,000" |
| S3 (across zeros) | P3 algorithms up to 4 digits | same lessons, the subtraction core |
| M1–M3 | P3 mental calculation, two 2-digit numbers | "Mental addition / subtraction", "other strategies" |
| W1–W3 | P3 up-to-2-step word problems (+/−), model method | "Word problems" (chapter close) |
| F1–F2 (supporting) | P1 facts within 20 (P2 consolidation) | below grade: support only |

### How the reference modules behave (one paragraph)

`multiply`, `fractions` and `placeValue` share one machine.
- **Item pool and mastery.** The pool is finite, curated and deterministic. Each item's canonical `itemKey` is the persisted mastery unit. 3 credited corrects = mastered; a wrong answer is −1 (floor 0).
- **Draw.** The next item comes from the shared weighted draw: struggling 6 / learning `(3−level+1)×2` / new 3 with ≤3 unseen in rotation, in pool order / review-due 4 on the 1/3/7/14/30-day Leitner ladder / mastered 1, plus a 1-back anti-repeat guard.
- **CPA.** Concrete = the child manipulates the model. Pictorial = the model is shown and fades with `opacity = max(0.15, 1 − 0.3 × level)`; tap to dismiss, "Show me" to restore. Abstract = symbols plus "Show me".
- **Misses.** A first miss opens the full-screen reveal (R1–R7, C1). The re-answer is never logged. A wrong answer in under `GUESS_MS` (1500 ms) is "not sure", not a miss (C2).

Add & Subtract reuses all of this. This spec defines only what is add/subtract-shaped.

---

## Changes from the 2026-06-20 draft

1. **The tier gate is gone.** The draft locked all P3 work behind 80% mastery of P1/P2 facts. P3 chapter content now leads; facts-to-20 is an optional supporting group with no gate (§2).
2. **The P1 groups N, M, K and X are dropped.** F is narrowed to the 56 crossing-ten facts. Make-ten and break-ten live on as the facts' picture and derivation lines.
3. **Group R is split** into **Column Adding** and **Column Subtracting**. The pools are literal, verified operand lists covering every regrouping pattern, and **across zeros is its own skill (S3)**.
4. **Mental strategies are rescoped** to the P3 outcome (two 2-digit numbers). Near-doubles and 3-digit "next hundred" are removed; compensation (+29 = +30 − 1) is added.
5. **The `barChoice` answerType is removed.** Choosing the bar model is now a Concrete-mode manipulation, not a scored step. Keyword-trap comparison items are added ("has 340 more than Ben — how many does Ben have?").
6. **The wrong-answer path is the reveal (R1–R7, C1–C3).** The because/hint/bond/Next block and the "misconception override" chips are replaced by one derivation line chosen by a deterministic **bug library** (§7).
7. **The column input is redesigned (§5).** Entry runs right to left with an in-app digit pad (no iOS keyboard). There is a fixed column count, so the answer's length never leaks, and **no auto-submit** (the built `ColumnInput` auto-submitted on the last digit, which is an escape hatch). Regroup marks are optional and unscored, and in Concrete they mirror the disc trades.
8. **Continuity with Place Value.** The column method runs on an extended `PlaceValueChart` (discs mode), the chart Jack just used. `TenFrame`, `JumpStrip`, `TwoStepBarModel`, `AddNumberBond` and digits-mode `PlaceValueChart` are **not used**. Each of them prints its result, which is a pre-reveal leak.
9. **No speed anything.** No speed gate, no timed element, no speed achievement. "Fact Flash ⚡" and "Tier Two!" are gone.
10. **Free content** is Column Adding + Facts Warm-Up, not Number Bonds.
11. **Readiness gates use "secure" (correct ≥ 2), not mastered,** and the finish-line on-ramp is extended to Concrete (§8). Without both, a child working in the Concrete default could never master an item or unlock the next skill.
12. **Corrections:** the draft's worked example "503 − 178 → 275 (smaller-from-larger)" is wrong; that bug gives **475**. The draft called estimation "a separate P3 strand"; it is P4.
13. **Rebuild, don't patch.** `src/modules/add.jsx` and `src/add-practice.jsx` are rewritten from the Place Value pair (§11). Nothing was ever shipped, so there are no persisted keys to protect.

---

## 1. Module identity

| Field | Value |
|---|---|
| `id` | `add` |
| `name` | Add & Subtract |
| `grades` | "Grades 2–3" (P3 core; 3-digit chapter opener; facts-to-20 warm-up) |
| `color` | `MODULE_COLORS.add` (`#EF476F`, already in `constants.js`); black text on it |
| `description` | "Column adding & subtracting to 10,000 with number discs — plus mental math and bar-model word problems" |
| Store | $3.99, catalog `module.add.full`. Column Adding + Facts Warm-Up free at launch (§14) |

Group colours use the Place Value rotation: `colAdd` purple, `colSub` blue, `mental` orange, `words` green, `facts` `COLORS.yellow`.

---

## 2. Structure decision: no tier gate

**Recommendation:** four P3 groups in chapter order, plus one supporting group that is free, ungated and opt-in.

| Order | Group id | Label | Skills | Role |
|---|---|---|---|---|
| 1 | `colAdd` | Column Adding | A1–A3 | P3 core |
| 2 | `colSub` | Column Subtracting | S1–S3 | P3 core |
| 3 | `mental` | Mental Math | M1–M3 | P3 core |
| 4 | `words` | Word Problems | W1–W3 | P3 core |
| 5 | `facts` | Facts Warm-Up | F1–F2 | **supporting** (`supporting: true`) |

**Pedagogical justification.**
- **Jack is in the chapter now.** A gate that withholds the chapter until P1 facts reach 80% would hold an on-level child below grade level. That is the same failure the fact-selection policy fixed for the 6s–9s.
- **Singapore's spiral re-enters facts inside the column method; it does not prerequisite them.** "13 − 8" is met *as* the ones column of 4,503 − 1,268, with the same disc trade.
- **The new structure keeps the fact-to-algorithm link.** Facts use the same disc chart at 2 columns, and the facts lines are the make-ten/break-ten strategy. A fact slip in a column is therefore taught with the identical picture.
- **Readiness is still sequenced, inside groups** (§6.5), the way Place Value gates B3/B4 behind B1/B2.

**What `supporting: true` means** (one new optional group field):
- **Default draw.** With no parent group lock and no focused skill, the draw runs over the accessible **non-supporting** groups only. Facts items never appear by surprise.
- **Ways in.** (a) The child taps an F1/F2 row in the progress grid (the existing skill focus selector). (b) A parent sets Lock Group = Facts Warm-Up in Parent Zone (the existing lock, honoured exactly as in Place Value).
- **What it's excluded from.** The working-group pill (C4) skips supporting groups unless the lock or focus is on them. `add-master` excludes them (§12).
- **Where it still shows.** The Parent Zone progress report shows the group like any other (it reads `pool`).

**Parent locks:**
- `lockedMode`: honoured as in Place Value; a lock sets `masteryGatesExempt`.
- `lockedGroup`: honoured as in Place Value (it limits the pool, bypasses readiness gates, frames the pill and disables other groups' rows). Any of the five groups can be locked.
- `lockedOperation`: not applicable. The module declares no `operations`, so Parent Zone shows "Any …"; group lock covers add-only versus subtract-only.

---

## 3. Scope: skills, ranges, exclusions

**Global constraints**
- Whole numbers. Every operand and every result is **0–9,999**.
- Subtraction results ≥ 0. Two operands only.
- Place codes used in metadata: `k` thousands, `h` hundreds, `t` tens, `o` ones.

**Group `colAdd` — Column Adding**
- **A1. Add within 1,000** (3-digit + 3-digit, sum ≤ 999): no regroup / ones / tens / both.
- **A2. Add within 10,000, at most one regroup.** Includes 4-digit + 3-digit and **3-digit + 3-digit crossing into thousands** (750 + 631).
- **A3. Add within 10,000, two or more regroups**, including carries that ripple through 9s and zeros in the answer (4,396 + 2,604 = 7,000).

**Group `colSub` — Column Subtracting**
- **S1. Subtract within 1,000:** no regroup / tens→ones / hundreds→tens / both; 3-digit − 2-digit included.
- **S2. Subtract within 10,000, no zero in the top number:** zero, one, two or three regroups.
- **S3. Across zeros:** a zero in the top number either needs a trade or must pass one through. Covers 3-digit (503, 400), x,x0x, x,0xx, x,00x, x,000 and x,x00 shapes.

**Group `mental` — Mental Math** (two 2-digit numbers)
- **M1. Add two 2-digit numbers**: add the tens, then the ones; includes crossing a ten and passing 100.
- **M2. Subtract two 2-digit numbers**: take the tens, then the ones.
- **M3. Round and fix (compensation)**: +29 = +30 − 1; −19 = −20 + 1.

**Group `words` — Word Problems** (bar model, + and − only)
- **W1. Part-whole, 1 step:** find the whole, or find a part (including "some were sold / given away — how many left?").
- **W2. Comparison, 1 step:** find the bigger amount, the smaller amount (including 4 **keyword traps**), or the difference ("how many more/fewer").
- **W3. Two steps:** part-whole then part-whole; comparison then whole; whole then comparison.

**Group `facts` — Facts Warm-Up** (supporting)
- **F1. Make a ten:** all addition facts with addends 2–9 whose sum is 11–18.
- **F2. Break a ten:** the 36 subtraction partners of F1.

**Explicit exclusions (do not build, do not generate):** rounding, estimation and ≈ (P4); results > 9,999 or 5-digit numbers; negative results; 3+ addends; 3-step problems; ×/÷ of any kind; money with cents, measurement and units; 4-digit mental arithmetic; near-hundreds strategies (+998); standalone check-by-inverse items; standalone renaming items ("how many hundreds in 5,003"); number bonds, fact families and missing-addend groups; non-crossing facts within 10.

---

## 4. CPA stage behaviours

The philosophy and the three-way `mode` state are the same as before. The model is the meaning and the numeral is the shorthand; **the visual is never punished.**

### 4.0 The non-negotiable scaffold rule (every mode, every skill)

> No scaffold ever prints the answer, or any digit of it, as a numeral before the reveal's token resolves.

- **Givens** print normally: operands, the subtrahend digit on a "Take 8" chip, story numbers, jump sizes.
- **Counts that are answer digits** render as `DerivationToken` blank chips.
- **The app performs trades and take-aways only when the child taps them.** It never shows the resulting counts as numerals.

Pre-reveal leaks have shipped three times (fractions caption, division caption, X3 strips). Assume this rule will be checked item by item.

### 4.1 The manipulative: the Place Value disc chart, extended (continuity with Place Value)

The chart is Jack's Place Value chart: columns labelled Thousands · Hundreds · Tens · Ones (3 columns for within-1,000 items, 2 columns — Tens · Ones — for facts), with the same place colours (`PV_PLACE_COLOR`). Two differences, both deliberate:
- **Plain discs, 5 per row**, not the stamped 3-per-row discs. A column can hold up to 19 discs (9 + 9 + 1 carried), and a 5-per-row frame makes **ten = two full rows**, so "a full ten-frame trades for one disc" is visible at a glance. The column heading carries the value, as in Place Value's compact charts.
- **Trading is now allowed.** Place Value deliberately stopped at "a column only holds 9". Here a trade is a tap:
  - **Addition:** a column with 10+ discs shows **"Trade →"** (label: "10 ones → 1 ten", and so on). Tapping it animates 10 discs out. One disc arrives at the **top of the left column with a yellow ring** ("carried").
  - **Subtraction:** every non-ones column with an uncrossed disc shows **"Trade →"** (label: "1 ten → 10 ones"). Tapping it moves one disc right, where it becomes **10 yellow-ringed discs** that form a full two-row frame.
  - **Take-away (subtraction):** under each column a chip-button **"Take 8"** (the subtrahend digit, a given). If enough uncrossed discs remain, tapping crosses out that many, **crossing yellow-ringed (traded-in) discs first**. That is "subtract from the ten", the same strategy as F2. If there are not enough, a cream chip appears instead and nothing changes: "Only 3 ones. Trade 1 ten for 10 ones first." For a zero column: "No tens to trade — trade 1 hundred first."
  - Count chips under the columns stay **blank** in every mode before the reveal. Counting the remaining discs is the work.

### 4.2 Column method (A1–A3, S1–S3)

Every mode shows the **column grid** (§5): the written algorithm, the abstract representation itself, and the answer input. The modes differ only in the chart above the grid.

**Concrete (default for `colAdd`, `colSub`): "touch the math"**
- The chart is at full opacity and interactive.
  - **Addition:** each column shows the top addend's discs, a thin dashed line, then the bottom addend's discs. After a trade, the column re-renders as one merged pile of the remaining discs.
  - **Subtraction:** the chart shows the top number's discs only, with a "Take n" chip under each column whose subtrahend digit is > 0.
- **Every chart trade mirrors into the grid's regroup marks**: a carry "1" above the receiving column, or a struck digit renamed in subtraction. This is the CPA bridge: his action, written the way his book writes it. In Concrete the grid's top-row taps are disabled, so chart and marks never disagree.
- A small "Start over" text button (≥44px hit area) resets the chart and marks.
- No order is enforced. The card's prompt line reads "Start with the ones."

**Pictorial (default for `mental`, `words`): "see it, then let it fade"**
- The same chart, **non-interactive and untraded**: the question as discs, layers for addition, "Take n" labels for subtraction.
- Fading uses `max(0.15, 1 − 0.3 × level)`. Tap to dismiss (`userHidScaffold`). "Show me" restores full opacity (C2).
- The grid's regroup marks are live: tap the top row (§5.3).

**Abstract**
- Grid only, marks live. "Show me" (pre-answer, no penalty, pulses after two unassisted misses) brings the Pictorial chart at full opacity.

### 4.3 Mental Math (M1–M3): open number line

This is one new shared visual, `OpenNumberLine` (§11.3): a horizontal line with the start number ticked and labelled, an arc per jump labelled with the jump ("+30", "+8", "−1"), and a landing tick per jump with a value chip.
- The **jump split is given** in Concrete and Pictorial; the split *is* the strategy being taught. In Abstract he splits in his head.
- **Concrete:** the jumps are buttons (≥44px) under the line. Tapping each in order draws its arc and lights its landing tick. **Landing chips stay blank**; he computes each landing.
- **Pictorial:** all arcs drawn, both landing chips blank, fading as usual.
- **Abstract:** "47 + 38" plus "Show me".

### 4.4 Word Problems (W1–W3): bar model

The story is 2–3 short sentences, Space Grotesk 16–18px. The answer is `singleNumber`.
- **Concrete ("pick the model"):** two large buttons (≥64px), "Parts make a whole" and "Compare two amounts", each with a mini bar icon.
  - Right pick: the labelled model draws (story names and numbers as labels, the unknown as "?").
  - Wrong pick: that button dims, a cream chip names the clue ("Is one amount compared with another? Look for 'more than'."), and he picks again. A wrong pick is **not scored or logged**; it is the manipulation.
  - W3: the model builds in two beats. Step 1's model draws, then a "Next step" button (child-triggered) draws step 2's.
- **Pictorial:** the correct model, static, with the unknown as "?", fading.
- **Abstract:** text only plus "Show me".

### 4.5 Facts Warm-Up (F1–F2): the same chart, 2 columns

- **F1 (8 + 5):** the ones column holds 8 discs, then a dashed line, then 5. Concrete: "Trade →" makes the ten.
- **F2 (13 − 5):** 1 ten disc and 3 ones, with "Take 5" under the ones. Concrete: trade the ten (10 ringed discs form the frame), then take 5, crossing the ringed ten first. The picture *is* "take 5 from the ten, 5 left, and 3 more."
- Pictorial and Abstract behave as in §4.2. The answer is `singleNumber`.

### 4.6 Defaults for a new profile

`defaultMode: "pictorial"`, `defaultModeByGroup: { colAdd: "concrete", colSub: "concrete", facts: "concrete" }`. The disc trade is the lesson Jack's class is starting.

---

## 5. Answer formats Jack can enter on a phone

Two answerTypes only: **`column`** (new) for A1–A3 and S1–S3, and **`singleNumber`** (existing, unchanged from Place Value) for M, W and F. There is no `choice4` in this module.

### 5.1 `column`: the grid

- **Fixed column count.** A1 → 3; S1 → 3; S3's 3-digit items → 3; A2, A3, S2 and S3's 4-digit items → **4**. Facts don't use the grid.
  - A2/A3 always get 4 columns, even for 3-digit + 3-digit, so **the grid never reveals whether the sum crosses 1,000**.
  - Subtraction uses the top number's digit count. The answer row is never sized to the answer.
- **Rows, top to bottom:**
  - Place headers "Th H T O" (Space Mono 11px, `#888`).
  - A 16px **mark margin**.
  - **Top number row:** cells 44px tall, which are the tap targets for marks.
  - **Operator + bottom number row:** 40px. The shorter number is **right-aligned by the app**; empty cells are blank.
  - A 4px ink rule.
  - **Answer row:** cells 52 × 52px, Shrikhand 28–32px, 4px ink underline.
- **Width.** Cell width 52px plus a 28px operator gutter: 4 columns = 236px, which fits 320px (~262px usable).
- **No commas inside the grid.** Digits sit in headed place cells, and the grid is not a numeral display. The horizontal problem line above the grid ("4,503 − 1,268", Space Grotesk 700, 18px) uses `formatNumber` commas, per Place Value §8.4.

### 5.2 Digit entry: in-app `ColumnPad`, not the iOS keyboard

Why the in-app pad:
- (1) The column method fills **right to left**; the system keyboard cannot express a cursor that moves left.
- (2) The iOS number pad has no Return key.
- (3) With no keyboard, the reveal's height budget is predictable (§9.3).

There are **no `<input>` elements at all** for `column` items.

- **Layout:** row 1 `1 2 3 4 5`; row 2 `6 7 8 9 0`; row 3 `⌫` (2 units) + **Check** (3 units, yellow `BrutalButton` style, `minHeight 48`, Space Mono 700 18px). Keys are ≥47px wide at 320px and 48px tall, with 6px gaps; total ≈156px.
- **Placement.** In the practice card the pad is **sticky to the bottom of the viewport** while a `column` item is current, so it is always reachable and the card scrolls above it.
- **Cursor.** When the item appears, the active cell is the **ones** answer cell, highlighted yellow with a thick underline.
  - A digit key fills the active cell, then the cursor moves one cell left (it stays put at the leftmost).
  - `⌫` clears the active cell if it is filled; otherwise it moves one cell right and clears that cell.
  - Tapping any answer cell makes it active.
- **Hardware keys** (desktop QA, iPad keyboards): digits, Backspace and Enter map to the pad, through a keydown listener active only while the grid is live.
- **Check** is enabled only when the filled cells form one contiguous run ending at the ones cell. Leading cells may be empty (3,000 − 2,264 = 736 leaves Th empty), and a leading 0 is accepted. **No auto-submit, ever.** The built `ColumnInput` submitted on the last digit, which turns mashing into submitting.
- **Evaluation:** `value = Number(digits.join(""))` over the filled run; compare with `Number(item.correctAnswer)`. `correctAnswer` is a **Number**. Coerce before any string operation (a type-mismatch crash has shipped once).

### 5.3 Regroup marks: optional working, never scored

The marks are the written algorithm's notation. They are **not evaluated, not logged, not persisted**, and they reset with every item. In Pictorial and Abstract they are drawn by tapping the **top-number row**; in Concrete they mirror the chart (§4.2).

- **Addition:** tapping a top cell in any column except ones toggles a small "1" in the mark margin above it. Blank top cells (the thousands of a 3-digit top number) are tappable too.
- **Subtraction ("rename"):** tapping a top digit `d ≥ 1`, in any column except ones, strikes it through and writes `d − 1` small above it; the right-hand neighbour gains 10, drawn as a small "1" before its digit ("13", or "10" from a zero).
  - Allowed only if the neighbour's current top value is < 10.
  - A renamed 10 can be tapped again to pass a trade on. So 5,003 takes three taps to become 4 · 9 · 9 · 13: that is "across zeros" in the written method.
- **"Undo marks"** is a small text button (44 × 44 hit area) at the grid's top-left, visible only when marks exist.

### 5.4 `singleNumber` (M, W, F)

This is exactly Place Value's component: `inputMode="numeric"`, `WebkitAppearance: "none"`, digits only (non-digits stripped before comparison), a mandatory Check button, and a Number `correctAnswer`.

---

## 6. Item pools

All pools are **finite, curated and deterministic**: literal arrays, **no `Math.random()`** anywhere in pool generation. Keys are byte-identical forever. Numerals in keys are **unformatted** (no comma). Display strings use `formatNumber` (import it from `src/modules/placeValue.jsx`, which exports it; do not copy it).

**Module total: 280 items.** `colAdd` 56 · `colSub` 56 · `mental` 56 · `words` 56 · `facts` 56.

| Skill | Size | answerType | itemKey form | Grid cols |
|---|---|---|---|---|
| A1 | 16 | `column` | `add:col:367+256` | 3 |
| A2 | 20 | `column` | `add:col:2346+1527` | 4 |
| A3 | 20 | `column` | `add:col:2995+1007` | 4 |
| S1 | 16 | `column` | `add:col:532-178` | 3 |
| S2 | 20 | `column` | `add:col:5324-2768` | 4 |
| S3 | 20 | `column` | `add:col:5003-1478` | 3 or 4 (minuend digits) |
| M1 | 20 | `singleNumber` | `add:ment:47+38` | — |
| M2 | 20 | `singleNumber` | `add:ment:72-38` | — |
| M3 | 16 | `singleNumber` | `add:ment:46+29` | — |
| W1 | 20 | `singleNumber` | `add:wp:whole:2456+1378` / `add:wp:part:3000-1265` | — |
| W2 | 20 | `singleNumber` | `add:wp:more:320+145` / `add:wp:less:1250-340` / `add:wp:diff:1250-870` | — |
| W3 | 16 | `singleNumber` | `add:wp:two:1250-480+200` | — |
| F1 | 20 | `singleNumber` | `add:fact:5+8` (addends ascending) | — |
| F2 | 36 | `singleNumber` | `add:fact:13-5` | — |

A1 and S1 sit at 16 on purpose. They are the chapter's opener and stay small so the 4-digit work arrives quickly.

**Item fields:** `{ itemKey, group, skill, answerType, op, a, b, correctAnswer (Number), columns, regroups (array of place codes that carry/trade), pattern (tag), display }`. Word items add `{ story, question, model, labels, steps }`.

### 6.1 Column pools (verified by hand; the builder re-verifies by executing the pool builder and asserting `correctAnswer`, regroup places and pattern)

The listed order is the within-skill introduction order: easiest first, zeros and ripples last.

**A1 — add within 1,000 (16)**
- none: 342+215=557 · 403+251=654 · 526+170=696 · 230+415=645
- ones: 237+145=382 · 418+326=744 · 509+284=793 · 625+158=783
- tens: 362+254=616 · 481+137=618 · 593+172=765 · 274+451=725
- ones+tens: 367+256=623 · 458+377=835 · 289+546=835 · 196+307=503 (ripple through 9 → 0 in the answer)

**A2 — add within 10,000, ≤1 regroup (20)**
- none: 3425+2341=5766 · 4062+1305=5367 · 2710+6048=8758 · 5234+413=5647
- ones: 2346+1527=3873 · 4158+3624=7782 · 6209+1345=7554 · 3617+258=3875 · 1538+4227=5765
- tens: 1452+2371=3823 · 5283+2461=7744 · 3190+4535=7725 · 7064+1872=8936 · 6342+581=6923
- hundreds: 2613+3524=6137 · 4852+1436=6288 · 3705+2694=6399 · 5920+2346=8266 · **750+631=1381** · **864+512=1376** (3-digit + 3-digit → new thousands disc)

**A3 — add within 10,000, ≥2 regroups (20)**
- ones+tens: 3475+1268=4743 · 2589+4136=6725 · 5147+2385=7532 · 6258+1375=7633
- tens+hundreds: 2673+3851=6524 · 4580+2765=7345 · 1794+5632=7426 · 3861+2452=6313
- ones+hundreds: 2617+3705=6322 · 5438+1814=7252 · 3906+2428=6334
- three places: 3475+2896=6371 · 4368+857=5225 · 2789+4567=7356 · 1658+3476=5134 · 5847+2365=8212
- ripple / zeros in the answer: 2995+1007=4002 · 4396+2604=7000 · 5078+1925=7003 · 1999+999=2998

**S1 — subtract within 1,000 (16)**
- none: 568−124=444 · 795−382=413 · 607−305=302 · 486−52=434
- tens→ones: 452−137=315 · 683−256=427 · 741−318=423 · 375−149=226
- hundreds→tens: 527−163=364 · 836−452=384 · 914−271=643 · 648−293=355
- both: 532−178=354 · 823−467=356 · 615−249=366 · 724−58=666

**S2 — subtract within 10,000, no zero on top (20)**
- none: 5867−2345=3522 · 7489−3256=4233 · 6594−482=6112
- one trade into ones: 4352−1127=3225 · 6743−2518=4225 · 8261−237=8024
- one trade into tens: 5428−2163=3265 · 7316−4152=3164 · 9547−3281=6266
- one trade into hundreds: 6235−1412=4823 · 4186−2543=1643 · **3452−2731=721** (3-digit answer; tests a leading empty cell)
- two or three trades: 5324−2768=2556 · 7152−3486=3666 · 8431−2654=5777 · 6273−1845=4428 · 9416−5738=3678 · 4621−1384=3237 · 7245−638=6607 · 5162−2375=2787

**S3 — across zeros (20)**
- 3-digit: 503−178=325 · 400−156=244 · 702−345=357 · 600−248=352
- zero in tens: 4503−1268=3235 · 6207−2439=3768 · 8605−3172=5433 · 5309−2754=2555
- zero in hundreds: 7042−3516=3526 · 5031−2467=2564 · 9064−4385=4679 · 3018−1243=1775
- two zeros: 5003−1478=3525 · 6002−3547=2455 · 8004−59=7945 · 4050−1276=2774
- round numbers: **3000−2264=736** · 7000−2385=4615 · 5200−1847=3353 · 9000−4536=4464

**Rules.** No commuted duplicates in the column pools: the key stores the order as presented, and a pool never contains both `a+b` and `b+a`. Assert key uniqueness across the module.

### 6.2 Mental pools

The split shown on the number line is fixed per item.

- **M1 (20)**, split the second number into tens + ones:
  - No ones-crossing: 43+25 · 31+46 · 52+34 · 26+63 · 71+28 · 64+35 · 52+71 · 85+64 (the last two pass 100).
  - Crossing a ten: 47+38 · 56+27 · 29+44 · 68+17 · 37+35 · 58+24 · 15+66 · 49+46 · 67+58 · 75+46 · 84+39 · 93+29 (the last four pass 100).
- **M2 (20)**, split the second number into tens + ones:
  - No crossing: 78−35 · 96−42 · 67−24 · 85−61 · 59−37 · 94−53.
  - Crossing: 72−38 · 63−27 · 81−46 · 54−18 · 90−34 · 70−45 · 43−26 · 95−58 · 61−35 · 84−47 · 52−17 · 31−14 · 80−53 · 76−48.
- **M3 (16)**, round the second number up to the next ten, then fix:
  - Adding: 46+29 · 37+19 · 64+18 · 25+39 · 53+49 · 58+29 · 36+48 · 71+19.
  - Subtracting: 72−19 · 85−29 · 64−39 · 91−49 · 53−18 · 80−29 · 67−38 · 46−19.

### 6.3 Word-problem pools (builder writes the literal stories to these rules)

**Style.** 2–3 sentences, ≤12 words each, US classroom wording ("in all", "altogether", "how many more", "left"). One-word first names (≤6 letters, varied), everyday countables (stickers, beads, books, visitors, apples, cards, laps). No money with cents, no units. Numbers display with commas.

**Arithmetic ≤ 1 regroup per operation**: the item tests the model, not the algorithm. Every intermediate and answer is ≤ 9,999.

| Skill | Composition |
|---|---|
| W1 (20) | 10 find-whole, 10 find-part (4 of them "sold / gave away … how many left?"); 6 within 1,000, 14 within 10,000 |
| W2 (20) | 7 find-bigger ("X has n more than Y"), 3 find-smaller ("n fewer"), **4 keyword traps** ("X has n more than Y. How many does Y have?" → subtract; `trap: true`), 6 difference (4 "how many more", 2 "how many fewer") |
| W3 (16) | 6 change twice (had → sold → got more), 6 comparison then whole ("Y has n more than X. How many altogether?"), 4 whole then comparison ("Together they have T. X has a. How many more does Y have than X?") |

Worked examples:
- W2 find-bigger `add:wp:more:320+145`: "Ben has 320 stickers. Mia has 145 more than Ben. How many stickers does Mia have?"
- W2 trap `add:wp:less:1250-340`: "Mia has 1,250 beads. She has 340 more beads than Ben. How many beads does Ben have?"
- W3 `add:wp:two:1250-480+200`: "A shop had 1,250 pens. It sold 480 pens. Then 200 more pens came. How many pens does the shop have now?"

### 6.4 Facts pools

- **F1 (20):** every unordered pair from 2–9 with sum 11–18. The key is ascending (`add:fact:5+8`); the display shows the **larger addend first** ("8 + 5", make-ten from the bigger number). Order by sum, then by larger addend descending.
- **F2 (36):** for each F1 pair `(a, b)` with `c = a + b`, the facts `c − a` and `c − b` (one fact for doubles). Order by minuend, then subtrahend.

### 6.5 Introduction order and readiness gates

**Pool array order = introduction order.** The frontier takes the first ≤3 unseen *allowed* items in array order:
1. A1/S1 **interleaved** (A1[0], S1[0], A1[1], …).
2. A2/S2 interleaved.
3. A3/S3 interleaved.
4. M1/M2 interleaved.
5. M3, then W1, W2, W3.
6. F1, F2 (supporting; reached only via focus or lock).

The progress grid groups items by group, then skill, in their stated order.

**`shouldAllowSkill(skill, mastery)`.** A gated skill's **unseen** items are excluded from the `new` category until its gate passes. Items already attempted stay in rotation even if the gate later fails. Note: Place Value's screen filters whole skills; **do not copy that, and do not change Place Value.**

| Skill | Opens when ≥ 60% of these items are **secure** (`correct ≥ 2`) |
|---|---|
| A2 | A1 |
| A3 | A2 |
| S2 | S1 |
| S3 | S2 |
| M3 | M1 + M2 |
| W2 | W1 |
| W3 | W1 + W2 |
| A1, S1, M1, M2, W1, F1, F2 | ungated |

**Why "secure", not "mastered":** gate 2 means no Concrete-mode answer can cross 2 → 3. A mastered-based gate would stall a child who stays in the Concrete default. **Bypasses** are the existing ones: focused skill, group lock, and a served comeback.

**Null safety:** a new profile has no `mastery.add`. Guard every read (`(mastery?.[k]?.correct || 0)`).

---

## 7. Misconception diagnosis (the bug library)

Distractors don't exist: every item is typed. Misconceptions are diagnosed from the **first-submit** value and drive the reveal's derivation line (§9).

Each bug is a **pure, deterministic function of the operands**, kept in `src/modules/add.jsx`. If the entered value equals a bug's output (and that output ≠ the correct answer), the bug's line is used. When several bugs match, the first in the listed order wins. The builder logs every item's bug outputs once in DEV and asserts each differs from `correctAnswer` where the item's pattern makes it applicable.

**Column, addition**
1. `noCarry`: Σ((aᵢ + bᵢ) mod 10)·10ⁱ. Added each column, dropped the trade. Example: 367 + 256 → 513.

**Column, subtraction** (top `a`, bottom `b`)
1. `smallerFromLarger`: Σ|aᵢ − bᵢ|·10ⁱ. The classic. Example: 503 − 178 → **475**.
2. `zeroStays10`: the standard algorithm, except that a zero which passes a trade along stays 10 instead of becoming 9. Examples: 503 − 178 → 335; 5,003 − 1,478 → 3,635.
3. `noDecrement`: the trade adds 10 to the column but never takes 1 from the lender. Examples: 452 − 137 → 425; 5,003 − 1,478 → 4,635.

**Mental**
- M1 `dropTen`: the item crosses a ten and the entered value = correct − 10 (47 + 38 → 75).
- M2 `smallerFromLarger`, on the two digits (72 − 38 → 46).
- M3 `wrongWay`: adding, entered = correct + 2j (46 + 29 → 77); subtracting, entered = correct − 2j (72 − 19 → 51).

**Words**
- `otherOp`: entered = the other operation on the same two numbers. This is the keyword trap's signature.
- W3 `stepOneOnly`: entered = the step-1 result.

**Facts:** no bug library; the strategy line always applies.

**Kindness rule for every bug line:** the line names the *step*, never the child's error. No "you", no "wrong", no "forgot".

---

## 8. Mastery model

**This is identical machinery to the shipped modules. No schema change.**

- **Unit and criteria.** One `itemKey` (280 total). `correct ≥ 3` = mastered; a wrong answer is −1 (floor 0); `masteredAt` as in `dataManager.updateMastery`.
- **Draw.** The shared weighted draw, as in Place Value (struggling 6 / learning / new 3 with ≤3 in rotation in §6.5 order and subject to gates / review 4 on the Leitner ladder / mastered 1 / anti-repeat), over accessible non-supporting groups unless a focus or lock applies. Comeback slot and `missedKeysRef` as in Place Value. Do not write a new selector.
- **Speed gate: NONE, for every group, facts included.** The practice screen **passes no `responseMs`** (log it to the DEV console only). The column items are structurally slow (4 digits plus optional marks plus trades), and the brief rules out speed pressure. See D10.
- **Retrieval finish line (gate 2): YES.**
  - `scaffolded = (mode !== "abstract" && !userHidScaffold) || showScaffold === true`. This is Place Value's rule. **The grid and its marks are not a scaffold**: they are the abstract written method.
  - A parent mode lock → `masteryGatesExempt`.
- **Finish-line on-ramp, extended to Concrete (module-local, D4 default ON).** When the drawn item is at `correct === 2`, the mode is `concrete` **or** `pictorial`, and there is no mode lock, the chart starts **hidden** behind "Show me".
  - In Concrete, "Show me" restores the **interactive** chart. Answering with it hidden can cross to mastered; answering after "Show me" is scaffolded and simply doesn't cross.
  - This is the only place this module shows "Show me" in Concrete.
  - Without it, a child who stays in the Concrete default could never master an item. Place Value has the same latent issue; flagged, not fixed here.
- **Display.** `MasteryDots` 0–3. The header pill follows C4: framed against the **working group**, meaning the first non-supporting group, in module order, that is accessible and not fully mastered (or the locked/focused group, including Facts). Example: `⭐ 6/56` / `COLUMN ADDING`.

---

## 9. Wrong-answer reveal: per skill

This section is governed by R1–R7, Phase 2 and C1. Restated because the builder will get it wrong otherwise:
- **R1:** the first submit is the only logged record. Put the R1 paragraph as a comment above the retry handler.
- **C1:** while `retry.phase === "ask"`, the answer is nowhere on screen.
  - One `tokenState` drives every slot: `done → "correct"`, `missed → "numeral"`, else `"blank"`.
  - The chart's count chips are answer digits, so they use the same `tokenState`.
- **R3:** one picture, one line, the re-ask.
- **Second miss:** fill the answer on yellow and show "Still tricky. Here it is — we'll come back to it.", auto-advance ~2.5s, comeback slot.
- **R4:** no red, no shake, no ✗. Header rotation and timings as shared.

`[…]` is the token. Place words: ones/one, tens/ten, hundreds/hundred, thousands/thousand. Numbers in lines go through `formatNumber`.

### 9.1 Column items: line selection (first match wins)

**Addition (A1–A3)**
1. `noCarry` matched. Here P is the rightmost place that carries.
   Line: `{P} made 10 or more — trade 10 {P} for 1 {next} → [ans]`.
   Example: "Ones made 10 or more — trade 10 ones for 1 ten → [623]".
2. Otherwise, let D be the **rightmost column where the entered digit ≠ the correct digit** (compare right-aligned; a missing digit counts as wrong):
   - A trade comes into D: `{D}: {x} + {y} + 1 traded {d} → [ans]`. Example: "Tens: 6 + 5 + 1 traded ten → [623]".
   - D carries out: `{D}: {x} + {y} is 10 or more — trade it → [ans]`.
   - Otherwise: `{D}: {x} + {y} — count the discs → [ans]`.

**Subtraction (S1–S3)**
1. `smallerFromLarger` matched. Here P is the rightmost place needing a trade and L is the place to its left.
   - L's top digit ≠ 0: `{P}: {t} take {b}? Trade 1 {L} for 10 {P} first → [ans]`. Example: "Ones: 2 take 7? Trade 1 ten for 10 ones first → [315]".
   - L's top digit = 0: `No {L} to trade — trade 1 {next non-zero place} first → [ans]`. Example: "No tens to trade — trade 1 hundred first → [325]".
2. `zeroStays10` matched. Here Z is the rightmost zero place that passed a trade.
   Line: `The 10 {Z} gave 1 away — 9 {Z} are left → [ans]`.
3. `noDecrement` matched. Here L lent to P at the rightmost trade.
   Line: `1 {L} went to the {P}, so 1 fewer {L} → [ans]`.
4. Otherwise D = the rightmost wrong column, and T = D's top value after all correct trades.
   Line: `{D}: {T} take {b} — count the discs → [ans]`. Example: "Tens: 9 take 7 — count the discs → [325]".

**Column pictures**
- **Picture:** the chart in its **after-trades** state, computed (not the child's chart state), non-interactive, compact plain discs. Traded-in discs have yellow rings; subtraction shows the take-aways crossed (ringed discs crossed first).
- **Outline:** the diagnosed column (P, Z or D) gets `highlightPlace`.
- **Count chips** = the remaining count per column = the answer digits, with `tokenState` (blank in `ask`).
- **Problem slot: `null`**; the re-ask grid restates the problem.

### 9.2 Other skills

| Skill | Line (≤2 lines at 375) | Bug override | Picture |
|---|---|---|---|
| M1 | `47 + 30 = 77, then 8 more → [85]` | `dropTen`: `7 + 8 ones make a new ten — keep it → [85]` | `OpenNumberLine`: arcs, landing 1 **numeral** (intermediate), landing 2 = token |
| M2 | `72 − 30 = 42, then take 8 more → [34]` | `smallerFromLarger`: `2 ones take 8? Trade a ten first → [34]` | same |
| M3 | add: `46 + 30 = 76, then take 1 back → [75]` · sub: `72 − 20 = 52, then add 1 back → [53]` | `wrongWay`: `+30 is 1 too many — take 1 back → [75]` / `−20 takes 1 too many — add 1 back → [53]` | same; jumps "+30", "−1" |
| W1 whole | `The parts make the whole: 2,456 + 1,378 → [3,834]` | — | `PartWholeBar`; unknown cell = token |
| W1 part | `Whole take away the part you know: 3,000 − 1,265 → […]` | `otherOp`: `The whole is already 3,000 — take away → […]` | same |
| W2 bigger | `Mia's bar is Ben's and 145 more: 320 + 145 → [465]` | — | `ComparisonBar`; unknown = token |
| W2 smaller / trap | `Ben's bar is the shorter one: 1,250 − 340 → [910]` | `otherOp`: `Ben has fewer — shorter bar: 1,250 − 340 → [910]` | same |
| W2 diff | `The gap between the bars: 1,250 − 870 → […]` | `otherOp`: `How many more = the gap: 1,250 − 870 → […]` | same, the diff cell is the token |
| W3 | `Step 1: 1,250 − 480 = 770. Step 2: 770 + 200 → [970]` | `stepOneOnly`: `That's step 1. Step 2: 770 + 200 → [970]` | two compact bars stacked; step 1's unknown printed (intermediate), step 2's unknown = token |
| F1 | `8 needs 2 to make 10; 5 is 2 and 3 → [13]` | — | 2-column chart after the trade, the carried disc ringed, count chips = token |
| F2 | `Take 5 from the ten: 5 left, and 3 more → [8]` | — | 2-column chart after the trade, the ringed ten with 5 crossed, chips = token |

W reveal problem slot: the **question sentence only** ("How many stickers does Mia have?"). The story is too long for R2. M and F problem slot: "47 + 38" / "8 + 5" in Shrikhand `clamp(28px, 8.5vw, 34px)`, with the operator in the module colour.

### 9.3 Re-ask and second miss, per answerType

| answerType | At re-ask | Second-miss fill |
|---|---|---|
| `column` | Answer row emptied; marks reset; cursor on ones; pad live after ~900ms; chips and line token blank. `autoFocus={false}`; Enter comes from the grid's own keydown listener | Answer row filled with the correct digits on yellow (leading empties stay empty); **the correct regroup marks drawn on the grid**, so the worked algorithm is visible; chips → numerals; disabled |
| `singleNumber` | Line token blank; box emptied and focused; Check mandatory | Box filled on yellow, disabled |

A correct re-answer gives the ordinary green beat (column: the answer row turns green), then the next item.

**R2 budget for `column`** (no keyboard), 375×667:
card top 16 + padding 16 + header 30 + picture ≤110 + line ≤56 + prompt 24 + grid ~148 + pad ~156 + 5 gaps × 8 + padding 16 ≈ **612px**. It fits.

At 320×568:
- Picture cap `min(110px, 18dvh)` (≈102), with the line wrapping to ~3 lines (≈84px).
- If the measured bottom edge of Check exceeds the viewport, **drop the prompt row** and use the header "Not yet — use the picture." Never scroll.
- Report the measured numbers.

`singleNumber` keeps Place Value's cap, `min(150px, 24dvh)`, with the input and Check on one row. Pictures use `fit="width"`.

---

## 10. No speed pressure, no escape hatch

**Not sure (C2).**
- A wrong answer under `GUESS_MS`, with the picture not already requested, logs nothing.
- The chart, number line or bar appears at full opacity in its **pre-trade, question state** with every chip blank, and the input clears.
- The `column` answer row clears but marks are kept; in Concrete the chart state is kept.
- The nudge reads "Not sure? Count the picture." (shared copy).
- In practice `column` items will almost never convert, because four digits take more than 1.5s. That is correct; it needs no special case.
- Remount local-state inputs via the `retryResetKey` pattern.

**Escape-hatch audit.** Each of these is a requirement:
- No auto-submit on the column grid, and Check is disabled with a gap in the digits.
- The answer is never on screen during the re-ask (C1). Chart trades and take-aways never print counts; landing chips and the bar unknown stay blank.
- The W "pick the model" step reveals structure, not the number. Wrong picks are free but cost nothing and gain nothing.
- No skip button. Leaving via Home is always allowed and logs nothing for the unanswered item.
- The focus selector (an easier skill) is visit-scoped and visible to the parent, as in Place Value.
- **Every wrong path teaches:** a fast wrong gets the picture plus nudge; a first miss gets picture + line + re-ask; a second miss gets the worked fill, marks included, and a comeback within 3–5 draws.

**No timers or countdowns anywhere.** No responseMs crediting. No speed achievement. Praise is the flat rotation. Streaks follow C3: unchanged on a recovered miss, reset on a second miss.

---

## 11. Implementation deltas

**Shared-component rule.** All new props on shared components are **opt-in and default off**. Place Value's rendered markup must be unchanged; verify B1, B2 and C2 in the preview.

1. **Rewrite `src/modules/add.jsx` and `src/add-practice.jsx`** from the Place Value pair (registry shape, retry/reveal state machine, comeback queue, nudge, `pictureRequested`, skill focus, group lock, C4 pill, `buildAddLine(item, tokenState, firstSubmitValue)` returning `DerivationLine` segments).
   - Delete the tier gate, `Tier2LockedCard`, `WrongAnswerHelpers`, `BarTypeChoiceInput`, the old `ColumnInput`, and every `TenFrame` / `JumpStrip` / `TwoStepBarModel` / `AddNumberBond` / digits-mode `PlaceValueChart` use.
   - Leave those shared components in `barComponents.jsx`; they are now unused, and cleanup is optional.
2. **Extend `PlaceValueChart` discs mode** (`src/shared/barComponents.jsx`):
   - `columns: 2` (Tens · Ones).
   - `plain` (unstamped 5-per-row discs at non-compact size).
   - `layers: [counts, counts2]` (two addend piles split by a dashed line).
   - `carried` (per-column yellow-ringed count).
   - `taken` (per-column crossed-out count; crosses ringed discs first).
   - `takeLabels` + `onTake(idx)`.
   - `tradeable` + `onTrade(idx)` (addition: column total ≥ 10 → one disc left; subtraction: one disc right → 10 ringed).
   - The cream refusal chips (§4.1).
   - Count chips showing **remaining** (`count − taken`) through `countTokens`.
   - Allow up to 19 discs per column (4 rows of 5).
   - The practice screen owns the disc state per item: `{counts, counts2, carried, taken}`, reset on item change. Verify a 4-column 19-disc column at 320.
3. **New `OpenNumberLine`** (barComponents): `start`, `jumps: [{label, delta}]`, `landingTokens`, `interactive` + `onJump(i)`, `animate`. Responsive SVG (viewBox + `width: 100%`). Numbers ≤ 3 digits.
4. **`PartWholeBar` / `ComparisonBar`:** add `missingToken` (render the unknown through `DerivationToken` instead of "?", for the reveal), `compact` (bar height ~60% for W3's stacked pair) and name labels. Keep "?" as the pre-answer default.
5. **New `src/shared/ColumnMethod.jsx`:** `ColumnGrid` (§5.1 and §5.3; props `item`, `digits`, `active`, `marks`, `marksInteractive`, `onCellTap`, `onTopTap`, `fill`, `fillMarks`, `state`) and `ColumnPad` (§5.2), composed by a `ColumnAnswerInput` that hosts the card and the reveal re-ask. New answerType `column`; `evaluateAnswer` handles `{type: "column", digits}` with Number coercion.
6. **The bug library and line builder** (§7, §9) are pure functions in `add.jsx`. A DEV-only self-check runs once and logs: key uniqueness, `correctAnswer` and regroup places for every column item, and bug outputs per item.
7. **`supporting` group flag** (§2), honoured in `activePools`, the C4 pill and `add-master`.
8. **`shouldAllowSkill`** with new-only, secure-based semantics (§6.5).
9. **Concrete finish-line on-ramp** (§8).
10. **No `responseMs`** passed to `updateMastery`.
11. **`App.jsx`:** uncomment/route `add` to the new practice screen.
12. **`purchaseManager.js`:**
    - `module.add.full`: description → the §1 description; gradeRange → "Grades 2–3"; entitlement mapping; `available: false` until launch.
    - **Heads-up:** once Add ships with Fractions and Place Value, there are 3 paid modules `available`, so the All-Modules bundle card **auto-surfaces by design** (`BUNDLE_MIN_PAID_MODULES`). Do not change that logic.
13. `achievementEngine.js`: icons in `MODULE_ACHIEVEMENT_ICONS`; triggers via `checkExtraTrigger`.
14. **Do not refactor or restyle** `multiply`, `fractions` or `placeValue`.

---

## 12. Achievements

No speed achievement in any form (C3). The shared `comeback-kid` covers persistence.

| id | name | trigger |
|---|---|---|
| `add-carry-captain` | Carry Captain | master group `colAdd` |
| `add-take-away-pro` | Take-Away Pro | master group `colSub` |
| `add-head-for-numbers` | Head for Numbers | master group `mental` |
| `add-bar-builder` | Bar Model Builder | master group `words` |
| `add-ten-maker` | Ten Maker | master group `facts` |
| `add-master` | Add & Subtract Master | master every accessible item in `colAdd`, `colSub`, `mental`, `words` |
| `add-zero-crosser` | Zero Crosser | ≥15 credited correct answers on S3 items, summed from mastery data like `pv-zero-hero` (seeded test profiles unlock it on their first answer; real profiles earn it) |

---

## 13. Kid-language skill labels (`skillLabels`)

| A1 Add to 1,000 | A2 Add to 10,000 | A3 Lots of trades |
|---|---|---|
| **S1** Take away to 1,000 | **S2** Take away to 10,000 | **S3** Across zeros |
| **M1** Add in your head | **M2** Subtract in your head | **M3** Round and fix |
| **W1** Part and whole | **W2** More or fewer | **W3** Two steps |
| **F1** Make a ten | **F2** Break a ten | |

---

## 14. Free content and gates

- **At launch:** `freeContent: ["colAdd", "facts"]`.
  - Column Adding is the chapter's entry and shows the real product: the disc trade, the written method, the reveal.
  - Facts is the cheap fallback that should never be paywalled.
  - Subtraction (across zeros is the most valuable practice), Mental and Words are paid.
  - This mirrors Place Value (a free P3 entry group) and Fractions (a free foundations group).
- **During the test drive:** the native purchase provider is still a stub, so list **every built group** in `freeContent` (Place Value precedent) and move to the launch list when pricing is wired.
- **Purchase gates and readiness gates are independent.** Locked groups show the standard locked-but-visible card.

---

## 15. Build passes

**Pass 1 — what Jack needs for class now:**
- Groups `colAdd`, `colSub` and `facts`.
- Shared deltas §11.2 (chart extension) and §11.5 (grid + pad).
- The bug library and lines for A, S and F; the reveal for `column` and `singleNumber`.
- Gates, the supporting flag, the Concrete on-ramp.
- Routing, catalog entry (`available: false`), achievements for the built groups.

Facts ride along because they reuse the same chart at 2 columns with `singleNumber`. They are the cheapest way to verify the chart extension, and the fallback when a column miss is a fact slip.

**Pass 2:**
- `mental` (`OpenNumberLine`) and `words` (bar extensions, stories, model pick).
- The remaining achievements.
- No spec changes needed.

---

## 16. Open decisions for Adam (the build proceeds on the defaults)

| # | Decision | Default |
|---|---|---|
| D1 | Kid verb for regrouping: "trade" / "regroup" / "rename" (what does Jack's teacher say?) | **"trade"** in lines and chart buttons; one constant to change |
| D2 | Keep any P1 content? | **Yes, only** the supporting Facts Warm-Up (F1/F2, crossing-ten, 56 items). N/M/K/X are dropped |
| D3 | Free content at launch | **Column Adding + Facts Warm-Up** |
| D4 | Finish-line on-ramp in Concrete | **On** |
| D5 | Readiness gates on secure (≥2) rather than mastered | **Secure, 60%** |
| D6 | Column entry via in-app pad vs iOS keyboard | **In-app pad** |
| D7 | Regroup marks: optional and unscored vs required | **Optional, unscored**; mirrored from the chart in Concrete |
| D8 | Word-problem wording | **US** ("in all", "how many more"), commas, as Place Value decided |
| D9 | Confirm think! 3A lesson order against Jack's book (assumed: within 1,000 → within 10,000; add before subtract; word problems last) | Proceed; pool order is easy to reshuffle (keys don't change) |
| D10 | Speed gate on Facts Warm-Up | **None** (module-wide) |
| D11 | Commas inside the column grid | **None** (headed place cells); commas everywhere else |
| D12 | Near-hundreds strategies (+998, "making 1,000") | **Excluded** (not in MOE P3 mental) |
| D13 | A "check by adding" skill | **Not built** in v1 |
| D14 | Later idea, not in v1: when a column miss is a pure fact slip, suggest the Facts Warm-Up | **Not built** |

---

## 17. QA (static QA is not sufficient)

Drive the preview at **375×667 and 320×568**, in **every CPA mode**. For each answerType (`column`, `singleNumber`): one correct answer, one **wrong** answer (slow), one **second miss**, and one **fast wrong** (<1500ms). Then check:

1. **No pre-reveal, item by item.** Pre-answer chips are blank; trades and take-aways print no counts; the grid is 4 columns for 750 + 631; number-line landings and the bar unknown are blank. Verify across one item per pattern tag.
2. **C1 in the reveal.** During the re-ask the answer is nowhere: chips, line token and grid are all empty.
3. **R1 by storage.** After wrong → right re-answer, `localStorage.jackflash_data` shows `correct` down exactly 1, `attempts` +1, session total +1 / correct +0. After a converted "not sure", nothing changed.
4. **Column round trip.**
   - Right-to-left cursor; ⌫ behaviour; tap a cell to fix it.
   - Check disabled with a gap; 3,000 − 2,264 accepted with an empty or 0 thousands cell.
   - Marks: carry toggle, three-tap rename of 5,003, Undo marks.
   - Concrete trades mirror into the marks; refusal chips for "not enough" and "no tens".
   - Second-miss fill draws the marks; the pad stays sticky in the card.
   - No iOS keyboard ever opens.
5. **Bug lines.** 503 − 178 entered as 475, 335 and 425 each produce their own line; 367 + 256 entered as 513 produces the trade line; 47 + 38 entered as 75; a W2 trap answered by adding.
6. **Gates.** A2 stays out until 60% of A1 is secure; a focused skill or group lock bypasses it. Facts never appear in the default draw; focus on F1 and Lock Group = Facts both work; the pill frames correctly.
7. **Concrete on-ramp.** An item at correct = 2 starts hidden, and "Show me" restores the interactive chart.
8. **Regression.** Multiply, Fractions and Place Value: one wrong answer each, reveal works. Place Value's B1/B2/C2 charts are unchanged.

---

**End of specification.**

### Sources
- [MOE 2021 Primary Mathematics Syllabus P1–P6](https://www.moe.gov.sg/-/media/files/primary/mathematics_syllabus_primary_1_to_6.pdf)
- [Haig Girls' — 2022 P3 Mathematics Curriculum Briefing](https://haiggirls.moe.edu.sg/files/2022%20P3%20Mathematics%20Curriculum%20Briefing%20Slides.pdf)
- [Raffles Girls' Primary — P3 Math Curriculum Briefing Jan 2026](https://www.rafflesgirlspri.moe.edu.sg/files/Curriculum%20Slides%202026/Math/3__P3_Math_Curriculum_Briefing_Jan_2026.pdf)
- [West Spring Primary — 2024 P3 Curriculum Briefing, Mathematics](https://www.westspringpri.moe.edu.sg/files/Curriculum%20Briefing%20Slides/2024/2024_Primary_3_Curriculum_Briefing___Mathematics.pdf)
- [Odyssey Math Tuition — Primary 3 Addition and Subtraction](https://odysseymathtuition.com/primary-3-addition-and-subtraction/)
- [Odyssey Math Tuition — Primary 2 Addition and Subtraction](https://odysseymathtuition.com/primary-2-addition-and-subtraction/)
- [Primary Mathematics 3A (2022) contents — Rainbow Resource](https://www.rainbowresource.com/product/sku/014676)
- [Dimensions Math 3A — Classical Education Books](https://classicaleducationbooks.ca/product/singapore-dimensions-math-workbook-3a)

**Files read for this audit:**
- `/Users/adammurray/Documents/Claude/Projects/Jack Flash App/.claude/worktrees/continue-previous-session-467024/docs/add-spec.md`, `docs/place-value-spec.md`, `docs/wrong-answer-reveal-spec.md`, `docs/confidence-pass-spec.md`, `docs/mastery-fluency-spec.md`, `docs/fact-selection-policy.md`, `docs/fractions-spec.md`, `docs/connections-spec.md`
- `NOTES-next-modules.md`
- `src/modules/add.jsx`, `src/add-practice.jsx`, `src/shared/barComponents.jsx`, `src/modules/placeValue.jsx`, `src/place-value-practice.jsx`, `src/purchaseManager.js`, `src/constants.js`

**Problems found in the existing unshipped build** (all removed by the rewrite):
- `ColumnInput` auto-submits on the last digit and fills left to right.
- `TenFrame` prints "10 + n = total".
- `JumpStrip` prints every landing, including the final one.
- `TwoStepBarModel` prints "= value".

**Problems shared with the shipped Place Value screen** (flagged, not fixed here):
- Its readiness gate filters whole skills, including attempted items, not just new ones.
- A child in Concrete can never cross to mastered.
