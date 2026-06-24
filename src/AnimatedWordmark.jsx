import React, { useEffect } from "react";
import LightningBolt from "./LightningBolt.jsx";

/**
 * JackFlash — Animated Wordmark
 * ------------------------------------------------------------------
 * The "JackFlash" lockup where both `a` slots round-robin through
 * Singapore-math objects (fraction pie of thirds, number bond,
 * ten-frame, ×, +, bar model). Pure SVG + one CSS keyframe — no
 * runtime, offline-safe, matches the app's hand-authored motion spec.
 *
 * Occupants tile the timeline exactly (1/N each) with a hard opacity
 * cut at the hand-off, so no two are ever semi-transparent together
 * (prevents the letter bleeding through a shape).
 *
 * Requires: Galindo loaded (fonts.css) and ./LightningBolt.jsx.
 *
 * Props:
 *   size        - wordmark font-size in px (the whole lockup scales in em). Default 96.
 *   accentColor - LightningBolt accent stripe. Default brand blue #4CC9F0.
 *   speed       - motion multiplier; >1 faster, <1 slower. Default 1.
 *   loop        - false freezes on the plain wordmark (no cycling). Default true.
 *   stacked     - bolt above the wordmark (lockup style) instead of beside. Default false.
 *   subtitle    - optional subhead below the lockup (Space Mono, uppercase, 0.2em).
 *                 Sized relative to the lockup so the proportion holds at any `size`.
 *   style       - extra styles on the wrapper.
 */

const INK = "#1A1A1A";
const CYCLE = 8.4; // seconds for a full 4-step round per slot

// ── Singapore-math glyph vocabulary (100×100 viewBox, brand colors) ──
const svg = { width: "100%", height: "100%", overflow: "visible", display: "block" };

const FractionPie = () => (
  <svg viewBox="0 0 100 100" style={svg}>
    <circle cx="50" cy="50" r="40" fill="#fff" />
    <path d="M50 50 L50 10 A40 40 0 0 1 84.64 70 Z" fill="#FF9F1C" />
    <path d="M50 50 L84.64 70 A40 40 0 0 1 15.36 70 Z" fill="#FF9F1C" />
    <line x1="50" y1="50" x2="50" y2="10" stroke={INK} strokeWidth="6" />
    <line x1="50" y1="50" x2="84.64" y2="70" stroke={INK} strokeWidth="6" />
    <line x1="50" y1="50" x2="15.36" y2="70" stroke={INK} strokeWidth="6" />
    <circle cx="50" cy="50" r="40" fill="none" stroke={INK} strokeWidth="6" />
  </svg>
);

const NumberBond = () => (
  <svg viewBox="0 0 100 100" style={svg}>
    <line x1="50" y1="28" x2="27" y2="72" stroke={INK} strokeWidth="6" />
    <line x1="50" y1="28" x2="73" y2="72" stroke={INK} strokeWidth="6" />
    <circle cx="50" cy="26" r="18" fill="#06D6A0" stroke={INK} strokeWidth="6" />
    <circle cx="27" cy="74" r="15" fill="#4CC9F0" stroke={INK} strokeWidth="6" />
    <circle cx="73" cy="74" r="15" fill="#FF6B9D" stroke={INK} strokeWidth="6" />
  </svg>
);

const TenFrame = () => (
  <svg viewBox="0 0 100 100" style={svg}>
    <rect x="10" y="20" width="80" height="60" rx="9" fill="#fff" stroke={INK} strokeWidth="6" />
    <circle cx="29" cy="40" r="7.5" fill="#4CC9F0" />
    <circle cx="50" cy="40" r="7.5" fill="#4CC9F0" />
    <circle cx="71" cy="40" r="7.5" fill="#4CC9F0" />
    <circle cx="29" cy="60" r="7.5" fill="#4CC9F0" />
    <circle cx="50" cy="60" r="7.5" fill="#fff" stroke={INK} strokeWidth="2.5" />
    <circle cx="71" cy="60" r="7.5" fill="#fff" stroke={INK} strokeWidth="2.5" />
  </svg>
);

const TimesTile = () => (
  <svg viewBox="0 0 100 100" style={svg}>
    <rect x="14" y="14" width="72" height="72" rx="16" fill="#fff" stroke={INK} strokeWidth="7" />
    <g transform="rotate(45 50 50)">
      <rect x="44" y="30" width="12" height="40" rx="4" fill="#06D6A0" />
      <rect x="30" y="44" width="40" height="12" rx="4" fill="#06D6A0" />
    </g>
  </svg>
);

const PlusTile = () => (
  <svg viewBox="0 0 100 100" style={svg}>
    <rect x="14" y="14" width="72" height="72" rx="16" fill="#fff" stroke={INK} strokeWidth="7" />
    <rect x="44" y="30" width="12" height="40" rx="4" fill="#FF6B9D" />
    <rect x="30" y="44" width="40" height="12" rx="4" fill="#FF6B9D" />
  </svg>
);

const BarModel = () => (
  <svg viewBox="0 0 100 100" style={svg}>
    <rect x="12" y="28" width="76" height="17" rx="4" fill="#B388FF" stroke={INK} strokeWidth="5" />
    <rect x="12" y="54" width="40" height="17" rx="4" fill="#06D6A0" stroke={INK} strokeWidth="5" />
    <rect x="52" y="54" width="36" height="17" rx="4" fill="#FFD43B" stroke={INK} strokeWidth="5" />
  </svg>
);

