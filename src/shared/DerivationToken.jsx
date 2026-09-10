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
export default function DerivationToken({ value, state }) {
  // Never narrower than ~1.25em: a one-digit answer ("9") would otherwise be
  // a 1ch sliver as a blank chip. Same width on the numeral so swapping
  // numeral → chip → numeral never shifts layout.
  const width = `max(${String(value).length}ch, 1.25em)`;
  if (state === "blank") {
    return (
      <span style={{
        display: "inline-block", width, height: "1em",
        backgroundColor: COLORS.yellow, border: BRUTAL_BORDER_SM, borderRadius: "4px",
        verticalAlign: "middle",
      }} />
    );
  }
  return (
    <span style={{
      display: "inline-block", width, textAlign: "center",
      color: state === "correct" ? COLORS.green : COLORS.black,
    }}>
      {value}
    </span>
  );
}
