import { useState, useEffect, useCallback, useRef } from "react";

const COLORS = {
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

const TABLE_GROUPS = [
  { label: "2s, 5s & 10s", tables: [2, 5, 10], color: COLORS.green },
  { label: "3s & 4s", tables: [3, 4], color: COLORS.orange },
  { label: "6s, 7s, 8s & 9s", tables: [6, 7, 8, 9], color: COLORS.purple },
];

const ALL_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

function generateFacts(tables) {
  const facts = [];
  tables.forEach((t) => {
    for (let i = 1; i <= 10; i++) {
      facts.push({ a: t, b: i, answer: t * i });
    }
  });
  return facts;
}

const BRUTAL_SHADOW = `4px 4px 0px ${COLORS.black}`;
const BRUTAL_SHADOW_SM = `3px 3px 0px ${COLORS.black}`;
const BRUTAL_BORDER = `3px solid ${COLORS.black}`;
const BRUTAL_BORDER_SM = `2.5px solid ${COLORS.black}`;

function DotArray({ rows, cols, opacity = 1, animate = false }) {
  const dotSize = rows * cols > 50 ? 8 : rows * cols > 30 ? 9 : 11;
  const gap = rows * cols > 50 ? 4 : 5;
  return (
    <div
      style={{
        display: "inline-flex", flexDirection: "column", gap: `${gap}px`,
        opacity, transition: "opacity 0.6s ease", maxWidth: "100%", overflow: "hidden",
        background: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: "6px",
        padding: "10px",
      }}
    >
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", gap: `${gap}px` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{
              width: dotSize, height: dotSize, borderRadius: "50%",
              backgroundColor: COLORS.pink, border: `2px solid ${COLORS.black}`,
              animation: animate ? `dotPop 0.3s ease ${(r * cols + c) * 15}ms both` : "none",
              flexShrink: 0,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkipCount({ factor, count, show }) {
  if (!show) return null;
  const steps = Array.from({ length: count }, (_, i) => factor * (i + 1));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginTop: "12px" }}>
      {steps.map((val, i) => (
        <span key={i} style={{
          fontFamily: "'Space Mono', monospace", fontSize: "15px",
          color: i === steps.length - 1 ? COLORS.black : "#888",
          fontWeight: i === steps.length - 1 ? 700 : 400,
          backgroundColor: i === steps.length - 1 ? COLORS.yellow : "transparent",
          padding: i === steps.length - 1 ? "2px 6px" : "0",
          border: i === steps.length - 1 ? BRUTAL_BORDER_SM : "none",
          borderRadius: "4px",
          animation: `fadeSlideUp 0.3s ease ${i * 60}ms both`,
        }}>
          {val}
          {i < steps.length - 1 && <span style={{ color: "#CCC", margin: "0 2px" }}>{"→"}</span>}
        </span>
      ))}
    </div>
  );
}

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

const MASTERY_THRESHOLD = 3;

