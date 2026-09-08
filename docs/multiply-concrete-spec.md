# JackFlash Module Spec: **True Concrete-Mode Manipulatives** — Multiply & Divide (Grades 2–4 / P2–P3)

**Author:** Curriculum agent · **Date:** 2026-07-23 · **Status:** Approved, implemented
**Audience:** React developer, no pedagogy background. Every behavior is spelled out; no code.
**Scope of this doc:** the Concrete CPA mode only, for the existing `multiply` module. Pictorial and Abstract are unchanged.
**Reference files (read, not re-specified):** `src/modules/multiply.jsx` (`DotArray`, `BarModel`, `generateFacts`), `src/multiplication-practice.jsx` (practice flow, scaffold render, wrong-answer flow, `scaffoldOpacity`), `src/fractions-practice.jsx` (`BuildBarInput`), `src/add-practice.jsx` (ten-frame interaction). Spec-format sibling: `docs/connections-spec.md`.

---

## 1. Summary + pedagogy rationale

**Problem.** The CPA selector works, but all three modes render the same passive visuals (`DotArray` for multiply, `BarModel` for divide); "Concrete — Touch the math" only changes fade behavior. There is nothing to touch. Concrete stage in think! Mathematics / Singapore Math means the child *performs the operation with objects*; the manipulation itself embodies the maths.

**Fix.** Replace the passive scaffold in **concrete mode only** with a tap-driven builder whose gesture *is* the operation:

- **Multiply — Equal-Groups Builder.** The child taps to add one equal group of `b` at a time until there are `a` groups, then counts the total and types it.
- **Divide — Grouping (quotitive) Maker.** The child starts from a full pile of `dividend` counters and taps to pull off one group of `divisor` at a time until the pile is empty, then counts how many groups they made and types it.

**Why one gesture across both.** The multiply act "build `a` groups of `b`" and the divide act "pull groups of `divisor` out of `dividend`" are the **same physical gesture — "form one equal group of size k" — run in opposite directions** (build up to a total vs. break a total down). This symmetry is the pedagogical payoff of a *combined* Multiply & Divide module: it makes fact families physical (`Fact Family Pro` becomes something the hands understand), and it means the child learns **one** concrete gesture, not two.

**Division model decision — quotitive (grouping), used consistently for every division fact.** Both generated division shapes (`product ÷ table = i` and `product ÷ i = table`) have the divisor in the `b` slot and are just the two members of one fact family — there is no intrinsic per-shape distinction to map a model onto. So one model is used for all division. **Grouping** is chosen over **sharing (partitive)** because:
1. It is the exact inverse of the multiply builder (same "make a group of k" gesture), reinforcing fact families.
2. It avoids teaching an 8-year-old the partitive/quotitive distinction — one gesture covers both operations.
3. Anti-reveal is clean (see §4): the number of groups the child ends up with *is the answer*, so we simply never draw pre-made empty group slots and never print a group count.

Sharing was considered and rejected: it would pre-show `divisor` bins (a nice fixed structure) but it introduces a *second, different* gesture ("deal one to everyone") that does not mirror the multiply builder, weakening the fact-family story that justifies combining the two operations.

**Scope note (no scope creep).** This is a UI/interaction change to existing content. Equal groups, arrays, and grouping/sharing division with tables 2–10 are P2–P3 core in think! Mathematics; counters and arrays are the standard concrete entry point. No new facts, number ranges, mastery rules, or math are introduced. All facts are exact (no remainders) because they are generated as `table × i` and its inverses.

---

## 2. Multiply concrete interaction — Equal-Groups Builder

**Fact shape** (from `generateFacts`): `{ a, b, answer: a*b, operation: "multiply" }`, displayed `a × b`. Read as **`a` groups of `b`**: `a` = number of groups (given), `b` = size of each group (given), `answer` = total (the unknown the child must produce).

**Placement.** Rendered in the slot the passive scaffold currently occupies, *only* when `mode === "concrete"`. The equation, divider, and number input above it are unchanged. The number input is always enabled; the builder supports the answer, it does not replace it.

### States

