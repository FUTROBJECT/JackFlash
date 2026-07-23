import React from "react";
import { COLORS, BRUTAL_SHADOW_SM, BRUTAL_BORDER_SM } from "../constants.js";

/**
 * DotArray Component
 * Visual representation of multiplication using an array of dots.
 * Shows rows × cols arrangement of colored dots.
 */
function DotArray({ rows, cols, opacity = 1, animate = false }) {
  // Scale dots to fit within mobile screens
  const total = rows * cols;
  const dotSize = total > 80 ? 6 : total > 50 ? 7 : total > 30 ? 8 : cols > 8 ? 9 : 11;
  const gap = total > 50 ? 3 : 4;
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: `${gap}px`,
        opacity,
        transition: "opacity 0.6s ease",
        maxWidth: "100%",
        overflow: "hidden",
        background: COLORS.cream,
        border: BRUTAL_BORDER_SM,
        borderRadius: "6px",
        padding: "8px",
      }}
    >
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", gap: `${gap}px` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: "50%",
                backgroundColor: COLORS.pink,
                border: `1.5px solid ${COLORS.black}`,
                animation: animate ? `dotPop 0.3s ease ${(r * cols + c) * 15}ms both` : "none",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Concrete-mode manipulatives (docs/multiply-concrete-spec.md).
 * One shared gesture, run in opposite directions:
 *   Multiply — Equal-Groups Builder: tap to ADD a group of `b`, `a` times.
 *   Divide   — Grouping Maker: tap to PULL a group of `divisor` out of the pile.
 * Anti-reveal rules (non-negotiable): never print a running dot total (multiply —
 * the total IS the answer) and never print or pre-slot a group count (divide —
 * the group count IS the answer). The pile label counts dividend→0, which is
 * safe; `X of a groups` restates the given factor `a`, also safe.
 */

const builderLabel = {
  fontFamily: "'Space Mono', monospace",
  fontSize: "12px",
  fontWeight: 700,
  color: "#1A1A1A",
  opacity: 0.7,
};

const builderPrompt = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "13px",
  fontWeight: 700,
  color: "#1A1A1A",
  textAlign: "center",
};

const builderButton = {
  padding: "10px 16px",
  borderRadius: "10px",
  border: BRUTAL_BORDER_SM,
  backgroundColor: "#FFD43B",
  color: "#1A1A1A",
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: BRUTAL_SHADOW_SM,
};

export function ConcreteMultiplyBuilder({ a, b, groupsBuilt, onAddGroup, onRemoveGroup, revealed = false, reducedMotion = false }) {
  // Revealed (after a wrong answer): auto-complete the array and show the total.
  const shown = revealed ? a : groupsBuilt;
  const total = a * b;
  const dotSize = total > 80 ? 6 : total > 50 ? 7 : total > 30 ? 8 : b > 8 ? 9 : 11;
  const gap = total > 50 ? 3 : 4;
  const done = shown >= a;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", maxWidth: "100%" }}>
      <div style={builderLabel}>{shown} of {a} groups</div>
      <div style={{
        display: "inline-flex", flexDirection: "column", gap: `${gap + 2}px`,
        background: COLORS.cream, border: BRUTAL_BORDER_SM, borderRadius: "8px",
        padding: "10px", maxWidth: "100%", overflow: "hidden",
      }}>
        {Array.from({ length: a }).map((_, r) => {
          const filled = r < shown;
          return (
            <div
              key={r}
              onClick={revealed ? undefined : (filled ? () => onRemoveGroup(r) : onAddGroup)}
              style={{
                display: "flex", gap: `${gap}px`, alignItems: "center",
                cursor: revealed ? "default" : "pointer",
                padding: "2px 4px", borderRadius: "6px",
                border: filled ? "2px solid transparent" : "2px dashed #C9C0A8",
              }}
            >
              {Array.from({ length: b }).map((_, c) => (
                <div key={c} style={{
                  width: dotSize, height: dotSize, borderRadius: "50%", flexShrink: 0,
                  backgroundColor: filled ? COLORS.pink : "transparent",
                  border: filled ? `1.5px solid ${COLORS.black}` : "1.5px dashed #C9C0A8",
                  animation: filled && !reducedMotion ? `dotPop 0.25s ease ${c * 25}ms both` : "none",
                }} />
              ))}
              {revealed && (
                <span style={{ ...builderLabel, fontSize: "10px", marginLeft: "6px", opacity: 0.6 }}>{b}</span>
              )}
            </div>
          );
        })}
      </div>
      {revealed ? (
        <div style={{ ...builderLabel, opacity: 1 }}>{a} groups of {b} — count them: {total}</div>
      ) : done ? (
        <div style={builderPrompt}>Now count them all, then type your answer.</div>
      ) : (
        <button onClick={onAddGroup} style={builderButton}>＋ Make a group of {b}</button>
      )}
    </div>
  );
}

