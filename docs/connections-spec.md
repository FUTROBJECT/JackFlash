# JackFlash Module Specification: **Mixed Practice / Connections** (Capstone) — Grade 3 / Primary 3

**Author:** Curriculum agent · **Date:** 2026-06-17 · **Status:** Draft for review
**Audience:** React developer with no pedagogy background. Everything behavioral is spelled out.
**Reference module:** `src/modules/multiply.jsx` (canonical) · `src/modules/fractions.jsx` (sibling) · spec template: `docs/fractions-spec.md`

---

## Scope verification notes (READ FIRST — one item needs a product decision)

Checked against the MOE 2021 Primary Mathematics Syllabus (which think! Mathematics implements) and cross-checked against the existing `docs/fractions-spec.md` scope work and current P3 syllabus listings.

1. **Two-step multiplication/division word problems are confirmed P3 core.** P3 covers multiplication and division of whole numbers (tables 2–10) including two-step word problems and problems with remainders. The interleaving and two-step-integration content below is squarely grade-appropriate.

2. **CONFLICT FLAG — "fraction of a set / fraction of a quantity" is Primary 4, not Primary 3.** This is the agreed *flagship* anchor for the module, but it is above grade level. The existing `docs/fractions-spec.md` already excluded it explicitly (its §2 "Explicit exclusions": *"Fraction of a set/quantity ('⅔ of 12') — P4."*), and the syllabus re-check agrees: P3 fraction objectives are equivalent fractions, simplest form, comparing/ordering, and adding/subtracting *related* fractions within one whole (denominators ≤ 12). "Fraction of a set" does not appear in the P3 objective list. It is **not silently included and not silently dropped.** Per the design direction, it is kept as the flagship — but constrained to a defensible **P3-as-bridge form** so it is honest about being a connector built from skills the child has already mastered, not a new P4 procedure. The constraints (below) are the mechanism that keeps it grade-appropriate:

   - **Unit fractions of a set only** at the introductory level (1/2, 1/3, 1/4… of a quantity), because "1/3 of 12" *is* exactly the division "12 ÷ 3" the child has already mastered — it is presented as a new *reading* of a known operation, not a new operation. This is the Singapore-true bridge: the bar model makes "1/3 of 12 = 12 ÷ 3 = 4" visible.
   - **Non-unit fractions of a set** (e.g. 3/4 of 12) are the *upper* difficulty band and require two mastered operations (÷ then ×). They are the genuine "two-step integration" and sit at the very top of the ladder.
   - **Every quantity must divide evenly by the denominator** (no remainders inside fraction-of-a-set; remainders stay in the pure-division interleave pool only). Quantities ≤ 60, denominators ≤ 6 for fraction-of-a-set items.

   **Product decision — RESOLVED (2026-06-17):** ship the flagship as-is, **labeled "Grade 4 stretch / enrichment" in all parent-facing copy** (Parent Zone catalog entry, module description, locked-card subtitle). Rationale: the fraction-of-quantity bridge is the only content type that genuinely unifies all three source modules, and it is gated behind *full* P3 mastery of Multiply/Divide/Fractions — so a child who reaches it has exhausted the P3 material and is being shown a connection built entirely from facts they have already mastered, not taught a new P4 procedure cold. The "Grade 4 stretch" label keeps parent-facing scope honest (consistent with the transparent gating model and the fractions spec's own P4 exclusion) without sacrificing the pedagogical summit. Kid-facing copy stays in plain language ("Fraction of a group"); only parent-facing surfaces carry the grade label.

3. **Module-internal mastery units are NEW capstone item keys, prefixed `mix:`** — they never collide with `multiply`/`fractions` keys (per `NOTES-next-modules.md`: prefix item keys per skill). The capstone draws on the same three source modules conceptually but stores its own mastery under `profiles[].mastery.connections`.

Sources: [MOE / SEAB Primary 3 syllabus (Practicle)](https://practicle.sg/primary-3-math/) · [Primary 3 Mathematics — The Singapore Syllabus](https://thesingaporesyllabus.com/subjects/primary-3-mathematics) · [New Singapore MOE Math Syllabus P1–3 (SparkEdu)](https://blog.sparkedu.com/blog/2024/04/24/new-moe-math-syllabus-primary-1-3/) · existing `docs/fractions-spec.md` scope work.

---

## How the existing machinery works (the parts this module reuses verbatim)

Confirmed by reading the code, so the developer can reuse rather than reinvent:

- **Mastery storage** (`src/dataManager.js`): `profiles[].mastery[<moduleId>][itemKey] = { correct, attempts, lastSeen, masteredAt }`. `updateMastery(profileId, moduleId, factKey, isCorrect)` — correct `+1`; wrong `Math.max(0, correct − 1)`; `masteredAt` set when `correct >= DEFAULT_MASTERY_THRESHOLD` (=3) and cleared if it drops below. **This module calls it unchanged with `moduleId: "connections"`.**
- **Weighted draw** (`src/multiplication-practice.jsx` lines ~191–263): per-fact categories `struggling` (seen, 0 correct) weight 6 · `learning` weight `(threshold − level + 1) × 2` · `new` weight 3 capped at **MAX_NEW_FACTS = 3** unseen in rotation · `review` (Leitner 1/3/7/14/30 days) weight 4 · `mastered` weight 1, plus an anti-repeat guard. **Reused unchanged.**
- **CPA modes**: `mode` state `concrete | pictorial | abstract`; pictorial fade `opacity = max(0.15, 1 − 0.3 × level)`; wrong answer in any mode forces the scaffold to full opacity plus a "because" line + hint + number bond. **Reused unchanged; the scaffold is the bar model for every item type in this module.**
- **Entitlement gating** (`src/purchaseManager.js`): `isModuleFullyUnlocked(moduleId)` (true if bundle owned or `module.<id>.full` purchased); `isModuleLocked(moduleId)` (true when no `freeContent` and not purchased); `isContentAccessible(moduleId, groupId)`. Modules register a `PRODUCTS["module.<id>.full"]` entry. **This module adds one product and one extra gate (mastery), described in §3.**
- **Achievements** (`src/achievementEngine.js`): `masterGroup` / `masterAll` compute mastery by iterating expected item keys and checking `correct >= threshold`; unknown trigger types fall through to the module's `checkExtraTrigger(triggerType, params, values)`. **This module's cross-module unlock condition is computed with a new `checkExtraTrigger`-style helper (§3).**

---

## 1. Module identity

| Field | Value |
|---|---|
| `id` | `connections` |
| `name` | Mixed Practice |
| `grades` | "Grade 3 — Capstone" |
| `color` | a distinct "summit" accent the UI agent picks (suggest a gold/amber that reads as a capstone, e.g. `#FFB703` family) — must still use header chrome `COLORS.yellow` per the design-system rule in `NOTES-next-modules.md` |
| `description` | "Put it all together — fractions, multiplication & division connected by the bar model" |

Registers via `registerModule()` with the same definition shape as `multiply.jsx`/`fractions.jsx`: `groups`, `freeContent` (**empty** — see §3), item pools, a scaffold map, `achievements`, and `checkExtraTrigger`. Practice screen is a sibling file `src/connections-practice.jsx`; `App.jsx`'s `"practice"` case gets one new branch.

**This is a capstone tier, not a free "mix any modules" toggle.** There is no UI to pick arbitrary module combinations. The module is a single curated experience that becomes available only when prerequisites are met.

---

## 2. Scope: skills, ranges, and chapter mapping

The module has three groups, in fixed pedagogical order. **Integration leads; interleaving is the supporting drill.** The bar model is the unifying scaffold across all three.

### Group I — Fraction of a Quantity *(FLAGSHIP / Integration; "fraction of a set" bridge, see scope flag #2)*
The summit type. A whole quantity is shown as one bar; a fraction names part of it; finding the value *requires* division (and, for non-unit fractions, a follow-up multiplication). The bar model is what makes the connection visible.

- **I1. Unit fraction of a quantity.** "1/3 of 12 = ?" → bar of 12 split into 3 equal parts → one part = 12 ÷ 3 = 4. Denominators 2, 3, 4, 5, 6; quantity divisible by denominator; quantity ≤ 60; **answer is a single whole number**. This is the bridge: it *is* a division the child has mastered, re-read as a fraction.
- **I2. Non-unit fraction of a quantity (two-step integration).** "3/4 of 12 = ?" → bar of 12 split into 4 parts (÷4 = 3 each), then take 3 parts (×3 = 9). Two mastered operations, unified. Same ranges as I1; numerator < denominator.

### Group T — Two-Step Word Problems *(Integration; P3 core multiplication/division word problems)*
Genuine two-step problems requiring the child to choose and chain operations, each modeled with a bar. These are word-problem-shaped (short, one-sentence-per-line, 8-year-old reading level) but answered with a single number.

- **T1. Two multiplicative steps.** e.g. "4 bags. Each bag has 6 apples. They are shared equally onto 3 plates. How many apples on each plate?" → 4 × 6 = 24, then 24 ÷ 3 = 8.
- **T2. One multiplicative step + a fraction-of-quantity step.** e.g. "There are 5 boxes of 4 pencils. 1/2 of the pencils are red. How many are red?" → 5 × 4 = 20, then 1/2 of 20 = 10. (This is the deepest unification of all three source topics; gated to the end — see §5.)

### Group S — Shuffle Drill *(INTERLEAVING; secondary)*
Single-operation items drawn from the three source topics, shuffled together so the child must decide *which* kind of problem it is before solving. This trains discrimination, the skill that disappears when you drill one operation at a time. **All items here are restricted to facts/items the child has already mastered in the source modules** — interleaving is for fluency and discrimination, not first learning.

- **S1. Mixed × / ÷** (drawn from mastered `multiply` facts).
- **S2. Mixed fraction items** (drawn from mastered `fractions` items — compare/equivalent/add-related, presented in their native answer format).
- **S3. Full shuffle** (S1 + S2 + one I1 item type interleaved): the broadest discrimination set.

### Explicit exclusions (do not build, do not generate)
- Fraction-of-a-quantity with **remainders** or non-divisible quantities (kept in pure-division interleave only).
- Fraction-of-a-quantity denominators > 6 or quantities > 60.
- Three-step problems; problems requiring written algorithms beyond mastered facts.
- Any source-module item the child has **not** mastered (the capstone never teaches a source skill from scratch — see the GATE).
- Arbitrary "pick your own module mix" UI.

`freeContent: []` — the module has no free tier (it is a capstone; the gate in §3 is stricter than purchase alone).

---

## 3. The mastery GATE (exact unlock conditions)

The module is unavailable, then available, based on **two independent layers that must BOTH pass.** The developer implements this as one boolean helper, `isConnectionsUnlocked(profileId)`, used wherever the module would be listed/entered (the `ModulePicker` in `src/ProfilePicker.jsx`, the `App.jsx` practice branch, and any home-screen surfacing).

### Layer 1 — Purchase / entitlement (reuses `purchaseManager.js` exactly)
Add a catalog entry mirroring the others:

```
"module.connections.full": {
  id, name: "Mixed Practice — Capstone", moduleId: "connections",
  type: "module_unlock", available: false  // flip true when module ships
}
```

Purchase layer passes when `isModuleFullyUnlocked("connections")` is true (bundle owner, or this product purchased). Because `freeContent` is empty, `isModuleLocked("connections")` is true until purchased — so it behaves like Fractions does today (gated behind a Parent Zone purchase). The new product appears in the Parent Zone catalog automatically via `getProductsWithStatus()`, and `bundle.all` unlocks it like every other module.

**Fractions-purchase dependency:** the capstone's content depends on the child having *mastered* Fractions, which is only reachable if Fractions itself was unlocked. So the existing "Fractions gated behind a Parent Zone purchase" requirement is satisfied transitively by Layer 2 (you cannot master a module you never unlocked). No special-case code needed beyond Layer 2.

### Layer 2 — Cross-module mastery (the capstone condition)
The module unlocks ONLY after **Multiplication, Division, AND Fractions are each independently mastered.** Computed with the same logic `achievementEngine.js` uses for `masterAll`, applied across modules:

- **Multiplication mastered:** every `multiply`-module multiplication fact key (`"{t}x{i}"`, t ∈ tables 2–10, i ∈ 1–10) has `correct >= DEFAULT_MASTERY_THRESHOLD` in `mastery.multiply`.
- **Division mastered:** every division fact key generated by `multiply.jsx`'s `generateFacts` for `operation: "divide"` (the `"{product}÷{factor}"` keys) has `correct >= threshold` in `mastery.multiply`. (Multiplication and Division live in one module but are *independent* operation sets — the gate checks each set separately, matching the design direction "each independently mastered.")
- **Fractions mastered:** every `itemKey` in the Fractions module pools (all groups F/E/C/A per `docs/fractions-spec.md`) has `correct >= threshold` in `mastery.fractions`.

`isConnectionsUnlocked = Layer1 && multiplyMastered && divideMastered && fractionsMastered`.

**Surfacing while locked:** the module card shows in a locked state with a progress readout ("Master Multiply, Divide & Fractions to unlock") and three checkmarks that fill in as each prerequisite completes — this is the motivational payoff of a capstone. Do not let a locked card be tappable into practice. (Note the recent "fix Parent Zone child-card crash" commit: the locked-state card must tolerate a profile with `mastery.fractions` / `mastery.multiply` undefined — guard every mastery read with the same null-safety, since a brand-new profile has no mastery object yet.)

### The module's OWN mastery (distinct from the gate)
Once unlocked, the capstone tracks its own per-item mastery under `mastery.connections` using its `mix:`-prefixed keys (§4), identical 3-correct rule. See §6.

---

## 4. CPA stage behaviors

Same three-way `mode` state and same philosophy as the reference modules: **the bar model is the meaning; the symbol is the shorthand; the child earns the right to drop the visual and can always fall back.** What is special here: **the bar model is the single unifying scaffold for every item type** — it is literally how the three topics connect, so it never gets replaced by a different visual family. (Reuse `FractionBar` / `TwoStackedBars` from `src/fractions-practice.jsx` and the `BarModel` idiom from `multiply.jsx`; extract to a shared file rather than copy a third time, per `NOTES-next-modules.md`.)

### Concrete mode — "touch the math"
Bar visible **always, full opacity, interactive.** Per group:
- **I1/I2 (fraction of a quantity):** one bar labeled with the total quantity. A "split" stepper cuts it into `d` equal parts (the child taps to split — this *is* the ÷ step made physical). Each part auto-labels with `quantity ÷ d`. For I2 the child taps to **select `n` parts**; the selected region sums and shows `n × (quantity ÷ d)`. The child still types the final number, but can manipulate first.
- **T1/T2 (two-step):** a **comparison/part-whole bar pair** is built across two beats — first bar models step 1 (e.g. groups-of), result becomes the total of the second bar which models step 2. Each beat reveals after the previous is engaged, so the chaining is seen, not just stated.
- **S (interleave):** the source item renders with its native scaffold inside the shared bar idiom (× items → grouped bar; ÷ items → divided bar a la `BarModel`; fraction items → fraction bar). The discrimination cue is intentionally *not* given away — the bar appears only after answer/"Show me," so the child first decides the type.

### Pictorial mode (default) — "see it, then let it fade"
Same bars, non-interactive, fading with the existing rule `opacity = max(0.15, 1 − 0.3 × masteryLevel(itemKey))`. The child may tap to dismiss for the current question (`userHidScaffold`).

### Abstract mode — "symbols only, rope back down"
No bar rendered. Two ways back, both idiomatic:
1. Wrong answer → bar reappears at full opacity automatically (§7).
2. Persistent "Show me" button → renders the bar at full opacity for the current question only, no mastery penalty.

**Default mode for a new Connections profile:** `pictorial` for Groups S and T; **`concrete` for Group I** (fraction-of-a-quantity is the child's first time *re-reading* division as a fraction, so it starts hands-on, exactly as Fractions defaulted Group F to concrete).

---

## 5. Problem-generation rules (with worked examples)

All pools are **finite, enumerable, deterministic** (no `Math.random()` in pool generation — item keys are persisted mastery units, so the pool must be byte-identical on every load; this is the `NOTES-next-modules.md` rule the Fractions builder learned the hard way). Each item has a canonical `mix:`-prefixed `itemKey` — the key is the unit of mastery, so different visuals or shuffled choices of the same item are the same key.

**A critical generation constraint unique to this capstone:** every item must be built from **source facts/items the child has already mastered.** Pool generation filters against `mastery.multiply` and `mastery.fractions` at draw time so the capstone never surprises the child with an unmastered sub-fact. (The gate guarantees full mastery at unlock, but a later mastery decay — a wrong answer dropping a fact below 3 — should remove dependent capstone items from the *new/learning* draw until the source fact recovers. Mastered capstone items already earned stay earned.)

| Skill | Pool definition | Approx. size | Answer format | `itemKey` form |
|---|---|---|---|---|
| I1 unit-fraction-of-quantity | `(1/d) of q`, d ∈ {2,3,4,5,6}, q a multiple of d, q ≤ 60, curated to clean cases | ~30 | single number typed (reuses existing numeric input) | `mix:fracqty:1/3of12` |
| I2 non-unit-fraction-of-quantity | `(n/d) of q`, same d/q rules, 1 < n < d | ~34 | single number typed | `mix:fracqty:3/4of12` |
| T1 two multiplicative steps | curated chained (×,÷) or (×,×) templates over mastered tables, results whole | ~28 | single number typed | `mix:2step:Mxq_Ddiv` (encodes the two operands/ops, canonical order) |
| T2 multiplicative + fraction-of-qty | curated `(a×b)` then `(1/d) of result`, result whole, d ∈ {2,3,4} | ~22 | single number typed | `mix:2step:Mxq_F1/d` |
| S1 mixed ×/÷ | the child's **mastered** multiply/divide fact keys, mirrored as capstone items | dynamic (≤ mastered set) | single number typed | `mix:drill:6x7` / `mix:drill:42÷6` |
| S2 mixed fraction | the child's **mastered** fraction item keys, native formats | dynamic | native (choice / fraction fields) | `mix:drill:cmp:2/3,5/6` … |
| S3 full shuffle | union of S1 + S2 + I1 keys | dynamic | per source item | (as above) |

**Worked example — I1 (flagship, unit fraction of a quantity):**
Prompt: **"1/3 of 12 = ?"**, bar of 12 above. Concrete: tap-split into 3 → each part labels "4" → answer 4. "Because" (on wrong): *"12 split into 3 equal groups — each group is 12 ÷ 3 = 4."* This is the pedagogical heart: the child literally sees that finding a unit fraction of a set IS division they already own.

**Worked example — I2 (two-step integration):**
Prompt: **"3/4 of 12 = ?"**. Bar of 12, split into 4 (each = 3), select 3 parts → 3 × 3 = 9. "Because": *"One quarter of 12 is 12 ÷ 4 = 3. Three quarters is 3 × 3 = 9."* Two mastered operations, one bar.

**Worked example — T2 (deepest unification):**
Prompt: **"There are 5 boxes. Each box has 4 pencils. Half of the pencils are red. How many pencils are red?"** Bar beat 1: 5 × 4 = 20. Bar beat 2: 1/2 of 20 = 10. Answer 10. This single item exercises multiplication, the fraction-of-quantity bridge, and (implicitly) division — the summit of "connecting the three topics."

**Worked example — S3 (interleaving / discrimination):**
Consecutive draws might be `6 × 7`, then `which is greater, 2/3 or 5/6?`, then `48 ÷ 8`, then `1/4 of 20`. No two adjacent items share an operation type (anti-repeat guard extended to *operation family*, not just item key — see §6). The skill being trained is reading the problem and deciding *what to do*, which single-topic drilling never exercises.

**Difficulty ordering (the "new" trickle draws in this order):**
1. Group order: **I1 → I2 → T1 → S1/S2 → T2 → S3.** Integration before interleaving (design direction "lead with integration"); within integration, single-operation-family (I1) before genuine two-step (I2, T1), with the triple-topic T2 and the broadest shuffle S3 last.
2. Within I1/I2: smaller denominators and smaller quantities first; halves/quarters family before thirds/sixths before fifths.
3. **Skill-gate:** introduce no I2 item until ≥ 60% of I1 is mastered; no T1 until I-group is largely mastered; no T2 until T1 ≥ 60% and I2 fully mastered (T2 depends on the fraction-of-quantity bridge being solid). Implement by excluding later-skill items from the "new" category until the gate is met (same mechanism `docs/fractions-spec.md` §4 specifies for Group A).

**Distractors / misconception diagnosis (single-number answers, so surfaced in wrong-answer feedback per §7):**
- **Fraction-of-quantity "divided when should multiply or vice versa":** if the child enters `quantity ÷ n` instead of `quantity ÷ d`, target: *"The bottom number says how many equal parts — split into d, not n."*
- **I2 "stopped at one part":** if the child enters `quantity ÷ d` for a non-unit item (gave 1 part, forgot ×n), target: *"That's just one part. You need n of them."*
- **Two-step "did only step one":** if the child enters the step-1 result, target: *"Good start — that's step 1. Now do the second step."*
- **Added the denominators / classic fraction errors** in S2: reuse the Fractions module's existing diagnoses (the capstone calls the same wrong-answer templates for borrowed fraction items).

---

## 6. The module's own mastery model

Identical machinery to the reference modules — no new persistence concepts. Differences are only in what an "item" is and one anti-repeat extension.

- **Unit of mastery:** one `mix:` `itemKey` (Groups I + T are a fixed curated set ≈ 114 items; Group S items are mirrors of already-mastered source items, so they tend to start at high weight-1 "mastered-feeling" but still require 3 correct *in capstone context* to count as capstone-mastered — interleaving fluency is its own skill).
- **Criteria:** `correct >= DEFAULT_MASTERY_THRESHOLD` (3); wrong = −1 (floor 0); `masteredAt` set/cleared exactly as `dataManager.updateMastery` does. Stored under `mastery.connections`.
- **Weighting:** reuse the existing categories/weights unchanged — struggling 6, learning `(3 − level + 1) × 2`, new 3 (≤ 3 unseen in rotation, drawn in §5 difficulty order), review-due 4 (Leitner 1/3/7/14/30), mastered 1.
- **Anti-repeat extension (the one addition):** the existing same-item anti-repeat guard is widened in Group S / S3 to also avoid repeating the same **operation family** back-to-back, so interleaving actually interleaves (×, then ÷, then fraction — never ×, ×, ×). This is a selection-time filter only; it does not touch persistence.
- **Selection scope:** the child / Parent Zone selects which groups are active (Integration / Two-Step / Shuffle), exactly like enabled tables; the weighted draw runs over the union of active groups. A "focus" selector can focus a single skill (I1, T2…) with kid-language labels ("Fraction of a group", "Two-step problems", "Mix it up!").
- **Mode never gates mastery** (parity): a correct concrete-mode answer counts the same as abstract.
- **Display:** the same `MasteryDots` (0–3) above each problem; a per-group mastery grid on the progress view with cells labeled by readable form ("1/3 of 12", "3/4 of 12", "5×4 → ½").

---

## 7. Wrong-answer / stuck behavior

Parity with the existing flow — wrong answer → streak resets, mastery −1, **bar model at full opacity + "because" statement + hint + part-whole bond**, then "Next →". The capstone-specific content:

1. **Scaffold (always, full opacity, animated):** the item's bar model in its answer-revealing state. For I-group, the split-and-select animation (split into d, then highlight/sum n parts). For T-group, the two-beat chained bars animating in sequence. Reuse the staggered `dotPop`/`fadeSlideUp` idiom.
2. **"Because" statement** — the worked-reasoning templates in §5 (one per skill), always phrased to name the *connection* (e.g. "a fraction of a group is a division", "this needs two steps").
3. **Hint** (the skip-count/same-pieces analog): for I-group, the division-as-equal-sharing strip (`12 → 4 + 4 + 4`); for T-group, a two-chip "Step 1 → Step 2" strip with step 1 filled and step 2 highlighted.
4. **Part-whole bond** (the `NumberBond` analog, reused from `multiplication-practice.jsx`): for I-group, the whole quantity splitting into the fractional part value(s); for T-group, the step-1 result feeding the step-2 bond.
5. **Targeted misconception override:** the diagnoses in §5 replace the generic "because" line when the entered answer matches a known error pattern.
6. **Stuck-before-answering:** abstract-mode "Show me" (proactive drop-back to the full-opacity bar); pictorial-mode tap-to-restore the faded bar. No penalty — understanding before memorization; the bar is never punished.

---

## 8. Achievements

Mirror the existing naming pattern (icons added to `MODULE_ACHIEVEMENT_ICONS`; cross-module unlock + capstone-specific triggers go through `checkExtraTrigger`):
- **Bridge Builder** — master I1 (unit fraction of a quantity).
- **Whole-and-Parts** — master I2.
- **Two-Step Thinker** — master Group T.
- **Quick Switch** — master Group S (the discrimination badge).
- **The Connector** — module-wide mastery (the capstone's `masterAll`).
- **Summit** — the unlock achievement itself: awarded the moment Layer-2 cross-module mastery is reached (fires off the `checkExtraTrigger` that computes the gate), celebrating that Multiply, Divide, and Fractions are all conquered.

---

## 9. Implementation deltas the developer must know

1. **Gate helper:** add `isConnectionsUnlocked(profileId)` (Layer 1 `isModuleFullyUnlocked` AND the three cross-module mastery checks from §3). Use it everywhere the module is listed/entered. Null-guard every mastery read (new profiles have no `mastery.*` objects — this is exactly the class of bug behind the "Parent Zone child-card crash" fix).
2. **New product:** add `module.connections.full` to `PRODUCTS` (`available: false` until ship). No other purchase code changes; bundle + catalog surfacing are automatic.
3. **Locked-state card:** the `ModulePicker` and home surfacing must render a non-tappable locked capstone card with the three-prerequisite progress checklist.
4. **Cross-module mastery reads:** the capstone reads `mastery.multiply` and `mastery.fractions` (other modules' stores) for both the gate and the "only use mastered sub-facts" generation filter — the first module to read across module stores. Read-only; never writes to other modules' mastery.
5. **Borrowed-item rendering:** Group S re-renders source items in their native answer formats, so `connections-practice.jsx` must be able to mount the Fractions answer inputs (`FractionInputFields`, choice grids) and the numeric input. Reuse the shared components; extract them to a shared file now (third consumer — the `NOTES-next-modules.md` "don't copy a third time" threshold).
6. **Operation-family anti-repeat** (§6) is the only selection-logic change vs. the reference; everything else (registry shape, mastery storage, weighting, streaks, achievements plumbing, session recording, Parent Zone surfacing) is reused unchanged.
7. **Play-test every answerType in every mode, including one wrong answer each, in the preview browser before calling it done** — the `NOTES-next-modules.md` standing QA step; watch for number-vs-string `correctAnswer` mismatches and any `while`-loop distractor generation.

---

**End of specification.** Recommended build order: Group I (flagship) first behind the gate, then Group T, then Group S — shipping integration before interleaving, matching the agreed design direction. The P4 scope flag (note #2) is **resolved**: ship the fraction-of-quantity flagship, labeled "Grade 4 stretch / enrichment" in parent-facing copy only.
