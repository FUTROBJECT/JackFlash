import { COLORS, BRUTAL_BORDER_SM, BRUTAL_SHADOW_SM } from "./constants.js";

/**
 * Explains the smart practice / fact-selection engine.
 * Shared by the on-screen "How it Works" view and the Parent Zone
 * accordion so there's one source of truth.
 *
 * Renders its content without an outer container — the caller supplies
 * whatever wrapper fits the context (cream box, accordion body, etc.).
 */
export default function SmartPracticeExplainer() {
  return (
    <div style={{ fontSize: "13px", lineHeight: 1.7, color: COLORS.black }}>
      <p style={{ margin: "0 0 12px" }}>
        JackFlash doesn't show random problems. Every question is picked based on what your child knows, what they're still learning, and what they're ready to review.
      </p>

      <h4 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "13px",
        fontWeight: 700,
        margin: "14px 0 8px",
        color: COLORS.black,
      }}>
        Five categories, weighted differently
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
        {[
          { label: "New", desc: "Only 2–3 unseen facts introduced at a time, so nothing gets overwhelming.", color: COLORS.blue },
          { label: "Learning", desc: "Seen before but not yet mastered. Shown often.", color: COLORS.yellow },
          { label: "Struggling", desc: "Missed repeatedly. Top priority.", color: COLORS.pink },
          { label: "Mastered", desc: "3 correct in a row. Moves into long-term review.", color: COLORS.green },
          { label: "Review-due", desc: "Mastered facts whose review window has come up.", color: COLORS.orange },
        ].map((row) => (
          <div key={row.label} style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "8px 12px",
            borderLeft: `6px solid ${row.color}`,
            border: BRUTAL_BORDER_SM,
            boxShadow: BRUTAL_SHADOW_SM,
            fontSize: "12.5px",
          }}>
            <strong>{row.label}</strong> — {row.desc}
          </div>
        ))}
      </div>

      <h4 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "13px",
        fontWeight: 700,
        margin: "14px 0 8px",
        color: COLORS.black,
      }}>
        Mastery isn't permanent
      </h4>
      <p style={{ margin: "0 0 12px" }}>
        A fact becomes mastered after 3 correct answers. If your child misses a mastered fact during review, it drops back into learning — the standard stays honest.
      </p>

      <h4 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "13px",
        fontWeight: 700,
        margin: "14px 0 8px",
        color: COLORS.black,
      }}>
        Spaced repetition keeps mastered facts sharp
      </h4>
      <p style={{ margin: "0 0 6px" }}>
        After mastery, each fact cycles back on an expanding schedule:
      </p>
      <p style={{
        margin: "0 0 12px",
        fontFamily: "'Space Mono', monospace",
        fontSize: "12.5px",
        fontWeight: 700,
      }}>
        next day → 3 days → 7 days → 14 days → 30 days
      </p>
      <p style={{ margin: "0 0 12px" }}>
        Each correct review pushes the interval out. A miss resets it. This is how facts move from short-term into long-term memory.
      </p>

      <h4 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "13px",
        fontWeight: 700,
        margin: "14px 0 8px",
        color: COLORS.black,
      }}>
        When your child gets one wrong
      </h4>
      <p style={{ margin: 0 }}>
        The visual scaffold (dot array or bar model) appears automatically and the fact's mastery level drops by one. The app assumes your child needs to see the math, not guess harder.
      </p>
    </div>
  );
}
