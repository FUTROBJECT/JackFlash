# JackFlash — App Store Screenshot Design Spec

Draft v1 · Marketing screenshots for the Apple App Store (iPhone + iPad).
Pairs with `JackFlash-AppStore-Listing.md` — the six caption headlines come from that doc's "Screenshot Caption Headlines" section.

This is the design brief. Once you supply the real app screen captures (see the **Capture checklist** at the end), the finished frames get rendered from this spec.

---

## 1. What we're making

App Store screenshots are *marketing images*, not raw screen grabs. Each frame is a composed image: a bold caption headline, the real app screen inside a device mockup, set on a colored background. A parent skimming the store sees the captions first and the screens second — so the captions carry the pitch and the screens prove it.

We're producing **6 frames**, delivered for **two device classes**:

- **iPhone 6.9"** — the primary set, seen by most users.
- **iPad 13"** — required because JackFlash will be listed as a universal app.

---

## 2. Technical requirements

| Spec | iPhone 6.9" | iPad 13" |
|---|---|---|
| Pixel size (portrait) | 1320 × 2868 px | 2064 × 2752 px |
| Orientation | Portrait | Portrait |
| Format | PNG or JPEG, RGB, flattened (no alpha/transparency) | Same |
| Count | Up to 10; we're doing 6 | Up to 10; we're doing 6 |
| Color space | sRGB | sRGB |

Notes:

- The 6.9" set also covers the 6.5" requirement — App Store Connect downscales automatically, so a single iPhone set is enough.
- The 13" iPad set covers 12.9" the same way.
- Apple occasionally revises required sizes. **Verify the exact pixel dimensions in App Store Connect at upload time** before final export.
- The **first 2–3 frames** are what most users see before scrolling — frames 1, 2, and 3 below are sequenced to be the strongest.

---

## 3. Visual system

Pulled directly from the app so the store page and the app feel like one product.

**Palette** (from `src/constants.js`)

- Background cream `#FFFBEB`
- Ink black `#1A1A1A`
- Yellow `#FFD43B` · Green `#06D6A0` · Blue `#4CC9F0` · Pink `#FF6B9D` · Purple `#B388FF` · Orange `#FF9F1C`

**Type**

