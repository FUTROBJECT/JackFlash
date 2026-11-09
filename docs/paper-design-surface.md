# Paper as the JackFlash design surface

Paper (app.paper.design) is the primary design surface for JackFlash from
November 2026. The Paper file **"JackFlash UI"** (team FutureObjects, folder
Projects) mirrors the shipped app: one page of as-built screens, one page of
tokenized design-system atoms, and two scratch pages for explorations. This doc
is the process for keeping it in sync with the code. The direction of truth is
**code → Paper** for what has shipped, and **Paper → code** for new work.

## The file

| Page | Icon | What lives there |
|---|---|---|
| **UI** | arrow | As-built screens, one 375-wide artboard per screen state, captured from the running app (never hand-drawn). Height is `fit-content`, so long screens are long. |
| **Design system** | swatches | Hand-built, tokenized atoms: `DS 01 · Foundations · Color` … `DS 08 · Navigation & overlays`. Every value is a `var(--…)` token. |
| **Visual directions (exploratory)** | design | New directions and redesign proposals. Anything here is a proposal until it is built. |
| **Early concepts (not using)** | paper | Parked ideas. Nothing here is a spec. |

**Tokens** are the file's design tokens (Paper's token panel), generated from
`src/constants.js`: `--color-*` (the 10 `COLORS` plus `--color-module-*` for
`MODULE_COLORS`), `--font-body / --font-mono / --font-hero / --font-display-alt`
(Space Grotesk, Space Mono, Shrikhand, Galindo — all resolve in Paper), a
`--text-*` size ladder, `--spacing-*`, `--radius-*`, `--border-sm/md` (2.5px /
3px), `--shadow-sm/md` (3px / 4px offsets), `--opacity-rule` (0.6) and
`--opacity-scaffold-min` (0.15), `--breakpoint-phone*` (320 / 375 / 390).
If `constants.js` changes, change the token, not the artboards.

## Canvas layout (UI page)

Artboards sit in numbered sections, one section per area of the app, each
a row (or two) of top-aligned artboards. The grid is fixed so new captures
drop into a predictable slot:

- **Every artboard is 393 wide (iPhone 16).** The 320px variants keep
  their 320px content centred inside a 393 frame (`alignItems: center` on
  the artboard), so columns stay aligned. Artboards are `height:
  fit-content` with an 852px minimum.
- Column step **473px** (393 + 80 gap), at most six per row.
- A section starts with a label frame at x = 0 (layer `§ N …`, Space Mono
  28/700 title + Space Grotesk 14 subtitle); its first row starts **120px**
  below the label. Rows are separated by **240px** measured from the
  tallest artboard in the row, sections by **360px**.
- Sections, in order: 1 Onboarding & first run · 2 Home · 3 Parent Zone ·
  4 Multiply & Divide · 5 Fractions · 6 Add & Subtract · 7 Place Value.
  Artboards taller than a phone (expanded child, How it works, legal pages,
  progress view, Onboarding 3) share a row of their own at the end of the
  section so the main flow stays one phone high.
- **Re-run the row maths whenever an artboard is rewritten**: fit-content
  heights change, and a taller board silently runs into the row below.
  Read heights with `get_basic_info`, compute `top` per row, apply with
  `update_styles` (`left`/`top` on artboards; `position: absolute` +
  `left`/`top` on label frames). `create_artboard` ignores a position, so a
  new board always needs that step.

## Capture standard: iPhone 16, insets on

Captures are taken at **393×852** with the safe-area insets the phone
reports (59px top, 34px bottom), so the header, bottom nav and sheets sit
exactly where they do on Adam's iPhone 16. The app reads its insets from
`--safe-area-inset-*` CSS variables (the Capacitor plugin sets them on
device), so the web preview reproduces the phone when the variables are set
before capture:

```js
window.__JF_WIDTH = 393; window.__JF_HEIGHT = 852;
document.documentElement.style.setProperty('--safe-area-inset-top', '59px');
document.documentElement.style.setProperty('--safe-area-inset-bottom', '34px');
```

