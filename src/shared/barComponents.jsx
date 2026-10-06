/**
 * Shared bar-model and number-bond components.
 *
 * Extracted here so multiply, fractions, connections, and add modules can all
 * import without copying code (per NOTES-next-modules.md rule).
 *
 * This is the ONLY copy of FractionDisplay / FractionBar / TwoStackedBars
 * (and gcd / simplify): src/modules/fractions.jsx imports and re-exports
 * them from here. NumberBond and MasteryDots originated in
 * src/multiplication-practice.jsx.
 *
 * Add & Subtract additions (fourth consumer):
 *   OpenNumberLine    — open number line with jump arcs (mental math, M1–M3)
 *   TenFrame          — interactive two-row ten-frame for M-group CPA
 *   PlaceValueChart   — interactive column trade for R-group CPA
 *   PartWholeBar      — missing-cell part-whole bar model for W1
 *   ComparisonBar     — two-bar comparison model for W2
 */

import React, { useState } from "react";
import { COLORS, BRUTAL_BORDER_SM, BRUTAL_BORDER, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, DEFAULT_MASTERY_THRESHOLD } from "../constants.js";
import DerivationToken from "./DerivationToken.jsx";

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------
export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

export function simplify(n, d) {
  const g = gcd(n, d);
  return [n / g, d / g];
}

// ---------------------------------------------------------------------------
// MasteryDots
// ---------------------------------------------------------------------------
export function MasteryDots({ level, max = DEFAULT_MASTERY_THRESHOLD }) {
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

// ---------------------------------------------------------------------------
// NumberBond  (whole splits into two parts; standard multiplication idiom)
// ---------------------------------------------------------------------------
export function NumberBond({ whole, partA, partB, show, opLabel = "×" }) {
  if (!show) return null;
  const w = 160, h = 120;
  const wholeCx = w / 2, wholeCy = 26;
  const leftCx = 32, leftCy = 95;
  const rightCx = w - 32, rightCy = 95;
  const r1 = 24, r2 = 20;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 12, animation: "fadeSlideUp 0.4s ease both" }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <line x1={wholeCx} y1={wholeCy + r1} x2={leftCx} y2={leftCy - r2} stroke={COLORS.black} strokeWidth="3" />
        <line x1={wholeCx} y1={wholeCy + r1} x2={rightCx} y2={rightCy - r2} stroke={COLORS.black} strokeWidth="3" />
        {/* Whole */}
        <circle cx={wholeCx + 3} cy={wholeCy + 3} r={r1} fill={COLORS.black} />
        <circle cx={wholeCx} cy={wholeCy} r={r1} fill={COLORS.yellow} stroke={COLORS.black} strokeWidth="3" />
        <text x={wholeCx} y={wholeCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="16" fontWeight="700" fill={COLORS.black}>{whole}</text>
        {/* Left part */}
        <circle cx={leftCx + 2} cy={leftCy + 2} r={r2} fill={COLORS.black} />
        <circle cx={leftCx} cy={leftCy} r={r2} fill={COLORS.blue} stroke={COLORS.black} strokeWidth="3" />
        <text x={leftCx} y={leftCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="14" fontWeight="700" fill={COLORS.black}>{partA}</text>
        {/* Op label */}
        <text x={w / 2} y={leftCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="16" fontWeight="700" fill={COLORS.black}>{opLabel}</text>
        {/* Right part */}
        <circle cx={rightCx + 2} cy={rightCy + 2} r={r2} fill={COLORS.black} />
        <circle cx={rightCx} cy={rightCy} r={r2} fill={COLORS.green} stroke={COLORS.black} strokeWidth="3" />
        <text x={rightCx} y={rightCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="14" fontWeight="700" fill={COLORS.black}>{partB}</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FractionDisplay – stacked n/d fraction symbol
// ---------------------------------------------------------------------------
export function FractionDisplay({ n, d, size = "normal", color = COLORS.black, highlight = false }) {
  const sizes = {
    small:  { num: 13, line: 1.5, dn: 13, pad: "1px 5px" },
    normal: { num: 18, line: 2,   dn: 18, pad: "2px 8px" },
    large:  { num: 28, line: 2.5, dn: 28, pad: "3px 12px" },
    hero:   { num: 48, line: 3.5, dn: 48, pad: "4px 16px" },
  };
  const s = sizes[size] || sizes.normal;
  return (
    <span style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'Shrikhand', cursive", color,
      background: highlight ? COLORS.yellow : "transparent",
      border: highlight ? BRUTAL_BORDER_SM : "none",
      borderRadius: highlight ? "6px" : 0,
      padding: highlight ? s.pad : 0,
      lineHeight: 1.1, verticalAlign: "middle",
    }}>
      <span style={{ fontSize: s.num, lineHeight: 1 }}>{n}</span>
      <span style={{
        display: "block", height: `${s.line}px`, width: "100%",
        backgroundColor: color, margin: "2px 0", borderRadius: "1px",
      }} />
      <span style={{ fontSize: s.dn, lineHeight: 1 }}>{d}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// FractionBar – horizontal bar split into d parts with n shaded
//
// Phase-2 additions (docs/wrong-answer-reveal-spec.md, "Phase 2 — Fractions",
// Part 1 item 1), all opt-in/default-off so the shipped markup is unchanged
// when they're not passed:
//   counts     — number every segment (1…n ink COLORS.black 700 on shaded,
//                n+1…d #888 400 on unshaded), Space Mono, 12px at 36px
//                segments / 11px at `compact` 24px segments, centred.
//   groupEvery — integer k: the left edge of every k-th segment (i.e. i, a
//                0-based index, is a positive multiple of k) gets a 3px ink
//                divider so the bar's *original* cuts still read once it's
//                been redrawn at a finer denominator (e.g. E1/E3's base cuts
//                inside the lcd-parts bar). Segment borders otherwise stay 2px.
//   finalToken — "numeral"|"blank"|"correct", meaningful only together with
//                `counts`: the LAST shaded segment's number renders through
//                the shared DerivationToken (the reveal's blank-chip re-ask
//                token) instead of a plain numeral.
// `label` may now also be a React node (e.g. a `<FractionDisplay>`), not
// just a string — it already renders as `children` of a div, so no code
// change was needed for that half of item 1; noted here for the record.
// ---------------------------------------------------------------------------
export function FractionBar({
  n, d, color = COLORS.purple, opacity = 1, animate = false,
  interactive = false, shadedCount = null, onShadedChange = null,
  label = null, compact = false,
  counts = false, groupEvery = null, finalToken = null,
}) {
  const segH = interactive ? 60 : (compact ? 24 : 36);
  const controlled = shadedCount !== null;
  const shaded = controlled ? shadedCount : n;
  const countFont = compact ? 11 : 12;

  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: interactive ? "none" : 340 }}>
      {label && (
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
          marginBottom: 4, color: COLORS.black,
        }}>{label}</div>
      )}
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: d }).map((_, i) => {
          const isShaded = i < shaded;
          const isLastShaded = counts && finalToken && isShaded && i === shaded - 1;
          const heavyLeft = groupEvery && i > 0 && i % groupEvery === 0;
          const segStyle = {
            flex: 1, height: segH,
            backgroundColor: isShaded ? color : "#F0F0F0",
            border: `2px solid ${COLORS.black}`,
            borderRadius: 4,
            cursor: interactive ? "pointer" : "default",
            transition: "background-color 0.15s ease",
            animation: animate && isShaded ? `dotPop 0.25s ease ${i * 40}ms both` : "none",
          };
          if (heavyLeft) segStyle.borderLeft = `3px solid ${COLORS.black}`;
          if (counts) {
            segStyle.display = "flex";
            segStyle.alignItems = "center";
            segStyle.justifyContent = "center";
            segStyle.fontFamily = "'Space Mono', monospace";
            segStyle.fontSize = countFont;
            segStyle.fontWeight = isShaded ? 700 : 400;
            segStyle.color = isShaded ? COLORS.black : "#888";
          }
          return (
            <div key={i}
              onClick={interactive && onShadedChange ? () => {
                const newCount = (shaded === i + 1) ? 0 : i + 1;
                onShadedChange(newCount);
              } : undefined}
              style={segStyle}
            >
              {counts ? (isLastShaded ? <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}><DerivationToken value={i + 1} state={finalToken} /></span> : i + 1) : null}
            </div>
          );
        })}
      </div>
      {/* No auto "n/d" caption under the bar: on "name the shaded fraction"
          questions (fractions F1, Connections "Which fraction is it?") it printed
          the answer. Callers that genuinely want the value labelled pass `label`,
          which renders above the bar. */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TwoStackedBars – two (optionally three) bars of identical length
// (equivalence / comparison / C2 ordering).
//
// Phase-2 additions (Part 1 item 3): `top`/`bottom` already accepted `label`
// as a node (FractionBar renders it as `children` — no code change needed);
// counts/groupEvery/finalToken now pass through per-bar via the same spec
// object (`top.counts`, `top.groupEvery`, `top.finalToken`, etc.), so each
// bar can be numbered/grouped independently. Optional `third` (a third bar,
// for C2's three-fraction order picture) renders under the same 8px gap.
// ---------------------------------------------------------------------------
export function TwoStackedBars({ top, bottom, third = null, animate = false, opacity = 1 }) {
  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 340 }}>
      <FractionBar n={top.n} d={top.d} color={top.color || COLORS.purple} label={top.label} animate={animate}
        counts={top.counts} groupEvery={top.groupEvery} finalToken={top.finalToken} />
      <div style={{ height: 8 }} />
      <FractionBar n={bottom.n} d={bottom.d} color={bottom.color || COLORS.blue} label={bottom.label} animate={animate}
        counts={bottom.counts} groupEvery={bottom.groupEvery} finalToken={bottom.finalToken} />
      {third && (
        <>
          <div style={{ height: 8 }} />
          <FractionBar n={third.n} d={third.d} color={third.color || COLORS.green} label={third.label} animate={animate}
            counts={third.counts} groupEvery={third.groupEvery} finalToken={third.finalToken} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FractionInputFields – two stacked number fields (numerator/denominator)
// ---------------------------------------------------------------------------
export function FractionInputFields({ numVal, denVal, onNumChange, onDenChange, onSubmit, disabled }) {
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
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <input type="number" value={numVal} placeholder="?" disabled={disabled}
        onChange={e => onNumChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
        style={fieldStyle}
      />
      <div style={{ width: 96, height: 4, backgroundColor: COLORS.black, borderRadius: 2 }} />
      <input type="number" value={denVal} placeholder="?" disabled={disabled}
        onChange={e => onDenChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
        style={fieldStyle}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FractionQtyBarModel – the capstone's signature scaffold for I-group items.
// Shows a total bar split into `d` equal parts; `n` parts are highlighted.
// In "interactive" mode the child taps to split and select.
// ---------------------------------------------------------------------------
export function FractionQtyBarModel({
  quantity, numerator, denominator,
  opacity = 1, animate = false,
  interactive = false,
  splitDone = false,         // has the bar been split yet (concrete mode)
  selectedParts = null,      // how many parts are selected (null = auto = numerator)
  onSplit = null,            // () => void — tapping "split" button
  onSelect = null,           // (n) => void — tapping a segment selects n parts
}) {
  const segH = interactive ? 56 : 36;
  const partValue = quantity / denominator; // always integer per spec
  const selected = selectedParts !== null ? selectedParts : numerator;

  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 340 }}>
      {/* Total label */}
      <div style={{
        textAlign: "center", fontFamily: "'Space Mono', monospace",
        fontSize: 15, fontWeight: 700, marginBottom: 4, color: COLORS.black,
      }}>
        Total: {quantity}
      </div>

      {/* The bar */}
      {!splitDone && interactive ? (
        // Pre-split state: the whole, undivided — one bar labeled with the total
        // quantity (per spec §4: "one bar labeled with the total quantity").
        // Tapping "Split" partitions it into d equal parts, animating the
        // division so the whole→parts moment is what the child sees happen.
        <div style={{
          height: segH, backgroundColor: COLORS.orange,
          border: `2px solid ${COLORS.black}`, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700,
          color: COLORS.black,
        }}>
          {quantity}
        </div>
      ) : (
        // Split state: d equal segments. When the split was just performed in
        // concrete mode (interactive), each part animates in left-to-right
        // (splitGrow) so the partition reads as the whole dividing into equal
        // parts — the core Singapore "whole → equal parts" moment.
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: denominator }).map((_, i) => {
            const isSelected = i < selected;
            const segColor = isSelected ? COLORS.purple : "#F0F0F0";
            return (
              <div key={i}
                onClick={interactive && onSelect ? () => {
                  const newSel = (selected === i + 1) ? 0 : i + 1;
                  onSelect(newSel);
                } : undefined}
                style={{
                  flex: 1, height: segH,
                  backgroundColor: segColor,
                  border: `2px solid ${COLORS.black}`, borderRadius: 4,
                  cursor: interactive && onSelect ? "pointer" : "default",
                  transition: "background-color 0.15s ease",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                  color: isSelected ? "white" : COLORS.black,
                  transformOrigin: "center",
                  animation:
                    interactive && splitDone
                      ? `splitGrow 0.3s ease ${i * 90}ms both`
                      : animate
                        ? `dotPop 0.25s ease ${i * 60}ms both`
                        : "none",
                }}
              >
                {partValue}
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-labels */}
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 4,
        fontFamily: "'Space Mono', monospace", fontSize: 10, opacity: 0.5, color: COLORS.black,
      }}>
        <span>{denominator} equal parts</span>
        {splitDone && <span>{selected} selected</span>}
      </div>

      {/* Interactive split button */}
      {interactive && !splitDone && onSplit && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button onClick={onSplit} style={{
            padding: "8px 20px", borderRadius: 8, border: BRUTAL_BORDER_SM,
            backgroundColor: COLORS.yellow, fontFamily: "'Space Mono', monospace",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: BRUTAL_SHADOW_SM,
          }}>
            Split into {denominator}!
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TwoStepBarModel – two chained bars for T-group items.
// step1 = { label, value, op, operands }   (e.g. "4 × 6 = 24")
// step2 = { label, value, op, operands }   (e.g. "24 ÷ 3 = 8")
// beat = 1 | 2   (only show step2 once step1 result is used as input)
// ---------------------------------------------------------------------------
export function TwoStepBarModel({ step1, step2, beat = 2, opacity = 1, animate = false }) {
  const barH = 40;
  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 340 }}>
      {/* Step 1 bar */}
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
        color: COLORS.black, opacity: 0.6, marginBottom: 3,
      }}>
        Step 1
      </div>
      <div style={{
        height: barH, backgroundColor: COLORS.orange,
        border: `2px solid ${COLORS.black}`, borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
        animation: animate ? "dotPop 0.3s ease both" : "none",
      }}>
        {step1.label}
      </div>
      <div style={{
        textAlign: "center", fontFamily: "'Space Mono', monospace",
        fontSize: 12, fontWeight: 700, marginTop: 3, color: COLORS.green,
      }}>
        = {step1.value}
      </div>

      {beat >= 2 && (
        <>
          <div style={{ height: 10 }} />
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
            color: COLORS.black, opacity: 0.6, marginBottom: 3,
          }}>
            Step 2
          </div>
          <div style={{
            height: barH, backgroundColor: COLORS.purple,
            border: `2px solid ${COLORS.black}`, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
            color: "white",
            animation: animate ? "dotPop 0.4s ease 0.15s both" : "none",
          }}>
            {step2.label}
          </div>
          <div style={{
            textAlign: "center", fontFamily: "'Space Mono', monospace",
            fontSize: 12, fontWeight: 700, marginTop: 3, color: COLORS.green,
          }}>
            = {step2.value}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BarModel – division bar model (reused from multiply module concept)
// Shows dividend as a total bar split into equal groups of divisor size.
// ---------------------------------------------------------------------------
export function BarModel({ dividend, divisor, opacity = 1, animate = false }) {
  const answer = dividend / divisor;
  const segments = Math.min(answer, 12);
  const isGrouped = answer > 12;
  const segHeight = segments <= 4 ? 36 : segments <= 8 ? 32 : 26;
  const segFont = segments <= 4 ? 14 : segments <= 8 ? 12 : 11;
  const totalFont = segments <= 4 ? 15 : 14;
  const maxW = segments <= 3 ? "60%" : segments <= 6 ? "80%" : "100%";

  return (
    <div style={{
      opacity, transition: "opacity 0.6s ease",
      width: maxW, maxWidth: "100%",
      background: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: 8,
      padding: "12px 12px 10px",
    }}>
      <div style={{
        textAlign: "center", fontFamily: "'Space Mono', monospace",
        fontSize: totalFont, fontWeight: 700, marginBottom: 5, color: COLORS.black,
      }}>
        {dividend}
      </div>
      <div style={{
        height: 7, borderLeft: `2px solid ${COLORS.black}`, borderRight: `2px solid ${COLORS.black}`,
        borderTop: `2px solid ${COLORS.black}`, borderRadius: "4px 4px 0 0",
        marginBottom: 4, marginLeft: 4, marginRight: 4,
      }} />
      <div style={{ display: "flex", gap: segments <= 6 ? 3 : 2 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: segHeight,
            backgroundColor: i % 2 === 0 ? COLORS.pink : COLORS.orange,
            border: `2px solid ${COLORS.black}`, borderRadius: 4,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Space Mono', monospace", fontSize: segFont, fontWeight: 700,
            color: COLORS.black,
            animation: animate ? `dotPop 0.3s ease ${i * 80}ms both` : "none",
            minWidth: 0,
          }}>
            {divisor}
          </div>
        ))}
        {isGrouped && (
          <div style={{
            flex: 1, height: segHeight,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Space Mono', monospace", fontSize: segFont, fontWeight: 700, color: "#999",
          }}>
            …
          </div>
        )}
      </div>
      <div style={{
        textAlign: "center", fontFamily: "'Space Mono', monospace",
        fontSize: 12, fontWeight: 600, marginTop: 6, color: "#999",
      }}>
        {isGrouped ? `${answer} groups of ${divisor}` : `${segments} group${segments !== 1 ? "s" : ""}`}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EqualShareStrip – the "division-as-equal-sharing" hint for I-group items.
// Shows quantity split into d equal boxes, each labeled with the part value.
// ---------------------------------------------------------------------------
export function EqualShareStrip({ quantity, denominator, animate = false }) {
  const partVal = quantity / denominator;
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 8,
    }}>
      {Array.from({ length: denominator }).map((_, i) => (
        <span key={i} style={{
          fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700,
          backgroundColor: COLORS.purple, color: "white",
          padding: "4px 10px", borderRadius: 6,
          border: BRUTAL_BORDER_SM,
          animation: animate ? `fadeSlideUp 0.3s ease ${i * 60}ms both` : "none",
        }}>
          {partVal}
        </span>
      ))}
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: "#888" }}>
        = {quantity} ÷ {denominator}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TwoStepChip – the two-chip Step-1 → Step-2 hint strip for T-group items.
