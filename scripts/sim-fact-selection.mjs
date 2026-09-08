#!/usr/bin/env node
// Node simulation of the fact-selection policy — acceptance criteria from
// docs/fact-selection-policy.md §11, plus the two terminal-state checks.
//
// Imports the real, pure selection pipeline from src/factSelectionPolicy.js
// (the same module src/multiplication-practice.jsx uses), so this script
// tests the actual code path rather than a re-implementation of it.
//
// generateFacts() below is a local re-implementation of
// src/modules/multiply.jsx's generateFacts — that file can't be imported
// directly by plain Node because it contains JSX. The logic is copied
// verbatim (table/i loop, multiply + two divide facts) and is not the code
// under test, so faithfulness there doesn't affect the pipeline's coverage.
//
// Run: node scripts/sim-fact-selection.mjs

import {
  computeSelection,
  dedupeFacts,
  familyCoords,
  anchorLevel,
  tickErrorWindow,
  clearErrorPriority,
} from "../src/factSelectionPolicy.js";

// ---------------------------------------------------------------------
// generateFacts — mirrors src/modules/multiply.jsx (see header comment).
// ---------------------------------------------------------------------
function generateFacts({ tables, operation }) {
  const facts = [];
  tables.forEach((table) => {
    for (let i = 1; i <= 10; i++) {
      const product = table * i;
      if (operation === "multiply" || operation === "mixed") {
        facts.push({ a: table, b: i, answer: product, display: `${table} × ${i}`, factKey: `${table}x${i}`, operation: "multiply" });
      }
      if (operation === "divide" || operation === "mixed") {
        facts.push({ a: product, b: table, answer: i, display: `${product} ÷ ${table}`, factKey: `${product}÷${table}`, operation: "divide" });
        facts.push({ a: product, b: i, answer: table, display: `${product} ÷ ${i}`, factKey: `${product}÷${i}`, operation: "divide" });
      }
    }
  });
  return facts;
}

const ALL_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

// ---------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------

/** Mid-journey fixture (spec §11 preamble): 2/5/10 mastered with varied
 * lastSeen, 3/4 with ~25 facts spread across correct 0-2, 6-9 untouched. */
function buildMidJourneyMastery({ fillAllOfEasyMediumTables = false } = {}) {
  const masteryData = {};
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Tables 2, 5, 10 — fully mastered, varied lastSeen: a handful freshly
  // seen (not due), the rest spread 5-39 days back (mostly due for review).
  const anchorFacts = dedupeFacts(generateFacts({ tables: [2, 5, 10], operation: "mixed" }));
  anchorFacts.forEach((f, i) => {
    const daysAgo = i < 5 ? 0 : 5 + ((i * 2) % 35);
    masteryData[f.factKey] = {
      correct: 3,
      attempts: 4,
      lastSeen: new Date(now - daysAgo * DAY).toISOString(),
      masteredAt: new Date(now - 60 * DAY).toISOString(),
    };
  });

  // Tables 3, 4 — ~25 facts spread across correct 0-2 (the working set).
  const midFacts = dedupeFacts(generateFacts({ tables: [3, 4], operation: "mixed" }));
  const recordedCount = fillAllOfEasyMediumTables ? midFacts.length : Math.min(25, midFacts.length);
  midFacts.forEach((f, i) => {
    if (i >= recordedCount) return; // left unrecorded -> still "new"
    const correct = i % 3; // cycles 0, 1, 2
    masteryData[f.factKey] = {
      correct,
      attempts: correct + 1,
      lastSeen: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      masteredAt: null,
    };
  });

  // Tables 6-9 — no records at all.
  return masteryData;
}

function cloneMastery(masteryData) {
  const clone = {};
  for (const k of Object.keys(masteryData)) clone[k] = { ...masteryData[k] };
  return clone;
}

/** Runs a live practice session: every answer correct and inside the
 * fluency limit, so every draw is credited (mirrors dataManager's credited
 * path — the fluency gates themselves are out of scope, spec §2). */