| # | State | On screen | Live labels allowed |
|---|-------|-----------|---------------------|
| A | **Empty (start of fact)** | `a` faint dashed placeholder outlines (one per group — `a` is given, safe to show), each sized for a row of `b`. A large primary tap target: **"＋ Make a group of `b`"**. | `0 of a groups` |
| B | **Building** | Each tap fills the next placeholder with a solid row of `b` dots (`dotPop`, staggered). Placeholders remaining stay dashed. | `X of a groups` (X = groups built, counts 0→a; never equals the answer) |
| C | **Built (all `a` groups placed)** | All `a` rows solid, forming the `a × b` array. The "＋" target is replaced by prompt text: **"Now count them all, then type your answer."** No total is shown. | `a of a groups` — and the word prompt. **No numeric total.** |
| D | **Revealed (only after a wrong answer)** | Array stays; now each group may show its size `b`, and the total answer label appears (e.g. `= answer`) alongside the standard because/hint/bond. | Answer is now shown — allowed, because the child already answered. |

### Exact tap behavior

- **Tap the "＋ Make a group of `b`" target** (or tap any empty dashed placeholder): `groupsBuilt += 1`, capped at `a`. A new solid row of `b` dots animates in.
- **Tap a completed group (row):** removes that group (`groupsBuilt -= 1`) — this is the tap-only "undo," so a child can fix an over-count. No drag.
- Each tap moves a **whole group of `b`**, never a single dot (scale rule, §5).
- At `groupsBuilt === a`, the "＋" target disables and shows the count prompt (State C).

### Submit flow

1. Child builds (optional but invited) and counts the total themselves.
2. Child types the total into the existing number input.
3. Submit via existing Enter / submit button (`handleSubmit`, unchanged). Building is **never required** to submit — a child who knows the fact can type and go.

### Correct / incorrect handling

- **Correct:** existing behavior — celebrate, `pickNewFact()` after ~900 ms. Builder resets to State A for the next fact (see §6).
- **Incorrect:** existing wrong-answer flow runs (`setShowScaffold(true)`, streak reset, because-line + `SkipCount` hint + `NumberBond`). **Additionally**, the builder auto-completes to all `a` groups and enters **State D**: it shows the finished `a × b` array and now reveals the total. Message framing: "`a` groups of `b` — count them: `answer`." The child taps **Next →** (unchanged) to continue.

---

## 3. Divide concrete interaction — Grouping (quotitive) Maker

**Fact shape** (from `generateFacts`): `{ a: dividend, b: divisor, answer: quotient, operation: "divide" }`, displayed `dividend ÷ divisor`. Read as **"How many groups of `divisor` are in `dividend`?"**: `dividend` = the pile (given), `divisor` = size of each group (given), `answer` = number of groups (the unknown).

Note `answer` (the quotient) is always a factor ≤ 10, and `divisor` ≤ 10, `dividend` ≤ 100 — this bounds every interaction (see §5).

### States

| # | State | On screen | Live labels allowed |
|---|-------|-----------|---------------------|
| A | **Full pile (start of fact)** | A loose cluster of `dividend` counters (dots) in a "pile" tray. **No group slots are pre-drawn** (drawing `quotient` slots would reveal the answer — see §4). A primary tap target: **"＋ Take a group of `divisor`"**. | `In the pile: dividend` |
| B | **Grouping** | Each tap removes `divisor` counters from the pile and lands them as one solid group of `divisor` in the groups area below. Pile shrinks. | `In the pile: remaining` (counts `dividend`→0). **No group count.** |
| C | **Grouped (pile empty)** | Pile empty; the groups area holds the groups the child made. Prompt: **"Now count your groups, then type your answer."** | `In the pile: 0` + word prompt. **No numeric group count.** |
| D | **Revealed (only after a wrong answer)** | Groups stay; each labeled `divisor`; the answer (number of groups) is now shown with because/hint/bond. | Answer now shown — allowed post-answer. |

### Exact tap behavior

- **Tap "＋ Take a group of `divisor`":** pulls `divisor` counters from the pile into a new group (`groupsMade += 1`, `pileRemaining -= divisor`). Group animates in (`dotPop`).
- **Tap a made group:** returns it to the pile (`groupsMade -= 1`, `pileRemaining += divisor`) — tap-only undo.
- Each tap moves a **whole group of `divisor`** (scale rule, §5). Because facts are exact, the pile always empties precisely at `groupsMade === quotient`.
- The "＋" target disables when `pileRemaining === 0` (State C).

### Submit flow

Identical to multiply: the child counts their groups, types the number into the existing input, submits via Enter / button. Building is invited, never required.

### Correct / incorrect handling

- **Correct:** existing celebrate + `pickNewFact()`; builder resets.
- **Incorrect:** existing wrong-answer flow (`showScaffold`, because-line, `SkipCount`, `NumberBond`) **plus** the builder auto-completes (empties the pile into groups) and enters **State D**, revealing the group count as the answer: "`dividend` splits into groups of `divisor` → `answer` groups." Then **Next →**.

