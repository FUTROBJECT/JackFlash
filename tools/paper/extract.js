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
  // Capture width. 375 is the design width; set window.__JF_WIDTH = 320 (and
  // resize the preview to match) for narrow-phone variants.
  // Default is the 375×812 design viewport. For phone-faithful captures set
  // window.__JF_WIDTH = 393, window.__JF_HEIGHT = 852 (iPhone 16), resize the
  // preview to match, and give the app its insets the way the Capacitor
  // plugin does: document.documentElement.style.setProperty('--safe-area-inset-top','59px')
  // and '--safe-area-inset-bottom','34px'.
  const W = window.__JF_WIDTH || 375, H = window.__JF_HEIGHT || 812;
  // background-size/repeat/position are kept (DOTTED_RULE needs them); the
  // "initial, initial" noise they carry on plain fills is dropped below.
  const DROP = /^(--|cursor|transition|animation|-webkit-tap|user-select|touch-action|outline|white-space-collapse|text-wrap|will-change|pointer-events|-webkit-overflow|overscroll|border-image|background-(attachment|origin|clip)|appearance|-webkit-appearance|resize|caret|box-sizing)/;
  const NEEDS_COMPUTED = /(calc\(|clamp\(|var\(|vw|vh|dvh|\dem\b|rem\b|env\()/;
  const fixUrl = (v) => String(v).replace(/url\(["']?\/(?!\/)/g, `url('paper-asset://${REPO}/public/`);
  const kebab = (p) => p.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
  const camel = (p) => p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  function styles(el, cs) {
    const out = {};
    for (let i = 0; i < el.style.length; i++) {
      const p = el.style[i];
      if (DROP.test(p)) continue;
      let v = el.style.getPropertyValue(p);
      // A shorthand written with calc()/var()/clamp() (the practice header's
      // padding, safe-area insets) is a "pending-substitution value": Chrome
      // lists its longhands but returns "" for each. The computed value is
      // the resolved px, so take that.
      if (!v) v = cs.getPropertyValue(p);
      if (!v || /^(initial|inherit|unset|none)(,\s*(initial|none))*$/.test(v) && p !== "border" && p !== "text-decoration") continue;
      if (NEEDS_COMPUTED.test(v)) { const c = cs.getPropertyValue(p); if (c) v = c; }
      if (p === "line-height" && /em$/.test(v)) v = cs.lineHeight;
      v = fixUrl(v.replace(/100vh|100dvh/g, H + "px").replace(/100vw/g, W + "px")).replace(/,\s*initial\s*$/, "");
      out[camel(p)] = v;
    }
    // collapse longhands Paper reads fine but that bloat the payload
    const sides = ["Top", "Right", "Bottom", "Left"];
    const same = (ks) => ks.every((k) => out[k] !== undefined) && ks.every((k) => out[k] === out[ks[0]]);
    const bw = sides.map((s) => `border${s}Width`), bs = sides.map((s) => `border${s}Style`), bc = sides.map((s) => `border${s}Color`);
    if (!bs.some((k) => out[k])) { [...bw, ...bc].forEach((k) => delete out[k]); } // border:none residue (medium / currentcolor)
    if (same(bw) && same(bs) && same(bc)) { out.border = `${out[bw[0]]} ${out[bs[0]]} ${out[bc[0]]}`; [...bw, ...bs, ...bc].forEach((k) => delete out[k]); }
    const br = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"];
    if (same(br)) { out.borderRadius = out[br[0]]; br.forEach((k) => delete out[k]); }
    const pd = sides.map((s) => `padding${s}`);
    if (pd.every((k) => out[k] !== undefined)) { out.padding = `${out.paddingTop} ${out.paddingRight} ${out.paddingBottom} ${out.paddingLeft}`; pd.forEach((k) => delete out[k]); }
    if (out.rowGap !== undefined && out.rowGap === out.columnGap) { out.gap = out.rowGap; delete out.rowGap; delete out.columnGap; }
    if (out.transform === "translate(0px, 0px)" || out.transform === "none") delete out.transform;
    // Paper ignores transforms: a px translate (the toggle knob) becomes a
    // relative offset instead.
    const tr = (out.transform || "").match(/^translate(X|Y)?\((-?[\d.]+)px(?:,\s*(-?[\d.]+)px)?\)$/);
    if (tr) {
      const dx = tr[1] === "Y" ? 0 : parseFloat(tr[2]), dy = tr[1] === "Y" ? parseFloat(tr[2]) : parseFloat(tr[3] || 0);
      if (!/^(absolute|fixed)$/.test(cs.position)) { out.position = "relative"; if (dx) out.left = `${dx}px`; if (dy) out.top = `${dy}px`; }
      else { if (dx) out.left = `${parseFloat(out.left || cs.left || 0) + dx}px`; if (dy) out.top = `${parseFloat(out.top || cs.top || 0) + dy}px`; }
      delete out.transform;
    }
    if (out.opacity === "1") delete out.opacity;
    // Offsets without a position (the position came from a stylesheet or an
    // animation keyframe) would become flow content in Paper; keep them pinned.
    if ((out.left || out.top || out.right || out.bottom) && !out.position && /^(absolute|fixed)$/.test(cs.position)) out.position = "absolute";
    if (SCALE !== 1) {
      for (const k of Object.keys(out)) out[k] = String(out[k]).replace(/(-?\d*\.?\d+)px/g, (_, n) => `${+(parseFloat(n) * SCALE).toFixed(2)}px`);
      if (/scale\(/.test(out.transform || "")) delete out.transform;
      delete out.transformOrigin;
      // the scaled element's own percentage width can't shrink with the factor:
      // pin it to the box it actually paints (the rect is post-transform).
      if (el === SCALE_ROOT && /%$/.test(out.width || "")) out.width = `${+el.getBoundingClientRect().width.toFixed(2)}px`;
    }
    return out;
  }

  // Every value goes through here before it lands in a style="" attribute.
  // Computed styles quote font families with double quotes ("Space Mono"),
  // which terminates the attribute and silently drops every declaration
  // after it when Paper parses the HTML — single quotes are safe.
  const q = (v) => String(v).replace(/"/g, "'");
  const styleAttr = (obj) => Object.entries(obj).map(([k, v]) => `${kebab(k)}:${q(v)}`).join(";");
  const esc = (s) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const hash = (s) => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); };

  // Paper ignores transform: scale(); a scaled subtree (the wrong-answer
  // reveal's PictureSlot) is emitted with every px length multiplied by the
  // cumulative factor instead, so it takes the space it takes on the phone.
  let SCALE = 1, SCALE_ROOT = null;
  function serialize(el, depth) {
    if (el.nodeType === 3) return esc(el.textContent);
    if (el.nodeType !== 1) return "";
    const tag = el.tagName.toLowerCase();
    if (/^(script|style|noscript|template)$/.test(tag)) return "";
    const cs = getComputedStyle(el);
    const sm = cs.transform.match(/^matrix\(([^,]+),/);
    const sf = sm ? parseFloat(sm[1]) : 1;
    if (Math.abs(sf - 1) > 0.001) {
      const prev = SCALE, prevRoot = SCALE_ROOT; SCALE *= sf; SCALE_ROOT = el;
      try { return serialize1(el, depth, tag, cs); } finally { SCALE = prev; SCALE_ROOT = prevRoot; }
    }
    return serialize1(el, depth, tag, cs);
  }
  function serialize1(el, depth, tag, cs) {
    if (cs.display === "none") return "";
    // visibility:hidden still takes up space (DerivationToken's blank chip
    // sizes itself by a hidden copy of its content) -> keep an empty box of
    // the measured size so the parent doesn't collapse.
    if (cs.visibility === "hidden") {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return "";
      return `<div style="width:${+r.width.toFixed(2)}px;height:${+r.height.toFixed(2)}px;flex-shrink:0"></div>`;
    }
    if (tag === "svg") {
      const c = el.cloneNode(true);
      c.querySelectorAll("animate,animateTransform,animateMotion").forEach((n) => n.remove());
      c.querySelectorAll("[class]").forEach((n) => n.removeAttribute("class"));
      // Paper ignores dominant-baseline="central" (bar-model / disc numbers
      // sat high): move the baseline down by ~0.35em and drop the attribute.
      c.querySelectorAll("text[dominant-baseline], tspan[dominant-baseline]").forEach((t) => {
        if (/^(central|middle)$/.test(t.getAttribute("dominant-baseline"))) {
          const fs = parseFloat(t.getAttribute("font-size") || getComputedStyle(t).fontSize) || 16;
          const y = parseFloat(t.getAttribute("y") || "0");
          t.setAttribute("y", +(y + fs * 0.35).toFixed(2));
        }
        t.removeAttribute("dominant-baseline");
      });
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
      const s = styleAttr(inl);
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
      if (textOnly && !st.textAlign) st.textAlign = "center";   // a wrapped label centres its lines like the browser
      if (!st.justifyContent && textOnly) st.justifyContent = "center";
      // Paper breaks words anywhere when a flex item is narrow; Chrome never
      // splits a one-word button label, so pin single-word labels.
      if (textOnly && !/\s/.test(el.textContent.trim()) && !st.whiteSpace) st.whiteSpace = "nowrap";
      if (st.background === "none") delete st.background;
      if (tag === "a") st.textDecoration = st.textDecoration || "none";
    }
    if (depth === 0) { st.width = W + "px"; if (!st.minHeight && !st.height) st.minHeight = H + "px"; }
    // Keep the browser's line breaks. Paper wraps text anywhere (even inside
    // a word) when a flex item is narrow, so a label that fit on one line
    // stays on one line, and one that wrapped can't get narrower than it was.
    if (el.children.length === 0 && el.textContent.trim() && depth > 0) {
      const rect = el.getBoundingClientRect();
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
      if (rect.height < lh * 1.6) { if (!st.whiteSpace) st.whiteSpace = "nowrap"; }
      else if (!st.minWidth && !st.width) st.minWidth = `${+rect.width.toFixed(2)}px`;
    }
    if (/^inline/.test(st.display || "")) {
      // inline-flex / inline-block shrink to their content in the browser; as
      // a Paper flex child they would stretch (the stacked fraction's vinculum
      // ran the full row). Keep them shrink-to-fit, placed as text-align would.
      // An inline-block lays its children out as block flow (stacked), which a
      // bare display:flex would turn into a row (the Fact Family chip's label
      // sat beside its equations).
      if (cs.display === "inline-block" && !st.flexDirection && [...el.children].some((c) => getComputedStyle(c).display !== "inline")) st.flexDirection = "column";
      st.display = "flex";
      if (!st.width) st.width = "fit-content";
      if (!st.alignSelf) st.alignSelf = cs.textAlign === "center" ? "center" : cs.textAlign === "right" ? "flex-end" : "flex-start";
    }
    if ((st.display === "block" || !st.display) && el.children.length && !/^(span|p|h[1-6]|label|strong|em|b)$/.test(tag)) { st.display = "flex"; st.flexDirection = st.flexDirection || "column"; }
    if (st.display === "grid") {
      // grid → wrapping flex row pinned to the measured width; the computed
      // template is already resolved to px tracks ("10px 10px 10px 10px").
      const tracks = (cs.gridTemplateColumns || "").split(" ").filter(Boolean);
      st.display = "flex"; st.flexWrap = "wrap";
      if (!st.width) st.width = Math.round(el.getBoundingClientRect().width) + "px";
      // children without an explicit width get an equal share of the row
      // (a child's own width still wins: it comes later in the attribute).
      // A single-track grid is a stack of full-width rows, so its children
      // always get the share — Paper would otherwise hug each row to its
      // content and a centred line would sit at the left.
      if (tracks.length <= 1 || ![...el.children].some((c) => c.style.width && !/%$/.test(c.style.width))) st.__cols = tracks.length || 2;
      ["gridTemplateColumns", "gridTemplateRows", "gridColumn", "gridRow", "gridAutoFlow", "gridAutoRows", "justifyItems", "alignItems"].forEach((k) => { if (k === "alignItems" && st.alignItems !== "stretch") return; delete st[k]; });
    }
    const m = { t: st.marginTop, r: st.marginRight, b: st.marginBottom, l: st.marginLeft };
    if (st.margin) { const parts = st.margin.split(" "); m.t = parts[0]; m.r = parts[1] ?? parts[0]; m.b = parts[2] ?? parts[0]; m.l = parts[3] ?? m.r; }
    ["margin", "marginTop", "marginRight", "marginBottom", "marginLeft"].forEach((k) => delete st[k]);
    const nz = (v) => v && v !== "0" && v !== "0px" && v !== "auto";
    // `margin: 0 auto` has no non-zero side, but it centres the block.
    const hasMargin = Object.values(m).some(nz) || (m.l === "auto" && m.r === "auto");
    const cols = st.__cols; delete st.__cols;
    // Paper drops bare text that sits beside an absolutely positioned sibling
    // (the "5" next to the "×"); wrap the text nodes in that one case only —
    // beside in-flow siblings bare text renders fine and wrapping it would
    // stack the words.
    const absSibling = [...el.children].some((c) => /^(absolute|fixed)$/.test(getComputedStyle(c).position));
    const mixed = absSibling && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    let kids = [...el.childNodes].map((n) => (mixed && n.nodeType === 3 && n.textContent.trim()) ? `<div>${esc(n.textContent)}</div>` : serialize(n, depth + 1));
    // Paper drops inline-block / inline-flex boxes that sit in a line of text
    // (the wrong-answer reveal's blank answer chip after "shaded →"), and a
    // block box there would start its own line. Re-flow such a line as a
    // wrapping flex row: one item per word, a column-gap the width of a
    // space in this font, justified like the text was. Plain inline spans
    // (a bold word) are left alone — Paper keeps those in the text flow.
    const isInlineTextEl = (n) => n.nodeType === 1 && /^(strong|b|em|i|u|span|small|sup|sub|mark)$/.test(n.tagName.toLowerCase()) && n.children.length === 0 && getComputedStyle(n).display === "inline";
    const hasText = [...el.childNodes].some((n) => (n.nodeType === 3 && n.textContent.trim()) || isInlineTextEl(n));
    const inlineBox = (c) => /^inline-(block|flex|grid)$/.test(getComputedStyle(c).display);
    if (hasText && !absSibling && [...el.children].some(inlineBox) && [...el.children].every((c) => /^(inline|none)/.test(getComputedStyle(c).display))) {
      // One flex item per word. Adjacent text runs with no whitespace between
      // them ("2 twos" + ": 2,") stay one word; a run with its own style (a
      // coloured span) becomes a <span> inside that word.
      const tokens = []; let glue = false;
      const pushRun = (text, style) => {
        text.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { glue = false; return; }
          if (glue && tokens.length && Array.isArray(tokens[tokens.length - 1])) tokens[tokens.length - 1].push({ w: part, s: style });
          else tokens.push([{ w: part, s: style }]);
          glue = true;
        });
        glue = !/\s$/.test(text);
      };
      [...el.childNodes].forEach((n) => {
        if (n.nodeType === 3) pushRun(n.textContent, "");
        else if (isInlineTextEl(n)) pushRun(n.textContent, styleAttr(styles(n, getComputedStyle(n))));
        else { tokens.push(serialize(n, depth + 1)); glue = false; }
      });
      kids = tokens.map((t) => {
        if (!Array.isArray(t)) return t;
        if (t.length === 1) return t[0].s ? `<div style="${t[0].s}">${esc(t[0].w)}</div>` : `<div>${esc(t[0].w)}</div>`;
        return `<div>${t.map((p) => p.s ? `<span style="${p.s}">${esc(p.w)}</span>` : esc(p.w)).join("")}</div>`;
      });
      const ctx = (serialize._ctx ||= document.createElement("canvas").getContext("2d"));
      ctx.font = cs.font || `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      // Paper hugs a flex child to its content, so a short row would sit at
      // the left of its column parent; fill the line so justify-content works.
      st.display = "flex"; st.flexWrap = "wrap"; st.alignItems = "center"; if (!st.width) st.width = "100%";
      st.justifyContent = cs.textAlign === "center" ? "center" : cs.textAlign === "right" ? "flex-end" : "flex-start";
      st.columnGap = `${+ctx.measureText(" ").width.toFixed(2)}px`;
      delete st.flexDirection;
    }
    if (cols) {
      // grid → flex: each child gets an equal share of the row; a child that
      // spanned N columns (number-pad Backspace / Check) gets N shares plus
      // the gaps between them, and the grid-column declaration is dropped.
      const gap = parseFloat(st.gap || st.columnGap || 0);
      const share = (n) => `calc((100% - ${gap * (cols - 1)}px) / ${cols} * ${n} + ${gap * (n - 1)}px)`;
      kids = kids.map((k) => {
        if (!k.startsWith("<div style=\"")) return k;
        const m = k.match(/grid-column(?:-start)?:span (\d+)/);
        const n = m ? Number(m[1]) : 1;
        k = k.replace(/;?grid-column(?:-start|-end)?:[^;"]*/g, "");
        // a child's own percentage width meant "fill the track" — the share replaces it
        k = k.replace(/^(<div style="[^"]*?);?width:\d+(?:\.\d+)?%/, "$1");
        return k.replace("<div style=\"", `<div style="width:${n === 1 ? `calc((100% - ${gap * (cols - 1)}px) / ${cols})` : share(n)};flex-shrink:0;`);
      });
    }
    const styleStr = styleAttr(st);
    const name = el.getAttribute("aria-label") || el.getAttribute("data-layer") || (tag === "button" ? "Button" : null);
    const nameAttr = name ? ` layer-name="${name.replace(/"/g, "").slice(0, 50)}"` : "";
    let html;
    if (tag === "img") { const src = el.getAttribute("src") || ""; const abs = src.startsWith("/") ? `paper-asset://${REPO}/public${src}` : src; html = `<img src="${abs}" style="${styleStr}"${nameAttr}/>`; }
    else if (tag === "input" || tag === "textarea") { html = `<div style="${styleStr}"${nameAttr}>${esc(el.value || el.placeholder || "")}</div>`; }
    else if (tag === "select") { html = `<div style="${styleStr}"${nameAttr}>${esc(el.options[el.selectedIndex]?.text || "")}</div>`; }
    else html = `<div style="${styleStr}"${nameAttr}>${kids.join("")}</div>`;
    if (hasMargin) {
      // Negative margins can't become padding: pull the wrapper by that much
      // with a relative offset instead (the home banner's margin-top:-16px).
      const neg = (v) => nz(v) && parseFloat(v) < 0;
      const pos = (v) => (nz(v) && !neg(v) ? v : 0);
      const pad = `padding:${pos(m.t)} ${pos(m.r)} ${pos(m.b)} ${pos(m.l)}`;
      const shift = `${neg(m.t) ? `position:relative;top:${m.t};` : ""}${neg(m.l) ? `position:relative;left:${m.l};` : ""}`;
      const centered = m.l === "auto" && m.r === "auto";
      const w = st.width === "100%" || st.alignSelf === "stretch" || centered ? "width:100%;" : "";
      const al = centered ? "align-items:center;" : "";
      // A centred block with max-width fills its line up to that max in the
      // browser; as a flex child it would hug its content, so give it width:100%.
      if (centered && st.maxWidth && !st.width) html = html.replace(/^<div style="/, '<div style="width:100%;');
      html = `<div style="display:flex;flex-direction:column;${w}${al}${shift}${pad}">${html}</div>`;
    }
    return html;
  }

  // selector: the screen root. Default = the first child of #root (the active
  // screen). Overlays (splash, achievement popup, module picker sheet) are
  // later siblings — pass "#root > :nth-child(2)" etc.
  window.__jfExtract = (sel = "#root > *") => {
    // The preview pane throttles rendering while it is not being looked at, so a
    // CSS entrance animation (dotPop scale(0), fadeSlideUp) can still be sitting
    // at its first frame when the DOM is read -> dots/icons captured at 0px.
    // Jump every finite animation to its end state first (infinite ones throw).
    document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) { /* infinite */ } });
    const root = document.querySelector(sel);
    if (!root) return "NOT FOUND";
    return serialize(root, 0);
  };
  // Save straight to disk through tools/paper/capture-server.mjs (port 5199)
  // so the HTML never has to travel through a chat transcript. Returns the
  // saved path, byte count and the data-jf-hash of every SVG it still had to
  // emit in full (add those to __jfAliases once they exist in Paper).
  window.__jfSave = async (name, sel, port = 5199) => {
    if (window.innerWidth !== W) throw new Error(`viewport is ${window.innerWidth}px wide; captures must be taken at ${W}px (resize the preview to the mobile preset first, or set window.__JF_WIDTH for a narrow variant) — clamp()/vw values resolve against the viewport`);
    const html = window.__jfExtract(sel);
    const res = await fetch(`http://localhost:${port}/save?name=${encodeURIComponent(name)}`, { method: "POST", body: html });
    const info = await res.json();
    return { ...info, viewport: `${window.innerWidth}x${window.innerHeight}`, hashes: [...html.matchAll(/data-jf-hash="([^"]+)"/g)].map((m) => m[1]) };
  };
  return "extractor ready";
})();