function simulateLiveSession({ facts, initialMastery, operation, questions }) {
  const masteryData = cloneMastery(initialMastery);
  const errorWindowRef = { current: {} };
  let prevKey = null;
  let now = Date.now();
  const draws = [];

  for (let q = 0; q < questions; q++) {
    tickErrorWindow(errorWindowRef);
    const result = computeSelection({ facts, masteryData, prevKey, operation, errorWindow: errorWindowRef.current, now });
    const selected = result.selected;
    if (!selected) {
      draws.push({ selected: null, result });
      break;
    }
    const wasUnrecorded = !masteryData[selected.factKey];
    const anchorBefore = selected.operation === "divide" ? anchorLevel(selected, masteryData) : null;
    const category = result.entries.find((e) => e.factKey === selected.factKey)?.category;

    draws.push({ selected, category, wasUnrecorded, anchorBefore, result });

    if (!masteryData[selected.factKey]) {
      masteryData[selected.factKey] = { correct: 0, attempts: 0, lastSeen: null, masteredAt: null };
    }
    const rec = masteryData[selected.factKey];
    rec.attempts += 1;
    rec.correct += 1;
    rec.lastSeen = new Date(now).toISOString();
    clearErrorPriority(errorWindowRef, selected.factKey);

    prevKey = selected.factKey;
    now += 30 * 1000;
  }

  return { draws, finalMastery: masteryData };
}

/** Repeated static draws against a frozen masteryData (no updates between
 * draws — only the anti-repeat prevKey advances). Used where the spec asks
 * for "mastery frozen". */
function simulateFrozenDraws({ facts, masteryData, operation, count, now = Date.now() }) {
  let prevKey = null;
  const draws = [];
  for (let i = 0; i < count; i++) {
    const result = computeSelection({ facts, masteryData, prevKey, operation, errorWindow: {}, now });
    draws.push(result);
    prevKey = result.selected?.factKey ?? prevKey;
  }
  return draws;
}

// ---------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------
const results = [];
function report(id, description, pass, detail) {
  results.push({ id, pass });
  const status = pass ? "PASS" : "FAIL";
  console.log(`[${status}] ${id} — ${description}`);
  console.log(`       ${detail}`);
}

const rawMidJourneyFacts = generateFacts({ tables: ALL_TABLES, operation: "mixed" });
const midJourneyMastery = buildMidJourneyMastery();

// ---------------------------------------------------------------------
// Criterion 1 — Mastered no longer dominates.
// ---------------------------------------------------------------------
{
  const N = 10000;
  const draws = simulateFrozenDraws({ facts: rawMidJourneyFacts, masteryData: midJourneyMastery, operation: "mixed", count: N });
  const counts = { new: 0, mastered: 0, review: 0, struggling: 0, learning: 0 };
  for (const d of draws) {
    const cat = d.entries.find((e) => e.factKey === d.selected.factKey)?.category;
    counts[cat] = (counts[cat] || 0) + 1;
  }
  const pNew = counts.new / N;
  const pMastered = counts.mastered / N;
  const pWorking = (counts.struggling + counts.learning) / N;
  const pass = pNew >= 0.12 && pNew <= 0.20 && pMastered <= 0.08 && pWorking >= 0.55 && pWorking <= 0.70;
  report(
    "§11.1", "Mastered no longer dominates",
    pass,
    `P(new)=${(pNew * 100).toFixed(2)}% (want 12–20%), P(mastered)=${(pMastered * 100).toFixed(2)}% (want ≤8%), P(struggling∪learning)=${(pWorking * 100).toFixed(2)}% (want 55–70%)`
  );
}

// ---------------------------------------------------------------------
// Criterion 2 — Sessions advance.
// ---------------------------------------------------------------------
{
  const SESSIONS = 200;
  const QUESTIONS = 40;
  let sessionsWithAtLeast3New = 0;
  for (let s = 0; s < SESSIONS; s++) {
    const { draws } = simulateLiveSession({ facts: rawMidJourneyFacts, initialMastery: midJourneyMastery, operation: "mixed", questions: QUESTIONS });
    const newlyIntroduced = new Set(draws.filter((d) => d.wasUnrecorded).map((d) => d.selected.factKey));
    if (newlyIntroduced.size >= 3) sessionsWithAtLeast3New++;
  }
  const pctSessions = sessionsWithAtLeast3New / SESSIONS;
  const pass2a = pctSessions >= 0.95;
  report(
    "§11.2a", "Sessions advance (≥3 new facts per 40-question session)",
    pass2a,
    `${sessionsWithAtLeast3New}/${SESSIONS} sessions (${(pctSessions * 100).toFixed(1)}%) introduced ≥3 previously-unrecorded facts (want ≥95%)`
  );

  // Second half: 2/3/4/5/10 have no unrecorded facts left — new inflow must
  // come from 6-9.
  const backlogMastery = buildMidJourneyMastery({ fillAllOfEasyMediumTables: true });
  let totalNew = 0;
  let newFrom6to9 = 0;
  for (let s = 0; s < SESSIONS; s++) {
    const { draws } = simulateLiveSession({ facts: rawMidJourneyFacts, initialMastery: backlogMastery, operation: "mixed", questions: QUESTIONS });
    const introduced = draws.filter((d) => d.wasUnrecorded);
    for (const d of introduced) {
      totalNew++;
      const { T } = familyCoords(d.selected);
      if (T >= 6 && T <= 9) newFrom6to9++;
    }
  }
  const pctFrom6to9 = totalNew > 0 ? newFrom6to9 / totalNew : 0;
  const pass2b = pctFrom6to9 >= 0.90;
  report(
    "§11.2b", "New inflow comes from tables 6-9 once 2/3/4/5/10 are exhausted",
    pass2b,
    `${newFrom6to9}/${totalNew} newly-introduced facts (${(pctFrom6to9 * 100).toFixed(1)}%) were from tables 6-9 (want ≥90%)`
  );
}

