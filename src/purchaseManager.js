import { unlockModule, getPurchases, addPurchase, setBundlePurchased, isBundlePurchased } from "./dataManager.js";
import { getModule } from "./modules/moduleRegistry.js";

// ============================================================================
// PURCHASE MANAGER
// ----------------------------------------------------------------------------
// Two layers:
//
//   1. Entitlement cache (synchronous) — answers "what does this device own?"
//      from local storage. UI gating reads these and must stay synchronous so
//      they can run during render and work offline.
//
//   2. Purchase provider (asynchronous) — performs the actual buy / restore.
//      The SimulatedProvider is used on web and in dev. Step 2 will add a real
//      native provider (RevenueCat or a StoreKit / Play Billing plugin); when a
//      purchase is confirmed, the provider writes the entitlement into the
//      cache via applyEntitlement(), and the synchronous reads keep working.
//
// This file is the single seam between the app and "how purchases happen".
// ============================================================================

// ============================================================================
// PRODUCT CATALOG
// ============================================================================
export const PRODUCTS = {
  "module.multiply.full": {
    id: "module.multiply.full",
    name: "Multiply & Divide — Full Access",
    description: "Unlock all table groups (3s & 4s, 6s–9s)",
    gradeRange: "Grades 2–4",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "multiply",
    available: true,
  },
  "module.add.full": {
    id: "module.add.full",
    name: "Add & Subtract",
    description: "Addition & subtraction fact families, facts to 20",
    gradeRange: "Grades K–2",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "add",
    available: false,       // flip to true when module ships
  },
  "module.fractions.full": {
    id: "module.fractions.full",
    name: "Fractions",
    description: "Equivalent fractions, comparing, fraction arithmetic",
    gradeRange: "Grades 3–5",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "fractions",
    available: false,
  },
  "module.placevalue.full": {
    id: "module.placevalue.full",
    name: "Place Value",
    description: "Composing/decomposing numbers, place value discs",
    gradeRange: "Grades 1–3",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "placeValue",
    available: false,
  },
  "bundle.all": {
    id: "bundle.all",
    name: "All Modules Bundle",
    description: "Unlock everything — all current and future modules",
    price: "$9.99",
    priceValue: 9.99,
    type: "bundle",
    available: true,
  },
};

// All product ids that grant a single module unlock.
function moduleUnlockProducts() {
  return Object.values(PRODUCTS).filter((p) => p.type === "module_unlock");
}

// ============================================================================
// ENTITLEMENT CACHE (synchronous, local)
// ----------------------------------------------------------------------------
// Reads below answer "what does this device own?". With real IAP this is a
// *cache*: the provider verifies purchases with the store, then writes the
// confirmed entitlement here. The app's content gating reads stay synchronous.
// ============================================================================

export function isModuleFullyUnlocked(moduleId) {
  if (isBundlePurchased()) return true;
  const { purchases } = getPurchases();
  return purchases.includes(`module.${moduleId}.full`);
}

export function isContentAccessible(moduleId, groupId) {
  if (isModuleFullyUnlocked(moduleId)) return true;
  const mod = getModule(moduleId);
  return mod?.freeContent?.includes(groupId) ?? false;
}

export function getProductsWithStatus() {
  const { purchases } = getPurchases();
  const bundlePurchased = isBundlePurchased();
  return Object.values(PRODUCTS).map((product) => ({
    ...product,
    purchased: product.type === "bundle"
      ? bundlePurchased
      : purchases.includes(product.id),
  }));
}

function isProductOwned(productId) {
  return getProductsWithStatus().find((p) => p.id === productId)?.purchased === true;
}

// Writes a *confirmed* purchase into the local entitlement cache. Called by a
// provider once the store has verified the transaction. Idempotent.
function applyEntitlement(productId) {
  const product = PRODUCTS[productId];
  if (!product) return false;

  if (product.type === "bundle") {
    moduleUnlockProducts().forEach((p) => unlockModule(p.moduleId));
    setBundlePurchased();
    addPurchase(productId);
    return true;
  }

  if (product.type === "module_unlock") {
    unlockModule(product.moduleId);
    addPurchase(productId);
    return true;
  }

  return false;
}

