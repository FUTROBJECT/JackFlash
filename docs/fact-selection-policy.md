# JackFlash Spec: **Fact-Selection Policy** — `multiply` module

**Author:** Curriculum (Singapore Math / think! Mathematics) · **Date:** 2026-08-31 · **Status:** Proposed, ready to implement
**Audience:** React developer (module-builder). Every behavior is spelled out. No code in this document.
**Target:** `pickNewFact` in `src/multiplication-practice.jsx` (currently lines ~189–292) and the constants it uses.
**Reference:** `docs/mastery-fluency-spec.md` (mastery gates — unchanged by this spec), `src/modules/multiply.jsx` (`generateFacts`), `src/constants.js`.

---

## 1. Diagnosis (verified against the code)

The current selector assigns a **fixed weight per fact** and then draws from the union. Weight per category today: mastered-not-due 1, review-due 4, new 3 (capped at `MAX_NEW_FACTS = 3` **in generation order**), struggling 6, learning `(3 − level + 1) × 2` (so 6 at level 1, 4 at level 2).

Because per-fact weight is fixed but category *membership* is unbounded, a category's share of the draw grows linearly with how many facts are in it. For the mid-journey learner (149 mastered, 6s–9s untouched), mastered-not-due contributes ~150 of ~430 total weight while the entire new category contributes at most 9. That is the whole bug: **the reward for progress is that new material becomes statistically invisible.** P(new) ≈ 1.7%/question is not a tuning problem, it is a structural one — no reweighting of constants fixes it, because the mastered set keeps growing.

Three further defects found while verifying, all of which this spec fixes:

1. **Duplicate facts in the pool.** `generateFacts` emits `product ÷ table` and `product ÷ i` for every `(table, i)` pair. For tables 2–10 mixed this yields **270 entries but only 189 distinct factKeys** — the 81 division facts whose divisor and quotient are both in 2–10 are each generated **twice**, and therefore carry **double weight** in the draw. `pickNewFact` does not dedupe. (The progress grid at line ~761 *does* dedupe — the two disagree.)
2. **The `MAX_NEW_FACTS` cap counts duplicates.** A duplicated new division fact can consume two of the three frontier slots by itself.
3. **Introduction order is generation order**, which is table-major, `i`-minor, and emits `multiply, divide, divide` per `(table, i)`. For a learner whose frontier table is 6, the three admitted new facts are exactly `6×1`, `6÷6`, `6÷1` — matching the learner's real data. Two of the three frontier slots go to *division* of a table whose multiplication facts the child has never met. That inverts the think! Mathematics sequence, in which division facts are derived from an already-known multiplication fact (the fact family).

**Curriculum check.** Singapore MOE / think! Mathematics places tables 2, 3, 4, 5, 10 in Primary 2 and tables 6, 7, 8, 9 in Primary 3, with automatic recall of *all* tables 2–10 expected by the end of P3, and division taught throughout as the inverse of the related multiplication fact. A P3 learner who has been practising for weeks and has never been asked a 6–9 fact is being held below grade level by the app. Restoring new-material flow is a grade-level requirement, not a nice-to-have.

---

## 2. What does NOT change

Do not touch any of the following. They are correct and out of scope.

- `DEFAULT_MASTERY_THRESHOLD = 3`, and the meaning of `correct` / `attempts` / `lastSeen` / `masteredAt`.
- The fluency gates and their constants (`FLUENCY_MS_MULTIPLY = 6000`, `FLUENCY_MS_DIVIDE = 8000`), `masteryGatesExempt`, and everything in `docs/mastery-fluency-spec.md`. This policy is designed to be **robust to facts lingering** below threshold because of the gates (§7), not to compensate for them.
- `REVIEW_INTERVALS = [1, 3, 7, 14, 30]` — values and indexing (`index = correct − threshold`, clamped) are unchanged. Spaced repetition stays intact.
- The finish-line on-ramp (`userHidScaffold` pre-hide at `threshold − 1` in pictorial, §4.5 of the fluency spec) and all scaffold/hint/wrong-answer UI.
- **Persistence format.** No new persisted fields. The one piece of new state (§7, the error-priority window) is an in-memory ref, discarded when the screen unmounts.
- `generateFacts` itself, the mastery meter denominator (`facts.length`), the progress grid, achievements, `enabledTables` / `focusNumber` / `operation` plumbing.
- The anti-repeat guard's rule (never the same fact twice in a row) — only its *placement* in the pipeline is specified (§8).

