# JackFlash Module Specification: **Fractions** (Grade 3 / Primary 3)

**Author:** Curriculum agent · **Date:** 2026-06-12 · **Status:** Approved for build
**Audience:** React developer with no pedagogy background. Everything behavioral is spelled out.

---

## Scope verification notes

What was confirmed and adjusted against the actual syllabus (MOE 2021 Primary Mathematics Syllabus, which think! Mathematics implements; cross-checked against the think! Mathematics Grade 3 table of contents and P2/P3 topic listings):

1. **Confirmed Grade 3 / P3 core:** equivalent fractions, writing a fraction in **simplest form**, **comparing and ordering unlike fractions**, and **adding/subtracting two *related* fractions within one whole** are the P3 fraction objectives. "Related fractions" has a precise meaning: one denominator is a factor of the other (e.g. ½ + ¼). The think! Mathematics Grade 3 textbook (3A, Unit 5 "Fractions") covers numerators/denominators, fractions on number lines, equivalent fractions, and whole numbers as fractions — matching this scope.
2. **Confirmed denominator limit:** at P3, denominators of given fractions **do not exceed 12**. This is a hard cap on every item pool in this spec.
3. **Adjusted — "unit fractions" and "fractions of a whole" are P2, not P3.** Recognizing/naming fractions of a whole, comparing unit fractions and like fractions, and adding/subtracting **like** fractions within one whole are Primary 2 objectives. They are **kept in scope as a "Foundations" on-ramp group** (this matches Singapore's spiral design and gives the CPA ladder a bottom rung), but they are flagged as review content, not the goal of the module.
4. **Adjusted — "fraction of a set/quantity" is Primary 4.** "¾ of 12 marbles" is **explicitly excluded** — it is a P4 objective. Same for mixed numbers, improper fractions, and adding *unrelated* unlike fractions (P4/P5).
5. **Adding/subtracting like fractions** is P2 — included as the bridge step inside the Add & Subtract group, immediately before the P3 *related*-fractions work.
6. All sums/differences stay **within one whole** (result ≤ 1), per the P3 objective.

Sources: MOE 2021 Primary Mathematics Syllabus P1–P6 · think! Mathematics Grade 3A contents (Shing Lee) · Practicle P2/P3 syllabus listings.

### How the existing Multiply & Divide module works (one paragraph)

The existing module (`src/modules/multiply.jsx` + `src/multiplication-practice.jsx` + `src/dataManager.js`) defines a finite pool of facts, each with a canonical `factKey` (e.g. `"6x2"`, `"12÷2"`). Each fact has a persisted record `{correct, attempts, lastSeen, masteredAt}`; a correct answer increments `correct`, a wrong answer **decrements it by 1** (floor 0), and a fact is **mastered at `correct ≥ 3`** (`DEFAULT_MASTERY_THRESHOLD`). The next problem is chosen by weighted random draw over the pool: *struggling* facts (seen, zero correct) weight 6, *learning* facts weight `(3 − level + 1) × 2`, *new* facts weight 3 but capped at **3 unseen facts in rotation at a time**, *review-due* mastered facts weight 4 (Leitner intervals 1/3/7/14/30 days), settled mastered facts weight 1, with an anti-repeat guard. CPA is a three-way mode: **Concrete** shows the visual scaffold (dot array / bar model) at full opacity always; **Pictorial** shows it fading with mastery (`opacity = max(0.15, 1 − 0.3 × level)`); **Abstract** shows symbols only. On a wrong answer — in any mode — the scaffold reappears at full opacity along with a "because…" statement, a skip-count hint, and a number bond, then the kid taps "Next." Answers are typed into a single numeric input; mastery dots above the problem show progress toward 3.

The Fractions module reuses every one of those mechanics; this spec only defines what is fraction-shaped about each.

---

## 1. Module identity

| Field | Value |
|---|---|
| `id` | `fractions` |
| `name` | Fractions |
| `grades` | "Grades 2–4" (P2 on-ramp, P3 core) |
| `color` | suggest `#B388FF` family or a new brand-palette pick (UI agent decides) |
| `description` | "Equal parts, equivalent fractions, comparing, and adding & subtracting — denominators up to 12" |

The module registers via `registerModule()` exactly like `multiply.jsx` and supplies the same shaped definition: `groups`, `freeContent`, `generateFacts`-equivalent, scaffold/hint components, and achievements. One structural difference is flagged in §7 (answer input) because fractions cannot be typed into a single number field.

---

## 2. Scope: skills, ranges, and chapter mapping

**Global constraint: every denominator in every item is ≤ 12.** Denominators used: 2, 3, 4, 5, 6, 8, 9, 10, 12 (7 and 11 appear only in Foundations naming and like-fraction items, since they have no factor partners for equivalence/related work).

Four groups (the module's analog of the multiplication table groups), in fixed pedagogical order:

### Group F — Foundations *(free tier; P2 review; think! Grade 2 Fractions / Grade 3A Unit 5 opening lessons)*
- **F1. Name the fraction of a whole.** A shape (bar or circle) is partitioned into `d` equal parts with `n` shaded; kid gives `n/d`. Unit fractions first (n = 1), then non-unit. Denominators 2, 3, 4 first; then 5, 6, 8; then 10, 12 (7, 11 sprinkled for naming only).
- **F2. Build the fraction.** Inverse of F1: given the symbol `n/d`, shade the right number of parts on an interactive bar.
- **F3. Compare unit fractions.** Which is greater, ⅓ or ⅕? (Teaches "more parts → smaller pieces.")
- **F4. Compare like fractions.** Which is greater, 3/8 or 5/8?

### Group E — Equivalent Fractions *(P3 core; think! Grade 3A Unit 5: "discovering equivalent fractions")*
- **E1. Spot the equivalent.** Given a pictured fraction, pick the equivalent one (e.g. ½ = 2/4).
- **E2. Missing number.** `1/2 = ?/8` or `2/3 = 4/?`. Multipliers ×2, ×3, ×4 only; result denominator ≤ 12.
- **E3. Simplest form.** Reduce e.g. 6/8 → 3/4. Source fractions limited to those whose simplest form has denominator ≤ 12 (trivially true) and which reduce in one visible step (÷2, ÷3, ÷4, ÷5, ÷6).
- **E4. Fractions on the number line.** Place/identify a fraction on a 0–1 number line. Identification only at first; placing is a concrete-mode interaction.

### Group C — Compare & Order *(P3 core)*
- **C1. Compare two unlike fractions** where denominators are *related* (one is a factor of the other: 2/3 vs 5/6) **or** comparable against the benchmark ½. No unrelated-denominator pairs requiring common-denominator computation beyond one conversion step.
- **C2. Order three fractions** (smallest→greatest or greatest→smallest, stated explicitly each time). Triples drawn from: all-like, all-unit, or related sets (e.g. ½, ¾, ⅝ — all convertible to eighths).

### Group A — Add & Subtract *(bridge = P2; core = P3; think! P3 "adding and subtracting related fractions")*
- **A1. Add like fractions** within one whole: `n/d + m/d`, `n+m ≤ d`. (P2 bridge.)
- **A2. Subtract like fractions** within one whole, including subtracting from a whole expressed as `d/d` (e.g. 1 − 3/8 presented as 8/8 − 3/8 with the conversion shown).
- **A3. Add two related fractions** within one whole: denominator pairs limited to (2,4) (2,6) (2,8) (2,10) (2,12) (3,6) (3,9) (3,12) (4,8) (4,12) (5,10) (6,12); sum ≤ 1. Exactly one fraction is converted, then it becomes a like-fraction addition.
- **A4. Subtract two related fractions** within one whole, same denominator pairs.

### Explicit exclusions (do not build, do not generate)
- Fraction **of a set/quantity** ("⅔ of 12") — P4.
- Mixed numbers and improper fractions (beyond `d/d = 1` as a whole) — P4.
- Adding/subtracting **unrelated** unlike fractions (⅓ + ¼) — P5.
- Multiplying/dividing fractions — P4–P6.
- Results greater than 1; denominators above 12; decimals; percentage links.

`freeContent: ["foundations"]`, mirroring how only the easy multiplication group is free.

---

## 3. CPA stage behaviors

Same three-way `mode` state as the existing module (`concrete` / `pictorial` / `abstract`), same philosophy: **the visual is the meaning; the symbol is the shorthand. The kid earns the right to drop the visual by demonstrating mastery, and can always fall back.**

The module's primary visual is the **fraction bar** (rectangle partitioned into equal parts), because it is the direct ancestor of the Singapore bar model the kid already knows from division. The **circle** is a secondary variant used in Foundations naming items (~⅓ of them) so "fraction" doesn't get welded to one shape. The **number line** appears only in E4 and as a comparison overlay. All three are supplied as the module's scaffold components, selected per skill (parallel to how `multiply.jsx` ships both `DotArray` and `BarModel` and the practice screen picks by operation).

### Concrete mode — "touch the math"
Visible **always, at full opacity, and interactive**. The kid can answer *by manipulating the model* where the skill allows:
- **F1/F2:** a bar with tappable segments. Tapping toggles shading. In F2 the shaded count *is* the answer (a "Check!" button submits the model state). In F1 the model is pre-shaded and the kid answers with the symbol.
- **E1/E2/E3:** **two stacked bars of identical length.** Top bar shows the given fraction shaded. Bottom bar starts as one whole; a "split" stepper cuts it into 2/3/4/6/8/12 parts as the kid taps. When the shaded amounts line up edge-to-edge, the equivalence is visible. The kid still submits the symbolic answer, but the model can be fiddled with freely first.
- **C1/C2:** all bars rendered **at the same length, left-aligned, vertically stacked** (this is non-negotiable — equal wholes is the concept). Kid taps the bigger one / drags to order.
- **A1–A4:** one bar per addend with shading, plus a result bar underneath. For related fractions, tapping the coarser bar subdivides it live (½ visibly becomes 2/4) before the parts combine. The "because both pieces are now quarters" moment must be *seen*.

### Pictorial mode (default, as in the existing module) — "see it, then let it fade"
The same visuals, **non-interactive**, rendered below the question, with the existing fading rule reused verbatim: `opacity = max(0.15, 1 − 0.3 × masteryLevel(itemKey))`. A never-seen item shows the picture clearly; by 2-correct it is a ghost; mastered items are practiced essentially symbol-only. The kid may tap the visual to dismiss it for that question (existing `userHidScaffold` behavior).

### Abstract mode — "symbols only, with a rope back down"
No visual is rendered. Two ways back down, both already idiomatic in the app:
1. **Wrong answer** → scaffold appears at full opacity automatically (existing behavior, §6).
2. **"Show me" button** (small, persistent, bottom of the card): one tap renders the pictorial scaffold at full opacity for the current question only. No mastery penalty — consistent with the existing app, where concrete-mode correct answers count fully. Understanding before memorization means the visual is never punished.

Mode is the kid's choice (as today), but the **default for a brand-new Fractions profile is `concrete`** for Group F and `pictorial` elsewhere — fractions are this kid's first encounter, unlike multiplication where pictorial was already the right default.

---

## 4. Problem generation rules per skill

All pools are **finite and enumerable** (like the multiplication fact table), generated once per group/skill selection. Every item has a canonical `itemKey` (the `factKey` analog) — *the key is the unit of mastery*, so two presentations with different visuals or shuffled choices are still the same item.

| Skill | Pool definition | Approx. size | Answer format | `itemKey` form |
|---|---|---|---|---|
| F1 name | all proper `n/d`, d ∈ {2,3,4,5,6,7,8,10,11,12}, curated to ~36 (all of d ≤ 6, sampled for d ≥ 7) | 36 | 4-choice tap | `name:3/4` |
| F2 build | same fractions as F1, d ≤ 12 | 36 | shade the bar (model submit) | `build:3/4` |
| F3 unit compare | all pairs `1/a` vs `1/b`, a<b ≤ 12, curated ~16 | 16 | tap one of two cards | `ucmp:1/3,1/5` (ascending-denominator order; presentation side randomized) |
| F4 like compare | pairs `n/d` vs `m/d`, curated ~16 | 16 | tap one of two | `lcmp:3/8,5/8` |
| E1 spot equivalent | base ∈ {1/2, 1/3, 2/3, 1/4, 3/4, 1/5, 2/5, 3/5, 4/5, 1/6, 5/6}, multiplier 2–4, target d ≤ 12 | ~24 | 4-choice tap | `equiv:1/2=2/4` |
| E2 missing number | same bases; blank is numerator or denominator (two item variants) | ~30 | single number typed (reuses existing input!) | `emiss:1/2=?/8` / `emiss:2/3=4/?` |
| E3 simplify | every non-simplest `n/d`, d ≤ 12, one-step reduction: 2/4, 2/6, 3/6, 4/6, 2/8, 4/8, 6/8, 2/10…8/10, 3/9, 6/9, 2/12…10/12 | ~21 | fraction input (n and d, two fields) | `simp:6/8` |
| E4 number line | identify the marked point; lines partitioned in d ∈ {2,3,4,5,6,8,10,12} | ~20 | 4-choice tap | `nline:3/4` |
| C1 compare | curated ~28 pairs: related-denominator pairs + ½-benchmark pairs | 28 | tap one of two (or "equal" third button for equivalent pairs — include 4 such items) | `cmp:2/3,5/6` |
| C2 order | curated ~14 triples (like / unit / related) | 14 | drag-to-order three tiles (or tap-in-sequence) | `ord:1/2,5/8,3/4` |
| A1 add like | `n/d + m/d ≤ 1`, d ∈ {3,4,5,6,8,10,12}, curated ~26 | 26 | fraction input | `addL:1/4+2/4` |
| A2 sub like | curated ~26, incl. 6 items of form `1 − n/d` shown as `d/d − n/d` | 26 | fraction input | `subL:5/8-2/8` |
| A3 add related | denominator pairs from §2, sum ≤ 1, curated ~26 | 26 | fraction input | `addR:1/2+1/4` |
| A4 sub related | same pairs, curated ~26 | 26 | fraction input | `subR:3/4-1/2` |

**Commutative collapse:** `addL:1/4+2/4` and `addL:2/4+1/4` are the **same item** (key stores addends in ascending order; display order randomizes). Same for compare pairs.

**Answer-acceptance rule for A1–A4:** the like-denominator answer is the canonical correct answer (e.g. ¼ + ¼ → 2/4 is **correct**). If the kid instead enters the simplified form (½), **also correct** — simplification is rewarded, never required, at P3. Both forms increment the same item's mastery.

**Difficulty ordering** (the "new facts" trickle draws in this order):
1. Within each skill, items are pre-sorted easiest→hardest: smaller denominators first; unit before non-unit; ×2 equivalences before ×3/×4; halves-family (2,4,8) before thirds-family (3,6,12) before fives (5,10).
2. Within each **group**, skills unlock sequentially: e.g. in Group A, the engine introduces no A3 item until at least 60% of A1+A2 items are mastered. (Implementation: when filtering the "new" category, exclude later-skill items until the gate is met.)

**Distractor construction (for all tap-choice items)** — distractors are *named misconceptions*, not random numbers. Each choice set contains the correct answer plus three of:
- **The inverted fraction** (d/n) — tests symbol order. (F1, E4)
- **Parts-unshaded fraction** ((d−n)/d) — counted the white parts. (F1, E4)
- **Add-everything error** for equivalence: e.g. n+1/d+1. (E1)
- **Bigger-denominator-is-bigger** trap: for compare items the two cards *are* the choices, so the distractor is built into pair selection — at least half the C1 pool must have the correct answer be the fraction with the *smaller* denominator or smaller numerator, so digit-comparison heuristics fail.
- **Added-denominators error** for A-group: 1/4 + 2/4 → 3/8. Since A-group uses typed fraction input rather than choices, it appears instead in the **wrong-answer diagnosis** (§6): if the kid's entered denominator equals d+d, show the targeted "denominators name the pieces, they don't get added" scaffold.
- Distractor positions shuffle every presentation; the choice set itself is regenerated per presentation (so the item, not the choice layout, is what's memorized).

---

## 5. Mastery model

**Identical machinery to the existing module — no new persistence concepts.** Differences are only in what an "item" is.

- **Unit of mastery:** one `itemKey` from §4 (≈ 330 items module-wide; per-group counts: F ≈ 104, E ≈ 95, C ≈ 42, A ≈ 104).
- **Criteria:** `correct ≥ 3` (the shared `DEFAULT_MASTERY_THRESHOLD`); wrong answers decrement by 1 (floor 0); `masteredAt` set/cleared exactly as in `dataManager.updateMastery`.
- **Weighting:** reuse the existing categories and weights unchanged — struggling 6, learning `(3 − level + 1) × 2`, new 3 (≤ 3 unseen items in rotation, drawn in the §4 difficulty order rather than randomly), review-due 4 on the 1/3/7/14/30-day Leitner ladder, mastered 1, anti-repeat guard.
- **Selection scope:** the kid (or Parent Zone) selects which groups are active, exactly like enabled tables; the weighted draw runs over the union of active groups' pools. The "focus" selector focuses a single **skill** (F1, E2, A3…), and the focus buttons display skill labels in kid language ("Make a match!", "Missing number", "Add the parts").
- **Mode does not gate mastery** (parity with existing app): a correct answer in concrete mode counts the same as in abstract mode.
- **Mastery display:** the same `MasteryDots` (0–3) above each problem; the same per-group mastery grids on the progress view, with item cells labeled by their symbolic form (e.g. "½=?/8").

---

## 6. Wrong-answer / stuck behavior

Parity with the existing flow — wrong answer → streak resets, mastery −1, **scaffold at full opacity + "because" statement + hint + part-whole bond**, then a "Next →" button. The fraction-specific content of each element:

1. **Scaffold (always, full opacity, animated):** the skill's concrete visual rendered in its *answer-revealing* state — bars aligned, subdivisions drawn, correct region pulsing. For compare items, both bars same-length-aligned with the larger shaded region highlighted. For A3/A4, an animated three-beat: (a) the coarse fraction's bar subdivides, (b) the renamed fraction label appears (½ → 2/4), (c) parts combine into the result bar. Reuse the existing `dotPop`-style staggered animation idiom.
2. **"Because" statement**, one template per skill:
   - F1/F2: "because 3 out of 4 equal parts are shaded — that's ¾"
   - E2/E1: "because ½ × 2/2 = 2/4 — same amount, smaller pieces"
   - E3: "because 6/8 ÷ 2/2 = ¾"
   - C1: "because ½ = 2/4, and 3/4 > 2/4"
   - A3: "because ½ = 2/4, so 2/4 + 1/4 = ¾"
3. **Hint component** (the skip-count analog): the **"same-pieces" strip** — a horizontal strip showing the relevant fraction family with the key conversion highlighted in the yellow chip style (e.g. for A3: `½ → 2/4 → [3/4]`; for E-group: the ×2/×3/×4 ladder `½ → 2/4 → 3/6 → 4/8` with the target chip highlighted).
4. **Part-whole bond** (the NumberBond analog): a bond diagram showing the whole `1` (or the sum) splitting into the two fractional parts — for A-group items this is literally the existing NumberBond with fraction labels; for F-group it shows `n/d` and `(d−n)/d` composing 1.
5. **Targeted misconception override:** for A-group typed answers, if `enteredDenominator = d₁ + d₂`, replace the generic "because" line with: "Careful — fourths plus fourths are still **fourths**! The bottom number names the size of the pieces." with the scaffold emphasizing that piece size didn't change.
6. **Stuck-before-answering:** the abstract-mode "Show me" button (§3) is the proactive version of this same drop-back; in pictorial mode the kid can also tap the faded visual once to restore it to full opacity for the current question (tap toggles).

---

## 7. Implementation deltas the developer must know about

These are the only places the Fractions module *cannot* be a pure clone of `multiply.jsx`:

1. **Answer input:** the single `<input type="number">` works for E2 only. The module needs (a) a **two-field stacked fraction input** (numerator over a rendered vinculum over denominator) for E3/A1–A4, (b) a **4-choice tap grid** for F1/E1/E4, (c) **tap-one-of-two/three cards** for F3/F4/C1, (d) **order-three tiles** for C2, and (e) **tap-to-shade bar submit** for F2 (concrete mode). The module definition should declare `answerType` per item so the practice screen can render the right input.
2. **Fraction rendering:** all fraction symbols render as stacked numerator/vinculum/denominator (not "3/4" inline) in the big question style, mirroring the vertically stacked equation layout already used.
3. **Per-skill scaffold selection:** the practice screen currently switches scaffold by `operation`; here it switches by skill prefix of the `itemKey`. The module exports a scaffold map rather than exactly two components.
4. **Skill-gated "new item" ordering** (§4): the new-fact filter draws in pool order instead of any-3-unseen.
5. Everything else — registry shape, mastery storage, weighting, streaks, achievements plumbing, session recording, Parent Zone surfacing — is reused unchanged.

---

## 8. Achievements

Mirror the existing naming pattern: per-skill "tamer" badges (e.g. **Equal-Parts Expert** for F-group skills, **Match Maker** master E1, **Simplest Sleuth** master E3, **Fair Judge** master C-group, **Piece Keeper** master A1+A2, **Family Blender** master A3+A4), four **Group Clear** badges, one **Fraction Master** for module-wide mastery, and one counter badge (**Renamer Pro** — 50 correct related-fraction items, the analog of Fact Family Pro).

---

**End of specification.** The build can start with Groups F and E (free tier + first paid group) and ship C and A behind the existing content-gating without any spec changes.
