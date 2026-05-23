import { useState } from "react";
import { COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM, MODULE_COLORS } from "./constants.js";
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

function ProgressDots({ current, total }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      gap: "8px",
      marginTop: "24px",
    }}>
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

/* ─── Screen 1: Welcome ─── */
function WelcomeScreen({ onNext }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: GRID_BG,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "20px",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      <div style={{ textAlign: "center", maxWidth: 500 }}>
        <div style={{ marginBottom: "16px" }}>
          <LogoLockup size="large" stacked />
        </div>

        <p style={{
          fontSize: "16px",
          color: "#666",
          margin: "0 0 32px 0",
          lineHeight: 1.6,
        }}>
          Math fact fluency, the right way.
        </p>

        <div style={{
          background: "white",
          border: BRUTAL_BORDER,
          borderRadius: "10px",
          padding: "20px",
          boxShadow: BRUTAL_SHADOW,
          textAlign: "left",
          marginBottom: "28px",
        }}>
          <p style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 14px", color: COLORS.black }}>
            Quick setup — under a minute:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { num: "1", color: COLORS.green, text: "Choose what to practice" },
              { num: "2", color: COLORS.blue, text: "See how JackFlash works" },
              { num: "3", color: COLORS.yellow, text: "Hand it to your child — they pick their name and avatar" },
            ].map((step) => (
              <div key={step.num} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "6px",
                  background: step.color, border: BRUTAL_BORDER_SM,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 700, flexShrink: 0,
                  boxShadow: BRUTAL_SHADOW_SM,
                }}>
                  {step.num}
                </div>
                <span style={{ fontSize: "13px", color: "#555" }}>{step.text}</span>
              </div>
            ))}
          </div>
        </div>

        <BrutalButton onClick={onNext} bg={COLORS.yellow} style={{ fontSize: "20px", padding: "14px 32px", width: "100%" }}>
          Get Started
        </BrutalButton>

        <ProgressDots current={0} total={4} />
      </div>
    </div>
  );
}

