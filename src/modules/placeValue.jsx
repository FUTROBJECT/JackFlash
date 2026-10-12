import { COLORS } from "../constants.js";

// ---------------------------------------------------------------------------
// Place Value module — all four groups: B "Build & Read" + V "Digit Values"
// (pass 1) and X "Expanded Form" + C "Compare, Order & Patterns" (pass 2,
// this file), per docs/place-value-spec.md.
//
// Same machinery as multiply/fractions: a finite, curated, deterministic
// item pool built once from literal arrays (no Math.random() anywhere in
// pool generation — itemKeys are persisted mastery units and must be
// byte-identical on every load). Place codes: k thousands, h hundreds,
// t tens, o ones (docs/place-value-spec.md §2).
// ---------------------------------------------------------------------------

export const PLACE_CODES = ["k", "h", "t", "o"];
export const PLACE_LABELS = { k: "Thousands", h: "Hundreds", t: "Tens", o: "Ones" };
export const PLACE_VALUES = { k: 1000, h: 100, t: 10, o: 1 };
// Ordinal position counted from the RIGHT (ones = 1st) — used by the V1/V3
// derivation lines ("Hundreds is the 3rd column from the right…").
export const ORDINAL_FROM_RIGHT = { o: "1st", t: "2nd", h: "3rd", k: "4th" };

// ---------------------------------------------------------------------------
// Pure helpers (§8.4/§8.5): numberToWords, formatNumber, digitsOf.
// itemKeys and correctAnswers always use unformatted numerals (§4) — only
// display-facing strings ever go through formatNumber/numberToWords.
// ---------------------------------------------------------------------------

const ONES_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS_WORDS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function twoDigitWords(v) {
  // v is 0..99. Hyphenated compound tens-ones, no "and" (US classroom
  // convention, Adam 2026-09-18).
  if (v === 0) return "";
  if (v < 20) return ONES_WORDS[v];
  const t = Math.floor(v / 10), o = v % 10;
  return o === 0 ? TENS_WORDS[t] : `${TENS_WORDS[t]}-${ONES_WORDS[o]}`;
}

// US convention, no "and", no commas in words; "ten thousand" for the one
// P3-ceiling item (never decomposed via digitsOf — 10,000 doesn't fit k/h/t/o).
export function numberToWords(n) {
  if (n === 0) return "zero";
  if (n === 10000) return "ten thousand";
  const th = Math.floor(n / 1000);
  const rem = n % 1000;
  const h = Math.floor(rem / 100);
  const rest = rem % 100;
  const parts = [];
  if (th > 0) parts.push(`${ONES_WORDS[th]} thousand`);
  if (h > 0) parts.push(`${ONES_WORDS[h]} hundred`);
  const restWords = twoDigitWords(rest);
  if (restWords) parts.push(restWords);
  return parts.join(" ");
}

