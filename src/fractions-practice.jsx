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
  DEFAULT_MASTERY_THRESHOLD, AVATARS, GUESS_MS,
} from "./constants.js";
// Note: fractions is a conceptual module — no speed gate is passed to
// updateMastery here (curriculum ruling), so FLUENCY_MS_* is not imported.
import { itemCellLabel } from "./shared/ui.jsx";
import fractionsModule, {
  FRACTION_POOL, shouldAllowSkill, FractionDisplay,
  FractionBar, TwoStackedBars, AddBarsScaffold, NumberLineScaffold,
  FractionFamilyStrip, FractionPartWholeBond,
} from "./modules/fractions.jsx";
import { registerModule, getModule } from "./modules/moduleRegistry.js";
import {
  initData, getMastery, updateMastery, updateStreak, checkStreakOnLaunch,
  recordAnswerInSession, recordAssistedInSession, recordPeekInSession, finalizeLiveSession, getProfile, getPreferredMode, setPreferredMode,
} from "./dataManager.js";
import { checkAfterAnswer, getAllAchievementsForProfile } from "./achievementEngine.js";
import AchievementPopup from "./AchievementPopup.jsx";
import { isContentAccessible } from "./purchaseManager.js";
import LogoLockup from "./LogoLockup.jsx";
import WrongAnswerReveal from "./shared/WrongAnswerReveal.jsx";
import DerivationLine from "./shared/DerivationLine.jsx";

// Register the fractions module
registerModule(fractionsModule);

// ---------------------------------------------------------------------------
// Wrong-answer reveal helpers (docs/wrong-answer-reveal-spec.md, "Phase 2 —
// Fractions"). Mirrors multiplication-practice.jsx's HEADER_TAILS/hashString
// exactly (that file doesn't export them, so they're duplicated here — same
// deterministic, no-Math.random()-in-render header rotation).
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

