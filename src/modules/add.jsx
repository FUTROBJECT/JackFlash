/**
 * Add & Subtract module definition — PASS 1 (docs/add-spec.md §15):
 * groups colAdd (A1–A3), colSub (S1–S3) and facts (F1–F2, supporting).
 * Pass 2 will insert `mental` and `words` BEFORE `facts`.
 *
 * Same machinery as multiply / fractions / placeValue: a finite, curated,
 * deterministic item pool built once from LITERAL arrays (no Math.random()
 * anywhere in pool generation — itemKeys are persisted mastery units and must
 * be byte-identical on every load). Keys use unformatted numerals
 * (`add:col:367+256`, `add:col:532-178`, `add:fact:5+8`, `add:fact:13-5`);
 * display strings go through formatNumber. Place codes: k thousands,
 * h hundreds, t tens, o ones (imported from the Place Value module).
 *
 * This file also holds the module's PURE logic, so the practice screen stays
 * presentational: the bug library (§7), the derivation-line builder (§9),
 * the disc-chart reducers (§4.1), the readiness gate (§6.5) and the
 * achievement triggers (§12). A DEV-only self-check (§11.6) asserts the pool
 * literals and logs every item's bug outputs once at module load.
 */

import { COLORS, MODULE_COLORS } from "../constants.js";
import { PLACE_CODES, formatNumber } from "./placeValue.jsx";

// ---------------------------------------------------------------------------
// D1 (decided 2026-10-06): the kid word is "regroup" — the Singapore Math
// term. Regrouping changes how a number is grouped while its value stays the
// same (3 tens 2 ones = 2 tens 12 ones). Not "trade" (a swap game), never
// "borrow" (nothing is given back) or "carry". Every line, chart button and
// refusal chip reads from here; sentences are phrased "regroup 1 ten into
// 10 ones" / "regroup 10 ones into 1 ten".
// ---------------------------------------------------------------------------
export const REGROUP = { verb: "regroup", past: "regrouped", noun: "Regroup" };

