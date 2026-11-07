# Practice header — one compact row (UI spec, 2026-11-05)

Adam: "can we compress the header overall vertically to allow for more
space?" — chose **one row** (over two slimmer rows). Today the sticky yellow
practice header is ~150px + safe area: a row with Home · JackFlash logo ·
avatar (44px, 14px gap below), then a row of score cards (56px min-height),
plus 14/10px padding and a 4px bottom border. On a 393×759 phone that is a
fifth of the screen, and with the in-app number pad now sticky at the bottom
the problem is squeezed between the two.

## Target

One row, **~68px + safe-area inset** (≈ 10 top + 44 row + 10 bottom + 4 border):

```
[⌂]  [⭐ 1/56 ]  [ 1/2   ]  [🔥 1  ] [📅 3]   (👽)
     COLUMN ADD   SESSION    STREAK   DAYS
```

- **Home** (left) and **avatar** (right): both 44×44 (touch target; Home is
  ~32px today — grow it), same styles as now (white, `BRUTAL_BORDER_SM`,
  `BRUTAL_SHADOW_SM`, avatar round).
- **The JackFlash logo leaves the practice header** (it stays on the home
  screen, onboarding, splash and Parent Zone).
- **Score chips** between them, `flex: 1` each, `minWidth: 0`, 44px tall:
  value on top (Space Mono 700, `clamp(13px, 4vw, 17px)`, nowrap) and a tiny
  label under it (Space Mono 700, 8–9px, uppercase, opacity 0.6,
  `whiteSpace: nowrap`, `overflow: hidden`, `textOverflow: "ellipsis"` — long
  group names like "COLUMN SUBTRACTING" may truncate; the value never does).
  Same colour rules as today (mastery chip green at 100%, streak chip orange
  at ≥3, daily-streak chip cream/orange at ≥7). Chips: `BRUTAL_BORDER_SM`,
  `BRUTAL_SHADOW_SM`, radius 8, padding ~4px 4px.
- The mastery chip gets slightly more room than the others (`flex: 1.4`).
- **Daily streak chip** (Multiply shows it when `dailyStreak.current > 0`):
  keep it, compact (value "📅 3" / label "DAYS"); if four chips + Home +
  avatar can't fit at 320px without the values clipping, hide the daily chip
  below 360px viewport width (CSS media query or a width check), never clip
  a value.
- Header padding: `calc(safe-area-inset-top + 10px)` top, 10px bottom,
  `clamp(12px, 4vw, 20px)` sides; 4px bottom border; sticky top, zIndex 50 —
  all as today apart from the sizes.
- **Content below the header**: the practice view's top padding
  `clamp(24px, 6vw, 40px)` → `clamp(12px, 3vw, 20px)` so the card starts
  closer to the header.

## One shared component

The header is duplicated in `src/multiplication-practice.jsx` (~758),
`src/add-practice.jsx` (~1067), `src/fractions-practice.jsx` (~1865) and
`src/place-value-practice.jsx` (~1727). Build **`src/shared/PracticeHeader.jsx`**
(presentational only) and use it in all four:

`<PracticeHeader headerRef onBack avatar pill={{ value, label, done }}
session={{ correct, total }} streak dailyStreak />` — each screen keeps
computing its own pill value/label (the C4 "working group" logic stays where
it is); the component only draws. `headerRef` must still point at the sticky
element (the sticky-pad alignment in `ColumnMethod.jsx` and `NumberPad.jsx`
measures its bottom). Connections (`connections-practice.jsx`) is not wired —
leave it.

## Must not change

What the chips count (mastery/working-group pill, session, streak, daily
streak), their colour thresholds, the home button's behaviour, the
`headerRef` contract, anything in the practice cards. Tokens only; black text
on yellow/white chips (white text only where it is today on green/orange);
touch targets ≥44px; no new dependencies.

## QA (main loop, preview)

All four modules at 393×759, 375×667 and 320×568: one row, no clipped
values, labels truncate gracefully, Home and avatar 44px, sticky on scroll;
Multiply with a daily streak (seeded) at 320 and 393; the sticky number pad
and Add's column pad still keep the answer above the pad; the card now
starts ~80px higher.

## As built (2026-11-05)

`src/shared/PracticeHeader.jsx`, used by all four practice screens. Header is
68px + safe area (was ~150px), so the card starts ~80px higher. After the ui
review:
- **Daily streak is a badge on the avatar** (cream, orange from 7 days,
  👑 from 30; `aria-label` "n days in a row"), not a fourth chip, so it shows
  on every phone width instead of hiding below 360px.
- Three chips (mastery `flex: 1.7`, session, streak), 4px gaps, 2px side
  padding, `overflow: hidden`; values `clamp(11px, 3.8vw, 16px)`.
