import { unlockModule, getPurchases, addPurchase, setBundlePurchased, isBundlePurchased, getMastery } from "./dataManager.js";
import { getModule } from "./modules/moduleRegistry.js";
import { DEFAULT_MASTERY_THRESHOLD } from "./constants.js";
import { FRACTION_POOL } from "./modules/fractions.jsx";

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
    available: false, // Multiply/Divide is the free module — not sold
    free: true, // included with the app; shown in the store as "Included", never "Coming Soon"
  },
  "module.add.full": {
    id: "module.add.full",
    name: "Add & Subtract",
    description: "Number bonds & facts to 20, plus adding & subtracting to 10,000 with bar models",
    gradeRange: "Grades K–3",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "add",
    available: false, // flip to true when module ships (after play-test)
  },
  "module.fractions.full": {
    id: "module.fractions.full",
    name: "Fractions",
    description: "Foundations group is free to try. Unlock equivalent fractions, comparing & ordering, and fraction add & subtract.",
    gradeRange: "Grades 2–4",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "fractions",
    available: true,
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
  "module.connections.full": {
    id: "module.connections.full",
    name: "Connections — Capstone",
    description: "The capstone module: fraction of a group (Grade 4 stretch / enrichment), two-step word problems, and mixed shuffle drill",
    gradeRange: "Grade 3 Capstone (fraction-of-quantity: Grade 4 stretch / enrichment)",
    price: "$3.99",
    priceValue: 3.99,
    type: "module_unlock",
    moduleId: "connections",
    available: false, // flip to true when module ships
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

// A module is "locked" when it has no free tier and hasn't been purchased —
// it shouldn't be selectable in onboarding, profile creation, or the module
// picker until a parent unlocks it in the Parent Zone.
export function isModuleLocked(moduleId) {
  if (isModuleFullyUnlocked(moduleId)) return false;
  const mod = getModule(moduleId);
  return !(mod?.freeContent?.length > 0);
}

// ============================================================================
// CONNECTIONS CAPSTONE GATE
// ----------------------------------------------------------------------------
// Two independent layers must both pass:
//   Layer 1: purchase entitlement (isModuleFullyUnlocked)
//   Layer 2: Multiply mastered + Divide mastered + Fractions mastered
//
// Null-guards every mastery read — new profiles have no mastery object.
// Returns { unlocked, multiplyMastered, divideMastered, fractionsMastered }
// so the locked-state card can show per-prerequisite progress.
// ============================================================================

function _checkMultiplyMastered(multiplyMastery) {
  const m = multiplyMastery || {};
  const tables = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const t of tables) {
    for (let i = 1; i <= 10; i++) {
      const key = `${t}x${i}`;
      if ((m[key]?.correct || 0) < DEFAULT_MASTERY_THRESHOLD) return false;
    }
  }
  return true;
}

function _checkDivideMastered(multiplyMastery) {
  const m = multiplyMastery || {};
  const tables = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const t of tables) {
    for (let i = 1; i <= 10; i++) {
      const product = t * i;
      const key1 = `${product}÷${t}`;
      const key2 = `${product}÷${i}`;
      if ((m[key1]?.correct || 0) < DEFAULT_MASTERY_THRESHOLD) return false;
      if ((m[key2]?.correct || 0) < DEFAULT_MASTERY_THRESHOLD) return false;
    }
  }
  return true;
}

function _checkFractionsMastered(fractionsMastery) {
  const m = fractionsMastery || {};
  // FRACTION_POOL is imported at the top of this file — check all pool items
  return FRACTION_POOL.length > 0 && FRACTION_POOL.every(
    item => (m[item.itemKey]?.correct || 0) >= DEFAULT_MASTERY_THRESHOLD
  );
}

export function getConnectionsPrereqStatus(profileId) {
  // Null-guard: profileId may be undefined/null during rendering of new profiles
  if (!profileId) {
    return { unlocked: false, purchaseOk: false, multiplyMastered: false, divideMastered: false, fractionsMastered: false };
  }

  const purchaseOk = isModuleFullyUnlocked("connections");
  const multiplyMastery = getMastery(profileId, "multiply") || {};
  const fractionsMastery = getMastery(profileId, "fractions") || {};

  const multiplyMastered = _checkMultiplyMastered(multiplyMastery);
  const divideMastered = _checkDivideMastered(multiplyMastery);
  const fractionsMastered = _checkFractionsMastered(fractionsMastery);

  const unlocked = purchaseOk && multiplyMastered && divideMastered && fractionsMastered;

  return { unlocked, purchaseOk, multiplyMastered, divideMastered, fractionsMastered };
}

