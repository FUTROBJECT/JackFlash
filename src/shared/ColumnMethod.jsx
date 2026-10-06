/**
 * ColumnMethod — the written column algorithm as an answer surface
 * (docs/add-spec.md §5, §11.5): ColumnGrid, ColumnPad, and the
 * ColumnAnswerInput that composes them for the practice card and the
 * wrong-answer reveal's re-ask.
 *
 * Design rules carried from the spec:
 *  - FIXED column count, so the answer row's length never leaks the answer
 *    (the grid never reveals whether 750 + 631 crosses 1,000).
 *  - Digits are entered RIGHT TO LEFT through an in-app pad — no <input>, no
 *    iOS keyboard. The cursor starts on the ones cell and moves left.
 *  - NO auto-submit, ever: Check is enabled only when the filled cells form
 *    one contiguous run ending at the ones cell.
 *  - Regroup marks are the written notation: optional, never scored, never
 *    logged, never persisted. They live in the caller's state; this file only
 *    draws them and offers the pure helpers that update them.
 *
 * Marks shape (shared with modules/add.jsx canonicalMarks):
 *   { carry: [grid idx…],  trades: [grid idx…] }
 *   carry  (addition)    — columns that show a small "1" in the mark margin.
 *   trades (subtraction) — each entry m = "trade from column m into column
 *                          m+1", in tap order. 5,003 → [0, 1, 2].
 * Grid index 0 is the leftmost column; the ones column is cols − 1.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { COLORS, MODULE_COLORS, BRUTAL_BORDER, BRUTAL_BORDER_SM, BRUTAL_SHADOW_SM } from "../constants.js";
import { PressButton } from "./barComponents.jsx";

const CELL_W = 52;
const GUTTER_W = 28;
const MINUS = "−";

const HEADS = { 3: ["H", "T", "O"], 4: ["Th", "H", "T", "O"] };

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
function digitsRA(n, cols) {
  const s = String(n).padStart(cols, "0");
  return Array.from({ length: cols }, (_, i) => Number(s[s.length - cols + i]));
}

// Operand cells: right-aligned, leading empties stay "" (blank cell).
function operandCells(n, cols) {
  const s = String(n).padStart(cols, " ");
  return Array.from({ length: cols }, (_, i) => {
    const ch = s[s.length - cols + i];
    return ch === " " ? "" : ch;
  });
}

export function emptyMarks() {
  return { carry: [], trades: [] };
}

export function marksPresent(marks) {
  return !!marks && ((marks.carry?.length || 0) > 0 || (marks.trades?.length || 0) > 0);
}

// Subtraction view of the marks: for each column the current top value
// (digit + 10 per trade received − 1 per trade given), how many times it
// lent, and how many times it received.
export function subMarksView(item, marks) {
  const A = digitsRA(item.a, item.columns);
  const lent = A.map(() => 0);
  const recv = A.map(() => 0);
  (marks?.trades || []).forEach((m) => {
    lent[m] += 1;
    if (m + 1 < A.length) recv[m + 1] += 1;
  });
  const cur = A.map((d, i) => d + 10 * recv[i] - lent[i]);
  return { A, lent, recv, cur };
}

// A tap on a top cell in Pictorial / Abstract (and in the re-ask).
//  addition    — toggles a carry "1" above the tapped column (any but ones).
//  subtraction — renames: allowed only if the tapped column's current value is
//                ≥ 1 and its right-hand neighbour's is < 10 (a renamed 10 can
//                be tapped again to pass a trade on).
export function applyTopTap(item, marks, idx) {
  if (idx >= item.columns - 1) return marks;
  if (item.op === "+") {
    const has = marks.carry.includes(idx);
    return { ...marks, carry: has ? marks.carry.filter((c) => c !== idx) : [...marks.carry, idx] };
  }
  const { cur } = subMarksView(item, marks);
  if (cur[idx] >= 1 && cur[idx + 1] < 10) return { ...marks, trades: [...marks.trades, idx] };
  return marks;
}

// Concrete: a chart trade at chart column `idx` mirrors into the marks — the
// carry "1" above the receiving column (addition: idx − 1), or the rename of
// the lending column (subtraction: idx).
export function mirrorChartTrade(item, marks, idx) {
  if (item.op === "+") {
    const target = idx - 1;
    if (target < 0 || marks.carry.includes(target)) return marks;
    return { ...marks, carry: [...marks.carry, target] };
  }
  return { ...marks, trades: [...marks.trades, idx] };
}


// ---------------------------------------------------------------------------
// ColumnGrid
// ---------------------------------------------------------------------------
const HEAD_STYLE = {
  fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
  color: "#888", textAlign: "center", lineHeight: "14px",
};

const MARK_CHIP = {
  display: "inline-block", minWidth: 14, padding: "0 3px", borderRadius: 4, lineHeight: "12px",
  backgroundColor: COLORS.yellow, color: COLORS.black, border: `1.5px solid ${COLORS.black}`,
  fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 11, boxSizing: "content-box",
};

const NOTICE_STYLE = {
  position: "absolute", top: -2, left: 0, right: 0, margin: "0 auto", width: "max-content", maxWidth: "100%",
  zIndex: 5, padding: "4px 10px", borderRadius: 8, textAlign: "center",
  border: BRUTAL_BORDER_SM, backgroundColor: COLORS.cream, color: COLORS.black,
  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, lineHeight: 1.3,
};

export function ColumnGrid({
  item,
  digits,            // answer cells, "" or a digit char
  active = null,     // active answer cell (grid idx) or null
  marks,
  marksInteractive = false,
  onCellTap = null,
  onTopTap = null,
  onUndoMarks = null,
  fill = null,       // cells to show instead of `digits` (second-miss / done)
  state = "input",   // "input" | "correct" | "missed"
  disabled = false,
  compact = false,   // short viewports: top 36 / bottom 32 / answer 44
  hintRow = true,    // show the hint / Undo row while marks are interactive
  reserveHintRow = false, // keep the row's 30px even when marks aren't interactive (no layout jump)
  tradeVerb = "regroup", // D1: the module's kid verb (modules/add.jsx REGROUP.verb)
  markNotice = null, // brief cream chip over the grid ("Nothing to regroup here")
}) {
  const cols = item.columns;
  const heads = HEADS[cols] || HEADS[4];
  const isAdd = item.op === "+";
  const topCells = operandCells(item.a, cols);
  const botCells = operandCells(item.b, cols);
  const view = isAdd ? null : subMarksView(item, marks);
  const shown = fill || digits;
  const hasMarks = marksPresent(marks);
  const topH = compact ? 36 : 44;
  const botH = compact ? 32 : 40;
  const answerH = compact ? 44 : 52;
  const operandFont = compact ? 24 : 26;
  const width = GUTTER_W + cols * CELL_W;
  // The cursor only exists while the child is typing (never on a done/missed fill).
  const cursorOn = state === "input" && !fill;

  const cellBg = (j) => {
    // Only filled cells take the fill colour (leading empties stay clear).
    if (state === "missed" && shown[j] !== "") return COLORS.yellow;
    if (state === "correct" && shown[j] !== "") return COLORS.green;
    return cursorOn && active === j ? COLORS.yellow : "transparent";
  };

  return (
    <div style={{ width, maxWidth: "100%", margin: "0 auto", textAlign: "left", position: "relative" }}>
      {markNotice && <div role="status" style={NOTICE_STYLE}>{markNotice}</div>}

      {(marksInteractive || reserveHintRow) && hintRow && (
        <div style={{ display: "flex", alignItems: "center", height: 30, marginBottom: 0 }}>
          {!marksInteractive ? null : hasMarks && onUndoMarks ? (
            <button
              type="button"
              onClick={onUndoMarks}
              aria-label="Undo marks"
              style={{
                minHeight: 44, minWidth: 44, margin: "-7px 0", padding: "0 6px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 11,
                color: COLORS.black, textDecoration: "underline", textAlign: "left",
              }}
            >
              ↶ Undo marks
            </button>
          ) : (
            <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 11, color: "#666", whiteSpace: "nowrap" }}>
              Tap a top digit to {tradeVerb}
            </span>
          )}
        </div>
      )}

      {/* Place headers */}
      <div style={{ display: "flex" }}>
        <div style={{ width: GUTTER_W }} />
        {heads.map((h, j) => (
          <div key={j} style={{ ...HEAD_STYLE, width: CELL_W }}>{h}</div>
        ))}
      </div>

      {/* Mark margin (16px) */}
      <div style={{ display: "flex", height: 16 }}>
        <div style={{ width: GUTTER_W }} />
        {Array.from({ length: cols }).map((_, j) => {
          let content = null;
          if (isAdd) {
            if (marks?.carry?.includes(j)) content = <span style={MARK_CHIP}>1</span>;
          } else if (view.lent[j] > 0) {
            content = <span style={MARK_CHIP}>{view.cur[j]}</span>;
          }
          return (
            <div key={j} style={{ width: CELL_W, textAlign: "center", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              {content}
            </div>
          );
        })}
      </div>

      {/* Top number row — the tap targets for marks (a <div> when not tappable) */}
      <div style={{ display: "flex" }}>
        <div style={{ width: GUTTER_W }} />
        {topCells.map((ch, j) => {
          // Addition: any column but ones. Subtraction: every column (a tap that
          // can't trade, including ones, gets the "Nothing to trade here" chip).
          const tappable = marksInteractive && !disabled && !!onTopTap && (j < cols - 1 || !isAdd);
          const lent = !isAdd && view.lent[j] > 0;
          const received = !isAdd && view.recv[j] > 0;
          const cellStyle = {
            position: "relative", width: CELL_W, height: topH, padding: 0, border: "none",
            background: "none", cursor: tappable ? "pointer" : "default",
            fontFamily: "'Shrikhand', cursive", fontSize: operandFont, color: COLORS.black,
            lineHeight: `${topH}px`, textAlign: "center",
          };
          const inner = (
            <>
              {received && (
                // The "1" that makes 3 into 13 / 0 into 10. Tucked into the cell's
                // top-left corner so it never sits on the digit.
                <span style={{
                  position: "absolute", left: 1, top: 1, fontFamily: "'Space Mono', monospace",
                  fontWeight: 700, fontSize: 11, lineHeight: "11px", color: COLORS.black,
                  backgroundColor: COLORS.yellow, border: `1.5px solid ${COLORS.black}`,
                  borderRadius: 4, padding: "0 3px",
                }}>
                  1
                </span>
              )}
              <span style={lent ? { textDecoration: "line-through", textDecorationThickness: 3 } : undefined}>
                {ch}
              </span>
            </>
          );
          const label = `Top number, column ${heads[j]}${ch !== "" ? `, ${ch}` : ", empty"}`;
          return tappable ? (
            <button key={j} type="button" onClick={() => onTopTap(j)} aria-label={label} style={cellStyle}>
              {inner}
            </button>
          ) : (
            <div key={j} aria-label={label} style={cellStyle}>{inner}</div>
          );
        })}
      </div>

      {/* Operator + bottom number row */}
      <div style={{ display: "flex", height: botH, alignItems: "center" }}>
        <div style={{
          width: GUTTER_W, textAlign: "center", fontFamily: "'Space Mono', monospace",
          fontWeight: 700, fontSize: 24, color: MODULE_COLORS.add,
        }}>
          {isAdd ? "+" : MINUS}
        </div>
        {botCells.map((ch, j) => (
          <div key={j} style={{
            width: CELL_W, textAlign: "center", fontFamily: "'Shrikhand', cursive", fontSize: operandFont,
            color: COLORS.black, lineHeight: `${botH}px`,
          }}>
            {ch}
          </div>
        ))}
      </div>

      {/* 4px ink rule */}
      <div style={{ height: 4, backgroundColor: COLORS.black, borderRadius: 2 }} />

      {/* Answer row. The underline is an absolutely positioned bar so the digit
          never moves when a cell becomes active (the bar thickens, the box doesn't). */}
      <div style={{ display: "flex", marginTop: 4 }}>
        <div style={{ width: GUTTER_W }} />
        {Array.from({ length: cols }).map((_, j) => {
          const isActive = cursorOn && active === j && !disabled;
          const editableCell = !disabled && !fill && !!onCellTap;
          const cellStyle = {
            position: "relative", width: CELL_W, height: answerH, padding: 0, margin: 0, boxSizing: "border-box",
            border: "none", backgroundColor: cellBg(j), cursor: editableCell ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Shrikhand', cursive", fontSize: 30, lineHeight: 1, color: COLORS.black,
            paddingBottom: 6,
            animation: state === "correct" && shown[j] !== "" ? "correctPulse 0.4s ease" : "none",
          };
          const bar = (
            <span aria-hidden style={{
              position: "absolute", left: 0, right: 0, bottom: 0, height: isActive ? 8 : 4, backgroundColor: COLORS.black,
            }} />
          );
          const label = `Answer, column ${heads[j]}${shown[j] ? `, ${shown[j]}` : ", empty"}`;
          return editableCell ? (
            <button key={j} type="button" onClick={() => onCellTap(j)} aria-label={label} style={cellStyle}>
              {shown[j] || ""}{bar}
            </button>
          ) : (
            <div key={j} aria-label={label} style={cellStyle}>{shown[j] || ""}{bar}</div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColumnPad — in-app digit pad. 5 columns: 1–5, 6–9 & 0, then ⌫ (2 units) and
// Check (3 units). Keys ≥ 47px wide at 320, 48px tall (44 compact), 6px gaps (4 compact).
// ---------------------------------------------------------------------------
const KEY_STYLE = {
  borderRadius: 8, border: BRUTAL_BORDER_SM, backgroundColor: "white", color: COLORS.black,
  boxShadow: BRUTAL_SHADOW_SM, cursor: "pointer", padding: 0,
  fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 22,
};

export function ColumnPad({ onDigit, onBack, onCheck, checkEnabled, disabled = false, compact = false }) {
  const keyH = compact ? 44 : 48;
  const dim = disabled ? { opacity: 0.4, cursor: "default" } : null;
  const digitKey = (d) => (
    <PressButton
      key={d}
      disabled={disabled}
      onClick={() => onDigit(d)}
      aria-label={`${d}`}
      style={{ ...KEY_STYLE, minHeight: keyH, ...dim }}
    >
      {d}
    </PressButton>
  );
  const checkOff = disabled || !checkEnabled;
  return (
    <div data-jf-pad style={{
      display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: compact ? 4 : 6,
      width: "100%", maxWidth: 340, margin: "0 auto",
    }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(digitKey)}
      <PressButton
        disabled={disabled}
        onClick={onBack}
        aria-label="Backspace"
        style={{ ...KEY_STYLE, gridColumn: "span 2", minHeight: keyH, ...dim }}
      >
        ⌫
      </PressButton>
      <PressButton
        disabled={checkOff}
        onClick={onCheck}
        aria-label="Check"
        style={{
          ...KEY_STYLE, gridColumn: "span 3", minHeight: keyH, backgroundColor: COLORS.yellow,
          fontSize: 18, opacity: checkOff ? 0.45 : 1, cursor: checkOff ? "default" : "pointer",
        }}
      >
        Check
      </PressButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColumnAnswerInput — grid + pad. Holds the answer cells and the cursor as
// LOCAL state (remount via `key` — the retryResetKey pattern — to clear them);
// the marks are the caller's, so they survive a converted "not sure".
//
//   live    — the pad/cells accept input and the hardware-key listener is on.
//             Only ONE live instance may exist at a time (the card's grid is
//             not live while the reveal is open).
//   sticky  — the pad sticks to the bottom of the viewport (the practice
//             card): it renders as the LAST child of its parent, so the parent
//             must end with this component. Sticky mode also keeps the answer
//             row clear of the pad: it measures the pad and the sticky header
//             (`headerRef`) and scrolls the minimum amount to bring the answer
//             row's bottom just above the pad — on load and whenever the chart
//             (`getClampEl()`) changes height — but never so far that the chart
//             (or, after typing, the grid) slides under the header. No
//             hard-coded inset numbers: safe-area insets are measured for free.
//   fill    — cells to display instead (second-miss fill / correct re-answer);
//             disables editing. `state` colours them ("missed" yellow,
//             "correct" green). `fillMarks` (with state "missed") replaces
//             `marks` so the worked algorithm is visible.
// ---------------------------------------------------------------------------
export function ColumnAnswerInput({
  item, marks, marksInteractive = false, onTopTap = null, onUndoMarks = null,
  onSubmit, live = true, sticky = false, state = "input", fill = null, fillMarks = null,
  compact = false, hintRow = true, reserveHintRow = false, tradeVerb = "regroup",
  markNotice = null, headerRef = null, getClampEl = null,
}) {
  const cols = item.columns;
  const [st, setSt] = useState(() => ({ digits: Array(cols).fill(""), active: cols - 1 }));
  const editable = live && !fill;

  // Length of the contiguous filled run ending at the ones cell.
  let run = 0;
  for (let i = cols - 1; i >= 0 && st.digits[i] !== ""; i--) run += 1;
  const filledCount = st.digits.filter((d) => d !== "").length;
  const checkEnabled = editable && run > 0 && filledCount === run;

  const pressDigit = (d) => {
    if (!editable) return;
    setSt((s) => {
      const digits = [...s.digits];
      digits[s.active] = String(d);
      return { digits, active: Math.max(0, s.active - 1) };
    });
  };
  const pressBack = () => {
    if (!editable) return;
    setSt((s) => {
      const digits = [...s.digits];
      if (digits[s.active] !== "") {
        digits[s.active] = "";
        return { digits, active: s.active };
      }
      if (s.active < cols - 1) {
        const na = s.active + 1;
        digits[na] = "";
        return { digits, active: na };
      }
      return s;
    });
  };
  const pressCheck = () => {
    if (!checkEnabled) return;
    onSubmit(st.digits.slice());
  };
  const tapCell = (j) => { if (editable) setSt((s) => ({ ...s, active: j })); };

  // Hardware keys (desktop QA, iPad keyboards): digits, Backspace, Enter.
  // Handlers are read through a ref so the listener attaches once per `editable`.
  // A key aimed at a text field is left alone; Enter aimed at a button outside
  // the pad (Show me, Start over…) is left to activate that button.
  const handlersRef = useRef({});
  handlersRef.current = { pressDigit, pressBack, pressCheck };
  useEffect(() => {
    if (!editable) return undefined;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const h = handlersRef.current;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); h.pressDigit(Number(e.key)); }
      else if (e.key === "Backspace") { e.preventDefault(); h.pressBack(); }
      else if (e.key === "Enter") {
        const btn = t && t.closest ? t.closest("button") : null;
        if (btn && !btn.closest("[data-jf-pad]")) return;
        e.preventDefault();
        h.pressCheck();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable]);

  // ---- Sticky pad: keep the answer row above the pad (measured, not hard-coded).
  const gridWrapRef = useRef(null);
  const padWrapRef = useRef(null);
  const alignGrid = useCallback((clampToChart, behavior) => {
    const grid = gridWrapRef.current;
    const pad = padWrapRef.current;
    if (!grid || !pad) return;
    const headerBottom = headerRef?.current ? headerRef.current.getBoundingClientRect().bottom : 0;
    const g = grid.getBoundingClientRect();
    const padTop = pad.getBoundingClientRect().top;
    const needed = g.bottom - (padTop - 4); // px to scroll so the answer row clears the pad
    if (needed <= 1) return;
    const clampEl = clampToChart && getClampEl ? getClampEl() : null;
    const topEdge = clampEl ? clampEl.getBoundingClientRect().top : g.top;
    const room = topEdge - (headerBottom + 8); // how far up that edge may travel
    const delta = Math.min(needed, room);
    if (delta > 1) window.scrollBy({ top: delta, behavior });
  }, [headerRef, getClampEl]);

  const typedKey = st.digits.join("|");
  const hasTyped = !/^\|*$/.test(typedKey);
  useEffect(() => {
    if (!sticky || !editable || !hasTyped) return;
    alignGrid(false, "smooth"); // after the first digit: the grid itself may take priority over the chart
  }, [typedKey, sticky, editable, hasTyped, alignGrid]);

  useEffect(() => {
    if (!sticky || !editable) return undefined;
    // On load (after the screen's own scroll-to-top and the card's entrance
    // animation settle) and whenever the chart changes height.
    const t = setTimeout(() => alignGrid(true, "auto"), 450);
    let ro = null;
    const el = getClampEl ? getClampEl() : null;
    if (el && typeof ResizeObserver !== "undefined") {
      let raf = 0;
      ro = new ResizeObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => alignGrid(true, "auto"));
      });
      ro.observe(el);
    }
    return () => { clearTimeout(t); if (ro) ro.disconnect(); };
  }, [sticky, editable, alignGrid, getClampEl]);

  const shownMarks = state === "missed" && fillMarks ? fillMarks : marks;
  const padWrapStyle = sticky ? {
    position: "sticky", bottom: 0, zIndex: 40, marginTop: 12, backgroundColor: "white",
    borderTop: BRUTAL_BORDER, paddingTop: 8,
    paddingBottom: "calc(8px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))",
  } : { marginTop: compact ? 6 : 12 };

  return (
    <>
      <div ref={gridWrapRef} style={{ marginTop: compact ? 4 : 12 }}>
        <ColumnGrid
          item={item}
          digits={st.digits}
          active={editable ? st.active : null}
          marks={shownMarks || emptyMarks()}
          marksInteractive={marksInteractive && !fill}
          onCellTap={tapCell}
          onTopTap={onTopTap}
          onUndoMarks={onUndoMarks}
          fill={fill}
          state={state}
          disabled={!editable}
          compact={compact}
          hintRow={hintRow}
          reserveHintRow={reserveHintRow}
          tradeVerb={tradeVerb}
          markNotice={markNotice}
        />
      </div>
      <div ref={padWrapRef} style={padWrapStyle}>
        <ColumnPad
          onDigit={pressDigit}
          onBack={pressBack}
          onCheck={pressCheck}
          checkEnabled={checkEnabled}
          disabled={!editable}
          compact={compact}
        />
      </div>
    </>
  );
}
