/**
 * Connections Module — Mixed Practice / Capstone
 *
 * The summit module: fraction-of-a-quantity (I-group), two-step word problems
 * (T-group), and shuffle drill (S-group) interleaving mastered source facts.
 *
 * Key design properties:
 *  - Two-layer gate: purchase AND full mastery of Multiply + Divide + Fractions
 *  - freeContent: [] — no free tier (capstone only)
 *  - All item keys prefixed with "mix:" — never collide with other modules
 *  - Pool is fully deterministic (no Math.random in generation)
 *  - S-group items mirror already-mastered source facts, read-only cross-module
 */

import { DEFAULT_MASTERY_THRESHOLD } from "../constants.js";
import { FRACTION_POOL } from "./fractions.jsx";
import { isConnectionsUnlocked } from "../purchaseManager.js";

// ---------------------------------------------------------------------------
// GROUP I — Fraction of a Quantity
// ---------------------------------------------------------------------------

/**
 * I1 pool: "1/d of q = ?"
 * Denominators 2–6; quantity is a multiple of d; quantity ≤ 60.
 * Difficulty order: smaller d first, within same d smaller q first.
 * Halves/quarters family before thirds/sixths before fifths (per spec §5).
 */
function buildI1Pool() {
  const items = [];
  // Ordered by difficulty: d=2, d=4, d=3, d=6, d=5 (spec ordering)
  const denomOrder = [2, 4, 3, 6, 5];
  denomOrder.forEach(d => {
    for (let q = d; q <= 60; q += d) {
      const answer = q / d;
      items.push({
        itemKey: `mix:fracqty:1/${d}of${q}`,
        skill: "I1",
        group: "integration",
        answerType: "singleNumber",
        numerator: 1,
        denominator: d,
        quantity: q,
        correctAnswer: answer,
        questionText: null, // generated in practice screen
      });
    }
  });
  return items;
}

/**
 * I2 pool: "n/d of q = ?"
 * Same ranges as I1; 1 < n < d.
 * Difficulty order: same d ordering as I1; within same d, smaller n first.
 */
function buildI2Pool() {
  const items = [];
  const denomOrder = [4, 3, 6, 5]; // d=2 has no non-unit fractions (1 < n < 2 impossible)
  denomOrder.forEach(d => {
    for (let n = 2; n < d; n++) {
      for (let q = d; q <= 60; q += d) {
        const partValue = q / d;
        const answer = n * partValue;
        items.push({
          itemKey: `mix:fracqty:${n}/${d}of${q}`,
          skill: "I2",
          group: "integration",
          answerType: "singleNumber",
          numerator: n,
          denominator: d,
          quantity: q,
          partValue,
          correctAnswer: answer,
          questionText: null,
        });
      }
    }
  });
  return items;
}

// ---------------------------------------------------------------------------
// GROUP T — Two-Step Word Problems (curated static list)
// ---------------------------------------------------------------------------

/**
 * T1: Two multiplicative steps (× then ÷, or × then ×).
 * Curated templates over tables 2–6 (P3 range) with clean integer results.
 * Word problems are 8-year-old reading level, short sentences.
 */
