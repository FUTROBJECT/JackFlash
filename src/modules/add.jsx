/**
 * Add & Subtract Module Definition
 *
 * Two-tier mastery-gated module:
 *   Tier 1 (Free + paid): Groups N, M, F, K, X — facts within 20
 *   Tier 2 (Paid, gated on 80% Tier 1 mastery): Groups R, S, W — within 10,000
 *
 * All item pools are DETERMINISTIC — no Math.random() in generation.
 * Item keys are add:-prefixed and stable across loads.
 */

import { COLORS } from "../constants.js";
import { DEFAULT_MASTERY_THRESHOLD } from "../constants.js";
import { getMastery } from "../dataManager.js";

// ---------------------------------------------------------------------------
// TIER 1 POOLS — fully enumerated, then curated to spec sizes
// ---------------------------------------------------------------------------

function buildGroupN() {
  const items = [];

  // N1 — Bond a small whole (whole 2–10, commutative-collapsed)
  for (let whole = 2; whole <= 10; whole++) {
    for (let partA = 1; partA < whole; partA++) {
      const partB = whole - partA;
      // Commutative collapse: only store ascending pair (smaller part as knownPart)
      if (partA > partB) continue;
      const itemKey = `add:bond:${whole}=${partA}+?`;
      items.push({
        itemKey,
        skill: "N1",
        group: "N",
        answerType: "number",
        whole,
        knownPart: partA,
        missingPart: partB,
        correctAnswer: partB,
        display: `${whole} = ${partA} + ?`,
        becauseText: `${whole} splits into ${partA} and ${partB} — that's the number bond.`,
      });
    }
  }

  // N2 — Bond a teen whole (whole 11–20, curated to ~40)
  const N2_WHOLE_RANGE = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  // For each teen whole, include knownParts that are pedagogically useful
  // (especially the "make ten" decomposition and a few others)
  const N2_CURATED = [
    // whole=11: 1+10, 2+9, 3+8, 4+7, 5+6 (5 pairs)
    [11, 1], [11, 2], [11, 3], [11, 4], [11, 5],
    // whole=12: 2+10, 3+9, 4+8, 5+7 (4 pairs)
    [12, 2], [12, 3], [12, 4], [12, 5],
    // whole=13: 3+10, 4+9, 5+8, 6+7 (4 pairs)
    [13, 3], [13, 4], [13, 5], [13, 6],
    // whole=14: 4+10, 5+9, 6+8 (3 pairs)
    [14, 4], [14, 5], [14, 6],
    // whole=15: 5+10, 6+9, 7+8 (3 pairs)
    [15, 5], [15, 6], [15, 7],
    // whole=16: 6+10, 7+9 (2 pairs)
    [16, 6], [16, 7],
    // whole=17: 7+10, 8+9 (2 pairs)
    [17, 7], [17, 8],
    // whole=18: 8+10, 9+9 → skip 9+9 (same part) → just 8+10
    [18, 8],
    // whole=19: 9+10
    [19, 9],
    // whole=20: 10+10 → skip (same part) → use 9+11 would be >10 so use 10+10 → skip
    // Actually 10+10 is same part; use whole=20, knownPart=10 → missing=10 (boring)
    // Use 20=6+14 (pedagogically useful for tens work)
    [20, 6],
  ];
  // Total: 5+4+4+3+3+2+2+1+1+1 = 26 items (under the spec's ~40 target but good coverage)
  N2_CURATED.forEach(([whole, partA]) => {
    const partB = whole - partA;
    items.push({
      itemKey: `add:bond:${whole}=${partA}+?`,
      skill: "N2",
      group: "N",
      answerType: "number",
      whole,
      knownPart: partA,
      missingPart: partB,
      correctAnswer: partB,
      display: `${whole} = ${partA} + ?`,
      becauseText: `${whole} splits into ${partA} and ${partB} — that's the number bond.`,
    });
  });

  // N3 — Decompose to ten (11–19 → 10 + ?)
  for (let whole = 11; whole <= 19; whole++) {
    const ones = whole - 10;
    items.push({
      itemKey: `add:bond:${whole}=10+?`,
      skill: "N3",
      group: "N",
      answerType: "number",
      whole,
      knownPart: 10,
      missingPart: ones,
      correctAnswer: ones,
      display: `${whole} = 10 + ?`,
      becauseText: `${whole} is made of 10 and ${ones} — tens and ones!`,
    });
  }

  return items;
}

