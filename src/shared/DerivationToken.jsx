import { COLORS, BRUTAL_BORDER_SM } from "../constants.js";

/**
 * DerivationToken — the answer token inside the wrong-answer reveal's
 * derivation line (docs/wrong-answer-reveal-spec.md): a numeral (line just
 * appeared), a yellow blank chip (re-ask open — same width, no layout
 * shift), or green (correct re-answer).
 *
 * Moved out of multiplication-practice.jsx (phase 1c "tall arrays") so
 * DotArray's `totals` branch can reuse the same chip for the array's final
 * total when the derivation line is folded into the picture. Same API
 * (`value`, `state`) as before the move.
 */
// `children` (Phase 2 — Fractions, Part 1 item 6): a node token — a stacked
// `<FractionDisplay>` or a word (e.g. "the same") — instead of a plain
// numeral. The `ch` width trick only works for numerals, so when `children`
// is passed the blank chip instead sizes itself by rendering the real
// content at `visibility: hidden` inside it: exact width AND height, nothing
// shifts when it swaps numeral ↔ blank ↔ correct. The numeral-only path
// (no `children`, e.g. multiply's existing callers) is untouched.
export default function DerivationToken({ value, state, children }) {
  const hasChildren = children !== undefined && children !== null;
  // Never narrower than ~1.25em: a one-digit answer ("9") would otherwise be
  // a 1ch sliver as a blank chip. Same width on the numeral so swapping
  // numeral → chip → numeral never shifts layout.
  const numeralWidth = `max(${String(value).length}ch, 1.25em)`;

  if (state === "blank") {
    if (hasChildren) {
      return (
        <span style={{
          display: "inline-block", minWidth: "1.25em",
          backgroundColor: COLORS.yellow, border: BRUTAL_BORDER_SM, borderRadius: "4px",
          verticalAlign: "middle",
        }}>
          <span style={{ visibility: "hidden" }}>{children}</span>
        </span>
      );
    }
    return (
      <span style={{
        display: "inline-block", width: numeralWidth, height: "1em",
        backgroundColor: COLORS.yellow, border: BRUTAL_BORDER_SM, borderRadius: "4px",
        verticalAlign: "middle",
      }} />
    );
  }
  if (hasChildren) {
    return (
      <span style={{
        display: "inline-block", minWidth: "1.25em", verticalAlign: "middle",
        color: state === "correct" ? COLORS.green : COLORS.black,
      }}>
        {children}
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-block", width: numeralWidth, textAlign: "center",
      color: state === "correct" ? COLORS.green : COLORS.black,
    }}>
      {value}
    </span>
  );
}
