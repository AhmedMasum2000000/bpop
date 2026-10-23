// Loader, bottom nav active state, scroll progress
(() => {
  const { $, $$, reduced, onScroll } = window.BP;

  const loader = $("#loader");
  if (loader) {
    const row = $("#loaderRow");
    const cells = innerWidth < 700 ? 6 : 16;
    const counters = [];
    for (let i = 0; i < cells; i++) {
      const s = document.createElement("span");
      s.textContent = "0%";
      row.appendChild(s);
      counters.push({ el: s, speed: 0.7 + Math.random() * 0.6 });
    }
    const t0 = performance.now();
    const dur = reduced ? 200 : 1600;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      counters.forEach((c) => (c.el.textContent = Math.min(100, Math.round(Math.pow(p, c.speed) * 100)) + "%"));
      if (p < 1) return requestAnimationFrame(tick);
      setTimeout(() => {
        loader.classList.add("is-done");
        document.body.classList.remove("is-loading");
        document.body.classList.add("is-ready");
        setTimeout(() => loader.remove(), 1000);
      }, 250);
    };
    requestAnimationFrame(tick);
  } else {
    document.body.classList.add("is-ready");
  }

  const navLinks = $$(".bnav__links a");
  const secIo = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href").endsWith("#" + en.target.id)));
      }),
    { rootMargin: "-50% 0px -50% 0px" }
  );
  $$("main section[id]").forEach((s) => secIo.observe(s));

  const progress = $("#progress");
  if (progress)
    onScroll(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = (scrollY / Math.max(1, max)) * 100 + "%";
    });
})();
