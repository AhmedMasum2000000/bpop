// Shared helpers used by every section script. Load after data.js, before section scripts.
window.BP = (() => {
  const D = window.BPOP || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const storyUrl = (id) => `story.html?id=${encodeURIComponent(id)}`;

  // Fill a marquee track with two identical halves so a -50% loop is seamless
  function fillMarquee(track, text, copies = 12) {
    if (!track) return;
    const t = text || track.dataset.text || "";
    let html = "";
    for (let i = 0; i < copies; i++) html += `<span>${t}</span>`;
    track.innerHTML = html + html;
  }

  // Add .is-in once an element scrolls into view: 20% of it visible, or -- for
  // elements taller than 5 viewports, which can never reach a 0.2 ratio -- once
  // its top passes the middle of the viewport.
  const reveal = (entries) =>
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("is-in");
        io.unobserve(en.target);
        ioTall.unobserve(en.target);
      }
    });
  const io = new IntersectionObserver(reveal, { threshold: 0.2 });
  const ioTall = new IntersectionObserver(reveal, { rootMargin: "0px 0px -50% 0px" });
  // accepts an element, an array or a NodeList; anything else is ignored
  const observe = (els) =>
    (els instanceof Element ? [els] : els ? Array.from(els) : []).forEach((el) => {
      if (!(el instanceof Element)) return;
      io.observe(el);
      ioTall.observe(el);
    });

  // One rAF-batched scroll/resize loop shared by all sections
  const scrollFns = [];
  const resizeFns = [];
  let ticking = false;
  function run() {
    ticking = false;
    scrollFns.forEach((fn) => fn());
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resizeFns.forEach((fn) => fn()); run(); }, 150); });
  addEventListener("load", () => { resizeFns.forEach((fn) => fn()); run(); });
  const onScroll = (fn) => { if (typeof fn !== "function") return; scrollFns.push(fn); fn(); };
  const onResize = (fn) => { if (typeof fn === "function") resizeFns.push(fn); };

  // Generic parallax: any element with data-speed drifts relative to viewport centre.
  // The rect already includes the offset we applied last frame, so subtract it
  // (otherwise the offset feeds back into itself and depends on scroll history);
  // read every rect first, then write, to avoid a forced layout per element.
  onScroll(() => {
    if (reduced) return;
    const els = $$("[data-speed]");
    if (!els.length) return;
    const vh = innerHeight;
    const ys = els.map((el) => {
      const r = el.getBoundingClientRect();
      const prev = parseFloat(el.dataset.py) || 0;
      const y = (r.top - prev + r.height / 2 - vh / 2) * (parseFloat(el.dataset.speed) || 0);
      return Number.isFinite(y) ? y : 0;
    });
    els.forEach((el, i) => {
      el.dataset.py = ys[i].toFixed(2);
      el.style.transform = `translate3d(0, ${ys[i].toFixed(2)}px, 0)`;
    });
  });

  // External links and generic reveals
  document.addEventListener("DOMContentLoaded", () => {
    const links = D.links || {};
    $$("[data-link]").forEach((a) => { const u = links[a.dataset.link]; if (u) a.href = u; });
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
    observe($$(".reveal"));
  });

  return { D, $, $$, reduced, pad, storyUrl, fillMarquee, observe, onScroll, onResize };
})();
