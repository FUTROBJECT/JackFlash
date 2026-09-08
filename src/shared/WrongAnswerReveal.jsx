import { useEffect, useRef, useState } from "react";
import { COLORS } from "../constants.js";

/**
 * WrongAnswerReveal — presentational full-screen overlay shell for the
 * "Not yet" wrong-answer teaching moment (docs/wrong-answer-reveal-spec.md).
 *
 * Pure shell: owns the fixed layer, the one-screen grid, the entrance
 * animation, the focus trap, Escape/scrim no-ops, delayed autofocus of the
 * input slot, and the picture's scale-to-fill. It has NO knowledge of facts,
 * mastery, or evaluation — all of that (and the retry state machine) lives
 * in the practice screen. Content is supplied entirely via named slots.
 *
 * Slots: header, problem, picture, line, extra (divide's partner chip),
 * prompt, input. `open` mounts/unmounts the layer; `focusDelayMs` controls
 * when the input slot receives focus (spec: ~600ms after the picture
 * finishes building, so the keyboard doesn't cover the animation).
 */
export default function WrongAnswerReveal({
  open,
  header,
  problem = null,
  picture,
  line = null,
  extra = null,
  prompt = null,
  input,
  focusDelayMs = 1000,
}) {
  const containerRef = useRef(null);

  // On open: make sure no element outside the reveal holds focus (the
  // underlying card's own input isn't disabled while feedback === "incorrect"),
  // then — after focusDelayMs — move focus into the input slot once it exists.
  // The input slot renders disabled until the re-ask opens (revealStage >= 2,
  // owned by the practice screen) — a single fire-and-forget attempt could
  // land before the input is enabled/mounted and never retry (measured:
  // activeElement still wasn't the input at 1.5s/2.7s). Poll for an enabled
  // input for a bounded window instead of one shot.
  useEffect(() => {
    if (!open) return undefined;
    const active = document.activeElement;
    if (active && containerRef.current && !containerRef.current.contains(active) && typeof active.blur === "function") {
      active.blur();
    }
    let cancelled = false;
    const timers = [];
    const tryFocus = (attemptsLeft) => {
      if (cancelled) return;
      const el = containerRef.current?.querySelector("input:not(:disabled)");
      if (el) {
        el.focus({ preventScroll: true });
        if (document.activeElement !== el && attemptsLeft > 0) {
          timers.push(setTimeout(() => tryFocus(attemptsLeft - 1), 150));
        }
        return;
      }
      if (attemptsLeft > 0) {
        timers.push(setTimeout(() => tryFocus(attemptsLeft - 1), 150));
      }
    };
    timers.push(setTimeout(() => tryFocus(6), focusDelayMs));
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [open, focusDelayMs]);

  // R5 — no escape hatch: Escape is swallowed, Tab is trapped inside.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.disabled && el.offsetParent !== null);
      if (focusable.length === 0) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!container.contains(document.activeElement)) {
        // Focus somehow escaped (or hasn't landed yet) — pull it back in.
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  // Belt-and-braces for R2 (never scroll): the grid itself is sized to fit,
  // but lock background scroll too — iOS can still rubber-band the page
  // behind a fixed layer.
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="How to solve it"
      onClick={(e) => e.stopPropagation()} // scrim no-op — there is nothing "outside" to dismiss to
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900, // below AchievementPopup's 1000
        background: COLORS.cream,
        display: "grid",
        // R2: top-anchor the stack and cap the picture band (≤150px) instead
        // of letting it absorb all slack via 1fr — that pinned the derivation
        // line/prompt/input to the bottom of the screen, exactly where the
        // iOS number keyboard covers them (measured: input top ≈690px at
        // 375×812 with the keyboard up).
        gridTemplateRows: "auto minmax(0, min(150px, 24dvh)) auto auto auto",
        alignContent: "start",
        rowGap: "12px",
        height: "100dvh",
        overflow: "hidden",
        padding: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + clamp(8px, 3vw, 16px)) clamp(12px, 4vw, 20px) clamp(8px, 3vw, 16px)",
        boxSizing: "border-box",
        fontFamily: "'Space Grotesk', sans-serif",
        animation: "cardRiseIn 0.3s ease both",
      }}
    >
      {/* Header: rotating "Not yet…" line + the restated problem */}
      <div style={{ textAlign: "center", minHeight: 0 }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: "clamp(13px, 4vw, 15px)", fontWeight: 700,
          color: COLORS.black,
        }}>
          {header}
        </div>
        {problem && (
          <div style={{ marginTop: 2, fontFamily: "'Shrikhand', cursive", fontSize: "clamp(18px, 5.5vw, 22px)", color: COLORS.black }}>
            {problem}
          </div>
        )}
      </div>

      {/* Picture — scale-to-fill measuring wrapper */}
      <PictureSlot>{picture}</PictureSlot>

      {/* Derivation line + (divide) partner chip */}
      <div style={{ textAlign: "center" }}>
        {line && (
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "clamp(13px, 4vw, 15px)", fontWeight: 700,
            color: COLORS.black, lineHeight: 1.3,
          }}>
            {line}
          </div>
        )}
        {extra && (
          <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
            {extra}
          </div>
        )}
      </div>

      {/* Re-ask prompt */}
      <div style={{ textAlign: "center", minHeight: 16 }}>
        {prompt && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, opacity: 0.7 }}>
            {prompt}
          </div>
        )}
      </div>

      {/* Input slot */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {input}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PictureSlot — a legibility fix, not a fitting one (spec "Picture fit").
// Measures the slot's available box and the picture's own unscaled natural
// size, then scales UP (never down, never past the slot) so a tiny DotArray
// or BarModel reads as a hero visual instead of a postage stamp. Scales the
// shipped component via CSS transform — never restyles it.
// ---------------------------------------------------------------------------
function PictureSlot({ children }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof ResizeObserver === "undefined") return undefined;
    const recompute = () => {
      const slotW = outer.clientWidth;
      const slotH = outer.clientHeight;
      // offsetWidth/Height are layout-box measurements — unaffected by the
      // CSS transform we apply below, so they stay "natural" at any scale.
      const naturalW = inner.offsetWidth;
      const naturalH = inner.offsetHeight;
      if (!slotW || !slotH || !naturalW || !naturalH) return;
      const k = Math.min(2.5, Math.max(1, Math.min(slotW / naturalW, slotH / naturalH)));
      setScale(k);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div ref={outerRef} style={{
      width: "100%", height: "100%", minHeight: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      <div ref={innerRef} style={{ display: "inline-block", transform: `scale(${scale})`, transformOrigin: "center" }}>
        {children}
      </div>
    </div>
  );
}
