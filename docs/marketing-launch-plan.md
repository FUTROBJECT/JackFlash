# JackFlash — Marketing Assets, Landing Page & Launch Plan

**Date:** 2026-08-21 · **Author:** Architect (Fable)
**Companions:** `JackFlash-AppStore-Listing.md` (copy), `JackFlash-Screenshot-Spec.md` (6-frame design),
`JackFlash-Brand-Spec.md` (voice/visual system, incl. §10 marketing frames), `docs/launch-checklist.md` (technical readiness).
This doc adds what those don't cover: the asset **status/gap list**, the **landing page**, and the **launch strategy**.

---

## 1. Positioning (one paragraph, use everywhere)

JackFlash is real Singapore Math practice — the CPA method (concrete → pictorial → abstract), bar models,
and mastery that means **fast and unaided**, not three lucky taps. Built by a dad for his son Jack.
One-time $3.99, no subscription. No ads, no tracking, no account — works fully offline.

Three pillars, in priority order:
1. **Real pedagogy** — CPA scaffolds that fade, touch-the-math concrete mode, fluency-gated mastery. Competitors drill; JackFlash teaches the way top classrooms do.
2. **One-time $3.99** — against a market of $60–100/yr subscriptions. This is the loudest single line in homeschool communities.
3. **Genuinely private** — COPPA-clean by architecture (local-only, zero network). Not a policy promise; a design fact.

**Primary audience (the wedge):** parents homeschooling with Singapore-based curricula
(Primary Mathematics, Dimensions, Math in Focus) — organized, vocal, review-writing communities that
actively share curriculum-aligned tools. **Secondary:** any parent searching "times tables app"
(bigger, far more contested — reached via ASO, not spend).

---

## 2. Asset checklist — status and gaps

### App Store (blocking submission)
| Asset | Status | Notes |
|---|---|---|
| App icon set | ✅ have | `assets/` — ready for `capacitor-assets` |
| Name / subtitle / keywords / description / promo text | 🔶 have, needs refresh | `JackFlash-AppStore-Listing.md` predates: Foundations-free tier, fluency mastery, no bundle at launch. One editing pass. |
| Screenshots — 6 framed designs | 🔶 spec done, captures stale | Spec + captions ready; `screenshots/*.jpg` are July captures — **recapture** (new splash, concrete builders, store without bundle, Ready-to-try-unaided row). iPhone 6.9" mandatory; **decide iPad support** (kids apps live on iPad — recommend yes → also 13" iPad set). |
| App preview video (15–30 s) | ❌ gap, optional | Recommend yes, cheap: screen-record splash → concrete builder taps → mastery celebration. The animated wordmark + builder ARE the demo. |
| Privacy nutrition label answers | ✅ trivial | "Data not collected" — true by architecture. |
| Review notes | ❌ gap | Short: parental math gate location, how to reach the store, promo/demo instructions. |
| Age rating + category | decision | Education; Kids category **6–8** & **9–11**. Kids-category rules already satisfied (no ads/tracking, gated purchases). |

### Landing page & web (non-blocking but launch-week)
| Asset | Status | Notes |
|---|---|---|
| Landing page | ❌ gap | Plan in §3. |
| Custom domain | ❌ optional | gh-pages URL works day 1; a domain (~$12/yr) adds trust — decide, don't block. |
| OG/social card image (1200×630) | ❌ gap | Brand frame + wordmark + tagline; one image reused everywhere. |
| Press kit | ❌ gap, small | One page/zip: icon, 3 screenshots, 100-word + 300-word blurbs, founder line, contact. Review sites ask for exactly this. |
| Live web demo | ✅ have | The deployed web app itself — "try it in your browser" is a rare, powerful asset. Keep it deployed. |
| Privacy/support URLs | ✅ have | `public/privacy.html`, `public/support.html` (live after deploy). |

### Community (pre-launch)
| Asset | Status | Notes |
|---|---|---|
| TestFlight beta + invite blurb | ❌ gap | 3-sentence authentic ask (see §4 Phase A). |
| Founder story post (canonical version) | ❌ gap | One honest ~200-word post, lightly adapted per community. Written once, never blasted. |

---

## 3. Landing page plan