export default function JackFlash() {
  const [mastery, setMastery] = useState({});
  const [activeGroup, setActiveGroup] = useState(0);
  const [mode, setMode] = useState("pictorial");
  const [operation, setOperation] = useState("multiply");
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
  const [controlsOpen, setControlsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showArrayButton, setShowArrayButton] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(true);
  const [controlsLocked, setControlsLocked] = useState(false);
  const [focusNumber, setFocusNumber] = useState(null);
  const inputRef = useRef(null);

  const currentTables = focusNumber ? [focusNumber] : activeGroup === -1 ? ALL_TABLES : TABLE_GROUPS[activeGroup].tables;
  const facts = generateFacts(currentTables);
  const getMasteryKey = (a, b) => `${a}×${b}`;
  const getMasteryLevel = (a, b) => mastery[getMasteryKey(a, b)]?.correct || 0;

  const pickNewFact = useCallback(() => {
    const weighted = facts.flatMap((f) => {
      const level = getMasteryLevel(f.a, f.b);
      return Array(Math.max(1, MASTERY_THRESHOLD + 1 - level)).fill(f);
    });
    const baseFact = weighted[Math.floor(Math.random() * weighted.length)];
    let op = operation === "divide" ? "divide" : operation === "mixed" ? (Math.random() < 0.5 ? "multiply" : "divide") : "multiply";
    let fact;
    if (op === "divide") {
      const flip = Math.random() < 0.5;
      fact = {
        ...baseFact, op: "divide",
        display: { dividend: baseFact.answer, divisor: flip ? baseFact.b : baseFact.a, quotient: flip ? baseFact.a : baseFact.b },
        correctAnswer: flip ? baseFact.a : baseFact.b,
        arrayRows: baseFact.a, arrayCols: baseFact.b,
      };
    } else {
      fact = { ...baseFact, op: "multiply", correctAnswer: baseFact.answer, arrayRows: baseFact.a, arrayCols: baseFact.b };
    }
    setCurrentFact(fact);
    setUserAnswer("");
    setFeedback(null);
    setShowScaffold(false);
    setUserHidScaffold(false);
    setShowNumberBond(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [facts, mastery, operation]);

  useEffect(() => { pickNewFact(); }, [activeGroup, focusNumber, operation]);

  const handleSubmit = () => {
    if (!currentFact || userAnswer === "") return;
    const isCorrect = parseInt(userAnswer) === currentFact.correctAnswer;
    const key = getMasteryKey(currentFact.a, currentFact.b);
    setMastery((prev) => ({
      ...prev,
      [key]: { correct: (prev[key]?.correct || 0) + (isCorrect ? 1 : 0), attempts: (prev[key]?.attempts || 0) + 1 },
    }));
    setSessionStats((prev) => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));
    if (isCorrect) {
      setStreak((s) => s + 1);
      setFeedback("correct");
      setTimeout(() => pickNewFact(), 900);
    } else {
      setStreak(0);
      setFeedback("incorrect");
      setShowScaffold(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { feedback === "incorrect" ? pickNewFact() : handleSubmit(); }
  };

  const scaffoldOpacity = mode === "concrete" ? 1 : mode === "pictorial" ? (currentFact ? Math.max(0.15, 1 - getMasteryLevel(currentFact.a, currentFact.b) * 0.3) : 1) : 0;
  const skipFactor = currentFact ? currentFact.a : 1;
  const skipCountVal = currentFact ? currentFact.b : 1;
  const groupColor = focusNumber ? COLORS.pink : activeGroup === -1 ? COLORS.blue : TABLE_GROUPS[activeGroup].color;

  const getGroupProgress = (tables) => {
    const gf = generateFacts(tables);
    return { total: gf.length, mastered: gf.filter((f) => getMasteryLevel(f.a, f.b) >= MASTERY_THRESHOLD).length };
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: COLORS.bg, fontFamily: "'Space Grotesk', sans-serif", padding: 0, overflow: "auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Shrikhand&display=swap');
        @keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeSlideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes correctPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      {/* Header */}
      <div style={{
        background: COLORS.yellow, padding: "20px 20px 16px",
        borderBottom: `4px solid ${COLORS.black}`,
      }}>
        <div style={{ maxWidth: 540, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "28px", fontWeight: 400, margin: 0, color: COLORS.black, letterSpacing: "0.5px" }}>
              {"⚡"} JackFlash
            </h1>
            <p style={{ fontSize: "12px", margin: "2px 0 0", fontWeight: 600, fontFamily: "'Space Mono', monospace", color: COLORS.black, opacity: 0.6 }}>
              multiplication & division practice
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {sessionStats.total > 0 && (
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: "14px", fontWeight: 700,
                backgroundColor: "white", border: BRUTAL_BORDER_SM, borderRadius: "6px",
                padding: "6px 10px", boxShadow: BRUTAL_SHADOW_SM,
              }}>
                {sessionStats.correct}/{sessionStats.total}
                {streak >= 3 && <span style={{ display: "block", fontSize: "11px", color: COLORS.orange }}>{"🔥"} {streak}</span>}
              </div>
            )}
            <BrutalButton small onClick={() => {
              if (resetConfirm) { setMastery({}); setSessionStats({ correct: 0, total: 0 }); setStreak(0); setFeedback(null); setResetConfirm(false); pickNewFact(); }
              else { setResetConfirm(true); setTimeout(() => setResetConfirm(false), 3000); }
            }} bg={resetConfirm ? COLORS.red : "white"} color={resetConfirm ? "white" : COLORS.black}>
              {resetConfirm ? "Sure?" : "Reset"}
            </BrutalButton>
            <BrutalButton small onClick={() => setView(view === "progress" ? "practice" : "progress")}
              bg={view === "progress" ? COLORS.blue : "white"}>
              {view === "progress" ? "Practice" : "Progress"}
            </BrutalButton>
            <BrutalButton small onClick={() => setView(view === "about" ? "practice" : "about")}
              bg={view === "about" ? COLORS.pink : "white"} color={view === "about" ? "white" : COLORS.black}>
              ?
            </BrutalButton>
            <BrutalButton small onClick={() => setSettingsOpen(!settingsOpen)}
              bg={settingsOpen ? COLORS.yellow : "white"} style={{ fontSize: "28px", lineHeight: 1, padding: "4px 10px" }}>
              {"⚙"}
            </BrutalButton>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {settingsOpen && (
        <div style={{
          maxWidth: 540, margin: "0 auto", padding: "12px 20px",
          animation: "fadeSlideUp 0.2s ease both",
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "10px", padding: "16px",
            border: BRUTAL_BORDER_SM, boxShadow: BRUTAL_SHADOW_SM,
          }}>
            <div style={{
              fontFamily: "'Shrikhand', cursive", fontSize: "16px", fontWeight: 400,
              marginBottom: "12px", color: COLORS.black,
            }}>
              Settings
            </div>
            {[
              { label: "Show \"Array\" button", value: showArrayButton, toggle: () => setShowArrayButton(!showArrayButton) },
              { label: "Show \"Skip Count\" button", value: showSkipButton, toggle: () => setShowSkipButton(!showSkipButton) },
              { label: "Lock controls bar", value: controlsLocked, toggle: () => { setControlsLocked(!controlsLocked); if (!controlsLocked) setControlsOpen(false); } },
            ].map((setting) => (
              <button key={setting.label} onClick={setting.toggle} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                width: "100%", padding: "10px 12px", marginBottom: "6px",
                borderRadius: "8px", border: BRUTAL_BORDER_SM,
                backgroundColor: setting.value ? COLORS.cream : "white",
                cursor: "pointer", fontFamily: "'Space Mono', monospace",
                fontSize: "12px", fontWeight: 700, color: COLORS.black,
                boxShadow: setting.value ? "none" : BRUTAL_SHADOW_SM,
                transform: setting.value ? "translate(2px, 2px)" : "none",
                transition: "all 0.1s ease",
              }}>
                <span>{setting.label}</span>
                <span style={{
                  width: "36px", height: "20px", borderRadius: "10px",
                  backgroundColor: setting.value ? COLORS.green : "#DDD",
                  border: `2px solid ${COLORS.black}`,
                  position: "relative", display: "inline-block",
                  transition: "background-color 0.2s ease",
                }}>
                  <span style={{
                    position: "absolute", top: "2px",
                    left: setting.value ? "16px" : "2px",
                    width: "12px", height: "12px", borderRadius: "50%",
                    backgroundColor: "white", border: `2px solid ${COLORS.black}`,
                    transition: "left 0.2s ease",
                  }} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "16px 20px 40px" }}>
        {/* Collapsible Controls */}
        {view === "practice" && (
          <>
            {/* Summary bar - always visible */}
            <button onClick={() => { if (!controlsLocked) setControlsOpen(!controlsOpen); }} style={{
              width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", borderRadius: "10px",
              border: BRUTAL_BORDER_SM, backgroundColor: "white",
              boxShadow: BRUTAL_SHADOW_SM, cursor: controlsLocked ? "default" : "pointer",
              marginBottom: controlsOpen ? "12px" : "20px",
              fontFamily: "'Space Mono', monospace", fontSize: "12px", fontWeight: 700,
              color: COLORS.black, transition: "margin-bottom 0.2s ease",
              opacity: controlsLocked ? 0.7 : 1,
            }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{
                  backgroundColor: groupColor, padding: "3px 8px", borderRadius: "4px",
                  border: `2px solid ${COLORS.black}`, fontSize: "11px",
                }}>
                  {focusNumber ? `${focusNumber}s` : activeGroup === -1 ? "All" : TABLE_GROUPS[activeGroup].label}
                </span>
                <span style={{
                  backgroundColor: COLORS.cream, padding: "3px 8px", borderRadius: "4px",
                  border: `2px solid ${COLORS.black}`, fontSize: "11px",
                }}>
                  {mode === "concrete" ? "🧱 Concrete" : mode === "pictorial" ? "✏️ Pictorial" : "🔢 Abstract"}
                </span>
                <span style={{
                  backgroundColor: COLORS.cream, padding: "3px 8px", borderRadius: "4px",
                  border: `2px solid ${COLORS.black}`, fontSize: "11px",
                }}>
                  {operation === "multiply" ? "× Multiply" : operation === "divide" ? "÷ Divide" : "×÷ Mixed"}
                </span>
              </div>
              <span style={{
                fontSize: controlsLocked ? "18px" : "16px", transition: "transform 0.2s ease",
                transform: controlsOpen ? "rotate(180deg)" : "rotate(0deg)",
                flexShrink: 0, marginLeft: "8px",
              }}>
                {controlsLocked ? "🔒" : "▾"}
              </span>
            </button>

            {/* Expanded controls */}
            {controlsOpen && (
              <div style={{ animation: "fadeSlideUp 0.2s ease both", marginBottom: "20px" }}>
                {/* Table Group Selector */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                  {TABLE_GROUPS.map((group, i) => (
                    <BrutalButton key={i} small onClick={() => { setFocusNumber(null); setActiveGroup(i); setView("practice"); }}
                      bg={!focusNumber && activeGroup === i ? group.color : "white"} active={!focusNumber && activeGroup === i} color={COLORS.black}>
                      {group.label}
                    </BrutalButton>
                  ))}
                  <BrutalButton small onClick={() => { setFocusNumber(null); setActiveGroup(-1); setView("practice"); }}
                    bg={!focusNumber && activeGroup === -1 ? COLORS.blue : "white"} active={!focusNumber && activeGroup === -1} color={COLORS.black}>
                    All
                  </BrutalButton>
                </div>

                {/* Single Number Focus */}
                <div style={{ marginBottom: "10px" }}>
                  <div style={{
                    fontSize: "11px", fontFamily: "'Space Mono', monospace", fontWeight: 700,
                    marginBottom: "6px", color: COLORS.black, opacity: 0.5,
                  }}>
                    Focus on a number:
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {ALL_TABLES.map((n) => (
                      <BrutalButton key={n} small onClick={() => {
                        setFocusNumber(n);
                        setActiveGroup(null);
                        setOperation("mixed");
                        setView("practice");
                      }}
                        bg={focusNumber === n ? COLORS.pink : "white"}
                        active={focusNumber === n}
                        color={focusNumber === n ? "white" : COLORS.black}
                        style={{ minWidth: "40px", padding: "7px 10px" }}>
                        {n}s
                      </BrutalButton>
                    ))}
                  </div>
                </div>

                {/* CPA Mode Selector */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                  {[
                    { key: "concrete", label: "🧱 Concrete", desc: "Arrays always" },
                    { key: "pictorial", label: "✏️ Pictorial", desc: "Arrays fade" },
                    { key: "abstract", label: "🔢 Abstract", desc: "Numbers only" },
                  ].map((m) => (
                    <button key={m.key} onClick={() => setMode(m.key)} style={{
                      flex: 1, padding: "8px 6px 6px", borderRadius: "8px",
                      border: BRUTAL_BORDER_SM,
                      backgroundColor: mode === m.key ? COLORS.cream : "white",
                      boxShadow: mode === m.key ? "none" : BRUTAL_SHADOW_SM,
                      transform: mode === m.key ? "translate(2px, 2px)" : "none",
                      cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
                      transition: "all 0.1s ease",
                    }}>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>{m.label}</div>
                      <div style={{ fontSize: "10px", fontWeight: 500, opacity: 0.5, marginTop: "1px" }}>{m.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Operation Toggle */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {[
                    { key: "multiply", label: "× Multiply" },
                    { key: "divide", label: "÷ Divide" },
                    { key: "mixed", label: "×÷ Mixed" },
                  ].map((o) => (
                    <button key={o.key} onClick={() => { setOperation(o.key); setFeedback(null); }} style={{
                      flex: 1, padding: "8px 6px", borderRadius: "8px",
                      border: BRUTAL_BORDER_SM,
                      backgroundColor: operation === o.key ? COLORS.cream : "white",
                      boxShadow: operation === o.key ? "none" : BRUTAL_SHADOW_SM,
                      transform: operation === o.key ? "translate(2px, 2px)" : "none",
                      fontSize: "13px", fontWeight: 700, cursor: "pointer",
                      fontFamily: "'Space Mono', monospace",
                      transition: "all 0.1s ease",
                    }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* =================== ABOUT VIEW =================== */}
        {view === "about" && (
          <div style={{ animation: "fadeSlideUp 0.3s ease both" }}>
            <div style={{
              backgroundColor: "white", borderRadius: "12px", padding: "24px",
              border: BRUTAL_BORDER, boxShadow: `6px 6px 0px ${COLORS.black}`, marginBottom: "16px",
            }}>
              <h2 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "22px", fontWeight: 400, color: COLORS.black, margin: "0 0 4px" }}>
                Why this works for Jack
              </h2>
              <p style={{ fontSize: "12px", fontFamily: "'Space Mono', monospace", margin: "0 0 20px", opacity: 0.5, fontWeight: 700 }}>
                Aligned with think! Mathematics at New City School
              </p>
              <div style={{ fontSize: "14px", color: COLORS.black, lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 16px" }}>
                  New City uses <strong>think! Mathematics</strong>, a Singapore Math curriculum built around one core idea: kids need to <em>understand</em> multiplication before they <em>memorize</em> it. Standard flashcard apps skip straight to memorization. This tool doesn't.
                </p>

                {/* CPA Section */}
                <div style={{ backgroundColor: COLORS.cream, borderRadius: "10px", padding: "16px", marginBottom: "16px", border: BRUTAL_BORDER_SM }}>
                  <h3 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "16px", fontWeight: 400, margin: "0 0 12px" }}>The CPA Progression</h3>
                  <p style={{ margin: "0 0 12px", fontSize: "13px" }}>Singapore Math teaches every concept in three stages. The three modes match exactly:</p>
                  {[
                    { stage: "Concrete", icon: "🧱", color: COLORS.green, school: "In class, Jack uses physical counters and blocks arranged in groups.", app: "Dot arrays are always visible. Jack can count every dot — same strategy, on screen." },
                    { stage: "Pictorial", icon: "✏️", color: COLORS.orange, school: "In class, Jack draws arrays on dot paper and uses bar models.", app: "Arrays start visible but fade as Jack masters each fact. Visual scaffold is there when needed." },
                    { stage: "Abstract", icon: "🔢", color: COLORS.purple, school: "In class, Jack works with equations — symbols on a page.", app: "Pure flashcard mode. \"Show array\" and \"Skip count\" let Jack drop back a stage anytime." },
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
                  <h3 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "16px", fontWeight: 400, margin: "0 0 10px" }}>Same Tools, Same Language</h3>
                  {[
                    { icon: "📐", label: "Dot arrays", desc: "Same rows-and-columns layout as Jack's workbook dot paper." },
                    { icon: "🔗", label: "Number bonds", desc: "Part-whole relationships reinforce that × and ÷ are two views of the same fact." },
                    { icon: "🦘", label: "Skip counting", desc: "Each table introduced through skip counting — the app shows the sequence as a hint." },
                    { icon: "↔️", label: "× ÷ Mixed", desc: "Division as \"thinking of the corresponding multiplication fact\" — exactly how Singapore Math teaches it." },
                  ].map((t) => (
                    <div key={t.label} style={{ display: "flex", gap: "10px", marginBottom: "8px", fontSize: "13px" }}>
                      <span style={{ fontSize: "16px", flexShrink: 0 }}>{t.icon}</span>
                      <span><strong>{t.label}</strong> — {t.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Groups Section */}
                <div style={{ backgroundColor: COLORS.cream, borderRadius: "10px", padding: "16px", marginBottom: "16px", border: BRUTAL_BORDER_SM }}>
                  <h3 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "16px", fontWeight: 400, margin: "0 0 10px" }}>Table Groups Follow the Curriculum</h3>
                  {[
                    { label: "2s, 5s & 10s", desc: "Introduced first — strong skip-counting patterns.", color: COLORS.green },
                    { label: "3s & 4s", desc: "Built on 2s — \"one more group\" reasoning.", color: COLORS.orange },
                    { label: "6s, 7s, 8s & 9s", desc: "Hardest facts, tackled last. Most are already known from earlier tables.", color: COLORS.purple },
                  ].map((g) => (
                    <div key={g.label} style={{
                      backgroundColor: g.color, borderRadius: "6px", padding: "8px 12px",
                      border: BRUTAL_BORDER_SM, marginBottom: "6px", fontSize: "12px", fontWeight: 600,
                    }}>
                      <strong>{g.label}</strong> — {g.desc}
                    </div>
                  ))}
                </div>

                {/* How to use */}
                <div style={{ backgroundColor: COLORS.cream, borderRadius: "10px", padding: "16px", border: BRUTAL_BORDER_SM }}>
                  <h3 style={{ fontFamily: "'Shrikhand', cursive", fontSize: "16px", fontWeight: 400, margin: "0 0 10px" }}>How to Use at Home</h3>
                  <div style={{ fontSize: "13px", lineHeight: 1.7 }}>
                    <p style={{ margin: "0 0 8px" }}><strong>Start in Pictorial mode</strong> — the sweet spot for third grade. Arrays fade with mastery.</p>
                    <p style={{ margin: "0 0 8px" }}><strong>One table group at a time</strong> — match whichever group his class is on. Use "All" for review.</p>
                    <p style={{ margin: "0 0 8px" }}><strong>5 minutes max</strong> — short and frequent beats long and grinding.</p>
                    <p style={{ margin: "0 0 8px" }}><strong>Ask "how could you figure it out?"</strong> — think! Mathematics encourages multiple strategies.</p>
                    <p style={{ margin: "0" }}><strong>Add division when × feels solid</strong> — mixed mode reinforces fact families.</p>
                  </div>
                </div>
              </div>
            </div>
            <BrutalButton onClick={() => setView("practice")} bg={COLORS.yellow} style={{ width: "100%" }}>
              Start Practicing →
            </BrutalButton>
          </div>
        )}

        {/* =================== PROGRESS VIEW =================== */}
        {view === "progress" && (
          <div style={{ animation: "fadeSlideUp 0.3s ease both" }}>
            {TABLE_GROUPS.map((group, gi) => {
              const prog = getGroupProgress(group.tables);
              return (
                <div key={gi} style={{
                  backgroundColor: "white", borderRadius: "12px", padding: "18px",
                  marginBottom: "14px", border: BRUTAL_BORDER, boxShadow: `5px 5px 0px ${group.color}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>
                      {group.label}
                    </h3>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", fontWeight: 700 }}>
                      {prog.mastered}/{prog.total}
                    </span>
                  </div>
                  <div style={{
                    height: 12, borderRadius: 6, backgroundColor: "#EEE",
                    border: BRUTAL_BORDER_SM, overflow: "hidden", marginBottom: "14px",
                  }}>
                    <div style={{
                      height: "100%", width: `${(prog.mastered / prog.total) * 100}%`,
                      backgroundColor: group.color, transition: "width 0.5s ease",
                    }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
                    {group.tables.map((t) =>
                      Array.from({ length: 10 }, (_, i) => i + 1).map((b) => {
                        const level = getMasteryLevel(t, b);
                        const mastered = level >= MASTERY_THRESHOLD;
                        return (
                          <div key={`${t}×${b}`} style={{
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
                              <MasteryDots level={Math.min(level, MASTERY_THRESHOLD)} max={MASTERY_THRESHOLD} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =================== PRACTICE VIEW =================== */}
        {view === "practice" && currentFact && (
          <div style={{ animation: "fadeSlideUp 0.3s ease both" }}>
            <div style={{
              backgroundColor: "white", borderRadius: "14px", padding: "32px 24px 28px",
              border: BRUTAL_BORDER,
              boxShadow: feedback === "correct" ? `6px 6px 0px ${COLORS.green}` : feedback === "incorrect" ? `6px 6px 0px ${COLORS.red}` : `6px 6px 0px ${COLORS.black}`,
              textAlign: "center",
              animation: feedback === "correct" ? "correctPulse 0.4s ease" : feedback === "incorrect" ? "shake 0.4s ease" : "none",
              transition: "box-shadow 0.3s ease",
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <MasteryDots level={Math.min(getMasteryLevel(currentFact.a, currentFact.b), MASTERY_THRESHOLD)} max={MASTERY_THRESHOLD} />
              </div>

              <div style={{
                fontFamily: "'Shrikhand', cursive", fontSize: "56px", fontWeight: 400,
                color: COLORS.black, lineHeight: 1,
              }}>
                {currentFact.op === "divide" ? (
                  <>
                    {currentFact.display.dividend}
                    <span style={{ color: COLORS.pink, fontSize: "42px", margin: "0 4px" }}>{"÷"}</span>
                    {currentFact.display.divisor}
                  </>
                ) : (
                  <>
                    {currentFact.a}
                    <span style={{ color: COLORS.pink, fontSize: "42px", margin: "0 4px" }}>{"×"}</span>
                    {currentFact.b}
                  </>
                )}
              </div>

              {mode !== "abstract" && (
                <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
                  {(showScaffold || (!userHidScaffold && scaffoldOpacity > 0)) && (
                    <DotArray rows={currentFact.arrayRows} cols={currentFact.arrayCols}
                      opacity={showScaffold ? 1 : scaffoldOpacity} animate={true} />
                  )}
                </div>
              )}
              {mode !== "abstract" && !userHidScaffold && scaffoldOpacity > 0 && (
                <div style={{ marginTop: "8px", fontSize: "12px", fontFamily: "'Space Mono', monospace", opacity: 0.5, fontWeight: 700 }}>
                  {currentFact.op === "divide"
                    ? `${currentFact.answer} dots → ${currentFact.arrayRows} rows × ${currentFact.arrayCols} cols`
                    : `${currentFact.a} rows × ${currentFact.b} columns`}
                </div>
              )}

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px" }}>
                <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: "36px", color: "#CCC" }}>=</span>
                <input ref={inputRef} type="number" value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={feedback === "correct"}
                  placeholder="?"
                  style={{
                    width: "110px", fontSize: "36px", fontFamily: "'Shrikhand', cursive",
                    fontWeight: 400, textAlign: "center",
                    border: BRUTAL_BORDER_SM, borderRadius: "8px",
                    backgroundColor: feedback === "correct" ? COLORS.green : feedback === "incorrect" ? "#FFF0F0" : COLORS.cream,
                    color: COLORS.black, outline: "none", padding: "6px 8px",
                    boxShadow: BRUTAL_SHADOW_SM,
                    transition: "background-color 0.3s ease",
                  }}
                />
              </div>

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
                      }}>{currentFact.correctAnswer}</span>
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

                  {/* Skip counting */}
                  <div>
                    <SkipCount factor={skipFactor} count={skipCountVal} show={true} />
                  </div>

                  {/* Number bond */}
                  <div>
                    <NumberBond whole={currentFact.answer} partA={currentFact.a} partB={currentFact.b} show={true} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              {feedback === "incorrect" ? (
                <BrutalButton onClick={pickNewFact} bg={COLORS.yellow}>Next →</BrutalButton>
              ) : feedback !== "correct" ? (
                <>
                  <BrutalButton onClick={handleSubmit} bg={COLORS.yellow}>Check!</BrutalButton>
                  {showArrayButton && mode !== "concrete" && (
                    <BrutalButton small onClick={() => {
                      if (showScaffold || (!userHidScaffold && scaffoldOpacity > 0)) {
                        setShowScaffold(false);
                        setUserHidScaffold(true);
                      } else {
                        setShowScaffold(true);
                        setUserHidScaffold(false);
                      }
                    }}
                      bg={(showScaffold || (!userHidScaffold && scaffoldOpacity > 0)) ? COLORS.blue : "white"}>
                      {(showScaffold || (!userHidScaffold && scaffoldOpacity > 0)) ? "Hide" : "Show"} array
                    </BrutalButton>
                  )}
                  {showSkipButton && (
                    <BrutalButton small onClick={() => setShowSkipCount(!showSkipCount)}
                      bg={showSkipCount ? COLORS.blue : "white"}>
                      Skip count
                    </BrutalButton>
                  )}
                </>
              ) : null}
            </div>

            {showSkipCount && feedback === null && (
              <div style={{
                backgroundColor: "white", borderRadius: "10px", padding: "14px",
                marginTop: "12px", border: BRUTAL_BORDER_SM, boxShadow: BRUTAL_SHADOW_SM,
              }}>
                <div style={{ fontSize: "12px", fontFamily: "'Space Mono', monospace", fontWeight: 700, marginBottom: "6px" }}>
                  Count by {skipFactor}s:
                </div>
                <SkipCount factor={skipFactor} count={skipCountVal} show={true} />
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: "20px", fontSize: "11px", fontFamily: "'Space Mono', monospace", color: "#AAA", lineHeight: 1.5 }}>
              {mode === "concrete" && "🧱 Concrete — arrays always visible so Jack can count the dots."}
              {mode === "pictorial" && "✏️ Pictorial — arrays fade as Jack masters each fact."}
              {mode === "abstract" && "🔢 Abstract — numbers only, like flashcards. Use buttons for help."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
