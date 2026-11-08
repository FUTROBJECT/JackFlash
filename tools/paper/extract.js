// JackFlash → Paper screen extractor.
//
// Paste (or have Claude eval) this whole file in the running JackFlash preview
// (npm run dev, viewport 375×812). It installs window.__jfExtract(selector) and
// returns the current screen as Paper-ready HTML: inline styles only, flex
// layout, no <button>/<input>, margins folded into padding wrappers, em/vw/
// clamp/var values resolved to px, SVGs inlined, /public assets rewritten to
// paper-asset:// absolute paths. Feed the string to Paper's write_html
// (mode "insert-children") on a 375-wide artboard.
//
// Process doc: docs/paper-design-surface.md
(() => {
  const REPO = window.__JF_REPO || "__REPO__"; // absolute repo path, for paper-asset:// urls
  const W = 375, H = 812;
  const DROP = /^(--|cursor|transition|animation|-webkit-tap|user-select|touch-action|outline|white-space-collapse|text-wrap|will-change|pointer-events|-webkit-overflow|overscroll|border-image|background-(position|size|repeat|attachment|origin|clip)|appearance|-webkit-appearance|resize|caret|box-sizing)/;
  const NEEDS_COMPUTED = /(calc\(|clamp\(|var\(|vw|vh|dvh|\dem\b|rem\b|env\()/;
  const fixUrl = (v) => String(v).replace(/url\(["']?\/(?!\/)/g, `url("paper-asset://${REPO}/public/`);
  const kebab = (p) => p.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
  const camel = (p) => p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  function styles(el, cs) {
    const out = {};
    for (let i = 0; i < el.style.length; i++) {
      const p = el.style[i];
      if (DROP.test(p)) continue;
      let v = el.style.getPropertyValue(p);
      if (!v || v === "initial" || v === "inherit" || v === "unset") continue;
      if (NEEDS_COMPUTED.test(v)) { const c = cs.getPropertyValue(p); if (c) v = c; }
      if (p === "line-height" && /em$/.test(v)) v = cs.lineHeight;
      v = fixUrl(v.replace(/100vh|100dvh/g, H + "px").replace(/100vw/g, W + "px")).replace(/,\s*initial\s*$/, "");
      out[camel(p)] = v;
    }
    // collapse longhands Paper reads fine but that bloat the payload
    const sides = ["Top", "Right", "Bottom", "Left"];
    const same = (ks) => ks.every((k) => out[k] !== undefined) && ks.every((k) => out[k] === out[ks[0]]);
    const bw = sides.map((s) => `border${s}Width`), bs = sides.map((s) => `border${s}Style`), bc = sides.map((s) => `border${s}Color`);
    if (same(bw) && same(bs) && same(bc)) { out.border = `${out[bw[0]]} ${out[bs[0]]} ${out[bc[0]]}`; [...bw, ...bs, ...bc].forEach((k) => delete out[k]); }
    const br = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"];
    if (same(br)) { out.borderRadius = out[br[0]]; br.forEach((k) => delete out[k]); }
    const pd = sides.map((s) => `padding${s}`);
    if (pd.every((k) => out[k] !== undefined)) { out.padding = `${out.paddingTop} ${out.paddingRight} ${out.paddingBottom} ${out.paddingLeft}`; pd.forEach((k) => delete out[k]); }
    if (out.rowGap !== undefined && out.rowGap === out.columnGap) { out.gap = out.rowGap; delete out.rowGap; delete out.columnGap; }
    if (out.transform === "translate(0px, 0px)" || out.transform === "none") delete out.transform;
    if (out.opacity === "1") delete out.opacity;
    return out;
  }

  const esc = (s) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const hash = (s) => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); };

  function serialize(el, depth) {
    if (el.nodeType === 3) return esc(el.textContent);
    if (el.nodeType !== 1) return "";
    const tag = el.tagName.toLowerCase();
    if (/^(script|style|noscript|template)$/.test(tag)) return "";
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return "";
    if (tag === "svg") {
      const c = el.cloneNode(true);
      c.querySelectorAll("animate,animateTransform,animateMotion").forEach((n) => n.remove());
      c.querySelectorAll("[class]").forEach((n) => n.removeAttribute("class"));
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      const op = el.style.opacity && el.style.opacity !== "1" ? `opacity:${el.style.opacity};` : "";
      const sizeStyle = `display:block;${op}width:${w}px;height:${h}px;flex-shrink:0`;
      // Big SVGs that recur across screens (wordmark bolt, nav icons) are
      // cloned from the Paper node that already holds them instead of being
      // re-sent: window.__jfAliases = { <hash>: "<paper node id>" }. The hash
      // of every emitted SVG rides along as data-jf-hash so you can learn it.
      c.removeAttribute("style"); c.removeAttribute("width"); c.removeAttribute("height");
      const key = hash(c.outerHTML);
      const alias = (window.__jfAliases || {})[key];
      if (alias) return `<x-paper-clone node-id="${alias}" style="${sizeStyle}" />`;
      c.setAttribute("style", sizeStyle);
      c.setAttribute("width", w); c.setAttribute("height", h);
      if (c.outerHTML.length > 600) c.setAttribute("data-jf-hash", key);
      return c.outerHTML;
    }
    // Inline text elements stay inline so the surrounding sentence flows.
    if (/^(strong|b|em|i|u|span|small|sup|sub|mark)$/.test(tag) && el.children.length === 0 && !el.style.display && !el.style.position) {
      const inl = styles(el, cs);
      if (tag === "strong" || tag === "b") inl.fontWeight = inl.fontWeight || "700";
      if (tag === "em" || tag === "i") inl.fontStyle = inl.fontStyle || "italic";
      const s = Object.entries(inl).map(([k, v]) => `${kebab(k)}:${v}`).join(";");
      return s ? `<span style="${s}">${esc(el.textContent)}</span>` : esc(el.textContent);
    }
    const st = styles(el, cs);
    const isCtl = /^(button|input|select|textarea|a)$/.test(tag);
    if (isCtl) {
      for (const k of ["fontFamily", "fontSize", "fontWeight", "color"]) if (!st[k]) st[k] = cs[k];
      // A <button>'s content box is block-level: element children fill its
      // width; text-only buttons center their label.
      const textOnly = el.children.length === 0;
      if (!st.display) st.display = "flex";
      if (!textOnly && !st.flexDirection && !el.style.display) st.flexDirection = "column";
      if (!st.alignItems) st.alignItems = textOnly ? "center" : "stretch";
      if (!st.justifyContent) st.justifyContent = "center";
      if (st.background === "none") delete st.background;
      if (tag === "a") st.textDecoration = st.textDecoration || "none";
    }
    if (depth === 0) { st.width = W + "px"; if (!st.minHeight && !st.height) st.minHeight = H + "px"; }
    if (/^inline/.test(st.display || "")) st.display = "flex";
    if ((st.display === "block" || !st.display) && el.children.length && !/^(span|p|h[1-6]|label|strong|em|b)$/.test(tag)) { st.display = "flex"; st.flexDirection = st.flexDirection || "column"; }
    if (st.display === "grid") {
      // grid → wrapping flex row pinned to the measured width; the computed
      // template is already resolved to px tracks ("10px 10px 10px 10px").
      const tracks = (cs.gridTemplateColumns || "").split(" ").filter(Boolean);
      st.display = "flex"; st.flexWrap = "wrap";
      if (!st.width) st.width = Math.round(el.getBoundingClientRect().width) + "px";
      // children without an explicit width get an equal share of the row
      if (![...el.children].some((c) => c.style.width)) st.__cols = tracks.length || 2;
      ["gridTemplateColumns", "gridTemplateRows", "gridColumn", "gridRow", "gridAutoFlow", "gridAutoRows", "justifyItems", "alignItems"].forEach((k) => { if (k === "alignItems" && st.alignItems !== "stretch") return; delete st[k]; });
    }
    const m = { t: st.marginTop, r: st.marginRight, b: st.marginBottom, l: st.marginLeft };
    if (st.margin) { const parts = st.margin.split(" "); m.t = parts[0]; m.r = parts[1] ?? parts[0]; m.b = parts[2] ?? parts[0]; m.l = parts[3] ?? m.r; }
    ["margin", "marginTop", "marginRight", "marginBottom", "marginLeft"].forEach((k) => delete st[k]);
    const nz = (v) => v && v !== "0" && v !== "0px" && v !== "auto";
    const hasMargin = Object.values(m).some(nz);
    const cols = st.__cols; delete st.__cols;
    let kids = [...el.childNodes].map((n) => serialize(n, depth + 1));
    if (cols) { const gap = parseFloat(st.gap || st.columnGap || 0); const w = `calc((100% - ${gap * (cols - 1)}px) / ${cols})`; kids = kids.map((k) => k.startsWith("<div style=\"") ? k.replace("<div style=\"", `<div style="width:${w};flex-shrink:0;`) : k); }
    const styleStr = Object.entries(st).map(([k, v]) => `${kebab(k)}:${v}`).join(";");
    const name = el.getAttribute("aria-label") || el.getAttribute("data-layer") || (tag === "button" ? "Button" : null);
    const nameAttr = name ? ` layer-name="${name.replace(/"/g, "").slice(0, 50)}"` : "";
    let html;
    if (tag === "img") { const src = el.getAttribute("src") || ""; const abs = src.startsWith("/") ? `paper-asset://${REPO}/public${src}` : src; html = `<img src="${abs}" style="${styleStr}"${nameAttr}/>`; }
    else if (tag === "input" || tag === "textarea") { html = `<div style="${styleStr}"${nameAttr}>${esc(el.value || el.placeholder || "")}</div>`; }
    else if (tag === "select") { html = `<div style="${styleStr}"${nameAttr}>${esc(el.options[el.selectedIndex]?.text || "")}</div>`; }
    else html = `<div style="${styleStr}"${nameAttr}>${kids.join("")}</div>`;
    if (hasMargin) {
      const pad = `padding:${nz(m.t) ? m.t : 0} ${nz(m.r) ? m.r : 0} ${nz(m.b) ? m.b : 0} ${nz(m.l) ? m.l : 0}`;
      const centered = m.l === "auto" && m.r === "auto";
      const w = st.width === "100%" || st.alignSelf === "stretch" || centered ? "width:100%;" : "";
      const al = centered ? "align-items:center;" : "";
      html = `<div style="display:flex;flex-direction:column;${w}${al}${pad}">${html}</div>`;
    }
    return html;
  }

  // selector: the screen root. Default = the first child of #root (the active
  // screen). Overlays (splash, achievement popup, module picker sheet) are
  // later siblings — pass "#root > :nth-child(2)" etc.
  window.__jfExtract = (sel = "#root > *") => {
    const root = document.querySelector(sel);
    if (!root) return "NOT FOUND";
    return serialize(root, 0);
  };
  // Save straight to disk through tools/paper/capture-server.mjs (port 5199)
  // so the HTML never has to travel through a chat transcript. Returns the
  // saved path, byte count and the data-jf-hash of every SVG it still had to
  // emit in full (add those to __jfAliases once they exist in Paper).
  window.__jfSave = async (name, sel, port = 5199) => {
    const html = window.__jfExtract(sel);
    const res = await fetch(`http://localhost:${port}/save?name=${encodeURIComponent(name)}`, { method: "POST", body: html });
    const info = await res.json();
    return { ...info, hashes: [...html.matchAll(/data-jf-hash="([^"]+)"/g)].map((m) => m[1]) };
  };
  return "extractor ready";
})();