---

## 4. Anti-reveal audit

Governing rule (project memory, non-negotiable): manipulatives must **never** print the numeric answer, or any live running total equal to the answer, before the child answers. Counting objects *yourself* is the point and is allowed.

Contrast with fractions `BuildBarInput`, which *does* show "X out of Y shaded": there the answer is a **fraction**, and the shaded count is the numerator the child is choosing — the label restates the child's own selection, not a hidden result. **In multiply the count IS the answer, so an analogous live total is forbidden.** Every element below is audited against this.

**Multiply builder**

| Element | Value it shows | Pre-reveals answer? | Why safe |
|---|---|---|---|
| `X of a groups` label | groups built, 0→`a` | No | `a` is the **given** first factor; the label is structural progress, never `a×b`. |
| `a` dashed placeholder slots | count = `a` | No | `a` is given in the equation. Number of groups is not the unknown. |
| Each group's dots | rows of `b` | No | `b` is given; child must still sum across groups. |
| **Not shown:** running dot total / per-row subtotals (skip-count) | would be `a×b` | — | **Deliberately omitted.** Skip-count (`SkipCount`) appears **only** on a wrong answer. |
| State C prompt | "count them, then type" | No | Words, no number. |

**Divide builder**

| Element | Value it shows | Pre-reveals answer? | Why safe |
|---|---|---|---|
| `In the pile: remaining` | `dividend`→0 | No | This is the pile (a `dividend`-derived complement), labeled "pile," decreasing to 0 — it is not "the answer" and is never presented as the group count. |
| Each group's dots | groups of `divisor` | No | `divisor` is given. |
| **Not drawn:** pre-made empty group slots | count would be `quotient` | — | **Deliberately omitted** — this is the key anti-reveal move for grouping: groups only appear as the child makes them, so no on-screen count equals the answer until the child produces it. |
| **Not shown:** "groups made: N" | would be `quotient` | — | **Deliberately omitted.** The group count is the answer; the child counts it, we never label it. |
| State C prompt | "count your groups, then type" | No | Words, no number. |

**Both, State D:** the answer appears **only after** the child has answered wrong — this is the existing, permitted reveal (the because-line already prints `= answer`). Auto-completing the build here is a teaching reveal, not a pre-reveal.

---

## 5. Scale handling for large facts

Bounds from `generateFacts`: multiply `a, b ≤ 10`, total ≤ 100; divide `dividend ≤ 100`, `divisor ≤ 10`, and **quotient ≤ 10 always** (the quotient is one of the two factors). So:

- **Taps are always ≤ 10.** Multiply: one tap per group ⇒ ≤ `a` ≤ 10 taps. Divide: one tap per group ⇒ ≤ `quotient` ≤ 10 taps. Single-tap-per-dot is never used.
- **Each tap places up to 10 dots** (a whole group/row), reusing `DotArray`'s existing dot-size scaling (6–11 px by total) so 100 dots still fit mobile width.
- **Divide pile of up to 100 loose counters** renders as a compact cluster using the same size ramp; the pile only ever *shrinks*, so the heaviest render is the initial frame.
- **Worst cases:** `10×10` = 10 taps of 10 dots; `100 ÷ 10` = 10 taps of 10. All ≤ 10 taps.
- **Group-size-1 facts (`÷ 1`, e.g. `10 ÷ 1 = 10`):** groups of a single dot, up to 10 groups ⇒ ≤ 10 taps of 1 dot. Tractable; see edge cases.

---

## 6. Component / state sketch (implementation-ready, no code)

**New components in `src/modules/multiply.jsx`** (siblings of `DotArray`/`BarModel`, exported on the module object):

- `ConcreteMultiplyBuilder`
  Props: `a` (target group count), `b` (group size), `groupsBuilt` (int), `onAddGroup()`, `onRemoveGroup(index)`, `revealed` (bool → State D), `reducedMotion` (bool).
- `ConcreteDivideBuilder`
  Props: `dividend`, `divisor`, `groupsMade` (int), `onMakeGroup()`, `onUndoGroup(index)`, `revealed` (bool), `reducedMotion` (bool).
  Derives `pileRemaining = dividend − groupsMade * divisor`.

