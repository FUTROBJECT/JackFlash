# JackFlash — App Store Launch Checklist

**v1 scope:** Multiply/Divide (free) + Fractions (paid). Connections & Add are built but
**dormant** in v1 (unregistered), shipped later in v1.1/v1.2.
**Monetization:** paid from day 1 via in-app purchase.

- **Free:** Multiply/Divide — 100% free (the hook)
- **Paid:** Fractions — **$3.99** (`module.fractions.full`)
- **Bundle:** Unlock Everything — **$9.99** (`bundle.all`; includes future modules)
- App id: `com.laserlabstudios.jackflash`

---

## ✅ Already done (in the repo)

- [x] **Phase 1 — launch scoping:** Multiply free; Fractions paid; store shows only the 2 purchasables + Restore; Connections/Add unregistered & "Coming soon"; dynamic bundle-savings copy; conditional Vite base (`build:cap`).
- [x] **Phase 2 — IAP scaffold:** RevenueCat native provider in `purchaseManager.js` (init/purchase/restore → `applyEntitlement`), entitlement map, lazy SDK load. *Inert until keys + packages added.*
- [x] **Phase 3 prep (in-repo):**
  - [x] B1 — self-hosted fonts (`src/fonts.css`, `src/fonts/*.woff2`); CDN refs removed (offline-safe)
  - [x] B2 — `capacitor.config.ts`
  - [x] B3 — `cap:sync` / `cap:ios` / `cap:android` npm scripts
  - [x] B4 — durable storage bridge (`src/storage.js`) so progress survives a WKWebView purge

---

## Phase 0 — Accounts (start early; lead times)

- [ ] Apple Developer Program ($99/yr) — enrollment can take 1–2 days
- [ ] Google Play Console ($25 one-time) — for Android later
- [ ] RevenueCat account (free tier)

---

## Phase 3 (C–F) — Native build (your Mac)

### Prereqs (one-time)
- [ ] `xcode-select --install` + install Xcode from the App Store
- [ ] `brew install cocoapods`
- [ ] (Android, later) install Android Studio

### C. Install Capacitor + platforms
```bash
cd /path/to/JackFlash
npm i @capacitor/core @capacitor/ios @capacitor/android @capacitor/preferences @revenuecat/purchases-capacitor
npm i -D @capacitor/cli @capacitor/assets
npm run build:cap
npx cap add ios
npx cap add android        # optional / later
npx cap sync               # copies web → native, runs pod install
```
- [ ] Installed packages
- [ ] Added platform(s)
- [ ] **⚠️ Flip the two scaffold imports to static** (so Vite bundles the plugin JS for native):
  - `src/storage.js`: `await import(/* @vite-ignore */ PREFS_MODULE_ID)` → `await import("@capacitor/preferences")`
  - `src/purchaseManager.js`: `await import(/* @vite-ignore */ RC_MODULE_ID)` → `await import("@revenuecat/purchases-capacitor")`
  - then re-run `npm run cap:sync`
- [ ] Commit the generated `/ios` (and `/android`) folders

### D. Icons & splash
```bash
# add assets/icon.png (1024×1024) and optional assets/splash.png (2732×2732)
npx capacitor-assets generate
```
- [ ] Icon + splash generated

### E. Xcode config
```bash
npm run cap:ios
```
- [ ] **App** target → Signing & Capabilities → set **Team**; confirm bundle id `com.laserlabstudios.jackflash`
- [ ] **+ Capability → In-App Purchase**
- [ ] Build & run on a simulator and a real device

### F. Device test pass
- [ ] Onboarding → create profile → practice Multiply (free, all groups)
- [ ] **Quit & relaunch → progress persists**
- [ ] Parent Zone math gate works → store shows Fractions $3.99 + Unlock All $9.99 + Restore
- [ ] **Airplane mode → fonts still render** (offline check)
- [ ] Portrait / notch / safe-area look correct
- [ ] (after Phase 4 sandbox products) sandbox purchase + Restore work

---

## Phase 2 (go-live) — RevenueCat wiring

