import { useState, useEffect, useCallback, useMemo } from "react";
import {
  initData,
  getAllProfiles,
  createProfile,
  setActiveProfile,
  getActiveProfile,
  deleteProfile,
  updateProfile,
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
import MultiplicationPractice from "./multiplication-practice.jsx";
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
  // Track which tab triggered the parent gate so we can route after passing
  const [gateDestination, setGateDestination] = useState("parentZone");
  // Track which profile's progress to view
  const [progressProfileId, setProgressProfileId] = useState(null);

  // Force re-read of profiles after changes
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
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
  const handleSelectProfile = (profileId) => {
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

  const handleOnboardingComplete = ({ name, avatar, activeModule }) => {
    completeOnboarding();
    const newProfile = createProfile({ name, avatar, activeModule });
    setActiveProfile(newProfile.id);
    refresh();
    setScreen("profilePicker");
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
      setHomeTab("modules");
      setGateDestination("parentZone");
      setScreen("parentGate");
    } else if (tabId === "settings") {
      setHomeTab("settings");
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
      return (
        <MultiplicationPractice
          key={profile?.id}
          profileId={profile?.id}
          moduleId={profile?.activeModule || "multiply"}
          profileName={profile?.name}
          profileAvatar={profile?.avatar}
          onBack={handleBackToProfiles}
          initialView={openProgress ? "progress" : "practice"}
        />
      );
    }
    default:
      return (
        <ProfilePicker
          profiles={profiles}
          onSelectProfile={handleSelectProfile}
          onAddProfile={handleAddProfile}
          onOpenParentZone={handleOpenParentZone}
          onViewProgress={handleViewProgress}
          activeTab={homeTab}
          onTabChange={handleTabChange}
          masteryData={masteryData}
          streakData={streakData}
        />
      );
  }
}
