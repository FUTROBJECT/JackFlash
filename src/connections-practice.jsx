/**
 * ConnectionsPractice — the practice screen for the Mixed Practice / Connections capstone.
 *
 * Mirrors the structure of fractions-practice.jsx exactly:
 *  - Same state layout (hooks first, no conditional hooks)
 *  - Same spaced-repetition / weighted-draw engine with operation-family anti-repeat
 *  - Same mastery persistence via dataManager
 *  - Same header / stats / streak / achievement popup
 *
 * Connections-specific differences (spec §4–§7):
 *  - Three answer types: singleNumber (I/T/S1), plus borrowed fraction types (S2)
 *  - S-group items filtered at draw time to only mastered source facts
 *  - Skill-gates: I2 after 60% I1, T1 after 80% I-group, T2 after 60% T1+I2 full
 *  - Operation-family anti-repeat guard for S/S3 (× / ÷ / fraction never back-to-back)
 *  - Default mode: concrete for Group I, pictorial for Groups T/S
 *  - FractionBar scaffold from shared/barComponents for I-group
 *  - TwoStepBarModel for T-group
 *  - Borrowed fraction answer inputs from shared/barComponents for S2 items
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM,
  DEFAULT_MASTERY_THRESHOLD, AVATARS,
} from "./constants.js";
import connectionsModule, {
  CONNECTIONS_POOL, I1_POOL, I2_POOL, T1_POOL, T2_POOL, S1_POOL, S2_POOL,
  shouldAllowI2, shouldAllowT1, shouldAllowT2,
} from "./modules/connections.jsx";
import { registerModule, getModule } from "./modules/moduleRegistry.js";
import {
  initData, getMastery, updateMastery, updateStreak, checkStreakOnLaunch,
  recordSession, getProfile,
} from "./dataManager.js";
import { checkAfterAnswer, getAllAchievementsForProfile } from "./achievementEngine.js";
import AchievementPopup from "./AchievementPopup.jsx";
import { isContentAccessible } from "./purchaseManager.js";
import LogoLockup from "./LogoLockup.jsx";

// Shared bar-model and fraction components
import {
  MasteryDots, NumberBond, FractionDisplay, FractionBar, TwoStackedBars,
  FractionInputFields, FractionQtyBarModel, TwoStepBarModel, EqualShareStrip, TwoStepChip,
} from "./shared/barComponents.jsx";

// We also need the fraction answer-type renderers (Choice4Grid, TapTwoCards, etc.)
// for S2 items that borrow fraction question formats.
// These were defined locally in fractions-practice.jsx — we inline lightweight versions here.

// Register the connections module
registerModule(connectionsModule);

// ---------------------------------------------------------------------------
// Local-only small reusable components
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
      ...style,
    }}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Fraction answer-type renderers (for S2 borrowed items)
// ---------------------------------------------------------------------------

function Choice4Grid({ choices, onPick, picked, correct }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
      marginTop: 16, width: "100%", maxWidth: 320,
      marginLeft: "auto", marginRight: "auto",
    }}>
      {choices.map((c, i) => {
        const [n, d] = c.split("/").map(Number);
        const isCorrect = c === correct;
        const isPicked = c === picked;
        const bg = isPicked ? (isCorrect ? COLORS.green : COLORS.red) : "white";
        return (
          <button key={i} onClick={() => !picked && onPick(c)}
            style={{
              padding: "14px 10px", borderRadius: 10, border: BRUTAL_BORDER_SM,
              backgroundColor: bg, cursor: picked ? "default" : "pointer",
              boxShadow: BRUTAL_SHADOW_SM,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: isPicked ? (isCorrect ? "correctPulse 0.4s ease" : "shake 0.4s ease") : "none",
              transition: "background-color 0.2s ease", minHeight: 64,
            }}>
            {isNaN(n) || isNaN(d)
              ? <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 22 }}>{c}</span>
              : <FractionDisplay n={n} d={d} size="large" />
            }
          </button>
        );
      })}
    </div>
  );
}

function TapTwoCards({ left, right, onPick, picked, correct, showEqual = false }) {
  const cards = [{ id: "left", frac: left }, { id: "right", frac: right }];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 16, width: "100%" }}>
      <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 340 }}>
        {cards.map(({ id, frac }) => {
          const isCorrect = correct === id;
          const isPicked = picked === id;
          const bg = isPicked ? (isCorrect ? COLORS.green : COLORS.red) : "white";
          return (
            <button key={id} onClick={() => !picked && onPick(id)}
              style={{
                flex: 1, padding: "20px 10px", borderRadius: 12, border: BRUTAL_BORDER,
                backgroundColor: bg, cursor: picked ? "default" : "pointer",
                boxShadow: BRUTAL_SHADOW, minHeight: 80,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: isPicked ? (isCorrect ? "correctPulse 0.4s ease" : "shake 0.4s ease") : "none",
                transition: "background-color 0.2s ease",
              }}>
              <FractionDisplay n={frac.n} d={frac.d} size="hero" />
            </button>
          );
        })}
      </div>
      {showEqual && (
        <button onClick={() => !picked && onPick("equal")}
          style={{
            padding: "12px 28px", borderRadius: 10, border: BRUTAL_BORDER_SM,
            backgroundColor: picked === "equal" ? (correct === "equal" ? COLORS.green : COLORS.red) : COLORS.cream,
            fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700,
            cursor: picked ? "default" : "pointer",
            boxShadow: BRUTAL_SHADOW_SM,
            transition: "background-color 0.2s ease",
          }}>
          They're equal
        </button>
      )}
    </div>
  );
}

function OrderThreeTiles({ fracs, direction, onSubmitOrder, submitted, correctOrder }) {
  const [tapOrder, setTapOrder] = useState([]);
  const handleTap = (idx) => {
    if (submitted) return;
    if (tapOrder.includes(idx)) return;
    const newOrder = [...tapOrder, idx];
    setTapOrder(newOrder);
    if (newOrder.length === fracs.length) onSubmitOrder(newOrder);
  };
  const getLabel = (idx) => { const pos = tapOrder.indexOf(idx); return pos >= 0 ? pos + 1 : null; };
  const isCorrect = submitted && JSON.stringify(tapOrder) === JSON.stringify(correctOrder);
  return (
    <div style={{ marginTop: 16, width: "100%", maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 10, opacity: 0.6 }}>
        Tap {direction === "asc" ? "smallest → greatest" : "greatest → smallest"}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {fracs.map((f, idx) => {
          const label = getLabel(idx);
          const isPicked = tapOrder.includes(idx);
          let bg = "white";
          if (submitted) bg = isCorrect ? COLORS.green : (isPicked ? COLORS.red : "#EEE");
          else if (isPicked) bg = COLORS.yellow;
          return (
            <button key={idx} onClick={() => handleTap(idx)}
              style={{
                flex: 1, padding: "18px 8px", borderRadius: 12, border: BRUTAL_BORDER,
                backgroundColor: bg, cursor: submitted || isPicked ? "default" : "pointer",
                boxShadow: BRUTAL_SHADOW_SM, minHeight: 80, minWidth: 80,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 6, transition: "background-color 0.2s ease", position: "relative",
              }}>
              {label !== null && (
                <div style={{ position: "absolute", top: 6, right: 8, fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: COLORS.black, opacity: 0.7 }}>{label}</div>
              )}
              <FractionDisplay n={f.n} d={f.d} size="normal" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Stable shuffled-choices hook — never reshuffles on re-render
function useShuffledChoices(item) {
  const prev = useRef(null);
  if (!prev.current || prev.current.key !== item?.itemKey) {
    if (item && item.answerType === "choice4") {
      const all = [item.correctAnswer, ...(item.distractors || [])];
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      prev.current = { key: item.itemKey, choices: all };
    } else if (item && item.answerType === "buildBar") {
      const n = item.correctAnswer;
      const d = item.d;
      const choices = new Set([n]);
      if (n > 1) choices.add(n - 1);
      if (n < d) choices.add(n + 1);
      if (d - n !== n && d - n >= 1) choices.add(d - n);
      for (let c = 1; c <= d && choices.size < 4; c++) choices.add(c);
      const arr = [...choices].slice(0, 4);
      // Deterministic sort then stable presentation (no Math.random for pool gen)
      arr.sort((a, b) => a - b);
      prev.current = { key: item.itemKey, choices: arr };
    } else {
      prev.current = { key: item?.itemKey, choices: [] };
    }
  }
  return prev.current.choices;
}

// ---------------------------------------------------------------------------
// Question display for connections items
// ---------------------------------------------------------------------------

function QuestionDisplay({ item, concreteState, onSplit, onSelect, mode }) {
  const { skill, answerType } = item;

  // I1 / I2 — fraction of a quantity
  if (skill === "I1" || skill === "I2") {
    const fracText = `${item.numerator}/${item.denominator}`;
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginBottom: 12 }}>
          What is
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <FractionDisplay n={item.numerator} d={item.denominator} size="hero" />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
            of {item.quantity}?
          </span>
        </div>
        {/* Concrete mode: interactive FractionQtyBarModel */}
        {mode === "concrete" && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <FractionQtyBarModel
              quantity={item.quantity}
              numerator={item.numerator}
              denominator={item.denominator}
              interactive={true}
              splitDone={concreteState?.splitDone || false}
              selectedParts={concreteState?.selectedParts ?? item.numerator}
              onSplit={onSplit}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>
    );
  }

  // T1 / T2 — two-step word problem
  if (skill === "T1" || skill === "T2") {
    return (
      <div style={{ textAlign: "left" }}>
        {item.text.map((line, i) => (
          <div key={i} style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: i === item.text.length - 1 ? 700 : 400,
            color: i === item.text.length - 1 ? COLORS.black : "#555",
            marginBottom: i === item.text.length - 1 ? 16 : 6,
            lineHeight: 1.5,
          }}>
            {line}
          </div>
        ))}
      </div>
    );
  }

  // S1 — multiply / divide drill
  if (skill === "S1") {
    const opSymbol = item.operation === "divide" ? "÷" : "×";
    const opColor = item.operation === "divide" ? COLORS.green : COLORS.orange;
    const aStr = String(item.a);
    const bStr = String(item.b);
    const maxLen = Math.max(aStr.length, bStr.length);
    const padA = aStr.padStart(maxLen, " ");
    const padB = bStr.padStart(maxLen, " ");
    const numFont = "clamp(56px, 18vw, 110px)";
    const opFont = "clamp(80px, 24vw, 160px)";
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ fontFamily: "'Shrikhand', cursive", fontSize: numFont, fontWeight: 400, color: COLORS.black, lineHeight: 1, whiteSpace: "pre" }}>
            {padA}
          </div>
          <div style={{ position: "relative", fontFamily: "'Shrikhand', cursive", fontSize: numFont, fontWeight: 400, color: COLORS.black, lineHeight: 1, whiteSpace: "pre" }}>
            <span style={{
              position: "absolute",
              right: "calc(100% + clamp(6px, 2vw, 14px))",
              top: "50%", transform: "translateY(-50%)",
              fontFamily: "'Shrikhand', cursive", fontSize: opFont, color: opColor,
              lineHeight: 1, whiteSpace: "nowrap",
            }}>{opSymbol}</span>
            {padB}
          </div>
        </div>
        <div style={{ width: "clamp(120px, 48vw, 260px)", height: 5, backgroundColor: COLORS.black, borderRadius: 2, marginTop: 8 }} />
      </div>
    );
  }

  // S2 — fraction items in their native format (reuses fractions module question text logic)
  if (skill === "S2") {
    // S2 items carry the full source item shape — render based on source skill
    const sourceSk = item.sourceSk || (item.itemKey.replace("mix:drill:", "").split(":")[0]);

    if (item.answerType === "choice4") {
      // E1: "Which fraction equals X?"
      if (item.base) {
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>Which fraction equals</div>
            <FractionDisplay n={item.base.n} d={item.base.d} size="hero" />
          </div>
        );
      }
      // F1 / E4: generic question text or bar shown in scaffold
      return (
        <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
          {item.questionText || "Which fraction is it?"}
        </div>
      );
    }

    if (item.answerType === "tapTwo" || item.answerType === "tapTwoOrEqual") {
      return (
        <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
          {item.questionText || "Which is greater?"}
        </div>
      );
    }

    if (item.answerType === "orderThree") {
      return (
        <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
          {item.questionText || "Put them in order"}
        </div>
      );
    }

    if (item.answerType === "singleNumber") {
      return (
        <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#666" }}>
          {item.questionText}
        </div>
      );
    }

    if (item.answerType === "fractionInput") {
      const op = item.isSubtract ? "−" : "+";
      if (item.a && item.b) {
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <FractionDisplay n={item.a.n} d={item.a.d} size="hero" />
            <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 40, color: item.isSubtract ? COLORS.orange : COLORS.green }}>{op}</span>
            <FractionDisplay n={item.b.n} d={item.b.d} size="hero" />
            <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 48 }}>=</span>
            <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 48, color: COLORS.black }}>?</span>
          </div>
        );
      }
      return (
        <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#666" }}>
          {item.questionText}
        </div>
      );
    }

    if (item.answerType === "buildBar") {
      return (
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
            <FractionBar n={item.n} d={item.d} color={COLORS.purple} />
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginBottom: 8 }}>
            What fraction is shaded?
          </div>
        </div>
      );
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Scaffold renderer — picks the right visual by skill
// ---------------------------------------------------------------------------

