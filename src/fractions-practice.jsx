/**
 * FractionsPractice – the practice screen for the Fractions module.
 *
 * Mirrors the structure of multiplication-practice.jsx exactly:
 *  - Same state layout (hooks first, no conditional hooks)
 *  - Same spaced-repetition / weighted-draw engine
 *  - Same mastery persistence via dataManager
 *  - Same header / stats / streak / achievement popup
 *
 * Fractions-specific differences (spec §7):
 *  - Multiple answerType renderers instead of a single <input type="number">
 *  - Scaffold selected by item.skill prefix via scaffoldMap
 *  - Skill-gated "new" item ordering (A3/A4 gated on 60% A1+A2)
 *  - Default mode is concrete for foundations group, pictorial otherwise
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM,
  DEFAULT_MASTERY_THRESHOLD, AVATARS,
} from "./constants.js";
import { itemCellLabel } from "./shared/ui.jsx";
import fractionsModule, {
  FRACTION_POOL, shouldAllowSkill, FractionDisplay,
  FractionBar, TwoStackedBars, AddBarsScaffold, NumberLineScaffold,
  FractionFamilyStrip, FractionPartWholeBond,
} from "./modules/fractions.jsx";
import { registerModule, getModule } from "./modules/moduleRegistry.js";
import {
  initData, getMastery, updateMastery, updateStreak, checkStreakOnLaunch,
  recordSession, getProfile,
} from "./dataManager.js";
import { checkAfterAnswer, getAllAchievementsForProfile } from "./achievementEngine.js";
import AchievementPopup from "./AchievementPopup.jsx";
import { isContentAccessible } from "./purchaseManager.js";
import LogoLockup from "./LogoLockup.jsx";

// Register the fractions module
registerModule(fractionsModule);

// ---------------------------------------------------------------------------
// Small reusable components (local copies matching multiply-practice style)
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
// Answer input renderers
// ---------------------------------------------------------------------------

/**
 * FractionInputFields – two stacked number fields (numerator/denominator)
 * separated by a thick vinculum.  Used for E3, A1–A4.
 */
function FractionInputFields({ numVal, denVal, onNumChange, onDenChange, onSubmit, disabled }) {
  const fieldStyle = {
    width: 110, fontSize: 42, fontFamily: "'Shrikhand', cursive",
    fontWeight: 400, textAlign: "center", border: "none",
    backgroundColor: "transparent", color: COLORS.black,
    outline: "none", padding: "4px 0",
    caretColor: COLORS.black,
    MozAppearance: "textfield",
    WebkitAppearance: "none",
  };
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      gap: 2,
    }}>
      <input
        type="number" value={numVal} placeholder="?"
        disabled={disabled}
        onChange={e => onNumChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
        style={fieldStyle}
      />
      <div style={{ width: 96, height: 4, backgroundColor: COLORS.black, borderRadius: 2 }} />
      <input
        type="number" value={denVal} placeholder="?"
        disabled={disabled}
        onChange={e => onDenChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
        style={fieldStyle}
      />
    </div>
  );
}

