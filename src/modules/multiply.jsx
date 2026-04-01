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

  // Only the easy group is available to free tier
  freeContent: ["easy"],

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