const T1_ITEMS = [
  // (× then ÷)
  { id: "t1:4bags6apples3plates", text: ["4 bags. Each bag has 6 apples.", "They are shared equally onto 3 plates.", "How many apples on each plate?"], step1: { op: "×", a: 4, b: 6, result: 24, label: "4 × 6" }, step2: { op: "÷", a: 24, b: 3, result: 8, label: "24 ÷ 3" }, answer: 8 },
  { id: "t1:3boxes8biscuits4friends", text: ["3 boxes of biscuits. Each box has 8 biscuits.", "4 friends share them equally.", "How many biscuits each?"], step1: { op: "×", a: 3, b: 8, result: 24, label: "3 × 8" }, step2: { op: "÷", a: 24, b: 4, result: 6, label: "24 ÷ 4" }, answer: 6 },
  { id: "t1:5rows4chairs5groups", text: ["5 rows of chairs. Each row has 4 chairs.", "The chairs are put into 5 equal groups.", "How many chairs in each group?"], step1: { op: "×", a: 5, b: 4, result: 20, label: "5 × 4" }, step2: { op: "÷", a: 20, b: 5, result: 4, label: "20 ÷ 5" }, answer: 4 },
  { id: "t1:6jars3sweets2bags", text: ["6 jars. Each jar has 3 sweets.", "All the sweets go into 2 bags equally.", "How many sweets in each bag?"], step1: { op: "×", a: 6, b: 3, result: 18, label: "6 × 3" }, step2: { op: "÷", a: 18, b: 2, result: 9, label: "18 ÷ 2" }, answer: 9 },
  { id: "t1:4boxes5pencils10kids", text: ["4 boxes of pencils. Each box has 5 pencils.", "10 children share them equally.", "How many pencils does each child get?"], step1: { op: "×", a: 4, b: 5, result: 20, label: "4 × 5" }, step2: { op: "÷", a: 20, b: 10, result: 2, label: "20 ÷ 10" }, answer: 2 },
  { id: "t1:3rows9tiles3cols", text: ["3 rows of tiles. Each row has 9 tiles.", "The tiles are shared into 3 equal piles.", "How many tiles in each pile?"], step1: { op: "×", a: 3, b: 9, result: 27, label: "3 × 9" }, step2: { op: "÷", a: 27, b: 3, result: 9, label: "27 ÷ 3" }, answer: 9 },
  { id: "t1:7baskets4eggs2boxes", text: ["7 baskets. Each basket has 4 eggs.", "All the eggs go into 2 boxes equally.", "How many eggs in each box?"], step1: { op: "×", a: 7, b: 4, result: 28, label: "7 × 4" }, step2: { op: "÷", a: 28, b: 4, result: 7, label: "28 ÷ 7" }, answer: 7 },
  { id: "t1:5pages6words2groups", text: ["5 pages of words. Each page has 6 words.", "The words are split into 2 equal groups.", "How many words in each group?"], step1: { op: "×", a: 5, b: 6, result: 30, label: "5 × 6" }, step2: { op: "÷", a: 30, b: 6, result: 5, label: "30 ÷ 6" }, answer: 5 },
  { id: "t1:2shelves10books4piles", text: ["2 shelves of books. Each shelf has 10 books.", "The books are stacked into 4 equal piles.", "How many books in each pile?"], step1: { op: "×", a: 2, b: 10, result: 20, label: "2 × 10" }, step2: { op: "÷", a: 20, b: 4, result: 5, label: "20 ÷ 5" }, answer: 5 },
  { id: "t1:6packs4stickers3kids", text: ["6 packs of stickers. Each pack has 4 stickers.", "3 children share all the stickers equally.", "How many stickers each?"], step1: { op: "×", a: 6, b: 4, result: 24, label: "6 × 4" }, step2: { op: "÷", a: 24, b: 6, result: 4, label: "24 ÷ 6" }, answer: 4 },
  // (× then ×)
  { id: "t1:2bags3boxes4sweets", text: ["2 bags. Each bag has 3 boxes.", "Each box has 4 sweets.", "How many sweets in total?"], step1: { op: "×", a: 2, b: 3, result: 6, label: "2 × 3" }, step2: { op: "×", a: 6, b: 4, result: 24, label: "6 × 4" }, answer: 24 },
  { id: "t1:3rows4tables5chairs", text: ["3 classrooms. Each classroom has 4 tables.", "Each table has 5 chairs.", "How many chairs altogether?"], step1: { op: "×", a: 3, b: 4, result: 12, label: "3 × 4" }, step2: { op: "×", a: 12, b: 5, result: 60, label: "12 × 5" }, answer: 60 },
  { id: "t1:4boxes2packs3pencils", text: ["4 boxes. Each box has 2 packs.", "Each pack has 3 pencils.", "How many pencils altogether?"], step1: { op: "×", a: 4, b: 2, result: 8, label: "4 × 2" }, step2: { op: "×", a: 8, b: 3, result: 24, label: "8 × 3" }, answer: 24 },
  { id: "t1:5rows3boxes2cookies", text: ["5 trays. Each tray has 3 boxes.", "Each box holds 2 cookies.", "How many cookies in total?"], step1: { op: "×", a: 5, b: 3, result: 15, label: "5 × 3" }, step2: { op: "×", a: 15, b: 2, result: 30, label: "15 × 2" }, answer: 30 },
];

function buildT1Pool() {
  return T1_ITEMS.map(item => ({
    itemKey: `mix:2step:${item.id}`,
    skill: "T1",
    group: "twoStep",
    answerType: "singleNumber",
    text: item.text,
    step1: item.step1,
    step2: item.step2,
    correctAnswer: item.answer,
  }));
}

/**
 * T2: One multiplicative step + fraction-of-quantity step.
 * Denominators limited to 2, 3, 4 for T2 (spec §5).
 */