---

## 3. Core change: budget first, weight second

Replace "one weight per fact" with a **two-level policy**:

1. **Category budgets.** Each category is allocated a target *share of draws*. Shares are fixed by policy, so a category's influence never grows with its membership. This is the structural fix.
2. **Within-category relative weights.** Each category's budget is divided among its own members by relative weight (which fact inside this category is most worth asking).

Everything else — the frontier, the anti-repeat guard, the ceiling — is a modifier on this.

**Implementation note:** budgets are probabilities summing to 1. The existing weighted-random loop can be reused unchanged by multiplying every final per-fact probability by 1000 and treating the result as a weight.

---

## 4. Categories (definitions unchanged from the current code)

Compute these exactly as today, from the persisted mastery record, with `threshold = DEFAULT_MASTERY_THRESHOLD`:

| Category | Test |
|---|---|
| `review` | `correct >= threshold` AND `daysSince(lastSeen) >= REVIEW_INTERVALS[min(correct − threshold, 4)]` |
| `mastered` | `correct >= threshold` AND not due |
| `new` | `attempts === 0 && !record?.lastSeen` (keep the `lastSeen` clause — backward compat with pre-`attempts` records) |
| `struggling` | has a record, `correct === 0` |
| `learning` | has a record, `1 <= correct < threshold` |

`struggling` and `learning` together are called the **working set**; `W = |struggling| + |learning|` after dedupe.

---

## 5. Category budgets — the table to transcribe

Pick the row by `W`. New constants: `WORKING_SET_THIN = 6`, `WORKING_SET_BACKLOG = 18`.

| Band | Condition | `new` | `struggling` + `learning` | `review` | `mastered` |
|---|---|---|---|---|---|
| Empty | `W === 0` | **0.55** | 0.00 | 0.35 | 0.10 |
| Thin | `1 ≤ W ≤ 6` | **0.35** | 0.40 | 0.20 | 0.05 |
| Healthy | `7 ≤ W ≤ 17` | **0.25** | 0.50 | 0.20 | 0.05 |
| Backlog | `W ≥ 18` | **0.15** | 0.62 | 0.18 | 0.05 |

Every row sums to 1.00.

**Renormalization (mandatory).** Drop the shares of any category with zero eligible members, then divide the remaining shares by their sum. This single rule produces every pool-floor behavior in §9 — no special cases needed.

### Rationale per row

- **`mastered` collapses from ~150 effective weight to a hard 5%.** Non-due mastered facts are, by definition, on a spaced-repetition schedule that says *don't ask yet*. The 5% is deliberate background mixing so a session never feels like it has abandoned what the child owns, and so the interleaving that Singapore spiral review depends on survives — but it is now a *fixed tax*, not a growing one.
- **`review` at ~20% keeps spaced repetition genuinely prioritized.** Retention of the 2s/5s/10s is the platform for deriving the 6s–9s (6×5 is retrieved, 6×6 is derived from it); letting the easy tables decay would make the hard tables harder.
- **Consolidation (`struggling` + `learning`) is always the largest single block**, and it *grows* as the working set grows. This is the "consolidate before extend" rule: when the child has a backlog of half-learned facts, the app spends most of its time there.
- **`new` never falls below 15%.** Even in the worst backlog, roughly one question in six is new material — a session always advances. In the Thin and Empty bands `new` rises sharply because a child with nothing in flight is a child who is ready for the next fact family; leaving them to re-drill mastered facts is the failure mode being fixed.

---

## 6. Within-category relative weights

Inside each category, split that category's budget in proportion to these relative weights.

