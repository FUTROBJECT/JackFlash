import React from "react";
import { COLORS, BRUTAL_SHADOW_SM, BRUTAL_BORDER_SM } from "../constants.js";
import DerivationToken from "../shared/DerivationToken.jsx";

/**
 * DotArray Component
 * Visual representation of multiplication using an array of dots.
 * Shows rows × cols arrangement of colored dots.
 *
 * `totals` (opt-in, default off — docs/wrong-answer-reveal-spec.md): labels a
 * running total (rows layout: down the right edge; columns layout: under
 * each column) — the skip count merged into the array, for the wrong-answer
 * reveal's picture. When false, the JSX is byte-identical to the
 * pre-existing render path, so the in-problem scaffold is unchanged.
 *
 * `layout` (phase 1c "tall arrays", derived internally from `cols < rows`,
 * not a prop): draws the array along the axis with room. A tall/thin fact
 * like 9x1 (9 rows of 1 dot) wastes the picture band's fixed height; drawn
 * as 9 single-dot-tall columns instead, it fills it. Ties (square facts)
 * stay rows — meaning is preserved either way ("a groups of b"). Applies to
 * both the `totals` and non-`totals` branches so the in-card Pictorial
 * scaffold and the reveal's picture are always the same shape.
 *
 * `finalToken` ("numeral" | "blank" | "correct", default "numeral"; only
 * meaningful with `totals`): how the array's FINAL running total renders —
 * a plain numeral, the yellow blank re-ask chip (same width, no layout
 * shift, via the shared DerivationToken), or green on a correct re-answer.
 * Used when the wrong-answer reveal folds its derivation line into the
 * picture (phase 1c) and the answer token moves onto the array itself.
 */
