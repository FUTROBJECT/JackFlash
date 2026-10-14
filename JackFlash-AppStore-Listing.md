# JackFlash — App Store Listing Copy

v2 (launch-ready) · For Apple App Store (Google Play uses the same copy with minor field-name differences).
Character counts shown against Apple's limits.

**What ships in v1:** Multiply & Divide (free, all groups) and Fractions ($3.99 one-time — "Fractions Full", product id `module.fractions.full` — with the Foundations group free to try). Add & Subtract, Place Value, and Connections appear in the app as Coming Soon previews and cannot be purchased. There is no bundle at launch.

---

## App Name  *(limit: 30 characters)*

**Final:** `JackFlash: Math Practice` — 24 characters

Future-proof: works as more modules ship. Apple indexes every word here for search, so "Math" and "Practice" are already covered as keywords.

---

## Subtitle  *(limit: 30 characters)*

**Final:** `Math facts that finally stick` — 29 characters

Alternatives, if search data later argues for a change:

- `Singapore Math, done right` — 26 characters
- `Multiplication, the visual way` — 30 characters

---

## Promotional Text  *(limit: 170 characters — editable any time without an app update)*

> Singapore Math practice, never timed, never ranked. Multiply & Divide is free; Fractions is $3.99 once — no subscription. No ads. No tracking. Practice works offline.

