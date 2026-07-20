# JackFlash — Native Launch & IAP Setup

The steps between "green web app" and "live on the App Store / Google Play."
Everything in this doc requires a **native toolchain** and **store accounts** —
actions that can't be done from a plain checkout. The web app, the Capacitor
config, and the purchase code are already in place; this is the wiring that
remains.

Status legend: ✅ done in-repo · ⏳ needs a toolchain/account · 🔑 credential/account action (you do it, not Claude)

---

## 0. What's already done (in this repo)

- ✅ Capacitor deps installed (`@capacitor/core`, `cli`, `ios`, `android`, `preferences` — v8).
- ✅ `capacitor.config.json` — appId `com.laserlabstudios.jackflash`, `webDir: dist`, splash config. (Converted from `.ts` so the CLI reads it without adding TypeScript.)
- ✅ `npm run build:cap` produces a native-relative web build; `npm run cap:sync` / `cap:ios` / `cap:android` scripts exist.
- ✅ Durable storage bridge (`storage.js`) and RevenueCat provider scaffold (`purchaseManager.js`) — both lazy-load native plugins so the web build stays green.
- ✅ Privacy Policy (`public/privacy.html`) and Support (`public/support.html`) pages — hosted at the gh-pages URLs below once deployed.
- ✅ Bundle hidden until 3+ paid modules ship; launch catalog = Multiply (free) + Fractions ($3.99, Foundations group free).

---

## 1. Install the native toolchain  ⏳

**This machine currently has no Xcode, no CocoaPods, and no Android SDK** — so
the iOS/Android projects can't be generated or built here yet. On the Mac you'll
submit from:

- **iOS:** install **Xcode** (Mac App Store) + command-line tools, then CocoaPods:
  `sudo gem install cocoapods` (or `brew install cocoapods`).
- **Android:** install **Android Studio** (bundles the SDK + JDK).

## 2. Generate the native projects  ⏳

From the repo root, after the toolchain is installed:

```
npm install                 # restore deps incl. Capacitor
npm run build:cap           # web build with relative base → dist/
npx cap add ios             # creates ios/  (runs pod install)
npx cap add android         # creates android/
npm run cap:sync            # copies web assets + installs native plugins
```

`cap add` writes the `ios/` and `android/` project sources — **commit those**.
Build artifacts (Pods/, .gradle/, build/) are already covered by `.gitignore`.

## 3. App icons & splash screen  ⏳

Generate the full icon/splash set from a source image:

```
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#FFD43B' --splashBackgroundColor '#FFF8E7'
```

Put a 1024×1024 icon at `assets/icon.png` and a splash at `assets/splash.png`
first. (Brand yellow `#FFD43B`, cream `#FFF8E7` — matches `capacitor.config.json`.)

## 4. Signing & store accounts  🔑

- **Apple:** enrol in the **Apple Developer Program** ($99/yr). In Xcode, set the
  team + bundle id `com.laserlabstudios.jackflash`, let Xcode manage signing.
- **Google:** create a **Play Console** account ($25 one-time). Generate an
  upload keystore and keep it safe (losing it blocks future updates).

---

## 5. In-app purchases (RevenueCat)  🔑 ⏳

The purchase code is written and provider-agnostic; it just needs live products.
See the "TO GO LIVE" block in `src/purchaseManager.js` for the code-side notes.

**Launch catalog (only these two exist at launch):**

| What | Store product id | Price | Notes |
|---|---|---|---|
| Multiply & Divide | — | Free | Not an IAP — bundled in the app. |
| Fractions (full unlock) | `module.fractions.full` | $3.99 | Foundations group is free; this unlocks the rest. |

Do **not** create the `bundle.all` product or the Add/Place Value/Connections
products yet — they're staged, and the bundle only becomes an honest discount at
3+ paid modules. The bundle card auto-appears in the app when that threshold is met.

**Steps:**

1. 🔑 Create the IAP product **`module.fractions.full`** (non-consumable, $3.99)
   in **App Store Connect** and in the **Play Console**. Use that exact identifier
   in both stores so the code matches it.
2. 🔑 Create a **RevenueCat** account. Add the iOS and Android apps.
3. 🔑 In RevenueCat, create an **Entitlement** named `fractions` and attach the
   `module.fractions.full` store product to it (per platform). Add the app to an
   Offering. (The code maps entitlement `fractions` → product `module.fractions.full`.)
4. 🔑 Copy the **public SDK keys** (one per platform) from RevenueCat →
   paste into `REVENUECAT_KEYS` in `src/purchaseManager.js` (currently `…__TODO`).
5. ⏳ Install the plugin and sync:
   ```
   npm i @revenuecat/purchases-capacitor
   npm run cap:sync
   ```
6. ⏳ **Test on a real device** with a sandbox / license-test account: buy
   Fractions, confirm the paid groups unlock, delete + reinstall, tap **Restore
   Purchases**, confirm they come back. (Apple requires a working Restore path —
   it's already in the Parent Zone Modules screen.)

When Add / Place Value / Connections ship later: create their store products,
add a RevenueCat entitlement each, extend `RC_ENTITLEMENT_TO_PRODUCT` in
`purchaseManager.js`, and flip the module's `available: true` in the catalog.
Once 3 paid modules are live, also create the `bundle.all` product + `all`
entitlement — the in-app bundle card surfaces automatically.

---

## 6. Store listing metadata  🔑

Copy is drafted in `JackFlash-AppStore-Listing.md`. Fields to fill in each store:

- **Name / subtitle / keywords / description / promo text** — from the listing doc.
- **Privacy Policy URL:** `https://futrobject.github.io/JackFlash/privacy.html`
- **Support URL:** `https://futrobject.github.io/JackFlash/support.html`
  *(both go live after `npm run deploy` publishes gh-pages)*
- **Category:** Education. **Age rating:** 4+.
- **App privacy label:** "Data Not Collected" for the app itself. Because
  RevenueCat/Apple/Google process purchases, disclose **Purchases** and a
  **device/installation identifier** as *not linked to identity* and *not used
  for tracking*. (The privacy page already explains this.)

## 7. Submit  🔑

- `npx cap open ios` → Archive → upload to App Store Connect → submit for review.
- `npx cap open android` → generate a signed App Bundle (`.aab`) → upload to Play → submit.

---

## Quick blocker summary

1. **No native toolchain on this machine** — install Xcode/CocoaPods (+ Android Studio) before anything native can be generated or built. *(hard blocker for iOS)*
2. **IAP not live** — create `module.fractions.full` in both stores + RevenueCat, paste the SDK keys. *(hard blocker — broken IAP = rejection)*
3. **Privacy & Support URLs** — publish gh-pages (`npm run deploy`) so the two URLs above resolve before you enter them in the store listings.
