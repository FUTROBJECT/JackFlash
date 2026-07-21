# JackFlash — RevenueCat / IAP Setup

Step-by-step to make the one launch purchase — **Fractions, $3.99** — actually
charge and unlock on device. The purchase *code* is already written and
provider-agnostic (`src/purchaseManager.js`); this doc is the store + RevenueCat
wiring that feeds it. Everything here is a 🔑 account action you do yourself —
Claude can't create store products, accounts, or paste live keys.

Time: ~1–2 hrs of clicking, plus store review lead time. Do it **after** the
native platforms exist (`docs/LAUNCH-native-setup.md` steps 1–2).

---

## 0. The contract the code expects (read this first)

`purchaseManager.js` hard-codes three identifiers. Everything below must match
them **exactly** — a typo here is the #1 cause of "product not found."

| Thing | Value the code expects | Where in code |
|---|---|---|
| Store product id (both stores) | `module.fractions.full` | `PRODUCTS`, and offering match `p.product.identifier === productId` |
| RevenueCat entitlement id | `fractions` | `RC_ENTITLEMENT_TO_PRODUCT` |
| App bundle / package id | `com.laserlabstudios.jackflash` | `capacitor.config.json` |

How the code uses them at runtime (native provider):
1. `Purchases.configure({ apiKey })` — public SDK key per platform.
2. `getOfferings()` → looks in **`offerings.current.availablePackages`** for a
   package whose `product.identifier === "module.fractions.full"`. → So there
   must be a **current** Offering containing that product.
3. On buy/restore, `customerInfo.entitlements.active` is scanned; the active
   entitlement id **`fractions`** maps → unlock `module.fractions.full`.

So you're creating: **one store product**, **one entitlement (`fractions`)**,
and **one Offering marked current**, in each store + RevenueCat.

> Do **not** create the bundle (`bundle.all` / `all` entitlement) or the other
> modules yet — they're staged. The `all` row in the code is harmless until then.

---

## 1. Prerequisites  🔑

- Paid **Apple Developer** account + the app record created in App Store Connect
  (bundle id `com.laserlabstudios.jackflash`). Sign the "Paid Applications"
  agreement (Business → Agreements) or **no IAP will load** — common gotcha.
