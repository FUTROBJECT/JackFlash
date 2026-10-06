# How JackFlash Decides a Fact Is Mastered

*Reusable explainer — short version for marketing surfaces, deeper dive for curious
parents, reviewers, and press. Technical sources of truth: `docs/mastery-fluency-spec.md`,
`docs/fact-selection-policy.md`.*

## Short version (parent-facing)

Most apps call a fact "mastered" after three right answers — even if your child counted
on their fingers every time. JackFlash holds a different bar: **mastered means from
memory, unaided**. The third answer has to come with no picture on screen, and in
Multiply & Divide the app also checks that the answer came from memory rather than
counting, using a generous window your child never sees. Math isn't a race: there's no
timer, no leaderboard and no "too slow," and every correct answer is celebrated. The goal
is a fact that's automatic, so it gets out of the way and leaves room for thinking —
not a fast one. (Messaging rules: `docs/voice-and-messaging.md`.)

## Deeper dive

1. **Mastery = 3 credited answers.** Every fact tracks its own count. Answers always
   record an attempt, but only *credited* answers advance the count.
2. **Gate 1 — memory, not counting (Multiply & Divide only).** A correct answer credits only
   if it lands inside a window that says "this was recall, not counting." The limit is digit-scaled: a base of 4s
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
