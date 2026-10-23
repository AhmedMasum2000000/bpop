// Shell: loader, page transitions, header tickers, bottom bar (counts, active
// state, mobile menu) and the scroll progress line. Shared by index + story.
(() => {
  const { D, $, $$, reduced, pad, storyUrl, onScroll } = window.BP;
  const body = document.body;
  const TRANS_KEY = "bp-trans";
  const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- tickers: duplicate content so a -100% slide loops seamlessly ---------- */
  function tick(el, html, pxPerSec = 60) {
    if (!el) return;
    el.innerHTML = `<span>${html}</span><span aria-hidden="true">${html}</span>`;
    const w = el.firstElementChild.getBoundingClientRect().width || 300;
    el.style.setProperty("--dur", Math.max(4, w / pxPerSec).toFixed(2) + "s");
  }
  window.BP.tick = tick; // story page reuses it

  /* ---------- every story, newest first (for "Latest Tag") ---------- */
  const num = (s) => parseInt(String(s.no ?? s.nos ?? "").replace(/\D/g, ""), 10) || 0;
  const stories = [
    ...(D.highlights || []).map((s) => ({ ...s, kind: "HIGHLIGHT" })),
    ...(D.guests || []).map((s) => ({ ...s, kind: "GUEST", title: [].concat(s.name || []).join(" ").trim() })),
    ...(D.episodes || []).map((s) => ({ ...s, kind: "EPISODE" })),
  ].sort((a, b) => num(b) - num(a));

  const chipText = $("#hChipText");
  tick(chipText, "Bangla Pop Tags&ensp;—&ensp;follow the scene on Instagram&ensp;·&ensp;", 40);

  const latest = stories[0];
  const latestA = $("#hLatest");
  if (latest && latestA) {
    latestA.href = storyUrl(latest.id);
    const bn = latest.bn || latest.tag;
    tick($("#hLatestText"), `#${pad(num(latest))} ${esc(latest.title)}${bn ? ` <span class="bn">${esc(bn)}</span>` : ""}&ensp;`, 55);
  }

  /* ---------- footer credits from the team list ---------- */
  const team = $("#footTeam");
  const tc = (t) => String(t).toLowerCase().replace(/(^|[\s-])\S/g, (m) => m.toUpperCase());
  if (team && Array.isArray(D.team) && D.team.length)
    team.textContent = D.team.map((m) => `${m.credit || tc(m.role)}: ${tc(m.name)}`).join(" / ");

  /* ---------- counts on the nav badges ---------- */
  $$("[data-count]").forEach((el) => {
    const list = D[el.dataset.count];
    if (Array.isArray(list)) el.textContent = `(${list.length})`;
    else el.remove();
  });

  /* ---------- loader ---------- */
  const loader = $("#loader");
  const fromTransition = ssGet(TRANS_KEY) === "1";
  ssSet(TRANS_KEY, null);

  function ready() {
    body.classList.remove("is-loading");
    body.classList.add("is-ready");
    document.dispatchEvent(new CustomEvent("bp:ready"));
  }

  if (loader) {
    const t0 = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      loader.classList.add("is-done");
      ready();
      setTimeout(() => loader.remove(), 700);
    };

    if (fromTransition || reduced) {
      // Arrived via an in-site link (the white sheet is already up) or the
      // visitor prefers less motion: no counters, just lift the sheet.
      loader.classList.add("loader--trans", "is-on");
      const go = () => setTimeout(finish, reduced ? 0 : Math.max(0, 450 - (performance.now() - t0)));
      document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
    } else {
      // Counter marquee: one shared percentage, repeated across the row.
      const row = $("#loaderRow");
      const pitch = innerWidth < 768 ? 45 + (30 / 375) * innerWidth : 45 + (60 / 1440) * innerWidth;
      const n = Math.ceil(innerWidth / pitch) + 1;
      const grp = '<div class="loader__grp">' + "<span>0%</span>".repeat(n) + "</div>";
      row.innerHTML = grp + grp.replace("loader__grp", 'loader__grp" aria-hidden="true');
      const cells = $$("span", row);
      requestAnimationFrame(() => loader.classList.add("is-on"));

      // Progress follows real loading (images + fonts + window load), eased,
      // never faster than ~1.4s and never longer than ~6s.
      let loaded = false;
      addEventListener("load", () => (loaded = true), { once: true });
      if (document.readyState === "complete") loaded = true;
      let shown = 0;
      let last = -1;
      const MIN = 1400, MAX = 6000;
      const imgs = () => [...document.images].filter((i) => i.loading !== "lazy");
      const step = (now) => {
        const el = now - t0;
        const list = imgs();
        const done = list.filter((i) => i.complete).length;
        let target = loaded ? 100 : Math.min(96, 8 + (list.length ? (done / list.length) * 88 : 60));
        if (el > MAX) target = 100;
        const cap = Math.min(100, (el / MIN) * 100);
        shown += (Math.min(target, cap) - shown) * 0.09;
        if (target === 100 && cap >= 100 && shown > 99.4) shown = 100;
        const v = Math.floor(shown);
        if (v !== last) { last = v; const t = v + "%"; for (const c of cells) c.textContent = t; }
        if (shown < 100) return requestAnimationFrame(step);
        setTimeout(finish, 380);
      };
      requestAnimationFrame(step);
    }
    setTimeout(finish, 8000); // safety net
  } else {
    ready();
  }

  /* ---------- page transition for in-site page links ---------- */
  const sheet = document.createElement("div");
  sheet.className = "ptrans";
  sheet.setAttribute("aria-hidden", "true");
  const lines = $$(".loader__line").map((p) => p.textContent);
  sheet.innerHTML = `<div class="ptrans__tag">${(lines.length ? lines : ["B-POP Tags"])
    .map((t, i) => `<p class="ptrans__line" style="--d:${i * 100}ms">${esc(t)}</p>`).join("")}</div>`;
  body.appendChild(sheet);

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const norm = (p) => p.replace(/index\.html$/, "");
    const samePage = norm(url.pathname) === norm(location.pathname) && url.search === location.search;
    if (samePage) return; // in-page anchors scroll natively
    if (!/(\.html|\/)$/.test(url.pathname)) return;
    e.preventDefault();
    closeMenu();
    if (reduced) { location.href = url.href; return; }
    sheet.classList.add("is-on");
    ssSet(TRANS_KEY, "1");
    setTimeout(() => (location.href = url.href), 900);
  });
  // coming back through the bfcache: drop the sheet again
  addEventListener("pageshow", (e) => {
    if (e.persisted) { sheet.classList.remove("is-on"); ssSet(TRANS_KEY, null); }
  });

  /* ---------- mobile menu ---------- */
  const menu = $("#menu");
  const menuBtn = $(".bnav__menu");
  function openMenu() {
    if (!menu) return;
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
    body.classList.add("menu-open");
    menuBtn.setAttribute("aria-expanded", "true");
    menuBtn.textContent = "CLOSE";
  }
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.classList.remove("is-open");
    menu.hidden = true;
    body.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "MENU";
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu()));
    $$("a", menu).forEach((a) => a.addEventListener("click", closeMenu));
    addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
    addEventListener("resize", () => innerWidth >= 1024 && closeMenu());
  }

  /* ---------- active section in the nav ---------- */
  const navLinks = $$(".bnav__links a, .menu__list a");
  const sections = $$("main section[id]");
  if (sections.length) {
    const secIo = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          navLinks.forEach((a) => a.classList.toggle("is-active", a.hash === "#" + en.target.id));
        }),
      { rootMargin: "-50% 0px -50% 0px" }
    );
    sections.forEach((s) => secIo.observe(s));
  }

  /* ---------- scroll progress ---------- */
  const progress = $("#progress");
  if (progress)
    onScroll(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / Math.max(1, max)))})`;
    });
})();
