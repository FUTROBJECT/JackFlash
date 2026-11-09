// Prepare raw captures (tools/paper/captures/*.html, written by __jfSave) for
// Paper's write_html. Everything here is a known gap between what the DOM
// extractor emits and what Paper's HTML parser keeps; the extractor itself
// handles most of them for new captures, this makes older captures safe too.
//
//   node tools/paper/prep.mjs tools/paper/captures <outDir>
import fs from "node:fs";
import path from "node:path";

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error("usage: node tools/paper/prep.mjs <capturesDir> <outDir>"); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

export function prep(html, name) {
  let h = html;
  const hasFixed = /position:fixed/.test(h);
  // The capture's phone size: the extractor writes width:Wpx and min-height:Hpx
  // on the root.
  const W = Number((h.match(/^<div style="[^"]*?width:(\d+)px/) || [])[1] || 375);
  const H = Number((h.match(/^<div style="[^"]*?min-height:(\d+)px/) || [])[1] || (W >= 390 ? 852 : 812));
  // A fixed element (bottom nav, overlay, reveal sheet) becomes absolute inside
  // the root, which gets the phone height so the absolute children have a box.
  h = h.replace(/position:fixed;/g, "position:absolute;");
  h = h.replace(/^<div style="/, `<div layer-name="${name.replace(/"/g, "")}" style="position:relative;${hasFixed ? `height:${H}px;` : ""}`);
  // Only a ROOT that is itself a full-screen overlay becomes a relative block.
  h = h.replace(/^(<div layer-name="[^"]*" style="position:relative;(?:height:\d+px;)?)position:absolute;top:0px;right:0px;bottom:0px;left:0px;z-index:\d+;/, `$1width:${W}px;height:${H}px;`);
  // The practice header's session/streak drawer: a panel hanging off the sticky
  // header, with a dim scrim (z-index 49) between header and content. Paper
  // paints in DOM order, so content later in the tree covers both. Move the
  // scrim and then the panel to the end of the root; the panel's offsets were
  // relative to the header's inner row, so add the header's padding to them
  // (the scrim starts below the header so the header stays bright).
  {
    const hdr = h.match(/position:sticky;top:0px;z-index:50;padding:(\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px/);
    const panelOpen = /<div style="position:absolute;top:(\d+(?:\.\d+)?)px;left:0px;right:0px;background-color:rgb\(255, 248, 231\);box-shadow:[^"]*"[^>]*>/;
    const scrimRe = /<div style="position:absolute;top:0px;right:0px;bottom:0px;left:0px;(?:z-index:\d+;)?background-color:rgba\(26, 26, 26, 0\.18\)"><\/div>/;
    const pm = hdr && h.match(panelOpen);
    if (pm && scrimRe.test(h)) {
      let depth = 0, end = pm.index;
      for (const m of h.slice(pm.index).matchAll(/<div\b[^>]*>|<\/div>/g)) {
        depth += m[0] === "</div>" ? -1 : 1;
        if (depth === 0) { end = pm.index + m.index + m[0].length; break; }
      }
      const [padTop, padSide, padBottom] = [hdr[1], hdr[2], hdr[3]].map(Number);
      const panel = h.slice(pm.index, end).replace(/top:[\d.]+px;left:0px;right:0px/, `top:${+(padTop + Number(pm[1])).toFixed(2)}px;left:${padSide}px;right:${padSide}px`);
      h = h.slice(0, pm.index) + h.slice(end);
      h = h.replace(scrimRe, "");
      const scrim = `<div layer-name="Scrim" style="position:absolute;top:${padTop + 44 + padBottom + 4}px;right:0px;bottom:0px;left:0px;background-color:rgba(26, 26, 26, 0.18)"></div>`;
      h = h.replace(/<\/div>\s*$/, `${scrim}${panel}</div>`);
    }
  }
  // Phone-faithful captures (H >= 852) get a presentation status bar over the
  // safe-area inset: 9:41, signal, wifi, battery, all in the ink colour. It is
  // appended as the root's last child so it paints above the header.
  if (process.env.JF_STATUS_BAR !== "0" && H >= 852) {
    const bar = `<div layer-name="Status bar (presentation)" style="position:absolute;top:0px;left:0px;width:${W}px;height:59px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 28px 12px 34px"><div style="font-family:'Space Grotesk', sans-serif;font-size:17px;font-weight:600;color:#1A1A1A;line-height:1;white-space:nowrap">9:41</div><div style="display:flex;align-items:center;gap:6px"><svg viewBox="0 0 18 12" width="18" height="12" style="display:block;width:18px;height:12px;flex-shrink:0"><rect x="0" y="8" width="3" height="4" rx="0.8" fill="#1A1A1A"/><rect x="5" y="5.5" width="3" height="6.5" rx="0.8" fill="#1A1A1A"/><rect x="10" y="3" width="3" height="9" rx="0.8" fill="#1A1A1A"/><rect x="15" y="0" width="3" height="12" rx="0.8" fill="#1A1A1A"/></svg><svg viewBox="0 0 16 12" width="16" height="12" style="display:block;width:16px;height:12px;flex-shrink:0"><path d="M8 11.5 L5.6 9.1 A3.4 3.4 0 0 1 10.4 9.1 Z" fill="#1A1A1A"/><path d="M3.2 6.7 A6.8 6.8 0 0 1 12.8 6.7" stroke="#1A1A1A" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M0.8 4.3 A10.2 10.2 0 0 1 15.2 4.3" stroke="#1A1A1A" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg><svg viewBox="0 0 28 13" width="28" height="13" style="display:block;width:28px;height:13px;flex-shrink:0"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="#1A1A1A" stroke-width="1" fill="none" opacity="0.5"/><rect x="2" y="2" width="20" height="9" rx="2" fill="#1A1A1A"/><path d="M25.5 4.5 V8.5 A2 2 0 0 0 25.5 4.5 Z" fill="#1A1A1A" opacity="0.5"/></svg></div></div>`;
    // Paper paints siblings in DOM order (no z-index), so the bar goes last.
    h = h.replace(/<\/div>\s*$/, `${bar}</div>`);
  }
  h = h.replace(/;z-index:\d+/g, "");
  // Text-only buttons centre each line of a wrapped label in the browser.
  h = h.replace(/<div style="((?:(?!text-align)[^"])*)" layer-name="Button">([^<]+)<\/div>/g, '<div style="$1;text-align:center" layer-name="Button">$2</div>');
  // SVG text with dominant-baseline="central": Paper ignores it, so move the
  // baseline down ~0.35em instead (captures taken before extract.js did this).
  h = h.replace(/<(text|tspan) ([^>]*)dominant-baseline="(?:central|middle)"\s*([^>]*)>/g, (m, tag, a, b) => {
    const attrs = a + b;
    const fs = parseFloat((attrs.match(/font-size="([^"]+)"/) || [])[1]) || 16;
    const fixed = attrs.replace(/\by="(-?[\d.]+)"/, (_, y) => `y="${+(parseFloat(y) + fs * 0.35).toFixed(2)}"`);
    return `<${tag} ${fixed.trim()}>`;
  });
  // Computed-font double quotes end the style attribute early.
  h = h.replace(/font-family:"([^"]+)"/g, "font-family:'$1'");
  h = h.replace(/url\("([^"]+)"\)/g, "url('$1')");
  // Hover / pressed residue and longhand noise.
  h = h.replace(/transform:scale\(1\.0[0-9]+\);/g, "");
  h = h.replace(/overflow-x:hidden;overflow-y:hidden/g, "overflow:hidden");
  h = h.replace(/border:medium none currentcolor;/g, "");
  h = h.replace(/border-(?:top|right|bottom|left)-width:medium;?/g, "");
  h = h.replace(/border-(?:top|right|bottom|left)-color:currentcolor;?/g, "");
  // Captures from before 8 Nov 2026 folded negative margins into negative
  // padding and let a centred max-width block hug its content.
  h = h.replace(/padding:-(\d+(?:\.\d+)?)px (\S+) (\S+) (\S+)"/g, 'position:relative;top:-$1px;padding:0 $2 $3 $4"');
  h = h.replace(/(align-items:center;[^"]*"><div style=")((?:(?!width:)[^"])*max-width:)/g, "$1width:100%;$2");
  // Inline-level elements (the extractor passes their vertical-align through)
  // must shrink to content, not stretch across a column parent.
  h = h.replace(/<div style="((?:(?!width:)[^"])*vertical-align:middle[^"]*)"/g, (m, st) => `<div style="${st};width:fit-content;align-self:center"`);
  // grid → flex: a spanned child gets N shares plus the gaps between them.
  h = h.replace(/<div style="width:calc\(\(100% - (\d+)px\) \/ (\d+)\);flex-shrink:0;([^>]*?)grid-column(?:-start)?:span (\d+);?([^>]*?)>/g, (m, g, c, pre, n, post) => {
    const gap = c > 1 ? g / (c - 1) : 0;
    const w = `calc((100% - ${g}px) / ${c} * ${n} + ${gap * (n - 1)}px)`;
    const strip = (s) => s.replace(/;?grid-column(?:-start|-end)?:[^;"]*/g, "");
    return `<div style="width:${w};flex-shrink:0;${strip(pre)}${strip(post)}>`;
  });
  h = h.replace(/;?grid-column(?:-start|-end)?:[^;"]*/g, "");
  // Paper breaks words anywhere in a narrow flex item; Chrome never splits a
  // one-word label.
  h = h.replace(/<div style="([^"]*)"( layer-name="[^"]*")?>([^<\s]+)<\/div>/g, (m, st, ln = "", t) => /white-space/.test(st) ? m : `<div style="${st};white-space:nowrap"${ln}>${t}</div>`);
  // Paper drops bare text beside an element child (the operand next to the
  // absolutely positioned operator).
  h = h.replace(/(">(?:×|÷)<\/div>)(\d+)<\/div>/g, "$1<div>$2</div></div>");
  // Offsets whose position came from a stylesheet/animation (confetti).
  h = h.replace(/<div style="(left:[^"]*)"/g, '<div style="position:absolute;$1"');
  return h;
}

for (const f of fs.readdirSync(src).filter((n) => n.endsWith(".html"))) {
  const name = f.replace(/\.html$/, "");
  const h = prep(fs.readFileSync(path.join(src, f), "utf8"), name);
  fs.writeFileSync(path.join(out, f), h);
  console.log(`${f}\t${h.length}`);
}
