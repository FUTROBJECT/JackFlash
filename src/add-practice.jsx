/**
 * AddPractice – the practice screen for the Add & Subtract module
 * (pass 1: groups colAdd A1–A3, colSub S1–S3 and the supporting facts F1–F2;
 * docs/add-spec.md §15). Mental Math and Word Problems arrive in pass 2.
 *
 * Rewritten from place-value-practice.jsx (the newest screen): the same state
 * machine — retry/missCount/revealStage/comebackQueueRef/missedKeysRef/
 * pictureRequested/nudge — the same WrongAnswerReveal composition (ONE
 * tokenState drives every count chip AND the derivation line's token —
 * docs/confidence-pass-spec.md C1), the same mastery persistence via
 * dataManager, the same header/stats/streak/achievement popup, the same
 * parent locks (lockedMode, derived lockedGroupId) and skill-focus selector.
 *
 * Add-specific differences (docs/add-spec.md):
 *  - Two answerTypes only: `column` (right-to-left digit grid + in-app pad,
 *    shared/ColumnMethod.jsx — no <input>, no auto-submit) and `singleNumber`
 *    (facts). Every chart is the extended Place Value disc chart.
 *  - NO speed gate anywhere (§8): updateMastery is never passed responseMs.
 *  - Retrieval finish line extended to Concrete (§8): at correct === 2 the
 *    chart starts hidden behind "Show me", in Concrete AND Pictorial.
 *  - Readiness gates use "secure" (correct ≥ 2) and apply to UNSEEN items only
 *    (§6.5) — evaluated at draw time from fresh mastery, not memoised.
 *  - `supporting` groups (Facts Warm-Up) stay out of the default draw and the
 *    C4 pill unless a skill focus or a parent group lock points at them (§2).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  COLORS, MODULE_COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM,
  DEFAULT_MASTERY_THRESHOLD, AVATARS, GUESS_MS,
} from "./constants.js";
// Add & Subtract is a conceptual module (docs/add-spec.md §8) — no speed
// gate, no responseMs passed to updateMastery, so FLUENCY_MS_* is not imported.
import addModule, {
  ADD_POOL, REGROUP, shouldAllowSkill, wasAttempted, digitArr,
  initDiscState, tradeAdd, tradeSub, takeSub, tradeableFor, takeLabelsFor,
  afterTradesState, canonicalMarks, correctDigitCells, diagnosedPlace, buildAddLine,
} from "./modules/add.jsx";
import { formatNumber } from "./modules/placeValue.jsx";
import { registerModule, getModule } from "./modules/moduleRegistry.js";
import {
  initData, getMastery, updateMastery, updateStreak, checkStreakOnLaunch,
  recordAnswerInSession, recordAssistedInSession, recordPeekInSession,
  finalizeLiveSession, getProfile, getPreferredMode, setPreferredMode,
} from "./dataManager.js";
import { checkAfterAnswer, getAllAchievementsForProfile } from "./achievementEngine.js";
import AchievementPopup from "./AchievementPopup.jsx";
import { isContentAccessible } from "./purchaseManager.js";
import LogoLockup from "./LogoLockup.jsx";
import WrongAnswerReveal from "./shared/WrongAnswerReveal.jsx";
import DerivationLine from "./shared/DerivationLine.jsx";
import { PlaceValueChart, PressButton } from "./shared/barComponents.jsx";
import {
  ColumnAnswerInput, emptyMarks, applyTopTap, mirrorChartTrade,
} from "./shared/ColumnMethod.jsx";

// Register the Add & Subtract module
registerModule(addModule);

const MINUS = "−";

// ---------------------------------------------------------------------------
// Wrong-answer reveal helpers — duplicated hashString/HEADER_TAILS, same as
// fractions-practice.jsx / place-value-practice.jsx.
// ---------------------------------------------------------------------------
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const HEADER_TAILS = [
  "Not yet. Here's the picture.",
  "Not quite. Look at it.",
  "Not yet — watch this.",
];
// At 320×568 the column re-ask (grid + pad) does not fit under the longer
// headers; the tight layout uses this one-liner and drops the prompt text.
const TIGHT_HEADER = "Not yet — use the picture.";

// Only `singleNumber` (facts) opens a keyboard; `column` is the in-app pad.
const TYPED_ANSWER_TYPES = new Set(["singleNumber"]);

function revealPictureMax(answerType, tight) {
  if (answerType === "column") return tight ? "min(84px, 15dvh)" : "min(110px, 18dvh)";
  return "min(150px, 24dvh)";
}

// ---------------------------------------------------------------------------
// Small reusable components (local copies matching place-value-practice.jsx)
// ---------------------------------------------------------------------------
function MasteryDots({ level, max = 3 }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
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

// Rendered through PressButton so it sinks into its shadow on press, like the pad.
function BrutalButton({ onClick, children, bg = "white", color = COLORS.black, small = false, active = false, style = {} }) {
  return (
    <PressButton onClick={onClick} style={{
      padding: small ? "7px 14px" : "12px 24px",
      minHeight: small ? 44 : undefined,
      borderRadius: 8, border: BRUTAL_BORDER_SM,
      backgroundColor: bg, color,
      fontSize: small ? 13 : 15, fontWeight: 700,
      cursor: "pointer", fontFamily: "'Space Mono', monospace",
      boxShadow: active ? "none" : BRUTAL_SHADOW_SM,
      transform: active ? "translate(3px,3px)" : "none",
      ...style,
    }}>
      {children}
    </PressButton>
  );
}

// ---------------------------------------------------------------------------
// The chart for an item (§4.1–4.2). One builder for the card; `interactive`
// switches between Concrete (touch the math: trade + take buttons) and
// Pictorial/Abstract-with-Show-me (the untraded question, labels only).
// Count chips are ALWAYS blank here — counting the discs is the work.
// ---------------------------------------------------------------------------
function QuestionChart({ item, disc, interactive, opacity, animate, notice, onTrade, onTake }) {
  const isAdd = item.op === "+";
  const { flags, labels } = interactive ? tradeableFor(item, disc) : { flags: null, labels: null };
  return (
    <PlaceValueChart
      mode="discs" columns={item.columns} plain emptyMarker
      counts={disc.counts}
      layers={isAdd ? [disc.counts, disc.counts2] : null}
      carried={disc.carried} taken={disc.taken}
      takeLabels={isAdd ? null : takeLabelsFor(item)}
      onTake={interactive && !isAdd ? onTake : null}
      tradeable={flags} tradeLabels={labels} tradeText={`${REGROUP.noun} →`}
      onTrade={interactive ? onTrade : null}
      notice={interactive ? notice : null}
      countTokens={disc.counts.map(() => "blank")}
      opacity={opacity} animate={animate}
    />
  );
}

function ScaffoldForItem({ item, disc, showScaffold, scaffoldOpacity, mode, interactive, notice, onTrade, onTake, onStartOver }) {
  if (mode === "abstract" && !showScaffold) return null;
  const opacity = showScaffold ? 1 : scaffoldOpacity;
  if (opacity <= 0) return null;
  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <QuestionChart
        item={item} disc={disc} interactive={interactive} opacity={opacity}
        animate={false} notice={notice} onTrade={onTrade} onTake={onTake}
      />
      {interactive && (
        // Resets the chart AND the mirrored marks. ≥44px hit area.
        <button onClick={onStartOver} style={{
          // 44px hit area, but its bottom 12px overlaps the (empty) gap above the grid so
          // it costs ~32px of height, not 48 — vertical room matters under the sticky pad.
          minHeight: 44, minWidth: 44, marginTop: 0, marginBottom: -12, padding: "0 12px", background: "none", border: "none",
          cursor: "pointer", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 12,
          color: COLORS.black, textDecoration: "underline",
        }}>
          Start over
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question display (the big prompt)
// ---------------------------------------------------------------------------
const PROMPT_STYLE = { fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" };

function QuestionDisplay({ item }) {
  if (item.answerType === "column") {
    // Commas live HERE (the problem line), never inside the grid (§5.1).
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.black }}>
          {formatNumber(item.a)} <span style={{ color: MODULE_COLORS.add }}>{item.op === "+" ? "+" : MINUS}</span> {formatNumber(item.b)}
        </div>
        <div style={{ ...PROMPT_STYLE, fontSize: 14, marginTop: 2 }}>Start with the ones.</div>
      </div>
    );
  }
  // Facts: "8 + 5 = ?" — the question, never the answer.
  return (
    <div style={{ textAlign: "center" }}>
      <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 44, color: COLORS.black }}>
        {item.a} <span style={{ color: MODULE_COLORS.add }}>{item.op === "+" ? "+" : MINUS}</span> {item.b}
      </span>
      <div style={{ ...PROMPT_STYLE, marginTop: 4 }}>= ?</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrong-answer reveal — problem / picture builders (docs/add-spec.md §9).
// ---------------------------------------------------------------------------
function buildProblem(item) {
  // Column items: the problem slot is null — the re-ask grid restates it (§9.1).
  if (item.answerType === "column") return null;
  return (
    <span>
      {item.a} <span style={{ color: MODULE_COLORS.add }}>{item.op === "+" ? "+" : MINUS}</span> {item.b}
    </span>
  );
}

// The picture is the chart in its AFTER-TRADES state, computed from the
// operands (never the child's chart state): traded-in discs ringed, take-aways
// crossed, the diagnosed column outlined. The count chips are the answer
// digits, so they take the ONE tokenState (blank while asking).
function revealPicture(item, tokenState, animate, entered) {
  const { state } = afterTradesState(item);
  const place = item.answerType === "column" ? diagnosedPlace(item, entered) : null;
  return (
    <PlaceValueChart
      mode="discs" columns={item.columns} plain emptyMarker
      counts={state.counts} carried={state.carried} taken={state.taken}
      countTokens={state.counts.map(() => tokenState)}
      highlightPlace={place} animate={animate}
    />
  );
}

function initialRetryValue(item) {
  if (!item) return null;
  if (item.answerType === "singleNumber") return "";
  return null;
}

const columnValue = (digits) => Number(digits.join(""));

// ---------------------------------------------------------------------------
// Main practice component
// ---------------------------------------------------------------------------
export default function AddPractice({
  moduleId = "add",
  profileId = null,
  profileName = "Practice",
  profileAvatar = null,
  onBack = null,
  initialView = "practice",
}) {
  const mod = getModule(moduleId);

  // ---- All state (no conditional hooks) ----
  const [localMastery, setLocalMastery] = useState({});
  const [pickedMode, setPickedMode] = useState(() => getPreferredMode(profileId, moduleId) || "pictorial");
  // Once the child has explicitly chosen a mode, per-group defaults stop
  // overriding it (the hasExplicitModeRef pattern).
  const hasExplicitModeRef = useRef(!!getPreferredMode(profileId, moduleId));
  const lockedMode = getProfile(profileId)?.settings?.lockedMode || null;
  // Parent Zone "Lock Group" (settings.lockedGroup: a group id or null).
  // DERIVED, never state: an unknown id (stale setting from another module) or
  // an inaccessible group means no lock. Any of the module's groups can be
  // locked, including the supporting Facts Warm-Up.
  const lockedGroupSetting = getProfile(profileId)?.settings?.lockedGroup || null;
  const lockedGroupId = mod?.groups.some((g) => g.id === lockedGroupSetting) && isContentAccessible(moduleId, lockedGroupSetting)
    ? lockedGroupSetting
    : null;
  const mode = lockedMode || pickedMode;
  const [activeGroups] = useState(null);
  const [focusSkill, setFocusSkill] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [feedback, setFeedback] = useState(null); // null | "correct" | "incorrect"
  const [userAnswer, setUserAnswer] = useState(""); // singleNumber (facts)
  // Bumped on a converted "not sure" (docs/confidence-pass-spec.md C2) to
  // remount the column input, whose cells/cursor are LOCAL state (marks and
  // the Concrete chart state are held here and survive).
  const [retryResetKey, setRetryResetKey] = useState(0);
  const [showScaffold, setShowScaffold] = useState(false);
  const [userHidScaffold, setUserHidScaffold] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [view, setView] = useState(initialView);
  const [streak, setStreak] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [sessionStartTime] = useState(Date.now());
  const [retry, setRetry] = useState({ phase: "idle", value: null });
  const [missCount, setMissCount] = useState(0); // eslint-disable-line no-unused-vars
  const [pictureRequested, setPictureRequested] = useState(false);
  const [nudge, setNudge] = useState(null);
  const [missRun, setMissRun] = useState(0);
  const [revealStage, setRevealStage] = useState(0);
  // Per-item working state — reset on every item change.
  const [disc, setDisc] = useState({ counts: [], counts2: null, carried: [], taken: [] });
  const [cardMarks, setCardMarks] = useState(emptyMarks());
  const [reaskMarks, setReaskMarks] = useState(emptyMarks());
  const [notice, setNotice] = useState(null);
  const [firstSubmit, setFirstSubmit] = useState(null); // the first-submit value (drives the bug line)
  const [markNotice, setMarkNotice] = useState(null); // "Nothing to regroup here" chip on the grid
  const markNoticeTimerRef = useRef(null);
  const inputRef = useRef(null);
  const headerRef = useRef(null);   // the sticky header — measured by the grid's scroll-into-view
  const chartWrapRef = useRef(null); // the chart wrapper (null when no chart is shown)
  const questionRef = useRef(null);  // fallback clamp target when there is no chart (Abstract)
  const getClampEl = useCallback(() => chartWrapRef.current || questionRef.current, []);
  const factShownAtRef = useRef(0);
  const comebackQueueRef = useRef([]);
  const advanceTimeoutRef = useRef(null);
  const missedKeysRef = useRef(new Set());
  const comebacksRef = useRef(0);

  useEffect(() => { comebackQueueRef.current = []; }, [focusSkill, activeGroups]);
  useEffect(() => () => { if (markNoticeTimerRef.current) clearTimeout(markNoticeTimerRef.current); }, []);
  useEffect(() => { initData(); }, []);
  useEffect(() => {
    if (profileId) setDailyStreak(checkStreakOnLaunch(profileId));
  }, [profileId]);
  useEffect(() => {
    return () => { if (profileId) finalizeLiveSession(profileId); };
  }, [profileId]);

  const getMasteryData = useCallback(() => {
    if (profileId) return getMastery(profileId, moduleId) || {};
    return localMastery;
  }, [profileId, moduleId, localMastery]);

  const getMasteryLevel = useCallback((itemKey) => {
    return getMasteryData()[itemKey]?.correct || 0;
  }, [getMasteryData]);

  // The accessible pool for the current lock/focus. Readiness gates are NOT
  // applied here: they depend on live mastery and only restrict UNSEEN items,
  // so pickNewItem applies them against fresh data at draw time (§6.5).
  const activePools = useMemo(() => {
    return ADD_POOL.filter((item) => {
      const group = mod?.groups.find((g) => g.id === item.group);
      if (!group) return false;
      if (!isContentAccessible(moduleId, item.group)) return false;
      if (activeGroups && !activeGroups.includes(item.group)) return false;
      if (lockedGroupId && item.group !== lockedGroupId) return false;
      if (focusSkill && item.skill !== focusSkill) return false;
      // §2 `supporting`: out of the default draw — only a parent group lock or
      // a deliberately focused skill brings Facts Warm-Up in.
      if (group.supporting && !lockedGroupId && !focusSkill) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroups, focusSkill, lockedGroupId, moduleId]);

  const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

  const pickNewItem = useCallback(() => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }

    if (activePools.length === 0) {
      setCurrentItem(null);
      setRetry({ phase: "idle", value: null });
      return;
    }

    const masteryData = getMasteryData();
    const masteryThreshold = DEFAULT_MASTERY_THRESHOLD;
    const now = Date.now();
    const MAX_NEW = 3;

    // Readiness gate (§6.5): a gated skill's UNSEEN items stay out until it
    // opens; attempted items stay in rotation. A focused skill, a group lock
    // and a served comeback bypass it.
    const gateBypassed = !!focusSkill || !!lockedGroupId;
    const gated = gateBypassed
      ? activePools
      : activePools.filter((i) => wasAttempted(i, masteryData) || shouldAllowSkill(i.skill, masteryData));
    const eligible = gated.length > 0 ? gated : activePools;

    let selected = null;
    if (comebackQueueRef.current.length > 0) {
      const queue = comebackQueueRef.current.map((entry) => ({ ...entry, dueIn: entry.dueIn - 1 }));
      const front = queue[0];
      if (front.dueIn <= 0) {
        const match = ADD_POOL.find((i) => i.itemKey === front.itemKey);
        comebackQueueRef.current = queue.slice(1);
        if (match) selected = match;
      } else {
        comebackQueueRef.current = queue;
      }
    }

    if (!selected) {
      const pendingComebackKeys = new Set(comebackQueueRef.current.map((entry) => entry.itemKey));
      const candidatePool = pendingComebackKeys.size > 0
        ? eligible.filter((i) => !pendingComebackKeys.has(i.itemKey))
        : eligible;
      const basePool = candidatePool.length > 0 ? candidatePool : eligible;

      const scored = basePool.map((item) => {
        const record = masteryData[item.itemKey];
        const level = record?.correct || 0;
        const attempts = record?.attempts || 0;
        const lastSeen = record?.lastSeen ? new Date(record.lastSeen).getTime() : 0;
        const daysSince = lastSeen ? (now - lastSeen) / (1000 * 60 * 60 * 24) : Infinity;

        if (level >= masteryThreshold) {
          const reviewsAfterMastery = level - masteryThreshold;
          const intervalDays = REVIEW_INTERVALS[Math.min(reviewsAfterMastery, REVIEW_INTERVALS.length - 1)];
          return { item, weight: daysSince >= intervalDays ? 4 : 1, category: daysSince >= intervalDays ? "review" : "mastered" };
        }
        if (attempts === 0 && !record?.lastSeen) {
          return { item, weight: 3, category: "new" };
        }
        if (level === 0) {
          return { item, weight: 6, category: "struggling" };
        }
        return { item, weight: (masteryThreshold - level + 1) * 2, category: "learning" };
      });

      // ≤3 unseen items in rotation, in pool (introduction) order.
      let newCount = 0;
      let pool = scored.filter((s) => {
        if (s.category === "new") {
          newCount++;
          return newCount <= MAX_NEW;
        }
        return true;
      });

      const prevKey = currentItem?.itemKey;
      if (prevKey && pool.length > 1) {
        const without = pool.filter((s) => s.item.itemKey !== prevKey);
        if (without.length > 0) pool = without;
      }

      const totalW = pool.reduce((sum, s) => sum + s.weight, 0);
      let r = Math.random() * totalW;
      selected = pool[0]?.item || null;
      for (const entry of pool) {
        r -= entry.weight;
        if (r <= 0) { selected = entry.item; break; }
      }
    }

    setCurrentItem(selected);
    setUserAnswer("");
    setFeedback(null);
    setShowScaffold(false); setUserHidScaffold(false);
    setRetry({ phase: "idle", value: null });
    setPictureRequested(false);
    setNudge(null);
    setNotice(null);
    setMarkNotice(null);
    setFirstSubmit(null);
    setCardMarks(emptyMarks());
    setReaskMarks(emptyMarks());
    setDisc(selected ? initDiscState(selected) : { counts: [], counts2: null, carried: [], taken: [] });

    // Per-group default CPA mode — until the child has made an explicit
    // choice, which then sticks across groups.
    let effMode = mode;
    if (!hasExplicitModeRef.current && selected && mod?.defaultModeByGroup) {
      const defaultMode = mod.defaultModeByGroup[selected.group] || "pictorial";
      setPickedMode(defaultMode);
      effMode = lockedMode || defaultMode;
    }

    // Finish-line on-ramp (§8 gate 2), extended to Concrete: at correct === 2,
    // in Concrete or Pictorial, with no parent mode lock, the chart starts
    // hidden behind "Show me". Answering with it hidden can cross to mastered.
    const rec = getMasteryData()[selected?.itemKey];
    if (selected && (effMode === "concrete" || effMode === "pictorial") && !lockedMode
      && (rec?.correct || 0) === DEFAULT_MASTERY_THRESHOLD - 1) {
      setUserHidScaffold(true);
    }

    setTimeout(() => {
      // Facts in Concrete: chart first — don't pop the keyboard over it.
      if (effMode !== "concrete") inputRef.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      factShownAtRef.current = Date.now();
    }, 100);
  }, [activePools, getMasteryData, currentItem, mode, lockedMode, lockedGroupId, focusSkill, mod]);

  useEffect(() => {
    pickNewItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroups, focusSkill, activePools.length]);

  const scaffoldOpacity = useMemo(() => {
    if (mode === "concrete") return 1;
    if (mode === "pictorial" && currentItem) {
      return Math.max(0.15, 1 - getMasteryLevel(currentItem.itemKey) * 0.3);
    }
    return 0;
  }, [mode, currentItem, getMasteryLevel]);

  const evaluateAnswer = useCallback((item, answerPayload) => {
    const { type, value } = answerPayload;
    if (type === "singleNumber") {
      const n = parseInt(String(value).replace(/\D/g, ""), 10);
      return !isNaN(n) && n === Number(item.correctAnswer);
    }
    if (type === "column") {
      // Number over the filled run; correctAnswer is a Number, but coerce anyway.
      const joined = (value || []).join("");
      if (joined === "") return false;
      return Number(joined) === Number(item.correctAnswer);
    }
    return false;
  }, []);

  const handleAnswer = useCallback((answerPayload) => {
    if (!currentItem) return;
    const isCorrect = evaluateAnswer(currentItem, answerPayload);
    const responseMs = factShownAtRef.current ? Date.now() - factShownAtRef.current : undefined;
    const enteredValue = answerPayload.type === "column"
      ? columnValue(answerPayload.value)
      : parseInt(String(answerPayload.value).replace(/\D/g, ""), 10);

    // "Not sure" conversion (docs/confidence-pass-spec.md C2) — a fast wrong
    // answer before the picture was requested logs nothing. The chart appears
    // at full opacity in its question state (Concrete keeps its chart state),
    // chips stay blank, the answer clears; column marks are kept.
    if (!isCorrect && !pictureRequested && responseMs !== undefined && responseMs < GUESS_MS) {
      setShowScaffold(true);
      setPictureRequested(true);
      setNudge("notSure");
      setUserAnswer("");
      setRetryResetKey((k) => k + 1);
      return;
    }
    setNudge(null);

    if (profileId) {
      const scaffolded = (mode !== "abstract" && !userHidScaffold) || showScaffold === true;
      const masteryGatesExempt = lockedMode === "concrete" || lockedMode === "pictorial";
      // §8: no speed gate — no responseMs/fluencyLimitMs passed. Logged to
      // the DEV console only, for QA/fast-follow analysis.
      if (import.meta.env.DEV) console.debug("[JF] responseMs", currentItem.itemKey, responseMs);
      updateMastery(profileId, moduleId, currentItem.itemKey, isCorrect, { scaffolded, masteryGatesExempt });
      recordAnswerInSession(profileId, moduleId, isCorrect);
      if (isCorrect && pictureRequested) {
        recordPeekInSession(profileId, moduleId);
      }
    } else {
      setLocalMastery((prev) => ({
        ...prev,
        [currentItem.itemKey]: {
          correct: Math.max(0, (prev[currentItem.itemKey]?.correct || 0) + (isCorrect ? 1 : -1) + (isCorrect ? 0 : 1)),
          attempts: (prev[currentItem.itemKey]?.attempts || 0) + 1,
          lastSeen: new Date().toISOString(),
        },
      }));
    }

    setSessionStats((prev) => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));

    if (isCorrect && missedKeysRef.current.has(currentItem.itemKey)) {
      missedKeysRef.current.delete(currentItem.itemKey);
      comebacksRef.current += 1;
    } else if (!isCorrect) {
      missedKeysRef.current.add(currentItem.itemKey);
    }

    if (profileId) {
      const profile = getProfile(profileId);
      const newStreak = isCorrect ? streak + 1 : streak;
      const newAchievements = checkAfterAnswer({
        profileId, moduleId, module: mod,
        streak: newStreak,
        sessionTotal: sessionStats.total + 1,
        sessionStartTime,
        mastery: profile?.mastery?.[moduleId] || {},
        masteryThreshold: DEFAULT_MASTERY_THRESHOLD,
        comebacks: comebacksRef.current,
      });
      if (newAchievements.length > 0) setAchievementQueue((prev) => [...prev, ...newAchievements]);
      const streakMilestones = [
        { at: 3, name: "Getting Warm!", icon: "🔥", description: "3 in a row!" },
        { at: 5, name: "On Fire!", icon: "🔥", description: "5 in a row!" },
        { at: 10, name: "Unstoppable!", icon: "⚡", description: "10 in a row!" },
        { at: 25, name: "LEGENDARY!", icon: "👑", description: "25 in a row!" },
      ];
      const milestone = streakMilestones.find((m) => m.at === newStreak);
      // Only an unassisted correct answer reaches a milestone: a first miss
      // leaves the streak unchanged (confidence pass), so without this guard
      // the milestone would fire a second time on that miss.
      if (isCorrect && milestone) setAchievementQueue((prev) => [...prev, milestone]);
    }

    const newTotal = sessionStats.total + 1;
    if (profileId && newTotal >= 10) {
      setDailyStreak(updateStreak(profileId, newTotal));
    }

    if (isCorrect) {
      setStreak((s) => s + 1);
      setMissRun(0);
      setFeedback("correct");
      setTimeout(() => pickNewItem(), 900);
    } else {
      setFirstSubmit(Number.isNaN(enteredValue) ? null : enteredValue);
      setFeedback("incorrect");
      setShowScaffold(true);
      setReaskMarks(emptyMarks()); // R1/§9.3: marks reset at the re-ask
      setRetry({ phase: "ask", value: initialRetryValue(currentItem) });
      setMissCount((n) => n + 1);
      setMissRun((n) => n + 1);
    }
  }, [currentItem, evaluateAnswer, profileId, moduleId, streak, sessionStats, sessionStartTime, mod, pickNewItem, mode, lockedMode, userHidScaffold, showScaffold, pictureRequested]);

  const handleSubmit = useCallback(() => {
    if (!currentItem || feedback) return;
    if (currentItem.answerType === "singleNumber") {
      if (userAnswer === "") return;
      handleAnswer({ type: "singleNumber", value: userAnswer });
    }
  }, [currentItem, feedback, userAnswer, handleAnswer]);

  // The column pad's Check. No auto-submit anywhere: this only fires from the
  // pad's Check key (enabled only for a contiguous run ending at the ones cell).
  const handleColumnSubmit = useCallback((digits) => {
    if (!currentItem || feedback) return;
    handleAnswer({ type: "column", value: digits });
  }, [currentItem, feedback, handleAnswer]);

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  // ---- Concrete chart actions (§4.1). The app moves discs ONLY on a tap and
  // never prints the resulting counts. Every trade mirrors into the grid's marks.
  const handleChartTrade = useCallback((idx) => {
    if (!currentItem) return;
    const next = currentItem.op === "+" ? tradeAdd(disc, idx) : tradeSub(disc, idx);
    if (next === disc) return;
    setDisc(next);
    setNotice(null);
    if (currentItem.answerType === "column") setCardMarks((m) => mirrorChartTrade(currentItem, m, idx));
  }, [currentItem, disc]);

  const handleChartTake = useCallback((idx) => {
    if (!currentItem || currentItem.op !== "-") return;
    const n = digitArr(currentItem.b, currentItem.columns)[idx];
    const { state, notice: refusal } = takeSub(disc, idx, n);
    setDisc(state);
    setNotice(refusal);
  }, [currentItem, disc]);

  // A tap on a top digit (Pictorial / Abstract / re-ask). Marks are optional and
  // unscored, but a tap that can't do anything must not be silent.
  const makeTopTap = (marks, setMarks) => (idx) => {
    if (!currentItem) return;
    const next = applyTopTap(currentItem, marks, idx);
    if (next !== marks) { setMarks(next); return; }
    if (currentItem.op === "-") {
      setMarkNotice("Nothing to regroup here");
      if (markNoticeTimerRef.current) clearTimeout(markNoticeTimerRef.current);
      markNoticeTimerRef.current = setTimeout(() => setMarkNotice(null), 1800);
    }
  };

  const handleStartOver = useCallback(() => {
    if (!currentItem) return;
    setDisc(initDiscState(currentItem));
    setCardMarks(emptyMarks());
    setNotice(null);
  }, [currentItem]);

  useEffect(() => {
    if (retry.phase !== "ask") return undefined;
    setRevealStage(0);
    const t1 = setTimeout(() => setRevealStage(1), 400);
    const t2 = setTimeout(() => setRevealStage(2), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [retry.phase, currentItem?.itemKey]);

  // R1 (docs/wrong-answer-reveal-spec.md) — Record once, at first submit;
  // the re-answer is never logged. The outcome of an item is recorded
  // exactly once, at the first submission (handleAnswer, above): a wrong
  // answer calls updateMastery(..., false) (−1, floor 0), increments
  // sessionStats.total with no increment to correct, and enters the reveal.
  // The re-answer inside the reveal is an assisted attempt (picture,
  // derivation line on screen) — understanding, not fluency — and is NOT
  // logged. It must not: call updateMastery, change correct/attempts/
  // masteredAt/lastSeen/the review interval, change sessionStats, call
  // checkAfterAnswer or any streak milestone, or count toward the daily
  // streak threshold. C3 (docs/confidence-pass-spec.md): the streak is
  // unchanged by the first miss; a SECOND miss (this same reveal, wrong
  // again) resets it to 0 — see the "missed" branch below. Nothing in
  // finishRetry/handleRetrySubmit/handleRetryColumnSubmit touches mastery,
  // stats, or achievements — only evaluateAnswer (pure) and pickNewItem.
  const finishRetry = useCallback((isCorrect, displayValue) => {
    if (!currentItem) return;
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (isCorrect) {
      setRetry({ phase: "done", value: displayValue });
      recordAssistedInSession(profileId, moduleId);
      advanceTimeoutRef.current = setTimeout(() => pickNewItem(), 900);
    } else {
      setStreak(0);
      setRetry({ phase: "missed", value: currentItem.correctAnswer });
      const offset = 3 + (hashString(currentItem.itemKey) % 3);
      comebackQueueRef.current = [...comebackQueueRef.current, { itemKey: currentItem.itemKey, dueIn: offset }];
      advanceTimeoutRef.current = setTimeout(() => pickNewItem(), 2500);
    }
  }, [currentItem, pickNewItem, profileId, moduleId]);

  const handleRetrySubmit = useCallback(() => {
    if (!currentItem || retry.phase !== "ask") return;
    if (currentItem.answerType === "singleNumber") {
      if (retry.value === "") return;
      finishRetry(evaluateAnswer(currentItem, { type: "singleNumber", value: retry.value }), retry.value);
    }
  }, [currentItem, retry, evaluateAnswer, finishRetry]);

  const handleRetryColumnSubmit = useCallback((digits) => {
    if (!currentItem || retry.phase !== "ask") return;
    finishRetry(evaluateAnswer(currentItem, { type: "column", value: digits }), digits);
  }, [currentItem, retry, evaluateAnswer, finishRetry]);

  const handleRetryKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (retry.phase === "ask") {
      handleRetrySubmit();
    } else if (retry.phase === "missed") {
      if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null; }
      pickNewItem();
    }
  };

  const getGroupProgress = useCallback((groupId) => {
    const groupItems = ADD_POOL.filter((i) => i.group === groupId);
    const mastered = groupItems.filter((i) => getMasteryLevel(i.itemKey) >= DEFAULT_MASTERY_THRESHOLD).length;
    return { total: groupItems.length, mastered };
  }, [getMasteryLevel]);

  if (!mod) return <div style={{ padding: 40, textAlign: "center" }}>Module not found</div>;

  // Short viewports (320×568): the column re-ask (grid + pad) is tight, so the
  // reveal swaps to a one-line header, drops the prompt text and compacts the
  // grid/pad. Read at render; a resize while the reveal is open is not tracked.
  const tight = typeof window !== "undefined" && window.innerHeight < 640;
  // Merely short (e.g. 375×667): keep the layout but drop the "Tap a top digit"
  // hint row from the re-ask grid so Check stays on screen.
  const snug = typeof window !== "undefined" && window.innerHeight < 720;

  // Concrete: the interactive chart. Pictorial / Abstract-with-Show-me: the
  // untraded question, labels only.
  const chartInteractive = mode === "concrete" && !feedback;
  const isColumn = currentItem?.answerType === "column";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{
      minHeight: "100vh",
      background: `repeating-linear-gradient(0deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), repeating-linear-gradient(90deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), ${COLORS.bg}`,
      fontFamily: "'Space Grotesk', sans-serif",
      padding: 0,
    }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeSlideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes correctPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        @keyframes showMePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        .showMePulse { display: inline-block; animation: showMePulse 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .showMePulse { animation: none; } }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      {/* ========= HEADER ========= */}
      <div ref={headerRef} style={{
        background: COLORS.yellow,
        padding: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) clamp(12px,4vw,20px) 10px",
        borderBottom: `4px solid ${COLORS.black}`,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            {onBack && (
              <button onClick={onBack} aria-label="Home" style={{
                minWidth: 44, minHeight: 44, padding: "6px 8px", borderRadius: 6, border: BRUTAL_BORDER_SM,
                backgroundColor: "white", color: COLORS.black, boxShadow: BRUTAL_SHADOW_SM,
                cursor: "pointer", transition: "all 0.1s ease", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 3L21 9.5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9.5Z"
                    stroke={COLORS.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 22V12H15V22" stroke={COLORS.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <LogoLockup size="medium" boltVariant="rev" style={{ flex: 1 }} />
            {profileAvatar && (
              <div style={{
                width: 44, height: 44, borderRadius: "50%", border: BRUTAL_BORDER_SM,
                backgroundColor: "white", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 24, boxShadow: BRUTAL_SHADOW_SM, flexShrink: 0,
              }}>
                {AVATARS.find((a) => a.id === profileAvatar)?.emoji || profileAvatar}
              </div>
            )}
          </div>

          {(() => {
            const masteryData = getMasteryData();
            // C4 "working group" rule (docs/confidence-pass-spec.md, "As
            // built" 2026-09-14), extended for `supporting` groups (§2/§8):
            // framed against the locked group, else the focused skill's group,
            // else the first accessible NON-supporting group (module order)
            // that is not fully mastered; all done -> the last such group.
            const focusGroupId = focusSkill ? mod.groups.find((g) => g.skills.includes(focusSkill))?.id : null;
            const groupStats = mod.groups
              .filter((g) => isContentAccessible(moduleId, g.id))
              .filter((g) => {
                if (lockedGroupId) return g.id === lockedGroupId;
                if (focusGroupId) return g.id === focusGroupId;
                return !g.supporting;
              })
              .map((g) => {
                const items = ADD_POOL.filter((i) => i.group === g.id);
                const total = items.length;
                const done = items.filter((i) => (masteryData[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length;
                return { group: g, total, done };
              })
              .filter((gs) => gs.total > 0);
            const totalItems = groupStats.reduce((n, gs) => n + gs.total, 0);
            const masteredItems = groupStats.reduce((n, gs) => n + gs.done, 0);
            const masteryPct = totalItems > 0 ? Math.round((masteredItems / totalItems) * 100) : 0;
            const working = groupStats.find((gs) => gs.done < gs.total) || groupStats[groupStats.length - 1] || null;
            let pillValue = `${masteredItems}/${totalItems}`;
            let pillLabel = "Mastered";
            if (working) {
              pillValue = `${working.done}/${working.total}`;
              pillLabel = working.group.label;
            }
            return (
              <div style={{ display: "flex", gap: 6, alignItems: "stretch", marginBottom: 8, minHeight: 56 }}>
                <div style={{
                  flex: 1.5, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  backgroundColor: masteryPct === 100 ? COLORS.green : "white",
                  color: COLORS.black,
                  border: BRUTAL_BORDER_SM, borderRadius: 8, padding: "8px 12px",
                  boxShadow: BRUTAL_SHADOW_SM, gap: 3,
                }}>
                  <span style={{ fontSize: "clamp(14px, 5vw, 20px)", lineHeight: 1, whiteSpace: "nowrap" }}>⭐ {pillValue}</span>
                  <span style={{ fontSize: 9, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center", lineHeight: 1.15 }}>{pillLabel}</span>
                </div>
                <div style={{
                  flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  backgroundColor: "white", border: BRUTAL_BORDER_SM, borderRadius: 8,
                  padding: "8px 4px", boxShadow: BRUTAL_SHADOW_SM, gap: 3,
                }}>
                  <span style={{ fontSize: "clamp(14px, 5vw, 20px)", lineHeight: 1, whiteSpace: "nowrap" }}>{sessionStats.correct}/{sessionStats.total}</span>
                  <span style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>Session</span>
                </div>
                <div style={{
                  flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  backgroundColor: streak >= 3 ? COLORS.orange : "white",
                  color: COLORS.black,
                  border: BRUTAL_BORDER_SM, borderRadius: 8,
                  padding: "8px 4px", boxShadow: BRUTAL_SHADOW_SM, gap: 3,
                }}>
                  <span style={{ fontSize: "clamp(14px, 5vw, 20px)", lineHeight: 1, whiteSpace: "nowrap" }}>🔥 {streak}</span>
                  <span style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>Streak</span>
                </div>
                {dailyStreak && dailyStreak.current > 0 && (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "10px 10px",
                    background: dailyStreak.current >= 7 ? COLORS.orange : COLORS.cream,
                    border: BRUTAL_BORDER_SM, borderRadius: 8,
                    fontFamily: "'Space Mono', monospace", fontWeight: 700,
                    color: COLORS.black,
                    boxShadow: BRUTAL_SHADOW_SM, gap: 3,
                  }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>
                      {dailyStreak.current >= 30 ? "👑" : "📅"} {dailyStreak.current}
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>Days</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ========= BODY ========= */}
      <div style={{ padding: "clamp(24px,6vw,40px) clamp(12px,4vw,20px) 40px" }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>

          {/* ===== PROGRESS VIEW ===== */}
          {view === "progress" && (
            <div style={{ animation: "fadeSlideUp 0.3s ease both" }}>
              {profileId && (() => {
                const allAch = getAllAchievementsForProfile(profileId, mod);
                const earned = allAch.filter((a) => a.unlocked);
                return (
                  <div style={{
                    backgroundColor: "white", borderRadius: 12, padding: 18,
                    marginBottom: 14, border: BRUTAL_BORDER, boxShadow: `5px 5px 0px ${COLORS.purple}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>Achievements</h3>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                        {earned.length}/{allAch.length}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {allAch.map((a) => (
                        <div key={a.id} style={{
                          display: "flex", flexDirection: "column", alignItems: "center",
                          padding: "10px 4px 8px", borderRadius: 8,
                          backgroundColor: a.unlocked ? COLORS.cream : "#F5F5F5",
                          border: a.unlocked ? BRUTAL_BORDER_SM : "2px solid #E0E0E0",
                          boxShadow: a.unlocked ? `2px 2px 0px ${COLORS.black}` : "none",
                          opacity: a.unlocked ? 1 : 0.45,
                        }}>
                          <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 4 }}>{a.unlocked ? (a.icon || "⭐") : "🔒"}</div>
                          <div style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{a.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div style={{
                backgroundColor: "white", borderRadius: 12, padding: 18,
                marginBottom: 14, border: BRUTAL_BORDER, boxShadow: BRUTAL_SHADOW,
              }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>Practice Mode</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "concrete", label: "Concrete", sub: "Touch the math" },
                    { id: "pictorial", label: "Pictorial", sub: "See it fade" },
                    { id: "abstract", label: "Abstract", sub: "Symbols only" },
                  ].map((m) => (
                    <button key={m.id}
                      disabled={!!lockedMode}
                      onClick={() => {
                        if (lockedMode) return;
                        hasExplicitModeRef.current = true;
                        setPickedMode(m.id);
                        setPreferredMode(profileId, moduleId, m.id);
                      }}
                      style={{
                        flex: 1, padding: "10px 6px", borderRadius: 10, border: BRUTAL_BORDER_SM,
                        backgroundColor: mode === m.id ? MODULE_COLORS.add : "white",
                        color: COLORS.black,
                        fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                        cursor: lockedMode ? "default" : "pointer",
                        opacity: lockedMode && mode !== m.id ? 0.45 : 1,
                        boxShadow: mode === m.id ? "none" : BRUTAL_SHADOW_SM,
                        transition: "all 0.15s ease",
                      }}>
                      {m.label}
                      <div style={{ fontSize: 9, opacity: 0.7, marginTop: 3 }}>{m.sub}</div>
                    </button>
                  ))}
                </div>
                {lockedMode && (
                  <p style={{ margin: "10px 0 0", fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace" }}>
                    🔒 Locked by a parent in Parent Zone
                  </p>
                )}
              </div>

              <button onClick={() => { setFocusSkill(null); setView("practice"); }}
                style={{
                  width: "100%", padding: 14, borderRadius: 12,
                  border: BRUTAL_BORDER, backgroundColor: COLORS.yellow, color: COLORS.black,
                  fontWeight: 700, cursor: "pointer", fontFamily: "'Shrikhand', cursive",
                  fontSize: 16, boxShadow: BRUTAL_SHADOW, marginBottom: 14,
                }}>
                Practice Add &amp; Subtract!
              </button>

              {mod.groups.map((group) => {
                const prog = getGroupProgress(group.id);
                const accessible = isContentAccessible(moduleId, group.id);
                // A parent lock on another group: this group's skills can't be focused.
                const groupLockedOut = !!lockedGroupId && group.id !== lockedGroupId;
                const groupItems = ADD_POOL.filter((i) => i.group === group.id);
                // Column pairs ("2,346+1,527") need wider cells than fact pairs ("9 + 2").
                const cellCols = group.id === "facts" ? 5 : 3;
                return (
                  <div key={group.id} style={{
                    backgroundColor: "white", borderRadius: 12, padding: 18,
                    marginBottom: 14, border: BRUTAL_BORDER,
                    boxShadow: accessible ? `5px 5px 0px ${group.color}` : "5px 5px 0px #CCC",
                    opacity: accessible ? 1 : 0.7,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>
                        {accessible ? "" : "🔒 "}{group.label}
                      </h3>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                        {prog.mastered}/{prog.total}
                      </span>
                    </div>
                    {group.supporting && (
                      <p style={{ margin: "-4px 0 12px", fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace" }}>
                        Optional warm-up — tap a skill to practise it
                      </p>
                    )}
                    {lockedGroupId === group.id && (
                      <p style={{ margin: "-4px 0 12px", fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace" }}>
                        🔒 Locked to this group by a parent in Parent Zone
                      </p>
                    )}
                    {accessible ? (
                      <>
                        <div style={{
                          height: 12, borderRadius: 6, backgroundColor: "#EEE",
                          border: BRUTAL_BORDER_SM, overflow: "hidden", marginBottom: 14,
                        }}>
                          <div style={{
                            height: "100%",
                            width: `${prog.total > 0 ? (prog.mastered / prog.total) * 100 : 0}%`,
                            backgroundColor: group.color, transition: "width 0.5s ease",
                          }} />
                        </div>
                        {(() => {
                          const bySkill = [];
                          groupItems.forEach((item) => {
                            let bucket = bySkill.find((b) => b.skill === item.skill);
                            if (!bucket) { bucket = { skill: item.skill, items: [] }; bySkill.push(bucket); }
                            bucket.items.push(item);
                          });
                          return bySkill.map(({ skill, items }) => (
                            <div key={skill} style={{ marginBottom: 14 }}>
                              {/* Skill focus selector: tap a skill to practise
                                  only that skill. The row is the target (≥44px). */}
                              <button
                                disabled={groupLockedOut}
                                onClick={() => { if (groupLockedOut) return; setFocusSkill(skill); setView("practice"); }}
                                aria-label={`Practise only ${addModule.skillLabels?.[skill] || skill}`}
                                style={{
                                  width: "100%", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between",
                                  gap: 8, padding: "6px 10px", marginBottom: 6, borderRadius: 8, cursor: groupLockedOut ? "default" : "pointer",
                                  opacity: groupLockedOut ? 0.5 : 1,
                                  border: BRUTAL_BORDER_SM, boxShadow: focusSkill === skill || groupLockedOut ? "none" : BRUTAL_SHADOW_SM,
                                  transform: focusSkill === skill ? "translate(3px, 3px)" : "none",
                                  backgroundColor: focusSkill === skill ? COLORS.yellow : "white",
                                  fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: COLORS.black, textAlign: "left",
                                }}>
                                <span>{addModule.skillLabels?.[skill] || skill}</span>
                                <span style={{ fontSize: 10, opacity: 0.7, whiteSpace: "nowrap" }}>
                                  {groupLockedOut ? "🔒 locked" : focusSkill === skill ? "practising ✓" : "practise this ›"}
                                </span>
                              </button>
                              <div style={{ display: "grid", gridTemplateColumns: `repeat(${cellCols}, 1fr)`, gap: 5 }}>
                                {items.map((item) => {
                                  const level = getMasteryLevel(item.itemKey);
                                  const mastered = level >= DEFAULT_MASTERY_THRESHOLD;
                                  return (
                                    <div key={item.itemKey} style={{
                                      padding: "5px 3px", borderRadius: 6,
                                      backgroundColor: mastered ? group.color : "#F8F8F8",
                                      border: mastered ? BRUTAL_BORDER_SM : "2px solid #E0E0E0",
                                      textAlign: "center", fontSize: 10,
                                      fontFamily: "'Space Mono', monospace",
                                      fontWeight: mastered ? 700 : 400,
                                      boxShadow: mastered ? `2px 2px 0px ${COLORS.black}` : "none",
                                    }}>
                                      <div style={{ lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {item.display}
                                      </div>
                                      <div style={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
                                        <MasteryDots level={Math.min(level, DEFAULT_MASTERY_THRESHOLD)} max={DEFAULT_MASTERY_THRESHOLD} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ));
                        })()}
                      </>
                    ) : (
                      <div style={{ textAlign: "center", padding: "12px 0" }}>
                        <div style={{ fontSize: 13, color: "#888", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8 }}>
                          Ask a parent to unlock this group!
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== PRACTICE VIEW ===== */}
          {view === "practice" && (
            currentItem ? (
              <div style={{ animation: "fadeSlideUp 0.3s ease both" }}>
                <div style={{
                  backgroundColor: "white", borderRadius: 14,
                  padding: "clamp(16px,4vw,32px) clamp(12px,3vw,24px) clamp(14px,3.5vw,28px)",
                  border: BRUTAL_BORDER,
                  boxShadow: feedback === "correct"
                    ? `4px 4px 0px ${COLORS.green}`
                    : feedback === "incorrect"
                      ? `4px 4px 0px ${COLORS.red}`
                      : `4px 4px 0px ${COLORS.black}`,
                  textAlign: "center",
                  animation: feedback === "correct"
                    ? "correctPulse 0.4s ease"
                    : feedback === "incorrect"
                      ? "shake 0.4s ease"
                      : "none",
                  transition: "box-shadow 0.3s ease",
                }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <MasteryDots level={Math.min(getMasteryLevel(currentItem.itemKey), DEFAULT_MASTERY_THRESHOLD)} max={DEFAULT_MASTERY_THRESHOLD} />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                      backgroundColor: addModule.groups.find((g) => g.id === currentItem.group)?.color || COLORS.purple,
                      color: COLORS.black, padding: "3px 10px", borderRadius: 20, border: BRUTAL_BORDER_SM,
                    }}>
                      {addModule.skillLabels[currentItem.skill] || currentItem.skill}
                    </span>
                    {focusSkill && (
                      <div style={{ marginTop: 8 }}>
                        <button onClick={() => setFocusSkill(null)} style={{
                          minHeight: 44, padding: "8px 14px", borderRadius: 8, border: BRUTAL_BORDER_SM,
                          backgroundColor: COLORS.cream, boxShadow: BRUTAL_SHADOW_SM, cursor: "pointer",
                          fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: COLORS.black,
                        }}>
                          Only this skill · ✕ practise everything
                        </button>
                      </div>
                    )}
                  </div>

                  <div ref={questionRef}><QuestionDisplay item={currentItem} /></div>

                  {nudge === "notSure" && (
                    <div style={{
                      marginTop: 16, display: "inline-block",
                      fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                      fontSize: "clamp(14px, 4vw, 16px)", color: COLORS.black,
                      backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM,
                      borderRadius: 8, padding: "6px 12px",
                    }}>
                      Not sure? Count the picture.
                    </div>
                  )}

                  {(showScaffold || (!userHidScaffold && scaffoldOpacity > 0)) && (
                    <div
                      ref={chartWrapRef}
                      onClick={mode === "pictorial" && scaffoldOpacity > 0 && !showScaffold && !userHidScaffold
                        ? () => setUserHidScaffold(true)
                        : undefined}
                      style={{ cursor: mode === "pictorial" && scaffoldOpacity > 0 && !showScaffold && !userHidScaffold ? "pointer" : "default" }}
                    >
                      <ScaffoldForItem
                        item={currentItem}
                        disc={disc}
                        showScaffold={showScaffold}
                        scaffoldOpacity={scaffoldOpacity}
                        mode={mode}
                        interactive={chartInteractive}
                        notice={notice}
                        onTrade={handleChartTrade}
                        onTake={handleChartTake}
                        onStartOver={handleStartOver}
                      />
                    </div>
                  )}

                  {mode === "pictorial" && scaffoldOpacity > 0 && !showScaffold && !userHidScaffold && (
                    <div
                      onClick={() => setUserHidScaffold(true)}
                      style={{ marginTop: 6, fontSize: 11, fontFamily: "'Space Mono', monospace", opacity: 0.45, fontWeight: 700, cursor: "pointer" }}
                    >
                      Tap the picture to hide it
                    </div>
                  )}

                  {/* "Show me": Abstract (always) and Pictorial (faded/hidden) as in
                      Place Value; in Concrete ONLY for the finish-line on-ramp (§8),
                      where it restores the INTERACTIVE chart. */}
                  {!feedback && (
                    (mode === "abstract" && !showScaffold) ||
                    (mode === "pictorial" && !showScaffold && (userHidScaffold || scaffoldOpacity < 1)) ||
                    (mode === "concrete" && !showScaffold && userHidScaffold)
                  ) && (
                    <div style={{ marginTop: 12, textAlign: "center" }}>
                      <span className={mode === "abstract" && missRun >= 2 ? "showMePulse" : undefined}>
                        <BrutalButton
                          small
                          onClick={() => { setShowScaffold(true); setPictureRequested(true); }}
                          bg={COLORS.cream}
                        >
                          Show me
                        </BrutalButton>
                      </span>
                    </div>
                  )}

                  {feedback === "correct" && (
                    <div style={{
                      marginTop: 16, fontSize: 16, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace",
                      color: COLORS.green,
                      animation: "fadeSlideUp 0.3s ease both",
                    }}>
                      {["NICE!", "GOT IT!", "YES!", "CORRECT!", "BOOM!"][sessionStats.total % 5]}
                    </div>
                  )}

                  {/* singleNumber (facts) — typed answer + mandatory Check */}
                  {currentItem.answerType === "singleNumber" && (
                    <div onKeyDown={handleKeyDown}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 20, gap: 12 }}>
                        <input
                          ref={inputRef}
                          type="number" inputMode="numeric"
                          value={userAnswer} placeholder="?"
                          disabled={!!feedback}
                          onChange={(e) => setUserAnswer(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={handleKeyDown}
                          style={{
                            width: 160, fontSize: 48, fontFamily: "'Shrikhand', cursive",
                            fontWeight: 400, textAlign: "center",
                            border: "none", borderBottom: `4px solid ${COLORS.black}`,
                            backgroundColor: "transparent", color: COLORS.black, outline: "none",
                            padding: "4px 0", MozAppearance: "textfield", WebkitAppearance: "none",
                          }}
                        />
                        {!feedback && (
                          <BrutalButton onClick={handleSubmit} bg={COLORS.yellow}>Check!</BrutalButton>
                        )}
                      </div>
                    </div>
                  )}

                  {/* column — the grid + the in-app pad. MUST stay the LAST child of
                      the card: the pad is position: sticky to the viewport bottom
                      inside this card (§5.2). No <input> exists for this answerType. */}
                  {isColumn && (
                    <ColumnAnswerInput
                      key={`${currentItem.itemKey}:${retryResetKey}`}
                      item={currentItem}
                      marks={cardMarks}
                      // Concrete: marks mirror the chart, so the top-row taps are off.
                      marksInteractive={mode !== "concrete" && !feedback}
                      onTopTap={makeTopTap(cardMarks, setCardMarks)}
                      markNotice={markNotice}
                      headerRef={headerRef}
                      getClampEl={getClampEl}
                      onUndoMarks={() => setCardMarks(emptyMarks())}
                      onSubmit={handleColumnSubmit}
                      live={!feedback}
                      sticky
                      state={feedback === "correct" ? "correct" : "input"}
                      tradeVerb={REGROUP.verb}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", animation: "fadeSlideUp 0.3s ease both" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700,
                  color: COLORS.black, marginBottom: 8,
                }}>
                  No items in this group
                </div>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: "#666",
                  marginBottom: 20, maxWidth: 280, margin: "0 auto 20px",
                }}>
                  Ask a parent to unlock more Add &amp; Subtract content in the Parent Zone!
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#999" }}>
                  Add &amp; Subtract unlocks in Parent Zone → Modules
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Wrong-answer reveal — one tokenState drives every count chip AND the
          derivation line's token (docs/confidence-pass-spec.md C1). */}
      {currentItem && (() => {
        const tokenState = retry.phase === "done" ? "correct" : retry.phase === "missed" ? "numeral" : "blank";
        const line = retry.phase === "missed"
          ? (
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(16px, 4.6vw, 18px)", fontWeight: 700, lineHeight: 1.3 }}>
              Still tricky. Here it is — we&apos;ll come back to it.
            </span>
          )
          : revealStage >= 1
            ? (
              // Tight screens cap the derivation line at 3 lines.
              <span style={tight ? { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}>
                <DerivationLine segments={buildAddLine(currentItem, tokenState, firstSubmit) || []} />
              </span>
            )
            : null;
        const columnReveal = currentItem.answerType === "column";
        const header = columnReveal && tight
          ? TIGHT_HEADER
          : HEADER_TAILS[hashString(currentItem.itemKey) % HEADER_TAILS.length];

        return (
          <WrongAnswerReveal
            open={feedback === "incorrect"}
            focusDelayMs={1000}
            pictureMax={revealPictureMax(currentItem.answerType, tight)}
            fit="width"
            autoFocus={TYPED_ANSWER_TYPES.has(currentItem.answerType)}
            header={header}
            problem={buildProblem(currentItem)}
            picture={revealPicture(currentItem, tokenState, mode === "abstract", firstSubmit)}
            line={line}
            prompt={retry.phase === "ask" && revealStage >= 2 && !(columnReveal && tight) ? "Now you — use the picture." : null}
            input={(() => {
              const { answerType } = currentItem;

              if (answerType === "column") {
                // Re-ask (§9.3): answer row emptied, marks reset, cursor on the
                // ones cell, pad live after ~900ms (revealStage 2). A second
                // miss fills the answer on yellow AND draws the correct marks.
                return (
                  <div style={{ width: "100%" }}>
                    <ColumnAnswerInput
                      key={`${currentItem.itemKey}:reask`}
                      item={currentItem}
                      marks={reaskMarks}
                      marksInteractive={retry.phase === "ask" && revealStage >= 2}
                      onTopTap={makeTopTap(reaskMarks, setReaskMarks)}
                      markNotice={markNotice}
                      onUndoMarks={() => setReaskMarks(emptyMarks())}
                      onSubmit={handleRetryColumnSubmit}
                      live={retry.phase === "ask" && revealStage >= 2}
                      state={retry.phase === "done" ? "correct" : retry.phase === "missed" ? "missed" : "input"}
                      fill={retry.phase === "ask" || retry.phase === "idle" ? null : correctDigitCells(currentItem)}
                      fillMarks={retry.phase === "missed" ? canonicalMarks(currentItem) : null}
                      compact={tight}
                      hintRow={!snug}
                      reserveHintRow={!snug}
                      tradeVerb={REGROUP.verb}
                    />
                  </div>
                );
              }

              if (answerType === "singleNumber") {
                return (
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, width: "100%" }}>
                    <input
                      type="number" inputMode="numeric"
                      value={retry.phase === "missed" ? String(currentItem.correctAnswer) : (retry.value ?? "")}
                      placeholder="?"
                      disabled={retry.phase !== "ask" || revealStage < 2}
                      onChange={(e) => setRetry((r) => ({ ...r, value: e.target.value.replace(/\D/g, "") }))}
                      onKeyDown={handleRetryKeyDown}
                      style={{
                        width: "clamp(110px, 36vw, 160px)", height: "64px", boxSizing: "border-box",
                        fontSize: "clamp(32px, 9vw, 44px)", fontFamily: "'Shrikhand', cursive",
                        fontWeight: 400, textAlign: "center", border: "none",
                        borderBottom: `4px solid ${COLORS.black}`,
                        backgroundColor: retry.phase === "missed" ? COLORS.yellow : retry.phase === "done" ? COLORS.green : COLORS.cream,
                        color: COLORS.black, outline: "none", padding: "2px 0",
                        WebkitAppearance: "none", MozAppearance: "textfield",
                        animation: retry.phase === "done" ? "correctPulse 0.4s ease" : "none",
                        transition: "background-color 0.3s ease",
                      }}
                    />
                    {retry.phase === "ask" && revealStage >= 2 && (
                      <BrutalButton onClick={handleRetrySubmit} bg={COLORS.yellow} style={{ minHeight: 48, fontSize: 18, flex: 1 }}>Check</BrutalButton>
                    )}
                  </div>
                );
              }

              return null;
            })()}
          />
        );
      })()}

      {achievementQueue.length > 0 && (
        <AchievementPopup
          achievement={achievementQueue[0]}
          onDismiss={() => setAchievementQueue((prev) => prev.slice(1))}
        />
      )}
    </div>
  );
}