export function ConcreteDivideBuilder({ dividend, divisor, groupsMade, onMakeGroup, onUndoGroup, revealed = false, reducedMotion = false }) {
  const quotient = Math.round(dividend / divisor);
  // Revealed (after a wrong answer): pile empties into the full set of groups.
  const shownGroups = revealed ? quotient : groupsMade;
  const pileRemaining = Math.max(0, dividend - shownGroups * divisor);
  const dotSize = dividend > 80 ? 6 : dividend > 50 ? 7 : dividend > 30 ? 8 : 10;
  const gap = dividend > 50 ? 3 : 4;
  const empty = pileRemaining === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", maxWidth: "100%" }}>
      <div style={builderLabel}>In the pile: {pileRemaining}</div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: `${gap}px`, justifyContent: "center",
        alignItems: "center", background: COLORS.cream, border: BRUTAL_BORDER_SM,
        borderRadius: "8px", padding: "10px", maxWidth: "300px", minHeight: `${dotSize + 8}px`,
      }}>
        {empty ? (
          <span style={{ ...builderLabel, fontSize: "11px", opacity: 0.5 }}>empty!</span>
        ) : (
          Array.from({ length: pileRemaining }).map((_, i) => (
            <div key={i} style={{
              width: dotSize, height: dotSize, borderRadius: "50%", flexShrink: 0,
              backgroundColor: COLORS.blue, border: `1.5px solid ${COLORS.black}`,
            }} />
          ))
        )}
      </div>
      {revealed ? (
        <div style={{ ...builderLabel, opacity: 1 }}>{dividend} split into groups of {divisor} → {quotient} groups</div>
      ) : empty ? (
        <div style={builderPrompt}>Now count your groups, then type your answer.</div>
      ) : (
        <button onClick={onMakeGroup} style={builderButton}>＋ Take a group of {divisor}</button>
      )}
      {shownGroups > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxWidth: "100%" }}>
          {Array.from({ length: shownGroups }).map((_, g) => (
            <div
              key={g}
              onClick={revealed ? undefined : () => onUndoGroup(g)}
              style={{
                display: "flex", flexWrap: "wrap", gap: `${gap}px`, alignItems: "center",
                background: "white", border: BRUTAL_BORDER_SM, borderRadius: "6px",
                padding: "6px", maxWidth: "120px",
                cursor: revealed ? "default" : "pointer",
              }}
            >
              {Array.from({ length: divisor }).map((_, c) => (
                <div key={c} style={{
                  width: dotSize, height: dotSize, borderRadius: "50%", flexShrink: 0,
                  backgroundColor: COLORS.blue, border: `1.5px solid ${COLORS.black}`,
                  animation: reducedMotion ? "none" : `dotPop 0.25s ease ${c * 25}ms both`,
                }} />
              ))}
              {revealed && (
                <span style={{ ...builderLabel, fontSize: "10px", marginLeft: "4px", opacity: 0.6 }}>{divisor}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * BarModel Component
 * Singapore Math bar/tape diagram for division.
 * Shows the total (dividend) as a whole bar split into equal groups.
 * For "60 ÷ 10 = 6": shows a bar labeled 60, split into 6 sections of 10 each.
 *
 * Props match ScaffoldComponent interface:
 *   rows = dividend (a), cols = divisor (b), opacity, animate
 *   answer is derived: rows / cols
 */
function BarModel({ rows: dividend, cols: divisor, opacity = 1, animate = false }) {
  const answer = dividend / divisor;
  // Cap visible segments to keep it clean — if answer > 12, show grouped
  const segments = Math.min(answer, 12);
  const isGrouped = answer > 12;

  // Scale bar size based on segment count so it never overwhelms the equation
  // Fewer segments = more compact; many segments = thinner to fit
  const segHeight = segments <= 4 ? 36 : segments <= 8 ? 32 : 26;
  const segFont = segments <= 4 ? 14 : segments <= 8 ? 12 : 11;
  const totalFont = segments <= 4 ? 15 : 14;
  const hintFont = 12;
  const bracketH = 7;
  const padV = 12;
  const padH = 12;
  const segGap = segments <= 6 ? 3 : 2;
  // Cap max width — fewer segments shouldn't stretch full width
  const maxW = segments <= 3 ? "60%" : segments <= 6 ? "80%" : "100%";

  return (
    <div style={{
      opacity,
      transition: "opacity 0.6s ease",
      width: maxW,
      maxWidth: "100%",
      background: COLORS.cream,
      border: BRUTAL_BORDER_SM,
      borderRadius: "8px",
      padding: `${padV}px ${padH}px ${padV - 2}px`,
    }}>
      {/* Total label above */}
      <div style={{
        textAlign: "center",
        fontFamily: "'Space Mono', monospace",
        fontSize: `${totalFont}px`,
        fontWeight: 700,
        marginBottom: "5px",
        color: COLORS.black,
      }}>
        {dividend}
      </div>

      {/* Bracket / brace visual */}
      <div style={{
        height: `${bracketH}px`,
        borderLeft: `2px solid ${COLORS.black}`,
        borderRight: `2px solid ${COLORS.black}`,
        borderTop: `2px solid ${COLORS.black}`,
        borderRadius: "4px 4px 0 0",
        marginBottom: "4px",
        marginLeft: "4px",
        marginRight: "4px",
      }} />

      {/* Bar segments */}
      <div style={{
        display: "flex",
        gap: `${segGap}px`,
      }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${segHeight}px`,
              backgroundColor: i % 2 === 0 ? COLORS.pink : COLORS.orange,
              border: `2px solid ${COLORS.black}`,
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Space Mono', monospace",
              fontSize: `${segFont}px`,
              fontWeight: 700,
              color: COLORS.black,
              animation: animate ? `dotPop 0.3s ease ${i * 80}ms both` : "none",
              minWidth: 0,
            }}
          >
            {divisor}
          </div>
        ))}
        {isGrouped && (
          <div style={{
            flex: 1,
            height: `${segHeight}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Space Mono', monospace",
            fontSize: `${segFont}px`,
            fontWeight: 700,
            color: "#999",
          }}>
            …
          </div>
        )}
      </div>

      {/* Answer hint below */}
      <div style={{
        textAlign: "center",
        fontFamily: "'Space Mono', monospace",
        fontSize: `${hintFont}px`,
        fontWeight: 600,
        marginTop: "6px",
        color: "#999",
      }}>
        {isGrouped
          ? `${answer} groups of ${divisor}`
          : `${segments} group${segments !== 1 ? "s" : ""}`
        }
      </div>
    </div>
  );
}

/**
 * SkipCount Component
 * Visual hint showing skip counting sequence.
 * Highlights the final answer in the sequence.
 */
function SkipCount({ factor, count, show }) {
  if (!show) return null;
  const steps = Array.from({ length: count }, (_, i) => factor * (i + 1));
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        justifyContent: "center",
        marginTop: "12px",
      }}
    >
      {steps.map((val, i) => (
        <span
          key={i}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "15px",
            color: i === steps.length - 1 ? COLORS.black : "#888",
            fontWeight: i === steps.length - 1 ? 700 : 400,
            backgroundColor: i === steps.length - 1 ? COLORS.yellow : "transparent",
            padding: i === steps.length - 1 ? "2px 6px" : "0",
            border: i === steps.length - 1 ? BRUTAL_BORDER_SM : "none",
            borderRadius: "4px",
            animation: `fadeSlideUp 0.3s ease ${i * 60}ms both`,
          }}
        >
          {val}
          {i < steps.length - 1 && <span style={{ color: "#CCC", margin: "0 2px" }}>→</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * Generate multiplication and division facts for specified tables.
 *
 * @param {Object} config - Configuration object
 * @param {number[]} config.tables - Array of tables (e.g., [2, 3, 5])
 * @param {string} config.operation - "multiply", "divide", or "mixed"
 * @returns {Object[]} Array of fact objects
 *
 * Fact object structure:
 * - For multiply: { a, b, answer, display: "6 × 2", factKey: "6x2", operation: "multiply" }
 * - For divide: { a: product, b: factor, answer: otherFactor, display: "12 ÷ 2", factKey: "12÷2", operation: "divide" }
 */
function generateFacts({ tables, operation }) {
  const facts = [];

  tables.forEach((table) => {
    for (let i = 1; i <= 10; i++) {
      const product = table * i;

      if (operation === "multiply" || operation === "mixed") {
        facts.push({
          a: table,
          b: i,
          answer: product,
          display: `${table} × ${i}`,
          factKey: `${table}x${i}`,
          operation: "multiply",
        });
      }

      if (operation === "divide" || operation === "mixed") {
        // First division fact: product ÷ table = i
        facts.push({
          a: product,
          b: table,
          answer: i,
          display: `${product} ÷ ${table}`,
          factKey: `${product}÷${table}`,
          operation: "divide",
        });

        // Second division fact: product ÷ i = table
        facts.push({
          a: product,
          b: i,
          answer: table,
          display: `${product} ÷ ${i}`,
          factKey: `${product}÷${i}`,
          operation: "divide",
        });
      }
    }
  });

  return facts;
}

/**
 * Multiply Module Definition
 *
 * Complete module definition including:
 * - Metadata (id, name, grades, color, description)
 * - Content configuration (groups, operations, freeContent)
 * - Fact generation logic
 * - React components (ScaffoldComponent, HintComponent)
 * - Achievement definitions
 */
const multiplyModule = {
  id: "multiply",
  name: "Multiply & Divide",
  grades: "Grades 2–4",
  color: "#06D6A0",
  description: "Multiplication & division fact families, tables 2–10",

  // Content organization: groups allow progressive difficulty
  groups: [
    {
      id: "easy",
      label: "2s, 5s & 10s",
      tables: [2, 5, 10],
      color: "#06D6A0",
    },
    {
      id: "medium",
      label: "3s & 4s",
      tables: [3, 4],
      color: "#FF9F1C",
    },
    {
      id: "hard",
      label: "6s, 7s, 8s & 9s",
      tables: [6, 7, 8, 9],
      color: "#B388FF",
    },
  ],

  // Multiply/Divide is the fully-free module (the v1 launch hook) — all groups free, no purchase
  freeContent: ["easy", "medium", "hard"],

  // Available operations
  operations: [
    { id: "multiply", label: "Multiply", symbol: "×" },
    { id: "divide", label: "Divide", symbol: "÷" },
    { id: "mixed", label: "Mixed", symbol: "×÷" },
  ],

  defaultOperation: "mixed",

  // Fact generation function
  generateFacts,

  // React components for scaffolding and hints
  ScaffoldComponent: DotArray,
  DivisionScaffoldComponent: BarModel,
  // Concrete-mode interactive builders (docs/multiply-concrete-spec.md)
  ConcreteMultiplyComponent: ConcreteMultiplyBuilder,
  ConcreteDivideComponent: ConcreteDivideBuilder,
  HintComponent: SkipCount,

  // Individual focus tables (the buttons 2-10)
  focusTables: [2, 3, 4, 5, 6, 7, 8, 9, 10],

  // Achievement system
  achievements: [
    // Individual table mastery
    { id: "table-tamer-2", name: "Table Tamer: 2s", trigger: "masterTable", params: { table: 2 } },
    { id: "table-tamer-3", name: "Table Tamer: 3s", trigger: "masterTable", params: { table: 3 } },
    { id: "table-tamer-4", name: "Table Tamer: 4s", trigger: "masterTable", params: { table: 4 } },
    { id: "table-tamer-5", name: "Table Tamer: 5s", trigger: "masterTable", params: { table: 5 } },
    { id: "table-tamer-6", name: "Table Tamer: 6s", trigger: "masterTable", params: { table: 6 } },
    { id: "table-tamer-7", name: "Table Tamer: 7s", trigger: "masterTable", params: { table: 7 } },
    { id: "table-tamer-8", name: "Table Tamer: 8s", trigger: "masterTable", params: { table: 8 } },
    { id: "table-tamer-9", name: "Table Tamer: 9s", trigger: "masterTable", params: { table: 9 } },
    { id: "table-tamer-10", name: "Table Tamer: 10s", trigger: "masterTable", params: { table: 10 } },

    // Group mastery
    { id: "group-clear-easy", name: "Group Clear: Easy", trigger: "masterGroup", params: { group: "easy" } },
    { id: "group-clear-medium", name: "Group Clear: Medium", trigger: "masterGroup", params: { group: "medium" } },
    { id: "group-clear-hard", name: "Group Clear: Hard", trigger: "masterGroup", params: { group: "hard" } },

    // Overall module mastery
    { id: "multiply-master", name: "Multiply Master", trigger: "masterAll" },

    // Division-specific achievement
    { id: "fact-family-pro", name: "Fact Family Pro", trigger: "divisionCount", params: { count: 50 } },
  ],
};

export default multiplyModule;