**v1 (launch): one static, self-contained HTML page** shipped in `public/` — no framework, brand tokens
inlined, the wordmark animation ported as standalone SVG+CSS (it already is SVG+CSS keyframes; trivially portable).
Serve as the **App Store "Marketing URL"** and the link used in every community post.

Sections, top to bottom:
1. **Hero** — animated wordmark lockup + "Math fluency, the right way." + App Store badge + *Try it free in your browser* (links to the live web app).
2. **Three pillars** — the §1 trio, one tight paragraph each.
3. **How it works** — the CPA story with the dots-fade visual (reuse onboarding's Concrete/Pictorial/Abstract framing); one line on fluency-gated mastery: "Mastered means fast *and* unaided."
4. **Screenshots** — 3–4 framed shots (same set as the store).
5. **Pricing, plainly** — "Multiply & Divide: free forever. Fractions: $3.99 once. No subscription. No ads. Ever."
6. **Built for Jack** — 3-sentence founder note. This is the trust anchor for the homeschool audience.
7. **Footer** — FAQ, Privacy, Support, contact.

**Architecture note:** gh-pages root currently serves the app itself. v1: keep that, add the landing as a
static page alongside it and link both ways (landing ↔ demo). Post-launch option: swap landing to the root
and move the demo to a sub-path. Don't restructure the build before submission.

---

## 4. Launch strategy — small, effective, near-zero budget

Principle: **one niche done honestly beats broad spend.** No paid social. No influencer outreach. The
audience is reachable for free where they already gather; authenticity is the currency there.

### Phase A — Pre-launch (now, parallel with the native build; ~1–2 weeks)
- Refresh listing copy; recapture + frame the 6 screenshots; build the landing page; make the OG image.
- **TestFlight beta: recruit 10–20 parents** from 2–3 target communities (homeschool forums/subreddits/FB groups) with the honest ask: built this for my son, uses real Singapore Math, want critical feedback before the App Store. TestFlight = free access for them, feedback + a warm launch-day audience for us.
- Fold beta feedback in; tune the fluency constants from real `responseMs` data (already on the tech checklist).

### Phase B — Launch week
- Submit; on approval, **promo codes** to every beta parent + a no-pressure line: "if it's been useful, an App Store review genuinely helps a solo developer" (compliant: never incentivize or condition).
- **Founder-story post** in 3–5 communities, adapted per venue, spaced over the week — r/homeschool, Well-Trained Mind forums, 1–2 Singapore-math/homeschool Facebook groups, r/matheducation where rules allow. Lead with the story and the free tier, not the sell.
- **Submit to kids-app review outlets** (press kit ready): Educational App Store, Smart Apps for Kids, Common Sense Media suggestion, a couple of homeschool-curriculum blogs/newsletters. Lead time is weeks — send day 1.
- Optional: Product Hunt (low fit for kids apps; only if energy is spare).

### Phase C — Weeks 2–6
- **Apple Search Ads micro-test:** $5–10/day hard cap, exact-match only, niche terms ("singapore math", "bar model math", "math facts practice kids"). Niche exact-match is cheap; this doubles as the best keyword-research tool for the listing. Kill anything above ~$3 cost-per-download; iterate the keyword field from what converts.
- Watch App Store Connect (impressions → product page views → conversion) + RevenueCat. Fix the weakest step, usually screenshots or subtitle.
- If iPad usage is meaningful in Connect data: polish the iPad screenshot set.
- Start the Add & Subtract ship cycle — **every new module is a fresh launch moment** (What's New, community update, promo text swap). The roadmap is the retention marketing.

### Measurement (within the no-tracking constraint)
App Store Connect funnel, RevenueCat revenue, promo-code redemption counts, TestFlight engagement.
Landing page: none, or a privacy-friendly counter (GoatCounter/Plausible) — never on the app itself.

### Explicitly not doing
Paid social to parents (expensive, poorly targeted), kid-influencer content (COPPA optics), cross-posting
identical spam, building an email list pre-launch, Android before iOS proves the listing.

---

## 5. Sequence relative to the technical checklist

Phase A runs **in parallel** with `docs/launch-checklist.md` §1–3 (accounts, Xcode, store wiring) — the
assets are ready the day the build is. Screenshot recapture should wait until after the on-device test
pass, so captures show the final device-true UI.
