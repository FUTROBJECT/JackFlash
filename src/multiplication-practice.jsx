import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM, DEFAULT_MASTERY_THRESHOLD, AVATARS, GUESS_MS, fluencyLimitMs as computeFluencyLimitMs } from "./constants.js";
import multiplyModule from "./modules/multiply.jsx";
import { registerModule, getModule } from "./modules/moduleRegistry.js";
import { initData, getMastery, updateMastery, updateStreak, checkStreakOnLaunch, recordAnswerInSession, recordAssistedInSession, recordPeekInSession, finalizeLiveSession, getProfile, updateChildSettings, getPreferredMode, setPreferredMode } from "./dataManager.js";
import { checkAfterAnswer, getAllAchievementsForProfile } from "./achievementEngine.js";
import AchievementPopup from "./AchievementPopup.jsx";
import { isContentAccessible } from "./purchaseManager.js";
import LogoLockup from "./LogoLockup.jsx";
import { computeSelection, tickErrorWindow, markErrorPriority, clearErrorPriority, dedupeFacts } from "./factSelectionPolicy.js";
import WrongAnswerReveal from "./shared/WrongAnswerReveal.jsx";
import DerivationToken from "./shared/DerivationToken.jsx";


// Register the multiply module on first load
registerModule(multiplyModule);

// ---------------------------------------------------------------------------
// Wrong-answer reveal helpers (docs/wrong-answer-reveal-spec.md).
// NumberBond, HintComponent (SkipCount) and the old appended incorrect block
// they served are gone from this screen — the reveal replaces them. The
// shared NumberBond in src/shared/barComponents.jsx is untouched; Add &
// Fractions still use it legitimately.
// ---------------------------------------------------------------------------

// Deterministic string hash (no Math.random() in render — spec "Header").
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// "Not yet" is invariant; the tail rotates deterministically by a hash of the
// item's factKey (stable for the life of that item, no session-state race).
const HEADER_TAILS = [
  "Not yet. Here's the picture.",
  "Not quite. Look at it.",
  "Not yet — watch this.",
];

// Spellings for the derivation line ("6 sevens: 7, 14, …, [42]").
const PLURAL_WORDS = { 1: "ones", 2: "twos", 3: "threes", 4: "fours", 5: "fives", 6: "sixes", 7: "sevens", 8: "eights", 9: "nines", 10: "tens" };
const SINGULAR_WORDS = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten" };

// The answer token inside the derivation line is DerivationToken, moved to
// src/shared/DerivationToken.jsx (phase 1c "tall arrays") so DotArray's
// totals branch can reuse the same chip for the array's final total when
// the line is folded into the picture. Same API (value, state).

