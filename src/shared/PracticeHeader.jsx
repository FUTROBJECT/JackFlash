import { COLORS, BRUTAL_BORDER_SM, BRUTAL_SHADOW_SM, AVATARS } from "../constants.js";

// Sticky one-row practice header shared by the four practice screens
// (docs/practice-header-ui.md): Home · three score chips · avatar. The daily
// streak rides on the avatar as a small badge, so it stays visible on every
// phone instead of being a fourth chip that won't fit. Presentational only —
// each screen computes its own pill value/label and passes it in. `headerRef`
// lands on the sticky element (ColumnMethod / NumberPad measure its bottom).
// Black text on the green/orange chips everywhere (CLAUDE.md: white fails
// contrast on them).

const chipBase = {
  minWidth: 0, height: 44, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", gap: 2,
  fontFamily: "'Space Mono', monospace", fontWeight: 700, color: COLORS.black,
  border: BRUTAL_BORDER_SM, borderRadius: 8, padding: "4px 2px",
  boxShadow: BRUTAL_SHADOW_SM, transition: "background-color 0.2s ease",
  overflow: "hidden", // a long value must never spill over the border
};
// Scales down with the viewport so three-digit scores ("⭐ 120/282", "12/34")
// fit a 320pt phone; 16px on a 393pt one.
const valueStyle = { fontSize: "clamp(11px, 3.8vw, 16px)", lineHeight: 1, whiteSpace: "nowrap" };
const labelStyle = {
  fontSize: 9, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.3px",
  lineHeight: 1.1, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
};

export default function PracticeHeader({ headerRef, onBack, avatar, pill, session, streak, dailyStreak }) {
  const pillDone = !!pill.done;
  const streakHot = streak >= 3;
  const dailyCount = dailyStreak && dailyStreak.current > 0 ? dailyStreak.current : 0;

  return (
    <div ref={headerRef} style={{
      background: COLORS.yellow,
      padding: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 10px) clamp(12px, 4vw, 20px) 10px",
      borderBottom: `4px solid ${COLORS.black}`,
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: 540, margin: "0 auto", display: "flex", alignItems: "center", gap: 4 }}>
        {onBack && (
          <button onClick={onBack} aria-label="Home" style={{
            width: 44, height: 44, padding: 0, borderRadius: 6, border: BRUTAL_BORDER_SM,
            backgroundColor: "white", color: COLORS.black, boxShadow: BRUTAL_SHADOW_SM,
            cursor: "pointer", transition: "all 0.1s ease", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 9.5L12 3L21 9.5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9.5Z"
                stroke={COLORS.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 22V12H15V22" stroke={COLORS.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Mastery pill — cumulative, persisted */}
        <div style={{ ...chipBase, flex: 1.7, backgroundColor: pillDone ? COLORS.green : "white" }}>
          <span style={valueStyle}>⭐ {pill.value}</span>
          <span style={labelStyle}>{pill.label}</span>
        </div>
        {/* Session score */}
        <div style={{ ...chipBase, flex: 1, backgroundColor: "white" }}>
          <span style={valueStyle}>{session.correct}/{session.total}</span>
          <span style={labelStyle}>Session</span>
        </div>
        {/* Streak */}
        <div style={{ ...chipBase, flex: 1, backgroundColor: streakHot ? COLORS.orange : "white" }}>
          <span style={valueStyle}>🔥 {streak}</span>
          <span style={labelStyle}>Streak</span>
        </div>

        {avatar && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div aria-hidden="true" style={{
              width: 44, height: 44, borderRadius: "50%", border: BRUTAL_BORDER_SM,
              backgroundColor: "white", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 24, boxShadow: BRUTAL_SHADOW_SM,
            }}>
              {AVATARS.find((a) => a.id === avatar)?.emoji || avatar}
            </div>
            {/* Daily streak badge (was a fourth chip): cream, orange from 7 days, 👑 from 30 */}
            {dailyCount > 0 && (
              <div aria-label={`${dailyCount} days in a row`} style={{
                position: "absolute", right: -6, bottom: -6, minWidth: 22, height: 20, padding: "0 4px",
                borderRadius: 10, border: BRUTAL_BORDER_SM,
                backgroundColor: dailyCount >= 7 ? COLORS.orange : COLORS.cream,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 1,
                fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 10, color: COLORS.black,
                lineHeight: 1, whiteSpace: "nowrap", boxSizing: "border-box",
              }}>
                <span style={{ fontSize: 9 }}>{dailyCount >= 30 ? "👑" : "📅"}</span>{dailyCount}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