Expose on `multiplyModule` alongside the existing `ScaffoldComponent` / `DivisionScaffoldComponent`:
`ConcreteMultiplyComponent: ConcreteMultiplyBuilder`, `ConcreteDivideComponent: ConcreteDivideBuilder`.

**State additions in `src/multiplication-practice.jsx`** (near existing `showScaffold`/`userHidScaffold`):

- `builderGroups` (int, default 0) — groups built (multiply) / groups made (divide) for the current fact.
- Reuse existing `showScaffold` as the `revealed` flag passed to the builder (it is already set true on wrong answers).

**Handlers:**
- `onAddGroup` / `onMakeGroup` ⇒ `setBuilderGroups(g => Math.min(g + 1, target))` where `target = a` (multiply) or `quotient` (divide).
- `onRemoveGroup` / `onUndoGroup` ⇒ `setBuilderGroups(g => Math.max(0, g − 1))`.

**Reset points for `builderGroups → 0`:**
- Inside `pickNewFact` (every new fact).
- On CPA mode change (see §7).

**Render integration (scaffold slot):** branch on mode:
- `mode === "concrete"` → render `ConcreteMultiplyBuilder` or `ConcreteDivideBuilder` (by `currentFact.operation`), passing `builderGroups`, the handlers, and `revealed={showScaffold}`, `reducedMotion`.
- `mode === "pictorial"` / no mode → **unchanged** passive `MultiplyScaffold` / `DivisionScaffold` with `scaffoldOpacity`.
- `mode === "abstract"` → **unchanged** (hidden until wrong answer).

The concrete builder does **not** use the `userHidScaffold` / "Show me" tap-to-hide toggle (the builder is the primary surface and always present in concrete mode). Pictorial's tap-to-hide is unchanged.

**Reduced motion:** pass `reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches`. When true, builders skip `dotPop` stagger and appear instantly at opacity 1 (the animations in `DotArray` / `BarModel` already gate on an `animate` flag — mirror that).

---

## 7. Edge cases

- **`× 1` (e.g. `7 × 1`):** `a=7` groups of `b=1` → 7 taps, each a single dot. Placeholders show 7 slots of 1. Fine (≤10 taps). `1 × b`: 1 group of `b` → 1 tap, one full row; State C reached immediately after one tap.
- **`× 10` / total = 100:** 10 taps of 10 dots; relies on `DotArray` size ramp. No special-casing beyond the size ramp.
- **`a === b` (e.g. `6 × 6`):** square array; no special handling — `a` groups of `b`, 6 taps.
- **Divide quotient = 1 (e.g. `7 ÷ 7`):** one group of 7 empties the pile in a single tap → State C after one tap; child answers `1`. Ensure the "＋" disables immediately at `pileRemaining === 0`.
- **Divide quotient = 10 (e.g. `100 ÷ 10`, `90 ÷ 9`):** 10 taps; still ≤10.
- **Divide `÷ 1` (e.g. `8 ÷ 1 = 8`):** group size 1 → 8 single-dot groups, 8 taps; child counts 8 groups. Tractable.
- **Switching CPA mode mid-fact:** the current fact is **kept** (do not draw a new fact). `builderGroups` resets to 0. Switching **to** abstract hides the builder (existing abstract behavior); switching **to** pictorial shows the passive faded scaffold; switching **to** concrete shows an empty builder (State A). If a wrong answer has already been submitted (`showScaffold` true) and the user switches to concrete, render the builder directly in **State D** (revealed/auto-completed) so it stays consistent with the already-shown answer.
- **Child submits without building:** allowed. Correct → normal celebrate. Wrong → builder auto-completes into State D as part of the standard reveal.
- **Over-building then under-answering:** the undo tap (tap a group to remove) lets the child correct the structure; it has no bearing on mastery, which is decided solely by the typed answer (unchanged).

---

## 8. Out of scope

- **Pictorial and Abstract modes** — untouched. Only the concrete-mode render branch changes.
- **Mastery model, weighted draw, streaks, session stats, achievements** — unchanged; the typed answer still drives `updateMastery` exactly as today. Building objects never awards or blocks mastery.
- **The passive `DotArray` / `BarModel` components** — kept as-is for pictorial/abstract and for the wrong-answer reveal in those modes.
- **Sharing (partitive) division** — considered and rejected for consistency (see §1); not implemented.
- **Remainders** — not applicable; all generated facts are exact.
- **Drag-and-drop, new number ranges, new fact types, word problems** — none introduced.
- **Parent Zone / entitlement / gating** — unaffected (module is fully free).
