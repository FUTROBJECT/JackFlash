// Fact-selection policy for the multiply/divide module.
//
// Implements docs/fact-selection-policy.md — read that spec in full before
// touching this file. It replaces the old "fixed weight per fact" selector
// with a category-budget + within-category-weight pipeline (spec §10):
// dedupe -> categorize -> band -> frontier -> anti-repeat -> budgets ->
// within-category weights (+ error-priority window) -> per-fact ceiling ->
// weighted draw.
//
// This module is intentionally pure — no React, no localStorage, no DOM —
// so it can be imported by both src/multiplication-practice.jsx (the real
// app) and scripts/sim-fact-selection.mjs (the Node acceptance-criteria
// simulation, spec §11). Both call the exact same code path.

import { DEFAULT_MASTERY_THRESHOLD } from "./constants.js";

// Spaced-repetition review intervals (days) — Leitner-inspired.
// Index = number of correct answers beyond mastery threshold.
// Values and indexing are UNCHANGED by this policy (spec §2) — relocated
// here only so the category test (spec §4) and the review/mastered weight
// formulas (spec §6) have one shared home.
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

// ---- Policy constants — see docs/fact-selection-policy.md for the tables
// these were transcribed from (§5 budgets, §6 weights, §7 frontier, §8
// ceiling/error window). ----

// The module's own group order (easy -> medium -> hard) extended to cover 1
// — a fluency-derivability order, not MOE year order. Spec §7.2.
export const TABLE_RANK = { 1: 0, 2: 1, 5: 2, 10: 3, 3: 4, 4: 5, 6: 6, 7: 7, 8: 8, 9: 9 };

// Working-set (struggling + learning) size bands. Spec §5.
export const WORKING_SET_THIN = 6;
export const WORKING_SET_BACKLOG = 18;

// Category budgets by band. Every row sums to 1.00. Spec §5.
export const BAND_BUDGETS = {
  empty:   { new: 0.55, working: 0.00, review: 0.35, mastered: 0.10 },
  thin:    { new: 0.35, working: 0.40, review: 0.20, mastered: 0.05 },
  healthy: { new: 0.25, working: 0.50, review: 0.20, mastered: 0.05 },
  backlog: { new: 0.15, working: 0.62, review: 0.18, mastered: 0.05 },
};

// Frontier width — how many unseen facts may be "in play" at once. Spec §7.6.
export const MAX_NEW_FACTS = 3;

// Per-fact probability ceiling and its waiver. Spec §8.
export const PER_FACT_CEILING = 0.15;
export const PER_FACT_CEILING_MIN_POOL = 8; // ceiling waived below this many eligible facts
export const PER_FACT_CEILING_MAX_PASSES = 3;

// Error-priority window: a missed fact gets this many draws of elevated
// priority (×ERROR_WINDOW_MULTIPLIER on its within-category weight) before
// falling back to baseline. In-memory only — never persisted. Spec §8.
export const ERROR_WINDOW_DRAWS = 10;
export const ERROR_WINDOW_MULTIPLIER = 4;

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function daysBetween(lastSeenIso, now) {
  if (!lastSeenIso) return Infinity;
  const lastSeen = new Date(lastSeenIso).getTime();
  return (now - lastSeen) / (1000 * 60 * 60 * 24);
}

/** Dedupe an array of fact objects by factKey, keeping the first occurrence
 * (spec §7.1). Must only be applied inside the selector — the `facts` memo
 * itself stays untouched (spec §2, §7.1). */
export function dedupeFacts(facts) {
  const seen = new Set();
  const out = [];
  for (const f of facts) {
    if (seen.has(f.factKey)) continue;
    seen.add(f.factKey);
    out.push(f);
  }
  return out;
}

/** Category test (spec §4), computed from the persisted mastery record. */
export function categorizeFact(fact, masteryData, now, threshold = DEFAULT_MASTERY_THRESHOLD) {
  const record = masteryData[fact.factKey];
  const correct = record?.correct || 0;
  const attempts = record?.attempts || 0;
  const lastSeen = record?.lastSeen || null;
  const daysSince = daysBetween(lastSeen, now);

  if (correct >= threshold) {
    const reviewsAfterMastery = correct - threshold;
    const intervalDays = REVIEW_INTERVALS[Math.min(reviewsAfterMastery, REVIEW_INTERVALS.length - 1)];
    const due = daysSince >= intervalDays;
    return { category: due ? "review" : "mastered", record, correct, attempts, daysSince, intervalDays };
  }
  if (attempts === 0 && !lastSeen) {
    return { category: "new", record, correct, attempts, daysSince, intervalDays: null };
  }
  if (correct === 0) {
    return { category: "struggling", record, correct, attempts, daysSince, intervalDays: null };
  }
  // 1 <= correct < threshold
  return { category: "learning", record, correct, attempts, daysSince, intervalDays: null };
}

