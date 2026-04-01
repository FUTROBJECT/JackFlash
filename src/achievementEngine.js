import { getAchievements, unlockAchievement, getMastery, getParentSettings } from "./dataManager.js";

// Universal achievements available across all modules
export const UNIVERSAL_ACHIEVEMENTS = [
  {
    id: "first-steps",
    name: "First Steps",
    description: "Complete 10 problems",
    icon: "👣",
    trigger: "sessionTotal",
    params: { count: 10 },
  },
  {
    id: "getting-warm",
    name: "Getting Warm",
    description: "3-problem streak",
    icon: "🔥",
    trigger: "streak",
    params: { count: 3 },
  },
  {
    id: "on-fire",
    name: "On Fire",
    description: "10-problem streak",
    icon: "🔥",
    trigger: "streak",
    params: { count: 10 },
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "25-problem streak",
    icon: "⚡",
    trigger: "streak",
    params: { count: 25 },
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    description: "7-day practice streak",
    icon: "📅",
    trigger: "dailyStreak",
    params: { count: 7 },
  },
  {
    id: "month-master",
    name: "Month Master",
    description: "30-day practice streak",
    icon: "👑",
    trigger: "dailyStreak",
    params: { count: 30 },
  },
  {
    id: "century-club",
    name: "Century Club",
    description: "100 problems in one session",
    icon: "💯",
    trigger: "sessionTotal",
    params: { count: 100 },
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    description: "20 correct in under 60 seconds",
    icon: "⏱️",
    trigger: "speedRun",
    params: { count: 20, seconds: 60 },
  },
];

// Icon mapping for module achievements (multiply module)
const MODULE_ACHIEVEMENT_ICONS = {
  "table-tamer-2": "2️⃣",
  "table-tamer-3": "3️⃣",
  "table-tamer-4": "4️⃣",
  "table-tamer-5": "5️⃣",
  "table-tamer-6": "6️⃣",
  "table-tamer-7": "7️⃣",
  "table-tamer-8": "8️⃣",
  "table-tamer-9": "9️⃣",
  "table-tamer-10": "🔟",
  "group-clear-easy": "⭐",
  "group-clear-medium": "⭐",
  "group-clear-hard": "⭐",
  "multiply-master": "🏆",
  "fact-family-pro": "🔄",
};

/**
 * Check if a trigger condition is met
 * @private
 */
function checkTrigger(triggerType, params, values) {
  switch (triggerType) {
    case "streak":
      return values.streak >= params.count;

    case "sessionTotal":
      return values.sessionTotal >= params.count;

    case "speedRun":
      return (
        values.sessionTotal >= params.count &&
        values.sessionStartTime &&
        Date.now() - values.sessionStartTime <= params.seconds * 1000
      );

    case "dailyStreak":
      return values.dailyStreak && values.dailyStreak.current >= params.count;

    case "masterTable":
      return checkMasterTable(params.table, values.mastery, values.masteryThreshold);

    case "masterGroup":
      return checkMasterGroup(params.group, values.mastery, values.module, values.masteryThreshold);

    case "masterAll":
      return checkMasterAll(values.mastery, values.module, values.masteryThreshold);

    case "divisionCount":
      return checkDivisionCount(params.count, values.mastery);

    default:
      return false;
  }
}

/**
 * Check if all facts for a specific table are mastered
 * @private
 */
function checkMasterTable(table, mastery, threshold) {
  if (!mastery) return false;

  // Check facts for table N: "Nx1" through "Nx10"
  for (let i = 1; i <= 10; i++) {
    const factKey = `${table}x${i}`;
    const factData = mastery[factKey];

    if (!factData || factData.correct < threshold) {
      return false;
    }
  }

  return true;
}

/**
 * Check if all facts in a group are mastered
 * @private
 */