// Rule (Pedagogy → Derivation line): state a step he did not already have.
// Multiply a×b=c: "a bs: b, 2b, …, [c]". Divide c÷b=a: "c in groups of b → [a] groups".
// ---------------------------------------------------------------------------
// Fact-family chip (docs/wrong-answer-reveal-spec.md, "Fact-family chip").
// Shown ONLY on the pre-answer Abstract "Show me" detour, under the picture:
// the members of the current fact's family with the UNKNOWN ROLE blanked in
// every member, so it states the structure ("you know two of the three
// numbers; here is how they relate") without pre-revealing the answer —
// the given numbers are already on the card, the blank is the one being
// asked. R3: a chosen detour may be long; a forced one may not, so this
// never appears in the reveal.
//
// Roles: F1 × F2 = P. A multiply fact a × b asks P; a divide fact a ÷ b is
// P ÷ F1 and asks F2. Squares dedupe (6 × 6 = ▢ appears once).
// ---------------------------------------------------------------------------
function factFamilyMembers(fact) {
  const isDiv = fact.operation === "divide";
  const F1 = isDiv ? fact.b : fact.a;
  const F2 = isDiv ? null : fact.b;   // null = the blank (unknown role)
  const P = isDiv ? fact.a : null;
  const rows = [
    [F1, "×", F2, "=", P],
    [F2, "×", F1, "=", P],
    [P, "÷", F1, "=", F2],
    [P, "÷", F2, "=", F1],
  ];
  const seen = new Set();
  return rows.filter((r) => {
    const key = r.map((t) => (t === null ? "_" : t)).join(" ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function FactFamilyChip({ fact }) {
  const members = factFamilyMembers(fact);
  return (
    <div style={{
      marginTop: "14px", display: "inline-block",
      backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: "8px",
      padding: "8px 14px 10px",
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: "11px", fontWeight: 700,
        letterSpacing: "0.06em", opacity: 0.6, marginBottom: "6px", textAlign: "center",
      }}>
        FACT FAMILY
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: members.length > 2 ? "auto auto" : "auto",
        columnGap: "18px", rowGap: "6px",
        fontFamily: "'Space Mono', monospace", fontSize: "15px", fontWeight: 700,
        color: COLORS.black, whiteSpace: "nowrap",
      }}>
        {members.map((row, i) => (
          <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", justifyContent: "center" }}>
            {row.map((t, j) => (
              t === null
                // Fixed 2ch blank for every member — the chip's width never
                // hints at how many digits the answer has.
                ? <DerivationToken key={j} value="00" state="blank" />
                : <span key={j}>{t}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildDerivationLine(fact, tokenState) {
  if (!fact) return null;
  if (fact.operation === "divide") {
    return (
      <span>
        {fact.a} in groups of {fact.b} {"→"} <DerivationToken value={fact.answer} state={tokenState} /> groups
      </span>
    );
  }
  const word = fact.a === 1 ? (SINGULAR_WORDS[fact.b] || `${fact.b}`) : (PLURAL_WORDS[fact.b] || `${fact.b}s`);
  const steps = Array.from({ length: fact.a }, (_, i) => fact.b * (i + 1));
  const leading = steps.slice(0, -1);
  return (
    <span>
      {fact.a} {word}: {leading.length > 0 ? `${leading.join(", ")}, ` : ""}
      <DerivationToken value={fact.answer} state={tokenState} />
    </span>
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
  // Parent Zone "Lock Operation" (settings.lockedOperation: "multiply" |
  // "divide" | null). Derived, not state — nothing in this screen changes
  // it; the parent does, and the screen remounts per profile. Unknown ids
  // (a stale setting from another module) fall back to the module default.
  const lockedOperation = getProfile(profileId)?.settings?.lockedOperation || null;
  const operation = lockedOperation && (mod?.operations || []).some((o) => o.id === lockedOperation)
    ? lockedOperation
    : (mod?.defaultOperation || "mixed");
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
  // Wrong-answer reveal (docs/wrong-answer-reveal-spec.md). phase:
  // "idle" (no reveal) | "ask" (picture + derivation, re-asking) |
  // "done" (correct re-answer, green beat) | "missed" (second miss, filled +
  // auto-advance). `value` is the re-ask input's own controlled value —
  // entirely separate from `userAnswer` (the first, logged submission).
  const [retry, setRetry] = useState({ phase: "idle", value: "" });
  // Session-scoped miss count, for the header line's deterministic rotation.
  const [missCount, setMissCount] = useState(0);
  // "Not sure" (docs/confidence-pass-spec.md C2): true once the picture has
  // been requested for the CURRENT item (via "Show me" or a converted fast
  // wrong guess) — reset on every new fact. Gates the guess-conversion to
  // once per item, and gates recordPeekInSession on a later correct submit.
  const [pictureRequested, setPictureRequested] = useState(false);
  // Nudge shown under the problem after a converted "not sure" — cleared on
  // the next submit (of any kind) or the next item.
  const [nudge, setNudge] = useState(null);
  // Consecutive unassisted misses (reset by an unassisted correct; the
  // reveal's re-answer never touches it — R1). At 2+ in Abstract mode the
  // "Show me" button pulses: an invitation to look before answering, not a
  // penalty — the picture is never forced (docs/wrong-answer-reveal-spec.md,
  // "Show me pulse").
  const [missRun, setMissRun] = useState(0);
  // 0 = picture only, 1 = derivation line shown (numeral), 2 = blank chip +
  // live re-ask input. Driven by timers keyed off retry.phase === "ask".
  const [revealStage, setRevealStage] = useState(0);
  const inputRef = useRef(null);
  // Fluency timing: when the current fact became answerable (set on focus, not
  // on render — render/focus latency isn't billed to the child).
  const factShownAtRef = useRef(0);
  // Error-priority window (docs/fact-selection-policy.md §8): in-memory only,
  // { [factKey]: drawsRemaining }. Not persisted, discarded on unmount.
  const errorWindowRef = useRef({});
  // Comeback slot (spec "Comeback slot"): a queue of second-miss facts due
  // back within 3–5 draws, bypassing the weighted draw. Session-scoped, not
  // persisted — a plain ref since it never drives its own render.
  const comebackQueueRef = useRef([]);
  // Pending pickNewFact() timeout from the retry flow (done → 900ms, missed →
  // 2500ms) — cleared when the child advances early via Enter.
  const advanceTimeoutRef = useRef(null);
  // Comeback Kid tracking (docs/confidence-pass-spec.md C3): factKeys logged
  // as a miss THIS session, session-scoped (cleared implicitly — a fresh Set
  // on mount, never persisted). A later unassisted correct on a key in this
  // set removes it and counts once toward the achievement.
  const missedKeysRef = useRef(new Set());
  const comebacksRef = useRef(0);

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

  // Pick a new fact using the fact-selection policy: category budgets +
  // within-category weights, a gated introduction frontier, an anti-repeat
  // guard, a per-fact ceiling, and an in-memory error-priority window.
  // See docs/fact-selection-policy.md — the pipeline itself lives in
  // src/factSelectionPolicy.js so it can be driven by both this component
  // and the Node acceptance-criteria simulation.
  const pickNewFact = useCallback(() => {
    // A fresh draw closes out any pending retry-flow auto-advance timer.
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }

    if (facts.length === 0) {
      setCurrentFact(null);
      setRetry({ phase: "idle", value: "" });
      return;
    }

    const masteryThreshold = DEFAULT_MASTERY_THRESHOLD;
    const masteryData = getMasteryData();

    // Error-priority window: decrement before this draw so a missed fact's
    // elevated priority (spec §8) fades out over roughly its next 10 draws.
    tickErrorWindow(errorWindowRef);

    // Comeback slot (docs/wrong-answer-reveal-spec.md "Comeback slot"): a
    // second-miss fact is due back within 3–5 draws — pre-check before the
    // weighted draw, bypassing it and the anti-repeat guard. "Draws" means
    // calls to pickNewFact, so the countdown decrements once, right here,
    // every time (whether or not the front entry ends up serving this turn).
    let selected = null;
    if (comebackQueueRef.current.length > 0) {
      const queue = comebackQueueRef.current.map((entry) => ({ ...entry, dueIn: entry.dueIn - 1 }));
      const front = queue[0];
      if (front.dueIn <= 0) {
        const match = facts.find((f) => f.factKey === front.factKey);
        comebackQueueRef.current = queue.slice(1);
        // If the fact vanished (its table got toggled off mid-session), just
        // drop it and fall through to an ordinary weighted draw this turn.
        if (match) selected = match;
      } else {
        comebackQueueRef.current = queue;
      }
    }

    if (!selected) {
      // Exclude any fact still waiting on its comeback turn from the ordinary
      // weighted draw. Without this, a queued fact could be re-drawn early —
      // the very miss that queued it also called markErrorPriority, which
      // boosts its within-category weight ×4 in computeSelection for up to
      // ERROR_WINDOW_DRAWS draws, so the regular pipeline could (and did:
      // measured a 2×2 comeback served on the 2nd draw against a 3–5 offset)
      // resurface it before the guaranteed offset above ever reached zero.
      const pendingComebackKeys = new Set(comebackQueueRef.current.map((entry) => entry.factKey));
      const candidateFacts = pendingComebackKeys.size > 0
        ? facts.filter((f) => !pendingComebackKeys.has(f.factKey))
        : facts;
      const result = computeSelection({
        facts: candidateFacts.length > 0 ? candidateFacts : facts,
        masteryData,
        prevKey: currentFact?.factKey,
        operation,
        errorWindow: errorWindowRef.current,
        threshold: masteryThreshold,
      });
      selected = result.selected;
    }

    setCurrentFact(selected);
    setUserAnswer("");
    setFeedback(null);
    setShowScaffold(false);
    setUserHidScaffold(false);
    setBuilderGroups(0);
    setRetry({ phase: "idle", value: "" });
    setPictureRequested(false);
    setNudge(null);

    // Finish-line on-ramp: at threshold−1 in pictorial (and not parent-locked),
    // start the scaffold hidden behind "Show me" — a non-punitive invitation
    // to retrieve.
    const rec = getMasteryData()[selected?.factKey];
    if (selected && mode === "pictorial" && !lockedMode && (rec?.correct || 0) === DEFAULT_MASTERY_THRESHOLD - 1) {
      setUserHidScaffold(true);
    }

    setTimeout(() => {
      // preventScroll + scroll home: iOS keyboard-avoidance scrolls the page on
      // focus even when the input is already visible, which shoves the sticky
      // header's safe-area zone up behind the Dynamic Island on every new fact.
      inputRef.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      factShownAtRef.current = Date.now();
    }, 100);
  }, [facts, getMasteryData, currentFact, mode, lockedMode, operation]);

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
    const responseMs = factShownAtRef.current ? Date.now() - factShownAtRef.current : undefined;

    // C2 "Not sure" (docs/confidence-pass-spec.md): a wrong answer submitted
    // before GUESS_MS, before the picture was requested, is treated as "not
    // sure" rather than a miss — nothing is logged (no updateMastery, no
    // recordAnswerInSession, no sessionStats, no streak change, no
    // achievements, no missCount/missRun). Converts at most once per item —
    // once the picture is up (pictureRequested), a wrong answer is a real
    // miss (below). responseMs === undefined never converts.
    if (!isCorrect && !pictureRequested && responseMs !== undefined && responseMs < GUESS_MS) {
      setShowScaffold(true);
      setPictureRequested(true);
      setNudge("notSure");
      setUserAnswer("");
      return;
    }
    setNudge(null);

    // Error-priority window (docs/fact-selection-policy.md §8): a missed fact
    // returns within ~6 draws via a ×4 within-category weight boost; a correct
    // answer clears it immediately rather than waiting for the window to expire.
    if (isCorrect) {
      clearErrorPriority(errorWindowRef, currentFact.factKey);
    } else {
      markErrorPriority(errorWindowRef, currentFact.factKey);
    }

    // Update mastery via data manager if profileId exists, otherwise via local state
    if (profileId) {
      // Scaffolded = a mathematically informative visual VISIBLE at submit time.
      // Pictorial with the scaffold tapped-hidden (userHidScaffold) counts as
      // UNSCAFFOLDED — that's the on-ramp.
      const scaffolded = mode === "concrete" || (mode === "pictorial" && !userHidScaffold) || showScaffold === true;
      const masteryGatesExempt = lockedMode === "concrete" || lockedMode === "pictorial";
      const fluencyLimitMs = computeFluencyLimitMs(currentFact.operation, currentFact.answer);
      if (import.meta.env.DEV) console.debug("[JF] responseMs", currentFact.factKey, responseMs);
      updateMastery(profileId, moduleId, currentFact.factKey, isCorrect, { responseMs, fluencyLimitMs, scaffolded, masteryGatesExempt });
      recordAnswerInSession(profileId, moduleId, isCorrect);
      // Confidence pass C2: a later correct submit after the picture was
      // requested (either "Show me" or a converted guess) — parent-facing
      // "peeked" count only, same footing as recordAssistedInSession.
      if (isCorrect && pictureRequested) {
        recordPeekInSession(profileId, moduleId);
      }
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

    // Confidence pass C3: Comeback Kid — a fact logged as a miss earlier THIS
    // session, now answered correctly unassisted (this IS the unassisted
    // path — the reveal's re-answer never reaches here). Counts once, then
    // leaves the set (re-missing and re-recovering the same fact counts again).
    if (isCorrect && missedKeysRef.current.has(currentFact.factKey)) {
      missedKeysRef.current.delete(currentFact.factKey);
      comebacksRef.current += 1;
    } else if (!isCorrect) {
      missedKeysRef.current.add(currentFact.factKey);
    }

    // Check achievements after each answer (one-time unlocks like table mastery)
    if (profileId) {
      const profile = getProfile(profileId);
      // C3: the streak is unchanged by a (first) miss — it only resets on a
      // second miss, inside handleRetrySubmit's "missed" branch.
      const newStreak = isCorrect ? streak + 1 : streak;
      const newAchievements = checkAfterAnswer({
        profileId,
        moduleId,
        module: mod,
        streak: newStreak,
        sessionTotal: sessionStats.total + 1,
        sessionStartTime,
        mastery: profile?.mastery?.[moduleId] || {},
        masteryThreshold: DEFAULT_MASTERY_THRESHOLD,
        comebacks: comebacksRef.current,
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
      setMissRun(0);
      setFeedback("correct");
      setTimeout(() => pickNewFact(), 900);
    } else {
      // C3: streak is NOT reset here — a first miss he then recovers with
      // the picture doesn't cost the streak. It resets to 0 only on a
      // second miss (handleRetrySubmit's "missed" branch, below).
      setFeedback("incorrect");
      setShowScaffold(true);
      setRetry({ phase: "ask", value: "" });
      setMissCount((n) => n + 1);
      setMissRun((n) => n + 1);
    }
  }, [currentFact, userAnswer, profileId, moduleId, pickNewFact, streak, sessionStats, sessionStartTime, mod, mode, lockedMode, userHidScaffold, showScaffold, pictureRequested]);

  // The reveal owns Enter while open (see handleRetryKeyDown below) — this
  // card's own input is hidden behind it whenever feedback === "incorrect".
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  // Timed reveal choreography (spec "Timing"): picture builds 0–400ms →
  // derivation line at 400ms (stage 1, numeral) → re-ask opens ~900ms
  // (stage 2, blank chip + live input). Keyed on the retry phase entering
  // "ask" so every fresh wrong answer restarts the sequence from the top.
  // Only reset/restart when a NEW item enters "ask" — do NOT reset on
  // "ask" -> "done"/"missed": that transition is the correct-retry green
  // beat (or the second-miss fill), and the derivation line/partner chip
  // are exactly what should stay on screen and reinforce during it. The old
  // unconditional `setRevealStage(0)` on every phase change made the line
  // flash and vanish for the whole ~900ms beat.
  useEffect(() => {
    if (retry.phase !== "ask") return undefined;
    setRevealStage(0);
    const t1 = setTimeout(() => setRevealStage(1), 400);
    const t2 = setTimeout(() => setRevealStage(2), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [retry.phase, currentFact?.factKey]);

  // R1 — Record once, at first submit; the re-answer is never logged.
  // (Amended by docs/confidence-pass-spec.md C3 — streak clause only,
  // everything else below is unchanged.)
  // The outcome of an item is recorded exactly once, at the first submission.
  // When that answer is wrong the app calls updateMastery(profileId, moduleId,
  // itemKey, false) (level −1, floor 0), increments sessionStats.total with no
  // increment to sessionStats.correct, and enters the reveal. That is the
  // complete record for the item. Streak (C3): a first miss does NOT reset
  // the streak — it's unchanged by a miss he then recovers with the picture.
  // The re-answer inside the reveal is an assisted attempt (picture, derivation
  // line on screen). It is understanding, not fluency, and is NOT logged. A
  // re-answer — correct or wrong — must NOT: call updateMastery or change
  // correct, attempts, masteredAt, lastSeen or the review interval; change
  // sessionStats; increment streak on a correct re-answer (the next unassisted
  // correct still starts the next run); call checkAfterAnswer or any streak
  // milestone; count toward the ≥10-problem daily-streak threshold. A SECOND
  // miss (this same reveal, wrong again) DOES reset streak to 0 — see the
  // "missed" branch below. Nothing below touches mastery, stats, or
  // achievements.
  const handleRetrySubmit = useCallback(() => {
    if (!currentFact || retry.phase !== "ask" || retry.value === "") return;
    const isCorrect = parseInt(retry.value, 10) === currentFact.answer;
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (isCorrect) {
      setRetry((r) => ({ ...r, phase: "done" }));
      // Parent-facing "helped" count only — not mastery, not the score (R1).
      recordAssistedInSession(profileId, moduleId);
      advanceTimeoutRef.current = setTimeout(() => pickNewFact(), 900);
    } else {
      // Wrong twice: fill the answer, hold the picture, queue the comeback.
      // C3: THIS is where the streak resets — a second miss, not the first.
      setStreak(0);
      setRetry({ phase: "missed", value: String(currentFact.answer) });
      const offset = 3 + (hashString(currentFact.factKey) % 3); // 3–5 draws
      comebackQueueRef.current = [...comebackQueueRef.current, { factKey: currentFact.factKey, dueIn: offset }];
      advanceTimeoutRef.current = setTimeout(() => pickNewFact(), 2500);
    }
  }, [currentFact, retry, pickNewFact, profileId, moduleId]);

  // Enter: submits the re-answer in "ask", advances immediately in "missed".
  const handleRetryKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (retry.phase === "ask") {
      handleRetrySubmit();
    } else if (retry.phase === "missed") {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      pickNewFact();
    }
  };

  // Calculate scaffold opacity based on mastery
  const scaffoldOpacity = mode === "concrete"
    ? 1
    : mode === "pictorial" && currentFact
      ? Math.max(0.15, 1 - getMasteryLevel(currentFact.factKey) * 0.3)
      : 0;

  // Check if the current selection has no accessible tables
  const isCurrentGroupLocked = mod ? ((focusNumber && !isTableAccessible(focusNumber))
    || currentTables.length === 0) : false;

  // groupColor removed — controls bar no longer in practice view
  // (per-group progress is now computed inline in the progress grid, per
  //  the selected Multiply/Divide tab.)

  // Get the ScaffoldComponent from the module (HintComponent/SkipCount is no
  // longer used by this screen — the wrong-answer reveal replaced it; the
  // module still exports it for anything else that wants it).
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

  // Guard: if module somehow not found, show message (all hooks already called above)
  if (!mod) {
    return <div style={{ padding: "40px", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif" }}>Module not found</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: `repeating-linear-gradient(0deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), repeating-linear-gradient(90deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), ${COLORS.bg}`, fontFamily: "'Space Grotesk', sans-serif", padding: 0 }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeSlideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes correctPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        @keyframes showMePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        .showMePulse { display: inline-block; animation: showMePulse 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .showMePulse { animation: none; } }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      {/* Header */}
      <div style={{
        background: COLORS.yellow,
        padding: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) clamp(12px, 4vw, 20px) 10px",
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
            <LogoLockup size="medium" boltVariant="rev" style={{ flex: 1 }} />
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
            // Count DISTINCT facts — generateFacts emits symmetric division facts
            // twice (e.g. "4÷2"), which inflated this stat's numerator and
            // denominator (the group grids below already dedupe).
            const distinctFacts = dedupeFacts(facts);
            const totalFacts = distinctFacts.length;
            const masteredFacts = totalFacts > 0 ? distinctFacts.filter(f => (masteryData[f.factKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length : 0;
            const masteryPct = totalFacts > 0 ? Math.round((masteredFacts / totalFacts) * 100) : 0;
            // C4 (docs/confidence-pass-spec.md): the MASTERED pill is framed
            // against the current fact's table group, not the whole module —
            // "8/30 · 2s, 5s & 10s" is a reachable target; "12/189" isn't.
            // multiply: table = a; divide: table = b, falling back to answer
            // (a fact drawn under Lock Operation could have a b not in any
            // group — e.g. none here, but future-proof). No currentFact ->
            // today's totals, label "MASTERED", as before.
            const currentGroupTable = currentFact
              ? (currentFact.operation === "divide" ? currentFact.b : currentFact.a)
              : null;
            let currentGroup = currentFact
              ? mod.groups.find((g) => g.tables.includes(currentGroupTable))
              : null;
            if (currentFact && currentFact.operation === "divide" && !currentGroup) {
              currentGroup = mod.groups.find((g) => g.tables.includes(currentFact.answer));
            }
            let pillValue = `${masteredFacts}/${totalFacts}`;
            let pillLabel = "Mastered";
            if (currentGroup) {
              const groupFacts = dedupeFacts(mod.generateFacts({ tables: currentGroup.tables, operation }));
              const groupTotal = groupFacts.length;
              const masteredInGroup = groupTotal > 0
                ? groupFacts.filter((f) => (masteryData[f.factKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length
                : 0;
              pillValue = `${masteredInGroup}/${groupTotal}`;
              pillLabel = currentGroup.label;
            }
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
                  <span style={{ fontSize: "clamp(14px, 5vw, 20px)", lineHeight: 1, whiteSpace: "nowrap" }}>⭐ {pillValue}</span>
                  <span style={{ fontSize: "9px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center", lineHeight: 1.15 }}>{pillLabel}</span>
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
                    <input ref={inputRef} type="number" inputMode="numeric" value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={feedback === "correct" || feedback === "incorrect"}
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

              {/* "Not sure" nudge (docs/confidence-pass-spec.md C2) — under the
                  problem, above the scaffold. Stays until the next submit or item. */}
              {nudge === "notSure" && (
                <div style={{
                  marginTop: "12px", display: "inline-block",
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                  fontSize: "clamp(14px, 4vw, 16px)", color: COLORS.black,
                  backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM,
                  borderRadius: "8px", padding: "6px 12px",
                }}>
                  Not sure? Count the picture.
                </div>
              )}

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
              ) : (
                <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
                  {/* Bug fix (docs/wrong-answer-reveal-spec.md "CPA modes"): this
                      used to be gated on `mode !== "abstract"` at the ternary
                      above, so an Abstract miss showed no picture at all. Adopt
                      the fractions guard — abstract only renders once revealed
                      (via a wrong answer or "Show me"), pictorial is unaffected
                      (scaffoldOpacity is 0 in abstract, so this is a no-op there
                      unless showScaffold is true). A miss never changes mode. */}
                  {!(mode === "abstract" && !showScaffold) && (showScaffold || (!userHidScaffold && scaffoldOpacity > 0)) && (
                    currentFact.operation === "divide" && DivisionScaffold ? (
                      <DivisionScaffold
                        rows={currentFact.a}
                        cols={currentFact.b}
                        opacity={showScaffold ? 1 : scaffoldOpacity}
                        animate={true}
                        countToken={feedback === "correct" ? "correct" : "blank"}
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
                    // DotArray's orientation rule (docs/wrong-answer-reveal-spec.md,
                    // phase 1c): b < a draws a columns of b dots, so the caption
                    // must read "groups of" to match what's on screen — the
                    // rows-layout caption ("rows × columns") is unchanged.
                    : currentFact.b < currentFact.a
                      ? `${currentFact.a} groups of ${currentFact.b}`
                      : `${currentFact.a} rows × ${currentFact.b} columns`}
                </div>
              )}
              {/* Fact-family chip: Abstract "Show me" detour only, pre-answer.
                  Never in the reveal (R3) and never before "Show me" is tapped. */}
              {mode === "abstract" && showScaffold && !feedback && (
                <div style={{ textAlign: "center" }}>
                  <FactFamilyChip fact={currentFact} />
                </div>
              )}
              {/* "Show me" (CLAUDE.md: Abstract = symbols + "Show me" fallback) —
                  pre-answer only, doesn't affect logging. Ported from the
                  fractions pattern (fractions-practice.jsx). Pictorial
                  (docs/confidence-pass-spec.md C2): shown whenever the
                  scaffold isn't already at full opacity — tapped-hidden
                  (userHidScaffold) OR simply faded below 1 with mastery —
                  not just the fully-hidden case. Tapping sets showScaffold
                  (full opacity) rather than only un-hiding, in both modes. */}
              {!feedback && (
                (mode === "abstract" && !showScaffold) ||
                (mode === "pictorial" && !showScaffold && (userHidScaffold || scaffoldOpacity < 1))
              ) && (
                <div style={{ marginTop: "12px", textAlign: "center" }}>
                  {/* Pulses after two consecutive misses in Abstract (see missRun). */}
                  <span className={mode === "abstract" && missRun >= 2 ? "showMePulse" : undefined}>
                    <BrutalButton small onClick={() => { setShowScaffold(true); setPictureRequested(true); }} bg={COLORS.cream} style={{ minHeight: 44 }}>
                      Show me
                    </BrutalButton>
                  </span>
                </div>
              )}

              {/* Correct feedback only — the wrong-answer chip/because/hint/bond
                  are gone (docs/wrong-answer-reveal-spec.md R3): the reveal
                  overlay is the whole story on a miss now. Deterministic pick
                  (was Math.random() in render). Flat rotation, no streak
                  escalation strings (docs/confidence-pass-spec.md C3): rewards
                  are for sticking with it, not for speed/streaks. */}
              {feedback === "correct" && (
                <div style={{
                  marginTop: "16px", fontSize: "16px", fontWeight: 700,
                  fontFamily: "'Space Mono', monospace",
                  color: COLORS.green,
                  animation: "fadeSlideUp 0.3s ease both",
                }}>
                  {["NICE!", "GOT IT!", "YES!", "CORRECT!", "BOOM!"][sessionStats.total % 5]}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              {feedback !== "correct" && feedback !== "incorrect" && (
                <BrutalButton onClick={handleSubmit} bg={COLORS.yellow}>Check!</BrutalButton>
              )}
            </div>

            {/* Mode description removed — decluttered practice view */}
          </div>
        ))}
      </div>
      </div>

      {/* Wrong-answer reveal (docs/wrong-answer-reveal-spec.md) — replaces the
          old appended incorrect block. Full-screen; no knowledge of facts or
          mastery lives in the shell, all of that is composed here. */}
      {currentFact && (() => {
        // Fold predicate (docs/wrong-answer-reveal-spec.md, phase 1c "tall
        // arrays"): the same predicate that already selects the taller
        // picture band — it tracks the derivation line's length (a steps
        // wraps to two lines at a >= 6), independent of the picture's
        // orientation (rows vs columns).
        const fold = currentFact.operation !== "divide" && currentFact.a >= 6;
        // C1 (docs/confidence-pass-spec.md): the answer's slot is the blank
        // token from the moment the line/picture appears — no stage shows
        // the numeral first. "correct" when done, "numeral" when missed
        // (second miss — the fill), "blank" otherwise. ONE rule, used at
        // every site that could carry the answer: the picture's final total
        // (fold case), the derivation line's token, and the divide chip's
        // quotient below. (Previously the non-fold picture was hard-coded
        // "numeral" throughout "ask" — the 2×2 leak — and the fold case
        // additionally gated on revealStage, showing the numeral before
        // stage 2; both are gone.)
        const tokenState = retry.phase === "done"
          ? "correct"
          : retry.phase === "missed"
            ? "numeral"
            : "blank";
        return (
        <WrongAnswerReveal
          open={feedback === "incorrect"}
          focusDelayMs={1000}
          // Tall-array follow-up to phase 1b (docs/wrong-answer-reveal-spec.md,
          // phase 1c "Fold the line"): the fold case pays back the derivation
          // line's ~50px to the picture band, so the array (and its final
          // total, now carrying the answer token) reads as a hero visual
          // instead of a thumbnail. Divide's BarModel never folds and stays
          // on the shell default (120px / 20dvh).
          pictureMax={fold ? "min(180px, 27dvh)" : undefined}
          header={HEADER_TAILS[hashString(currentFact.factKey) % HEADER_TAILS.length]}
          problem={
            <span>
              {currentFact.a}{" "}
              <span style={{ color: currentFact.operation === "divide" ? COLORS.green : COLORS.orange }}>
                {currentFact.operation === "divide" ? "÷" : "×"}
              </span>{" "}
              {currentFact.b}
            </span>
          }
          picture={
            currentFact.operation === "divide" && DivisionScaffold ? (
              <DivisionScaffold rows={currentFact.a} cols={currentFact.b} opacity={1} animate={mode === "abstract"} countToken={tokenState} />
            ) : MultiplyScaffold ? (
              <MultiplyScaffold rows={currentFact.a} cols={currentFact.b} opacity={1} animate={mode === "abstract"} totals={true} finalToken={tokenState} />
            ) : null
          }
          line={
            retry.phase === "missed"
              // Second-miss line reads as spoken, not labelled — Space
              // Grotesk override on the shell's Space Mono default (spec
              // "phase 1b" typography table). Still renders in the fold
              // case (spec "Fold the line": "the second-miss line ...
              // still renders in the slot").
              ? (
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(16px, 4.6vw, 18px)", fontWeight: 700, lineHeight: 1.3 }}>
                  Still tricky. Here it is — we'll come back to it.
                </span>
              )
              : fold
                ? null
                : revealStage >= 1
                  ? buildDerivationLine(currentFact, tokenState)
                  : null
          }
          extra={
            currentFact.operation === "divide" && revealStage >= 1 ? (
              <div style={{
                display: "inline-flex", alignItems: "center", height: "24px", padding: "0 10px",
                fontFamily: "'Space Mono', monospace", fontSize: "15px", fontWeight: 700,
                backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: "6px",
                color: COLORS.black, // black text on a colour chip, by token not by accident
              }}>
                {currentFact.b} × <DerivationToken value={currentFact.answer} state={tokenState} /> = {currentFact.a}
              </div>
            ) : null
          }
          prompt={retry.phase === "ask" && revealStage >= 2 ? "Now you — use the picture." : null}
          input={
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
              <input
                type="number"
                inputMode="numeric"
                value={retry.value}
                placeholder="?"
                disabled={retry.phase !== "ask" || revealStage < 2}
                onChange={(e) => setRetry((r) => ({ ...r, value: e.target.value }))}
                onKeyDown={handleRetryKeyDown}
                style={{
                  width: "clamp(120px, 42vw, 220px)",
                  // R2 band budget: input capped at 64px tall (was ~78px) so
                  // it and the derivation line above it fit above a 300px
                  // iOS keyboard at 375×667.
                  height: "64px",
                  boxSizing: "border-box",
                  fontSize: "clamp(32px, 9vw, 44px)",
                  fontFamily: "'Shrikhand', cursive",
                  fontWeight: 400,
                  textAlign: "center",
                  border: "none",
                  borderBottom: `4px solid ${COLORS.black}`,
                  backgroundColor: retry.phase === "missed" ? COLORS.yellow : retry.phase === "done" ? COLORS.green : "#FFF0F0",
                  color: COLORS.black,
                  outline: "none",
                  padding: "2px 0",
                  WebkitAppearance: "none",
                  MozAppearance: "textfield",
                  animation: retry.phase === "done" ? "correctPulse 0.4s ease" : "none",
                  transition: "background-color 0.3s ease",
                }}
              />
              {retry.phase === "ask" && revealStage >= 2 && (
                // R4 — no exclamation marks inside the reveal (the card's own
                // "Check!" button outside the reveal is unaffected). Full
                // card width, bigger tap target (spec "phase 1b" typography
                // table: minHeight 48 / fontSize 18 / width 100%).
                <BrutalButton onClick={handleRetrySubmit} bg={COLORS.yellow} style={{ minHeight: 48, fontSize: 18, width: "100%" }}>Check</BrutalButton>
              )}
            </div>
          }
        />
        );
      })()}

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
