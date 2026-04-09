// Data Manager for JackFlash - Multi-profile storage with migration support
import { DEFAULT_CHILD_SETTINGS, DEFAULT_MASTERY_THRESHOLD, STREAK_MIN_PROBLEMS, SESSION_HISTORY_CAP } from "./constants.js";

const DATA_KEY = "jackflash_data";
const OLD_DATA_KEY = "jackflash_mastery";

// In-memory cache
let _data = null;

// Initialize data from localStorage, migrating if needed
export function initData() {
  if (_data !== null) {
    return _data;
  }

  console.log("[JF] initData: reading from localStorage...");
  try {
    const stored = localStorage.getItem(DATA_KEY);
    if (stored) {
      _data = JSON.parse(stored);
      _migrateV2Purchases();
      console.log("[JF] initData: loaded", _data.profiles?.length, "profiles, onboarding:", _data.onboardingComplete);
      return _data;
    } else {
      console.log("[JF] initData: no data found in localStorage for key:", DATA_KEY);
    }
  } catch (err) {
    console.error("[JF] Failed to load data from localStorage:", err);
  }

  // Check for old format and migrate if needed
  try {
    const oldStored = localStorage.getItem(OLD_DATA_KEY);
    if (oldStored) {
      const oldMastery = JSON.parse(oldStored);
      _data = _createFreshData();

      // Create default profile with migrated mastery
      const defaultProfile = {
        id: crypto.randomUUID(),
        name: "Player 1",
        avatar: "lightning-yellow",
        activeModule: "multiply",
        createdAt: new Date().toISOString(),
        mastery: {
          multiply: _migrateFlatMasteryToStructured(oldMastery),
        },
        dailyStreak: {
          current: 0,
          lastPracticeDate: null,
          longest: 0,
        },
        achievements: [],
        sessionHistory: [],
        settings: { ...DEFAULT_CHILD_SETTINGS },
      };

      _data.profiles = [defaultProfile];
      _data.activeProfileId = defaultProfile.id;

      // Save and remove old key
      saveData();
      localStorage.removeItem(OLD_DATA_KEY);
      return _data;
    }
  } catch (err) {
    console.error("Failed to migrate old data:", err);
  }

  // No data found, create fresh state
  _data = _createFreshData();
  return _data;
}

// Create fresh empty data structure
function _createFreshData() {
  return {
    version: 2,
    onboardingComplete: false,
    activeProfileId: null,
    unlockedModules: ["multiply"],
    purchases: [],
    bundlePurchased: false,
    parentSettings: {
      masteryThreshold: DEFAULT_MASTERY_THRESHOLD,
    },
    profiles: [],
  };
}

// One-time migration from legacy localStorage purchase keys into _data
function _migrateV2Purchases() {
  // Already migrated
  if (_data.purchases !== undefined) return;

  _data.purchases = [];
  _data.bundlePurchased = false;

  // Pull from old separate keys
  try {
    const oldPurchases = JSON.parse(localStorage.getItem("jackflash_purchases") || "[]");
    const oldBundle = localStorage.getItem("jackflash_bundle_purchased") === "true";
    _data.purchases = oldPurchases;
    _data.bundlePurchased = oldBundle;
    localStorage.removeItem("jackflash_purchases");
    localStorage.removeItem("jackflash_bundle_purchased");
    saveData();
  } catch (e) {
    console.error("[JF] Purchase migration failed:", e);
  }
}

// Convert old flat mastery format to new structured format
function _migrateFlatMasteryToStructured(oldMastery) {
  const structured = {};

  Object.entries(oldMastery).forEach(([factKey, count]) => {
    structured[factKey] = {
      correct: count,
      lastSeen: new Date().toISOString(),
    };
  });

  return structured;
}

// Profile CRUD Operations
export function createProfile({ name, avatar, activeModule = "multiply" }) {
  initData();

  const newProfile = {
    id: crypto.randomUUID(),
    name,
    avatar,
    activeModule,
    createdAt: new Date().toISOString(),
    mastery: {
      [activeModule]: {},
    },
    dailyStreak: {
      current: 0,
      lastPracticeDate: null,
      longest: 0,
    },
    achievements: [],
    sessionHistory: [],
    settings: { ...DEFAULT_CHILD_SETTINGS },
  };

  _data.profiles.push(newProfile);
  saveData();
  return newProfile;
}

export function getProfile(profileId) {
  initData();
  return _data.profiles.find((p) => p.id === profileId) || null;
}

export function getActiveProfile() {
  initData();
  if (!_data.activeProfileId) return null;
  return getProfile(_data.activeProfileId);
}

export function setActiveProfile(profileId) {
  initData();
  if (_data.profiles.some((p) => p.id === profileId)) {
    _data.activeProfileId = profileId;
    saveData();
    return true;
  }
  return false;
}

export function updateProfile(profileId, updates) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  Object.assign(profile, updates);
  saveData();
  return profile;
}

export function deleteProfile(profileId) {
  initData();
  _data.profiles = _data.profiles.filter((p) => p.id !== profileId);

  if (_data.activeProfileId === profileId) {
    _data.activeProfileId = _data.profiles.length > 0 ? _data.profiles[0].id : null;
  }

  saveData();
  return true;
}

export function getAllProfiles() {
  initData();
  return _data.profiles;
}

// Mastery Operations
export function getMastery(profileId, moduleId) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  return profile.mastery[moduleId] || null;
}

