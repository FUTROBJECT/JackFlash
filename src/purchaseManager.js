import { isModuleUnlocked, unlockModule, getPurchases, addPurchase, setBundlePurchased, isBundlePurchased } from "./dataManager.js";
import { getModule } from "./modules/moduleRegistry.js";

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
  return Object.values(PRODUCTS).map(product => ({
    ...product,
    purchased: product.type === "bundle"
      ? bundlePurchased
      : purchases.includes(product.id),
  }));
}

// Simulated purchase — this entire function gets replaced by StoreKit in Phase 5
export function purchaseProduct(productId) {
  const product = PRODUCTS[productId];
  if (!product) return { success: false, error: "Unknown product" };

  if (product.type === "bundle") {
    unlockModule("multiply");
    unlockModule("add");
    unlockModule("fractions");
    unlockModule("placeValue");
    setBundlePurchased();
    addPurchase(productId);
    return { success: true, product };
  }

  if (product.type === "module_unlock") {
    unlockModule(product.moduleId);
    addPurchase(productId);
    return { success: true, product };
  }

  return { success: false, error: "Unknown product type" };
}

// Simulated restore — also gets replaced by StoreKit in Phase 5
export function restorePurchases() {
  const { purchases, bundlePurchased } = getPurchases();
  if (bundlePurchased) {
    unlockModule("multiply");
    unlockModule("add");
    unlockModule("fractions");
    unlockModule("placeValue");
  }
  purchases.forEach(productId => {
    const product = PRODUCTS[productId];
    if (product?.moduleId) unlockModule(product.moduleId);
  });
  return { restored: purchases.length + (bundlePurchased ? 1 : 0) };
}