/** Family coordinates (T = table, m = multiplier) for a fact. Spec §7.2. */
export function familyCoords(fact) {
  if (fact.operation === "multiply") {
    return { T: fact.a, m: fact.b };
  }
  // Divide: a = dividend, b = divisor, answer = quotient. Family factors are
  // divisor and quotient; T is whichever has the higher TABLE_RANK.
  const divisor = fact.b;
  const quotient = fact.answer;
  const divisorRank = TABLE_RANK[divisor] ?? -1;
  const quotientRank = TABLE_RANK[quotient] ?? -1;
  if (divisorRank === quotientRank) return { T: divisor, m: divisor };
  return divisorRank > quotientRank ? { T: divisor, m: quotient } : { T: quotient, m: divisor };
}

/** multiplierRank(T, m) evaluated against persisted mastery. Spec §7.3. */
export function multiplierRank(T, m, masteryData, threshold = DEFAULT_MASTERY_THRESHOLD) {
  const commuted = masteryData[`${m}x${T}`];
  if ((commuted?.correct || 0) >= threshold) return 0; // commutativity freebie
  if (m === 1 || m === 2 || m === 5 || m === 10) return 1; // skip-count anchors
  if (m === T) return 2; // the square
  return 3; // genuinely new memory load
}

/** anchorLevel for a divide fact: max `correct` across its two multiply
 * anchors (whichever have a persisted record; 0 if neither does). Spec §7.4. */
export function anchorLevel(fact, masteryData) {
  if (fact.operation !== "divide") return null;
  const d = fact.b; // divisor
  const q = fact.answer; // quotient
  const levels = [masteryData[`${d}x${q}`]?.correct, masteryData[`${q}x${d}`]?.correct]
    .filter((c) => c !== undefined);
  if (levels.length === 0) return 0;
  return Math.max(...levels);
}

function introductionSortKey(fact, masteryData, operation, threshold) {
  const { T, m } = familyCoords(fact);
  // Gated is only ever non-zero in divide-only mode — an advisory sort key,
  // not an exclusion (mixed-mode exclusion happens earlier, in buildFrontier).
  const gated = fact.operation === "divide" && operation === "divide" && anchorLevel(fact, masteryData) < 1 ? 1 : 0;
  return {
    gated,
    tableRank: TABLE_RANK[T] ?? 99,
    mRank: multiplierRank(T, m, masteryData, threshold),
    m,
    operationRank: fact.operation === "divide" ? 1 : 0,
    answer: fact.answer,
    factKey: fact.factKey,
  };
}

function compareIntroKeys(a, b) {
  if (a.gated !== b.gated) return a.gated - b.gated;
  if (a.tableRank !== b.tableRank) return a.tableRank - b.tableRank;
  if (a.mRank !== b.mRank) return a.mRank - b.mRank;
  if (a.m !== b.m) return a.m - b.m;
  if (a.operationRank !== b.operationRank) return a.operationRank - b.operationRank;
  if (a.answer !== b.answer) return a.answer - b.answer;
  return a.factKey < b.factKey ? -1 : a.factKey > b.factKey ? 1 : 0;
}

/**
 * Build the frontier from the "new"-category facts: apply the inverse-anchor
 * gate (spec §7.4), sort by the introduction order (spec §7.5), and take the
 * first MAX_NEW_FACTS. Returns the full sorted `introductionOrder` too (used
 * by QA to check "every one of them appears in the first 12 entries").
 */
export function buildFrontier(newCategoryFacts, masteryData, operation, threshold = DEFAULT_MASTERY_THRESHOLD) {
  const eligible = newCategoryFacts.filter((fact) => {
    if (fact.operation !== "divide") return true;
    if (operation === "mixed") return anchorLevel(fact, masteryData) >= 1; // blocking gate
    return true; // divide-only: advisory only (never excludes); multiply-only: no divide facts present
  });
  const introductionOrder = eligible
    .map((fact) => ({ fact, key: introductionSortKey(fact, masteryData, operation, threshold) }))
    .sort((a, b) => compareIntroKeys(a.key, b.key))
    .map((e) => e.fact);
  return { introductionOrder, frontier: introductionOrder.slice(0, MAX_NEW_FACTS) };
}

