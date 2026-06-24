import { useState, useEffect, useRef, useLayoutEffect } from "react";
import AnimatedWordmark from "./AnimatedWordmark.jsx";

// Opening splash: the animated wordmark over the app's grid-paper background.
// Shown once per launch (mounted at the root for one page-load), auto-dismisses
// with a fade, and is tap-to-skip. Under prefers-reduced-motion the wordmark
// freezes (handled inside AnimatedWordmark) and we hold only briefly.
const GRID_BG = `
  repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.05) 23px, rgba(0,0,0,0.05) 24px),
  repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(0,0,0,0.05) 23px, rgba(0,0,0,0.05) 24px),
  #FFFBEB`;

const PAD = 24;        // viewport breathing room on each side
const BASE_SIZE = 92;  // wordmark font-size before fit-to-width scaling

export default function SplashScreen({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const [scale, setScale] = useState(1);
  const frameRef = useRef(null);
  const markRef = useRef(null);

  // Scale the wordmark down so it always fits the viewport width (Galindo is
  // wide; measuring beats guessing a font-size from screen width). offsetWidth
  // is the pre-transform layout width, so re-measuring after the webfont loads
  // is accurate — important because the fallback font measures narrower (FOUT).
  useLayoutEffect(() => {
    const measure = () => {
      const avail = (frameRef.current?.clientWidth || window.innerWidth) - PAD * 2;
      const natural = markRef.current?.offsetWidth || 0;
      if (natural > 0) setScale(Math.min(1, (avail / natural) * 0.97));
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }, []);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduce ? 800 : 2400; // ms on screen before auto-dismiss
    const t = window.setTimeout(dismiss, hold);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      role="img"
      aria-label="JackFlash"
      onClick={dismiss}
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
        cursor: "pointer",
        padding: PAD,
      }}
    >
      <div ref={markRef} style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        <AnimatedWordmark size={BASE_SIZE} accentColor="#4CC9F0" stacked subtitle="Math fluency, the right way." />
      </div>
    </div>
  );
}