166 characters. Leads with the three pillars in priority order: the approach (and that it's never timed or ranked), one-time price, private by architecture. "Practice works offline" rather than "fully offline": the purchase goes through Apple. Good slot for seasonal or feature updates later (e.g. "Now with Add & Subtract").

---

## Keywords  *(limit: 100 characters · comma-separated · no spaces after commas)*

```
multiplication,division,times tables,singapore,fractions,homeschool,flashcards,bar model,offline
```

96 characters. Notes: never repeat words already indexed from the App Name or Subtitle ("math", "practice", "facts") — that space is wasted. "singapore" pairs with "math" from the name to cover "singapore math"; "bar model" is a high-intent term for the homeschool wedge audience. Revisit after launch using Apple Search Ads exact-match data (see marketing plan §4 Phase C).

---

## Description  *(limit: 4000 characters — current draft: 2,756)*

The first ~3 lines show before the "more" fold — they carry the most weight.

---

JackFlash is Singapore Math practice — the visual, mastery-based approach behind the world's top-performing classrooms, built by a dad for his kid, Jack. Multiply & Divide is completely free. No ads, no subscription, and nothing your child does ever leaves the device.

SEE THE MATH, DON'T JUST GUESS
Built on the Concrete–Pictorial–Abstract method, JackFlash teaches multiplication and division as visual fact families, not flashcard drills. Kids build each fact with their hands in Concrete mode, see it as dot arrays, number bonds, and bar models, then answer without help. As mastery grows, the scaffolding fades on its own. Understanding first, fluency second.

SMART PRACTICE THAT ADAPTS
Smart Practice — JackFlash's adaptive engine — sorts every fact into five categories: new, learning, needs practice, mastered, and review-due. A child who owns their 2s and 5s but keeps missing 7s and 8s sees far more 7s and 8s. No time wasted drilling facts they already know.

MASTERED MEANS FROM MEMORY
Most apps call a fact mastered after three lucky taps. JackFlash waits until your child can answer from memory, without the picture — because a fact that's truly learned gets out of the way and leaves room for thinking. Math isn't a race: there's no timer, no leaderboard, and your child will never see "too slow." Every correct answer gets the full celebration. Mastery simply waits until it's real. Then each fact comes back on a widening review schedule — next day, 3 days, 7, 14, 30 — so it stays real.

ONE APP. EVERY CHILD'S LEVEL.
Siblings share one device, each with their own profile, avatar, progress, streaks, and achievements. Tap your face and you're in your own world.

BUILT FOR PARENTS, TOO
The Parent Zone sits behind a quick multiplication gate, so kids can't wander in. Inside: per-child progress reports, the exact facts your child is working on, a "ready to try unaided" list, module assignment, and settings. Every purchase lives behind that gate too.

PRIVATE BY ARCHITECTURE
No accounts. No ads. No tracking. Practice works fully offline, and everything your child does stays on the device. That's not a policy promise — the app has nowhere to send your child's data. The only thing that ever goes online is a parent's purchase, handled by Apple.

SIMPLE, HONEST PRICING
Multiply & Divide is free. All of it — every table group, forever. Fractions covers equivalent fractions, comparing and ordering, and fraction addition and subtraction: try the Foundations group free, then unlock the rest with a one-time $3.99 purchase. No subscription. Ever. Add & Subtract, Place Value, and the Connections capstone are coming soon.

Five minutes of focused practice beats thirty minutes of grinding. JackFlash makes those five minutes count.

---

## What's New  *(version notes — for v1.0)*

> Welcome to JackFlash. This first release includes Multiply & Divide (completely free) and Fractions (Foundations group free to try, one-time unlock for the rest) — with Smart Practice, touch-the-math Concrete mode, visual scaffolds, mastery that means from memory, daily streaks, achievements, and multi-child profiles. Built by a dad for his kid, Jack. We'd love your feedback.

---

## Screenshot Caption Headlines  *(bridges to the screenshot designs)*

Short, benefit-led lines to pair with each screenshot:

1. One app. Every child's level.
2. Smart Practice adapts to your child
3. See it. Get it. Keep it.
4. Mastered means from memory
5. Parents see what matters
6. Progress you can see *(subline: "No clock, no race. Badges celebrate showing up and steady work.")*

Rendered frames (2026-10-12, from the store build on the simulators with demo data): `screenshots/appstore/iphone-6.9/` (1320 × 2868) and `screenshots/appstore/ipad-13/` (2064 × 2752).

---

## App Review Notes  *(App Store Connect → App Review Information → Notes)*

> JackFlash has no account and no sign-in — all content is reviewable immediately, no credentials needed. The only network activity is the in-app purchase, handled by Apple's StoreKit through RevenueCat; practice works fully offline.
>
> Reaching settings and the store: from the home screen, tap "Parent Zone." A parental gate asks a multiplication question (e.g. "What is 26 × 3?") — type the answer to enter. The store is on the Modules tab inside the Parent Zone, along with Restore Purchases.
>
> In-app purchases: one product at launch — Fractions Full (`module.fractions.full`, $3.99 one-time), which unlocks the Fractions module beyond its free Foundations group. Multiply & Divide is entirely free with full access to all content — no purchase involved. Add & Subtract, Place Value, and Connections appear as "Coming Soon" previews and cannot be purchased.
>
> All children's progress data is stored on-device only. Nothing about the child is collected or transmitted; no ads, analytics, or tracking.

(~135 words. Update the product list here with each module release.)

---

## Privacy Nutrition Label answers  *(App Store Connect → App Privacy)*

**Answer (revised 2026-10-13):** Data collected → **Purchases → Purchase History** only. Purposes: **App Functionality** and **Analytics** (RevenueCat's guidance says every RevenueCat app selects both). **Not linked** to the user's identity (the app uses RevenueCat's anonymous IDs, no custom user ID). **Not used for tracking.** Nothing else is collected: no identifiers (no custom user ID, no IDFA), no usage data, no diagnostics, no contact info.

Why not "Data Not Collected": the RevenueCat SDK records the parent's purchase to validate it and restore it on reinstall. The child's practice, profiles and progress never leave the device — no accounts, no analytics SDK, no ads, no crash reporting — so the listing copy ("nothing your child does ever goes online") stays true. Source: RevenueCat, "Apple App Privacy" (docs/platform-resources/apple-platform-resources/apple-app-privacy).

---

## Pricing from 1.2 — "All of JackFlash"  *(decided 2026-10-14; use this copy once 1.2 is live)*

**The plan.** Every paid module is $3.99 once, with its first group free. Everything — every module, including the ones still to come — is **$9.99 once**, whatever order a family buys in:

| Family already owns | Offer in the app | Product id | Everything costs them |
|---|---|---|---|
| no paid module | All of JackFlash — $9.99 | `bundle.all` | $9.99 |
| one | The rest of JackFlash — $5.99 | `bundle.rest.one` | $9.98 |
| two | The rest of JackFlash — $1.99 | `bundle.rest.two` | $9.97 |

All three grant the RevenueCat entitlement `all`. The offer appears only once 3 paid modules are on sale and only while it's cheaper than what the family still has to buy. **Family Sharing is on for every purchase** (irreversible — decided 2026-10-14).

**Why it's framed this way.** At 1.2 the bundle saves $1.98 (17%), which reads like a coupon, so the pitch is the one price for everything, never "best value" or "save". Early Fractions buyers get the same total as everyone else instead of being shut out. No "most you'll ever pay" vow: it binds future pricing and isn't true for a family who skips the offer.

**In-app card copy (built):** "All of JackFlash — Every module, including the ones still to come. $9.99 once. ($11.97 separately today.)" / for owners: "The rest of JackFlash — Every other module, including the ones still to come. $5.99 once. With what you already own, that's everything for $9.98." Both add: "When Connections arrives, it opens once your child has mastered Multiply, Divide and Fractions."

**Landing — "Pricing, plainly" rows (1.2):**
- Multiply & Divide — free forever
- Fractions · Add & Subtract · Place Value — $3.99 each, once · first group of each free to try
- **All of JackFlash — $9.99 once** · every module, including the ones still to come
- Tagline unchanged: "No subscription. No ads. Ever." Add under the badges: "Family Sharing is on: one purchase covers your family's devices."
- "Coming soon" chips shrink to Connections.

**Landing FAQ "What's free?" (1.2):** "Multiply & Divide, all of it. Every other module has its first group free to try, then $3.99 once. Or get all of JackFlash — every module, including the ones still to come — for $9.99 once. If you already own a module, the rest costs less, so everything still comes to about $9.99. Updates are always included, and Family Sharing is on."

**Promotional text (1.2, 170 max):** "Singapore Math practice, never timed, never ranked. Multiply & Divide is free; every other module is $3.99 once, or all of them for $9.99. No ads. No tracking." (159 characters)

**Review notes addition (1.2):** "In-app purchases: Fractions Full, Add & Subtract Full and Place Value Full ($3.99 each); All of JackFlash (`bundle.all`, $9.99). Two 'The rest of JackFlash' upgrades unlock the same content for families who already own modules: `bundle.rest.one` ($5.99) appears after one module is purchased, `bundle.rest.two` ($1.99) after two. In the sandbox: buy Fractions, then open Parent Zone → Modules to see the $5.99 offer."

---

## Notes & Open Decisions

- **What ships at launch:** Two modules — Multiply & Divide (entirely free, all groups) and Fractions ($3.99 one-time, Foundations group free to sample). Add & Subtract, Place Value, and Connections are visible in-app as Coming Soon teasers but are not purchasable. The description says "coming soon" without naming dates — keep it that way until each is real, to stay within Apple's rules on advertising unreleased content.
- **No bundle at launch; it ships in 1.2 with Place Value** (decided 2026-10-13). The bundle exists in code but stays hidden until 3+ paid modules are live, so it's an honest discount rather than a pre-sale of unbuilt content: at 1.2 that's Fractions + Add & Subtract + Place Value, $11.97 separately vs **$9.99 for everything, including modules that ship later**. It never appears in customer-facing copy until then. Do not create the `bundle.all` IAP in App Store Connect until 1.2 is being prepared.
- **Pricing in metadata:** the description and promo text say $3.99 (it's the loudest pillar for the homeschool audience). Apple sets regional price tiers, so verify the USD tier matches before submission, and remember promo text is editable without an app update if it ever drifts.
- **Mastery copy rule (revised 2026-10-06):** the selling point is "mastered means from memory," never "fast." Math isn't a race; never phrase mastery as speed, or kids as timed, tested, ranked or penalized. The Multiply & Divide time window is an invisible way to tell memory from counting — mention it only as reassurance (no timer, no "too slow"). Full rules: `docs/voice-and-messaging.md`.
- **Category / age rating:** Education; Made for Kids, age band **6–8** (Apple allows one band); rating 4+. Kids-category rules are already satisfied: no ads, no tracking, purchases behind a parental gate.
- **"Smart Practice" is a branded feature name.** Always capitalized, used as a proper noun — never as a loose adjective ("smart practice"). It names the five-category adaptive engine. Keep it consistent across the app, this listing, the FAQ, the screenshots, and the landing page.
