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

Hand-fixes that are still manual after extraction (candidates for the
extractor): a `position: fixed` root or bottom nav becomes
`position: relative/absolute` inside the artboard; hover/pressed residue (a
tab tinted because the mouse was over it) is removed; an `<input>` placeholder
is given the placeholder grey and left alignment.

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

**Extractor gaps found in review (fixed by hand in Paper on 8 Nov 2026,
still open in `extract.js`):** a `<button>` whose only child is a text node
loses its border, padding, shadow and font (Home · Players "Progress" footer,
Parent Zone "Reset Progress" / "Delete Profile"), and the shared `Dropdown`
button loses its flex row so the ▼ wraps under the label. Both come from the
`textOnly` branch of the button conversion, which centres the text but copies
no box styles. When fixing by hand: Progress footer = white, 2.5px border,
3px shadow, radius 8, padding 6px 8px, Space Mono 11/700; PZ small buttons =
padding 7px 14px, Space Mono 13/700; Dropdown = flex row, space-between,
gap 10, padding 9px 12px, Space Grotesk 14/600 label, Space Mono 11 arrow.

**Not captured yet:** Fractions tapTwo / orderThree / fractionInput /
buildBar items, Add mental number line and bar-model word problems, Place
Value compare/order, Multiply division items, Achievement popup, Legal pages
(Privacy / Terms), Help FAQ, 320-wide variants, Connections (staged).

### Writing captures into Paper — lessons

- **Quote font families with single quotes** inside `style="…"`. A
  double-quoted `font-family:"Space Mono"` terminates the attribute and
  silently drops every declaration after it (the Progress view lost its
  chip borders and padding this way).
- Captures over ~60 KB (the Progress view was 108 KB) are better written
  as a hand-generated compact version that clones already-written nodes
  with `<x-paper-clone node-id="…"/>` (the practice header, the mastery-dot
  trio), writes one item per repeated grid, then `duplicate_nodes` +
  `set_text_content` for the rest. Scratch generator pattern: a small
  Node script that emits the HTML.
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