const T2_ITEMS = [
  { id: "t2:5boxes4pencilsHalf", text: ["There are 5 boxes of 4 pencils.", "Half of the pencils are red.", "How many pencils are red?"], step1: { op: "×", a: 5, b: 4, result: 20, label: "5 × 4" }, step2: { op: "frac", n: 1, d: 2, quantity: 20, result: 10, label: "1/2 of 20" }, answer: 10 },
  { id: "t2:3boxes8stickersQuarter", text: ["3 boxes of 8 stickers.", "One quarter of the stickers are gold.", "How many stickers are gold?"], step1: { op: "×", a: 3, b: 8, result: 24, label: "3 × 8" }, step2: { op: "frac", n: 1, d: 4, quantity: 24, result: 6, label: "1/4 of 24" }, answer: 6 },
  { id: "t2:4rows6appleThird", text: ["4 rows of 6 apples.", "One third of the apples are green.", "How many apples are green?"], step1: { op: "×", a: 4, b: 6, result: 24, label: "4 × 6" }, step2: { op: "frac", n: 1, d: 3, quantity: 24, result: 8, label: "1/3 of 24" }, answer: 8 },
  { id: "t2:6bags5ballonsHalf", text: ["6 bags with 5 balloons each.", "Half of the balloons are blue.", "How many balloons are blue?"], step1: { op: "×", a: 6, b: 5, result: 30, label: "6 × 5" }, step2: { op: "frac", n: 1, d: 2, quantity: 30, result: 15, label: "1/2 of 30" }, answer: 15 },
  { id: "t2:2boxes9marbleThird", text: ["2 boxes of 9 marbles.", "One third of the marbles are red.", "How many marbles are red?"], step1: { op: "×", a: 2, b: 9, result: 18, label: "2 × 9" }, step2: { op: "frac", n: 1, d: 3, quantity: 18, result: 6, label: "1/3 of 18" }, answer: 6 },
  { id: "t2:5rows4cakesQuarter", text: ["5 plates with 4 cakes each.", "One quarter of the cakes have sprinkles.", "How many cakes have sprinkles?"], step1: { op: "×", a: 5, b: 4, result: 20, label: "5 × 4" }, step2: { op: "frac", n: 1, d: 4, quantity: 20, result: 5, label: "1/4 of 20" }, answer: 5 },
  { id: "t2:3shelves8booksHalf", text: ["3 shelves with 8 books each.", "Half of the books are fiction.", "How many books are fiction?"], step1: { op: "×", a: 3, b: 8, result: 24, label: "3 × 8" }, step2: { op: "frac", n: 1, d: 2, quantity: 24, result: 12, label: "1/2 of 24" }, answer: 12 },
  { id: "t2:4packs5stickerThird", text: ["4 packs with 5 stickers in each.", "One fifth of the stickers are shiny.", "How many stickers are shiny?"], step1: { op: "×", a: 4, b: 5, result: 20, label: "4 × 5" }, step2: { op: "frac", n: 1, d: 4, quantity: 20, result: 5, label: "1/4 of 20" }, answer: 5 },
  { id: "t2:6bags10beadsHalf", text: ["6 bags with 10 beads each.", "Half of the beads are yellow.", "How many beads are yellow?"], step1: { op: "×", a: 6, b: 10, result: 60, label: "6 × 10" }, step2: { op: "frac", n: 1, d: 2, quantity: 60, result: 30, label: "1/2 of 60" }, answer: 30 },
  { id: "t2:3jars6coinsThird", text: ["3 jars with 6 coins each.", "One third of the coins are gold.", "How many coins are gold?"], step1: { op: "×", a: 3, b: 6, result: 18, label: "3 × 6" }, step2: { op: "frac", n: 1, d: 3, quantity: 18, result: 6, label: "1/3 of 18" }, answer: 6 },
];

function buildT2Pool() {
  return T2_ITEMS.map(item => ({
    itemKey: `mix:2step:${item.id}`,
    skill: "T2",
    group: "twoStep",
    answerType: "singleNumber",
    text: item.text,
    step1: item.step1,
    step2: item.step2,
    correctAnswer: item.answer,
  }));
}

// ---------------------------------------------------------------------------
// GROUP S — Shuffle Drill (items generated at draw time from mastered sources)
// ---------------------------------------------------------------------------

/**
 * Build the S-group static mirror items.
 *
 * S1: multiply/divide fact mirrors — these are generated from tables 2–10.
 * We build a comprehensive static pool; at draw time the practice screen
 * filters down to only those the child has mastered in mastery.multiply.
 *
 * S2: fraction item mirrors — mirrored from FRACTION_POOL.
 * At draw time filtered to only mastered fraction items.
 *
 * Both S1 and S2 get "mix:drill:" prefix so they live in mastery.connections
 * separately from the source modules.
 */

