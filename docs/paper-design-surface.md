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

- Column step **455px** (375 artboard + 80 gap); the four 320px variants
  sit in the same rows and simply end 55px early.
- A section starts with a label frame at x = 0 (layer name `§ N …`, Space
  Mono 28/700 title + Space Grotesk 14 subtitle), then its first row
  **110px** below the label's top. Rows are separated by 160px measured
  from the tallest artboard in the row, sections by 260px.
- Sections, in order: 1 Onboarding & first run · 2 Home · 3 Parent Zone ·
  4 Multiply & Divide · 5 Fractions · 6 Add & Subtract · 7 Place Value.
  Tall artboards (progress view, legal pages, expanded child) go last in
  their section so they don't stretch the first row.
- Positioning is plain `update_styles` with `left`/`top` on the artboard
  (or on a label frame, with `position: absolute`); `create_artboard`
  ignores a position and drops the board in the nearest empty spot, so
  always move it afterwards. The row maths lives in the session that laid
  the page out; re-derive from the numbers above rather than nudging by
  eye.

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

**Writing in bulk.** Hand the prepped files to a *Sonnet* subagent (the
Agent tool's `model: "sonnet"`) with the name → artboard/root id table; it
reads each file, writes it verbatim, sets the artboard to fit-content and
screenshots it. That keeps ~15–40 KB per screen out of the main context and
off the Fable rate limit. Mechanical re-writes never need Opus or Fable.

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
- The Add Player module step (CreateProfile step 3) prints "Grades Grades
  2–4": the row label "Grades" is followed by a description that already
  starts with "Grades".