export function isConnectionsUnlocked(profileId) {
  return getConnectionsPrereqStatus(profileId).unlocked;
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

// ----------------------------------------------------------------------------
// RevenueCat native provider (Phase 2 scaffold).
//
// The SDK import is a STATIC specifier so Vite bundles the plugin JS for the
// native build (flipped from the pre-install @vite-ignore scaffold once
// @revenuecat/purchases-capacitor was installed). This code path only runs
// inside a native Capacitor shell (isNativePlatform()); on web the
// simulatedProvider is used, so web/gh-pages behavior is unchanged.
//
// TO GO LIVE (Phase 2):
//   2. Paste the public SDK keys below (RevenueCat dashboard → API keys, per platform).
//   3. In the RevenueCat dashboard: create one Entitlement per unlock and attach the
//      matching App Store / Play product. Name the *store product identifiers* the
//      same as our internal product ids so purchase() can match them:
//        entitlement "fractions" → store product "module.fractions.full"
//        entitlement "all"       → store product "bundle.all"
//      (and add an entitlement per future module as they ship).
//   4. Verify the plugin's return shapes against the installed version — the RC
//      Capacitor API has shifted across majors; adjust the destructuring if needed.
// ----------------------------------------------------------------------------
const REVENUECAT_KEYS = {
  ios: "REVENUECAT_IOS_PUBLIC_SDK_KEY__TODO",
  android: "REVENUECAT_ANDROID_PUBLIC_SDK_KEY__TODO",
};

// RevenueCat entitlement id → our internal product id (what applyEntitlement expects).
const RC_ENTITLEMENT_TO_PRODUCT = {
  fractions: "module.fractions.full",
  all: "bundle.all",
  // add: "module.add.full", connections: "module.connections.full"  // v1.1/v1.2
};

// Lazy-loaded on first use; static specifier so the bundler includes the plugin.
// NOTE: resolves to a WRAPPER, never the plugin proxy itself — returning the
// proxy from an async function triggers thenable assimilation (the engine
// probes `.then`, Capacitor's proxy fabricates a native "then()" method, and
// the await hangs forever with an UNIMPLEMENTED rejection). Same fix as
// getPreferences() in storage.js.
let _rc = null;
async function loadRevenueCat() {
  if (!_rc) {
    const mod = await import("@revenuecat/purchases-capacitor");
    _rc = { Purchases: mod.Purchases || (mod.default && mod.default.Purchases) || mod.default };
  }
  return _rc;
}

// Mirror every active RevenueCat entitlement into our local entitlement cache.
function applyActiveEntitlements(customerInfo) {
  const active = (customerInfo && customerInfo.entitlements && customerInfo.entitlements.active) || {};
  Object.keys(active).forEach((entId) => {
    const productId = RC_ENTITLEMENT_TO_PRODUCT[entId];
    if (productId) applyEntitlement(productId);
  });
}

const nativeProvider = {
  id: "native",

  async init() {
    const { Purchases } = await loadRevenueCat();
    const platform = (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || "ios";
    const apiKey = platform === "android" ? REVENUECAT_KEYS.android : REVENUECAT_KEYS.ios;
    await Purchases.configure({ apiKey });
    // Pull whatever the store already knows for this user (covers reinstalls).
    const { customerInfo } = await Purchases.getCustomerInfo();
    applyActiveEntitlements(customerInfo);
  },

  async purchase(productId) {
    const product = PRODUCTS[productId];
    if (!product) return { status: "error", productId, error: "Unknown product." };
    if (product.available === false) return { status: "error", productId, error: "This product isn't available yet." };
    if (isProductOwned(productId)) return { status: "already_owned", productId };

    const { Purchases } = await loadRevenueCat();
    const offerings = await Purchases.getOfferings();
    const pkgs = (offerings && offerings.current && offerings.current.availablePackages) || [];
    const pkg = pkgs.find((p) => p.product && p.product.identifier === productId);
    if (!pkg) return { status: "error", productId, error: "Product not found in store offerings." };

    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      applyActiveEntitlements(customerInfo);
      applyEntitlement(productId); // ensure the just-bought item is applied even if the entitlement map lags
      return { status: "purchased", productId };
    } catch (err) {
      if (err && (err.userCancelled || err.code === "PURCHASE_CANCELLED")) {
        return { status: "cancelled", productId };
      }
      return { status: "error", productId, error: String(err && err.message ? err.message : err) };
    }
  },

  async restore() {
    const { Purchases } = await loadRevenueCat();
    const { customerInfo } = await Purchases.restorePurchases();
    applyActiveEntitlements(customerInfo);
    const restored = Object.keys((customerInfo && customerInfo.entitlements && customerInfo.entitlements.active) || {}).length;
    return { status: "ok", restored };
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