| Category | Member | Relative weight |
|---|---|---|
| `struggling` + `learning` | `correct === 0` (struggling) | 3 |
| | `correct === 1` | 2 |
| | `correct === threshold − 1` (i.e. 2) | 2 |
| | *plateaued*: `correct === threshold − 1` AND `attempts >= 10` | 1 |
| `new` | any frontier fact (§7) | 1 (uniform) |
| `review` | any due fact | `1 + min(2, daysSince / intervalDays)` → range 2…3 |
| `mastered` | any non-due mastered fact | `max(0.1, daysSince / intervalDays)` → range 0.1…<1 |

Then apply the **error-priority multiplier** (§8) to the working-set weights.

### Rationale

- **`threshold − 1` facts are weighted the same as `correct === 1`, not lower.** Under the fluency gates a fact at 2/3 needs a *fast, unscaffolded* answer to finish; starving it produces exactly the pictorial plateau the fluency spec's §4.5 on-ramp was written to break. These facts need repeated retrieval attempts, not fewer.
- **The plateau clamp** (10+ attempts still stuck at 2) halves that weight so one stubborn fact cannot eat the consolidation budget forever. It stays in rotation; it stops dominating. Surfacing it to the adult is already ParentZone's "Ready to try unaided" row — no new UI here.
- **`mastered` weight ∝ how close to due it is.** The 5% background is spent on the facts nearest their review date rather than uniformly, so background mixing doubles as a soft pre-review. A just-answered mastered fact gets 0.1 and effectively disappears.

---

## 7. The frontier: dedupe, gating, and introduction order

This section replaces the current `newCount <= MAX_NEW_FACTS` filter entirely.

### 7.1 Dedupe (do this first, before categorizing)

Collapse the `facts` array to distinct `factKey`s, keeping the first occurrence. For tables 2–10 mixed this takes the selection pool from 270 entries to **189** (90 multiply, 99 divide). This is not cosmetic: it removes the double-weighting of 81 division facts and, as a side effect, brings the multiply/divide balance of the pool from 1:2 to near 1:1 — which is why no separate operation-balancing machinery is needed for ongoing practice (§9d).

Dedupe **inside `pickNewFact` only**. Do not change the `facts` memo — the mastery meter's `/270` denominator is a separate (real, pre-existing) inconsistency and is out of scope here.

### 7.2 Family coordinates

For every fact derive a pair `(T, m)` — the "table" it belongs to and its "multiplier":

- **Multiply** `{a, b}`: `T = a`, `m = b`.
- **Divide** `{a: dividend, b: divisor, answer: quotient}`: the family factors are `divisor` and `quotient`. `T` = whichever has the **higher** `TABLE_RANK`; `m` = the other. If they are equal, `T = m`.

`TABLE_RANK = { 1:0, 2:1, 5:2, 10:3, 3:4, 4:5, 6:6, 7:7, 8:8, 9:9 }`

This is the module's own group order (`easy` → `medium` → `hard`) extended to cover 1, and it is a *fluency-derivability* order rather than the strict MOE year order (which puts 3 and 4 in P2). That is correct for this app: 2s/5s/10s are the skip-count anchors from which 3s, 4s and then 6s–9s are derived, and think! P3's target is automatic recall of all of 2–10 regardless of which year introduced them.

### 7.3 Multiplier rank

`multiplierRank(T, m)`, evaluated against **persisted mastery**:

| Rank | Condition | Why |
|---|---|---|
| 0 | the commuted key `` `${m}x${T}` `` has `correct >= threshold` | Commutativity freebie — the child already knows this product under the other name |
| 1 | `m ∈ {1, 2, 5, 10}` | The skip-count anchors; derivable without new memory load |
| 2 | `m === T` | The square — a memorable landmark fact |
| 3 | otherwise | Genuinely new memory load |

Rank 0 is the most valuable rule here. Because commuted pairs are **separate factKeys** in this app (`2x6` and `6x2`), a child who has mastered the 2s, 5s and 10s has ~30 facts in the 6–9 tables that are cognitively free. Introducing the 6 table with `6×2` ("you already know 2×6") rather than `6×1` gives an immediate win and teaches commutativity as a *strategy*, which is exactly how think! frames the multiplication table as a structure rather than a list.