- Headlines: **Space Grotesk** 700 (the app's UI typeface). Galindo — the playful display font used in the JackFlash wordmark — may be used for a single accent word if wanted, but keep captions in Space Grotesk for legibility at thumbnail size.
- Sublines: Space Grotesk 500.

**Neobrutalist treatment** (the app's signature look)

- Thick borders: `3px solid #1A1A1A`.
- Hard offset shadow: `4px 4px 0 #1A1A1A` (scale up proportionally at screenshot resolution — roughly 14–18px offset).
- No gradients, no soft drop-shadows, no rounded-everything. Flat color blocks, hard edges.

---

## 4. The frame template

Every frame uses the same anatomy so the set reads as a series.

**iPhone 6.9" (1320 × 2868)**

1. **Background** — full-bleed flat color (each frame gets its own, see below).
2. **Caption zone** — top ~22% of the frame. Headline in Space Grotesk 700, black, ~96–110px, max 3 lines. Optional one-line subline beneath in Space Grotesk 500, ~46px. Left-aligned with a comfortable margin, or centered — consistent across all 6.
3. **Accent** — the JackFlash lightning-bolt logo mark (`GraphicAssets/JF_LogoMark_01.svg`) small in a top corner, or a single brutalist shape (circle/burst) as a graphic anchor. Subtle — it should not compete with the caption.
4. **Device mockup** — the real screen capture inside a clean black-outline iPhone frame with the brutalist offset shadow. Centered horizontally, ~960px screen width, positioned so the bottom of the device bleeds slightly off the frame edge — this makes the screen feel immersive rather than floating.

**iPad 13" (2064 × 2752)**

The iPad frame is nearly square, so the stacked layout re-proportions:

- Caption zone: top ~26%, headline can run larger.
- Device mockup: a single iPad device frame, centered, screen ~1500px wide, bottom bleeding off-edge.
- Same colors, captions, and accents as the matching iPhone frame so the two sets are obviously the same campaign.

---

## 5. The six frames

For each frame: the caption (from the listing), the app screen to capture, what that capture must show, an optional subline, and the background color.

### Frame 1 — "One app. Every child's level."

- **Background:** Yellow `#FFD43B`
- **App screen:** Profile Picker (`ProfilePicker.jsx`)
- **Capture must show:** At least 2 — ideally 3 — child profiles with distinct avatars. To match the description copy, set up "Olive" (3rd grade) and "Anna" (kindergarten). Distinct avatar emojis, visible streak/progress on each card.
- **Subline (optional):** "Each child gets their own profile, avatar, and level."
- **Why it leads:** The shared-iPad, multi-child story is JackFlash's most concrete everyday hook for parents.

### Frame 2 — "Smart Practice adapts to your child"

- **Background:** Green `#06D6A0` (the Multiply module color)
- **App screen:** the "How it Works" / Smart Practice explainer view (`SmartPracticeExplainer.jsx`)
- **Capture must show:** The five category cards — New (blue), Learning (yellow), Struggling (pink), Mastered (green), Review-due (orange) — visible together. This frame literally shows what Smart Practice *is*.
- **Subline (optional):** "Every problem picked for what they're ready for next."
- **Note:** This is the frame that earns the branded feature name. Caption uses "Smart Practice" capitalized, as a proper noun.

### Frame 3 — "See the math — don't just guess"

- **Background:** Blue `#4CC9F0`
- **App screen:** Practice screen (`multiplication-practice.jsx`) with a **visual scaffold visible** — a dot array or bar model under an active problem.
- **Capture must show:** A multiplication problem mid-practice with the scaffold on screen, so the Concrete-Pictorial-Abstract idea is obvious at a glance.
- **Subline (optional):** "Dot arrays and number bonds — understanding first, fluency second."

### Frame 4 — "Mastery that actually sticks"

- **Background:** Pink `#FF6B9D`
- **App screen:** Progress view (the chart icon during practice) showing the mastery-dot grid.
- **Capture must show:** A grid of mastery dots with a realistic mix — some mastered, some learning, a couple struggling — so progress looks real, not perfect.
- **Subline (optional):** "Spaced review: next day, 3 days, 7, 14, 30."

### Frame 5 — "Parents see what matters"

- **Background:** Purple `#B388FF`
- **App screen:** Parent Zone (`ParentZone.jsx`) — the per-child progress report with the "Needs Practice" section.
- **Capture must show:** A child's progress report with the "Needs Practice" list populated, showing specific facts. (Capture *after* the parent gate — don't show the gate itself.)
- **Subline (optional):** "Per-child reports, the exact facts they're missing, simple controls."
- **Privacy ribbon:** Add a small brutalist ribbon/badge to this frame — on the marketing layout near the device, not inside the screen — reading "No account · Nothing leaves the device." This is where the privacy message now lives. Pairing it with a frame that shows real parent functionality means trust rides on proof, not a standalone claim.

### Frame 6 — "Streaks and badges keep them coming back"

- **Background:** Orange `#FF9F1C`
- **App screen:** Achievement / streak UI — an achievement badge popup (`AchievementPopup.jsx`) over the practice screen, or a screen showing the daily streak counter and earned badges.
- **Capture must show:** A celebratory moment — a badge unlocking, with a visible multi-day streak count. It should look earned, not empty.
- **Subline (optional):** "Daily streaks and badges — kids come back on their own."
- **Why it's here:** A screenshot should show the app working. Privacy is a claim, not a demonstration, so it no longer gets its own frame — it's carried by Apple's "Data Not Collected" privacy label, the description's PRIVATE BY DESIGN section, and the trust ribbon on Frame 5. This slot does more work showing the engagement loop parents actually care about.

---

## 6. Capture checklist — what to send

For each frame, capture the screen on a real device or simulator at full resolution. A few setup notes so the captures look intentional:

- [ ] **Frame 1** — Profile Picker with profiles "Olive" (3rd grade) and "Anna" (kindergarten), distinct avatars, some visible streak/progress.
- [ ] **Frame 2** — the "How it Works" / Smart Practice explainer view, all five category cards in view.
- [ ] **Frame 3** — Practice screen with a problem showing and a visual scaffold (dot array or bar model) displayed.
- [ ] **Frame 4** — Progress view (chart icon) with a realistic spread of mastery dots.
- [ ] **Frame 5** — Parent Zone progress report with a populated "Needs Practice" list (captured past the parent gate).
- [ ] **Frame 6** — An achievement badge unlocking (or the streak/achievements screen) with a visible multi-day streak count.

Capture both **iPhone** and **iPad** versions of each screen if possible — the iPad set should use iPad-native captures, not upscaled iPhone ones. If iPad captures aren't available yet, the iPhone set can ship first and iPad can follow.

Tips: use the same demo child data across captures so the set feels coherent; clean status bar (full battery, no clutter) if visible; capture in light mode.

---

## 7. Next steps

1. Review this spec and the sample frame preview — confirm the template direction (caption placement, device treatment, color order).
2. Send the six iPhone captures (and iPad captures if ready) per the checklist above.
3. Final frames get rendered from this spec and exported at the exact App Store Connect dimensions.