then `resize_window` to 393×852 and `__jfSave(...)` as usual. The prep step
adds a presentation status bar (9:41, signal, wifi, battery) over the top
inset of every 852px root. The 320px variants are still captured at 320×568
with insets 0 (a notch-less phone) and framed in a 393 artboard.

## Capturing a screen (code → Paper)

The app styles everything inline (no CSS framework), so a rendered screen can
be lifted straight out of the DOM and written into Paper with near-pixel
fidelity. The extractor is `tools/paper/extract.js`; the capture sink is
`tools/paper/capture-server.mjs`.

1. `npm run dev`, open the preview at **375 × 812**. In a second terminal:
   `node tools/paper/capture-server.mjs tools/paper/captures`.
2. Seed a profile so you don't click through onboarding:
   paste `tools/paper/seed-profile.json` into
   `localStorage.setItem('jackflash_data', JSON.stringify(...))` and reload.
3. In the page console (or via the browser tool), install the extractor:
   ```js
   window.__JF_REPO = "/absolute/path/to/the/repo";
   (0, eval)(await (await fetch("/tools/paper/extract.js")).text());
   ```
   Vite serves the file from the repo root. **Editing `extract.js` while the
   dev server runs triggers a full page reload** (the app restarts at the
   splash), so finish extractor changes before a capture run.
   `tools/paper/drive.js` bundles the clicking helpers for a capture run
   (`jf.boot()` sets the 393×852 insets and installs the extractor,
   `jf.seed(patch)` writes a clean unlocked profile, `jf.start()` goes
   splash → card → practice, `jf.skill(label)` opens a "Practise only …" row,
   `jf.solveMul()`, `jf.tap/click`); install it the same way:
   `(0,eval)(await (await fetch("/tools/paper/drive.js?"+Date.now(),{cache:"no-store"})).text())`
   (the cache-buster matters: the pane caches the file). **Do not edit
   anything under `tools/paper/` mid-run — Vite reloads the page.**
4. Drive the app to the state you want, then either
   - `window.__jfExtract()` → returns Paper-ready HTML (pass a selector for an
     overlay, e.g. `'#root > :last-child'` when `#root` has two children), or
   - `window.__jfSave('UI · Screen name')` → POSTs it to the capture server,
     which writes `tools/paper/captures/<name>.html`. Use this; it keeps 10–100 KB
     of HTML out of the chat transcript.
5. In Paper: `create_artboard` (375 × 812, `backgroundColor: #FFFBEB`,
   `overflow: hidden`) on the **UI** page, `write_html` the file's contents
   with `mode: "insert-children"`, then `update_styles` the artboard to
   `height: "fit-content"`, and `finish_working_on_nodes`.
6. Review with `get_screenshot` against a browser screenshot of the same state.

What the extractor does to the DOM so Paper accepts it: inline styles only;
`<button>/<input>/<select>/<a>` → `<div>` carrying their computed font and
colour; margins folded into padding wrappers; `display:grid` → wrapping flex
row pinned to the measured width; `em`/`vw`/`clamp()`/`calc()`/`var()` values
resolved to px from computed style; longhands collapsed to `border`,
`border-radius`, `padding`, `gap`; transitions/animations/cursor dropped;
`100vh/100vw` → 812/375; `/public` asset URLs → `paper-asset://` absolute
paths; SVGs inlined at their rendered size with `<animate>` stripped.

**Clone, don't resend, recurring SVGs.** Every emitted SVG longer than 600
chars carries `data-jf-hash`. Set `window.__jfAliases = { "<hash>": "<Paper
node id>" }` and the extractor emits `<x-paper-clone node-id="…">` instead of
the SVG. Known hashes in the current build:

| Hash | What | Paper node (UI page) |
|---|---|---|
| `1jzkm3h` | wordmark lightning bolt (static, cream/yellow) | the bolt inside `Home · Players` → Wordmark |
| `ctad19`, `1w8thee` | bolt + wordmark variants inside the module picker / avatar picker | not yet aliased |
| `yawywz` | fractions wrong-answer circle | not yet aliased |

