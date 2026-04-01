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

function SkipLink({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "14px",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#999",
        textDecoration: "underline",
        padding: 0,
      }}
    >
      Skip
    </button>
  );
}

function ProgressDots({ current, total }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "8px",
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: i === current ? COLORS.black : "transparent",
            border: `2px solid ${COLORS.black}`,
          }}
        />
      ))}
    </div>
  );
}

const GRID_BG = `
  repeating-linear-gradient(0deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px),
  repeating-linear-gradient(90deg, transparent, transparent 21px, rgba(0,0,0,0.06) 21px, rgba(0,0,0,0.06) 22px),
  ${COLORS.bg}
`;

// Screen 1: Welcome
function WelcomeScreen({ onNext, onSkip }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: GRID_BG,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        fontFamily: "'Space Grotesk', sans-serif",
        position: "relative",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 500 }}>
        {/* Logo Lockup */}
        <div style={{ marginBottom: "16px" }}>
          <LogoLockup size="large" stacked />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "18px",
            color: "#666",
            margin: "0 0 40px 0",
            lineHeight: 1.6,
          }}
        >
          Math practice that builds understanding,<br />
          not just memorization.
        </p>

        {/* CTA Button */}
        <BrutalButton onClick={onNext} bg={COLORS.yellow} style={{ fontSize: "36px", padding: "16px 40px", display: "inline-block" }}>
          Get Started
        </BrutalButton>

        {/* Skip link — centered below Get Started */}
        <div style={{ marginTop: "36px" }}>
          <button
            onClick={onSkip}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Shrikhand', cursive",
              fontSize: "28px",
              color: COLORS.black,
              padding: 0,
              letterSpacing: "0.5px",
            }}
          >
            Skip
          </button>
        </div>
      </div>

      <ProgressDots current={0} total={3} />
    </div>
  );
}