function buildS1Pool() {
  const items = [];
  const tables = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  tables.forEach(t => {
    for (let i = 1; i <= 10; i++) {
      const product = t * i;
      // Multiply
      items.push({
        itemKey: `mix:drill:${t}x${i}`,
        skill: "S1",
        group: "shuffle",
        answerType: "singleNumber",
        operation: "multiply",
        a: t, b: i, correctAnswer: product,
        display: `${t} × ${i}`,
        sourceKey: `${t}x${i}`,     // key in mastery.multiply
        sourceModule: "multiply",
      });
      // Divide (product ÷ t = i)
      items.push({
        itemKey: `mix:drill:${product}÷${t}`,
        skill: "S1",
        group: "shuffle",
        answerType: "singleNumber",
        operation: "divide",
        a: product, b: t, correctAnswer: i,
        display: `${product} ÷ ${t}`,
        sourceKey: `${product}÷${t}`,
        sourceModule: "multiply",
      });
      // Divide (product ÷ i = t) — deduplicate when i === t
      if (i !== t) {
        items.push({
          itemKey: `mix:drill:${product}÷${i}`,
          skill: "S1",
          group: "shuffle",
          answerType: "singleNumber",
          operation: "divide",
          a: product, b: i, correctAnswer: t,
          display: `${product} ÷ ${i}`,
          sourceKey: `${product}÷${i}`,
          sourceModule: "multiply",
        });
      }
    }
  });
  // Deduplicate by itemKey (e.g. 4x2 and 2x4 both produce 8÷2 and 8÷4)
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.itemKey)) return false;
    seen.add(item.itemKey);
    return true;
  });
}

function buildS2Pool() {
  return FRACTION_POOL.map(fracItem => {
    const mixKey = `mix:drill:${fracItem.itemKey}`;
    return {
      // Copy all source item fields first, then override
      ...fracItem,
      // Capstone item key (mastery.connections)
      itemKey: mixKey,
      skill: "S2",
      group: "shuffle",
      // Source item key (mastery.fractions) — checked at draw-time filter
      sourceKey: fracItem.itemKey,
      sourceModule: "fractions",
    };
  });
}

// ---------------------------------------------------------------------------
// Combined pool
// ---------------------------------------------------------------------------

function buildConnectionsPool() {
  return [
    ...buildI1Pool(),
    ...buildI2Pool(),
    ...buildT1Pool(),
    ...buildT2Pool(),
    ...buildS1Pool(),
    ...buildS2Pool(),
  ];
}

export const CONNECTIONS_POOL = buildConnectionsPool();

// Export sub-pools for convenience
export const I1_POOL = CONNECTIONS_POOL.filter(i => i.skill === "I1");
export const I2_POOL = CONNECTIONS_POOL.filter(i => i.skill === "I2");
export const T1_POOL = CONNECTIONS_POOL.filter(i => i.skill === "T1");
export const T2_POOL = CONNECTIONS_POOL.filter(i => i.skill === "T2");
export const S1_POOL = CONNECTIONS_POOL.filter(i => i.skill === "S1");
export const S2_POOL = CONNECTIONS_POOL.filter(i => i.skill === "S2");

// ---------------------------------------------------------------------------
// Skill-gate helpers (per spec §5)
// ---------------------------------------------------------------------------

/**
 * Returns true when I2 items may be introduced as "new":
 * >= 60% of I1 mastered.
 */
