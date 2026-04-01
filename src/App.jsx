import { useState, useEffect, useCallback } from "react";
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

  // Force re-read of profiles after changes
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const profiles = data ? getAllProfiles() : [];
  const activeProfile = data ? getActiveProfile() : null;
  const parentSettings = data ? getParentSettings() : { masteryThreshold: 3 };

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
    setScreen("parentGate");
  };

  const handleParentGatePass = () => {
    setScreen("parentZone");
  };

  const handleBackToProfiles = () => {
    refresh();
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
      return (
        <MultiplicationPractice
          key={profile?.id}
          profileId={profile?.id}
          moduleId={profile?.activeModule || "multiply"}
          profileName={profile?.name}
          profileAvatar={profile?.avatar}
          onBack={handleBackToProfiles}
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
        />
      );
  }
}
