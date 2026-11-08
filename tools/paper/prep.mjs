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
  // A fixed element (bottom nav, overlay, reveal sheet) becomes absolute inside
  // the root, which gets the phone height so the absolute children have a box.
  h = h.replace(/position:fixed;/g, "position:absolute;");
  h = h.replace(/^<div style="/, `<div layer-name="${name.replace(/"/g, "")}" style="position:relative;${hasFixed ? "height:812px;" : ""}`);
  // Only a ROOT that is itself a full-screen overlay becomes a relative block.
  h = h.replace(/^(<div layer-name="[^"]*" style="position:relative;(?:height:812px;)?)position:absolute;top:0px;right:0px;bottom:0px;left:0px;z-index:\d+;/, "$1width:375px;height:812px;");
  h = h.replace(/;z-index:\d+/g, "");
  // Computed-font double quotes end the style attribute early.
  h = h.replace(/font-family:"([^"]+)"/g, "font-family:'$1'");
  h = h.replace(/url\("([^"]+)"\)/g, "url('$1')");
  // Hover / pressed residue and longhand noise.
  h = h.replace(/transform:scale\(1\.0[0-9]+\);/g, "");
  h = h.replace(/overflow-x:hidden;overflow-y:hidden/g, "overflow:hidden");
  h = h.replace(/border:medium none currentcolor;/g, "");
  h = h.replace(/border-(?:top|right|bottom|left)-width:medium;?/g, "");
  h = h.replace(/border-(?:top|right|bottom|left)-color:currentcolor;?/g, "");
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