- **Google Play Console** account + the app created (package
  `com.laserlabstudios.jackflash`), with at least one build uploaded to the
  **Internal testing** track (Play won't surface IAPs until a build exists).
- A **RevenueCat** account (free tier is fine at this scale).

---

## 2. App Store Connect — create the IAP  🔑

1. Your app → **Monetization → In-App Purchases → +**.
2. Type: **Non-Consumable** (a one-time permanent unlock).
3. **Reference Name:** `Fractions Full` (internal only).
   **Product ID:** `module.fractions.full`  ← must match the code exactly.
4. **Price:** pick the $3.99 price point.
5. **Localization** (English): Display Name `Fractions` · Description e.g.
   "Unlock equivalent fractions, comparing & ordering, and fraction add &
   subtract." (Foundations stays free.)
6. **Review screenshot:** a 1284×2778 (or similar) shot of the Parent Zone
   Modules screen showing the Fractions card is enough.
7. Save. Status will sit at **"Ready to Submit"** — that's correct; a brand-new
   IAP is reviewed **together with the first app build**, so you attach it to the
   binary in the version's "In-App Purchases" section when you submit the app.
8. **Sandbox tester:** Users and Access → **Sandbox → Testers → +**. Use an email
   that is *not* an existing Apple ID. You'll sign into this on the test device.

**iOS key RevenueCat needs later:** App Store Connect → your app → **App
Information → App-Specific Shared Secret** (generate it). Also recommended:
Users and Access → **Integrations → App Store Connect API** key (for server
notifications). Have both handy for step 4.

---

## 3. Google Play — create the in-app product  🔑

1. Play Console → your app → **Monetize → Products → In-app products → Create**.
2. **Product ID:** `module.fractions.full`  ← matches the code (Play product IDs
   are **permanent** and can't be reused once created — get it right).
3. Name `Fractions`, description as above, set the **$3.99** price, **Activate**.
4. **License testers:** Play Console → **Setup → License testing** → add the
   Google accounts that will test (they get IAPs free in testing tracks).
5. **Service account for RevenueCat:** Google Cloud console → create a service
   account with Play access, grant it **"View financial data"** + **"Manage
   orders"** in Play Console (Users and permissions), download the **JSON key**.
   RevenueCat needs this JSON to verify Android purchases (step 4).

---

## 4. RevenueCat dashboard  🔑

**a. Project + apps**
1. Create a **Project** named `JackFlash`.
2. **+ New app → App Store:** bundle id `com.laserlabstudios.jackflash`; paste the
   **App-Specific Shared Secret** (and the App Store Connect API key if you made
   one). Copy the **public SDK key** — it starts with **`appl_`**.
3. **+ New app → Play Store:** package `com.laserlabstudios.jackflash`; upload the
   **service-account JSON**. Copy the **public SDK key** — starts with **`goog_`**.

**b. Product**
4. **Products → + New.** Add product id `module.fractions.full` for the **App
   Store** app and again for the **Play** app (same identifier, one per platform).

**c. Entitlement** (this is what the app actually checks)
5. **Entitlements → + New.** Identifier: **`fractions`** (exactly).
6. **Attach** the `module.fractions.full` product to it — for **both** platforms.

**d. Offering** (the code only reads `offerings.current`)
7. **Offerings → + New.** Identifier e.g. `default`. **Mark it the current
   Offering** (there's a "Make current" / default toggle — required, or
   `offerings.current` is null on device and the buy fails).
8. Add a **Package** to the offering (identifier can be `$rc_lifetime` or a
   custom one — the code doesn't care about the package id) and attach the
   `module.fractions.full` product to it, per platform.

> Why both an Entitlement *and* an Offering? The **Offering** is how the app
> *finds the thing to sell* (`getOfferings`); the **Entitlement** is how the app
> *knows it was bought* (`customerInfo.entitlements.active.fractions`). The code
> uses both — you need both.

---

## 5. Wire the keys into the code  ✅ (Claude can do this part once you paste keys)

In `src/purchaseManager.js`, replace the placeholders:

```js
const REVENUECAT_KEYS = {
  ios: "appl_XXXXXXXXXXXXXXXXXXXXXXXX",     // App Store public SDK key
  android: "goog_XXXXXXXXXXXXXXXXXXXXXXXX", // Play Store public SDK key
};
```

These are **public** SDK keys (safe to ship in the app bundle) — not the shared
secret or the service-account JSON, which stay in RevenueCat only.

Then install the plugin and sync into the native projects:

```
npm i @revenuecat/purchases-capacitor
npm run cap:sync
```

> The SDK is loaded via a lazy, `@vite-ignore`'d dynamic import, so installing it
> does **not** affect the web build. Verify the plugin's return shapes against the
> installed major version — the RC Capacitor API has shifted across majors; the
> provider destructures `{ customerInfo }` from `purchasePackage` and
> `getCustomerInfo`, and reads `offerings.current.availablePackages` +
> `pkg.product.identifier`. Adjust in `purchaseManager.js` if the installed
> version differs.

---

## 6. Test on a real device (sandbox)  🔑

IAP does **not** work in the browser or a plain simulator — use a device build.

**iOS**
1. `npx cap open ios` → run on a device (or a simulator signed into a sandbox
   account, iOS 14+).
2. On the device: Settings → App Store → sign **out** of your real Apple ID
   (you'll be prompted for the **sandbox** tester at purchase time).
3. In-app: Parent Zone → Modules → **buy Fractions ($3.99)**. Sandbox shows
   "[Environment: Sandbox]" and doesn't charge.
4. Confirm the three paywalled groups unlock (Equivalent / Compare / Add &
   Subtract lose the 🔒).
5. **Delete + reinstall** → Modules → **Restore Purchases** → confirm it comes
   back. (Apple requires a working Restore; the button already exists.)

**Android**
1. `npx cap open android` → build a signed bundle, upload to the **Internal
   testing** track, install via the tester opt-in link (sideloaded debug builds
   won't bill).
2. Sign the device into a **license-tester** Google account.
3. Same buy → unlock → reinstall → Restore checks.

---

## 7. Troubleshooting (mapped to the code's error strings)

| Symptom | Likely cause |
|---|---|
| `"Product not found in store offerings."` | Offering not marked **current**, or the `module.fractions.full` product isn't attached to a package in it. |
| Purchase sheet never appears / empty offerings | Paid Applications agreement unsigned (iOS); no build on a testing track yet (Play); product not **Active** (Play) / still propagating (can take a few hours after creation). |
| Buys, but groups stay locked | Entitlement id isn't exactly **`fractions`**, or the product isn't attached to that entitlement for the platform you're testing. |
| Wrong / no SDK key | `appl_`/`goog_` keys swapped or still `…__TODO`; confirm the platform-correct key is in `REVENUECAT_KEYS`. |
| Restore does nothing | Testing on a different store account than the one that bought; on iOS, not signed into the sandbox tester. |

---

## 8. Later: when more modules ship

For each new paid module (Add, Place Value, Connections):
1. Create its store product (e.g. `module.add.full`) in **both** stores.
2. Add a RevenueCat **entitlement** (e.g. `add`) attached to that product, and
   add the product to the current Offering.
3. Extend `RC_ENTITLEMENT_TO_PRODUCT` in `purchaseManager.js`
   (`add: "module.add.full"`, etc.) and flip the product's `available: true`.

**The bundle** (`bundle.all` / entitlement `all`): only once **3+ paid modules**
are live (the in-app card is gated to that — see CLAUDE.md). Then create a
`bundle.all` non-consumable in both stores, an `all` entitlement in RevenueCat
attached to **every** module product, add it to the Offering, and the in-app
bundle card surfaces automatically.