### 7.4 The inverse-anchor gate (division)

For a divide fact with divisor `d` and quotient `q`, its **anchors** are the multiply keys `` `${d}x${q}` `` and `` `${q}x${d}` ``. Let `anchorLevel` = the max `correct` across whichever anchors have a persisted record (0 if none do).

- **`operation === "mixed"`:** a divide fact is **ineligible** for the frontier while `anchorLevel < 1`. (It is unaffected once it has been attempted — the gate governs introduction only.)
- **`operation === "divide"`:** the gate is **advisory, not blocking** — gated facts are still eligible, they just sort after ungated ones (see the leading sort key in §7.5). A divide-only session must be able to start cold.
- `operation === "multiply"`: not applicable.

In mixed mode the gate is always satisfiable: for any generated divide fact at least one anchor multiply key is also in the pool, and it sorts earlier.

Rationale: in think! Mathematics division is not an independent fact set — `42 ÷ 7` is retrieved *through* `6 × 7`, which is why the fluency spec even gives division a longer time limit. Asking a child to divide inside a table he has never multiplied in is asking him to count, which is precisely what the fluency gate then refuses to credit. That is the loop this gate breaks.

### 7.5 Introduction order

Sort all `new`-category facts ascending by this tuple, then take the first `MAX_NEW_FACTS`:

1. `gated ? 1 : 0` — only ever non-zero in divide-only mode (§7.4)
2. `TABLE_RANK[T]`
3. `multiplierRank(T, m)`
4. `m` (ascending)
5. `operationRank` — multiply 0, divide 1
6. `answer` (ascending) — for the two divides of a family, the one with the smaller quotient first (fewer bar-model segments, simpler picture)
7. `factKey` (lexical) — final determinism tie-break

Placing `operationRank` *after* `m` is deliberate: it makes each fact family contiguous — `6×2`, then `12÷6`, then `12÷2` — so the inverse relationship is met while the multiplication fact is still warm. A table-wide multiply-then-divide split would separate them by dozens of questions and lose the fact-family link.

Worked example, learner with 2s/5s/10s mastered, arriving at the 6 table: `6×2` → `12÷6` → `12÷2` → `6×5` → `30÷6` → `30÷5` → `6×10` → … → `6×1` → `6×6` → `6×3` → `6×4` → `6×7` → `6×8` → `6×9`. Compare the current behavior: `6×1`, `6÷6`, `6÷1`.

### 7.6 `MAX_NEW_FACTS` stays at 3 — justification

Read it as **frontier width** (how many unseen facts may be in play at once), not a session budget. With the Healthy band's 25% new share split three ways, each frontier fact comes up roughly every 12th question — about twice in a 25-question sitting, which is enough exposure to move it into the working set without hammering an unfamiliar fact. A fact leaves the frontier as soon as it is *attempted*, so the frontier refills continuously and a 40-question session introduces roughly 6–10 new facts, or about one table's worth. That inflow raises `W`, which pushes the band toward Backlog, which throttles the inflow — the policy self-regulates without any session counter.

Width 1 would collide with the anti-repeat guard (the sole new fact could never be drawn twice in a row, so it would alternate rigidly with one consolidation fact) and would eliminate interleaving between fact families. Width 5+ fragments an 8-year-old's attention across too many unfamiliar facts at once, which is the concern the original cap was written to address.

---

## 8. Anti-repeat guard and the per-fact ceiling

**Anti-repeat (rule unchanged, placement specified).** After dedupe, categorization and frontier selection, and **before** budgets are computed, remove the previous `currentFact.factKey` from the pool — but only if the deduped pool has more than one member. Budgets are then computed over the survivors, so if removing it empties a category, that category's share renormalizes away cleanly (§5). Keep the 1-back window; do not extend it.

**Per-fact ceiling (new).** `PER_FACT_CEILING = 0.15`. After per-fact probabilities are computed, clamp any fact above 0.15 and redistribute the excess proportionally across the other facts. Iterate at most 3 passes; leftover excess is left in place. **Waive the ceiling entirely when fewer than 8 facts are eligible.**

