/**
 * AddPractice — practice screen for the Add & Subtract module.
 *
 * Mirrors fractions-practice.jsx structure exactly:
 *  - Same state layout (all hooks first, no conditional hooks)
 *  - Same spaced-repetition / weighted-draw engine
 *  - Same mastery persistence via dataManager (moduleId="add")
 *  - Same header / stats / streak / achievement popup
 *
 * Add-specific differences:
 *  - Multiple answerType renderers: "number", "choice" (K2), "column" (R), "barChoice" (W)
 *  - Scaffold selected by item.group prefix
 *  - Two-tier mastery gate: shouldAllowTier2 (80% of T1 items)
 *  - Per-group 60% sub-gates (N2 after N1, M2 after M1, R2 after R1, etc.)
 *  - Tier 2 groups visible-but-locked (purchase gate + skill gate messaging)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM,
  DEFAULT_MASTERY_THRESHOLD, AVATARS,
} from "./constants.js";
import addModule, {
  ADD_POOL, TIER1_KEYS, shouldAllowTier2, getSkillSubGateStatus,
} from "./modules/add.jsx";
import { registerModule, getModule } from "./modules/moduleRegistry.js";
import {
  initData, getMastery, updateMastery, updateStreak, checkStreakOnLaunch,
  recordAnswerInSession, finalizeLiveSession, getProfile, getPreferredMode, setPreferredMode,
} from "./dataManager.js";
import { checkAfterAnswer, getAllAchievementsForProfile } from "./achievementEngine.js";
import AchievementPopup from "./AchievementPopup.jsx";
import { isContentAccessible, isModuleFullyUnlocked } from "./purchaseManager.js";
import LogoLockup from "./LogoLockup.jsx";
import {
  MasteryDots, AddNumberBond, TenFrame, PlaceValueChart,
  PartWholeBar, ComparisonBar, JumpStrip, TwoStepBarModel, TwoStepChip,
} from "./shared/barComponents.jsx";
import { itemCellLabel } from "./shared/ui.jsx";

// Register the add module on first load
registerModule(addModule);

// ---------------------------------------------------------------------------
// Small reusable UI components (local, matching multiply/fractions style)
// ---------------------------------------------------------------------------

function BrutalButton({ onClick, children, bg = "white", color = COLORS.black, small = false, active = false, style = {} }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? "7px 14px" : "12px 24px",
      borderRadius: 8, border: BRUTAL_BORDER_SM,
      backgroundColor: bg, color,
      fontSize: small ? 13 : 15, fontWeight: 700,
      cursor: "pointer", fontFamily: "'Space Mono', monospace",
      boxShadow: active ? "none" : BRUTAL_SHADOW_SM,
      transform: active ? "translate(3px,3px)" : "none",
      transition: "all 0.1s ease",
      minHeight: 44,
      ...style,
    }}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Shuffled choices — stable per item visit (prevents re-shuffle on re-render)
// ---------------------------------------------------------------------------
function useShuffledChoices(item) {
  const prev = useRef(null);
  if (!prev.current || prev.current.key !== item?.itemKey) {
    if (item && item.answerType === "choice" && item.choices) {
      // Fisher-Yates shuffle
      const all = [...item.choices];
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      prev.current = { key: item.itemKey, choices: all };
    } else {
      prev.current = { key: item?.itemKey, choices: [] };
    }
  }
  return prev.current.choices;
}

// ---------------------------------------------------------------------------
// Column input — multi-field place-value input for R-group items.
// Builds the answer as a single integer matching item.correctAnswer.
// One input field per digit of the expected answer; rightmost = ones.
// ---------------------------------------------------------------------------
function ColumnInput({ item, value, onChange, onSubmit, disabled }) {
  // Determine number of digits in the answer
  const ansStr = String(Math.abs(item.correctAnswer));
  const numDigits = ansStr.length; // 3 or 4

  // value is a string array of length numDigits (index 0 = leftmost digit)
  const digits = value.length === numDigits ? value : Array(numDigits).fill("");

  const fieldRefs = useRef([]);

  function handleDigitChange(i, raw) {
    // Accept only the last typed digit
    const ch = raw.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[i] = ch;
    onChange(next);
    // Auto-advance
    if (ch && i < numDigits - 1) {
      fieldRefs.current[i + 1]?.focus();
    }
    // Auto-submit if all filled
    if (ch && next.every(d => d !== "")) {
      // slight delay so state settles
      setTimeout(() => onSubmit(next), 50);
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      fieldRefs.current[i - 1]?.focus();
    }
    if (e.key === "Enter" && digits.every(d => d !== "")) {
      onSubmit(digits);
    }
  }

  const placeLabels = numDigits === 4
    ? ["Th", "H", "T", "O"]
    : ["H", "T", "O"];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 16 }}>
      {/* Problem display in column format */}
      <div style={{
        display: "inline-flex", flexDirection: "column", alignItems: "flex-end",
        gap: 2, fontFamily: "'Shrikhand', cursive",
      }}>
        {/* Place labels */}
        <div style={{ display: "flex", gap: 4, marginBottom: 2 }}>
          {placeLabels.map((lbl, i) => (
            <div key={i} style={{
              width: 44, textAlign: "center",
              fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
              color: "#888",
            }}>{lbl}</div>
          ))}
        </div>
        {/* Top number */}
        <div style={{ display: "flex", gap: 4 }}>
          {String(item.a).padStart(numDigits, " ").split("").map((d, i) => (
            <div key={i} style={{
              width: 44, height: 52, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, color: COLORS.black,
            }}>{d.trim() ? d : ""}</div>
          ))}
        </div>
        {/* Operator + bottom number */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 24, color: item.op === "+" ? COLORS.green : COLORS.orange, marginRight: 4 }}>
            {item.op === "+" ? "+" : "−"}
          </span>
          {String(item.b).padStart(numDigits, " ").split("").map((d, i) => (
            <div key={i} style={{
              width: 44, height: 52, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, color: COLORS.black,
            }}>{d.trim() ? d : ""}</div>
          ))}
        </div>
        {/* Divider */}
        <div style={{ width: numDigits * 48, height: 4, backgroundColor: COLORS.black, borderRadius: 2, margin: "2px 0" }} />
        {/* Answer fields */}
        <div style={{ display: "flex", gap: 4 }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => fieldRefs.current[i] = el}
              type="number"
              value={d}
              disabled={disabled}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              placeholder="?"
              style={{
                width: 44, height: 52, fontSize: 28,
                fontFamily: "'Shrikhand', cursive",
                textAlign: "center", border: "none",
                borderBottom: `3px solid ${d ? COLORS.green : COLORS.black}`,
                backgroundColor: "transparent", color: COLORS.black,
                outline: "none", padding: 0,
                MozAppearance: "textfield", WebkitAppearance: "none",
              }}
            />
          ))}
        </div>
      </div>
      {!disabled && (
        <BrutalButton
          onClick={() => digits.every(d => d !== "") && onSubmit(digits)}
          bg={COLORS.yellow}
          style={{ opacity: digits.every(d => d !== "") ? 1 : 0.5 }}
        >
          Check!
        </BrutalButton>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar-type choice input for W-group items
// ---------------------------------------------------------------------------
function BarTypeChoiceInput({ item, barTypePicked, onPickBarType, userAnswer, onAnswerChange, onSubmit, disabled, feedback }) {
  const barTypes = [
    { id: "partWhole", label: "Part-Whole" },
    { id: "comparison", label: "Comparison" },
  ];

  // For W3, we skip the bar-type choice (it's always twoStep)
  const isW3 = item.skill === "W3";
  const correctBarType = item.correctBarType;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 16, width: "100%" }}>
      {/* Bar-type selection (W1 and W2 only) */}
      {!isW3 && !barTypePicked && !disabled && (
        <div style={{ width: "100%" }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
            textAlign: "center", marginBottom: 8, color: "#666",
          }}>
            Which type of bar model?
          </div>
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320, margin: "0 auto" }}>
            {barTypes.map(bt => (
              <button key={bt.id} onClick={() => onPickBarType(bt.id)}
                style={{
                  flex: 1, padding: "16px 8px", borderRadius: 12, border: BRUTAL_BORDER,
                  backgroundColor: "white", cursor: "pointer",
                  boxShadow: BRUTAL_SHADOW,
                  fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                  color: COLORS.black, minHeight: 60,
                  transition: "background-color 0.15s ease",
                }}>
                {bt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Show wrong-bar feedback (child chose wrong model — let them still answer) */}
      {!isW3 && barTypePicked && barTypePicked !== correctBarType && !feedback && (
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
          backgroundColor: COLORS.orange, border: BRUTAL_BORDER_SM, borderRadius: 8,
          padding: "8px 14px", color: COLORS.black, textAlign: "center", maxWidth: 320,
        }}>
          Hmm — think about what the question is comparing. Try answering anyway!
        </div>
      )}

      {/* Answer input (always shown after bar type is picked, or for W3) */}
      {(isW3 || barTypePicked) && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <input
            type="number"
            value={userAnswer}
            disabled={disabled}
            onChange={e => onAnswerChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && userAnswer !== "") onSubmit(); }}
            placeholder="?"
            style={{
              width: 140, fontSize: 48, fontFamily: "'Shrikhand', cursive",
              fontWeight: 400, textAlign: "center",
              border: "none", borderBottom: `4px solid ${COLORS.black}`,
              backgroundColor: "transparent", color: COLORS.black,
              outline: "none", padding: "4px 0",
              MozAppearance: "textfield", WebkitAppearance: "none",
            }}
          />
          {!disabled && (
            <BrutalButton onClick={onSubmit} bg={COLORS.yellow}>
              Check!
            </BrutalButton>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scaffold for wrong-answer reveal and pictorial fade
// ---------------------------------------------------------------------------
function ScaffoldForItem({ item, showScaffold, scaffoldOpacity, mode, tenFrameMoved, feedback }) {
  if (mode === "abstract" && !showScaffold) return null;
  const opacity = showScaffold ? 1 : scaffoldOpacity;
  if (opacity <= 0) return null;

  const group = item.group;

  // N, K, X, F — number bond
  if (group === "N" || group === "K" || group === "X" || group === "F") {
    const whole = item.whole || (item.a + (item.b || 0)) || item.correctAnswer;
    const partA = item.knownPart || item.partA || item.a || 0;
    const partB = item.missingPart || item.partB || item.b || item.correctAnswer;
    // Before the wrong-answer reveal, blank the unknown node (the one whose value
    // is the answer) so the bond states the question instead of giving it away.
    let hideNode = null;
    if (!showScaffold) {
      const ans = item.correctAnswer;
      if (whole === ans) hideNode = "whole";
      else if (partB === ans) hideNode = "partB";
      else if (partA === ans) hideNode = "partA";
    }
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <AddNumberBond whole={whole} partA={partA} partB={partB} show={true} opLabel="+" hideNode={hideNode} />
      </div>
    );
  }

  // M — ten-frame (in concrete the interactive frame is shown in the question; don't duplicate it)
  if (group === "M") {
    if (mode === "concrete" && !showScaffold) return null;
    if (item.skill === "M1") {
      return (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <TenFrame
            frameA={item.a} frameB={item.b}
            moved={showScaffold ? item.bridge : tenFrameMoved}
            interactive={false}
            opacity={1}
            animate={showScaffold}
          />
        </div>
      );
    }
    // M2 — show the completed tens/ones split
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <TenFrame
          frameA={0} frameB={item.onesM}
          moved={0}
          interactive={false}
          opacity={1}
          animate={showScaffold}
        />
      </div>
    );
  }

  // R — place-value chart (reveal ONLY; the chart shows the answer digits, so it
  // must not appear before the child answers — they work the "?" column fields)
  if (group === "R" && showScaffold) {
    const ansStr = String(item.correctAnswer).padStart(item.digits, "0");
    const digits = ansStr.split("").reverse().map(Number); // [ones, tens, hundreds, ...]
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <PlaceValueChart
          digits={digits}
          op={item.op}
          opacity={1}
          animate={showScaffold}
        />
      </div>
    );
  }

  // S — jump strip (reveal ONLY; the strip lands on the answer. Mental-math is done
  // in the head pre-answer; the strip is the teaching aid shown when wrong)
  if (group === "S" && showScaffold) {
    if (item.skill === "S1") {
      return (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <JumpStrip
            start={item.a}
            jumps={[
              { label: `${item.op}${item.tensB}`, landAt: item.step1 },
              { label: `${item.op}${item.onesB}`, landAt: item.correctAnswer },
            ]}
            animate={showScaffold}
          />
        </div>
      );
    }
    if (item.skill === "S2") {
      return (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <JumpStrip
            start={item.a}
            jumps={[
              { label: `${item.op}${item.toNext}`, landAt: item.nextTen },
              { label: `${item.op}${item.leftover}`, landAt: item.correctAnswer },
            ]}
            animate={showScaffold}
          />
        </div>
      );
    }
    if (item.skill === "S3") {
      return (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <JumpStrip
            start={item.a}
            jumps={[
              { label: `×2`, landAt: item.dbl },
              { label: `+1`, landAt: item.correctAnswer },
            ]}
            animate={showScaffold}
          />
        </div>
      );
    }
  }

  // W — bar model (shown in wrong-answer scaffold only; never pre-shown per spec §5)
  if (group === "W" && showScaffold) {
    if (item.skill === "W1") {
      const whole = item.findWhole ? item.correctAnswer : item.whole;
      const partA = item.findWhole ? item.a : item.b;
      const partB = item.findWhole ? item.b : item.correctAnswer;
      return (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <PartWholeBar
            whole={whole} partA={partA} partB={partB}
            opacity={1} animate={true}
          />
        </div>
      );
    }
    if (item.skill === "W2") {
      const base = item.base || 0;
      const bigger = item.bigger || (item.moreOrFewer === "more" ? item.base + item.diff : item.base);
      const biggerFinal = item.findDiff ? item.bigger : (item.moreOrFewer === "more" ? item.base + item.diff : item.base);
      const baseFinal = item.findDiff ? item.base : item.base;
      return (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <ComparisonBar
            baseValue={baseFinal} baseLabel="Smaller"
            biggerValue={biggerFinal} biggerLabel="Bigger"
            opacity={1} animate={true}
          />
        </div>
      );
    }
    if (item.skill === "W3") {
      return (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <TwoStepBarModel
            step1={{ label: `${item.step1A} ${item.step1Op} ${item.step1B}`, value: item.step1Result }}
            step2={{ label: `${item.step1Result} ${item.step2Op} ${item.step2B}`, value: item.correctAnswer }}
            beat={2} opacity={1} animate={true}
          />
        </div>
      );
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Wrong-answer helpers ("because" + hint + bond)
// ---------------------------------------------------------------------------
function WrongAnswerHelpers({ item, userValue }) {
  const group = item.group;

  // Diagnose common misconceptions
  let becauseText = item.becauseText || `The answer is ${item.correctAnswer}.`;

  // R-group: detect subtract-small-from-large column error
  if (group === "R" && item.op === "-" && typeof userValue === "number") {
    // Classic error: subtracted each column without borrowing
    const aStr = String(item.a);
    const bStr = String(item.b).padStart(aStr.length, "0");
    const wrongSFL = parseInt(
      aStr.split("").map((d, i) => Math.abs(parseInt(d) - parseInt(bStr[i]))).join("")
    );
    if (userValue === wrongSFL) {
      becauseText = `You can't take the bigger digit from the smaller one — rename first!`;
    }
  }

  // W3 step-1 only error
  if (group === "W" && item.skill === "W3" && userValue === item.step1Result) {
    becauseText = `Good start — that's Step 1! Now do Step 2.`;
  }

  // Build hint
  let hint = null;
  if (group === "N" || group === "M" || group === "X" || group === "F") {
    hint = (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 8 }}>
        {Array.from({ length: item.whole || (item.a + item.b) || item.correctAnswer + (item.knownPart || 0) }, (_, i) => (
          <div key={i} style={{
            width: 18, height: 18, borderRadius: "50%",
            backgroundColor: i < (item.knownPart || item.a || 0) ? COLORS.blue : COLORS.green,
            border: `2px solid ${COLORS.black}`,
          }} />
        ))}
      </div>
    );
  }
  if (group === "R") {
    hint = (
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
        color: COLORS.black, textAlign: "center",
        backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: 8,
        padding: "8px 12px", marginTop: 8,
      }}>
        {item.op === "+" ? "10 ones = 1 ten   |   10 tens = 1 hundred" : "1 ten = 10 ones   |   1 hundred = 10 tens"}
      </div>
    );
  }
  if (group === "S") {
    // Jump strip already shown in scaffold
    hint = null;
  }
  if (group === "W" && item.skill === "W3") {
    hint = <TwoStepChip step1Result={item.step1Result} animate={true} />;
  }

  // Number bond
  let bond = null;
  const hasSimpleBond = group === "N" || group === "K" || group === "X" || group === "F";
  if (hasSimpleBond) {
    const whole = item.whole || (item.a + item.b) || (item.correctAnswer + (item.knownPart || 0));
    const partA = item.knownPart || item.partA || item.a || 0;
    const partB = item.missingPart || item.partB || item.correctAnswer;
    bond = <AddNumberBond whole={whole} partA={partA} partB={partB} show={true} opLabel="+" />;
  }
  if (group === "M") {
    bond = (
      <AddNumberBond
        whole={item.skill === "M1" ? item.sum : item.a}
        partA={item.skill === "M1" ? item.a : item.b}
        partB={item.skill === "M1" ? item.b : item.correctAnswer}
        show={true} opLabel={item.skill === "M1" ? "+" : "−"}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
      {/* Because statement */}
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700,
        color: COLORS.black, textAlign: "center",
        backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: 8,
        padding: "10px 14px",
      }}>
        {becauseText}
      </div>

      {hint && <div style={{ textAlign: "center" }}>{hint}</div>}
      {bond && <div style={{ display: "flex", justifyContent: "center" }}>{bond}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question display
// ---------------------------------------------------------------------------
function QuestionDisplay({ item, mode }) {
  const group = item.group;

  // N, F, X — equation with box
  if (group === "N" || group === "F" || group === "X") {
    return (
      <div style={{
        fontFamily: "'Shrikhand', cursive",
        fontSize: "clamp(32px, 12vw, 64px)",
        color: COLORS.black, textAlign: "center",
        lineHeight: 1.1,
      }}>
        {item.display}
      </div>
    );
  }

  // M — make-ten prompt
  if (group === "M") {
    const opColor = item.skill === "M1" ? COLORS.green : COLORS.orange;
    const opSymbol = item.skill === "M1" ? "+" : "−";
    return (
      <div style={{
        fontFamily: "'Shrikhand', cursive",
        fontSize: "clamp(36px, 12vw, 68px)",
        color: COLORS.black, textAlign: "center",
      }}>
        {item.a}
        <span style={{ color: opColor, margin: "0 4px" }}>{opSymbol}</span>
        {item.b} = ?
      </div>
    );
  }

  // K1 — show three sentences, ask for fourth
  if (item.skill === "K1") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600,
          color: "#666", marginBottom: 12,
        }}>
          Complete the fact family:
        </div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700,
          color: COLORS.black, lineHeight: 2,
        }}>
          {item.sentenceA}<br/>
          {item.sentenceB}<br/>
          {item.sentenceC}<br/>
          <span style={{ color: "#EF476F" }}>{item.askedSentence}</span>
        </div>
      </div>
    );
  }

  // K2 — which undoes it?
  if (item.skill === "K2") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600,
          color: "#666", marginBottom: 8,
        }}>
          Which subtraction undoes this?
        </div>
        <div style={{
          fontFamily: "'Shrikhand', cursive",
          fontSize: "clamp(24px, 8vw, 40px)",
          color: COLORS.black,
        }}>
          {item.given}
        </div>
      </div>
    );
  }

  // R — column problem header
  if (group === "R") {
    return (
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700,
        color: "#666", textAlign: "center",
      }}>
        Work it out column by column:
      </div>
    );
  }

  // S — mental math prompt
  if (group === "S") {
    const opColor = item.op === "+" ? COLORS.green : COLORS.orange;
    const opSym = item.op === "+" ? "+" : "−";
    return (
      <div style={{
        fontFamily: "'Shrikhand', cursive",
        fontSize: "clamp(36px, 12vw, 68px)",
        color: COLORS.black, textAlign: "center",
      }}>
        {item.a}
        <span style={{ color: opColor, margin: "0 4px" }}>{opSym}</span>
        {item.b} = ?
      </div>
    );
  }

  // W — word problem text
  if (group === "W") {
    return (
      <div style={{ textAlign: "left" }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(14px, 4vw, 17px)",
          fontWeight: 600, color: COLORS.black, lineHeight: 1.5,
          backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: 8,
          padding: "12px 14px",
        }}>
          {item.wordProblem}
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Concrete interactive scaffold for M-group (ten-frame in motion)
// ---------------------------------------------------------------------------
function ConcreteTenFrameM({ item, moved, onMove }) {
  if (item.skill === "M1") {
    const maxMove = item.bridge; // how many to move to fill the ten
    return (
      <div style={{ marginTop: 16 }}>
        <TenFrame
          frameA={item.a} frameB={item.b}
          moved={Math.min(moved, maxMove)}
          onMove={moved < maxMove ? onMove : null}
          interactive={true}
          animate={false}
        />
        {moved >= maxMove && (
          <div style={{
            textAlign: "center", marginTop: 8,
            fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
            color: COLORS.green,
          }}>
            10 + {item.leftover} = {item.sum}!
          </div>
        )}
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tier-2 locked group card
// ---------------------------------------------------------------------------
function Tier2LockedCard({ group, tierAllowed, isPurchased, tier1Progress }) {
  const purchaseLocked = !isPurchased;
  const skillLocked = isPurchased && !tierAllowed;

  return (
    <div style={{
      backgroundColor: "white", borderRadius: 12, padding: 18,
      marginBottom: 14, border: BRUTAL_BORDER,
      boxShadow: "5px 5px 0px #CCC",
      opacity: 0.8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>
          🔒 {group.label}
        </h3>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
          backgroundColor: "#EF476F", color: "white",
          padding: "3px 8px", borderRadius: 12,
        }}>
          Tier 2
        </span>
      </div>
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        {purchaseLocked ? (
          <div style={{ fontSize: 13, color: "#888", fontFamily: "'Space Grotesk', sans-serif" }}>
            Unlock Add &amp; Subtract Full Access in the Parent Zone to practice {group.label}!
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "#888", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8 }}>
              Master your facts to 20 to unlock big-number adding!
            </div>
            {/* Tier-1 progress bar */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                Tier 1 progress: {Math.round(tier1Progress * 100)}% / 80% needed
              </div>
              <div style={{
                height: 10, borderRadius: 5, backgroundColor: "#EEE",
                border: BRUTAL_BORDER_SM, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, Math.round(tier1Progress * 100))}%`,
                  backgroundColor: tier1Progress >= 0.8 ? COLORS.green : "#EF476F",
                  transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
  // Child's saved choice wins; otherwise concrete (the N-group default).
  const [pickedMode, setPickedMode] = useState(() => getPreferredMode(profileId, moduleId) || "concrete");
  // Once the child has explicitly chosen a mode, per-group defaults stop
  // overriding it. A ref (not state) so the item-selection callback always
  // reads the current value without needing it in its dependency list.
  const hasExplicitModeRef = useRef(!!getPreferredMode(profileId, moduleId));
  // A parent lock (Parent Zone → Lock CPA Mode) overrides the child's choice.
  const lockedMode = getProfile(profileId)?.settings?.lockedMode || null;
  const mode = lockedMode || pickedMode;
  const [currentItem, setCurrentItem] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [userAnswer, setUserAnswer] = useState(""); // for "number" and "barChoice"
  const [columnDigits, setColumnDigits] = useState([]); // for "column"
  const [pickedChoice, setPickedChoice] = useState(null); // for "choice"
  const [barTypePicked, setBarTypePicked] = useState(null); // for "barChoice"
  const [showScaffold, setShowScaffold] = useState(false);
  const [userHidScaffold, setUserHidScaffold] = useState(false);
  const [tenFrameMoved, setTenFrameMoved] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [view, setView] = useState(initialView);
  const [streak, setStreak] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [sessionStartTime] = useState(Date.now());
  const inputRef = useRef(null);

  const shuffledChoices = useShuffledChoices(currentItem);

  useEffect(() => { initData(); }, []);

  useEffect(() => {
    if (profileId) {
      const s = checkStreakOnLaunch(profileId);
      setDailyStreak(s);
    }
  }, [profileId]);

  // Sessions are now persisted per-answer in the data layer (see
  // recordAnswerInSession below), so they survive the app being killed and
  // don't merge separate sittings together. This unmount effect just closes
  // out the current live session when the child navigates away.
  useEffect(() => {
    return () => { if (profileId) finalizeLiveSession(profileId); };
  }, [profileId]);

  // Mastery helpers
  const getMasteryData = useCallback(() => {
    if (profileId) return getMastery(profileId, moduleId) || {};
    return localMastery;
  }, [profileId, moduleId, localMastery]);

  const getMasteryLevel = useCallback((itemKey) => {
    return getMasteryData()[itemKey]?.correct || 0;
  }, [getMasteryData]);

  // Tier gate status
  const tierAllowed = useMemo(() => shouldAllowTier2(profileId), [profileId, sessionStats]);
  const isPurchased = useMemo(() => isModuleFullyUnlocked("add"), []);

  // Tier-1 progress ratio (for locked-card display)
  const tier1Progress = useMemo(() => {
    const masteryData = getMasteryData();
    const mastered = TIER1_KEYS.filter(k => (masteryData[k]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length;
    return TIER1_KEYS.length > 0 ? mastered / TIER1_KEYS.length : 0;
  }, [getMasteryData]);

  // Active pool — filters by purchase access, tier gate, and sub-gates
  const activePool = useMemo(() => {
    const masteryData = getMasteryData();
    const subGates = getSkillSubGateStatus(profileId);

    return ADD_POOL.filter(item => {
      // Purchase gate
      if (!isContentAccessible(moduleId, item.group)) return false;
      // Tier-2 gate
      if (["R", "S", "W"].includes(item.group) && !tierAllowed) return false;
      // Sub-gates (exclude from "new" by checking here — already-seen items stay)
      const mastery = masteryData[item.itemKey];
      const isNew = !mastery || (!mastery.lastSeen && (mastery.attempts || 0) === 0);
      if (isNew) {
        if (item.skill === "N2" && !subGates.allowN2) return false;
        if (item.skill === "N3" && !subGates.allowN3) return false;
        if (item.skill === "M2" && !subGates.allowM2) return false;
        if (item.skill === "R2" && !subGates.allowR2) return false;
        if (item.skill === "R3" && !subGates.allowR3) return false;
        if (item.skill === "W2" && !subGates.allowW2) return false;
        if (item.skill === "W3" && !subGates.allowW3) return false;
      }
      return true;
    });
  }, [moduleId, profileId, tierAllowed, sessionStats]);

  const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

  // Weighted pick — mirrors fractions-practice.jsx pickNewItem exactly
  const pickNewItem = useCallback(() => {
    if (activePool.length === 0) { setCurrentItem(null); return; }

    const masteryData = getMasteryData();
    const masteryThreshold = DEFAULT_MASTERY_THRESHOLD;
    const now = Date.now();
    const MAX_NEW = 3;

    const scored = activePool.map(item => {
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

    let newCount = 0;
    let pool = scored.filter(s => {
      if (s.category === "new") {
        newCount++;
        return newCount <= MAX_NEW;
      }
      return true;
    });

    const prevKey = currentItem?.itemKey;
    if (prevKey && pool.length > 1) {
      const without = pool.filter(s => s.item.itemKey !== prevKey);
      if (without.length > 0) pool = without;
    }

    const totalW = pool.reduce((sum, s) => sum + s.weight, 0);
    let r = Math.random() * totalW;
    let selected = pool[0]?.item || null;
    for (const entry of pool) {
      r -= entry.weight;
      if (r <= 0) { selected = entry.item; break; }
    }

    setCurrentItem(selected);
    setUserAnswer("");
    setColumnDigits([]);
    setPickedChoice(null);
    setBarTypePicked(null);
    setFeedback(null);
    setShowScaffold(false);
    setUserHidScaffold(false);
    setTenFrameMoved(0);
    // Set default mode for the new item's group — but only until the child has
    // made an explicit choice, which then sticks across groups. Automatic
    // default, so it isn't persisted; a parent lock still wins regardless,
    // since the effective mode is `lockedMode || pickedMode`.
    if (!hasExplicitModeRef.current && selected && mod?.defaultModeByGroup) {
      const defaultMode = mod.defaultModeByGroup[selected.group] || "pictorial";
      setPickedMode(defaultMode);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [activePool, getMasteryData, currentItem, mod]);

  useEffect(() => {
    pickNewItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePool.length]);

  // Scaffold opacity
  const scaffoldOpacity = useMemo(() => {
    if (mode === "concrete") return 1;
    if (mode === "pictorial" && currentItem) {
      return Math.max(0.15, 1 - getMasteryLevel(currentItem.itemKey) * 0.3);
    }
    return 0;
  }, [mode, currentItem, getMasteryLevel]);

  // Evaluate answer
  const evaluateAnswer = useCallback((item, payload) => {
    const { type, value } = payload;

    if (type === "number") {
      const entered = parseInt(value);
      return !isNaN(entered) && entered === item.correctAnswer;
    }
    if (type === "choice") {
      return value === item.correctAnswer;
    }
    if (type === "column") {
      // value is digit-array; assemble into number
      const assembled = parseInt(value.join(""));
      return !isNaN(assembled) && assembled === item.correctAnswer;
    }
    if (type === "barChoice") {
      const entered = parseInt(value);
      return !isNaN(entered) && entered === item.correctAnswer;
    }
    return false;
  }, []);

  const handleAnswer = useCallback((payload) => {
    if (!currentItem) return;
    const isCorrect = evaluateAnswer(currentItem, payload);

    if (profileId) {
      updateMastery(profileId, moduleId, currentItem.itemKey, isCorrect);
      recordAnswerInSession(profileId, moduleId, isCorrect);
    } else {
      setLocalMastery(prev => ({
        ...prev,
        [currentItem.itemKey]: {
          correct: Math.max(0, (prev[currentItem.itemKey]?.correct || 0) + (isCorrect ? 1 : -1) + (isCorrect ? 0 : 1)),
          attempts: (prev[currentItem.itemKey]?.attempts || 0) + 1,
          lastSeen: new Date().toISOString(),
        },
      }));
    }

    setSessionStats(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));

    if (profileId) {
      const profile = getProfile(profileId);
      const newStreak = isCorrect ? streak + 1 : 0;
      const newAchievements = checkAfterAnswer({
        profileId, moduleId, module: mod,
        streak: newStreak,
        sessionTotal: sessionStats.total + 1,
        sessionStartTime,
        mastery: profile?.mastery?.[moduleId] || {},
        masteryThreshold: DEFAULT_MASTERY_THRESHOLD,
      });
      if (newAchievements.length > 0) {
        setAchievementQueue(prev => [...prev, ...newAchievements]);
      }
      const streakMilestones = [
        { at: 3, name: "Getting Warm!", icon: "🔥", description: "3 in a row!" },
        { at: 5, name: "On Fire!", icon: "🔥", description: "5 in a row!" },
        { at: 10, name: "Unstoppable!", icon: "⚡", description: "10 in a row!" },
        { at: 25, name: "LEGENDARY!", icon: "👑", description: "25 in a row!" },
      ];
      const milestone = streakMilestones.find(m => m.at === newStreak);
      if (milestone) setAchievementQueue(prev => [...prev, milestone]);
    }

    const newTotal = sessionStats.total + 1;
    if (profileId && newTotal >= 10) {
      const updatedStreak = updateStreak(profileId, newTotal);
      setDailyStreak(updatedStreak);
    }

    if (isCorrect) {
      setStreak(s => s + 1);
      setFeedback("correct");
      setTimeout(() => pickNewItem(), 900);
    } else {
      setStreak(0);
      setFeedback("incorrect");
      setShowScaffold(true);
    }
  }, [currentItem, evaluateAnswer, profileId, moduleId, streak, sessionStats, sessionStartTime, mod, pickNewItem]);

  // Submit handlers
  const handleSubmitNumber = useCallback(() => {
    if (!currentItem || feedback || userAnswer === "") return;
    handleAnswer({ type: "number", value: userAnswer });
  }, [currentItem, feedback, userAnswer, handleAnswer]);

  const handleSubmitColumn = useCallback((digits) => {
    if (!currentItem || feedback) return;
    const assembled = parseInt(digits.join(""));
    if (isNaN(assembled)) return;
    handleAnswer({ type: "column", value: digits });
  }, [currentItem, feedback, handleAnswer]);

  const handleTapChoice = useCallback((value) => {
    if (feedback) return;
    setPickedChoice(value);
    handleAnswer({ type: "choice", value });
  }, [feedback, handleAnswer]);

  const handleSubmitBarChoice = useCallback(() => {
    if (!currentItem || feedback || userAnswer === "") return;
    handleAnswer({ type: "barChoice", value: userAnswer });
  }, [currentItem, feedback, userAnswer, handleAnswer]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (feedback === "incorrect") pickNewItem();
      else if (currentItem?.answerType === "number") handleSubmitNumber();
      else if (currentItem?.answerType === "barChoice") handleSubmitBarChoice();
    }
  };

  // Group progress
  const getGroupProgress = useCallback((groupId) => {
    const groupItems = ADD_POOL.filter(i => i.group === groupId);
    const mastered = groupItems.filter(i => getMasteryLevel(i.itemKey) >= DEFAULT_MASTERY_THRESHOLD).length;
    return { total: groupItems.length, mastered };
  }, [getMasteryLevel]);

  if (!mod) return <div style={{ padding: 40, textAlign: "center" }}>Module not found</div>;

  const moduleColor = "#EF476F";

  // User-entered number value for wrong-answer diagnosis
  const userEnteredValue = currentItem?.answerType === "number" ? parseInt(userAnswer)
    : currentItem?.answerType === "barChoice" ? parseInt(userAnswer)
    : currentItem?.answerType === "column" ? parseInt(columnDigits.join(""))
    : null;

  // Whether scaffold is rendered (W-group scaffold only shows on wrong answer)
  // W, R, S are reveal-only: their scaffolds expose the answer, so they render
  // only in the wrong-answer block below, never in the pre-answer container.
  const scaffoldRendered = !!currentItem && !["W", "R", "S"].includes(currentItem.group);

  return (
    <div style={{
      minHeight: "100vh",
      background: `repeating-linear-gradient(0deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), repeating-linear-gradient(90deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), ${COLORS.bg}`,
      fontFamily: "'Space Grotesk', sans-serif",
      padding: 0, overflow: "auto",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeSlideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes correctPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        @keyframes splitGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      {/* ========= HEADER ========= */}
      <div style={{
        background: COLORS.yellow,
        padding: "calc(env(safe-area-inset-top, 0px) + 14px) clamp(12px,4vw,20px) 10px",
        borderBottom: `4px solid ${COLORS.black}`,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            {onBack && (
              <button onClick={onBack} style={{
                padding: "6px 8px", borderRadius: 6, border: BRUTAL_BORDER_SM,
                backgroundColor: "white", color: COLORS.black, boxShadow: BRUTAL_SHADOW_SM,
                cursor: "pointer", transition: "all 0.1s ease", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: 44, minWidth: 44,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 3L21 9.5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9.5Z"
                    stroke={COLORS.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 22V12H15V22" stroke={COLORS.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <LogoLockup size="medium" style={{ flex: 1 }} />
            {profileAvatar && (
              <div style={{
                width: 44, height: 44, borderRadius: "50%", border: BRUTAL_BORDER_SM,
                backgroundColor: "white", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 24, boxShadow: BRUTAL_SHADOW_SM, flexShrink: 0,
              }}>
                {AVATARS.find(a => a.id === profileAvatar)?.emoji || profileAvatar}
              </div>
            )}
          </div>

          {/* Stats row */}
          {(() => {
            const masteryData = getMasteryData();
            const accessibleItems = ADD_POOL.filter(i => isContentAccessible(moduleId, i.group));
            const totalItems = accessibleItems.length;
            const masteredItems = accessibleItems.filter(i =>
              (masteryData[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD
            ).length;
            const masteryPct = totalItems > 0 ? Math.round((masteredItems / totalItems) * 100) : 0;
            return (
              <div style={{ display: "flex", gap: 6, alignItems: "stretch", marginBottom: 8, minHeight: 56 }}>
                <div style={{
                  flex: 1.5, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  backgroundColor: masteryPct === 100 ? COLORS.green : "white",
                  color: masteryPct === 100 ? "white" : COLORS.black,
                  border: BRUTAL_BORDER_SM, borderRadius: 8, padding: "8px 12px",
                  boxShadow: BRUTAL_SHADOW_SM, gap: 3,
                }}>
                  <span style={{ fontSize: "clamp(14px, 5vw, 20px)", lineHeight: 1, whiteSpace: "nowrap" }}>⭐ {masteredItems}/{totalItems}</span>
                  <span style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>Mastered</span>
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
                  color: streak >= 3 ? "white" : COLORS.black,
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
                    color: dailyStreak.current >= 7 ? "white" : COLORS.black,
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

              {/* Achievements */}
              {profileId && (() => {
                const allAch = getAllAchievementsForProfile(profileId, mod);
                const earned = allAch.filter(a => a.unlocked);
                return (
                  <div style={{
                    backgroundColor: "white", borderRadius: 12, padding: 18,
                    marginBottom: 14, border: BRUTAL_BORDER, boxShadow: `5px 5px 0px ${moduleColor}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>Achievements</h3>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                        {earned.length}/{allAch.length}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {allAch.map(a => (
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

              {/* CPA Mode selector */}
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
                  ].map(m => (
                    <button key={m.id}
                      disabled={!!lockedMode}
                      onClick={() => { if (lockedMode) return; hasExplicitModeRef.current = true; setPickedMode(m.id); setPreferredMode(profileId, moduleId, m.id); }}
                      style={{
                        flex: 1, padding: "10px 6px", borderRadius: 10, border: BRUTAL_BORDER_SM,
                        backgroundColor: mode === m.id ? moduleColor : "white",
                        color: mode === m.id ? "white" : COLORS.black,
                        fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                        cursor: lockedMode ? "default" : "pointer",
                        opacity: lockedMode && mode !== m.id ? 0.45 : 1,
                        boxShadow: mode === m.id ? "none" : BRUTAL_SHADOW_SM,
                        transition: "all 0.15s ease", minHeight: 56,
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

              {/* Start Practice */}
              <button onClick={() => { setView("practice"); pickNewItem(); }}
                style={{
                  width: "100%", padding: 14, borderRadius: 12,
                  border: BRUTAL_BORDER, backgroundColor: COLORS.yellow, color: COLORS.black,
                  fontWeight: 700, cursor: "pointer", fontFamily: "'Shrikhand', cursive",
                  fontSize: 16, boxShadow: BRUTAL_SHADOW, marginBottom: 14, minHeight: 52,
                }}>
                Practice Add &amp; Subtract!
              </button>

              {/* Mastery grids by group */}
              {mod.groups.map(group => {
                const prog = getGroupProgress(group.id);
                const accessible = isContentAccessible(moduleId, group.id);
                const isTier2 = group.tier === 2;
                const groupItems = ADD_POOL.filter(i => i.group === group.id);

                if (isTier2) {
                  return (
                    <Tier2LockedCard
                      key={group.id}
                      group={group}
                      tierAllowed={tierAllowed}
                      isPurchased={isPurchased}
                      tier1Progress={tier1Progress}
                    />
                  );
                }

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
                          // Section by skill with readable headers ("Bond a number", …),
                          // cap each section and show an honest "+N more".
                          const CELL_CAP = 50;
                          const bySkill = [];
                          groupItems.forEach(item => {
                            let bucket = bySkill.find(b => b.skill === item.skill);
                            if (!bucket) { bucket = { skill: item.skill, items: [] }; bySkill.push(bucket); }
                            bucket.items.push(item);
                          });
                          return bySkill.map(({ skill, items }) => {
                            const shown = items.slice(0, CELL_CAP);
                            const extra = items.length - shown.length;
                            return (
                              <div key={skill} style={{ marginBottom: 14 }}>
                                <div style={{
                                  fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                                  color: "#888", marginBottom: 6,
                                }}>
                                  {addModule.skillLabels?.[skill] || skill}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
                                  {shown.map(item => {
                                    const level = getMasteryLevel(item.itemKey);
                                    const mastered = level >= DEFAULT_MASTERY_THRESHOLD;
                                    return (
                                      <div key={item.itemKey} style={{
                                        padding: "5px 3px", borderRadius: 6,
                                        backgroundColor: mastered ? group.color : "#F8F8F8",
                                        border: mastered ? BRUTAL_BORDER_SM : "2px solid #E0E0E0",
                                        textAlign: "center", fontSize: 9,
                                        fontFamily: "'Space Mono', monospace",
                                        fontWeight: mastered ? 700 : 400,
                                        boxShadow: mastered ? `2px 2px 0px ${COLORS.black}` : "none",
                                      }}>
                                        <div style={{ lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {itemCellLabel(item.itemKey)}
                                        </div>
                                        <div style={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
                                          <MasteryDots level={Math.min(level, DEFAULT_MASTERY_THRESHOLD)} max={DEFAULT_MASTERY_THRESHOLD} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {extra > 0 && (
                                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#AAA", marginTop: 5 }}>
                                    +{extra} more
                                  </div>
                                )}
                              </div>
                            );
                          });
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
                  {/* Mastery dots */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <MasteryDots level={Math.min(getMasteryLevel(currentItem.itemKey), DEFAULT_MASTERY_THRESHOLD)} />
                  </div>

                  {/* Skill label chip */}
                  <div style={{ marginBottom: 12 }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                      backgroundColor: mod.groups.find(g => g.id === currentItem.group)?.color || moduleColor,
                      color: COLORS.black, padding: "3px 10px", borderRadius: 20, border: BRUTAL_BORDER_SM,
                    }}>
                      {mod.skillLabels[currentItem.skill] || currentItem.skill}
                    </span>
                  </div>

                  {/* Question */}
                  <QuestionDisplay item={currentItem} mode={mode} />

                  {/* Concrete M-group ten-frame (interactive, shown before answer) */}
                  {mode === "concrete" && currentItem.group === "M" && !feedback && (
                    <ConcreteTenFrameM
                      item={currentItem}
                      moved={tenFrameMoved}
                      onMove={() => setTenFrameMoved(m => m + 1)}
                    />
                  )}

                  {/* Answer input */}
                  <div onKeyDown={handleKeyDown}>
                    {currentItem.answerType === "number" && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 20, gap: 12 }}>
                        <input
                          ref={inputRef}
                          type="number"
                          value={userAnswer}
                          placeholder="?"
                          disabled={!!feedback}
                          onChange={e => setUserAnswer(e.target.value)}
                          onKeyDown={handleKeyDown}
                          style={{
                            width: 130, fontSize: 52, fontFamily: "'Shrikhand', cursive",
                            fontWeight: 400, textAlign: "center",
                            border: "none", borderBottom: `4px solid ${COLORS.black}`,
                            backgroundColor: "transparent", color: COLORS.black, outline: "none",
                            padding: "4px 0", MozAppearance: "textfield", WebkitAppearance: "none",
                          }}
                        />
                        {!feedback && (
                          <BrutalButton onClick={handleSubmitNumber} bg={COLORS.yellow}>Check!</BrutalButton>
                        )}
                      </div>
                    )}

                    {currentItem.answerType === "choice" && (
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                        marginTop: 16, width: "100%", maxWidth: 340,
                        marginLeft: "auto", marginRight: "auto",
                      }}>
                        {shuffledChoices.map((c, i) => {
                          const isCorrect = c === currentItem.correctAnswer;
                          const isPicked = c === pickedChoice;
                          const bg = isPicked
                            ? (isCorrect ? COLORS.green : COLORS.red)
                            : "white";
                          return (
                            <button key={i} onClick={() => !pickedChoice && handleTapChoice(c)}
                              style={{
                                padding: "12px 8px", borderRadius: 10, border: BRUTAL_BORDER_SM,
                                backgroundColor: bg, cursor: pickedChoice ? "default" : "pointer",
                                boxShadow: BRUTAL_SHADOW_SM,
                                fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                                color: COLORS.black, minHeight: 56,
                                animation: isPicked ? (isCorrect ? "correctPulse 0.4s ease" : "shake 0.4s ease") : "none",
                                transition: "background-color 0.2s ease",
                                textAlign: "center",
                              }}>
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {currentItem.answerType === "column" && (
                      <ColumnInput
                        item={currentItem}
                        value={columnDigits}
                        onChange={setColumnDigits}
                        onSubmit={handleSubmitColumn}
                        disabled={!!feedback}
                      />
                    )}

                    {currentItem.answerType === "barChoice" && (
                      <BarTypeChoiceInput
                        item={currentItem}
                        barTypePicked={barTypePicked}
                        onPickBarType={setBarTypePicked}
                        userAnswer={userAnswer}
                        onAnswerChange={setUserAnswer}
                        onSubmit={handleSubmitBarChoice}
                        disabled={!!feedback}
                        feedback={feedback}
                      />
                    )}
                  </div>

                  {/* Scaffold (pictorial/concrete, not for W-group before answer) */}
                  {scaffoldRendered && (
                    <div
                      onClick={mode === "pictorial" && scaffoldOpacity > 0 && !showScaffold && !userHidScaffold
                        ? () => setUserHidScaffold(true) : undefined}
                      style={{ cursor: mode === "pictorial" && scaffoldOpacity > 0 && !showScaffold && !userHidScaffold ? "pointer" : "default" }}
                    >
                      <ScaffoldForItem
                        item={currentItem}
                        showScaffold={showScaffold}
                        scaffoldOpacity={userHidScaffold ? 0 : scaffoldOpacity}
                        mode={mode}
                        tenFrameMoved={tenFrameMoved}
                        feedback={feedback}
                      />
                    </div>
                  )}
                  {scaffoldRendered && mode === "pictorial" && scaffoldOpacity > 0 && !showScaffold && !userHidScaffold && (
                    <div onClick={() => setUserHidScaffold(true)} style={{
                      marginTop: 6, fontSize: 11, fontFamily: "'Space Mono', monospace",
                      opacity: 0.45, fontWeight: 700, cursor: "pointer",
                    }}>
                      Tap picture to hide it
                    </div>
                  )}
                  {scaffoldRendered && mode === "abstract" && !showScaffold && !feedback && (
                    <div style={{ marginTop: 12, textAlign: "center" }}>
                      <BrutalButton small onClick={() => setShowScaffold(true)} bg={COLORS.cream}>
                        Show me
                      </BrutalButton>
                    </div>
                  )}

                  {/* W / R / S scaffolds reveal on wrong answer only */}
                  {["W", "R", "S"].includes(currentItem.group) && feedback === "incorrect" && (
                    <ScaffoldForItem
                      item={currentItem}
                      showScaffold={true}
                      scaffoldOpacity={1}
                      mode={mode}
                      tenFrameMoved={0}
                      feedback={feedback}
                    />
                  )}

                  {/* Feedback */}
                  {feedback && (
                    <div style={{
                      marginTop: 16, fontSize: 16, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace",
                      color: feedback === "correct" ? COLORS.green : COLORS.red,
                      animation: "fadeSlideUp 0.3s ease both",
                    }}>
                      {feedback === "correct" ? (
                        streak >= 5 ? "OUTSTANDING! ⚡" : streak >= 3 ? "🔥 STREAK! KEEP GOING!" : ["NICE!", "GOT IT!", "YES!", "CORRECT!", "BOOM!"][Math.floor(Math.random() * 5)]
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          It's{" "}
                          <span style={{
                            backgroundColor: COLORS.yellow, padding: "6px 14px",
                            border: BRUTAL_BORDER_SM, borderRadius: 6, fontSize: 22,
                          }}>
                            {item => item}
                            {currentItem.correctAnswer}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Wrong answer helpers */}
                  {feedback === "incorrect" && (
                    <WrongAnswerHelpers item={currentItem} userValue={userEnteredValue} />
                  )}
                </div>

                {/* Next button */}
                <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
                  {feedback === "incorrect" ? (
                    <BrutalButton onClick={pickNewItem} bg={COLORS.yellow}>Next →</BrutalButton>
                  ) : null}
                </div>

                {/* Progress link */}
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button onClick={() => setView("progress")} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                    color: "#888", textDecoration: "underline",
                  }}>
                    View progress
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", animation: "fadeSlideUp 0.3s ease both" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700,
                  color: COLORS.black, marginBottom: 8,
                }}>
                  No items available yet
                </div>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: "#666",
                  marginBottom: 20, maxWidth: 280, margin: "0 auto 20px",
                }}>
                  Ask a parent to unlock Add &amp; Subtract content in the Parent Zone!
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#999" }}>
                  Group N (Number Bonds) is free to try!
                </div>
              </div>
            )
          )}
        </div>
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