// ---------------------------------------------------------------------------
export function TwoStepChip({ step1Result, animate = false }) {
  return (
    <div style={{
      display: "flex", gap: 8, justifyContent: "center", marginTop: 8, alignItems: "center",
    }}>
      <span style={{
        fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
        backgroundColor: COLORS.green, color: COLORS.black,
        padding: "4px 12px", borderRadius: 6, border: BRUTAL_BORDER_SM,
        animation: animate ? "fadeSlideUp 0.3s ease both" : "none",
      }}>
        Step 1 = {step1Result}
      </span>
      <span style={{ fontSize: 16, color: "#888" }}>→</span>
      <span style={{
        fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
        backgroundColor: COLORS.yellow, color: COLORS.black,
        padding: "4px 12px", borderRadius: 6, border: BRUTAL_BORDER_SM,
        animation: animate ? "fadeSlideUp 0.3s ease 0.1s both" : "none",
      }}>
        Step 2 = ?
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TenFrame — interactive two-row ten-frame for M-group CPA.
// Responsive: uses viewBox + width:100% so it never overflows 320px screens.
// Each cell is a circle; interactive mode shows a "Move" button.
// Props:
//   frameA   — counters in the first addend (fills first frame left-to-right)
//   frameB   — counters remaining in the second addend
//   moved    — how many of B's counters have been moved to complete A's ten
//   onMove   — () => void  (called when child taps to move one counter)
//   interactive — bool
//   opacity  — for pictorial fading
//   animate  — bool
// ---------------------------------------------------------------------------
export function TenFrame({
  frameA = 8, frameB = 5, moved = 0,
  onMove = null, interactive = false,
  opacity = 1, animate = false,
}) {
  const firstFilled = frameA + moved;
  const secondFilled = Math.max(0, frameB - moved);
  const canMove = interactive && onMove && moved < frameB && firstFilled < 10;

  function renderFrame(filledCount, color) {
    const cells = Array.from({ length: 10 }, (_, i) => i < filledCount);
    return (
      <>
        {/* Frame border */}
        <rect x={0} y={0} width={140} height={66}
          fill="white" stroke={COLORS.black} strokeWidth={2.5} rx={5} />
        {/* Row divider */}
        <line x1={0} y1={33} x2={140} y2={33} stroke={COLORS.black} strokeWidth={1.5} />
        {/* Column dividers */}
        {[1,2,3,4].map(c => (
          <line key={c} x1={c * 28} y1={0} x2={c * 28} y2={66}
            stroke={COLORS.black} strokeWidth={1.5} />
        ))}
        {/* Counters */}
        {cells.map((filled, i) => {
          const col = i % 5;
          const row = Math.floor(i / 5);
          const cx = col * 28 + 14;
          const cy = row * 33 + 16;
          return (
            <circle key={i} cx={cx} cy={cy} r={9}
              fill={filled ? color : "#F0F0F0"}
              stroke={COLORS.black} strokeWidth={1.5}
              style={{ animation: animate && filled ? `dotPop 0.25s ease ${i * 30}ms both` : "none" }}
            />
          );
        })}
      </>
    );
  }

  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 320 }}>
      <svg viewBox="0 0 300 100" width="100%" style={{ display: "block" }}>
        {/* First frame */}
        <g transform="translate(0, 8)">
          {renderFrame(Math.min(firstFilled, 10), COLORS.orange)}
        </g>
        {/* Second frame */}
        <g transform="translate(152, 8)">
          {renderFrame(secondFilled, COLORS.blue)}
        </g>
        {/* Labels */}
        <text x={70} y={88} textAnchor="middle"
          fontFamily="'Space Mono', monospace" fontSize={10} fontWeight={700}
          fill={COLORS.black} opacity={0.6}>
          {firstFilled < 10 ? `${frameA} + ${moved} moved` : `10`}
        </text>
        <text x={222} y={88} textAnchor="middle"
          fontFamily="'Space Mono', monospace" fontSize={10} fontWeight={700}
          fill={COLORS.black} opacity={0.6}>
          {`${secondFilled} left`}
        </text>
      </svg>
      {/* Running total */}
      <div style={{
        textAlign: "center", fontFamily: "'Shrikhand', cursive",
        fontSize: 18, color: COLORS.black, marginTop: 2,
      }}>
        {firstFilled >= 10
          ? `10 + ${secondFilled} = ${10 + secondFilled}`
          : `${firstFilled} + ${secondFilled}`}
      </div>
      {/* Move button */}
      {canMove && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <button
            onClick={onMove}
            style={{
              padding: "10px 24px", borderRadius: 8, border: BRUTAL_BORDER_SM,
              backgroundColor: COLORS.yellow, fontFamily: "'Space Mono', monospace",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: BRUTAL_SHADOW_SM, minHeight: 44,
            }}
          >
            Move 1 counter →
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlaceValueChart — place-value disc visualisation.
//
// Default behaviour (mode="digits") is add-practice.jsx's R-group chart,
// BYTE-IDENTICAL to before: ones/tens/hundreds/thousands as colored discs
// each printed with its digit, `digits` array [ones, tens, hundreds?,
// thousands?], `highlightCol` (index) for the carry/borrow trade animation.
//
// docs/place-value-spec.md §8.1 additions, all opt-in/default-off, for the
// Place Value module's number-discs chart (thousand/hundred/ten/one discs —
// the column carries the value, not the disc size):
//   mode          — "digits" (default, unchanged) | "discs"
//   counts        — discs mode: [k,h,t,o] (or [h,t,o] for the 3-digit
//                   bridge), LEFT-TO-RIGHT display order, replaces `digits`.
//   countTokens   — parallel array, one of "numeral"|"blank"|"correct"|null
//                   per column: the count CHIP under that column, through
//                   the shared DerivationToken. null/omitted = no chip at
//                   all (§3's no-pre-reveal rule: the digit chip stays
//                   blank/hidden until the scaffold is allowed to show it).
//   columns       — 3 | 4, defaults to counts.length.
//   highlightPlace— "k"|"h"|"t"|"o": outlines that column (V1/V2/V3).
//   valueCaption  — parallel array of nodes (or null), rendered under that
//                   column's count chip (V1/V2's "4 × 100 = ▢" caption —
//                   callers build the node, chart just places it).
//   phrases       — array of { span, text } covering all columns
//                   left-to-right (spans sum to `columns`); when present,
//                   REPLACES disc rendering for the columns it covers with
//                   a centered phrase chip (or a dashed empty box when
//                   text is null) — B4's "empty chart with the word's
//                   phrase chips" scaffold.
//   compact       — smaller discs/columns (disc r=6, column width 44) —
//                   for C2's three-stacked-chart picture (pass 2; wired
//                   here since it's part of this extension, unused this pass).
//   interactive + onChange(counts) — per-column −/+ steppers (≥44px), for
//                   BuildNumberInput (B2's buildNumber answerType).
//   emptyMarker   — an empty (0-count) column draws a dashed pen-outline
//                   placeholder disc instead of blank space (zero is a
//                   thing, not an absence).
//   animate       — disc pop-in stagger (discs mode only).
//
// docs/add-spec.md §4.1 / §11.2 — Add & Subtract's arithmetic chart. EVERY prop
// below is opt-in and default-off; with none of them present the discs-mode
// markup is byte-for-byte what Place Value rendered before (PlaceValueDiscChart
// only branches to the arithmetic renderer when `arith` is true).
//   columns: 2    — Tens · Ones only (facts).
//   plain         — plain 5-per-row discs at non-compact size (no unit stamp).
//   layers        — [counts, counts2]: two addend piles per column split by a
//                   dashed line. A column whose counts2 entry is null/undefined
//                   is MERGED (one pile of counts[i]). Column total =
//                   counts[i] + (counts2[i] ?? 0).
//   carried       — per-column count of yellow-ringed discs (traded in). They
//                   are the FIRST `carried[i]` discs of the pile / layer 1.
//   taken         — per-column count of crossed-out discs. Crossing runs over
//                   the sequence [ringed…, plain…], so ringed discs cross first.
//   takeLabels    — per-column "Take 8" chip text (null = no chip). With onTake
//                   it is a button (one use: shows "✓ Took 8" once taken > 0);
//                   without, a plain label chip (Pictorial).
//   onTake(idx)   — tap handler for the take chips.
//   tradeable     — per-column booleans: show the "Trade →" button.
//   tradeLabels   — per-column long label ("10 ones → 1 ten") under "Trade →".
//   tradeText     — button text (default "Regroup →").
//   onTrade(idx)  — tap handler for the trade buttons.
//   notice        — cream refusal chip under the chart ("Only 3 ones. …").
//   Count chips (countTokens) show REMAINING = column total − taken[i].
//   Up to 19 discs per column (4 rows of 5).
//
// Responsive: viewBox + width:100% in both modes — never a fixed px width.
// ---------------------------------------------------------------------------
// The unit value stamped on every disc (docs/place-value-spec.md §3: "each
// column holding round discs stamped with their unit value" — think!'s number
// discs). Stamped discs render as SVG so the numeral scales with the disc.
const PV_UNIT_STAMP = { k: "1000", h: "100", t: "10", o: "1" };
const PV_PLACE_LABELS = { k: "Thousands", h: "Hundreds", t: "Tens", o: "Ones" };
const PV_PLACE_COLOR = { k: COLORS.purple, h: COLORS.green, t: COLORS.blue, o: COLORS.pink };

function pvColumnPlaces(columns) {
  // columns === 2 (Tens · Ones) is the Add & Subtract facts chart (docs/add-spec.md §4.5);
  // 3 and 4 are exactly as before.
  if (columns === 2) return ["t", "o"];
  return columns === 3 ? ["h", "t", "o"] : ["k", "h", "t", "o"];
}

export function PlaceValueChart({
  digits,       // array [onesDigit, tensDigit, hundredsDigit?, thousandsDigit?] (mode="digits")
  op = "+",
  opacity = 1,
  animate = false,
  highlightCol = null,  // column index to highlight (shows trade) — mode="digits" only
  mode = "digits",
  ticks, onTapColumn,   // tap-to-count (discs mode only)
  counts = null,
  countTokens = null,
  columns = null,
  highlightPlace = null,
  valueCaption = null,
  phrases = null,
  compact = false,
  interactive = false,
  onChange = null,
  emptyMarker = false,
  // Add & Subtract arithmetic extension (all default off — see docstring above).
  plain = false,
  layers = null,
  carried = null,
  taken = null,
  takeLabels = null,
  onTake = null,
  tradeable = null,
  tradeLabels = null,
  tradeText = "Regroup →",
  onTrade = null,
  notice = null,
}) {
  if (mode === "discs") {
    return (
      <PlaceValueDiscChart
        counts={counts} countTokens={countTokens}
        columns={columns || counts?.length || 4}
        highlightPlace={highlightPlace} valueCaption={valueCaption}
        phrases={phrases} compact={compact}
        interactive={interactive} onChange={onChange}
        emptyMarker={emptyMarker} opacity={opacity} animate={animate}
        ticks={ticks} onTapColumn={onTapColumn}
        plain={plain} layers={layers} carried={carried} taken={taken}
        takeLabels={takeLabels} onTake={onTake}
        tradeable={tradeable} tradeLabels={tradeLabels} tradeText={tradeText} onTrade={onTrade}
        notice={notice}
      />
    );
  }
  const labels = ["Ones", "Tens", "Hundreds", "Thousands"];
  const discColors = [COLORS.pink, COLORS.blue, COLORS.green, COLORS.purple];
  const colCount = digits.length; // 3 or 4
  const colW = Math.min(72, Math.floor(300 / colCount));
  const totalW = colCount * colW;

  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 320 }}>
      <svg viewBox={`0 0 ${totalW} 110`} width="100%" style={{ display: "block" }}>
        {digits.map((d, i) => {
          // Display thousands on left (index colCount-1-i for display)
          const displayIdx = colCount - 1 - i;
          const x = displayIdx * colW + colW / 2;
          const isHL = highlightCol === i;
          return (
            <g key={i}>
              {/* Column header */}
              <text x={x} y={14} textAnchor="middle"
                fontFamily="'Space Mono', monospace" fontSize={9} fontWeight={700}
                fill={COLORS.black}>
                {labels[i] || `10^${i}`}
              </text>
              {/* Column separator */}
              {displayIdx > 0 && (
                <line x1={displayIdx * colW} y1={18} x2={displayIdx * colW} y2={104}
                  stroke={COLORS.black} strokeWidth={1.5} strokeDasharray="4 3" />
              )}
              {/* Disc shadow */}
              <circle cx={x + 2} cy={62} r={24} fill={COLORS.black} opacity={0.12} />
              {/* Disc */}
              <circle cx={x} cy={60} r={24}
                fill={isHL ? COLORS.orange : discColors[i]}
                stroke={COLORS.black} strokeWidth={2.5}
                style={{ animation: (animate || isHL) ? `dotPop 0.3s ease ${i * 60}ms both` : "none" }}
              />
              {/* Digit */}
              <text x={x} y={64} textAnchor="middle" dominantBaseline="central"
                fontFamily="'Shrikhand', cursive" fontSize={22} fill={COLORS.black}>
                {d}
              </text>
              {/* Trade label */}
              {isHL && (
                <text x={x} y={96} textAnchor="middle"
                  fontFamily="'Space Mono', monospace" fontSize={8} fontWeight={700}
                  fill={COLORS.orange} style={{ animation: "fadeSlideUp 0.3s ease both" }}>
                  {"regroup!" /* Singapore term — never "carry"/"borrow" (docs/add-spec.md D1) */}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const PV_STEP_BTN_STYLE = {
  width: 44, height: 44, borderRadius: 8, border: BRUTAL_BORDER_SM,
  backgroundColor: "white", fontFamily: "'Space Mono', monospace",
  fontWeight: 700, fontSize: 20, cursor: "pointer", boxShadow: BRUTAL_SHADOW_SM,
  display: "flex", alignItems: "center", justifyContent: "center",
};

// One column box: header label, a 5-per-row disc frame (or a phrase chip /
// dashed empty-marker in place of discs), an optional count chip (through
// DerivationToken), an optional caption node, and optional ±steppers.
function PlaceValueColumnBox({
  label, count = 0, color = COLORS.black, token, caption,
  highlighted = false, emptyMarker = false, compact = false, animate = false,
  interactive = false, onDec, onInc,
  phraseOnly = false, phraseText = null,
  columnDelay = 0, // ms offset so multi-column auto-fills animate left column first
  stamp = null,    // unit value printed on each disc ("1000" … "1"); null = plain disc
  ticked = 0,      // tap-to-count (B1 Concrete): discs 1..ticked are counted off
  onTapFrame = null, // tapping the disc frame counts off the next disc (whole column = the target)
}) {
  // Stamped discs need room for the numeral: 3 per row, up to 24px across
  // (a 4-column chart at 375px gives ~20px discs, "1000" ≈ 7px on retina).
  // Plain/compact discs keep the 5+4 frame.
  const r = stamp ? 12 : (compact ? 6 : 9);
  const gap = compact ? 2 : 3;
  const rowCap = stamp ? 3 : 5;
  const rows = count > 0 ? Math.ceil(count / rowCap) : 0;
  // Stamped frames reserve three rows (9 discs at 3 per row) so every column
  // in a chart is the same height and the count chips / steppers line up.
  const frameMinH = stamp ? r * 2 * 3 + gap * 2 : (compact ? 40 : 56);

  return (
    <div style={{
      flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center",
      padding: compact ? "4px 2px" : "6px 4px", borderRadius: 8,
      border: highlighted ? `3px solid ${COLORS.orange}` : `2px solid ${COLORS.black}`,
      backgroundColor: highlighted ? "#FFF4E5" : "transparent",
      transition: "border-color 0.2s ease, background-color 0.2s ease",
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontWeight: 700,
        // Scales with the viewport so "Thousands" fits a 4-column chart at 320px.
        fontSize: compact ? 9 : "clamp(9px, 2.8vw, 11px)", color: COLORS.black, marginBottom: 4, textAlign: "center",
        lineHeight: 1.2, whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden",
      }}>
        {label}
      </div>

      {phraseOnly ? (
        <div style={{
          minHeight: frameMinH, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, textAlign: "center",
          fontSize: "clamp(11px, 3.2vw, 14px)", color: COLORS.black, padding: "2px 2px",
        }}>
          {phraseText || (
            <span style={{
              display: "block", width: 16, height: 16,
              borderRadius: "50%", border: `2px dashed ${COLORS.black}`, opacity: 0.4,
            }} />
          )}
        </div>
      ) : (
        <div
          onClick={onTapFrame || undefined}
          role={onTapFrame ? "button" : undefined}
          aria-label={onTapFrame ? `Count the ${label} discs` : undefined}
          style={{
            display: "flex", flexDirection: "column", gap: compact ? 2 : 3,
            alignItems: "center", justifyContent: "center", minHeight: onTapFrame ? Math.max(frameMinH, 44) : frameMinH,
            // Stretch to the column so the 5-cell disc rows have a real width
            // to divide (a centred flex child otherwise shrinks to nothing).
            alignSelf: "stretch", width: "100%",
            cursor: onTapFrame ? "pointer" : "default",
          }}>
          {count === 0 ? (
            emptyMarker ? (
              <span style={{
                display: "inline-block", width: r * 2, height: r * 2, borderRadius: "50%",
                border: `2px dashed ${COLORS.black}`, opacity: 0.4,
              }} />
            ) : <div style={{ height: r * 2 }} />
          ) : (
            // Each row is a 5-cell grid that fills the column, so discs shrink
            // with the column instead of spilling out of it at 320px (four
            // columns of nine discs must fit). r*2 is the cap, not the size.
            Array.from({ length: rows }).map((_, rowIdx) => {
              const startIdx = rowIdx * rowCap;
              const inRow = Math.min(rowCap, count - startIdx);
              return (
                <div key={rowIdx} style={{
                  display: "grid", gridTemplateColumns: `repeat(${rowCap}, 1fr)`, gap,
                  width: "100%", maxWidth: rowCap * r * 2 + (rowCap - 1) * gap, justifyItems: "center",
                }}>
                  {Array.from({ length: inRow }).map((_, i) => (
                    stamp ? (
                      // SVG so the stamp scales with the disc: viewBox units,
                      // no pixel font sizes. Font shrinks with the digit count.
                      <svg key={i} viewBox="0 0 24 24" style={{
                        display: "block", width: "100%", maxWidth: r * 2, aspectRatio: "1 / 1",
                        animation: animate ? `dotPop 0.25s ease ${columnDelay + (startIdx + i) * 40}ms both` : "none",
                      }}>
                        <circle cx="12" cy="12" r="11" fill={color} stroke={COLORS.black} strokeWidth={startIdx + i < ticked ? 3 : 1.6} />
                        <text x="12" y="12" textAnchor="middle" dominantBaseline="central"
                          fontFamily="'Space Mono', monospace" fontWeight="700"
                          fontSize={stamp.length >= 4 ? 8 : stamp.length === 3 ? 10 : 12} fill={COLORS.black}>
                          {stamp}
                        </text>
                        {startIdx + i < ticked && (
                          // Counted-off badge: a small ink tick in the top-right.
                          <g transform="translate(15 1)">
                            <circle cx="4" cy="4" r="4.5" fill={COLORS.yellow} stroke={COLORS.black} strokeWidth="1" />
                            <path d="M1.8 4.2 L3.4 5.8 L6.4 2.4" fill="none" stroke={COLORS.black} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                        )}
                      </svg>
                    ) : (
                      <span key={i} style={{
                        display: "block", width: "100%", maxWidth: r * 2, aspectRatio: "1 / 1", borderRadius: "50%",
                        backgroundColor: color, border: "2px solid " + COLORS.black, boxSizing: "border-box",
                        animation: animate ? `dotPop 0.25s ease ${columnDelay + (startIdx + i) * 40}ms both` : "none",
                      }} />
                    )
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {onTapFrame && (
        // Running count of what HE has counted off — his own work, not the
        // answer (the digit chip below stays blank until he answers).
        <div style={{
          marginTop: 2, minHeight: 16, fontFamily: "'Space Mono', monospace", fontWeight: 700,
          fontSize: 11, color: ticked > 0 ? COLORS.black : "#AAA",
        }}>
          {ticked > 0 ? `✓ ${ticked}` : "tap to count"}
        </div>
      )}
      {token !== undefined && token !== null && (
        <div style={{ marginTop: 4 }}>
          <DerivationToken value={count} state={token} />
        </div>
      )}
      {caption && <div style={{ marginTop: 3, textAlign: "center" }}>{caption}</div>}
      {interactive && (
        // Stacked, not side by side: two 44px buttons don't fit a four-column
        // chart at 375px (a column is ~70px), and at 320px even less. "+" on
        // top — adding a disc is the primary action.
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
          <button onClick={onInc} style={PV_STEP_BTN_STYLE} aria-label={`Add a ${label} disc`}>+</button>
          <button onClick={onDec} style={PV_STEP_BTN_STYLE} aria-label={`Remove a ${label} disc`}>−</button>
        </div>
      )}
    </div>
  );
}

// The discs-mode body of PlaceValueChart (see the extended docstring above
// the digits-mode component). Plain flex/CSS, not SVG — the interactive
// stepper buttons are real <button>s (SVG foreignObject would complicate
// touch targets for no benefit here); font sizes and disc sizes are fixed
// px, matching DotArray's 6-11px dot precedent, verified to fit 320px with
// 4 columns.
function PlaceValueDiscChart({
  counts, countTokens, columns, highlightPlace, valueCaption, phrases,
  compact, interactive, onChange, emptyMarker, opacity, animate,
  ticks = null, onTapColumn = null, // tap-to-count (B1 Concrete)
  plain = false, layers = null, carried = null, taken = null,
  takeLabels = null, onTake = null, tradeable = null, tradeLabels = null,
  tradeText = "Regroup →", onTrade = null, notice = null,
}) {
  const places = pvColumnPlaces(columns);
  const arith = plain || !!layers || !!carried || !!taken || !!takeLabels || !!tradeable || !!notice;
  if (arith) {
    return (
      <PlaceValueArithChart
        places={places} counts={counts} countTokens={countTokens}
        highlightPlace={highlightPlace} compact={compact} emptyMarker={emptyMarker}
        opacity={opacity} animate={animate}
        layers={layers} carried={carried} taken={taken}
        takeLabels={takeLabels} onTake={onTake}
        tradeable={tradeable} tradeLabels={tradeLabels} tradeText={tradeText} onTrade={onTrade}
        notice={notice}
      />
    );
  }
  const safeCounts = counts || places.map(() => 0);

  const handleDelta = (idx, delta) => {
    if (!onChange) return;
    const next = [...safeCounts];
    next[idx] = Math.max(0, Math.min(15, (next[idx] || 0) + delta));
    onChange(next);
  };

  let running = 0;
  const phraseBoxes = (phrases || []).map((p) => {
    const startIdx = running;
    running += p.span || 1;
    return { ...p, startIdx };
  });

  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: compact ? 300 : 360 }}>
      <div style={{ display: "flex", gap: compact ? 4 : 6, width: "100%" }}>
        {phrases
          ? phraseBoxes.map((pb, i) => {
            const label = pb.span > 1
              ? places.slice(pb.startIdx, pb.startIdx + pb.span).map((p) => PV_PLACE_LABELS[p]).join(" & ")
              : PV_PLACE_LABELS[places[pb.startIdx]];
            return (
              <div key={i} style={{ flex: pb.span || 1, minWidth: 0 }}>
                <PlaceValueColumnBox label={label} phraseOnly phraseText={pb.text} compact={compact} />
              </div>
            );
          })
          : places.map((place, idx) => (
            <PlaceValueColumnBox
              key={place}
              label={PV_PLACE_LABELS[place]}
              count={safeCounts[idx] || 0}
              color={PV_PLACE_COLOR[place]}
              token={countTokens ? countTokens[idx] : undefined}
              caption={valueCaption ? valueCaption[idx] : null}
              highlighted={highlightPlace === place}
              emptyMarker={emptyMarker}
              compact={compact}
              stamp={compact ? null : PV_UNIT_STAMP[place]}
              ticked={ticks ? ticks[idx] || 0 : 0}
              onTapFrame={onTapColumn ? () => onTapColumn(idx) : null}
              animate={animate}
              columnDelay={idx * 150}
              interactive={interactive}
              onDec={() => handleDelta(idx, -1)}
              onInc={() => handleDelta(idx, 1)}
            />
          ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PressButton — brutal button whose press sinks into its own shadow
// (translate(3px, 3px) + shadow off), driven by pointer events so it works for
// touch and mouse without a stylesheet. Callers pass the resting style; the
// pressed look is layered on top. Used by the arithmetic chart's trade/take
// buttons and by ColumnMethod's pad.
// ---------------------------------------------------------------------------
export function PressButton({ onClick, disabled = false, style = {}, children, ...rest }) {
  const [pressed, setPressed] = useState(false);
  const down = () => { if (!disabled) setPressed(true); };
  const up = () => setPressed(false);
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
      style={{
        // Fast taps on iOS must not double-tap-zoom or raise the selection callout.
        touchAction: "manipulation", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none",
        ...style,
        transform: pressed ? "translate(3px, 3px)" : (style.transform ?? "none"),
        boxShadow: pressed ? "none" : style.boxShadow,
        transition: "transform 0.08s ease, box-shadow 0.08s ease",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// A pile of plain discs, 5 per row. The first `ringed` discs carry a yellow
// ring (traded in); the first `crossed` discs are crossed out (the caller
// guarantees the ringed-first ordering by always passing ringed discs first).
function PvDiscRows({ count, ringed = 0, crossed = 0, color, r, gap, animate = false, delayBase = 0 }) {
  const rowCap = 5;
  const rows = Math.ceil(count / rowCap);
  // Cross lines ~2px at a 9px disc (the band is a % of the disc's diagonal).
  const cross = `linear-gradient(45deg, transparent 42%, ${COLORS.black} 42%, ${COLORS.black} 58%, transparent 58%), linear-gradient(-45deg, transparent 42%, ${COLORS.black} 42%, ${COLORS.black} 58%, transparent 58%)`;
  return Array.from({ length: rows }).map((_, rowIdx) => {
    const start = rowIdx * rowCap;
    const inRow = Math.min(rowCap, count - start);
    return (
      <div key={rowIdx} style={{
        display: "grid", gridTemplateColumns: `repeat(${rowCap}, 1fr)`, gap,
        width: "100%", maxWidth: rowCap * r * 2 + (rowCap - 1) * gap, justifyItems: "center",
      }}>
        {Array.from({ length: inRow }).map((__, i) => {
          const n = start + i;
          const isRinged = n < ringed;
          const isCrossed = n < crossed;
          return (
            <span key={i} style={{
              display: "block", width: "100%", maxWidth: r * 2, aspectRatio: "1 / 1", borderRadius: "50%",
              backgroundColor: color, border: "2px solid " + COLORS.black, boxSizing: "border-box",
              // Traded-in: a yellow ring with a thin black outline so it reads on white.
              boxShadow: isRinged ? `0 0 0 2px ${COLORS.yellow}, 0 0 0 3px ${COLORS.black}` : "none",
              backgroundImage: isCrossed ? cross : undefined,
              opacity: isCrossed ? 0.4 : 1,
              animation: animate ? `dotPop 0.25s ease ${delayBase + n * 40}ms both` : "none",
            }} />
          );
        })}
      </div>
    );
  });
}

function PvEmptyMarker({ r }) {
  return (
    <span style={{
      display: "inline-block", width: r * 2, height: r * 2, borderRadius: "50%",
      border: `2px dashed ${COLORS.black}`, opacity: 0.4, flexShrink: 0,
    }} />
  );
}

const PV_PLACE_VALUE_TEXT = { k: "1,000", h: "100", t: "10", o: "1" };

// One arithmetic column: heading (name + value), the disc frame (single pile or
// two layers + dashed line), the count chip, an optional "Trade →" button and
// an optional "Take n" chip. Chips/buttons bottom-align across columns because
// the frame flexes to fill the row height.
function PlaceValueArithColumn({
  place, count, count2 = null, layered = false, ringed = 0, crossed = 0, token,
  highlighted = false, emptyMarker = false, compact = false, animate = false, columnDelay = 0,
  trade = null, take = null, dense = false, reserveTrade = false,
}) {
  const color = PV_PLACE_COLOR[place];
  const r = compact ? 6 : 9;
  // Four columns (320px): a tighter gap and side padding give the discs a little size back.
  const gap = compact || dense ? 2 : 3;
  const total = count + (layered ? (count2 || 0) : 0);
  const remaining = Math.max(0, total - crossed);
  const showMarker = (n) => n === 0 && emptyMarker;
  return (
    <div style={{
      flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center",
      padding: compact ? "4px 1px" : (dense ? "6px 1px" : "6px 2px"), borderRadius: 8,
      border: highlighted ? `3px solid ${COLORS.orange}` : `2px solid ${COLORS.black}`,
      backgroundColor: highlighted ? "#FFF4E5" : "transparent",
      transition: "border-color 0.2s ease, background-color 0.2s ease",
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontWeight: 700, textAlign: "center",
        fontSize: compact ? 9 : "clamp(9px, 2.8vw, 11px)", color: COLORS.black,
        lineHeight: 1.2, whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", marginBottom: 4,
      }}>
        {PV_PLACE_LABELS[place]}
        <div style={{ fontSize: 10, color: "#666", fontWeight: 700 }}>= {PV_PLACE_VALUE_TEXT[place]}</div>
      </div>

      <div style={{
        flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "flex-start", gap: layered ? 3 : gap, minHeight: compact ? 30 : 44,
      }}>
        {layered ? (
          <>
            {showMarker(count) ? <PvEmptyMarker r={r} /> : (
              <PvDiscRows count={count} ringed={ringed} color={color} r={r} gap={gap} animate={animate} delayBase={columnDelay} />
            )}
            <div style={{ width: "100%", borderTop: `2px dashed ${COLORS.black}`, opacity: 0.5 }} />
            {showMarker(count2 || 0) ? <PvEmptyMarker r={r} /> : (
              <PvDiscRows count={count2 || 0} color={color} r={r} gap={gap} animate={animate} delayBase={columnDelay} />
            )}
          </>
        ) : (
          showMarker(count) ? <PvEmptyMarker r={r} /> : (
            <PvDiscRows count={count} ringed={ringed} crossed={crossed} color={color} r={r} gap={gap} animate={animate} delayBase={columnDelay} />
          )
        )}
      </div>

      {token !== undefined && token !== null && (
        <div style={{ marginTop: 4 }}>
          <DerivationToken value={remaining} state={token} />
        </div>
      )}

      {/* While the chart is interactive the trade row keeps its height even when
          this column's button is gone, so the grid below doesn't jump under a finger. */}
      <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: reserveTrade ? 56 : 0 }}>
        {trade && (
          <PressButton
            onClick={trade.onClick}
            aria-label={`${trade.text}: ${trade.label}`}
            style={{
              marginTop: 6, minHeight: 44, width: "calc(100% - 4px)", padding: "3px 1px", borderRadius: 8,
              border: BRUTAL_BORDER_SM, backgroundColor: COLORS.yellow, boxShadow: BRUTAL_SHADOW_SM,
              cursor: "pointer", color: COLORS.black, fontFamily: "'Space Mono', monospace", fontWeight: 700,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
            }}
          >
            <span style={{ fontSize: 11, lineHeight: 1.1 }}>{trade.text}</span>
            {trade.label && (
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, lineHeight: 1.1, textAlign: "center" }}>
                {trade.label}
              </span>
            )}
          </PressButton>
        )}
      </div>

      {take && (
        take.onClick ? (
          <PressButton
            onClick={take.onClick}
            disabled={take.done}
            aria-label={take.done ? `${take.label} (done)` : take.label}
            style={{
              marginTop: 6, minHeight: 44, width: "calc(100% - 4px)", padding: "2px 1px", borderRadius: 8,
              border: BRUTAL_BORDER_SM, backgroundColor: take.done ? "#EEE" : COLORS.cream,
              boxShadow: take.done ? "none" : BRUTAL_SHADOW_SM, cursor: take.done ? "default" : "pointer",
              color: COLORS.black, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 11, lineHeight: 1.1,
            }}
          >
            {take.done ? `✓ ${take.doneLabel}` : take.label}
          </PressButton>
        ) : (
          // Static label (Pictorial): dashed and flat, so it doesn't read as a button.
          <div style={{
            marginTop: 6, padding: "4px 2px", borderRadius: 8, width: "calc(100% - 4px)", textAlign: "center",
            border: `2.5px dashed ${COLORS.black}`, backgroundColor: COLORS.cream, color: COLORS.black,
            fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: compact ? 9 : 11, lineHeight: 1.1,
          }}>
            {take.label}
          </div>
        )
      )}
    </div>
  );
}

function PlaceValueArithChart({
  places, counts, countTokens, highlightPlace, compact, emptyMarker, opacity, animate,
  layers, carried, taken, takeLabels, onTake, tradeable, tradeLabels, tradeText, onTrade, notice,
}) {
  const primary = layers ? layers[0] : counts;
  const second = layers ? layers[1] : null;
  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: compact ? 300 : 360 }}>
      <div style={{ display: "flex", gap: compact ? 3 : 4, width: "100%" }}>
        {places.map((place, idx) => {
          const count = primary?.[idx] || 0;
          const layered = !!second && second[idx] !== null && second[idx] !== undefined;
          const crossed = taken?.[idx] || 0;
          const takeText = takeLabels?.[idx] || null;
          const label = takeText ? takeText : null;
          const takeDigit = takeText ? takeText.replace(/\D/g, "") : "";
          return (
            <PlaceValueArithColumn
              key={place}
              place={place}
              count={count}
              count2={layered ? second[idx] : null}
              layered={layered}
              ringed={carried?.[idx] || 0}
              crossed={crossed}
              token={countTokens ? countTokens[idx] : undefined}
              highlighted={highlightPlace === place}
              emptyMarker={emptyMarker}
              compact={compact}
              animate={animate}
              columnDelay={idx * 150}
              dense={places.length === 4}
              reserveTrade={!!tradeable && !!onTrade}
              trade={tradeable?.[idx] && onTrade ? {
                text: tradeText, label: tradeLabels?.[idx] || "", onClick: () => onTrade(idx),
              } : null}
              take={label ? {
                label, done: crossed > 0, doneLabel: `Took ${takeDigit}`,
                onClick: onTake ? () => onTake(idx) : null,
              } : null}
            />
          );
        })}
      </div>
      {notice && (
        <div role="status" style={{
          marginTop: 8, padding: "6px 12px", borderRadius: 8, textAlign: "center",
          border: BRUTAL_BORDER_SM, backgroundColor: COLORS.cream, color: COLORS.black,
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, lineHeight: 1.3,
        }}>
          {notice}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BuildNumberInput — the `buildNumber` answerType's interactive input
// (docs/place-value-spec.md §8.2, the `buildBar` analogue): an interactive
// discs-mode PlaceValueChart with ±steppers per column, plus a full-width
// "Check!" button. `counts`/`onChange` are controlled by the caller (the
// practice screen owns the array so it survives a converted "not sure").
// Over-filling a column past 9 is allowed for a beat (no auto-trade) — the
// cream chip names it (docs/place-value-spec.md §3).
// ---------------------------------------------------------------------------
export function BuildNumberInput({ columns, counts, onChange, onSubmit, disabled = false }) {
  const overfill = (counts || []).some((c) => c > 9);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%" }}>
      <PlaceValueChart
        mode="discs" columns={columns} counts={counts}
        countTokens={(counts || []).map(() => "numeral")}
        interactive={!disabled} onChange={onChange}
        emptyMarker
      />
      {overfill && (
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13,
          color: COLORS.black, backgroundColor: COLORS.cream, border: BRUTAL_BORDER_SM,
          borderRadius: 8, padding: "6px 12px", textAlign: "center",
        }}>
          A column only holds 9 — the next one is worth ten times more.
        </div>
      )}
      {!disabled && (
        <button onClick={onSubmit} style={{
          width: "100%", minHeight: 48, borderRadius: 10, border: BRUTAL_BORDER_SM,
          backgroundColor: COLORS.yellow, color: COLORS.black,
          fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16,
          cursor: "pointer", boxShadow: BRUTAL_SHADOW_SM,
        }}>
          Check!
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlaceValueStrips — Singapore arrow-card decomposition (docs/place-value-
// spec.md §8.3). `values` — place values already multiplied (e.g.
// [4000, 0, 10, 2]), left-to-right, sliced to the item's column count.
//   split        — true (default): render each value as its own card in a
//                  row. false: one card holding the assembled total. Also
//                  the INITIAL state when `interactive` (a fresh mount per
//                  item — key the component on itemKey, the same
//                  `retryResetKey` pattern local-tap-state components use
//                  elsewhere — always starts from this prop).
//   assembledToken — "numeral"|"blank"|"correct", only meaningful in the
//                  assembled view: renders the total through DerivationToken
//                  instead of the plain number.
//   interactive  — pass 2 (Group X): tap toggles stacked (assembled) ↔ split
//                  (pulled-apart) — "tapping is the composition/decomposition
//                  made visible" (§3). Default off; the B2 reveal's non-
//                  interactive split-only call is unaffected.
//   blankIndex/blankToken — pass 2 (X1): when set, the split card at this
//                  index renders through DerivationToken (state=blankToken)
//                  instead of its plain number — X1's one hidden term among
//                  three visible ones. Default off (null): every split card
//                  is the plain number, byte-identical to before.
// ---------------------------------------------------------------------------
export function PlaceValueStrips({
  values, split = true, assembledToken = null, opacity = 1, interactive = false,
  blankIndex = null, blankToken = "blank",
}) {
  const [localSplit, setLocalSplit] = useState(split);
  const isSplit = interactive ? localSplit : split;
  const handleTap = interactive ? () => setLocalSplit((s) => !s) : undefined;

  if (isSplit) {
    return (
      <div
        onClick={handleTap}
        style={{
          opacity, transition: "opacity 0.6s ease", display: "flex", gap: 6,
          justifyContent: "center", width: "100%", flexWrap: "wrap",
          cursor: interactive ? "pointer" : "default",
        }}
      >
        {values.map((v, i) => (
          <div key={i} style={{
            minWidth: 52, padding: "8px 10px", borderRadius: 10, border: BRUTAL_BORDER_SM,
            backgroundColor: "white", boxShadow: BRUTAL_SHADOW_SM,
            fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14,
            textAlign: "center", color: COLORS.black,
          }}>
            {i === blankIndex ? <DerivationToken value={Number(v).toLocaleString("en-US")} state={blankToken} /> : Number(v).toLocaleString("en-US")}
          </div>
        ))}
      </div>
    );
  }
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <div
      onClick={handleTap}
      style={{
        opacity, transition: "opacity 0.6s ease", display: "flex",
        justifyContent: "center", width: "100%", cursor: interactive ? "pointer" : "default",
      }}
    >
      <div style={{
        minWidth: 90, padding: "10px 16px", borderRadius: 10, border: BRUTAL_BORDER,
        backgroundColor: "white", boxShadow: BRUTAL_SHADOW,
        fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18,
        textAlign: "center", color: COLORS.black,
      }}>
        {assembledToken ? <DerivationToken value={total} state={assembledToken} /> : total}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG answer token — the SVG twin of DerivationToken (HTML spans can't live
// inside the bars' <svg>, and <foreignObject> misplaces under the reveal's CSS
// scale on iOS). `state`: "blank" (yellow chip, no text — the answer is not on
// screen), "numeral" (the cell colour with the value — an intermediate or a
// second-miss fill) or "correct" (green). Same three states as DerivationToken
// so ONE tokenState can drive the whole reveal (docs/confidence-pass-spec.md C1).
// ---------------------------------------------------------------------------
function svgTokenFill(state, baseFill) {
  if (state === "blank") return COLORS.yellow;
  if (state === "correct") return COLORS.green;
  return baseFill;
}

// Module-scope SVG pieces for PartWholeBar / SchematicComparison. They must NOT
// be declared inside those components: a component defined in a render body is a
// new type every render, so React remounts it and the dotPop animation replays on
// every keystroke in the answer box. transformBox/transformOrigin make the pop
// grow from the cell's own centre rather than the viewBox origin.
const POP_STYLE = (animate, delay = "") => ({
  animation: animate ? `dotPop 0.3s ease ${delay}both` : "none",
  transformBox: "fill-box", transformOrigin: "center",
});

function PwCell({ x, y, w, h, label, missing, color, missingToken, missingValue, fontSize, animate }) {
  const tokened = missing && missingToken;
  const text = tokened
    ? (missingToken === "blank" ? "" : (missingValue ?? ""))
    : (missing ? "?" : label);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h}
        fill={tokened ? svgTokenFill(missingToken, color) : (missing ? COLORS.cream : color)}
        stroke={COLORS.black} strokeWidth={2.5} rx={4}
        style={POP_STYLE(animate)}
      />
      <text x={x + w / 2} y={y + h / 2 + 1} textAnchor="middle" dominantBaseline="central"
        fontFamily="'Shrikhand', cursive" fontSize={fontSize} fill={COLORS.black}>
        {text}
      </text>
    </g>
  );
}

function SvgCaption({ x, y, text, size, anchor = "middle" }) {
  return text ? (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central"
      fontFamily="'Space Mono', monospace" fontSize={size} fontWeight={700} fill={COLORS.black}>
      {text}
    </text>
  ) : null;
}

// ---------------------------------------------------------------------------
// PartWholeBar — Singapore part-whole bar model for W1 word problems.
// Responsive: viewBox + width:100%.
//
// Opt-in props (all default off — with none of them set the markup is
// byte-for-byte what it was before):
//   missingToken / missingValue  render the unknown cell as a reveal token
//                  ("blank" | "numeral" | "correct") instead of "?"
//   labelWhole     overrides the whole's displayed text (like labelA/labelB;
//                  used to mask a carried-in value as "?")
//   names          { whole, partA, partB } small captions: the whole's above its
//                  bar, the parts' under theirs
//   compact        ~70% bar height, for W3's stacked pair
// ---------------------------------------------------------------------------
export function PartWholeBar({
  whole, partA, partB,
  missingIs = null,  // "whole" | "partA" | "partB"
  labelA = null, labelB = null, labelWhole = null,
  missingToken = null, missingValue = null,
  names = null, compact = false,
  opacity = 1, animate = false,
}) {
  const W = 280;
  const named = !!names;
  const cap = named ? 14 : 0;           // caption band
  const barH = compact ? 24 : 32;
  const gap = compact ? 12 : 18;        // connector length
  const partH = compact ? 22 : 30;
  const barTop = 8 + cap;
  const partTop = barTop + barH + gap;
  const H = partTop + partH + 12 + cap;
  const fontSize = 13 + (compact ? 0 : 1); // 14 normal, 13 compact

  const partAW = (W - 24) / 2;
  const capSize = compact ? 12 : 11;
  const cellProps = { missingToken, missingValue, fontSize, animate };
  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 320 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {named && <SvgCaption x={W / 2} y={barTop - 8} text={names.whole} size={capSize} />}
        {/* Whole bar */}
        <PwCell x={8} y={barTop} w={W - 16} h={barH} {...cellProps}
          label={labelWhole || whole} missing={missingIs === "whole"} color={COLORS.yellow}
        />
        {/* Bracket lines */}
        <line x1={W / 2} y1={barTop + barH} x2={W / 2} y2={partTop}
          stroke={COLORS.black} strokeWidth={2} />
        <line x1={18} y1={partTop} x2={W - 18} y2={partTop}
          stroke={COLORS.black} strokeWidth={2} />
        {/* Part A */}
        <PwCell x={8} y={partTop} w={partAW} h={partH} {...cellProps}
          label={labelA || partA} missing={missingIs === "partA"} color={COLORS.blue}
        />
        {/* Part B */}
        <PwCell x={W / 2 + 4} y={partTop} w={partAW} h={partH} {...cellProps}
          label={labelB || partB} missing={missingIs === "partB"} color={COLORS.green}
        />
        {named && <SvgCaption x={8 + partAW / 2} y={partTop + partH + 10} text={names.partA} size={capSize} />}
        {named && <SvgCaption x={W / 2 + 4 + partAW / 2} y={partTop + partH + 10} text={names.partB} size={capSize} />}
      </svg>
    </div>
  );
}

// ComparisonBar's `schematic` layout (word problems): names sit as captions above
// their bars (names run to ~13 characters — too long for the classic left
// gutter) and the bars are NOT drawn to scale (fixed 62% / 100%), so a bar's
// length never leaks the unknown's size. The difference chip sits under the gap.
function SchematicComparison({
  baseLabel, biggerLabel, missingIs, cellText, cellFill, baseValue, biggerValue,
  diffLabel, compact, opacity, animate,
}) {
  const W = 280;
  const barH = compact ? 20 : 28;
  const rectH = compact ? 17 : 20;
  const xL = 8;
  const bigW = W - 16;
  const baseW = Math.round(bigW * 0.62);
  const baseTop = compact ? 14 : 16;
  const baseBot = baseTop + barH;
  const bigTop = baseBot + (compact ? 17 : 20);
  const bigBot = bigTop + barH;
  const rectY = bigBot + (compact ? 5 : 7);
  const H = rectY + rectH + (compact ? 4 : 6);
  const font = 13;
  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 320 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <SvgCaption x={xL + 2} y={baseTop - 7} text={baseLabel} size={compact ? 12 : 11} anchor="start" />
        <rect x={xL} y={baseTop} width={baseW} height={barH}
          fill={cellFill("base", COLORS.blue)} stroke={COLORS.black} strokeWidth={2.5} rx={4}
          style={POP_STYLE(animate)} />
        <text x={xL + baseW / 2} y={baseTop + barH / 2 + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Shrikhand', cursive" fontSize={font} fill={COLORS.black}>
          {cellText("base", baseValue)}
        </text>
        <SvgCaption x={xL + 2} y={baseBot + (compact ? 8 : 10)} text={biggerLabel} size={compact ? 12 : 11} anchor="start" />
        <rect x={xL} y={bigTop} width={bigW} height={barH}
          fill={cellFill("bigger", COLORS.orange)} stroke={COLORS.black} strokeWidth={2.5} rx={4}
          style={POP_STYLE(animate, "0.1s ")} />
        <text x={xL + bigW / 2} y={bigTop + barH / 2 + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Shrikhand', cursive" fontSize={font} fill={COLORS.black}>
          {cellText("bigger", biggerValue)}
        </text>
        <g style={{ animation: animate ? "fadeSlideUp 0.3s ease 0.15s both" : "none" }}>
          <line x1={xL + baseW} y1={bigTop + 6} x2={xL + bigW} y2={bigTop + 6}
            stroke={COLORS.black} strokeWidth={1.5} strokeDasharray="3 2" />
          <line x1={xL + baseW} y1={bigTop} x2={xL + baseW} y2={rectY + rectH - 4}
            stroke={COLORS.black} strokeWidth={1.5} />
          <line x1={xL + bigW} y1={bigTop} x2={xL + bigW} y2={rectY + rectH - 4}
            stroke={COLORS.black} strokeWidth={1.5} />
          <rect x={xL + baseW + 2} y={rectY} width={bigW - baseW - 4} height={rectH}
            fill={cellFill("diff", COLORS.yellow)} stroke={COLORS.black} strokeWidth={2} rx={3} />
          <text x={xL + baseW + (bigW - baseW) / 2} y={rectY + rectH / 2 + 1}
            textAnchor="middle" dominantBaseline="central"
            fontFamily="'Shrikhand', cursive" fontSize={12} fill={COLORS.black}>
            {cellText("diff", diffLabel)}
          </text>
        </g>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComparisonBar — two-bar comparison model for W2 word problems.
// Responsive: viewBox + width:100%.
//
// Opt-in props (all default off — unchanged markup when none are set):
//   missingToken / missingValue  the unknown cell as a reveal token (see PartWholeBar)
//   valueText      { base, bigger, diff } display strings that override the
//                  numbers (formatted with commas, or "?" to mask a carried-in value)
//   schematic      a separate layout: name captions above the bars, fixed bar
//                  proportions (NOT drawn to scale, so lengths never leak the
//                  unknown's size)
//   compact        ~70% bar height, for W3's stacked pair
// ---------------------------------------------------------------------------
export function ComparisonBar({
  baseValue, baseLabel = "Base",
  biggerValue, biggerLabel = "Bigger",
  diffLabel = null,
  missingIs = null,  // "bigger" | "base" | "diff"
  missingToken = null, missingValue = null,
  valueText = null, schematic = false, compact = false,
  opacity = 1, animate = false,
}) {
  const W = 280;
  const H = compact ? 76 : 110;
  const barH = compact ? 20 : 28;
  const y1 = compact ? 8 : 18;               // base bar top
  const y2 = compact ? 36 : 58;              // bigger bar top
  const rectY = y2 + (compact ? 20 : 22);    // difference chip
  const rectH = compact ? 16 : 18;
  const lineEnd = compact ? rectY + rectH - 6 : 94;
  const fontMain = compact ? 12 : 13;
  const fontDiff = compact ? 10.5 : 11;
  const availW = W - 76;
  const maxVal = Math.max(baseValue || 1, biggerValue || 1, 1);
  const baseW = Math.max(28, Math.round(((baseValue || 0) / maxVal) * availW));
  const bigW = Math.max(28, Math.round(((biggerValue || 0) / maxVal) * availW));
  const labelSize = 9;

  // Text for a cell: the unknown goes through the token (or "?"), a masked
  // value through valueText, everything else is the number.
  const cellText = (which, value) => {
    if (missingIs === which) {
      if (missingToken) return missingToken === "blank" ? "" : (missingValue ?? "");
      return "?";
    }
    if (valueText && valueText[which] != null) return valueText[which];
    return value;
  };
  const cellFill = (which, color) => {
    if (missingIs !== which) return color;
    if (missingToken) return svgTokenFill(missingToken, color);
    return COLORS.cream;
  };

  if (schematic) {
    return (
      <SchematicComparison
        baseLabel={baseLabel} biggerLabel={biggerLabel} missingIs={missingIs}
        cellText={cellText} cellFill={cellFill} baseValue={baseValue} biggerValue={biggerValue}
        diffLabel={diffLabel} compact={compact} opacity={opacity} animate={animate}
      />
    );
  }

  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 320 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* Base label */}
        <text x={50} y={y1 + 4 + barH / 2 - (compact ? 4 : 0)} textAnchor="end" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize={labelSize} fontWeight={700} fill={COLORS.black}>
          {baseLabel}
        </text>
        {/* Base bar */}
        <rect x={55} y={y1} width={baseW} height={barH}
          fill={cellFill("base", COLORS.blue)}
          stroke={COLORS.black} strokeWidth={2.5} rx={4}
          style={{ animation: animate ? "dotPop 0.3s ease both" : "none" }}
        />
        <text x={55 + baseW / 2} y={y1 + barH / 2 + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Shrikhand', cursive" fontSize={fontMain} fill={COLORS.black}>
          {cellText("base", baseValue)}
        </text>

        {/* Bigger label */}
        <text x={50} y={y2 + 2 + barH / 2} textAnchor="end" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize={labelSize} fontWeight={700} fill={COLORS.black}>
          {biggerLabel}
        </text>
        {/* Bigger bar */}
        <rect x={55} y={y2} width={bigW} height={barH}
          fill={cellFill("bigger", COLORS.orange)}
          stroke={COLORS.black} strokeWidth={2.5} rx={4}
          style={{ animation: animate ? "dotPop 0.3s ease 0.1s both" : "none" }}
        />
        <text x={55 + bigW / 2} y={y2 + barH / 2 + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Shrikhand', cursive" fontSize={fontMain} fill={COLORS.black}>
          {cellText("bigger", biggerValue)}
        </text>

        {/* Difference bracket (only when bigger > base) */}
        {bigW > baseW && (
          <g style={{ animation: animate ? "fadeSlideUp 0.3s ease 0.15s both" : "none" }}>
            <line x1={55 + baseW} y1={y2 + 6} x2={55 + bigW} y2={y2 + 6}
              stroke={COLORS.black} strokeWidth={1.5} strokeDasharray="3 2" />
            <line x1={55 + baseW} y1={y2} x2={55 + baseW} y2={lineEnd}
              stroke={COLORS.black} strokeWidth={1.5} />
            <line x1={55 + bigW} y1={y2} x2={55 + bigW} y2={lineEnd}
              stroke={COLORS.black} strokeWidth={1.5} />
            <rect x={55 + baseW + 2} y={rectY}
              width={Math.max(4, bigW - baseW - 4)} height={rectH}
              fill={cellFill("diff", COLORS.yellow)}
              stroke={COLORS.black} strokeWidth={2} rx={3}
            />
            <text x={55 + baseW + (bigW - baseW) / 2} y={rectY + rectH / 2 + 1}
              textAnchor="middle" dominantBaseline="central"
              fontFamily="'Shrikhand', cursive" fontSize={fontDiff} fill={COLORS.black}>
              {cellText("diff", diffLabel || (biggerValue - baseValue))}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddNumberBond — standard NumberBond with "+" operator for the add module.
// Responsive SVG (viewBox + width:100%).
// ---------------------------------------------------------------------------
export function AddNumberBond({ whole, partA, partB, show, opLabel = "+", hideNode = null }) {
  if (!show) return null;
  // hideNode ("whole" | "partA" | "partB") renders that node as "?" — used so the
  // bond states the question (unknown blank) rather than revealing the answer.
  const disp = (node, val) => (hideNode === node ? "?" : val);
  const w = 180, h = 130;
  const wholeCx = w / 2, wholeCy = 28;
  const leftCx = 34, leftCy = 102;
  const rightCx = w - 34, rightCy = 102;
  const r1 = 26, r2 = 22;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 12, animation: "fadeSlideUp 0.4s ease both" }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: w, display: "block" }}>
        <line x1={wholeCx} y1={wholeCy + r1} x2={leftCx} y2={leftCy - r2}
          stroke={COLORS.black} strokeWidth="3" />
        <line x1={wholeCx} y1={wholeCy + r1} x2={rightCx} y2={rightCy - r2}
          stroke={COLORS.black} strokeWidth="3" />
        <circle cx={wholeCx + 3} cy={wholeCy + 3} r={r1} fill={COLORS.black} />
        <circle cx={wholeCx} cy={wholeCy} r={r1}
          fill={COLORS.yellow} stroke={COLORS.black} strokeWidth="3" />
        <text x={wholeCx} y={wholeCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="17" fontWeight="700"
          fill={COLORS.black}>{disp("whole", whole)}</text>
        <circle cx={leftCx + 2} cy={leftCy + 2} r={r2} fill={COLORS.black} />
        <circle cx={leftCx} cy={leftCy} r={r2}
          fill={COLORS.blue} stroke={COLORS.black} strokeWidth="3" />
        <text x={leftCx} y={leftCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="15" fontWeight="700"
          fill={COLORS.black}>{disp("partA", partA)}</text>
        <text x={w / 2} y={leftCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="16" fontWeight="700"
          fill={COLORS.black}>{opLabel}</text>
        <circle cx={rightCx + 2} cy={rightCy + 2} r={r2} fill={COLORS.black} />
        <circle cx={rightCx} cy={rightCy} r={r2}
          fill={COLORS.green} stroke={COLORS.black} strokeWidth="3" />
        <text x={rightCx} y={rightCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Space Mono', monospace" fontSize="15" fontWeight="700"
          fill={COLORS.black}>{disp("partB", partB)}</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// JumpStrip — number-line jump strategy hint for S-group items.
// Shows: start → [+jump1] → mid → [+jump2] → end
// ---------------------------------------------------------------------------
export function JumpStrip({ start, jumps = [], animate = false }) {
  // jumps: array of { label, landAt }
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6,
      justifyContent: "center", marginTop: 8, alignItems: "center",
    }}>
      <span style={{
        fontFamily: "'Shrikhand', cursive", fontSize: 20,
        color: COLORS.black,
        animation: animate ? "fadeSlideUp 0.3s ease both" : "none",
      }}>{start}</span>
      {jumps.map((j, i) => (
        <React.Fragment key={i}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
            backgroundColor: COLORS.yellow, color: COLORS.black,
            padding: "3px 8px", borderRadius: 6, border: BRUTAL_BORDER_SM,
            animation: animate ? `fadeSlideUp 0.3s ease ${(i + 1) * 80}ms both` : "none",
          }}>
            {j.label}
          </span>
          <span style={{
            fontFamily: "'Shrikhand', cursive", fontSize: 20,
            color: i === jumps.length - 1 ? COLORS.green : COLORS.black,
            animation: animate ? `fadeSlideUp 0.3s ease ${(i + 1) * 80 + 40}ms both` : "none",
          }}>
            {j.landAt}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OpenNumberLine — the mental-math model (docs/add-spec.md §4.3, §11.3): a
// horizontal line with the start number ticked and labelled, an arc per jump
// labelled with the jump ("+30", "+8", "−1"), and a landing tick + value chip
// per jump. Responsive: viewBox + width:100%.
//
// Props
//   start           the given start number (always printed)
//   jumps           [{ label, delta }] — the split is fixed per item
//   landingTokens   per-landing chip state: "blank" (yellow chip, no number — the
//                   child computes it; the default), "numeral" (an intermediate
//                   printed in the reveal) or "correct". Same states as
//                   DerivationToken, so one tokenState can drive the answer chip.
//   drawn           how many jumps are drawn so far (default: all)
//   interactive     Concrete: render jump buttons (≥44px) under the line, tapped
//                   in order; each draws its arc and lights its landing tick
//   onJump(i)       called with the jump's index
//   disabled        keep the jump buttons on screen but inert (the card must not
//                   shrink when the answer is submitted)
//   animate         pop the arcs in
//   opacity         the Pictorial fade
// Landing chips stay BLANK before the reveal (§4.0): the line never prints an
// answer digit — only the given start, the jump sizes and (in the reveal) the
// intermediate landing.
// ---------------------------------------------------------------------------
export function OpenNumberLine({
  start, jumps = [], landingTokens = null, drawn = null,
  interactive = false, onJump = null, disabled = false, animate = false, opacity = 1,
}) {
  const W = 300, baseY = 66, H = 112;
  const nDrawn = drawn == null ? jumps.length : Math.max(0, Math.min(jumps.length, drawn));

  // Arc widths: 58..124 by size. 58 = chip width (46) + stroke + a 10px gap, so two
  // neighbouring landing chips never touch (M3's "+30, −1").
  const maxAbs = Math.max(1, ...jumps.map((j) => Math.abs(j.delta)));
  const widths = jumps.map((j) => 58 + 66 * (Math.abs(j.delta) / maxAbs));
  const raw = [0];
  jumps.forEach((j, i) => raw.push(raw[i] + (j.delta >= 0 ? 1 : -1) * widths[i]));
  const minX = Math.min(...raw);
  const maxX = Math.max(...raw);
  const off = (W - (maxX - minX)) / 2 - minX;
  const xs = raw.map((x) => x + off);
  const values = [start];
  jumps.forEach((j, i) => values.push(values[i] + j.delta));

  const lineL = Math.max(6, Math.min(...xs) - 20);
  const lineR = Math.min(W - 6, Math.max(...xs) + 20);

  // A jump that reverses direction gets a taller arc so its label clears the
  // previous arc (M3's "+30, then −1").
  const heights = jumps.map((j, i) => {
    const reversal = i > 0 && Math.sign(j.delta) !== Math.sign(jumps[i - 1].delta);
    return (reversal ? 40 : 28);
  });

  const chip = (x, state, value, key) => {
    const w = 46, h = 26, y = baseY + 12;
    const fill = state === "blank" ? COLORS.yellow : state === "correct" ? COLORS.green : "white";
    return (
      <g key={key} style={{ animation: animate ? "fadeSlideUp 0.3s ease both" : "none" }}>
        <rect x={x - w / 2} y={y} width={w} height={h} rx={5} fill={fill} stroke={COLORS.black} strokeWidth={2.5} />
        {state !== "blank" && (
          <text x={x} y={y + h / 2 + 1} textAnchor="middle" dominantBaseline="central"
            fontFamily="'Shrikhand', cursive" fontSize={15} fill={COLORS.black}>{value}</text>
        )}
      </g>
    );
  };

  return (
    <div style={{ width: "100%", maxWidth: 340 }}>
      <div style={{ opacity, transition: "opacity 0.6s ease" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          <line x1={lineL} y1={baseY} x2={lineR} y2={baseY} stroke={COLORS.black} strokeWidth={3} strokeLinecap="round" />
          {/* ticks: start is always lit; a landing lights when its jump is drawn */}
          {xs.map((x, i) => {
            const lit = i === 0 || i <= nDrawn;
            return (
              <circle key={`t${i}`} cx={x} cy={baseY} r={5.5}
                fill={i === 0 ? COLORS.black : lit ? COLORS.yellow : "white"}
                stroke={COLORS.black} strokeWidth={2.5} />
            );
          })}
          {/* arcs */}
          {jumps.slice(0, nDrawn).map((j, i) => {
            const xa = xs[i], xb = xs[i + 1];
            const mid = (xa + xb) / 2;
            const h = heights[i];
            const cy = baseY - 2 * h;
            const dirX = xb - mid, dirY = baseY - cy;
            const len = Math.hypot(dirX, dirY) || 1;
            const ux = dirX / len, uy = dirY / len;
            const tip = [xb, baseY - 6];
            const bx = tip[0] - ux * 9, by = tip[1] - uy * 9;
            const px = -uy * 4.5, py = ux * 4.5;
            const pillW = 14 + 8 * j.label.length;
            const pillY = baseY - h - 22;
            // A reversing jump's pill slides away from the previous jump's pill.
            const reversal = i > 0 && Math.sign(j.delta) !== Math.sign(jumps[i - 1].delta);
            const pillX = reversal ? mid + 10 * Math.sign(jumps[i - 1].delta) : mid;
            return (
              <g key={`a${i}`} style={{ animation: animate ? `fadeSlideUp 0.3s ease ${i * 120}ms both` : "none" }}>
                <path d={`M ${xa} ${baseY - 6} Q ${mid} ${cy} ${xb} ${baseY - 6}`}
                  fill="none" stroke={COLORS.black} strokeWidth={2.5} strokeLinecap="round" />
                <polygon points={`${tip[0]},${tip[1]} ${bx + px},${by + py} ${bx - px},${by - py}`} fill={COLORS.black} />
                <rect x={pillX - pillW / 2} y={pillY} width={pillW} height={20} rx={5}
                  fill={COLORS.yellow} stroke={COLORS.black} strokeWidth={2.5} />
                <text x={pillX} y={pillY + 11} textAnchor="middle" dominantBaseline="central"
                  fontFamily="'Space Mono', monospace" fontSize={13} fontWeight={700} fill={COLORS.black}>
                  {j.label}
                </text>
              </g>
            );
          })}
          {/* chips: the given start, then one per drawn landing */}
          {chip(xs[0], "numeral", start, "c0")}
          {jumps.slice(0, nDrawn).map((j, i) => chip(xs[i + 1], (landingTokens && landingTokens[i]) || "blank", values[i + 1], `c${i + 1}`))}
        </svg>
      </div>
      {interactive && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
          {jumps.map((j, i) => {
            const done = i < nDrawn;
            const next = i === nDrawn;
            return (
              <PressButton
                key={i}
                disabled={!next || disabled}
                onClick={() => onJump && onJump(i)}
                aria-label={`Jump ${j.label}`}
                style={{
                  minWidth: 88, minHeight: 48, padding: "6px 14px", borderRadius: 8,
                  border: BRUTAL_BORDER_SM,
                  // Done / waiting buttons are "pressed in" in muted text at full
                  // opacity (dimming the whole button fails contrast).
                  color: next ? COLORS.black : "#666",
                  backgroundColor: done ? "#EEE" : next ? COLORS.yellow : COLORS.cream,
                  boxShadow: next ? BRUTAL_SHADOW_SM : "none",
                  transform: next ? "none" : "translate(3px, 3px)",
                  fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16,
                  cursor: next ? "pointer" : "default",
                }}
              >
                {done ? "✓ " : ""}{j.label}
              </PressButton>
            );
          })}
        </div>
      )}
    </div>
  );
}
