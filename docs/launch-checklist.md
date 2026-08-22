# JackFlash — App Store v1 Launch: Readiness Status & Punch List

**Audited:** 2026-08-21 (full repo verification sweep — build, flags, offline, assets, compliance).
**Verdict: the repo is launch-ready.** Everything left is off-repo: toolchain, store accounts, and wiring.

**Runbooks (the how-to lives there, not here):**
- `docs/LAUNCH-native-setup.md` — toolchain → native projects → icons → signing → submission
- `docs/LAUNCH-revenuecat-setup.md` — store product + entitlement + keys for the Fractions purchase
- `CLAUDE.md` → "Launch (App Store / Play)" — canonical key state

---

## v1 launch shape (verified in code, 2026-08-21)

- **Multiply & Divide** — free, all groups ("✓ Included" in store)
- **Fractions** — $3.99 (`module.fractions.full`), **Foundations group free to try** (`freeContent: ["foundations"]`)
- **Add & Subtract, Place Value, Connections (capstone)** — built/staged, `available:false`, shown as grayed "Coming Soon" teasers
- **Bundle ($9.99)** — auto-hidden until 3+ paid modules are `available` (honest-discount rule, `BUNDLE_MIN_PAID_MODULES`); surfaces by itself later
- **Restore Purchases** — present (Apple requirement)
- App id: `com.laserlabstudio.jackflash`

---

## ✅ Verified in-repo (audit summary)

- [x] Build clean, zero warnings (398 kB / 116 kB gzip)
- [x] No `__test_` hooks; git clean on `main`
- [x] Product flags exactly as the launch shape above
- [x] Dormant modules unregistered in `App.jsx` (imports commented; no routes)
- [x] Connections gate: purchase + mastery prerequisites (`getConnectionsPrereqStatus`) — the old `CONNECTIONS_GATE_BYPASS` flag no longer exists; earlier checklist item retired
- [x] Fonts self-hosted (8 local .woff2, no CDN refs anywhere)
- [x] Fully offline: zero runtime network calls (`fetch`/XHR/beacon: none)
- [x] `capacitor.config.json` correct (appId/appName/webDir); `build:cap`/`cap:*` scripts + Vite base switch correct
- [x] Capacitor deps installed (core/ios/android/preferences v8); RevenueCat scaffold inert with `__TODO` keys; both lazy `@vite-ignore` imports in place
- [x] Icon (1024²ˣ³) + splash (2732², light/dark) sources ready in `assets/`
- [x] Privacy Policy + Terms real and current (COPPA, local-only storage, no tracking); `public/privacy.html` + `public/support.html` ready for gh-pages
- [x] Kids compliance: no ads/analytics/tracking SDKs; store behind the Parent Zone math gate

Cleanup nits (optional, non-blocking): `debugGetAllData()` export in `dataManager.js` is unused dev tooling.

---

## Remaining — all off-repo (in order)

### 1. Accounts (lead times — start first)
- [ ] Apple Developer Program ($99/yr; 1–2 days)
- [ ] RevenueCat account (free tier)
- [ ] (Later) Google Play Console ($25)

### 2. Native build (your Mac) — runbook: `LAUNCH-native-setup.md`
- [ ] Xcode + CocoaPods installed
- [ ] `npm i @revenuecat/purchases-capacitor` (only missing package)
- [ ] `npm run build:cap` → `npx cap add ios` → `npm run cap:sync`; commit `ios/`
- [ ] Flip the two `@vite-ignore` lazy imports to static (storage.js, purchaseManager.js) → re-sync
- [ ] `npx capacitor-assets generate` (sources already in `assets/`)
- [ ] Xcode: Team, bundle id, + In-App Purchase capability; run on simulator + device

### 3. Store wiring — runbook: `LAUNCH-revenuecat-setup.md`
- [x] App Store Connect app record + IAP `module.fractions.full` ($3.99 tier) — done 2026-08-22; Paid Apps agreement Active
- [x] RevenueCat: `fractions` entitlement → that product; `default` Offering current; iOS public key wired (commit faf184a)
- [ ] Do **not** create bundle/other products yet (staged)
- [ ] `npm run deploy` so privacy/support URLs are live; confirm contact email
- [ ] Metadata, screenshots, age rating, "data not collected", review notes (explain the parental math gate)

### 4. Device test pass (updated for 2026-08 features)
- [ ] Onboarding → profile → practice Multiply free; Fractions Foundations free, rest gated
- [ ] Kill & relaunch → progress **and session history** persist (live-session recovery lands with the correct date)
- [ ] Splash: "Let's Go" gate; with iOS Reduce Motion on → static lockup (expected, not a bug)
- [ ] Concrete mode: multiply array builder + divide grouping feel right under touch
- [ ] Fluency gates invisible: slow correct answers celebrate normally, no "too slow" anywhere
- [ ] Mode picker persists per module; Parent Zone "Lock CPA Mode" overrides and disables it
- [ ] **Tune fluency constants:** watch `[JF] responseMs` in the dev console during Jack's real practice; adjust `FLUENCY_MS_MULTIPLY`/`_DIVIDE` from his median/90th percentile before submit
- [ ] Airplane mode: launch + fonts + practice all work
- [ ] Store: Multiply Included / Fractions $3.99 / 3 Coming Soon / Restore — **no bundle card**
- [x] Sandbox purchase — passed on device 2026-08-22 (Sandbox sheet, $3.99, entitlement unlocked)
- [ ] Restore Purchases round-trip: delete app → reinstall from Xcode → Restore → Fractions returns without payment

### 5. Comps / free access (unchanged policy: store-native only)
- [ ] App Store promo codes per IAP (up to 100/batch) and/or RevenueCat promotional entitlements; TestFlight for pre-launch testers