Rationale: without it, a near-complete profile with two struggling facts would give each of them ~31% of every question — relentless drilling of exactly the facts the child finds hardest, which is demotivating and not even efficient. The waiver keeps fresh profiles and single-table focus pools working, where high per-fact rates are unavoidable and correct.

**Error-priority window (new, in-memory only).** Keep a ref mapping `factKey → drawsRemaining`. On a **wrong** answer, set that fact's counter to 10. Each subsequent draw decrements every counter; a counter reaching 0, or the fact being answered correctly, clears the entry. While an entry is live, multiply that fact's *within-category* relative weight (§6) by **4**. The ref is not persisted and is discarded on unmount.

Rationale: a missed fact should return within the same sitting — but not immediately, or the child is echoing rather than retrieving. Under the §6 weights alone a missed fact recurs after ~18 draws (too slow to feel like correction); with ×4 it recurs after ~6, comfortably inside the session and safely after the anti-repeat window. The wrong-answer reveal has already dropped the child back to the concrete/pictorial representation for that fact, so the re-ask lands on a fresh model rather than a cold guess.

---

## 9. Pool-floor behaviors

All of these fall out of §5's renormalization rule. They are enumerated so QA can check them, not because they need separate code paths.

**(a) Fresh profile — everything new.** `W = 0` → Empty band, but `struggling`/`learning`/`review`/`mastered` are all empty → `new` renormalizes to **1.00**. Every question is drawn from the 3 frontier facts, and the frontier rolls forward as each is attempted. Anti-repeat guarantees the first three questions are not all the same fact. Within about 4 questions `W ≥ 1` and the Thin band takes over (new ≈ 0.47 after renormalization, consolidation ≈ 0.53).

**(b) Near-complete — everything mastered, nothing due.** Only `mastered` is non-empty → it renormalizes to **1.00** and the selector still returns a fact on every call. The `daysSince / intervalDays` weighting means the draw favors facts nearest their review date, so the session behaves as gentle pre-review rather than random noise. No empty-state, no dead end.

**(c) Tiny pools.** `focusNumber` (single table): 10 facts multiply-only, ~19 distinct divide facts, ~29 mixed — all comfortably above the anti-repeat minimum. The per-fact ceiling waives below 8 eligible facts. If the pool is empty (locked/unavailable table), set `currentFact = null` exactly as today. If the pool has exactly one fact, the anti-repeat guard is skipped and that fact repeats — unchanged, and correct.

**(d) Operation-specific pools.**
- *multiply-only*: anchor gate inert; nothing special.
- *divide-only*: anchor gate is advisory (§7.4). A child who already knows his 6× table from mixed practice gets anchor-informed ordering because the gate reads persisted records regardless of pool membership; a cold divide-only profile simply proceeds down the introduction order.
- *mixed*: **introduction order interleaves operations deliberately** (§7.5) — multiply first within each family, its two inverses immediately after, gated on the multiply being credited once. For *ongoing* practice no extra balancing is needed: dedupe alone takes the pool from 90 multiply / 180 divide to 90 / 99, which is near parity, and the near-parity is itself meaningful — commuted multiply keys and shared-dividend divide keys mean each fact family really does contribute a similar number of distinct retrieval targets in each direction.

**(e) `enabledTables` / group scoping.** No special handling. The policy operates on whatever `facts` contains; `TABLE_RANK` orders whatever subset survives; the anchor gate consults persisted records so it works even when an anchor's table is disabled.

---

## 10. The draw, step by step

1. Take `facts`; **dedupe by `factKey`**, keeping first occurrence.
2. Categorize every entry (§4). Compute `W`.
3. Select the band row (§5).
4. Build the frontier: filter to `new`, apply the anchor gate (§7.4), sort by the introduction key (§7.5), take the first `MAX_NEW_FACTS`.
5. **Drop all non-frontier `new` facts from the pool** (they get no weight at all).
6. Apply the anti-repeat guard (§8) if the pool has more than one member.
7. Compute category budgets from the band row; renormalize over categories that still have members.
8. Within each category, compute relative weights (§6), apply the ×4 error-priority multiplier where live (§8), and split that category's budget in proportion.
9. Apply the per-fact ceiling (§8) unless fewer than 8 facts are eligible.
10. Weighted-random draw over the resulting per-fact probabilities. Everything after the draw — state resets, the finish-line on-ramp pre-hide, focus, `factShownAtRef` — is unchanged.

