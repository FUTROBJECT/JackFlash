/**
 * PlaceValuePractice – the practice screen for the Place Value module
 * (pass 1: Groups B "Build & Read" and V "Digit Values" only).
 *
 * Sibling of fractions-practice.jsx: same state machine (retry/missCount/
 * revealStage/comebackQueueRef/missedKeysRef/pictureRequested/nudge), same
 * WrongAnswerReveal composition (one tokenState drives every count chip AND
 * the derivation-line token — docs/confidence-pass-spec.md C1), same
 * mastery persistence via dataManager, same header/stats/streak/achievement
 * popup. Place-Value-specific differences (docs/place-value-spec.md):
 *  - Two new-ish answer surfaces: singleNumber (typed) and buildNumber (the
 *    interactive disc-stepper chart, via shared BuildNumberInput) plus
 *    choice4 (plain text/number cards, not fractions).
 *  - No speed gate anywhere (§5): updateMastery is never passed responseMs.
 *  - Per-group default CPA mode (Group B opens Concrete) — the
 *    add-practice.jsx hasExplicitModeRef pattern, since fractions-practice
 *    doesn't implement per-group defaults even though fractions.jsx defines
 *    defaultModeByGroup too.
 *  - B2 (buildNumber) has no separate fade/hide scaffold in any mode — the
 *    interactive chart IS the model, always at full opacity (mirrors F2
 *    concrete's "no separate scaffold" precedent, extended to all 3 modes
 *    since there's no discrete "choice" analogue for a 4-digit build task).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM,
  DEFAULT_MASTERY_THRESHOLD, AVATARS, GUESS_MS,
} from "./constants.js";
// Place Value is a conceptual module (docs/place-value-spec.md §5) — no
// speed gate, no responseMs passed to updateMastery, so FLUENCY_MS_* is not
// imported (same ruling/comment as fractions-practice.jsx).
import placeValueModule, {
  PLACE_VALUE_POOL, shouldAllowSkill, numberToWords, formatNumber, digitsOf,
  PLACE_CODES, PLACE_LABELS, PLACE_VALUES, ORDINAL_FROM_RIGHT,
  isTenThousand, alwaysFourCounts,
} from "./modules/placeValue.jsx";
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
import DerivationToken from "./shared/DerivationToken.jsx";
import { PlaceValueChart, BuildNumberInput, PlaceValueStrips } from "./shared/barComponents.jsx";

// Register the Place Value module
registerModule(placeValueModule);

// ---------------------------------------------------------------------------
// Wrong-answer reveal helpers — duplicated hashString/HEADER_TAILS, same as
// fractions-practice.jsx (neither multiply nor fractions export them).
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

const PICTURE_MAX_BY_TYPE = {
  choice4: "min(220px, 34dvh)",
  tapTwo: "min(220px, 34dvh)",
  orderThree: "min(220px, 34dvh)",
  singleNumber: "min(150px, 24dvh)",
  buildNumber: "min(140px, 22dvh)",
};
// Only singleNumber opens a keyboard — choice4/tapTwo/orderThree are tap,
// buildNumber is steppers + Check (mirrors fractions' TYPED_ANSWER_TYPES).
const TYPED_ANSWER_TYPES = new Set(["singleNumber"]);

// ---------------------------------------------------------------------------
// Small reusable components (local copies matching fractions-practice.jsx style)
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

// Renders a 4-digit numeral with the thousands comma and one digit
// optionally highlighted in a colour (V2/V3: the digit being asked about is
// a GIVEN, safe to show and worth calling out — the place/value is the
// unknown, never the digit itself).
function HighlightedNumeral({ digits, place = null, color = COLORS.blue, fontSize = 40 }) {
  return (
    <span style={{ fontFamily: "'Shrikhand', cursive", fontSize, color: COLORS.black, lineHeight: 1 }}>
      <span style={{ color: place === "k" ? color : COLORS.black }}>{digits.k}</span>
      <span>,</span>
      <span style={{ color: place === "h" ? color : COLORS.black }}>{digits.h}</span>
      <span style={{ color: place === "t" ? color : COLORS.black }}>{digits.t}</span>
      <span style={{ color: place === "o" ? color : COLORS.black }}>{digits.o}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Choice grid — plain text/number 2x2 cards (digits, values, words, place
// names). The fractions-module analogue is Choice4Grid; ours never renders
// fractions, so it's simpler: content is just String(choice).
// `variant`: "word" (B3/V3 — wraps, min-height 64px, Space Grotesk 700,
// clamp(13px,3.8vw,16px), §8.5) | "number" (V1/V2 — Shrikhand, centered).
// `reveal` (opt-in): { wrong, fill } — same contract as fractions' grid.
// ---------------------------------------------------------------------------
function PVChoiceGrid({ choices, onPick, picked, correct, variant = "number", reveal = null }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
      marginTop: 16, width: "100%", maxWidth: 320,
      marginLeft: "auto", marginRight: "auto",
    }}>
      {choices.map((c, i) => {
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
              padding: variant === "word" ? "10px 8px" : "14px 10px",
              borderRadius: 10, border: BRUTAL_BORDER_SM,
              backgroundColor: bg, cursor: disabled ? "default" : "pointer",
              boxShadow: BRUTAL_SHADOW_SM,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation, opacity,
              transition: "background-color 0.2s ease",
              minHeight: 64,
            }}>
            {variant === "word" ? (
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                fontSize: "clamp(13px, 3.8vw, 16px)", color: COLORS.black,
                textAlign: "center", overflowWrap: "anywhere",
              }}>
                {c}
              </span>
            ) : (
              <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 30, color: COLORS.black }}>
                {formatNumber(c)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shuffled choices memo — shuffle once per item VISIT, never in render
// (mirrors fractions-practice.jsx's useShuffledChoices).
// ---------------------------------------------------------------------------
function useShuffledChoices(item) {
  const prev = useRef(null);
  if (!prev.current || prev.current.key !== item?.itemKey) {
    if (item && item.answerType === "choice4") {
      const all = [item.correctAnswer, ...item.distractors];
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

// X3's expansion string ("3,000 + 400 + 50 + 2") is a full sentence, not a
// short number — it needs the wrapping "word" variant too.
function choiceVariant(skill) {
  return (skill === "B3" || skill === "V3" || skill === "X3") ? "word" : "number";
}

// ---------------------------------------------------------------------------
// Digits helper — every non-noChart item carries item.digits ({k,h,t,o})
// already (built once at pool-build time); columns tells us whether the
// thousands slot is meaningful (3-digit B1/B2 bridge items) or not.
// ---------------------------------------------------------------------------
function fullCounts(item) {
  const { k, h, t, o } = item.digits;
  return item.columns === 3 ? [h, t, o] : [k, h, t, o];
}

// ---------------------------------------------------------------------------
// C1/C2/C3 tap surfaces — number-card analogues of fractions-practice.jsx's
// TapTwoCards / OrderThreeTiles (copied structure, numerals instead of
// fractions, no "equal" branch — no C1 pair in the curated pool ties).
// `reveal` (opt-in, same contract as fractions): { fill, fillColor,
// singleTap } for the wrong-answer reveal's re-ask/second-miss.
// ---------------------------------------------------------------------------
function PVCompareCards({ leftValue, rightValue, onPick, picked, correct, reveal = null }) {
  const cards = [{ id: "left", value: leftValue }, { id: "right", value: rightValue }];
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 16, width: "100%", maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
      {cards.map(({ id, value }) => {
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
              flex: 1, padding: reveal ? "14px 8px" : "20px 8px", borderRadius: 12, border: BRUTAL_BORDER,
              backgroundColor: bg, cursor: disabled ? "default" : "pointer",
              boxShadow: BRUTAL_SHADOW, minHeight: reveal ? 68 : 84,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation, opacity, transition: "background-color 0.2s ease",
            }}>
            <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: reveal ? 26 : 32, color: COLORS.black }}>
              {formatNumber(value)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PVOrderTiles({ values, onSubmitOrder, submitted, correctOrder, reveal = null }) {
  const [tapOrder, setTapOrder] = useState([]);

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
    if (newOrder.length === values.length) onSubmitOrder(newOrder);
  };

  const getLabel = (idx) => {
    const pos = tapOrder.indexOf(idx);
    return pos >= 0 ? pos + 1 : null;
  };

  const isCorrect = submitted && JSON.stringify(tapOrder) === JSON.stringify(correctOrder);

  return (
    <div style={{ marginTop: 16, width: "100%", maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
      {!reveal && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 10, opacity: 0.6 }}>
          Tap smallest → greatest
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {values.map((v, idx) => {
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
                flex: 1, padding: "12px 4px", borderRadius: 12, border: BRUTAL_BORDER,
                backgroundColor: bg, cursor: disabled ? "default" : "pointer",
                boxShadow: BRUTAL_SHADOW_SM, minHeight: 72, minWidth: 72,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, transition: "background-color 0.2s ease",
                position: "relative", animation, opacity,
              }}>
              {label !== null && (
                <div style={{
                  position: "absolute", top: 4, right: 6,
                  fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                  color: COLORS.black, opacity: 0.7,
                }}>
                  {label}
                </div>
              )}
              <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 20, color: COLORS.black }}>
                {formatNumber(v)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// A single compact mini-chart for one number, used by C1/C2/C3's pictures —
// always 4 columns via alwaysFourCounts (§3 "columns aligned, same column
// width" — a 3-digit number's thousands column just draws empty). 10,000
// (§2.6, one curated C1 pair + one curated C3 endpoint) is never decomposed
// onto the disc chart — it renders as a plain numeral chip, `countToken`-
// aware so the reveal's tokenState still governs it when it IS the answer.
function pvTenThousandChip(countToken = "numeral") {
  return (
    <div style={{
      minWidth: 58, padding: "8px 10px", borderRadius: 8, border: BRUTAL_BORDER_SM,
      backgroundColor: "white", boxShadow: BRUTAL_SHADOW_SM,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <DerivationToken value="10,000" state={countToken} />
    </div>
  );
}

function pvMiniChart(value, countToken = "numeral") {
  if (isTenThousand(value)) return pvTenThousandChip(countToken);
  const counts = alwaysFourCounts(value);
  return (
    <PlaceValueChart mode="discs" columns={4} counts={counts}
      countTokens={counts.map(() => countToken)} compact emptyMarker />
  );
}

// C1/C2's picture: N mini charts stacked vertically, each numeral labelled
// above it (the numeral is a given — the whole point of C1/C2 is comparing
// numbers already on screen; only the WINNER/ORDER is the unknown, and
// nothing here highlights it — §3 "no winner highlighted pre-answer or
// during the re-ask").
function pvStackedCharts(values) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", alignItems: "center" }}>
      {values.map((v, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: "100%" }}>
          <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 16, color: COLORS.black }}>{formatNumber(v)}</span>
          {pvMiniChart(v)}
        </div>
      ))}
    </div>
  );
}

// C3's step chip between the two mini charts ("+1 ten", "−1 hundred").
function pvStepChip(step) {
  const mag = Math.abs(step);
  const place = mag === 10 ? "ten" : mag === 100 ? "hundred" : mag === 1000 ? "thousand" : null;
  const sign = step >= 0 ? "+" : "−";
  const text = place ? `${sign}1 ${place}` : `${sign}1`;
  return (
    <div style={{
      fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 12, color: COLORS.black,
      backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: 20,
      padding: "4px 8px", whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {text}
    </div>
  );
}

// C3's picture: the term just before the blank (a given) and the blank term
// (its ONE changed column is the token; every other column is unchanged —
// also a given — so it renders "numeral") with the step chip between.
function pvPatternPicture(item, tokenState = "numeral") {
  const beforeVal = item.terms[item.blankIdx - 1];
  const blankVal = item.terms[item.blankIdx];
  const changedPlace = { 1: "o", 10: "t", 100: "h", 1000: "k" }[Math.abs(item.step)];
  const changedIdx = PLACE_CODES.indexOf(changedPlace);

  const beforeChart = pvMiniChart(beforeVal);
  const blankChart = isTenThousand(blankVal)
    ? pvTenThousandChip(tokenState)
    : (() => {
        const counts = alwaysFourCounts(blankVal);
        return (
          <PlaceValueChart mode="discs" columns={4} counts={counts}
            countTokens={counts.map((_, i) => (i === changedIdx ? tokenState : "numeral"))}
            compact emptyMarker />
        );
      })();

  // Stacked, not side by side: two four-column charts across 375px left
  // each column ~35px and clipped the labels to "Thou"/"Hund". Vertically
  // each chart gets the full width (as C1's pair does) with the step chip
  // between them — the "before → step → after" reading is the same.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%" }}>
      <div style={{ width: "100%" }}>{beforeChart}</div>
      {pvStepChip(item.step)}
      <div style={{ width: "100%" }}>{blankChart}</div>
    </div>
  );
}

// B4's phrase segmentation (§3/§6): the thousands word (if any) spans the
// thousands column alone, the hundreds word (if any) spans hundreds alone,
// and the combined tens+ones word spans BOTH trailing columns as one chip
// (all B4 items are 4-digit — columns is always 4). Reused by both the
// pre-answer scaffold and the reveal picture (same picture, per §6).
function buildB4Phrases(item) {
  const { k, h, t, o } = item.digits;
  const restNum = t * 10 + o;
  return [
    { span: 1, text: k > 0 ? `${numberToWords(k)} thousand` : null },
    { span: 1, text: h > 0 ? `${numberToWords(h)} hundred` : null },
    { span: 2, text: restNum > 0 ? numberToWords(restNum) : null },
  ];
}

// V2's per-column value caption ("4 discs × 100 = ▢") — a plain node the
// chart just places under the highlighted column; the product is the one
// thing this caption blanks, via the shared tokenState.
function pvValueCaption(item, tokenState) {
  const digit = item.digits[item.place];
  const placeValue = PLACE_VALUES[item.place];
  return (
    // Wraps inside a ~60–70px column ("9 × 100 =" on one line, the token on
    // the next) instead of clipping at the column edge.
    <span style={{ display: "inline-block", maxWidth: "100%", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: "clamp(9px, 2.7vw, 11px)", lineHeight: 1.3 }}>
      {digit} × {placeValue} =<br /><DerivationToken value={formatNumber(item.correctAnswer)} state={tokenState} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Scaffold renderer — picks the right visual by skill (§3's non-negotiable
// rule: the chart never prints the answer, not even part of it, until it's
// allowed to. B2 has no entry here — it's excluded from scaffoldRendered
// entirely, since its interactive chart IS the input, always.)
// ---------------------------------------------------------------------------
// B1 Concrete tap-to-count (spec §3): each tap on a column counts off its
// next disc (a tick badge + a running "✓ n" under the discs); a tap past the
// last disc clears the column. Keyed by itemKey at the call site, so the
// ticks reset with every new item. Nothing here is logged or scored.
function B1TapCountChart({ item, counts, opacity, animate }) {
  const [ticks, setTicks] = useState(() => counts.map(() => 0));
  const onTapColumn = (idx) => {
    setTicks((prev) => prev.map((t, i) => (i === idx ? (t >= counts[idx] ? 0 : t + 1) : t)));
  };
  return (
    <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
      <PlaceValueChart mode="discs" columns={item.columns} counts={counts}
        countTokens={counts.map(() => "blank")} emptyMarker opacity={opacity} animate={animate}
        ticks={ticks} onTapColumn={onTapColumn} />
    </div>
  );
}

function ScaffoldForItem({ item, showScaffold, scaffoldOpacity, mode, feedback }) {
  if (item.noChart) return null;
  if (mode === "abstract" && !showScaffold) return null;
  const opacity = showScaffold ? 1 : scaffoldOpacity;
  if (opacity <= 0) return null;
  const animate = showScaffold;

  if (item.skill === "B1") {
    // The count chips ARE part of the answer (they're literally its
    // digits) — blank until answered, per §3. In Concrete the child counts
    // the discs off by tapping the column (spec §3 B1): the ticks and the
    // running "✓ n" are his own work; the digit chip stays blank.
    const counts = fullCounts(item);
    if (mode === "concrete") {
      return <B1TapCountChart key={item.itemKey} item={item} counts={counts} opacity={opacity} animate={animate} />;
    }
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <PlaceValueChart mode="discs" columns={item.columns} counts={counts}
          countTokens={counts.map(() => "blank")} emptyMarker opacity={opacity} animate={animate} />
      </div>
    );
  }

  if (item.skill === "B3") {
    // Counts are safe here — the numeral is already given in the question;
    // the answer is the WORD choice, not the digit counts.
    const counts = fullCounts(item);
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <PlaceValueChart mode="discs" columns={4} counts={counts}
          countTokens={counts.map(() => "numeral")} emptyMarker opacity={opacity} animate={animate} />
      </div>
    );
  }

  if (item.skill === "B4") {
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <PlaceValueChart mode="discs" columns={4} phrases={buildB4Phrases(item)}
          opacity={opacity} animate={animate} />
      </div>
    );
  }

  if (item.skill === "V1") {
    const counts = fullCounts(item);
    const targetIdx = PLACE_CODES.indexOf(item.place);
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <PlaceValueChart mode="discs" columns={4} counts={counts}
          countTokens={counts.map((_, i) => (i === targetIdx ? "blank" : "numeral"))}
          highlightPlace={item.place} emptyMarker opacity={opacity} animate={animate} />
      </div>
    );
  }

  if (item.skill === "V2") {
    const counts = fullCounts(item);
    const targetIdx = PLACE_CODES.indexOf(item.place);
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <PlaceValueChart mode="discs" columns={4} counts={counts}
          countTokens={counts.map(() => "numeral")}
          highlightPlace={item.place}
          valueCaption={counts.map((_, i) => (i === targetIdx ? pvValueCaption(item, "blank") : null))}
          emptyMarker opacity={opacity} animate={animate} />
      </div>
    );
  }

  if (item.skill === "V3") {
    // "The columns are NOT pre-highlighted — locating the digit is the task."
    const counts = fullCounts(item);
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <PlaceValueChart mode="discs" columns={4} counts={counts}
          countTokens={counts.map(() => "numeral")} emptyMarker opacity={opacity} animate={animate} />
      </div>
    );
  }

  if (item.skill === "X1") {
    // The chart's counts are ALL givens (the digits are visible on the
    // numeral already stated in the question) — only the STRIP at the
    // blank place hides its computed term (§3/§6: "The tens column has 5
    // discs, each worth 10 → [50]" — the 5 is given, the 50 is the answer).
    const counts = fullCounts(item);
    const terms = PLACE_CODES.map((p) => item.digits[p] * PLACE_VALUES[p]);
    const blankIdx = PLACE_CODES.indexOf(item.place);
    return (
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <PlaceValueChart mode="discs" columns={4} counts={counts}
          countTokens={counts.map(() => "numeral")} emptyMarker opacity={opacity} animate={animate} />
        <PlaceValueStrips values={terms} split interactive blankIndex={blankIdx} blankToken="blank" opacity={opacity} />
      </div>
    );
  }

  if (item.skill === "X2") {
    // Strips given split (the addends ARE the question); the chart's disc
    // counts are the composed total's digits — that IS the answer, so they
    // stay blank until answered (mirrors B2's reveal picture exactly).
    const counts = fullCounts(item);
    return (
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <PlaceValueStrips values={item.addends} split interactive assembledToken="blank" opacity={opacity} />
        <PlaceValueChart mode="discs" columns={4} counts={counts}
          countTokens={counts.map(() => "blank")} emptyMarker compact opacity={opacity} animate={animate} />
      </div>
    );
  }

  if (item.skill === "X3") {
    // Chart only. The strips (8,000 · 700 · 10 · 2) ARE the expanded form —
    // showing them pre-answer spelled out the correct choice card (caught in
    // play-testing). The chart's counts are the numeral's digits, already
    // given; turning each count into its place value is the work.
    const counts = fullCounts(item);
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <PlaceValueChart mode="discs" columns={4} counts={counts}
          countTokens={counts.map(() => "numeral")} emptyMarker opacity={opacity} animate={animate} />
      </div>
    );
  }

  if (item.skill === "C1") {
    // Stacked in the same left/right order as the tap cards below — the
    // numerals are givens (they're on the tappable cards too); no winner
    // highlighted (§3).
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        {pvStackedCharts([item.leftValue, item.rightValue])}
      </div>
    );
  }

  if (item.skill === "C2") {
    // Three compact charts in tile order (matches the on-screen tiles).
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        {pvStackedCharts(item.values)}
      </div>
    );
  }

  if (item.skill === "C3") {
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        {pvPatternPicture(item, "blank")}
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Question Display (the big prompt)
// ---------------------------------------------------------------------------
function QuestionDisplay({ item }) {
  if (item.skill === "B1") {
    return (
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
        What number is this?
      </div>
    );
  }
  if (item.skill === "B2") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginBottom: 8 }}>
          Build
        </div>
        <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 44 }}>{formatNumber(item.value)}</span>
      </div>
    );
  }
  if (item.skill === "B3") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginBottom: 8 }}>
          What is this number in words?
        </div>
        <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 44 }}>{formatNumber(item.value)}</span>
      </div>
    );
  }
  if (item.skill === "B4") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginBottom: 8 }}>
          What number is this?
        </div>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
          fontSize: "clamp(22px, 7vw, 30px)", color: COLORS.black,
        }}>
          {numberToWords(item.value)}
        </span>
      </div>
    );
  }
  if (item.skill === "V1") {
    return (
      <div style={{ textAlign: "center" }}>
        <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 40 }}>{formatNumber(item.value)}</span>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginTop: 8 }}>
          Which digit is in the {PLACE_LABELS[item.place].toLowerCase()} place?
        </div>
      </div>
    );
  }
  if (item.skill === "V2") {
    return (
      <div style={{ textAlign: "center" }}>
        <HighlightedNumeral digits={item.digits} place={item.place} color={COLORS.blue} />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginTop: 8 }}>
          What does the {item.digits[item.place]} stand for?
        </div>
      </div>
    );
  }
  if (item.skill === "V3") {
    return (
      <div style={{ textAlign: "center" }}>
        <HighlightedNumeral digits={item.digits} place={item.place} color={COLORS.blue} />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginTop: 8 }}>
          Which place is the {item.digits[item.place]} in?
        </div>
      </div>
    );
  }

  if (item.skill === "X1") {
    const { k, h, t, o } = item.digits;
    const parts = [["k", k * 1000], ["h", h * 100], ["t", t * 10], ["o", o]];
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginBottom: 8 }}>
          {formatNumber(item.value)} =
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", alignItems: "center" }}>
          {parts.map(([p, term], i) => (
            <span key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 24, color: COLORS.black }}>
                {p === item.place ? "?" : formatNumber(term)}
              </span>
              {i < parts.length - 1 && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 }}>+</span>}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (item.skill === "X2") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", alignItems: "center", marginBottom: 8 }}>
          {item.addends.map((a, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 28, color: COLORS.black }}>{formatNumber(a)}</span>
              {i < item.addends.length - 1 && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 }}>+</span>}
            </span>
          ))}
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
          = ?
        </div>
      </div>
    );
  }

  if (item.skill === "X3") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginBottom: 8 }}>
          Which is the expanded form?
        </div>
        <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: 44 }}>{formatNumber(item.value)}</span>
      </div>
    );
  }

  if (item.skill === "C1") {
    return (
      <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
        {item.direction === "gt" ? "Which is greater?" : "Which is smaller?"}
      </div>
    );
  }

  if (item.skill === "C2") {
    return (
      <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666" }}>
        Order from smallest to greatest
      </div>
    );
  }

  if (item.skill === "C3") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#666", marginBottom: 8 }}>
          What number goes in the blank?
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", alignItems: "baseline" }}>
          {item.terms.map((t, i) => (
            <span key={i} style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ fontFamily: "'Shrikhand', cursive", fontSize: i === item.blankIdx ? 30 : 22, color: COLORS.black }}>
                {i === item.blankIdx ? "?" : formatNumber(t)}
              </span>
              {i < item.terms.length - 1 && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, margin: "0 2px" }}>,</span>}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Wrong-answer reveal — line / picture / problem builders
// (docs/place-value-spec.md §6). tokenState: "correct" when done, "numeral"
// when missed (the second-miss fill), "blank" otherwise — the ONE state
// that drives every count chip, caption AND the line's token.
// ---------------------------------------------------------------------------
function buildProblem(item) {
  // B1's answer IS the numeral (C1: never on screen during the re-ask) — the
  // reveal restates the question, and the picture is the problem.
  if (item.skill === "B1") {
    return <span style={{ fontSize: "0.55em" }}>What number is this?</span>;
  }
  if (item.skill === "B4") {
    return <span style={{ fontSize: "0.55em" }}>{numberToWords(item.value)}</span>;
  }
  if (item.skill === "V2" || item.skill === "V3") {
    return <HighlightedNumeral digits={item.digits} place={item.place} color={COLORS.blue} fontSize={30} />;
  }
  // X2's item.value IS the composed answer — restate the addends question
  // instead (C1: never show the answer in the reveal header).
  if (item.skill === "X2") {
    return <span style={{ fontSize: "0.6em" }}>{item.addends.map((a) => formatNumber(a)).join(" + ")} = ?</span>;
  }
  if (item.skill === "C1") {
    return <span>{item.direction === "gt" ? "Which is greater?" : "Which is smaller?"}</span>;
  }
  if (item.skill === "C2") {
    return <span>Order them</span>;
  }
  if (item.skill === "C3") {
    return (
      <span style={{ fontSize: "0.6em" }}>
        {item.terms.map((t, i) => (i === item.blankIdx ? "?" : formatNumber(t))).join(", ")}
      </span>
    );
  }
  return <span>{formatNumber(item.value)}</span>;
}

// C1's line ("Same thousands (3). Hundreds: 4 against 5 → [3,520]" / the
// unequal-digit-count phrasing) — a pure helper so C1 stays a one-liner in
// buildPVLine below. Never calls digitsOf on 10,000 (§2.6): the one C1 pair
// involving it always differs in digit COUNT (4 vs 5), which is caught by
// the length check before any digitsOf call.
function digitCountOf(n) { return String(n).length; }

function buildCompareLine(a, b, tokenState, correctValue) {
  const lenA = digitCountOf(a), lenB = digitCountOf(b);
  if (lenA !== lenB) {
    const [small, large] = a < b ? [a, b] : [b, a];
    return [
      { t: "text", v: `${formatNumber(small)} has ${digitCountOf(small)} digits, ${formatNumber(large)} has ${digitCountOf(large)} → ` },
      { t: "token", state: tokenState, value: formatNumber(correctValue) },
    ];
  }
  const cols = lenA === 3 ? ["h", "t", "o"] : PLACE_CODES;
  const da = digitsOf(a), db = digitsOf(b);
  let diffIdx = cols.findIndex((p) => da[p] !== db[p]);
  if (diffIdx < 0) diffIdx = cols.length - 1;
  const diffPlace = cols[diffIdx];
  const prevPlace = diffIdx > 0 ? cols[diffIdx - 1] : null;
  const samePrefix = prevPlace ? `Same ${PLACE_LABELS[prevPlace].toLowerCase()} (${da[prevPlace]}). ` : "";
  return [
    { t: "text", v: `${samePrefix}${PLACE_LABELS[diffPlace]}: ${da[diffPlace]} against ${db[diffPlace]} → ` },
    { t: "token", state: tokenState, value: formatNumber(correctValue) },
  ];
}

// C2's line ("Thousands first: 2, 3, 3 → smallest is [2,345]", digits in
// TILE order, matching the picture below it) — same unequal-digit-count vs
// same-length branching as buildCompareLine, extended to three numbers.
function buildOrderLine(item, tokenState) {
  const { values, order } = item;
  const smallestValue = values[order[0]];
  const lens = values.map(digitCountOf);
  if (new Set(lens).size > 1) {
    const desc = values.map((v) => `${formatNumber(v)} has ${digitCountOf(v)}`).join(", ");
    return [
      { t: "text", v: `${desc} digits → smallest is ` },
      { t: "token", state: tokenState, value: formatNumber(smallestValue) },
    ];
  }
  const cols = lens[0] === 3 ? ["h", "t", "o"] : PLACE_CODES;
  const digitsArr = values.map((v) => digitsOf(v));
  let diffPlace = cols.find((p) => new Set(digitsArr.map((d) => d[p])).size > 1);
  if (!diffPlace) diffPlace = cols[cols.length - 1];
  const digitsAtPlace = digitsArr.map((d) => d[diffPlace]).join(", ");
  return [
    { t: "text", v: `${PLACE_LABELS[diffPlace]} first: ${digitsAtPlace} → smallest is ` },
    { t: "token", state: tokenState, value: formatNumber(smallestValue) },
  ];
}

function buildPVLine(item, tokenState) {
  const skill = item.skill;

  if (skill === "B1") {
    const { k, h, t, o } = item.digits;
    const seg = (n, word) => `${n} ${word}${n !== 1 ? "s" : ""}`;
    const clauses = item.columns === 3
      ? [seg(h, "hundred"), seg(t, "ten"), seg(o, "one")]
      : [seg(k, "thousand"), seg(h, "hundred"), seg(t, "ten"), seg(o, "one")];
    return [
      { t: "text", v: `${clauses.join(", ")} → ` },
      { t: "token", state: tokenState, value: formatNumber(item.value) },
    ];
  }

  if (skill === "B2") return null; // folded — the strips' assembled total carries it (§6)

  if (skill === "B3") {
    if (item.noChart) {
      return [
        { t: "text", v: "10 groups of 1,000 → " },
        { t: "token", state: tokenState, children: <span>ten thousand</span> },
      ];
    }
    const { k, h, t, o } = item.digits;
    const restNum = t * 10 + o;
    return [
      { t: "text", v: `${k} thousand${k !== 1 ? "s" : ""}, ${h} hundred${h !== 1 ? "s" : ""}, ${restNum} → ` },
      { t: "token", state: tokenState, children: <span>{item.correctAnswer}</span> },
    ];
  }

  if (skill === "B4") {
    const { k, h, t, o } = item.digits;
    const restNum = t * 10 + o;
    // The picture already maps each phrase to its column; the line's job is
    // the words → counts step (teens are the trap: "thirteen" is 1 ten, 3
    // ones). Kept to one clause per place so it fits two lines at 375px.
    const seg = (n, word) => `${n} ${word}${n !== 1 ? "s" : ""}`;
    const parts = [seg(k, "thousand"), seg(h, "hundred"), seg(t, "ten"), seg(o, "one")];
    return [
      { t: "text", v: `${parts.join(", ")} → ` },
      { t: "token", state: tokenState, value: formatNumber(item.value) },
    ];
  }

  if (skill === "V1") {
    return [
      { t: "text", v: `${PLACE_LABELS[item.place]} is the ${ORDINAL_FROM_RIGHT[item.place]} column from the right — count its discs → ` },
      { t: "token", state: tokenState, value: item.correctAnswer },
    ];
  }

  if (skill === "V2") {
    const digit = item.digits[item.place];
    const placeValue = PLACE_VALUES[item.place];
    return [
      { t: "text", v: `${digit} discs in this column, each worth ${placeValue} → ` },
      { t: "token", state: tokenState, value: formatNumber(item.correctAnswer) },
    ];
  }

  if (skill === "V3") {
    const digit = item.digits[item.place];
    return [
      { t: "text", v: `${digit} discs sit in the ${ORDINAL_FROM_RIGHT[item.place]} column from the right → ` },
      { t: "token", state: tokenState, children: <span>{item.correctAnswer}</span> },
    ];
  }

  if (skill === "X1") {
    const digit = item.digits[item.place];
    const placeValue = PLACE_VALUES[item.place];
    return [
      { t: "text", v: `The ${PLACE_LABELS[item.place].toLowerCase()} column has ${digit} disc${digit !== 1 ? "s" : ""}, each worth ${placeValue} → ` },
      { t: "token", state: tokenState, value: formatNumber(item.correctAnswer) },
    ];
  }

  if (skill === "X2") {
    const { k, h, t, o } = item.digits;
    const seg = (n, word) => (n === 0 ? `no ${word}s` : `${n} ${word}${n !== 1 ? "s" : ""}`);
    const parts = [seg(k, "thousand"), seg(h, "hundred"), seg(t, "ten"), seg(o, "one")];
    return [
      { t: "text", v: `${parts.join(", ")} → ` },
      { t: "token", state: tokenState, value: formatNumber(item.correctAnswer) },
    ];
  }

  if (skill === "X3") {
    return [
      { t: "text", v: "Every place gets its own value: thousands, hundreds, tens, ones → " },
      { t: "token", state: tokenState, children: <span>{item.correctAnswer}</span> },
    ];
  }

  if (skill === "C1") {
    return buildCompareLine(item.a, item.b, tokenState, item.correctAnswer);
  }

  if (skill === "C2") {
    return buildOrderLine(item, tokenState);
  }

  if (skill === "C3") {
    const mag = Math.abs(item.step);
    const place = mag === 1 ? "one" : mag === 10 ? "ten" : mag === 100 ? "hundred" : "thousand";
    const verb = item.step >= 0 ? "adds" : "takes away";
    return [
      { t: "text", v: `Each step ${verb} 1 ${place} disc → ` },
      { t: "token", state: tokenState, value: formatNumber(item.correctAnswer) },
    ];
  }

  return null;
}

// Picture (§6 table). One tokenState drives every count chip and caption.
function pictureFor(item, tokenState, animate) {
  if (item.noChart) return null;
  const skill = item.skill;

  if (skill === "B1") {
    const counts = fullCounts(item);
    return (
      <PlaceValueChart mode="discs" columns={item.columns} counts={counts}
        countTokens={counts.map(() => "numeral")} emptyMarker animate={animate} />
    );
  }

  if (skill === "B2") {
    const { k, h, t, o } = item.digits;
    const values = item.columns === 3 ? [h * 100, t * 10, o] : [k * 1000, h * 100, t * 10, o];
    const emptyCounts = fullCounts(item).map(() => 0);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", alignItems: "center" }}>
        <PlaceValueStrips values={values} split animate={animate} />
        <PlaceValueChart mode="discs" columns={item.columns} counts={emptyCounts}
          countTokens={emptyCounts.map(() => "blank")} emptyMarker compact />
      </div>
    );
  }

  if (skill === "B3") {
    const counts = fullCounts(item);
    return (
      <PlaceValueChart mode="discs" columns={4} counts={counts}
        countTokens={counts.map(() => "numeral")} emptyMarker animate={animate} />
    );
  }

  if (skill === "B4") {
    return <PlaceValueChart mode="discs" columns={4} phrases={buildB4Phrases(item)} animate={animate} />;
  }

  if (skill === "V1") {
    const counts = fullCounts(item);
    const targetIdx = PLACE_CODES.indexOf(item.place);
    return (
      <PlaceValueChart mode="discs" columns={4} counts={counts}
        countTokens={counts.map((_, i) => (i === targetIdx ? tokenState : "numeral"))}
        highlightPlace={item.place} emptyMarker animate={animate} />
    );
  }

  if (skill === "V2") {
    const counts = fullCounts(item);
    const targetIdx = PLACE_CODES.indexOf(item.place);
    return (
      <PlaceValueChart mode="discs" columns={4} counts={counts}
        countTokens={counts.map(() => "numeral")}
        highlightPlace={item.place}
        valueCaption={counts.map((_, i) => (i === targetIdx ? pvValueCaption(item, tokenState) : null))}
        emptyMarker animate={animate} />
    );
  }

  if (skill === "V3") {
    const counts = fullCounts(item);
    return (
      <PlaceValueChart mode="discs" columns={4} counts={counts}
        countTokens={counts.map(() => "numeral")}
        highlightPlace={tokenState === "blank" ? null : item.place}
        emptyMarker animate={animate} />
    );
  }

  if (skill === "X1") {
    const counts = fullCounts(item);
    const terms = PLACE_CODES.map((p) => item.digits[p] * PLACE_VALUES[p]);
    const blankIdx = PLACE_CODES.indexOf(item.place);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", alignItems: "center" }}>
        <PlaceValueChart mode="discs" columns={4} counts={counts}
          countTokens={counts.map(() => "numeral")} emptyMarker compact animate={animate} />
        <PlaceValueStrips values={terms} split blankIndex={blankIdx} blankToken={tokenState} />
      </div>
    );
  }

  if (skill === "X2") {
    // Static, non-interactive: split addends, the assembled (token) card,
    // and the chart — three tiers (§6), the chart's counts stay blank (they
    // ARE the answer's digits, same rule as B2's shipped reveal picture).
    const counts = fullCounts(item);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", alignItems: "center" }}>
        <PlaceValueStrips values={item.addends} split animate={animate} />
        <PlaceValueStrips values={item.addends} split={false} assembledToken={tokenState} />
        <PlaceValueChart mode="discs" columns={4} counts={counts}
          countTokens={counts.map(() => "blank")} emptyMarker compact />
      </div>
    );
  }

  if (skill === "X3") {
    // During the re-ask the picture is the chart (counts given — the child
    // derives each place value from them); the strips are the resolved
    // expansion, i.e. the answer, so they only appear once the token does
    // (correct re-answer or second-miss fill). C1: never on screen while asking.
    if (tokenState === "blank") {
      const counts = fullCounts(item);
      return (
        <PlaceValueChart mode="discs" columns={4} counts={counts}
          countTokens={counts.map(() => "numeral")} emptyMarker animate={animate} />
      );
    }
    const terms = PLACE_CODES.map((p) => item.digits[p] * PLACE_VALUES[p]);
    return <PlaceValueStrips values={terms} split animate={animate} />;
  }

  if (skill === "C1") {
    return pvStackedCharts([item.leftValue, item.rightValue]);
  }

  if (skill === "C2") {
    return pvStackedCharts(item.values);
  }

  if (skill === "C3") {
    return pvPatternPicture(item, tokenState);
  }

  return null;
}

// "Now you — use the picture." everywhere except the specialised
// comparison/order wording (mirrors fractions' buildPromptText exactly).
function buildPromptText(item) {
  if (item.skill === "C1") return "Look at the charts. Tap your answer.";
  if (item.skill === "C2") return "Tap the smallest.";
  return "Now you — use the picture.";
}

// Second-miss fill value per answerType (canonical correctAnswer, never any
// alt form — this module has none anyway).
function fillValueFor(item) {
  if (item.answerType === "buildNumber") return item.correctAnswer;
  if (item.answerType === "tapTwo") return item.correctSide; // "left" | "right"
  if (item.answerType === "orderThree") return item.order[0]; // the correct FIRST tap
  return item.correctAnswer;
}

function initialRetryValue(item) {
  if (!item) return null;
  if (item.answerType === "singleNumber") return "";
  if (item.answerType === "buildNumber") return fullCounts(item).map(() => 0);
  return null;
}

// ---------------------------------------------------------------------------
// Main practice component
// ---------------------------------------------------------------------------
export default function PlaceValuePractice({
  moduleId = "placeValue",
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
  // overriding it (add-practice.jsx's hasExplicitModeRef pattern — fractions
  // doesn't implement this even though it defines defaultModeByGroup too).
  const hasExplicitModeRef = useRef(!!getPreferredMode(profileId, moduleId));
  const lockedMode = getProfile(profileId)?.settings?.lockedMode || null;
  const mode = lockedMode || pickedMode;
  const [activeGroups, setActiveGroups] = useState(null);
  const [focusSkill, setFocusSkill] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [feedback, setFeedback] = useState(null); // null | "correct" | "incorrect"
  const [pickedChoice, setPickedChoice] = useState(null);
  const [userAnswer, setUserAnswer] = useState(""); // singleNumber
  const [userCounts, setUserCounts] = useState([]); // buildNumber (first answer)
  const [orderSubmitted, setOrderSubmitted] = useState(false); // orderThree (first answer)
  // Bumped on a converted "not sure" (docs/confidence-pass-spec.md C2) to
  // remount PVOrderTiles, whose tapOrder is LOCAL state this component
  // doesn't control (mirrors fractions' retryResetKey exactly).
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
  const [missCount, setMissCount] = useState(0);
  const [pictureRequested, setPictureRequested] = useState(false);
  const [nudge, setNudge] = useState(null);
  const [missRun, setMissRun] = useState(0);
  const [revealStage, setRevealStage] = useState(0);
  const inputRef = useRef(null);
  const factShownAtRef = useRef(0);
  const comebackQueueRef = useRef([]);
  const advanceTimeoutRef = useRef(null);
  const missedKeysRef = useRef(new Set());
  const comebacksRef = useRef(0);

  const shuffledChoices = useShuffledChoices(currentItem);

  useEffect(() => { comebackQueueRef.current = []; }, [focusSkill, activeGroups]);
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

  const activePools = useMemo(() => {
    const masteryData = getMasteryData();
    return PLACE_VALUE_POOL.filter((item) => {
      const group = mod?.groups.find((g) => g.id === item.group);
      if (!group) return false;
      if (!isContentAccessible(moduleId, item.group)) return false;
      if (activeGroups && !activeGroups.includes(item.group)) return false;
      if (focusSkill && item.skill !== focusSkill) return false;
      // A deliberately focused skill skips the new-item trickle gate: the
      // child (or parent) chose it, and the reveal still teaches every miss.
      if (!focusSkill && !shouldAllowSkill(item.skill, masteryData)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroups, focusSkill, moduleId]);

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

    let selected = null;
    if (comebackQueueRef.current.length > 0) {
      const queue = comebackQueueRef.current.map((entry) => ({ ...entry, dueIn: entry.dueIn - 1 }));
      const front = queue[0];
      if (front.dueIn <= 0) {
        const match = PLACE_VALUE_POOL.find((i) => i.itemKey === front.itemKey);
        comebackQueueRef.current = queue.slice(1);
        if (match) selected = match;
      } else {
        comebackQueueRef.current = queue;
      }
    }

    if (!selected) {
      const pendingComebackKeys = new Set(comebackQueueRef.current.map((entry) => entry.itemKey));
      const candidatePool = pendingComebackKeys.size > 0
        ? activePools.filter((i) => !pendingComebackKeys.has(i.itemKey))
        : activePools;
      const basePool = candidatePool.length > 0 ? candidatePool : activePools;

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
    setUserAnswer(""); setPickedChoice(null); setOrderSubmitted(false);
    // fullCounts() needs item.digits/columns, which B3's noChart (10,000)
    // item and the C1/C2/C3 compare/order/pattern items don't carry;
    // buildNumber is B2-only anyway, so an empty array elsewhere is a
    // harmless no-op.
    setUserCounts(selected && selected.digits ? fullCounts(selected).map(() => 0) : []);
    setFeedback(null);
    setShowScaffold(false); setUserHidScaffold(false);
    setRetry({ phase: "idle", value: null });
    setPictureRequested(false);
    setNudge(null);

    // Per-group default CPA mode (add-practice.jsx's pattern) — until the
    // child has made an explicit choice, which then sticks across groups.
    if (!hasExplicitModeRef.current && selected && mod?.defaultModeByGroup) {
      const defaultMode = mod.defaultModeByGroup[selected.group] || "pictorial";
      setPickedMode(defaultMode);
    }

    // Finish-line on-ramp (§5 gate 2): at correct===2 in Pictorial with no
    // parent lock, the scaffold starts hidden behind "Show me".
    const rec = getMasteryData()[selected?.itemKey];
    if (selected && mode === "pictorial" && !lockedMode && (rec?.correct || 0) === DEFAULT_MASTERY_THRESHOLD - 1) {
      setUserHidScaffold(true);
    }

    setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      factShownAtRef.current = Date.now();
    }, 100);
  }, [activePools, getMasteryData, currentItem, mode, lockedMode, mod]);

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

  // B2's interactive chart IS the input, always at full opacity, in every
  // mode — no separate fade/hide scaffold (mirrors F2 concrete's "no
  // separate scaffold" precedent). The one noChart item (B3's 10,000, §2.6
  // — never on a disc chart) has no scaffold either.
  const scaffoldRendered = !!currentItem && currentItem.skill !== "B2" && !currentItem.noChart;

  const evaluateAnswer = useCallback((item, answerPayload) => {
    const { type, value } = answerPayload;
    if (type === "singleNumber") {
      const n = parseInt(String(value).replace(/\D/g, ""), 10);
      return !isNaN(n) && n === item.correctAnswer;
    }
    if (type === "choice") {
      // Coerce: V1/V2 correctAnswer is a Number, distractors are Numbers —
      // but a tapped choice can arrive as whatever type the button held.
      // eslint-disable-next-line eqeqeq
      return value == item.correctAnswer;
    }
    if (type === "buildNumber") {
      const correct = item.correctAnswer;
      if (!Array.isArray(value) || value.length !== correct.length) return false;
      return value.every((v, i) => Number(v) === Number(correct[i]));
    }
    if (type === "tapTwo") {
      // eslint-disable-next-line eqeqeq
      return value == item.correctAnswer;
    }
    if (type === "orderThree") {
      return JSON.stringify(value) === JSON.stringify(item.order);
    }
    return false;
  }, []);

  const handleAnswer = useCallback((answerPayload) => {
    if (!currentItem) return;
    const isCorrect = evaluateAnswer(currentItem, answerPayload);
    const responseMs = factShownAtRef.current ? Date.now() - factShownAtRef.current : undefined;

    // "Not sure" conversion (docs/confidence-pass-spec.md C2) — a fast wrong
    // answer before the picture was requested logs nothing.
    if (!isCorrect && !pictureRequested && responseMs !== undefined && responseMs < GUESS_MS) {
      setShowScaffold(true);
      setPictureRequested(true);
      setNudge("notSure");
      setUserAnswer(""); setPickedChoice(null); setOrderSubmitted(false);
      if (currentItem.digits) setUserCounts(fullCounts(currentItem).map(() => 0));
      // PVOrderTiles holds its own tapOrder as LOCAL state this component
      // doesn't control — remount it (mirrors fractions' retryResetKey).
      setRetryResetKey((k) => k + 1);
      return;
    }
    setNudge(null);

    if (profileId) {
      const scaffolded = (mode !== "abstract" && !userHidScaffold) || showScaffold === true;
      const masteryGatesExempt = lockedMode === "concrete" || lockedMode === "pictorial";
      // §5: no speed gate — no responseMs/fluencyLimitMs passed. Logged to
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
      setFeedback("incorrect");
      setShowScaffold(true);
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

  const handleBuildNumberSubmit = useCallback(() => {
    if (!currentItem || feedback) return;
    handleAnswer({ type: "buildNumber", value: userCounts });
  }, [currentItem, feedback, userCounts, handleAnswer]);

  const handleTapChoice = useCallback((value) => {
    if (feedback) return;
    setPickedChoice(value);
    // Map C1's "left"/"right" tap id back to the actual number it currently
    // holds (a fixed per-item presentation flag, not random — §4) before
    // evaluating.
    let evalValue = value;
    if (currentItem?.answerType === "tapTwo") {
      evalValue = value === "left" ? currentItem.leftValue : currentItem.rightValue;
    }
    const payloadType = currentItem?.answerType === "tapTwo" ? "tapTwo" : "choice";
    handleAnswer({ type: payloadType, value: evalValue });
  }, [currentItem, feedback, handleAnswer]);

  const handleOrderSubmit = useCallback((tapOrder) => {
    setOrderSubmitted(true);
    handleAnswer({ type: "orderThree", value: tapOrder });
  }, [handleAnswer]);

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

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
  // finishRetry/handleRetrySubmit/handleRetryTap touches mastery, stats, or
  // achievements — only evaluateAnswer (pure) and pickNewItem.
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
      setRetry({ phase: "missed", value: fillValueFor(currentItem) });
      const offset = 3 + (hashString(currentItem.itemKey) % 3);
      comebackQueueRef.current = [...comebackQueueRef.current, { itemKey: currentItem.itemKey, dueIn: offset }];
      advanceTimeoutRef.current = setTimeout(() => pickNewItem(), 2500);
    }
  }, [currentItem, pickNewItem, profileId, moduleId]);

  const handleRetrySubmit = useCallback(() => {
    if (!currentItem || retry.phase !== "ask") return;
    const { answerType } = currentItem;
    if (answerType === "singleNumber") {
      if (retry.value === "") return;
      finishRetry(evaluateAnswer(currentItem, { type: "singleNumber", value: retry.value }), retry.value);
    } else if (answerType === "buildNumber") {
      finishRetry(evaluateAnswer(currentItem, { type: "buildNumber", value: retry.value }), retry.value);
    }
  }, [currentItem, retry, evaluateAnswer, finishRetry]);

  const handleRetryTap = useCallback((rawValue) => {
    if (!currentItem || retry.phase !== "ask") return;
    const { answerType } = currentItem;
    if (answerType === "orderThree") {
      // Single-tap re-ask (§6 table): order[0] is the correct FIRST tap for
      // this item's (always ascending) direction. A one-tap payload can't
      // conform to evaluateAnswer's 3-length-array orderThree shape without
      // changing evaluateAnswer, so this compares directly instead.
      finishRetry(rawValue === currentItem.order[0], rawValue);
      return;
    }
    if (answerType === "choice4") {
      finishRetry(evaluateAnswer(currentItem, { type: "choice", value: rawValue }), rawValue);
      return;
    }
    if (answerType === "tapTwo") {
      const evalValue = rawValue === "left" ? currentItem.leftValue : currentItem.rightValue;
      finishRetry(evaluateAnswer(currentItem, { type: "tapTwo", value: evalValue }), rawValue);
    }
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
    const groupItems = PLACE_VALUE_POOL.filter((i) => i.group === groupId);
    const mastered = groupItems.filter((i) => getMasteryLevel(i.itemKey) >= DEFAULT_MASTERY_THRESHOLD).length;
    return { total: groupItems.length, mastered };
  }, [getMasteryLevel]);

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
                {AVATARS.find((a) => a.id === profileAvatar)?.emoji || profileAvatar}
              </div>
            )}
          </div>

          {(() => {
            const masteryData = getMasteryData();
            const totalItems = PLACE_VALUE_POOL.filter((i) => isContentAccessible(moduleId, i.group)).length;
            const masteredItems = PLACE_VALUE_POOL.filter((i) =>
              isContentAccessible(moduleId, i.group) &&
              (masteryData[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD
            ).length;
            const masteryPct = totalItems > 0 ? Math.round((masteredItems / totalItems) * 100) : 0;
            // C4 "working group" rule (docs/confidence-pass-spec.md, "As
            // built" 2026-09-14): first accessible group (module order) not
            // yet fully mastered; all done -> the last such group.
            const groupStats = mod.groups
              .filter((g) => isContentAccessible(moduleId, g.id))
              .map((g) => {
                const items = PLACE_VALUE_POOL.filter((i) => i.group === g.id);
                const total = items.length;
                const done = items.filter((i) => (masteryData[i.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD).length;
                return { group: g, total, done };
              })
              .filter((gs) => gs.total > 0);
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

              <button onClick={() => { setFocusSkill(null); setView("practice"); }}
                style={{
                  width: "100%", padding: 14, borderRadius: 12,
                  border: BRUTAL_BORDER, backgroundColor: COLORS.yellow, color: COLORS.black,
                  fontWeight: 700, cursor: "pointer", fontFamily: "'Shrikhand', cursive",
                  fontSize: 16, boxShadow: BRUTAL_SHADOW, marginBottom: 14,
                }}>
                Practice Place Value!
              </button>

              {mod.groups.map((group) => {
                const prog = getGroupProgress(group.id);
                const accessible = isContentAccessible(moduleId, group.id);
                const groupItems = PLACE_VALUE_POOL.filter((i) => i.group === group.id);
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
                          const bySkill = [];
                          groupItems.forEach((item) => {
                            let bucket = bySkill.find((b) => b.skill === item.skill);
                            if (!bucket) { bucket = { skill: item.skill, items: [] }; bySkill.push(bucket); }
                            bucket.items.push(item);
                          });
                          return bySkill.map(({ skill, items }) => (
                            <div key={skill} style={{ marginBottom: 14 }}>
                              {/* Skill focus selector (spec §5): tap a skill to practise
                                  only that skill. The row is the target (≥44px). */}
                              <button
                                onClick={() => { setFocusSkill(skill); setView("practice"); }}
                                aria-label={`Practise only ${placeValueModule.skillLabels?.[skill] || skill}`}
                                style={{
                                  width: "100%", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between",
                                  gap: 8, padding: "6px 10px", marginBottom: 6, borderRadius: 8, cursor: "pointer",
                                  border: BRUTAL_BORDER_SM, boxShadow: focusSkill === skill ? "none" : BRUTAL_SHADOW_SM,
                                  transform: focusSkill === skill ? "translate(3px, 3px)" : "none",
                                  backgroundColor: focusSkill === skill ? COLORS.yellow : "white",
                                  fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: COLORS.black, textAlign: "left",
                                }}>
                                <span>{placeValueModule.skillLabels?.[skill] || skill}</span>
                                <span style={{ fontSize: 10, opacity: 0.7, whiteSpace: "nowrap" }}>
                                  {focusSkill === skill ? "practising ✓" : "practise this ›"}
                                </span>
                              </button>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
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
                      backgroundColor: placeValueModule.groups.find((g) => g.id === currentItem.group)?.color || COLORS.purple,
                      color: COLORS.black, padding: "3px 10px", borderRadius: 20, border: BRUTAL_BORDER_SM,
                    }}>
                      {placeValueModule.skillLabels[currentItem.skill] || currentItem.skill}
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

                  <QuestionDisplay item={currentItem} />

                  {!feedback && currentItem.answerType === "buildNumber" ? (
                    <div style={{ marginTop: 20 }}>
                      <BuildNumberInput
                        columns={currentItem.columns} counts={userCounts}
                        onChange={setUserCounts} onSubmit={handleBuildNumberSubmit} disabled={false}
                      />
                    </div>
                  ) : (
                    <div onKeyDown={handleKeyDown}>
                      {currentItem.answerType === "choice4" ? (
                        <PVChoiceGrid
                          choices={shuffledChoices}
                          onPick={handleTapChoice}
                          picked={pickedChoice}
                          correct={currentItem.correctAnswer}
                          variant={choiceVariant(currentItem.skill)}
                        />
                      ) : currentItem.answerType === "tapTwo" ? (
                        <PVCompareCards
                          leftValue={currentItem.leftValue} rightValue={currentItem.rightValue}
                          onPick={handleTapChoice}
                          picked={pickedChoice}
                          correct={currentItem.correctSide}
                        />
                      ) : currentItem.answerType === "orderThree" ? (
                        // Keyed by retryResetKey too (docs/confidence-pass-spec.md
                        // C2): tapOrder is LOCAL state — a converted "not sure"
                        // remounts to clear the taps without a new item.
                        <PVOrderTiles
                          key={`${currentItem.itemKey}:${retryResetKey}`}
                          values={currentItem.values}
                          onSubmitOrder={handleOrderSubmit}
                          submitted={orderSubmitted}
                          correctOrder={currentItem.order}
                        />
                      ) : currentItem.answerType === "singleNumber" ? (
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
                      ) : null}
                    </div>
                  )}

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

                  {scaffoldRendered && mode === "pictorial" && scaffoldOpacity > 0 && !showScaffold && !userHidScaffold && (
                    <div
                      onClick={() => setUserHidScaffold(true)}
                      style={{ marginTop: 6, fontSize: 11, fontFamily: "'Space Mono', monospace", opacity: 0.45, fontWeight: 700, cursor: "pointer" }}
                    >
                      Tap the picture to hide it
                    </div>
                  )}

                  {scaffoldRendered && !feedback && (
                    (mode === "abstract" && !showScaffold) ||
                    (mode === "pictorial" && !showScaffold && (userHidScaffold || scaffoldOpacity < 1))
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
                  Ask a parent to unlock more Place Value content in the Parent Zone!
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#999" }}>
                  Place Value unlocks in Parent Zone → Modules
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Wrong-answer reveal — one tokenState drives every count chip,
          caption AND the derivation line's token (docs/confidence-pass-
          spec.md C1). */}
      {currentItem && (() => {
        const tokenState = retry.phase === "done" ? "correct" : retry.phase === "missed" ? "numeral" : "blank";
        const line = retry.phase === "missed"
          ? (
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(16px, 4.6vw, 18px)", fontWeight: 700, lineHeight: 1.3 }}>
              Still tricky. Here it is — we'll come back to it.
            </span>
          )
          : currentItem.skill === "B2"
            ? null
            : revealStage >= 1
              ? <DerivationLine segments={buildPVLine(currentItem, tokenState) || []} />
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
            picture={pictureFor(currentItem, tokenState, mode === "abstract")}
            line={line}
            prompt={retry.phase === "ask" && revealStage >= 2 ? buildPromptText(currentItem) : null}
            input={(() => {
              const { answerType } = currentItem;

              if (answerType === "choice4") {
                return (
                  <PVChoiceGrid
                    choices={shuffledChoices}
                    onPick={(val) => handleRetryTap(val)}
                    picked={retry.phase === "done" ? retry.value : null}
                    correct={currentItem.correctAnswer}
                    variant={choiceVariant(currentItem.skill)}
                    reveal={retry.phase === "done" ? null : {
                      wrong: retry.phase === "ask" ? pickedChoice : null,
                      fill: retry.phase === "missed" ? currentItem.correctAnswer : null,
                    }}
                  />
                );
              }

              if (answerType === "tapTwo") {
                return (
                  <PVCompareCards
                    leftValue={currentItem.leftValue} rightValue={currentItem.rightValue}
                    onPick={(id) => handleRetryTap(id)}
                    picked={null}
                    correct={currentItem.correctSide}
                    reveal={{
                      fill: retry.phase === "ask" ? null : (retry.phase === "done" ? retry.value : currentItem.correctSide),
                      fillColor: retry.phase === "done" ? COLORS.green : COLORS.yellow,
                    }}
                  />
                );
              }

              if (answerType === "orderThree") {
                return (
                  <PVOrderTiles
                    key={currentItem.itemKey}
                    values={currentItem.values}
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

              if (answerType === "singleNumber") {
                return (
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, width: "100%" }}>
                    <input
                      type="number" inputMode="numeric"
                      value={retry.value ?? ""}
                      placeholder="?"
                      disabled={retry.phase !== "ask" || revealStage < 2}
                      onChange={(e) => setRetry((r) => ({ ...r, value: e.target.value.replace(/\D/g, "") }))}
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

              if (answerType === "buildNumber") {
                const liveCounts = retry.phase === "ask" ? retry.value : currentItem.correctAnswer;
                return (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%",
                    border: retry.phase === "missed" ? `3px solid ${COLORS.yellow}` : "none",
                    borderRadius: 8, padding: retry.phase === "missed" ? 6 : 0,
                  }}>
                    <PlaceValueChart
                      mode="discs" columns={currentItem.columns} counts={liveCounts}
                      countTokens={liveCounts.map(() => "numeral")}
                      interactive={retry.phase === "ask" && revealStage >= 2}
                      onChange={(next) => setRetry((r) => ({ ...r, value: next }))}
                      emptyMarker animate={retry.phase === "missed"}
                    />
                    {retry.phase === "ask" && revealStage >= 2 && (
                      <BrutalButton onClick={handleRetrySubmit} bg={COLORS.yellow} style={{ minHeight: 48, fontSize: 18, width: "100%" }}>Check</BrutalButton>
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
