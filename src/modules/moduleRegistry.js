/**
 * Module Registry System
 *
 * Manages registration and retrieval of JackFlash learning modules
 * Each module is a self-contained definition with metadata, content configuration,
 * fact generation logic, and React components.
 */

const moduleRegistry = {};

/**
 * Register a new module in the registry
 * @param {Object} moduleDefinition - Complete module definition with metadata, config, and components
 */
export function registerModule(moduleDefinition) {
  if (!moduleDefinition.id) {
    throw new Error("Module definition must have an 'id' property");
  }
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
