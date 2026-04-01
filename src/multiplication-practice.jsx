import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM, DEFAULT_MASTERY_THRESHOLD, AVATARS } from "./constants.js";
import multiplyModule from "./modules/multiply.jsx";
import { registerModule, getModule } from "./modules/moduleRegistry.js";
import { initData, getMastery, updateMastery, updateStreak, checkStreakOnLaunch, recordSession, getProfile } from "./dataManager.js";
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

export default function MultiplicationPractice({ moduleId = "multiply", profileId = null, profileName = "Practice", profileAvatar = null, onBack = null }) {
  // Get the module definition (before hooks so we can use it in initial state)
  const mod = getModule(moduleId);

  // ALL state declarations first (React hooks must be called unconditionally)
  const [localMastery, setLocalMastery] = useState({});
  const [activeGroup, setActiveGroup] = useState(0);
  const [mode, setMode] = useState("pictorial");
  const [operation, setOperation] = useState(mod?.defaultOperation || "mixed");
  const [currentFact, setCurrentFact] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [showScaffold, setShowScaffold] = useState(false);
  const [userHidScaffold, setUserHidScaffold] = useState(false);
  const [showSkipCount, setShowSkipCount] = useState(false);
  const [showNumberBond, setShowNumberBond] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [view, setView] = useState("practice");
  const [streak, setStreak] = useState(0);
  const [resetConfirm, setResetConfirm] = useState(false);
  // controls removed from practice view — settings managed via Parent Zone
  const [showArrayButton, setShowArrayButton] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(true);
  // controlsLocked state removed — no longer needed
  const [focusNumber, setFocusNumber] = useState(null);
  const [dailyStreak, setDailyStreak] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [sessionStartTime] = useState(Date.now());
  const inputRef = useRef(null);

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

  // Record session on unmount
  useEffect(() => {
    return () => {
      if (profileId && sessionStats.total > 0) {
        recordSession(profileId, {
          moduleId,
          correct: sessionStats.correct,
          total: sessionStats.total,
          duration: Date.now() - sessionStartTime,
        });
      }
    };
  }, [profileId, moduleId, sessionStats, sessionStartTime]);

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

  // Determine current tables based on focus or active group, filtering for accessibility
  const currentTables = mod ? (focusNumber
    ? (isTableAccessible(focusNumber) ? [focusNumber] : [])
    : activeGroup === -1
      ? mod.focusTables.filter(t => isTableAccessible(t))
      : (activeGroup >= 0 && isContentAccessible(moduleId, mod.groups[activeGroup]?.id)
          ? mod.groups[activeGroup]?.tables || []
          : [])) : [];

  // Generate facts using the module's generateFacts function (memoized to prevent infinite re-render loop)
  const facts = useMemo(() => {
    return mod ? mod.generateFacts({ tables: currentTables, operation }) : [];
  }, [mod, JSON.stringify(currentTables), operation]);

  // Get mastery level for a fact (read from structured format)
  const getMasteryLevel = useCallback((factKey) => {
    const masteryData = getMasteryData();
    return masteryData[factKey]?.correct || 0;
  }, [getMasteryData]);

  // Pick a new fact weighted by mastery
  const pickNewFact = useCallback(() => {
    if (facts.length === 0) {
      setCurrentFact(null);
      return;
    }

    const masteryThreshold = DEFAULT_MASTERY_THRESHOLD;
    const weighted = facts.flatMap((f) => {
      const level = getMasteryLevel(f.factKey);
      return Array(Math.max(1, masteryThreshold + 1 - level)).fill(f);
    });

    setCurrentFact(weighted[Math.floor(Math.random() * weighted.length)] || null);
    setUserAnswer("");
    setFeedback(null);
    setShowScaffold(false);
    setUserHidScaffold(false);
    setShowNumberBond(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [facts, getMasteryLevel]);

  // Trigger pickNewFact when group, focus number, operation, or facts change
  useEffect(() => {
    pickNewFact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, focusNumber, operation, facts]);

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!currentFact || userAnswer === "") return;

    const isCorrect = parseInt(userAnswer) === currentFact.answer;
    const masteryThreshold = DEFAULT_MASTERY_THRESHOLD;

    // Update mastery via data manager if profileId exists, otherwise via local state
    if (profileId) {
      updateMastery(profileId, moduleId, currentFact.factKey, isCorrect);
    } else {
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
  }, [currentFact, userAnswer, profileId, moduleId, pickNewFact, streak, sessionStats, sessionStartTime, mod]);

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

  // Check if the current group/focus is locked
  const isCurrentGroupLocked = mod ? ((focusNumber && !isTableAccessible(focusNumber))
    || (activeGroup >= 0 && !isContentAccessible(moduleId, mod.groups[activeGroup]?.id))) : false;

  // groupColor removed — controls bar no longer in practice view

  // Calculate group progress
  const getGroupProgress = useCallback((tables) => {
    if (!mod) return { total: 0, mastered: 0 };
    const gf = mod.generateFacts({ tables, operation });
    const masteryThreshold = DEFAULT_MASTERY_THRESHOLD;
    return {
      total: gf.length,
      mastered: gf.filter((f) => getMasteryLevel(f.factKey) >= masteryThreshold).length,
    };
  }, [mod, operation, getMasteryLevel]);

  // Get the ScaffoldComponent and HintComponent from the module
  // Use DivisionScaffoldComponent (bar model) for divide, DotArray for multiply
  const MultiplyScaffold = mod?.ScaffoldComponent;
  const DivisionScaffold = mod?.DivisionScaffoldComponent;
  const HintComponent = mod?.HintComponent;

  // Guard: if module somehow not found, show message (all hooks already called above)
  if (!mod) {
    return <div style={{ padding: "40px", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif" }}>Module not found</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: `repeating-linear-gradient(0deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), repeating-linear-gradient(90deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), ${COLORS.bg}`, fontFamily: "'Space Grotesk', sans-serif", padding: 0, overflow: "auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Shrikhand&display=swap');
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
        background: COLORS.yellow, padding: "14px clamp(12px, 4vw, 20px) 10px",
        borderBottom: `4px solid ${COLORS.black}`,
      }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {/* Back button, logo lockup, and player avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            {onBack && (
              <button onClick={onBack} style={{
                padding: "6px 10px", borderRadius: "6px", border: BRUTAL_BORDER_SM,
                backgroundColor: "white", color: COLORS.black,
                boxShadow: BRUTAL_SHADOW_SM, cursor: "pointer",
                fontFamily: "'Space Mono', monospace", fontSize: "16px", fontWeight: 700,
                transition: "all 0.1s ease", flexShrink: 0,
              }}>
                ←
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
              <div style={{ display: "flex", gap: "6px", alignItems: "stretch", marginBottom: "6px" }}>
                {/* Mastery progress — cumulative, persisted */}
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontSize: "11px", fontWeight: 700,
                  backgroundColor: masteryPct === 100 ? COLORS.green : "white",
                  color: masteryPct === 100 ? "white" : COLORS.black,
                  border: BRUTAL_BORDER_SM, borderRadius: "8px",
                  padding: "5px 4px", boxShadow: BRUTAL_SHADOW_SM,
                  transition: "all 0.3s ease",
                }}>
                  <span style={{ fontSize: "14px" }}>⭐ {masteredFacts}/{totalFacts}</span>
                  <span style={{ fontSize: "9px", opacity: 0.6 }}>mastered</span>
                </div>
                {/* Session score */}
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontSize: "11px", fontWeight: 700,
                  backgroundColor: "white", border: BRUTAL_BORDER_SM, borderRadius: "8px",
                  padding: "5px 4px", boxShadow: BRUTAL_SHADOW_SM,
                }}>
                  <span style={{ fontSize: "14px" }}>{sessionStats.correct}/{sessionStats.total}</span>
                  <span style={{ fontSize: "9px", opacity: 0.6 }}>session</span>
                </div>
                {/* Streak */}
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontSize: "11px", fontWeight: 700,
                  backgroundColor: streak >= 3 ? COLORS.orange : "white",
                  color: streak >= 3 ? "white" : COLORS.black,
                  border: BRUTAL_BORDER_SM, borderRadius: "8px",
                  padding: "5px 4px", boxShadow: BRUTAL_SHADOW_SM,
                  transition: "all 0.2s ease",
                }}>
                  <span style={{ fontSize: "14px" }}>{"🔥"} {streak}</span>
                  <span style={{ fontSize: "9px", opacity: 0.6 }}>streak</span>
                </div>
                {/* Daily streak */}
                {dailyStreak && dailyStreak.current > 0 && (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "5px 8px",
                    background: dailyStreak.current >= 7 ? COLORS.orange : COLORS.cream,
                    border: BRUTAL_BORDER_SM, borderRadius: "8px",
                    fontSize: "11px", fontFamily: "'Space Mono', monospace", fontWeight: 700,
                    color: dailyStreak.current >= 7 ? "white" : COLORS.black,
                    boxShadow: BRUTAL_SHADOW_SM,
                  }}>
                    <span style={{ fontSize: "14px" }}>
                      {dailyStreak.current >= 30 ? "👑" : "📅"} {dailyStreak.current}
                    </span>
                    <span style={{ fontSize: "9px", opacity: 0.6 }}>days</span>
                  </div>
                )}
              </div>
            );
          })()}
          {/* Controls row */}
          <div style={{ display: "flex", gap: "6px", alignItems: "stretch" }}>
            <button onClick={() => {
              if (resetConfirm) {
                setLocalMastery({});
                setSessionStats({ correct: 0, total: 0 });
                setStreak(0);
                setFeedback(null);
                setResetConfirm(false);
                pickNewFact();
              } else {
                setResetConfirm(true);
                setTimeout(() => setResetConfirm(false), 3000);
              }
            }} style={{
              flex: 1, padding: "6px 4px", borderRadius: "8px",
              border: BRUTAL_BORDER_SM,
              backgroundColor: resetConfirm ? COLORS.red : "white",
              color: resetConfirm ? "white" : COLORS.black,
              boxShadow: BRUTAL_SHADOW_SM,
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              transition: "all 0.1s ease",
            }}>
              {resetConfirm ? "Sure?" : "Reset"}
            </button>
            <button onClick={() => setView(view === "progress" ? "practice" : "progress")} style={{
              flex: 1, padding: "6px 4px", borderRadius: "8px",
              border: BRUTAL_BORDER_SM,
              backgroundColor: view === "progress" ? COLORS.blue : "white",
              color: COLORS.black,
              boxShadow: view === "progress" ? "none" : BRUTAL_SHADOW_SM,
              transform: view === "progress" ? "translate(2px, 2px)" : "none",
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              transition: "all 0.1s ease",
            }}>
              {view === "progress" ? "Practice" : "Progress"}
            </button>
            <button onClick={() => setView(view === "about" ? "practice" : "about")} style={{
              flex: 1, padding: "6px 4px", borderRadius: "8px",
              border: BRUTAL_BORDER_SM,
              backgroundColor: view === "about" ? COLORS.pink : "white",
              color: view === "about" ? "white" : COLORS.black,
              boxShadow: view === "about" ? "none" : BRUTAL_SHADOW_SM,
              transform: view === "about" ? "translate(2px, 2px)" : "none",
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              transition: "all 0.1s ease",
            }}>
              ?
            </button>
          </div>
        </div>
      </div>


      <div style={{ padding: "clamp(24px, 6vw, 40px) clamp(12px, 4vw, 20px) 40px" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        {/* Controls removed — settings managed via Parent Zone */}

        {/* =================== ABOUT VIEW =================== */}
        {view === "about" && (
          <div style={{ animation: "fadeSlideUp 0.3s ease both" }}>
            <div style={{
              backgroundColor: "white", borderRadius: "12px", padding: "24px",
              border: BRUTAL_BORDER, boxShadow: `6px 6px 0px ${COLORS.black}`, marginBottom: "16px",
            }}>
              <h2 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "22px", fontWeight: 400, color: COLORS.black, margin: "0 0 4px" }}>
                Why JackFlash Works
              </h2>
              <p style={{ fontSize: "12px", fontFamily: "'Space Mono', monospace", margin: "0 0 20px", opacity: 0.5, fontWeight: 700 }}>
                {mod.grades} · Built on the CPA approach
              </p>
              <div style={{ fontSize: "14px", color: COLORS.black, lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 16px" }}>
                  Most math apps separate multiplication and division into different exercises. JackFlash teaches them together as <strong>fact families</strong> — because if you know 6 × 4 = 24, you already know 24 ÷ 4 and 24 ÷ 6. That's how strong curricula teach it, and it's how kids actually build fluency.
                </p>
                <p style={{ margin: "0 0 16px" }}>
                  Under the hood, JackFlash uses the <strong>Concrete → Pictorial → Abstract</strong> progression from Singapore-style math — the same approach used in classrooms worldwide. Kids <em>understand</em> multiplication before they <em>memorize</em> it.
                </p>

                {/* CPA Section */}
                <div style={{ backgroundColor: COLORS.cream, borderRadius: "10px", padding: "16px", marginBottom: "16px", border: BRUTAL_BORDER_SM }}>
                  <h3 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "16px", fontWeight: 400, margin: "0 0 12px" }}>The CPA Progression</h3>
                  <p style={{ margin: "0 0 12px", fontSize: "13px" }}>The CPA approach teaches every concept in three stages. JackFlash's three modes match exactly:</p>
                  {[
                    { stage: "Concrete", icon: "🧱", color: COLORS.green, school: "In the classroom, kids use physical counters and blocks arranged in groups.", app: "Dot arrays are always visible. Your child can count every dot — same strategy, on screen." },
                    { stage: "Pictorial", icon: "✏️", color: COLORS.orange, school: "In the classroom, kids draw arrays on dot paper and use bar models.", app: "Arrays start visible but fade with mastery. The visual scaffold is there when needed." },
                    { stage: "Abstract", icon: "🔢", color: COLORS.purple, school: "In the classroom, kids work with equations — symbols on a page.", app: "Pure flashcard mode. \"Show array\" and \"Skip count\" let your child drop back a stage anytime." },
                  ].map((s) => (
                    <div key={s.stage} style={{
                      backgroundColor: "white", borderRadius: "8px", padding: "12px",
                      borderLeft: `6px solid ${s.color}`, border: BRUTAL_BORDER_SM,
                      boxShadow: BRUTAL_SHADOW_SM, marginBottom: "8px",
                    }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>{s.icon} {s.stage}</div>
                      <div style={{ fontSize: "12px", marginBottom: "4px" }}><strong>At school:</strong> {s.school}</div>
                      <div style={{ fontSize: "12px" }}><strong>In the app:</strong> {s.app}</div>
                    </div>
                  ))}
                </div>

                {/* Tools Section */}
                <div style={{ backgroundColor: COLORS.cream, borderRadius: "10px", padding: "16px", marginBottom: "16px", border: BRUTAL_BORDER_SM }}>
                  <h3 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "16px", fontWeight: 400, margin: "0 0 10px" }}>Real Math Tools, Not Just Flashcards</h3>
                  {[
                    { icon: "📐", label: "Dot arrays", desc: "Rows-and-columns layout matching the dot paper used in classrooms." },
                    { icon: "🔗", label: "Number bonds", desc: "Part-whole relationships reinforce that × and ÷ are two views of the same fact." },
                    { icon: "🦘", label: "Skip counting", desc: "Each table introduced through skip counting — the app shows the sequence as a hint." },
                    { icon: "↔️", label: "× ÷ Mixed", desc: "Division as \"thinking of the corresponding multiplication fact\" — the way strong curricula teach it." },
                  ].map((t) => (
                    <div key={t.label} style={{ display: "flex", gap: "10px", marginBottom: "8px", fontSize: "13px" }}>
                      <span style={{ fontSize: "16px", flexShrink: 0 }}>{t.icon}</span>
                      <span><strong>{t.label}</strong> — {t.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Groups Section */}
                <div style={{ backgroundColor: COLORS.cream, borderRadius: "10px", padding: "16px", marginBottom: "16px", border: BRUTAL_BORDER_SM }}>
                  <h3 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "16px", fontWeight: 400, margin: "0 0 10px" }}>Table Groups Follow How Kids Learn</h3>
                  {mod.groups.map((g) => (
                    <div key={g.id} style={{
                      backgroundColor: g.color, borderRadius: "6px", padding: "8px 12px",
                      border: BRUTAL_BORDER_SM, marginBottom: "6px", fontSize: "12px", fontWeight: 600,
                    }}>
                      <strong>{g.label}</strong> — {g.id === "easy" && "Introduced first — strong skip-counting patterns."}{g.id === "medium" && "Built on 2s — \"one more group\" reasoning."}{g.id === "hard" && "Hardest facts, tackled last. Most are already known from earlier tables."}
                    </div>
                  ))}
                </div>

                {/* How to use */}
                <div style={{ backgroundColor: COLORS.cream, borderRadius: "10px", padding: "16px", border: BRUTAL_BORDER_SM }}>
                  <h3 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "16px", fontWeight: 400, margin: "0 0 10px" }}>How to Use at Home</h3>
                  <div style={{ fontSize: "13px", lineHeight: 1.7 }}>
                    <p style={{ margin: "0 0 8px" }}><strong>Start in Pictorial mode</strong> — the sweet spot for third grade. Arrays fade with mastery.</p>
                    <p style={{ margin: "0 0 8px" }}><strong>One table group at a time</strong> — match whichever group your child's class is on. Use "All" for review.</p>
                    <p style={{ margin: "0 0 8px" }}><strong>5 minutes max</strong> — short and frequent beats long and grinding.</p>
                    <p style={{ margin: "0 0 8px" }}><strong>Ask "how could you figure it out?"</strong> — encourage multiple strategies, not just recall.</p>
                    <p style={{ margin: "0" }}><strong>Add division when × feels solid</strong> — mixed mode reinforces fact families.</p>
                  </div>
                </div>
              </div>
            </div>
            <BrutalButton onClick={() => setView("practice")} bg={COLORS.yellow} style={{ width: "100%" }}>
              Start Practicing →
            </BrutalButton>
            <div style={{
              textAlign: "center", marginTop: "24px", fontSize: "11px",
              fontFamily: "'Space Mono', monospace", color: "#BBB", lineHeight: 1.5,
            }}>
              © 2026 Laser Lab Studios LLC. All rights reserved.
            </div>
          </div>
        )}

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

            {/* Practice All button — shows when 2+ groups are accessible */}
            {mod.groups.filter((g) => isContentAccessible(moduleId, g.id)).length >= 2 && (
              <button
                onClick={() => { setActiveGroup(-1); setFocusNumber(null); setView("practice"); }}
                style={{
                  width: "100%", padding: "14px", borderRadius: "12px",
                  border: BRUTAL_BORDER, backgroundColor: COLORS.yellow, color: COLORS.black,
                  fontWeight: 700, cursor: "pointer", fontFamily: "'Shrikhand', cursive",
                  fontSize: "16px", boxShadow: BRUTAL_SHADOW, marginBottom: "14px",
                }}
              >
                Practice All Tables
              </button>
            )}

            {/* Mastery Grids by Group — tap to practice */}
            {mod.groups.map((group, groupIndex) => {
              const prog = getGroupProgress(group.tables);
              const accessible = isContentAccessible(moduleId, group.id);
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
                      {prog.mastered}/{prog.total}
                    </span>
                  </div>
                  {accessible ? (
                    <>
                      <div style={{
                        height: 12, borderRadius: 6, backgroundColor: "#EEE",
                        border: BRUTAL_BORDER_SM, overflow: "hidden", marginBottom: "14px",
                      }}>
                        <div style={{
                          height: "100%", width: `${(prog.mastered / prog.total) * 100}%`,
                          backgroundColor: group.color, transition: "width 0.5s ease",
                        }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", marginBottom: "14px" }}>
                        {group.tables.map((t) =>
                          Array.from({ length: 10 }, (_, i) => i + 1).map((b) => {
                            const factKey = `${t}x${b}`;
                            const level = getMasteryLevel(factKey);
                            const masteryThreshold = DEFAULT_MASTERY_THRESHOLD;
                            const mastered = level >= masteryThreshold;
                            return (
                              <div key={factKey} style={{
                                padding: "6px 4px", borderRadius: "6px",
                                backgroundColor: mastered ? group.color : "#F8F8F8",
                                border: mastered ? BRUTAL_BORDER_SM : "2px solid #E0E0E0",
                                textAlign: "center", fontSize: "11px",
                                fontFamily: "'Space Mono', monospace",
                                fontWeight: mastered ? 700 : 400,
                                boxShadow: mastered ? "2px 2px 0px " + COLORS.black : "none",
                              }}>
                                {t}×{b}
                                <div style={{ marginTop: "3px", display: "flex", justifyContent: "center" }}>
                                  <MasteryDots level={Math.min(level, masteryThreshold)} max={masteryThreshold} />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <button
                        onClick={() => { setActiveGroup(groupIndex); setFocusNumber(null); setView("practice"); }}
                        style={{
                          width: "100%", padding: "10px", borderRadius: "8px",
                          border: BRUTAL_BORDER_SM, backgroundColor: group.color, color: COLORS.black,
                          fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: "13px", boxShadow: BRUTAL_SHADOW_SM,
                        }}
                      >
                        Practice {group.label}
                      </button>
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
                const numFont = "clamp(72px, 22vw, 150px)";
                const opFont = "clamp(44px, 12vw, 90px)";
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
                          right: "calc(100% + clamp(4px, 1.5vw, 10px))",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: opFont,
                          color: "#999",
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

              {/* Scaffold (bar model / dot array) below the input */}
              {mode !== "abstract" && (
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
              {mode !== "abstract" && !userHidScaffold && scaffoldOpacity > 0 && (
                <div style={{ marginTop: "6px", fontSize: "11px", fontFamily: "'Space Mono', monospace", opacity: 0.45, fontWeight: 700 }}>
                  {currentFact.operation === "divide"
                    ? `${currentFact.a} split into groups of ${currentFact.b}`
                    : `${currentFact.a} rows × ${currentFact.b} columns`}
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
      <div style={{
        textAlign: "center", padding: "16px 20px 24px",
        fontSize: "10px", fontFamily: "'Space Mono', monospace", color: "#CCC",
      }}>
        © 2026 Laser Lab Studios LLC
      </div>
      {achievementQueue.length > 0 && (
        <AchievementPopup
          achievement={achievementQueue[0]}
          onDismiss={() => setAchievementQueue(prev => prev.slice(1))}
        />
      )}
    </div>
  );
}
