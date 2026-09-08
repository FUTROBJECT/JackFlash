import { useEffect, useRef, useState } from "react";
import { COLORS, BRUTAL_BORDER, BRUTAL_SHADOW } from "../constants.js";

// Same ground the practice screen paints behind its card (reused verbatim —
// docs/wrong-answer-reveal-spec.md "phase 1b: The frame" — so the reveal
// reads as the practice screen taken over, not a different screen).
const PAGE_BACKGROUND = `repeating-linear-gradient(0deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), repeating-linear-gradient(90deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px), ${COLORS.bg}`;

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
        // Same ground as the practice screen — no dark scrim, this is a
        // lesson card taking over the card that was already there.
        background: PAGE_BACKGROUND,
        height: "100dvh",
        overflow: "hidden",
        boxSizing: "border-box",
        // Top offset is the keyboard-budget one (~16px), not the practice
        // card's own top (~175px, under the sticky header): R2's fit-with-
        // keyboard-up budget wins over phase 1b's "no jump" framing — the
        // header is gone during the takeover, and the card rises into place
        // instead (docs/wrong-answer-reveal-spec.md, phase 1b).
        padding: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + clamp(8px, 3vw, 16px)) clamp(12px, 4vw, 20px) clamp(8px, 3vw, 16px)",
        fontFamily: "'Space Grotesk', sans-serif",
        color: COLORS.black,
      }}
    >
      {/* Centered column matches the practice page's own maxWidth/margin
          (multiplication-practice.jsx ~L717), so the card sits exactly
          where the practice card sat. */}
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        {/* The one white card — same frame tokens as the practice card
            (multiplication-practice.jsx ~L1027-1029): BRUTAL_BORDER,
            BRUTAL_SHADOW, 14px radius. Height auto — never scrolls
            internally; the grid rows below are what R2's budget governs. */}
        <div className="cardRise" style={{
          backgroundColor: "white",
          border: BRUTAL_BORDER,
          boxShadow: BRUTAL_SHADOW,
          borderRadius: "14px",
          padding: "clamp(14px, 4vw, 20px)",
          boxSizing: "border-box",
          display: "grid",
          // R2: top-anchor the stack and cap the picture band instead of
          // letting it absorb all slack via 1fr — that pinned the derivation
          // line/prompt/input to the bottom of the screen, exactly where the
          // iOS number keyboard covers them (measured: input top ≈690px at
          // 375×812 with the keyboard up). Cap lowered to 120px/20dvh in
          // phase 1b to make room for the bigger type.
          gridTemplateRows: "auto minmax(0, min(120px, 20dvh)) auto auto auto",
          alignContent: "start",
          rowGap: "10px",
          height: "auto",
          // Entrance animation via the shared .cardRise class (animations.css)
          // rather than an inline animation, so the app's reduced-motion
          // media query (which targets .cardRise, not a bare keyframe name)
          // disables it here too. Also aligns duration with the rest of the app (0.4s).
        }}>
          {/* Header: rotating "Not yet…" line + the restated problem */}
          <div style={{ textAlign: "center", minHeight: 0 }}>
            <div style={{
              // The app's bold sans (Space Grotesk 700) — the same face as the
              // prompt and second-miss line, so the reveal speaks in one voice.
              // (Galindo was tried and rejected: in-app it belongs to the
              // wordmark only.) docs/wrong-answer-reveal-spec.md, phase 1b.
              fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(20px, 6vw, 24px)", fontWeight: 700,
              color: COLORS.black, lineHeight: 1.2,
            }}>
              {header}
            </div>
            {problem && (
              <div style={{ marginTop: 4, fontFamily: "'Shrikhand', cursive", fontSize: "clamp(28px, 8.5vw, 34px)", color: COLORS.black }}>
                {problem}
              </div>
            )}
          </div>

          {/* Picture — scale-to-fill measuring wrapper */}
          <PictureSlot>{picture}</PictureSlot>

          {/* Derivation line (or the second-miss line, styled by the caller)
              + (divide) partner chip */}
          <div style={{ textAlign: "center", color: COLORS.black }}>
            {line && (
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: "clamp(16px, 4.8vw, 19px)", fontWeight: 700,
                color: COLORS.black, lineHeight: 1.45,
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
          <div style={{ textAlign: "center", minHeight: 20 }}>
            {prompt && (
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(16px, 4.6vw, 18px)", fontWeight: 700, color: COLORS.black }}>
                {prompt}
              </div>
            )}
          </div>

          {/* Input slot */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            {input}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PictureSlot — a legibility fix, not a fitting one (spec "Picture fit").
// Measures the slot's available box and the picture's own unscaled natural
// size, then scales to fill the slot (up for a tiny DotArray/BarModel so it
// reads as a hero visual, down for a tall one so it never clips) — capped at
// 2.5x, never past the slot in either direction. Scales the shipped
// component via CSS transform — never restyles it.
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
      // No floor at 1: a tall DotArray (tables 6-10, ~110-210px natural) must
      // be able to scale DOWN to fit the 120px band, or its bottom rows —
      // the running totals nearest the answer — get clipped (design review).
      const k = Math.min(2.5, Math.min(slotW / naturalW, slotH / naturalH));
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
