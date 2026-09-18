import { COLORS } from "../constants.js";

// ---------------------------------------------------------------------------
// Place Value module — pass 1 (Groups B "Build & Read" and V "Digit Values"
// only; X "Expanded Form" and C "Compare, Order & Patterns" are pass 2 per
// docs/place-value-spec.md's Build plan — not stubbed into `groups` here).
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

  return items;
}

export const PLACE_VALUE_POOL = buildPlaceValuePool();

// ---------------------------------------------------------------------------
// Skill gate (§4 point 2): B3/B4 don't enter the "new" frontier until ≥60%
// of B1+B2 are mastered. Mirrors fractions' shouldAllowSkill (A3/A4 gate).
// ---------------------------------------------------------------------------
export function shouldAllowSkill(skill, masteryData) {
  if (!["B3", "B4"].includes(skill)) return true;
  const b1b2 = PLACE_VALUE_POOL.filter((i) => i.skill === "B1" || i.skill === "B2");
  if (b1b2.length === 0) return true;
  const mastered = b1b2.filter((i) => (masteryData[i.itemKey]?.correct || 0) >= 3).length;
  return mastered / b1b2.length >= 0.6;
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

export function checkExtraPlaceValueTrigger(triggerType, params, values) {
  const mastery = values.mastery || {};
  switch (triggerType) {
    case "masterPVGroup":
      return checkGroupMastered(params.group, mastery);
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
    // X (Expanded Form, orange) and C (Compare/Order/Patterns, green) are
    // pass 2 (docs/place-value-spec.md Build plan) — not stubbed in here.
    { id: "build", label: "Build & Read", skills: ["B1", "B2", "B3", "B4"], color: COLORS.purple },
    { id: "digits", label: "Digit Values", skills: ["V1", "V2", "V3"], color: COLORS.blue },
  ],

  // Group V is free alongside Group B ONLY until launch pricing is wired —
  // the native purchase provider is still a stub, so the $3.99 gate has to
  // move V out of freeContent before this module ships for real (Build plan).
  freeContent: ["build", "digits"],

  skillLabels: {
    B1: "Read the discs",
    B2: "Build it",
    B3: "Say it in words",
    B4: "Write the number",
    V1: "Which digit?",
    V2: "What's it worth?",
    V3: "Which place?",
  },

  pool: PLACE_VALUE_POOL,

  // scaffoldMap is documentation-only (never read programmatically — the
  // practice screen branches on item.skill directly, same as fractions).
  scaffoldMap: {
    B1: "PlaceValueChart", B2: "PlaceValueChart", B3: "PlaceValueChart", B4: "PlaceValueChart",
    V1: "PlaceValueChart", V2: "PlaceValueChart", V3: "PlaceValueChart",
  },

  defaultMode: "pictorial",
  defaultModeByGroup: { build: "concrete" },

  achievements: [
    { id: "pv-disc-boss", name: "Disc Boss", description: "Mastered every Build & Read item", trigger: "masterPVGroup", params: { group: "build" } },
    { id: "pv-digit-detective", name: "Digit Detective", description: "Mastered every Digit Values item", trigger: "masterPVGroup", params: { group: "digits" } },
    { id: "pv-zero-hero", name: "Zero Hero", description: "20 correct answers on numbers with a zero place", trigger: "pvZeroCount", params: { count: 20 } },
    // pv-master (module mastery) and pv-number-stretcher/pv-line-up-champ
    // (X/C group badges) wait for pass 2, once those groups exist.
  ],

  checkExtraTrigger: checkExtraPlaceValueTrigger,
};

export default placeValueModule;