/** Pick the band row by working-set size W. Spec §5. */
export function selectBand(W) {
  if (W === 0) return "empty";
  if (W <= WORKING_SET_THIN) return "thin";
  if (W < WORKING_SET_BACKLOG) return "healthy";
  return "backlog";
}

// Within-category relative weights — spec §6.

function workingSetWeight(entry, threshold) {
  const { correct, attempts } = entry;
  if (correct === 0) return 3; // struggling
  if (correct === 1) return 2;
  if (correct === threshold - 1) return attempts >= 10 ? 1 : 2; // plateau clamp
  return 2; // defensive fallback; unreachable while 0 <= correct < threshold and threshold === 3
}

function reviewWeight(entry) {
  return 1 + Math.min(2, entry.daysSince / entry.intervalDays); // range 2…3
}

function masteredWeight(entry) {
  return Math.max(0.1, entry.daysSince / entry.intervalDays); // range 0.1…<1
}

function bucketOf(category) {
  return category === "struggling" || category === "learning" ? "working" : category;
}

/** Per-fact ceiling (spec §8): clamp any probability above PER_FACT_CEILING
 * and redistribute the excess proportionally across the other facts. Up to
 * PER_FACT_CEILING_MAX_PASSES passes; leftover excess is left in place. */
function applyCeiling(entries) {
  let list = entries.map((e) => ({ ...e }));
  for (let pass = 0; pass < PER_FACT_CEILING_MAX_PASSES; pass++) {
    const over = list.filter((e) => e.probability > PER_FACT_CEILING);
    if (over.length === 0) break;
    const overSet = new Set(over);
    let excess = 0;
    for (const e of over) {
      excess += e.probability - PER_FACT_CEILING;
      e.probability = PER_FACT_CEILING;
    }
    const others = list.filter((e) => !overSet.has(e));
    const othersSum = others.reduce((s, e) => s + e.probability, 0);
    if (excess > 0 && othersSum > 0) {
      for (const e of others) e.probability += excess * (e.probability / othersSum);
    }
  }
  return list;
}

/**
 * The full draw pipeline (spec §10, steps 1–9). Pure: takes the current
 * facts pool, persisted mastery, the previous fact's key (anti-repeat),
 * operation, and the in-memory error-priority window, and returns the
 * per-fact probabilities plus the drawn fact.
 *
 * @param {Object[]} facts - Raw fact pool (may contain duplicate factKeys).
 * @param {Object} masteryData - Persisted mastery record, keyed by factKey.
 * @param {string|null} prevKey - The previously-shown fact's factKey (anti-repeat).
 * @param {string} operation - "multiply" | "divide" | "mixed".
 * @param {Object} errorWindow - { [factKey]: drawsRemaining }. Read-only here.
 * @param {number} now - Date.now() equivalent, injectable for tests.
 * @param {number} threshold - DEFAULT_MASTERY_THRESHOLD, injectable for tests.
 */