/**
 * Choice4Grid – renders 4 tappable fraction chips in a 2×2 grid.
 */
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
        const bg = isPicked
          ? (isCorrect ? COLORS.green : COLORS.red)
          : "white";
        return (
          <button key={i} onClick={() => !picked && onPick(c)}
            style={{
              padding: "14px 10px", borderRadius: 10, border: BRUTAL_BORDER_SM,
              backgroundColor: bg, cursor: picked ? "default" : "pointer",
              boxShadow: BRUTAL_SHADOW_SM,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: isPicked ? (isCorrect ? "correctPulse 0.4s ease" : "shake 0.4s ease") : "none",
              transition: "background-color 0.2s ease",
              minHeight: 64,
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

/**
 * TapTwoCards – renders two fraction comparison cards (left / right).
 * For C1 there can also be an "Equal" third option.
 */
function TapTwoCards({ left, right, onPick, picked, correct, showEqual = false }) {
  const cards = [
    { id: "left", frac: left },
    { id: "right", frac: right },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 16, width: "100%" }}>
      <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 340 }}>
        {cards.map(({ id, frac }) => {
          const isCorrect = correct === id;
          const isPicked = picked === id;
          const bg = isPicked
            ? (isCorrect ? COLORS.green : COLORS.red)
            : "white";
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

/**
 * OrderThreeTiles – tap in sequence to order three fractions.
 * Spec calls for drag-to-order on touch; implemented as tap-in-sequence per spec fallback.
 */
function OrderThreeTiles({ fracs, direction, onSubmitOrder, submitted, correctOrder }) {
  const [tapOrder, setTapOrder] = useState([]); // indices tapped so far

  const handleTap = (idx) => {
    if (submitted) return;
    if (tapOrder.includes(idx)) return;
    const newOrder = [...tapOrder, idx];
    setTapOrder(newOrder);
    if (newOrder.length === fracs.length) {
      onSubmitOrder(newOrder);
    }
  };

  const getLabel = (idx) => {
    const pos = tapOrder.indexOf(idx);
    return pos >= 0 ? pos + 1 : null;
  };

  // After submission: color tiles by correctness
  const isCorrect = submitted && JSON.stringify(tapOrder) === JSON.stringify(correctOrder);

  return (
    <div style={{ marginTop: 16, width: "100%", maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
        textAlign: "center", marginBottom: 10, opacity: 0.6,
      }}>
        Tap {direction === "asc" ? "smallest → greatest" : "greatest → smallest"}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {fracs.map((f, idx) => {
          const label = getLabel(idx);
          const isPicked = tapOrder.includes(idx);
          let bg = "white";
          if (submitted) {
            bg = isCorrect ? COLORS.green : (isPicked ? COLORS.red : "#EEE");
          } else if (isPicked) {
            bg = COLORS.yellow;
          }
          return (
            <button key={idx} onClick={() => handleTap(idx)}
              style={{
                flex: 1, padding: "18px 8px", borderRadius: 12, border: BRUTAL_BORDER,
                backgroundColor: bg, cursor: submitted || isPicked ? "default" : "pointer",
                boxShadow: BRUTAL_SHADOW_SM, minHeight: 80, minWidth: 80,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 6, transition: "background-color 0.2s ease",
                position: "relative",
              }}>
              {label !== null && (
                <div style={{
                  position: "absolute", top: 6, right: 8,
                  fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                  color: COLORS.black, opacity: 0.7,
                }}>
                  {label}
                </div>
              )}
              <FractionDisplay n={f.n} d={f.d} size="normal" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * BuildBarInput – concrete mode for F2: tappable bar segments.
 */
function BuildBarInput({ item, onSubmit, disabled }) {
  const [shadedCount, setShadedCount] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 16, width: "100%" }}>
      <FractionBar
        n={item.n} d={item.d}
        interactive={!disabled}
        shadedCount={shadedCount}
        onShadedChange={setShadedCount}
        color={COLORS.purple}
      />
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, opacity: 0.7 }}>
        {shadedCount} out of {item.d} shaded
      </div>
      {!disabled && (
        <BrutalButton onClick={() => onSubmit(shadedCount)} bg={COLORS.yellow}>
          Check!
        </BrutalButton>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scaffold renderer — picks the right visual by skill
// ---------------------------------------------------------------------------

function ScaffoldForItem({ item, showScaffold, scaffoldOpacity, mode, feedback }) {
  if (mode === "abstract" && !showScaffold) return null;
  const opacity = showScaffold ? 1 : scaffoldOpacity;
  if (opacity <= 0) return null;

  const skill = item.skill;

  if (skill === "F1") {
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <FractionBar n={item.n} d={item.d} color={COLORS.purple} opacity={opacity} animate={showScaffold} />
      </div>
    );
  }

  if (skill === "F2") {
    // In non-concrete mode, show the pre-shaded bar as a hint
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <FractionBar n={item.n} d={item.d} color={COLORS.purple} opacity={opacity} animate={showScaffold} />
      </div>
    );
  }

  if (skill === "F3" || skill === "F4" || skill === "C1" || skill === "C2") {
    const left = item.left || item.fracs?.[0] || { n: 1, d: 2 };
    const right = item.right || item.fracs?.[1] || { n: 1, d: 3 };
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <TwoStackedBars
          top={{ ...left, label: `${left.n}/${left.d}` }}
          bottom={{ ...right, label: `${right.n}/${right.d}`, color: COLORS.blue }}
          opacity={opacity} animate={showScaffold}
        />
      </div>
    );
  }

  if (skill === "E1" || skill === "E2" || skill === "E3") {
    const base = item.base || { n: item.n, d: item.d };
    const target = item.target || { n: item.sn, d: item.sd };
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <TwoStackedBars
          top={{ n: base.n, d: base.d, label: `${base.n}/${base.d}` }}
          bottom={{ n: target.n, d: target.d, label: `${target.n}/${target.d}`, color: COLORS.blue }}
          opacity={opacity} animate={showScaffold}
        />
      </div>
    );
  }

  if (skill === "E4") {
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <NumberLineScaffold n={item.n} d={item.d} opacity={opacity} animate={showScaffold} showValue={showScaffold} />
      </div>
    );
  }

  if (skill === "A1" || skill === "A2" || skill === "A3" || skill === "A4") {
    const [rn, rd] = item.correctAnswer.split("/").map(Number);
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <AddBarsScaffold
          a={item.a} b={item.b}
          result={{ n: rn, d: rd }}
          isSubtract={item.isSubtract}
          opacity={opacity} animate={showScaffold}
        />
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// "Because" + hint + bond for wrong answers
// ---------------------------------------------------------------------------

function WrongAnswerHelpers({ item, userNumerator, userDenominator }) {
  const skill = item.skill;

  // Build "because" text
  let becauseText = "";
  if (skill === "F1" || skill === "F2") {
    becauseText = `because ${item.n} out of ${item.d} equal parts are shaded — that's ${item.n}/${item.d}`;
  } else if (skill === "E1" || skill === "E2") {
    const base = item.base;
    const target = item.target;
    becauseText = `because ${base.n}/${base.d} × ${item.mult}/${item.mult} = ${target.n}/${target.d} — same amount, smaller pieces`;
  } else if (skill === "E3") {
    becauseText = `because ${item.n}/${item.d} ÷ ${item.n / item.sn}/${item.n / item.sn} = ${item.sn}/${item.sd}`;
  } else if (skill === "C1") {
    // Find which is larger by converting
    const lcd = item.left.d * item.right.d / gcd(item.left.d, item.right.d);
    const lv = item.left.n * (lcd / item.left.d);
    const rv = item.right.n * (lcd / item.right.d);
    if (lv !== rv) {
      const larger = lv > rv ? item.left : item.right;
      const smaller = lv > rv ? item.right : item.left;
      const convSmaller = { n: smaller.n * (lcd / smaller.d), d: lcd };
      becauseText = `because ${smaller.n}/${smaller.d} = ${convSmaller.n}/${lcd}, and ${larger.n}/${larger.d} > ${convSmaller.n}/${lcd}`;
    } else {
      becauseText = `because ${item.left.n}/${item.left.d} = ${item.right.n}/${item.right.d} — they're equal!`;
    }
  } else if (skill === "A1" || skill === "A2") {
    becauseText = `because ${item.a.n}/${item.a.d} ${item.isSubtract ? "−" : "+"} ${item.b.n}/${item.b.d} = ${item.correctAnswer}`;
  } else if (skill === "A3" || skill === "A4") {
    const lcd = item.lcd;
    const aConv = { n: item.a.n * (lcd / item.a.d), d: lcd };
    becauseText = `because ${item.a.n}/${item.a.d} = ${aConv.n}/${lcd}, so ${aConv.n}/${lcd} ${item.isSubtract ? "−" : "+"} ${item.b.n}/${item.b.d} = ${item.correctAnswer}`;
  } else {
    becauseText = `the answer is ${item.correctAnswer}`;
  }

  // Detect added-denominator error (A-group)
  const isAddedDenomError = (skill === "A1" || skill === "A3") && userDenominator !== "" &&
    parseInt(userDenominator) === item.a.d + item.b.d;

  // Build hint family strip
  let hintFamily = null;
  if (skill === "E1" || skill === "E2" || skill === "E3" || skill === "A3" || skill === "A4") {
    const base = item.base || item.a;
    if (base) {
      const family = [1,2,3,4].map(m => ({
        n: base.n * m,
        d: base.d * m,
      })).filter(f => f.d <= 12);
      const target = item.target || { n: item.a.n * (item.lcd / item.a.d), d: item.lcd };
      hintFamily = <FractionFamilyStrip family={family} highlight={target} />;
    }
  }

  // Build part-whole bond
  let bond = null;
  if (skill === "A1" || skill === "A2" || skill === "A3" || skill === "A4") {
    const [rn, rd] = item.correctAnswer.split("/").map(Number);
    bond = (
      <FractionPartWholeBond
        whole={{ n: rn, d: rd }}
        partA={item.a}
        partB={item.b}
      />
    );
  } else if (skill === "F1" || skill === "F2") {
    const un = item.d - item.n;
    bond = (
      <FractionPartWholeBond
        whole={{ n: item.d, d: item.d }}
        partA={{ n: item.n, d: item.d }}
        partB={{ n: un, d: item.d }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
      {/* Added-denominator override */}
      {isAddedDenomError ? (
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700,
          backgroundColor: COLORS.orange, border: BRUTAL_BORDER_SM, borderRadius: 8,
          padding: "10px 14px", color: COLORS.black, textAlign: "center",
        }}>
          Careful — {item.a.d === item.b.d ? `${item.a.d}ths` : "the pieces"} plus {item.a.d === item.b.d ? `${item.b.d}ths` : "the pieces"} are still <strong>the same size!</strong> The bottom number names the pieces — it doesn't get added.
        </div>
      ) : (
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700,
          color: COLORS.black, textAlign: "center",
          backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: 8,
          padding: "10px 14px",
        }}>
          {becauseText}
        </div>
      )}

      {hintFamily && <div style={{ textAlign: "center" }}>{hintFamily}</div>}
      {bond && <div>{bond}</div>}
    </div>
  );
}

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

// ---------------------------------------------------------------------------
// Question Display (the big fraction or equation)
// ---------------------------------------------------------------------------

function QuestionDisplay({ item, feedback }) {
  const skill = item.skill;

  // F1: "What fraction is shaded?"
  if (skill === "F1") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
          {item.displayType === "circle" ? (
            <CircleFraction n={item.n} d={item.d} />
          ) : (
            <FractionBar n={item.n} d={item.d} color={COLORS.purple} />
          )}
        </div>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700,
          color: "#666", marginBottom: 8,
        }}>
          What fraction is shaded?
        </div>
      </div>
    );
  }

  // F2: "Shade {n/d} of the bar" — bar is the interactive input
  if (skill === "F2") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginBottom: 8 }}>
          Shade
        </div>
        <FractionDisplay n={item.n} d={item.d} size="hero" />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginTop: 8 }}>
          of the bar
        </div>
      </div>
    );
  }

  // F3/F4/C1: comparison question
  if (skill === "F3" || skill === "F4" || skill === "C1") {
    return (
      <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
        {item.questionText}
      </div>
    );
  }

  // C2: order question
  if (skill === "C2") {
    return (
      <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
        {item.questionText}
      </div>
    );
  }

  // E1: "Which fraction equals X?"
  if (skill === "E1") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
          Which fraction equals
        </div>
        <FractionDisplay n={item.base.n} d={item.base.d} size="hero" />
      </div>
    );
  }

  // E2: missing number — show equation with a box
  if (skill === "E2") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <FractionDisplay n={item.base.n} d={item.base.d} size="hero" />
        <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 40, lineHeight: 1 }}>=</span>
        {item.blankIs === "numerator" ? (
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", fontFamily: "'Shrikhand', cursive", fontSize: 48 }}>
            <span style={{ fontSize: 48, color: COLORS.purple }}>?</span>
            <span style={{ display: "block", height: 3, width: 56, backgroundColor: COLORS.black, margin: "4px 0", borderRadius: 2 }} />
            <span>{item.target.d}</span>
          </span>
        ) : (
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", fontFamily: "'Shrikhand', cursive", fontSize: 48 }}>
            <span>{item.target.n}</span>
            <span style={{ display: "block", height: 3, width: 56, backgroundColor: COLORS.black, margin: "4px 0", borderRadius: 2 }} />
            <span style={{ fontSize: 48, color: COLORS.purple }}>?</span>
          </span>
        )}
      </div>
    );
  }

  // E3: "Simplify X/Y"
  if (skill === "E3") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
          Simplify
        </div>
        <FractionDisplay n={item.n} d={item.d} size="hero" />
      </div>
    );
  }

  // E4: "What fraction is marked?" — number line shown in scaffold
  if (skill === "E4") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
          {item.questionText}
        </div>
        {/* Marker value stays hidden until the child has answered — the question
            is "What fraction is marked?" */}
        <NumberLineScaffold n={item.n} d={item.d} opacity={1} animate={false} showValue={!!feedback} />
      </div>
    );
  }

  // A1–A4: equation
  if (skill === "A1" || skill === "A2" || skill === "A3" || skill === "A4") {
    const op = item.isSubtract ? "−" : "+";
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

  return null;
}

