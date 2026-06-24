// Neo-brutalist animated illustrations — pure SVG + CSS keyframes, zero deps.
// Each concept maps to a module color. The motion lives in animations.css
// (illoCycle / illoDraw / illoGrowX / illoGrowY) and is disabled under
// prefers-reduced-motion (see the .jf-illo rule there). Drop one into a module
// card, an onboarding step, or an empty state: <MultiplyArray size={120} />.
import { COLORS, MODULE_COLORS } from "../constants.js";

const DUR = "3.2s";
const BK = COLORS.black;

// Per-element animation style helpers. `delay` is a CSS time string e.g. "0.3s".
const pop = (delay) => ({ transformBox: "fill-box", transformOrigin: "center", animation: `illoCycle ${DUR} ease-in-out infinite`, animationDelay: delay });
const draw = (delay) => ({ strokeDasharray: 1, animation: `illoDraw ${DUR} ease-in-out infinite`, animationDelay: delay });
const growX = (delay) => ({ transformBox: "fill-box", transformOrigin: "left center", animation: `illoGrowX ${DUR} ease-in-out infinite`, animationDelay: delay });
const growY = (delay) => ({ transformBox: "fill-box", transformOrigin: "center top", animation: `illoGrowY ${DUR} ease-in-out infinite`, animationDelay: delay });

// Multiply & Divide — dots populate a rows × columns array.
export function MultiplyArray({ size = 110 }) {
  const c = MODULE_COLORS.multiply;
  const dots = [[27, 28, "0s"], [55, 28, ".1s"], [83, 28, ".2s"], [27, 56, ".3s"], [55, 56, ".4s"], [83, 56, ".5s"]];
  return (
    <svg className="jf-illo" width={size} height={size * 84 / 110} viewBox="0 0 110 84" role="img" aria-label="Multiplication array">
      {dots.map(([cx, cy, d], i) => (
        <circle key={i} cx={cx} cy={cy} r="11" fill={c} stroke={BK} strokeWidth="3" style={pop(d)} />
      ))}
    </svg>
  );
}

// Add & Subtract — a whole splits into two parts (number bond).
export function NumberBond({ size = 120 }) {
  const c = MODULE_COLORS.add;
  return (
    <svg className="jf-illo" width={size} height={size * 104 / 120} viewBox="0 0 120 104" role="img" aria-label="Number bond">
      <circle cx="60" cy="24" r="18" fill={c} stroke={BK} strokeWidth="3" style={pop("0s")} />
      <line x1="50" y1="38" x2="36" y2="58" pathLength="1" stroke={BK} strokeWidth="3" strokeLinecap="round" style={draw(".35s")} />
      <line x1="70" y1="38" x2="84" y2="58" pathLength="1" stroke={BK} strokeWidth="3" strokeLinecap="round" style={draw(".35s")} />
      <circle cx="30" cy="74" r="14" fill={c} stroke={BK} strokeWidth="3" style={pop(".6s")} />
      <circle cx="90" cy="74" r="14" fill={c} stroke={BK} strokeWidth="3" style={pop(".7s")} />
    </svg>
  );
}

// Fractions — a bar divides into equal parts; one part shades in.
export function FractionBar({ size = 140 }) {
  const c = MODULE_COLORS.fractions;
  return (
    <svg className="jf-illo" width={size} height={size * 64 / 140} viewBox="0 0 140 64" role="img" aria-label="Fraction bar">
      <rect x="8" y="16" width="124" height="32" rx="6" fill="#fff" stroke={BK} strokeWidth="3" />
      <rect x="10" y="18" width="28" height="28" rx="3" fill={c} style={growX(".5s")} />
      <line x1="39" y1="16" x2="39" y2="48" stroke={BK} strokeWidth="3" style={growY(".15s")} />
      <line x1="70" y1="16" x2="70" y2="48" stroke={BK} strokeWidth="3" style={growY(".25s")} />
      <line x1="101" y1="16" x2="101" y2="48" stroke={BK} strokeWidth="3" style={growY(".35s")} />
    </svg>
  );
}

// Connections (capstone) — a comparison bar model: two bars grow from the left.
export function BarModel({ size = 140 }) {
  const c = MODULE_COLORS.connections;
  return (
    <svg className="jf-illo" width={size} height={size * 72 / 140} viewBox="0 0 140 72" role="img" aria-label="Bar model">
      <rect x="8" y="14" width="124" height="20" rx="5" fill={c} stroke={BK} strokeWidth="3" style={growX("0s")} />
      <rect x="8" y="42" width="78" height="20" rx="5" fill={c} stroke={BK} strokeWidth="3" style={growX(".3s")} />
    </svg>
  );
}
