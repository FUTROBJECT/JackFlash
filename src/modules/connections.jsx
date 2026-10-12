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
 * Curated over tables 2–10 (P3 range) with clean integer results.
 * Word problems are 8-year-old reading level, short sentences (≤12 words),
 * and real: everyday sharing a kid has lived, or a real fact (Arch trams,
 * dice, checkers, chessboards, teeth, hockey) — never a random pile.
 */
const T1_ITEMS = [
  // (× then ÷) — real-life sharing
  { id: "t1:pizza3x8share6", text: ["Dad orders 3 large pizzas.", "Each pizza is cut into 8 slices.", "6 kids share the slices equally.", "How many slices does each kid get?"], step1: { op: "×", a: 3, b: 8, result: 24, label: "3 × 8" }, step2: { op: "÷", a: 24, b: 6, result: 4, label: "24 ÷ 6" }, answer: 4 },
  { id: "t1:eggs4x6omelet3", text: ["Mom buys 4 cartons of 6 eggs.", "Each omelet uses 3 eggs.", "How many omelets can she make?"], step1: { op: "×", a: 4, b: 6, result: 24, label: "4 × 6" }, step2: { op: "÷", a: 24, b: 3, result: 8, label: "24 ÷ 3" }, answer: 8 },
  { id: "t1:book6x10nights5", text: ["Leo's chapter book has 6 chapters of 10 pages.", "He reads the same number of pages for 5 nights.", "How many pages does he read each night?"], step1: { op: "×", a: 6, b: 10, result: 60, label: "6 × 10" }, step2: { op: "÷", a: 60, b: 5, result: 12, label: "60 ÷ 5" }, answer: 12 },
  { id: "t1:juice3x8teams2", text: ["Coach brings 3 packs of 8 juice boxes.", "The juice boxes are shared equally by 2 teams.", "How many juice boxes does each team get?"], step1: { op: "×", a: 3, b: 8, result: 24, label: "3 × 8" }, step2: { op: "÷", a: 24, b: 2, result: 12, label: "24 ÷ 2" }, answer: 12 },
  { id: "t1:candy6x4share2", text: ["On Halloween, Ava and her brother visit 6 houses.", "They get 4 pieces of candy at each house.", "The 2 of them share the candy equally.", "How many pieces does each get?"], step1: { op: "×", a: 6, b: 4, result: 24, label: "6 × 4" }, step2: { op: "÷", a: 24, b: 2, result: 12, label: "24 ÷ 2" }, answer: 12 },
  { id: "t1:zoo3x10groups5", text: ["3 classes of 10 kids visit the Saint Louis Zoo.", "They split into groups of 5, each with a parent.", "How many groups are there?"], step1: { op: "×", a: 3, b: 10, result: 30, label: "3 × 10" }, step2: { op: "÷", a: 30, b: 5, result: 6, label: "30 ÷ 5" }, answer: 6 },
  { id: "t1:garden4x9share3", text: ["Grandpa's garden has 4 rows of 9 carrots.", "He shares the carrots equally with 3 neighbors.", "How many carrots does each neighbor get?"], step1: { op: "×", a: 4, b: 9, result: 36, label: "4 × 9" }, step2: { op: "÷", a: 36, b: 3, result: 12, label: "36 ÷ 3" }, answer: 12 },
  { id: "t1:class4x6groups3", text: ["Mia's class sits at 4 tables of 6 kids.", "The teacher makes 3 equal reading groups.", "How many kids are in each reading group?"], step1: { op: "×", a: 4, b: 6, result: 24, label: "4 × 6" }, step2: { op: "÷", a: 24, b: 3, result: 8, label: "24 ÷ 3" }, answer: 8 },
  // (× then ×) — real facts
  { id: "t1:archTram8x5x2", text: ["Each Gateway Arch tram has 8 capsules.", "Each capsule seats 5 people.", "The Arch has 2 trams, one in each leg.", "How many people can ride up at once?"], step1: { op: "×", a: 8, b: 5, result: 40, label: "8 × 5" }, step2: { op: "×", a: 40, b: 2, result: 80, label: "40 × 2" }, answer: 80 },
  { id: "t1:dice3x7x2", text: ["Opposite sides of a die always add up to 7 dots.", "A die has 3 pairs of opposite sides.", "How many dots are on 2 dice?"], step1: { op: "×", a: 3, b: 7, result: 21, label: "3 × 7" }, step2: { op: "×", a: 21, b: 2, result: 42, label: "21 × 2" }, answer: 42 },
  { id: "t1:checkers3x4x2", text: ["In checkers, each player starts with 3 rows of 4 pieces.", "A game has 2 players.", "How many pieces start on the board?"], step1: { op: "×", a: 3, b: 4, result: 12, label: "3 × 4" }, step2: { op: "×", a: 12, b: 2, result: 24, label: "12 × 2" }, answer: 24 },
  { id: "t1:clydesdales4x2x4", text: ["Clydesdale horses pull a famous wagon in 4 rows of 2.", "Each horse wears 4 horseshoes.", "How many horseshoes does the team wear?"], step1: { op: "×", a: 4, b: 2, result: 8, label: "4 × 2" }, step2: { op: "×", a: 8, b: 4, result: 32, label: "8 × 4" }, answer: 32 },
  { id: "t1:lego2x4x6", text: ["A 2-by-4 LEGO brick has 2 rows of 4 studs.", "Omar stacks 6 of these bricks into a tower.", "How many studs are in the tower?"], step1: { op: "×", a: 2, b: 4, result: 8, label: "2 × 4" }, step2: { op: "×", a: 8, b: 6, result: 48, label: "8 × 6" }, answer: 48 },
  { id: "t1:basketball2x5x4", text: ["A basketball game has 2 teams of 5 players on the court.", "The gym has 4 games going at once.", "How many players are on the courts?"], step1: { op: "×", a: 2, b: 5, result: 10, label: "2 × 5" }, step2: { op: "×", a: 10, b: 4, result: 40, label: "10 × 4" }, answer: 40 },
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
  { id: "t2:teeth4x8quarter", text: ["A grown-up has 4 groups of 8 teeth.", "One quarter of them are incisors, the flat front teeth.", "How many incisors does a grown-up have?"], step1: { op: "×", a: 4, b: 8, result: 32, label: "4 × 8" }, step2: { op: "frac", n: 1, d: 4, quantity: 32, result: 8, label: "1/4 of 32" }, answer: 8 },
  { id: "t2:chessboard8x8half", text: ["A chessboard has 8 rows of 8 squares.", "Half of the squares are dark.", "How many squares are dark?"], step1: { op: "×", a: 8, b: 8, result: 64, label: "8 × 8" }, step2: { op: "frac", n: 1, d: 2, quantity: 64, result: 32, label: "1/2 of 64" }, answer: 32 },
  { id: "t2:faceCards4x3half", text: ["A deck of cards has 4 suits.", "Each suit has 3 face cards: jack, queen and king.", "Half of the face cards are red.", "How many face cards are red?"], step1: { op: "×", a: 4, b: 3, result: 12, label: "4 × 3" }, step2: { op: "frac", n: 1, d: 2, quantity: 12, result: 6, label: "1/2 of 12" }, answer: 6 },
  { id: "t2:muffins3x4third", text: ["Grandma bakes a muffin pan with 3 rows of 4 muffins.", "One third of the muffins are chocolate chip.", "How many are chocolate chip?"], step1: { op: "×", a: 3, b: 4, result: 12, label: "3 × 4" }, step2: { op: "frac", n: 1, d: 3, quantity: 12, result: 4, label: "1/3 of 12" }, answer: 4 },
  { id: "t2:outs9x3third", text: ["A baseball game has 9 innings.", "The Cardinals' pitchers get 3 outs every inning.", "One third of those outs are strikeouts.", "How many strikeouts do the pitchers get?"], step1: { op: "×", a: 9, b: 3, result: 27, label: "9 × 3" }, step2: { op: "frac", n: 1, d: 3, quantity: 27, result: 9, label: "1/3 of 27" }, answer: 9 },
  { id: "t2:eggs3x6half", text: ["A big egg carton has 3 rows of 6 eggs.", "Half of the eggs are brown.", "How many eggs are brown?"], step1: { op: "×", a: 3, b: 6, result: 18, label: "3 × 6" }, step2: { op: "frac", n: 1, d: 2, quantity: 18, result: 9, label: "1/2 of 18" }, answer: 9 },
  { id: "t2:tomatoes4x6third", text: ["A garden bed has 4 rows of 6 tomato plants.", "One third of the plants grow cherry tomatoes.", "How many plants grow cherry tomatoes?"], step1: { op: "×", a: 4, b: 6, result: 24, label: "4 × 6" }, step2: { op: "frac", n: 1, d: 3, quantity: 24, result: 8, label: "1/3 of 24" }, answer: 8 },
  { id: "t2:basketball4x8half", text: ["A high school basketball game has 4 quarters of 8 minutes.", "Maya plays for half of the game.", "How many minutes does Maya play?"], step1: { op: "×", a: 4, b: 8, result: 32, label: "4 × 8" }, step2: { op: "frac", n: 1, d: 2, quantity: 32, result: 16, label: "1/2 of 32" }, answer: 16 },
  { id: "t2:hockey2x6half", text: ["In hockey, each team has 6 players on the ice.", "The Blues and the other team are both playing.", "Half of all the players on the ice are forwards.", "How many forwards are on the ice?"], step1: { op: "×", a: 2, b: 6, result: 12, label: "2 × 6" }, step2: { op: "frac", n: 1, d: 2, quantity: 12, result: 6, label: "1/2 of 12" }, answer: 6 },
  { id: "t2:dice2x6half", text: ["Zoe rolls 2 dice. Each die has 6 sides.", "Half of the sides show an even number.", "How many sides of the 2 dice are even?"], step1: { op: "×", a: 2, b: 6, result: 12, label: "2 × 6" }, step2: { op: "frac", n: 1, d: 2, quantity: 12, result: 6, label: "1/2 of 12" }, answer: 6 },
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
  name: "Connections",
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
