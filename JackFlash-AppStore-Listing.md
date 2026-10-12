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

## Description  *(limit: 4000 characters — current draft: 2,615)*

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
3. See the math — don't just guess
4. Mastered means from memory
5. Parents see what matters
6. Free to start. $3.99 once. No subscription.

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

**Answer: Data Not Collected.** ("Do you or your third-party partners collect data from this app?" → **No.**)

This is true by architecture, not policy: the app makes zero network calls at runtime. No accounts, no analytics, no ads SDKs, no crash reporting. All profiles, progress, and settings live in on-device storage and never leave the device.

- Data used to track you: **None**
- Data linked to you: **None**
- Data not linked to you: **None**

**One item to verify before submitting:** the native build includes the RevenueCat SDK for processing the Fractions purchase. RevenueCat's own guidance is that apps using it typically declare **Purchases → Purchase History, "App Functionality," not linked to identity, not used for tracking**. Check RevenueCat's current App Privacy disclosure guidance at submission time; if disclosure is required, the label becomes "Data Not Linked to You: Purchase History" — still no tracking, no linked data, and everything else above stays true. The listing copy ("no tracking, nothing leaves the device") remains accurate either way, since purchase processing is Apple's own transaction flow.

---

## Notes & Open Decisions

- **What ships at launch:** Two modules — Multiply & Divide (entirely free, all groups) and Fractions ($3.99 one-time, Foundations group free to sample). Add & Subtract, Place Value, and Connections are visible in-app as Coming Soon teasers but are not purchasable. The description says "coming soon" without naming dates — keep it that way until each is real, to stay within Apple's rules on advertising unreleased content.
- **No bundle at launch.** The bundle exists in code but stays hidden until 3+ paid modules are live, so it's an honest discount rather than a pre-sale of unbuilt content. It never appears in customer-facing copy until then. Do not create a bundle IAP product in App Store Connect / Play until the threshold is met.
- **Pricing in metadata:** the description and promo text say $3.99 (it's the loudest pillar for the homeschool audience). Apple sets regional price tiers, so verify the USD tier matches before submission, and remember promo text is editable without an app update if it ever drifts.
- **Mastery copy rule (revised 2026-10-06):** the selling point is "mastered means from memory," never "fast." Math isn't a race; never phrase mastery as speed, or kids as timed, tested, ranked or penalized. The Multiply & Divide time window is an invisible way to tell memory from counting — mention it only as reassurance (no timer, no "too slow"). Full rules: `docs/voice-and-messaging.md`.
- **Category / age rating:** Education; Kids category age bands 6–8 and 9–11; rating 4+. Kids-category rules are already satisfied: no ads, no tracking, purchases behind a parental gate.
- **"Smart Practice" is a branded feature name.** Always capitalized, used as a proper noun — never as a loose adjective ("smart practice"). It names the five-category adaptive engine. Keep it consistent across the app, this listing, the FAQ, the screenshots, and the landing page.