export function computeSelection({ facts, masteryData, prevKey = null, operation, errorWindow = {}, now = Date.now(), threshold = DEFAULT_MASTERY_THRESHOLD }) {
  // Step 1: dedupe by factKey.
  const deduped = dedupeFacts(facts);
  if (deduped.length === 0) {
    return { entries: [], band: null, W: 0, selected: null, introductionOrder: [], frontierKeys: new Set() };
  }

  // Step 2: categorize every entry; compute W.
  const categorized = deduped.map((fact) => ({ fact, ...categorizeFact(fact, masteryData, now, threshold) }));
  const W = categorized.filter((c) => c.category === "struggling" || c.category === "learning").length;

  // Step 3: select the band row.
  const band = selectBand(W);
  const budgets = BAND_BUDGETS[band];

  // Step 4: build the frontier from the "new" category.
  const newFacts = categorized.filter((c) => c.category === "new").map((c) => c.fact);
  const { introductionOrder, frontier } = buildFrontier(newFacts, masteryData, operation, threshold);
  const frontierKeys = new Set(frontier.map((f) => f.factKey));

  // Step 5: drop all non-frontier "new" facts from the pool.
  let pool = categorized.filter((c) => c.category !== "new" || frontierKeys.has(c.fact.factKey));

  // Step 6: anti-repeat guard (only if the pool has more than one member).
  if (prevKey && pool.length > 1) {
    const withoutPrev = pool.filter((c) => c.fact.factKey !== prevKey);
    if (withoutPrev.length > 0) pool = withoutPrev;
  }

  if (pool.length === 0) {
    return { entries: [], band, W, selected: null, introductionOrder, frontierKeys };
  }

  // Step 7: category budgets, renormalized over categories that still have members.
  const bucketCounts = { new: 0, working: 0, review: 0, mastered: 0 };
  for (const c of pool) bucketCounts[bucketOf(c.category)]++;

  const shares = { new: 0, working: 0, review: 0, mastered: 0 };
  let shareSum = 0;
  for (const bucket of Object.keys(shares)) {
    if (bucketCounts[bucket] > 0) {
      shares[bucket] = budgets[bucket];
      shareSum += budgets[bucket];
    }
  }
  if (shareSum > 0) {
    for (const bucket of Object.keys(shares)) shares[bucket] = shares[bucket] / shareSum;
  }

  // Step 8: within-category relative weights (+ ×4 error-priority multiplier
  // on working-set weights), split each category's budget proportionally.
  const bucketWeightSums = { new: 0, working: 0, review: 0, mastered: 0 };
  const withWeights = pool.map((c) => {
    const bucket = bucketOf(c.category);
    let weight;
    if (bucket === "new") weight = 1; // uniform across the frontier
    else if (bucket === "working") {
      weight = workingSetWeight(c, threshold);
      const drawsRemaining = errorWindow[c.fact.factKey];
      if (drawsRemaining > 0) weight *= ERROR_WINDOW_MULTIPLIER;
    } else if (bucket === "review") weight = reviewWeight(c);
    else weight = masteredWeight(c);
    bucketWeightSums[bucket] += weight;
    return { ...c, bucket, weight };
  });

  let entries = withWeights.map((c) => {
    const weightSum = bucketWeightSums[c.bucket];
    const probability = weightSum > 0 ? shares[c.bucket] * (c.weight / weightSum) : 0;
    return { fact: c.fact, factKey: c.fact.factKey, category: c.category, probability };
  });

  // Step 9: per-fact ceiling, waived when fewer than 8 facts are eligible.
  if (entries.length >= PER_FACT_CEILING_MIN_POOL) {
    entries = applyCeiling(entries);
  }

  // Step 10: weighted-random draw.
  const selected = weightedDraw(entries);

  return { entries, band, W, selected, introductionOrder, frontierKeys };
}

/** Weighted-random draw over per-fact probabilities. `rng` is injectable for
 * deterministic tests. */
export function weightedDraw(entries, rng = Math.random) {
  if (entries.length === 0) return null;
  const total = entries.reduce((s, e) => s + e.probability, 0);
  if (total <= 0) return entries[Math.floor(rng() * entries.length)].fact;
  let r = rng() * total;
  for (const e of entries) {
    r -= e.probability;
    if (r <= 0) return e.fact;
  }
  return entries[entries.length - 1].fact;
}

// ---------------------------------------------------------------------
// Error-priority window helpers (spec §8). The window itself is an
// in-memory ref shaped { [factKey]: drawsRemaining }, owned by the caller
// (a useRef in the component, a plain { current: {} } in the sim script).
// ---------------------------------------------------------------------

/** Decrement every live counter by one draw; drop entries that hit zero.
 * Call once per draw, before computing the selection for that draw. */
export function tickErrorWindow(ref) {
  const next = {};
  for (const [key, remaining] of Object.entries(ref.current)) {
    const decremented = remaining - 1;
    if (decremented > 0) next[key] = decremented;
  }
  ref.current = next;
}

/** Set a fact's error-priority counter after a wrong answer. */
export function markErrorPriority(ref, factKey) {
  ref.current = { ...ref.current, [factKey]: ERROR_WINDOW_DRAWS };
}

/** Clear a fact's error-priority entry (correct answer, or expiry via tick). */
export function clearErrorPriority(ref, factKey) {
  if (!(factKey in ref.current)) return;
  const next = { ...ref.current };
  delete next[factKey];
  ref.current = next;
}
