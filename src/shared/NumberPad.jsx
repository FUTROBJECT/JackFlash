/**
 * NumberPad — the in-app answer surface for every typed number outside the
 * column method (docs/number-pad-everywhere.md): NumberAnswer (one number; also
 * split into NumberDisplay + NumberPadBar) and FractionAnswer (stacked numerator / denominator).
 *
 * Why: the iOS system number keyboard covers the bottom ~40% of the screen —
 * the story, the picture and Check vanish behind it. So no practice or reveal
 * screen renders an <input> any more: the answer is a non-focusable display box
 * and the keys are ColumnPad (the same pad the column method uses, so the whole
 * app has one keypad). The caller keeps its own answer STATE and handlers —
 * these components just write the same digit strings the <input> used to.
 *
 * Shape (both components render a fragment, like ColumnAnswerInput):
 *   [ answer display ]   [ pad ]
 * so in `sticky` mode (the practice card) the component must be the LAST child
 * of the card: the pad is position: sticky to the viewport bottom inside it.
 * Sticky mode also keeps the answer display clear of the pad by scrolling the
 * minimum amount (measured — see useStickyAlign), never so far that the
 * question/picture (`getClampEl()`) slides under the sticky header (`headerRef`).
 *
 * Only ONE live instance may exist at a time (the card's is not live while the
 * reveal is open): the hardware-key listener is global while `live`.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { COLORS, BRUTAL_BORDER, BRUTAL_BORDER_SM } from "../constants.js";
import { ColumnPad } from "./ColumnMethod.jsx";

// ---------------------------------------------------------------------------
// Hardware keys (desktop QA, iPad keyboards): digits, Backspace, Enter → Check.
// Same rules as ColumnAnswerInput: a key aimed at a text field is left alone;
// Enter aimed at a button outside the pad (Show me…) activates that button.
// Handlers are read through a ref so the listener attaches once per `live`.
// ---------------------------------------------------------------------------
function useHardwareKeys(live, handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!live) return undefined;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const h = ref.current;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); h.digit(Number(e.key)); }
      else if (e.key === "Backspace") { e.preventDefault(); h.back(); }
      else if (e.key === "Enter") {
        if (e.repeat) return;
        const btn = t && t.closest ? t.closest("button") : null;
        if (btn && !btn.closest("[data-jf-pad]")) return;
        e.preventDefault();
        h.check();
      }
      // Two-box fractions: Tab, "/" or ↓ go to the denominator, ↑ back up.
      else if (h.next && (e.key === "Tab" || e.key === "/" || e.key === "ArrowDown")) { e.preventDefault(); h.next(); }
      else if (h.prev && e.key === "ArrowUp") { e.preventDefault(); h.prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live]);
}

// ---------------------------------------------------------------------------
// Sticky alignment — ColumnAnswerInput's alignGrid, for a single display box:
// scroll just enough that the display's bottom clears the pad, clamped so the
// question/picture's top never travels above the header. On load (after the
// screen's own scroll-to-top and the card's entrance animation settle) and
// whenever the clamp element changes height.
// ---------------------------------------------------------------------------
function useStickyAlign({ enabled, displayRef, padRef, headerRef, getClampEl, typed = "" }) {
  // clampToQuestion: on load, never scroll the question/picture top under the
  // header. Once the child has typed, the answer box takes priority (same rule
  // as ColumnAnswerInput's grid): on a short screen it must not stay behind the
  // pad while he types blind (375×667: Place Value X1/C3).
  const align = useCallback((behavior, clampToQuestion = true) => {
    const disp = displayRef.current;
    const pad = padRef.current;
    if (!disp || !pad) return;
    const headerBottom = headerRef?.current ? headerRef.current.getBoundingClientRect().bottom : 0;
    const d = disp.getBoundingClientRect();
    const padTop = pad.getBoundingClientRect().top;
    const needed = d.bottom - (padTop - 4);
    if (needed <= 1) return;
    const clampEl = clampToQuestion && getClampEl ? getClampEl() : null;
    const topEdge = clampEl ? clampEl.getBoundingClientRect().top : d.top;
    const room = topEdge - (headerBottom + 8);
    const delta = Math.min(needed, room);
    if (delta > 1) window.scrollBy({ top: delta, behavior });
  }, [displayRef, padRef, headerRef, getClampEl]);

  useEffect(() => {
    if (!enabled || typed === "") return;
    // Instant, not smooth: smooth scrolling is skipped by some WebViews / under
    // Reduce Motion, and this runs once (the first digit), so a jump is fine.
    align("auto", false);
  }, [typed, enabled, align]);

  useEffect(() => {
    if (!enabled) return undefined;
    const t = setTimeout(() => align("auto"), 450);
    let ro = null;
    const el = getClampEl ? getClampEl() : null;
    if (el && typeof ResizeObserver !== "undefined") {
      let raf = 0;
      ro = new ResizeObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => align("auto"));
      });
      ro.observe(el);
    }
    return () => { clearTimeout(t); if (ro) ro.disconnect(); };
  }, [enabled, align, getClampEl]);
}

function padWrapStyle(sticky, compact) {
  return sticky ? {
    position: "sticky", bottom: 0, zIndex: 40, marginTop: 8, backgroundColor: "white",
    borderTop: BRUTAL_BORDER, paddingTop: 8,
    paddingBottom: "calc(8px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))",
  } : { marginTop: compact ? 6 : 12 };
}

// Blinking caret (.jfCaret in animations.css, which also stops the blink under
// Reduce Motion). Shown only while the box is live.
function Caret({ height }) {
  return (
    <span aria-hidden className="jfCaret" style={{
      display: "inline-block", width: 3, height, marginLeft: 2, backgroundColor: COLORS.black,
      borderRadius: 1, flex: "none",
    }} />
  );
}

// Append a digit, respecting the cap; a lone "0" is replaced rather than padded.
function appendDigit(value, d, maxDigits) {
  const v = value ?? "";
  if (v === "0") return d === 0 ? v : String(d);
  if (v.length >= maxDigits) return v;
  return v + String(d);
}

// ---------------------------------------------------------------------------
// NumberAnswer — one number: NumberDisplay + NumberPadBar in one fragment.
//   value / onChange(next) / onSubmit()  the caller's own string state
//   maxDigits  cap (default 5)
//   live       accepts input (default true)
//   sticky     pad sticks to the viewport bottom — must be the card's LAST child
//   compact    reveal re-ask: tighter gaps
//   state      "input" | "correct" | "missed" — green / yellow fill
//   displayStyle  overrides for the answer box so each module keeps its look
//              (defaults are Place Value's / Add's: big Shrikhand over a 4px underline)
//   headerRef / getClampEl  sticky scroll alignment (see top of file)
//   top        space above the display (default 16; 4 compact)
// A card whose answer box sits mid-card (Multiply: under the equation) renders
// NumberDisplay where the box belongs and NumberPadBar as the card's last child,
// handing the pad bar the display's wrapper via `displayRef`.
// ---------------------------------------------------------------------------
export function NumberDisplay({ value, live = true, state = "input", displayStyle = null }) {
  const v = value ?? "";
  const fontSize = displayStyle?.fontSize ?? 48;
  const caretH = typeof fontSize === "number" ? `${fontSize * 0.8}px` : "0.8em";
  const stateBg = state === "correct" ? COLORS.green : state === "missed" ? COLORS.yellow : null;
  const boxStyle = {
    boxSizing: "border-box", width: 160, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Shrikhand', cursive", fontSize: 48, fontWeight: 400, lineHeight: 1.15, textAlign: "center",
    borderBottom: `4px solid ${COLORS.black}`, backgroundColor: "transparent", color: COLORS.black,
    padding: "4px 0", animation: state === "correct" ? "correctPulse 0.4s ease" : "none",
    transition: "background-color 0.3s ease",
    ...displayStyle,
    ...(stateBg ? { backgroundColor: stateBg } : null),
  };
  return (
    <div role="textbox" aria-readonly="true" aria-label="Answer" style={boxStyle}>
      {v === "" ? (
        <>
          {live && <Caret height={caretH} />}
          <span style={{ opacity: 0.3 }}>?</span>
        </>
      ) : (
        <>
          <span>{v}</span>
          {live && <Caret height={caretH} />}
        </>
      )}
    </div>
  );
}

export function NumberPadBar({
  value, onChange, onSubmit, maxDigits = 5, live = true, sticky = false, compact = false,
  headerRef = null, getClampEl = null, displayRef = null,
}) {
  const v = value ?? "";
  const checkEnabled = live && v !== "";
  const pressDigit = (d) => { if (live) onChange(appendDigit(v, d, maxDigits)); };
  const pressBack = () => { if (live && v !== "") onChange(v.slice(0, -1)); };
  const pressCheck = () => { if (checkEnabled) onSubmit(); };
  useHardwareKeys(live, { digit: pressDigit, back: pressBack, check: pressCheck });

  const padRef = useRef(null);
  useStickyAlign({ enabled: sticky && live, displayRef, padRef, headerRef, getClampEl, typed: v });

  return (
    <div ref={padRef} style={padWrapStyle(sticky, compact)}>
      <ColumnPad
        onDigit={pressDigit} onBack={pressBack} onCheck={pressCheck}
        checkEnabled={checkEnabled} disabled={!live} compact={compact}
      />
    </div>
  );
}

export function NumberAnswer({
  value, onChange, onSubmit, maxDigits = 5, live = true, sticky = false,
  compact = false, state = "input", displayStyle = null, headerRef = null,
  getClampEl = null, top = null,
}) {
  const displayRef = useRef(null);
  return (
    <>
      <div ref={displayRef} style={{ display: "flex", justifyContent: "center", marginTop: top ?? (compact ? 4 : 16) }}>
        <NumberDisplay value={value} live={live} state={state} displayStyle={displayStyle} />
      </div>
      <NumberPadBar
        value={value} onChange={onChange} onSubmit={onSubmit} maxDigits={maxDigits}
        live={live} sticky={sticky} compact={compact}
        headerRef={headerRef} getClampEl={getClampEl} displayRef={displayRef}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// FractionAnswer — stacked numerator / denominator over a vinculum. Two display
// boxes, one ACTIVE at a time (yellow fill + ink border); it starts on the
// numerator, tapping a box makes it active, digits go to the active box. No
// auto-advance (numerators can be two digits). ⌫ deletes from the active box
// and, when that box is already empty, moves the cursor to the numerator.
// Check needs both boxes non-empty. Remount with a new `key` to reset the
// cursor to the numerator.
//   fieldWidth / fieldFontSize / dense  visual size (reveal: 90 / 28 / dense)
//   state      "input" | "correct" | "missed" — fill colour of both boxes
// Other props as NumberAnswer; maxDigits defaults to 2.
// ---------------------------------------------------------------------------
export function FractionAnswer({
  numVal, denVal, onNumChange, onDenChange, onSubmit, maxDigits = 2, live = true,
  sticky = false, compact = false, state = "input", fieldWidth = 110, fieldFontSize = 42,
  dense = false, headerRef = null, getClampEl = null, top = null,
}) {
  const [active, setActive] = useState("n");
  const n = numVal ?? "";
  const d = denVal ?? "";
  const checkEnabled = live && n !== "" && d !== "";

  const pressDigit = (k) => {
    if (!live) return;
    if (active === "n") onNumChange(appendDigit(n, k, maxDigits));
    else onDenChange(appendDigit(d, k, maxDigits));
  };
  const pressBack = () => {
    if (!live) return;
    if (active === "n") { if (n !== "") onNumChange(n.slice(0, -1)); }
    else if (d !== "") onDenChange(d.slice(0, -1));
    else setActive("n");
  };
  // Hardware Enter: with only the top filled, it moves down instead of doing nothing.
  const pressCheck = () => {
    if (checkEnabled) onSubmit();
    else if (active === "n" && n !== "" && d === "") setActive("d");
  };
  useHardwareKeys(live, {
    digit: pressDigit, back: pressBack, check: pressCheck,
    next: () => setActive("d"), prev: () => setActive("n"),
  });

  const displayRef = useRef(null);
  const padRef = useRef(null);
  useStickyAlign({ enabled: sticky && live, displayRef, padRef, headerRef, getClampEl, typed: n || d ? `${n}/${d}` : "" });

  const stateBg = state === "correct" ? COLORS.green : state === "missed" ? COLORS.yellow : null;
  const box = (which, text, label) => {
    const isActive = live && active === which;
    return (
      <div
        role="textbox" aria-readonly="true" aria-label={label}
        onClick={() => { if (live) setActive(which); }}
        style={{
          boxSizing: "border-box", width: fieldWidth, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Shrikhand', cursive", fontSize: fieldFontSize, fontWeight: 400,
          lineHeight: dense ? 1.15 : 1.2, padding: dense ? "0" : "4px 0", color: COLORS.black,
          borderRadius: 6, cursor: live ? "pointer" : "default",
          // Inactive box while live: a faint dashed outline says "tap me" (no token
          // covers an inactive state; solid ink is reserved for the active box).
          border: isActive ? BRUTAL_BORDER_SM : live ? "2.5px dashed rgba(26,26,26,0.4)" : "2.5px solid transparent",
          backgroundColor: stateBg || (isActive ? COLORS.yellow : "transparent"),
          animation: state === "correct" ? "correctPulse 0.4s ease" : "none",
          transition: "background-color 0.3s ease",
        }}
      >
        {text === "" ? (
          <>
            {isActive && <Caret height={`${fieldFontSize * 0.8}px`} />}
            <span style={{ opacity: 0.3 }}>?</span>
          </>
        ) : (
          <>
            <span>{text}</span>
            {isActive && <Caret height={`${fieldFontSize * 0.8}px`} />}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <div ref={displayRef} style={{ display: "flex", justifyContent: "center", marginTop: top ?? (compact ? 4 : 16) }}>
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: dense ? 0 : 2 }}>
          {box("n", n, "Numerator")}
          <div style={{ width: fieldWidth * 0.87, height: 4, backgroundColor: COLORS.black, borderRadius: 2 }} />
          {box("d", d, "Denominator")}
        </div>
      </div>
      <div ref={padRef} style={padWrapStyle(sticky, compact)}>
        <ColumnPad
          onDigit={pressDigit} onBack={pressBack} onCheck={pressCheck}
          checkEnabled={checkEnabled} disabled={!live} compact={compact}
        />
      </div>
    </>
  );
}