/* ─── Screen 2: Choose Module ─── */
function ModuleScreen({ selectedModule, onSelectModule, onNext, onBack }) {
  const modules = getModuleList();

  const getModuleColor = (moduleId) => MODULE_COLORS[moduleId] || COLORS.blue;

  // Placeholder future modules
  const futureModules = [
    { id: "add", name: "Add + Subtract", label: "Coming soon" },
    { id: "fractions", name: "Fractions", label: "Coming soon" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: GRID_BG,
      padding: "40px 20px",
      fontFamily: "'Space Grotesk', sans-serif",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}>
      <div style={{ maxWidth: 500, margin: "0 auto", width: "100%" }}>
        <p style={{
          fontSize: "11px", color: "#999", textTransform: "uppercase",
          letterSpacing: "1px", margin: "0 0 4px", fontWeight: 600,
          fontFamily: "'Space Mono', monospace", textAlign: "center",
        }}>
          Step 1 of 3
        </p>
        <h2 style={{
          fontFamily: "'Shrikhand', cursive",
          fontSize: "26px", fontWeight: 400,
          margin: "0 0 6px", color: COLORS.black, textAlign: "center",
        }}>
          What should we practice?
        </h2>
        <p style={{ fontSize: "13px", color: "#888", margin: "0 0 24px", textAlign: "center" }}>
          Choose based on what your child is learning in school
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => onSelectModule(module.id)}
              style={{
                background: "white",
                border: selectedModule === module.id ? `3px solid ${getModuleColor(module.id)}` : BRUTAL_BORDER,
                borderLeft: `6px solid ${getModuleColor(module.id)}`,
                boxShadow: BRUTAL_SHADOW_SM,
                borderRadius: "8px",
                padding: "14px 16px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: "0 0 3px", fontSize: "15px", fontWeight: 700, color: COLORS.black }}>
                    {module.name}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", fontFamily: "'Space Mono', monospace", color: "#666" }}>
                    {module.description} · Grades {module.grades}
                  </p>
                </div>
                {selectedModule === module.id && (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: getModuleColor(module.id), border: BRUTAL_BORDER_SM,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <div style={{ width: 8, height: 8, background: "white", borderRadius: "50%" }} />
                  </div>
                )}
              </div>
            </button>
          ))}

          {/* Future modules */}
          {futureModules.map((fm) => (
            <div
              key={fm.id}
              style={{
                background: "white",
                border: "2.5px solid #DDD",
                borderLeft: "6px solid #DDD",
                borderRadius: "8px",
                padding: "14px 16px",
                opacity: 0.5,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: 700, color: COLORS.black }}>{fm.name}</p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#999" }}>{fm.label}</p>
                </div>
                <span style={{
                  fontSize: "10px", background: "#E8E8E8", padding: "3px 10px",
                  borderRadius: "4px", color: "#888", fontWeight: 600,
                  fontFamily: "'Space Mono', monospace",
                }}>
                  Soon
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <BrutalButton onClick={onBack} bg="white" style={{ flex: 1 }}>
            ← Back
          </BrutalButton>
          <BrutalButton onClick={onNext} bg={COLORS.yellow} style={{ flex: 1 }}>
            Next →
          </BrutalButton>
        </div>

        <ProgressDots current={1} total={4} />
      </div>
    </div>
  );
}

/* ─── Screen 3: How it Works (CPA + Smart Practice) ─── */
function HowItWorksScreen({ onNext, onBack }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: GRID_BG,
      padding: "40px 20px",
      fontFamily: "'Space Grotesk', sans-serif",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}>
      <div style={{ maxWidth: 500, margin: "0 auto", width: "100%" }}>
        <p style={{
          fontSize: "11px", color: "#999", textTransform: "uppercase",
          letterSpacing: "1px", margin: "0 0 4px", fontWeight: 600,
          fontFamily: "'Space Mono', monospace", textAlign: "center",
        }}>
          Step 2 of 3
        </p>
        <h2 style={{
          fontFamily: "'Shrikhand', cursive",
          fontSize: "26px", fontWeight: 400,
          margin: "0 0 6px", color: COLORS.black, textAlign: "center",
        }}>
          How JackFlash Works
        </h2>
        <p style={{ fontSize: "13px", color: "#888", margin: "0 0 24px", textAlign: "center" }}>
          The same approach used in top classrooms
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {/* CPA: Concrete */}
          <div style={{
            background: "white", border: BRUTAL_BORDER, borderTop: `6px solid ${COLORS.green}`,
            borderRadius: "8px", padding: "16px", boxShadow: BRUTAL_SHADOW_SM,
          }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "5px" }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: COLORS.black, opacity: 1,
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.5px", color: COLORS.green, margin: "0 0 3px",
                }}>
                  See it — Concrete
                </p>
                <p style={{ fontSize: "12px", color: "#555", lineHeight: 1.5, margin: 0 }}>
                  Dot arrays show what 3 × 4 actually means. Kids count real groups, just like with blocks in class.
                </p>
              </div>
            </div>
          </div>

          {/* CPA: Pictorial */}
          <div style={{
            background: "white", border: BRUTAL_BORDER, borderTop: `6px solid ${COLORS.orange}`,
            borderRadius: "8px", padding: "16px", boxShadow: BRUTAL_SHADOW_SM,
          }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "5px" }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: COLORS.black, opacity: 0.3,
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.5px", color: COLORS.orange, margin: "0 0 3px",
                }}>
                  Picture it — Pictorial
                </p>
                <p style={{ fontSize: "12px", color: "#555", lineHeight: 1.5, margin: 0 }}>
                  The dots fade as the pattern becomes familiar. The scaffold is there when needed, gone when it's not.
                </p>
              </div>
            </div>
          </div>

          {/* CPA: Abstract */}
          <div style={{
            background: "white", border: BRUTAL_BORDER, borderTop: `6px solid ${COLORS.purple}`,
            borderRadius: "8px", padding: "16px", boxShadow: BRUTAL_SHADOW_SM,
          }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <div style={{
                flexShrink: 0, width: 50, textAlign: "center",
                fontFamily: "'Space Mono', monospace", fontSize: "15px",
                fontWeight: 700, color: COLORS.black, lineHeight: 1.4,
              }}>
                3×4<br />=12
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.5px", color: COLORS.purple, margin: "0 0 3px",
                }}>
                  Know it — Abstract
                </p>
                <p style={{ fontSize: "12px", color: "#555", lineHeight: 1.5, margin: 0 }}>
                  Numbers only. Your child owns the fact. Scaffolds step back, speed builds.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#DDD", margin: "4px 0" }} />

          {/* Smart Practice */}
          <div style={{
            background: "white", border: BRUTAL_BORDER,
            borderRadius: "8px", padding: "16px", boxShadow: BRUTAL_SHADOW_SM,
          }}>
            <p style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px", color: COLORS.black }}>
              Smart Practice, not random drills
            </p>
            <p style={{ fontSize: "12px", color: "#555", lineHeight: 1.5, margin: 0 }}>
              Struggling facts come up more often. Mastered facts space out over days. Every session is tailored to your child.
            </p>
          </div>

          {/* 5 minutes */}
          <div style={{
            background: "white", border: BRUTAL_BORDER,
            borderRadius: "8px", padding: "16px", boxShadow: BRUTAL_SHADOW_SM,
          }}>
            <p style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px", color: COLORS.black }}>
              5 minutes a day
            </p>
            <p style={{ fontSize: "12px", color: "#555", lineHeight: 1.5, margin: 0 }}>
              Short and frequent beats long and grinding. The daily streak keeps them coming back.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <BrutalButton onClick={onBack} bg="white" style={{ flex: 1 }}>
            ← Back
          </BrutalButton>
          <BrutalButton onClick={onNext} bg={COLORS.yellow} style={{ flex: 1 }}>
            Next →
          </BrutalButton>
        </div>

        <ProgressDots current={2} total={4} />
      </div>
    </div>
  );
}