// Screen 2: CPA Idea
function CPAScreen({ onNext, onSkip }) {
  const panels = [
    {
      label: "See it",
      title: "Concrete",
      color: COLORS.green,
      description: "Count the dots to understand what multiplication means",
      showDots: true,
      dotOpacity: 1,
    },
    {
      label: "Picture it",
      title: "Pictorial",
      color: COLORS.orange,
      description: "The dots fade as the pattern becomes familiar",
      showDots: true,
      dotOpacity: 0.4,
    },
    {
      label: "Know it",
      title: "Abstract",
      color: COLORS.purple,
      description: "Numbers only — you've mastered it!",
      showDots: false,
      dotOpacity: 0,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: GRID_BG,
        padding: "40px 20px",
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        {/* Title */}
        <h2
          style={{
            fontFamily: "'Shrikhand', cursive",
            fontSize: "28px",
            fontWeight: 400,
            margin: "0 0 40px 0",
            color: COLORS.black,
            textAlign: "center",
          }}
        >
          How JackFlash Works
        </h2>

        {/* Panels Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          {panels.map((panel, idx) => (
            <div
              key={idx}
              style={{
                background: "white",
                border: BRUTAL_BORDER_SM,
                borderTop: `6px solid ${panel.color}`,
                borderRadius: "8px",
                padding: "24px",
                textAlign: "center",
              }}
            >
              {/* Dots Visualization */}
              <div style={{ marginBottom: "20px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {panel.showDots ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "8px",
                    }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: COLORS.black,
                          opacity: panel.dotOpacity,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "24px",
                      fontWeight: 700,
                      color: COLORS.black,
                    }}
                  >
                    3 × 4 = 12
                  </div>
                )}
              </div>

              {/* Label */}
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  margin: "0 0 8px 0",
                  color: COLORS.black,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {panel.label}
              </p>

              {/* Description */}
              <p
                style={{
                  fontSize: "13px",
                  color: "#666",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {panel.description}
              </p>
            </div>
          ))}
        </div>

        {/* Next Button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <BrutalButton onClick={onNext} bg={COLORS.yellow} style={{ width: "100%", maxWidth: 200 }}>
            Next
          </BrutalButton>
        </div>
      </div>

      <ProgressDots current={1} total={3} />
      <SkipLink onClick={onSkip} />
    </div>
  );
}

// Screen 3: Create First Profile
function CreateProfileScreen({ onComplete, onSkip }) {
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("robot-blue");
  const [selectedModule, setSelectedModule] = useState("multiply");

  const modules = getModuleList();
  const isFormValid = name.trim() !== "";

  const handleComplete = () => {
    if (isFormValid) {
      onComplete({
        name: name.trim(),
        avatar: selectedAvatar,
        activeModule: selectedModule,
      });
    }
  };

  const getModuleColor = (moduleId) => {
    return MODULE_COLORS[moduleId] || COLORS.blue;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: GRID_BG,
        padding: "40px 20px",
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto", width: "100%" }}>
        {/* Title */}
        <h2
          style={{
            fontFamily: "'Shrikhand', cursive",
            fontSize: "28px",
            fontWeight: 400,
            margin: "0 0 30px 0",
            color: COLORS.black,
            textAlign: "center",
          }}
        >
          Who's practicing?
        </h2>

        {/* Name Input */}
        <div style={{ marginBottom: "30px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 700,
              color: COLORS.black,
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && isFormValid) {
                handleComplete();
              }
            }}
            placeholder="Enter a name..."
            autoFocus
            style={{
              padding: "14px 16px",
              fontSize: "16px",
              fontFamily: "'Space Grotesk', sans-serif",
              border: BRUTAL_BORDER,
              borderRadius: "8px",
              background: "white",
              boxShadow: BRUTAL_SHADOW_SM,
              boxSizing: "border-box",
              width: "100%",
            }}
          />
        </div>

        {/* Avatar Grid */}
        <div style={{ marginBottom: "30px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 700,
              color: COLORS.black,
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Pick an Avatar
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
              gap: "10px",
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
                  borderRadius: "8px",
                  padding: "10px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s",
                  minHeight: "90px",
                  justifyContent: "center",
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
                <div style={{ fontSize: "36px", lineHeight: 1 }}>{avatar.emoji}</div>
                <p
                  style={{
                    fontSize: "9px",
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
        </div>

        {/* Module Picker */}
        <div style={{ marginBottom: "30px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 700,
              color: COLORS.black,
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            What are you practicing?
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                  padding: "12px 14px",
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
                    margin: "0 0 3px 0",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: COLORS.black,
                  }}
                >
                  {module.name}
                </p>
                <p
                  style={{
                    margin: "0 0 2px 0",
                    fontSize: "11px",
                    fontFamily: "'Space Mono', monospace",
                    color: "#666",
                  }}
                >
                  Grades {module.grades}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    color: "#777",
                  }}
                >
                  {module.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <BrutalButton
          onClick={handleComplete}
          disabled={!isFormValid}
          bg={COLORS.yellow}
          style={{ width: "100%", fontSize: "18px" }}
        >
          Let's Go!
        </BrutalButton>
      </div>

      <ProgressDots current={2} total={3} />
      <SkipLink onClick={onSkip} />
    </div>
  );
}

export default function Onboarding({ onComplete }) {
  const [screen, setScreen] = useState(0); // 0: Welcome, 1: CPA, 2: CreateProfile

  const handleSkip = () => {
    onComplete({
      name: "Player 1",
      avatar: "lightning-yellow",
      activeModule: "multiply",
    });
  };

  const handleNext = () => {
    if (screen < 2) {
      setScreen(screen + 1);
    }
  };

  return (
    <div
      style={{
        opacity: 1,
        transition: "opacity 0.3s ease",
      }}
    >
      {screen === 0 && <WelcomeScreen onNext={handleNext} onSkip={handleSkip} />}
      {screen === 1 && <CPAScreen onNext={handleNext} onSkip={handleSkip} />}
      {screen === 2 && <CreateProfileScreen onComplete={onComplete} onSkip={handleSkip} />}
    </div>
  );
}
