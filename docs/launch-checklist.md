# JackFlash — App Store v1 Launch: Readiness Status & Punch List

**Audited:** 2026-08-21 (full repo verification sweep — build, flags, offline, assets, compliance). **Updated:** 2026-11-06 (decided: submit **1.2 (9)** to the App Store as the first public release; 1.0 and 1.1 never shipped. Listing, landing and support copy updated for 1.2).
**Verdict: the repo is launch-ready.** Everything left is in App Store Connect plus one device pass — the ordered list is the next section.

---

## 🚀 Submit 1.2 (9) — the ordered list (2026-11-06)

**2026-11-06 update: 1.2 (9) is superseded.** Adam's first Build & Read item on build 9 opened with no chart and no "Show me" (the item picker's on-ramp check read a stale Pictorial mode while the group default switched to Concrete; fixed in `place-value-practice.jsx`, 9e1c50a). PR #2 (store copy, that fix, the header pull-tab + 32px gutter) merged 2026-11-07.
- [x] **1.2 (10) archived and uploaded 2026-11-07** (store build from the primary checkout). Build number now 11. Everything below applies to 1.2 (10).

**1. In-app purchases (App Store Connect → Monetization → In-App Purchases)**
- [x] Create `module.placevalue.full` — $3.99 tier, non-consumable, display name "Place Value", description from `purchaseManager.js`; review screenshot `screenshots/iap-review/place-value-and-all-of-jackflash.png`
- [x] Create `bundle.all` — $9.99 — "All of JackFlash" — "Every module, including the ones still to come."; same screenshot
- [x] Create `bundle.rest.one` — $5.99 — "The rest of JackFlash" — "Every other module, including ones to come."; screenshot `rest-of-jackflash-owns-one.png`
- [x] Create `bundle.rest.two` — $1.99 — "The rest of JackFlash" — same description; screenshot `rest-of-jackflash-owns-two.png`
- [x] Upload the review screenshot on `module.add.full` too if it still shows "Missing Metadata" (`add-subtract-store.png`). All six should read **Ready to Submit**. Do **not** click "Add for Review" on any product page.
- [x] **Family Sharing: Turn On** for all six — done 2026-11-07. All six show as Drafts / "Prepare for Submission" (the current ASC label for not-yet-submitted purchases); they ride with the 1.2 version.
- [x] RevenueCat: entitlements and products existed, but **the `default` offering only held the Fractions package** — the October notes below claiming `add`, `placeValue`, `all`, `rest1`, `rest2` packages were wrong (first sandbox try on 1.2 (10): "Product not found in store offerings" for Place Value and Add). Five custom packages added to `default` 2026-11-07; store shows all prices on device

**2. Version page (App Store → the 1.0 draft)**
- [ ] Change the version to **1.2** (General → Version), then Build → select **1.2 (10)** (not 9 — see the update above)
- [ ] Paste from `JackFlash-AppStore-Listing.md`: name, subtitle, promotional text (1.2, 159 chars), description (3,325 chars), keywords, What's New (1.2)
- [ ] In-App Purchases section: attach **all six** — `module.fractions.full`, `module.add.full`, `module.placevalue.full`, `bundle.all`, `bundle.rest.one`, `bundle.rest.two`. Apple reviews them with the binary; easy to miss
- [ ] App Review Information: the 1.2 review notes from the listing doc; contact adamlaserlab@gmail.com; sign-in required **off**
- [ ] App Information: category Education; Made for Kids, age band 6–8; age rating questionnaire (expect 4+); privacy policy URL `https://futrobject.github.io/JackFlash/privacy.html`
- [ ] App Privacy: Purchase History only (App Functionality + Analytics; not linked; no tracking)
- [ ] Pricing and Availability: Free; all territories; standard EULA
- [x] Screenshots already on the version page (uploaded 2026-10-12). Optional: a Place Value frame