// Objects that rotate through each `a` slot (letter is always the 1st occupant).
const SLOT_A1 = [FractionPie, NumberBond, TenFrame];
const SLOT_A2 = [TimesTile, PlusTile, BarModel];

// One keyframe + the reduced-motion fallback, injected once per page.
const STYLE_ID = "jf-animated-wordmark-keyframes";
const KEYFRAMES = `
@keyframes jfSlotTurn {
  0%   { opacity:1; transform:translate(-50%,-50%) scale(.2) rotate(-60deg); }
  4%   { opacity:1; transform:translate(-50%,-50%) scale(1.18) rotate(9deg); }
  8%   { transform:translate(-50%,-50%) scale(.93) rotate(-4deg); }
  12%  { transform:translate(-50%,-50%) scale(1) rotate(0); }
  22%  { opacity:1; transform:translate(-50%,-50%) scale(1) rotate(0); }
  24.5%{ opacity:1; transform:translate(-50%,-50%) scale(.82) rotate(7deg); }
  25%  { opacity:0; transform:translate(-50%,-50%) scale(.2) rotate(45deg); }
  100% { opacity:0; transform:translate(-50%,-50%) scale(.2) rotate(45deg); }
}
@keyframes jfBoltPulse { 0%,100%{transform:scale(1) rotate(0);} 50%{transform:scale(1.05) rotate(-1.5deg);} }
@media (prefers-reduced-motion: reduce) {
  .jf-occ { animation: none !important; }
  .jf-occ[data-occ="obj"] { opacity: 0 !important; }
  .jf-occ[data-occ="letter"] { opacity: 1 !important; transform: translate(-50%,-50%) !important; }
  .jf-bolt { animation: none !important; }
}
`;

function useKeyframes() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
  }, []);
}

const letterStyle = {
  display: "inline-flex",
  alignItems: "center",
  height: "1em",
  lineHeight: 1,
};

// A cycling `a` slot: letter + N objects, each absolutely centered and
// time-sliced so exactly one shows at a time.
function Slot({ objects, dur, loop, phase = 0, objSize = "0.82em" }) {
  const occupants = objects.length + 1; // +1 for the letter
  const window = dur / occupants; // seconds each occupant owns

  const occAnim = (i) =>
    loop
      ? {
          animation: `jfSlotTurn ${dur}s ease-in-out infinite`,
          animationDelay: `${-(i * window + phase)}s`,
        }
      : {};

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "0.62em",
        height: "1em",
      }}
    >
      <span
        className="jf-occ"
        data-occ="letter"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          ...letterStyle,
          ...occAnim(0),
        }}
      >
        a
      </span>
      {objects.map((Obj, idx) => (
        <span
          key={idx}
          className="jf-occ"
          data-occ="obj"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: objSize,
            height: objSize,
            transform: "translate(-50%,-50%)",
            opacity: loop ? undefined : 0,
            ...occAnim(idx + 1),
          }}
        >
          <Obj />
        </span>
      ))}
    </span>
  );
}

export default function AnimatedWordmark({
  size = 96,
  accentColor = "#4CC9F0",
  speed = 1,
  loop = true,
  stacked = false,
  subtitle,
  style = {},
}) {
  useKeyframes();
  const dur = CYCLE / speed;
  // Stacked mirrors the LogoLockup proportions: a larger bolt anchored above
  // the wordmark. Beside, the bolt sits at cap height to the left.
  const boltW = stacked ? "1.8em" : "1em";

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        fontSize: `${size}px`,
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          flexDirection: stacked ? "column" : "row",
          alignItems: "center",
          gap: stacked ? "0.06em" : "0.04em",
        }}
      >
        <div
          className="jf-bolt"
          style={{
            width: boltW,
            height: `calc(${boltW} * 1.34)`,
            marginRight: stacked ? 0 : "0.02em",
            transformOrigin: "center",
            animation: loop ? `jfBoltPulse ${3.2 / speed}s ease-in-out infinite` : undefined,
          }}
        >
          <LightningBolt size={boltW} accentColor={accentColor} />
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontFamily: "'Galindo', cursive",
            fontSize: "1em",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: INK,
          }}
        >
          <span style={letterStyle}>J</span>
          <Slot objects={SLOT_A1} dur={dur} loop={loop} phase={0} />
          <span style={letterStyle}>c</span>
          <span style={letterStyle}>k</span>
          <span style={{ ...letterStyle, marginLeft: "0.03em" }}>F</span>
          <span style={letterStyle}>l</span>
          <Slot objects={SLOT_A2} dur={dur} loop={loop} phase={dur / 8} objSize="0.8em" />
          <span style={letterStyle}>s</span>
          <span style={letterStyle}>h</span>
        </div>
      </div>

      {subtitle && (
        <p
          style={{
            fontSize: "0.2em",
            margin: "0.5em 0 0 0",
            fontWeight: 600,
            fontFamily: "'Space Mono', monospace",
            color: "#666",
            letterSpacing: "1px",
            textTransform: "uppercase",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
