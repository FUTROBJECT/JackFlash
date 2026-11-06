import { useEffect, useRef, useState } from "react";
import { COLORS, BRUTAL_BORDER, BRUTAL_BORDER_SM, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, AVATARS } from "../constants.js";

// Sticky slim practice header shared by the four practice screens
// (docs/practice-header-ui.md, revision 3): Home · the working group with a
// progress bar · the avatar, and a centered pull-tab hanging from the bottom
// border. Tapping the tab (or the group/avatar row) drops a panel over the
// top of the card with this session's score, the streak and the
// days-in-a-row count; a tap anywhere (or any key) closes it, and that tap
// does nothing else, so a child can't answer by accident while closing it.
// The tab is the visible affordance (revision 2's 12px chevron badge on the
// avatar was missed); it's absolutely positioned, so it adds no height.
// Presentational only — each screen computes its own pill value ("done/total")
// and label and passes them in. `headerRef` lands on the sticky element
// (ColumnMethod / NumberPad measure its bottom); the panel is absolutely
// positioned, so opening it never changes that measurement.

const mono = "'Space Mono', monospace";

function Chevron({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 12 12" aria-hidden="true" className="jf-ph-anim"
      style={{ display: "block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
      <path d="M2.5 4.5L6 8L9.5 4.5" fill="none" stroke={COLORS.black} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The 56×22 handle: a 44px-tall hit area straddling the header's bottom
// border (21px over the progress bar, which toggles the same panel, 23px
// below it), with the visible tab at its foot hanging from the border. The
// press sinks it 2px (no shadow to sink into — it hangs from the bar).
const TAB_HIT = 44;
const TAB_H = 22;
function PullTab({ open, pressed, onToggle, pressProps }) {
  return (
    <button onClick={onToggle} {...pressProps}
      aria-expanded={open} aria-controls="jf-ph-panel"
      aria-label={`${open ? "Hide" : "Show"} session score and streak`}
      style={{
        position: "absolute", left: "50%", top: `calc(100% - ${TAB_HIT - TAB_H - 1}px)`,
        transform: "translateX(-50%)", width: 64, height: TAB_HIT, padding: 0, margin: 0,
        border: "none", background: "none", cursor: "pointer",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}>
      <span aria-hidden="true" className="jf-ph-anim" style={{
        width: 56, height: TAB_H, boxSizing: "border-box", borderRadius: 7,
        border: BRUTAL_BORDER_SM, backgroundColor: "white", color: COLORS.black,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: pressed ? "translateY(2px)" : "none", transition: "transform 0.1s ease",
      }}>
        <Chevron open={open} />
      </span>
    </button>
  );
}

function Stat({ label, value, spoken, bg = "white" }) {
  return (
    <div role="group" aria-label={spoken} style={{
      flex: 1, minWidth: 0, minHeight: 64, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 4, padding: "8px 4px",
      backgroundColor: bg, border: BRUTAL_BORDER_SM, borderRadius: 8, boxShadow: BRUTAL_SHADOW_SM,
      color: COLORS.black, fontFamily: mono, fontWeight: 700,
    }}>
      <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1, whiteSpace: "nowrap" }}>{value}</span>
      <span aria-hidden="true" style={{ fontSize: 12, letterSpacing: "0.3px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

export default function PracticeHeader({ headerRef, onBack, avatar, pill, session, streak, dailyStreak }) {
  const [open, setOpen] = useState(false);
  const [pressed, setPressed] = useState(null); // "home" | "toggle" | "tab" — the press sinks into its shadow
  const toggleRef = useRef(null);
  const pressProps = (which) => ({
    onPointerDown: () => setPressed(which),
    onPointerUp: () => setPressed(null),
    onPointerLeave: () => setPressed(null),
    onPointerCancel: () => setPressed(null),
  });

  // "done/total" → progress-bar fraction.
  const [doneStr, totalStr] = String(pill.value).split("/");
  const done = Number(doneStr) || 0;
  const total = Number(totalStr) || 0;
  const frac = pill.done ? 1 : total > 0 ? Math.min(1, done / total) : 0;
  const dailyCount = dailyStreak && dailyStreak.current > 0 ? dailyStreak.current : 0;

  // Digits / Esc / most keys close the panel (Esc returns focus to the toggle);
  // the key itself still reaches the answer pad. Enter/Space on the toggle are
  // left to its click (else they'd close then reopen it), and Tab / modifiers
  // don't close it, so a keyboard user can move into and around it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (["Tab", "Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
      if (e.target === toggleRef.current && (e.key === "Enter" || e.key === " ")) return;
      setOpen(false);
      if (e.key === "Escape") toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  return (
    <>
      {open && (
        // Catches the closing tap so it doesn't also press a key / choice below.
        <div aria-hidden="true" onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 49, backgroundColor: "rgba(26,26,26,0.18)" }} />
      )}
      <div ref={headerRef} style={{
        background: COLORS.yellow,
        padding: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 8px) clamp(12px, 4vw, 20px) 8px",
        borderBottom: `4px solid ${COLORS.black}`,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 540, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          {onBack && (
            <button onClick={onBack} aria-label="Home" {...pressProps("home")} className="jf-ph-anim" style={{
              width: 44, height: 44, padding: 0, borderRadius: 6, border: BRUTAL_BORDER_SM,
              backgroundColor: "white", color: COLORS.black,
              boxShadow: pressed === "home" ? "none" : BRUTAL_SHADOW_SM,
              transform: pressed === "home" ? "translate(3px, 3px)" : "none",
              cursor: "pointer", transition: "transform 0.1s ease, box-shadow 0.1s ease", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 9.5L12 3L21 9.5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9.5Z"
                  stroke={COLORS.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 22V12H15V22" stroke={COLORS.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* One big toggle: the group + progress bar + avatar all open the panel */}
          <button ref={toggleRef} onClick={() => setOpen((o) => !o)} {...pressProps("toggle")}
            aria-expanded={open} aria-controls="jf-ph-panel"
            aria-label={`${pill.label}: ${done} of ${total} mastered. ${open ? "Hide" : "Show"} session score and streak`}
            style={{
              flex: 1, minWidth: 0, minHeight: 44, padding: 0, margin: 0, border: "none", background: "none",
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer", color: COLORS.black, textAlign: "left",
            }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                <span style={{
                  flex: 1, minWidth: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15,
                  lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{pill.label}</span>
                <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 13, lineHeight: 1.1, whiteSpace: "nowrap", flexShrink: 0 }}>
                  ⭐ {pill.value}
                </span>
              </span>
              <span aria-hidden="true" style={{
                display: "block", height: 12, borderRadius: 6, border: BRUTAL_BORDER_SM,
                backgroundColor: "white", overflow: "hidden", boxSizing: "border-box",
              }}>
                <span className="jf-ph-anim" style={{
                  display: "block", height: "100%", width: `${frac * 100}%`,
                  backgroundColor: COLORS.green, transition: "width 0.3s ease",
                }} />
              </span>
            </span>

            {avatar && (
              <span style={{ position: "relative", flexShrink: 0 }}>
                <span aria-hidden="true" className="jf-ph-anim" style={{
                  width: 44, height: 44, borderRadius: "50%", border: BRUTAL_BORDER_SM, boxSizing: "border-box",
                  backgroundColor: "white", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 24,
                  boxShadow: pressed === "toggle" ? "none" : BRUTAL_SHADOW_SM,
                  transform: pressed === "toggle" ? "translate(3px, 3px)" : "none",
                  transition: "transform 0.1s ease, box-shadow 0.1s ease",
                }}>
                  {AVATARS.find((a) => a.id === avatar)?.emoji || (/\p{Extended_Pictographic}/u.test(String(avatar)) ? avatar : "🙂")}
                </span>
              </span>
            )}
          </button>

          <PullTab open={open} pressed={pressed === "tab"} onToggle={() => setOpen((o) => !o)} pressProps={pressProps("tab")} />

          {open && (
            <div id="jf-ph-panel" className="jf-ph-panel" role="region" aria-label="This session" style={{
              position: "absolute", top: `calc(100% + ${TAB_H + 8}px)`, left: 0, right: 0,
              backgroundColor: COLORS.cream, border: BRUTAL_BORDER, borderRadius: 12, boxShadow: BRUTAL_SHADOW,
              padding: 12, display: "flex", gap: 8,
            }}>
              <Stat label="Session" value={`${session.correct}/${session.total}`}
                spoken={`This session: ${session.correct} of ${session.total} right`} />
              <Stat label="Streak" value={`🔥 ${streak}`} spoken={`Streak: ${streak} in a row`}
                bg={streak >= 3 ? COLORS.orange : "white"} />
              {dailyCount > 0 && (
                <Stat label="Days" value={`${dailyCount >= 30 ? "👑" : "📅"} ${dailyCount}`}
                  spoken={`${dailyCount} days in a row`}
                  bg={dailyCount >= 7 ? COLORS.orange : "white"} />
              )}
            </div>
          )}
        </div>
        <style>{`.jf-ph-panel { animation: jfDrop 0.15s ease-out; }
@keyframes jfDrop { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .jf-ph-panel { animation: none; } .jf-ph-anim { transition: none !important; } }`}</style>
      </div>
    </>
  );
}