export function shouldAllowI2(connectionsMastery) {
  const masteryData = connectionsMastery || {};
  const mastered = I1_POOL.filter(i => (masteryData[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length;
  return I1_POOL.length > 0 && mastered / I1_POOL.length >= 0.6;
}

/**
 * Returns true when T1 items may be introduced as "new":
 * I-group is largely mastered (>= 80% of I1 + I2 combined).
 */
export function shouldAllowT1(connectionsMastery) {
  const masteryData = connectionsMastery || {};
  const iGroup = [...I1_POOL, ...I2_POOL];
  const mastered = iGroup.filter(i => (masteryData[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length;
  return iGroup.length > 0 && mastered / iGroup.length >= 0.8;
}

/**
 * Returns true when T2 items may be introduced as "new":
 * T1 >= 60% mastered AND I2 fully mastered.
 */
export function shouldAllowT2(connectionsMastery) {
  const masteryData = connectionsMastery || {};
  const t1Mastered = T1_POOL.filter(i => (masteryData[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length;
  const t1Ok = T1_POOL.length > 0 && t1Mastered / T1_POOL.length >= 0.6;
  const i2Mastered = I2_POOL.filter(i => (masteryData[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length;
  const i2Ok = I2_POOL.length > 0 && i2Mastered === I2_POOL.length;
  return t1Ok && i2Ok;
}

// ---------------------------------------------------------------------------
// Achievement trigger checker
// ---------------------------------------------------------------------------

function checkGroupI1Mastered(mastery) {
  const m = mastery || {};
  return I1_POOL.length > 0 && I1_POOL.every(i => (m[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD);
}

function checkGroupI2Mastered(mastery) {
  const m = mastery || {};
  return I2_POOL.length > 0 && I2_POOL.every(i => (m[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD);
}

function checkGroupTMastered(mastery) {
  const m = mastery || {};
  const tGroup = [...T1_POOL, ...T2_POOL];
  return tGroup.length > 0 && tGroup.every(i => (m[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD);
}

function checkGroupSMastered(mastery) {
  const m = mastery || {};
  const sGroup = [...S1_POOL, ...S2_POOL];
  return sGroup.length > 0 && sGroup.every(i => (m[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD);
}

function checkAllConnectionsMastered(mastery) {
  const m = mastery || {};
  return CONNECTIONS_POOL.every(i => (m[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD);
}

export function checkExtraConnectionsTrigger(triggerType, params, values) {
  const mastery = values.mastery || {};
  switch (triggerType) {
    case "masterBridgeBuilder":
      return checkGroupI1Mastered(mastery);
    case "masterWholeAndParts":
      return checkGroupI2Mastered(mastery);
    case "masterTwoStepThinker":
      return checkGroupTMastered(mastery);
    case "masterQuickSwitch":
      return checkGroupSMastered(mastery);
    case "masterAllConnections":
      return checkAllConnectionsMastered(mastery);
    case "summitUnlocked":
      // The capstone gate (Multiply + Divide + Fractions all mastered, plus
      // purchase) must be crossed to reach this module at all — so reaching it
      // and answering a question IS the moment of unlock. Confirm via the gate.
      return values.profileId ? isConnectionsUnlocked(values.profileId) : false;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Module definition
// ---------------------------------------------------------------------------

const connectionsModule = {
  id: "connections",
  name: "Mixed Practice",
  grades: "Grade 3 — Capstone",
  color: "#FFB703", // amber/gold — the summit accent
  description: "Put it all together — fractions, multiplication & division connected by the bar model",

  groups: [
    {
      id: "integration",
      label: "Fraction of a Group",
      skills: ["I1", "I2"],
      color: "#FFB703",
    },
    {
      id: "twoStep",
      label: "Two-Step Problems",
      skills: ["T1", "T2"],
      color: "#FF9F1C",
    },
    {
      id: "shuffle",
      label: "Mix It Up!",
      skills: ["S1", "S2"],
      color: "#06D6A0",
    },
  ],

  // No free tier — capstone is fully gated
  freeContent: [],

  // Skill labels in kid-friendly language
  skillLabels: {
    I1: "Fraction of a group",
    I2: "Parts of a group",
    T1: "Two-step problems",
    T2: "Fraction problems",
    S1: "Times & divide!",
    S2: "Fraction drill",
  },

  // The pool
  pool: CONNECTIONS_POOL,

  // Default CPA mode: concrete for Group I (first time reading division as fraction),
  // pictorial for Groups T and S.
  defaultMode: "pictorial",
  defaultModeByGroup: { integration: "concrete" },

  achievements: [
    { id: "conn-bridge-builder",  name: "Bridge Builder",    trigger: "masterBridgeBuilder" },
    { id: "conn-whole-and-parts", name: "Whole and Parts",   trigger: "masterWholeAndParts" },
    { id: "conn-two-step-thinker",name: "Two-Step Thinker",  trigger: "masterTwoStepThinker" },
    { id: "conn-quick-switch",    name: "Quick Switch",      trigger: "masterQuickSwitch" },
    { id: "conn-the-connector",   name: "The Connector",     trigger: "masterAllConnections" },
    // "Summit" fires when the gate is first crossed — checked in practice screen
    // via a dedicated trigger passed to checkAfterAnswer
    { id: "conn-summit",          name: "Summit",            trigger: "summitUnlocked" },
  ],

  checkExtraTrigger: checkExtraConnectionsTrigger,
};

export default connectionsModule;
