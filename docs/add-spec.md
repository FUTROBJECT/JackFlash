# JackFlash Module Specification: **Add & Subtract** (Grades K–3 / Primary 1–3) — PHASED, TWO-TIER

**Author:** Curriculum agent · **Date:** 2026-06-20 · **Status:** Draft for review
**Audience:** React developer with no pedagogy background. Everything behavioral is spelled out.
**Reference module:** `src/modules/multiply.jsx` (canonical) · spec template: `docs/fractions-spec.md`, `docs/connections-spec.md`
**Shared components:** `src/shared/barComponents.jsx` (reuse — do not copy a fourth time)

---

## Scope verification notes (READ FIRST)

Checked against the MOE 2021 Primary Mathematics Syllabus (which think! Mathematics implements), cross-checked against existing JackFlash scope work in `docs/fractions-spec.md` / `docs/connections-spec.md` and current P1–P3 topic listings. The agreed two-tier scope was confirmed grade-accurate; no skill in the brief had to be dropped or relocated. Findings, item by item:

1. **Number bonds — confirmed Primary 1 core (and the spine of the whole module).** P1 builds number bonds in addition "up to 9 + 9" using concrete objects and pictorial models before formal notation. Number bonds are the Singapore foundation for both fact fluency *and* later regrouping, so they correctly lead Tier 1 and are reused as the regrouping scaffold in Tier 2.

2. **Make-ten — confirmed Primary 1/2.** "Making ten" / "making or breaking ten, adding to a ten or subtracting from a ten" is a P1–P2 mental strategy. Grade-appropriate as a Tier 1 strategy skill.

3. **Addition & subtraction facts within 20 — confirmed Primary 1, consolidated Primary 2.** Add/subtract within 20 with number bonds and 1-/2-step word problems is P1; mental calculation within 20 is P2. Correct as Tier 1.

4. **Fact families (inverse relationship) — confirmed P1/P2.** "Family of number sentences" (e.g. 7 + 5 = 12, 5 + 7 = 12, 12 − 7 = 5, 12 − 5 = 7) is an explicit syllabus item. Correct as Tier 1.

5. **Missing-addend — confirmed P1/P2.** Solving for the unknown in `7 + ☐ = 12` is part of the within-20 number-sentence work. Correct as Tier 1.

6. **Multi-digit addition & subtraction within 10,000 with regrouping — confirmed Primary 3 core.** P3 covers addition and subtraction up to 10,000 with and without regrouping ("carrying"/"renaming"), grounded in the part-whole concept and place value. Correct as Tier 2. (P2 caps at 1,000; the within-10,000 range is specifically the P3 advance — keep the upper bound at 9,999 and do not exceed it.)

7. **Mental-math strategies (add/subtract in parts, make-the-next-ten/hundred, near-doubles) — confirmed Primary 2/3.** P2–P3 expect mental strategies for 2-digit work (and the standard algorithm as the alternative). "Add/subtract in parts" and "make the next ten/hundred" are syllabus-named strategies. Correct as Tier 2. **Scope guard:** keep mental-math operands to 2-digit (and 2-digit + tens/hundreds) cases — full 4-digit mental arithmetic is not expected; 4-digit work is done by the algorithm.

8. **Bar-model word problems (part-whole and comparison) — confirmed Primary 3 core.** The part-whole and comparison bar models for one- and two-step word problems are central P3 method. Correct as Tier 2.

**Grade-label honesty:** This module spans P1 (Tier 1 facts) through P3 (Tier 2 within-10,000). The existing catalog stub labels it "Grades K–2"; the actual span is **K–3**. Recommend the module `grades` label read **"Grades K–3"** and the Parent Zone product `gradeRange` be updated from "Grades K–2" to **"Grades K–3"** (the within-10,000 algorithm and bar-model problems are genuinely P3). This is the only scope correction to existing data; flagged rather than silently shipped.

**No out-of-scope content is included.** Explicit exclusions are listed in §4. Notably: no numbers above 9,999, no decimals, no multiplication/division (that is the existing module), no 3-step word problems.