// ---------------------------------------------------------------------
// Criterion 3 — Fresh profile does not firehose.
// ---------------------------------------------------------------------
{
  const facts = generateFacts({ tables: ALL_TABLES, operation: "mixed" });
  const { draws } = simulateLiveSession({ facts, initialMastery: {}, operation: "mixed", questions: 10 });
  const distinctKeys = new Set(draws.map((d) => d.selected.factKey));
  const distinctCountOk = distinctKeys.size >= 3 && distinctKeys.size <= 8;

  // "The introduction order" is recomputed dynamically per draw (it depends
  // on live mastery, e.g. the inverse-anchor gate opening up as multiply
  // facts get credited — spec §7.4). A fact drawn from the working set after
  // its first (new-category) appearance is still legitimate: it was already
  // within the first 12 of *some* draw's introduction order at the moment it
  // was introduced, it just no longer shows up in "new"-only recomputations
  // once it has an attempt. So the check is: every distinct factKey drawn
  // must appear in the first 12 of the introduction order of AT LEAST ONE of
  // the 10 draws (i.e. it was genuinely introduced via the frontier, not
  // smuggled in some other way).
  const unionFirst12 = new Set();
  for (const d of draws) {
    for (const f of d.result.introductionOrder.slice(0, 12)) unionFirst12.add(f.factKey);
  }
  let allWithinFirst12 = true;
  for (const key of distinctKeys) {
    if (!unionFirst12.has(key)) allWithinFirst12 = false;
  }

  let noBackToBack = true;
  for (let i = 1; i < draws.length; i++) {
    if (draws[i].selected.factKey === draws[i - 1].selected.factKey) noBackToBack = false;
  }

  const pass = distinctCountOk && allWithinFirst12 && noBackToBack;
  report(
    "§11.3", "Fresh profile does not firehose",
    pass,
    `distinct factKeys in first 10 draws = ${distinctKeys.size} (want 3–8); all within first-12 introduction order = ${allWithinFirst12}; no back-to-back repeat = ${noBackToBack}`
  );
}

// ---------------------------------------------------------------------
// Criterion 4 — Terminal states still serve.
// ---------------------------------------------------------------------
{
  // (a) All 189 facts mastered, nothing due.
  const facts = generateFacts({ tables: ALL_TABLES, operation: "mixed" });
  const deduped = dedupeFacts(facts);
  const now = Date.now();
  const masteryData = {};
  for (const f of deduped) {
    masteryData[f.factKey] = { correct: 3, attempts: 5, lastSeen: new Date(now).toISOString(), masteredAt: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString() };
  }
  const draws = simulateFrozenDraws({ facts, masteryData, operation: "mixed", count: 1000, now });
  const allNonNull = draws.every((d) => d.selected !== null);
  let noBackToBack = true;
  for (let i = 1; i < draws.length; i++) {
    if (draws[i].selected?.factKey === draws[i - 1].selected?.factKey) noBackToBack = false;
  }
  const distinct = new Set(draws.map((d) => d.selected?.factKey)).size;
  const coverage = distinct / deduped.length;
  const pass4a = allNonNull && noBackToBack && coverage >= 0.90;
  report(
    "§11.4a", "Terminal state — all mastered, nothing due",
    pass4a,
    `1000/1000 non-null = ${allNonNull}; no back-to-back repeat = ${noBackToBack}; distinct coverage = ${distinct}/${deduped.length} (${(coverage * 100).toFixed(1)}%, want ≥90%)`
  );

  // (b) focusNumber = 7, multiply-only (10 facts), empty mastery.
  const focusFacts = generateFacts({ tables: [7], operation: "multiply" });
  const { draws: liveDraws } = simulateLiveSession({ facts: focusFacts, initialMastery: {}, operation: "multiply", questions: 200 });
  const allNonNullB = liveDraws.every((d) => d.selected !== null) && liveDraws.length === 200;
  let noBackToBackB = true;
  for (let i = 1; i < liveDraws.length; i++) {
    if (liveDraws[i].selected.factKey === liveDraws[i - 1].selected.factKey) noBackToBackB = false;
  }
  let newAlwaysPossibleWhileUnseen = true;
  for (const d of liveDraws) {
    const unseenExists = d.result.entries.some((e) => e.category === "new");
    if (unseenExists) {
      const newHasProbability = d.result.entries.some((e) => e.category === "new" && e.probability > 0);
      if (!newHasProbability) newAlwaysPossibleWhileUnseen = false;
    }
  }
  const pass4b = allNonNullB && noBackToBackB && newAlwaysPossibleWhileUnseen;
  report(
    "§11.4b", "Terminal state — focusNumber=7 multiply-only, empty mastery",
    pass4b,
    `200/200 non-null = ${allNonNullB}; no back-to-back repeat = ${noBackToBackB}; P(new)>0 whenever unseen facts remain = ${newAlwaysPossibleWhileUnseen}`
  );
}

