import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM, DEFAULT_MASTERY_THRESHOLD, AVATARS, FLUENCY_MS_MULTIPLY, FLUENCY_MS_DIVIDE } from "./constants.js";
import multiplyModule from "./modules/multiply.jsx";
import { registerModule, getModule } from "./modules/moduleRegistry.js";
import { initData, getMastery, updateMastery, updateStreak, checkStreakOnLaunch, recordAnswerInSession, finalizeLiveSession, getProfile, updateChildSettings, getPreferredMode, setPreferredMode } from "./dataManager.js";
import { checkAfterAnswer, getAllAchievementsForProfile } from "./achievementEngine.js";
import AchievementPopup from "./AchievementPopup.jsx";
import { isContentAccessible } from "./purchaseManager.js";
import LogoLockup from "./LogoLockup.jsx";


// Register the multiply module on first load
registerModule(multiplyModule);

function NumberBond({ whole, partA, partB, show }) {
  if (!show) return null;
  const w = 160, h = 120;
  const wholeCx = w / 2, wholeCy = 26;
  const leftCx = 32, leftCy = 95;
  const rightCx = w - 32, rightCy = 95;
  const r1 = 24, r2 = 20;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "12px", animation: "fadeSlideUp 0.4s ease both" }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <line x1={wholeCx} y1={wholeCy + r1} x2={leftCx} y2={leftCy - r2} stroke={COLORS.black} strokeWidth="3" />
        <line x1={wholeCx} y1={wholeCy + r1} x2={rightCx} y2={rightCy - r2} stroke={COLORS.black} strokeWidth="3" />
        <circle cx={wholeCx + 3} cy={wholeCy + 3} r={r1} fill={COLORS.black} />
        <circle cx={wholeCx} cy={wholeCy} r={r1} fill={COLORS.yellow} stroke={COLORS.black} strokeWidth="3" />
        <text x={wholeCx} y={wholeCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="16" fontWeight="700" fill={COLORS.black}>{whole}</text>
        <circle cx={leftCx + 2} cy={leftCy + 2} r={r2} fill={COLORS.black} />
        <circle cx={leftCx} cy={leftCy} r={r2} fill={COLORS.blue} stroke={COLORS.black} strokeWidth="3" />
        <text x={leftCx} y={leftCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="14" fontWeight="700" fill={COLORS.black}>{partA}</text>
        <text x={w / 2} y={leftCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="16" fontWeight="700" fill={COLORS.black}>{"×"}</text>
        <circle cx={rightCx + 2} cy={rightCy + 2} r={r2} fill={COLORS.black} />
        <circle cx={rightCx} cy={rightCy} r={r2} fill={COLORS.green} stroke={COLORS.black} strokeWidth="3" />
        <text x={rightCx} y={rightCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="14" fontWeight="700" fill={COLORS.black}>{partB}</text>
      </svg>
    </div>
  );
}

function MasteryDots({ level, max = 3 }) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: "50%",
          backgroundColor: i < level ? COLORS.green : "#E0E0E0",
          border: `2px solid ${COLORS.black}`,
          transition: "background-color 0.3s ease",
        }} />
      ))}
    </div>
  );
}

function BrutalButton({ onClick, children, bg = "white", color = COLORS.black, small = false, active = false, style = {} }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? "7px 14px" : "12px 24px",
      borderRadius: "8px",
      border: BRUTAL_BORDER_SM,
      backgroundColor: bg,
      color,
      fontSize: small ? "13px" : "15px",
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "'Space Mono', monospace",
      boxShadow: active ? "none" : BRUTAL_SHADOW_SM,
      transform: active ? "translate(3px, 3px)" : "none",
      transition: "all 0.1s ease",
      ...style,
    }}>
      {children}
    </button>
  );
}

