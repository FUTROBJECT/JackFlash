/**
 * Module Registry System
 *
 * Manages registration and retrieval of JackFlash learning modules
 * Each module is a self-contained definition with metadata, content configuration,
 * fact generation logic, and React components.
 */

const moduleRegistry = {};

// Tester build (`npm run cap:sync:tester` / `npm run dev:tester`, Jack's phone):
// every module is open. The store build never sets VITE_JF_TESTER.
export const IS_TESTER_BUILD = import.meta.env.VITE_JF_TESTER === "1";

// Built but not shipped yet (Add & Subtract ships in 1.1): their practice screens are imported (App.jsx) but they
// only register in the tester build. In the store build they are absent from
// onboarding, profile creation and the module picker, and show only as
// "Coming Soon" in the Parent Zone store (purchaseManager PRODUCTS).
const STAGED_MODULES = new Set(["placeValue"]);

/**
 * Register a new module in the registry
 * @param {Object} moduleDefinition - Complete module definition with metadata, config, and components
 */
export function registerModule(moduleDefinition) {
  if (!moduleDefinition.id) {
    throw new Error("Module definition must have an 'id' property");
  }
  if (STAGED_MODULES.has(moduleDefinition.id) && !IS_TESTER_BUILD) return;
  moduleRegistry[moduleDefinition.id] = moduleDefinition;
}

/**
 * Retrieve a complete module definition by ID
 * @param {string} moduleId - The module ID
 * @returns {Object|null} The module definition, or null if not found
 */
export function getModule(moduleId) {
  return moduleRegistry[moduleId] || null;
}

/**
 * Get all registered modules
 * @returns {Object} Object mapping module IDs to their full definitions
 */
export function getAllModules() {
  return { ...moduleRegistry };
}

/**
 * Get a lightweight list of module metadata (for navigation, UI lists, etc.)
 * Returns only: id, name, grades, color, description
 * Does not include components or detailed configuration
 *
 * @returns {Array<Object>} Array of module metadata objects
 */
export function getModuleList() {
  return Object.values(moduleRegistry).map((module) => ({
    id: module.id,
    name: module.name,
    grades: module.grades,
    color: module.color,
    description: module.description,
  }));
}