**3. Device pass on 1.2 (10)** (TestFlight install of build 10, or the store-flavour Xcode build)
- [ ] Place Value, Build & Read: the first item shows its disc chart (the build-9 bug), in Concrete and after switching modes
- [ ] Practice header: the centered pull-tab opens and closes the session panel in every module; the closing tap types nothing (new in 1.2 (10), `docs/practice-header-ui.md` revision 3)
- [ ] Sandbox: buy Place Value → its locked groups open. Fresh install: buy All of JackFlash → every module open, no $3.99 buttons left
- [ ] **Restore Purchases round-trip**: delete → reinstall → Restore → everything returns without payment (never checked off; Apple requires it)
- [ ] Airplane mode: launch, fonts, practice in every module
- [ ] Store screen: Multiply Included, three $3.99 modules, All of JackFlash $9.99, Connections Coming Soon, Restore

**4. Submit**
- [ ] Version page → **Submit for Review**. TestFlight Beta App Review for the Friends group is optional, not a prerequisite
- [ ] After approval: Release (manual or automatic as set on the version page), then update `public/landing.html`'s store CTA/toast with the real App Store link; put the Place Value / bundle line into the in-app Privacy/Terms/FAQ in the next build (the in-app FAQ still says "no bundle")

**Done in-repo 2026-11-06:** listing doc (promo, description, What's New, review notes, what-ships note), landing pricing rows + FAQ + Family Sharing line, support "What's free" answer.

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

## v1.1 — Add & Subtract (decided 2026-10-13: not in 1.0) — **folded into 1.2 (2026-10-14): 1.1 is never released on its own**; its unchecked items now ride with 1.2 (attach `module.add.full` to the 1.2 version page too)
1.0 ships Multiply + Fractions only; Add & Subtract stays a "Coming Soon" card in the store build and fully open on Jack's tester build. Start these after 1.0 is live.
- [ ] Keep Jack on the tester build; note anything in Add that needs fixing before it ships
- [x] App Store Connect → In-App Purchases: `module.add.full` created ($3.99, non-consumable) — 2026-10-13. **Not attached to 1.0.**
- [x] IAP review screenshot: `screenshots/iap-review/add-subtract-store.png` (1206 × 2622 — Apple only accepts App Store screenshot sizes here) — upload it on the IAP page so it reaches "Ready to Submit"
- [x] RevenueCat: `add` entitlement ← `module.add.full` — 2026-10-13. (The `add` package was NOT in the offering until 2026-11-07.)
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

## v1.2 — Add & Subtract + Place Value + "All of JackFlash" — the first update after 1.0 (decided 2026-10-14)
- [x] **1.2 (5) archived 2026-10-14** (store build, nothing staged, all bundle products in). Build number now 6 for the next upload
- [x] 1.2 (5) uploaded to App Store Connect (2026-10-14)
- [ ] TestFlight: What to Test pasted, 1.2 (5) added to Friends (1.1 builds removed), submitted for Beta App Review
- [x] **1.2 (8) archived and uploaded 2026-11-05** (store build) — in-app number pad for every typed answer (no iPhone keyboard), last skill pills removed. Same build (tester flavour) on Jack's phone. Build number now 9
- [x] TestFlight 1.2 (8): superseded by 1.2 (9), whose What to Test covers it
- [x] **1.2 (9) archived and uploaded 2026-11-05** (store build) — slim practice header with a drop-down for session / streak / days; every card reads dots → picture → answer (Multiply's picture moved above the problem). Same build (tester flavour) on Jack's phone. Build number now 10
- [x] TestFlight 1.2 (9): What to Test pasted (covers what changed in (7), (8) and (9)), added to Friends — 2026-11-05
- [x] **1.2 (7) archived and uploaded 2026-11-05** (store build) — the card layout pass on all three modules (Add & Subtract, Fractions, Place Value: picture before answer, 16px rhythm, no pills/focus chip, bigger labels; Add's Start over in the keypad; question-only Fractions pictures; F2 reveal bar fix). Same build (tester flavour) installed on Jack's phone. Build number now 8
- [x] TestFlight 1.2 (7): superseded by 1.2 (9), whose What to Test covers it
- [x] **1.2 (6) archived and uploaded 2026-11-02** on Xcode 27.2, from the CLI (`xcodebuild -exportArchive` with `method: app-store-connect`, `destination: upload`, `manageAppVersionAndBuildNumber: false`). Build number now 7 for the next upload
- [x] TestFlight 1.2 (6): superseded by 1.2 (9)
- [x] Tester feedback on 1.2 (5), fixed 2026-10-16 (in 1.2 (6)): Fractions F3/F4 always put the greater fraction on the same side (F3 left, F4 right) — now 8/8 on a fixed irregular pattern, keys unchanged; Multiply's practice-set toggles jumped the progress screen to the top — now it stays put, and practice opens at the top
Ships after 1.1 is live. Bundle = **$9.99, every module including future ones** (Connections etc.). It appears only once 3 paid modules are on sale ($11.97 separately), so it's a real discount, never a pre-sale.

**Place Value**
- [ ] Jack uses it on the tester build (already open there); note anything to fix before it ships. Check the module against `docs/place-value-spec.md` and the QA convention in CLAUDE.md (every answerType × CPA mode, one wrong answer each)
- [ ] App Store Connect: IAP `module.placevalue.full` ($3.99, non-consumable), review screenshot at 1206 × 2622 — **don't** click "Add for Review" on the IAP page
- [x] RevenueCat (2026-10-14): entitlement `placeValue` ← `module.placevalue.full`. (The `placeValue` package was NOT in the offering until 2026-11-07.)
- [x] Code (2026-10-14): `placeValue` unstaged; `module.placevalue.full` available with a "what's free" description (Build & Read free); `placeValue` entitlement mapped. Pre-release pass fixed X3 (true answers marked wrong) and V2 (nonsense / >10,000 choices) — see the spec's last section

**Family Sharing (decided 2026-10-14 — do now, it's irreversible)**
- [ ] App Store Connect → each in-app purchase (Fractions Full, Add & Subtract Full, and every new one below) → **Family Sharing: Turn On**. Then tell Claude to add the "Family Sharing is on" line to the site, support page and listing.

**Bundle — "All of JackFlash" (three products, one entitlement; copy and reasoning in `JackFlash-AppStore-Listing.md` → "Pricing from 1.2")**
- [ ] App Store Connect, three non-consumables, Family Sharing on, review screenshot each (**don't** click "Add for Review"):
  - `bundle.all` — $9.99 — display name "All of JackFlash" — "Every module, including the ones still to come."
  - `bundle.rest.one` — $5.99 — "The rest of JackFlash" — "Every other module, including ones to come."
  - `bundle.rest.two` — $1.99 — "The rest of JackFlash" — same description
- [x] RevenueCat (2026-10-14): entitlement `all` ← the three bundle products only. (Packages `all`, `rest1`, `rest2` were NOT in the offering until 2026-11-07.)
- [x] IAP review screenshots (1206 × 2622) in `screenshots/iap-review/`: `place-value-and-all-of-jackflash.png` (Place Value + bundle.all), `rest-of-jackflash-owns-one.png`, `rest-of-jackflash-owns-two.png`
- [x] Code (2026-10-14): bundle hidden when what's left to buy costs less; savings vs what's left; "Every module, including the ones still to come"; owning the bundle marks every module owned (no $3.99 buttons, no double charge); web build shows an in-app note
- [x] Preview play-test of the store build (2026-10-14): bundle appears (save $1.98); hidden when Fractions owned; bundle buy unlocks all, no buy buttons left, Connections "Coming soon · included"
- [ ] On device (sandbox) after the IAPs exist: buy Place Value, buy the bundle on a fresh install, Restore both

**Copy**
- [x] Landing pricing + FAQ, promo text, review notes, description and What's New updated for 1.2 (2026-11-06; the listing doc's main fields now carry the 1.2 text)
- [ ] App Store screenshots: consider a Place Value frame

**Ship**
- [x] Version 1.2 (`MARKETING_VERSION`), archived and uploaded — 1.2 (9) is the submission build
- [ ] Submit for Review with all six purchases attached to the 1.2 version page — see "Submit 1.2 (9)" at the top of this file
- [x] Code (2026-10-14): `getBundleOffer()` picks the offer by how many paid modules the family owns; card copy per the listing doc; preview-tested none / one / two / three owned and buying "the rest" (everything unlocks, card turns "All of JackFlash ✓")