/**
 * Simple circle fraction diagram (for F1 variety).
 */
function CircleFraction({ n, d }) {
  const R = 48, cx = 56, cy = 56;
  const slices = Array.from({ length: d }).map((_, i) => {
    const startAngle = (i / d) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 1) / d) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      shaded: i < n,
    };
  });
  return (
    <svg width={112} height={112} viewBox="0 0 112 112" style={{ display: "block", margin: "0 auto" }}>
      {slices.map((s, i) => (
        <path key={i} d={s.d}
          fill={s.shaded ? COLORS.purple : "#F0F0F0"}
          stroke={COLORS.black} strokeWidth={2} />
      ))}
    </svg>
  );
}

function buildBuildBarChoices(item) {
  const n = item.correctAnswer;
  const d = item.d;
  const choices = new Set([n]);
  if (n > 1) choices.add(n - 1);
  if (n < d) choices.add(n + 1);
  if (d - n !== n && d - n >= 1) choices.add(d - n);
  // Valid shade counts are 1..d — small denominators can't yield 4 distinct
  // choices, so fill deterministically and let the grid show fewer buttons.
  for (let c = 1; c <= d && choices.size < 4; c++) choices.add(c);
  return [...choices].slice(0, 4).sort(() => Math.random() - 0.5);
}