// ============================================================================
// PURCHASE PROVIDERS (asynchronous)
// ----------------------------------------------------------------------------
// A provider performs the real buy / restore. Shape:
//
//   id: string
//   init(): Promise<void>
//   purchase(productId): Promise<PurchaseResult>
//   restore(): Promise<RestoreResult>
//
// PurchaseResult = { status, productId, error? }
//   status: "purchased" | "already_owned" | "cancelled" | "error"
// RestoreResult  = { status, restored, error? }
//   status: "ok" | "error"
// ============================================================================

// Simulated provider — used on web and in development. No real charge; the
// confirm() dialog stands in for the native purchase sheet so the cancel path
// is exercisable.
const simulatedProvider = {
  id: "simulated",

  async init() {
    // Nothing to connect to in simulation.
  },

  async purchase(productId) {
    const product = PRODUCTS[productId];
    if (!product) {
      return { status: "error", productId, error: "Unknown product." };
    }
    if (product.available === false) {
      return { status: "error", productId, error: "This product isn't available yet." };
    }
    if (isProductOwned(productId)) {
      return { status: "already_owned", productId };
    }

    const approved = typeof window !== "undefined" && typeof window.confirm === "function"
      ? window.confirm(`Buy ${product.name} for ${product.price}?\n\n(Simulated purchase — no real charge.)`)
      : true;
    if (!approved) {
      return { status: "cancelled", productId };
    }

    // Brief delay so callers can exercise their in-flight / pending UI state.
    await new Promise((resolve) => setTimeout(resolve, 250));

    applyEntitlement(productId);
    return { status: "purchased", productId };
  },

  async restore() {
    // In simulation the only record of past purchases is the local cache, so
    // restore simply re-applies it. A native provider asks the store instead.
    const { purchases, bundlePurchased } = getPurchases();
    purchases.forEach((id) => applyEntitlement(id));
    if (bundlePurchased) applyEntitlement("bundle.all");
    const restored = purchases.length + (bundlePurchased ? 1 : 0);
    return { status: "ok", restored };
  },
};

// Native provider — implemented in Step 2 against RevenueCat or a StoreKit /
// Play Billing plugin. Its purchase()/restore() will verify with the store and
// then call applyEntitlement() on success. Left unimplemented for now; it is
// never selected until Capacitor is installed (see isNativePlatform()).
const nativeProvider = {
  id: "native",
  async init() {
    throw new Error("Native purchase provider not implemented yet (Step 2).");
  },
  async purchase(productId) {
    throw new Error("Native purchase provider not implemented yet (Step 2).");
  },
  async restore() {
    throw new Error("Native purchase provider not implemented yet (Step 2).");
  },
};

// True only inside a Capacitor native shell. On web (and until Capacitor is
// added in Step 2) this is false, so the simulated provider is used.
function isNativePlatform() {
  return typeof window !== "undefined"
    && !!window.Capacitor
    && typeof window.Capacitor.isNativePlatform === "function"
    && window.Capacitor.isNativePlatform();
}

let _provider = null;

function getProvider() {
  if (!_provider) {
    _provider = isNativePlatform() ? nativeProvider : simulatedProvider;
  }
  return _provider;
}

// Exposed for tests / debugging — which provider is active.
export function getActiveProviderId() {
  return getProvider().id;
}

// ============================================================================
// PUBLIC ASYNC API
// ----------------------------------------------------------------------------
// The app calls these. Each wraps the active provider and never throws — a
// failed provider call comes back as a structured error result.
// ============================================================================

// Call once at app launch. No-op for the simulated provider; the native
// provider uses it to connect to the store and refresh entitlements.
export async function initPurchases() {
  try {
    await getProvider().init();
    return { ok: true };
  } catch (err) {
    console.error("[JF] initPurchases failed:", err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

export async function purchaseProduct(productId) {
  try {
    return await getProvider().purchase(productId);
  } catch (err) {
    console.error("[JF] purchaseProduct failed:", err);
    return {
      status: "error",
      productId,
      error: String(err && err.message ? err.message : err),
    };
  }
}

export async function restorePurchases() {
  try {
    return await getProvider().restore();
  } catch (err) {
    console.error("[JF] restorePurchases failed:", err);
    return {
      status: "error",
      restored: 0,
      error: String(err && err.message ? err.message : err),
    };
  }
}