**Prep step.** `node tools/paper/prep.mjs tools/paper/captures <outDir>`
rewrites every capture into Paper-safe HTML: fixed → absolute inside a
relative 812px root, z-index dropped, quotes normalised, hover residue and
border longhand noise removed, grid spans widened, one-word labels no-wrap,
operands beside operators wrapped, offset-only elements pinned. Write the
prepped file verbatim with `write_html`; the only remaining manual touch is
an `<input>` placeholder (grey, left-aligned).

**Writing in bulk.** Hand the prepped files to *Sonnet* subagents (the
Agent tool's `model: "sonnet"`), **4–6 screens per agent**: each write
costs the agent the file (15–45 KB) plus a ~8k-token createdNodes reply, so
20 rows overflow one context and the agent stops early. Give each a
name → artboard id table; it looks up the root with `get_children`, writes
the file verbatim, sets the artboard to fit-content and screenshots it.
Tell it every Paper call needs `fileId`. Mechanical writes never need Opus
or Fable.

## Status — what is in Paper, what is queued

**In the Paper file now (UI page, 7 Nov 2026):** all 22 captures are
written and screenshot-checked — Splash · Onboarding 1–4 · Create profile
1–3 · Home (Players, after a session, Module picker sheet, Avatar picker) ·
Parent gate · Parent Zone (Children, Children · Jack expanded, Modules store,
How it works, Settings) · Multiply (Concrete, Pictorial, Abstract, Abstract ·
Show me, Header panel open, Wrong answer reveal, Progress & settings view) ·
Fractions (choice4 circle, choice4 bar, wrong answer) · Add (Column method,
wrong answer) · Place Value (Build & Read). **Design system page:** DS 01–08
complete. The raw captures stay in `tools/paper/captures/` as the source of
record for each artboard.

Paper is on **Pro** (upgraded 7 Nov 2026 after the free tier's weekly MCP
limit blocked writes and screenshots). If writes ever stop with no error
detail, check the plan before debugging the HTML.

**Recaptured 8 Nov 2026:** the first ten artboards (Splash, Onboarding
1–4, Create profile 1–2, Home · Players, Parent gate, Parent Zone · Modules)
had been pushed through chat with the first extractor, before margin folding
and quote normalising existed, so buttons had lost their styles and the 20px
screen padding was gone. They were recaptured with the current extractor and
each artboard's content replaced. Two things bit during that run and are now
guarded in `extract.js`:

- **Viewport.** The preview tab had drifted back to desktop width, so every
  `clamp()`/`vw` value (wordmark size, splash lockup scale, avatar grid
  columns) resolved for 1024px. `__jfSave` now refuses to run unless the
  viewport is exactly 375px; set the mobile preset first.
- **Quoting.** Form controls copy their computed font family, which Chrome
  quotes with double quotes; inside `style="…"` that ended the attribute and
  dropped every later declaration. Every emitted value is now single-quoted.

Paper-side rules learnt: Paper defaults text to `overflow-wrap: anywhere`,
so single-word labels that fit in Chrome (tab names, avatar names, the
wordmark) can break mid-word — give them `white-space: nowrap`. Paper
ignores `transform: scale()`; scale the font sizes and boxes instead.

**First-pass artboards rebuilt (8 Nov 2026):** the 21 raw captures from the
first pass carried double-quoted font families (the pre-fix extractor), so
every keypad key, header label and button in those artboards had lost its
styles. The capture files were repaired in place (quotes → single), re-run
through the prep step with the span / nowrap / residue fixes, and each
artboard's root replaced. The captures folder is therefore clean: every
file in it can be re-prepped and written again at any time.

**Second capture pass (8 Nov 2026), 29 more artboards:** one item of every
remaining answerType, reached through the Progress view's "Practise only …"
skill rows on a fully unlocked seed profile (`purchases` holding the three
`module.*.full` ids) —

- Fractions: buildBar (F2), tapTwo (F3), tapTwoOrEqual (C1), orderThree
  (C2), fractionInput (E3 and A1), singleNumber (E2), number line (E4)
- Add: open number line (M1, M3), bar models (W1 part-whole, W2 comparison,
  W3 two-step), facts (F1), column subtraction across zeros (S3)
- Place Value: buildNumber (B2), tapTwo compare (C1), orderThree (C2),
  expanded form (X1), digit value (V1), number patterns (C3)
- Multiply division item (Concrete, `lockedOperation: "divide"`),
  Achievement popup (Warming Up, 3 in a row; needs `achievements: []`),
  Parent Zone · Privacy Policy and · Terms of Service (Settings tab links)
- 320-wide variants: Home · Players, Multiply · Concrete, Parent Zone ·
  Modules, Fractions · choice4 (set `window.__JF_WIDTH = 320` and resize the
  preview to 320×568 before `__jfSave`)

**Still not captured:** Connections (staged), Help FAQ as a separate page
(the "How it Works" tab *is* the FAQ, already captured), wrong-answer
states for the new answerTypes, and the Pictorial/Abstract modes of the
non-Multiply modules.

**Full retake (9 Nov 2026):** all 60 artboards were re-captured with the
then-current extractor from a clean seeded profile (`jf.seed()`: Jack, empty
mastery, every module unlocked) and rewritten. Everything is `jf.*` driven,
see `tools/paper/drive.js`. States worth knowing:

- `Parent Zone · Modules (store)` (393) is captured from an *unpurchased*
  profile (buy buttons, $9.99 bundle card); the `(320)` variant from the
  fully unlocked one ("✓ Unlocked").
- Pictorial / Abstract / Division come from `settings.lockedMode` /
  `lockedOperation` in the seed; the Multiply Progress view and the home
  "after a session" banner come right after the three-correct achievement run
  (`achievements: []`).
- In this build the word-problem screens (W1–W3) show their bar models
  straight away (no "pick" step), and W3 shows both steps at once.
- The wrong-answer dialog opened on the **first** miss in both Multiply and
  Add in this run; give the derivation line ~2.5 s.
- The Progress view (109 KB) is written in four parts: part 0 is the whole
  root minus three big sections, parts 1–3 are `insert-children` into the
  container five levels down (root → child 1 → first child ×3). Do it with
  one writer agent; a single 109 KB `write_html` is too much.

Rules the retake added (all in `extract.js` / `prep.mjs`):

- **Finish CSS animations before reading.** The preview pane throttles
  rendering while it is not on screen, so `dotPop` (`scale(0)` → 1, 0.25 s)
  and `fadeSlideUp` were still on frame 0 when the DOM was read: dots,
  Concrete/Pictorial pictures and the Onboarding 3 icons were captured 0 px
  wide (the scale-baking rule turned `scale(0)` into 0 px). `__jfExtract` now
  calls `animation.finish()` on every finite animation first. The achievement
  popup scales in too, so wait ~0.7 s after "ACHIEVEMENT" appears.
- **Splash: freeze the wordmark.** The two "a" slots cycle through objects
  (infinite animation, opacity from a stylesheet), so a snapshot is an
  arbitrary frame with the letter shrunken. Before saving, inject
  `.jf-occ{animation:none!important}.jf-occ[data-occ=obj]{opacity:0!important}.jf-occ[data-occ=letter]{opacity:1!important;transform:translate(-50%,-50%)!important}`
  and remove the `[data-occ=obj]` nodes (the extractor reads opacity from
  inline style only).
- **`inline-block` with block children stacks.** The Fact Family chip's label
  sat beside its equations; the `inline-*` shrink-to-fit rule now adds
  `flex-direction:column` for an `inline-block` that has non-inline children.
- **Line count from the text, not the box.** The nowrap-if-it-fit-on-one-line
  rule compared the *element's* height with a line, so a tab or button with
  `min-height: 44px` never got `white-space: nowrap` and "How it Works"
  wrapped in Paper. It now measures the text's own range box.
- **Header drawer (prep).** The practice header's session/streak panel hangs
  off the sticky header with a dim scrim between header and content; Paper
  paints in DOM order, so content covered both. `prep.mjs` moves the scrim
  (starting below the header) and then the panel to the end of the root and
  adds the header's padding to the panel's offsets.

Look-alike findings from the retake that are the app's own rendering, not
Paper bugs: the Terms of Service heading wraps to two lines at 393 px
(measured in the browser: 75 px high); the achievement confetti sits at one point because the
app animates it with `transform` (ignored by Paper); Create profile · 2's
title sits under the status bar (the safe-area gap below).

### Driving the app to a screen

The dev build has no deep links; the capture helpers live in page JS.
Install the extractor, then use plain DOM clicks (`button.click()`), which
leave no hover residue. The things that are not obvious:

- Reset onboarding: `localStorage.removeItem("jackflash_data")` + reload.
  Seed a profile: `tools/paper/seed-profile.json`; add
  `"purchases": ["module.add.full","module.fractions.full","module.placevalue.full"]`
  to unlock everything (web, non-tester build).
- Switch module: edit `profiles[0].activeModule` in the blob and reload
  (`dataManager` caches the blob in memory).
- A specific skill: Home → the card's **Progress** button → tap the row
  whose `aria-label` is `Practise only <skill label>`; the practice view
  then draws only that skill. Tapping the home button in the practice
  header returns to Home.
- Parent gate: read `What is a × b?` from `body.innerText`, set the input
  through the native value setter and dispatch `input`, then Submit.
- React inputs need the native setter:
  `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el, v); el.dispatchEvent(new Event("input",{bubbles:true}))`.
- Wrong-answer reveal: the takeover dialog (`aria-label="How to solve it"`)
  opens on the **second** miss of an item in Multiply and Add in older
  builds (the first showed the inline hint; the 9 Nov 2026 build opened it on the first); the derivation line animates in afterwards, so
  wait ~2 s after the dialog appears before `__jfSave`.
- Achievement popup: `achievements: []` on the profile, `lockedOperation:
  "multiply"`, answer three items correctly with the pad buttons and
  `__jfSave` within ~2 s (it auto-dismisses after 3 s).

### Writing captures into Paper — lessons

- **Quote font families with single quotes** inside `style="…"`. A
  double-quoted `font-family:"Space Mono"` terminates the attribute and
  silently drops every declaration after it (the Progress view lost its
  chip borders and padding this way). The extractor normalises this since
  8 Nov 2026; hand-written HTML (generators, DS atoms) still has to.
- Captures over ~60 KB (the Progress view was 108 KB) are better written
  as a hand-generated compact version that clones already-written nodes
  with `<x-paper-clone node-id="…"/>` (the practice header, the mastery-dot
  trio), writes one item per repeated grid, then `duplicate_nodes` +
  `set_text_content` for the rest. Scratch generator pattern: a small
  Node script that emits the HTML.
- Grid → flex loses column spans unless the spanned child is widened: the
  extractor now gives a `grid-column: span N` child N shares plus the gaps
  (number-pad Backspace spans 2, Check spans 3). Before 8 Nov 2026 this was
  a manual perl fix, and every keypad screen written without it shows
  "Check" wrapped onto two lines in a fifth-width key.
- An element whose `left`/`top` came with its `position` from a stylesheet
  or animation keyframe (the achievement confetti) arrives with offsets but
  no position and becomes flow content; the extractor now copies the
  computed `position` when it is absolute or fixed.
- Single-word button labels (Check, Children, Submit) get `white-space:
  nowrap` from the extractor, because Paper breaks words anywhere inside a
  narrow flex item and Chrome never splits a one-word label.
- Paper drops bare text that sits beside an element child (the "5" next to
  the absolutely positioned "×" in the Multiply question). The extractor now
  wraps text nodes of mixed-content elements in their own `<div>`.
- Paper stacks siblings in document order and ignores `z-index`, so an
  overlay or dropdown panel that the app layers with z-index renders behind
  whatever follows it in the DOM. After writing such a screen, `move_nodes`
  the overlay (and the panel) to the end of the root; start the overlay
  below the header (`top: 48px`) if the header should stay bright.
- A reveal sheet whose card is centred by `margin: auto` in the app arrives
  left-aligned; give the wrapper `align-items: center`.
- A shorthand written with `calc()`/`var()`/`clamp()` (the practice
  header's `padding`) is a *pending-substitution value*: Chrome lists its
  longhands in `el.style` but returns "" for each. The extractor falls back
  to the computed value, otherwise the declaration vanishes — every capture
  before 8 Nov 2026 had a header with no padding for this reason.
- The bare-text wrap applies only beside an **absolutely positioned**
  sibling (the "×" case). Beside in-flow siblings — bold `<span>`s in a
  sentence, the disc icon in "2 fives: 5,", the column headings — Paper
  keeps bare text, and wrapping it stacks the words one per line.
- A centred block with `max-width` (margin auto) fills its line up to the
  max in the browser; as a Paper flex child it hugs its content. The
  margin fold now gives such a child `width:100%` (the home session
  banner, the create-profile and parent-gate cards).
- A negative margin cannot become padding; the fold turns it into a
  relative offset on the wrapper (`position:relative; top:-16px`).
- `inline-flex` / `inline-block` elements shrink to their content in the
  browser; converted to `flex` they stretch across a column parent (the
  stacked fraction's vinculum ran the full row). The extractor now gives
  them `width: fit-content` and an `align-self` matching `text-align`.
- `visibility: hidden` elements still take up space (the wrong-answer
  reveal's blank answer chip sizes itself by a hidden copy of the answer).
  The extractor emits an empty box of the measured size for them, so the
  chip keeps its height instead of collapsing to a line.
- Paper drops `inline-block` / `inline-flex` boxes that sit in a line of
  text, and a block box there starts its own line (the wrong-answer chip
  landed under "shaded →"). The extractor re-flows such a line as a
  wrapping flex row: one item per word, `column-gap` = the width of a space
  in that font, `width: 100%` (Paper hugs a flex child, so a short row
  would sit at the left) and justified like the text was; adjacent text
  runs with no space between them stay one word.
- A single-column CSS grid (the wrong-answer card's rows) becomes a flex
  row in Paper whose children hug their content, so a centred line sat at
  the left. The extractor now gives every child of a single-track grid the
  full width (a child's own width still wins).
- `transform: scale()` is ignored by Paper. The extractor now bakes the
  factor into every px length of the scaled subtree (the reveal's
  PictureSlot) and pins the scaled element to the width it paints, so the
  picture takes exactly the space it takes on the phone instead of being
  clipped by its fixed-height slot.
- `margin: 0 auto` on a fixed-width block (the column-method digits) now
  centres it; before, no side was non-zero so the fold never ran.
- Grid children whose own width is a percentage ("fill the track", the
  place-value discs) take the track share instead, so five discs stay on
  one row.
- SVG `<text dominant-baseline="central">` (bar-model pills, place-value
  disc values) is ignored by Paper, so the numbers sat high. The extractor
  (and prep, for older captures) drops the attribute and moves `y` down by
  0.35 × font-size instead.
- Paper wraps text anywhere, even inside a word, when a flex item is narrow
  (the 320px tab strip set "How it Works" one letter per line). The extractor
  keeps the browser's line breaks: text that fit on one line gets
  `white-space: nowrap`, text that wrapped gets `min-width` = the width it
  wrapped at.
- `transform: translate()` is ignored too (the toggle knob). It becomes a
  relative offset (`position: relative; left/top`).
- Buttons centre their label only when they are text-only; a button with
  element children (the toggle) keeps the browser's flex-start, otherwise a
  translated child ends up centred *and* shifted.
- After every write set the artboard to `height: fit-content`
  (`update_styles`) and screenshot it; fit-content is what makes the long
  Parent Zone and Progress artboards readable.

## Paper → code

New work is designed on **Visual directions** using the tokens and the DS
atoms (clone them with `x-paper-clone`). When a direction is approved, move
the artboard to **UI** and build it: `get_jsx` with `includeNodeIds: false`
and `get_computed_styles` give exact values; translate them into the inline
style objects and `constants.js` tokens the codebase uses (never read values
off a screenshot). Then recapture the built screen and replace the proposal
artboard so UI stays as-built.

## Design decisions made in Paper first

Paper is the design surface: a change is drawn here first, then built. While
a decision is Paper-only its artboards deliberately differ from the app, and
a re-write from the capture files would revert it — re-apply (or ship the
code) after any re-write. Both decisions below **shipped in code on
2026-11-09** (`src/shared/barComponents.jsx`) and the W1/W2/W3 captures were
retaken, so Paper and the app agree again.

- **Bar-model connector (Adam, 2026-11-09):** the whole/parts diagram joins
  the whole to its two parts with a bracket — a stem from the whole's
  bottom centre, a horizontal bar halfway down the gap, and a drop onto the
  **midpoint** of each part — instead of the app's single stem onto a
  full-width line. Done on `Add · Bar model (W1)` and both steps of
  `Add · Two-step bars (W3)`. In code the lines live in
  `src/shared/barComponents.jsx` (the `BarModel` part-whole branch).

- **Comparison bar (Adam, 2026-11-09):** the longer bar is one solid bar;
  a vertical divider inside it at the shorter bar's length marks where the
  shorter quantity ends, the difference segment carries a dashed midline,
  and the difference pill sits directly under that segment (same x-span),
  joined by a short stem from the bar's bottom to the pill's top centre.
  The bar's own total stays centred in the whole bar. Replaces the app's two
  bracket lines dropping from the dashed span to the pill. Done on
  `Add · Comparison bar (W2)`; code is the comparison branch of `BarModel`
  in `src/shared/barComponents.jsx`.

## Paper-only edits (Adam, 2026-11-09) — both now shipped in code

Two edits were first made directly on the artboards; both are now fixed in the
app and the artboards recaptured, so a recapture no longer reverts anything.

- **`Parent gate`:** the question is two fixed lines — "What is" and, below
  it, the equation (`src/ParentZone.jsx`, equation line `nowrap`). Adam's
  call: a long problem can never force a return mid-equation. The earlier
  one-line 28px version was dropped.
- **`Place Value · Number patterns (C3)`:** the place-value disc charts
  (`PlaceValueDiscChart` and `PlaceValueArithChart` in
  `src/shared/barComponents.jsx`) now carry `margin: "0 auto"` so the 300px-max
  wrapper is centred (16px each side at 393px; it was 15px off-centre). Same
  pattern still sits in `NumberLineScaffold`, `src/modules/fractions.jsx`
  ~:127 (not changed: shipped Fractions, no reported problem).

## Findings from the first capture pass (app bugs, not design decisions)

- Onboarding module cards, avatar tiles, profile cards and the bottom-nav
  tabs render their titles in **Arial**: the `<button>` elements set no
  `fontFamily`, so the UA button font wins over the page's Space Grotesk.
  The card titles do not inherit either. Fix: `fontFamily: "inherit"` on
  every `BrutalButton`/card button (ProfilePicker, Onboarding, ParentZone).
- Parent gate "Submit" and the store's "✓ Included" chip use **white text on
  green** (`#06D6A0`), against the design rule of black text on colour chips.
- The parent-zone tab strip draws the active tab with a yellow pill and no
  border, unlike every other chip in the app (2–2.5px black border).
- **CreateProfile has no safe-area padding** (`padding: "20px"` on the
  step container, `ProfilePicker.jsx` ~:957): on a phone with a Dynamic
  Island the "Pick your avatar!" heading sits under the status bar. Seen in
  the 393×852 capture; the other first-run screens add
  `var(--safe-area-inset-top)`.
- The Add Player module step (CreateProfile step 3) prints "Grades Grades
  2–4": the row label "Grades" is followed by a description that already
  starts with "Grades".

- (2026-11-09, verified against the live preview) These looked like Paper
  bugs but are the app's own rendering: the Parent-gate question
  ("What is 38 × 7?") wraps onto two lines at 393px (15 chars of 32px Space
  Mono is 294px, the card's inner width is 287px); at 320px the Parent Zone
  tab strip used to wrap "How it Works" onto three lines and push "Settings"
  off the screen (fixed in the app on 2026-11-09: the four tabs share the row,
  `nowrap`, 44px high, 4px side padding; the eight Parent Zone artboards were
  re-captured); in Place Value C3 the comma after each Shrikhand number sits
  ~6px from its ink because of Shrikhand's trailing side bearing plus Space
  Mono's comma advance (the markup gap is 2px).
