// Demo data for App Store screenshots: three kids with realistic progress.
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const root = process.argv[2];
const dm = await import(root + "/src/dataManager.js");
const DAY = 86400000, now = Date.now();
const iso = (d) => new Date(now - d * DAY).toISOString();
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function factKeys(t) { const k = []; for (let i = 1; i <= 10; i++) { k.push(`${t}x${i}`, `${t * i}÷${t}`); if (i !== t) k.push(`${t * i}÷${i}`); } return k; }
function rec(level, daysAgo, attempts) {
  const r = { correct: level, attempts: attempts ?? level + 1 + Math.floor(rnd() * 3), lastSeen: iso(daysAgo), masteredAt: null };
  if (level >= 3) r.masteredAt = iso(daysAgo + 2 + Math.floor(rnd() * 6));
  return r;
}
function fill(profile, plan) {
  const m = {};
  for (const [t, kind] of Object.entries(plan)) for (const k of factKeys(+t)) {
    const x = rnd();
    if (kind === "mastered") m[k] = rec(3 + Math.floor(x * 3), 1 + Math.floor(rnd() * 6));
    else if (kind === "mostly") m[k] = x < 0.7 ? rec(3 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 4)) : rec(1 + Math.floor(rnd() * 2), 1);
    else if (kind === "learning") m[k] = x < 0.25 ? rec(3, 2) : x < 0.94 ? rec(1 + Math.floor(rnd() * 2), Math.floor(rnd() * 3)) : rec(0, 1, 3 + Math.floor(rnd() * 2));
    else if (kind === "early") { if (x < 0.5) m[k] = x < 0.06 ? rec(0, 0, 3) : rec(1, Math.floor(rnd() * 2)); }
  }
  // Only real sticking points need practice: both factors 3–9.
  const hard = (k) => { const [a, b] = k.includes("x") ? k.split("x").map(Number) : (([p, d]) => [d, p / d])(k.split("÷").map(Number)); return a >= 3 && a <= 9 && b >= 3 && b <= 9; };
  for (const [k, r] of Object.entries(m)) if (r.correct === 0 && !hard(k)) { r.correct = 1; }
  // Kids learn ×1, ×2 and ×10 first: in every table touched, those are known.
  for (const t of Object.keys(plan)) for (const k of factKeys(+t)) if (!hard(k) && (!m[k] || m[k].correct < 3)) m[k] = rec(3, 2 + Math.floor(rnd() * 4));
  profile.mastery.multiply = m;
}
function sessions(profile, days, perDay) {
  profile.sessionHistory = days.map((d) => { const total = perDay[0] + Math.floor(rnd() * (perDay[1] - perDay[0])); const correct = Math.round(total * (0.78 + rnd() * 0.18));
    return { moduleId: "multiply", correct, total, assisted: Math.floor(rnd() * 3), peeked: Math.floor(rnd() * 2), duration: (4 + Math.floor(rnd() * 4)) * 60000 + Math.floor(rnd() * 50000), recordedAt: new Date(now - d * DAY - 3600000 * (2 + Math.floor(rnd() * 4))).toISOString() }; });
}
dm.completeOnboarding();
const today = new Date().toISOString().slice(0, 10);
const olive = dm.createProfile({ name: "Olive", avatar: "unicorn-pink", activeModule: "multiply" });
fill(olive, { 2: "mastered", 5: "mastered", 10: "mastered", 3: "mostly", 4: "learning", 6: "learning", 7: "early", 8: "early", 9: "early" });
olive.dailyStreak = { current: 8, longest: 12, lastPracticeDate: today, daysPracticed: 23 };
olive.achievements = ["first-steps", "getting-warm", "on-fire", "week-warrior", "habit-builder", "table-tamer-2", "table-tamer-5", "table-tamer-10"];
olive.settings.preferredMode = { multiply: process.env.OLIVE_MODE || "pictorial" };
if (process.env.OLIVE_TABLES) olive.settings.enabledTables = JSON.parse(process.env.OLIVE_TABLES);
sessions(olive, [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15], [18, 30]);
const leo = dm.createProfile({ name: "Leo", avatar: "robot-blue", activeModule: "multiply" });
fill(leo, { 2: "mostly", 5: "learning", 10: "learning", 3: "early" });
leo.dailyStreak = { current: 3, longest: 5, lastPracticeDate: today, daysPracticed: 9 };
leo.achievements = ["first-steps", "getting-warm"];
sessions(leo, [0, 1, 2, 5, 6, 8], [12, 22]);
const maya = dm.createProfile({ name: "Maya", avatar: "fox-orange", activeModule: "multiply" });
fill(maya, { 2: "mastered", 5: "mastered", 10: "mastered", 3: "mastered", 4: "mastered", 6: "mostly", 7: "learning", 8: "learning", 9: "learning" });
maya.dailyStreak = { current: 5, longest: 14, lastPracticeDate: today, daysPracticed: 31 };
maya.achievements = ["first-steps", "getting-warm", "on-fire", "unstoppable", "week-warrior", "habit-builder", "table-tamer-2", "table-tamer-3", "table-tamer-4", "table-tamer-5", "table-tamer-10", "group-clear-easy", "group-clear-medium"];
sessions(maya, [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 13, 14], [20, 34]);
dm.setActiveProfile(olive.id);
dm.saveData();
const blob = localStorage.getItem("jackflash_data");
(await import("fs")).writeFileSync(process.argv[3], blob);
