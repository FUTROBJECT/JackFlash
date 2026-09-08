# JackFlash Spec: **Fluency-Gated Mastery** — all modules

**Author:** Architect (Fable) · **Date:** 2026-08-19 · **Status:** Implemented (rev. 2 — curriculum-review amendments folded in; see §7)
**Audience:** React developer. Every behavior spelled out; minimal code.
**Scope:** the shared mastery model in `src/dataManager.js` plus the two shipped practice screens (`multiplication-practice.jsx`, `fractions-practice.jsx`). No visual redesign. No new content.
**Reference files:** `src/dataManager.js` (`updateMastery`), `src/constants.js`, both practice screens' `handleSubmit` flows, `docs/multiply-concrete-spec.md` (the Concrete builder this must coexist with).

---

## 1. Problem + rationale

Field observation (the app's original user, age 9): fast, accurate in-app performance that does not transfer to cold recall. Diagnosis: the mastery model counts any 3 correct answers identically, whether the scaffold was visible or not and whether the answer took 2 seconds or 30. A child can reach "mastered" without ever performing retrieval: answering with the visual present is scaffold-supported *reconstruction* (the answer can be read or computed off the support); answering without it is *retrieval*. Only retrieval trials build automaticity — recall practice produces markedly more durable retention than tasks that let the answer be read off a support. The P3 phase framing (counting → deliberate reasoning → retrieval) is the justification: the app must carry the child into the third phase, not certify the second as the third.

**Fix, two rules:**

1. **Speed gate.** A correct answer only *credits* mastery progress if it was fast enough to plausibly be recall or a derived fact (not finger-counting). Slow-but-correct is still celebrated, still counts for streak and session score — it just doesn't advance the mastery counter.
2. **Retrieval finish line.** The final step into "mastered" (the answer that takes `correct` from threshold−1 to threshold) must happen **unscaffolded** — Abstract mode, no "Show me" used on that answer. The first two steps can be earned in any mode.

**Constitutional constraint (unchanged from CLAUDE.md):** the visual is never punished. No answer is ever penalized for using the scaffold; nothing decrements except a wrong answer; the child never sees "too slow." These rules only govern what *advances* the counter, never what reduces it.

---

## 2. Data model — `dataManager.js`

### 2.1 Constants (in `constants.js`)

```
export const FLUENCY_MS_MULTIPLY = 6000;  // max response ms that credits mastery (multiply facts)
export const FLUENCY_MS_DIVIDE   = 8000;  // divide is mediated by the inverse fact — one step longer
```

6 seconds ≈ 3 s of thinking (the standard retrieval/derived-fact boundary) + an 8-year-old's tablet input overhead. Division gets 8 s because P3 division facts are retrieved *through* the inverse multiplication fact — one extra mediating step. Deliberately generous: a false negative costs extra practice; a false positive certifies non-fluency as mastery. Note the gate does not exclude skip-counting on 2s/5s/10s — that is intentional; think! Mathematics teaches derived-fact strategies at P3 and they are legitimate fluency at this stage. The gate is a coarse filter on finger-counting, not a strategy detector — do not "tighten" it. Not user-configurable in this pass (fast-follow: Parent Zone setting).

**The speed gate applies to the `multiply` module only.** Fractions is a conceptual module (naming, equivalence, comparison) — no fluency literature or syllabus sets timed targets for conceptual work, and speed-gating multi-tap item types would stall mastery on items the child fully understands. Fractions gets gate 2 only (§3). Mechanically: the fractions screen simply does not pass `responseMs`, which waives gate 1 under the backward-compat rule.

### 2.2 `updateMastery` signature

```
updateMastery(profileId, moduleId, factKey, isCorrect, opts = {})
// opts.responseMs         — number | undefined. Time from item-answerable to submit.
// opts.fluencyLimitMs     — number | undefined. The screen picks the limit (per operation);
//                           the data layer just compares. Defaults to FLUENCY_MS_MULTIPLY.
// opts.scaffolded         — boolean | undefined. Whether the answer was scaffolded (see §3).
// opts.masteryGatesExempt — boolean. True when a parent lock confines the child to a
//                           scaffolded mode; waives BOTH gates (see §3).
```

**Backward compatibility rule:** if `opts` is absent or a field is `undefined`, that gate is *waived* (legacy behavior). Existing callers (`add-practice.jsx`, `connections-practice.jsx` — staged, not shipped) keep working unchanged.

### 2.3 Crediting logic (inside `updateMastery`, `isCorrect === true` branch)

```
if opts.masteryGatesExempt: credited = true (both gates waived)
else:
  gate 1 (speed):        credited = (opts.responseMs === undefined)
                                    || (opts.responseMs <= (opts.fluencyLimitMs ?? FLUENCY_MS_MULTIPLY))
  gate 2 (finish line):  if crossing threshold−1 → threshold:
                         credited = credited && (opts.scaffolded !== true)
```

- If `credited`: `fact.correct += 1` (and `masteredAt` when threshold reached) — exactly today's behavior.
- If not credited: `fact.correct` unchanged. Still update `attempts` and `lastSeen` (the fact was seen; the anti-repeat and review scheduling must know).
- Wrong answers: unchanged (−1, floor 0, scaffold re-shown at full opacity per existing behavior).

### 2.4 Return value

`updateMastery` returns the updated fact record with `credited` (boolean) attached. **Implementation trap:** the function returns the live persisted object — attaching `credited` to it directly would serialize the flag into storage. Return a copy: `{ ...fact, credited }`.

*(Rev. 2 correction: the original §4.3 required syncing a `localMastery` "mirror" from `credited`. Code verification showed `localMastery` is not a mirror — it is the fallback store for profile-less practice, a dev-only path; with a profile, the weighted draw reads profile mastery directly. No mirror sync exists or is needed; the anonymous fallback stays legacy-ungated.)*

### 2.5 Persistence

No schema change. `correct`, `attempts`, `lastSeen`, `masteredAt` as today. Nothing new is stored.

---

## 3. What counts as "scaffolded" (per screen)

An answer is **scaffolded** when a mathematically informative visual for the current fact was **visible at submit time**:

| Screen | scaffolded = |
|---|---|
| multiplication-practice | `mode === "concrete"` (builder — always informative) OR (`mode === "pictorial"` AND `!userHidScaffold`) OR `showScaffold === true` |
| fractions-practice | (`mode !== "abstract"` AND `!userHidScaffold`) OR `showScaffold === true` |

Notes:

- Pictorial counts as scaffolded even when heavily faded (opacity 0.4 at level 2). Rationale: the array's *shape* is the leak — a child pattern-matching the footprint doesn't need full opacity. But a **hidden** scaffold (`userHidScaffold` — tapped away, or pre-hidden by the §4.5 on-ramp) is *not visible*, so the answer counts as unscaffolded. Visibility is the test, per the definition above.
- Multiply has no "Show me" button in the base flow — `showScaffold` only goes true on the wrong-answer reveal, and that fact can't be resubmitted. The clause is kept as a defensive OR (and the §4.5 on-ramp adds a "Show me" un-hide affordance whose un-hidden state flows through `userHidScaffold`).
- **Parent-lock exemption (rev. 2):** if the profile's `lockedMode` is `"concrete"` or `"pictorial"` (parent deliberately confined the child to a scaffolded mode), **both gates are waived** — pass `opts.masteryGatesExempt = true`. The original spec waived only the finish line, but concrete-locked answers essentially never beat the speed gate either (building takes time), so the exemption was inert as written. A lock is typically set for exactly the struggling child who most needs visible progress.

---

## 4. Practice screen wiring (both screens, same pattern)

### 4.1 Response timing

- Add a ref, e.g. `factShownAtRef`. Set `factShownAtRef.current = Date.now()` **inside the existing `setTimeout(() => inputRef.current?.focus(), 100)` callback** in `pickNewFact` / the item-advance — i.e., the clock starts when the item is *answerable*, so render/focus/keyboard-rise latency is not billed to the child (rev. 2).
- In `handleSubmit`: `const responseMs = Date.now() - factShownAtRef.current;`
- Do **not** reset the timer on keystrokes. Typing time is part of response time.
- Concrete-mode building time counts toward `responseMs`. Consequence: builder answers rarely beat 6s — correct and intended. Concrete is the understanding stage, not the fluency stage; it also can't hit the finish line by gate 2.
- Fractions passes no `responseMs` at all (§2.1 — conceptual module, no speed gate) but still logs timing to the DEV console for §6's data collection.

### 4.2 The call

```
const result = updateMastery(profileId, moduleId, factKey, isCorrect, {
  responseMs,
  scaffolded,            // per §3 table
  finishLineExempt,      // per §3 parent-lock note
});
```

### 4.3 `localMastery` mirror — DROPPED (rev. 2)

Superseded by the §2.4 correction: `localMastery` is the profile-less fallback (dev-only), not a mirror. It stays legacy-ungated with a comment. Nothing to sync.

### 4.4 What must NOT change

- Feedback UX: correct answers celebrate identically whether credited or not. **No "too slow" message, no timer UI, no visible countdown.** Nothing in the child's experience signals the gate exists.
- Streak, session stats, achievements: computed from raw correctness exactly as today (a slow correct answer still extends the streak).
- Wrong-answer flow (scaffold re-show, because-line, hint, bond): untouched.
- The Concrete builder interaction (docs/multiply-concrete-spec.md): untouched.

### 4.5 Finish-line on-ramp (rev. 2 — required)

Without an invitation to drop the scaffold, a scaffold-preferring child accrues `correct: 2` on dozens of facts and silently plateaus. So: when the newly drawn fact/item is at `correct === threshold − 1` and the effective mode is `pictorial` (and `lockedMode` is null), the scaffold starts **hidden** behind the existing "Show me" affordance (reusing `userHidScaffold`; multiply gains a small "Show me" button matching fractions' house pattern). A non-punitive invitation to retrieve: answering with it hidden is unscaffolded (and can cross the finish line); tapping "Show me" brings the scaffold back and the answer simply doesn't credit the crossing. No new copy, nothing pre-revealed.

ParentZone's Progress Report additionally shows a "Ready to try unaided" chips row (items at threshold−1) so a parent can invite the step.

---

## 5. Edge cases

1. **Timer across app background/foreground:** don't handle specially. A backgrounded fact answer will exceed 6s and simply not credit — harmless, self-correcting.
2. **First render:** `factShownAtRef` must be set before the first submit is possible (initialize when the first fact is picked, not on mount).
3. **`responseMs` absurdly large** (device slept mid-fact): no special case needed — gate 1 already handles it.
4. **Review-due mastered facts answered slowly or scaffolded:** unchanged behavior — correct keeps them mastered (no decrement on slow), wrong drops them per existing rules. The gates only affect the *climb* (correct-counter increments), and above-threshold increments (level 3+, the Leitner ladder) should ALSO respect the speed gate so review intervals only stretch on fluent answers. Finish-line gate applies only to the threshold-crossing step.
5. **Fractions item types (rev. 2 — superseded):** the original spec accepted 6s under-crediting of `orderThree`/`tapTwo` as a known limitation. The curriculum review ruled this a blocker — multi-tap conceptual items would reliably exceed 6s, permanently stalling C2/F2 mastery and the progress grid (a demotivation loop, not "more practice"). Resolution: **no speed gate for fractions at all** (§2.1). Gate 2 still applies — the unscaffolded finish line is valid for concepts too.

---

## 6. QA (per repo convention — static checks are NOT sufficient)

1. Node logic tests against `dataManager.js` (localStorage shim): fast-unscaffolded ×3 → mastered; slow correct → no increment, attempts/lastSeen updated; scaffolded 3rd correct → stuck at 2, no decrement; `masteryGatesExempt` → masters in pictorial (and despite slow answers); legacy 4-arg call (no opts) → old behavior; wrong answer → −1 floor 0; above-threshold slow correct → no Leitner stretch; divide credits at 7s under the 8s limit while multiply at 7s does not.
2. `npm run build` passes.
3. Manual preview drive (Adam or a preview-capable session): answer one item of every answerType in every CPA mode including a wrong answer each, regression-check multiplication, confirm no visible UX change on slow answers.
4. *(Rev. 2)* During the preview drive, read the DEV-console `[JF] responseMs` instrumentation and record Jack's actual median/90th-percentile per operation before treating the constants as final; adjust rather than assume.
5. *(Rev. 2)* Regression: pictorial-only child, 10 correct answers on one fact — confirm it reaches 2 and stops, the §4.5 on-ramp fires on the next draw of that fact, and nothing decrements or looks broken.

---

## 7. Revision log

- **Rev. 1** (2026-08-19): original spec.
- **Rev. 2** (2026-08-19): curriculum-review amendments folded in before implementation — split fluency constants by operation (multiply 6s / divide 8s); fractions excluded from the speed gate entirely (conceptual module; gate 2 retained); parent-lock exemption widened to waive both gates (`masteryGatesExempt`); response clock starts when the item is answerable (focus callback); §4.5 finish-line on-ramp added (required) with a ParentZone "Ready to try unaided" row; §1 reconstruction-vs-retrieval wording corrected; QA additions (responseMs instrumentation, pictorial-plateau regression). Code-verification corrections: §4.3 localMastery "mirror" dropped (it is the profile-less fallback, not a mirror); `credited` returned on a copy, never the persisted object. Deferred as fast-follows: parent-facing "mastery = fast and unaided" note; per-answerType speed limits if fractions ever gets a speed gate; Parent Zone configurable FLUENCY_MS.

---

## Amendment (2026-08-31): digit-scaled fluency limits

The flat constants `FLUENCY_MS_MULTIPLY = 6000` / `FLUENCY_MS_DIVIDE = 8000` are replaced by a
digit-scaled formula (curriculum ruling — see the rationale in `src/constants.js`):

```
fluencyLimitMs(operation, answer) =
  (operation === "divide" ? 6000 : 4000) + 1200 × digits(answer)
```

Multiply: 5200 / 6400 / 7600 ms for 1/2/3-digit answers. Divide: 7200 / 8400 ms.
Calibration anchor: the 2-digit multiply case (6400ms) sits within noise of the flat 6000ms the
real learner beat 149 times. Retrieval demand is constant across facts; typing on a touch keypad
is not — the per-digit term spends the generosity where the variance actually is.

Re-tuning signals (check once telemetry exists):
- **Too tight:** facts with `attempts ≥ 8` still at `correct ≤ 2` growing across sessions while
  session accuracy stays ≥85%; median attempts-to-master above ~8.
- **Too loose:** wrong-answer rate on review-due facts above ~15–20%.
- Target: ~80th percentile of correct response times on already-mastered facts per digit length.