/* ─── Screen 4: Hand it Over ─── */
function HandOverScreen({ onComplete, onBack }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: GRID_BG,
      padding: "40px 20px",
      fontFamily: "'Space Grotesk', sans-serif",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
    }}>
      <div style={{ maxWidth: 500, margin: "0 auto", width: "100%", textAlign: "center" }}>
        <p style={{
          fontSize: "11px", color: "#999", textTransform: "uppercase",
          letterSpacing: "1px", margin: "0 0 4px", fontWeight: 600,
          fontFamily: "'Space Mono', monospace",
        }}>
          Step 3 of 3
        </p>
        <h2 style={{
          fontFamily: "'Shrikhand', cursive",
          fontSize: "26px", fontWeight: 400,
          margin: "0 0 24px", color: COLORS.black,
        }}>
          Hand it to your child
        </h2>

        <div style={{
          background: "white", border: BRUTAL_BORDER,
          borderRadius: "12px", padding: "24px",
          boxShadow: BRUTAL_SHADOW, marginBottom: "20px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>👋</div>
          <p style={{ fontSize: "15px", color: "#555", lineHeight: 1.6, margin: "0 0 16px" }}>
            Next, your child will pick their <strong>name</strong> and <strong>avatar</strong>.
            Then they're ready to practice!
          </p>
          <div style={{
            borderTop: BRUTAL_BORDER_SM, paddingTop: "14px",
          }}>
            <p style={{ fontSize: "12px", color: "#888", lineHeight: 1.5, margin: 0 }}>
              You can manage settings, view progress, and switch modules anytime from the <strong>Settings</strong> tab on the home screen.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <BrutalButton onClick={onBack} bg="white" style={{ flex: 1 }}>
            ← Back
          </BrutalButton>
          <BrutalButton onClick={onComplete} bg={COLORS.yellow} style={{ flex: 2, fontSize: "20px" }}>
            Ready! →
          </BrutalButton>
        </div>

        <ProgressDots current={3} total={4} />
      </div>
    </div>
  );
}

/* ─── Main Onboarding Controller ─── */
export default function Onboarding({ onComplete }) {
  const [screen, setScreen] = useState(0);
  const [selectedModule, setSelectedModule] = useState("multiply");

  const handleComplete = () => {
    onComplete({ activeModule: selectedModule });
  };

  return (
    <div style={{ opacity: 1, transition: "opacity 0.3s ease" }}>
      {screen === 0 && (
        <WelcomeScreen onNext={() => setScreen(1)} />
      )}
      {screen === 1 && (
        <ModuleScreen
          selectedModule={selectedModule}
          onSelectModule={setSelectedModule}
          onNext={() => setScreen(2)}
          onBack={() => setScreen(0)}
        />
      )}
      {screen === 2 && (
        <HowItWorksScreen
          onNext={() => setScreen(3)}
          onBack={() => setScreen(1)}
        />
      )}
      {screen === 3 && (
        <HandOverScreen
          onComplete={handleComplete}
          onBack={() => setScreen(2)}
        />
      )}
    </div>
  );
}