Sources: [MOE 2021 Primary Mathematics Syllabus P1–P6 (SEAB/MOE)](https://www.moe.gov.sg/-/media/files/primary/mathematics_syllabus_primary_1_to_6.pdf) · [Primary 1 Maths Curriculum — KooBits](https://sg.koobits.com/curriculum/primary-1) · [NOAM Singapore MOE 2021 Primary One Maths Syllabus](https://noam.elite.com.sg/) · [Addition and Subtraction — Primary 3 Mathematics (Geniebook)](https://geniebook.com/tuition/primary-3/maths/addition-and-subtraction) · [Mastering Addition and Subtraction Up to 10000 for Grade 3 (CliffsNotes)](https://www.cliffsnotes.com/study-notes/28246153) · existing `docs/fractions-spec.md` / `docs/connections-spec.md` scope work.

---

## How the existing machinery works (the parts this module reuses verbatim)

Confirmed by reading the code, so the developer reuses rather than reinvents:

- **Mastery storage** (`src/dataManager.js`): `profiles[].mastery[<moduleId>][itemKey] = { correct, attempts, lastSeen, masteredAt }`. `updateMastery(profileId, moduleId, factKey, isCorrect)` — correct `+1`; wrong `Math.max(0, correct − 1)`; `masteredAt` set when `correct >= DEFAULT_MASTERY_THRESHOLD` (=3) and cleared if it drops below. `getMastery(profileId, moduleId)` returns the per-module map (or `null`). **This module calls these unchanged with `moduleId: "add"`.**
- **Weighted draw** (`src/multiplication-practice.jsx`, `pickNewFact`, ~lines 196–277): per-fact categories — `struggling` (seen, 0 correct) weight 6 · `learning` weight `(threshold − level + 1) × 2` · `new` weight 3 capped at **MAX_NEW_FACTS = 3** unseen in rotation · `review` (Leitner `REVIEW_INTERVALS = [1,3,7,14,30]` days) weight 4 · `mastered` weight 1; plus the same-item anti-repeat guard. **Reused unchanged.** The new-item filter draws in pool order (per `docs/fractions-spec.md` §4) rather than any-3-unseen, which is how the tier gate and skill gates are implemented.
- **CPA modes**: `mode` state `concrete | pictorial | abstract`; pictorial fade `opacity = max(0.15, 1 − 0.3 × masteryLevel(itemKey))`; wrong answer in any mode forces the scaffold to full opacity plus a "because" line + hint + number bond; abstract-mode "Show me" restores the scaffold with no penalty. **Reused unchanged; per-skill scaffold selection switches on the item-key prefix** (as Fractions did) rather than on `operation`.
- **Entitlement gating** (`src/purchaseManager.js`): `isModuleFullyUnlocked("add")` (bundle owner or `module.add.full` purchased); `isContentAccessible("add", groupId)` (true if unlocked OR `groupId ∈ freeContent`); `isModuleLocked("add")` (true when no `freeContent` and not purchased). The `module.add.full` stub already exists (`available:false`). **This module ships with a non-empty `freeContent`, so unlike the capstone it is NOT fully locked — a parent can try Tier 1 before buying. See §11.**
- **Achievements** (`src/achievementEngine.js`): generic triggers `masterGroup` / `masterAll` assume multiplication-style table keys, so this module's mastery-based achievements go through the `checkExtraTrigger(triggerType, params, values)` fallthrough (the same path Fractions/Connections use). Icons are added to `MODULE_ACHIEVEMENT_ICONS`. See §10.
- **Shared visual components** (`src/shared/barComponents.jsx`): `NumberBond`, `MasteryDots`, `BarModel`, `TwoStepBarModel`, part-whole bonds, and the `dotPop`/`fadeSlideUp`/`splitGrow` animation idioms already exist. **Reuse them. New components needed (ten-frame, place-value-disc chart, part-whole/comparison bar with a missing-cell, column-algorithm grid) are added to `barComponents.jsx`, not copied into the practice file** (the file header explicitly says extract-don't-copy).

---

## 1. Module identity

| Field | Value |
|---|---|
| `id` | `add` |
| `name` | Add & Subtract |
| `grades` | "Grades K–3" (Tier 1 = P1/P2 facts; Tier 2 = P3 within-10,000) |
| `color` | suggest a warm "sum" accent the UI agent picks (e.g. a coral/red `#EF476F` family) — header chrome stays `COLORS.yellow` per the design-system rule in `NOTES-next-modules.md`; module identity lives in chips/accents |
| `description` | "Number bonds, facts to 20, and adding & subtracting big numbers up to 10,000 — with regrouping and bar models" |

Registers via `registerModule()` with the same definition shape as `multiply.jsx` / `fractions.jsx`: `groups`, `freeContent`, item pools (the `generateFacts`-equivalent), a per-skill scaffold map, `achievements`, and `checkExtraTrigger`. Practice screen is a sibling file `src/add-practice.jsx`; `App.jsx`'s `"practice"` case (which switches on `profile.activeModule`) gets one new branch. The module appears automatically in the `ModulePicker` (`src/ProfilePicker.jsx`) via `getModuleList()` — no nav work beyond the App.jsx branch.

---

## 2. The TWO TIERS and the TIER GATE (the module's defining structure)

The module is a **mastery-gated progression of two tiers**, analogous to the Connections capstone gate and the Fractions group ordering — but, unlike Connections, the gate is **purely internal to this module** (no cross-module reads): Tier 2 content enters rotation only once Tier 1 is largely mastered.

### The tiers
- **Tier 1 — Facts within 20** (P1/P2): number bonds, make-ten, +/− facts to 20, fact families, missing-addend. Groups **N, M, F, K, X** (§3).
- **Tier 2 — Within 10,000** (P3): multi-digit +/− with regrouping, mental-math strategies, bar-model word problems. Groups **R, S, W** (§3).

### The tier gate — `shouldAllowTier2(profileId)`
Mirrors the Connections `getConnectionsPrereqStatus` pattern (a single helper, null-guarded), but reads only `mastery.add`:

> **Tier 2 unlocks when ≥ 80% of all Tier 1 item keys have `correct >= DEFAULT_MASTERY_THRESHOLD`.**

Concretely (the developer implements one boolean):
```
tier1Keys = all item keys in Groups N, M, F, K, X   // enumerable, see §6
mastered  = tier1Keys.filter(k => (mastery.add[k]?.correct || 0) >= 3).length
shouldAllowTier2 = (mastered / tier1Keys.length) >= 0.80
```
- **Null-safety (required):** a brand-new profile has no `mastery.add` object — guard every read with `(mastery.add?.[k]?.correct || 0)`, exactly the class of bug behind the "Parent Zone child-card crash" fix. `getMastery` returns `null` for an unseen module.
- **80%, not 100%**, deliberately: requiring every single fact (including review-decayed ones) before any P3 work would stall an able child. 80% means the child is fluent with facts before tackling regrouping — which *depends* on those facts (3-digit column addition is repeated single-column number-bond work).
- **Mechanism (reuse, don't invent):** the gate is enforced by the existing new-item filter. While `shouldAllowTier2` is false, **Tier 2 items are excluded from the `new` category** (so they never enter rotation), exactly as Fractions §4 excludes later-skill items until their sub-gate is met. No new selection code beyond this filter.
- **Surfacing while gated:** the group selector shows Tier 2 groups in a **locked-but-visible** state with a progress readout ("Master your facts to 20 to unlock big-number adding" + a Tier 1 progress bar / `MasteryDots` summary), the motivational-payoff pattern Connections uses. A gated group is non-selectable into rotation. **This is an in-module skill gate, not a purchase gate** — it applies even to a fully purchased module (a paid child still earns Tier 2 by mastering Tier 1).
- **Decay:** if Tier 1 mastery later drops below 80% (wrong answers decaying facts), already-mastered Tier 2 items the child earned stay earned and stay in rotation; only *new* Tier 2 introductions pause until Tier 1 recovers — same decay behavior the capstone spec defines.

### Default tier/group on a new profile
A brand-new `add` profile starts with **Tier 1 only**, **Group N (number bonds) active**, mode `concrete`. This is the bottom rung of the CPA ladder (number bonds are the foundation of everything that follows).

---

## 3. Scope: tiers → groups → skills, ranges, and chapter mapping

Number ranges are hard caps. Every group has a fixed pedagogical order; the bar model / number bond is the unifying scaffold across both tiers (the part-whole bond a child meets in Group N is *literally the same diagram* used to explain regrouping in Group R and word-problem structure in Group W — that continuity is the point).

### TIER 1 — Facts within 20

**Group N — Number Bonds** *(free tier; P1; think! 1A number bonds)*
The foundation. A whole splits into two parts; the child supplies the missing piece.
- **N1. Bond a small whole** (whole ≤ 10): given whole + one part, give the other part. (e.g. whole 7, part 3 → 4.)
- **N2. Bond a teen whole** (whole 11–20): same, the within-20 bonds (e.g. whole 14, part 6 → 8).
- **N3. Decompose to ten** (the make-ten precursor): given a teen number, split it as `10 + ☐` (e.g. 13 → 10 + 3). Trains place-value-by-bond.

**Group M — Make Ten** *(P1/P2; the bridging strategy)*
The strategy that turns a hard within-20 fact into an easy one.
- **M1. Add through ten:** `8 + 5` → "8 needs 2 to make 10, 5 = 2 + 3, so 10 + 3 = 13." Addends each ≤ 9, sum 11–18, where one addend is 6–9 (so the bridge is non-trivial).
- **M2. Subtract through ten:** `13 − 5` → "13 − 3 = 10, then 10 − 2 = 8." Minuend 11–18, subtrahend such that crossing ten is required.

**Group F — Facts within 20** *(P1, consolidated P2; the fluency core)*
The full +/− fact set, the within-20 analog of the multiplication table.
- **F1. Addition facts to 20:** `a + b`, `a,b ≥ 0`, sum ≤ 20.
- **F2. Subtraction facts within 20:** `a − b`, `a ≤ 20`, result ≥ 0.

**Group K — Fact Families (inverse relationship)** *(P1/P2; the "family of number sentences")*
Makes the +/− inverse explicit — the within-20 sibling of multiply's Fact Family work.
- **K1. Complete the family:** given a part-whole trio (e.g. 5, 7, 12), the prompt shows three of the four sentences and asks for the fourth (e.g. shows `5+7=12`, `7+5=12`, `12−7=5`; asks `12−5=?`).
- **K2. Which fact undoes this?** given `5 + 7 = 12`, pick/produce the subtraction that reverses it (`12 − 7 = 5`). Trains "subtraction undoes addition."

**Group X — Missing Addend / Missing Number** *(P1/P2; the unknown in a sentence)*
- **X1. Missing addend:** `7 + ☐ = 12` → 5. (This is N2 in equation clothing; presented as algebra-readiness.)
- **X2. Missing minuend/subtrahend:** `☐ − 4 = 9` and `13 − ☐ = 8`. Both unknown positions.

### TIER 2 — Within 10,000 *(gated behind 80% Tier 1 mastery)*

**Group R — Regrouping Algorithm** *(P3 core; the column method)*
Multi-digit +/− with the standard algorithm, grounded in place value and number bonds (carrying = bonding a column total into the next place; borrowing = renaming one of the next place as ten of this place).
- **R1. 3-digit, no regrouping** (warm-up): `342 + 215`, `568 − 124`. Operands ≤ 999.
- **R2. 3-digit, regrouping:** `367 + 256` (carry), `503 − 178` (borrow, incl. across a zero). Operands ≤ 999.
- **R3. 4-digit, regrouping:** `3,475 + 2,896`, `6,002 − 3,547`. Operands ≤ 9,999, result ≤ 9,999 (addition) / ≥ 0 (subtraction).

**Group S — Mental-Math Strategies** *(P2/P3; reason it, don't column it)*
Same-answer-different-method drill. **Operands restricted to 2-digit (and 2-digit ± tens/hundreds) cases** per scope guard #7 — these are the cases the strategies are actually for.
- **S1. Add/subtract in parts:** `46 + 23` → "(46 + 20) + 3 = 66 + 3 = 69." Tens and ones split.
- **S2. Make the next ten/hundred:** `58 + 7` → "58 + 2 = 60, + 5 = 65"; `295 + 30` → "295 + 5 = 300, + 25 = 325."
- **S3. Near-doubles:** `7 + 8` → "double 7 is 14, + 1 = 15"; `25 + 26` → "double 25 = 50, + 1." (Doubles up to 50 + 51.)

**Group W — Bar-Model Word Problems** *(P3 core; the method, not just the answer)*
Short, one-sentence-per-line, 8-year-old reading level; answered with a single number; **the bar model is built/seen, not pre-shown** (see §5 pedagogy note).
- **W1. Part-whole, one step:** "There are 245 red apples and 178 green apples. How many apples in all?" (find whole) and the inverse "…420 apples, 178 are green, how many red?" (find a part).
- **W2. Comparison, one step:** "Ben has 320 stickers. Mia has 145 more than Ben. How many does Mia have?" (and the "fewer / how many fewer" variants).
- **W3. Two-step (part-whole + comparison chained):** "A shop had 1,250 pens. It sold 480. Then 200 more were delivered. How many now?" → 1,250 − 480 = 770, + 200 = 970. (Two operations, each modeled on one bar; this is the deepest Tier 2 item.)

### Explicit exclusions (do not build, do not generate)
- Numbers above **9,999**; negative results; decimals; fractions; money/measurement contexts requiring unit conversion.
- Multiplication or division (that is the existing module — never generate `×`/`÷` here).
- **Three-or-more-step** word problems (W3 is the two-step ceiling).
- 4-digit *mental* arithmetic (4-digit work is Group R's algorithm only).
- Estimation / rounding (a separate P3 strand — not in the agreed scope).
- Roman numerals, time, or any non-add/subtract P3 topic.

---

## 4. CPA stage behaviors per skill

Same three-way `mode` state and philosophy as the reference modules: **the visual is the meaning; the symbol is the shorthand; the child earns the right to drop the visual by demonstrating mastery and can always fall back.** Two scaffold *families* carry the module and deliberately echo each other so Tier 1 → Tier 2 reads as one idea:

- **The number bond** (`NumberBond` from `barComponents.jsx`) — the meaning of part-whole, used in N/M/F/K/X and reused as the carry/borrow bond in R and the structure bond in W.
- **The bar / place-value chart** — the ten-frame and place-value-disc chart in Tier 1/early Tier 2, and the part-whole / comparison **bar model** in W. (`BarModel`, `TwoStepBarModel` exist; a **ten-frame**, a **place-value-disc strip**, and a **missing-cell part-whole/comparison bar** are the new components added to `barComponents.jsx`.)

### Concrete mode — "touch the math" (visible always, full opacity, interactive)
- **N (number bonds):** the `NumberBond` diagram rendered with the missing node as a tappable/typeable slot; the child can also drag counters off a ten-frame into two groups to *build* the bond. The bond is manipulable before the answer is typed.
- **M (make-ten):** an **interactive two-row ten-frame**. M1: the first addend fills the frame; the child taps to "move" counters from the second addend up to fill the ten, and the leftover spills to a second frame — the "make ten, then add the rest" is performed, not narrated. M2: counters are removed down to ten, then below.
- **F (facts):** ten-frame(s) for the operands; the answer region is empty until the child counts/combines. Mastery-faded in pictorial.
- **K (fact families):** the `NumberBond` with all three numbers shown, and the **four number-sentence slots** around it; completing the family lights up the inverse arrow (add ↔ subtract) so the inverse is *seen*.
- **X (missing addend):** the bond with the whole and one part filled and the missing part as the answer slot — identical visual to N, framed as "find the missing piece."
- **R (regrouping):** an interactive **place-value-disc chart** (ones/tens/hundreds/thousands columns). The child taps to **trade 10 ones for 1 ten** (carry) or **break 1 ten into 10 ones** (borrow) — the regrouping is an action the child triggers, with the column number bond (`10 ones = 1 ten`) appearing as the trade happens. This is the §5 "in motion" rule: the disc trade is what the child does, then types the digit.
- **S (mental strategies):** a **number line / jump strip**: the child taps the jumps ("+20", "+3" or "+2 to 60, +5") and the running total updates. The strategy is the manipulation.
- **W (word problems):** the **bar model is built across beats**, not pre-shown (critical — see §5). The child first chooses bar type (part-whole vs comparison) via two big buttons (this is the discrimination skill), then the relevant cells fill; for W3 the two beats reveal in sequence (`TwoStepBarModel`).

### Pictorial mode (default for most groups) — "see it, then let it fade"
Same visuals, non-interactive, fading with the existing rule `opacity = max(0.15, 1 − 0.3 × masteryLevel(itemKey))`. The child may tap to dismiss for the current question (`userHidScaffold`). A never-seen item shows clearly; by 2-correct it is a ghost; mastered items are practiced essentially symbol-only.

### Abstract mode — "symbols only, rope back down"
No visual rendered. Two ways back, both already idiomatic: (1) wrong answer → scaffold reappears at full opacity automatically (§8); (2) a persistent **"Show me"** button renders the scaffold at full opacity for the current question only, **no mastery penalty** (understanding before memorization; the visual is never punished).

### Default mode per group on a new profile
- **`concrete`** for **N, M, R, W** (number bonds, make-ten, regrouping, and word problems are the genuinely new conceptual leaps — start hands-on, exactly as Fractions defaulted Group F and Connections defaulted Group I to concrete).
- **`pictorial`** for **F, K, X, S** (fact fluency / mental strategies, where the child already has the concept and is building speed — pictorial was the right default for multiplication too).

---

## 5. Pedagogical priorities honored (Singapore-faithful)

- **Number bonds are THE foundation.** Group N is the literal first thing a new profile sees, and the *same* `NumberBond` diagram is reused as the carry/borrow bond (R) and the part-whole structure bond (W). Fluency and regrouping are taught as the same idea at two scales.
- **The bar model carries word problems** (W), and the child **chooses the model type** before solving — that discrimination is the skill, not decoration.
- **The inverse relationship is explicit** (Group K) — the add↔subtract arrow lights up; fact families are a first-class group, not a footnote.
- **"In motion" CPA — the child performs the regrouping/bonding, never just sees the answer.** This is the lesson carried from Connections: pre-showing the answer structure was worse than letting the child trigger it. Therefore: the make-ten counters are *moved* by the child (M); the carry/borrow disc trade is *triggered* by the child (R); the word-problem bar is *built across beats* after the child *chooses the bar type* (W). The completed bar/answer structure is shown **only** as the wrong-answer scaffold (§8), never up front.

---

## 6. Problem-generation rules (with worked examples)

All pools are **finite, enumerable, and deterministic** — **no `Math.random()` in pool generation.** Item keys are persisted mastery units, so the pool must be byte-identical on every load. Each item has a canonical `add:`-prefixed `itemKey`; the key is the unit of mastery, so different visuals, shuffled choices, or display orders of the same item are the same key. Randomness is allowed **only** in (a) the weighted draw (`Math.random()` in `pickNewFact`), (b) choice-position shuffling at render via `useShuffledChoices`, and (c) which side an operand is displayed on — never in *which items exist*.

**Tier 1 is fully enumerated; Tier 2 must be a curated, bounded, deterministic set** (the within-10,000 space is far too large to enumerate — pick a fixed, hand-curated table of operand pairs that exercises every regrouping pattern, with no randomness).

### Item pools

| Skill | Pool definition (deterministic) | Approx. size | Answer type | `itemKey` form |
|---|---|---|---|---|
| N1 bond ≤10 | all `(whole, knownPart)`, whole 2–10, part 1..whole−1; commutative-collapsed | ~36 | single number typed | `add:bond:7=3+?` |
| N2 bond teen | all `(whole, knownPart)`, whole 11–20 | ~75 → **curate to ~40** | single number | `add:bond:14=6+?` |
| N3 decompose-to-ten | teens 11–19 → `10 + ?` | 9 | single number | `add:bond:13=10+?` |
| M1 add through ten | `a + b`, a,b ≤9, sum 11–18, max addend 6–9 | ~30 | single number | `add:mk10:8+5` (addends ascending) |
| M2 subtract through ten | `m − s`, m 11–18, crossing ten required | ~30 | single number | `add:mk10:13-5` |
| F1 add facts | `a + b`, sum ≤20, commutative-collapsed | ~120 → **curate to ~50** (all sums-to-10/20 family + crossings) | single number | `add:fact:7+8` |
| F2 sub facts | `a − b`, a ≤20, b≤a | ~120 → **curate to ~50** | single number | `add:fact:15-8` |
| K1 complete family | curated part-whole trios (a,b,a+b), the asked sentence varies | ~28 | single number | `add:fam:5,7,12:12-5` |
| K2 inverse fact | given `a+b=c`, produce the undo subtraction | ~20 | 4-choice tap (the family's four sentences) | `add:fam:inv:5+7` |
| X1 missing addend | `a + ? = c` and `? + b = c`, within 20 | ~40 | single number | `add:miss:7+?=12` |
| X2 missing min/sub | `? − b = c`, `a − ? = c`, within 20 | ~36 | single number | `add:miss:?-4=9` |
| R1 3-dig no-regroup | curated ~16 (add+sub) | 16 | **column input** (multi-field, see §12) | `add:col:342+215` |
| R2 3-dig regroup | curated ~24 covering carry, borrow, borrow-across-zero | 24 | column input | `add:col:503-178` |
| R3 4-dig regroup | curated ~24, every place exercised | 24 | column input | `add:col:6002-3547` |
| S1 add/sub in parts | curated ~20 (2-digit ± 2-digit) | 20 | single number | `add:mental:46+23` |
| S2 make next ten/hundred | curated ~20 | 20 | single number | `add:mental:58+7` |
| S3 near-doubles | curated ~16 (doubles 1..50, ±1) | 16 | single number | `add:mental:7+8nd` |
| W1 part-whole 1-step | curated ~18 (find-whole + find-part variants) | 18 | bar-type choice + single number | `add:word:pw:245+178` |
| W2 comparison 1-step | curated ~18 (more/fewer variants) | 18 | bar-type choice + single number | `add:word:cmp:320+145` |
| W3 two-step | curated ~16 | 16 | bar-type choice(s) + single number | `add:word:2s:1250-480+200` |

Module-wide ≈ 470 items (Tier 1 ≈ 280, Tier 2 ≈ 190). **Pool sizes are normative** (per `NOTES-next-modules.md`): curate to these counts, not fully enumerate Tier 1's combinatorial max.

**Commutative collapse:** `add:fact:7+8` and `add:fact:8+7` are the **same item** (addends stored ascending; display order may flip). Subtraction does not collapse. Bonds collapse on the part (`7=3+?` and `7=4+?` are *different* items — both parts are worth practicing — but `7=3+?` shown with the 3 on either side is one item).

### Worked examples

- **N2 (number bond, the foundation):** prompt **"14 = 6 + ☐"** with the `NumberBond` (whole 14 in yellow, part 6 in blue, missing node as slot). Concrete: drag 14 counters into two groups → 6 and 8. Answer 8. "Because" (wrong): *"14 splits into 6 and 8 — that's the number bond."*
- **M1 (make ten, in motion):** prompt **"8 + 5 = ☐"**, two ten-frames. Child moves 2 of the 5 counters to complete the first ten → frame shows 10, second frame shows 3 → 13. "Because": *"8 needs 2 to make 10. 5 is 2 and 3. So 10 + 3 = 13."*
- **K1 (inverse explicit):** prompt shows `5 + 7 = 12`, `7 + 5 = 12`, `12 − 7 = 5`, and **`12 − 5 = ☐`**; the child types 5; the add↔subtract arrow on the bond lights. "Because": *"The same three numbers make a family — subtraction undoes addition."*
- **R2 (regrouping, in motion):** prompt **"503 − 178"** in column form, place-value-disc chart below. Child cannot take 8 from 3 → taps to **borrow**: a ten breaks into ten ones (and, across the zero, a hundred breaks into ten tens first). The trade animates; the column bond `1 hundred = 10 tens` appears. Child fills the column digits → 325. "Because": *"You can't take 8 ones from 3, so rename a ten as 10 ones."*
- **W2 (comparison bar, child chooses model):** prompt **"Ben has 320 stickers. Mia has 145 more than Ben. How many does Mia have?"** Child taps **"Comparison"** (vs "Part-whole"); a two-bar comparison renders (Ben's bar, Mia's = Ben's + 145 extra cell); child types 465. Wrong-answer "because" shows the completed comparison bar.
- **W3 (two-step):** **"A shop had 1,250 pens. It sold 480. Then 200 more arrived. How many now?"** Beat 1: 1,250 − 480 = 770; beat 2: 770 + 200 = 970. `TwoStepBarModel` reveals beat 2 only after beat 1 is engaged.

### Difficulty ordering (the "new" trickle draws in this order)
1. **Tier/group order:** N → M → F → K → X **(tier gate)** → R → S → W. (Bonds before strategy before fluency before families/algebra; then the gate; then algorithm before mental before word problems.)
2. **Within a group:** smaller numbers / no-regroup before regroup; N1 before N2 before N3; R1 (no regroup) before R2 (3-digit regroup) before R3 (4-digit); W1 before W2 before W3.
3. **Skill sub-gates (same mechanism as the tier gate — exclude from `new` until met):**
   - No N2 until ≥ 60% of N1 mastered; no N3 until N1 mostly mastered.
   - No M2 until ≥ 60% of M1 mastered.
   - **No Tier-2 group at all until `shouldAllowTier2` (§2).**
   - Within Tier 2: no R2 until ≥ 60% of R1 mastered; no R3 until ≥ 60% of R2 mastered. No W2 until ≥ 60% of W1; no W3 until W1+W2 ≥ 60% (W3 chains both).

### Distractors / misconception diagnosis (single-number answers → surfaced in wrong-answer feedback §8; K2 is the only choice item, so its distractors are choices)
- **Make-ten "added the leftover wrong" (M):** if entered = sum ∓ 1, target *"Count the bridge again: how many to make 10, then how many left?"*
- **Forgot to carry (R addition):** if entered = correct minus 10/100/1000 in a column, target *"You bonded the column but forgot to carry it to the next place."*
- **Subtracted small-from-large per column (R subtraction, the classic):** e.g. `503 − 178` → enters `275` (did 8−3, 7−0, 5−1), target *"You can't take the bigger digit from the smaller one — rename first."* This is the single most important Tier-2 diagnosis.
- **Wrong operation in a word problem (W):** if entered = the *other* operation's result, target *"Re-read: is the total the answer, or one of the parts?"* (paired with the part-whole bond).
- **Did only step 1 (W3):** if entered = step-1 result, target *"Good start — that's step 1. Now do step 2."* (reuse the `TwoStepChip` hint from `barComponents.jsx`).
- **Comparison direction (W2):** if entered = the smaller bar instead of the "more than" total, target *"Mia has MORE — her bar is longer."*
- **K2 choices:** correct = the inverse subtraction; distractors = the *other* family member, the wrong-direction subtraction (`12 − 12`), and an off-by-one. Positions shuffle via `useShuffledChoices`.

---

## 7. The module's own mastery model

Identical machinery to the reference modules — no new persistence concepts.
- **Unit of mastery:** one `add:` `itemKey` (≈ 470 module-wide; counts per group in §6). Stored under `mastery.add`.
- **Criteria:** `correct >= DEFAULT_MASTERY_THRESHOLD` (3); wrong = −1 (floor 0); `masteredAt` set/cleared exactly as `dataManager.updateMastery` does. (Default threshold; the topic does not demand a different rule. The 80% **tier** gate is a coverage threshold across items, not a change to per-item mastery.)
- **Weighting:** reuse the existing categories/weights unchanged — struggling 6, learning `(3 − level + 1) × 2`, new 3 (≤ 3 unseen in rotation, drawn in §6 difficulty order), review-due 4 (Leitner `[1,3,7,14,30]`), mastered 1, plus the same-item anti-repeat guard.
- **Selection scope:** the child / Parent Zone selects which groups are active (Tier 1 groups always; Tier 2 groups only once `shouldAllowTier2`); the weighted draw runs over the union of active, unlocked groups. A "focus" selector focuses a single skill with kid-language labels ("Number bonds", "Make a ten", "Add facts", "Fact families", "Find the missing number", "Big-number adding", "Mental tricks", "Word problems").
- **Mode never gates mastery** (parity): a correct concrete answer counts the same as abstract.
- **Display:** the same `MasteryDots` (0–3) above each problem; a per-group mastery grid on the progress view with cells labeled by readable form ("14 = 6 + ?", "503 − 178", "Ben/Mia 320+145"), and a **Tier-1 coverage bar** showing progress toward the 80% Tier-2 unlock.

---

## 8. Wrong-answer / stuck behavior

Parity with the existing flow — wrong answer → streak resets, mastery −1, **scaffold at full opacity + "because" statement + hint + part-whole bond**, then "Next →". Module-specific content:
1. **Scaffold (always, full opacity, animated):** the item's visual in its answer-revealing state — the completed number bond (N/X), the make-ten counters resolving (M), the disc trade completing (R), the finished bar model (W). Reuse the staggered `dotPop`/`fadeSlideUp`/`splitGrow` idioms. **This is the only place the completed structure is shown** (§5 "in motion" rule).
2. **"Because" statement** — the per-skill templates above, always naming the *idea* ("that's the number bond", "rename a ten", "the same three numbers are a family", "is the total the answer or a part?").
3. **Hint** (the skip-count analog): for N/M/X the **number-bond ladder** chip strip; for R the **column-trade strip** (`10 ones → 1 ten`); for S the **jump strip** (`58 →[+2] 60 →[+5] 65`); for W the `TwoStepChip` / part-whole strip.
4. **Part-whole bond** (`NumberBond`, reused): for every group the whole and its two parts (for R, the column bond; for W, the part-whole structure of the problem).
5. **Targeted misconception override:** the diagnoses in §6 replace the generic "because" line when the entered answer matches a known error (especially the R subtraction small-from-large pattern).
6. **Stuck-before-answering:** abstract-mode "Show me" (proactive drop to full-opacity scaffold); pictorial tap-to-restore the faded visual. No penalty.

---

## 9. Difficulty progression + tier skill-gates (summary)

Trickle order N → M → F → K → X → **[tier gate ≥80%]** → R → S → W, with the per-group 60% sub-gates of §6. All gates use the one mechanism: exclude not-yet-eligible items from the `new` category in the weighted draw (already-mastered items always stay in rotation). The tier gate additionally drives the locked-but-visible Tier 2 group cards (§2).

---

## 10. Achievements

Mirror the existing naming pattern; module-specific triggers route through `checkExtraTrigger(triggerType, params, values)` (the generic `masterGroup`/`masterAll` assume `Nx i` table keys, so define new trigger types like `masterAddGroup`/`masterAddAll`/`tier2Unlocked` resolved in the module's `checkExtraTrigger`). Add icons to `MODULE_ACHIEVEMENT_ICONS`.
- **Bond Boss** (`add-bond-boss`, 🔗) — master Group N.
- **Ten-Maker** (`add-ten-maker`, 🔟) — master Group M.
- **Fact Flash** (`add-fact-flash`, ⚡) — master Group F.
- **Family Finder** (`add-family-finder`, 🔄) — master Group K (the inverse-relationship badge).
- **Mystery Number** (`add-mystery-number`, ❓) — master Group X.
- **Tier Two!** (`add-tier-two`, 🚪) — the **tier-unlock** badge, fired the moment `shouldAllowTier2` first passes (via `checkExtraTrigger`), celebrating that facts-to-20 are conquered (the §2 motivational payoff).
- **Regroup Ranger** (`add-regroup-ranger`, 🏗️) — master Group R.
- **Mental Math Whiz** (`add-mental-whiz`, 🧠) — master Group S.
- **Bar Model Builder** (`add-bar-builder`, 📊) — master Group W.
- **Add & Subtract Master** (`add-master`, 🏆) — module-wide mastery (`masterAddAll`).
- **Number-Bond Pro** (`add-bond-pro`, 💯) — counter badge, 50 correct number-bond items, via a `addItemCount`-style trigger in `checkExtraTrigger`.

---

## 11. Free-tier vs paid

Mirror multiply/fractions: a free slice lets a parent try the module before buying.

- **`freeContent: ["N"]`** — **Group N (Number Bonds) is the free tier.** Rationale: it is the foundational, lowest rung (parallel to multiply's free "2s, 5s & 10s" and fractions' free "Foundations"), it gives a genuine, satisfying slice (the whole point of number bonds is on display), and it is the natural on-ramp. Everything else (M, F, K, X, and all of Tier 2) is paid.
- Because `freeContent` is non-empty, `isModuleLocked("add")` is **false** — the module is selectable and visible to free users (unlike the fully-locked Connections capstone), and `isContentAccessible("add", "N")` returns true for everyone. Paid groups call `isContentAccessible("add", groupId)` and render locked-but-visible cards prompting a Parent Zone purchase, exactly as multiply's medium/hard groups do today.
- **Interaction of the two gates:** purchase gating and the Tier 2 skill gate are independent and both apply. A paid child still earns Tier 2 by mastering Tier 1 (the skill gate); a free child sees Tier 2 cards as *both* purchase-locked and skill-gated. **Edge case the developer must handle:** a free user can only practice Group N, which alone can never reach 80% of Tier 1 — so `shouldAllowTier2` will never pass for a free user. That is correct and intended (Tier 2 is paid), but the locked Tier 2 cards for a free user should show the **purchase** prompt as primary (not the "master your facts" prompt, which would be unreachable). Decide the message by: if not `isModuleFullyUnlocked("add")` → purchase prompt; else → skill-gate progress prompt.
- **Catalog correction:** the existing `module.add.full` stub `gradeRange: "Grades K–2"` should become **"Grades K–3"** and the `description` should mention the P3 within-10,000 work (e.g. *"Number bonds & facts to 20, plus adding & subtracting to 10,000 with bar models"*). Flip `available: true` when the module ships.

---

## 12. Implementation deltas the developer must know

1. **New answer type — the column-algorithm input (R group).** The single `<input type="number">` works for N/M/F/K1/X/S; the bar-type-choice + number works for W; but **R needs a multi-field place-value input** (one field per digit of the answer, optionally with small "carry/borrow" annotation slots). Build it on the **`FractionInputFields` pattern** (the established multi-field input idiom) — do **not** invent a new layout language. Declare an `answerType` per item (`"number" | "choice" | "column" | "barChoice+number"`) so the practice screen renders the right input, exactly as Fractions declares per-item answer types.
2. **Deterministic pools (hard rule).** No `Math.random()` anywhere in pool generation. Tier 1 enumerated-then-curated to the §6 sizes; Tier 2 hand-curated tables. Item keys are persisted — the pool must be identical on every load.
3. **Component reuse — add to `barComponents.jsx`, never copy.** Reuse `NumberBond`, `MasteryDots`, `BarModel`, `TwoStepBarModel`, `TwoStepChip`, `EqualShareStrip`. **New shared components to add there:** `TenFrame` (interactive, ≥44px tap targets, responsive — viewBox + width:100%, no fixed-px width per the 320px overflow lesson), `PlaceValueDiscChart` (interactive trade), `PartWholeBar` / `ComparisonBar` (a missing-cell bar model). The file header already mandates extract-don't-copy; this is the fourth consumer.
4. **Null-safety everywhere mastery is read.** `shouldAllowTier2`, the skill sub-gates, the locked-card progress readouts, and the achievement checks all read `mastery.add`, which is `null`/undefined for a new profile — guard with `(getMastery(id,"add")?.[k]?.correct || 0)`. This is the "Parent Zone child-card crash" bug class; the capstone's `getConnectionsPrereqStatus` is the null-guard pattern to copy.
5. **Tier gate = new-item filter, not a route block.** Implement `shouldAllowTier2` and excluded-Tier-2-from-`new` in the same place Fractions excludes later skills. Tier 2 group cards are visible-but-disabled (with the §2/§11 messaging logic), not hidden.
6. **Per-skill scaffold selection.** The practice screen switches scaffold by **item-key prefix** (`bond:`/`mk10:`/`fact:`/`fam:`/`miss:`/`col:`/`mental:`/`word:`), not by `operation` — the module exports a scaffold map, as Fractions does.
7. **Operation-family / model-type anti-repeat (optional polish).** When multiple groups are active, extend the existing same-item anti-repeat to avoid the same skill prefix back-to-back so practice actually interleaves. Selection-time filter only; does not touch persistence.
8. **Catalog edit:** update `PRODUCTS["module.add.full"]` `gradeRange` to "Grades K–3" and `description` (§11); flip `available` on ship.
9. **Play-test every answerType in every mode, including one wrong answer each, in the preview browser before calling it done** (the standing `NOTES-next-modules.md` QA step). Specifically watch: the **column input** (number-vs-string `correctAnswer` comparison — `evaluateAnswer` compares strictly; the multi-field answer must be assembled into the same type the pool stores), any **`while`-loop** in K2 choice generation (small families may not yield 4 distinct choices — the F2 infinite-loop bug recurrence risk), and the **W bar-type choice** flow (choosing the wrong model must not lock the child out of answering). Test at 375px **and** 320px (the ten-frame and disc chart are the new overflow risks).

---

**End of specification.** Recommended build order: Group N (free tier) first, then M/F/K/X to complete Tier 1, then implement `shouldAllowTier2` and the locked Tier-2 cards, then R → S → W behind the gate — shipping the foundation before the P3 algorithm/word-problem work, matching the agreed two-tier progression.
