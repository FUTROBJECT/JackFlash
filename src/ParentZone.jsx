import { useState } from "react";
import { COLORS, BRUTAL_SHADOW, BRUTAL_SHADOW_SM, BRUTAL_BORDER, BRUTAL_BORDER_SM, MODULE_COLORS, DEFAULT_CHILD_SETTINGS, AVATARS } from "./constants.js";
import { getModuleList, getModule } from "./modules/moduleRegistry.js";
import { PRODUCTS, purchaseProduct, restorePurchases, getProductsWithStatus } from "./purchaseManager.js";
import { getAllAchievementsForProfile } from "./achievementEngine.js";
import LogoLockup from "./LogoLockup.jsx";
import { PrivacyPolicy, TermsOfService, HelpFAQ } from "./LegalPages.jsx";

// Helper component: Brutal button used throughout
function BrutalButton({ onClick, children, bg = "white", color = COLORS.black, small = false, active = false, style = {} }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? "7px 14px" : "12px 24px",
      borderRadius: "8px",
      border: BRUTAL_BORDER_SM,
      backgroundColor: bg,
      color,
      fontSize: small ? "13px" : "15px",
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "'Space Mono', monospace",
      boxShadow: active ? "none" : BRUTAL_SHADOW_SM,
      transform: active ? "translate(3px, 3px)" : "none",
      transition: "all 0.1s ease",
      ...style,
    }}>
      {children}
    </button>
  );
}

// Helper component: Custom toggle switch
function ToggleSwitch({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: "48px",
        height: "26px",
        backgroundColor: on ? COLORS.green : "#CCCCCC",
        border: `2px solid ${COLORS.black}`,
        borderRadius: "13px",
        padding: 0,
        cursor: "pointer",
        position: "relative",
        transition: "background-color 0.2s",
        display: "flex",
        alignItems: "center",
        padding: on ? "0 2px 0 0" : "0 0 0 2px",
      }}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          backgroundColor: "white",
          borderRadius: "10px",
          transition: "transform 0.2s",
          transform: on ? "translateX(22px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

