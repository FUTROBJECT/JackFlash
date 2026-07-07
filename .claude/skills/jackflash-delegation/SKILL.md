---
name: jackflash-delegation
description: Delegation router for JackFlash build work — states which tier (main loop / curriculum / module-builder / ui / qa) and effort a task should run at, then routes it. Covers module builds, icon/asset production, and fixes. Invoke at the top of a build task when deciding who does the work.
when_to_use: When starting a JackFlash build task and deciding whether the main loop handles it or it routes to curriculum/module-builder/ui/qa, or when unsure what effort a spawned builder should get. Not needed for conversational or trivial turns.
argument-hint: [one-line description of the task]
user-invocable: true
---

# JackFlash delegation router

The model-usage workflow in one place. You (the main loop) are the top tier —
do the thinking here, delegate the building. Before starting, name the tier in
one line, then proceed.

## Tier table

| Tier | Who | Model | Route here when |
|------|-----|-------|-----------------|
| **Main loop** | you, this session | session model | Architecture, module registry + `App.jsx` routing, purchase/gating wiring, design & integration specs, **play-testing in the preview**, committing. Design-technical spec-writing (icon style, storage schema) lives here. |
| **curriculum** | subagent | Opus | Pedagogy specs — scope vs. think! Mathematics (P3), CPA stage behaviors, problem-generation rules, mastery criteria. Verifies grade scope before writing. **Never writes code.** This is a genuine domain hand-off (unlike architecture, which stays in the main loop). |
| **module-builder** | subagent | Sonnet | Implementation from a pinned spec — a new practice module, a fix-up pass, **or inline-SVG icon components**. Mirrors existing patterns. Pick this for both novel and mechanical build work; scope it tightly in the prompt. |
| **ui** | subagent | Sonnet | Neo-brutalist design review, **read-only** — component consistency AND icon-set consistency against the locked style spec + golden references. Returns a punch list, never edits. |
| **qa** | subagent | Haiku | Verify a built artifact: `npm run build` green, logic/mastery sanity, multiplication regression, render check. Read-only. |

## How to route

1. **Think and spec here.** Architecture, integration, and design-technical
   specs are the main loop's job. Delegate *pedagogy* specs to `curriculum` —
   grade-scope and CPA design is a real domain hand-off. Everything else you
   spec yourself.
2. **Agents must already exist.** The four agents are committed in
   `.claude/agents/`. Creating an agent mid-session does NOT register it for
   that session — if a new role is needed, add and commit it first, or inline
   the role into a `general-purpose` prompt for this session only.
3. **Builders do NOT commit.** `module-builder` implements and self-verifies
   (`npm run build`). The **main loop commits** with the full story after
   play-testing.
4. **Play-test here, always — static QA is not enough.** Anything
   browser-observable: run it on preview server `jackflash-dev` (:5173) and
   check it yourself at **375px and 320px**. For module work, answer **one
   item of every answerType in every CPA mode, including a wrong answer each**.
   A frozen-page infinite loop and a type-mismatch crash both shipped past
   static QA and were caught in minutes of preview driving. Adam's/Jack's eyes
   are the real QA.
5. **Optionally run `qa`** after a builder finishes, before Adam sees it.

## Build do-NOT list (carry into every builder prompt)

- No new dependencies, TypeScript, CSS frameworks, or test frameworks.
- Don't refactor/restyle shipped modules when adding a new one — nav hookup only.
- No `Math.random()` in render paths — shuffle once per item visit.
- `correctAnswer` may be a number (buildBar) — coerce before string ops;
  `evaluateAnswer` compares strictly.
- Item pools must be finite, curated, deterministic (itemKeys are persisted
  mastery units).
- Tokens only from `constants.js`; header chrome always yellow; black text on
  color chips; touch targets ≥44px.

## Icon / asset production (style-by-exemplar is the risk)

Reproducing a visual style across many assets from vibes drifts fast. Gate it:

1. **Lock the style before producing.** Required inputs: 2–4 **golden
   reference icons as raw SVG** (not PNG — the builder must read grid, stroke,
   radius, node structure), a **written style spec** (viewBox, stroke width,
   corner radius, fill-vs-stroke, neo-brutalist offset shadow, detail budget,
   palette mapped to `COLORS` tokens), and the **finalized icon inventory**
   (avatars in `constants.js` `AVATARS`; achievement icons in
   `achievementEngine.js`; module glyphs).
2. **Format:** inline SVG React components in `src/icons/`, themed via `COLORS`
   tokens (mirrors `LightningBolt.jsx`). An icon registry indexes them by id so
   avatars/achievements resolve by key, not literal emoji.
3. **Produce in batches** via `module-builder` from the pinned spec — simple
   glyphs first, illustrative avatars last (they carry the most style risk).
4. **Review each batch** with `ui` against the spec + golden references → fix.
5. **Integrate one surface at a time** (avatars → achievements), swapping the
   placeholder `emoji` field for icon refs, play-testing each surface on its
   real screen before the next.

## Ship workflow

Fix on `main` in the primary checkout → `npm run build` green → play-test in
preview → commit locally with the full story → **Adam pushes via GitHub
Desktop. Claude never pushes.** If working in a session worktree, hand touched
files to the primary checkout before ending — Desktop only pushes what the
primary checkout holds.