const PL_SING = { k: "thousand", h: "hundred", t: "ten", o: "one" };
const PL_PLUR = { k: "thousands", h: "hundreds", t: "tens", o: "ones" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const MINUS = "−"; // U+2212, display only (keys use an ASCII hyphen)

// ---------------------------------------------------------------------------
// Digit helpers. A "grid index" g runs left→right (0 = leftmost column); the
// place code of grid index g in a `cols`-column number is PLACE_CODES[4-cols+g].
// ---------------------------------------------------------------------------
export function digitArr(n, cols) {
  const s = String(n).padStart(cols, "0");
  return Array.from({ length: cols }, (_, i) => Number(s[s.length - cols + i]));
}

export function placeCodes(cols) {
  return PLACE_CODES.slice(4 - cols);
}

function numberFromDigits(arr) {
  return arr.reduce((n, d) => n * 10 + d, 0);
}

// ---------------------------------------------------------------------------
// The standard algorithms, as digit-level simulations. These are the
// "correct" reference every line, picture and bug is derived from.
// ---------------------------------------------------------------------------
export function addStandard(a, b, cols) {
  const A = digitArr(a, cols);
  const B = digitArr(b, cols);
  const carryIn = Array(cols).fill(0);
  const carryOut = Array(cols).fill(0);
  const out = Array(cols).fill(0);
  let c = 0;
  for (let i = cols - 1; i >= 0; i--) {
    carryIn[i] = c;
    const t = A[i] + B[i] + c;
    out[i] = t % 10;
    carryOut[i] = t >= 10 ? 1 : 0;
    c = carryOut[i];
  }
  return { A, B, carryIn, carryOut, out };
}

// Standard subtraction. `trades` is the exact tap sequence: each entry m means
// "trade from grid column m into column m+1" (the three-tap rename of 5,003 is
// [0, 1, 2]). `received` = columns that gained 10; `passed` = columns that
// were zero and passed a trade straight along.
export function subStandard(a, b, cols) {
  const A = digitArr(a, cols);
  const B = digitArr(b, cols);
  const cur = [...A];
  const trades = [];
  const received = [];
  const passed = [];
  const out = Array(cols).fill(0);
  for (let i = cols - 1; i >= 0; i--) {
    if (cur[i] < B[i]) {
      let j = -1;
      for (let k = i - 1; k >= 0; k--) { if (cur[k] > 0) { j = k; break; } }
      if (j >= 0) {
        for (let m = j; m < i; m++) {
          cur[m] -= 1;
          cur[m + 1] += 10;
          trades.push(m);
          received.push(m + 1);
          if (m + 1 < i) passed.push(m + 1);
        }
      }
    }
    out[i] = cur[i] - B[i];
  }
  return { A, B, cur, trades, received, passed, out };
}

// ---------------------------------------------------------------------------
// Bug library (§7). Each bug is a pure, deterministic function of the
// operands; if the entered value equals a bug's output (and that output is not
// the correct answer) the bug's line is used. Listed order = priority.
// ---------------------------------------------------------------------------
export function bugNoCarry(a, b, cols) {
  const A = digitArr(a, cols);
  const B = digitArr(b, cols);
  return numberFromDigits(A.map((d, i) => (d + B[i]) % 10));
}

export function bugSmallerFromLarger(a, b, cols) {
  const A = digitArr(a, cols);
  const B = digitArr(b, cols);
  return numberFromDigits(A.map((d, i) => Math.abs(d - B[i])));
}

// The standard algorithm, except a zero that passes a trade along stays 10
// instead of becoming 9.
export function bugZeroStays10(a, b, cols) {
  const A = digitArr(a, cols);
  const B = digitArr(b, cols);
  const cur = [...A];
  const out = Array(cols).fill(0);
  for (let i = cols - 1; i >= 0; i--) {
    if (cur[i] < B[i]) {
      let j = -1;
      for (let k = i - 1; k >= 0; k--) { if (cur[k] > 0) { j = k; break; } }
      if (j >= 0) {
        for (let m = j; m < i; m++) {
          const isPassThrough = m > j; // a zero that received 10 and passes a trade on
          if (!isPassThrough) cur[m] -= 1; // the real lender gives 1 away; a pass-through zero "stays 10"
          cur[m + 1] += 10;
        }
      }
    }
    out[i] = cur[i] - B[i];
  }
  return numberFromDigits(out);
}

// The trade adds 10 to the column but never takes 1 from the lender.
export function bugNoDecrement(a, b, cols) {
  const A = digitArr(a, cols);
  const B = digitArr(b, cols);
  const out = A.map((d, i) => (d < B[i] ? d + 10 - B[i] : d - B[i]));
  return numberFromDigits(out);
}

const SUB_BUGS = [
  ["smallerFromLarger", bugSmallerFromLarger],
  ["zeroStays10", bugZeroStays10],
  ["noDecrement", bugNoDecrement],
];

// Which bug (if any) does this first-submit value match? First in the listed
// order wins; a bug whose output equals the correct answer never matches.
export function diagnoseColumn(item, entered) {
  if (entered === null || entered === undefined || entered === item.correctAnswer) return null;
  if (item.op === "+") {
    const v = bugNoCarry(item.a, item.b, item.columns);
    return v === entered && v !== item.correctAnswer ? "noCarry" : null;
  }
  for (const [name, fn] of SUB_BUGS) {
    const v = fn(item.a, item.b, item.columns);
    if (v === entered && v !== item.correctAnswer) return name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pool source literals (§6.1) — copied exactly from docs/add-spec.md and
// verified by script. Row = [pattern tag, ...items "a±b=c"] in introduction
// order (easiest first, zeros and ripples last).
// ---------------------------------------------------------------------------
const A1_SRC = [
  ["none", "342+215=557", "403+251=654", "526+170=696", "230+415=645"],
  ["ones", "237+145=382", "418+326=744", "509+284=793", "625+158=783"],
  ["tens", "362+254=616", "481+137=618", "593+172=765", "274+451=725"],
  ["ones+tens", "367+256=623", "458+377=835", "289+546=835", "196+307=503"],
];
const A2_SRC = [
  ["none", "3425+2341=5766", "4062+1305=5367", "2710+6048=8758", "5234+413=5647"],
  ["ones", "2346+1527=3873", "4158+3624=7782", "6209+1345=7554", "3617+258=3875", "1538+4227=5765"],
  ["tens", "1452+2371=3823", "5283+2461=7744", "3190+4535=7725", "7064+1872=8936", "6342+581=6923"],
  ["hundreds", "2613+3524=6137", "4852+1436=6288", "3705+2694=6399", "5920+2346=8266", "750+631=1381", "864+512=1376"],
];
const A3_SRC = [
  ["ones+tens", "3475+1268=4743", "2589+4136=6725", "5147+2385=7532", "6258+1375=7633"],
  ["tens+hundreds", "2673+3851=6524", "4580+2765=7345", "1794+5632=7426", "3861+2452=6313"],
  ["ones+hundreds", "2617+3705=6322", "5438+1814=7252", "3906+2428=6334"],
  ["three places", "3475+2896=6371", "4368+857=5225", "2789+4567=7356", "1658+3476=5134", "5847+2365=8212"],
  ["ripple / zeros in the answer", "2995+1007=4002", "4396+2604=7000", "5078+1925=7003", "1999+999=2998"],
];
const S1_SRC = [
  ["none", "568-124=444", "795-382=413", "607-305=302", "486-52=434"],
  ["tens→ones", "452-137=315", "683-256=427", "741-318=423", "375-149=226"],
  ["hundreds→tens", "527-163=364", "836-452=384", "914-271=643", "648-293=355"],
  ["both", "532-178=354", "823-467=356", "615-249=366", "724-58=666"],
];
const S2_SRC = [
  ["none", "5867-2345=3522", "7489-3256=4233", "6594-482=6112"],
  ["one trade into ones", "4352-1127=3225", "6743-2518=4225", "8261-237=8024"],
  ["one trade into tens", "5428-2163=3265", "7316-4152=3164", "9547-3281=6266"],
  ["one trade into hundreds", "6235-1412=4823", "4186-2543=1643", "3452-2731=721"],
  ["two or three trades", "5324-2768=2556", "7152-3486=3666", "8431-2654=5777", "6273-1845=4428", "9416-5738=3678", "4621-1384=3237", "7245-638=6607", "5162-2375=2787"],
];
const S3_SRC = [
  ["3-digit", "503-178=325", "400-156=244", "702-345=357", "600-248=352"],
  ["zero in tens", "4503-1268=3235", "6207-2439=3768", "8605-3172=5433", "5309-2754=2555"],
  ["zero in hundreds", "7042-3516=3526", "5031-2467=2564", "9064-4385=4679", "3018-1243=1775"],
  ["two zeros", "5003-1478=3525", "6002-3547=2455", "8004-59=7945", "4050-1276=2774"],
  ["round numbers", "3000-2264=736", "7000-2385=4615", "5200-1847=3353", "9000-4536=4464"],
];

// Expected regroup places per tag (right-to-left order), for the DEV self-check.
// Addition: places that carry out. Subtraction: places that receive 10.
// `null` = a shape rule instead of an exact set (see checkRegroupTag).
const EXPECTED_REGROUPS = {
  A1: { none: [], ones: ["o"], tens: ["t"], "ones+tens": ["o", "t"] },
  A2: { none: [], ones: ["o"], tens: ["t"], hundreds: ["h"] },
  A3: {
    "ones+tens": ["o", "t"], "tens+hundreds": ["t", "h"], "ones+hundreds": ["o", "h"],
    "three places": ["o", "t", "h"], "ripple / zeros in the answer": ["o", "t", "h"],
  },
  S1: { none: [], "tens→ones": ["o"], "hundreds→tens": ["t"], both: ["o", "t"] },
  S2: {
    none: [], "one trade into ones": ["o"], "one trade into tens": ["t"],
    "one trade into hundreds": ["h"], "two or three trades": null,
  },
};

function colColumns(skill, a) {
  if (skill === "A1" || skill === "S1") return 3;
  if (skill === "S3") return String(a).length >= 4 ? 4 : 3;
  return 4;
}

function regroupPlaces(op, a, b, cols) {
  const codes = placeCodes(cols);
  if (op === "+") {
    const { carryOut } = addStandard(a, b, cols);
    const idxs = [];
    for (let i = cols - 1; i >= 0; i--) if (carryOut[i]) idxs.push(i);
    return idxs.map((i) => codes[i]);
  }
  const { received } = subStandard(a, b, cols);
  const uniq = Array.from(new Set(received)).sort((x, y) => y - x); // right-to-left
  return uniq.map((i) => codes[i]);
}

function buildColumnItems(skill, src) {
  const group = skill.startsWith("A") ? "colAdd" : "colSub";
  const items = [];
  src.forEach(([tag, ...strs]) => {
    strs.forEach((str) => {
      const m = str.match(/^(\d+)([+-])(\d+)=(\d+)$/);
      if (!m) throw new Error(`[add] bad column literal: ${str}`);
      const a = Number(m[1]);
      const op = m[2];
      const b = Number(m[3]);
      const correctAnswer = Number(m[4]);
      const columns = colColumns(skill, a);
      items.push({
        itemKey: `add:col:${a}${op}${b}`,
        group, skill, answerType: "column",
        op, a, b, correctAnswer, columns,
        regroups: regroupPlaces(op, a, b, columns),
        pattern: tag,
        display: `${formatNumber(a)}${op === "+" ? "+" : MINUS}${formatNumber(b)}`,
      });
    });
  });
  return items;
}

// A1/S1, A2/S2, A3/S3 interleaved (A[0], S[0], A[1], S[1], …) — §6.5.
function interleave(xs, ys) {
  const out = [];
  const n = Math.max(xs.length, ys.length);
  for (let i = 0; i < n; i++) {
    if (i < xs.length) out.push(xs[i]);
    if (i < ys.length) out.push(ys[i]);
  }
  return out;
}

// Facts (§6.4). F1: every unordered pair from 2–9 with sum 11–18; key
// ascending (`add:fact:5+8`), display larger addend first ("8 + 5"). Ordered
// by sum, then larger addend descending. F2: the subtraction partners.
function buildFactItems() {
  const pairs = [];
  for (let sum = 11; sum <= 18; sum++) {
    for (let big = 9; big >= 2; big--) {
      const small = sum - big;
      if (small >= 2 && small <= big) pairs.push([big, small]);
    }
  }
  const f1 = pairs.map(([big, small]) => ({
    itemKey: `add:fact:${small}+${big}`,
    group: "facts", skill: "F1", answerType: "singleNumber",
    op: "+", a: big, b: small, correctAnswer: big + small, columns: 2,
    regroups: ["o"], pattern: "make a ten",
    display: `${big} + ${small}`,
  }));
  const seen = new Set();
  const f2src = [];
  pairs.forEach(([big, small]) => {
    const c = big + small;
    [big, small].forEach((s) => {
      const key = `${c}-${s}`;
      if (!seen.has(key)) { seen.add(key); f2src.push([c, s]); }
    });
  });
  f2src.sort((p, q) => (p[0] - q[0]) || (p[1] - q[1]));
  const f2 = f2src.map(([c, s]) => ({
    itemKey: `add:fact:${c}-${s}`,
    group: "facts", skill: "F2", answerType: "singleNumber",
    op: "-", a: c, b: s, correctAnswer: c - s, columns: 2,
    regroups: ["o"], pattern: "break a ten",
    display: `${c} ${MINUS} ${s}`,
  }));
  return { f1, f2 };
}

function buildAddPool() {
  const A1 = buildColumnItems("A1", A1_SRC);
  const A2 = buildColumnItems("A2", A2_SRC);
  const A3 = buildColumnItems("A3", A3_SRC);
  const S1 = buildColumnItems("S1", S1_SRC);
  const S2 = buildColumnItems("S2", S2_SRC);
  const S3 = buildColumnItems("S3", S3_SRC);
  const { f1, f2 } = buildFactItems();
  // PASS 2: insert the mental (M1/M2 interleaved, then M3) and words (W1–W3)
  // items here, BEFORE the facts, to keep the §6.5 introduction order.
  return [
    ...interleave(A1, S1),
    ...interleave(A2, S2),
    ...interleave(A3, S3),
    ...f1,
    ...f2,
  ];
}

export const ADD_POOL = buildAddPool();

// ---------------------------------------------------------------------------
// Readiness gates (§6.5). A gated skill's UNSEEN items stay out of the "new"
// frontier until ≥60% of the prerequisite skills' items are SECURE
// (correct ≥ 2 — not mastered: a child working in Concrete can never cross
// 2→3, so a mastered-based gate would stall them). Items already attempted
// stay in rotation even if the gate later fails. Note the contrast with Place
// Value, whose screen filters whole skills; do not copy that.
// ---------------------------------------------------------------------------
const GATE_PREREQS = {
  A2: ["A1"],
  A3: ["A2"],
  S2: ["S1"],
  S3: ["S2"],
  // pass 2: M3 ← M1 + M2, W2 ← W1, W3 ← W1 + W2
};
const SECURE_AT = 2;
const GATE_FRACTION = 0.6;

function pctSecure(skills, masteryData) {
  const items = ADD_POOL.filter((i) => skills.includes(i.skill));
  if (items.length === 0) return 1;
  const secure = items.filter((i) => ((masteryData?.[i.itemKey]?.correct) || 0) >= SECURE_AT).length;
  return secure / items.length;
}

export function shouldAllowSkill(skill, masteryData) {
  const prereqs = GATE_PREREQS[skill];
  if (!prereqs) return true;
  return pctSecure(prereqs, masteryData) >= GATE_FRACTION;
}

// Has the child ever attempted this item? (Null-safe: a new profile has no mastery.add.)
export function wasAttempted(item, masteryData) {
  const rec = masteryData?.[item.itemKey];
  return !!rec && ((rec.attempts || 0) > 0 || !!rec.lastSeen);
}

// ---------------------------------------------------------------------------
// Disc-chart state + reducers (§4.1). The practice screen owns one state
// object per item — { counts, counts2, carried, taken } — reset on item
// change. Index = grid column (0 = leftmost). Nothing here prints a count: the
// reducers only move discs when the child taps.
//   counts   addition: layer 1 (top addend + carried-in discs) / merged pile
//            subtraction: the discs present (crossed ones included)
//   counts2  addition: layer 2 (bottom addend), null for a merged column
//   carried  yellow-ringed discs in the column (first in the pile)
//   taken    crossed-out discs in the column (ringed ones cross first)
// ---------------------------------------------------------------------------
export function initDiscState(item) {
  const cols = item.columns;
  const A = digitArr(item.a, cols);
  const zeros = Array(cols).fill(0);
  if (item.op === "+") {
    return { counts: A, counts2: digitArr(item.b, cols), carried: [...zeros], taken: [...zeros] };
  }
  return { counts: A, counts2: null, carried: [...zeros], taken: [...zeros] };
}

export function addTotal(st, i) {
  return st.counts[i] + (st.counts2 ? (st.counts2[i] ?? 0) : 0);
}

export function canTradeAdd(st, i) {
  return i > 0 && addTotal(st, i) >= 10;
}

export function tradeAdd(st, i) {
  if (!canTradeAdd(st, i)) return st;
  const counts = [...st.counts];
  const counts2 = [...st.counts2];
  const carried = [...st.carried];
  const remaining = addTotal(st, i) - 10;
  counts[i] = remaining;
  counts2[i] = null;
  carried[i] = Math.min(carried[i], remaining);
  counts[i - 1] += 1;
  carried[i - 1] += 1;
  return { ...st, counts, counts2, carried };
}

export function uncrossed(st, i) {
  return st.counts[i] - st.taken[i];
}

export function canTradeSub(st, i) {
  return i < st.counts.length - 1 && uncrossed(st, i) >= 1 && st.counts[i + 1] < 10;
}

export function tradeSub(st, i) {
  if (!canTradeSub(st, i)) return st;
  const counts = [...st.counts];
  const carried = [...st.carried];
  // Remove one UNCROSSED disc. The pile is [ringed…, plain…] with the first
  // `taken` crossed; prefer removing a plain uncrossed disc, else a ringed one.
  const plainUncrossed = (st.counts[i] - st.carried[i]) - Math.max(0, st.taken[i] - st.carried[i]);
  counts[i] -= 1;
  if (plainUncrossed <= 0) carried[i] -= 1;
  counts[i + 1] += 10;
  carried[i + 1] += 10;
  return { ...st, counts, carried };
}

// Take `n` away from column i. Returns { state, notice }: either the crossed
// state, or (not enough uncrossed discs) the SAME state plus a cream refusal.
// A column can only be taken once; Start over resets.
export function takeSub(st, i, n) {
  if (st.taken[i] > 0) return { state: st, notice: null };
  const have = uncrossed(st, i);
  if (have >= n) {
    const taken = [...st.taken];
    taken[i] = n;
    return { state: { ...st, taken }, notice: null };
  }
  const codes = placeCodes(st.counts.length);
  const p = codes[i];
  if (i > 0 && uncrossed(st, i - 1) >= 1) {
    const first = have === 0 ? `No ${PL_PLUR[p]} left.` : `Only ${have} ${have === 1 ? PL_SING[p] : PL_PLUR[p]}.`;
    return { state: st, notice: `${first} ${REGROUP.noun} 1 ${PL_SING[codes[i - 1]]} into 10 ${PL_PLUR[p]} first.` };
  }
  let lender = -1;
  for (let k = i - 1; k >= 0; k--) { if (uncrossed(st, k) >= 1) { lender = k; break; } }
  if (i > 0 && lender >= 0) {
    return { state: st, notice: `No ${PL_PLUR[codes[i - 1]]} yet — ${REGROUP.verb} 1 ${PL_SING[codes[lender]]} first.` };
  }
  return { state: st, notice: `Not enough ${PL_PLUR[p]} to take ${n}.` };
}

// Per-column "Trade →" visibility + long labels for the interactive chart.
export function tradeableFor(item, st) {
  const cols = st.counts.length;
  const codes = placeCodes(cols);
  const flags = [];
  const labels = [];
  for (let i = 0; i < cols; i++) {
    if (item.op === "+") {
      flags.push(canTradeAdd(st, i));
      labels.push(i > 0 ? `10 ${PL_PLUR[codes[i]]} → 1 ${PL_SING[codes[i - 1]]}` : "");
    } else {
      flags.push(canTradeSub(st, i));
      labels.push(i < cols - 1 ? `1 ${PL_SING[codes[i]]} → 10 ${PL_PLUR[codes[i + 1]]}` : "");
    }
  }
  return { flags, labels };
}

// "Take 8" chips (the subtrahend digit — a given). null where the digit is 0.
export function takeLabelsFor(item) {
  if (item.op !== "-") return null;
  return digitArr(item.b, item.columns).map((d) => (d > 0 ? `Take ${d}` : null));
}

// The chart in its AFTER-TRADES state, computed from the operands (not the
// child's chart state) — the reveal picture (§9.1). Addition: every column a
// merged pile of the answer digit, carried discs ringed. Subtraction: trades
// made only where needed, the take-aways crossed (ringed discs first).
// `trades` is the standard algorithm's tap sequence (for the written marks).
export function afterTradesState(item) {
  const cols = item.columns;
  let st = initDiscState(item);
  if (item.op === "+") {
    for (let i = cols - 1; i >= 1; i--) st = tradeAdd(st, i);
    const counts = st.counts.map((c, i) => c + (st.counts2[i] ?? 0));
    return { state: { ...st, counts, counts2: counts.map(() => null) }, trades: [] };
  }
  const B = digitArr(item.b, cols);
  const trades = [];
  for (let i = cols - 1; i >= 0; i--) {
    if (uncrossed(st, i) < B[i]) {
      let j = -1;
      for (let k = i - 1; k >= 0; k--) { if (uncrossed(st, k) >= 1) { j = k; break; } }
      if (j >= 0) {
        for (let m = j; m < i; m++) { st = tradeSub(st, m); trades.push(m); }
      }
    }
    if (B[i] > 0) st = takeSub(st, i, B[i]).state;
  }
  return { state: st, trades };
}

// The correct regroup marks, drawn on the grid for a second-miss fill (§9.3).
// Same shape as ColumnMethod's marks: { carry: [grid idx…], trades: [grid idx…] }.
export function canonicalMarks(item) {
  if (item.op === "+") {
    const { carryOut } = addStandard(item.a, item.b, item.columns);
    const carry = [];
    for (let i = 1; i < item.columns; i++) if (carryOut[i]) carry.push(i - 1);
    // carryOut[i] means column i carries INTO column i-1.
    return { carry, trades: [] };
  }
  const { trades } = subStandard(item.a, item.b, item.columns);
  return { carry: [], trades };
}

// Correct answer as answer-row cells: right-aligned, leading empties stay "".
export function correctDigitCells(item) {
  const cols = item.columns;
  const s = String(item.correctAnswer).padStart(cols, " ");
  return Array.from({ length: cols }, (_, i) => {
    const ch = s[s.length - cols + i];
    return ch === " " ? "" : ch;
  });
}

// The place the reveal outlines (§9.1 "Outline") for a column item, as a place code.
export function diagnosedPlace(item, entered) {
  const cols = item.columns;
  const codes = placeCodes(cols);
  const bug = diagnoseColumn(item, entered);
  if (item.op === "+") {
    const st = addStandard(item.a, item.b, cols);
    if (bug === "noCarry") {
      for (let i = cols - 1; i >= 0; i--) if (st.carryOut[i]) return codes[i];
    }
    const e = digitArr(entered ?? 0, cols);
    for (let i = cols - 1; i >= 0; i--) if (e[i] !== st.out[i]) return codes[i];
    return null;
  }
  const st = subStandard(item.a, item.b, cols);
  if (bug === "smallerFromLarger" || bug === "noDecrement") {
    for (let i = cols - 1; i >= 0; i--) if (st.A[i] < st.B[i]) return codes[i];
  }
  if (bug === "zeroStays10" && st.passed.length) return codes[Math.max(...st.passed)];
  const e = digitArr(entered ?? 0, cols);
  for (let i = cols - 1; i >= 0; i--) if (e[i] !== st.out[i]) return codes[i];
  return null;
}

// ---------------------------------------------------------------------------
// Derivation lines (§9). buildAddLine returns DerivationLine segments; the
// answer is always the LAST segment, a token driven by the screen's one
// `tokenState`. The kindness rule: a line names the STEP, never the child's
// error ("you", "wrong", "forgot" never appear).
// ---------------------------------------------------------------------------
function tokenSeg(item, tokenState) {
  return { t: "token", state: tokenState, value: formatNumber(item.correctAnswer) };
}

function addColumnLine(item, tokenState, entered) {
  const { a, b, columns: cols } = item;
  const codes = placeCodes(cols);
  const st = addStandard(a, b, cols);
  const bug = diagnoseColumn(item, entered);

  if (bug === "noCarry") {
    let g = -1;
    for (let i = cols - 1; i >= 0; i--) { if (st.carryOut[i]) { g = i; break; } }
    if (g > 0) {
      const P = codes[g];
      const next = codes[g - 1];
      return [
        { t: "text", v: `${cap(PL_PLUR[P])} made 10 or more — ${REGROUP.verb} 10 ${PL_PLUR[P]} into 1 ${PL_SING[next]} → ` },
        tokenSeg(item, tokenState),
      ];
    }
  }

  const e = digitArr(entered ?? 0, cols);
  let D = -1;
  for (let i = cols - 1; i >= 0; i--) { if (e[i] !== st.out[i]) { D = i; break; } }
  if (D < 0) D = cols - 1;
  const Dc = codes[D];
  const x = st.A[D];
  const y = st.B[D];
  let text;
  if (st.carryIn[D]) text = `${cap(PL_PLUR[Dc])}: ${x} + ${y} + 1 ${REGROUP.past} ${PL_SING[Dc]} → `;
  else if (st.carryOut[D]) text = `${cap(PL_PLUR[Dc])}: ${x} + ${y} is 10 or more — ${REGROUP.verb} it → `;
  else text = `${cap(PL_PLUR[Dc])}: ${x} + ${y} — count the discs → `;
  return [{ t: "text", v: text }, tokenSeg(item, tokenState)];
}

function subColumnLine(item, tokenState, entered) {
  const { a, b, columns: cols } = item;
  const codes = placeCodes(cols);
  const st = subStandard(a, b, cols);
  const bug = diagnoseColumn(item, entered);

  // P = the rightmost place whose top digit is smaller than the bottom digit.
  let P = -1;
  for (let i = cols - 1; i >= 0; i--) { if (st.A[i] < st.B[i]) { P = i; break; } }
  const firstNonZeroLeftOf = (g) => {
    for (let k = g - 1; k >= 0; k--) if (st.A[k] > 0) return k;
    return -1;
  };

  if (bug === "smallerFromLarger" && P > 0) {
    const L = P - 1;
    if (st.A[L] !== 0) {
      return [
        { t: "text", v: `${cap(PL_PLUR[codes[P]])}: ${st.A[P]} take ${st.B[P]}? ${REGROUP.noun} 1 ${PL_SING[codes[L]]} into 10 ${PL_PLUR[codes[P]]} first → ` },
        tokenSeg(item, tokenState),
      ];
    }
    const nz = firstNonZeroLeftOf(L);
    if (nz >= 0) {
      return [
        { t: "text", v: `No ${PL_PLUR[codes[L]]} yet — ${REGROUP.verb} 1 ${PL_SING[codes[nz]]} first → ` },
        tokenSeg(item, tokenState),
      ];
    }
  }

  if (bug === "zeroStays10" && st.passed.length > 0) {
    const Z = codes[Math.max(...st.passed)];
    return [
      { t: "text", v: `${REGROUP.noun} 1 of the 10 ${PL_PLUR[Z]} — 9 ${PL_PLUR[Z]} are left → ` },
      tokenSeg(item, tokenState),
    ];
  }

  if (bug === "noDecrement" && P > 0) {
    // The lender is the nearest place to the left of P that actually has discs.
    const lender = st.A[P - 1] > 0 ? P - 1 : firstNonZeroLeftOf(P - 1);
    if (lender >= 0) {
      return [
        { t: "text", v: `1 ${PL_SING[codes[lender]]} was ${REGROUP.past}, so 1 fewer ${PL_SING[codes[lender]]} → ` },
        tokenSeg(item, tokenState),
      ];
    }
  }

  const e = digitArr(entered ?? 0, cols);
  let D = -1;
  for (let i = cols - 1; i >= 0; i--) { if (e[i] !== st.out[i]) { D = i; break; } }
  if (D < 0) D = cols - 1;
  return [
    { t: "text", v: `${cap(PL_PLUR[codes[D]])}: ${st.cur[D]} take ${st.B[D]} — count the discs → ` },
    tokenSeg(item, tokenState),
  ];
}

function factLine(item, tokenState) {
  if (item.op === "+") {
    const big = item.a;
    const small = item.b;
    const need = 10 - big;
    const rest = small - need;
    return [
      { t: "text", v: `${big} needs ${need} to make 10; ${small} is ${need} and ${rest} → ` },
      tokenSeg(item, tokenState),
    ];
  }
  const c = item.a;
  const s = item.b;
  return [
    { t: "text", v: `Take ${s} from the ten: ${10 - s} left, and ${c - 10} more → ` },
    tokenSeg(item, tokenState),
  ];
}

export function buildAddLine(item, tokenState, firstSubmitValue = null) {
  if (item.answerType === "column") {
    return item.op === "+"
      ? addColumnLine(item, tokenState, firstSubmitValue)
      : subColumnLine(item, tokenState, firstSubmitValue);
  }
  if (item.group === "facts") return factLine(item, tokenState);
  return null;
}

// ---------------------------------------------------------------------------
// Achievement triggers (§12, pass-1 set). Mirrors checkExtraPlaceValueTrigger.
// `add-master` and the mental / words achievements arrive with pass 2.
// ---------------------------------------------------------------------------
function checkGroupMastered(groupId, masteryData) {
  const groupItems = ADD_POOL.filter((i) => i.group === groupId);
  return groupItems.length > 0 && groupItems.every((i) => ((masteryData?.[i.itemKey]?.correct) || 0) >= 3);
}

// ≥ N credited correct answers on S3 items, summed from mastery data
// (like pv-zero-hero: seeded test profiles unlock it on their first answer;
// real profiles earn it).
function checkS3Correct(masteryData, target) {
  let total = 0;
  for (const item of ADD_POOL) {
    if (item.skill === "S3") total += (masteryData?.[item.itemKey]?.correct) || 0;
  }
  return total >= target;
}

export function checkExtraAddTrigger(triggerType, params, values) {
  const mastery = values.mastery || {};
  switch (triggerType) {
    case "masterAddGroup":
      return checkGroupMastered(params.group, mastery);
    case "addZeroCrosser":
      return checkS3Correct(mastery, params.count);
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
  grades: "Grades 2–3",
  color: MODULE_COLORS.add,
  description: "Column adding & subtracting to 10,000 with number discs — plus a facts warm-up",

  // Group order = module order (the C4 working-group pill walks it). Pass 2
  // inserts `mental` and `words` between colSub and facts.
  groups: [
    { id: "colAdd", label: "Column Adding", skills: ["A1", "A2", "A3"], color: COLORS.purple },
    { id: "colSub", label: "Column Subtracting", skills: ["S1", "S2", "S3"], color: COLORS.blue },
    // `supporting` (§2): out of the default draw and the C4 pill; reached only
    // by a skill focus or a parent Lock Group. Free, ungated.
    { id: "facts", label: "Facts Warm-Up", skills: ["F1", "F2"], color: COLORS.yellow, supporting: true },
  ],

  // TEST-DRIVE VALUE: every built group is free while the native purchase
  // provider is still a stub (Place Value precedent, §14). The LAUNCH value
  // is ["colAdd", "facts"] per §14 — move colSub out when pricing is wired.
  freeContent: ["colAdd", "colSub", "facts"],

  skillLabels: {
    A1: "Add to 1,000",
    A2: "Add to 10,000",
    A3: "Lots of regrouping",
    S1: "Take away to 1,000",
    S2: "Take away to 10,000",
    S3: "Across zeros",
    F1: "Make a ten",
    F2: "Break a ten",
  },

  pool: ADD_POOL,

  // Documentation-only (never read programmatically — the practice screen
  // branches on item.skill / answerType directly, as in the sibling modules).
  scaffoldMap: {
    A1: "PlaceValueChart + ColumnGrid", A2: "PlaceValueChart + ColumnGrid", A3: "PlaceValueChart + ColumnGrid",
    S1: "PlaceValueChart + ColumnGrid", S2: "PlaceValueChart + ColumnGrid", S3: "PlaceValueChart + ColumnGrid",
    F1: "PlaceValueChart (2 columns)", F2: "PlaceValueChart (2 columns)",
  },

  defaultMode: "pictorial",
  defaultModeByGroup: { colAdd: "concrete", colSub: "concrete", facts: "concrete" },

  achievements: [
    { id: "add-carry-captain", name: "Regroup Captain", description: "Mastered every Column Adding item", trigger: "masterAddGroup", params: { group: "colAdd" } },
    { id: "add-take-away-pro", name: "Take-Away Pro", description: "Mastered every Column Subtracting item", trigger: "masterAddGroup", params: { group: "colSub" } },
    { id: "add-ten-maker", name: "Ten Maker", description: "Mastered every Facts Warm-Up item", trigger: "masterAddGroup", params: { group: "facts" } },
    { id: "add-zero-crosser", name: "Zero Crosser", description: "15 correct answers on across-zeros subtraction", trigger: "addZeroCrosser", params: { count: 15 } },
  ],

  checkExtraTrigger: checkExtraAddTrigger,
};

export default addModule;

// ---------------------------------------------------------------------------
// DEV-only self-check (§11.6). Runs once at module load: asserts the pool
// literals (arithmetic, key uniqueness, columns, regroup places per tag,
// sizes, disc-reducer round trip, bug applicability) and logs every column
// item's bug outputs once. Failures go to console.error; the check never
// throws, so it can't take the app down.
// ---------------------------------------------------------------------------
function runAddSelfCheck() {
  const problems = [];
  const fail = (msg) => problems.push(msg);

  const keys = new Set();
  ADD_POOL.forEach((i) => {
    if (keys.has(i.itemKey)) fail(`duplicate key ${i.itemKey}`);
    keys.add(i.itemKey);
    if (typeof i.correctAnswer !== "number") fail(`${i.itemKey}: correctAnswer is not a Number`);
  });

  const size = (skill) => ADD_POOL.filter((i) => i.skill === skill).length;
  const expectedSize = { A1: 16, A2: 20, A3: 20, S1: 16, S2: 20, S3: 20, F1: 20, F2: 36 };
  Object.entries(expectedSize).forEach(([sk, n]) => { if (size(sk) !== n) fail(`${sk} has ${size(sk)} items, expected ${n}`); });
  [["colAdd", 56], ["colSub", 56], ["facts", 56]].forEach(([g, n]) => {
    const c = ADD_POOL.filter((i) => i.group === g).length;
    if (c !== n) fail(`group ${g} has ${c} items, expected ${n}`);
  });

  // No commuted duplicates in the column pools.
  const seenPairs = new Set();
  ADD_POOL.filter((i) => i.answerType === "column" && i.op === "+").forEach((i) => {
    const k1 = `${i.a}+${i.b}`;
    const k2 = `${i.b}+${i.a}`;
    if (seenPairs.has(k2)) fail(`commuted duplicate ${i.itemKey}`);
    seenPairs.add(k1);
  });

  const srcBySkill = { A1: A1_SRC, A2: A2_SRC, A3: A3_SRC, S1: S1_SRC, S2: S2_SRC };
  const bugRows = [];
  ADD_POOL.filter((i) => i.answerType === "column").forEach((i) => {
    const want = i.op === "+" ? i.a + i.b : i.a - i.b;
    if (i.correctAnswer !== want) fail(`${i.itemKey}: arithmetic ${want} != ${i.correctAnswer}`);
    if (i.correctAnswer < 0 || i.correctAnswer > 9999 || i.a > 9999 || i.b > 9999) fail(`${i.itemKey}: out of range`);
    if (i.op === "-" && i.a < i.b) fail(`${i.itemKey}: negative result`);
    const wantCols = i.skill === "A1" || i.skill === "S1" ? 3 : i.skill === "S3" ? (String(i.a).length >= 4 ? 4 : 3) : 4;
    if (i.columns !== wantCols) fail(`${i.itemKey}: columns ${i.columns} != ${wantCols}`);
    if (String(i.correctAnswer).length > i.columns) fail(`${i.itemKey}: answer wider than the grid`);

    // Regroup places per tag.
    const expect = srcBySkill[i.skill] ? EXPECTED_REGROUPS[i.skill][i.pattern] : undefined;
    if (expect !== undefined && expect !== null) {
      if (i.regroups.join(",") !== expect.join(",")) fail(`${i.itemKey} (${i.pattern}): regroups [${i.regroups}] expected [${expect}]`);
    } else if (i.skill === "S2" && i.pattern === "two or three trades") {
      if (i.regroups.length < 2 || i.regroups.length > 3) fail(`${i.itemKey}: expected 2–3 trades, got [${i.regroups}]`);
    } else if (i.skill === "S3") {
      // Across zeros: a zero place in the top number must receive 10 (needing a
      // trade or passing one straight through).
      const st = subStandard(i.a, i.b, i.columns);
      if (!st.A.some((d, g) => d === 0 && st.received.includes(g))) {
        fail(`${i.itemKey}: S3 item has no zero place involved in a trade`);
      }
    }
    if (i.skill === "S2" && String(i.a).includes("0")) fail(`${i.itemKey}: S2 top number contains a zero`);

    // Standard-algorithm simulations reproduce the answer.
    if (i.op === "+" && numberFromDigits(addStandard(i.a, i.b, i.columns).out) !== i.correctAnswer) fail(`${i.itemKey}: addStandard mismatch`);
    if (i.op === "-" && numberFromDigits(subStandard(i.a, i.b, i.columns).out) !== i.correctAnswer) fail(`${i.itemKey}: subStandard mismatch`);

    // Disc round trip: the after-trades chart's remaining counts ARE the answer digits.
    const { state, trades } = afterTradesState(i);
    const remaining = state.counts.map((c, g) => c - state.taken[g]);
    if (remaining.join("") !== digitArr(i.correctAnswer, i.columns).join("")) fail(`${i.itemKey}: afterTradesState ${remaining} != answer`);
    if (i.op === "-" && trades.join(",") !== subStandard(i.a, i.b, i.columns).trades.join(",")) fail(`${i.itemKey}: chart trades != written trades`);

    // Bug outputs (§7): logged once; must differ from the answer where applicable.
    const row = { key: i.itemKey, answer: i.correctAnswer };
    if (i.op === "+") {
      row.noCarry = bugNoCarry(i.a, i.b, i.columns);
      if (i.regroups.length > 0 && row.noCarry === i.correctAnswer) fail(`${i.itemKey}: noCarry equals the answer`);
    } else {
      row.smallerFromLarger = bugSmallerFromLarger(i.a, i.b, i.columns);
      row.zeroStays10 = bugZeroStays10(i.a, i.b, i.columns);
      row.noDecrement = bugNoDecrement(i.a, i.b, i.columns);
      if (i.regroups.length > 0) {
        if (row.smallerFromLarger === i.correctAnswer) fail(`${i.itemKey}: smallerFromLarger equals the answer`);
        if (row.noDecrement === i.correctAnswer) fail(`${i.itemKey}: noDecrement equals the answer`);
      }
      if (subStandard(i.a, i.b, i.columns).passed.length > 0 && row.zeroStays10 === i.correctAnswer) fail(`${i.itemKey}: zeroStays10 equals the answer`);
    }
    bugRows.push(row);

    // Every line builds without throwing and ends in the answer token — for a
    // bug-matching entry and for a plain wrong entry.
    [row.noCarry ?? row.smallerFromLarger, row.zeroStays10 ?? 0, row.noDecrement ?? 0, i.correctAnswer + 1].forEach((probe) => {
      const line = buildAddLine(i, "blank", probe);
      if (!line || line[line.length - 1].t !== "token") fail(`${i.itemKey}: line has no trailing token (entered ${probe})`);
    });
  });

  // Spec worked examples (§7).
  const must = (label, got, want) => { if (got !== want) fail(`${label}: got ${got}, expected ${want}`); };
  must("noCarry 367+256", bugNoCarry(367, 256, 3), 513);
  must("sFL 503-178", bugSmallerFromLarger(503, 178, 3), 475);
  must("zeroStays10 503-178", bugZeroStays10(503, 178, 3), 335);
  must("zeroStays10 5003-1478", bugZeroStays10(5003, 1478, 4), 3635);
  must("noDecrement 5003-1478", bugNoDecrement(5003, 1478, 4), 4635);

  // Facts.
  ADD_POOL.filter((i) => i.group === "facts").forEach((i) => {
    const want = i.op === "+" ? i.a + i.b : i.a - i.b;
    if (i.correctAnswer !== want) fail(`${i.itemKey}: arithmetic`);
    if (i.skill === "F1" && (i.correctAnswer < 11 || i.correctAnswer > 18 || i.a < 2 || i.b < 2 || i.a > 9 || i.b > 9)) fail(`${i.itemKey}: F1 range`);
    if (i.skill === "F2" && (i.a < 11 || i.a > 18 || i.b < 2 || i.b > 9 || i.correctAnswer < 2 || i.correctAnswer > 9)) fail(`${i.itemKey}: F2 range`);
    const { state } = afterTradesState(i);
    const remaining = state.counts.map((c, g) => c - state.taken[g]);
    if (remaining.join("") !== digitArr(i.correctAnswer, 2).join("")) fail(`${i.itemKey}: facts afterTradesState ${remaining}`);
    const line = buildAddLine(i, "blank");
    if (!line || line[line.length - 1].t !== "token") fail(`${i.itemKey}: fact line`);
  });

  if (problems.length) {
    console.error(`[add self-check] ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  } else {
    console.debug(`[add self-check] OK — ${ADD_POOL.length} items (colAdd 56 · colSub 56 · facts 56)`);
  }
  console.debug("[add self-check] bug outputs per column item", bugRows);
}

if (import.meta.env.DEV) {
  try { runAddSelfCheck(); } catch (e) { console.error("[add self-check] threw", e); }
}
