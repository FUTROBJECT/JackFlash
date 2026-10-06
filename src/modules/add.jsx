/**
 * Add & Subtract module definition — PASS 1 + PASS 2 (docs/add-spec.md §15):
 * groups colAdd (A1–A3), colSub (S1–S3), mental (M1–M3), words (W1–W3) and
 * facts (F1–F2, supporting), in that module order.
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

// ---------------------------------------------------------------------------
// Mental Math pools (§6.2) — literal "a±b=c" rows, copied from the spec in
// introduction order. The number-line split is fixed per item (mentalPlan):
// M1/M2 split the second number into tens + ones; M3 rounds it up to the next
// ten, then fixes. Keys `add:ment:47+38`, `add:ment:72-38`, `add:ment:46+29`.
// ---------------------------------------------------------------------------
const M1_SRC = [
  ["no crossing", "43+25=68", "31+46=77", "52+34=86", "26+63=89", "71+28=99", "64+35=99"],
  ["no crossing, passes 100", "52+71=123", "85+64=149"],
  ["crossing", "47+38=85", "56+27=83", "29+44=73", "68+17=85", "37+35=72", "58+24=82", "15+66=81", "49+46=95"],
  ["crossing, passes 100", "67+58=125", "75+46=121", "84+39=123", "93+29=122"],
];
const M2_SRC = [
  ["no crossing", "78-35=43", "96-42=54", "67-24=43", "85-61=24", "59-37=22", "94-53=41"],
  ["crossing", "72-38=34", "63-27=36", "81-46=35", "54-18=36", "90-34=56", "70-45=25", "43-26=17", "95-58=37", "61-35=26", "84-47=37", "52-17=35", "31-14=17", "80-53=27", "76-48=28"],
];
const M3_SRC = [
  ["adding", "46+29=75", "37+19=56", "64+18=82", "25+39=64", "53+49=102", "58+29=87", "36+48=84", "71+19=90"],
  ["subtracting", "72-19=53", "85-29=56", "64-39=25", "91-49=42", "53-18=35", "80-29=51", "67-38=29", "46-19=27"],
];

function buildMentalItems(skill, src) {
  const items = [];
  src.forEach(([tag, ...strs]) => {
    strs.forEach((str) => {
      const m = str.match(/^(\d+)([+-])(\d+)=(\d+)$/);
      if (!m) throw new Error(`[add] bad mental literal: ${str}`);
      const a = Number(m[1]);
      const op = m[2];
      const b = Number(m[3]);
      const onesA = a % 10;
      const onesB = b % 10;
      items.push({
        itemKey: `add:ment:${a}${op}${b}`,
        group: "mental", skill, answerType: "singleNumber",
        op, a, b, correctAnswer: Number(m[4]),
        pattern: tag,
        // M1: the ones make a new ten. M2: the ones need regrouping. (M3 rounds instead.)
        crossing: skill === "M1" ? onesA + onesB >= 10 : skill === "M2" ? onesA < onesB : false,
        display: `${a}${op === "+" ? "+" : MINUS}${b}`,
      });
    });
  });
  return items;
}

// The fixed split for an item: the jumps drawn on the open number line, the
// first landing (an intermediate — printed only in the reveal) and the numbers
// the derivation line speaks. `labels` use the true minus sign.
export function mentalPlan(item) {
  const { a, b, op, skill } = item;
  const sign = op === "+" ? 1 : -1;
  const signCh = op === "+" ? "+" : MINUS;
  if (skill === "M3") {
    const gap = 10 - (b % 10);
    const rounded = b + gap;
    const back = -sign * gap;
    return {
      kind: "round", gap, rounded, signCh,
      jumps: [
        { label: `${signCh}${rounded}`, delta: sign * rounded },
        { label: `${back > 0 ? "+" : MINUS}${gap}`, delta: back },
      ],
      mid: a + sign * rounded,
    };
  }
  const tens = b - (b % 10);
  const ones = b % 10;
  return {
    kind: "split", tens, ones, signCh,
    jumps: [
      { label: `${signCh}${tens}`, delta: sign * tens },
      { label: `${signCh}${ones}`, delta: sign * ones },
    ],
    mid: a + sign * tens,
  };
}

// ---------------------------------------------------------------------------
// Word problems (§6.3) — the literal stories live in docs/add-word-problems.md
// (the source of truth); transcribed here verbatim, in introduction order. One
// object per item:
//   key       the persisted itemKey (never edit once shipped)
//   skill     W1 | W2 | W3
//   kind      whole | part | left (W1) · more | less | trap | diff-more |
//             diff-fewer (W2) · two-change | two-compare-whole |
//             two-whole-compare (W3). `trap: true` marks the 4 keyword traps.
//   model     the model Jack picks in Concrete: "partWhole" | "comparison"
//             ("two" on W3: the pick is step 1's model, step 2 follows)
//   story     the sentences before the question, verbatim (commas included)
//   question  the question sentence, verbatim (the reveal's problem slot)
//   answer    Number
//   labels    the bar model, with null = the unknown ("?") and "step1" = the
//             step-1 result carried into step 2 (shown as "?" until the reveal):
//             { parts: [[name, value], [name, value]], whole }   part-whole
//             { bars: [[name, value], [name, value]], diff }     comparison
//             (comparison bars: "+" step → the 2nd bar is the bigger; "−" → the 1st)
//             W3: an array of two of these, one per step
//   step1/step2 (W3 only) { op, a, b, result } — the two operations in order.
//             Single-step items take op/a/b from the key.
// ---------------------------------------------------------------------------
export const WORD_PROBLEMS = [
  {
    key: "add:wp:whole:324+152", skill: "W1", kind: "whole", model: "partWhole",
    story: "Leo has 324 red beads. He has 152 blue beads.",
    question: "How many beads does Leo have in all?", answer: 476,
    labels: { parts: [["Red beads", 324], ["Blue beads", 152]], whole: null },
  },
  {
    key: "add:wp:part:586-243", skill: "W1", kind: "part", model: "partWhole",
    story: "Mia has 586 stickers. She has 243 star stickers. The rest are heart stickers.",
    question: "How many heart stickers does Mia have?", answer: 343,
    labels: { parts: [["Star stickers", 243], ["Heart stickers", null]], whole: 586 },
  },
  {
    key: "add:wp:whole:438+247", skill: "W1", kind: "whole", model: "partWhole",
    story: "A library has 438 picture books. It has 247 comic books.",
    question: "How many picture books and comic books are there altogether?", answer: 685,
    labels: { parts: [["Picture books", 438], ["Comic books", 247]], whole: null },
  },
  {
    key: "add:wp:part:652-318", skill: "W1", kind: "left", model: "partWhole",
    story: "A farm stand had 652 apples. It sold 318 apples.",
    question: "How many apples were left?", answer: 334,
    labels: { parts: [["Sold", 318], ["Left", null]], whole: 652 },
  },
  {
    key: "add:wp:whole:563+284", skill: "W1", kind: "whole", model: "partWhole",
    story: "The zoo had 563 visitors on Saturday. It had 284 visitors on Sunday.",
    question: "How many visitors came on the two days in all?", answer: 847,
    labels: { parts: [["Saturday", 563], ["Sunday", 284]], whole: null },
  },
  {
    key: "add:wp:part:725-461", skill: "W1", kind: "part", model: "partWhole",
    story: "Priya and Omar have 725 shells together. Priya has 461 shells.",
    question: "How many shells does Omar have?", answer: 264,
    labels: { parts: [["Priya", 461], ["Omar", null]], whole: 725 },
  },
  {
    key: "add:wp:whole:2345+1432", skill: "W1", kind: "whole", model: "partWhole",
    story: "Kenji read 2,345 pages last year. He read 1,432 pages this year.",
    question: "How many pages did Kenji read altogether?", answer: 3777,
    labels: { parts: [["Last year", 2345], ["This year", 1432]], whole: null },
  },
  {
    key: "add:wp:part:4678-2351", skill: "W1", kind: "part", model: "partWhole",
    story: "A school has 4,678 books. Of these, 2,351 are storybooks. The rest are science books.",
    question: "How many science books does the school have?", answer: 2327,
    labels: { parts: [["Storybooks", 2351], ["Science books", null]], whole: 4678 },
  },
  {
    key: "add:wp:part:3895-1640", skill: "W1", kind: "left", model: "partWhole",
    story: "A shop had 3,895 balloons. It sold 1,640 balloons.",
    question: "How many balloons were left?", answer: 2255,
    labels: { parts: [["Sold", 1640], ["Left", null]], whole: 3895 },
  },
  {
    key: "add:wp:whole:5203+3614", skill: "W1", kind: "whole", model: "partWhole",
    story: "A farm grew 5,203 red apples. It grew 3,614 green apples.",
    question: "How many apples did the farm grow in all?", answer: 8817,
    labels: { parts: [["Red apples", 5203], ["Green apples", 3614]], whole: null },
  },
  {
    key: "add:wp:whole:2456+1327", skill: "W1", kind: "whole", model: "partWhole",
    story: "Zara has 2,456 gold stars. She has 1,327 silver stars.",
    question: "How many stars does Zara have altogether?", answer: 3783,
    labels: { parts: [["Gold stars", 2456], ["Silver stars", 1327]], whole: null },
  },
  {
    key: "add:wp:part:6385-2147", skill: "W1", kind: "part", model: "partWhole",
    story: "A stadium has 6,385 seats. Of these, 2,147 seats are blue. The rest are red.",
    question: "How many red seats are there?", answer: 4238,
    labels: { parts: [["Blue seats", 2147], ["Red seats", null]], whole: 6385 },
  },
  {
    key: "add:wp:whole:3742+2165", skill: "W1", kind: "whole", model: "partWhole",
    story: "A fair sold 3,742 tickets on Friday. It sold 2,165 tickets on Saturday.",
    question: "How many tickets did the fair sell in all?", answer: 5907,
    labels: { parts: [["Friday", 3742], ["Saturday", 2165]], whole: null },
  },
  {
    key: "add:wp:part:5460-2830", skill: "W1", kind: "left", model: "partWhole",
    story: "Sam had 5,460 stamps. He gave 2,830 stamps to his cousin.",
    question: "How many stamps does Sam have left?", answer: 2630,
    labels: { parts: [["Gave away", 2830], ["Left", null]], whole: 5460 },
  },
  {
    key: "add:wp:whole:4615+3830", skill: "W1", kind: "whole", model: "partWhole",
    story: "Aisha's class collected 4,615 bottle caps. Noah's class collected 3,830 bottle caps.",
    question: "How many bottle caps did both classes collect altogether?", answer: 8445,
    labels: { parts: [["Aisha's class", 4615], ["Noah's class", 3830]], whole: null },
  },
  {
    key: "add:wp:part:6254-3182", skill: "W1", kind: "part", model: "partWhole",
    story: "Ravi and Hana used 6,254 blocks to build a city. Ravi used 3,182 of the blocks.",
    question: "How many blocks did Hana use?", answer: 3072,
    labels: { parts: [["Ravi", 3182], ["Hana", null]], whole: 6254 },
  },
  {
    key: "add:wp:whole:6509+1284", skill: "W1", kind: "whole", model: "partWhole",
    story: "A garden has 6,509 yellow flowers. It has 1,284 purple flowers.",
    question: "How many flowers are in the garden altogether?", answer: 7793,
    labels: { parts: [["Yellow flowers", 6509], ["Purple flowers", 1284]], whole: null },
  },
  {
    key: "add:wp:part:6836-2592", skill: "W1", kind: "left", model: "partWhole",
    story: "A bakery made 6,836 cookies for a fair. It sold 2,592 cookies.",
    question: "How many cookies were left?", answer: 4244,
    labels: { parts: [["Sold", 2592], ["Left", null]], whole: 6836 },
  },
  {
    key: "add:wp:whole:5347+2425", skill: "W1", kind: "whole", model: "partWhole",
    story: "Mei planted 5,347 corn seeds. She planted 2,425 bean seeds.",
    question: "How many seeds did Mei plant in all?", answer: 7772,
    labels: { parts: [["Corn seeds", 5347], ["Bean seeds", 2425]], whole: null },
  },
  {
    key: "add:wp:part:8175-1640", skill: "W1", kind: "part", model: "partWhole",
    story: "A museum had 8,175 visitors in May. Of these, 1,640 were adults. The rest were children.",
    question: "How many children visited the museum in May?", answer: 6535,
    labels: { parts: [["Adults", 1640], ["Children", null]], whole: 8175 },
  },
  {
    key: "add:wp:more:320+145", skill: "W2", kind: "more", model: "comparison",
    story: "Ben has 320 stickers. Mia has 145 more stickers than Ben.",
    question: "How many stickers does Mia have?", answer: 465,
    labels: { bars: [["Ben", 320], ["Mia", null]], diff: 145 },
  },
  {
    key: "add:wp:diff:587-352", skill: "W2", kind: "diff-more", model: "comparison",
    story: "Lily has 587 beads. Omar has 352 beads.",
    question: "How many more beads does Lily have than Omar?", answer: 235,
    labels: { bars: [["Lily", 587], ["Omar", 352]], diff: null },
  },
  {
    key: "add:wp:less:768-235", skill: "W2", kind: "less", model: "comparison",
    story: "Jin has 768 cards. Ella has 235 fewer cards than Jin.",
    question: "How many cards does Ella have?", answer: 533,
    labels: { bars: [["Jin", 768], ["Ella", null]], diff: 235 },
  },
  {
    key: "add:wp:more:456+227", skill: "W2", kind: "more", model: "comparison",
    story: "Kofi scored 456 points in a game. Nora scored 227 more points than Kofi.",
    question: "How many points did Nora score?", answer: 683,
    labels: { bars: [["Kofi", 456], ["Nora", null]], diff: 227 },
  },
  {
    key: "add:wp:diff:814-352", skill: "W2", kind: "diff-more", model: "comparison",
    story: "The red train had 814 riders. The blue train had 352 riders.",
    question: "How many more riders did the red train have than the blue?", answer: 462,
    labels: { bars: [["Red train", 814], ["Blue train", 352]], diff: null },
  },
  {
    key: "add:wp:more:2130+1415", skill: "W2", kind: "more", model: "comparison",
    story: "Diego has 2,130 stamps. Ruby has 1,415 more stamps than Diego.",
    question: "How many stamps does Ruby have?", answer: 3545,
    labels: { bars: [["Diego", 2130], ["Ruby", null]], diff: 1415 },
  },
  {
    key: "add:wp:diff:4867-2543", skill: "W2", kind: "diff-fewer", model: "comparison",
    story: "Hill School has 4,867 library books. Park School has 2,543 library books.",
    question: "How many fewer books does Park School have than Hill School?", answer: 2324,
    labels: { bars: [["Hill School", 4867], ["Park School", 2543]], diff: null },
  },
  {
    key: "add:wp:less:5742-1325", skill: "W2", kind: "less", model: "comparison",
    story: "Luis has 5,742 marbles. Amir has 1,325 fewer marbles than Luis.",
    question: "How many marbles does Amir have?", answer: 4417,
    labels: { bars: [["Luis", 5742], ["Amir", null]], diff: 1325 },
  },
  {
    key: "add:wp:less:642-218", skill: "W2", kind: "trap", model: "comparison", trap: true,
    story: "Sofia has 642 shells. She has 218 more shells than Theo.",
    question: "How many shells does Theo have?", answer: 424,
    labels: { bars: [["Sofia", 642], ["Theo", null]], diff: 218 },
  },
  {
    key: "add:wp:more:3264+2519", skill: "W2", kind: "more", model: "comparison",
    story: "A zoo had 3,264 visitors on Monday. On Tuesday, it had 2,519 more visitors than on Monday.",
    question: "How many visitors came on Tuesday?", answer: 5783,
    labels: { bars: [["Monday", 3264], ["Tuesday", null]], diff: 2519 },
  },
  {
    key: "add:wp:diff:5893-3417", skill: "W2", kind: "diff-more", model: "comparison",
    story: "Ines won 5,893 tickets at the arcade. Dev won 3,417 tickets.",
    question: "How many more tickets did Ines win than Dev?", answer: 2476,
    labels: { bars: [["Ines", 5893], ["Dev", 3417]], diff: null },
  },
  {
    key: "add:wp:more:4580+1270", skill: "W2", kind: "more", model: "comparison",
    story: "A farm has 4,580 chickens. It has 1,270 more ducks than chickens.",
    question: "How many ducks does the farm have?", answer: 5850,
    labels: { bars: [["Chickens", 4580], ["Ducks", null]], diff: 1270 },
  },
  {
    key: "add:wp:less:3625-1408", skill: "W2", kind: "trap", model: "comparison", trap: true,
    story: "Felix has 3,625 stickers. He has 1,408 more stickers than Yuki.",
    question: "How many stickers does Yuki have?", answer: 2217,
    labels: { bars: [["Felix", 3625], ["Yuki", null]], diff: 1408 },
  },
  {
    key: "add:wp:less:6460-2830", skill: "W2", kind: "less", model: "comparison",
    story: "The big pond has 6,460 fish. The small pond has 2,830 fewer fish.",
    question: "How many fish are in the small pond?", answer: 3630,
    labels: { bars: [["Big pond", 6460], ["Small pond", null]], diff: 2830 },
  },
  {
    key: "add:wp:diff:5182-3951", skill: "W2", kind: "diff-fewer", model: "comparison",
    story: "Hugo's school sold 5,182 raffle tickets. Lucy's school sold 3,951 raffle tickets.",
    question: "How many fewer tickets did Lucy's school sell than Hugo's?", answer: 1231,
    labels: { bars: [["Hugo's school", 5182], ["Lucy's school", 3951]], diff: null },
  },
  {
    key: "add:wp:more:3148+2705", skill: "W2", kind: "more", model: "comparison",
    story: "Arjun has 3,148 blocks. Jade has 2,705 more blocks than Arjun.",
    question: "How many blocks does Jade have?", answer: 5853,
    labels: { bars: [["Arjun", 3148], ["Jade", null]], diff: 2705 },
  },
  {
    key: "add:wp:less:4350-1820", skill: "W2", kind: "trap", model: "comparison", trap: true,
    story: "Owen planted 4,350 seeds. He planted 1,820 more seeds than Nia.",
    question: "How many seeds did Nia plant?", answer: 2530,
    labels: { bars: [["Owen", 4350], ["Nia", null]], diff: 1820 },
  },
  {
    key: "add:wp:diff:8416-1293", skill: "W2", kind: "diff-more", model: "comparison",
    story: "The fair had 8,416 visitors on Saturday. It had 1,293 visitors on Sunday.",
    question: "How many more visitors came on Saturday than on Sunday?", answer: 7123,
    labels: { bars: [["Saturday", 8416], ["Sunday", 1293]], diff: null },
  },
  {
    key: "add:wp:more:1574+1362", skill: "W2", kind: "more", model: "comparison",
    story: "Kai has 1,574 beads. Zoe has 1,362 more beads than Kai.",
    question: "How many beads does Zoe have?", answer: 2936,
    labels: { bars: [["Kai", 1574], ["Zoe", null]], diff: 1362 },
  },
  {
    key: "add:wp:less:6205-2140", skill: "W2", kind: "trap", model: "comparison", trap: true,
    story: "A shop sold 6,205 pencils. It sold 2,140 more pencils than erasers.",
    question: "How many erasers did the shop sell?", answer: 4065,
    labels: { bars: [["Pencils", 6205], ["Erasers", null]], diff: 2140 },
  },
  {
    key: "add:wp:two:485-132+210", skill: "W3", kind: "two-change", model: "two",
    story: "Leo had 485 stickers. He gave 132 stickers to his sister. Then he bought 210 more stickers.",
    question: "How many stickers does Leo have now?", answer: 563,
    step1: { op: "-", a: 485, b: 132, result: 353 },
    step2: { op: "+", a: 353, b: 210, result: 563 },
    labels: [{ parts: [["Gave away", 132], ["Left", null]], whole: 485 }, { parts: [["Left", "step1"], ["Bought", 210]], whole: null }],
  },
  {
    key: "add:wp:two:213+142+213", skill: "W3", kind: "two-compare-whole", model: "two",
    story: "Ava has 213 beads. Mei has 142 more beads than Ava.",
    question: "How many beads do they have altogether?", answer: 568,
    step1: { op: "+", a: 213, b: 142, result: 355 },
    step2: { op: "+", a: 213, b: 355, result: 568 },
    labels: [{ bars: [["Ava", 213], ["Mei", null]], diff: 142 }, { parts: [["Ava", 213], ["Mei", "step1"]], whole: null }],
  },
  {
    key: "add:wp:two:650-280+145", skill: "W3", kind: "two-change", model: "two",
    story: "A shop had 650 pens. It sold 280 pens. Then 145 more pens came in.",
    question: "How many pens does the shop have now?", answer: 515,
    step1: { op: "-", a: 650, b: 280, result: 370 },
    step2: { op: "+", a: 370, b: 145, result: 515 },
    labels: [{ parts: [["Sold", 280], ["Left", null]], whole: 650 }, { parts: [["Left", "step1"], ["Came in", 145]], whole: null }],
  },
  {
    key: "add:wp:two:236+118+236", skill: "W3", kind: "two-compare-whole", model: "two",
    story: "Ezra has 236 cards. Grace has 118 more cards than Ezra.",
    question: "How many cards do they have in all?", answer: 590,
    step1: { op: "+", a: 236, b: 118, result: 354 },
    step2: { op: "+", a: 236, b: 354, result: 590 },
    labels: [{ bars: [["Ezra", 236], ["Grace", null]], diff: 118 }, { parts: [["Ezra", 236], ["Grace", "step1"]], whole: null }],
  },
  {
    key: "add:wp:two:750-240-240", skill: "W3", kind: "two-whole-compare", model: "two",
    story: "Rosa and Ali have 750 marbles together. Rosa has 240 marbles.",
    question: "How many more marbles does Ali have than Rosa?", answer: 270,
    step1: { op: "-", a: 750, b: 240, result: 510 },
    step2: { op: "-", a: 510, b: 240, result: 270 },
    labels: [{ parts: [["Rosa", 240], ["Ali", null]], whole: 750 }, { bars: [["Ali", "step1"], ["Rosa", 240]], diff: null }],
  },
  {
    key: "add:wp:two:3460-1230+2105", skill: "W3", kind: "two-change", model: "two",
    story: "A sports shop had 3,460 tennis balls. It sold 1,230 tennis balls. Then it got 2,105 more tennis balls.",
    question: "How many tennis balls does the shop have now?", answer: 4335,
    step1: { op: "-", a: 3460, b: 1230, result: 2230 },
    step2: { op: "+", a: 2230, b: 2105, result: 4335 },
    labels: [{ parts: [["Sold", 1230], ["Left", null]], whole: 3460 }, { parts: [["Left", "step1"], ["Got", 2105]], whole: null }],
  },
  {
    key: "add:wp:two:2130+1240+2130", skill: "W3", kind: "two-compare-whole", model: "two",
    story: "Hana collected 2,130 shells. Kofi collected 1,240 more shells than Hana.",
    question: "How many shells did they collect altogether?", answer: 5500,
    step1: { op: "+", a: 2130, b: 1240, result: 3370 },
    step2: { op: "+", a: 2130, b: 3370, result: 5500 },
    labels: [{ bars: [["Hana", 2130], ["Kofi", null]], diff: 1240 }, { parts: [["Hana", 2130], ["Kofi", "step1"]], whole: null }],
  },
  {
    key: "add:wp:two:5250-1630+2415", skill: "W3", kind: "two-change", model: "two",
    story: "Amir had 5,250 stamps. He gave 1,630 stamps to a friend. Then he got 2,415 more stamps.",
    question: "How many stamps does Amir have now?", answer: 6035,
    step1: { op: "-", a: 5250, b: 1630, result: 3620 },
    step2: { op: "+", a: 3620, b: 2415, result: 6035 },
    labels: [{ parts: [["Gave away", 1630], ["Left", null]], whole: 5250 }, { parts: [["Left", "step1"], ["Got", 2415]], whole: null }],
  },
  {
    key: "add:wp:two:1425+1318+1425", skill: "W3", kind: "two-compare-whole", model: "two",
    story: "Wei folded 1,425 paper stars. Lena folded 1,318 more stars than Wei.",
    question: "How many stars did they fold altogether?", answer: 4168,
    step1: { op: "+", a: 1425, b: 1318, result: 2743 },
    step2: { op: "+", a: 1425, b: 2743, result: 4168 },
    labels: [{ bars: [["Wei", 1425], ["Lena", null]], diff: 1318 }, { parts: [["Wei", 1425], ["Lena", "step1"]], whole: null }],
  },
  {
    key: "add:wp:two:4860-1520-1520", skill: "W3", kind: "two-whole-compare", model: "two",
    story: "Isla and Max sold 4,860 tickets together. Isla sold 1,520 tickets.",
    question: "How many more tickets did Max sell than Isla?", answer: 1820,
    step1: { op: "-", a: 4860, b: 1520, result: 3340 },
    step2: { op: "-", a: 3340, b: 1520, result: 1820 },
    labels: [{ parts: [["Isla", 1520], ["Max", null]], whole: 4860 }, { bars: [["Max", "step1"], ["Isla", 1520]], diff: null }],
  },
  {
    key: "add:wp:two:2145+1320-1280", skill: "W3", kind: "two-change", model: "two",
    story: "Nora had 2,145 beads. She bought 1,320 more beads. Then she used 1,280 beads to make bracelets.",
    question: "How many beads does Nora have now?", answer: 2185,
    step1: { op: "+", a: 2145, b: 1320, result: 3465 },
    step2: { op: "-", a: 3465, b: 1280, result: 2185 },
    labels: [{ parts: [["Had", 2145], ["Bought", 1320]], whole: null }, { parts: [["Used", 1280], ["Left", null]], whole: "step1" }],
  },
  {
    key: "add:wp:two:4250-1630+4250", skill: "W3", kind: "two-compare-whole", model: "two",
    story: "Tom has 4,250 cards. Ana has 1,630 fewer cards than Tom.",
    question: "How many cards do they have altogether?", answer: 6870,
    step1: { op: "-", a: 4250, b: 1630, result: 2620 },
    step2: { op: "+", a: 4250, b: 2620, result: 6870 },
    labels: [{ bars: [["Tom", 4250], ["Ana", null]], diff: 1630 }, { parts: [["Tom", 4250], ["Ana", "step1"]], whole: null }],
  },
  {
    key: "add:wp:two:6480-2150-2150", skill: "W3", kind: "two-whole-compare", model: "two",
    story: "A zoo had 6,480 visitors on the weekend. Of these, 2,150 came on Saturday. The rest came on Sunday.",
    question: "How many more visitors came on Sunday than on Saturday?", answer: 2180,
    step1: { op: "-", a: 6480, b: 2150, result: 4330 },
    step2: { op: "-", a: 4330, b: 2150, result: 2180 },
    labels: [{ parts: [["Saturday", 2150], ["Sunday", null]], whole: 6480 }, { bars: [["Sunday", "step1"], ["Saturday", 2150]], diff: null }],
  },
  {
    key: "add:wp:two:7325-2140+1608", skill: "W3", kind: "two-change", model: "two",
    story: "A farm had 7,325 seeds. The farmer planted 2,140 seeds. Then she bought 1,608 more seeds.",
    question: "How many seeds does the farmer have now?", answer: 6793,
    step1: { op: "-", a: 7325, b: 2140, result: 5185 },
    step2: { op: "+", a: 5185, b: 1608, result: 6793 },
    labels: [{ parts: [["Planted", 2140], ["Left", null]], whole: 7325 }, { parts: [["Left", "step1"], ["Bought", 1608]], whole: null }],
  },
  {
    key: "add:wp:two:5370-1450+5370", skill: "W3", kind: "two-compare-whole", model: "two",
    story: "A school has 5,370 crayons. It has 1,450 fewer markers than crayons.",
    question: "How many crayons and markers does the school have altogether?", answer: 9290,
    step1: { op: "-", a: 5370, b: 1450, result: 3920 },
    step2: { op: "+", a: 5370, b: 3920, result: 9290 },
    labels: [{ bars: [["Crayons", 5370], ["Markers", null]], diff: 1450 }, { parts: [["Crayons", 5370], ["Markers", "step1"]], whole: null }],
  },
  {
    key: "add:wp:two:8950-3725-3725", skill: "W3", kind: "two-whole-compare", model: "two",
    story: "Yuki and Ivan have 8,950 stickers together. Yuki has 3,725 stickers.",
    question: "How many more stickers does Ivan have than Yuki?", answer: 1500,
    step1: { op: "-", a: 8950, b: 3725, result: 5225 },
    step2: { op: "-", a: 5225, b: 3725, result: 1500 },
    labels: [{ parts: [["Yuki", 3725], ["Ivan", null]], whole: 8950 }, { bars: [["Ivan", "step1"], ["Yuki", 3725]], diff: null }],
  },
];

// kind → the model Jack picks in Concrete (single-step kinds; W3 uses step 1's).
const SINGLE_KIND_MODEL = {
  whole: "partWhole", part: "partWhole", left: "partWhole",
  more: "comparison", less: "comparison", trap: "comparison", "diff-more": "comparison", "diff-fewer": "comparison",
};

const specModel = (spec) => (spec && spec.parts ? "partWhole" : "comparison");

// One normalized model per step: render-ready roles instead of label order.
//   partWhole:  { model, whole, partA: {name, value}, partB: {name, value} }
//   comparison: { model, base: {name, value}, bigger: {name, value}, diff }
// value: Number | null (the unknown) | "step1" (carried in from step 1).
// `unknown` names the role holding null, `carry` the role holding "step1".
function normalizeSpec(spec, op) {
  const nv = ([name, value]) => ({ name, value });
  let out;
  if (spec.parts) {
    out = { model: "partWhole", whole: spec.whole, partA: nv(spec.parts[0]), partB: nv(spec.parts[1]) };
    const cells = { whole: out.whole, partA: out.partA.value, partB: out.partB.value };
    out.unknown = Object.keys(cells).find((k) => cells[k] === null) || null;
    out.carry = Object.keys(cells).find((k) => cells[k] === "step1") || null;
    return out;
  }
  // Comparison: a "+" step builds the bigger bar (the 2nd), a "−" step starts from it (the 1st).
  const [first, second] = spec.bars.map(nv);
  out = op === "+"
    ? { model: "comparison", base: first, bigger: second, diff: spec.diff }
    : { model: "comparison", base: second, bigger: first, diff: spec.diff };
  const cells = { base: out.base.value, bigger: out.bigger.value, diff: out.diff };
  out.unknown = Object.keys(cells).find((k) => cells[k] === null) || null;
  out.carry = Object.keys(cells).find((k) => cells[k] === "step1") || null;
  return out;
}

const opResult = (op, a, b) => (op === "+" ? a + b : a - b);

function buildWordItem(e) {
  const tail = e.key.slice(e.key.lastIndexOf(":") + 1); // "320+145", "485-132+210"
  let steps;
  let specs;
  if (e.skill === "W3") {
    specs = e.labels;
    steps = [e.step1, e.step2].map((s, i) => ({ ...s, spec: normalizeSpec(specs[i], s.op) }));
  } else {
    const m = tail.match(/^(\d+)([+-])(\d+)$/);
    if (!m) throw new Error(`[add] bad word key: ${e.key}`);
    const step = { op: m[2], a: Number(m[1]), b: Number(m[3]) };
    step.result = opResult(step.op, step.a, step.b);
    steps = [{ ...step, spec: normalizeSpec(e.labels, step.op) }];
  }
  const last = steps[steps.length - 1];
  return {
    itemKey: e.key,
    group: "words", skill: e.skill, answerType: "singleNumber",
    kind: e.kind, trap: !!e.trap, model: e.model,
    pickModel: e.skill === "W3" ? specModel(specs[0]) : e.model,
    story: e.story, question: e.question,
    steps, op: last.op, a: last.a, b: last.b,
    correctAnswer: Number(e.answer),
    // Grid cell: the key's numbers without commas or spaces ("4860−1520−1520").
    display: tail.replace(/-/g, MINUS),
  };
}

function buildAddPool() {
  const A1 = buildColumnItems("A1", A1_SRC);
  const A2 = buildColumnItems("A2", A2_SRC);
  const A3 = buildColumnItems("A3", A3_SRC);
  const S1 = buildColumnItems("S1", S1_SRC);
  const S2 = buildColumnItems("S2", S2_SRC);
  const S3 = buildColumnItems("S3", S3_SRC);
  const M1 = buildMentalItems("M1", M1_SRC);
  const M2 = buildMentalItems("M2", M2_SRC);
  const M3 = buildMentalItems("M3", M3_SRC);
  const words = WORD_PROBLEMS.map(buildWordItem);
  const wordsOf = (skill) => words.filter((w) => w.skill === skill);
  const { f1, f2 } = buildFactItems();
  // Introduction order (§6.5): A1/S1, A2/S2, A3/S3 interleaved; M1/M2
  // interleaved; M3; W1, W2, W3; then the supporting facts.
  return [
    ...interleave(A1, S1),
    ...interleave(A2, S2),
    ...interleave(A3, S3),
    ...interleave(M1, M2),
    ...M3,
    ...wordsOf("W1"), ...wordsOf("W2"), ...wordsOf("W3"),
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
  M3: ["M1", "M2"],
  W2: ["W1"],
  W3: ["W1", "W2"],
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
  // asked[j]: the child tried column j's take and came up short. A
  // subtraction Regroup button only appears for a column that lends to an
  // asked column (see tradeableFor), so a problem that needs no regrouping
  // never shows one.
  return { counts: A, counts2: null, carried: [...zeros], taken: [...zeros], asked: zeros.map(() => false) };
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

// Is a subtraction regroup at column i actually needed? (decided 2026-10-06)
// Regrouping is the answer to "can I take this?" — so it's allowed only when
// some column to the right is SHORT (its top can't cover its take) and column
// i is the nearest column with something to lend (every column in between is
// empty, e.g. across zeros). Otherwise the child gets a reason instead of a
// silent no, which keeps the "is the top digit enough?" decision with him.
//   have[j] — what column j has now (chart: uncrossed discs; marks: current value)
//   done[j] — column j's take is finished (chart only; marks pass all false)
// Returns { ok: true } or { ok: false, notice }.
export function subRegroupCheck(item, have, done, i) {
  const cols = item.columns;
  const codes = placeCodes(cols);
  const B = digitArr(item.b, cols);
  const short = (j) => !done[j] && have[j] < B[j];
  // serves = every short column that i is the nearest lender for: scanning
  // right, through empty columns (across zeros), stopping at the first
  // column that has something (it lends to whatever lies beyond it).
  const serves = [];
  for (let j = i + 1; j < cols; j++) {
    if (short(j)) serves.push(j);
    if (have[j] > 0) break;
  }
  if (serves.length > 0) return { ok: true, serves };
  const r = i + 1;
  if (r >= cols) return { ok: false, notice: `No need to ${REGROUP.verb} here.` };
  const place = codes[r];
  const amount = `${have[r]} ${have[r] === 1 ? PL_SING[place] : PL_PLUR[place]}`;
  if (done[r]) return { ok: false, notice: `The ${PL_PLUR[place]} are done — no need to ${REGROUP.verb}.` };
  if (have[r] > 0 && B[r] > 0) return { ok: false, notice: `${amount} — enough to take ${B[r]}. No need to ${REGROUP.verb}.` };
  if (have[r] > 0) return { ok: false, notice: `Nothing to take from the ${PL_PLUR[place]}. No need to ${REGROUP.verb}.` };
  return { ok: false, notice: `No need to ${REGROUP.verb} here.` };
}

// Chart view for subRegroupCheck.
export function chartRegroupCheck(item, st, i) {
  const have = st.counts.map((c, j) => c - st.taken[j]);
  const done = st.taken.map((t) => t > 0);
  return subRegroupCheck(item, have, done, i);
}

// Take `n` away from column i. Returns { state, notice }: either the crossed
// state, or (not enough uncrossed discs) the SAME state plus a cream refusal.
// A column can only be taken once; Start over resets.
export function takeSub(st, i, n) {
  if (st.taken[i] > 0) return { state: st, notice: null };
  const have = uncrossed(st, i);
  // A refused take marks the column as asked, which reveals the Regroup
  // button on the column that should lend to it.
  const askedSt = { ...st, asked: (st.asked || st.counts.map(() => false)).map((v, k) => v || k === i) };
  if (have >= n) {
    const taken = [...st.taken];
    taken[i] = n;
    return { state: { ...st, taken }, notice: null };
  }
  const codes = placeCodes(st.counts.length);
  const p = codes[i];
  if (i > 0 && uncrossed(st, i - 1) >= 1) {
    const first = have === 0 ? `No ${PL_PLUR[p]} left.` : `Only ${have} ${have === 1 ? PL_SING[p] : PL_PLUR[p]}.`;
    return { state: askedSt, notice: `${first} ${REGROUP.noun} 1 ${PL_SING[codes[i - 1]]} into 10 ${PL_PLUR[p]} first.` };
  }
  let lender = -1;
  for (let k = i - 1; k >= 0; k--) { if (uncrossed(st, k) >= 1) { lender = k; break; } }
  if (i > 0 && lender >= 0) {
    return { state: askedSt, notice: `No ${PL_PLUR[codes[i - 1]]} yet — ${REGROUP.verb} 1 ${PL_SING[codes[lender]]} first.` };
  }
  return { state: askedSt, notice: `Not enough ${PL_PLUR[p]} to take ${n}.` };
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
      // Only where it's needed AND the child has already found the column
      // short by trying its take — he discovers the need; the app never
      // advertises a regroup the problem doesn't have.
      const check = canTradeSub(st, i) ? chartRegroupCheck(item, st, i) : { ok: false };
      flags.push(check.ok && check.serves.some((j) => !!st.asked?.[j]));
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

// ---------------------------------------------------------------------------
// Mental + word bug library (§7) and derivation lines (§9.2). Same contract as
// the column bugs: pure functions of the operands, first match wins, and a bug
// whose output equals the correct answer never matches.
//   M1 dropTen             the item crosses a ten and entered = correct − 10
//   M2 smallerFromLarger   |tens − tens|·10 + |ones − ones|  (72 − 38 → 46)
//   M3 wrongWay            entered = correct ± 2·gap, the wrong way to fix
//   otherOp                entered = the other operation on the same two numbers
//   stepOneOnly (W3)       entered = the step-1 result
// ---------------------------------------------------------------------------
export function bugMentalSmallerFromLarger(a, b) {
  return Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10));
}

export function bugM3WrongWay(item) {
  const { gap } = mentalPlan(item);
  return item.correctAnswer + (item.op === "+" ? 2 * gap : -2 * gap);
}

// otherOp applies where spec §9.2 gives a bug line: W1 find-a-part, W2 find-smaller
// (incl. traps) and W2 difference. W1 find-whole and W2 find-bigger have none.
const OTHER_OP_KINDS = new Set(["part", "left", "less", "trap", "diff-more", "diff-fewer"]);
export function wordOtherOp(item) {
  return OTHER_OP_KINDS.has(item.kind) ? item.a + item.b : null;
}

export function diagnoseSingle(item, entered) {
  if (entered === null || entered === undefined || Number.isNaN(entered) || entered === item.correctAnswer) return null;
  if (item.group === "mental") {
    if (item.skill === "M1") return item.crossing && entered === item.correctAnswer - 10 ? "dropTen" : null;
    if (item.skill === "M2") return entered === bugMentalSmallerFromLarger(item.a, item.b) ? "smallerFromLarger" : null;
    return entered === bugM3WrongWay(item) ? "wrongWay" : null;
  }
  if (item.group === "words") {
    if (item.skill === "W3") return entered === item.steps[0].result ? "stepOneOnly" : null;
    return wordOtherOp(item) === entered ? "otherOp" : null;
  }
  return null;
}

function mentalLine(item, tokenState, entered) {
  const bug = diagnoseSingle(item, entered);
  const plan = mentalPlan(item);
  const { a, b, skill } = item;
  const tok = tokenSeg(item, tokenState);
  const text = (v) => ({ t: "text", v });
  if (skill === "M1") {
    if (bug === "dropTen") return [text(`${a % 10} + ${b % 10} ones make a new ten — keep it → `), tok];
    return [text(`${a} + ${plan.tens} = ${plan.mid}, then ${plan.ones} more → `), tok];
  }
  if (skill === "M2") {
    if (bug === "smallerFromLarger") return [text(`${a % 10} ones take ${b % 10}? ${REGROUP.noun} a ten first → `), tok];
    return [text(`${a} ${MINUS} ${plan.tens} = ${plan.mid}, then take ${plan.ones} more → `), tok];
  }
  const { gap, rounded } = plan;
  if (item.op === "+") {
    if (bug === "wrongWay") return [text(`+${rounded} is ${gap} too many — take ${gap} back → `), tok];
    return [text(`${a} + ${rounded} = ${plan.mid}, then take ${gap} back → `), tok];
  }
  if (bug === "wrongWay") return [text(`${MINUS}${rounded} takes ${gap} too many — add ${gap} back → `), tok];
  return [text(`${a} ${MINUS} ${rounded} = ${plan.mid}, then add ${gap} back → `), tok];
}

const possessive = (name) => (name.endsWith("s") ? `${name}'` : `${name}'s`);
const stepEq = (s) => `${formatNumber(s.a)} ${s.op === "+" ? "+" : MINUS} ${formatNumber(s.b)}`;

function wordLine(item, tokenState, entered) {
  const bug = diagnoseSingle(item, entered);
  const tok = tokenSeg(item, tokenState);
  const text = (v) => ({ t: "text", v });
  if (item.skill === "W3") {
    const [s1, s2] = item.steps;
    const lead = bug === "stepOneOnly" ? "That's step 1. " : `Step 1: ${stepEq(s1)} = ${formatNumber(s1.result)}. `;
    return [text(`${lead}Step 2: ${stepEq(s2)} → `), tok];
  }
  const step = item.steps[0];
  const eq = stepEq(step);
  const spec = step.spec;
  switch (item.kind) {
    case "whole":
      return [text(`The parts make the whole: ${eq} → `), tok];
    case "part":
    case "left":
      return [text(bug === "otherOp"
        ? `The whole is already ${formatNumber(step.a)} — take away → `
        : `Whole take away the part you know: ${eq} → `), tok];
    case "more":
      return [text(`${possessive(spec.bigger.name)} bar is ${possessive(spec.base.name)} and ${formatNumber(step.b)} more: ${eq} → `), tok];
    case "less":
    case "trap":
      return [text(bug === "otherOp"
        ? `${possessive(spec.base.name)} bar is shorter, so take away: ${eq} → `
        : `${possessive(spec.base.name)} bar is the shorter one: ${eq} → `), tok];
    default: // diff-more / diff-fewer
      return [text(bug === "otherOp"
        ? `How many ${item.kind === "diff-more" ? "more" : "fewer"} = the gap: ${eq} → `
        : `The gap between the bars: ${eq} → `), tok];
  }
}

export function buildAddLine(item, tokenState, firstSubmitValue = null) {
  if (item.answerType === "column") {
    return item.op === "+"
      ? addColumnLine(item, tokenState, firstSubmitValue)
      : subColumnLine(item, tokenState, firstSubmitValue);
  }
  if (item.group === "facts") return factLine(item, tokenState);
  if (item.group === "mental") return mentalLine(item, tokenState, firstSubmitValue);
  if (item.group === "words") return wordLine(item, tokenState, firstSubmitValue);
  return null;
}

// ---------------------------------------------------------------------------
// Achievement triggers (§12). Mirrors checkExtraPlaceValueTrigger.
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

// add-master: every item in colAdd, colSub, mental and words (facts excluded).
// Checked over the whole pool, like Place Value's checkAllMastered: an
// unpurchased item can never earn mastery data in the first place.
const MASTER_GROUPS = ["colAdd", "colSub", "mental", "words"];
function checkAddMaster(masteryData) {
  const items = ADD_POOL.filter((i) => MASTER_GROUPS.includes(i.group));
  return items.length > 0 && items.every((i) => ((masteryData?.[i.itemKey]?.correct) || 0) >= 3);
}

export function checkExtraAddTrigger(triggerType, params, values) {
  const mastery = values.mastery || {};
  switch (triggerType) {
    case "masterAddGroup":
      return checkGroupMastered(params.group, mastery);
    case "addMaster":
      return checkAddMaster(mastery);
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
  description: "Column adding & subtracting to 10,000 with number discs — plus mental math and bar-model word problems",

  // Group order = module order (the C4 working-group pill walks it).
  groups: [
    { id: "colAdd", label: "Column Adding", skills: ["A1", "A2", "A3"], color: COLORS.purple },
    { id: "colSub", label: "Column Subtracting", skills: ["S1", "S2", "S3"], color: COLORS.blue },
    { id: "mental", label: "Mental Math", skills: ["M1", "M2", "M3"], color: COLORS.orange },
    { id: "words", label: "Word Problems", skills: ["W1", "W2", "W3"], color: COLORS.green },
    // `supporting` (§2): out of the default draw and the C4 pill; reached only
    // by a skill focus or a parent Lock Group. Free, ungated.
    { id: "facts", label: "Facts Warm-Up", skills: ["F1", "F2"], color: COLORS.yellow, supporting: true },
  ],

  // TEST-DRIVE VALUE: every built group is free while the native purchase
  // provider is still a stub (Place Value precedent, §14). The LAUNCH value
  // is ["colAdd", "facts"] per §14 — move colSub, mental and words out when
  // pricing is wired.
  freeContent: ["colAdd", "colSub", "mental", "words", "facts"],

  skillLabels: {
    A1: "Add to 1,000",
    A2: "Add to 10,000",
    A3: "Lots of regrouping",
    S1: "Take away to 1,000",
    S2: "Take away to 10,000",
    S3: "Across zeros",
    M1: "Add in your head",
    M2: "Subtract in your head",
    M3: "Round and fix",
    W1: "Part and whole",
    W2: "More or fewer",
    W3: "Two steps",
    F1: "Make a ten",
    F2: "Break a ten",
  },

  pool: ADD_POOL,

  // Documentation-only (never read programmatically — the practice screen
  // branches on item.skill / answerType directly, as in the sibling modules).
  scaffoldMap: {
    A1: "PlaceValueChart + ColumnGrid", A2: "PlaceValueChart + ColumnGrid", A3: "PlaceValueChart + ColumnGrid",
    S1: "PlaceValueChart + ColumnGrid", S2: "PlaceValueChart + ColumnGrid", S3: "PlaceValueChart + ColumnGrid",
    M1: "OpenNumberLine", M2: "OpenNumberLine", M3: "OpenNumberLine",
    W1: "PartWholeBar", W2: "ComparisonBar", W3: "PartWholeBar / ComparisonBar (stacked, compact)",
    F1: "PlaceValueChart (2 columns)", F2: "PlaceValueChart (2 columns)",
  },

  defaultMode: "pictorial",
  // §4.6: the disc trade is the lesson Jack's class is starting, so the column
  // groups and facts open in Concrete; mental and words open in Pictorial.
  defaultModeByGroup: { colAdd: "concrete", colSub: "concrete", mental: "pictorial", words: "pictorial", facts: "concrete" },

  achievements: [
    { id: "add-carry-captain", name: "Regroup Captain", description: "Mastered every Column Adding item", trigger: "masterAddGroup", params: { group: "colAdd" } },
    { id: "add-take-away-pro", name: "Take-Away Pro", description: "Mastered every Column Subtracting item", trigger: "masterAddGroup", params: { group: "colSub" } },
    { id: "add-head-for-numbers", name: "Head for Numbers", description: "Mastered every Mental Math item", trigger: "masterAddGroup", params: { group: "mental" } },
    { id: "add-bar-builder", name: "Bar Model Builder", description: "Mastered every Word Problems item", trigger: "masterAddGroup", params: { group: "words" } },
    { id: "add-ten-maker", name: "Ten Maker", description: "Mastered every Facts Warm-Up item", trigger: "masterAddGroup", params: { group: "facts" } },
    { id: "add-master", name: "Add & Subtract Master", description: "Mastered every Column, Mental and Word Problems item", trigger: "addMaster", params: {} },
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
  const expectedSize = { A1: 16, A2: 20, A3: 20, S1: 16, S2: 20, S3: 20, M1: 20, M2: 20, M3: 16, W1: 20, W2: 20, W3: 16, F1: 20, F2: 36 };
  Object.entries(expectedSize).forEach(([sk, n]) => { if (size(sk) !== n) fail(`${sk} has ${size(sk)} items, expected ${n}`); });
  [["colAdd", 56], ["colSub", 56], ["mental", 56], ["words", 56], ["facts", 56]].forEach(([g, n]) => {
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

    // Needed-regroup rule (subRegroupCheck): a child solving right to left —
    // regrouping from the nearest column with discs only when a column is
    // short — must never be refused, and must end on the answer.
    if (i.op === "-") {
      const B = digitArr(i.b, i.columns);
      let cs = initDiscState(i);
      if (tradeableFor(i, cs).flags.some(Boolean)) fail(`${i.itemKey}: a Regroup button shows before any take was tried`);
      for (let p = i.columns - 1; p >= 0; p--) {
        for (let round = 0; round < 4 && uncrossed(cs, p) < B[p]; round++) {
          cs = takeSub(cs, p, B[p]).state; // the child tries the take first and comes up short
          let L = -1;
          for (let k = p - 1; k >= 0; k--) { if (uncrossed(cs, k) >= 1) { L = k; break; } }
          if (L < 0) { fail(`${i.itemKey}: no lender for column ${p}`); break; }
          for (let m = L; m < p; m++) {
            if (!chartRegroupCheck(i, cs, m).ok) fail(`${i.itemKey}: needed regroup refused at column ${m}`);
            if (!tradeableFor(i, cs).flags[m]) fail(`${i.itemKey}: no Regroup button on column ${m} after a short take`);
            cs = tradeSub(cs, m);
          }
        }
        if (B[p] > 0) cs = takeSub(cs, p, B[p]).state;
      }
      const left = cs.counts.map((c, j) => c - cs.taken[j]);
      if (Number(left.join("")) !== i.correctAnswer) fail(`${i.itemKey}: regroup-rule solve ends on ${left.join(",")}`);
    }

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


  // ---- Mental (§6.2, §7): keys, answers, crossing claims, number-line split.
  const mentalItems = ADD_POOL.filter((i) => i.group === "mental");
  mentalItems.forEach((i) => {
    const want = i.op === "+" ? i.a + i.b : i.a - i.b;
    if (i.correctAnswer !== want) fail(`${i.itemKey}: arithmetic ${want} != ${i.correctAnswer}`);
    if (i.itemKey !== `add:ment:${i.a}${i.op}${i.b}`) fail(`${i.itemKey}: key form`);
    if (i.a < 10 || i.a > 99 || i.b < 10 || i.b > 99) fail(`${i.itemKey}: operands must be 2-digit`);
    if (i.correctAnswer < 0 || (i.skill === "M2" && i.correctAnswer < 1)) fail(`${i.itemKey}: bad result`);
    const oa = i.a % 10;
    const ob = i.b % 10;
    if (i.skill === "M1") {
      const crosses = oa + ob >= 10;
      if (i.op !== "+") fail(`${i.itemKey}: M1 must add`);
      if (i.pattern.startsWith("crossing") !== crosses) fail(`${i.itemKey}: M1 "${i.pattern}" but ones sum ${oa + ob}`);
      if (i.pattern.endsWith("passes 100") !== (i.a + i.b >= 100)) fail(`${i.itemKey}: M1 passes-100 claim`);
      if (i.crossing !== crosses) fail(`${i.itemKey}: crossing flag`);
      if (diagnoseSingle(i, i.correctAnswer - 10) !== (crosses ? "dropTen" : null)) fail(`${i.itemKey}: dropTen applicability`);
    }
    if (i.skill === "M2") {
      const regroups = oa < ob;
      if (i.op !== "-") fail(`${i.itemKey}: M2 must subtract`);
      if ((i.pattern === "crossing") !== regroups) fail(`${i.itemKey}: M2 "${i.pattern}" but ones ${oa} take ${ob}`);
      if (i.crossing !== regroups) fail(`${i.itemKey}: crossing flag`);
      if (regroups && bugMentalSmallerFromLarger(i.a, i.b) === i.correctAnswer) fail(`${i.itemKey}: M2 bug equals the answer`);
    }
    if (i.skill === "M3") {
      if (ob === 0) fail(`${i.itemKey}: M3 second number is already a multiple of 10`);
      const plan = mentalPlan(i);
      if (plan.rounded % 10 !== 0 || plan.rounded < i.b || plan.rounded - i.b >= 10) fail(`${i.itemKey}: M3 rounds ${i.b} to ${plan.rounded}`);
      if (bugM3WrongWay(i) === i.correctAnswer) fail(`${i.itemKey}: wrongWay equals the answer`);
    }
    const plan = mentalPlan(i);
    if (plan.jumps.length !== 2) fail(`${i.itemKey}: expected 2 jumps`);
    if (i.a + plan.jumps[0].delta !== plan.mid) fail(`${i.itemKey}: first landing`);
    if (i.a + plan.jumps[0].delta + plan.jumps[1].delta !== i.correctAnswer) fail(`${i.itemKey}: jumps do not land on the answer`);
    if (plan.jumps.some((j) => /[a-z]/i.test(j.label))) fail(`${i.itemKey}: jump label`);
    [i.correctAnswer + 1, i.correctAnswer - 10, bugMentalSmallerFromLarger(i.a, i.b), i.skill === "M3" ? bugM3WrongWay(i) : 0].forEach((probe) => {
      const line = buildAddLine(i, "blank", probe);
      if (!line || line[line.length - 1].t !== "token") fail(`${i.itemKey}: mental line (entered ${probe})`);
      if (line.some((seg) => seg.t === "text" && /\b(you(?! know)|wrong|forgot|trade|borrow|carry)\b/i.test(seg.v))) fail(`${i.itemKey}: line vocabulary`);
    });
  });
  must("dropTen 47+38", diagnoseSingle(ADD_POOL.find((i) => i.itemKey === "add:ment:47+38"), 75), "dropTen");
  must("sFL 72-38", bugMentalSmallerFromLarger(72, 38), 46);
  must("wrongWay 46+29", bugM3WrongWay(ADD_POOL.find((i) => i.itemKey === "add:ment:46+29")), 77);
  must("wrongWay 72-19", bugM3WrongWay(ADD_POOL.find((i) => i.itemKey === "add:ment:72-19")), 51);

  // ---- Words (§6.3, §7): every step's arithmetic, ≤1 regroup per operation,
  // every value 0–9,999, unique keys, answer ≠ otherOp, W3 answer ≠ step 1.
  const wordItems = ADD_POOL.filter((i) => i.group === "words");
  const regroupEvents = (op, a, b) => {
    // How many columns need a regroup: addition = columns that carry out; subtraction =
    // columns whose (current) top digit is smaller than the bottom digit.
    if (op === "+") return addStandard(a, b, 4).carryOut.reduce((n, c) => n + c, 0);
    const A = digitArr(a, 4);
    const B = digitArr(b, 4);
    let n = 0;
    for (let g = 3; g >= 0; g--) {
      if (A[g] < B[g]) {
        n++;
        let j = g - 1;
        while (j >= 0 && A[j] === 0) { A[j] = 9; j--; }
        if (j >= 0) A[j] -= 1;
        A[g] += 10;
      }
    }
    return n;
  };
  const wordKinds = {};
  wordItems.forEach((i) => {
    wordKinds[i.kind] = (wordKinds[i.kind] || 0) + 1;
    const stepsOk = i.steps.length === (i.skill === "W3" ? 2 : 1);
    if (!stepsOk) fail(`${i.itemKey}: step count`);
    const inRange = (n) => Number.isInteger(n) && n >= 0 && n <= 9999;
    i.steps.forEach((st, k) => {
      if (opResult(st.op, st.a, st.b) !== st.result) fail(`${i.itemKey}: step ${k + 1} arithmetic ${st.a} ${st.op} ${st.b} != ${st.result}`);
      [st.a, st.b, st.result].forEach((n) => { if (!inRange(n)) fail(`${i.itemKey}: step ${k + 1} value ${n} out of 0–9,999`); });
      if (regroupEvents(st.op, st.a, st.b) > 1) fail(`${i.itemKey}: step ${k + 1} needs more than one regroup`);
      // The model: exactly one unknown; the carried value (W3 step 2) matches step 1's result.
      const sp = st.spec;
      if (!sp.unknown) fail(`${i.itemKey}: step ${k + 1} model has no unknown`);
      if (k === 0 && sp.carry) fail(`${i.itemKey}: step 1 carries a value`);
      if (k === 1 && !sp.carry) fail(`${i.itemKey}: step 2 has no carried cell`);
      const cellVal = (cell) => (sp.model === "partWhole" ? (cell === "whole" ? sp.whole : sp[cell].value) : (cell === "diff" ? sp.diff : sp[cell].value));
      // Every known cell must be consistent with the step's operands: the given cells are
      // the step's a and b, in some order, and the unknown cell is the result.
      const given = [];
      const cells = sp.model === "partWhole" ? ["whole", "partA", "partB"] : ["base", "bigger", "diff"];
      cells.forEach((c) => { const v = cellVal(c); if (c !== sp.unknown) given.push(v === "step1" ? i.steps[0].result : v); });
      if (given.slice().sort((x, y) => x - y).join() !== [st.a, st.b].sort((x, y) => x - y).join()) fail(`${i.itemKey}: step ${k + 1} model cells ${given} != operands ${st.a},${st.b}`);
      if (sp.model === "partWhole") {
        const wholeV = sp.unknown === "whole" ? st.result : (sp.whole === "step1" ? i.steps[0].result : sp.whole);
        const pa = sp.unknown === "partA" ? st.result : (sp.partA.value === "step1" ? i.steps[0].result : sp.partA.value);
        const pb = sp.unknown === "partB" ? st.result : (sp.partB.value === "step1" ? i.steps[0].result : sp.partB.value);
        if (pa + pb !== wholeV) fail(`${i.itemKey}: step ${k + 1} parts ${pa}+${pb} != whole ${wholeV}`);
      } else {
        const res = (c) => (sp.unknown === c ? st.result : (cellVal(c) === "step1" ? i.steps[0].result : cellVal(c)));
        if (res("base") + res("diff") !== res("bigger")) fail(`${i.itemKey}: step ${k + 1} comparison ${res("base")}+${res("diff")} != ${res("bigger")}`);
      }
    });
    if (i.steps[i.steps.length - 1].result !== i.correctAnswer) fail(`${i.itemKey}: last step ${i.steps[i.steps.length - 1].result} != answer ${i.correctAnswer}`);
    if (typeof i.correctAnswer !== "number") fail(`${i.itemKey}: answer not a Number`);
    if (!i.story || !i.question) fail(`${i.itemKey}: missing story/question`);
    [i.story, i.question].forEach((t) => t.split(/(?<=[.?!])\s+/).forEach((sent) => {
      if (sent.trim().split(/\s+/).length > 12) fail(`${i.itemKey}: sentence over 12 words: "${sent}"`);
    }));
    if (/\b(trade|borrow|carry)\b/i.test(`${i.story} ${i.question}`)) fail(`${i.itemKey}: vocabulary`);
    // model ↔ kind
    const wantPick = SINGLE_KIND_MODEL[i.kind];
    if (i.skill !== "W3" && i.model !== wantPick) fail(`${i.itemKey}: model ${i.model} vs kind ${i.kind}`);
    if (i.skill === "W3" && i.model !== "two") fail(`${i.itemKey}: W3 model should be "two"`);
    if (i.pickModel !== i.steps[0].spec.model) fail(`${i.itemKey}: pickModel`);
    // trap flag, key form and the bugs
    if ((i.kind === "trap") !== i.trap) fail(`${i.itemKey}: trap flag`);
    if (i.trap && !i.itemKey.startsWith("add:wp:less:")) fail(`${i.itemKey}: trap key must be add:wp:less:`);
    const other = wordOtherOp(i);
    if (i.skill !== "W3" && other !== null && other === i.correctAnswer) fail(`${i.itemKey}: otherOp equals the answer`);
    if (i.skill === "W3" && i.steps[0].result === i.correctAnswer) fail(`${i.itemKey}: W3 answer equals step 1`);
    // kind ↔ skill
    const kindOk = { W1: ["whole", "part", "left"], W2: ["more", "less", "trap", "diff-more", "diff-fewer"], W3: ["two-change", "two-compare-whole", "two-whole-compare"] };
    if (!kindOk[i.skill].includes(i.kind)) fail(`${i.itemKey}: kind ${i.kind} not allowed in ${i.skill}`);
    if (i.kind === "whole" && i.steps[0].op !== "+") fail(`${i.itemKey}: find-whole must add`);
    if (i.skill === "W3") {
      const [t1, t2] = i.steps;
      if (!(t2.a === t1.result || t2.b === t1.result)) fail(`${i.itemKey}: step 2 does not use step 1's result`);
      if (i.kind === "two-compare-whole" && t2.spec.model !== "partWhole") fail(`${i.itemKey}: compare-whole step 2 should be part-whole`);
      if (i.kind === "two-whole-compare" && (t1.spec.model !== "partWhole" || t2.spec.model !== "comparison")) fail(`${i.itemKey}: whole-compare models`);
    }
    // every line builds, ends in the token, and never uses the banned vocabulary
    [i.correctAnswer + 1, i.skill === "W3" ? i.steps[0].result : (other ?? 0), 0].forEach((probe) => {
      const line = buildAddLine(i, "blank", probe);
      if (!line || line[line.length - 1].t !== "token") fail(`${i.itemKey}: word line (entered ${probe})`);
      if (line.some((seg) => seg.t === "text" && /\b(you(?! know)|wrong|forgot|trade|borrow|carry)\b/i.test(seg.v))) fail(`${i.itemKey}: line vocabulary`);
    });
    if (i.skill !== "W3" && other !== null && diagnoseSingle(i, other) !== "otherOp") fail(`${i.itemKey}: otherOp not diagnosed`);
    if (i.skill === "W3" && diagnoseSingle(i, i.steps[0].result) !== "stepOneOnly") fail(`${i.itemKey}: stepOneOnly not diagnosed`);
  });
  const trapCount = wordItems.filter((i) => i.trap).length;
  if (trapCount !== 4) fail(`expected 4 trap items, found ${trapCount}`);
  if (wordItems.length !== 56) fail(`words has ${wordItems.length} items, expected 56`);
  const wantKinds = { whole: 10, part: 6, left: 4, more: 7, less: 3, trap: 4, "diff-more": 4, "diff-fewer": 2, "two-change": 6, "two-compare-whole": 6, "two-whole-compare": 4 };
  // W1 spec: 10 find-whole, 10 find-part (4 "left"); W2: 7 bigger, 3 smaller, 4 traps, 6 difference; W3: 6/6/4.
  Object.entries(wantKinds).forEach(([k, n]) => {
    const got = wordKinds[k] || 0;
    if (k === "part" || k === "left") return; // checked together below
    if (got !== n && !(k === "diff-more" || k === "diff-fewer")) fail(`kind ${k}: ${got} items, expected ${n}`);
  });
  if ((wordKinds.part || 0) + (wordKinds.left || 0) !== 10) fail("W1 find-part items != 10");
  if ((wordKinds.left || 0) !== 4) fail(`W1 "left" items ${wordKinds.left || 0} != 4`);
  if ((wordKinds["diff-more"] || 0) !== 4 || (wordKinds["diff-fewer"] || 0) !== 2) fail("W2 difference split != 4 more / 2 fewer");
  // Stories are transcribed exactly once per key.
  if (new Set(WORD_PROBLEMS.map((w) => w.key)).size !== WORD_PROBLEMS.length) fail("WORD_PROBLEMS has duplicate keys");
  ["add:wp:whole:2456+1378", "add:wp:part:3000-1265"].forEach((k) => { if (keys.has(k)) fail(`${k} must not be in the pool (breaks the 1-regroup rule)`); });
  let wordLineMax = 0;
  wordItems.forEach((i) => {
    const line = buildAddLine(i, "numeral", null);
    wordLineMax = Math.max(wordLineMax, line.reduce((n, seg) => n + (seg.t === "text" ? seg.v.length : String(seg.value).length), 0));
  });
  console.debug(`[add self-check] longest word derivation line: ${wordLineMax} characters`);

  if (problems.length) {
    console.error(`[add self-check] ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  } else {
    console.debug(`[add self-check] OK — ${ADD_POOL.length} items (colAdd 56 · colSub 56 · mental 56 · words 56 · facts 56)`);
  }
  console.debug("[add self-check] bug outputs per column item", bugRows);
}

if (import.meta.env.DEV) {
  try { runAddSelfCheck(); } catch (e) { console.error("[add self-check] threw", e); }
}
