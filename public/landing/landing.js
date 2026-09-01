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
