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
        JackFlash uses Smart Practice, so your child never sees random problems. Every question is picked based on what they know, what they're still learning, and what they're ready to review. The only comparison it ever makes is your child against their own last week.
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
      <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginBottom: "14px" }}>
        {[
          { label: "New", desc: "Only 2–3 new facts or problems at a time, so nothing gets overwhelming.", color: COLORS.blue },
          { label: "Learning", desc: "Seen before and still forming. Comes up often.", color: COLORS.yellow },
          { label: "Needs practice", desc: "Missed a few times. Comes back first, with the picture ready.", color: COLORS.pink },
          { label: "Mastered", desc: "Answered from memory 3 times, the last one with no picture on screen. Moves into long-term review.", color: COLORS.green },
          { label: "Review-due", desc: "Mastered facts whose review day has come around.", color: COLORS.orange },
        ].map((row) => (
          <div key={row.label} style={{
            display: "flex",
            alignItems: "baseline",
            gap: "11px",
            // Tinted with the category color + solid chip + brutalist box — pronounced,
            // color-coded, and NO left stripe.
            backgroundColor: row.color + "26",
            border: BRUTAL_BORDER_SM,
            boxShadow: BRUTAL_SHADOW_SM,
            borderRadius: "10px",
            padding: "11px 13px",
            fontSize: "12.5px",
            lineHeight: 1.5,
          }}>
            <span aria-hidden style={{
              flexShrink: 0,
              width: "16px",
              height: "16px",
              borderRadius: "5px",
              backgroundColor: row.color,
              border: BRUTAL_BORDER_SM,
              transform: "translateY(2px)",
            }} />
            <span><strong>{row.label}</strong> — {row.desc}</span>
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
        What “mastered” means
      </h4>
      <p style={{ margin: "0 0 12px" }}>
        A fact is mastered after 3 correct answers, the last one with no picture on screen. The goal is a fact that comes from memory and gets out of the way, so your child's thinking has room for the bigger problem. Math isn't a race, and being fast is never the point. In Multiply &amp; Divide, JackFlash also checks that an answer came from memory rather than counting, using a generous window your child never sees: there's no timer and no "too slow", and a slower correct answer is still celebrated, it just doesn't count toward mastery yet. Fractions, Place Value and Add &amp; Subtract have no time window at all. If a mastered fact is missed during review, it simply comes back into practice.
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
        Each correct review pushes the next one further out. A miss brings the fact back sooner, which is the app doing its job, not a mark against your child. This is how facts move from short-term into long-term memory.
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
        Nothing flashes red. The picture comes back with one short line showing how to get there, and your child tries the same question again. Only the first answer is recorded, so the second try is pure practice. An answer that comes in too fast to be a real try is treated as "not sure": the picture appears and nothing is counted. The app assumes your child needs to see the math, not guess harder.
      </p>
    </div>
  );
}
