// Data Manager for JackFlash - Multi-profile storage with migration support
import { DEFAULT_CHILD_SETTINGS, DEFAULT_MASTERY_THRESHOLD, STREAK_MIN_PROBLEMS, SESSION_HISTORY_CAP, FLUENCY_BASE_MS_MULTIPLY, FLUENCY_MS_PER_DIGIT, AVATARS } from "./constants.js";
import { saveDurable } from "./storage.js";

const DATA_KEY = "jackflash_data";
const OLD_DATA_KEY = "jackflash_mastery";

// Live-session tracking: a gap longer than this splits sittings into separate
// history entries, and each answer only credits a capped amount of "active"
// time (so backgrounding/sleeping the device doesn't inflate durations).
const SESSION_GAP_MS = 30 * 60 * 1000;
const SESSION_ACTIVE_CAP_MS = 2 * 60 * 1000;

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
      const parsed = JSON.parse(stored);
      _data = _normalizeData(parsed);
      _migrateV2Purchases();
      // Heal malformed/partial blobs on disk so the bad shape doesn't persist.
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.profiles)) {
        console.warn("[JF] initData: repaired malformed stored data");
        saveData();
      }

      // Recover any liveSession left dangling by a killed app, and clamp
      // implausible historic durations (e.g. from the old wall-clock bug
      // where a backgrounded/sleeping device inflated durations to hours).
      let repaired = false;
      const MAX_HISTORIC_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
      (_data.profiles || []).forEach((profile) => {
        if (!profile) return;
        if (profile.liveSession) {
          _finalizeLiveSessionOn(profile);
          repaired = true;
        }
        if (Array.isArray(profile.sessionHistory)) {
          profile.sessionHistory.forEach((entry) => {
            if (entry && entry.duration > MAX_HISTORIC_DURATION_MS) {
              entry.duration = MAX_HISTORIC_DURATION_MS;
              repaired = true;
            }
          });
        }
      });
      if (repaired) {
        console.warn("[JF] initData: repaired dangling liveSession(s) and/or clamped implausible durations");
        saveData();
      }

      console.log("[JF] initData: loaded", _data.profiles.length, "profiles, onboarding:", _data.onboardingComplete);
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

// Coerce a parsed blob into a complete, valid data object. Guards against
// partial/corrupted localStorage or older shapes so the app self-heals instead
// of white-screening (e.g. a blob missing the `profiles` array would otherwise
// crash anything that iterates profiles).
function _normalizeData(parsed) {
  const fresh = _createFreshData();
  if (!parsed || typeof parsed !== "object") return fresh;
  const d = { ...fresh, ...parsed };
  if (!Array.isArray(d.profiles)) d.profiles = [];
  if (!Array.isArray(d.unlockedModules)) d.unlockedModules = [...fresh.unlockedModules];
  if (!Array.isArray(d.purchases)) d.purchases = [];
  if (!d.parentSettings || typeof d.parentSettings !== "object") {
    d.parentSettings = { ...fresh.parentSettings };
  }
  // activeProfileId must point at a real profile, otherwise clear it.
  if (d.activeProfileId && !d.profiles.some((p) => p && p.id === d.activeProfileId)) {
    d.activeProfileId = null;
  }
  return d;
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

// Change a profile's avatar (child self-service, from the Profile Picker).
// Validates avatarId against the known set so a bad/typoed id can never get
// persisted and later fail to render.
export function setProfileAvatar(profileId, avatarId) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;
  if (!AVATARS.some((a) => a.id === avatarId)) return null;

  profile.avatar = avatarId;
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
  return _data.profiles || [];
}

// Mastery Operations
export function getMastery(profileId, moduleId) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  return profile.mastery[moduleId] || null;
}

