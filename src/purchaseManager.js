/**
 * Purchase Manager for JackFlash
 *
 * Manages in-app purchase simulation and free tier content gating.
 * Currently uses localStorage to simulate purchases.
 * In production, this will be integrated with StoreKit (iOS) / Play Billing (Android)
 * via Capacitor.
 */

import { isModuleUnlocked, unlockModule } from "./dataManager.js";
import { getModule } from "./modules/moduleRegistry.js";

/**
 * Product definitions for JackFlash purchases
 * Includes individual module unlocks and bundle options
 */
export const PRODUCTS = {
  "module.multiply.full": {
    id: "module.multiply.full",
    name: "Multiply & Divide — Full Access",
    description: "Unlock all table groups (3s & 4s, 6s–9s)",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "multiply",
  },
  "module.add": {
    id: "module.add",
    name: "Add & Subtract",
    description: "Addition & subtraction fact families, facts to 20",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "add",
  },
  "module.fractions": {
    id: "module.fractions",
    name: "Fractions",
    description: "Equivalent fractions, comparing, fraction arithmetic",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "fractions",
  },
  "module.placevalue": {
    id: "module.placevalue",
    name: "Place Value",
    description: "Composing/decomposing numbers, place value discs",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "placeValue",
  },
  "bundle.all": {
    id: "bundle.all",
    name: "All Modules Bundle",
    description: "Unlock everything — all current and future modules",
    price: "$9.99",
    priceValue: 9.99,
    type: "bundle",
  },
};

/**
 * Check if a specific content group is accessible
 * Applies free tier gating based on module's freeContent array
 *
 * @param {string} moduleId - The module ID (e.g., "multiply")
 * @param {string} groupId - The content group ID (e.g., "easy", "hard")
 * @returns {boolean} True if the content group is accessible
 */
export function isContentAccessible(moduleId, groupId) {
  // If bundle is purchased, all content is accessible
  if (localStorage.getItem("jackflash_bundle_purchased") === "true") {
    return true;
  }

  // If this module's full unlock product is purchased
  const purchases = JSON.parse(localStorage.getItem("jackflash_purchases") || "[]");
  const moduleUnlockProductId = `module.${moduleId}.full`;
  if (purchases.includes(moduleUnlockProductId)) {
    return true;
  }

  // For multiply, also check for the old "module.multiply.full" without full
  if (moduleId === "multiply" && isModuleUnlocked("multiply")) {
    // Check if this is actually the full unlock (not just free tier)
    // The bundle and module-specific purchases bypass free content restrictions
    if (purchases.includes("module.multiply.full")) {
      return true;
    }
  }

  // Check if this group is in the free content array
  const module = getModule(moduleId);
  if (module && module.freeContent && module.freeContent.includes(groupId)) {
    return true;
  }

  return false;
}

/**
 * Check if a module is fully unlocked (all content available)
 *
 * @param {string} moduleId - The module ID
 * @returns {boolean} True if the module is fully unlocked
 */
export function isModuleFullyUnlocked(moduleId) {
  // If bundle is purchased, all modules are fully unlocked
  if (localStorage.getItem("jackflash_bundle_purchased") === "true") {
    return true;
  }

  // Check if the specific module product is purchased
  const purchases = JSON.parse(localStorage.getItem("jackflash_purchases") || "[]");
  const moduleUnlockProductId = `module.${moduleId}.full`;
  if (purchases.includes(moduleUnlockProductId)) {
    return true;
  }

  return false;
}

/**
 * Simulate a purchase (development/testing)
 * In production, this would call StoreKit/Play Billing APIs
 *
 * @param {string} productId - The product ID to purchase
 * @returns {Object} Purchase result with success status and product details
 */
export function purchaseProduct(productId) {
  const product = PRODUCTS[productId];
  if (!product) {
    return { success: false, error: "Unknown product" };
  }

  if (product.type === "bundle") {
    // Unlock all modules
    unlockModule("multiply");
    unlockModule("add");
    unlockModule("fractions");
    unlockModule("placeValue");

    // Store bundle purchase flag
    localStorage.setItem("jackflash_bundle_purchased", "true");
    return { success: true, product };
  }

  if (product.type === "module_unlock") {
    unlockModule(product.moduleId);

    // Store specific product purchase
    const purchases = JSON.parse(localStorage.getItem("jackflash_purchases") || "[]");
    if (!purchases.includes(productId)) {
      purchases.push(productId);
      localStorage.setItem("jackflash_purchases", JSON.stringify(purchases));
    }

    return { success: true, product };
  }

  return { success: false, error: "Unknown product type" };
}

/**
 * Restore purchases from localStorage
 * Simulates checking purchase history on app launch
 *
 * @returns {Object} Restoration result with count of restored purchases
 */
export function restorePurchases() {
  const purchases = JSON.parse(localStorage.getItem("jackflash_purchases") || "[]");
  const bundlePurchased = localStorage.getItem("jackflash_bundle_purchased") === "true";

  // Restore bundle purchases
  if (bundlePurchased) {
    unlockModule("multiply");
    unlockModule("add");
    unlockModule("fractions");
    unlockModule("placeValue");
  }

  // Restore individual module purchases
  purchases.forEach(productId => {
    const product = PRODUCTS[productId];
    if (product?.moduleId) {
      unlockModule(product.moduleId);
    }
  });

  return { restored: purchases.length + (bundlePurchased ? 1 : 0) };
}

/**
 * Get all products with their current purchase status
 * Used for rendering the shop/products screen
 *
 * @returns {Array<Object>} Array of products with purchase and availability status
 */
export function getProductsWithStatus() {
  return Object.values(PRODUCTS).map(product => ({
    ...product,
    purchased: product.type === "bundle"
      ? localStorage.getItem("jackflash_bundle_purchased") === "true"
      : product.moduleId ? isModuleUnlocked(product.moduleId) : false,
    available: product.type === "bundle" || product.moduleId === "multiply",
  }));
}