// Thousands comma, display only (§8.4) — never in itemKeys, correctAnswer, or inputs.
export function formatNumber(n) {
  const s = String(Math.trunc(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// {k,h,t,o} digit decomposition for 0-9999 (never called on 10000 — that
// item is handled as a literal word/no-chart special case throughout).
export function digitsOf(n) {
  const s = String(n).padStart(4, "0");
  return { k: +s[0], h: +s[1], t: +s[2], o: +s[3] };
}

function hasZeroDigit(n) {
  return String(n).includes("0");
}

// P3 ceiling special case (§2.6): 10,000 is never decomposed via digitsOf
// and never drawn on the disc chart — X/C group renderers must check this
// before building a chart/mini-chart for a term and fall back to a plain
// numeral chip instead (mirrors B3's existing `noChart` treatment).
export function isTenThousand(n) {
  return n === 10000;
}

// C1/C2/C3 need every term/side rendered as an ALWAYS-4-column disc count
// (a 3-digit number's thousands column drawn empty via emptyMarker) so two
// or three charts of different true digit-counts still align column-for-
// column at the same width (§3 "columns aligned, same column width").
// Never called on 10,000 (isTenThousand guards every call site).
export function alwaysFourCounts(n) {
  const d = digitsOf(n);
  return [d.k, d.h, d.t, d.o];
}

// ---------------------------------------------------------------------------
// Distractor builders (§4 misconception table) — deterministic, bounded,
// no Math.random(). Every choice4 set is built once per item at pool-build
// time; useShuffledChoices (place-value-practice.jsx) shuffles POSITIONS
// once per item visit, never regenerates the set.
// ---------------------------------------------------------------------------

// B3 (numeral → word): zero-as-nothing (collapse), small-number trap
// (zero-place spoken as a small number), word-order swap, tens/ones
// transposition, then small numeric jitters as a deterministic fallback.
function buildWordDistractors(value, digits, columns) {
  const correctWords = numberToWords(value);
  const raw = [];
  if (hasZeroDigit(value)) {
    const collapsed = parseInt(String(value).replace(/0/g, ""), 10);
    if (collapsed > 0) raw.push(collapsed);
  }
  if (columns === 4 && digits.h === 0) {
    raw.push(digits.k * 1000 + digits.t * 100 + digits.o * 10);
  }
  if (columns === 4 && digits.h > 0 && digits.k !== digits.h) {
    raw.push(digits.h * 1000 + digits.k * 100 + digits.t * 10 + digits.o);
  }
  if (digits.t !== digits.o) {
    raw.push((columns === 4 ? digits.k * 1000 : 0) + digits.h * 100 + digits.o * 10 + digits.t);
  }
  [11, -11, 101, -101, 2, -2, 5, -5].forEach((delta) => raw.push(value + delta));

  const out = [];
  const seenWords = new Set([correctWords]);
  for (const cand of raw) {
    if (cand <= 0 || cand > 9999 || cand === value) continue;
    const words = numberToWords(cand);
    if (seenWords.has(words)) continue;
    seenWords.add(words);
    out.push(words);
    if (out.length === 3) break;
  }
  return out;
}

// V1 (which digit): the misconception IS reading the wrong column — the
// other three digits of the same number are the distractors (a wrong pick
// there is exactly "off-by-one place" or "read right-to-left"). Bounded
// fallback loop pads if the number's own digits repeat.
function buildDigitDistractors(correctDigit, digits, columns) {
  const codes = columns === 4 ? PLACE_CODES : ["h", "t", "o"];
  const out = [];
  const seen = new Set([correctDigit]);
  for (const c of codes) {
    const d = digits[c];
    if (seen.has(d)) continue;
    seen.add(d);
    out.push(d);
    if (out.length === 3) break;
  }
  for (let filler = 1; out.length < 3 && filler <= 10; filler++) {
    const cand = (correctDigit + filler) % 10;
    if (!seen.has(cand)) { seen.add(cand); out.push(cand); }
  }
  return out;
}

// V2 (what is it worth): face value (digit alone, no place multiplier — the
// headline P3 misconception) and off-by-one-place (×10 too big / too small),
// then a bounded numeric-jitter fallback for places where those collide.
function buildValueDistractors(correctValue, digit, placeValue) {
  const raw = [digit, digit * placeValue * 10];
  if (placeValue > 1 && Number.isInteger((digit * placeValue) / 10)) {
    raw.push((digit * placeValue) / 10);
  }
  const out = [];
  const seen = new Set([correctValue]);
  for (const v of raw) {
    if (seen.has(v) || v < 0) continue;
    seen.add(v);
    out.push(v);
    if (out.length === 3) break;
  }
  for (let delta = 1; out.length < 3 && delta <= 200; delta += 10) {
    for (const v of [correctValue + delta, correctValue - delta]) {
      if (out.length < 3 && v >= 0 && !seen.has(v)) { seen.add(v); out.push(v); }
    }
  }
  return out;
}

// V3 (which place): the other three place names — always exactly 3, no
// padding ever needed (4 place codes, one is correct).
function buildPlaceNameDistractors(correctPlaceCode) {
  return PLACE_CODES.filter((c) => c !== correctPlaceCode).map((c) => PLACE_LABELS[c].toLowerCase());
}

// X3 (pick the expansion): renders a full 4-term expansion string, comma-
// formatted, ALWAYS including a zero term when the source has a zero place
// (§4/§6 — the whole point of the skill is that the zero placeholder is not
// optional). `terms` is [k,h,t,o] already multiplied by place value.
function expansionString(terms) {
  return terms.map((t) => formatNumber(t)).join(" + ");
}

// Distractors: zero collapse (omit the zero term — "complete" but hides the
// placeholder), digit-sum (raw digits, no place value, no commas),
// off-by-one-place (a term borrows the neighbouring place's weight),
// transposed (two terms' values swapped between columns). Bounded fallback
// (a small deterministic jitter) pads the rare case where two builders
// collide — never an unbounded loop.
function buildExpansionDistractors(value, digits) {
  const terms = PLACE_CODES.map((p) => digits[p] * PLACE_VALUES[p]);
  const correct = expansionString(terms);
  const raw = [];

  if (hasZeroDigit(value)) {
    const collapsed = terms.filter((t) => t !== 0);
    if (collapsed.length < terms.length) raw.push(expansionString(collapsed));
  }

  raw.push(PLACE_CODES.map((p) => digits[p]).join(" + "));

  if (digits.o > 0) {
    const shifted = [...terms];
    shifted[3] = digits.o * PLACE_VALUES.t; // ones digit misread at tens weight
    raw.push(expansionString(shifted));
  } else if (digits.t > 0) {
    const shifted = [...terms];
    shifted[2] = digits.t * PLACE_VALUES.o; // fallback: tens digit misread at ones weight
    raw.push(expansionString(shifted));
  }

  if (digits.h !== digits.t) {
    const swapped = [...terms];
    swapped[1] = digits.t * PLACE_VALUES.h;
    swapped[2] = digits.h * PLACE_VALUES.t;
    raw.push(expansionString(swapped));
  }

  const out = [];
  const seen = new Set([correct]);
  for (const cand of raw) {
    if (seen.has(cand)) continue;
    seen.add(cand);
    out.push(cand);
    if (out.length === 3) break;
  }
  for (let filler = 1; out.length < 3 && filler <= 9; filler++) {
    const jittered = [...terms];
    jittered[3] = ((digits.o + filler) % 10) * PLACE_VALUES.o;
    const cand = expansionString(jittered);
    if (!seen.has(cand)) { seen.add(cand); out.push(cand); }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Curated source numbers (§4). Literal, deterministic, in the difficulty
// order the weighted draw's "new" category trickles through (3-digit before
// 4-digit; no-zero before one-zero before two-zero).
// ---------------------------------------------------------------------------

// B1/B2 pool: 8 three-digit (2 with a zero place) + 16 four-digit (5 with
// one zero, 2 with two zeros) = 24. B2 is the same 24 numbers (inverse pair).
const B_NUMBERS = [
  // 3-digit: 6 no-zero, then 2 with a zero place.
  149, 253, 362, 526, 617, 784, 308, 470,
  // 4-digit: 9 no-zero, then 5 one-zero, then 2 two-zero.
  1234, 1352, 2168, 2431, 3452, 4567, 5183, 6294, 7825,
  1029, 2380, 4056, 5709, 6480,
  3500, 4008,
];

// B3 (numeral → word): 16 four-digit — 8 no-zero, 3 with a zero place,
// 4 "…thousand twelve"-type traps (hundreds digit 0), 1 = 10,000.
const B3_NO_ZERO = [1234, 2465, 3452, 4173, 5296, 6381, 7524, 8697];
const B3_ZERO_PLACE = [2504, 7180, 5320];
const B3_TRAPS = [4012, 6035, 8009, 3091];
const B3_TEN_THOUSAND = 10000;

// B4 (word → numeral): 16 four-digit — 8 no-zero, 4 with a zero place,
// 4 of the same trap shape (different numbers from B3's).
const B4_NO_ZERO = [1246, 2357, 3468, 4579, 5681, 6792, 7813, 8924];
const B4_ZERO_PLACE = [6205, 3670, 8340, 4508];
const B4_TRAPS = [5027, 7048, 9006, 2091];

// V1 (which digit): 5 numbers (3 no-zero, 2 with a zero) × 4 places = 20.
const V1_NUMBERS = [3452, 5164, 6273, 4056, 7809];
// V2 (what is it worth): 6 numbers, all digits distinct & non-zero, × 4 places = 24.
const V2_NUMBERS = [3452, 1936, 2748, 5183, 6297, 8354];
// V3 (which place): 4 numbers, all digits distinct & non-zero, × 4 places = 16.
const V3_NUMBERS = [4127, 5936, 7283, 9614];

// ---------------------------------------------------------------------------
// Group X (Expanded Form) source data — pass 2.
// ---------------------------------------------------------------------------

// X1 (decompose with a blank): 6 four-digit sources (4 no-zero, 2 one-zero)
// × 4 blank positions = 24.
const X1_NUMBERS = [2143, 3452, 5267, 6381, 4056, 7208];

// X2 (compose): 24 addend sets — 14 no-zero, 10 with exactly one zero place
// (the addend list omits that place, e.g. 5,000 + 70 + 3), spread across
// hundreds/tens/ones so no one column dominates the "omitted place" trap.
const X2_NO_ZERO = [1234, 2143, 3251, 4362, 5473, 6584, 7695, 8716, 9127, 1352, 2461, 3572, 4683, 5794];
const X2_ZERO_PLACE = [5073, 3082, 7061, 4207, 6109, 2805, 3450, 6280, 9170, 5340];

// X3 (pick the expanded form): 16 four-digit sources — 11 no-zero, 5 with a
// zero place. Every source keeps digits.h !== digits.t so the "transposed"
// distractor is always distinct from the correct answer.
const X3_NO_ZERO = [1234, 2145, 3256, 4367, 5478, 6589, 7691, 8712, 9123, 1352, 2463];
const X3_ZERO_PLACE = [3052, 4906, 6017, 2380, 7204];

// ---------------------------------------------------------------------------
// Group C (Compare, Order & Patterns) source data — pass 2.
// ---------------------------------------------------------------------------

// C1 (compare two): 28 curated pairs, always { a, b } with a < b (the key's
// ascending order). `direction` is the question asked ("gt" = "Which is
// greater?", "lt" = "Which is smaller?" — 20 gt / 8 lt); `leftIsA` is the
// FIXED (not random) on-screen left/right presentation. Categories, in the
// §4 difficulty order (thousands differences before hundreds before
// tens/ones, then the two heuristic-defeating categories): 8 differ at
// thousands, 8 at hundreds, 6 at tens/ones, 4 unequal digit counts (3- vs
// 4-digit — defeats "longer numeral = bigger"), 2 zero-placeholder pairs.
// The 8th thousands-difference pair is the module's one curated 10,000
// comparison (§2.6 — 10,000 appears in exactly 3 items module-wide).
const C1_PAIRS = [
  // Thousands differ (8) — 6 gt / 2 lt.
  { a: 1234, b: 2678, direction: "gt", leftIsA: true },
  { a: 1523, b: 3841, direction: "gt", leftIsA: false },
  { a: 2467, b: 4193, direction: "gt", leftIsA: true },
  { a: 2984, b: 6127, direction: "lt", leftIsA: false },
  { a: 3298, b: 7451, direction: "gt", leftIsA: true },
  { a: 4127, b: 8563, direction: "gt", leftIsA: false },
  { a: 2651, b: 5237, direction: "lt", leftIsA: true },
  { a: 9184, b: 10000, direction: "gt", leftIsA: false },
  // Hundreds differ, same thousands (8) — 6 gt / 2 lt.
  { a: 3245, b: 3762, direction: "gt", leftIsA: true },
  { a: 4123, b: 4589, direction: "gt", leftIsA: false },
  { a: 5234, b: 5671, direction: "lt", leftIsA: true },
  { a: 6142, b: 6398, direction: "gt", leftIsA: false },
  { a: 7215, b: 7943, direction: "gt", leftIsA: true },
  { a: 8123, b: 8467, direction: "lt", leftIsA: false },
  { a: 2314, b: 2756, direction: "gt", leftIsA: true },
  { a: 9134, b: 9582, direction: "gt", leftIsA: false },
  // Tens/ones differ, same thousands+hundreds (6) — 4 gt / 2 lt.
  { a: 3452, b: 3468, direction: "gt", leftIsA: true },
  { a: 4127, b: 4132, direction: "gt", leftIsA: false },
  { a: 5234, b: 5239, direction: "lt", leftIsA: true },
  { a: 6183, b: 6187, direction: "gt", leftIsA: false },
  { a: 7215, b: 7219, direction: "lt", leftIsA: true },
  { a: 8342, b: 8349, direction: "gt", leftIsA: false },
  // Unequal digit counts, 3- vs 4-digit (4) — 3 gt / 1 lt.
  { a: 987, b: 1002, direction: "gt", leftIsA: true },
  { a: 895, b: 1140, direction: "gt", leftIsA: false },
  { a: 762, b: 1005, direction: "lt", leftIsA: true },
  { a: 999, b: 1000, direction: "gt", leftIsA: false },
  // Zero-placeholder pairs (2) — 1 gt / 1 lt.
  { a: 3052, b: 3520, direction: "gt", leftIsA: true },
  { a: 4008, b: 4080, direction: "lt", leftIsA: false },
];

// C2 (order three): 18 curated ascending triples, in the §4 difficulty
// order — 6 "plain" triples (differ at thousands, easiest), 6 sharing their
// thousands digit, 4 sharing thousands + hundreds, 2 mixing a 3-digit and a
// 4-digit number (the digit-count heuristic trap). `tileOrder` is a FIXED
// (not random) permutation of the ascending triple's indices [0,1,2] —
// deterministic from the pool index, never the identity (so the on-screen
// order never happens to already read smallest→greatest).
const C2_TRIPLES = [
  // Plain — thousands differ (6).
  [1234, 3452, 6789],
  [1523, 4762, 8391],
  [2145, 5238, 7461],
  [1867, 3924, 5610],
  [2378, 4816, 9053],
  [1496, 3627, 8214],
  // Share thousands digit (6).
  [3124, 3456, 3789],
  [4213, 4567, 4890],
  [5142, 5634, 5921],
  [6231, 6478, 6805],
  [7156, 7423, 7968],
  [8127, 8459, 8734],
  // Share thousands + hundreds (4).
  [3421, 3456, 3489],
  [4512, 4534, 4578],
  [5623, 5645, 5689],
  [6734, 6756, 6789],
  // Mix 3-digit and 4-digit (2).
  [845, 1023, 1267],
  [456, 892, 1345],
];
// Non-identity permutations of [0,1,2] the tiles rotate through — cycled by
// pool index (`% 5`), never showing the triple already sorted left→right.
const C2_TILE_PERMS = [[1, 2, 0], [2, 0, 1], [0, 2, 1], [2, 1, 0], [1, 0, 2]];

// C3 (number patterns): 32 curated sequences of 5 terms, grouped in the §4
// difficulty order (±1000 and ±10 before ±100 before ±1). Each entry is
// { start, step, blankIdx }; blankIdx defaults to 4 (the end — "what comes
// next") except the 6 curated `blankIdx` in {1,2,3} ("middle blank", §4).
// `boundary: true` (informational only, checked in the build report) marks
// the 10 sequences that cross a place-value threshold (2,990→3,000 etc).
// One curated entry (step=100 group) ends on 10,000 — the module's one
// curated pattern-endpoint use of the P3 ceiling (§2.6).
const C3_STEP_1000 = [
  { start: 1234, step: 1000, blankIdx: 4, boundary: false },
  { start: 2500, step: 1000, blankIdx: 4, boundary: false },
  { start: 1000, step: 1000, blankIdx: 4, boundary: false },
  { start: 500, step: 1000, blankIdx: 4, boundary: true },
  { start: 9234, step: -1000, blankIdx: 4, boundary: false },
  { start: 7654, step: -1000, blankIdx: 4, boundary: false },
  { start: 8500, step: -1000, blankIdx: 4, boundary: false },
  { start: 5210, step: -1000, blankIdx: 1, boundary: false },
];
const C3_STEP_10 = [
  { start: 2340, step: 10, blankIdx: 4, boundary: false },
  { start: 2980, step: 10, blankIdx: 4, boundary: true },
  { start: 1150, step: 10, blankIdx: 2, boundary: false },
  { start: 1990, step: 10, blankIdx: 1, boundary: true },
  { start: 3450, step: -10, blankIdx: 4, boundary: false },
  { start: 3020, step: -10, blankIdx: 4, boundary: true },
  { start: 8765, step: -10, blankIdx: 4, boundary: false },
  { start: 4260, step: -10, blankIdx: 4, boundary: false },
];
const C3_STEP_100 = [
  { start: 1230, step: 100, blankIdx: 4, boundary: false },
  { start: 9600, step: 100, blankIdx: 4, boundary: true }, // → 10,000 (§2.6)
  { start: 3456, step: 100, blankIdx: 2, boundary: false },
  { start: 1900, step: 100, blankIdx: 1, boundary: true },
  { start: 5670, step: -100, blankIdx: 4, boundary: false },
  { start: 3100, step: -100, blankIdx: 4, boundary: true },
  { start: 6789, step: -100, blankIdx: 4, boundary: false },
  { start: 8760, step: -100, blankIdx: 4, boundary: false },
];
const C3_STEP_1 = [
  { start: 1231, step: 1, blankIdx: 4, boundary: false },
  { start: 997, step: 1, blankIdx: 4, boundary: true },
  { start: 2345, step: 1, blankIdx: 4, boundary: false },
  { start: 4321, step: 1, blankIdx: 2, boundary: false },
  { start: 1005, step: -1, blankIdx: 4, boundary: false },
  { start: 1002, step: -1, blankIdx: 4, boundary: true },
  { start: 6789, step: -1, blankIdx: 4, boundary: false },
  { start: 3003, step: -1, blankIdx: 4, boundary: true },
];
const C3_PATTERNS = [...C3_STEP_1000, ...C3_STEP_10, ...C3_STEP_100, ...C3_STEP_1];

// ---------------------------------------------------------------------------
// Pool builder
// ---------------------------------------------------------------------------
function buildPlaceValuePool() {
  const items = [];

  // ---- B1: read the chart (singleNumber) ----
  B_NUMBERS.forEach((value) => {
    const columns = value < 1000 ? 3 : 4;
    const digits = digitsOf(value);
    items.push({
      itemKey: `pv:read:${value}`, skill: "B1", group: "build",
      answerType: "singleNumber",
      value, columns, digits, hasZero: hasZeroDigit(value),
      correctAnswer: value,
      display: formatNumber(value),
    });
  });

  // ---- B2: build the number (buildNumber) — same 24 numbers as B1 ----
  B_NUMBERS.forEach((value) => {
    const columns = value < 1000 ? 3 : 4;
    const digits = digitsOf(value);
    const correctAnswer = columns === 4
      ? [digits.k, digits.h, digits.t, digits.o]
      : [digits.h, digits.t, digits.o];
    items.push({
      itemKey: `pv:build:${value}`, skill: "B2", group: "build",
      answerType: "buildNumber",
      value, columns, digits, hasZero: hasZeroDigit(value),
      correctAnswer,
      display: formatNumber(value),
    });
  });

  // ---- B3: numeral → word (choice4) ----
  const b3Values = [...B3_NO_ZERO, ...B3_ZERO_PLACE, ...B3_TRAPS, B3_TEN_THOUSAND];
  b3Values.forEach((value) => {
    if (value === B3_TEN_THOUSAND) {
      items.push({
        itemKey: `pv:word:${value}`, skill: "B3", group: "build",
        answerType: "choice4",
        value, columns: null, noChart: true, hasZero: true,
        correctAnswer: "ten thousand",
        distractors: ["one thousand", "ten hundred", "one hundred thousand"],
        display: formatNumber(value),
      });
      return;
    }
    const columns = 4;
    const digits = digitsOf(value);
    items.push({
      itemKey: `pv:word:${value}`, skill: "B3", group: "build",
      answerType: "choice4",
      value, columns, digits, hasZero: hasZeroDigit(value),
      correctAnswer: numberToWords(value),
      distractors: buildWordDistractors(value, digits, columns),
      display: formatNumber(value),
    });
  });

  // ---- B4: word → numeral (singleNumber) ----
  [...B4_NO_ZERO, ...B4_ZERO_PLACE, ...B4_TRAPS].forEach((value) => {
    const columns = 4;
    const digits = digitsOf(value);
    items.push({
      itemKey: `pv:num:${value}`, skill: "B4", group: "build",
      answerType: "singleNumber",
      value, columns, digits, hasZero: hasZeroDigit(value),
      correctAnswer: value,
      display: formatNumber(value),
    });
  });

  // ---- V1: which digit (choice4) ----
  V1_NUMBERS.forEach((value) => {
    const columns = 4;
    const digits = digitsOf(value);
    PLACE_CODES.forEach((place) => {
      const correctDigit = digits[place];
      items.push({
        itemKey: `pv:dig:${value}:${place}`, skill: "V1", group: "digits",
        answerType: "choice4",
        value, columns, digits, place, hasZero: hasZeroDigit(value),
        correctAnswer: correctDigit,
        distractors: buildDigitDistractors(correctDigit, digits, columns),
        display: `${formatNumber(value)} · ${place}`,
      });
    });
  });

  // ---- V2: what is it worth (choice4) ----
  V2_NUMBERS.forEach((value) => {
    const columns = 4;
    const digits = digitsOf(value);
    PLACE_CODES.forEach((place) => {
      const digit = digits[place];
      const placeValue = PLACE_VALUES[place];
      const correctValue = digit * placeValue;
      items.push({
        itemKey: `pv:val:${value}:${place}`, skill: "V2", group: "digits",
        answerType: "choice4",
        value, columns, digits, place, hasZero: hasZeroDigit(value),
        correctAnswer: correctValue,
        distractors: buildValueDistractors(correctValue, digit, placeValue),
        display: `${formatNumber(value)} · ${place}`,
      });
    });
  });

  // ---- V3: which place (choice4, place-name cards) ----
  V3_NUMBERS.forEach((value) => {
    const columns = 4;
    const digits = digitsOf(value);
    PLACE_CODES.forEach((place) => {
      const correctPlaceWord = PLACE_LABELS[place].toLowerCase();
      items.push({
        itemKey: `pv:place:${value}:${place}`, skill: "V3", group: "digits",
        answerType: "choice4",
        value, columns, digits, place, hasZero: hasZeroDigit(value),
        correctAnswer: correctPlaceWord,
        distractors: buildPlaceNameDistractors(place),
        display: `${formatNumber(value)} · ${place}`,
      });
    });
  });

  // ---- X1: decompose with a blank (singleNumber) ----
  X1_NUMBERS.forEach((value) => {
    const digits = digitsOf(value);
    PLACE_CODES.forEach((place) => {
      const term = digits[place] * PLACE_VALUES[place];
      items.push({
        itemKey: `pv:exp:${value}:${place}`, skill: "X1", group: "expanded",
        answerType: "singleNumber",
        value, columns: 4, digits, place, hasZero: hasZeroDigit(value),
        correctAnswer: term,
        display: `${formatNumber(value)} · ${place}`,
      });
    });
  });

  // ---- X2: compose (singleNumber) — zero places omitted from the addends ----
  [...X2_NO_ZERO, ...X2_ZERO_PLACE].forEach((value) => {
    const digits = digitsOf(value);
    const addends = PLACE_CODES.filter((p) => digits[p] > 0).map((p) => digits[p] * PLACE_VALUES[p]);
    items.push({
      itemKey: `pv:comp:${value}`, skill: "X2", group: "expanded",
      answerType: "singleNumber",
      value, columns: 4, digits, addends, hasZero: hasZeroDigit(value),
      correctAnswer: value,
      display: formatNumber(value),
    });
  });

  // ---- X3: pick the expanded form (choice4) ----
  [...X3_NO_ZERO, ...X3_ZERO_PLACE].forEach((value) => {
    const digits = digitsOf(value);
    const terms = PLACE_CODES.map((p) => digits[p] * PLACE_VALUES[p]);
    items.push({
      itemKey: `pv:pick:${value}`, skill: "X3", group: "expanded",
      answerType: "choice4",
      value, columns: 4, digits, hasZero: hasZeroDigit(value),
      correctAnswer: expansionString(terms),
      distractors: buildExpansionDistractors(value, digits),
      display: formatNumber(value),
    });
  });

  // ---- C1: compare two (tapTwo) ----
  C1_PAIRS.forEach(({ a, b, direction, leftIsA }) => {
    const correctValue = direction === "gt" ? Math.max(a, b) : Math.min(a, b);
    const leftValue = leftIsA ? a : b;
    const rightValue = leftIsA ? b : a;
    items.push({
      itemKey: `pv:cmp:${direction}:${a},${b}`, skill: "C1", group: "compare",
      answerType: "tapTwo",
      a, b, direction, leftValue, rightValue,
      correctAnswer: correctValue,
      correctSide: correctValue === leftValue ? "left" : "right",
      hasZero: hasZeroDigit(a) || hasZeroDigit(b),
      display: `${formatNumber(a)}·${formatNumber(b)}`,
    });
  });

  // ---- C2: order three (orderThree) — always ascending ----
  C2_TRIPLES.forEach((triple, idx) => {
    const sorted = [...triple].sort((x, y) => x - y);
    const tileOrder = C2_TILE_PERMS[idx % C2_TILE_PERMS.length];
    const values = tileOrder.map((sortedIdx) => sorted[sortedIdx]);
    // Inverse of tileOrder: the on-screen tile position holding the
    // smallest/middle/largest value, in that ascending order — the tap
    // sequence (mirrors fractions' C2 `order` field exactly).
    const order = [0, 1, 2].map((sortedIdx) => tileOrder.indexOf(sortedIdx));
    items.push({
      itemKey: `pv:ord:${sorted.join(",")}`, skill: "C2", group: "compare",
      answerType: "orderThree",
      values, tileOrder, order, direction: "asc",
      hasZero: sorted.some((n) => hasZeroDigit(n)),
      display: sorted.map((n) => formatNumber(n)).join(","),
    });
  });

  // ---- C3: number patterns (singleNumber) ----
  C3_PATTERNS.forEach(({ start, step, blankIdx, boundary }) => {
    const terms = [0, 1, 2, 3, 4].map((i) => start + step * i);
    const value = terms[blankIdx];
    const sign = step >= 0 ? "+" : "";
    items.push({
      itemKey: `pv:pat:${start}${sign}${step}@${blankIdx}`, skill: "C3", group: "compare",
      answerType: "singleNumber",
      start, step, blankIdx, terms, boundary,
      hasZero: terms.some((t) => t !== 10000 && hasZeroDigit(t)),
      correctAnswer: value,
      display: `${formatNumber(start)}${sign}${step}`,
    });
  });

  return items;
}

export const PLACE_VALUE_POOL = buildPlaceValuePool();

// ---------------------------------------------------------------------------
// Skill gates (§4 point 2): a skill's items don't enter the "new" frontier
// until ≥60% of its prerequisite skills are mastered. Mirrors fractions'
// shouldAllowSkill (A3/A4 gate) — extended pass 2 with X2/X3 (gated on X1)
// and C3 (gated on C1+C2).
// ---------------------------------------------------------------------------
function pctMastered(skills, masteryData) {
  const items = PLACE_VALUE_POOL.filter((i) => skills.includes(i.skill));
  if (items.length === 0) return 1;
  const mastered = items.filter((i) => (masteryData[i.itemKey]?.correct || 0) >= 3).length;
  return mastered / items.length;
}

export function shouldAllowSkill(skill, masteryData) {
  if (["B3", "B4"].includes(skill)) return pctMastered(["B1", "B2"], masteryData) >= 0.6;
  if (["X2", "X3"].includes(skill)) return pctMastered(["X1"], masteryData) >= 0.6;
  if (skill === "C3") return pctMastered(["C1", "C2"], masteryData) >= 0.6;
  return true;
}

// ---------------------------------------------------------------------------
// Achievement triggers specific to Place Value (mirrors
// checkExtraFractionTrigger's shape/pattern exactly).
// ---------------------------------------------------------------------------
function checkGroupMastered(groupId, masteryData) {
  const groupItems = PLACE_VALUE_POOL.filter((i) => i.group === groupId);
  return groupItems.length > 0 && groupItems.every((i) => (masteryData[i.itemKey]?.correct || 0) >= 3);
}

function checkZeroCount(masteryData, targetCount) {
  let count = 0;
  for (const item of PLACE_VALUE_POOL) {
    if (item.hasZero && (masteryData[item.itemKey]?.correct || 0) >= 1) count++;
  }
  return count >= targetCount;
}

// "Master every accessible item" (§9) — mirrors add.jsx's checkAddAllMastered
// / fractions' checkAllMastered exactly: checked over the whole pool, same
// as those modules, since an inaccessible (unpurchased) item can never earn
// mastery data in the first place.
function checkAllMastered(masteryData) {
  return PLACE_VALUE_POOL.every((i) => (masteryData[i.itemKey]?.correct || 0) >= 3);
}

export function checkExtraPlaceValueTrigger(triggerType, params, values) {
  const mastery = values.mastery || {};
  switch (triggerType) {
    case "masterPVGroup":
      return checkGroupMastered(params.group, mastery);
    case "masterPVAll":
      return checkAllMastered(mastery);
    case "pvZeroCount":
      return checkZeroCount(mastery, params.count);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Module definition
// ---------------------------------------------------------------------------
const placeValueModule = {
  id: "placeValue",
  name: "Place Value",
  grades: "Grades 2–3",
  color: COLORS.purple,
  description: "Read, build, stretch and compare numbers to 10,000 — with place-value discs",

  groups: [
    { id: "build", label: "Build & Read", skills: ["B1", "B2", "B3", "B4"], color: COLORS.purple },
    { id: "digits", label: "Digit Values", skills: ["V1", "V2", "V3"], color: COLORS.blue },
    { id: "expanded", label: "Expanded Form", skills: ["X1", "X2", "X3"], color: COLORS.orange },
    { id: "compare", label: "Compare, Order & Patterns", skills: ["C1", "C2", "C3"], color: COLORS.green },
  ],

  // Preview: Build & Read is free; Digit Values, Expanded Form and Compare,
  // Order & Patterns need the $3.99 unlock. Jack's phone runs the tester
  // build (purchaseManager IS_TESTER_BUILD), which opens every group.
  freeContent: ["build"],

  skillLabels: {
    B1: "Read the discs",
    B2: "Build it",
    B3: "Say it in words",
    B4: "Write the number",
    V1: "Which digit?",
    V2: "What's it worth?",
    V3: "Which place?",
    X1: "Stretch it out",
    X2: "Put it together",
    X3: "Find the stretch",
    C1: "Which is more?",
    C2: "Put them in order",
    C3: "What comes next?",
  },

  pool: PLACE_VALUE_POOL,

  // scaffoldMap is documentation-only (never read programmatically — the
  // practice screen branches on item.skill directly, same as fractions).
  scaffoldMap: {
    B1: "PlaceValueChart", B2: "PlaceValueChart", B3: "PlaceValueChart", B4: "PlaceValueChart",
    V1: "PlaceValueChart", V2: "PlaceValueChart", V3: "PlaceValueChart",
    X1: "PlaceValueStrips", X2: "PlaceValueStrips", X3: "PlaceValueStrips",
    C1: "PlaceValueChart", C2: "PlaceValueChart", C3: "PlaceValueChart",
  },

  defaultMode: "pictorial",
  defaultModeByGroup: { build: "concrete" },

  achievements: [
    { id: "pv-disc-boss", name: "Disc Boss", description: "Mastered every Build & Read item", trigger: "masterPVGroup", params: { group: "build" } },
    { id: "pv-digit-detective", name: "Digit Detective", description: "Mastered every Digit Values item", trigger: "masterPVGroup", params: { group: "digits" } },
    { id: "pv-number-stretcher", name: "Number Stretcher", description: "Mastered every Expanded Form item", trigger: "masterPVGroup", params: { group: "expanded" } },
    { id: "pv-line-up-champ", name: "Line-Up Champ", description: "Mastered every Compare, Order & Patterns item", trigger: "masterPVGroup", params: { group: "compare" } },
    { id: "pv-master", name: "Place Value Master", description: "Mastered every Place Value item", trigger: "masterPVAll" },
    { id: "pv-zero-hero", name: "Zero Hero", description: "20 correct answers on numbers with a zero place", trigger: "pvZeroCount", params: { count: 20 } },
  ],

  checkExtraTrigger: checkExtraPlaceValueTrigger,
};

export default placeValueModule;