function DotArray({ rows, cols, opacity = 1, animate = false, totals = false, finalToken = "numeral" }) {
  // Scale dots to fit within mobile screens. Totals mode (the reveal's hero
  // picture, scaled to fit by the shared PictureSlot afterwards) uses a
  // fixed dot size/gap regardless of count (phase 1c) — the heuristic below
  // is for the in-card 1x scaffold only. Non-totals mode is unchanged.
  const total = rows * cols;
  const dotSize = totals ? 11 : (total > 80 ? 6 : total > 50 ? 7 : total > 30 ? 8 : cols > 8 ? 9 : 11);
  const gap = totals ? 4 : (total > 50 ? 3 : 4);
  // Orientation rule (phase 1c "tall arrays"): draw along the axis we have
  // room in. Ties (cols === rows, e.g. 9x9, 10x10) stay rows.
  const layout = cols < rows ? "columns" : "rows";

  let content;
  if (totals && layout === "columns") {
    // Columns totals: `rows` (a) groups side by side, each a vertical stack
    // of `cols` (b) dots; running total under each column, last one
    // emphasised (18px/700/ink; others 12px/#888, as the rows branch).
    // Uniform column pitch — wide enough for the widest INTERMEDIATE label
    // at 12px Space Mono (`String(total).length` ch) — so columns don't
    // jitter in width; the emphasised final label may overflow its cell
    // (overflow: visible), the container's 8px padding absorbs it (spec
    // "Columns-layout details").
    const pitch = `${String(total).length}ch`;
    content = Array.from({ length: rows }).map((_, g) => {
      const isLast = g === rows - 1;
      return (
        <div key={g} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: `${gap}px`, minWidth: pitch, fontFamily: "'Space Mono', monospace", fontSize: "12px" }}>
          {Array.from({ length: cols }).map((_, d) => (
            <div
              key={d}
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: "50%",
                backgroundColor: COLORS.pink,
                border: `1.5px solid ${COLORS.black}`,
                animation: animate ? `dotPop 0.3s ease ${(g * cols + d) * 15}ms both` : "none",
                flexShrink: 0,
              }}
            />
          ))}
          <div style={{
            marginTop: "4px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible",
            fontSize: isLast ? "18px" : "12px",
            fontWeight: isLast ? 700 : 400,
            color: isLast ? COLORS.black : "#888",
            lineHeight: isLast ? 1 : undefined,
            animation: animate ? `fadeSlideUp 0.3s ease ${(g * cols + cols - 1) * 15 + 100}ms both` : "none",
          }}>
            {isLast ? <DerivationToken value={(g + 1) * cols} state={finalToken} /> : (g + 1) * cols}
          </div>
        </div>
      );
    });
  } else if (totals) {
    // Rows totals — unchanged shape (running totals down the right edge),
    // plus finalToken on the last row's total (phase 1c "Fold the line").
    // Uniform row pitch: every row gets the same explicit height (max of
    // the dot size and a normal-label line box), overflow:visible, so
    // bumping the FINAL total's font size below doesn't grow that row's
    // box and throw off the vertical rhythm of the dots above it — the
    // bigger label centers in place on its row and is allowed to sit
    // tight against the row above rather than pushing the array taller
    // (docs/wrong-answer-reveal-spec.md, phase 1b follow-up).
    const rowHeight = Math.max(dotSize, 16);
    content = Array.from({ length: rows }).map((_, r) => {
      const isLast = r === rows - 1;
      return (
        <div key={r} style={{ display: "flex", alignItems: "center", gap: "6px", height: `${rowHeight}px`, overflow: "visible" }}>
          <div style={{ display: "flex", gap: `${gap}px` }}>
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
          <span style={{
            fontFamily: "'Space Mono', monospace",
            // Bumped (phase 1b polish, totals branch only) so the labels
            // stay legible at ≥12px even before the reveal's PictureSlot
            // scale-to-fill (min scale 1×) is applied. The FINAL total
            // is the answer — bumped further so it reads as the answer,
            // not just another running count in the sequence.
            fontSize: isLast ? "18px" : dotSize <= 7 ? "12px" : "13px",
            fontWeight: isLast ? 700 : 400,
            color: isLast ? COLORS.black : "#888",
            lineHeight: isLast ? 1 : undefined,
            minWidth: "2.4em",
            textAlign: "right",
            animation: animate ? `fadeSlideUp 0.3s ease ${(r * cols + cols - 1) * 15 + 100}ms both` : "none",
          }}>
            {isLast ? <DerivationToken value={(r + 1) * cols} state={finalToken} /> : (r + 1) * cols}
          </span>
        </div>
      );
    });
  } else if (layout === "columns") {
    // Non-totals columns: `rows` (a) groups side by side, each a vertical
    // stack of `cols` (b) dots — same shape as the totals picture above,
    // sans labels, so the in-card scaffold and the reveal's picture never
    // disagree (spec "Apply the orientation rule to both branches").
    content = Array.from({ length: rows }).map((_, g) => (
      <div key={g} style={{ display: "flex", flexDirection: "column", gap: `${gap}px` }}>
        {Array.from({ length: cols }).map((_, d) => (
          <div
            key={d}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              backgroundColor: COLORS.pink,
              border: `1.5px solid ${COLORS.black}`,
              animation: animate ? `dotPop 0.3s ease ${(g * cols + d) * 15}ms both` : "none",
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    ));
  } else {
    // Non-totals rows — the pre-existing render path (unchanged: same
    // dot markup, styles and animation delays as before phase 1c).
    content = Array.from({ length: rows }).map((_, r) => (
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
    ));
  }

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: layout === "columns" ? "row" : "column",
        // Columns layout: align every column's dot-stack to the same
        // baseline (all columns share the same dot count, cols === b, so
        // this is a no-op today — future-proofing only).
        alignItems: layout === "columns" ? "flex-end" : undefined,
        // Columns layout: a wider gap between groups so they read as
        // groups, not one continuous grid (spec "Columns-layout details").
        // Rows layout gap is unchanged.
        gap: layout === "columns" ? "9px" : `${gap}px`,
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
      {content}
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
