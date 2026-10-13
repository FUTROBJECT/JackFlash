# JackFlash — App Store v1 Launch: Readiness Status & Punch List

**Audited:** 2026-08-21 (full repo verification sweep — build, flags, offline, assets, compliance). **Updated:** 2026-10-12 (native build done; staged modules hidden in the store build; store sync run; build 1.0 (1) uploaded; screenshots rendered).
**Verdict: the repo is launch-ready.** Everything left is off-repo: toolchain, store accounts, and wiring.

**Runbooks (the how-to lives there, not here):**
- `docs/LAUNCH-native-setup.md` — toolchain → native projects → icons → signing → submission
- `docs/LAUNCH-revenuecat-setup.md` — store product + entitlement + keys for the Fractions purchase
- `CLAUDE.md` → "Launch (App Store / Play)" — canonical key state

---

## v1 launch shape (verified in code, 2026-08-21)

- **Multiply & Divide** — free, all groups ("✓ Included" in store)
- **Fractions** — $3.99 (`module.fractions.full`), **Foundations group free to try** (`freeContent: ["foundations"]`)
- **Add & Subtract, Place Value, Connections (capstone)** — built/staged, `available:false`, shown as grayed "Coming Soon" teasers. Add & Place Value are imported but unregistered outside the tester build (`STAGED_MODULES` in `moduleRegistry.js`, re-checked 2026-10-12)
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
- [x] Offline practice: the app's own code makes no network calls (`fetch`/XHR/beacon/WebSocket: none, re-checked 2026-10-12). The only network use is the native in-app purchase: the RevenueCat SDK talks to RevenueCat and Apple when the app starts and when a parent buys or restores. Web build: none.
- [x] `capacitor.config.json` correct (appId/appName/webDir); `build:cap`/`cap:*` scripts + Vite base switch correct
- [x] Capacitor deps installed (core/ios/android/preferences v8); RevenueCat installed, iOS key wired (Android key still `__TODO`); lazy imports flipped to static
- [x] Icon (1024²ˣ³) + splash (2732², light/dark) sources ready in `assets/`
- [x] Privacy Policy + Terms real and current (COPPA, local-only storage, no tracking); `public/privacy.html` + `public/support.html` published on GitHub Pages
- [x] Kids compliance: no ads/analytics/tracking SDKs; store behind the Parent Zone math gate

Cleanup nits (optional, non-blocking): `debugGetAllData()` export in `dataManager.js` is unused dev tooling.

---

## Remaining — all off-repo (in order)

### 1. Accounts (lead times — start first)
- [ ] Apple Developer Program ($99/yr; 1–2 days)
- [ ] RevenueCat account (free tier)
- [ ] (Later) Google Play Console ($25)

### 2. Native build (your Mac) — runbook: `LAUNCH-native-setup.md`
- [x] Xcode + CocoaPods installed
- [x] `npm i @revenuecat/purchases-capacitor`
- [x] `ios/` generated and committed (Capacitor 8, SPM plugins)
- [x] Lazy imports flipped to static (storage.js, purchaseManager.js)
- [x] `npx capacitor-assets generate`
- [x] Xcode: Team 9BA8CS8TP8, bundle id, In-App Purchase capability; device builds run on Adam's iPhone 16
- [ ] **Before every archive: `npm run cap:sync` (store build).** `cap:sync:tester` is for Jack's phone only — it opens every module and registers Add & Place Value.

### 3. Store wiring — runbook: `LAUNCH-revenuecat-setup.md`
- [x] App Store Connect app record + IAP `module.fractions.full` ($3.99 tier) — done 2026-08-22; Paid Apps agreement Active
- [x] RevenueCat: `fractions` entitlement → that product; `default` Offering current; iOS public key wired (commit faf184a)
- [ ] Do **not** create bundle/other products yet (staged)
- [x] Privacy/support URLs live (both 200, checked 2026-10-12) — they redeploy automatically whenever `main` is pushed (`.github/workflows/deploy.yml`)
- [ ] Confirm contact email (Laser Lab Studios / adamlaserlab@gmail.com)
- [x] **Screenshots rendered (2026-10-12):** 6 frames per slot in `screenshots/appstore/` — `iphone-6.3/` (1206 × 2622, the **required** 6.1"/6.3" slot), `iphone-6.9/` (1320 × 2868), `iphone-6.5/` (1284 × 2778), `ipad-13/` (2064 × 2752); from the store build with demo profiles; captions per `docs/voice-and-messaging.md`. Regenerate with `screenshots/appstore/compose.py` (README there). "File dimensions are invalid" = files dropped in the wrong slot.
- [x] **Screenshots uploaded** to the 1.0 version page (2026-10-12)
- [x] Review notes drafted (`JackFlash-AppStore-Listing.md` → App Review Notes; parental math gate, purchase-only network use)

### 3b. App Store version page (do while Beta App Review runs)
- [ ] Text: name, subtitle, promo text, description, keywords — paste from `JackFlash-AppStore-Listing.md`
- [ ] App Review Information: same review notes + contact as TestFlight; **sign-in required: off** (no accounts)
- [ ] In-App Purchases section: **attach Fractions Full (`module.fractions.full`) to version 1.0** — Apple reviews it with the app; easy to miss
- [ ] App Information: category Education; age rating questionnaire (expect 4+); privacy policy URL
- [ ] App Privacy: "Data Not Collected" (+ Purchase History, not linked / not tracking, if RevenueCat's current guidance requires it)
- [ ] Pricing and Availability: Free; territories
- [ ] License agreement: leave as Apple's standard EULA

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

### 📌 TestFlight — submitted 2026-10-12, waiting on Beta App Review
- [x] **Build 1.0 (1) uploaded to App Store Connect — 2026-10-12** (store build: Multiply + Fractions; Add/Place Value hidden; tagline "See it. Get it. Keep it."). Xcode's account login had gone stale (-501); removing and re-adding the Apple ID fixed it.
- [x] Build 1 processed (no email came — status shows in ASC → TestFlight; Apple's processing emails are unreliable)
- [x] Test Information filled (beta description, What to Test, feedback email, privacy URL, review notes; no TestFlight screenshots needed; sign-in not required)
- [x] External group "Friends" created, build 1 added, **submitted for Beta App Review (2026-10-12)** — Apple emails the account holder on approval/rejection; status also in ASC → TestFlight → Friends
- [ ] On approval: invite testers by email or enable the group's Public Link; give them ~1 week
- [ ] Triage feedback → if fixes are needed, archive 1.0 (2) (store sync first), else submit build 1 for App Store review
- [x] Build number bumped to 2 (2026-10-12) — the next archive is 1.0 (2); bump again after each upload
Re-upload recipe: `npm --prefix "<primary checkout>" run cap:sync` (store build, never the tester one; run against the primary checkout — a worktree's sync doesn't reach Xcode) → Any iOS Device → Product → Archive → Organizer → Distribute App → App Store Connect → Upload. Bump `CURRENT_PROJECT_VERSION` after each upload.

### 6. Submit for App Store review
- [ ] Section 3b complete and section 4 device pass done (at minimum: Restore round-trip, airplane mode, store screen)
- [ ] Version page → Build → add the tested build → **Submit for Review**

### 5. Comps / free access (unchanged policy: store-native only)
- [ ] App Store promo codes per IAP (up to 100/batch) and/or RevenueCat promotional entitlements; TestFlight for pre-launch testers
