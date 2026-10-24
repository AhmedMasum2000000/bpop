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
    latestA.href = storyUrl(latest.ref || latest.id); // episodes with `ref` open that story
    latestA.setAttribute("aria-label", `Latest story: #${pad(num(latest))} ${latest.title || ""}`.trim());
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
    if (body.classList.contains("is-ready")) return;
    body.classList.remove("is-loading");
    body.classList.add("is-ready");
    document.dispatchEvent(new CustomEvent("bp:ready"));
  }

  // Arriving on page.html#section (e.g. from the story page nav): the browser's
  // own fragment scroll is smooth (html{scroll-behavior:smooth}) and starts while
  // the loader is up, so it is visibly mid-flight when the sheet lifts. Land
  // instantly instead. Reloads / history moves keep the browser's restored spot.
  function jumpToHash() {
    if (location.hash.length < 2) return;
    const nav = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
    if (nav && nav.type !== "navigate") return;
    let el = null;
    try { el = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) {}
    if (!el) return;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    el.scrollIntoView({ block: "start" }); // honours scroll-margin-top
    root.style.scrollBehavior = prev;
  }

  if (loader) {
    const t0 = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      loader.classList.add("is-done");
      jumpToHash(); // before bp:ready, so listeners see the final scroll position
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
      if (row) row.innerHTML = grp + grp.replace("loader__grp", 'loader__grp" aria-hidden="true');
      const cells = row ? $$("span", row) : [];
      requestAnimationFrame(() => loader.classList.add("is-on"));

      // Progress follows real loading (images + fonts + window load), eased,
      // never faster than ~1.4s and never longer than ~6s.
      // A tab opened in the background never runs rAF, so the counter can't
      // advance there: finish as soon as the page has loaded instead of
      // waiting for the 8s safety net.
      let loaded = false;
      addEventListener("load", () => { loaded = true; if (document.hidden) finish(); }, { once: true });
      if (document.readyState === "complete") loaded = true;
      let shown = 0;
      let last = -1;
      const MIN = 1400, MAX = 6000;
      const imgs = () => [...document.images].filter((i) => i.loading !== "lazy");
      const step = (now) => {
        if (finished) return;
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

  let navTimer = 0;
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a[href]");
    // only plain HTML links that open in this tab (SVG <a> has no string href)
    if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
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
    clearTimeout(navTimer);
    navTimer = setTimeout(() => (location.href = url.href), 900);
  });
  // coming back through the bfcache: drop the sheet again, and cancel a
  // navigation that was still pending when the page was frozen (Back pressed
  // within the 900ms) so it can't fire after the restore
  addEventListener("pageshow", (e) => {
    if (e.persisted) { clearTimeout(navTimer); sheet.classList.remove("is-on"); ssSet(TRANS_KEY, null); }
  });

  /* ---------- mobile menu ---------- */
  const menu = $("#menu");
  const menuBtn = $(".bnav__menu");
  const menuLinks = menu ? $$("a", menu) : [];
  function openMenu() {
    if (!menu || !menuBtn || !menu.hidden) return;
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
    body.classList.add("menu-open");
    menuBtn.setAttribute("aria-expanded", "true");
    menuBtn.textContent = "CLOSE";
    if (menuLinks[0]) menuLinks[0].focus({ preventScroll: true });
  }
  // restoreFocus: hand focus back to the MENU button (Escape / button) when it was inside the menu
  function closeMenu(restoreFocus) {
    if (!menu || !menuBtn || menu.hidden) return;
    const focusInside = menu.contains(document.activeElement);
    menu.classList.remove("is-open");
    menu.hidden = true;
    body.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "MENU";
    if (restoreFocus === true && focusInside) menuBtn.focus({ preventScroll: true });
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu(true)));
    menuLinks.forEach((a) => a.addEventListener("click", () => closeMenu()));
    addEventListener("keydown", (e) => {
      if (menu.hidden) return;
      if (e.key === "Escape") { closeMenu(true); if (document.activeElement === body) menuBtn.focus({ preventScroll: true }); return; }
      if (e.key !== "Tab") return;
      // keep Tab inside the open sheet: links -> CLOSE button -> links
      const items = [...menuLinks, menuBtn];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && (i < 0 || i === items.length - 1)) { e.preventDefault(); items[0].focus(); }
    });
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