// ---------------------------------------------------------------------------
// Shuffled choices memo — prevent reshuffling on re-render
// ---------------------------------------------------------------------------
function useShuffledChoices(item) {
  const prev = useRef(null);
  if (!prev.current || prev.current.key !== item?.itemKey) {
    if (item && item.answerType === "choice4") {
      const all = [item.correctAnswer, ...item.distractors];
      // Fisher-Yates
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      prev.current = { key: item.itemKey, choices: all };
    } else if (item && item.answerType === "buildBar") {
      const choices = buildBuildBarChoices(item);
      prev.current = { key: item.itemKey, choices };
    } else {
      prev.current = { key: item?.itemKey, choices: [] };
    }
  }
  return prev.current.choices;
}

// ---------------------------------------------------------------------------
// Main practice component
// ---------------------------------------------------------------------------

export default function FractionsPractice({
  moduleId = "fractions",
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
  const [activeGroups, setActiveGroups] = useState(null); // null = all accessible
  const [focusSkill, setFocusSkill] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [feedback, setFeedback] = useState(null); // null | "correct" | "incorrect"
  const [pickedChoice, setPickedChoice] = useState(null);
  const [userNum, setUserNum] = useState("");
  const [userDen, setUserDen] = useState("");
  const [userAnswer, setUserAnswer] = useState(""); // for singleNumber
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [showScaffold, setShowScaffold] = useState(false);
  const [userHidScaffold, setUserHidScaffold] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [view, setView] = useState(initialView);
  const [streak, setStreak] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [sessionStartTime] = useState(Date.now());
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
        recordSession(profileId, {
          moduleId,
          correct: stats.correct,
          total: stats.total,
          duration: Date.now() - sessionStartTime,
        });
      }
    };
  }, [profileId, sessionStartTime, moduleId]);

  // Mastery data helpers
  const getMasteryData = useCallback(() => {
    if (profileId) return getMastery(profileId, moduleId) || {};
    return localMastery;
  }, [profileId, moduleId, localMastery]);

  const getMasteryLevel = useCallback((itemKey) => {
    return getMasteryData()[itemKey]?.correct || 0;
  }, [getMasteryData]);

  // Active pool — filter by activeGroups and focusSkill
  const activePools = useMemo(() => {
    const masteryData = getMasteryData();
    return FRACTION_POOL.filter(item => {
      const group = mod?.groups.find(g => g.id === item.group);
      if (!group) return false;
      if (!isContentAccessible(moduleId, item.group)) return false;
      if (activeGroups && !activeGroups.includes(item.group)) return false;
      if (focusSkill && item.skill !== focusSkill) return false;
      // Skill gate for A3/A4
      if (!shouldAllowSkill(item.skill, masteryData)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroups, focusSkill, moduleId]);

  const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

  // Weighted pick — mirrors multiplication-practice.jsx pickNewFact exactly
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
    setUserNum(""); setUserDen(""); setUserAnswer("");
    setPickedChoice(null); setFeedback(null);
    setShowScaffold(false); setUserHidScaffold(false);
    setOrderSubmitted(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [activePools, getMasteryData, currentItem]);

  useEffect(() => {
    pickNewItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroups, focusSkill, activePools.length]);

  // Scaffold opacity (pictorial fading rule)
  const scaffoldOpacity = useMemo(() => {
    if (mode === "concrete") return 1;
    if (mode === "pictorial" && currentItem) {
      return Math.max(0.15, 1 - getMasteryLevel(currentItem.itemKey) * 0.3);
    }
    return 0;
  }, [mode, currentItem, getMasteryLevel]);

  // Skills whose question already embeds the visual get no separate scaffold;
  // concrete F2 gets none either (until feedback) — the bar there is the input,
  // and a pre-shaded copy would reveal the answer.
  const scaffoldRendered = !!currentItem
    && currentItem.skill !== "F1"
    && currentItem.skill !== "E4"
    && !(currentItem.skill === "F2" && mode === "concrete" && !feedback);

  // Evaluate an answer and return true/false
  const evaluateAnswer = useCallback((item, answerPayload) => {
    const { type, value } = answerPayload;
    const correct = item.correctAnswer;

    if (type === "choice" || type === "tapTwo") {
      return value === correct;
    }
    if (type === "singleNumber") {
      return parseInt(value) === parseInt(correct);
    }
    if (type === "fractionInput") {
      const [cn, cd] = correct.split("/").map(Number);
      const un = parseInt(value.n), ud = parseInt(value.d);
      if (isNaN(un) || isNaN(ud) || ud === 0) return false;
      // Accept canonical or simplified
      if (un === cn && ud === cd) return true;
      if (item.altAnswer) {
        const [an, ad] = item.altAnswer.split("/").map(Number);
        if (un === an && ud === ad) return true;
      }
      // Also accept any equivalent fraction
      return un * cd === cn * ud;
    }
    if (type === "orderThree") {
      return JSON.stringify(value) === JSON.stringify(item.order);
    }
    if (type === "buildBar") {
      return parseInt(value) === item.correctAnswer;
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

  // Submit handlers per answer type
  const handleSubmit = useCallback(() => {
    if (!currentItem || feedback) return;
    const { answerType } = currentItem;
    if (answerType === "singleNumber") {
      if (userAnswer === "") return;
      handleAnswer({ type: "singleNumber", value: userAnswer });
    } else if (answerType === "fractionInput") {
      if (userNum === "" || userDen === "") return;
      handleAnswer({ type: "fractionInput", value: { n: userNum, d: userDen } });
    } else if (answerType === "buildBar") {
      // submitted via BuildBarInput's Check! button with count
    }
  }, [currentItem, feedback, userAnswer, userNum, userDen, handleAnswer]);

  const handleBuildBarSubmit = useCallback((count) => {
    handleAnswer({ type: "buildBar", value: count });
  }, [handleAnswer]);

  const handleTapChoice = useCallback((value) => {
    if (feedback) return;
    setPickedChoice(value);
    // Map tap-two "left"/"right" back to fraction string for evaluation
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
    const groupItems = FRACTION_POOL.filter(i => i.group === groupId);
    const mastered = groupItems.filter(i => getMasteryLevel(i.itemKey) >= DEFAULT_MASTERY_THRESHOLD).length;
    return { total: groupItems.length, mastered };
  }, [getMasteryLevel]);

  // Is the current selection locked?
  const isLocked = activePools.length === 0 && !!focusSkill;

  if (!mod) return <div style={{ padding: 40, textAlign: "center" }}>Module not found</div>;

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
        * { box-sizing: border-box; }
        @keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeSlideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes correctPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
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
            const totalItems = FRACTION_POOL.filter(i => isContentAccessible(moduleId, i.group)).length;
            const masteredItems = FRACTION_POOL.filter(i =>
              isContentAccessible(moduleId, i.group) &&
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
                    marginBottom: 14, border: BRUTAL_BORDER, boxShadow: `5px 5px 0px ${COLORS.purple}`,
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
                        backgroundColor: mode === m.id ? COLORS.purple : "white",
                        color: mode === m.id ? "white" : COLORS.black,
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
              <button onClick={() => { setFocusSkill(null); setView("practice"); }}
                style={{
                  width: "100%", padding: 14, borderRadius: 12,
                  border: BRUTAL_BORDER, backgroundColor: COLORS.yellow, color: COLORS.black,
                  fontWeight: 700, cursor: "pointer", fontFamily: "'Shrikhand', cursive",
                  fontSize: 16, boxShadow: BRUTAL_SHADOW, marginBottom: 14,
                }}>
                Practice Fractions!
              </button>

              {/* Mastery grids by group */}
              {mod.groups.map(group => {
                const prog = getGroupProgress(group.id);
                const accessible = isContentAccessible(moduleId, group.id);
                const groupItems = FRACTION_POOL.filter(i => i.group === group.id);
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
                          // Group the group's items by skill (preserving pool order) so each
                          // sub-type gets a readable header ("Name it!", "Shade it!", …) and
                          // its own row of cells — disambiguates same-fraction-across-skills.
                          const bySkill = [];
                          groupItems.forEach(item => {
                            let bucket = bySkill.find(b => b.skill === item.skill);
                            if (!bucket) { bucket = { skill: item.skill, items: [] }; bySkill.push(bucket); }
                            bucket.items.push(item);
                          });
                          return bySkill.map(({ skill, items }) => (
                            <div key={skill} style={{ marginBottom: 14 }}>
                              <div style={{
                                fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                                color: "#888", marginBottom: 6,
                              }}>
                                {fractionsModule.skillLabels?.[skill] || skill}
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
                                {items.map(item => {
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
                                        {itemCellLabel(item.itemKey)}
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
                  {/* Mastery dots */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <MasteryDots level={Math.min(getMasteryLevel(currentItem.itemKey), DEFAULT_MASTERY_THRESHOLD)} max={DEFAULT_MASTERY_THRESHOLD} />
                  </div>

                  {/* Skill label chip */}
                  <div style={{ marginBottom: 12 }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                      backgroundColor: fractionsModule.groups.find(g => g.id === currentItem.group)?.color || COLORS.purple,
                      color: COLORS.black, padding: "3px 10px", borderRadius: 20, border: BRUTAL_BORDER_SM,
                    }}>
                      {fractionsModule.skillLabels[currentItem.skill] || currentItem.skill}
                    </span>
                  </div>

                  {/* Question */}
                  <QuestionDisplay item={currentItem} feedback={feedback} />

                  {/* Answer input */}
                  {!feedback && currentItem.answerType === "buildBar" && mode === "concrete" ? (
                    <BuildBarInput item={currentItem} onSubmit={handleBuildBarSubmit} disabled={false} />
                  ) : (
                    <div onKeyDown={handleKeyDown}>
                      {currentItem.answerType === "choice4" ? (
                        <Choice4Grid
                          choices={shuffledChoices}
                          onPick={handleTapChoice}
                          picked={pickedChoice}
                          correct={currentItem.correctAnswer}
                        />
                      ) : currentItem.answerType === "tapTwo" || currentItem.answerType === "tapTwoOrEqual" ? (
                        <TapTwoCards
                          left={currentItem.left} right={currentItem.right}
                          onPick={handleTapChoice}
                          picked={pickedChoice}
                          correct={currentItem.correctAnswer === `${currentItem.left?.n}/${currentItem.left?.d}` ? "left"
                            : currentItem.correctAnswer === `${currentItem.right?.n}/${currentItem.right?.d}` ? "right" : "equal"}
                          showEqual={currentItem.answerType === "tapTwoOrEqual"}
                        />
                      ) : currentItem.answerType === "orderThree" ? (
                        <OrderThreeTiles
                          fracs={currentItem.fracs}
                          direction={currentItem.direction}
                          onSubmitOrder={handleOrderSubmit}
                          submitted={orderSubmitted}
                          correctOrder={currentItem.order}
                        />
                      ) : currentItem.answerType === "fractionInput" ? (
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
                      ) : currentItem.answerType === "singleNumber" ? (
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
                              width: 120, fontSize: 52, fontFamily: "'Shrikhand', cursive",
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
                      ) : currentItem.answerType === "buildBar" ? (
                        // Non-concrete mode buildBar
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
                                    ? (parseInt(c) === currentItem.correctAnswer ? COLORS.green : COLORS.red) : "white",
                                  fontFamily: "'Shrikhand', cursive", fontSize: 32, fontWeight: 700,
                                  cursor: pickedChoice ? "default" : "pointer",
                                  boxShadow: BRUTAL_SHADOW_SM,
                                }}>
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Scaffold — skipped where the question already embeds the visual
                      (F1 bar/circle, E4 number line) and in concrete F2, where the
                      interactive bar is the input and a pre-shaded bar would reveal
                      the answer (it still appears there after a wrong answer). */}
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
                        scaffoldOpacity={scaffoldOpacity}
                        mode={mode}
                        feedback={feedback}
                      />
                    </div>
                  )}

                  {/* Tap-to-dismiss scaffold in pictorial */}
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
                      userNumerator={userNum}
                      userDenominator={userDen}
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

                {/* Progress button removed — progress accessed from home screen */}
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
                  Ask a parent to unlock more Fractions content in the Parent Zone!
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#999" }}>
                  Fractions unlocks in Parent Zone → Modules
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
