import { useState } from "react";
import { COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM, MODULE_COLORS, AVATARS } from "./constants.js";
import { getModuleList } from "./modules/moduleRegistry.js";
import LogoLockup from "./LogoLockup.jsx";

function BrutalButton({ onClick, children, bg = COLORS.yellow, disabled = false, style = {} }) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => {
        if (!disabled) setIsPressed(true);
      }}
      onMouseUp={() => {
        setIsPressed(false);
      }}
      onMouseLeave={() => {
        setIsPressed(false);
      }}
      style={{
        padding: "12px 24px",
        background: bg,
        border: BRUTAL_BORDER,
        boxShadow: isPressed ? "none" : BRUTAL_SHADOW,
        borderRadius: "8px",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: "18px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "transform 0.1s, box-shadow 0.1s",
        transform: isPressed ? "translate(2px, 2px)" : "translate(0, 0)",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

const GRID_BG = `
  repeating-linear-gradient(0deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px),
  repeating-linear-gradient(90deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px),
  ${COLORS.bg}
`;

/* ─── Bottom Nav Bar ─── */
function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: "players", label: "Players", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke={active ? COLORS.black : "#999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke={active ? COLORS.black : "#999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke={active ? COLORS.black : "#999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke={active ? COLORS.black : "#999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )},
    { id: "modules", label: "Modules", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke={active ? COLORS.black : "#999"} strokeWidth="2"/>
        <rect x="14" y="3" width="7" height="7" rx="1" stroke={active ? COLORS.black : "#999"} strokeWidth="2"/>
        <rect x="3" y="14" width="7" height="7" rx="1" stroke={active ? COLORS.black : "#999"} strokeWidth="2"/>
        <rect x="14" y="14" width="7" height="7" rx="1" stroke={active ? COLORS.black : "#999"} strokeWidth="2"/>
      </svg>
    )},
    { id: "settings", label: "Settings", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke={active ? COLORS.black : "#999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.1235 6.63368 19.976 6.85425 19.79 7.04L19.73 7.1C19.4995 7.33568 19.3448 7.63502 19.286 7.95941C19.2272 8.28381 19.2669 8.61838 19.4 8.92V9C19.5268 9.29577 19.7372 9.54802 20.0055 9.72569C20.2738 9.90337 20.5882 9.99872 20.91 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke={active ? COLORS.black : "#999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )},
  ];

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      borderTop: BRUTAL_BORDER,
      background: "white",
      display: "flex",
      zIndex: 100,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              padding: "8px 4px 6px",
              background: isActive ? COLORS.cream : "white",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              transition: "background 0.15s",
            }}
          >
            {tab.icon(isActive)}
            <span style={{
              fontSize: "10px",
              fontWeight: isActive ? 700 : 500,
              fontFamily: "'Space Mono', monospace",
              color: isActive ? COLORS.black : "#999",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Profile Picker (Players Tab) ─── */
export function ProfilePicker({
  profiles,
  onSelectProfile,
  onAddProfile,
  onOpenParentZone,
  onViewProgress,
  activeTab = "players",
  onTabChange,
  masteryData = {},
  streakData = {},
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: GRID_BG,
      padding: "20px",
      paddingBottom: "80px",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header: Logo lockup centered */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "36px",
          marginTop: "20px",
        }}>
          <LogoLockup size="medium" />
        </div>

        {/* Profile Cards Grid — 2 columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
          marginBottom: "20px",
        }}>
          {profiles.map((profile) => {
            const mastery = masteryData[profile.id] || {};
            const streak = streakData[profile.id] || { current: 0 };
            const totalFacts = Object.keys(mastery).length || 1;
            const masteredFacts = Object.values(mastery).filter(
              (f) => (f.correct || 0) >= 3
            ).length;
            const masteryPct = totalFacts > 0 ? Math.round((masteredFacts / totalFacts) * 100) : 0;

            return (
              <div key={profile.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* Main avatar card — tap to play */}
                <button
                  onClick={() => onSelectProfile(profile.id)}
                  style={{
                    background: "white",
                    border: BRUTAL_BORDER,
                    boxShadow: BRUTAL_SHADOW,
                    borderRadius: "12px",
                    padding: "16px 12px 14px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.1s",
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = "translate(2px, 2px)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "translate(0, 0)";
                    e.currentTarget.style.boxShadow = BRUTAL_SHADOW;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translate(0, 0)";
                    e.currentTarget.style.boxShadow = BRUTAL_SHADOW;
                  }}
                >
                  <div style={{ fontSize: "48px" }}>
                    {AVATARS.find((a) => a.id === profile.avatar)?.emoji || "🤖"}
                  </div>
                  <p style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "15px",
                    fontWeight: 600,
                    margin: 0,
                    color: COLORS.black,
                    textAlign: "center",
                    wordBreak: "break-word",
                  }}>
                    {profile.name}
                  </p>
                  {/* Mastery bar */}
                  <div style={{ width: "100%", padding: "0 4px" }}>
                    <div style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#E8E8E8",
                      overflow: "hidden",
                      border: "1.5px solid " + COLORS.black,
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${masteryPct}%`,
                        backgroundColor: COLORS.green,
                        borderRadius: 2,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "3px",
                      fontSize: "9px",
                      fontFamily: "'Space Mono', monospace",
                      color: "#888",
                      fontWeight: 600,
                    }}>
                      <span>{masteryPct}%</span>
                      {streak.current > 0 && <span>{"🔥"} {streak.current}</span>}
                    </div>
                  </div>
                </button>

                {/* Progress button — separate from the card */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProgress(profile.id);
                  }}
                  style={{
                    background: "white",
                    border: BRUTAL_BORDER_SM,
                    boxShadow: BRUTAL_SHADOW_SM,
                    borderRadius: "8px",
                    padding: "6px 8px",
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: COLORS.black,
                    transition: "all 0.1s",
                    textAlign: "center",
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = "translate(2px, 2px)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "translate(0, 0)";
                    e.currentTarget.style.boxShadow = BRUTAL_SHADOW_SM;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translate(0, 0)";
                    e.currentTarget.style.boxShadow = BRUTAL_SHADOW_SM;
                  }}
                >
                  Progress
                </button>
              </div>
            );
          })}

          {/* Add Player Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <button
              onClick={onAddProfile}
              style={{
                background: "white",
                border: `3px dashed ${COLORS.black}`,
                boxShadow: BRUTAL_SHADOW,
                borderRadius: "12px",
                padding: "16px 12px 14px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                flex: 1,
                transition: "all 0.1s",
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translate(2px, 2px)";
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = BRUTAL_SHADOW;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = BRUTAL_SHADOW;
              }}
            >
              <div style={{ fontSize: "40px", lineHeight: 1 }}>+</div>
              <p style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                margin: 0,
                color: COLORS.black,
                textAlign: "center",
              }}>
                Add Player
              </p>
            </button>
          </div>
        </div>

        {/* Footer links */}
        <div style={{
          textAlign: "center",
          padding: "24px 0 8px",
          fontSize: "10px",
          fontFamily: "'Space Mono', monospace",
          color: "#AAA",
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onOpenParentZone(); }} style={{ color: "#AAA", textDecoration: "none" }}>Privacy</a>
          <span>·</span>
          <a href="#" onClick={(e) => { e.preventDefault(); onOpenParentZone(); }} style={{ color: "#AAA", textDecoration: "none" }}>Terms</a>
          <span>·</span>
          <span style={{ color: COLORS.black }}><span style={{ fontSize: "1.2em", verticalAlign: "-0.05em" }}>©</span> 2026 Laser Lab Studios LLC</span>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}

export function CreateProfile({ onComplete, onCancel }) {
  const [step, setStep] = useState(1); // 1: name, 2: avatar, 3: module
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("robot-blue");
  const [selectedModule, setSelectedModule] = useState("multiply");

  const modules = getModuleList();

  const handleNameNext = () => {
    if (name.trim()) {
      setStep(2);
    }
  };

  const handleAvatarNext = () => {
    setStep(3);
  };

  const handleModuleComplete = () => {
    onComplete({
      name: name.trim(),
      avatar: selectedAvatar,
      activeModule: selectedModule,
    });
  };

  const getModuleColor = (moduleId) => {
    return MODULE_COLORS[moduleId] || COLORS.gray;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: GRID_BG,
        padding: "20px",
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ maxWidth: 500, width: "100%" }}>
        {/* Step 1: Name */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h2
              style={{
                fontFamily: "'Shrikhand', cursive",
                fontSize: "32px",
                fontWeight: 400,
                margin: "0 0 10px 0",
                color: COLORS.black,
                textAlign: "center",
              }}
            >
              What's your name?
            </h2>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleNameNext();
                }
              }}
              placeholder="Enter your name..."
              autoFocus
              style={{
                padding: "16px",
                fontSize: "18px",
                fontFamily: "'Space Grotesk', sans-serif",
                border: BRUTAL_BORDER,
                borderRadius: "8px",
                background: "white",
                boxShadow: BRUTAL_SHADOW_SM,
                boxSizing: "border-box",
                width: "100%",
              }}
            />

            <BrutalButton
              onClick={handleNameNext}
              disabled={!name.trim()}
              bg={COLORS.yellow}
              style={{ width: "100%" }}
            >
              Next →
            </BrutalButton>
          </div>
        )}

        {/* Step 2: Avatar */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h2
              style={{
                fontFamily: "'Shrikhand', cursive",
                fontSize: "32px",
                fontWeight: 400,
                margin: "0 0 10px 0",
                color: COLORS.black,
                textAlign: "center",
              }}
            >
              Pick your avatar!
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                gap: "12px",
              }}
            >
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  style={{
                    background: "white",
                    border: selectedAvatar === avatar.id ? `3px solid ${COLORS.orange}` : BRUTAL_BORDER_SM,
                    boxShadow: BRUTAL_SHADOW_SM,
                    borderRadius: "12px",
                    padding: "12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    minHeight: "100px",
                    transition: "all 0.15s",
                  }}
                  onMouseDown={(e) => {
                    if (selectedAvatar !== avatar.id) {
                      e.currentTarget.style.transform = "translate(1px, 1px)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "translate(0, 0)";
                    e.currentTarget.style.boxShadow = BRUTAL_SHADOW_SM;
                  }}
                >
                  <div style={{ fontSize: "40px" }}>{avatar.emoji}</div>
                  <p
                    style={{
                      fontSize: "10px",
                      fontFamily: "'Space Mono', monospace",
                      margin: 0,
                      color: COLORS.black,
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    {avatar.label}
                  </p>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: "12px 24px",
                  background: "white",
                  border: BRUTAL_BORDER,
                  boxShadow: BRUTAL_SHADOW,
                  borderRadius: "8px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "18px",
                  cursor: "pointer",
                  flex: 1,
                  transition: "all 0.1s",
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translate(2px, 2px)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translate(0, 0)";
                  e.currentTarget.style.boxShadow = BRUTAL_SHADOW;
                }}
              >
                ← Back
              </button>
              <BrutalButton onClick={handleAvatarNext} bg={COLORS.yellow} style={{ flex: 1 }}>
                Next →
              </BrutalButton>
            </div>
          </div>
        )}

        {/* Step 3: Module */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h2
              style={{
                fontFamily: "'Shrikhand', cursive",
                fontSize: "32px",
                fontWeight: 400,
                margin: "0 0 10px 0",
                color: COLORS.black,
                textAlign: "center",
              }}
            >
              What are you practicing?
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => setSelectedModule(module.id)}
                  style={{
                    background: "white",
                    border: selectedModule === module.id ? `4px solid ${getModuleColor(module.id)}` : BRUTAL_BORDER,
                    borderLeft: `8px solid ${getModuleColor(module.id)}`,
                    boxShadow: BRUTAL_SHADOW_SM,
                    borderRadius: "8px",
                    padding: "14px 16px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseDown={(e) => {
                    if (selectedModule !== module.id) {
                      e.currentTarget.style.transform = "translate(1px, 1px)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "translate(0, 0)";
                    e.currentTarget.style.boxShadow = BRUTAL_SHADOW_SM;
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "16px",
                      fontWeight: 700,
                      color: COLORS.black,
                    }}
                  >
                    {module.name}
                  </p>
                  <p
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "12px",
                      fontFamily: "'Space Mono', monospace",
                      color: "#666",
                    }}
                  >
                    Grades {module.grades}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      color: "#777",
                    }}
                  >
                    {module.description}
                  </p>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: "12px 24px",
                  background: "white",
                  border: BRUTAL_BORDER,
                  boxShadow: BRUTAL_SHADOW,
                  borderRadius: "8px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "18px",
                  cursor: "pointer",
                  flex: 1,
                  transition: "all 0.1s",
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translate(2px, 2px)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translate(0, 0)";
                  e.currentTarget.style.boxShadow = BRUTAL_SHADOW;
                }}
              >
                ← Back
              </button>
              <BrutalButton onClick={handleModuleComplete} bg={COLORS.yellow} style={{ flex: 1 }}>
                Let's Go! →
              </BrutalButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
