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

// Module brand colors (used on profile cards, module badges, etc.)
export const MODULE_COLORS = {
  multiply: COLORS.green,
  add: COLORS.blue,
  fractions: COLORS.orange,
  placeValue: COLORS.purple,
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
};

// Mastery threshold default
export const DEFAULT_MASTERY_THRESHOLD = 3;

// Streak minimum problems to count a day
export const STREAK_MIN_PROBLEMS = 10;

// Session history cap
export const SESSION_HISTORY_CAP = 30;