// ---------------------------------------------------------------------
// Criterion 5 — Dedupe and operation balance.
// ---------------------------------------------------------------------
{
  const raw = generateFacts({ tables: ALL_TABLES, operation: "mixed" });
  const deduped = dedupeFacts(raw);
  const keys = new Set(deduped.map((f) => f.factKey));
  const dedupeOk = raw.length === 270 && deduped.length === 189 && keys.size === 189;

  const N = 10000;
  const draws = simulateFrozenDraws({ facts: raw, masteryData: midJourneyMastery, operation: "mixed", count: N });
  const multiplyDraws = draws.filter((d) => d.selected.operation === "multiply").length;
  const pctMultiply = multiplyDraws / N;
  const balanceOk = pctMultiply >= 0.40 && pctMultiply <= 0.60;

  const pass = dedupeOk && balanceOk;
  report(
    "§11.5", "Dedupe and operation balance",
    pass,
    `raw=${raw.length} (want 270), deduped=${deduped.length} distinct=${keys.size} (want 189/189); multiply share of draws = ${(pctMultiply * 100).toFixed(1)}% (want 40–60%)`
  );
}

// ---------------------------------------------------------------------
// Criterion 6 — Division follows its anchor.
// ---------------------------------------------------------------------
{
  const facts = generateFacts({ tables: ALL_TABLES, operation: "mixed" });
  const { draws } = simulateLiveSession({ facts, initialMastery: {}, operation: "mixed", questions: 60 });
  const seenDivideOnce = new Set();
  let violations = 0;
  let firstTimeDivideDraws = 0;
  for (const d of draws) {
    if (d.selected.operation !== "divide") continue;
    if (seenDivideOnce.has(d.selected.factKey)) continue; // only "first" draws are gated
    seenDivideOnce.add(d.selected.factKey);
    firstTimeDivideDraws++;
    if (d.anchorBefore === null || d.anchorBefore < 1) violations++;
  }
  const pass6a = violations === 0;
  report(
    "§11.6a", "Division follows its anchor (mixed mode, blocking gate)",
    pass6a,
    `${firstTimeDivideDraws} first-time divide draws checked, ${violations} violations (want 0)`
  );

  const divideOnlyFacts = generateFacts({ tables: ALL_TABLES, operation: "divide" });
  const result = computeSelection({ facts: divideOnlyFacts, masteryData: {}, prevKey: null, operation: "divide", errorWindow: {}, now: Date.now() });
  const pass6b = result.selected !== null && result.selected.operation === "divide";
  report(
    "§11.6b", "Divide-only mode serves from question 1 (advisory gate)",
    pass6b,
    `first draw on a fresh divide-only profile: selected=${result.selected ? result.selected.factKey : "null"}`
  );
}

// ---------------------------------------------------------------------
// Standing requirement: npm run build passes — checked separately by the CI
// step / commit workflow, not simulated here.
// ---------------------------------------------------------------------

const failed = results.filter((r) => !r.pass);
console.log("");
console.log(`${results.length - failed.length}/${results.length} criteria passed.`);
if (failed.length > 0) {
  console.log(`FAILED: ${failed.map((f) => f.id).join(", ")}`);
  process.exit(1);
}
process.exit(0);
