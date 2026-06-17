/**
 * Shared bar-model and number-bond components.
 *
 * Extracted here so multiply, fractions, and connections modules can all import
 * without copying code a third time (per NOTES-next-modules.md rule).
 *
 * Canonical original:  src/modules/fractions.jsx  (visual components)
 *                      src/multiplication-practice.jsx (NumberBond, MasteryDots)
 */

import React from "react";
import { COLORS, BRUTAL_BORDER_SM, BRUTAL_BORDER, BRUTAL_SHADOW_SM, DEFAULT_MASTERY_THRESHOLD } from "../constants.js";

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
// ---------------------------------------------------------------------------
export function FractionBar({
  n, d, color = COLORS.purple, opacity = 1, animate = false,
  interactive = false, shadedCount = null, onShadedChange = null,
  label = null, compact = false,
}) {
  const segH = interactive ? 60 : (compact ? 24 : 36);
  const controlled = shadedCount !== null;
  const shaded = controlled ? shadedCount : n;

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
          return (
            <div key={i}
              onClick={interactive && onShadedChange ? () => {
                const newCount = (shaded === i + 1) ? 0 : i + 1;
                onShadedChange(newCount);
              } : undefined}
              style={{
                flex: 1, height: segH,
                backgroundColor: isShaded ? color : "#F0F0F0",
                border: `2px solid ${COLORS.black}`,
                borderRadius: 4,
                cursor: interactive ? "pointer" : "default",
                transition: "background-color 0.15s ease",
                animation: animate && isShaded ? `dotPop 0.25s ease ${i * 40}ms both` : "none",
              }}
            />
          );
        })}
      </div>
      {!compact && (
        <div style={{
          textAlign: "center", fontFamily: "'Space Mono', monospace",
          fontSize: 11, fontWeight: 700, marginTop: 4, opacity: 0.5, color: COLORS.black,
        }}>
          {shaded}/{d}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TwoStackedBars – two bars of identical length (equivalence / comparison)
// ---------------------------------------------------------------------------
export function TwoStackedBars({ top, bottom, animate = false, opacity = 1 }) {
  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 340 }}>
      <FractionBar n={top.n} d={top.d} color={COLORS.purple} label={top.label} animate={animate} />
      <div style={{ height: 8 }} />
      <FractionBar n={bottom.n} d={bottom.d} color={bottom.color || COLORS.blue} label={bottom.label} animate={animate} />
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