// ============================================================================
// PARENT GATE COMPONENT
// ============================================================================
export function ParentGate({ onPass, onCancel }) {
  const [problem, setProblem] = useState(generateProblem());
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  // Rotate a brand color behind the box — a fresh one each time the gate appears.
  const [bgColor] = useState(() => {
    const palette = [COLORS.pink, COLORS.blue, COLORS.green, COLORS.yellow, COLORS.orange, COLORS.purple];
    return palette[Math.floor(Math.random() * palette.length)];
  });

  function generateProblem() {
    const first = Math.floor(Math.random() * (49 - 11 + 1)) + 11; // 11-49
    const second = Math.floor(Math.random() * (9 - 2 + 1)) + 2;   // 2-9
    return { first, second, correct: first * second };
  }

  const handleSubmit = () => {
    const userAnswer = parseInt(answer, 10);
    if (userAnswer === problem.correct) {
      setAnswer("");
      setFeedback("");
      setProblem(generateProblem());
      onPass();
    } else {
      setFeedback("Try again");
      setAnswer("");
      setProblem(generateProblem());
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      // Rotating solid brand color behind the box
      backgroundColor: bgColor,
      padding: "20px",
      fontFamily: "'Space Grotesk', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ maxWidth: 400, textAlign: "center" }}>
        <div style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "12px",
          border: BRUTAL_BORDER,
          boxShadow: BRUTAL_SHADOW,
          marginBottom: "20px",
        }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: 700,
            marginBottom: "20px",
            color: COLORS.black,
          }}>
            Parent Verification
          </h2>

          <div style={{
            fontSize: "32px",
            fontWeight: 700,
            marginBottom: "20px",
            fontFamily: "'Space Mono', monospace",
            color: COLORS.black,
          }}>
            What is {problem.first} × {problem.second}?
          </div>

          <input
            type="number"
            placeholder="Enter answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "18px",
              borderRadius: "8px",
              border: BRUTAL_BORDER_SM,
              marginBottom: "15px",
              fontFamily: "'Space Mono', monospace",
              boxShadow: BRUTAL_SHADOW_SM,
              textAlign: "center",
              boxSizing: "border-box",
            }}
          />

          {feedback && (
            <div style={{
              fontSize: "14px",
              color: COLORS.red,
              marginBottom: "15px",
              fontWeight: 700,
            }}>
              {feedback}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <BrutalButton onClick={handleSubmit} bg={COLORS.green} color="white" style={{ flex: 1 }}>
              Submit
            </BrutalButton>
            <BrutalButton onClick={onCancel} style={{ flex: 1 }}>
              Back
            </BrutalButton>
          </div>

          <p style={{
            fontSize: "12px",
            marginTop: "15px",
            color: "#999",
            fontFamily: "'Space Mono', monospace",
          }}>
            This keeps little fingers out of the settings
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROGRESS REPORT SUB-COMPONENT
// ============================================================================
function ProgressReport({ profile }) {
  const mod = getModule(profile.activeModule);
  if (!mod) return null;

  const mastery = profile.mastery?.[profile.activeModule] || {};
  const masteryThreshold = 3; // Could come from parent settings

  // Normalize module content to generic { key, display } items. Fact-based
  // modules (multiply) expose generateFacts()/focusTables; pool-based modules
  // (fractions) expose a flat item pool grouped by group id.
  let allItems, groupStats;
  if (typeof mod.generateFacts === "function") {
    const facts = mod.generateFacts({ tables: mod.focusTables, operation: "mixed" });
    allItems = facts.map(f => ({ key: f.factKey, display: f.display }));
    groupStats = mod.groups.map(group => {
      const groupFacts = mod.generateFacts({ tables: group.tables, operation: "mixed" });
      const groupMastered = groupFacts.filter(f => (mastery[f.factKey]?.correct || 0) >= masteryThreshold).length;
      return { ...group, total: groupFacts.length, mastered: groupMastered };
    });
  } else {
    const pool = mod.pool || [];
    const itemDisplay = (item) =>
      item.itemKey.slice(item.itemKey.indexOf(":") + 1).replace(",", " vs ");
    allItems = pool.map(i => ({ key: i.itemKey, display: itemDisplay(i) }));
    groupStats = mod.groups.map(group => {
      const groupItems = pool.filter(i => i.group === group.id);
      const groupMastered = groupItems.filter(i => (mastery[i.itemKey]?.correct || 0) >= masteryThreshold).length;
      return { ...group, total: groupItems.length, mastered: groupMastered };
    });
  }

  // Calculate stats
  const totalFacts = allItems.length;
  const masteredFacts = allItems.filter(it => (mastery[it.key]?.correct || 0) >= masteryThreshold).length;
  const masteryPercent = totalFacts > 0 ? Math.round((masteredFacts / totalFacts) * 100) : 0;

  // Weakest items — both attempted-but-not-mastered and never-attempted
  const weakFacts = allItems
    .map(it => ({ ...it, level: mastery[it.key]?.correct || 0 }))
    .filter(it => it.level < masteryThreshold)
    .sort((a, b) => a.level - b.level)
    .slice(0, 10);

  // Session history
  const sessions = profile.sessionHistory || [];

  // Achievements with full details
  const allAchievements = getAllAchievementsForProfile(profile.id, mod);
  const earnedAchievements = allAchievements.filter(a => a.unlocked);

  return (
    <div style={{ padding: "12px 0" }}>
      {/* Overall mastery bar */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "14px", fontWeight: 600 }}>Overall Mastery</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px" }}>{masteredFacts}/{totalFacts} ({masteryPercent}%)</span>
        </div>
        <div style={{ height: "12px", background: "#E8E8E8", borderRadius: "6px", border: `2px solid ${COLORS.black}`, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${masteryPercent}%`, background: COLORS.green, transition: "width 0.5s ease", borderRadius: "4px" }} />
        </div>
      </div>

      {/* Session History — promoted to top of report for visibility */}
      <div style={{
        marginBottom: "16px",
        padding: "12px",
        background: COLORS.cream,
        borderRadius: "8px",
        border: BRUTAL_BORDER_SM,
      }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "14px",
          fontWeight: 700,
          marginBottom: sessions.length > 0 ? "10px" : "0",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}>
          <span style={{ fontSize: "16px" }}>📋</span> Session History
        </div>
        {sessions.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#888", margin: "8px 0 0 0", fontFamily: "'Space Mono', monospace" }}>
            No sessions recorded yet. Sessions are saved when your child finishes practicing.
          </p>
        ) : (
          <>
            {/* Column headers */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 0 4px 0", fontSize: "11px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "#888", borderBottom: `1px solid ${COLORS.black}20` }}>
              <span>Date</span>
              <span>Score</span>
              <span>Time</span>
            </div>
            {sessions.slice(0, 10).map((s, i) => {
              const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              const mins = Math.round((s.duration || 0) / 1000 / 60);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "12px", fontFamily: "'Space Mono', monospace", borderBottom: "1px solid #eee" }}>
                  <span>{new Date(s.recordedAt).toLocaleDateString()}</span>
                  <span>{s.correct}/{s.total} ({accuracy}%)</span>
                  <span>{mins > 0 ? `${mins}m` : "<1m"}</span>
                </div>
              );
            })}
            {sessions.length > 10 && (
              <div style={{ fontSize: "11px", color: "#888", textAlign: "center", marginTop: "6px", fontFamily: "'Space Mono', monospace" }}>
                Showing 10 of {sessions.length} sessions
              </div>
            )}
          </>
        )}
      </div>

      {/* Per-group breakdown */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>By Group</div>
        {groupStats.map(g => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ width: "100px", fontSize: "12px", fontFamily: "'Space Mono', monospace", color: g.color, fontWeight: 700 }}>{g.label}</span>
            <div style={{ flex: 1, height: "8px", background: "#E8E8E8", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${g.total > 0 ? (g.mastered / g.total * 100) : 0}%`, background: g.color, borderRadius: "4px" }} />
            </div>
            <span style={{ fontSize: "11px", fontFamily: "'Space Mono', monospace", minWidth: "40px", textAlign: "right" }}>{g.mastered}/{g.total}</span>
          </div>
        ))}
      </div>

      {/* Weak facts */}
      {weakFacts.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>Needs Practice</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {weakFacts.map(f => (
              <span key={f.key} style={{
                padding: "4px 8px", background: COLORS.cream, border: BRUTAL_BORDER_SM,
                borderRadius: "4px", fontSize: "12px", fontFamily: "'Space Mono', monospace",
              }}>{f.display}</span>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
          Achievements ({earnedAchievements.length}/{allAchievements.length})
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {allAchievements.map(a => (
            <span key={a.id} style={{
              padding: "4px 8px",
              background: a.unlocked ? COLORS.yellow : "#F0F0F0",
              border: BRUTAL_BORDER_SM,
              borderRadius: "4px", fontSize: "12px", fontFamily: "'Space Mono', monospace",
              opacity: a.unlocked ? 1 : 0.4,
              display: "inline-flex", alignItems: "center", gap: "4px",
            }}>
              <span style={{ fontSize: "14px" }}>{a.unlocked ? a.icon : "🔒"}</span>
              {a.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PARENT ZONE COMPONENT
// ============================================================================
export function ParentZone({
  profiles,
  parentSettings,
  initialTab,
  onBack,
  onUpdateProfile,
  onDeleteProfile,
  onResetMastery,
  onUpdateChildSettings,
  onUpdateParentSettings,
}) {
  const [activeTab, setActiveTab] = useState(initialTab || "children");
  const [expandedProfileId, setExpandedProfileId] = useState(null);
  const [confirmResetProfile, setConfirmResetProfile] = useState(null);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(null);
  const [purchaseMessage, setPurchaseMessage] = useState(null); // { tone, text } | null
  const [purchasePending, setPurchasePending] = useState(null); // productId | "restore" | null
  const [legalPage, setLegalPage] = useState(null); // "privacy" | "terms" | "help" | null
  const modules = getModuleList();

  const handleToggleSetting = (profileId, settingName, value) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    const newSettings = { ...profile.settings, [settingName]: value };
    onUpdateChildSettings(profileId, newSettings);
  };

  const handleChangeDropdown = (profileId, settingName, value) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    const newSettings = { ...profile.settings, [settingName]: value };
    onUpdateChildSettings(profileId, newSettings);
  };

  const handleResetMasteryConfirm = (profileId, moduleId) => {
    onResetMastery(profileId, moduleId);
    setConfirmResetProfile(null);
  };

  const handleDeleteProfileConfirm = (profileId) => {
    onDeleteProfile(profileId);
    setConfirmDeleteProfile(null);
  };

  const handleMasteryThresholdChange = (delta) => {
    const newThreshold = Math.min(5, Math.max(2, parentSettings.masteryThreshold + delta));
    onUpdateParentSettings({ masteryThreshold: newThreshold });
  };

  // Show a banner; success banners auto-clear, error banners stay until the
  // next purchase action. The identity check avoids clearing a newer message.
  const flashMessage = (msg) => {
    setPurchaseMessage(msg);
    if (msg && msg.tone === "success") {
      setTimeout(() => {
        setPurchaseMessage((current) => (current === msg ? null : current));
      }, 4000);
    }
  };

  const handlePurchase = async (productId) => {
    const product = PRODUCTS[productId];
    if (!product || purchasePending) return;

    setPurchasePending(productId);
    setPurchaseMessage(null);
    try {
      const result = await purchaseProduct(productId);
      if (result.status === "purchased") {
        flashMessage({ tone: "success", text: `✓ ${product.name} unlocked!` });
      } else if (result.status === "already_owned") {
        flashMessage({ tone: "success", text: `${product.name} is already unlocked.` });
      } else if (result.status === "cancelled") {
        // Parent backed out of the purchase — no message needed.
      } else {
        flashMessage({ tone: "error", text: result.error || "That purchase didn't go through. Please try again." });
      }
    } finally {
      setPurchasePending(null);
    }
  };

  const handleRestore = async () => {
    if (purchasePending) return;

    setPurchasePending("restore");
    setPurchaseMessage(null);
    try {
      const result = await restorePurchases();
      if (result.status === "ok") {
        flashMessage({
          tone: "success",
          text: result.restored > 0
            ? `Restored ${result.restored} purchase${result.restored === 1 ? "" : "s"}.`
            : "No previous purchases found for this account.",
        });
      } else {
        flashMessage({ tone: "error", text: result.error || "Restore failed. Please try again." });
      }
    } finally {
      setPurchasePending(null);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#FFFFFF",
      padding: "20px",
      fontFamily: "'Space Grotesk', sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        width: "100%",
      }}>
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <LogoLockup size="medium" subtitle="Parent Zone" style={{ marginBottom: "10px" }} />
          <BrutalButton onClick={onBack} style={{ marginBottom: "20px" }}>
            ← Back to Profiles
          </BrutalButton>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          borderBottom: `2px solid ${COLORS.black}`,
          paddingBottom: "10px",
        }}>
          {["children", "modules", "howItWorks", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: activeTab === tab ? COLORS.yellow : "transparent",
                color: COLORS.black,
                fontWeight: activeTab === tab ? 700 : 600,
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "13px",
                transition: "background-color 0.2s",
              }}
            >
              {tab === "children" && "Children"}
              {tab === "modules" && "Modules"}
              {tab === "howItWorks" && "How it Works"}
              {tab === "settings" && "Settings"}
            </button>
          ))}
        </div>

        {/* Legal / Help pages */}
        {legalPage === "privacy" && (
          <PrivacyPolicy onBack={() => setLegalPage(null)} />
        )}
        {legalPage === "terms" && (
          <TermsOfService onBack={() => setLegalPage(null)} />
        )}
        {legalPage === "help" && (
          <HelpFAQ onBack={() => setLegalPage(null)} />
        )}

        {/* TAB: Children */}
        {!legalPage && activeTab === "children" && (
          <div>
            {profiles.length === 0 ? (
              <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                border: BRUTAL_BORDER_SM,
                boxShadow: BRUTAL_SHADOW_SM,
              }}>
                <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                  No profiles created yet.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "12px",
                      border: BRUTAL_BORDER_SM,
                      boxShadow: BRUTAL_SHADOW_SM,
                      overflow: "hidden",
                    }}
                  >
                    {/* Card header - always visible */}
                    <button
                      onClick={() => setExpandedProfileId(expandedProfileId === profile.id ? null : profile.id)}
                      style={{
                        width: "100%",
                        padding: "15px",
                        border: "none",
                        backgroundColor: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        justifyContent: "space-between",
                        textAlign: "left",
                      }}
                    >
                      {(() => {
                        const avatarDef = AVATARS.find((a) => a.id === profile.avatar);
                        const avatarEmoji = avatarDef?.emoji || "🤖";
                        const avatarLabel = avatarDef?.label;
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                            <div style={{ fontSize: "32px" }}>{avatarEmoji}</div>
                            <div>
                              <div style={{
                                fontSize: "16px",
                                fontWeight: 700,
                                color: COLORS.black,
                              }}>
                                {profile.name}
                              </div>
                              <div style={{
                                fontSize: "12px",
                                color: "#666",
                                marginTop: "2px",
                              }}>
                                {avatarLabel ? `${avatarLabel} · ${profile.activeModule}` : profile.activeModule}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{
                        fontSize: "16px",
                        color: COLORS.black,
                      }}>
                        {expandedProfileId === profile.id ? "−" : "+"}
                      </div>
                    </button>

                    {/* Card body - only when expanded */}
                    {expandedProfileId === profile.id && (
                      <div style={{
                        padding: "15px",
                        borderTop: BRUTAL_BORDER_SM,
                        display: "flex",
                        flexDirection: "column",
                        gap: "15px",
                      }}>
                        {/* Module selector */}
                        <div>
                          <label style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 700,
                            marginBottom: "6px",
                            color: COLORS.black,
                          }}>
                            Active Module
                          </label>
                          <select
                            value={profile.activeModule}
                            onChange={(e) => onUpdateProfile(profile.id, { activeModule: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "8px",
                              borderRadius: "8px",
                              border: BRUTAL_BORDER_SM,
                              fontFamily: "'Space Grotesk', sans-serif",
                              fontSize: "14px",
                              cursor: "pointer",
                              boxSizing: "border-box",
                            }}
                          >
                            {modules.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Show Scaffold Button toggle */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}>
                          <label style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: COLORS.black,
                          }}>
                            Show Scaffold Button
                          </label>
                          <ToggleSwitch
                            on={profile.settings.showScaffoldButton}
                            onChange={(value) => handleToggleSetting(profile.id, "showScaffoldButton", value)}
                          />
                        </div>

                        {/* Show Hint Button toggle */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}>
                          <label style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: COLORS.black,
                          }}>
                            Show Hint Button
                          </label>
                          <ToggleSwitch
                            on={profile.settings.showHintButton}
                            onChange={(value) => handleToggleSetting(profile.id, "showHintButton", value)}
                          />
                        </div>

                        {/* Lock CPA Mode dropdown */}
                        <div>
                          <label style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 700,
                            marginBottom: "6px",
                            color: COLORS.black,
                          }}>
                            Lock CPA Mode
                          </label>
                          <select
                            value={profile.settings.lockedMode || ""}
                            onChange={(e) => handleChangeDropdown(profile.id, "lockedMode", e.target.value || null)}
                            style={{
                              width: "100%",
                              padding: "8px",
                              borderRadius: "8px",
                              border: BRUTAL_BORDER_SM,
                              fontFamily: "'Space Grotesk', sans-serif",
                              fontSize: "14px",
                              cursor: "pointer",
                              boxSizing: "border-box",
                            }}
                          >
                            <option value="">Unlocked</option>
                            <option value="concrete">Concrete</option>
                            <option value="pictorial">Pictorial</option>
                            <option value="abstract">Abstract</option>
                          </select>
                        </div>

                        {/* Lock Operation dropdown — operations from active module */}
                        {(() => {
                          const profileMod = getModule(profile.activeModule);
                          const operations = profileMod?.operations || [];
                          return (
                            <div>
                              <label style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: 700,
                                marginBottom: "6px",
                                color: COLORS.black,
                              }}>
                                Lock Operation
                              </label>
                              <select
                                value={profile.settings.lockedOperation || ""}
                                onChange={(e) => handleChangeDropdown(profile.id, "lockedOperation", e.target.value || null)}
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  borderRadius: "8px",
                                  border: BRUTAL_BORDER_SM,
                                  fontFamily: "'Space Grotesk', sans-serif",
                                  fontSize: "14px",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="">Any Operation</option>
                                {operations.map((op) => (
                                  <option key={op.id} value={op.id}>{op.label}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}

                        {/* Progress Report */}
                        <div style={{ borderTop: "1px solid #eee", marginTop: "12px", paddingTop: "12px" }}>
                          <ProgressReport profile={profile} />
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "10px" }}>
                          {confirmResetProfile === profile.id ? (
                            <div style={{
                              display: "flex",
                              gap: "10px",
                              flex: 1,
                            }}>
                              <BrutalButton
                                onClick={() => handleResetMasteryConfirm(profile.id, profile.activeModule)}
                                bg={COLORS.red}
                                color="white"
                                small
                                style={{ flex: 1 }}
                              >
                                Confirm Reset
                              </BrutalButton>
                              <BrutalButton
                                onClick={() => setConfirmResetProfile(null)}
                                small
                                style={{ flex: 1 }}
                              >
                                Cancel
                              </BrutalButton>
                            </div>
                          ) : (
                            <BrutalButton
                              onClick={() => setConfirmResetProfile(profile.id)}
                              bg={COLORS.red}
                              color="white"
                              small
                              style={{ flex: 1 }}
                            >
                              Reset Progress
                            </BrutalButton>
                          )}
                        </div>

                        {/* Delete button */}
                        <div>
                          {confirmDeleteProfile === profile.id ? (
                            <div style={{
                              display: "flex",
                              gap: "10px",
                            }}>
                              <BrutalButton
                                onClick={() => handleDeleteProfileConfirm(profile.id)}
                                bg={COLORS.red}
                                color="white"
                                small
                                style={{ flex: 1 }}
                              >
                                Confirm Delete
                              </BrutalButton>
                              <BrutalButton
                                onClick={() => setConfirmDeleteProfile(null)}
                                small
                                style={{ flex: 1 }}
                              >
                                Cancel
                              </BrutalButton>
                            </div>
                          ) : (
                            <BrutalButton
                              onClick={() => setConfirmDeleteProfile(profile.id)}
                              bg={COLORS.red}
                              color="white"
                              small
                              style={{ width: "100%" }}
                            >
                              Delete Profile
                            </BrutalButton>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Module Store */}
        {!legalPage && activeTab === "modules" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Purchase message feedback */}
            {purchaseMessage && (
              <div style={{
                backgroundColor: purchaseMessage.tone === "error" ? COLORS.red : COLORS.green,
                color: "white",
                padding: "12px 15px",
                borderRadius: "8px",
                border: BRUTAL_BORDER_SM,
                fontSize: "14px",
                fontWeight: 700,
                textAlign: "center",
              }}>
                {purchaseMessage.text}
              </div>
            )}

            {/* Module cards from getProductsWithStatus */}
            {getProductsWithStatus().filter(p => p.type === "module_unlock" && p.available !== false).map((product) => {
              const moduleColor = MODULE_COLORS[product.moduleId] || COLORS.blue;
              const isPurchased = product.purchased;
              const isAvailable = product.available !== false;

              return (
                <div
                  key={product.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    border: BRUTAL_BORDER_SM,
                    boxShadow: BRUTAL_SHADOW_SM,
                    overflow: "hidden",
                    opacity: isAvailable ? 1 : 0.7,
                  }}
                >
                  <div style={{
                    padding: "15px",
                    borderBottom: BRUTAL_BORDER_SM,
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "8px",
                    }}>
                      {/* Module color marker (replaces the left stripe) */}
                      <span aria-hidden style={{
                        flexShrink: 0, width: "26px", height: "26px", borderRadius: "6px",
                        backgroundColor: moduleColor, border: BRUTAL_BORDER_SM,
                      }} />
                      <h3 style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        margin: 0,
                        flex: 1,
                        color: COLORS.black,
                      }}>
                        {product.name}
                      </h3>
                      {isPurchased ? (
                        <div style={{
                          backgroundColor: COLORS.green,
                          color: "white",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}>
                          ✓ Unlocked
                        </div>
                      ) : !isAvailable ? (
                        <div style={{
                          color: "#666",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}>
                          Coming Soon
                        </div>
                      ) : null}
                    </div>
                    <p style={{
                      fontSize: "12px",
                      color: "#666",
                      margin: "6px 0 0 0",
                    }}>
                      {product.gradeRange}
                    </p>
                    <p style={{
                      fontSize: "13px",
                      color: "#333",
                      margin: "8px 0 0 0",
                    }}>
                      {product.description}
                    </p>
                  </div>
                  {!isPurchased && isAvailable && (
                    <div style={{ padding: "12px 15px" }}>
                      <button
                        onClick={() => handlePurchase(product.id)}
                        disabled={purchasePending !== null}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: BRUTAL_BORDER_SM,
                          backgroundColor: COLORS.yellow,
                          color: COLORS.black,
                          fontWeight: 700,
                          cursor: purchasePending !== null ? "default" : "pointer",
                          opacity: purchasePending !== null && purchasePending !== product.id ? 0.5 : 1,
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: "13px",
                          boxShadow: BRUTAL_SHADOW_SM,
                        }}
                      >
                        {purchasePending === product.id ? "Purchasing…" : product.price}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bundle Card */}
            {(() => {
              const bundleProduct = PRODUCTS["bundle.all"];
              const { purchased: isPurchased } = getProductsWithStatus()
                .find(p => p.id === "bundle.all") || {};
              // Savings vs buying the currently-available paid modules individually.
              // Shown only when positive, so we never overstate the deal at launch.
              const paidNow = getProductsWithStatus().filter(p => p.type === "module_unlock" && p.available !== false);
              const indivTotal = paidNow.reduce((s, p) => s + (p.priceValue || 0), 0);
              const bundleSavings = indivTotal - (bundleProduct.priceValue || 0);
              return (
                <div
                  style={{
                    backgroundColor: COLORS.yellow,
                    borderRadius: "12px",
                    border: BRUTAL_BORDER_SM,
                    boxShadow: BRUTAL_SHADOW_SM,
                    overflow: "hidden",
                    marginTop: "8px",
                  }}
                >
                  <div style={{
                    padding: "15px",
                    borderBottom: BRUTAL_BORDER_SM,
                  }}>
                    <h3 style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      margin: 0,
                      color: COLORS.black,
                    }}>
                      Unlock All Modules
                    </h3>
                    <p style={{
                      fontSize: "12px",
                      color: "#333",
                      margin: "6px 0 0 0",
                      fontWeight: 700,
                    }}>
                      {bundleSavings > 0 ? `Best value — save $${bundleSavings.toFixed(2)}` : "Best value"}
                    </p>
                    <p style={{
                      fontSize: "13px",
                      color: "#333",
                      margin: "8px 0 0 0",
                    }}>
                      Get all current and future modules with one purchase.
                    </p>
                  </div>
                  <div style={{ padding: "12px 15px" }}>
                    {isPurchased ? (
                      <div style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: BRUTAL_BORDER_SM,
                        backgroundColor: COLORS.green,
                        color: "white",
                        fontWeight: 700,
                        fontSize: "13px",
                        textAlign: "center",
                      }}>
                        ✓ All Unlocked
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchase("bundle.all")}
                        disabled={purchasePending !== null}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: BRUTAL_BORDER_SM,
                          backgroundColor: COLORS.black,
                          color: "white",
                          fontWeight: 700,
                          cursor: purchasePending !== null ? "default" : "pointer",
                          opacity: purchasePending !== null && purchasePending !== "bundle.all" ? 0.5 : 1,
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: "13px",
                          boxShadow: BRUTAL_SHADOW_SM,
                        }}
                      >
                        {purchasePending === "bundle.all" ? "Purchasing…" : "$9.99"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Restore Purchases link */}
            <div style={{
              marginTop: "12px",
              textAlign: "center",
            }}>
              <button
                onClick={handleRestore}
                disabled={purchasePending !== null}
                style={{
                  background: "none",
                  border: "none",
                  color: COLORS.blue,
                  fontSize: "12px",
                  cursor: purchasePending !== null ? "default" : "pointer",
                  opacity: purchasePending !== null && purchasePending !== "restore" ? 0.5 : 1,
                  textDecoration: "underline",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                }}
              >
                {purchasePending === "restore" ? "Restoring…" : "Restore Purchases"}
              </button>
            </div>
          </div>
        )}

        {/* TAB: How it Works */}
        {!legalPage && activeTab === "howItWorks" && (
          <HelpFAQ onBack={() => setActiveTab("children")} />
        )}

        {/* TAB: Settings */}
        {!legalPage && activeTab === "settings" && (
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            border: BRUTAL_BORDER_SM,
            boxShadow: BRUTAL_SHADOW_SM,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}>
            {/* Mastery Threshold */}
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 700,
                marginBottom: "10px",
                color: COLORS.black,
              }}>
                Mastery Threshold
              </label>
              <p style={{
                fontSize: "12px",
                color: "#666",
                margin: "0 0 10px 0",
              }}>
                Correct answers to master a fact
              </p>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}>
                <BrutalButton
                  onClick={() => handleMasteryThresholdChange(-1)}
                  small
                  style={{ width: "40px", padding: "8px" }}
                >
                  −
                </BrutalButton>
                <div style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  fontFamily: "'Space Mono', monospace",
                  color: COLORS.black,
                  minWidth: "40px",
                  textAlign: "center",
                }}>
                  {parentSettings.masteryThreshold}
                </div>
                <BrutalButton
                  onClick={() => handleMasteryThresholdChange(1)}
                  small
                  style={{ width: "40px", padding: "8px" }}
                >
                  +
                </BrutalButton>
              </div>
            </div>

            {/* Info / Help links */}
            <div style={{
              borderTop: BRUTAL_BORDER_SM,
              paddingTop: "15px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setLegalPage("privacy"); }} style={{
                fontSize: "13px",
                color: COLORS.blue,
                textDecoration: "none",
                fontWeight: 600,
              }}>
                Privacy Policy
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); setLegalPage("terms"); }} style={{
                fontSize: "13px",
                color: COLORS.blue,
                textDecoration: "none",
                fontWeight: 600,
              }}>
                Terms of Service
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
