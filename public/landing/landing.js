// JackFlash landing page — interactions (no dependencies, no Math.random()).
(function () {
  "use strict";

  /* ---------- sticky nav .is-stuck + live --nav-h measurement ----------
     The nav is 1 row on desktop (~67-75px) but wraps to 2+ rows on
     narrow viewports (171-221px at 375px), and .is-stuck itself changes
     its padding/height. A fixed scroll-margin-top can't cover all of
     that, so we measure the nav's real height and publish it as a CSS
     var; .section's scroll-margin-top reads it via calc(). */
  var nav = document.getElementById("nav");

  function setNavHeightVar() {
    if (!nav) return;
    document.documentElement.style.setProperty("--nav-h", nav.offsetHeight + "px");
  }

  if (nav) {
    var onScroll = function () {
      if (window.scrollY > 40) {
        nav.classList.add("is-stuck");
      } else {
        nav.classList.remove("is-stuck");
      }
      setNavHeightVar();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", setNavHeightVar);
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(setNavHeightVar).observe(nav);
    }
    onScroll();
    setNavHeightVar();
  }

  /* ---------- App Store buttons: not live, show a toast ---------- */
  var toast = document.getElementById("toast");
  var toastCloseBtn = document.getElementById("toast-close");
  var toastTimer = null;

  function showToast() {
    if (!toast) return;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }
  function hideToast() {
    if (!toast) return;
    toast.hidden = true;
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
  }
  if (toastCloseBtn) toastCloseBtn.addEventListener("click", hideToast);

  var appStoreCtas = document.querySelectorAll(".js-appstore-cta");
  appStoreCtas.forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      showToast();
    });
  });

  /* ---------- Smart Practice bubbles / list rows: hover-raise + dim siblings ---------- */
  var spBubbles = document.querySelectorAll(".sp-bubble");
  spBubbles.forEach(function (bubble) {
    bubble.addEventListener("focus", function () {
      bubble.classList.add("is-active");
    });
    bubble.addEventListener("blur", function () {
      bubble.classList.remove("is-active");
    });
  });

  // .sp-list rows: tap toggles the "raised" state (mobile has no hover)
  var spRows = document.querySelectorAll(".sp-row");
  spRows.forEach(function (row) {
    row.addEventListener("click", function () {
      var wasActive = row.classList.contains("is-active");
      spRows.forEach(function (r) {
        r.classList.remove("is-active");
      });
      if (!wasActive) row.classList.add("is-active");
    });
  });

  /* ---------- screenshot lightbox ---------- */
  var frames = [
    { src: "./landing/frames/frame1_profiles.png", alt: "One app. Every child’s level — profiles screen on yellow" },
    { src: "./landing/frames/frame2_smartpractice.png", alt: "Smart Practice adapts to your child — five categories on green" },
    { src: "./landing/frames/frame3_practice.png", alt: "See the math, don’t just guess — practice screen on blue" },
    { src: "./landing/frames/frame4_mastery.png", alt: "Mastery that actually sticks — practice sets on pink" },
    { src: "./landing/frames/frame5_parentzone.png", alt: "Parents see what matters — parent zone on purple" },
    { src: "./landing/frames/frame6_badges.png", alt: "Streaks and badges keep them coming back — on orange" }
  ];

  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxClose = document.getElementById("lightbox-close");
  var lightboxScrim = document.getElementById("lightbox-scrim");
  var lightboxPrev = document.getElementById("lightbox-prev");
  var lightboxNext = document.getElementById("lightbox-next");
  var shotThumbs = document.querySelectorAll(".shot-thumb");

  var currentIndex = 0;
  var lastTrigger = null;

  function openLightbox(index, trigger) {
    if (!lightbox || !lightboxImg) return;
    currentIndex = index;
    lastTrigger = trigger || null;
    renderLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus();
    }
  }

  function renderLightbox() {
    var frame = frames[currentIndex];
    if (!frame) return;
    lightboxImg.src = frame.src;
    lightboxImg.alt = frame.alt;
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % frames.length;
    renderLightbox();
  }
  function showPrev() {
    currentIndex = (currentIndex - 1 + frames.length) % frames.length;
    renderLightbox();
  }

  shotThumbs.forEach(function (thumb, i) {
    thumb.addEventListener("click", function () {
      openLightbox(i, thumb);
    });
  });

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxScrim) lightboxScrim.addEventListener("click", closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener("click", showNext);
  if (lightboxPrev) lightboxPrev.addEventListener("click", showPrev);

  // Focus trap: while open, Tab/Shift+Tab cycle only among the lightbox's
  // own controls (scrim, close, prev, next) instead of escaping to the page.
  function lightboxFocusables() {
    return [lightboxScrim, lightboxClose, lightboxPrev, lightboxNext].filter(function (el) {
      return el;
    });
  }

  function trapLightboxTab(e) {
    if (e.key !== "Tab") return;
    var focusables = lightboxFocusables();
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    var active = document.activeElement;
    var inside = lightbox.contains(active);

    if (e.shiftKey) {
      if (!inside || active === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  document.addEventListener("keydown", function (e) {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === "Escape") {
      closeLightbox();
    } else if (e.key === "ArrowRight") {
      showNext();
    } else if (e.key === "ArrowLeft") {
      showPrev();
    } else if (e.key === "Tab") {
      trapLightboxTab(e);
    }
  });
})();

/* ===================================================================
   Widont — no single-word last lines
   ===================================================================
   CSS text-wrap:balance/pretty (see landing.css) handles most cases and is
   the no-JS fallback, but at narrow measures neither has room to pull a word
   down, so short headings ("No subscription. Ever.") and long FAQ answers
   still orphan. This binds the final space of each text block with a
   non-breaking space so the last two words can never be split.

   Guarded: joining two long words can overflow a narrow container, so each
   change is reverted if it makes the element overflow. Re-runs on resize
   because what fits is width-dependent.
   =================================================================== */
(function () {
  "use strict";

  var SELECTOR = [
    "p", "h1", "h2", "h3", "h4",
    ".card-h3", ".cpa-title", ".cpa-label", ".cpa-desc", ".cpa-note",
    ".section-lede", ".faq-q", ".faq-a", ".founder-p", ".tagline",
    ".sp-row-caption", ".sp-bubble-caption", ".price-row"
  ].join(",");

  var NBSP = " ";
  var tracked = [];

  // Last text node in the element that ends with a real word.
  function lastTextNode(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var node = null, n;
    while ((n = walker.nextNode())) {
      if (n.textContent.replace(/\s/g, "").length) node = n;
    }
    return node;
  }

  function collect() {
    var els = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var node = lastTextNode(el);
      if (!node) continue;
      // Needs a trailing space to convert, and at least two words overall.
      if (!/\S\s+\S/.test(node.textContent)) continue;
      if (el.textContent.trim().split(/\s+/).length < 3) continue;
      tracked.push({ el: el, node: node, original: node.textContent });
    }
  }

  // Nearest ANCESTOR that reports layout width. Must start above el: an
  // element never overflows itself, so measuring el would never detect that
  // its own joined token no longer fits the space its parent gives it.
  function blockAncestor(el) {
    var n = el.parentElement;
    while (n && n !== document.body) {
      if (n.clientWidth > 0) return n;
      n = n.parentElement;
    }
    return document.body;
  }

  function apply() {
    for (var i = 0; i < tracked.length; i++) {
      var t = tracked[i];
      // Reset first so resizing re-evaluates from the original text.
      t.node.textContent = t.original;
      // Replace the LAST run of whitespace between two words with an NBSP.
      var replaced = t.original.replace(/\s+(\S+)(\s*)$/, function (m, word, tail) {
        return NBSP + word + tail;
      });
      if (replaced === t.original) continue;
      t.node.textContent = replaced;
      // Revert if the join pushed content past its container. Measure the
      // nearest BLOCK ancestor: scrollWidth/clientWidth are always 0 on inline
      // elements (.faq-q is a span), so testing t.el directly never fires.
      var box = blockAncestor(t.el);
      if (box && box.scrollWidth > box.clientWidth + 1) {
        t.node.textContent = t.original;
      }
    }
  }

  collect();
  apply();

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(apply, 120);
  }, { passive: true });
})();