`pickNewFact`'s dependency list must now include `operation` explicitly (the anchor-gate waiver reads it) and the error-window ref. Frontier computation is `O(n log n)` on ≤189 items per draw — no memoization required, but memoizing the sorted introduction order per `(facts, mastery-version)` is a safe optimization.

---

## 11. Acceptance criteria for QA

Run these as Node simulations against the selection logic with a localStorage shim (the repo convention: static checks are not sufficient). The **mid-journey fixture** is: tables 2, 5, 10 fully mastered with varied `lastSeen`; tables 3 and 4 with ~25 facts spread across `correct` 0–2; tables 6–9 with no records at all; `operation = "mixed"`, all tables enabled.

1. **Mastered no longer dominates.** Mid-journey fixture, mastery frozen, 10,000 draws: `P(category === "new")` is between **12% and 20%**; `P(category === "mastered")` ≤ **8%**; `P(struggling ∪ learning)` is between **55% and 70%**. (Current code: P(new) ≈ 1.7%.)
2. **Sessions advance.** Mid-journey fixture, live simulation (every answer correct and inside the fluency limit), 200 independent 40-question sessions: at least **3 distinct previously-unrecorded facts** are introduced in ≥95% of sessions. Additionally, from a fixture where tables 2/3/4/5/10 have no unrecorded facts left, ≥**90%** of newly introduced facts are from tables 6–9.
3. **Fresh profile does not firehose.** Empty mastery, mixed, all tables: the first 10 draws contain **between 3 and 8 distinct factKeys**, every one of them appears in the first 12 entries of the introduction order, and no factKey appears twice in a row.
4. **Terminal states still serve.** (a) All 189 facts at `correct = 3` with `lastSeen = now` (nothing due): 1,000 consecutive calls return non-null, never repeat back-to-back, and cover ≥90% of distinct factKeys. (b) `focusNumber = 7`, `operation = "multiply"` (10 facts), empty mastery: 200 calls return non-null, never repeat back-to-back, and `P(new) > 0` while unseen facts remain.
5. **Dedupe and operation balance.** For tables 2–10 mixed the deduped selection pool has exactly **189** entries and no repeated `factKey` (raw `generateFacts` still returns 270 — the memo is unchanged). Over 10,000 draws on the mid-journey fixture, multiply's share of draws is between **40% and 60%**.
6. **Division follows its anchor.** Fresh profile, mixed, 60-question simulation (all correct and fluent): every divide fact drawn for the **first** time has, at the moment of that draw, an anchor multiply factKey with `correct >= 1`. Zero violations. In `operation === "divide"` with a fresh profile, the simulation still serves divide facts from question 1 (gate is advisory).

Plus the standing repo requirements: `npm run build` passes, and a manual preview drive confirming no visible UX change other than "the app asks about new tables now."

---

## 12. Flagged, deliberately out of scope

- **The mastery meter denominator.** The header stat uses `facts.length` (270, duplicates included) while the group progress grid dedupes (189). This spec does not change either — but the learner's "149/270" is measured against an inflated denominator, and someone should decide whether the headline number should switch to distinct facts. Doing it here would silently change the child's displayed progress percentage on the same day the selection policy changes, which would make the change impossible to evaluate.
- **Fluency-constant tuning** (`FLUENCY_MS_*`) — a separate checklist item. This policy is deliberately robust to facts lingering below threshold: a stuck working set consumes a bounded budget share rather than crowding out new material, and the §6 plateau clamp keeps any single stuck fact from dominating within that share.
- Any change to the CPA modes, scaffolds, on-ramp, or wrong-answer flow.
