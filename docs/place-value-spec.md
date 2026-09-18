# JackFlash Module Specification: **Place Value** (Grade 3 / Primary 3)

**Author:** Curriculum agent · **Date:** 2026-09-18 · **Status:** Approved for build (Adam, 2026-09-18: US number words, thousands comma, Groups B+V first)
**Audience:** React developer with no pedagogy background. Everything behavioural is spelled out.
**Template:** `docs/fractions-spec.md` (section-for-section).
**Binding companions (reuse as-is, do not reinvent):** `docs/mastery-fluency-spec.md`,
`docs/fact-selection-policy.md`, `docs/wrong-answer-reveal-spec.md` (rules R1–R7 +
Phase 2 — Fractions), `docs/confidence-pass-spec.md` (C1–C4).

> **The wrong-answer block described in `fractions-spec.md` §6 is dead.** It was replaced
> in Sept 2026 by the full-screen reveal: **picture + ONE derivation line whose answer is a
> blank token + the same item re-asked**. This spec writes to the reveal, never to §6.

---

## Scope verification notes

Checked against the MOE 2021 Primary Mathematics Syllabus (P1–P6, updated Oct 2025 — which
think! Mathematics implements) and P2/P3/P4 topic listings.

1. **Confirmed P3 core — "Whole Numbers: numbers up to 10 000".** The P3 learning outcomes
   are: counting in hundreds/thousands; **number notation, representations and place values
   (thousands, hundreds, tens, ones)**; **reading and writing numbers in numerals and in
   words**; **comparing and ordering numbers**; **patterns in number sequences**. Every skill
   the requester listed is inside this. think! Mathematics Grade 3A opens with the matching
   unit ("Numbers to 10,000").
2. **Confirmed: expanded form / composing & decomposing is in scope** as the representation
   half of "number notation and place values" (3,452 = 3,000 + 400 + 50 + 2). It is the
   syllabus's own bridge between the place-value chart and the numeral.
3. **Confirmed: number patterns ±1, ±10, ±100, ±1000** are the P3 "patterns in number
   sequences" outcome. Patterns that cross a place boundary (2,990 → 3,000) are the
   pedagogically load-bearing cases and are included deliberately.
4. **Flagged as P2, kept as a free bridge group — numbers to 1,000.** Reading, writing,
   place value and comparison **within 1,000** is a Primary 2 outcome. It is kept as the
   bottom rung of the CPA ladder inside **Group B (free)**, exactly as Fractions keeps its P2
   "Foundations" group free, and for the same two reasons: Singapore's spiral design expects
   the re-entry, and a free sample group drives conversion. It is review content, not the
   goal: B-group 3-digit items are a minority of each pool and always sort first.
5. **Excluded as P4 — rounding and approximation.** "Round 3,452 to the nearest 100", the ≈
   symbol, and estimation are Primary 4 outcomes. **Do not build, do not generate.** If the
   requester wants them, they belong in a later module.
6. **Excluded as P4 — numbers beyond 10,000.** The ten-thousands place, 5-digit numerals and
   "numbers up to 100,000" are P4. The number **10,000 itself** is the P3 ceiling and appears
   in exactly three curated items (§4: one word-form item, one comparison, one pattern
   endpoint) and **never on the disc chart** (ten thousand-discs is not a picture).