function buildGroupM() {
  const items = [];

  // M1 — Add through ten: a + b, a,b ≤9, sum 11–18, at least one addend 6–9
  const M1_PAIRS = [
    [6, 5], [6, 6], [6, 7], [6, 8], [6, 9],
    [7, 4], [7, 5], [7, 6], [7, 7], [7, 8], [7, 9],
    [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [8, 9],
    [9, 2], [9, 3], [9, 4], [9, 5], [9, 6], [9, 7], [9, 8], [9, 9],
  ];
  // Commutative collapse (addends stored ascending)
  const M1_SEEN = new Set();
  M1_PAIRS.forEach(([a, b]) => {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (lo + hi < 11 || lo + hi > 18) return;
    const key = `add:mk10:${lo}+${hi}`;
    if (M1_SEEN.has(key)) return;
    M1_SEEN.add(key);
    const sum = lo + hi;
    const bridge = 10 - lo; // how many from hi to complete 10
    const leftover = hi - bridge;
    items.push({
      itemKey: key,
      skill: "M1",
      group: "M",
      answerType: "number",
      a: lo, b: hi, sum,
      correctAnswer: sum,
      display: `${lo} + ${hi} = ?`,
      bridge, leftover,
      becauseText: `${lo} needs ${bridge} to make 10. ${hi} = ${bridge} + ${leftover}. So 10 + ${leftover} = ${sum}.`,
    });
  });

  // M2 — Subtract through ten: m − s, m 11–18, crossing ten required
  const M2_PAIRS = [
    // minuend 11: 11-2=9, 11-3=8, 11-4=7, 11-5=6, 11-6=5, 11-7=4, 11-8=3, 11-9=2
    [11, 2], [11, 3], [11, 4], [11, 5], [11, 6], [11, 7], [11, 8], [11, 9],
    // minuend 12: subtract enough to cross 10
    [12, 3], [12, 4], [12, 5], [12, 6], [12, 7], [12, 8], [12, 9],
    // minuend 13
    [13, 4], [13, 5], [13, 6], [13, 7], [13, 8], [13, 9],
    // minuend 14
    [14, 5], [14, 6], [14, 7], [14, 8], [14, 9],
    // minuend 15
    [15, 6], [15, 7], [15, 8], [15, 9],
  ];
  // Curate to ~30 by taking a stride
  const M2_CURATED = [
    [11, 2], [11, 4], [11, 7], [11, 9],
    [12, 3], [12, 5], [12, 8], [12, 9],
    [13, 4], [13, 6], [13, 9],
    [14, 5], [14, 7], [14, 9],
    [15, 6], [15, 8], [15, 9],
    [16, 7], [16, 8], [16, 9],
    [17, 8], [17, 9],
    [18, 9],
  ];
  M2_CURATED.forEach(([m, s]) => {
    const diff = m - s;
    const onesM = m - 10; // ones digit of minuend
    const bridgeToTen = onesM; // steps to reach 10
    const remaining = s - bridgeToTen; // steps below 10
    items.push({
      itemKey: `add:mk10:${m}-${s}`,
      skill: "M2",
      group: "M",
      answerType: "number",
      a: m, b: s,
      correctAnswer: diff,
      display: `${m} − ${s} = ?`,
      onesM, bridgeToTen, remaining,
      becauseText: `${m} − ${bridgeToTen} = 10. Then 10 − ${remaining} = ${diff}.`,
    });
  });

  return items;
}

function buildGroupF() {
  const items = [];

  // F1 — Addition facts to 20 (commutative-collapsed, sum ≤ 20)
  // Curated to ~50: all "bridging" facts plus key anchor facts
  const F1_PAIRS = [
    // Sums 0–10 (within 10 number bonds, building on Group N)
    [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9],
    [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8],
    [3, 3], [3, 4], [3, 5], [3, 6], [3, 7],
    [4, 4], [4, 5], [4, 6],
    [5, 5],
    // Sums 11–18 (crossing ten — the bridge facts from Group M)
    [2, 9], [3, 8], [3, 9],
    [4, 7], [4, 8], [4, 9],
    [5, 6], [5, 7], [5, 8], [5, 9],
    [6, 6], [6, 7], [6, 8], [6, 9],
    [7, 7], [7, 8], [7, 9],
    [8, 8], [8, 9],
    [9, 9],
    // Sums 19–20
    [9, 10], [10, 10],
  ];
  F1_PAIRS.forEach(([a, b]) => {
    const sum = a + b;
    items.push({
      itemKey: `add:fact:${a}+${b}`,
      skill: "F1",
      group: "F",
      answerType: "number",
      a, b, sum,
      correctAnswer: sum,
      display: `${a} + ${b} = ?`,
      becauseText: `${a} + ${b} = ${sum}`,
    });
  });

  // F2 — Subtraction facts within 20 (a ≤ 20, b ≤ a, result ≥ 0)
  // Curated to ~50: corresponding inverses of F1 + key facts
  const F2_FACTS = [
    [1, 0], [1, 1],
    [2, 0], [2, 1], [2, 2],
    [3, 1], [3, 2], [3, 3],
    [4, 1], [4, 2], [4, 3], [4, 4],
    [5, 1], [5, 2], [5, 3], [5, 4], [5, 5],
    [6, 2], [6, 3], [6, 4], [6, 5], [6, 6],
    [7, 3], [7, 4], [7, 5], [7, 6], [7, 7],
    [8, 4], [8, 5], [8, 6], [8, 7], [8, 8],
    [9, 0], [9, 1], [9, 2], [9, 4], [9, 5], [9, 6], [9, 7], [9, 8], [9, 9],
    [10, 1], [10, 3], [10, 5], [10, 7], [10, 9], [10, 10],
    [11, 2], [11, 4], [11, 7], [11, 9],
    [12, 3], [12, 5], [12, 8],
    [13, 4], [13, 6], [13, 9],
    [14, 5], [14, 7],
    [15, 6], [15, 9],
    [16, 7], [17, 8], [18, 9],
    [20, 10],
  ];
  F2_FACTS.forEach(([a, b]) => {
    const diff = a - b;
    items.push({
      itemKey: `add:fact:${a}-${b}`,
      skill: "F2",
      group: "F",
      answerType: "number",
      a, b,
      correctAnswer: diff,
      display: `${a} − ${b} = ?`,
      becauseText: `${a} − ${b} = ${diff}`,
    });
  });

  return items;
}

function buildGroupK() {
  const items = [];

  // K1 — Complete the family: given 3 of 4 sentences, supply the 4th
  // Curated trios (a, b, whole=a+b)
  const K1_TRIOS = [
    [3, 4, 7], [2, 5, 7], [1, 6, 7],
    [3, 5, 8], [2, 6, 8], [4, 4, 8],
    [4, 5, 9], [3, 6, 9], [2, 7, 9],
    [4, 6, 10], [3, 7, 10], [2, 8, 10], [5, 5, 10],
    [3, 8, 11], [4, 7, 11], [5, 6, 11],
    [4, 8, 12], [5, 7, 12], [3, 9, 12],
    [5, 8, 13], [6, 7, 13],
    [6, 8, 14], [5, 9, 14],
    [7, 8, 15], [6, 9, 15],
    [7, 9, 16], [8, 8, 16],
    [8, 9, 17],
    [9, 9, 18],
  ];
  // For each trio, ask for one of the four sentences (rotate by index)
  const SENTENCE_FORMS = [
    (a, b, w) => ({ ask: `${w} - ${a} = ?`, answer: b }),  // whole - partA = partB
    (a, b, w) => ({ ask: `${w} - ${b} = ?`, answer: a }),  // whole - partB = partA
  ];
  K1_TRIOS.forEach(([a, b, w], idx) => {
    const form = SENTENCE_FORMS[idx % 2](a, b, w);
    items.push({
      itemKey: `add:fam:${a},${b},${w}:${w}-${idx % 2 === 0 ? a : b}`,
      skill: "K1",
      group: "K",
      answerType: "number",
      partA: a, partB: b, whole: w,
      sentenceA: `${a} + ${b} = ${w}`,
      sentenceB: `${b} + ${a} = ${w}`,
      sentenceC: idx % 2 === 0 ? `${w} - ${b} = ${a}` : `${w} - ${a} = ${b}`,
      askedSentence: form.ask,
      correctAnswer: form.answer,
      display: form.ask,
      becauseText: `The same three numbers make a family — subtraction undoes addition.`,
    });
  });

  // K2 — Which fact undoes this? Given a+b=c, pick the inverse subtraction
  // Use a subset of K1 trios for variety
  const K2_TRIOS = [
    [3, 4, 7], [2, 6, 8], [4, 5, 9], [3, 7, 10],
    [5, 6, 11], [4, 8, 12], [5, 8, 13], [6, 8, 14],
    [7, 8, 15], [7, 9, 16], [8, 9, 17], [9, 9, 18],
    [2, 8, 10], [6, 7, 13], [5, 9, 14], [6, 9, 15],
    [3, 9, 12], [4, 7, 11],
  ];
  K2_TRIOS.forEach(([a, b, w]) => {
    // Correct answer: w - a = b (the primary inverse)
    // Distractors: w - b = a (the other inverse), a + b = w (the original), w - w = 0 (error)
    items.push({
      itemKey: `add:fam:inv:${a}+${b}`,
      skill: "K2",
      group: "K",
      answerType: "choice",
      partA: a, partB: b, whole: w,
      given: `${a} + ${b} = ${w}`,
      correctAnswer: `${w} - ${a} = ${b}`,
      choices: [
        `${w} - ${a} = ${b}`,
        `${w} - ${b} = ${a}`,
        `${a} + ${b} = ${w}`,
        `${w} - ${w} = 0`,
      ],
      display: `${a} + ${b} = ${w}. Which undoes it?`,
      becauseText: `${a} + ${b} = ${w}, so ${w} − ${a} = ${b} — subtraction undoes addition.`,
    });
  });

  return items;
}

function buildGroupX() {
  const items = [];

  // X1 — Missing addend: a + ? = c and ? + b = c (within 20)
  const X1_FACTS = [
    [3, 7], [4, 7], [5, 7], [6, 7],
    [4, 8], [5, 8], [6, 8], [7, 8],
    [5, 9], [6, 9], [7, 9], [8, 9],
    [6, 10], [7, 10], [8, 10], [9, 10],
    [3, 11], [5, 11], [7, 11], [9, 11],
    [4, 12], [6, 12], [8, 12],
    [5, 13], [7, 13], [9, 13],
    [6, 14], [8, 14],
    [7, 15], [9, 15],
    [8, 16], [9, 17], [9, 18],
    [10, 20], [5, 15], [4, 10], [3, 10],
    [2, 10], [1, 10], [7, 14],
    [8, 15],
  ];
  X1_FACTS.forEach(([a, whole]) => {
    const missing = whole - a;
    // Only store if missing ≥ 1 and makes sense
    if (missing < 1) return;
    items.push({
      itemKey: `add:miss:${a}+?=${whole}`,
      skill: "X1",
      group: "X",
      answerType: "number",
      a, whole, missing,
      correctAnswer: missing,
      display: `${a} + ? = ${whole}`,
      becauseText: `${a} + ${missing} = ${whole} — the missing piece of the bond!`,
    });
  });

  // X2 — Missing minuend/subtrahend: ? − b = c and a − ? = c (within 20)
  const X2_MISS_SUB = [
    // ? - b = c: missing minuend  (format: b, c → whole=b+c)
    [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
    [3, 8], [4, 9], [5, 10], [6, 11],
    [7, 12], [8, 13], [9, 11],
    [3, 7], [4, 8], [6, 9],
  ];
  X2_MISS_SUB.forEach(([b, c]) => {
    const whole = b + c;
    if (whole > 20) return;
    items.push({
      itemKey: `add:miss:?-${b}=${c}`,
      skill: "X2",
      group: "X",
      answerType: "number",
      b, c, whole,
      correctAnswer: whole,
      display: `? − ${b} = ${c}`,
      becauseText: `If ? − ${b} = ${c}, then ? = ${c} + ${b} = ${whole}.`,
    });
  });

  const X2_MISS_MINU = [
    // a - ? = c: missing subtrahend (format: a, c → b=a-c)
    [12, 5], [13, 4], [14, 6], [15, 7], [16, 8], [17, 9],
    [11, 3], [12, 4], [13, 8], [14, 9],
    [10, 3], [10, 6], [15, 9], [11, 8],
    [12, 9], [20, 10],
    [9, 4], [8, 3], [7, 2],
  ];
  X2_MISS_MINU.forEach(([a, c]) => {
    const b = a - c;
    if (b < 1) return;
    items.push({
      itemKey: `add:miss:${a}-?=${c}`,
      skill: "X2",
      group: "X",
      answerType: "number",
      a, b, c,
      correctAnswer: b,
      display: `${a} − ? = ${c}`,
      becauseText: `If ${a} − ? = ${c}, then ? = ${a} − ${c} = ${b}.`,
    });
  });

  return items;
}

// ---------------------------------------------------------------------------
// TIER 2 POOLS — curated, deterministic tables
// ---------------------------------------------------------------------------

function buildGroupR() {
  const items = [];

  // R1 — 3-digit, no regrouping (16 items: 8 add, 8 sub)
  const R1_ADD = [
    [342, 215], [124, 352], [231, 418], [113, 245],
    [320, 147], [204, 163], [412, 365], [503, 294],
  ];
  const R1_SUB = [
    [568, 124], [789, 345], [654, 312], [987, 654],
    [475, 231], [896, 342], [763, 421], [958, 235],
  ];
  R1_ADD.forEach(([a, b]) => {
    const ans = a + b;
    items.push({
      itemKey: `add:col:${a}+${b}`,
      skill: "R1",
      group: "R",
      answerType: "column",
      op: "+",
      a, b,
      correctAnswer: ans,
      display: `${a} + ${b}`,
      digits: 3,
      hasRegroup: false,
      becauseText: `Add each column right to left: ones, tens, hundreds. No regrouping needed.`,
    });
  });
  R1_SUB.forEach(([a, b]) => {
    const ans = a - b;
    items.push({
      itemKey: `add:col:${a}-${b}`,
      skill: "R1",
      group: "R",
      answerType: "column",
      op: "-",
      a, b,
      correctAnswer: ans,
      display: `${a} − ${b}`,
      digits: 3,
      hasRegroup: false,
      becauseText: `Subtract each column right to left: ones, tens, hundreds. No regrouping needed.`,
    });
  });

  // R2 — 3-digit with regrouping (24 items: carry, borrow, borrow-across-zero)
  const R2_ADD_CARRY = [
    [367, 256], [489, 345], [576, 247], [683, 158],
    [794, 137], [256, 167], [478, 365], [389, 246],
  ];
  const R2_SUB_BORROW = [
    [503, 178], [700, 345], [604, 267], [802, 359],
    [751, 384], [643, 278], [521, 364], [907, 458],
  ];
  R2_ADD_CARRY.forEach(([a, b]) => {
    const ans = a + b;
    items.push({
      itemKey: `add:col:${a}+${b}`,
      skill: "R2",
      group: "R",
      answerType: "column",
      op: "+",
      a, b,
      correctAnswer: ans,
      display: `${a} + ${b}`,
      digits: 3,
      hasRegroup: true,
      becauseText: `When a column sum is 10 or more, carry 1 to the next place.`,
    });
  });
  R2_SUB_BORROW.forEach(([a, b]) => {
    const ans = a - b;
    items.push({
      itemKey: `add:col:${a}-${b}`,
      skill: "R2",
      group: "R",
      answerType: "column",
      op: "-",
      a, b,
      correctAnswer: ans,
      display: `${a} − ${b}`,
      digits: 3,
      hasRegroup: true,
      becauseText: `You can't take the bigger digit from the smaller one — rename first.`,
    });
  });

  // R3 — 4-digit with regrouping (24 items: 12 add, 12 sub)
  const R3_ADD = [
    [3475, 2896], [4567, 2897], [5643, 2789], [6078, 2345],
    [7234, 1987], [3892, 4567], [4756, 3894], [5834, 2967],
    [1234, 5678], [2345, 6789], [3456, 4578], [4567, 3895],
  ];
  const R3_SUB = [
    [6002, 3547], [7001, 2348], [8003, 4567], [9000, 3456],
    [5678, 2893], [6543, 1897], [7812, 3456], [8901, 4567],
    [9999, 4567], [7000, 3489], [6100, 2345], [8050, 3678],
  ];
  R3_ADD.forEach(([a, b]) => {
    const ans = a + b;
    if (ans > 9999) return; // spec cap
    items.push({
      itemKey: `add:col:${a}+${b}`,
      skill: "R3",
      group: "R",
      answerType: "column",
      op: "+",
      a, b,
      correctAnswer: ans,
      display: `${a} + ${b}`,
      digits: 4,
      hasRegroup: true,
      becauseText: `Carry through each place: ones, tens, hundreds, thousands.`,
    });
  });
  R3_SUB.forEach(([a, b]) => {
    const ans = a - b;
    if (ans < 0) return;
    items.push({
      itemKey: `add:col:${a}-${b}`,
      skill: "R3",
      group: "R",
      answerType: "column",
      op: "-",
      a, b,
      correctAnswer: ans,
      display: `${a} − ${b}`,
      digits: 4,
      hasRegroup: true,
      becauseText: `Rename across places when needed — borrow from the next column.`,
    });
  });

  return items;
}

function buildGroupS() {
  const items = [];

  // S1 — Add/subtract in parts (2-digit ± 2-digit, 20 items)
  const S1_ITEMS = [
    [46, 23, "+"], [67, 31, "+"], [53, 24, "+"], [78, 21, "+"],
    [34, 45, "+"], [56, 32, "+"], [72, 25, "+"], [45, 34, "+"],
    [89, 10, "-"], [73, 31, "-"], [86, 42, "-"], [94, 53, "-"],
    [67, 34, "-"], [58, 24, "-"], [79, 46, "-"], [85, 53, "-"],
    [65, 22, "+"], [47, 31, "+"], [91, 45, "-"], [76, 43, "-"],
  ];
  S1_ITEMS.forEach(([a, b, op]) => {
    const ans = op === "+" ? a + b : a - b;
    const tensB = Math.floor(b / 10) * 10;
    const onesB = b % 10;
    const step1 = op === "+" ? a + tensB : a - tensB;
    const key = `add:mental:${a}${op === "+" ? "+" : "-"}${b}`;
    items.push({
      itemKey: key,
      skill: "S1",
      group: "S",
      answerType: "number",
      a, b, op,
      correctAnswer: ans,
      display: `${a} ${op} ${b}`,
      step1, step2: ans,
      tensB, onesB,
      becauseText: `${a} ${op} ${tensB} = ${step1}. Then ${step1} ${op} ${onesB} = ${ans}.`,
    });
  });

  // S2 — Make the next ten/hundred (20 items)
  const S2_ITEMS = [
    [58, 7, "+"], [67, 8, "+"], [76, 9, "+"], [85, 6, "+"],
    [94, 8, "+"], [48, 7, "+"], [57, 6, "+"], [73, 9, "+"],
    [295, 30, "+"], [385, 20, "+"], [495, 10, "+"], [198, 5, "+"],
    [297, 6, "+"], [396, 8, "+"], [194, 9, "+"],
    [61, 7, "-"], [72, 8, "-"], [83, 9, "-"],
    [301, 5, "-"], [402, 6, "-"],
  ];
  S2_ITEMS.forEach(([a, b, op]) => {
    const ans = op === "+" ? a + b : a - b;
    const key = `add:mental:${a}${op}${b}s2`;
    const nextTen = op === "+" ? Math.ceil((a + 1) / 10) * 10 : Math.floor(a / 10) * 10;
    const toNext = op === "+" ? nextTen - a : a - nextTen;
    const leftover = b - toNext;
    items.push({
      itemKey: key,
      skill: "S2",
      group: "S",
      answerType: "number",
      a, b, op,
      correctAnswer: ans,
      display: `${a} ${op} ${b}`,
      nextTen, toNext, leftover,
      becauseText: `${a} ${op} ${toNext} = ${nextTen}. Then ${nextTen} ${op} ${leftover} = ${ans}.`,
    });
  });

  // S3 — Near-doubles (16 items: doubles ±1 up to 25+26)
  const S3_DOUBLES = [
    [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
    [10, 11], [11, 12], [12, 13], [13, 14], [14, 15],
    [15, 16], [20, 21], [22, 23], [24, 25], [25, 26],
  ];
  S3_DOUBLES.forEach(([a, b]) => {
    const sum = a + b;
    const dbl = a * 2;
    items.push({
      itemKey: `add:mental:${a}+${b}nd`,
      skill: "S3",
      group: "S",
      answerType: "number",
      a, b,
      correctAnswer: sum,
      display: `${a} + ${b}`,
      dbl,
      becauseText: `Double ${a} = ${dbl}. ${a} + ${b} = ${dbl} + 1 = ${sum}.`,
    });
  });

  return items;
}

function buildGroupW() {
  const items = [];

  // W1 — Part-whole word problems, one step (18 items: find-whole + find-part)
  const W1_PROBLEMS = [
    // find whole (a + b = ?)
    { a: 245, b: 178, text: "There are 245 red apples and 178 green apples. How many apples in all?", findWhole: true },
    { a: 134, b: 256, text: "Ben read 134 pages on Monday and 256 pages on Tuesday. How many pages did he read in all?", findWhole: true },
    { a: 312, b: 186, text: "A shop sold 312 toy cars and 186 toy trucks. How many toys were sold in all?", findWhole: true },
    { a: 423, b: 267, text: "The library has 423 fiction books and 267 non-fiction books. How many books are there in all?", findWhole: true },
    { a: 158, b: 342, text: "Kim collected 158 stamps. Her friend gave her 342 more. How many stamps does she have now?", findWhole: true },
    { a: 276, b: 184, text: "A farmer picked 276 red tomatoes and 184 yellow tomatoes. How many tomatoes in all?", findWhole: true },
    { a: 315, b: 245, text: "Sam had 315 stickers and bought 245 more. How many stickers does he have now?", findWhole: true },
    { a: 167, b: 293, text: "On Friday 167 people visited the zoo. On Saturday 293 people came. How many visitors in all?", findWhole: true },
    { a: 410, b: 280, text: "A baker made 410 plain buns and 280 chocolate buns. How many buns in all?", findWhole: true },
    // find a part (whole - known = ?)
    { whole: 420, b: 178, text: "There are 420 apples. 178 are green. How many are red?", findWhole: false },
    { whole: 600, b: 245, text: "A school has 600 students. 245 are in the upper school. How many are in the lower school?", findWhole: false },
    { whole: 750, b: 312, text: "750 tickets were sold. 312 were adult tickets. How many were children's tickets?", findWhole: false },
    { whole: 530, b: 267, text: "530 cupcakes were baked. 267 were vanilla. How many were chocolate?", findWhole: false },
    { whole: 840, b: 356, text: "840 people attended the concert. 356 were seated in the upper level. How many were below?", findWhole: false },
    { whole: 475, b: 189, text: "475 books are in the library. 189 have been borrowed. How many are still on the shelves?", findWhole: false },
    { whole: 1000, b: 437, text: "A school raised $1,000. $437 was spent on new books. How much is left?", findWhole: false },
    { whole: 920, b: 348, text: "920 children signed up for the race. 348 finished first. How many are still running?", findWhole: false },
    { whole: 680, b: 293, text: "680 passengers took the train. 293 got off at the first stop. How many stayed on?", findWhole: false },
  ];
  W1_PROBLEMS.forEach(prob => {
    if (prob.findWhole) {
      const ans = prob.a + prob.b;
      items.push({
        itemKey: `add:word:pw:${prob.a}+${prob.b}`,
        skill: "W1",
        group: "W",
        answerType: "barChoice",
        barType: "partWhole",
        wordProblem: prob.text,
        a: prob.a, b: prob.b,
        findWhole: true,
        correctAnswer: ans,
        correctBarType: "partWhole",
        becauseText: `This is a part-whole problem: ${prob.a} + ${prob.b} = ${ans}.`,
      });
    } else {
      const ans = prob.whole - prob.b;
      items.push({
        itemKey: `add:word:pw:${prob.whole}-${prob.b}`,
        skill: "W1",
        group: "W",
        answerType: "barChoice",
        barType: "partWhole",
        wordProblem: prob.text,
        whole: prob.whole, b: prob.b,
        findWhole: false,
        correctAnswer: ans,
        correctBarType: "partWhole",
        becauseText: `This is a part-whole problem: ${prob.whole} − ${prob.b} = ${ans}.`,
      });
    }
  });

  // W2 — Comparison word problems, one step (18 items: more/fewer variants)
  const W2_PROBLEMS = [
    { base: 320, diff: 145, moreOrFewer: "more", nameA: "Ben", nameB: "Mia", itemA: "stickers",
      text: "Ben has 320 stickers. Mia has 145 more than Ben. How many stickers does Mia have?" },
    { base: 256, diff: 134, moreOrFewer: "more", nameA: "Ali", nameB: "Sam", itemA: "marbles",
      text: "Ali has 256 marbles. Sam has 134 more than Ali. How many marbles does Sam have?" },
    { base: 415, diff: 267, moreOrFewer: "more", nameA: "the red team", nameB: "the blue team", itemA: "points",
      text: "The red team scored 415 points. The blue team scored 267 more points. How many points did the blue team score?" },
    { base: 530, diff: 180, moreOrFewer: "fewer", nameA: "the old shop", nameB: "the new shop", itemA: "books",
      text: "The new shop has 530 books. The old shop has 180 fewer books. How many books does the old shop have?" },
    { base: 780, diff: 245, moreOrFewer: "fewer", nameA: "Park A", nameB: "Park B", itemA: "trees",
      text: "Park A has 780 trees. Park B has 245 fewer trees. How many trees does Park B have?" },
    { base: 345, diff: 178, moreOrFewer: "more", nameA: "Class A", nameB: "Class B", itemA: "words",
      text: "Class A wrote 345 words. Class B wrote 178 more words than Class A. How many words did Class B write?" },
    { base: 490, diff: 135, moreOrFewer: "fewer", nameA: "Zara", nameB: "Tom", itemA: "stickers",
      text: "Zara has 490 stickers. Tom has 135 fewer stickers than Zara. How many stickers does Tom have?" },
    { base: 672, diff: 248, moreOrFewer: "more", nameA: "the morning", nameB: "the afternoon", itemA: "visitors",
      text: "672 people visited in the morning. The afternoon had 248 more visitors. How many came in the afternoon?" },
    { base: 815, diff: 327, moreOrFewer: "fewer", nameA: "Town A", nameB: "Town B", itemA: "people",
      text: "Town A has 815 people. Town B has 327 fewer people. How many people live in Town B?" },
    // How many more/fewer (find the difference)
    { base: 420, bigger: 580, findDiff: true, text: "Lily has 580 books. Leo has 420 books. How many more books does Lily have than Leo?" },
    { base: 345, bigger: 567, findDiff: true, text: "The cinema sold 567 tickets on Friday and 345 on Thursday. How many more tickets were sold on Friday?" },
    { base: 273, bigger: 486, findDiff: true, text: "School A has 486 students. School B has 273 students. How many more students does School A have?" },
    { base: 154, bigger: 390, findDiff: true, text: "Tom scored 390 points. Kim scored 154 points. How many more points did Tom score?" },
    { base: 215, bigger: 432, findDiff: true, text: "A blue ribbon is 432 cm long. A red ribbon is 215 cm long. How much longer is the blue ribbon?" },
    { base: 368, bigger: 521, findDiff: true, text: "There are 521 big fish and 368 small fish in the aquarium. How many more big fish are there?" },
    { base: 190, bigger: 340, findDiff: true, text: "The toy shop has 340 dolls and 190 cars. How many more dolls than cars are there?" },
    { base: 275, bigger: 480, findDiff: true, text: "480 people voted yes. 275 voted no. How many more voted yes?" },
    { base: 123, bigger: 456, findDiff: true, text: "The red jar has 456 beans. The blue jar has 123 beans. How many fewer beans does the blue jar have?" },
  ];
  W2_PROBLEMS.forEach(prob => {
    if (prob.findDiff) {
      const ans = prob.bigger - prob.base;
      items.push({
        itemKey: `add:word:cmp:${prob.bigger}-${prob.base}`,
        skill: "W2",
        group: "W",
        answerType: "barChoice",
        barType: "comparison",
        wordProblem: prob.text,
        base: prob.base, bigger: prob.bigger,
        findDiff: true,
        correctAnswer: ans,
        correctBarType: "comparison",
        becauseText: `Compare the two bars: ${prob.bigger} − ${prob.base} = ${ans}.`,
      });
    } else {
      const ans = prob.moreOrFewer === "more" ? prob.base + prob.diff : prob.base - prob.diff;
      items.push({
        itemKey: `add:word:cmp:${prob.base}${prob.moreOrFewer === "more" ? "+" : "-"}${prob.diff}`,
        skill: "W2",
        group: "W",
        answerType: "barChoice",
        barType: "comparison",
        wordProblem: prob.text,
        base: prob.base, diff: prob.diff, moreOrFewer: prob.moreOrFewer,
        correctAnswer: ans,
        correctBarType: "comparison",
        becauseText: `Comparison bar: ${prob.base} ${prob.moreOrFewer === "more" ? "+" : "−"} ${prob.diff} = ${ans}.`,
      });
    }
  });

  // W3 — Two-step word problems (16 items)
  const W3_PROBLEMS = [
    { text: "A shop had 1,250 pens. It sold 480. Then 200 more were delivered. How many pens now?",
      step1Op: "-", step1A: 1250, step1B: 480, step1Result: 770,
      step2Op: "+", step2B: 200, finalAnswer: 970,
      keyW: `add:word:2s:1250-480+200` },
    { text: "Sam had 2,340 stamps. He gave away 865. Then he bought 430 more. How many stamps now?",
      step1Op: "-", step1A: 2340, step1B: 865, step1Result: 1475,
      step2Op: "+", step2B: 430, finalAnswer: 1905,
      keyW: `add:word:2s:2340-865+430` },
    { text: "A bookshop had 3,560 books. 1,245 were sold. Then 680 new books arrived. How many books now?",
      step1Op: "-", step1A: 3560, step1B: 1245, step1Result: 2315,
      step2Op: "+", step2B: 680, finalAnswer: 2995,
      keyW: `add:word:2s:3560-1245+680` },
    { text: "Park A had 1,800 visitors on Saturday and 2,340 on Sunday. 450 visited both days. How many different visitors came over the weekend? (Add Saturday and Sunday, then subtract those who came both days.)",
      step1Op: "+", step1A: 1800, step1B: 2340, step1Result: 4140,
      step2Op: "-", step2B: 450, finalAnswer: 3690,
      keyW: `add:word:2s:1800+2340-450` },
    { text: "A school collected 2,560 cans. They donated 1,340 to one shelter and 480 to another. How many cans are left?",
      step1Op: "-", step1A: 2560, step1B: 1340, step1Result: 1220,
      step2Op: "-", step2B: 480, finalAnswer: 740,
      keyW: `add:word:2s:2560-1340-480` },
    { text: "A farm harvested 4,250 kg of rice in June and 3,870 kg in July. They sold 2,460 kg. How much rice do they have left?",
      step1Op: "+", step1A: 4250, step1B: 3870, step1Result: 8120,
      step2Op: "-", step2B: 2460, finalAnswer: 5660,
      keyW: `add:word:2s:4250+3870-2460` },
    { text: "A library had 5,430 books. 1,260 books were borrowed and 380 new books were added. How many books are in the library now?",
      step1Op: "-", step1A: 5430, step1B: 1260, step1Result: 4170,
      step2Op: "+", step2B: 380, finalAnswer: 4550,
      keyW: `add:word:2s:5430-1260+380` },
    { text: "A concert had 3,800 seats. 2,456 tickets were sold in advance and 785 at the door. How many empty seats were there?",
      step1Op: "-", step1A: 3800, step1B: 2456, step1Result: 1344,
      step2Op: "-", step2B: 785, finalAnswer: 559,
      keyW: `add:word:2s:3800-2456-785` },
    { text: "A factory made 3,750 parts in Week 1 and 4,380 in Week 2. They used 3,215 parts. How many parts remain?",
      step1Op: "+", step1A: 3750, step1B: 4380, step1Result: 8130,
      step2Op: "-", step2B: 3215, finalAnswer: 4915,
      keyW: `add:word:2s:3750+4380-3215` },
    { text: "A stadium has 8,500 seats. 3,467 were empty in the morning and 1,250 more fans arrived in the afternoon. How many empty seats are there now?",
      step1Op: "-", step1A: 8500, step1B: 3467, step1Result: 5033,
      step2Op: "+", step2B: 1250, finalAnswer: 6283,
      keyW: `add:word:2s:8500-3467+1250` },
    { text: "Town A has 1,345 people. Town B has 2,560 people. 480 people move from B to A. How many people does Town A have now?",
      step1Op: "+", step1A: 1345, step1B: 480, step1Result: 1825,
      step2Op: "+", step2B: 0, finalAnswer: 1825,
      keyW: `add:word:2s:1345+480pw` },
    { text: "A school had $4,500 in its budget. It spent $1,340 on supplies and $890 on equipment. How much money is left?",
      step1Op: "-", step1A: 4500, step1B: 1340, step1Result: 3160,
      step2Op: "-", step2B: 890, finalAnswer: 2270,
      keyW: `add:word:2s:4500-1340-890` },
    { text: "A bakery baked 2,750 rolls on Monday. It sold 1,480 and baked 560 more on Tuesday. How many rolls are there now?",
      step1Op: "-", step1A: 2750, step1B: 1480, step1Result: 1270,
      step2Op: "+", step2B: 560, finalAnswer: 1830,
      keyW: `add:word:2s:2750-1480+560` },
    { text: "A warehouse had 7,240 boxes. 3,158 boxes were shipped out and 1,400 new boxes arrived. How many boxes are in the warehouse now?",
      step1Op: "-", step1A: 7240, step1B: 3158, step1Result: 4082,
      step2Op: "+", step2B: 1400, finalAnswer: 5482,
      keyW: `add:word:2s:7240-3158+1400` },
    { text: "In January a shop sold 1,560 items. In February it sold 2,340 items. The shop needs to sell 5,000 items in the first quarter. How many more does it need to sell in March?",
      step1Op: "-", step1A: 5000, step1B: 1560, step1Result: 3440,
      step2Op: "-", step2B: 2340, finalAnswer: 1100,
      keyW: `add:word:2s:5000-1560-2340` },
    { text: "A builder had 4,620 bricks. He used 1,378 for a wall and 945 for a path. How many bricks remain?",
      step1Op: "-", step1A: 4620, step1B: 1378, step1Result: 3242,
      step2Op: "-", step2B: 945, finalAnswer: 2297,
      keyW: `add:word:2s:4620-1378-945` },
  ];
  W3_PROBLEMS.forEach(prob => {
    items.push({
      itemKey: prob.keyW,
      skill: "W3",
      group: "W",
      answerType: "barChoice",
      barType: "twoStep",
      wordProblem: prob.text,
      step1Op: prob.step1Op, step1A: prob.step1A, step1B: prob.step1B,
      step1Result: prob.step1Result,
      step2Op: prob.step2Op, step2B: prob.step2B,
      correctAnswer: prob.finalAnswer,
      correctBarType: "twoStep",
      becauseText: `Step 1: ${prob.step1A} ${prob.step1Op} ${prob.step1B} = ${prob.step1Result}. Step 2: ${prob.step1Result} ${prob.step2Op} ${prob.step2B} = ${prob.finalAnswer}.`,
    });
  });

  return items;
}

// ---------------------------------------------------------------------------
// Build the full pool (called once — deterministic)
// ---------------------------------------------------------------------------
function buildAddPool() {
  return [
    ...buildGroupN(),
    ...buildGroupM(),
    ...buildGroupF(),
    ...buildGroupK(),
    ...buildGroupX(),
    ...buildGroupR(),
    ...buildGroupS(),
    ...buildGroupW(),
  ];
}

export const ADD_POOL = buildAddPool();

// ---------------------------------------------------------------------------
// Tier-1 keys (for the tier gate)
// ---------------------------------------------------------------------------
export const TIER1_KEYS = ADD_POOL
  .filter(item => ["N", "M", "F", "K", "X"].includes(item.group))
  .map(item => item.itemKey);

// ---------------------------------------------------------------------------
// Tier gate: shouldAllowTier2
// ---------------------------------------------------------------------------
export function shouldAllowTier2(profileId) {
  if (!profileId) return false;
  const mastery = getMastery(profileId, "add") || {};
  const mastered = TIER1_KEYS.filter(k => (mastery[k]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length;
  return TIER1_KEYS.length > 0 && (mastered / TIER1_KEYS.length) >= 0.80;
}

// ---------------------------------------------------------------------------
// Sub-gates (60% within group)
// ---------------------------------------------------------------------------
export function getSkillSubGateStatus(profileId) {
  const mastery = getMastery(profileId, "add") || {};

  function pct(keys) {
    if (keys.length === 0) return 1;
    const mastered = keys.filter(k => (mastery[k]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length;
    return mastered / keys.length;
  }

  const n1Keys = ADD_POOL.filter(i => i.skill === "N1").map(i => i.itemKey);
  const n2Keys = ADD_POOL.filter(i => i.skill === "N2").map(i => i.itemKey);
  const m1Keys = ADD_POOL.filter(i => i.skill === "M1").map(i => i.itemKey);
  const r1Keys = ADD_POOL.filter(i => i.skill === "R1").map(i => i.itemKey);
  const r2Keys = ADD_POOL.filter(i => i.skill === "R2").map(i => i.itemKey);
  const w1Keys = ADD_POOL.filter(i => i.skill === "W1").map(i => i.itemKey);
  const w2Keys = ADD_POOL.filter(i => i.skill === "W2").map(i => i.itemKey);

  return {
    allowN2: pct(n1Keys) >= 0.60,
    allowN3: pct(n1Keys) >= 0.60,
    allowM2: pct(m1Keys) >= 0.60,
    allowR2: pct(r1Keys) >= 0.60,
    allowR3: pct(r2Keys) >= 0.60,
    allowW2: pct(w1Keys) >= 0.60,
    allowW3: pct([...w1Keys, ...w2Keys]) >= 0.60,
  };
}

// ---------------------------------------------------------------------------
// Achievement trigger checker
// ---------------------------------------------------------------------------
function checkAddGroupMastered(groupId, mastery) {
  const groupItems = ADD_POOL.filter(i => i.group === groupId);
  return groupItems.length > 0 &&
    groupItems.every(i => (mastery[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD);
}

function checkAddAllMastered(mastery) {
  return ADD_POOL.every(i => (mastery[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD);
}

function checkAddBondCount(mastery, targetCount) {
  let count = 0;
  for (const [key, rec] of Object.entries(mastery)) {
    if (key.startsWith("add:bond:") && (rec?.correct || 0) >= 1) count++;
  }
  return count >= targetCount;
}

export function checkExtraAddTrigger(triggerType, params, values) {
  const mastery = values.mastery || {};
  switch (triggerType) {
    case "masterAddGroup":
      return checkAddGroupMastered(params.group, mastery);
    case "masterAddAll":
      return checkAddAllMastered(mastery);
    case "tier2Unlocked":
      return shouldAllowTier2(values.profileId);
    case "addItemCount":
      return checkAddBondCount(mastery, params.count);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Module definition
// ---------------------------------------------------------------------------
const addModule = {
  id: "add",
  name: "Add & Subtract",
  grades: "Grades K–3",
  color: "#EF476F",
  description: "Number bonds & facts to 20, plus adding & subtracting to 10,000 with bar models",

  groups: [
    // Tier 1
    { id: "N", label: "Number Bonds", color: "#EF476F", tier: 1 },
    { id: "M", label: "Make a Ten", color: "#FF9F1C", tier: 1 },
    { id: "F", label: "Add & Subtract Facts", color: "#FFD43B", tier: 1 },
    { id: "K", label: "Fact Families", color: "#06D6A0", tier: 1 },
    { id: "X", label: "Missing Numbers", color: "#4CC9F0", tier: 1 },
    // Tier 2
    { id: "R", label: "Big-Number Adding", color: "#B388FF", tier: 2 },
    { id: "S", label: "Mental Tricks", color: "#FF6B9D", tier: 2 },
    { id: "W", label: "Word Problems", color: "#06D6A0", tier: 2 },
  ],

  // Group N is free; everything else is paid
  freeContent: ["N"],

  // Skill focus labels (kid-friendly)
  skillLabels: {
    N1: "Bond a number",
    N2: "Bond a teen",
    N3: "Split to ten",
    M1: "Add through ten",
    M2: "Subtract through ten",
    F1: "Add facts",
    F2: "Subtract facts",
    K1: "Complete the family",
    K2: "Which undoes it?",
    X1: "Find the missing part",
    X2: "Find the missing number",
    R1: "Columns — no trading",
    R2: "Columns — carry & borrow",
    R3: "Big columns",
    S1: "Split into parts",
    S2: "Jump to the next ten",
    S3: "Near doubles",
    W1: "Part-whole problems",
    W2: "Comparison problems",
    W3: "Two-step problems",
  },

  // CPA default per group
  defaultModeByGroup: {
    N: "concrete",
    M: "concrete",
    F: "pictorial",
    K: "pictorial",
    X: "pictorial",
    R: "concrete",
    S: "pictorial",
    W: "concrete",
  },

  // Pool reference
  pool: ADD_POOL,

  // Scaffold map (item-key prefix → scaffold tag)
  scaffoldMap: {
    N: "NumberBond",
    M: "TenFrame",
    F: "NumberBond",
    K: "NumberBond",
    X: "NumberBond",
    R: "PlaceValueChart",
    S: "JumpStrip",
    W: "BarModelWord",
  },

  achievements: [
    { id: "add-bond-boss", name: "Bond Boss", trigger: "masterAddGroup", params: { group: "N" } },
    { id: "add-ten-maker", name: "Ten-Maker", trigger: "masterAddGroup", params: { group: "M" } },
    { id: "add-fact-flash", name: "Fact Flash", trigger: "masterAddGroup", params: { group: "F" } },
    { id: "add-family-finder", name: "Family Finder", trigger: "masterAddGroup", params: { group: "K" } },
    { id: "add-mystery-number", name: "Mystery Number", trigger: "masterAddGroup", params: { group: "X" } },
    { id: "add-tier-two", name: "Tier Two!", trigger: "tier2Unlocked" },
    { id: "add-regroup-ranger", name: "Regroup Ranger", trigger: "masterAddGroup", params: { group: "R" } },
    { id: "add-mental-whiz", name: "Mental Math Whiz", trigger: "masterAddGroup", params: { group: "S" } },
    { id: "add-bar-builder", name: "Bar Model Builder", trigger: "masterAddGroup", params: { group: "W" } },
    { id: "add-master", name: "Add & Subtract Master", trigger: "masterAddAll" },
    { id: "add-bond-pro", name: "Number-Bond Pro", trigger: "addItemCount", params: { count: 50 } },
  ],

  checkExtraTrigger: checkExtraAddTrigger,
};

export default addModule;
