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
- [x] Legal name confirmed 2026-10-13: **Laser Lab Studio LLC** (site, privacy, support, in-app Terms all match). Contact adamlaserlab@gmail.com
- [x] **Screenshots rendered (2026-10-12):** 6 frames per slot in `screenshots/appstore/` — `iphone-6.3/` (1206 × 2622, the **required** 6.1"/6.3" slot), `iphone-6.9/` (1320 × 2868), `iphone-6.5/` (1284 × 2778), `ipad-13/` (2064 × 2752); from the store build with demo profiles; captions per `docs/voice-and-messaging.md`. Regenerate with `screenshots/appstore/compose.py` (README there). "File dimensions are invalid" = files dropped in the wrong slot.
- [x] **Screenshots uploaded** to the 1.0 version page (2026-10-12)
- [x] Review notes drafted (`JackFlash-AppStore-Listing.md` → App Review Notes; parental math gate, purchase-only network use)

### 3b. App Store version page (do while Beta App Review runs)
- [ ] Text: name, subtitle, promo text, description, keywords — paste from `JackFlash-AppStore-Listing.md`
- [ ] App Review Information: same review notes + contact as TestFlight; **sign-in required: off** (no accounts)
- [ ] In-App Purchases section: **attach Fractions Full (`module.fractions.full`) to version 1.0** — Apple reviews it with the app; easy to miss
- [ ] App Information: category Education; age rating questionnaire (expect 4+); privacy policy URL
- [ ] App Privacy: Purchase History only (App Functionality + Analytics; not linked; no tracking) — per RevenueCat's guidance; see the listing doc
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
- [x] Build number bumped to 2 (2026-10-12) — used by 1.1 (2); 1.1 (3) and (4) archived; now 5 for the next upload
Re-upload recipe: `npm --prefix "<primary checkout>" run cap:sync` (store build, never the tester one; run against the primary checkout — a worktree's sync doesn't reach Xcode) → Any iOS Device → Product → Archive → Organizer → Distribute App → App Store Connect → Upload. Bump `CURRENT_PROJECT_VERSION` after each upload.

### 6. Submit for App Store review
- [ ] Section 3b complete and section 4 device pass done (at minimum: Restore round-trip, airplane mode, store screen)
- [ ] Version page → Build → add the tested build → **Submit for Review**

### 5. Comps / free access (unchanged policy: store-native only)
- [ ] App Store promo codes per IAP (up to 100/batch) and/or RevenueCat promotional entitlements; TestFlight for pre-launch testers

---

## v1.1 — Add & Subtract (decided 2026-10-13: not in 1.0)
1.0 ships Multiply + Fractions only; Add & Subtract stays a "Coming Soon" card in the store build and fully open on Jack's tester build. Start these after 1.0 is live.
- [ ] Keep Jack on the tester build; note anything in Add that needs fixing before it ships
- [x] App Store Connect → In-App Purchases: `module.add.full` created ($3.99, non-consumable) — 2026-10-13. **Not attached to 1.0.**
- [x] IAP review screenshot: `screenshots/iap-review/add-subtract-store.png` (1206 × 2622 — Apple only accepts App Store screenshot sizes here) — upload it on the IAP page so it reaches "Ready to Submit"
- [x] RevenueCat: `add` entitlement ← `module.add.full`; custom package `add` in the current offering — 2026-10-13
- [x] Code (2026-10-13): removed `add` from `STAGED_MODULES` (`src/modules/moduleRegistry.js`); set `module.add.full` to `available: true` and map its entitlement in `purchaseManager.js`. Free sample = `colAdd` + `facts` (already set in `add.jsx`)
- [x] Play-tested the store build in the preview (2026-10-13): Add in onboarding and the picker, column adding free (right and wrong answer), colSub/mental/words locked, simulated buy unlocks them, Place Value + Connections still Coming Soon, no bundle; Multiply loads
- [x] 1.1 (2) archived and uploaded (2026-10-13); add-on IAP removed from the 1.0 draft submission (only Fractions rides with 1.0)
- [x] 1.1 (2) feedback (2026-10-13): Start over did nothing on a no-regroup problem; iOS showed unstyled button text in system blue. Fixed in 1.1 (3), archived
- [x] 1.1 (4) archived (2026-10-13): in-app Privacy/Terms/FAQ brought in line with privacy.html (RevenueCat disclosed, contact adamlaserlab@gmail.com, no bundle); web build is a preview only
- [ ] TestFlight 1.1: upload 1.1 (4) (supersedes 3) → What to Test → Friends group (Beta App Review again for the first 1.1 build) → testers check Add, including a TestFlight purchase
- [ ] Sandbox purchase on device; Restore round-trip
- [x] Version set to 1.1 (`MARKETING_VERSION`; build number stays 2). Still to do at submit: update What's New, the description and screenshots if the module list changes
- [ ] Archive → upload → attach `module.add.full` to the 1.1 version page → Submit for Review

---

## v1.2 — Place Value + the All-Modules bundle (decided 2026-10-13)
Ships after 1.1 is live. Bundle = **$9.99, every module including future ones** (Connections etc.). It appears only once 3 paid modules are on sale ($11.97 separately), so it's a real discount, never a pre-sale.

**Place Value**
- [ ] Jack uses it on the tester build (already open there); note anything to fix before it ships. Check the module against `docs/place-value-spec.md` and the QA convention in CLAUDE.md (every answerType × CPA mode, one wrong answer each)
- [ ] App Store Connect: IAP `module.placevalue.full` ($3.99, non-consumable), review screenshot at 1206 × 2622 — **don't** click "Add for Review" on the IAP page
- [ ] RevenueCat: entitlement `placeValue` ← `module.placevalue.full`; custom package `placeValue` in the current offering
- [ ] Code: remove `placeValue` from `STAGED_MODULES`; `module.placevalue.full` → `available: true` with a "what's free" description (free sample = the `build` group); `placeValue: "module.placevalue.full"` in `RC_ENTITLEMENT_TO_PRODUCT`

**Bundle**
- [ ] App Store Connect: IAP `bundle.all` ($9.99, non-consumable), display name "All Modules", description that says it includes future modules; review screenshot of the store showing the bundle card
- [ ] RevenueCat: entitlement `all` ← **only** `bundle.all`; custom package `all` in the current offering (see `LAUNCH-revenuecat-setup.md` §8)
- [ ] Code: hide the bundle card when buying the family's *remaining* modules separately would cost less (someone who already owns Fractions shouldn't be offered $9.99 for $7.98 of modules); savings line computed against what's left to buy; bundle copy says "every module, including ones still to come"
- [ ] Play-test the store build: bundle appears with 3 paid modules; owns-one-module case; buying the bundle unlocks all three; Restore brings it back; Multiply/Fractions/Add regression

**Copy (only once 1.2 is live)**
- [ ] Landing pricing: Place Value row + the bundle; FAQ "What's free?"; listing description, promo text, What's New, review notes (both new IAPs)
- [ ] App Store screenshots: consider a Place Value frame

**Ship**
- [ ] Version 1.2 (`MARKETING_VERSION`), archive, TestFlight (Friends), then Submit for Review with **both** `module.placevalue.full` and `bundle.all` attached to the 1.2 version page

