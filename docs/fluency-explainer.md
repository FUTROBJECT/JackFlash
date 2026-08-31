# How JackFlash Decides a Fact Is Mastered

*Reusable explainer — short version for marketing surfaces, deeper dive for curious
parents, reviewers, and press. Technical sources of truth: `docs/mastery-fluency-spec.md`,
`docs/fact-selection-policy.md`.*

## Short version (parent-facing)

Most apps call a fact "mastered" after three right answers — even if your child counted
on their fingers every time. JackFlash holds a higher bar: **mastered means fast *and*
unaided**. A fact only counts when it's answered from memory, quickly, with no hints on
screen — the same standard classrooms use for real fluency. And the clock is fair: it
allows extra time for typing longer answers and for division (which kids rightly solve
through the matching multiplication fact). Slow answers are still celebrated — kids never
see a timer or a "too slow." The app just quietly waits until the fact is truly automatic
before marking it done.

## Deeper dive

1. **Mastery = 3 credited answers.** Every fact tracks its own count. Answers always
   record an attempt, but only *credited* answers advance the count.
2. **Gate 1 — speed.** A correct answer credits only if it beats a time limit that says
   "this was recall, not counting." The limit is digit-scaled: a base of 4s
   (multiplication) or 6s (division) plus 1.2s per digit of the answer — recalling 6×1
   and 10×10 is the same mental act, but typing "6" vs "100" on a touchscreen isn't.
   Division's larger base reflects real pedagogy: kids retrieve 42÷7 *through* 6×7, and
   that extra mental step deserves time, not a penalty.
3. **Gate 2 — unaided, at the finish line only.** The third, mastery-crossing answer must
   come with no scaffold visible. Along the way kids use the pictorial supports freely;
   at 2-of-3 the scaffold starts hidden behind a "Show me" button — an invitation to try
   from memory with a safety net.
4. **Invisible by design.** A slow or scaffolded correct answer gets the same celebration
   as any other. The gates shape the data, never the child's experience — no timers, no
   "too slow," no pressure.
5. **After mastery, spaced review.** Mastered facts return on an expanding schedule
   (1, 3, 7, 14, 30 days). Miss one and it drops back into rotation.
6. **What gets asked.** A budget-based selector guarantees every session both
   consolidates and advances — roughly half the questions work on half-learned facts, a
   fifth on due reviews, and never less than ~15% on new material. New facts arrive in
   fact-family order: 6×2 first ("you already know 2×6" — commutativity as a strategy),
   then its division partners while the fact is warm.