- [ ] In `purchaseManager.js`, set `REVENUECAT_KEYS.ios` / `.android` (RevenueCat → API keys)
- [ ] RevenueCat dashboard: create an **Entitlement** per unlock, attach the matching store product:
  - entitlement `fractions` → store product `module.fractions.full`
  - entitlement `all` → store product `bundle.all`
- [ ] Name the **store product identifiers** the same as our internal ids (`module.fractions.full`, `bundle.all`) so `purchase()` matches
- [ ] Verify the plugin's return shapes against the installed version (RC Capacitor API has shifted across majors)
- [ ] As Add/Connections ship: add their entitlements + uncomment the map lines in `RC_ENTITLEMENT_TO_PRODUCT`

---

## Phase 4 — App Store Connect (iOS submit)

- [ ] Create the app record (bundle id must match)
- [ ] Create **In-App Purchases** (ids must match `module.fractions.full`, `bundle.all`) + pricing tiers
- [ ] Link App Store Connect ↔ RevenueCat; configure offerings
- [ ] Metadata: name, subtitle, description, keywords, category
- [ ] Screenshots (required sizes)
- [ ] **Privacy Policy URL** (host `LegalPages` content — your gh-pages site works)
- [ ] Age rating + privacy "data not collected" (local-only storage)
- [ ] **Kids-app compliance:** no ads/3rd-party tracking (✓ none); IAP behind the parental gate (✓ Parent Zone math gate)
- [ ] Review notes: explain the parental gate + how to reach the store
- [ ] Submit (IAP reviewed with the first build) → review ~1–2 days

---

## Phase 5 — Android (fast-follow)

- [ ] `npx cap add android` (if not already) → `npm run cap:sync`
- [ ] Play Console: app record, IAP products (matching ids), pricing
- [ ] RevenueCat: link Play, add Android key
- [ ] Internal-testing track → then production
- [ ] Same privacy / content-rating / family-policy steps

---

## Handing out free access / comps (no app code)

The chosen approach — give content away free via the stores; **never a way to sell outside IAP**.

- [ ] **App Store IAP promo codes** — App Store Connect → your app → each In-App Purchase can generate **up to 100 promo codes**. Recipients redeem in the App Store ("Redeem Gift Card or Code"); the IAP unlocks free. Generate codes for `module.fractions.full` and/or `bundle.all`. (Regenerate per batch as needed.)
- [ ] **RevenueCat promotional entitlements** — RevenueCat dashboard → Customers → find/create the app user → **grant a promotional entitlement** (pick entitlement + duration, e.g. lifetime). Best for specific people you know (reviewers, teachers, family); works cross-platform.
- [ ] **Play Store (Android)** — Play Console promo codes for the IAP, or use the RevenueCat promo entitlement above.
- [ ] **TestFlight** — invite pre-launch testers; IAP is free/sandbox in TestFlight.

> Not building an in-app "redeem code" field for v1 (kept to the store-native, zero-policy-risk path). Revisit later if printed/offline/classroom codes are needed — it'd be a `purchaseManager.redeemCode()` → `applyEntitlement` feature behind the Parent Zone gate.

---

## Day-to-day workflow (after Phase 3)

- Feature/UI/logic work → edit `src/` (browser via `npm run dev` for fast iteration)
- To test on device: `npm run cap:sync` → Run ▶ in Xcode
- Native config (capabilities, Info.plist, plugins) → Xcode/native (rare)
- Do **not** hand-edit `/ios` `/android` (generated by `cap sync`)
- Web version still deploys via `npm run build` + gh-pages

---

## Pre-submit sanity sweep

- [ ] `CONNECTIONS_GATE_BYPASS === false`
- [ ] No `__test_*` hooks in shipped code
- [ ] Store shows exactly: Multiply (free) / Fractions $3.99 / Unlock All $9.99 / Restore Purchases
- [ ] Restore Purchases works (Apple requires it)
- [ ] Offline launch works (fonts + app)
- [ ] Progress persists across app kill
- [ ] `module.add.full` / `module.connections.full` stay `available:false` until those modules ship
