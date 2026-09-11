import { COLORS } from "../constants.js";
import { FractionDisplay } from "./barComponents.jsx";
import DerivationToken from "./DerivationToken.jsx";

/**
 * DerivationLine — renders a segment array as the wrong-answer reveal's
 * derivation line (docs/wrong-answer-reveal-spec.md, "Phase 2 — Fractions",
 * governing ruling: "Fractions never appear inline ('3/4') in child-facing
 * text. The line is a segment array").
 *
 * `segments`: an array of
 *   { t: "text", v }                        — a plain text run
 *   { t: "frac", n, d }                     — a stacked fraction, size="small"
 *   { t: "token", state, value, children }  — the single answer token
 *                                              (children, if present, wins —
 *                                              see DerivationToken)
 *
 * Owns only the phase-1b line typography (Space Mono 700,
 * clamp(16px, 4.8vw, 19px), lineHeight 1.45, centred, ≤2 lines) — the same
 * visual contract WrongAnswerReveal's `line` slot already renders for the
 * plain-string multiply/divide line. Callers build the segment array
 * (per-skill derivation text) and pass this component into that slot.
 */
export default function DerivationLine({ segments = [] }) {
  return (
    <span style={{
      fontFamily: "'Space Mono', monospace", fontWeight: 700,
      fontSize: "clamp(16px, 4.8vw, 19px)", lineHeight: 1.45,
      color: COLORS.black, textAlign: "center",
    }}>
      {segments.map((seg, i) => {
        if (seg.t === "text") return <span key={i}>{seg.v}</span>;
        if (seg.t === "frac") {
          return (
            <span key={i} style={{ display: "inline-flex", verticalAlign: "middle" }}>
              <FractionDisplay n={seg.n} d={seg.d} size="small" />
            </span>
          );
        }
        if (seg.t === "token") {
          return (
            <DerivationToken key={i} value={seg.value} state={seg.state}>
              {seg.children}
            </DerivationToken>
          );
        }
        return null;
      })}
    </span>
  );
}
