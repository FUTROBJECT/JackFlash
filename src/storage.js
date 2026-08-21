// ============================================================================
// DURABLE STORAGE BRIDGE  (native resilience for the data blob)
// ----------------------------------------------------------------------------
// The app's data layer (dataManager.js) is synchronous and reads localStorage
// during render. In a native Capacitor shell, iOS can purge WKWebView
// localStorage under storage pressure — which would wipe a child's progress.
//
// This bridge mirrors the data blob into @capacitor/preferences (backed by
// native UserDefaults / SharedPreferences, which the OS does NOT purge), and
// restores localStorage from it on launch if localStorage was cleared. The
// synchronous data layer is left untouched: localStorage stays the live,
// in-render layer; Preferences is a durable backup.
//
// SAFE ON WEB: every function below is a no-op unless running in a native shell
// (window.Capacitor). The plugin import is a STATIC specifier so Vite bundles
// the plugin JS for the native build (flipped from the pre-install @vite-ignore
// scaffold once @capacitor/preferences was installed — see launch checklist).
// ============================================================================

const KEY = "jackflash_data"; // must match DATA_KEY in dataManager.js

function isNative() {
  return typeof window !== "undefined"
    && !!window.Capacitor
    && typeof window.Capacitor.isNativePlatform === "function"
    && window.Capacitor.isNativePlatform();
}

// NOTE: resolve to a WRAPPER, never the plugin proxy itself. Returning the
// proxy from an async function triggers thenable assimilation — the JS engine
// probes `.then` on it, Capacitor's proxy fabricates a native "then()" method,
// and the await hangs forever ("Preferences.then() is not implemented on ios"
// + a white screen, since main.jsx gates the first render on hydrate).
let _prefsMod = null;
async function getPreferences() {
  if (!_prefsMod) {
    const mod = await import("@capacitor/preferences");
    _prefsMod = { Preferences: mod.Preferences || (mod.default && mod.default.Preferences) || mod.default };
  }
  return _prefsMod;
}

// Mirror the latest data blob into durable native storage. Fire-and-forget from
// callers (dataManager.saveData) — no-op on web.
export async function saveDurable(json) {
  if (!isNative()) return;
  try {
    const { Preferences } = await getPreferences();
    await Preferences.set({ key: KEY, value: json });
  } catch (err) {
    console.error("[JF] saveDurable failed:", err);
  }
}

// Run once at launch BEFORE the app renders (so the synchronous data layer sees
// the restored data). On native:
//   - if localStorage is intact, refresh the durable copy from it;
//   - if localStorage was purged but the durable copy exists, restore localStorage.
// No-op on web (resolves immediately, so web render isn't delayed).
export async function hydrateFromDurable() {
  if (!isNative()) return;
  try {
    const local = localStorage.getItem(KEY);
    if (local) {
      // localStorage is the source of truth when present — keep the backup current.
      saveDurable(local);
      return;
    }
    const { Preferences } = await getPreferences();
    const { value } = await Preferences.get({ key: KEY });
    if (value) {
      localStorage.setItem(KEY, value); // repair the sync layer for this session
      console.log("[JF] hydrateFromDurable: restored data from native Preferences");
    }
  } catch (err) {
    console.error("[JF] hydrateFromDurable failed:", err);
  }
}