export function updateMastery(profileId, moduleId, factKey, isCorrect, opts = {}) {
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
      attempts: 0,
      lastSeen: null,
      masteredAt: null,
    };
  }

  const fact = profile.mastery[moduleId][factKey];

  // Track total presentations (backward compat: old records won't have this)
  fact.attempts = (fact.attempts || 0) + 1;

  if (isCorrect) {
    // Fluency-gated mastery: a correct answer only *credits* the counter if it
    // clears the speed gate (recall, not finger-counting) and, on the
    // threshold-crossing step, the retrieval finish-line gate (unscaffolded).
    // Evaluate "crossing" BEFORE incrementing.
    const crossing = fact.correct === DEFAULT_MASTERY_THRESHOLD - 1;
    let credited = true;
    if (!opts.masteryGatesExempt) {
      // Gate 1 (speed): waived when responseMs is undefined (legacy callers,
      // conceptual modules that don't pass timing).
      if (opts.responseMs !== undefined) {
        // Fallback for callers that pass timing without a limit: the 2-digit
        // multiply limit (the calibration anchor — see constants.js).
        credited = opts.responseMs <= (opts.fluencyLimitMs ?? FLUENCY_BASE_MS_MULTIPLY + 2 * FLUENCY_MS_PER_DIGIT);
      }
      // Gate 2 (retrieval finish line): only on the threshold-crossing step.
      if (credited && crossing && opts.scaffolded === true) credited = false;
    }
    if (credited) {
      fact.correct += 1;
      // Record when mastery was first achieved
      if (fact.correct >= DEFAULT_MASTERY_THRESHOLD && !fact.masteredAt) {
        fact.masteredAt = new Date().toISOString();
      }
    }
    // Not credited: fact.correct unchanged; attempts/lastSeen still update below.
    fact.lastSeen = new Date().toISOString();
    saveData();
    return { ...fact, credited };
  } else {
    fact.correct = Math.max(0, fact.correct - 1);
    // Dropped below mastery — clear masteredAt so it resets when re-mastered
    if (fact.correct < DEFAULT_MASTERY_THRESHOLD) {
      fact.masteredAt = null;
    }
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

// ---------------------------------------------------------------------------
// Live session tracking (persist-per-answer)
// ---------------------------------------------------------------------------
// Sessions used to be recorded only in a React unmount cleanup, keyed off
// wall-clock time since mount. That silently lost sessions when the app was
// killed (no unmount ever ran) and could merge multiple real sittings into
// one giant entry if the webview stayed alive across a break. Instead, we
// persist a `liveSession` on the profile after every single answer, and only
// convert it into a `sessionHistory` entry once the sitting is over (a real
// gap, a day boundary, a module switch, or an explicit finalize call). This
// makes recovery on next launch possible and keeps active-time honest.

function _sameLocalDay(tsA, tsB) {
  const a = new Date(tsA);
  const b = new Date(tsB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Converts profile.liveSession (if any and non-empty) into a sessionHistory
// entry, using the live session's own lastAnswerAt as recordedAt so a
// late-recovered session still lands on the date it actually happened.
// Does not save — callers are responsible for calling saveData().
function _finalizeLiveSessionOn(profile) {
  const live = profile.liveSession;
  if (live && live.total > 0) {
    profile.sessionHistory.unshift({
      moduleId: live.moduleId,
      correct: live.correct,
      total: live.total,
      duration: live.activeMs,
      recordedAt: new Date(live.lastAnswerAt).toISOString(),
    });

    if (profile.sessionHistory.length > SESSION_HISTORY_CAP) {
      profile.sessionHistory = profile.sessionHistory.slice(0, SESSION_HISTORY_CAP);
    }
  }
  delete profile.liveSession;
}

// Call once per answered problem. Persists immediately so a killed app never
// loses the in-progress sitting.
export function recordAnswerInSession(profileId, moduleId, isCorrect) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  const now = Date.now();
  let live = profile.liveSession;

  if (
    live &&
    (now - live.lastAnswerAt > SESSION_GAP_MS ||
      !_sameLocalDay(live.lastAnswerAt, now) ||
      live.moduleId !== moduleId)
  ) {
    _finalizeLiveSessionOn(profile);
    live = null;
  }

  if (!live) {
    live = { moduleId, correct: 0, total: 0, startedAt: now, lastAnswerAt: now, activeMs: 0 };
    profile.liveSession = live;
  } else {
    live.activeMs += Math.min(now - live.lastAnswerAt, SESSION_ACTIVE_CAP_MS);
    live.lastAnswerAt = now;
  }

  live.total += 1;
  if (isCorrect) live.correct += 1;

  saveData();
  return live;
}

// Call on unmount/navigation-away to close out the current sitting. Cheap
// no-op if there's nothing live.
export function finalizeLiveSession(profileId) {
  initData();
  const profile = getProfile(profileId);
  if (!profile) return null;

  if (profile.liveSession) {
    _finalizeLiveSessionOn(profile);
    saveData();
  }
  return true;
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

// ---------------------------------------------------------------------------
// Preferred CPA mode (per profile, per module)
// ---------------------------------------------------------------------------
// Remembers the mode the child picked so it survives leaving practice and
// coming back (the practice screens keep `mode` in component state, which
// resets on remount). Stored per module so each module keeps its own default
// until the child chooses. Separate from `lockedMode`, which is a parent lock.

export function getPreferredMode(profileId, moduleId) {
  initData();
  const profile = getProfile(profileId);
  const pref = profile?.settings?.preferredMode;
  if (!pref || typeof pref !== "object") return null;
  return pref[moduleId] || null;
}

export function setPreferredMode(profileId, moduleId, mode) {
  initData();
  const profile = getProfile(profileId);
  if (!profile || !moduleId) return null;
  // Older profiles predate this setting — create it on demand.
  if (!profile.settings.preferredMode || typeof profile.settings.preferredMode !== "object") {
    profile.settings.preferredMode = {};
  }
  profile.settings.preferredMode[moduleId] = mode;
  saveData();
  return profile.settings.preferredMode;
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
    saveDurable(json); // mirror to durable native storage (no-op on web)
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