7. **Excluded — renaming for computation** ("1 thousand = 10 hundreds", "how many tens
   altogether in 3,452"). This is real P3 content but it lives in the **Add & Subtract**
   module's R group (carrying/borrowing) and duplicating it here would be scope creep and a
   second mastery unit for one skill. Flagged, not built.
8. **Excluded outright:** decimals and decimal place value (P4), negative numbers (secondary),
   Roman numerals (not in the syllabus), money/measure place-value conversions, column
   addition and subtraction (Add & Subtract module).

Sources: MOE 2021 Primary Mathematics Syllabus P1–P6 (Oct 2025 update) · think! Mathematics
Grade 3A contents (Shing Lee) · KooBits/Practicle P2, P3 and P4 syllabus listings.

### How the reference modules behave (one paragraph)

`multiply` and `fractions` share one machine: a **finite, curated, deterministic** item pool;
each item has a canonical `itemKey` that IS the persisted mastery unit
(`profiles[].mastery[moduleId][itemKey] = {correct, attempts, lastSeen, masteredAt}`);
3 credited corrects = mastered, a wrong answer is −1 (floor 0); the next item comes from a
weighted draw (struggling 6 / learning `(3−level+1)×2` / new 3 with ≤3 unseen in rotation,
drawn in pool order / review-due 4 on the 1/3/7/14/30-day Leitner ladder / mastered 1, plus a
1-back anti-repeat guard). CPA is a three-way mode: **Concrete** = the child manipulates the
model; **Pictorial** = the model is shown, fading with mastery
(`opacity = max(0.15, 1 − 0.3 × level)`), tap-to-dismiss, "Show me" to restore; **Abstract** =
symbols only with a "Show me" fallback. A first miss opens the full-screen reveal (R1–R7,
C1): one picture, one derivation line with the answer as a blank token, the same item
re-asked; the re-answer is **never logged**. A wrong answer submitted in under
`GUESS_MS` (1500 ms) is not a miss at all — it converts to "not sure", logs nothing, and puts
the picture up (C2). Place Value reuses all of it; this spec only defines what is
place-value-shaped.

---

## 1. Module identity

| Field | Value |
|---|---|
| `id` | `placeValue` |
| `name` | Place Value |
| `grades` | "Grades 2–3" (P2 bridge to 1,000; P3 core to 10,000) |
| `color` | `COLORS.purple` (`#B388FF`) — already mapped as `MODULE_COLORS.placeValue` in `src/constants.js`, per `docs/icon-style-spec.md` |
| `description` | "Read, build, stretch and compare numbers to 10,000 — with place-value discs" |
| Store price | $3.99 (catalog product `module.placeValue.full`), Group B free |

Group colours: `build` purple, `digits` blue, `expanded` orange, `compare` green (same
four-colour rotation Fractions uses).

*Known collision, do not fix here:* `src/modules/fractions.jsx` L846 ships `color:
COLORS.purple` on its own definition even though `MODULE_COLORS.fractions` is orange. Place
Value takes purple per the icon spec; **do not restyle the shipped fractions module.**

---

## 2. Scope: skills, ranges, and chapter mapping

**Global constraints.**
- Every number is a whole number in **0 – 10,000**. 4-digit numbers (1,000–9,999) are the
  core; 3-digit numbers (100–999) are the P2 bridge and appear only in Group B.
- 10,000 appears in exactly 3 curated items (§4) and never on the chart.
- No number ever has a leading zero. Zero **inside** a number (3,052 / 3,500 / 3,005) is
  deliberately over-represented: zero-as-placeholder is the module's headline misconception.
- Place codes used in itemKeys: `k` thousands, `h` hundreds, `t` tens, `o` ones.

Four groups, in fixed pedagogical order.

### Group B — Build & Read *(free tier; P2 bridge + P3 entry; think! 3A "Numbers to 10,000", opening lessons)*
- **B1. Read the chart.** Discs are on the place-value chart; the child types the number.
- **B2. Build the number.** Inverse of B1: given the numeral, the child puts the right number
  of discs in each column.
- **B3. Numeral → number word.** 3,452 → "three thousand four hundred fifty-two".
- **B4. Number word → numeral.** "four thousand twelve" → 4,012.

### Group V — Digit Values *(P3 core; "number notation and place values")*
- **V1. Which digit is in the ___ place?** (answer is a digit 0–9; zeros included.)
- **V2. What is that digit worth?** "In 3,452 the 4 stands for ___" → 400. The face-value /
  digit-value distinction, which is the single most common P3 error.
- **V3. Which place is it in?** "In 3,452, the 5 is in the ___ place" → tens.

### Group X — Expanded Form *(P3 core; compose & decompose)*
- **X1. Decompose with a blank.** 3,452 = 3,000 + 400 + ___ + 2.
- **X2. Compose.** 5,000 + 70 + 3 = ___ (zero places deliberately missing from the sum).
- **X3. Pick the expanded form.** 4-choice, distractors are named misconceptions (§4).

### Group C — Compare, Order & Patterns *(P3 core)*
- **C1. Compare two numbers** (greater or smaller — the direction is stated every time).
- **C2. Order three numbers**, always smallest → greatest.
- **C3. Number patterns.** 2,340, 2,350, 2,360, ___ — steps ±1, ±10, ±100, ±1000, including
  boundary crossings.

### Explicit exclusions (do not build, do not generate)
- **Rounding / estimation / the ≈ symbol** — P4.
- **Numbers above 10,000, the ten-thousands place, 5-digit numerals** — P4.
- **Renaming for computation** ("1 thousand = 10 hundreds", "how many tens altogether") —
  belongs to Add & Subtract's R group.
- **Column addition/subtraction, carrying, borrowing** — Add & Subtract module.
- Decimals and decimal place value; negative numbers; Roman numerals; ordinal numbers;
  money/measure conversions; "odd/even"; any word problem (Connections module).

`freeContent: ["build"]`.

---

## 3. CPA stage behaviours

Same three-way `mode` state (`concrete` / `pictorial` / `abstract`) and same philosophy: the
model is the meaning, the numeral is the shorthand; the child earns the right to drop the
model and can always fall back; **the visual is never punished.**

**The manipulative is the place-value disc chart** — four columns labelled Thousands ·
Hundreds · Tens · Ones (three columns for the 3-digit bridge items), each column holding
round discs stamped with their unit value (1000 / 100 / 10 / 1). Discs, not base-ten blocks:
think! moves to number discs at P3 precisely because a thousand-disc and a one-disc are the
same size — the *column*, not the size, carries the value. **Extend the existing
`PlaceValueChart` in `src/shared/barComponents.jsx`; do not invent a second chart** (§8).

A second representation, the **place-value strips** (Singapore arrow cards: nested cards
3,000 / 400 / 50 / 2 that slide apart and stack back together), is used only in Group X and
in B2's reveal. It is the picture of "a numeral is its places, added".

### The non-negotiable scaffold rule (applies to every mode and every skill)

> **The chart always shows the model; it never prints the answer as a numeral or a word.**
> Numerals that are *givens* (the number in the question, digits the child can already read
> on screen) print normally. Any numeral, digit, place name or word that **is** the answer —
> or part of it — renders as the `DerivationToken` **blank chip**, at the same width, from the
> moment the scaffold appears. Counting the discs is the work; copying a numeral is not.

A scaffold that shows the answer before the child answers is a defect, not a feature. This
has shipped as a bug twice (fractions' `= n/d` caption, division's "N groups" caption); the
builder must assume it will be checked item by item.

### Concrete mode — "touch the math"
Chart visible always, full opacity, interactive.
- **B1:** discs are pre-placed (the question); the child may **tap a disc to count it off** —
  tapped discs get a tick and a running count chip appears under the column. The column's
  digit chip stays blank until he answers.
- **B2:** the chart starts **empty**; each column has − / + stepper buttons (≥44px). The
  count chip under each column shows what *he* has placed (his own work, not a reveal). A
  "Check!" `BrutalButton` submits the four counts. Over-filling a column past 9 is allowed
  for one beat and shows the cream chip "A column only holds 9 — the next one is worth ten
  times more." (no auto-trade; trading is the Add module's job).
- **B3 / B4:** chart with discs (B3) or **empty chart with the word's phrase chips placed
  under the column each phrase names** (B4: "four thousand" under Thousands, "twelve"
  spanning Tens+Ones). B4's columns stay empty — the phrase→place mapping is the aid, the
  digits are the answer.
- **V1 / V2 / V3:** chart with discs. Tapping a column highlights it and shows its
  **value caption** ("4 discs × 100") with the product blank. For V3 the columns are **not**
  pre-highlighted — locating the digit is the task.
- **X1 / X2 / X3:** chart with discs plus the strips. The child can **tap** a strip to slide
  it out of the stack (tap toggles stacked/split). Tapping is the composition/decomposition
  made visible. In X2 the strips are given split and the assembled card is blank.
- **C1 / C2:** two (C1) or three (C2) charts, **stacked vertically, columns aligned, same
  column width** — this is non-negotiable; aligned columns are the compare procedure. Compact
  chart variant (§8) so three fit at 320px. The child taps the number card, not the chart.
- **C3:** two mini charts — the term before the blank, and the blank term — with a step chip
  between them ("+1 ten"), the changed column's count blank.

### Pictorial mode (default outside Group B) — "see it, then let it fade"
The same chart, non-interactive, below the question, with the shared fading rule reused
verbatim: `opacity = max(0.15, 1 − 0.3 × masteryLevel(itemKey))`. Tap the chart to dismiss it
for that item (`userHidScaffold`); "Show me" restores it at full opacity whenever it is
dismissed or below full opacity (C2). The strips fade with the chart.

### Abstract mode — "numerals only, with a rope back down"
No chart, no strips. Two ways back down, both existing: the persistent **"Show me"** button
(pre-answer, no mastery penalty, pulses after two consecutive unassisted misses), and the
automatic reveal on a miss (§6).

**Defaults for a new profile:** `defaultMode: "pictorial"`, `defaultModeByGroup: { build:
"concrete" }`. Group B is where the discs are the lesson.

---

## 4. Problem generation rules per skill

All pools are **finite, curated and deterministic** — built once from literal arrays or a
closed-form loop over a literal array, with **no `Math.random()` anywhere in pool
generation**. itemKeys are persisted mastery units: the pool must be byte-identical on every
load, in every session, forever. Numerals inside itemKeys are **unformatted** (no comma) so
keys stay parseable; commas are display-only (§8).

| Skill | Pool definition (curated, fixed) | Size | `answerType` | `itemKey` form |
|---|---|---|---|---|
| B1 read the chart | 8 three-digit (2 with a zero place) + 16 four-digit (5 with one zero, 2 with two zeros) | 24 | `singleNumber` | `pv:read:3452` |
| B2 build the number | **the same 24 numbers as B1** (inverse pair, the F1/F2 precedent) | 24 | `buildNumber` *(new)* | `pv:build:3452` |
| B3 numeral → word | 16 four-digit, incl. 4 "…thousand twelve"-type traps (a zero place spoken as a small number), 3 with a zero place, 1 = 10,000 | 16 | `choice4` | `pv:word:3452` |
| B4 word → numeral | 16 four-digit, incl. the same 4 trap shapes (different numbers) | 16 | `singleNumber` | `pv:num:4012` |
| V1 which digit | 20 items: 5 source numbers × 4 places, 2 of the 5 containing a zero | 20 | `choice4` | `pv:dig:3452:h` |
| V2 what is it worth | 24 items: 6 source numbers × 4 places; all digits distinct and non-zero | 24 | `choice4` | `pv:val:3452:h` |
| V3 which place | 16 items: 4 source numbers × 4 places; all digits distinct and non-zero | 16 | `choice4` (place-name cards) | `pv:place:3452:t` |
| X1 decompose | 24 items: 6 source numbers × 4 blank positions; 2 sources contain a zero place | 24 | `singleNumber` | `pv:exp:3452:t` |
| X2 compose | 24 addend sets; 10 of them omit at least one place (5,000 + 70 + 3) | 24 | `singleNumber` | `pv:comp:5073` |
| X3 pick the expansion | 16 four-digit numbers, 5 with a zero place | 16 | `choice4` | `pv:pick:3452` |
| C1 compare two | 28 pairs: 8 differ at thousands, 8 at hundreds, 6 at tens/ones, 4 with unequal digit counts (3-digit vs 4-digit), 2 zero-placeholder pairs (3,052 / 3,520). 20 ask "greater", 8 ask "smaller" | 28 | `tapTwo` | `pv:cmp:gt:3452,3520` |
| C2 order three | 18 triples, **always ascending**; 6 share their thousands digit, 4 share thousands + hundreds, 2 mix 3- and 4-digit numbers | 18 | `orderThree` | `pv:ord:2345,3452,3520` |
| C3 patterns | 32 items: 8 per step size (±1, ±10, ±100, ±1000), half counting up / half down; 10 of the 32 cross a place boundary; 6 have the blank in the middle rather than at the end | 32 | `singleNumber` | `pv:pat:2340+10@4` |

**Module total: 282 items** (B 80, V 60, X 64, C 78). Per-skill sizes sit inside the
16–40 normative band. **If the builder's enumeration produces more than the stated size,
curate down to the stated size — never ship the enumeration.**

**Key canonicalisation (what makes two presentations "the same fact"):**
- The key is the unit of mastery. Shuffled choice positions, a different CPA mode and
  left/right presentation are all **the same item**.
- `C1` keys store the two numbers **in ascending numeric order** and the direction (`gt`/`lt`)
  as part of the key; the presentation side is a fixed per-item flag in the pool (not random).
- `C2` keys store the three numbers **in ascending numeric order**; the on-screen tile order
  is a fixed `tileOrder` permutation stored on the item (deterministic, from the pool index).
- `C3` keys are `start`, signed `step`, `@blankIndex` over 5 positions.
- B1 and B2 are **different** items even for the same number (read vs build are different
  skills), and their keys differ by prefix.

**Difficulty ordering** (the "new items" trickle draws in this order, never randomly):
1. Within a skill: 3-digit before 4-digit; no-zero before one-zero before two-zero;
   thousands-place differences before hundreds before tens/ones (C1/C2); ±1000 and ±10 steps
   before ±100 before ±1 (C3); non-boundary before boundary-crossing.
2. Within a group, later skills are gated: no **B3/B4** item enters the frontier until
   ≥60% of B1+B2 items are mastered; no **C3** item until ≥60% of C1+C2 are mastered; no
   **X2/X3** item until ≥60% of X1 is mastered. (Implementation: filter the "new" category,
   exactly as fractions gates A3.)

**Distractors are named misconceptions**, never random numbers. Every `choice4` set is the
correct answer plus three of the following, positions shuffled once per item visit
(`useShuffledChoices` — never `Math.random()` in a render path):

| Misconception | Where | Example (source 3,452) |
|---|---|---|
| **Face value for digit value** | V2, X3 | "the 4 is worth **4**" |
| **Off-by-one place** | V2, V3 | 4 is worth **40** or **4000**; the 5 is in the *ones* place |
| **Reading the chart right-to-left** | V1, V3 | names the column counted from the wrong end |
| **Zero as nothing (place collapse)** | B3, X1, X2, X3, C1 | 3,052 written/read as **352**; expansion **3,000 + 50 + 2** offered as complete |
| **Zero digits transposed** | C1, C2, X3 | 3,052 vs 3,520 as the pair |
| **Longer numeral = bigger / digit count ignored** | C1, C2 | 987 chosen over 1,002 |
| **Left-to-right first-digit-only compare** | C1, C2 | 3,520 vs 3,452 decided on "5 > 4" without aligning places |
| **Small-number trap (zero place spoken)** | B3, B4 | "four thousand twelve" → **4,120** (or **412**) offered beside 4,012 |
| **Word-order trap** | B3 | "four thousand, two hundred" vs "two thousand, four hundred" |
| **Digit-sum expansion** | X3 | 3 + 4 + 5 + 2 |
| **Step applied to the wrong column** | C3 | 2,360 + 10 → **3,360** or **2,361** |
| **Boundary failure** | C3 | 2,990 + 10 → **2,900** or **3,900** |

For `tapTwo` (C1) the two cards *are* the choice set, so the misconception lives in **pair
selection**: at least 12 of the 28 pairs must defeat a digit-count or first-digit heuristic
(the 3-digit-vs-4-digit pairs and the shared-leading-digit pairs above).

---

## 5. Mastery model

**Identical machinery to the shipped modules. No new persistence concepts, no schema change.**

- **Unit of mastery:** one `itemKey` from §4 (282 module-wide; B 80 / V 60 / X 64 / C 78).
- **Criteria:** `correct ≥ 3` (`DEFAULT_MASTERY_THRESHOLD`); a wrong answer decrements by 1
  (floor 0); `masteredAt` set/cleared by `dataManager.updateMastery` exactly as today.
- **Weighted draw:** reuse unchanged — struggling 6, learning `(3 − level + 1) × 2`, new 3
  (≤3 unseen in rotation, drawn in the §4 difficulty order, subject to the §4 skill gates),
  review-due 4 on the 1/3/7/14/30-day Leitner ladder, mastered 1, 1-back anti-repeat guard.
  If `docs/fact-selection-policy.md`'s budget-based selector is ever generalised beyond
  `multiply`, Place Value inherits it; **do not write a third selector.**
- **Speed gate: NO.** Place Value is a conceptual module in the sense of
  `docs/mastery-fluency-spec.md` §2.1 — the syllabus sets no timed target for place value,
  and the item types are structurally slow for reasons that have nothing to do with
  understanding (a 4-digit typed answer is four keystrokes; `buildNumber` is up to 36 stepper
  taps; `orderThree` is three taps). A speed gate would permanently stall mastery on items
  Jack fully understands — the exact failure the fractions review ruled a blocker.
  **Mechanically: the practice screen passes no `responseMs` to `updateMastery`**, which
  waives gate 1 under the backward-compat rule. Log timings to the DEV console only.
- **Retrieval finish line (gate 2): YES**, unchanged. The answer that takes an item from 2 to
  3 must be unscaffolded (`scaffolded !== true` per the §3 visibility test). The
  finish-line on-ramp applies: at `correct === 2` in Pictorial with no parent mode-lock, the
  chart starts hidden behind "Show me". Parent mode-lock → `masteryGatesExempt`, both gates
  waived.
- **Mode does not gate mastery.** A correct answer in Concrete counts the same as in Abstract
  (subject only to gate 2's crossing rule).
- **Selection scope:** the child or Parent Zone picks active groups; the draw runs over the
  union of accessible active groups. The focus selector focuses one **skill** using the
  kid-language labels in §10.
- **Display:** the same `MasteryDots` (0–3); the header MASTERED pill is framed against the
  **working group** per C4 (first group in module order that is accessible and not yet fully
  mastered), e.g. `⭐ 6/80` / `BUILD & READ`. The Parent Zone progress grid reads from `pool`
  (already module-agnostic); each cell is labelled with the item's `display` string.

---

## 6. Wrong-answer reveal — per skill

Governed by `docs/wrong-answer-reveal-spec.md` R1–R7 + Phase 2, and
`docs/confidence-pass-spec.md` C1. Restated because the builder will get this wrong otherwise:

- **R1:** the first submit is the only logged record. The re-answer inside the reveal changes
  **nothing** — not mastery, not `attempts`, not `lastSeen`, not session stats, not
  achievements. Put the R1 paragraph as a comment above the retry handler.
- **C1:** while `retry.phase === "ask"`, **the answer is nowhere on screen**. One `tokenState`
  per reveal drives every slot: `done → "correct"` (green), `missed → "numeral"`, else
  `"blank"`. Givens — the question's numeral, the discs, the place headings, counts of
  columns that are *not* the answer — stay visible; counting them is the work.
- **R3:** one picture, one derivation line, the re-ask. Nothing else. No hint strip, no bond.
- **R2:** one phone screen at 375×667 with the keyboard up, no internal scrolling.
- Second miss: the answer fills on a yellow chip, line "Still tricky. Here it is — we'll come
  back to it.", auto-advance ~2.5 s, and the itemKey enters the **comeback slot** (served
  again within 3–5 draws, fully logged).

`[…]` is the token. Every picture below is the chart described in §3 at full opacity.

| Skill | Derivation line (one line, ≤2 lines at 375px) | Token | Reveal picture |
|---|---|---|---|
| B1 | `4 thousands, 0 hundreds, 5 tens, 2 ones → [4,052]` | numeral | chart with discs, per-column count chips shown (givens), no assembled numeral |
| B2 | **none — folded** (the answer is a build, not a number) | the four column count chips, all blank | empty chart **with the strips above the columns** (3,000 · 400 · 50 · 2, split) — the decomposition is the step he lacked; the counts stay his to place |
| B3 | `3 thousands, 4 hundreds, 52 → [three thousand four hundred fifty-two]` | word chip (wraps to 2 lines) | chart with discs and count chips |
| B4 | `four thousand → thousands column; twelve → 1 ten, 2 ones → [4,012]` | numeral | empty chart with the word's phrase chips under the columns they name |
| V1 | `Hundreds is the 3rd column from the right — count its discs → [4]` | digit | chart with discs; the asked column outlined; its count chip is the token, other columns' chips shown |
| V2 | `4 discs in this column, each worth 100 → [400]` | numeral | chart with discs, asked column outlined and its discs stamped 100 |
| V3 | `5 discs sit in the 2nd column from the right → [tens]` | word chip | chart with discs, **no** column outlined until the token resolves |
| X1 | `The tens column has 5 discs, each worth 10 → [50]` | numeral | chart with discs + strips, the blank strip empty |
| X2 | `3 thousands, 4 hundreds, no tens, 2 ones → [3,402]` | numeral | strips split above an empty assembled card; chart with discs below |
| X3 | `Every place gets its own value: thousands, hundreds, tens, ones → [3,000 + 400 + 50 + 2]` | wide chip holding the whole expansion | strips sliding apart from the numeral |
| C1 | `Same thousands (3). Hundreds: 4 against 5 → [3,520]` | the winning numeral | two aligned charts, discs, counts in both |
| C2 | `Thousands first: 2, 3, 3 → smallest is [2,345]` (counts in **tile order**) | the smallest numeral | three aligned compact charts in tile order |
| C3 | `Each step adds 1 ten disc → [2,370]` | numeral | two mini charts (term before the blank, blank term) with the step chip between |

**Re-ask and second miss, per answerType** — reuse the Phase 2 table verbatim:

| answerType | at re-ask | second-miss fill |
|---|---|---|
| `singleNumber` | line token blanks; the box empties and focuses after the delay; **a Check button is mandatory** (the iOS number pad has no Return key) | box filled with the correct numeral on yellow, disabled |
| `choice4` | line token blanks; his wrong pick greys `#EEE` @0.45 and disables; **same four positions, no reshuffle** | correct chip yellow + ink border, all disabled |
| `tapTwo` (C1) | line token blanks; **both cards stay live and undimmed**; prompt "Look at the charts. Tap your answer." | correct card yellow, other 0.45, both disabled |
| `orderThree` (C2) | tiles reset to white, un-numbered, same positions, all live; **one tap ends the re-ask**; prompt "Tap the smallest." | smallest tile yellow with a "1" badge, others 0.45, disabled |
| `buildNumber` (B2) | the four count chips on the picture blank; the **input chart resets to empty**, live | input chart auto-fills the correct discs (40 ms per-disc stagger, left column first), yellow frame, disabled |

Prompt everywhere else: **"Now you — use the picture."** No red, no shake, no ✗ inside the
reveal (R4). Picture caps: `choice4` / `tapTwo` / `orderThree` → `min(220px, 34dvh)`;
`singleNumber` → `min(150px, 24dvh)`; `buildNumber` → `min(140px, 22dvh)` (its input row is
four steppers plus Check). Use `fit="width"` — charts are width-driven.

---

## 7. "Not sure" path (C2) — what "Count the picture" means here

A wrong answer submitted **under `GUESS_MS` (1500 ms)** from the item becoming answerable,
when the picture has not already been requested, is **not a miss**: nothing is logged, the
input/selection clears, the chart appears at full opacity, and the cream chip reads
**"Not sure? Count the picture."** (shared copy — do not rewrite it). One conversion per
item; a later wrong answer with the picture up is a real miss and opens the reveal.

For this module, the picture that appears on conversion is the item's Concrete-mode chart
with **every count chip blank** — the discs are there to be counted, and counting them is
exactly the derivation the child skipped. Specifically:
- B1 / V1 / V2 / X1: discs visible, count chips blank, the asked column outlined (V1/V2 only).
- B2: empty chart + split strips (as in its reveal), counts blank.
- B3 / B4: chart with discs (B3) or word-phrase chips under their columns (B4).
- C1 / C2: the aligned charts, counts blank — the child compares by counting the leftmost
  column that differs.
- C3: the two mini charts and the step chip.

Also: "Show me" is available pre-answer in Abstract, and in Pictorial whenever the chart is
tapped-hidden or below full opacity; tapping it sets `pictureRequested` and, on a later
correct answer, bumps the session's `peeked` counter (Parent Zone "Helped" column). Tap
answer types (`choice4`, `tapTwo`, `orderThree`) convert on a fast wrong tap exactly like
typed ones; `buildNumber` effectively never converts (building takes longer than 1500 ms) —
that is correct and needs no special case. `buildNumber` and `orderThree` hold local tap
state, so the converted item must be remounted via the existing `retryResetKey` pattern.

---

## 8. Implementation deltas the developer must know about

These are the only places Place Value is not a clone of `fractions.jsx` +
`fractions-practice.jsx`. **All new props on shared components are opt-in and default off, so
the rendered markup of every shipped scaffold is unchanged** (the `DotArray totals`
precedent). `src/add-practice.jsx`'s R group must render byte-identically.

1. **Extend `PlaceValueChart` (`src/shared/barComponents.jsx` L678) — do not write a new
   chart.** Today it draws one disc per column with the digit printed on it. Add:
   - `mode: "digits" | "discs"` — default `"digits"` (today's behaviour, add.jsx unaffected).
     `"discs"` draws `count` discs per column, each stamped with its unit value, arranged in a
     5+4 two-row frame so 7 is readable without counting one by one.
   - `counts: [k, h, t, o]` — the disc counts (replaces `digits` in disc mode).
   - `countTokens: ["numeral" | "blank" | "correct" | "hidden", …]` — the per-column count
     chip state, rendered through the shared `DerivationToken`. This is how §3's no-pre-reveal
     rule is enforced.
   - `columns: 3 | 4`, `highlightPlace`, `valueCaption` (per-column "4 × 100 = ▢", value
     through `DerivationToken`), `compact` (disc r=6, column width 44, for C2's three charts),
     `interactive` + `onChange(counts)` (stepper buttons, ≥44px, for `buildNumber`),
     `emptyMarker` (an empty column draws a dashed pen outline, never blank space — zero is a
     thing, not an absence), `animate`.
   - Keep the responsive rule: `viewBox` + `width: 100%`, never a fixed px width. Verify at
     320px with four columns of nine discs.
2. **One new `answerType`: `buildNumber`** and one new input component `BuildNumberInput`
   (the `buildBar` analogue): an interactive `PlaceValueChart` in disc mode with −/+ steppers
   per column and a full-width "Check!" button. `correctAnswer` for these items is an **array
   of four numbers**; `evaluateAnswer` compares element-wise. **Coerce before any string ops
   — a number/string `correctAnswer` mismatch has shipped a crash and silent mis-scoring once
   already.** No other new answerType: `choice4`, `tapTwo`, `orderThree` and `singleNumber`
   cover everything else, and V3 uses `choice4` with place-name word cards.
3. **New shared component `PlaceValueStrips`** (arrow cards) in `src/shared/barComponents.jsx`:
   nested rounded cards 3,000 / 400 / 50 / 2, prop `split: boolean` (stacked → assembled
   numeral; split → four cards in a row) and `assembledToken` for the blank chip on the
   composed card. Tap toggles `split` when `interactive`. Used by X1–X3 and B2's reveal only.
4. **Comma formatting — decided (Adam, 2026-09-18): one rule, no exceptions.** Every 4-digit
   numeral **displayed to the child** carries a thousands **comma**: `3,452`, and also `3,000`
   inside an expanded form. Rationale: the comma is what Jack meets in his own school
   materials and in this app's market; MOE's thin-space convention (`10 000`) is unreachable from a numeric input
   and reads as two numbers to an 8-year-old. Consequences the builder must honour:
   - A single helper `formatNumber(n)` does all display formatting; nothing else formats.
   - **Never** in `itemKey`s, never in `correctAnswer`, never inside an input.
   - `singleNumber` inputs accept digits only (`inputMode="numeric"`,
     `WebkitAppearance: "none"`); strip any non-digit before comparison so a pasted "3,452"
     still evaluates. `correctAnswer` for `singleNumber` is a **Number** (fractions precedent).
5. **Number-word rendering — decided (Adam, 2026-09-18): US classroom convention**, which is
   what Jack's school uses: hyphenated compound tens-ones (`fifty-two`), **no "and"
   anywhere, no commas in words** — `three thousand four hundred fifty-two`; `four thousand
   twelve`; `three thousand five`; `three thousand five hundred`; `ten thousand`. A pure
   `numberToWords(n)` helper in `src/modules/placeValue.jsx` produces both the correct answer
   and the B3 distractors; the B3/B4 trap is the zero place spoken as a small number
   ("four thousand twelve" → 4,120 / 412 as distractors beside 4,012). Word cards in `choice4` wrap to
   three lines: min card height 64px, Space Grotesk 700, `clamp(13px, 3.8vw, 16px)`,
   black text, `overflowWrap: "anywhere"` — check at 320px.
6. **New practice screen `src/place-value-practice.jsx`**, a sibling of
   `src/fractions-practice.jsx`: same `retry { phase, value }` / `missCount` / `revealStage` /
   `comebackQueueRef` / `missedKeysRef` / `pictureRequested` / `nudge` state machine, same
   `WrongAnswerReveal` composition, same `buildPlaceValueLine(item, tokenState, retryValue)`
   returning a segment array for `DerivationLine` (`{t:"text"} | {t:"num"} | {t:"token"}`).
   Registration is an import side effect; add one branch to `App.jsx`'s `"practice"` case.
7. **Scaffold map** keyed by skill prefix → `"PlaceValueChart"` (B1–B4, V1–V3, C1–C3) or
   `"PlaceValueStrips"` (X1–X3, which render the chart *and* the strips).
8. **Purchases:** add `module.placeValue.full` ($3.99) to the `purchaseManager.js` catalog
   with `available: false` until launch, and its entitlement mapping. The All-Modules bundle
   card stays hidden until 3+ paid modules are `available` — **do not re-enable it here**.
9. Everything else — registry shape, `dataManager`, mastery maths, weighting, streaks,
   achievements plumbing, session recording, ModulePicker navigation, Parent Zone progress —
   is reused unchanged. **Do not refactor or restyle `multiply`, `fractions` or `add`.**

---

## 9. Achievements

Module-specific, registered on the definition; icons go in `MODULE_ACHIEVEMENT_ICONS`;
module-only triggers go through `checkExtraTrigger` (mirroring `checkExtraFractionTrigger`).
**No speed-based achievement** — Speed Demon was retired for confidence reasons (C3) and must
not come back in any form. The shared `comeback-kid` badge already covers persistence.

| id | name | trigger |
|---|---|---|
| `pv-disc-boss` | Disc Boss | master group `build` |
| `pv-digit-detective` | Digit Detective | master group `digits` |
| `pv-number-stretcher` | Number Stretcher | master group `expanded` |
| `pv-line-up-champ` | Line-Up Champ | master group `compare` |
| `pv-master` | Place Value Master | master every accessible item in the module |
| `pv-zero-hero` | Zero Hero | counter: 20 correct answers on items whose number contains a zero place (module trigger `pvZeroCount`) |

---

## 10. Kid-language skill labels (`skillLabels`)

| Code | Label |
|---|---|
| B1 | Read the discs |
| B2 | Build it |
| B3 | Say it in words |
| B4 | Write the number |
| V1 | Which digit? |
| V2 | What's it worth? |
| V3 | Which place? |
| X1 | Stretch it out |
| X2 | Put it together |
| X3 | Find the stretch |
| C1 | Which is more? |
| C2 | Put them in order |
| C3 | What comes next? |

---

## 11. QA (repo convention: static QA is not sufficient)

Drive the preview at **375×667 and 320×568**, in **every CPA mode**, answering **one item of
every answerType** (`singleNumber`, `choice4`, `tapTwo`, `orderThree`, `buildNumber`) with at
least one **wrong** answer each, plus one **second miss** each, plus one **fast wrong answer**
(<1500 ms) each to check the "not sure" conversion. Then:

1. **No pre-reveal, item by item:** for every skill in §6, confirm the pre-answer card shows
   no numeral, digit, place word or expansion that is the answer. B4's chart is empty. X2's
   assembled card is blank. V3 highlights nothing. C1/C2 highlight no winner.
2. **C1 inside the reveal:** during the re-ask, the answer is nowhere — line token blank,
   count chips blank, no outline that gives it away.
3. **R1 by storage:** after wrong → correct re-answer, `localStorage.jackflash_data` shows
   `correct` down exactly 1 and never back up, `attempts` +1 (first submit only), session
   total +1 / correct +0. After a converted "not sure", **nothing changed at all**.
4. `buildNumber` round trip: build, Check, over-fill past 9, second-miss auto-fill stagger,
   and the converted-"not sure" remount.
5. Number words render without clipping at 320px; commas appear on every 4-digit display and
   in no itemKey or input.
6. **Regression:** Multiply and Fractions unchanged (one wrong answer each, reveal works);
   `add-practice.jsx`'s R-group `PlaceValueChart` renders byte-identically.

---

**End of specification.** The build can start with Group B (free tier) and Group V, then X and
C behind the existing content gate, without any spec changes.

## Build plan (Adam, 2026-09-18)

**Pass 1 — Groups B and V** (what P3 opens with and what Jack is doing now): module
definition with the B and V pools, the practice screen, `PlaceValueChart` disc mode,
`buildNumber`, `App.jsx` routing, catalog entry. **Until launch pricing is wired, Group V
is listed in `freeContent` alongside B** so the test-drive build reaches it on the phone
(the native purchase provider is still a stub); the $3.99 gate moves V out of
`freeContent` at launch. **Pass 2 — Groups X and C**, no spec changes.

## As built — pass 1 (2026-09-18, Groups B + V, play-tested at 375×667 and 320×568)

Shipped: `src/modules/placeValue.jsx` (140 items: B1 24, B2 24, B3 16, B4 16,
V1 20, V2 24, V3 16 — deterministic literal pools, verified by executing the
pool builder), `src/place-value-practice.jsx`, `PlaceValueChart` disc mode +
`BuildNumberInput` + `PlaceValueStrips` in `src/shared/barComponents.jsx`
(add-practice's digits-mode call unchanged), `App.jsx` routing, three
achievement icons. `freeContent: ["build", "digits"]` until launch pricing.

Fixed in the main loop after the builder's static pass:
- **B1 reveal header printed the answer** (the "problem" slot restated the
  numeral). Now "What number is this?" — the picture is the problem.
- Disc rows are a 5-cell grid that fills the column (discs used to spill out
  of a four-column chart at 320px, then collapsed to dots once centred);
  column labels scale (`clamp(9px, 2.8vw, 11px)`) so "Thousands" fits.
- Stepper buttons stack vertically (+ above −): two 44px buttons don't fit a
  ~70px column at 375px.
- Strip cards carry the thousands comma (2,000, not 2000).
- V2's value caption wraps inside its column instead of clipping.
- B4's derivation line is "7 thousands, 8 hundreds, 1 ten, 3 ones → [7,813]"
  (two lines) — the picture already maps each phrase to its column.

Verified in the preview: B1 (slow miss → reveal with count chips as givens
and the numeral only in the token; recovery green; R1 by storage: attempts
+1, correct −1, assisted +1); B2 (empty chart, own counts, wrong build →
strips + blank counts, input reset; second miss → auto-fill on a yellow
frame, streak 0, mastery −1); B3 (US words, zero-place trap distractors,
reveal line ends in the token, wrong pick dimmed); B4 (phrase chips under
columns, no digits; reveal line); V1 (asked column outlined, its count blank;
reveal; recovery); V2 (caption "9 × 100 = ▢"; second miss fills 900); V3 (no
column outlined pre-answer or during the re-ask); Abstract "Show me" → chart,
correct answer logged as `peeked`; header "0/80 · BUILD & READ" → 47/80 as
items were seeded; no horizontal overflow at 320 on 3- or 4-column charts;
no console errors. The choice-card "not sure" conversion is the same code
path verified in Multiply and Fractions (grep-confirmed, not re-driven — the
driver can't tap within 1.5 s of an item appearing reliably).

Deferred to pass 2 (with X and C): discs are plain colour circles, not
stamped with their unit value (illegible at four columns × nine discs at
320px); B1's tap-to-count micro-interaction; V2's caption is always shown
rather than on tap; the §5 skill focus selector (neither Fractions nor this
screen ever calls `setFocusSkill` — the state exists, the UI doesn't); the
Parent Zone `lockedGroup` setting is not read by any module (pre-existing).
`pv-zero-hero` counts credited zero-place answers from mastery data, so a
profile seeded past 20 unlocks it on its first answer of any kind — fine for
real profiles, worth knowing when testing.

