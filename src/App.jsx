import { useState, useEffect, useCallback, useMemo } from "react";
import {
  initData,
  getAllProfiles,
  createProfile,
  setActiveProfile,
  getActiveProfile,
  deleteProfile,
  updateProfile,
  setProfileAvatar,
  updateChildSettings,
  updateParentSettings,
  getParentSettings,
  resetMastery,
  isOnboardingComplete,
  completeOnboarding,
  getMastery,
  checkStreakOnLaunch,
  getProfile,
} from "./dataManager.js";
import { ProfilePicker, CreateProfile } from "./ProfilePicker.jsx";
import { ParentGate, ParentZone } from "./ParentZone.jsx";
import { initPurchases } from "./purchaseManager.js";
import MultiplicationPractice from "./multiplication-practice.jsx";
import FractionsPractice from "./fractions-practice.jsx";
// v1 ships Multiply/Divide + Fractions only. Connections (capstone) and Add & Subtract are
// built but intentionally NOT registered in v1 — re-enable these imports in v1.1/v1.2 to ship them.
// import ConnectionsPractice from "./connections-practice.jsx";
// import AddPractice from "./add-practice.jsx";
import Onboarding from "./Onboarding.jsx";

export default function App() {
  // Initialize data synchronously to avoid screen flash
  const [data, setData] = useState(() => initData());
  const [screen, setScreen] = useState(() => {
    initData(); // ensure data is loaded
    return isOnboardingComplete() ? "profilePicker" : "onboarding";
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [homeTab, setHomeTab] = useState("players");
  // Which Parent Zone tab to open on — set by the home button that was tapped
  const [parentZoneTab, setParentZoneTab] = useState("children");
  // Track which tab triggered the parent gate so we can route after passing
  const [gateDestination, setGateDestination] = useState("parentZone");
  // Track which profile's progress to view
  const [progressProfileId, setProgressProfileId] = useState(null);
  // Module selected during parent onboarding — passed to first profile creation
  const [onboardingModule, setOnboardingModule] = useState(null);

  // Force re-read of profiles after changes
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Initialize the purchase provider once at launch. No-op for the simulated
  // provider; the Step 2 native provider uses this to connect to the store.
  useEffect(() => {
    initPurchases();
  }, []);

  const profiles = data ? getAllProfiles() : [];
  const activeProfile = data ? getActiveProfile() : null;
  const parentSettings = data ? getParentSettings() : { masteryThreshold: 3 };

  // Build mastery + streak data for all profiles (for enriched cards)
  const masteryData = useMemo(() => {
    const result = {};
    profiles.forEach((p) => {
      result[p.id] = getMastery(p.id, p.activeModule) || {};
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length, refreshKey]);

  const streakData = useMemo(() => {
    const result = {};
    profiles.forEach((p) => {
      const profile = getProfile(p.id);
      result[p.id] = profile?.dailyStreak || { current: 0 };
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length, refreshKey]);

  // Handlers
  const handleSelectProfile = (profileId, moduleId) => {
    // If the kid chose a different module from the overlay, persist it now
    if (moduleId) {
      const profile = getProfile(profileId);
      if (profile && profile.activeModule !== moduleId) {
        updateProfile(profileId, { activeModule: moduleId });
      }
    }
    setActiveProfile(profileId);
    refresh();
    setScreen("practice");
  };

  const handleAddProfile = () => {
    setScreen("createProfile");
  };

  const handleCreateComplete = ({ name, avatar, activeModule }) => {
    const newProfile = createProfile({ name, avatar, activeModule });
    setActiveProfile(newProfile.id);
    setOnboardingModule(null); // Clear so future "Add Player" shows module step
    refresh();
    setScreen("profilePicker");
  };

  const handleOpenParentZone = () => {
    setGateDestination("parentZone");
    setScreen("parentGate");
  };

  const handleParentGatePass = () => {
    setScreen(gateDestination);
  };

  const handleBackToProfiles = () => {
    refresh();
    setHomeTab("players");
    setScreen("profilePicker");
  };

  const handleUpdateProfile = (profileId, updates) => {
    updateProfile(profileId, updates);
    refresh();
  };

  const handleSetProfileAvatar = (profileId, avatarId) => {
    setProfileAvatar(profileId, avatarId);
    refresh();
  };

  const handleDeleteProfile = (profileId) => {
    deleteProfile(profileId);
    refresh();
  };

  const handleResetMastery = (profileId, moduleId) => {
    resetMastery(profileId, moduleId);
    refresh();
  };

  const handleUpdateChildSettings = (profileId, settings) => {
    updateChildSettings(profileId, settings);
    refresh();
  };

  const handleUpdateParentSettings = (settings) => {
    updateParentSettings(settings);
    refresh();
  };

  const handleOnboardingComplete = ({ activeModule }) => {
    completeOnboarding();
    setOnboardingModule(activeModule);
    setScreen("createProfile");
  };

  const handleViewProgress = (profileId) => {
    setActiveProfile(profileId);
    setProgressProfileId(profileId);
    refresh();
    setScreen("practice");
    // We'll pass a flag to open practice in progress view
  };

  const handleTabChange = (tabId) => {
    if (tabId === "players") {
      setHomeTab("players");
      setScreen("profilePicker");
    } else if (tabId === "modules") {
      // Modules button → Parent Zone, opened on its Modules (store) tab
      setHomeTab("modules");
      setParentZoneTab("modules");
      setGateDestination("parentZone");
      setScreen("parentGate");
    } else if (tabId === "parentZone") {
      // Parent Zone button → Parent Zone, opened on its Children tab
      setHomeTab("parentZone");
      setParentZoneTab("children");
      setGateDestination("parentZone");
      setScreen("parentGate");
    }
  };

  if (!data) return null; // Loading

  switch (screen) {
    case "onboarding":
      return <Onboarding onComplete={handleOnboardingComplete} />;
    case "profilePicker":
      return (
        <ProfilePicker
          profiles={profiles}
          onSelectProfile={handleSelectProfile}
          onAddProfile={handleAddProfile}
          onOpenParentZone={handleOpenParentZone}
          onViewProgress={handleViewProgress}
          onSetAvatar={handleSetProfileAvatar}
          activeTab={homeTab}
          onTabChange={handleTabChange}
          masteryData={masteryData}
          streakData={streakData}
        />
      );
    case "createProfile":
      return (
        <CreateProfile
          onComplete={handleCreateComplete}
          onCancel={handleBackToProfiles}
          preselectedModule={onboardingModule}
        />
      );
    case "parentGate":
      return (
        <ParentGate
          onPass={handleParentGatePass}
          onCancel={handleBackToProfiles}
        />
      );
    case "parentZone":
      return (
        <ParentZone
          profiles={profiles}
          parentSettings={parentSettings}
          initialTab={parentZoneTab}
          onBack={handleBackToProfiles}
          onUpdateProfile={handleUpdateProfile}
          onDeleteProfile={handleDeleteProfile}
          onResetMastery={handleResetMastery}
          onUpdateChildSettings={handleUpdateChildSettings}
          onUpdateParentSettings={handleUpdateParentSettings}
        />
      );
    case "practice": {
      const profile = getActiveProfile();
      const openProgress = progressProfileId === profile?.id;
      // Clear the flag after using it
      if (openProgress) {
        setTimeout(() => setProgressProfileId(null), 0);
      }
      const activeModuleId = profile?.activeModule || "multiply";
      const commonProps = {
        profileId: profile?.id,
        moduleId: activeModuleId,
        profileName: profile?.name,
        profileAvatar: profile?.avatar,
        onBack: handleBackToProfiles,
        initialView: openProgress ? "progress" : "practice",
      };
      if (activeModuleId === "fractions") {
        return <FractionsPractice key={profile?.id} {...commonProps} />;
      }
      // v1.1+: connections / add branches re-enabled when those modules ship.
      return <MultiplicationPractice key={profile?.id} {...commonProps} />;
    }
    default:
      return (
        <ProfilePicker
          profiles={profiles}
          onSelectProfile={handleSelectProfile}
          onAddProfile={handleAddProfile}
          onOpenParentZone={handleOpenParentZone}
          onViewProgress={handleViewProgress}
          onSetAvatar={handleSetProfileAvatar}
          activeTab={homeTab}
          onTabChange={handleTabChange}
          masteryData={masteryData}
          streakData={streakData}
        />
      );
  }
}