export function updateMastery(profileId, moduleId, factKey, isCorrect) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  // Ensure module exists in mastery
  if (!profile.mastery[moduleId]) {
    profile.mastery[moduleId] = {};
  }

  // Ensure fact entry exists
  if (!profile.mastery[moduleId][factKey]) {
    profile.mastery[moduleId][factKey] = {
      correct: 0,
      lastSeen: new Date().toISOString(),
    };
  }

  const fact = profile.mastery[moduleId][factKey];

  if (isCorrect) {
    fact.correct += 1;
  } else {
    fact.correct = Math.max(0, fact.correct - 1);
  }

  fact.lastSeen = new Date().toISOString();

  saveData();
  return fact;
}

export function resetMastery(profileId, moduleId) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  profile.mastery[moduleId] = {};
  saveData();
  return true;
}

// Daily Streak Operations
export function updateStreak(profileId, problemCount) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  const today = new Date().toISOString().split("T")[0];
  const streak = profile.dailyStreak;

  // Only count once per calendar day
  if (streak.lastPracticeDate === today) {
    // Already counted today, don't increment
    return streak;
  }

  if (streak.lastPracticeDate === null) {
    // First practice ever
    if (problemCount >= STREAK_MIN_PROBLEMS) {
      streak.current = 1;
      streak.longest = 1;
      streak.lastPracticeDate = today;
    }
  } else {
    // Check if yesterday was the last practice date
    const lastDate = new Date(streak.lastPracticeDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const lastDateStr = streak.lastPracticeDate;
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastDateStr === yesterdayStr) {
      // Streak continues
      if (problemCount >= STREAK_MIN_PROBLEMS) {
        streak.current += 1;
        streak.longest = Math.max(streak.longest, streak.current);
        streak.lastPracticeDate = today;
      }
    } else {
      // Streak broken, start over
      if (problemCount >= STREAK_MIN_PROBLEMS) {
        streak.current = 1;
        streak.lastPracticeDate = today;
      }
    }
  }

  saveData();
  return streak;
}

export function checkStreakOnLaunch(profileId) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  const streak = profile.dailyStreak;
  if (!streak.lastPracticeDate) {
    return streak;
  }

  const today = new Date().toISOString().split("T")[0];
  const lastDate = streak.lastPracticeDate;

  if (lastDate !== today) {
    // Not practicing today yet
    const lastDateObj = new Date(lastDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastDate !== yesterdayStr) {
      // More than 1 day has passed - reset streak
      streak.current = 0;
    }
  }

  saveData();
  return streak;
}

// Session History Operations
export function recordSession(profileId, sessionData) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  const session = {
    ...sessionData,
    recordedAt: new Date().toISOString(),
  };

  profile.sessionHistory.unshift(session);

  // Keep only last 30 sessions
  if (profile.sessionHistory.length > SESSION_HISTORY_CAP) {
    profile.sessionHistory = profile.sessionHistory.slice(0, SESSION_HISTORY_CAP);
  }

  saveData();
  return session;
}

// Achievements Operations
export function unlockAchievement(profileId, achievementId) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  if (!profile.achievements.includes(achievementId)) {
    profile.achievements.push(achievementId);
    saveData();
  }

  return profile.achievements;
}

export function getAchievements(profileId) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  return profile.achievements;
}

// Module Purchases Operations
export function isModuleUnlocked(moduleId) {
  initData();
  return _data.unlockedModules.includes(moduleId);
}

export function unlockModule(moduleId) {
  initData();
  if (!_data.unlockedModules.includes(moduleId)) {
    _data.unlockedModules.push(moduleId);
    saveData();
  }
  return _data.unlockedModules;
}

// Settings Operations
export function getParentSettings() {
  initData();
  return _data.parentSettings;
}

export function updateParentSettings(updates) {
  initData();
  Object.assign(_data.parentSettings, updates);
  saveData();
  return _data.parentSettings;
}

export function getChildSettings(profileId) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  return profile.settings;
}

export function updateChildSettings(profileId, updates) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  Object.assign(profile.settings, updates);
  saveData();
  return profile.settings;
}

// Onboarding Operations
export function isOnboardingComplete() {
  initData();
  return _data.onboardingComplete;
}

export function completeOnboarding() {
  initData();
  _data.onboardingComplete = true;
  saveData();
  return true;
}

// Persistence
export function saveData() {
  if (_data === null) {
    console.warn("saveData called but _data not initialized");
    return false;
  }

  try {
    const json = JSON.stringify(_data);
    console.log("[JF] saveData: writing", (json.length / 1024).toFixed(1), "KB to localStorage");
    localStorage.setItem(DATA_KEY, json);
    // Verify the write actually stuck
    const verify = localStorage.getItem(DATA_KEY);
    if (!verify) {
      console.error("[JF] saveData: FAILED — getItem returned null after setItem");
      return false;
    }
    console.log("[JF] saveData: verified OK");
    return true;
  } catch (err) {
    console.error("[JF] saveData FAILED:", err);
    return false;
  }
}

// Debug utility
export function debugGetAllData() {
  initData();
  return JSON.parse(JSON.stringify(_data));
}

// Purchase State Operations
export function getPurchases() {
  initData();
  return { purchases: _data.purchases, bundlePurchased: _data.bundlePurchased };
}

export function addPurchase(productId) {
  initData();
  if (!_data.purchases.includes(productId)) {
    _data.purchases.push(productId);
    saveData();
  }
}

export function setBundlePurchased() {
  initData();
  _data.bundlePurchased = true;
  saveData();
}

export function isBundlePurchased() {
  initData();
  return _data.bundlePurchased === true;
}
