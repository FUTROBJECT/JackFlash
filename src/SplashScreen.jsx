import { useState, useEffect, useRef, useLayoutEffect } from "react";
import AnimatedWordmark from "./AnimatedWordmark.jsx";
import { COLORS } from "./constants.js";

// Opening splash: the animated lockup centered, with a "Let's Go" button anchored
// near the bottom that the user must tap to enter the app (no auto-dismiss). The
// button fades in shortly after load so the lockup reads first. Reduced-motion is
// handled inside AnimatedWordmark (the wordmark freezes).
const GRID_BG = `
  repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.05) 23px, rgba(0,0,0,0.05) 24px),
  repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(0,0,0,0.05) 23px, rgba(0,0,0,0.05) 24px),
  #FFFBEB`;

const PAD = 24;        // viewport breathing room on each side
const BASE_SIZE = 92;  // wordmark font-size before fit-to-width scaling

export default function SplashScreen({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const [ready, setReady] = useState(false); // CTA fade-in after the lockup lands
  const [pressed, setPressed] = useState(false);
  const [scale, setScale] = useState(1);
  const frameRef = useRef(null);
  const markRef = useRef(null);

  // Scale the lockup down so it always fits the viewport width (Galindo is wide;
  // measuring beats guessing). offsetWidth is the pre-transform layout width, so
  // re-measuring after the webfont loads is accurate (the fallback measures narrower).
  useLayoutEffect(() => {
    const measure = () => {
      const avail = (frameRef.current?.clientWidth || window.innerWidth) - PAD * 2;
      const natural = markRef.current?.offsetWidth || 0;
      // Guard both dimensions: a transient width of ~0 mid-resize (or before
      // layout settles) must never latch scale to 0 and hide the lockup.
      if (avail > 0 && natural > 0) setScale(Math.min(1, (avail / natural) * 0.97));
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    // Re-fit on viewport changes (orientation, window/preview resize) — without
    // this, a scale measured for one width sticks forever.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && frameRef.current) ro.observe(frameRef.current);
    window.addEventListener("resize", measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Reveal the CTA a beat after the lockup so it doesn't pop in simultaneously.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 650);
    return () => window.clearTimeout(t);
  }, []);

  function dismiss() {
    setLeaving((l) => {
      if (l) return l;
      window.setTimeout(onDone, 420); // let the fade finish, then unmount
      return true;
    });
  }

  return (
    <div
      ref={frameRef}
      role="dialog"
      aria-label="Welcome to JackFlash"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: GRID_BG,
        opacity: leaving ? 0 : 1,
        transition: "opacity 0.42s ease",
        padding: PAD,
        paddingTop: `calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + ${PAD}px)`,
        paddingBottom: `calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + ${PAD}px)`,
      }}
    >
      <div ref={markRef} style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        <AnimatedWordmark size={BASE_SIZE} accentColor="#4CC9F0" stacked subtitle="Math fluency, the right way." />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "9%",
          left: "50%",
          transform: "translateX(-50%)",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.45s ease",
        }}
      >
        <button
          onClick={dismiss}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          onPointerCancel={() => setPressed(false)}
          style={{
            backgroundColor: COLORS.yellow,
            color: COLORS.black,
            border: `3px solid ${COLORS.black}`,
            borderRadius: "12px",
            boxShadow: pressed ? `2px 2px 0 ${COLORS.black}` : `5px 5px 0 ${COLORS.black}`,
            padding: "15px 44px",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "19px",
            letterSpacing: "0.01em",
            cursor: "pointer",
            transform: pressed ? "translateY(3px)" : "none",
            transition: "box-shadow 0.1s ease, transform 0.1s ease",
          }}
        >
          Let's Go
        </button>
      </div>
    </div>
  );
}
