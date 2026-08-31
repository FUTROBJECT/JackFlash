export const COLORS = {
  bg: "#FFFBEB",
  black: "#1A1A1A",
  pink: "#FF6B9D",
  yellow: "#FFD43B",
  blue: "#4CC9F0",
  green: "#06D6A0",
  orange: "#FF9F1C",
  purple: "#B388FF",
  red: "#FF5252",
  cream: "#FFF8E7",
};

export const BRUTAL_SHADOW = `4px 4px 0px ${COLORS.black}`;
export const BRUTAL_SHADOW_SM = `3px 3px 0px ${COLORS.black}`;
export const BRUTAL_BORDER = `3px solid ${COLORS.black}`;
export const BRUTAL_BORDER_SM = `2.5px solid ${COLORS.black}`;

// Evenly-spaced round-dot divider — the clean separator used in lists/accordions
// (no left-stripe accents). Apply as a style object: <div style={DOTTED_RULE} />.
export const DOTTED_RULE = {
  height: "3px",
  backgroundImage: `radial-gradient(circle, ${COLORS.black} 1.5px, transparent 2px)`,
  backgroundSize: "11px 3px",
  backgroundRepeat: "repeat-x",
  backgroundPosition: "left center",
  opacity: 0.6,
};

// Module brand colors (used on profile cards, module badges, etc.)
export const MODULE_COLORS = {
  multiply: COLORS.green,
  add: "#EF476F",
  fractions: COLORS.orange,
  placeValue: COLORS.purple,
  connections: "#FFB703", // amber/gold capstone color
};

// Avatar definitions for profile creation
export const AVATARS = [
  { id: "robot-blue", label: "Bolt", emoji: "🤖" },
  { id: "robot-red", label: "Rusty", emoji: "🤖" },
  { id: "cat-orange", label: "Marmalade", emoji: "🐱" },
  { id: "dog-brown", label: "Biscuit", emoji: "🐶" },
  { id: "dragon-green", label: "Jade", emoji: "🐉" },
  { id: "unicorn-pink", label: "Glimmer", emoji: "🦄" },
  { id: "bear-brown", label: "Cocoa", emoji: "🐻" },
  { id: "fox-orange", label: "Ember", emoji: "🦊" },
  { id: "owl-purple", label: "Professor", emoji: "🦉" },
  { id: "penguin-blue", label: "Waddle", emoji: "🐧" },
  { id: "lion-yellow", label: "Roary", emoji: "🦁" },
  { id: "lightning-yellow", label: "Zap", emoji: "⚡" },
  { id: "star-gold", label: "Twinkle", emoji: "⭐" },
  { id: "rocket-red", label: "Blaze", emoji: "🚀" },
  { id: "alien-green", label: "Blip", emoji: "👽" },
  { id: "monster-purple", label: "Gus", emoji: "👾" },
];

// Default settings for new child profiles
export const DEFAULT_CHILD_SETTINGS = {
  showScaffoldButton: true,
  showHintButton: true,
  lockedMode: null,
  lockedGroup: null,
  lockedOperation: null,
  // The CPA mode the child last chose, per module id ({ fractions: "concrete" }).
  // Distinct from lockedMode (a parent lock): this just remembers their choice so
  // it survives leaving practice and coming back.
  preferredMode: {},
  enabledTables: null, // null = all accessible tables; array like [2,5,10] = only those
};

// Mastery threshold default
export const DEFAULT_MASTERY_THRESHOLD = 3;

// Fluency-gated mastery: max response time (ms) that credits mastery progress.
// Digit-scaled (curriculum ruling, 2026-08-31): the clock includes typing the
// answer on a touch keypad, so the limit grows with answer length — retrieval
// demand is identical for 6×1 and 10×10, but 1 vs 3 taps is not. Divide is
// mediated by the inverse multiplication fact — the +2000 lives on the base,
// not the per-digit term, because the extra cost is recall, not keystrokes.
// Calibration anchor: 2-digit multiply = 6400ms, within noise of the 6000ms
// flat limit the real learner beat 149 times before this change.
export const FLUENCY_BASE_MS_MULTIPLY = 4000;
export const FLUENCY_BASE_MS_DIVIDE = 6000;
export const FLUENCY_MS_PER_DIGIT = 1200;

// Max response time (ms) that credits mastery for one answer.
export function fluencyLimitMs(operation, answer) {
  const base = operation === "divide" ? FLUENCY_BASE_MS_DIVIDE : FLUENCY_BASE_MS_MULTIPLY;
  return base + FLUENCY_MS_PER_DIGIT * String(answer).length;
}

// Streak minimum problems to count a day
export const STREAK_MIN_PROBLEMS = 10;

// Session history cap
export const SESSION_HISTORY_CAP = 30;