function checkMasterGroup(groupId, mastery, module, threshold) {
  if (!mastery || !module || !module.groups) return false;

  const group = module.groups.find((g) => g.id === groupId);
  if (!group || !group.tables) return false;

  // Check all facts for all tables in the group
  for (const table of group.tables) {
    for (let i = 1; i <= 10; i++) {
      const factKey = `${table}x${i}`;
      const factData = mastery[factKey];

      if (!factData || factData.correct < threshold) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if all facts across all tables (2-10) are mastered
 * @private
 */
function checkMasterAll(mastery, module, threshold) {
  if (!mastery || !module || !module.focusTables) return false;

  // Check all multiplication facts
  for (const table of module.focusTables) {
    for (let i = 1; i <= 10; i++) {
      const factKey = `${table}x${i}`;
      const factData = mastery[factKey];

      if (!factData || factData.correct < threshold) {
        return false;
      }
    }
  }

  // Check all division facts
  // Division facts are for each table from 2-10, with divisors 1-10
  for (const table of module.focusTables) {
    for (let i = 1; i <= 10; i++) {
      const product = table * i;

      // Product ÷ table = i
      const factKey1 = `${product}÷${table}`;
      const factData1 = mastery[factKey1];
      if (!factData1 || factData1.correct < threshold) {
        return false;
      }

      // Product ÷ i = table
      const factKey2 = `${product}÷${i}`;
      const factData2 = mastery[factKey2];
      if (!factData2 || factData2.correct < threshold) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Count how many division facts have correct >= 1
 * @private
 */
function checkDivisionCount(targetCount, mastery) {
  if (!mastery) return false;

  let divisionCount = 0;

  for (const [factKey, factData] of Object.entries(mastery)) {
    if (factKey.includes("÷") && factData && factData.correct >= 1) {
      divisionCount++;
    }
  }

  return divisionCount >= targetCount;
}

/**
 * Check achievements after each answer
 * Returns array of newly unlocked achievement objects (could be 0 or more)
 *
 * @param {Object} options - Options object
 * @param {string} options.profileId - Profile ID
 * @param {string} options.moduleId - Module ID
 * @param {Object} options.module - Module definition object
 * @param {number} options.streak - Current streak count
 * @param {number} options.sessionTotal - Total problems in session
 * @param {number} options.sessionStartTime - Session start timestamp (ms)
 * @param {Object} options.mastery - Mastery data for the module
 * @param {number} options.masteryThreshold - Mastery threshold
 * @returns {Array} Array of newly unlocked achievements
 */
export function checkAfterAnswer({
  profileId,
  moduleId,
  module,
  streak,
  sessionTotal,
  sessionStartTime,
  mastery,
  masteryThreshold,
}) {
  const newlyUnlocked = [];
  const unlockedIds = getAchievements(profileId) || [];

  // Get parent settings for mastery threshold if not provided
  const threshold = masteryThreshold || getParentSettings().masteryThreshold;

  const values = {
    streak,
    sessionTotal,
    sessionStartTime,
    mastery,
    masteryThreshold: threshold,
    module,
    dailyStreak: null, // Not relevant for after-answer checks
  };

  // Check universal achievements
  for (const achievement of UNIVERSAL_ACHIEVEMENTS) {
    if (unlockedIds.includes(achievement.id)) {
      continue; // Already unlocked
    }

    if (checkTrigger(achievement.trigger, achievement.params, values)) {
      unlockAchievement(profileId, achievement.id);
      newlyUnlocked.push({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
      });
    }
  }

  // Check module-specific achievements
  if (module && module.achievements) {
    for (const achievement of module.achievements) {
      if (unlockedIds.includes(achievement.id)) {
        continue; // Already unlocked
      }

      if (checkTrigger(achievement.trigger, achievement.params, values)) {
        unlockAchievement(profileId, achievement.id);

        // Add icon from mapping or use a default
        const icon = MODULE_ACHIEVEMENT_ICONS[achievement.id] || "⭐";

        newlyUnlocked.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon,
        });
      }
    }
  }

  return newlyUnlocked;
}

/**
 * Check achievements after session ends
 * Returns array of newly unlocked achievement objects (could be 0 or more)
 *
 * @param {Object} options - Options object
 * @param {string} options.profileId - Profile ID
 * @param {string} options.moduleId - Module ID
 * @param {Object} options.module - Module definition object
 * @param {Object} options.dailyStreak - Daily streak object with { current, lastPracticeDate, longest }
 * @param {number} options.sessionTotal - Total problems in session
 * @returns {Array} Array of newly unlocked achievements
 */
export function checkAfterSession({ profileId, moduleId, module, dailyStreak, sessionTotal }) {
  const newlyUnlocked = [];
  const unlockedIds = getAchievements(profileId) || [];

  const values = {
    streak: 0,
    sessionTotal,
    sessionStartTime: null,
    mastery: null,
    masteryThreshold: null,
    module,
    dailyStreak,
  };

  // Check only daily-streak based universal achievements
  const dailyStreakAchievements = UNIVERSAL_ACHIEVEMENTS.filter((a) => a.trigger === "dailyStreak");

  for (const achievement of dailyStreakAchievements) {
    if (unlockedIds.includes(achievement.id)) {
      continue; // Already unlocked
    }

    if (checkTrigger(achievement.trigger, achievement.params, values)) {
      unlockAchievement(profileId, achievement.id);
      newlyUnlocked.push({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
      });
    }
  }

  return newlyUnlocked;
}

/**
 * Get all achievements with their unlock status for a profile
 * Combines UNIVERSAL_ACHIEVEMENTS + module.achievements
 *
 * @param {string} profileId - Profile ID
 * @param {Object} module - Module definition object
 * @returns {Array} Array of achievement objects with unlocked: true/false
 */
export function getAllAchievementsForProfile(profileId, module) {
  const unlockedIds = getAchievements(profileId) || [];
  const allAchievements = [];

  // Add universal achievements
  for (const achievement of UNIVERSAL_ACHIEVEMENTS) {
    allAchievements.push({
      ...achievement,
      unlocked: unlockedIds.includes(achievement.id),
    });
  }

  // Add module-specific achievements with icons
  if (module && module.achievements) {
    for (const achievement of module.achievements) {
      const icon = MODULE_ACHIEVEMENT_ICONS[achievement.id] || "⭐";

      allAchievements.push({
        ...achievement,
        icon,
        unlocked: unlockedIds.includes(achievement.id),
      });
    }
  }

  return allAchievements;
}