function ScaffoldForItem({ item, showScaffold, scaffoldOpacity, mode }) {
  if (mode === "abstract" && !showScaffold) return null;
  const opacity = showScaffold ? 1 : scaffoldOpacity;
  if (opacity <= 0) return null;

  const { skill } = item;

  // I-group: FractionQtyBarModel in non-interactive (pictorial/abstract) scaffold mode
  if (skill === "I1" || skill === "I2") {
    // In concrete mode the question already shows the interactive bar; scaffold is that bar
    if (mode === "concrete") return null; // the QuestionDisplay handles concrete I-group
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <FractionQtyBarModel
          quantity={item.quantity}
          numerator={item.numerator}
          denominator={item.denominator}
          opacity={opacity}
          animate={showScaffold}
          interactive={false}
          splitDone={true}
          selectedParts={item.numerator}
        />
      </div>
    );
  }

  // T-group: TwoStepBarModel
  if (skill === "T1" || skill === "T2") {
    const step2Label = item.step2.op === "frac"
      ? `${item.step2.n}/${item.step2.d} of ${item.step2.quantity}`
      : `${item.step2.label}`;
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <TwoStepBarModel
          step1={{ label: item.step1.label, value: item.step1.result }}
          step2={{ label: step2Label, value: item.step2.result }}
          beat={2}
          opacity={opacity}
          animate={showScaffold}
        />
      </div>
    );
  }

  // S1 — simple BarModel for divide items in wrong-answer scaffold
  if (skill === "S1" && showScaffold && item.operation === "divide") {
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <FractionQtyBarModel
          quantity={item.a}
          numerator={1}
          denominator={item.b <= item.a ? item.b : item.a}
          opacity={opacity}
          animate={showScaffold}
          interactive={false}
          splitDone={true}
          selectedParts={1}
        />
      </div>
    );
  }

  // S2 — fraction items use TwoStackedBars or FractionBar depending on type
  if (skill === "S2") {
    if (item.answerType === "choice4" && item.n !== undefined && item.d !== undefined) {
      return (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <FractionBar n={item.n} d={item.d} color={COLORS.purple} opacity={opacity} animate={showScaffold} />
        </div>
      );
    }
    if ((item.answerType === "tapTwo" || item.answerType === "tapTwoOrEqual") && item.left && item.right) {
      return (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <TwoStackedBars
            top={{ ...item.left, label: `${item.left.n}/${item.left.d}` }}
            bottom={{ ...item.right, label: `${item.right.n}/${item.right.d}`, color: COLORS.blue }}
            opacity={opacity} animate={showScaffold}
          />
        </div>
      );
    }
    if ((item.answerType === "fractionInput") && item.a && item.b) {
      const [rn, rd] = String(item.correctAnswer).split("/").map(Number);
      if (!isNaN(rn) && !isNaN(rd)) {
        return (
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <TwoStackedBars
              top={{ n: item.a.n, d: item.a.d, label: `${item.a.n}/${item.a.d}` }}
              bottom={{ n: item.b.n, d: item.b.d, label: `${item.b.n}/${item.b.d}`, color: COLORS.blue }}
              opacity={opacity} animate={showScaffold}
            />
          </div>
        );
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Wrong-answer helpers
// ---------------------------------------------------------------------------

function WrongAnswerHelpers({ item, userAnswer, userNum, userDen }) {
  const { skill } = item;
  let becauseText = "";
  let hintEl = null;
  let bondEl = null;

  if (skill === "I1") {
    const entered = parseInt(userAnswer);
    const partVal = item.quantity / item.denominator;
    // Misconception: divided by numerator instead of denominator
    if (entered === item.quantity / item.numerator && item.numerator !== item.denominator) {
      becauseText = `The bottom number (${item.denominator}) says how many equal parts — split into ${item.denominator}, not ${item.numerator}.`;
    } else {
      becauseText = `${item.quantity} split into ${item.denominator} equal groups — each group is ${item.quantity} ÷ ${item.denominator} = ${partVal}.`;
    }
    hintEl = <EqualShareStrip quantity={item.quantity} denominator={item.denominator} animate />;
    bondEl = <NumberBond whole={item.quantity} partA={item.denominator} partB={partVal} show opLabel="÷" />;
  } else if (skill === "I2") {
    const partVal = item.partValue || (item.quantity / item.denominator);
    const entered = parseInt(userAnswer);
    // Misconception: stopped at one part
    if (entered === partVal) {
      becauseText = `That's just one part! You need ${item.numerator} of them. One ${item.denominator === 2 ? "half" : `${item.denominator === 3 ? "third" : item.denominator === 4 ? "quarter" : `1/${item.denominator}`}`} of ${item.quantity} is ${partVal}. ${item.numerator} parts = ${item.numerator} × ${partVal} = ${item.correctAnswer}.`;
    } else {
      becauseText = `One ${item.denominator === 4 ? "quarter" : item.denominator === 3 ? "third" : `1/${item.denominator}`} of ${item.quantity} is ${item.quantity} ÷ ${item.denominator} = ${partVal}. ${item.numerator} parts = ${item.numerator} × ${partVal} = ${item.correctAnswer}.`;
    }
    hintEl = <EqualShareStrip quantity={item.quantity} denominator={item.denominator} animate />;
    bondEl = <NumberBond whole={item.correctAnswer} partA={item.numerator} partB={partVal} show opLabel="×" />;
  } else if (skill === "T1" || skill === "T2") {
    const entered = parseInt(userAnswer);
    // Misconception: did only step 1
    if (entered === item.step1.result) {
      becauseText = `Good start — that's step 1! (${item.step1.label} = ${item.step1.result}). Now do the second step.`;
    } else {
      becauseText = `This needs two steps. Step 1: ${item.step1.label} = ${item.step1.result}. Step 2: ${item.step2.op === "frac" ? `${item.step2.n}/${item.step2.d} of ${item.step2.quantity}` : item.step2.label} = ${item.step2.result}.`;
    }
    hintEl = <TwoStepChip step1Result={item.step1.result} animate />;
    bondEl = <NumberBond whole={item.correctAnswer} partA={item.step1.result} partB={item.step2.result} show opLabel="→" />;
  } else if (skill === "S1") {
    if (item.operation === "multiply") {
      becauseText = `because ${item.a} × ${item.b} = ${item.correctAnswer}`;
    } else {
      becauseText = `because ${item.a} ÷ ${item.b} = ${item.correctAnswer}`;
    }
    bondEl = <NumberBond whole={item.operation === "multiply" ? item.correctAnswer : item.a} partA={item.a} partB={item.b} show opLabel={item.operation === "multiply" ? "×" : "÷"} />;
  } else if (skill === "S2") {
    // Reuse a generic "because" line from the source item data
    if (item.a && item.b && item.correctAnswer) {
      const op = item.isSubtract ? "−" : "+";
      const correctStr = String(item.correctAnswer);
      becauseText = correctStr.includes("/")
        ? `because ${item.a.n}/${item.a.d} ${op} ${item.b.n}/${item.b.d} = ${item.correctAnswer}`
        : `the answer is ${item.correctAnswer}`;
    } else {
      becauseText = `the answer is ${item.correctAnswer}`;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
      {becauseText && (
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700,
          color: COLORS.black, textAlign: "center",
          backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: 8,
          padding: "10px 14px",
        }}>
          {becauseText}
        </div>
      )}
      {hintEl && <div style={{ textAlign: "center" }}>{hintEl}</div>}
      {bondEl && <div>{bondEl}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Operation-family helper for anti-repeat (S/S3 group)
// ---------------------------------------------------------------------------
function getOpFamily(item) {
  if (!item) return null;
  if (item.skill === "I1" || item.skill === "I2") return "fraction-qty";
  if (item.skill === "T1" || item.skill === "T2") return "two-step";
  if (item.skill === "S1") return item.operation; // "multiply" | "divide"
  if (item.skill === "S2") {
    const at = item.answerType;
    if (at === "fractionInput" || at === "choice4" || at === "tapTwo" || at === "tapTwoOrEqual" || at === "orderThree" || at === "buildBar" || at === "singleNumber") {
      return "fraction";
    }
  }
  return "other";
}

// ---------------------------------------------------------------------------
// Main practice component
// ---------------------------------------------------------------------------

export default function ConnectionsPractice({
  moduleId = "connections",
  profileId = null,
  profileName = "Practice",
  profileAvatar = null,
  onBack = null,
  initialView = "practice",
}) {
  const mod = getModule(moduleId);

  // ---- All state (no conditional hooks) ----
  const [localMastery, setLocalMastery] = useState({});
  const [mode, setMode] = useState("pictorial");
  const [activeGroups, setActiveGroups] = useState(null); // null = all
  const [currentItem, setCurrentItem] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [pickedChoice, setPickedChoice] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [userNum, setUserNum] = useState("");
  const [userDen, setUserDen] = useState("");
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [showScaffold, setShowScaffold] = useState(false);
  const [userHidScaffold, setUserHidScaffold] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [view, setView] = useState(initialView);
  const [streak, setStreak] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [sessionStartTime] = useState(Date.now());
  // Concrete-mode state for I-group interactive bar
  const [concreteState, setConcreteState] = useState({ splitDone: false, selectedParts: null });
  const inputRef = useRef(null);

  // Shuffled choices (stable per item)
  const shuffledChoices = useShuffledChoices(currentItem);

  useEffect(() => { initData(); }, []);

  useEffect(() => {
    if (profileId) {
      const s = checkStreakOnLaunch(profileId);
      setDailyStreak(s);
    }
  }, [profileId]);

  // Session recording on unmount
  const sessionStatsRef = useRef(sessionStats);
  useEffect(() => { sessionStatsRef.current = sessionStats; }, [sessionStats]);
  useEffect(() => {
    return () => {
      const stats = sessionStatsRef.current;
      if (profileId && stats.total > 0) {
        recordSession(profileId, { moduleId, correct: stats.correct, total: stats.total, duration: Date.now() - sessionStartTime });
      }
    };
  }, [profileId, sessionStartTime, moduleId]);

  // Mastery helpers
  const getMasteryData = useCallback(() => {
    if (profileId) return getMastery(profileId, moduleId) || {};
    return localMastery;
  }, [profileId, moduleId, localMastery]);

  const getMasteryLevel = useCallback((itemKey) => {
    return getMasteryData()[itemKey]?.correct || 0;
  }, [getMasteryData]);

  // Cross-module mastery reads (read-only)
  const getMultiplyMastery = useCallback(() => {
    if (!profileId) return {};
    return getMastery(profileId, "multiply") || {};
  }, [profileId]);

  const getFractionsMastery = useCallback(() => {
    if (!profileId) return {};
    return getMastery(profileId, "fractions") || {};
  }, [profileId]);

  // Active pool — filter by activeGroups, skill gates, and source mastery
  const activePools = useMemo(() => {
    const connMastery = getMasteryData();
    const multiMastery = getMultiplyMastery();
    const fracMastery = getFractionsMastery();

    return CONNECTIONS_POOL.filter(item => {
      // Group filter
      if (activeGroups && !activeGroups.includes(item.group)) return false;

      // Skill gate: I2 only after 60% I1 mastered
      if (item.skill === "I2" && !shouldAllowI2(connMastery)) return false;
      // Skill gate: T1 only after I-group largely mastered
      if (item.skill === "T1" && !shouldAllowT1(connMastery)) return false;
      // Skill gate: T2 only after T1 >= 60% and I2 fully mastered
      if (item.skill === "T2" && !shouldAllowT2(connMastery)) return false;

      // S1: only include items the child has mastered in mastery.multiply
      if (item.skill === "S1") {
        const sourceCorrect = multiMastery[item.sourceKey]?.correct || 0;
        if (sourceCorrect < DEFAULT_MASTERY_THRESHOLD) return false;
      }

      // S2: only include items the child has mastered in mastery.fractions
      if (item.skill === "S2") {
        const sourceCorrect = fracMastery[item.sourceKey]?.correct || 0;
        if (sourceCorrect < DEFAULT_MASTERY_THRESHOLD) return false;
      }

      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroups, profileId]);

  const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

  // Weighted pick — mirrors fractions-practice.jsx exactly, plus op-family anti-repeat
  const pickNewItem = useCallback(() => {
    if (activePools.length === 0) { setCurrentItem(null); return; }

    const masteryData = getMasteryData();
    const masteryThreshold = DEFAULT_MASTERY_THRESHOLD;
    const now = Date.now();
    const MAX_NEW = 3;

    const scored = activePools.map(item => {
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
      if (attempts === 0 && !record?.lastSeen) return { item, weight: 3, category: "new" };
      if (level === 0) return { item, weight: 6, category: "struggling" };
      return { item, weight: (masteryThreshold - level + 1) * 2, category: "learning" };
    });

    // Cap new items at MAX_NEW, in difficulty order (pool is already ordered)
    let newCount = 0;
    let pool = scored.filter(s => {
      if (s.category === "new") {
        newCount++;
        return newCount <= MAX_NEW;
      }
      return true;
    });

    // Anti-repeat: same item
    const prevKey = currentItem?.itemKey;
    if (prevKey && pool.length > 1) {
      const without = pool.filter(s => s.item.itemKey !== prevKey);
      if (without.length > 0) pool = without;
    }

    // Anti-repeat: same operation family (for S/shuffle items)
    const prevFamily = getOpFamily(currentItem);
    if (prevFamily && pool.length > 1 &&
        (currentItem?.group === "shuffle" || currentItem?.group === "integration")) {
      const diffFamily = pool.filter(s => getOpFamily(s.item) !== prevFamily);
      if (diffFamily.length > 0) pool = diffFamily;
    }

    const totalW = pool.reduce((sum, s) => sum + s.weight, 0);
    let r = Math.random() * totalW;
    let selected = pool[0]?.item || null;
    for (const entry of pool) {
      r -= entry.weight;
      if (r <= 0) { selected = entry.item; break; }
    }

    setCurrentItem(selected);
    setUserAnswer(""); setUserNum(""); setUserDen("");
    setPickedChoice(null); setFeedback(null);
    setShowScaffold(false); setUserHidScaffold(false);
    setOrderSubmitted(false);
    // Reset concrete state for I-group
    setConcreteState({ splitDone: false, selectedParts: selected?.numerator || null });
    // Set default mode based on group
    if (selected?.group === "integration") {
      setMode("concrete");
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [activePools, getMasteryData, currentItem]);

  useEffect(() => {
    pickNewItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroups, activePools.length]);

  // Scaffold opacity
  const scaffoldOpacity = useMemo(() => {
    if (mode === "concrete") return 1;
    if (mode === "pictorial" && currentItem) {
      return Math.max(0.15, 1 - getMasteryLevel(currentItem.itemKey) * 0.3);
    }
    return 0;
  }, [mode, currentItem, getMasteryLevel]);

  // Whether the scaffold renders at all (some question types embed their own visual)
  const scaffoldRendered = !!currentItem
    && !(currentItem.skill === "S2" && currentItem.answerType === "choice4" && currentItem.n !== undefined)
    && !(currentItem.skill === "S2" && currentItem.answerType === "orderThree")
    && !(currentItem.skill === "I1" && mode === "concrete")
    && !(currentItem.skill === "I2" && mode === "concrete");

  // Evaluate answer
  const evaluateAnswer = useCallback((item, answerPayload) => {
    const { type, value } = answerPayload;
    const correct = item.correctAnswer;

    if (type === "singleNumber") {
      return parseInt(value) === parseInt(correct);
    }
    if (type === "choice" || type === "tapTwo") {
      return value === correct;
    }
    if (type === "fractionInput") {
      const [cn, cd] = String(correct).split("/").map(Number);
      const un = parseInt(value.n), ud = parseInt(value.d);
      if (isNaN(un) || isNaN(ud) || ud === 0) return false;
      if (un === cn && ud === cd) return true;
      if (item.altAnswer) {
        const [an, ad] = String(item.altAnswer).split("/").map(Number);
        if (un === an && ud === ad) return true;
      }
      return un * cd === cn * ud;
    }
    if (type === "orderThree") {
      return JSON.stringify(value) === JSON.stringify(item.order);
    }
    if (type === "buildBar") {
      return parseInt(value) === parseInt(correct);
    }
    return false;
  }, []);

  const handleAnswer = useCallback((answerPayload) => {
    if (!currentItem) return;
    const isCorrect = evaluateAnswer(currentItem, answerPayload);

    if (profileId) {
      updateMastery(profileId, moduleId, currentItem.itemKey, isCorrect);
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

  const handleSubmit = useCallback(() => {
    if (!currentItem || feedback) return;
    const { answerType } = currentItem;
    if (answerType === "singleNumber") {
      if (userAnswer === "") return;
      handleAnswer({ type: "singleNumber", value: userAnswer });
    } else if (answerType === "fractionInput") {
      if (userNum === "" || userDen === "") return;
      handleAnswer({ type: "fractionInput", value: { n: userNum, d: userDen } });
    }
  }, [currentItem, feedback, userAnswer, userNum, userDen, handleAnswer]);

  const handleTapChoice = useCallback((value) => {
    if (feedback) return;
    setPickedChoice(value);
    let evalValue = value;
    if (currentItem.answerType === "tapTwo" || currentItem.answerType === "tapTwoOrEqual") {
      if (value === "left") evalValue = `${currentItem.left.n}/${currentItem.left.d}`;
      else if (value === "right") evalValue = `${currentItem.right.n}/${currentItem.right.d}`;
      else evalValue = "equal";
    } else if (currentItem.answerType === "buildBar") {
      evalValue = String(value);
    }
    const payloadType = (currentItem.answerType === "tapTwo" || currentItem.answerType === "tapTwoOrEqual") ? "tapTwo"
      : currentItem.answerType === "buildBar" ? "buildBar"
      : "choice";
    handleAnswer({ type: payloadType, value: evalValue });
  }, [currentItem, feedback, handleAnswer]);

  const handleOrderSubmit = useCallback((tapOrder) => {
    setOrderSubmitted(true);
    handleAnswer({ type: "orderThree", value: tapOrder });
  }, [handleAnswer]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (feedback === "incorrect") pickNewItem();
      else handleSubmit();
    }
  };

  // Group progress
  const getGroupProgress = useCallback((groupId) => {
    const groupItems = CONNECTIONS_POOL.filter(i => i.group === groupId);
    const mastered = groupItems.filter(i => getMasteryLevel(i.itemKey) >= DEFAULT_MASTERY_THRESHOLD).length;
    return { total: groupItems.length, mastered };
  }, [getMasteryLevel]);

  if (!mod) return <div style={{ padding: 40, textAlign: "center" }}>Module not found</div>;

  const AMBER = "#FFB703";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{
      minHeight: "100vh",
      background: `repeating-linear-gradient(0deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), repeating-linear-gradient(90deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), ${COLORS.bg}`,
      fontFamily: "'Space Grotesk', sans-serif",
      padding: 0, overflow: "auto",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Shrikhand&display=swap');
        * { box-sizing: border-box; }
        @keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeSlideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes correctPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        @keyframes splitGrow { from { transform: scaleX(0.12); opacity: 0.3; } to { transform: scaleX(1); opacity: 1; } }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      {/* ========= HEADER ========= */}
      <div style={{
        background: COLORS.yellow, padding: "14px clamp(12px,4vw,20px) 10px",
        borderBottom: `4px solid ${COLORS.black}`,
      }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            {onBack && (
              <button onClick={onBack} style={{
                padding: "6px 8px", borderRadius: 6, border: BRUTAL_BORDER_SM,
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
            <LogoLockup size="medium" style={{ flex: 1 }} />
            {/* Capstone badge */}
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
              backgroundColor: AMBER, color: COLORS.black,
              padding: "3px 8px", borderRadius: 20, border: BRUTAL_BORDER_SM,
              flexShrink: 0,
            }}>
              CAPSTONE
            </span>
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
            const totalItems = CONNECTIONS_POOL.length;
            const masteredItems = CONNECTIONS_POOL.filter(i =>
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
                    marginBottom: 14, border: BRUTAL_BORDER, boxShadow: `5px 5px 0px ${AMBER}`,
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
                    <button key={m.id} onClick={() => setMode(m.id)}
                      style={{
                        flex: 1, padding: "10px 6px", borderRadius: 10, border: BRUTAL_BORDER_SM,
                        backgroundColor: mode === m.id ? AMBER : "white",
                        color: COLORS.black,
                        fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                        cursor: "pointer", boxShadow: mode === m.id ? "none" : BRUTAL_SHADOW_SM,
                        transition: "all 0.15s ease",
                      }}>
                      {m.label}
                      <div style={{ fontSize: 9, opacity: 0.7, marginTop: 3 }}>{m.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Practice */}
              <button onClick={() => { setActiveGroups(null); setView("practice"); }}
                style={{
                  width: "100%", padding: 14, borderRadius: 12,
                  border: BRUTAL_BORDER, backgroundColor: COLORS.yellow, color: COLORS.black,
                  fontWeight: 700, cursor: "pointer", fontFamily: "'Shrikhand', cursive",
                  fontSize: 16, boxShadow: BRUTAL_SHADOW, marginBottom: 14,
                }}>
                Practice Mixed!
              </button>

              {/* Mastery grids by group */}
              {mod.groups.map(group => {
                const prog = getGroupProgress(group.id);
                const groupItems = CONNECTIONS_POOL.filter(i => i.group === group.id);
                return (
                  <div key={group.id} style={{
                    backgroundColor: "white", borderRadius: 12, padding: 18,
                    marginBottom: 14, border: BRUTAL_BORDER,
                    boxShadow: `5px 5px 0px ${group.color}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "'Shrikhand', cursive" }}>
                        {group.label}
                      </h3>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                        {prog.mastered}/{prog.total}
                      </span>
                    </div>
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
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, marginBottom: 14 }}>
                      {groupItems.slice(0, 40).map(item => {
                        const level = getMasteryLevel(item.itemKey);
                        const mastered = level >= DEFAULT_MASTERY_THRESHOLD;
                        const label = item.skill === "I1" ? `${item.numerator}/${item.denominator}×${item.quantity}`
                          : item.skill === "I2" ? `${item.numerator}/${item.denominator}×${item.quantity}`
                          : item.skill === "T1" || item.skill === "T2" ? item.skill
                          : item.skill === "S1" ? item.display
                          : "S2";
                        return (
                          <div key={item.itemKey} style={{
                            padding: "5px 3px", borderRadius: 6,
                            backgroundColor: mastered ? group.color : "#F8F8F8",
                            border: mastered ? BRUTAL_BORDER_SM : "2px solid #E0E0E0",
                            textAlign: "center", fontSize: 9,
                            fontFamily: "'Space Mono', monospace",
                            fontWeight: mastered ? 700 : 400,
                            boxShadow: mastered ? `2px 2px 0px ${COLORS.black}` : "none",
                            overflow: "hidden",
                          }}>
                            <div style={{ lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {label}
                            </div>
                            <div style={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
                              <MasteryDots level={Math.min(level, DEFAULT_MASTERY_THRESHOLD)} max={DEFAULT_MASTERY_THRESHOLD} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                    <MasteryDots level={Math.min(getMasteryLevel(currentItem.itemKey), DEFAULT_MASTERY_THRESHOLD)} max={DEFAULT_MASTERY_THRESHOLD} />
                  </div>

                  {/* Skill label chip */}
                  <div style={{ marginBottom: 12 }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                      backgroundColor: mod.groups.find(g => g.id === currentItem.group)?.color || AMBER,
                      color: COLORS.black, padding: "3px 10px", borderRadius: 20, border: BRUTAL_BORDER_SM,
                    }}>
                      {mod.skillLabels[currentItem.skill] || currentItem.skill}
                    </span>
                  </div>

                  {/* Question */}
                  <QuestionDisplay
                    item={currentItem}
                    concreteState={concreteState}
                    mode={mode}
                    onSplit={() => setConcreteState(s => ({ ...s, splitDone: true }))}
                    onSelect={(n) => setConcreteState(s => ({ ...s, selectedParts: n }))}
                  />

                  {/* Answer input */}
                  {!feedback && currentItem.answerType === "choice4" ? (
                    <Choice4Grid
                      choices={shuffledChoices}
                      onPick={handleTapChoice}
                      picked={pickedChoice}
                      correct={currentItem.correctAnswer}
                    />
                  ) : !feedback && (currentItem.answerType === "tapTwo" || currentItem.answerType === "tapTwoOrEqual") ? (
                    <TapTwoCards
                      left={currentItem.left} right={currentItem.right}
                      onPick={handleTapChoice}
                      picked={pickedChoice}
                      correct={currentItem.correctAnswer === `${currentItem.left?.n}/${currentItem.left?.d}` ? "left"
                        : currentItem.correctAnswer === `${currentItem.right?.n}/${currentItem.right?.d}` ? "right" : "equal"}
                      showEqual={currentItem.answerType === "tapTwoOrEqual"}
                    />
                  ) : !feedback && currentItem.answerType === "orderThree" ? (
                    <OrderThreeTiles
                      fracs={currentItem.fracs}
                      direction={currentItem.direction}
                      onSubmitOrder={handleOrderSubmit}
                      submitted={orderSubmitted}
                      correctOrder={currentItem.order}
                    />
                  ) : !feedback && currentItem.answerType === "fractionInput" ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 20, gap: 12 }}>
                      <FractionInputFields
                        numVal={userNum} denVal={userDen}
                        onNumChange={setUserNum} onDenChange={setUserDen}
                        onSubmit={handleSubmit} disabled={!!feedback}
                      />
                      {!feedback && (
                        <BrutalButton onClick={handleSubmit} bg={COLORS.yellow}>Check!</BrutalButton>
                      )}
                    </div>
                  ) : !feedback && currentItem.answerType === "buildBar" ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 16, gap: 10 }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, opacity: 0.6 }}>
                        How many parts are shaded?
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                        {shuffledChoices.map(c => (
                          <button key={c} onClick={() => !pickedChoice && handleTapChoice(String(c))}
                            style={{
                              width: 64, height: 64, borderRadius: 10, border: BRUTAL_BORDER_SM,
                              backgroundColor: pickedChoice === String(c)
                                ? (parseInt(c) === parseInt(currentItem.correctAnswer) ? COLORS.green : COLORS.red) : "white",
                              fontFamily: "'Shrikhand', cursive", fontSize: 32, fontWeight: 700,
                              cursor: pickedChoice ? "default" : "pointer",
                              boxShadow: BRUTAL_SHADOW_SM,
                            }}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : currentItem.answerType === "singleNumber" ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 20, gap: 12 }} onKeyDown={handleKeyDown}>
                      <input
                        ref={inputRef}
                        type="number"
                        value={userAnswer}
                        placeholder="?"
                        disabled={!!feedback}
                        onChange={e => setUserAnswer(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                          width: 120, fontSize: 52, fontFamily: "'Shrikhand', cursive",
                          fontWeight: 400, textAlign: "center",
                          border: "none", borderBottom: `4px solid ${COLORS.black}`,
                          backgroundColor: feedback === "correct" ? COLORS.green : "transparent",
                          color: COLORS.black, outline: "none",
                          padding: "4px 0", MozAppearance: "textfield", WebkitAppearance: "none",
                        }}
                      />
                      {!feedback && (
                        <BrutalButton onClick={handleSubmit} bg={COLORS.yellow}>Check!</BrutalButton>
                      )}
                    </div>
                  ) : null}

                  {/* Scaffold */}
                  {scaffoldRendered && (
                    <div
                      onClick={mode === "pictorial" && scaffoldOpacity > 0 && !showScaffold && !userHidScaffold
                        ? () => setUserHidScaffold(true)
                        : undefined}
                      style={{ cursor: mode === "pictorial" && scaffoldOpacity > 0 && !showScaffold && !userHidScaffold ? "pointer" : "default" }}
                    >
                      <ScaffoldForItem
                        item={currentItem}
                        showScaffold={showScaffold}
                        scaffoldOpacity={userHidScaffold ? 0 : scaffoldOpacity}
                        mode={mode}
                      />
                    </div>
                  )}

                  {scaffoldRendered && mode === "pictorial" && scaffoldOpacity > 0 && !showScaffold && !userHidScaffold && (
                    <div
                      onClick={() => setUserHidScaffold(true)}
                      style={{ marginTop: 6, fontSize: 11, fontFamily: "'Space Mono', monospace", opacity: 0.45, fontWeight: 700, cursor: "pointer" }}
                    >
                      Tap the picture to hide it
                    </div>
                  )}

                  {/* Show me button (abstract mode) */}
                  {scaffoldRendered && mode === "abstract" && !showScaffold && !feedback && (
                    <div style={{ marginTop: 12, textAlign: "center" }}>
                      <BrutalButton small onClick={() => setShowScaffold(true)} bg={COLORS.cream}>
                        Show me
                      </BrutalButton>
                    </div>
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
                            backgroundColor: COLORS.yellow, padding: "6px 12px",
                            border: BRUTAL_BORDER_SM, borderRadius: 6, fontSize: 20,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {String(currentItem.correctAnswer).includes("/")
                              ? (() => {
                                const [n, d] = String(currentItem.correctAnswer).split("/").map(Number);
                                return <FractionDisplay n={n} d={d} size="normal" />;
                              })()
                              : currentItem.correctAnswer}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Wrong answer helpers */}
                  {feedback === "incorrect" && (
                    <WrongAnswerHelpers
                      item={currentItem}
                      userAnswer={userAnswer}
                      userNum={userNum}
                      userDen={userDen}
                    />
                  )}
                </div>

                {/* Next button */}
                <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
                  {feedback === "incorrect" ? (
                    <BrutalButton onClick={pickNewItem} bg={COLORS.yellow}>Next →</BrutalButton>
                  ) : (feedback !== "correct" && currentItem.answerType === "orderThree" && orderSubmitted) ? (
                    <BrutalButton onClick={pickNewItem} bg={COLORS.yellow}>Next →</BrutalButton>
                  ) : null}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", animation: "fadeSlideUp 0.3s ease both" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🏔️</div>
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
                  Keep practicing Multiply, Divide, and Fractions to unlock more items!
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