// Ordinal denominator words (spec "Governing rulings"): singular when the
// count immediately before the word is 1, plural otherwise. Never "quarters".
const ORDINAL_SINGULAR = { 2: "half", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth" };
const ORDINAL_PLURAL = { 2: "halves", 3: "thirds", 4: "fourths", 5: "fifths", 6: "sixths", 7: "sevenths", 8: "eighths", 9: "ninths", 10: "tenths", 11: "elevenths", 12: "twelfths" };
function denomWord(d, count) {
  const words = count === 1 ? ORDINAL_SINGULAR : ORDINAL_PLURAL;
  return words[d] || `${d}ths`;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function lcm(a, b) { return (a * b) / gcd(a, b); }

// "his wrong pick" (choice4/buildBar) or the correct-id (tapTwo/orderThree) —
// same computation the card already does inline for TapTwoCards' `correct` prop.
function tapTwoCorrectId(item) {
  if (item.correctAnswer === `${item.left?.n}/${item.left?.d}`) return "left";
  if (item.correctAnswer === `${item.right?.n}/${item.right?.d}`) return "right";
  return "equal";
}

// Second-miss fill value per answerType (spec "Re-ask and second miss" table)
// — always the CANONICAL correctAnswer, never altAnswer.
function fillValueFor(item) {
  switch (item.answerType) {
    case "choice4": return item.correctAnswer;
    case "tapTwo":
    case "tapTwoOrEqual": return tapTwoCorrectId(item);
    case "orderThree": return item.order[0];
    case "fractionInput": {
      const [cn, cd] = String(item.correctAnswer).split("/").map(Number);
      return { n: String(cn), d: String(cd) };
    }
    case "singleNumber": return String(item.correctAnswer);
    case "buildBar": return item.correctAnswer;
    default: return item.correctAnswer;
  }
}

// The re-ask's starting value per answerType (spec "Part 2"): fractionInput
// -> {n,d}; singleNumber -> string; concrete buildBar -> a count (the
// interactive bar resets to 0); everything else (tap-based) -> null, set at
// tap time.
function initialRetryValue(item, mode) {
  if (!item) return null;
  switch (item.answerType) {
    case "fractionInput": return { n: "", d: "" };
    case "singleNumber": return "";
    case "buildBar": return mode === "concrete" ? 0 : null;
    default: return null;
  }
}

const PICTURE_MAX_BY_TYPE = {
  choice4: "min(220px, 34dvh)",
  tapTwo: "min(220px, 34dvh)",
  tapTwoOrEqual: "min(220px, 34dvh)",
  orderThree: "min(220px, 34dvh)",
  buildBar: "min(220px, 34dvh)",
  singleNumber: "min(150px, 24dvh)",
  fractionInput: "min(120px, 19dvh)",
};
const TYPED_ANSWER_TYPES = new Set(["singleNumber", "fractionInput"]);

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
// `fieldWidth`/`fieldFontSize`/`bg` (Phase 2 — Fractions, opt-in/default off):
// the reveal's typed re-ask reuses this component at a smaller size (32px /
// 90px, spec "Governing rulings" budget table) with a fill colour for the
// filled/disabled second-miss state. Defaults reproduce the original 110/42
// card sizing byte-for-byte when the new props aren't passed.
function FractionInputFields({ numVal, denVal, onNumChange, onDenChange, onSubmit, disabled, fieldWidth = 110, fieldFontSize = 42, bg = "transparent", dense = false }) {
  // `dense` (wrong-answer reveal): no vertical padding and a tight gap, so
  // the two stacked boxes + vinculum fit the keyboard-up budget (R2).
  const fieldStyle = {
    width: fieldWidth, fontSize: fieldFontSize, fontFamily: "'Shrikhand', cursive",
    fontWeight: 400, textAlign: "center", border: "none",
    backgroundColor: bg, color: COLORS.black,
    outline: "none", padding: dense ? "0" : "4px 0", lineHeight: dense ? 1.15 : undefined,
    caretColor: COLORS.black,
    MozAppearance: "textfield",
    WebkitAppearance: "none",
  };
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      gap: dense ? 0 : 2,
    }}>
      <input
        type="number" inputMode="numeric" value={numVal} placeholder="?"
        disabled={disabled}
        onChange={e => onNumChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
        style={fieldStyle}
      />
      <div style={{ width: fieldWidth * 0.87, height: 4, backgroundColor: COLORS.black, borderRadius: 2 }} />
      <input
        type="number" inputMode="numeric" value={denVal} placeholder="?"
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
// `reveal` (Phase 2 — Fractions, opt-in/default off): the wrong-answer
// reveal's re-ask. `{ wrong, fill }` — `wrong` greys+disables that option
// (the card's own first-submit pick, "same four positions, no reshuffle");
// `fill` (second miss) highlights the correct chip yellow and dims/disables
// everything else. No red, no shake inside the reveal (R4). With `reveal`
// absent this component is byte-identical to before.
function Choice4Grid({ choices, onPick, picked, correct, reveal = null }) {
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
        let bg, disabled, opacity = 1, animation = "none";
        if (reveal) {
          const isWrong = reveal.wrong != null && c === reveal.wrong;
          const isFill = reveal.fill != null && c === reveal.fill;
          if (reveal.fill != null) {
            bg = isFill ? COLORS.yellow : "white";
            opacity = isFill ? 1 : 0.45;
            disabled = true;
          } else {
            bg = isWrong ? "#EEE" : "white";
            opacity = isWrong ? 0.45 : 1;
            disabled = isWrong;
          }
        } else {
          bg = isPicked ? (isCorrect ? COLORS.green : COLORS.red) : "white";
          disabled = !!picked;
          animation = isPicked ? (isCorrect ? "correctPulse 0.4s ease" : "shake 0.4s ease") : "none";
        }
        return (
          <button key={i} onClick={() => !disabled && onPick(c)}
            style={{
              padding: "14px 10px", borderRadius: 10, border: BRUTAL_BORDER_SM,
              backgroundColor: bg, cursor: disabled ? "default" : "pointer",
              boxShadow: BRUTAL_SHADOW_SM,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation, opacity,
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
// `reveal` (Phase 2 — Fractions, opt-in/default off): `{ fill, fillColor }`.
// Per the spec table, both cards (and "They're equal") stay LIVE and
// UNDIMMED during the ask — dimming the wrong one would leave nothing to
// read with only two options. `fill` (second miss, or a correct retry —
// `fillColor` distinguishes yellow vs green) highlights the correct option
// and dims/disables the rest. With `reveal` absent, byte-identical to before.
function TapTwoCards({ left, right, onPick, picked, correct, showEqual = false, reveal = null }) {
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
          let bg, disabled, opacity = 1, animation = "none";
          if (reveal) {
            const isFill = reveal.fill != null && id === reveal.fill;
            if (reveal.fill != null) {
              bg = isFill ? (reveal.fillColor || COLORS.yellow) : "white";
              opacity = isFill ? 1 : 0.45;
              disabled = true;
              animation = isFill && reveal.fillColor === COLORS.green ? "correctPulse 0.4s ease" : "none";
            } else {
              bg = "white"; disabled = false;
            }
          } else {
            bg = isPicked ? (isCorrect ? COLORS.green : COLORS.red) : "white";
            disabled = !!picked;
            animation = isPicked ? (isCorrect ? "correctPulse 0.4s ease" : "shake 0.4s ease") : "none";
          }
          return (
            <button key={id} onClick={() => !disabled && onPick(id)}
              style={{
                // Inside the reveal the cards are shorter (still ≥ 64px tap
                // targets) so the two-bar picture + line + cards fit 320×568.
                flex: 1, padding: reveal ? "12px 10px" : "20px 10px", borderRadius: 12, border: BRUTAL_BORDER,
                backgroundColor: bg, cursor: disabled ? "default" : "pointer",
                boxShadow: BRUTAL_SHADOW, minHeight: reveal ? 64 : 80,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation, opacity,
                transition: "background-color 0.2s ease",
              }}>
              <FractionDisplay n={frac.n} d={frac.d} size={reveal ? "large" : "hero"} />
            </button>
          );
        })}
      </div>
      {showEqual && (() => {
        let bg, disabled, opacity = 1, animation = "none";
        if (reveal) {
          const isFill = reveal.fill === "equal";
          if (reveal.fill != null) {
            bg = isFill ? (reveal.fillColor || COLORS.yellow) : COLORS.cream;
            opacity = isFill ? 1 : 0.45;
            disabled = true;
            animation = isFill && reveal.fillColor === COLORS.green ? "correctPulse 0.4s ease" : "none";
          } else {
            bg = COLORS.cream; disabled = false;
          }
        } else {
          bg = picked === "equal" ? (correct === "equal" ? COLORS.green : COLORS.red) : COLORS.cream;
          disabled = !!picked;
        }
        return (
          <button onClick={() => !disabled && onPick("equal")}
            style={{
              padding: reveal ? "10px 24px" : "12px 28px", borderRadius: 10, border: BRUTAL_BORDER_SM,
              backgroundColor: bg,
              fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700,
              cursor: disabled ? "default" : "pointer",
              boxShadow: BRUTAL_SHADOW_SM,
              animation, opacity,
              transition: "background-color 0.2s ease",
            }}>
            They're equal
          </button>
        );
      })()}
    </div>
  );
}

/**
 * OrderThreeTiles – tap in sequence to order three fractions.
 * Spec calls for drag-to-order on touch; implemented as tap-in-sequence per spec fallback.
 */
// `reveal` (Phase 2 — Fractions, opt-in/default off): `{ fill, fillColor,
// singleTap }`. `singleTap` — the wrong-answer reveal reduces C2 to ONE tap
// ("Tap the smallest" / "Tap the greatest"): `onSubmitOrder` is called with
// the tapped INDEX (a number), not the 3-length array the normal path
// builds. `fill` (second miss, or a correct retry — `fillColor` picks
// yellow vs green) highlights that one tile and dims/disables the rest;
// the tiles reset to white/unnumbered/live during the ask (a fresh mount —
// this is a separate component instance from the card's own tiles, so its
// own `tapOrder` state already starts empty). With `reveal` absent, this
// component is byte-identical to before.
function OrderThreeTiles({ fracs, direction, onSubmitOrder, submitted, correctOrder, reveal = null }) {
  const [tapOrder, setTapOrder] = useState([]); // indices tapped so far

  const handleTap = (idx) => {
    if (reveal) {
      if (submitted || reveal.fill != null) return;
      if (reveal.singleTap) { onSubmitOrder(idx); return; }
      return;
    }
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
      {!reveal && (
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
          textAlign: "center", marginBottom: 10, opacity: 0.6,
        }}>
          Tap {direction === "asc" ? "smallest → greatest" : "greatest → smallest"}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {fracs.map((f, idx) => {
          let bg, label = null, disabled = false, opacity = 1, animation = "none";
          if (reveal) {
            const isFill = reveal.fill != null && idx === reveal.fill;
            if (reveal.fill != null) {
              bg = isFill ? (reveal.fillColor || COLORS.yellow) : "white";
              opacity = isFill ? 1 : 0.45;
              disabled = true;
              label = isFill ? 1 : null;
              animation = isFill && reveal.fillColor === COLORS.green ? "correctPulse 0.4s ease" : "none";
            } else {
              bg = "white"; disabled = false;
            }
          } else {
            label = getLabel(idx);
            const isPicked = tapOrder.includes(idx);
            bg = "white";
            if (submitted) {
              bg = isCorrect ? COLORS.green : (isPicked ? COLORS.red : "#EEE");
            } else if (isPicked) {
              bg = COLORS.yellow;
            }
            disabled = submitted || isPicked;
          }
          return (
            <button key={idx} onClick={() => handleTap(idx)}
              style={{
                flex: 1, padding: "18px 8px", borderRadius: 12, border: BRUTAL_BORDER,
                backgroundColor: bg, cursor: disabled ? "default" : "pointer",
                boxShadow: BRUTAL_SHADOW_SM, minHeight: 80, minWidth: 80,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 6, transition: "background-color 0.2s ease",
                position: "relative", animation, opacity,
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

  if (skill === "F3" || skill === "F4" || skill === "C1") {
    const left = item.left || item.fracs?.[0] || { n: 1, d: 2 };
    const right = item.right || item.fracs?.[1] || { n: 1, d: 3 };
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <TwoStackedBars
          top={{ ...left, label: <FractionDisplay n={left.n} d={left.d} size="small" /> }}
          bottom={{ ...right, label: <FractionDisplay n={right.n} d={right.d} size="small" />, color: COLORS.blue }}
          opacity={opacity} animate={showScaffold}
        />
      </div>
    );
  }

  // C2 (leak fix, spec Part 1 item 8 / B-1): today only fracs[0]/fracs[1]
  // were ever drawn — the third fraction never appeared. Draw all three, in
  // tile order, same component shape as F3/F4/C1.
  if (skill === "C2") {
    const fracs = item.fracs || [{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 1, d: 4 }];
    const [f0, f1, f2] = fracs;
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <TwoStackedBars
          top={{ ...f0, label: <FractionDisplay n={f0.n} d={f0.d} size="small" /> }}
          bottom={{ ...f1, label: <FractionDisplay n={f1.n} d={f1.d} size="small" />, color: COLORS.blue }}
          third={{ ...f2, label: <FractionDisplay n={f2.n} d={f2.d} size="small" />, color: COLORS.orange }}
          opacity={opacity} animate={showScaffold}
        />
      </div>
    );
  }

  // E1 (leak fix, spec Part 2 "one more pre-reveal leak Part 1 left"): the
  // target bar IS the choice4 answer (E1 asks "which fraction equals the
  // base?") — its label used to print that fraction before the child had
  // picked. Same fix as E2/E3: drop the label until `feedback` is set.
  if (skill === "E1") {
    const base = item.base || { n: item.n, d: item.d };
    const target = item.target || { n: item.sn, d: item.sd };
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <TwoStackedBars
          top={{ n: base.n, d: base.d, label: <FractionDisplay n={base.n} d={base.d} size="small" /> }}
          bottom={{
            n: target.n, d: target.d,
            label: feedback ? <FractionDisplay n={target.n} d={target.d} size="small" /> : null,
            color: COLORS.blue,
          }}
          opacity={opacity} animate={showScaffold}
        />
      </div>
    );
  }

  // E2/E3 (leak fix, spec Part 1 item 8): the bottom bar's shaded length is
  // the concept being taught (keep it), but its LABEL used to print the
  // missing number (E2) / the simplified answer (E3) before the child had
  // answered — drop the label until `feedback` is set.
  if (skill === "E2" || skill === "E3") {
    const base = item.base || { n: item.n, d: item.d };
    const target = item.target || { n: item.sn, d: item.sd };
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <TwoStackedBars
          top={{ n: base.n, d: base.d, label: <FractionDisplay n={base.n} d={base.d} size="small" /> }}
          bottom={{
            n: target.n, d: target.d,
            label: feedback ? <FractionDisplay n={target.n} d={target.d} size="small" /> : null,
            color: COLORS.blue,
          }}
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
    // Coerce to string first: buildBar items store a number, and this file's
    // other A-group correctAnswer never has, but `.split` on a non-string
    // crashes (CLAUDE.md "Do NOT" — a shipped crash before).
    const [rn, rd] = String(item.correctAnswer).split("/").map(Number);
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <AddBarsScaffold
          a={item.a} b={item.b}
          result={{ n: rn, d: rd }}
          isSubtract={item.isSubtract}
          opacity={opacity} animate={showScaffold}
          // Leak fix (spec Part 1 item 8): the result bar's "= n/d" caption
          // (and its shading) used to print the answer before the child had
          // submitted anything. Pre-answer it's a "?" over an empty outline
          // bar; once answered (correct or incorrect) the ordinary caption
          // returns. ("none" — shaded with counts, no caption — is the
          // reveal's own picture, built by Part 2, not this card scaffold.)
          resultLabel={feedback ? "value" : "question"}
        />
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// WrongAnswerHelpers (the "because" text / FractionFamilyStrip hint /
// FractionPartWholeBond) is REMOVED (docs/wrong-answer-reveal-spec.md,
// "Phase 2 — Fractions", Part 2): the wrong-answer reveal replaces the whole
// appended incorrect block. FractionFamilyStrip and FractionPartWholeBond
// (imported above from ./modules/fractions.jsx) stay in the file — they're
// just unused by the wrong-answer path now; the "Show me" path (pre-answer)
// never used them and is unaffected.
// ---------------------------------------------------------------------------

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
        {/* Leak fix (spec Part 1 item 8): showValue stays off ENTIRELY, even
            after feedback — the reveal (Part 2) owns stating the answer, and
            this component's own showValue path prints an inline "{n}/{d}",
            which violates the stacked-fraction rule anyway. Question is
            "What fraction is marked?" either way. */}
        <NumberLineScaffold n={item.n} d={item.d} opacity={1} animate={false} showValue={false} />
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
 *
 * `counts` (spec Part 1 item 2, opt-in/default off): numbers each slice at
 * its centroid, same colours/weights as FractionBar's `counts` — 1…n ink
 * COLORS.black 700 on shaded, n+1…d #888 400 on unshaded. Used by the
 * wrong-answer reveal's F1 picture (Part 2); the in-card QuestionDisplay
 * call below is unchanged (counts defaults off).
 */
function CircleFraction({ n, d, counts = false }) {
  const R = 48, cx = 56, cy = 56;
  const labelR = R * 0.62;
  const slices = Array.from({ length: d }).map((_, i) => {
    const startAngle = (i / d) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 1) / d) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const midAngle = (startAngle + endAngle) / 2;
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      shaded: i < n,
      labelX: cx + labelR * Math.cos(midAngle),
      labelY: cy + labelR * Math.sin(midAngle),
    };
  });
  return (
    <svg width={112} height={112} viewBox="0 0 112 112" style={{ display: "block", margin: "0 auto" }}>
      {slices.map((s, i) => (
        <path key={i} d={s.d}
          fill={s.shaded ? COLORS.purple : "#F0F0F0"}
          stroke={COLORS.black} strokeWidth={2} />
      ))}
      {counts && slices.map((s, i) => (
        <text key={`n${i}`} x={s.labelX} y={s.labelY} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize={12} fontWeight={s.shaded ? 700 : 400}
          fill={s.shaded ? COLORS.black : "#888"}>
          {i + 1}
        </text>
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
// Wrong-answer reveal — line / picture / problem / prompt builders
// (docs/wrong-answer-reveal-spec.md, "Phase 2 — Fractions", "Per-skill
// contract"). Pure functions of the item (+ retry state where the contract
// needs it) — no component state lives here.
// ---------------------------------------------------------------------------

// A token colour (spec: "FractionDisplay sets its own colour, so the green
// must be passed in").
function tokenColor(tokenState) { return tokenState === "correct" ? COLORS.green : COLORS.black; }

// `firstSubmitDen` — the FIRST-submit userDen (component state, never reset
// by a wrong answer) for the A1/A3 added-denominator override.
function buildFractionLine(item, tokenState, firstSubmitDen) {
  const skill = item.skill;
  const color = tokenColor(tokenState);

  if (skill === "F1") {
    return [
      { t: "text", v: `${item.d} equal parts in all, ${item.n} shaded → ` },
      { t: "token", state: tokenState, children: <FractionDisplay n={item.n} d={item.d} size="small" color={color} /> },
    ];
  }

  if (skill === "F2") return null; // folded (phase 1c) — the picture's finalToken carries the answer

  if (skill === "F3") {
    const [wn, wd] = String(item.correctAnswer).split("/").map(Number);
    return [
      { t: "text", v: "More parts, smaller pieces → " },
      { t: "token", state: tokenState, children: <FractionDisplay n={wn} d={wd} size="small" color={color} /> },
    ];
  }

  if (skill === "F4") {
    const winner = item.left.n > item.right.n ? item.left : item.right;
    const loser = item.left.n > item.right.n ? item.right : item.left;
    return [
      { t: "text", v: `Same-size pieces — ${winner.n} is more than ${loser.n} → ` },
      { t: "token", state: tokenState, children: <FractionDisplay n={winner.n} d={winner.d} size="small" color={color} /> },
    ];
  }

  if (skill === "E1" || skill === "E2") {
    // E2's line differs by which side is blank; E1 always solves the target.
    if (skill === "E2") {
      if (item.blankIs === "numerator") {
        return [
          { t: "text", v: `${item.base.d} parts became ${item.target.d}, so ${item.base.n} shaded becomes ` },
          { t: "token", state: tokenState, value: item.target.n },
        ];
      }
      return [
        { t: "text", v: `${item.base.n} shaded became ${item.target.n}, so ${item.base.d} parts become ` },
        { t: "token", state: tokenState, value: item.target.d },
      ];
    }
    return [
      { t: "text", v: `Cut every part into ${item.mult} → ` },
      { t: "token", state: tokenState, children: <FractionDisplay n={item.target.n} d={item.target.d} size="small" color={color} /> },
    ];
  }

  if (skill === "E3") {
    const joinBy = item.d / item.sd;
    return [
      { t: "text", v: `Join the parts in ${joinBy}s → ` },
      { t: "token", state: tokenState, children: <FractionDisplay n={item.sn} d={item.sd} size="small" color={color} /> },
    ];
  }

  if (skill === "E4") {
    // C1 leak fix (docs/confidence-pass-spec.md): "the dot is on {n}" used to
    // state the answer's numerator in plain text right beside a token that
    // then re-displayed the exact same n/d — the E-group's target fraction,
    // verbatim, requiring zero derivation (unlike E1, where the stated
    // number — the multiplier — differs from the target). d (the ruler's
    // step count) is a given; n is dropped from the text.
    return [
      { t: "text", v: `${item.d} steps make 1 whole — count to the dot → ` },
      { t: "token", state: tokenState, children: <FractionDisplay n={item.n} d={item.d} size="small" color={color} /> },
    ];
  }

  if (skill === "C1") {
    const lcd = lcm(item.left.d, item.right.d);
    const lv = item.left.n * (lcd / item.left.d);
    const rv = item.right.n * (lcd / item.right.d);
    const word = ORDINAL_PLURAL[lcd] || `${lcd}ths`;
    if (item.correctAnswer === "equal") {
      return [
        { t: "text", v: `Both in ${word}: ${lv} vs ${rv} → ` },
        { t: "token", state: tokenState, children: <span>the same</span> },
      ];
    }
    const winner = lv > rv ? item.left : item.right;
    return [
      { t: "text", v: `Both in ${word}: ${lv} vs ${rv} → ` },
      { t: "token", state: tokenState, children: <FractionDisplay n={winner.n} d={winner.d} size="small" color={color} /> },
    ];
  }

  if (skill === "C2") {
    const allUnit = item.fracs.every(f => f.n === 1);
    const smallest = item.fracs[item.order[0]]; // every shipped triple is "asc"
    if (allUnit) {
      return [
        { t: "text", v: "More parts, smaller pieces → smallest is " },
        { t: "token", state: tokenState, children: <FractionDisplay n={smallest.n} d={smallest.d} size="small" color={color} /> },
      ];
    }
    const lcd = item.fracs.reduce((acc, f) => lcm(acc, f.d), 1);
    const word = ORDINAL_PLURAL[lcd] || `${lcd}ths`;
    const converted = item.fracs.map(f => f.n * (lcd / f.d));
    return [
      { t: "text", v: `All in ${word}: ${converted.join(", ")} → smallest is ` },
      { t: "token", state: tokenState, children: <FractionDisplay n={smallest.n} d={smallest.d} size="small" color={color} /> },
    ];
  }

  if (skill === "A1" || skill === "A3") {
    const [rn, rd] = String(item.correctAnswer).split("/").map(Number);
    const override = firstSubmitDen !== null && firstSubmitDen !== "" &&
      parseInt(firstSubmitDen, 10) === item.a.d + item.b.d;
    if (skill === "A1") {
      if (override) {
        const word = ORDINAL_PLURAL[item.a.d] || `${item.a.d}ths`;
        return [
          { t: "text", v: `${cap(word)} plus ${word} are still ${word} → ` },
          { t: "token", state: tokenState, children: <FractionDisplay n={rn} d={rd} size="small" color={color} /> },
        ];
      }
      const w1 = denomWord(item.a.d, item.a.n);
      const w2 = denomWord(item.b.d, item.b.n);
      return [
        { t: "text", v: `${item.a.n} ${w1} and ${item.b.n} ${w2} make ` },
        { t: "token", state: tokenState, children: <FractionDisplay n={rn} d={rd} size="small" color={color} /> },
      ];
    }
    // A3
    if (override) {
      const word = ORDINAL_PLURAL[item.lcd] || `${item.lcd}ths`;
      return [
        { t: "text", v: `${cap(word)} plus ${word} are still ${word} → ` },
        { t: "token", state: tokenState, children: <FractionDisplay n={rn} d={rd} size="small" color={color} /> },
      ];
    }
    const aConv = { n: item.a.n * (item.lcd / item.a.d), d: item.lcd };
    const w1 = denomWord(item.a.d, item.a.n);
    const w2 = denomWord(item.lcd, aConv.n);
    return [
      { t: "text", v: `${item.a.n} ${w1} is ${aConv.n} ${w2} → ${aConv.n} and ${item.b.n} make ` },
      { t: "token", state: tokenState, children: <FractionDisplay n={rn} d={rd} size="small" color={color} /> },
    ];
  }

  if (skill === "A2") {
    const [rn, rd] = String(item.correctAnswer).split("/").map(Number);
    if (item.showAsWhole) {
      const word = denomWord(item.a.d, item.a.d);
      return [
        { t: "text", v: `1 whole is ${item.a.d} ${word}; take ${item.b.n} → ` },
        { t: "token", state: tokenState, children: <FractionDisplay n={rn} d={rd} size="small" color={color} /> },
      ];
    }
    const word = denomWord(item.a.d, item.a.n);
    return [
      { t: "text", v: `${item.a.n} ${word} take away ${item.b.n} leaves ` },
      { t: "token", state: tokenState, children: <FractionDisplay n={rn} d={rd} size="small" color={color} /> },
    ];
  }

  if (skill === "A4") {
    // The renamed one is b (the coarse fraction) — A4's a is already at lcd.
    const [rn, rd] = String(item.correctAnswer).split("/").map(Number);
    const bConv = { n: item.b.n * (item.lcd / item.b.d), d: item.lcd };
    const w1 = denomWord(item.b.d, item.b.n);
    const w2 = denomWord(item.lcd, bConv.n);
    return [
      { t: "text", v: `${item.b.n} ${w1} is ${bConv.n} ${w2} → ${item.a.n} take ${bConv.n} leaves ` },
      { t: "token", state: tokenState, children: <FractionDisplay n={rn} d={rd} size="small" color={color} /> },
    ];
  }

  return null;
}

// Picture (spec "Per-skill contract" table). F1/F2/F3/F4/C1/C2/E1-E4 use
// Part 1's opt-in props (counts/groupEvery/finalToken/third/stepLabels/
// compact/resultLabel="none"). `animate` (spec: "mounted with
// animate={mode==='abstract'}") is threaded through every branch that
// accepts it — CircleFraction has no animate prop (Part 1 only added
// `counts` there), so the F1-circle branch omits it.
function pictureFor(item, { finalToken = "numeral", animate = false } = {}) {
  const skill = item.skill;

  if (skill === "F1") {
    return item.displayType === "circle"
      ? <CircleFraction n={item.n} d={item.d} counts />
      : <FractionBar n={item.n} d={item.d} color={COLORS.purple} counts animate={animate} />;
  }

  if (skill === "F2") {
    return <FractionBar n={item.n} d={item.d} color={COLORS.purple} counts finalToken={finalToken} animate={animate} />;
  }

  if (skill === "F3") {
    return (
      <TwoStackedBars
        animate={animate}
        top={{ n: item.left.n, d: item.left.d, label: <FractionDisplay n={item.left.n} d={item.left.d} size="small" /> }}
        bottom={{ n: item.right.n, d: item.right.d, label: <FractionDisplay n={item.right.n} d={item.right.d} size="small" />, color: COLORS.blue }}
      />
    );
  }

  if (skill === "F4") {
    return (
      <TwoStackedBars
        animate={animate}
        top={{ n: item.left.n, d: item.left.d, label: <FractionDisplay n={item.left.n} d={item.left.d} size="small" />, counts: true }}
        bottom={{ n: item.right.n, d: item.right.d, label: <FractionDisplay n={item.right.n} d={item.right.d} size="small" />, color: COLORS.blue, counts: true }}
      />
    );
  }

  if (skill === "C1") {
    const lcd = lcm(item.left.d, item.right.d);
    const leftConv = { n: item.left.n * (lcd / item.left.d), d: lcd };
    const rightConv = { n: item.right.n * (lcd / item.right.d), d: lcd };
    return (
      <TwoStackedBars
        animate={animate}
        top={{
          n: leftConv.n, d: leftConv.d, label: <FractionDisplay n={item.left.n} d={item.left.d} size="small" />,
          counts: true, groupEvery: item.left.d !== lcd ? lcd / item.left.d : null,
        }}
        bottom={{
          n: rightConv.n, d: rightConv.d, label: <FractionDisplay n={item.right.n} d={item.right.d} size="small" />, color: COLORS.blue,
          counts: true, groupEvery: item.right.d !== lcd ? lcd / item.right.d : null,
        }}
      />
    );
  }

  if (skill === "C2") {
    const [f0, f1, f2] = item.fracs;
    const allUnit = item.fracs.every(f => f.n === 1);
    if (allUnit) {
      return (
        <TwoStackedBars
          animate={animate}
          top={{ ...f0, label: <FractionDisplay n={f0.n} d={f0.d} size="small" /> }}
          bottom={{ ...f1, label: <FractionDisplay n={f1.n} d={f1.d} size="small" />, color: COLORS.blue }}
          third={{ ...f2, label: <FractionDisplay n={f2.n} d={f2.d} size="small" />, color: COLORS.orange }}
        />
      );
    }
    const lcd = item.fracs.reduce((acc, f) => lcm(acc, f.d), 1);
    const conv = item.fracs.map(f => ({ n: f.n * (lcd / f.d), d: lcd }));
    return (
      <TwoStackedBars
        animate={animate}
        top={{ n: conv[0].n, d: conv[0].d, label: <FractionDisplay n={f0.n} d={f0.d} size="small" />, counts: true }}
        bottom={{ n: conv[1].n, d: conv[1].d, label: <FractionDisplay n={f1.n} d={f1.d} size="small" />, color: COLORS.blue, counts: true }}
        third={{ n: conv[2].n, d: conv[2].d, label: <FractionDisplay n={f2.n} d={f2.d} size="small" />, color: COLORS.orange, counts: true }}
      />
    );
  }

  if (skill === "E1" || skill === "E2") {
    return (
      <TwoStackedBars
        animate={animate}
        top={{ n: item.base.n, d: item.base.d, label: <FractionDisplay n={item.base.n} d={item.base.d} size="small" /> }}
        bottom={{ n: item.target.n, d: item.target.d, counts: true, groupEvery: item.mult, color: COLORS.blue }}
      />
    );
  }

  if (skill === "E3") {
    return (
      <TwoStackedBars
        animate={animate}
        top={{ n: item.n, d: item.d, label: <FractionDisplay n={item.n} d={item.d} size="small" />, counts: true, groupEvery: item.d / item.sd }}
        bottom={{ n: item.sn, d: item.sd, counts: true, color: COLORS.blue }}
      />
    );
  }

  if (skill === "E4") {
    return <NumberLineScaffold n={item.n} d={item.d} showValue={false} stepLabels opacity={1} animate={animate} />;
  }

  if (skill === "A1" || skill === "A2" || skill === "A3" || skill === "A4") {
    const [rn, rd] = String(item.correctAnswer).split("/").map(Number);
    const groupEvery = skill === "A3" ? item.lcd / item.a.d
      : skill === "A4" ? item.lcd / item.b.d
        : null;
    return (
      <AddBarsScaffold
        a={item.a} b={item.b} result={{ n: rn, d: rd }} isSubtract={item.isSubtract}
        compact counts resultLabel="none" groupEvery={groupEvery} animate={animate}
      />
    );
  }

  return null;
}

// Problem slot (size="normal", never "hero" — Governing rulings). Explicit
// spec examples: F1/F2/F3/F4/C1/C2, "Simplify [n/d]" (E3), "[1/2] = [?/4]"
// (E2). E1/E4 aren't given literal examples — filled in analogously to
// QuestionDisplay's own wording, at "normal" size per the rule.
function buildProblem(item) {
  const skill = item.skill;
  if (skill === "F1") return <span>What fraction is shaded?</span>;
  if (skill === "F2") return <span>Shade <FractionDisplay n={item.n} d={item.d} size="normal" /></span>;
  if (skill === "F3" || skill === "F4" || skill === "C1") return <span>Which is greater?</span>;
  if (skill === "C2") return <span>Order them</span>;
  if (skill === "E1") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <FractionDisplay n={item.base.n} d={item.base.d} size="normal" /> = ?
      </span>
    );
  }
  if (skill === "E2") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <FractionDisplay n={item.base.n} d={item.base.d} size="normal" />
        <span>=</span>
        {item.blankIs === "numerator"
          ? <FractionDisplay n="?" d={item.target.d} size="normal" />
          : <FractionDisplay n={item.target.n} d="?" size="normal" />}
      </span>
    );
  }
  if (skill === "E3") return <span>Simplify <FractionDisplay n={item.n} d={item.d} size="normal" /></span>;
  if (skill === "E4") return <span>What fraction is marked?</span>;
  if (skill === "A1" || skill === "A2" || skill === "A3" || skill === "A4") {
    const opColor = item.isSubtract ? COLORS.orange : COLORS.green;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <FractionDisplay n={item.a.n} d={item.a.d} size="normal" />
        <span style={{ color: opColor }}>{item.isSubtract ? "−" : "+"}</span>
        <FractionDisplay n={item.b.n} d={item.b.d} size="normal" />
      </span>
    );
  }
  return null;
}

// Prompt text — "Now you — use the picture." everywhere except the
// specialised comparison/order wording (spec "Re-ask and second miss").
function buildPromptText(item) {
  const skill = item.skill;
  // One line at 320px (the two-card re-ask is the tallest input; a wrapped
  // prompt pushed the C1 reveal into an internal scroll at 320×568).
  if (skill === "F3" || skill === "F4") return "Tap the longer bar.";
  if (skill === "C1") return item.correctAnswer === "equal" ? "Tap your answer." : "Tap the longer bar.";
  if (skill === "C2") return item.direction === "desc" ? "Tap the greatest." : "Tap the smallest.";
  return "Now you — use the picture.";
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
  // Seed from the child's saved choice so it survives leaving practice and
  // coming back (component state alone resets on remount).
  const [pickedMode, setPickedMode] = useState(() => getPreferredMode(profileId, moduleId) || "pictorial");
  // A parent lock (Parent Zone → Lock CPA Mode) overrides the child's choice.
  // Read during render so a lock set mid-session applies on the next render.
  const lockedMode = getProfile(profileId)?.settings?.lockedMode || null;
  const mode = lockedMode || pickedMode;
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
  // Wrong-answer reveal (docs/wrong-answer-reveal-spec.md, "Phase 2 —
  // Fractions"). Mirrors multiplication-practice.jsx's retry/missCount/
  // revealStage exactly. `retry.value` shape varies by answerType:
  // {n,d} for fractionInput, a string for singleNumber, a shaded count for
  // concrete buildBar, the tapped value (fraction string / "left"|"right"|
  // "equal" / a tile index) for the tap-based types — set at tap time.
  const [retry, setRetry] = useState({ phase: "idle", value: null });
  // Session-scoped miss count (header rotation) — unused directly (the
  // header hashes the itemKey, same as multiply) but tracked for parity/QA.
  const [missCount, setMissCount] = useState(0);
  // "Not sure" (docs/confidence-pass-spec.md C2): true once the picture has
  // been requested for the CURRENT item (via "Show me" or a converted fast
  // wrong guess) — reset on every new item. Gates the guess-conversion to
  // once per item, and gates recordPeekInSession on a later correct submit.
  const [pictureRequested, setPictureRequested] = useState(false);
  // Nudge shown under the problem after a converted "not sure" — cleared on
  // the next submit (of any kind) or the next item.
  const [nudge, setNudge] = useState(null);
  // Forces BuildBarInput / the card's OrderThreeTiles (both keep LOCAL tap
  // state uncontrolled by this component) to remount and clear that local
  // state on a converted "not sure" — bumped alongside the other resets.
  const [retryResetKey, setRetryResetKey] = useState(0);
  // Consecutive unassisted misses (reset by an unassisted correct; the
  // reveal's re-answer never touches it — R1). At 2+ in Abstract mode the
  // "Show me" button pulses: an invitation to look before answering, not a
  // penalty — the picture is never forced (docs/wrong-answer-reveal-spec.md,
  // "Show me pulse").
  const [missRun, setMissRun] = useState(0);
  // 0 = picture only, 1 = derivation line shown (numeral), 2 = blank chip +
  // live re-ask input/taps. Driven by timers keyed off retry.phase === "ask".
  const [revealStage, setRevealStage] = useState(0);
  const inputRef = useRef(null);
  // Fluency timing: when the current item became answerable. Fractions is a
  // conceptual module with no speed gate, but timing is still collected for
  // QA / fast-follow analysis (see handleAnswer's DEV console.debug).
  const factShownAtRef = useRef(0);
  // Comeback slot (spec "Comeback slot"): a queue of second-miss items due
  // back within 3–5 draws, bypassing the weighted draw AND shouldAllowSkill
  // (it was already served once). Session-scoped, not persisted.
  const comebackQueueRef = useRef([]);
  // Pending pickNewItem() timeout from the retry flow (done -> 900ms, missed
  // -> 2500ms) — cleared when the child advances early via Enter/tap.
  const advanceTimeoutRef = useRef(null);
  // Comeback Kid tracking (docs/confidence-pass-spec.md C3): itemKeys logged
  // as a miss THIS session, session-scoped. A later unassisted correct on a
  // key in this set removes it and counts once toward the achievement.
  const missedKeysRef = useRef(new Set());
  const comebacksRef = useRef(0);

  // Shuffled choices (stable per item)
  const shuffledChoices = useShuffledChoices(currentItem);

  // Drop a pending comeback if the active skill/group filter changes — a
  // queued item may no longer belong to the pool it was drawn from.
  useEffect(() => {
    comebackQueueRef.current = [];
  }, [focusSkill, activeGroups]);

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
    // A fresh draw closes out any pending retry-flow auto-advance timer.
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

    // Comeback slot (docs/wrong-answer-reveal-spec.md "Comeback slot"): a
    // second-miss item is due back within 3–5 draws — pre-check before the
    // weighted draw, bypassing it AND shouldAllowSkill (it was already
    // served once). Search FRACTION_POOL directly (not activePools, which
    // is shouldAllowSkill-filtered) for the same reason. "Draws" means calls
    // to pickNewItem, so the countdown decrements once, right here, every time.
    let selected = null;
    if (comebackQueueRef.current.length > 0) {
      const queue = comebackQueueRef.current.map((entry) => ({ ...entry, dueIn: entry.dueIn - 1 }));
      const front = queue[0];
      if (front.dueIn <= 0) {
        const match = FRACTION_POOL.find((i) => i.itemKey === front.itemKey);
        comebackQueueRef.current = queue.slice(1);
        // If the item vanished (its group/skill got toggled off mid-session),
        // just drop it and fall through to an ordinary weighted draw.
        if (match) selected = match;
      } else {
        comebackQueueRef.current = queue;
      }
    }

    if (!selected) {
      // Exclude any item still waiting on its comeback turn from the ordinary
      // weighted draw (see multiplication-practice.jsx's identical guard).
      const pendingComebackKeys = new Set(comebackQueueRef.current.map((entry) => entry.itemKey));
      const candidatePool = pendingComebackKeys.size > 0
        ? activePools.filter((i) => !pendingComebackKeys.has(i.itemKey))
        : activePools;
      const basePool = candidatePool.length > 0 ? candidatePool : activePools;

      const scored = basePool.map(item => {
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
      selected = pool[0]?.item || null;
      for (const entry of pool) {
        r -= entry.weight;
        if (r <= 0) { selected = entry.item; break; }
      }
    }

    setCurrentItem(selected);
    setUserNum(""); setUserDen(""); setUserAnswer("");
    setPickedChoice(null); setFeedback(null);
    setShowScaffold(false); setUserHidScaffold(false);
    setOrderSubmitted(false);
    setRetry({ phase: "idle", value: null });
    setPictureRequested(false);
    setNudge(null);

    // Finish-line on-ramp: at threshold−1 in pictorial (and not parent-locked),
    // start the scaffold hidden behind "Show me" — a non-punitive invitation
    // to retrieve. No-op for F1/E4 (scaffold not rendered for those skills).
    const rec = getMasteryData()[selected?.itemKey];
    if (selected && mode === "pictorial" && !lockedMode && (rec?.correct || 0) === DEFAULT_MASTERY_THRESHOLD - 1) {
      setUserHidScaffold(true);
    }

    setTimeout(() => {
      // preventScroll + scroll home: keeps iOS keyboard-avoidance from shoving
      // the sticky header behind the Dynamic Island on every new item.
      inputRef.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      factShownAtRef.current = Date.now();
    }, 100);
  }, [activePools, getMasteryData, currentItem, mode, lockedMode]);

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
      // Coerce first (CLAUDE.md "Do NOT" — buildBar's correctAnswer is a
      // number elsewhere in this file; a shipped crash before String()).
      const [cn, cd] = String(correct).split("/").map(Number);
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
    const responseMs = factShownAtRef.current ? Date.now() - factShownAtRef.current : undefined;

    // C2 "Not sure" (docs/confidence-pass-spec.md): a wrong answer submitted
    // before GUESS_MS, before the picture was requested, is treated as "not
    // sure" rather than a miss — nothing is logged. Converts at most once per
    // item — once the picture is up (pictureRequested), a wrong answer is a
    // real miss (below). responseMs === undefined never converts.
    if (!isCorrect && !pictureRequested && responseMs !== undefined && responseMs < GUESS_MS) {
      setShowScaffold(true);
      setPictureRequested(true);
      setNudge("notSure");
      // Clear the tap/selection state for every answerType (mirrors
      // pickNewItem's reset, minus the item/feedback/retry fields — this is
      // NOT a new item). BuildBarInput/the card's OrderThreeTiles hold their
      // own local state uncontrolled by this component — remount them.
      setUserNum(""); setUserDen(""); setUserAnswer("");
      setPickedChoice(null); setOrderSubmitted(false);
      setRetryResetKey(k => k + 1);
      return;
    }
    setNudge(null);

    if (profileId) {
      // Scaffolded = a mathematically informative visual VISIBLE at submit time.
      const scaffolded = (mode !== "abstract" && !userHidScaffold) || showScaffold === true;
      const masteryGatesExempt = lockedMode === "concrete" || lockedMode === "pictorial";
      // Fractions is a conceptual module — no speed gate (no responseMs /
      // fluencyLimitMs passed to updateMastery). Timing is still logged in
      // DEV for QA data.
      if (import.meta.env.DEV) console.debug("[JF] responseMs", currentItem.itemKey, responseMs);
      updateMastery(profileId, moduleId, currentItem.itemKey, isCorrect, { scaffolded, masteryGatesExempt });
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

    // Confidence pass C3: Comeback Kid — an item logged as a miss earlier
    // THIS session, now answered correctly unassisted (handleAnswer IS the
    // unassisted path — the reveal's re-answer, finishRetry, never reaches
    // here). Counts once, then leaves the set.
    if (isCorrect && missedKeysRef.current.has(currentItem.itemKey)) {
      missedKeysRef.current.delete(currentItem.itemKey);
      comebacksRef.current += 1;
    } else if (!isCorrect) {
      missedKeysRef.current.add(currentItem.itemKey);
    }

    if (profileId) {
      const profile = getProfile(profileId);
      // C3: the streak is unchanged by a (first) miss — it only resets on a
      // second miss, inside finishRetry's "missed" branch.
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
      setMissRun(0);
      setFeedback("correct");
      setTimeout(() => pickNewItem(), 900);
    } else {
      // C3: streak is NOT reset here — a first miss he then recovers with
      // the picture doesn't cost the streak. It resets to 0 only on a
      // second miss (finishRetry's "missed" branch, below).
      setFeedback("incorrect");
      setShowScaffold(true);
      // Wrong-answer reveal (docs/wrong-answer-reveal-spec.md): open the
      // reveal with a fresh re-ask value. orderSubmitted/pickedChoice are
      // NOT reset here — the card keeps its first-answer state (needed to
      // grey the original wrong pick during the re-ask); the reveal keeps
      // its own picked state via `retry`.
      setRetry({ phase: "ask", value: initialRetryValue(currentItem, mode) });
      setMissCount(n => n + 1);
      setMissRun(n => n + 1);
    }
  }, [currentItem, evaluateAnswer, profileId, moduleId, streak, sessionStats, sessionStartTime, mod, pickNewItem, mode, lockedMode, userHidScaffold, showScaffold, pictureRequested]);

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

  // The reveal owns Enter while open — this card's own input is hidden
  // behind it whenever feedback === "incorrect" (see handleKeyDown below).
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  // Timed reveal choreography (spec "Timing"): picture builds 0–400ms →
  // derivation line at 400ms (stage 1, numeral) → re-ask opens ~900ms
  // (stage 2, blank chip + live input/taps). Keyed on the retry phase
  // entering "ask" so every fresh wrong answer restarts the sequence — but
  // NOT reset on "ask" -> "done"/"missed" (that transition is the green
  // beat / second-miss fill, which should stay on screen during it — see
  // multiplication-practice.jsx's identical comment).
  useEffect(() => {
    if (retry.phase !== "ask") return undefined;
    setRevealStage(0);
    const t1 = setTimeout(() => setRevealStage(1), 400);
    const t2 = setTimeout(() => setRevealStage(2), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [retry.phase, currentItem?.itemKey]);

  // R1 — Record once, at first submit; the re-answer is never logged.
  // (Amended by docs/confidence-pass-spec.md C3 — streak clause only,
  // everything else below is unchanged.)
  // The outcome of an item is recorded exactly once, at the first submission.
  // When that answer is wrong the app calls updateMastery(profileId, moduleId,
  // itemKey, false) (level −1, floor 0), increments sessionStats.total with no
  // increment to sessionStats.correct, and enters the reveal (all in
  // handleAnswer's incorrect branch, above). That is the complete record for
  // the item. Streak (C3): a first miss does NOT reset the streak — it's
  // unchanged by a miss he then recovers with the picture.
  // The re-answer inside the reveal is an assisted attempt (picture,
  // derivation line on screen). It is understanding, not fluency, and is NOT
  // logged. A re-answer — correct or wrong — must NOT: call updateMastery or
  // change correct, attempts, masteredAt, lastSeen or the review interval;
  // change sessionStats; increment streak on a correct re-answer (the next
  // unassisted correct still starts the next run); call checkAfterAnswer or
  // any streak milestone; count toward the ≥10-problem daily-streak
  // threshold. A SECOND miss (this same reveal, wrong again) DOES reset
  // streak to 0 — see the "missed" branch below. Nothing below (finishRetry,
  // handleRetrySubmit, handleRetryTap) touches mastery, stats, or
  // achievements — they only call evaluateAnswer (pure) and pickNewItem.
  const finishRetry = useCallback((isCorrect, displayValue) => {
    if (!currentItem) return;
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (isCorrect) {
      setRetry({ phase: "done", value: displayValue });
      // Parent-facing "helped" count only — not mastery, not the score (R1).
      recordAssistedInSession(profileId, moduleId);
      advanceTimeoutRef.current = setTimeout(() => pickNewItem(), 900);
    } else {
      // Wrong twice: fill the canonical answer, hold the picture, queue the
      // comeback (spec "Comeback slot"). C3: THIS is where the streak resets
      // — a second miss, not the first.
      setStreak(0);
      setRetry({ phase: "missed", value: fillValueFor(currentItem) });
      const offset = 3 + (hashString(currentItem.itemKey) % 3); // 3–5 draws
      comebackQueueRef.current = [...comebackQueueRef.current, { itemKey: currentItem.itemKey, dueIn: offset }];
      advanceTimeoutRef.current = setTimeout(() => pickNewItem(), 2500);
    }
  }, [currentItem, pickNewItem, profileId, moduleId]);

  // Typed re-asks (singleNumber, fractionInput, concrete buildBar's Check
  // button): reads the live `retry.value` the child has been editing.
  const handleRetrySubmit = useCallback(() => {
    if (!currentItem || retry.phase !== "ask") return;
    const { answerType } = currentItem;
    let payload, displayValue;
    if (answerType === "singleNumber") {
      if (retry.value === "") return;
      payload = { type: "singleNumber", value: retry.value };
      displayValue = retry.value;
    } else if (answerType === "fractionInput") {
      if (!retry.value || retry.value.n === "" || retry.value.d === "") return;
      payload = { type: "fractionInput", value: retry.value };
      displayValue = retry.value;
    } else if (answerType === "buildBar" && mode === "concrete") {
      payload = { type: "buildBar", value: retry.value };
      displayValue = retry.value;
    } else {
      return; // tap-based types submit via handleRetryTap, not this
    }
    finishRetry(evaluateAnswer(currentItem, payload), displayValue);
  }, [currentItem, retry, mode, evaluateAnswer, finishRetry]);

  // Tap-based re-asks (choice4, tapTwo/tapTwoOrEqual, orderThree's single
  // tap, non-concrete buildBar's number buttons): the tap itself both picks
  // AND submits (mirrors the card's own handleTapChoice).
  const handleRetryTap = useCallback((rawValue) => {
    if (!currentItem || retry.phase !== "ask") return;
    const { answerType } = currentItem;
    if (answerType === "orderThree") {
      // Single-tap re-ask (spec "Re-ask and second miss"): order[0] is the
      // correct first tap for this item's direction (every shipped triple
      // is "asc" — smallest first; "desc" would be greatest first). A
      // one-tap payload can't conform to evaluateAnswer's 3-length-array
      // orderThree shape without changing evaluateAnswer, so this compares
      // directly instead of routing through it.
      finishRetry(rawValue === currentItem.order[0], rawValue);
      return;
    }
    let evalPayload;
    if (answerType === "choice4") {
      evalPayload = { type: "choice", value: rawValue };
    } else if (answerType === "tapTwo" || answerType === "tapTwoOrEqual") {
      let evalValue = rawValue;
      if (rawValue === "left") evalValue = `${currentItem.left.n}/${currentItem.left.d}`;
      else if (rawValue === "right") evalValue = `${currentItem.right.n}/${currentItem.right.d}`;
      else evalValue = "equal";
      evalPayload = { type: "tapTwo", value: evalValue };
    } else if (answerType === "buildBar") {
      evalPayload = { type: "buildBar", value: String(rawValue) };
    } else {
      return;
    }
    finishRetry(evaluateAnswer(currentItem, evalPayload), rawValue);
  }, [currentItem, retry, evaluateAnswer, finishRetry]);

  // Enter: submits the typed re-answer in "ask", advances immediately in
  // "missed". Tap-based re-asks don't attach this (no keyboard, no Enter).
  const handleRetryKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (retry.phase === "ask") {
      handleRetrySubmit();
    } else if (retry.phase === "missed") {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      pickNewItem();
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
      <div style={{
        background: COLORS.yellow,
        padding: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) clamp(12px,4vw,20px) 10px",
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
            // C4 (docs/confidence-pass-spec.md): the MASTERED pill is framed
            // against the current item's group, not the whole module —
            // "3/25 · FOUNDATIONS" is a reachable target. No currentItem ->
            // today's totals, label "Mastered", as before.
            const currentGroup = currentItem ? mod.groups.find(g => g.id === currentItem.group) : null;
            let pillValue = `${masteredItems}/${totalItems}`;
            let pillLabel = "Mastered";
            if (currentGroup) {
              const groupItems = FRACTION_POOL.filter(i => i.group === currentGroup.id && isContentAccessible(moduleId, i.group));
              const groupTotal = groupItems.length;
              const masteredInGroup = groupTotal > 0
                ? groupItems.filter(i => (masteryData[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length
                : 0;
              pillValue = `${masteredInGroup}/${groupTotal}`;
              pillLabel = currentGroup.label;
            }
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
                    <button key={m.id}
                      disabled={!!lockedMode}
                      onClick={() => { if (lockedMode) return; setPickedMode(m.id); setPreferredMode(profileId, moduleId, m.id); }}
                      style={{
                        flex: 1, padding: "10px 6px", borderRadius: 10, border: BRUTAL_BORDER_SM,
                        backgroundColor: mode === m.id ? COLORS.purple : "white",
                        color: mode === m.id ? "white" : COLORS.black,
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
                    // Keyed by retryResetKey too (docs/confidence-pass-spec.md
                    // C2): BuildBarInput's shaded count is LOCAL state this
                    // component doesn't control — a converted "not sure" must
                    // remount it to clear the shading, without picking a new item.
                    <BuildBarInput key={`${currentItem.itemKey}:${retryResetKey}`} item={currentItem} onSubmit={handleBuildBarSubmit} disabled={false} />
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
                        // Keyed by retryResetKey too (docs/confidence-pass-spec.md
                        // C2): tapOrder is LOCAL state — a converted "not sure"
                        // remounts to clear the taps without a new item.
                        <OrderThreeTiles
                          key={`${currentItem.itemKey}:${retryResetKey}`}
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
                            inputMode="numeric"
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

                  {/* "Not sure" nudge (docs/confidence-pass-spec.md C2) — under
                      the problem/input, above the scaffold. Stays until the
                      next submit or item. */}
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

                  {/* Scaffold — skipped where the question already embeds the visual
                      (F1 bar/circle, E4 number line) and in concrete F2, where the
                      interactive bar is the input and a pre-shaded bar would reveal
                      the answer (it still appears there after a wrong answer). */}
                  {scaffoldRendered && (showScaffold || (!userHidScaffold && scaffoldOpacity > 0)) && (
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

                  {/* Show me button: abstract mode (reveals the scaffold), or
                      pictorial mode whenever the scaffold isn't already at full
                      opacity — tapped-hidden (userHidScaffold) OR simply faded
                      below 1 with mastery (docs/confidence-pass-spec.md C2),
                      not just the fully-hidden case. Tapping sets showScaffold
                      (full opacity) rather than only un-hiding, in both modes. */}
                  {scaffoldRendered && !feedback && (
                    (mode === "abstract" && !showScaffold) ||
                    (mode === "pictorial" && !showScaffold && (userHidScaffold || scaffoldOpacity < 1))
                  ) && (
                    <div style={{ marginTop: 12, textAlign: "center" }}>
                      {/* Pulses after two consecutive misses in Abstract (see missRun). */}
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

                  {/* Feedback — correct only. The incorrect-case "It's …"
                      line and WrongAnswerHelpers (because/hint/bond) are
                      gone (docs/wrong-answer-reveal-spec.md R3): the reveal
                      overlay is the whole story on a miss now. Flat rotation,
                      no streak escalation strings (docs/confidence-pass-spec.md
                      C3): rewards are for sticking with it, not speed/streaks. */}
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
                </div>

                {/* Next button removed (docs/wrong-answer-reveal-spec.md):
                    the incorrect case is now the reveal (no button, it
                    auto-advances); the orderThree "submitted but not
                    feedback===correct" case never legitimately fires — a
                    submitted order is either correct or opens the reveal. */}

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

      {/* Wrong-answer reveal (docs/wrong-answer-reveal-spec.md, "Phase 2 —
          Fractions") — replaces the old appended incorrect block. Mirrors
          multiplication-practice.jsx's placement/shape exactly: full-screen,
          no knowledge of items/mastery lives in the shell, all composed here. */}
      {currentItem && (() => {
        // C1 (docs/confidence-pass-spec.md): the answer's slot is the blank
        // token from the moment the line/picture appears — no stage shows
        // the numeral first. "correct" when done, "numeral" when missed
        // (second miss — the fill), "blank" otherwise. Same rule for both
        // the derivation line's token AND (F2 only) the picture's
        // finalToken (phase 1c fold) — previously this gated on revealStage,
        // showing the numeral before stage 2.
        const tokenState = retry.phase === "done"
          ? "correct"
          : retry.phase === "missed"
            ? "numeral"
            : "blank";
        const isF2 = currentItem.skill === "F2";
        const line = retry.phase === "missed"
          ? (
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(16px, 4.6vw, 18px)", fontWeight: 700, lineHeight: 1.3 }}>
              Still tricky. Here it is — we'll come back to it.
            </span>
          )
          : isF2
            ? null
            : revealStage >= 1
              ? <DerivationLine segments={buildFractionLine(currentItem, tokenState, userDen) || []} />
              : null;

        return (
          <WrongAnswerReveal
            open={feedback === "incorrect"}
            focusDelayMs={1000}
            pictureMax={PICTURE_MAX_BY_TYPE[currentItem.answerType] || undefined}
            fit="width"
            autoFocus={TYPED_ANSWER_TYPES.has(currentItem.answerType)}
            header={HEADER_TAILS[hashString(currentItem.itemKey) % HEADER_TAILS.length]}
            problem={buildProblem(currentItem)}
            picture={pictureFor(currentItem, { finalToken: tokenState, animate: mode === "abstract" })}
            line={line}
            prompt={retry.phase === "ask" && revealStage >= 2 ? buildPromptText(currentItem) : null}
            input={(() => {
              const { answerType } = currentItem;

              if (answerType === "choice4") {
                return (
                  <Choice4Grid
                    choices={shuffledChoices}
                    onPick={(val) => handleRetryTap(val)}
                    picked={retry.phase === "done" ? retry.value : null}
                    correct={currentItem.correctAnswer}
                    reveal={retry.phase === "done" ? null : {
                      wrong: retry.phase === "ask" ? pickedChoice : null,
                      fill: retry.phase === "missed" ? currentItem.correctAnswer : null,
                    }}
                  />
                );
              }

              if (answerType === "tapTwo" || answerType === "tapTwoOrEqual") {
                return (
                  <TapTwoCards
                    left={currentItem.left} right={currentItem.right}
                    onPick={(id) => handleRetryTap(id)}
                    picked={null}
                    correct={tapTwoCorrectId(currentItem)}
                    showEqual={answerType === "tapTwoOrEqual"}
                    reveal={{
                      fill: retry.phase === "ask" ? null : (retry.phase === "done" ? retry.value : tapTwoCorrectId(currentItem)),
                      fillColor: retry.phase === "done" ? COLORS.green : COLORS.yellow,
                    }}
                  />
                );
              }

              if (answerType === "orderThree") {
                return (
                  <OrderThreeTiles
                    key={currentItem.itemKey}
                    fracs={currentItem.fracs}
                    direction={currentItem.direction}
                    onSubmitOrder={(idx) => handleRetryTap(idx)}
                    submitted={retry.phase !== "ask"}
                    correctOrder={currentItem.order}
                    reveal={{
                      fill: retry.phase === "ask" ? null : currentItem.order[0],
                      fillColor: retry.phase === "done" ? COLORS.green : COLORS.yellow,
                      singleTap: true,
                    }}
                  />
                );
              }

              if (answerType === "fractionInput") {
                return (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%" }}>
                    <FractionInputFields
                      numVal={retry.value?.n ?? ""} denVal={retry.value?.d ?? ""}
                      onNumChange={(v) => setRetry(r => ({ ...r, value: { ...r.value, n: v } }))}
                      onDenChange={(v) => setRetry(r => ({ ...r, value: { ...r.value, d: v } }))}
                      onSubmit={handleRetrySubmit}
                      disabled={retry.phase !== "ask" || revealStage < 2}
                      fieldWidth={90} fieldFontSize={28} dense
                      bg={retry.phase === "missed" ? COLORS.yellow : retry.phase === "done" ? COLORS.green : "transparent"}
                    />
                    {retry.phase === "ask" && revealStage >= 2 && (
                      <BrutalButton onClick={handleRetrySubmit} bg={COLORS.yellow} style={{ minHeight: 48, fontSize: 18, flex: 1 }}>Check</BrutalButton>
                    )}
                  </div>
                );
              }

              if (answerType === "singleNumber") {
                // Input and Check share one row (R2: the E2 derivation line
                // wraps to two lines, so a stacked Check landed under the
                // iOS number pad at 375×667).
                return (
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, width: "100%" }}>
                    <input
                      type="number" inputMode="numeric"
                      value={retry.value ?? ""}
                      placeholder="?"
                      disabled={retry.phase !== "ask" || revealStage < 2}
                      onChange={(e) => setRetry(r => ({ ...r, value: e.target.value }))}
                      onKeyDown={handleRetryKeyDown}
                      style={{
                        width: "clamp(110px, 36vw, 160px)", height: "64px", boxSizing: "border-box",
                        fontSize: "clamp(32px, 9vw, 44px)", fontFamily: "'Shrikhand', cursive",
                        fontWeight: 400, textAlign: "center", border: "none",
                        borderBottom: `4px solid ${COLORS.black}`,
                        backgroundColor: retry.phase === "missed" ? COLORS.yellow : retry.phase === "done" ? COLORS.green : "#FFF0F0",
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

              if (answerType === "buildBar" && mode === "concrete") {
                const shadedCount = retry.phase === "ask" ? retry.value : currentItem.correctAnswer;
                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
                    <div style={{
                      border: retry.phase === "missed" ? `3px solid ${COLORS.yellow}` : "none",
                      borderRadius: 8, padding: retry.phase === "missed" ? 4 : 0,
                    }}>
                      <FractionBar
                        n={currentItem.n} d={currentItem.d}
                        interactive={retry.phase === "ask"}
                        shadedCount={shadedCount}
                        onShadedChange={(v) => setRetry(r => ({ ...r, value: v }))}
                        color={COLORS.purple}
                        animate={retry.phase === "missed"}
                      />
                    </div>
                    {retry.phase === "ask" && revealStage >= 2 && (
                      <BrutalButton onClick={handleRetrySubmit} bg={COLORS.yellow} style={{ minHeight: 48, fontSize: 18, width: "100%" }}>Check</BrutalButton>
                    )}
                  </div>
                );
              }

              if (answerType === "buildBar") {
                // Non-concrete (pictorial/abstract): number buttons, reveal-aware.
                return (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
                    {shuffledChoices.map((c) => {
                      const isFill = retry.phase !== "ask" && parseInt(c, 10) === currentItem.correctAnswer;
                      const isWrong = retry.phase === "ask" && pickedChoice === String(c);
                      const disabled = retry.phase !== "ask" || isWrong;
                      let bg = "white", opacity = 1, animation = "none";
                      if (retry.phase === "done") {
                        bg = isFill ? COLORS.green : "white";
                        animation = isFill ? "correctPulse 0.4s ease" : "none";
                      } else if (retry.phase === "missed") {
                        bg = isFill ? COLORS.yellow : "white";
                        opacity = isFill ? 1 : 0.45;
                      } else if (isWrong) {
                        bg = "#EEE"; opacity = 0.45;
                      }
                      return (
                        <button key={c} disabled={disabled}
                          onClick={() => handleRetryTap(c)}
                          style={{
                            width: 64, height: 64, borderRadius: 10, border: BRUTAL_BORDER_SM,
                            backgroundColor: bg, fontFamily: "'Shrikhand', cursive", fontSize: 32, fontWeight: 700,
                            cursor: disabled ? "default" : "pointer", boxShadow: BRUTAL_SHADOW_SM,
                            opacity, animation,
                          }}>
                          {c}
                        </button>
                      );
                    })}
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
          onDismiss={() => setAchievementQueue(prev => prev.slice(1))}
        />
      )}
    </div>
  );
}
