// Capture-run helpers, installed into the preview page after every reload:
//   (0,eval)(await (await fetch("/tools/paper/drive.js")).text()); await jf.boot();
// (jf.boot installs the extractor at the iPhone 16 standard: 393x852, insets 59/34;
//  jf.boot(320,568) is the notch-less 320 variant.)
(() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jf = (window.jf = {});
  jf.sleep = sleep;
  jf.boot = async (w = 393, h = 852) => {
    window.__JF_WIDTH = w; window.__JF_HEIGHT = h;
    const ins = w === 393 ? ["59px", "34px"] : ["0px", "0px"];
    document.documentElement.style.setProperty("--safe-area-inset-top", ins[0]);
    document.documentElement.style.setProperty("--safe-area-inset-bottom", ins[1]);
    (0, eval)(await (await fetch("/tools/paper/extract.js")).text());
    window.__jfAliases = {};
    return `${window.innerWidth}x${window.innerHeight} insets ${ins}`;
  };
  // Seed a clean profile (everything unlocked), optional patch(profile, blob).
  jf.seed = async (patch) => {
    const seed = await (await fetch("/tools/paper/seed-profile.json")).json();
    delete seed._comment;
    seed.purchases = ["module.add.full", "module.fractions.full", "module.placevalue.full"];
    seed.unlockedModules = ["multiply", "fractions", "add", "placeValue"];
    if (patch) patch(seed.profiles[0], seed);
    localStorage.setItem("jackflash_data", JSON.stringify(seed));
    return "seeded";
  };
  const vis = (e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed";
  jf.clickables = () => [...document.querySelectorAll("button,[role=button],[aria-label],[onclick]")].filter(vis);
  jf.find = (t) => jf.clickables().find((e) => (typeof t === "string" ? (e.innerText || "").trim() === t || e.getAttribute("aria-label") === t : t.test((e.innerText || "") + " " + (e.getAttribute("aria-label") || ""))));
  jf.click = (t) => { const e = jf.find(t); if (!e) throw new Error("no clickable: " + t); e.click(); return "clicked " + (e.innerText || e.getAttribute("aria-label")).slice(0, 40); };
  // Click the innermost element whose own text matches (for div/link rows that carry an onClick).
  jf.tap = (t) => {
    const all = [...document.querySelectorAll("body *")].filter((e) => vis(e) && (typeof t === "string" ? (e.innerText || "").trim() === t : t.test((e.innerText || "").trim())));
    const e = all.filter((x) => !all.some((y) => y !== x && x.contains(y))).pop() || all[0];
    if (!e) throw new Error("no text: " + t);
    e.click(); return "tapped " + (e.innerText || "").trim().slice(0, 40);
  };
  jf.list = () => jf.clickables().map((e) => (e.getAttribute("aria-label") || e.innerText || "").trim().replace(/\n/g, " | ").slice(0, 50));
  jf.setInput = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
  jf.txt = () => document.body.innerText;
  jf.save = (name, sel) => window.__jfSave(name, sel);
  jf.pad = async (digits) => { for (const d of String(digits)) { jf.click(d); await sleep(40); } };
  // Last matching element (a dialog's pad sits after the page's own pad).
  jf.last = (t) => { const bs = jf.clickables().filter((e) => (e.innerText || "").trim() === t || e.getAttribute("aria-label") === t); return bs[bs.length - 1]; };
  jf.padLast = async (digits) => { for (const d of String(digits)) { jf.last(d).click(); await sleep(60); } jf.last("Check").click(); };
  jf.solveMul = async () => { const m = jf.txt().match(/(\d+)\n([×÷])\n(\d+)\n/); const [, a, op, b] = m; const ans = op === "×" ? a * b : a / b; await jf.padLast(ans); return `${a}${op}${b}=${ans}`; };
  // Splash -> home -> open the profile card's module sheet -> Let's Go.
  jf.start = async () => { await sleep(600); jf.click("Let's Go"); await sleep(900); jf.clickables()[0].click(); await sleep(900); jf.click("Let's Go! →"); await sleep(1300); return jf.txt().slice(0, 80); };
  return "drive ready";
})();
