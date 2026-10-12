# JackFlash voice and messaging: math isn't a race

**Owner:** Adam · **Written:** 2026-10-06 · **Source:** Adam's paper *Before the Jet Pack* (a parent's guide written after a school viewing of the documentary *Counted Out*), plus `docs/confidence-pass-spec.md`.

This is the rule set for any copy that describes JackFlash, its goals, or what success looks like: in-app text, the Help page, onboarding, the App Store listing, the landing page, community posts, and anything an agent drafts. Read it before writing copy.

## What we believe

- **Math is something you do, not something you are.** Copy never sorts kids into "math kids" and "not math kids", and never implies a verdict about the child.
- **Math isn't a race.** Being fastest is not the goal. JackFlash never shows a timer, never ranks a child against anyone, and never says "too slow".
- **Facts should become automatic, and that is different from fast.** A fact that comes from memory "gets out of the way so understanding has room". Describe automaticity as *from memory*, *without counting*, *without help on screen*. Never describe it as speed.
- **The only score that counts is the child against themselves.** Couldn't on Tuesday, could on Thursday. Never against the class, never against the clock.
- **A miss in the app is a data point, not a verdict.** Wrong answers bring the picture back and teach. Copy about mistakes is calm and specific: no red, no "wrong", no "you forgot".
- **Short and regular, never a marathon.** Five minutes a day is the habit we sell.
- **Understanding before memorization.** The picture is never punished; it is always one tap away.

## How to describe mastery

JackFlash calls an item mastered after three correct answers, the last one without the picture on screen. In Multiply & Divide only, an answer also has to come from memory rather than counting. The app checks this with a generous time window the child never sees. A slower correct answer is still celebrated; it just doesn't count toward mastery yet. Fractions, Place Value and Add & Subtract have no time window.

| Say | Don't say |
|---|---|
| Mastered means from memory, unaided | Mastered means fast and unaided |
| comes from memory, without counting | answered quickly, fast enough |
| a generous window the child never sees | a time limit, beat the clock |
| automatic, so it gets out of the way | lightning-fast, instant, speedy |
| your child against their own last week | ahead of / behind / keeping up with others |
| tricky facts, facts that need more practice | struggling facts, weak facts (in parent copy, prefer the former) |
| a few minutes a day | the streak keeps them coming back |

The time window is an implementation detail for telling memory from counting. Mention it only to reassure (no timer, no "too slow"), never as a selling point.

## Checklist for new copy

1. Does any word make speed, ranking or volume sound like the goal? Replace it.
2. Is the child compared with anyone but themselves? Remove the comparison.
3. Does it describe a miss as teaching, not judging?
4. If it mentions mastery, does it say *from memory* rather than *fast*?
5. Kid-facing math vocabulary: "regroup", never trade/borrow/carry.

## Open questions (Adam to decide)

- None right now.

## Decided

- **2026-10-12 — Tagline: "See it. Get it. Keep it."** replaces "Math fluency, the right way." "Fluency" read as speed to most parents (it is what timed fact tests claim to measure), and "the right way" implied a wrong way, a verdict the paper argues against. The new line is the app's method in three beats: the picture (see), understanding (get), from memory (keep). The name "JackFlash" and its bolt already suggest speed, so the tagline says what the app values instead. It is used on the splash screen, in onboarding, on the landing page and on the social card. "Math you do, not math you are" (from *Before the Jet Pack*) is kept as a parent-facing headline for the landing page or marketing, where there is room to explain it.

- **2026-10-06 — Century Club → Habit Builder.** "Century Club" (100 problems in one session) rewarded volume and pulled against "five minutes a day". It is replaced by **Habit Builder 🌱 — "Practiced on 10 different days"**: a total, not a streak, so a missed day never takes it away. Profiles track `dailyStreak.daysPracticed` (back-filled from streak and recent sessions for existing profiles). The same change wired the day-based achievements to actually fire: Week Warrior and Month Master had never been able to unlock because `checkAfterSession` was never called.
- **2026-10-06 — Streak milestones toned down.** The repeatable in-practice popups went from four hype milestones ("Getting Warm!" at 3, "On Fire!" at 5, "Unstoppable!" at 10, "LEGENDARY!" at 25) to two calm nods: **"Nice and steady" 👍 at 10** and **"Great focus" 🎯 at 25** ("N right in a row."), with no fire, lightning or crown. A nod is skipped when the matching one-time achievement unlocks on the same answer. The one-time achievements keep their ids but are renamed: getting-warm → **Warming Up** 🌤️, on-fire → **Steady** 👍, unstoppable → **Deep Focus** 🎯 ("3/10/25 right in a row"). Testing this exposed a popup bug: a second achievement queued behind another was never shown (the 3s timer restarted on every re-render and the popup stayed hidden after the first closed). `AchievementPopup` now times each achievement once and shows each one. The nods use their own header, **"Good practice"**, so "Achievement unlocked!" is only said about real achievements.