- **Black text on the green/orange chips everywhere** (CLAUDE.md contrast
  rule); Add's `darkOnColor` prop is gone.
- Avatar `aria-hidden`; transitions limited to background colour.

Measured with the largest realistic values ("⭐ 120/282", 12/34, 🔥 12, a
120-day badge): no value clips and no page overflow at 320, 375 and 393;
only the group label truncates at 320 ("6S, 7S, 8S …"). Multiply and Add
re-checked after the change (Add column answer scored, header updated, no
console errors).

## Revision 2 — slim bar + drop-down, one card order (2026-11-05)

Adam: "the current single row header is very cramped" and "I want the order
of elements on each module to be consistent on how they present information
vertically." He chose the slim bar with a drop-down.

**Header (`src/shared/PracticeHeader.jsx`), 64px + safe area:**
`[⌂]  group label …  ⭐ done/total  (avatar▾)` over a green progress bar.
Everything right of Home is one button (aria-expanded). Tapping it drops a
cream panel over the top of the card with three tiles: **Session**
(correct/total), **Streak** (orange at ≥3) and **Days** (only when
`dailyStreak.current > 0`; orange at ≥7, 👑 at 30). A dim overlay catches the
closing tap so it never presses a key or choice under it; any key also
closes it. The panel is absolutely positioned, so `headerRef`'s bottom (used
by the sticky pads) never moves. The avatar badge and the four score chips
of revision 1 are gone.

**Card order, every module:** dots → question → picture group (nudge,
picture, caption, Show me) → answer → pad. Where the question and the answer
are one block (Add's column, Multiply's stacked equation), the picture group
sits between the dots and that block. Multiply was the one exception (its
picture sat under the answer, half under the pad) and now follows it:
dots → picture → equation + answer box → pad, 16px between blocks, 12px
inside the picture group. Multiply's pad keeps the **picture's** top in view
on load (as Add); the first typed digit scrolls the answer box above the pad.

Verified in the preview: header 64px at 320/375/393 with "⭐ 120/282" and a
three-tile panel, no overflow; the closing tap types nothing. Multiply
Pictorial 8×2, 8×8 (with the "Not sure?" chip) and 8×10 fit at 393×759 with
the picture above; 8×8 wrong → reveal → right; Concrete 8×2's builder stays
in view while making groups, typed answer scored; Abstract "Show me" brings
the picture + fact family above the problem, wrong → re-ask → right; Add
word problem unchanged under the new header; no console errors. At 320×568
the top of a big dot array sits under the header in Pictorial (problem and
answer stay in view) — before this change it was under the pad.

After the ui review: Enter/Space on the toggle and Tab/modifier keys no
longer close the panel (Esc and other keys still do); Home and the avatar
sink into their shadows when pressed; each tile is a labelled group ("This
session: 3 of 5 right", "Streak: 3 in a row", "12 days in a row") and the
toggle has `aria-controls`; tile labels are 12px full black (still fit at
320); every header transition stops under Reduce Motion; an unknown avatar
id shows 🙂 instead of the id. Multiply's "Show me" / fact-family chip stay
mounted (hidden) during feedback, so the equation doesn't jump when an
answer is checked (measured: 189 → 189px).

## Revision 3 — centered pull-tab (2026-11-06)

Adam: the ▾ badge on the avatar "is very small and perhaps easily missed";
he asked for "a more obvious, perhaps larger, maybe even center-located
arrow". Mocked a rounded tab and a half-circle at 375px; he chose the tab.

**What changed (`src/shared/PracticeHeader.jsx` only):** the avatar badge is
gone. A **56 × 22 white tab** (2.5px border, 7px radius, 16px chevron)
hangs from the middle of the header's bottom border, inside a **44px-tall
hit area** (64 wide) that straddles the border — 21px over the progress bar,
which toggles the same panel, 23px below it. It is absolutely positioned, so
the header stays 64px + safe area and `headerRef`'s bottom (the sticky pads'
measurement) is unchanged. Adam then asked for "more breathing room" under
the tab: the four practice screens' body top padding is now
`PRACTICE_BODY_TOP` (32px, exported from the header) instead of
clamp(12px, 3vw, 20px), so the card's top border sits 13px under the tab at
every width. On very short screens (320 × 568) the pad's load-time
keep-in-view scroll still slides the card's top under the header, as it did
before the tab; the question itself stays clear. The chevron flips when open and
the panel now drops from 30px below the header so it clears the tab. The
tab has its own label ("Show/Hide session score and streak", aria-expanded,
aria-controls); the group/avatar row keeps its label and still toggles.
Press = 2px sink (no shadow to sink into — it hangs from the bar).

Verified in the preview at 320 / 375 / 393 on all four modules, closed and
open: no horizontal overflow, the closing tap types nothing, the tab reopens
the panel, no console errors.