export default function MultiplicationPractice({ moduleId = "multiply", profileId = null, profileName = "Practice", profileAvatar = null, onBack = null, initialView = "practice" }) {
  // Get the module definition (before hooks so we can use it in initial state)
  const mod = getModule(moduleId);

  // ALL state declarations first (React hooks must be called unconditionally)
  const [localMastery, setLocalMastery] = useState({});
  // enabledTables persists across sessions via profile settings
  // null = all accessible tables; array = only those tables
  const [enabledTables, setEnabledTables] = useState(() => {
    if (profileId) {
      const profile = getProfile(profileId);
      return profile?.settings?.enabledTables || null;
    }
    return null;
  });
  // CPA mode: the child's saved pick (persisted per module), unless a parent
  // has locked it in Parent Zone. `mode` drives scaffoldOpacity below.
  const [pickedMode, setPickedMode] = useState(() => getPreferredMode(profileId, moduleId) || "pictorial");
  const lockedMode = getProfile(profileId)?.settings?.lockedMode || null;
  const mode = lockedMode || pickedMode;
  const [operation, setOperation] = useState(mod?.defaultOperation || "mixed");
  // Per-group operation tab in the progress grid ({ [groupId]: "multiply" | "divide" }).
  const [groupOp, setGroupOp] = useState({});
  const [currentFact, setCurrentFact] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [showScaffold, setShowScaffold] = useState(false);
  const [userHidScaffold, setUserHidScaffold] = useState(false);
  // Concrete-mode builder: groups built (multiply) / groups made (divide) for
  // the current fact. Reset on every new fact and on CPA mode change.
  const [builderGroups, setBuilderGroups] = useState(0);
  const [showSkipCount, setShowSkipCount] = useState(false);
  const [showNumberBond, setShowNumberBond] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [view, setView] = useState(initialView);
  const [streak, setStreak] = useState(0);
  // controls removed from practice view — settings managed via Parent Zone
  const [showArrayButton, setShowArrayButton] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(true);
  // controlsLocked state removed — no longer needed
  const [focusNumber, setFocusNumber] = useState(null);
  const [dailyStreak, setDailyStreak] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [sessionStartTime] = useState(Date.now());
  const inputRef = useRef(null);
  // Fluency timing: when the current fact became answerable (set on focus, not
  // on render — render/focus latency isn't billed to the child).
  const factShownAtRef = useRef(0);

  // Initialize data manager
  useEffect(() => {
    initData();
  }, []);

  // Initialize daily streak on mount
  useEffect(() => {
    if (profileId) {
      const streak = checkStreakOnLaunch(profileId);
      setDailyStreak(streak);
    }
  }, [profileId]);

  // Sessions are now persisted per-answer in the data layer (see
  // recordAnswerInSession below), so they survive the app being killed and
  // don't merge separate sittings together. This unmount effect just closes
  // out the current live session when the child navigates away.
  useEffect(() => {
    return () => { if (profileId) finalizeLiveSession(profileId); };
  }, [profileId]);

  // Get mastery data (either from profile via data manager, or local state)
  const getMasteryData = useCallback(() => {
    if (profileId) {
      const profileMastery = getMastery(profileId, moduleId);
      return profileMastery || {};
    }
    return localMastery;
  }, [profileId, moduleId, localMastery]);

  // Check if a specific table is accessible (must be defined before currentTables)
  const isTableAccessible = useCallback((table) => {
    if (!mod) return false;
    return mod.groups.some(group =>
      group.tables.includes(table) && isContentAccessible(moduleId, group.id)
    );
  }, [mod, moduleId]);

  // Determine current tables — focusNumber overrides, then enabledTables, then all accessible
  const currentTables = mod ? (focusNumber
    ? (isTableAccessible(focusNumber) ? [focusNumber] : [])
    : enabledTables
      ? enabledTables.filter(t => isTableAccessible(t))
      : mod.focusTables.filter(t => isTableAccessible(t))
  ) : [];

  // Generate facts using the module's generateFacts function (memoized to prevent infinite re-render loop)
  const facts = useMemo(() => {
    return mod ? mod.generateFacts({ tables: currentTables, operation }) : [];
  }, [mod, JSON.stringify(currentTables), operation]);

  // Get mastery level for a fact (read from structured format)
  const getMasteryLevel = useCallback((factKey) => {
    const masteryData = getMasteryData();
    return masteryData[factKey]?.correct || 0;
  }, [getMasteryData]);

  // Spaced-repetition review intervals (days) — Leitner-inspired
  // Index = number of correct answers beyond mastery threshold
  const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

  // Pick a new fact using spaced repetition + Singapore Math spiral review
  const pickNewFact = useCallback(() => {
    if (facts.length === 0) {
      setCurrentFact(null);
      return;
    }

    const masteryThreshold = DEFAULT_MASTERY_THRESHOLD;
    const now = Date.now();
    const masteryData = getMasteryData();
    const MAX_NEW_FACTS = 3; // Introduce at most 3 unseen facts at a time

    // Categorize every fact in the current pool
    const scored = facts.map((f) => {
      const record = masteryData[f.factKey];
      const level = record?.correct || 0;
      const attempts = record?.attempts || 0;
      const lastSeen = record?.lastSeen ? new Date(record.lastSeen).getTime() : 0;
      const daysSince = lastSeen ? (now - lastSeen) / (1000 * 60 * 60 * 24) : Infinity;

      if (level >= masteryThreshold) {
        // MASTERED — check if review is due
        const reviewsAfterMastery = level - masteryThreshold;
        const intervalDays = REVIEW_INTERVALS[Math.min(reviewsAfterMastery, REVIEW_INTERVALS.length - 1)];
        const reviewDue = daysSince >= intervalDays;
        return { fact: f, weight: reviewDue ? 4 : 1, category: reviewDue ? "review" : "mastered" };
      }

      if (attempts === 0 && !record?.lastSeen) {
        // NEVER SEEN — will be capped below
        // (check lastSeen too for backward compat with old records that lack attempts)
        return { fact: f, weight: 3, category: "new" };
      }

      if (level === 0) {
        // STRUGGLING — seen but nothing sticking
        return { fact: f, weight: 6, category: "struggling" };
      }

      // LEARNING — partially mastered, weight inversely proportional to progress
      return { fact: f, weight: (masteryThreshold - level + 1) * 2, category: "learning" };
    });

    // Singapore Math principle: don't overwhelm — limit new-fact introductions
    // Only allow MAX_NEW_FACTS unseen facts into the weighted pool at a time
    let newCount = 0;
    let pool = scored.filter((s) => {
      if (s.category === "new") {
        newCount++;
        return newCount <= MAX_NEW_FACTS;
      }
      return true;
    });

    // Anti-repeat guard: never show the same fact twice in a row as long as
    // there is at least one other fact available. Prevents the weighted-random
    // algorithm from picking a dominant-weight fact back-to-back.
    const previousKey = currentFact?.factKey;
    if (previousKey && pool.length > 1) {
      const withoutPrevious = pool.filter((s) => s.fact.factKey !== previousKey);
      if (withoutPrevious.length > 0) pool = withoutPrevious;
    }

    // Weighted random selection
    const totalWeight = pool.reduce((sum, s) => sum + s.weight, 0);
    let r = Math.random() * totalWeight;
    let selected = pool[0]?.fact || null;
    for (const entry of pool) {
      r -= entry.weight;
      if (r <= 0) {
        selected = entry.fact;
        break;
      }
    }

    setCurrentFact(selected);
    setUserAnswer("");
    setFeedback(null);
    setShowScaffold(false);
    setUserHidScaffold(false);
    setShowNumberBond(false);
    setBuilderGroups(0);

    // Finish-line on-ramp: at threshold−1 in pictorial (and not parent-locked),
    // start the scaffold hidden behind "Show me" — a non-punitive invitation
    // to retrieve.
    const rec = getMasteryData()[selected?.factKey];
    if (selected && mode === "pictorial" && !lockedMode && (rec?.correct || 0) === DEFAULT_MASTERY_THRESHOLD - 1) {
      setUserHidScaffold(true);
    }

    setTimeout(() => {
      inputRef.current?.focus();
      factShownAtRef.current = Date.now();
    }, 100);
  }, [facts, getMasteryData, currentFact, mode, lockedMode]);

  // Trigger pickNewFact when enabled tables, focus number, operation, or facts change
  useEffect(() => {
    pickNewFact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledTables, focusNumber, operation, facts]);

  // Toggle a single table on/off and persist to profile
  const toggleTable = useCallback((table) => {
    const allAccessible = mod ? mod.focusTables.filter(t => isTableAccessible(t)) : [];
    setEnabledTables(prev => {
      // If null (all enabled), start from the full accessible list and remove this one
      const current = prev || allAccessible;
      let next;
      if (current.includes(table)) {
        next = current.filter(t => t !== table);
        // Don't allow disabling ALL tables — keep at least one
        if (next.length === 0) return prev;
      } else {
        next = [...current, table].sort((a, b) => a - b);
      }
      // If next matches all accessible tables, store null (meaning "all")
      const isAll = allAccessible.length === next.length && allAccessible.every(t => next.includes(t));
      const toSave = isAll ? null : next;
      // Persist to profile
      if (profileId) {
        updateChildSettings(profileId, { enabledTables: toSave });
      }
      return toSave;
    });
    setFocusNumber(null); // Clear any single-table focus
  }, [mod, isTableAccessible, profileId]);

  // Enable all tables shortcut
  const enableAllTables = useCallback(() => {
    setEnabledTables(null);
    setFocusNumber(null);
    if (profileId) {
      updateChildSettings(profileId, { enabledTables: null });
    }
  }, [profileId]);

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!currentFact || userAnswer === "") return;

    const isCorrect = parseInt(userAnswer) === currentFact.answer;
    const masteryThreshold = DEFAULT_MASTERY_THRESHOLD;

    // Update mastery via data manager if profileId exists, otherwise via local state
    if (profileId) {
      const responseMs = factShownAtRef.current ? Date.now() - factShownAtRef.current : undefined;
      // Scaffolded = a mathematically informative visual VISIBLE at submit time.
      // Pictorial with the scaffold tapped-hidden (userHidScaffold) counts as
      // UNSCAFFOLDED — that's the on-ramp.
      const scaffolded = mode === "concrete" || (mode === "pictorial" && !userHidScaffold) || showScaffold === true;
      const masteryGatesExempt = lockedMode === "concrete" || lockedMode === "pictorial";
      const fluencyLimitMs = currentFact.operation === "divide" ? FLUENCY_MS_DIVIDE : FLUENCY_MS_MULTIPLY;
      if (import.meta.env.DEV) console.debug("[JF] responseMs", currentFact.factKey, responseMs);
      updateMastery(profileId, moduleId, currentFact.factKey, isCorrect, { responseMs, fluencyLimitMs, scaffolded, masteryGatesExempt });
      recordAnswerInSession(profileId, moduleId, isCorrect);
    } else {
      // Anonymous practice (no profileId) is legacy-ungated: a dev-only path,
      // since the shipped app always passes a profile.
      setLocalMastery((prev) => ({
        ...prev,
        [currentFact.factKey]: {
          correct: (prev[currentFact.factKey]?.correct || 0) + (isCorrect ? 1 : 0),
          lastSeen: new Date().toISOString(),
        },
      }));
    }

    setSessionStats((prev) => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));

    // Check achievements after each answer (one-time unlocks like table mastery)
    if (profileId) {
      const profile = getProfile(profileId);
      const newStreak = isCorrect ? streak + 1 : 0;
      const newAchievements = checkAfterAnswer({
        profileId,
        moduleId,
        module: mod,
        streak: newStreak,
        sessionTotal: sessionStats.total + 1,
        sessionStartTime,
        mastery: profile?.mastery?.[moduleId] || {},
        masteryThreshold: DEFAULT_MASTERY_THRESHOLD,
      });
      if (newAchievements.length > 0) {
        setAchievementQueue(prev => [...prev, ...newAchievements]);
      }

      // Repeatable streak milestones — fire every session, not just once
      const streakMilestones = [
        { at: 3, name: "Getting Warm!", icon: "🔥", description: "3 in a row!" },
        { at: 5, name: "On Fire!", icon: "🔥", description: "5 in a row!" },
        { at: 10, name: "Unstoppable!", icon: "⚡", description: "10 in a row!" },
        { at: 25, name: "LEGENDARY!", icon: "👑", description: "25 in a row!" },
      ];
      const milestone = streakMilestones.find(m => m.at === newStreak);
      if (milestone) {
        setAchievementQueue(prev => [...prev, milestone]);
      }
    }

    // Update daily streak once we've hit the minimum problem count
    const newTotal = sessionStats.total + 1;
    if (profileId && newTotal >= 10 && !dailyStreak?.lastPracticeDate?.startsWith(new Date().toISOString().split("T")[0])) {
      const updatedStreak = updateStreak(profileId, newTotal);
      setDailyStreak(updatedStreak);
    }

    if (isCorrect) {
      setStreak((s) => s + 1);
      setFeedback("correct");
      setTimeout(() => pickNewFact(), 900);
    } else {
      setStreak(0);
      setFeedback("incorrect");
      setShowScaffold(true);
    }
  }, [currentFact, userAnswer, profileId, moduleId, pickNewFact, streak, sessionStats, sessionStartTime, mod, mode, lockedMode, userHidScaffold, showScaffold]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      feedback === "incorrect" ? pickNewFact() : handleSubmit();
    }
  };

  // Calculate scaffold opacity based on mastery
  const scaffoldOpacity = mode === "concrete"
    ? 1
    : mode === "pictorial" && currentFact
      ? Math.max(0.15, 1 - getMasteryLevel(currentFact.factKey) * 0.3)
      : 0;

  // For multiply: count by a, b times (e.g. 6×3 → 6, 12, 18)
  // For divide: count by divisor, answer times (e.g. 30÷5=6 → 5, 10, 15, 20, 25, 30)
  const skipFactor = currentFact
    ? (currentFact.operation === "divide" ? currentFact.b : currentFact.a)
    : 1;
  const skipCountVal = currentFact
    ? (currentFact.operation === "divide" ? currentFact.answer : currentFact.b)
    : 1;

  // Check if the current selection has no accessible tables
  const isCurrentGroupLocked = mod ? ((focusNumber && !isTableAccessible(focusNumber))
    || currentTables.length === 0) : false;

  // groupColor removed — controls bar no longer in practice view
  // (per-group progress is now computed inline in the progress grid, per
  //  the selected Multiply/Divide tab.)

  // Get the ScaffoldComponent and HintComponent from the module
  // Use DivisionScaffoldComponent (bar model) for divide, DotArray for multiply
  const MultiplyScaffold = mod?.ScaffoldComponent;
  const DivisionScaffold = mod?.DivisionScaffoldComponent;
  // Concrete-mode interactive builders (docs/multiply-concrete-spec.md)
  const ConcreteMultiply = mod?.ConcreteMultiplyComponent;
  const ConcreteDivide = mod?.ConcreteDivideComponent;
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const HintComponent = mod?.HintComponent;

  // Guard: if module somehow not found, show message (all hooks already called above)
  if (!mod) {
    return <div style={{ padding: "40px", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif" }}>Module not found</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: `repeating-linear-gradient(0deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), repeating-linear-gradient(90deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), ${COLORS.bg}`, fontFamily: "'Space Grotesk', sans-serif", padding: 0, overflow: "auto" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeSlideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes correctPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      {/* Header */}
      <div style={{
        background: COLORS.yellow,
        padding: "calc(env(safe-area-inset-top, 0px) + 14px) clamp(12px, 4vw, 20px) 10px",
        borderBottom: `4px solid ${COLORS.black}`,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {/* Back button, logo lockup, and player avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            {onBack && (
              <button onClick={onBack} style={{
                padding: "6px 8px", borderRadius: "6px", border: BRUTAL_BORDER_SM,
                backgroundColor: "white", color: COLORS.black,
                boxShadow: BRUTAL_SHADOW_SM, cursor: "pointer",
                transition: "all 0.1s ease", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9.5L12 3L21 9.5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9.5Z" stroke={COLORS.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12H15V22" stroke={COLORS.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <LogoLockup size="medium" style={{ flex: 1 }} />
            {profileAvatar && (
              <div style={{
                width: "44px", height: "44px",
                borderRadius: "50%",
                border: BRUTAL_BORDER_SM,
                backgroundColor: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px",
                boxShadow: BRUTAL_SHADOW_SM,
                flexShrink: 0,
              }}>
                {AVATARS.find(a => a.id === profileAvatar)?.emoji || profileAvatar}
              </div>
            )}
          </div>
          {/* Stats row — always visible, shows cumulative + session progress */}
          {(() => {
            const masteryData = getMasteryData();
            const totalFacts = facts.length;
            const masteredFacts = totalFacts > 0 ? facts.filter(f => (masteryData[f.factKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length : 0;
            const masteryPct = totalFacts > 0 ? Math.round((masteredFacts / totalFacts) * 100) : 0;
            return (
              <div style={{ display: "flex", gap: "6px", alignItems: "stretch", marginBottom: "8px", minHeight: "56px" }}>
                {/* Mastery progress — cumulative, persisted */}
                <div style={{
                  flex: 1.5, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  backgroundColor: masteryPct === 100 ? COLORS.green : "white",
                  color: masteryPct === 100 ? "white" : COLORS.black,
                  border: BRUTAL_BORDER_SM, borderRadius: "8px",
                  padding: "8px 12px", boxShadow: BRUTAL_SHADOW_SM,
                  transition: "all 0.3s ease",
                  gap: "3px",
                }}>
                  <span style={{ fontSize: "clamp(14px, 5vw, 20px)", lineHeight: 1, whiteSpace: "nowrap" }}>⭐ {masteredFacts}/{totalFacts}</span>
                  <span style={{ fontSize: "10px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>Mastered</span>
                </div>
                {/* Session score */}
                <div style={{
                  flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  backgroundColor: "white", border: BRUTAL_BORDER_SM, borderRadius: "8px",
                  padding: "8px 4px", boxShadow: BRUTAL_SHADOW_SM,
                  gap: "3px",
                }}>
                  <span style={{ fontSize: "clamp(14px, 5vw, 20px)", lineHeight: 1, whiteSpace: "nowrap" }}>{sessionStats.correct}/{sessionStats.total}</span>
                  <span style={{ fontSize: "10px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>Session</span>
                </div>
                {/* Streak */}
                <div style={{
                  flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  backgroundColor: streak >= 3 ? COLORS.orange : "white",
                  color: streak >= 3 ? "white" : COLORS.black,
                  border: BRUTAL_BORDER_SM, borderRadius: "8px",
                  padding: "8px 4px", boxShadow: BRUTAL_SHADOW_SM,
                  transition: "all 0.2s ease",
                  gap: "3px",
                }}>
                  <span style={{ fontSize: "clamp(14px, 5vw, 20px)", lineHeight: 1, whiteSpace: "nowrap" }}>{"🔥"} {streak}</span>
                  <span style={{ fontSize: "10px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>Streak</span>
                </div>
                {/* Daily streak */}
                {dailyStreak && dailyStreak.current > 0 && (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "10px 10px",
                    background: dailyStreak.current >= 7 ? COLORS.orange : COLORS.cream,
                    border: BRUTAL_BORDER_SM, borderRadius: "8px",
                    fontFamily: "'Space Mono', monospace", fontWeight: 700,
                    color: dailyStreak.current >= 7 ? "white" : COLORS.black,
                    boxShadow: BRUTAL_SHADOW_SM,
                    gap: "3px",
                  }}>
                    <span style={{ fontSize: "20px", lineHeight: 1 }}>
                      {dailyStreak.current >= 30 ? "👑" : "📅"} {dailyStreak.current}
                    </span>
                    <span style={{ fontSize: "10px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>Days</span>
                  </div>
                )}
              </div>
            );
          })()}
          {/* Progress button removed — progress accessed from home screen */}
        </div>
      </div>


      <div style={{ padding: "clamp(24px, 6vw, 40px) clamp(12px, 4vw, 20px) 40px" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        {/* Controls removed — settings managed via Parent Zone */}

        {/* =================== PROGRESS VIEW =================== */}
        {view === "progress" && (
          <div style={{ animation: "fadeSlideUp 0.3s ease both" }}>
            {/* Achievement Gallery */}
            {profileId && (() => {
              const allAchievements = getAllAchievementsForProfile(profileId, mod);
              const earned = allAchievements.filter(a => a.unlocked);
              return (
                <div style={{
                  backgroundColor: "white", borderRadius: "12px", padding: "18px",
                  marginBottom: "14px", border: BRUTAL_BORDER, boxShadow: `5px 5px 0px ${COLORS.yellow}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>
                      Achievements
                    </h3>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", fontWeight: 700 }}>
                      {earned.length}/{allAchievements.length}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                    {allAchievements.map((a) => (
                      <div key={a.id} style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        padding: "10px 4px 8px", borderRadius: "8px",
                        backgroundColor: a.unlocked ? COLORS.cream : "#F5F5F5",
                        border: a.unlocked ? BRUTAL_BORDER_SM : "2px solid #E0E0E0",
                        boxShadow: a.unlocked ? "2px 2px 0px " + COLORS.black : "none",
                        opacity: a.unlocked ? 1 : 0.45,
                        transition: "all 0.2s ease",
                      }}>
                        <div style={{ fontSize: "24px", lineHeight: 1, marginBottom: "4px" }}>
                          {a.unlocked ? a.icon : "🔒"}
                        </div>
                        <div style={{
                          fontSize: "9px", fontFamily: "'Space Mono', monospace",
                          fontWeight: 700, textAlign: "center", lineHeight: 1.2,
                          color: COLORS.black,
                        }}>
                          {a.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Table Toggles — persisted across sessions */}
            <div style={{
              backgroundColor: "white", borderRadius: "12px", padding: "18px",
              marginBottom: "14px", border: BRUTAL_BORDER, boxShadow: BRUTAL_SHADOW,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>
                  Practice Sets
                </h3>
                <button
                  onClick={enableAllTables}
                  style={{
                    padding: "4px 10px", borderRadius: "6px", border: BRUTAL_BORDER_SM,
                    backgroundColor: !enabledTables ? COLORS.yellow : "white",
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: "11px",
                    fontWeight: 700, cursor: "pointer", boxShadow: BRUTAL_SHADOW_SM,
                  }}
                >
                  All On
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {mod.focusTables.map(t => {
                  const accessible = isTableAccessible(t);
                  const active = enabledTables ? enabledTables.includes(t) : true;
                  const groupDef = mod.groups.find(g => g.tables.includes(t));
                  const color = groupDef?.color || COLORS.blue;
                  return (
                    <button
                      key={t}
                      onClick={() => accessible && toggleTable(t)}
                      style={{
                        padding: "10px 14px", borderRadius: "10px",
                        border: BRUTAL_BORDER_SM,
                        backgroundColor: !accessible ? "#F0F0F0" : active ? color : "white",
                        color: COLORS.black,
                        fontFamily: "'Space Mono', monospace", fontSize: "15px",
                        fontWeight: 700, cursor: accessible ? "pointer" : "default",
                        boxShadow: active && accessible ? `3px 3px 0px ${COLORS.black}` : "none",
                        opacity: !accessible ? 0.4 : active ? 1 : 0.5,
                        transition: "all 0.15s ease",
                        minWidth: "52px", textAlign: "center",
                      }}
                    >
                      {!accessible && "🔒 "}{t}s
                    </button>
                  );
                })}
              </div>
              <p style={{
                margin: "12px 0 0 0", fontSize: "11px", color: "#888",
                fontFamily: "'Space Mono', monospace",
              }}>
                Tap to toggle sets on/off — your choices are saved
              </p>
            </div>

            {/* CPA Mode selector — drives how much scaffold shows during practice */}
            <div style={{
              backgroundColor: "white", borderRadius: "12px", padding: "18px",
              marginBottom: "14px", border: BRUTAL_BORDER, boxShadow: BRUTAL_SHADOW,
            }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>
                Practice Mode
              </h3>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { id: "concrete", label: "Concrete", sub: "Touch the math" },
                  { id: "pictorial", label: "Pictorial", sub: "See it fade" },
                  { id: "abstract", label: "Abstract", sub: "Symbols only" },
                ].map(m => (
                  <button key={m.id}
                    disabled={!!lockedMode}
                    onClick={() => { if (lockedMode) return; setPickedMode(m.id); setPreferredMode(profileId, moduleId, m.id); setBuilderGroups(0); }}
                    style={{
                      flex: 1, padding: "10px 6px", borderRadius: "10px", border: BRUTAL_BORDER_SM,
                      backgroundColor: mode === m.id ? COLORS.green : "white",
                      color: COLORS.black,
                      fontFamily: "'Space Mono', monospace", fontSize: "11px", fontWeight: 700,
                      cursor: lockedMode ? "default" : "pointer",
                      opacity: lockedMode && mode !== m.id ? 0.45 : 1,
                      boxShadow: mode === m.id ? "none" : BRUTAL_SHADOW_SM,
                      transition: "all 0.15s ease",
                    }}>
                    {m.label}
                    <div style={{ fontSize: "9px", opacity: 0.7, marginTop: "3px" }}>{m.sub}</div>
                  </button>
                ))}
              </div>
              {lockedMode && (
                <p style={{ margin: "10px 0 0", fontSize: "11px", color: "#888", fontFamily: "'Space Mono', monospace" }}>
                  🔒 Locked by a parent in Parent Zone
                </p>
              )}
            </div>

            {/* Start Practice button */}
            {currentTables.length > 0 && (
              <button
                onClick={() => { setFocusNumber(null); setView("practice"); }}
                style={{
                  width: "100%", padding: "14px", borderRadius: "12px",
                  border: BRUTAL_BORDER, backgroundColor: COLORS.yellow, color: COLORS.black,
                  fontWeight: 700, cursor: "pointer", fontFamily: "'Shrikhand', cursive",
                  fontSize: "16px", boxShadow: BRUTAL_SHADOW, marginBottom: "14px",
                }}
              >
                Practice {enabledTables ? `${currentTables.map(t => `${t}s`).join(", ")}` : "All Tables"}
              </button>
            )}

            {/* Mastery Grids by Group */}
            {mod.groups.map((group) => {
              const accessible = isContentAccessible(moduleId, group.id);
              const op = groupOp[group.id] || "multiply";
              // Distinct facts for this group + selected operation. Dedupe symmetric
              // division facts (e.g. "4÷2" is generated twice) so cells and the
              // count stay clean.
              const seen = new Set();
              const facts = mod.generateFacts({ tables: group.tables, operation: op }).filter((f) => {
                if (seen.has(f.factKey)) return false;
                seen.add(f.factKey);
                return true;
              });
              const totalCount = facts.length;
              const masteredCount = facts.filter((f) => getMasteryLevel(f.factKey) >= DEFAULT_MASTERY_THRESHOLD).length;
              return (
                <div key={group.id} style={{
                  backgroundColor: "white", borderRadius: "12px", padding: "18px",
                  marginBottom: "14px", border: BRUTAL_BORDER,
                  boxShadow: accessible ? `5px 5px 0px ${group.color}` : `5px 5px 0px #CCC`,
                  opacity: accessible ? 1 : 0.7,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>
                      {accessible ? "" : "🔒 "}{group.label}
                    </h3>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", fontWeight: 700 }}>
                      {masteredCount}/{totalCount}
                    </span>
                  </div>
                  {accessible ? (
                    <>
                      {/* Multiply / Divide tabs — same group, both operations */}
                      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                        {[
                          { id: "multiply", label: "Multiply", sym: "×" },
                          { id: "divide", label: "Divide", sym: "÷" },
                        ].map((tab) => {
                          const active = op === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setGroupOp((prev) => ({ ...prev, [group.id]: tab.id }))}
                              style={{
                                flex: 1, padding: "9px 10px", borderRadius: "8px",
                                border: BRUTAL_BORDER_SM,
                                backgroundColor: active ? group.color : "white",
                                color: COLORS.black,
                                fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px",
                                fontWeight: 700, cursor: "pointer",
                                boxShadow: active ? `3px 3px 0px ${COLORS.black}` : "none",
                                opacity: active ? 1 : 0.55,
                                transition: "all 0.15s ease",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                              }}
                            >
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "15px" }}>{tab.sym}</span>
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{
                        height: 12, borderRadius: 6, backgroundColor: "#EEE",
                        border: BRUTAL_BORDER_SM, overflow: "hidden", marginBottom: "14px",
                      }}>
                        <div style={{
                          height: "100%", width: `${totalCount > 0 ? (masteredCount / totalCount) * 100 : 0}%`,
                          backgroundColor: group.color, transition: "width 0.5s ease",
                        }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", marginBottom: "14px" }}>
                        {facts.map((f) => {
                          const level = getMasteryLevel(f.factKey);
                          const mastered = level >= DEFAULT_MASTERY_THRESHOLD;
                          return (
                            <div key={f.factKey} style={{
                              padding: "6px 4px", borderRadius: "6px",
                              backgroundColor: mastered ? group.color : "#F8F8F8",
                              border: mastered ? BRUTAL_BORDER_SM : "2px solid #E0E0E0",
                              textAlign: "center", fontSize: "11px",
                              fontFamily: "'Space Mono', monospace",
                              fontWeight: mastered ? 700 : 400,
                              boxShadow: mastered ? "2px 2px 0px " + COLORS.black : "none",
                            }}>
                              {f.display.replace(/\s/g, "")}
                              <div style={{ marginTop: "3px", display: "flex", justifyContent: "center" }}>
                                <MasteryDots level={Math.min(level, DEFAULT_MASTERY_THRESHOLD)} max={DEFAULT_MASTERY_THRESHOLD} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "12px 0" }}>
                      <div style={{ fontSize: "13px", color: "#888", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "8px" }}>
                        Ask a parent to unlock this group!
                      </div>
                      <div style={{ fontSize: "11px", color: "#AAA", fontFamily: "'Space Mono', monospace" }}>
                        {group.tables.map(t => `${t}s`).join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* =================== PRACTICE VIEW =================== */}
        {view === "practice" && (isCurrentGroupLocked ? (
          <div style={{
            textAlign: "center",
            padding: "40px 20px",
            animation: "fadeSlideUp 0.3s ease both",
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "20px",
              fontWeight: 700,
              color: COLORS.black,
              marginBottom: "8px",
            }}>
              This content is locked
            </div>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "14px",
              color: "#666",
              marginBottom: "20px",
              maxWidth: "280px",
              margin: "0 auto 20px",
            }}>
              Ask a parent to unlock all table groups in the Parent Zone!
            </div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "12px",
              color: "#999",
            }}>
              Free practice: 2s, 5s & 10s
            </div>
          </div>
        ) : currentFact && (
          <div style={{ animation: "fadeSlideUp 0.3s ease both" }}>
            <div style={{
              backgroundColor: "white", borderRadius: "14px", padding: "clamp(16px, 4vw, 32px) clamp(12px, 3vw, 24px) clamp(14px, 3.5vw, 28px)",
              border: BRUTAL_BORDER,
              boxShadow: feedback === "correct" ? `4px 4px 0px ${COLORS.green}` : feedback === "incorrect" ? `4px 4px 0px ${COLORS.red}` : `4px 4px 0px ${COLORS.black}`,
              textAlign: "center",
              animation: feedback === "correct" ? "correctPulse 0.4s ease" : feedback === "incorrect" ? "shake 0.4s ease" : "none",
              transition: "box-shadow 0.3s ease",
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                <MasteryDots level={Math.min(getMasteryLevel(currentFact.factKey), DEFAULT_MASTERY_THRESHOLD)} max={DEFAULT_MASTERY_THRESHOLD} />
              </div>

              {/* Vertical equation — stacked, ones column aligned, centered as a group */}
              {(() => {
                const opSymbol = currentFact.operation === "divide" ? "÷" : "×";
                const opColor = currentFact.operation === "divide" ? COLORS.green : COLORS.orange;
                const numFont = "clamp(72px, 22vw, 150px)";
                const opFont = "clamp(110px, 32vw, 220px)";
                // Pad numbers so they have equal digit count — ones column aligns
                const aStr = String(currentFact.a);
                const bStr = String(currentFact.b);
                const maxLen = Math.max(aStr.length, bStr.length);
                // Pad with invisible but space-occupying characters
                const padA = aStr.padStart(maxLen, '\u2007'); // figure space (same width as a digit)
                const padB = bStr.padStart(maxLen, '\u2007');
                return (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                  }}>
                    {/* Numbers container — right-aligned internally, centered as a block */}
                    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                      {/* First number */}
                      <div style={{
                        fontFamily: "'Shrikhand', cursive", fontSize: numFont, fontWeight: 400,
                        color: COLORS.black, lineHeight: 1, whiteSpace: "pre",
                      }}>
                        {padA}
                      </div>
                      {/* Second number with operator */}
                      <div style={{
                        position: "relative",
                        fontFamily: "'Shrikhand', cursive", fontSize: numFont, fontWeight: 400,
                        color: COLORS.black, lineHeight: 1, whiteSpace: "pre",
                      }}>
                        {/* Operator floats to the left */}
                        <span style={{
                          position: "absolute",
                          right: "calc(100% + clamp(8px, 2.5vw, 18px))",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontFamily: "'Shrikhand', cursive",
                          fontSize: opFont,
                          color: opColor,
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                        }}>
                          {opSymbol}
                        </span>
                        {padB}
                      </div>
                    </div>
                    {/* Divider line */}
                    <div style={{
                      width: "clamp(140px, 55vw, 300px)",
                      height: "5px", backgroundColor: COLORS.black,
                      borderRadius: "2px", marginTop: "10px",
                    }} />
                    {/* Answer input */}
                    <input ref={inputRef} type="number" value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={feedback === "correct"}
                      placeholder="?"
                      style={{
                        width: "clamp(140px, 55vw, 300px)",
                        fontSize: numFont, fontFamily: "'Shrikhand', cursive",
                        fontWeight: 400, textAlign: "center",
                        border: "none", borderRadius: "0",
                        backgroundColor: feedback === "correct" ? COLORS.green : feedback === "incorrect" ? "#FFF0F0" : "transparent",
                        color: COLORS.black, outline: "none",
                        padding: "4px 0", marginTop: "4px",
                        transition: "background-color 0.3s ease",
                        boxSizing: "border-box",
                        caretColor: "transparent",
                      }}
                    />
                  </div>
                );
              })()}

              {/* Concrete: interactive builder — the tap gesture IS the operation
                  (docs/multiply-concrete-spec.md). Pictorial: passive scaffold that
                  fades with mastery. Abstract: nothing (unchanged). */}
              {mode === "concrete" && ConcreteMultiply && ConcreteDivide ? (
                <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
                  {currentFact.operation === "divide" ? (
                    <ConcreteDivide
                      dividend={currentFact.a}
                      divisor={currentFact.b}
                      groupsMade={builderGroups}
                      onMakeGroup={() => setBuilderGroups((g) => Math.min(g + 1, currentFact.answer))}
                      onUndoGroup={() => setBuilderGroups((g) => Math.max(0, g - 1))}
                      revealed={showScaffold}
                      reducedMotion={reducedMotion}
                    />
                  ) : (
                    <ConcreteMultiply
                      a={currentFact.a}
                      b={currentFact.b}
                      groupsBuilt={builderGroups}
                      onAddGroup={() => setBuilderGroups((g) => Math.min(g + 1, currentFact.a))}
                      onRemoveGroup={() => setBuilderGroups((g) => Math.max(0, g - 1))}
                      revealed={showScaffold}
                      reducedMotion={reducedMotion}
                    />
                  )}
                </div>
              ) : mode !== "abstract" && (
                <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
                  {(showScaffold || (!userHidScaffold && scaffoldOpacity > 0)) && (
                    currentFact.operation === "divide" && DivisionScaffold ? (
                      <DivisionScaffold
                        rows={currentFact.a}
                        cols={currentFact.b}
                        opacity={showScaffold ? 1 : scaffoldOpacity}
                        animate={true}
                      />
                    ) : (
                      <MultiplyScaffold
                        rows={currentFact.a}
                        cols={currentFact.b}
                        opacity={showScaffold ? 1 : scaffoldOpacity}
                        animate={true}
                      />
                    )
                  )}
                </div>
              )}
              {mode === "pictorial" && !userHidScaffold && scaffoldOpacity > 0 && (
                <div style={{ marginTop: "6px", fontSize: "11px", fontFamily: "'Space Mono', monospace", opacity: 0.45, fontWeight: 700 }}>
                  {currentFact.operation === "divide"
                    ? `${currentFact.a} split into groups of ${currentFact.b}`
                    : `${currentFact.a} rows × ${currentFact.b} columns`}
                </div>
              )}
              {mode === "pictorial" && userHidScaffold && !feedback && (
                <div style={{ marginTop: "12px", textAlign: "center" }}>
                  <BrutalButton small onClick={() => setUserHidScaffold(false)} bg={COLORS.cream}>
                    Show me
                  </BrutalButton>
                </div>
              )}

              {feedback && (
                <div style={{
                  marginTop: "16px", fontSize: "16px", fontWeight: 700,
                  fontFamily: "'Space Mono', monospace",
                  color: feedback === "correct" ? COLORS.green : COLORS.red,
                  animation: "fadeSlideUp 0.3s ease both",
                }}>
                  {feedback === "correct" ? (
                    streak >= 5 ? "OUTSTANDING! ⚡" : streak >= 3 ? "🔥 STREAK! KEEP GOING!" : ["NICE!", "GOT IT!", "YES!", "CORRECT!", "BOOM!"][Math.floor(Math.random() * 5)]
                  ) : (
                    <span>
                      It's <span style={{
                        backgroundColor: COLORS.yellow, padding: "2px 8px",
                        border: BRUTAL_BORDER_SM, borderRadius: "4px", fontSize: "20px",
                      }}>{currentFact.answer}</span>
                    </span>
                  )}
                </div>
              )}

              {feedback === "incorrect" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
                  {/* Because statement */}
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: "16px", fontWeight: 700,
                    color: COLORS.black, textAlign: "center",
                    backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: "8px",
                    padding: "10px 14px",
                  }}>
                    because {currentFact.a} × {currentFact.b} = {currentFact.answer}
                  </div>

                  {/* Hint component */}
                  <div>
                    <HintComponent factor={skipFactor} count={skipCountVal} show={true} />
                  </div>

                  {/* Number bond */}
                  <div>
                    <NumberBond whole={currentFact.answer} partA={currentFact.a} partB={currentFact.b} show={true} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              {feedback === "incorrect" ? (
                <BrutalButton onClick={pickNewFact} bg={COLORS.yellow}>Next →</BrutalButton>
              ) : feedback !== "correct" ? (
                <BrutalButton onClick={handleSubmit} bg={COLORS.yellow}>Check!</BrutalButton>
              ) : null}
            </div>

            {/* Mode description removed — decluttered practice view */}
          </div>
        ))}
      </div>
      </div>
      {/* Legal/copyright moved to Parent Zone Settings */}
      {achievementQueue.length > 0 && (
        <AchievementPopup
          achievement={achievementQueue[0]}
          onDismiss={() => setAchievementQueue(prev => prev.slice(1))}
        />
      )}
    </div>
  );
}
