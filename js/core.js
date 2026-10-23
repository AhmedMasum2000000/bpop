// Shared helpers used by every section script. Load after data.js, before section scripts.
window.BP = (() => {
  const D = window.BPOP;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const storyUrl = (id) => `story.html?id=${encodeURIComponent(id)}`;

  // Fill a marquee track with two identical halves so a -50% loop is seamless
  function fillMarquee(track, text, copies = 12) {
    const t = text || track.dataset.text;
    let html = "";
    for (let i = 0; i < copies; i++) html += `<span>${t}</span>`;
    track.innerHTML = html + html;
  }

  // Add .is-in once an element scrolls into view
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      }),
    { threshold: 0.2 }
  );
  const observe = (els) => [].concat(els).forEach((el) => io.observe(el));

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
  const onScroll = (fn) => { scrollFns.push(fn); fn(); };
  const onResize = (fn) => resizeFns.push(fn);

  // Generic parallax: any element with data-speed drifts relative to viewport centre
  onScroll(() => {
    if (reduced) return;
    const vh = innerHeight;
    $$("[data-speed]").forEach((el) => {
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${mid * parseFloat(el.dataset.speed)}px, 0)`;
    });
  });

  // External links and generic reveals
  document.addEventListener("DOMContentLoaded", () => {
    $$("[data-link]").forEach((a) => (a.href = D.links[a.dataset.link]));
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
    observe($$(".reveal"));
  });

  return { D, $, $$, reduced, pad, storyUrl, fillMarquee, observe, onScroll, onResize };
})();
