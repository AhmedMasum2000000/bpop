// Hero / about section: headline fit, line + word entrances, manifesto echo boxes,
// scroll parallax, floating stamps and the inner layer they reveal.
(() => {
  const { $, $$, reduced, onScroll, onResize } = window.BP;
  const hero = $(".hero");
  const stage = $("#heroStage");
  if (!hero || !stage) return;

  const title = $("#heroTitle");
  const aside = $("#heroAside");
  const wireHead = $("#heroWireHead");
  const about = $("#heroAbout");
  const inner = $("#heroInner");
  const stampLayer = $("#heroStamps");
  const head = $(".hero__head", hero);
  const desk = matchMedia("(min-width: 768px)");
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  hero.classList.add("js-anim");

  /* ---------- 1. Headline fit: first line spans the full width ---------- */
  function fit() {
    if (!title) return;
    const spans = $$(".hero__ln > span", title);
    title.style.setProperty("--hero-fs", "100px");
    const widest = Math.max(...spans.map((s) => s.getBoundingClientRect().width));
    const avail = title.clientWidth;
    if (!widest || !avail) return;
    const fs = Math.floor((100 * avail * 0.997) / widest * 100) / 100;
    title.style.setProperty("--hero-fs", fs + "px");
    aside.style.setProperty("--hero-fs", fs + "px");

    // tuck the aside right after the last line, then give the wire box what is left
    const headW = head.clientWidth;
    const widths = spans.map((s) => s.getBoundingClientRect().width);
    const lineH = parseFloat(getComputedStyle(title).lineHeight) || fs * 0.8;
    aside.style.fontSize = "";
    // a tall aside climbs into the line above, so clear that line too
    const ref = aside.offsetHeight > lineH ? Math.max(widths[widths.length - 1], widths[widths.length - 2] || 0) : widths[widths.length - 1];
    const ax = ref + headW * (desk.matches ? 0.026 : 0.03);
    aside.style.setProperty("--aside-x", ax + "px");
    const room = headW - 2 - ax;
    if (aside.offsetWidth > room && room > 40) {
      aside.style.fontSize = (parseFloat(getComputedStyle(aside).fontSize) * room) / aside.offsetWidth + "px";
    }
    if (desk.matches) {
      const free = headW - 10 - (ax + aside.offsetWidth + headW * 0.016);
      const w = Math.max(headW * 0.2, Math.min(headW * 0.282, free));
      wireHead.style.setProperty("--wire-w", w + "px");
    } else {
      wireHead.style.removeProperty("--wire-w");
    }
  }

  /* ---------- 2. Staggered line entrances (headline, aside, Bangla headline) ---------- */
  const lineGroups = [
    [title, 0, 70],
    [aside, 220, 40],
    [$(".hero__bn", hero), 420, 90],
  ];
  lineGroups.forEach(([el, d0, st]) => {
    if (!el) return;
    $$(".hero__ln", el).forEach((ln, i) => {
      const s = ln.firstElementChild;
      s.style.setProperty("--i", i);
      s.style.setProperty("--d0", d0 + "ms");
      s.style.setProperty("--st", st + "ms");
    });
  });
  const turnOn = () => hero.classList.add("is-on");
  if (document.body.classList.contains("is-ready") || !$("#loader")) {
    requestAnimationFrame(turnOn);
  } else {
    const mo = new MutationObserver(() => {
      if (document.body.classList.contains("is-ready")) { turnOn(); mo.disconnect(); }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    setTimeout(turnOn, 4000);
  }

  /* ---------- 3. Manifesto echoes: the same words, re-set four more ways ---------- */
  const main = $(".hb--main", about);
  if (main) {
    const bigHtml = $(".hb__big", main).innerHTML;
    const bnTxt = esc($(".hb__bn", main).textContent.trim());
    const enTxt = esc($(".hb__en", main).textContent.trim());
    const P = {
      big: `<p class="hb__big">${bigHtml}</p>`,
      bn: `<p class="hb__bn" lang="bn">${bnTxt}</p>`,
      en: `<p class="hb__en">${enTxt}</p>`,
    };
    const box = (cls, hp, html) =>
      `<div class="hb ${cls}"${hp ? ` data-hp="${hp}"` : ""} aria-hidden="true"><div class="hb__in">${html}</div></div>`;
    about.insertAdjacentHTML(
      "beforeend",
      box("hb--b2", -0.2, P.en + P.bn + P.big) +
        box("hb--b3", 0.1, `<div class="hb__vcol"><p class="hb__big hb__big--v">${bigHtml}</p></div><div class="hb__side">${P.bn}${P.en}</div>`) +
        box("hb--b4", 0, `<p class="hb__en hb__en--v">${enTxt}</p>${P.big}${P.bn}`) +
        box("hb--b5", 0, P.en + P.bn + P.big)
    );
  }

  /* ---------- 4. Inner layer: recoloured copy of the manifesto, artwork in the wire slots ---------- */
  let innerAbout = null;
  if (inner && about) {
    innerAbout = about.cloneNode(true);
    innerAbout.removeAttribute("id");
    innerAbout.classList.add("hero__about--inner");
    $$("[data-split]", innerAbout).forEach((el) => el.removeAttribute("data-split"));
    const art = ["p22", "p08", "p33"];
    $$(".hb__w", innerAbout).forEach((w, i) => {
      w.classList.remove("xw");
      w.innerHTML = `<img src="assets/posts/${art[i % art.length]}.jpg" alt="" loading="lazy" />`;
    });
    inner.appendChild(innerAbout);
  }
  function placeInner() {
    if (!inner) return;
    const top = about.offsetTop;
    inner.style.setProperty("--fv-h", top + "px");
    inner.style.setProperty("--about-top", top + "px");
  }

  /* ---------- 5. Word-by-word reveal, timed per rendered line ---------- */
  const splitEls = $$("[data-split]", hero);
  function split(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(part));
            const o = document.createElement("span");
            const i = document.createElement("span");
            o.className = "sw";
            i.className = "sw__i";
            i.textContent = part;
            o.appendChild(i);
            frag.appendChild(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR" && !n.classList.contains("xw")) {
          walk(n);
        }
      });
    };
    walk(el);
  }
  function lineIndex(el) {
    let top = null;
    let line = -1;
    $$(".sw", el).forEach((w) => {
      const t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 3) { line++; top = t; }
      w.style.setProperty("--l", Math.min(line, 14));
    });
  }
  splitEls.forEach(split);
  const splitIo = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.classList.add("is-in");
        splitIo.unobserve(el);
        setTimeout(() => el.classList.add("is-done"), 2800);
      }),
    { threshold: 0.25 }
  );
  splitEls.forEach((el) => splitIo.observe(el));

  /* ---------- 6. Parallax on the framed boxes (desktop) ---------- */
  let hpEls = [];
  function collectParallax() {
    hpEls = $$("[data-hp]", stage)
      .filter((el) => parseFloat(el.dataset.hp))
      .map((el) => ({ el, k: parseFloat(el.dataset.hp), h: el.offsetHeight }));
  }
  function parallax() {
    if (!hpEls.length) return;
    if (reduced || !desk.matches) {
      hpEls.forEach((p) => (p.el.style.transform = ""));
      return;
    }
    const r = about.getBoundingClientRect();
    const t = Math.max(0, -r.top / r.height);
    hpEls.forEach((p) => (p.el.style.transform = `translate3d(0, ${(p.k * t * p.h).toFixed(1)}px, 0)`));
  }

  /* ---------- 7. Floating stamps that open / close the inner layer ---------- */
  const ICONS = [
    // cassette
    '<rect x="6" y="14" width="52" height="36" rx="4" fill="#d2d2d2" stroke="#222" stroke-width="2.4"/><rect x="13" y="20" width="38" height="14" rx="2" fill="#fff" stroke="#222" stroke-width="2"/><rect x="14" y="21" width="36" height="4" fill="#ff2ea6"/><circle cx="23" cy="29" r="3.6" fill="#222"/><circle cx="41" cy="29" r="3.6" fill="#222"/><path d="M16 50l4-8h24l4 8" fill="#9b9b9b" stroke="#222" stroke-width="2.2" stroke-linejoin="round"/>',
    // vinyl
    '<circle cx="32" cy="32" r="25" fill="#2b2b2b" stroke="#111" stroke-width="2"/><circle cx="32" cy="32" r="19.5" fill="none" stroke="#5c5c5c" stroke-width="1.2"/><circle cx="32" cy="32" r="14.5" fill="none" stroke="#5c5c5c" stroke-width="1.2"/><circle cx="32" cy="32" r="9" fill="#ff2ea6"/><circle cx="32" cy="32" r="2.2" fill="#fff"/><path d="M15 22a19 19 0 0 1 9-8" fill="none" stroke="#b5b5b5" stroke-width="2" stroke-linecap="round"/>',
    // microphone
    '<g transform="rotate(35 32 32)"><rect x="27" y="30" width="10" height="27" rx="4" fill="#9b9b9b" stroke="#222" stroke-width="2.2"/><rect x="26" y="31" width="12" height="4.5" fill="#ff2ea6" stroke="#222" stroke-width="1.6"/><circle cx="32" cy="20" r="12" fill="#d6d6d6" stroke="#222" stroke-width="2.4"/><path d="M24 14l16 12M24 26l16-12M21 20h22M32 9v22" stroke="#222" stroke-width="1.2" opacity=".5"/></g>',
    // spray can
    '<rect x="20" y="21" width="22" height="37" rx="4" fill="#d2d2d2" stroke="#222" stroke-width="2.4"/><rect x="20" y="31" width="22" height="13" fill="#ff2ea6" stroke="#222" stroke-width="2"/><path d="M24 21v-5h14v5" fill="#9b9b9b" stroke="#222" stroke-width="2.2" stroke-linejoin="round"/><rect x="28" y="9" width="6" height="7" rx="1" fill="#222"/><g fill="#ff2ea6"><circle cx="42" cy="9" r="2"/><circle cx="48" cy="5.5" r="1.6"/><circle cx="49" cy="12" r="2.2"/><circle cx="55" cy="8.5" r="1.4"/><circle cx="54.5" cy="15" r="1.7"/></g>',
    // boombox
    '<path d="M20 18v-6h24v6" fill="none" stroke="#222" stroke-width="2.6" stroke-linejoin="round"/><rect x="5" y="18" width="54" height="34" rx="5" fill="#d2d2d2" stroke="#222" stroke-width="2.4"/><circle cx="18" cy="37" r="9" fill="#5c5c5c" stroke="#222" stroke-width="2"/><circle cx="18" cy="37" r="3.4" fill="#ff2ea6"/><circle cx="46" cy="37" r="9" fill="#5c5c5c" stroke="#222" stroke-width="2"/><circle cx="46" cy="37" r="3.4" fill="#ff2ea6"/><rect x="27" y="24" width="10" height="6" rx="1" fill="#fff" stroke="#222" stroke-width="1.6"/>',
    // lightning
    '<path d="M37 4L14 36h14l-5 24 27-36H36z" fill="#ff2ea6" stroke="#222" stroke-width="2.6" stroke-linejoin="round"/><path d="M33 12l-9 14" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>',
    // megaphone
    '<path d="M10 26h10l25-14v40L20 38H10z" fill="#d2d2d2" stroke="#222" stroke-width="2.4" stroke-linejoin="round"/><path d="M14 38l4 14h7l-3-14" fill="#9b9b9b" stroke="#222" stroke-width="2.2" stroke-linejoin="round"/><rect x="45" y="22" width="5" height="20" rx="2" fill="#ff2ea6" stroke="#222" stroke-width="2"/><path d="M55 23l5-4M56 32h6M55 41l5 4" stroke="#222" stroke-width="2.2" stroke-linecap="round"/>',
    // headphones
    '<path d="M12 39v-7a20 20 0 0 1 40 0v7" fill="none" stroke="#222" stroke-width="3.2" stroke-linecap="round"/><rect x="7" y="34" width="12" height="21" rx="5" fill="#9b9b9b" stroke="#222" stroke-width="2.4"/><rect x="45" y="34" width="12" height="21" rx="5" fill="#9b9b9b" stroke="#222" stroke-width="2.4"/><circle cx="13" cy="44.5" r="3" fill="#ff2ea6"/><circle cx="51" cy="44.5" r="3" fill="#ff2ea6"/>',
  ];

  // small seeded random so the first layout is the same on every load
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const stamps = [];
  const R = 76;
  const ringLen = Math.round(2 * Math.PI * R - 4);
  function buildStamps() {
    const n = desk.matches ? 8 : 5;
    ICONS.slice(0, n).forEach((icon, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hstamp";
      b.setAttribute("aria-label", "Flip to the B-POP inner layer");
      b.setAttribute("aria-pressed", "false");
      b.innerHTML =
        `<svg class="hstamp__ring" viewBox="0 0 200 200" aria-hidden="true"><defs><path id="hsr${i}" d="M100 100m-${R} 0a${R} ${R} 0 1 1 ${R * 2} 0a${R} ${R} 0 1 1 -${R * 2} 0"/></defs>` +
        `<text textLength="${ringLen}" lengthAdjust="spacing"><textPath href="#hsr${i}">TAG IT ✦ TAG IT ✦ TAG IT ✦</textPath></text></svg>` +
        `<span class="hstamp__icon" aria-hidden="true"><svg viewBox="0 0 64 64">${icon}</svg></span>`;
      stampLayer.appendChild(b);
      const ang = rnd() * Math.PI * 2;
      const sp = (desk.matches ? 52 : 34) + rnd() * 30;
      const s = { el: b, x: 0, y: 0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, slow: false, fx: rnd(), fy: rnd() };
      b.addEventListener("pointerenter", () => (s.slow = true));
      b.addEventListener("pointerleave", () => (s.slow = false));
      b.addEventListener("click", (e) => {
        let cx = e.clientX;
        let cy = e.clientY;
        if (!e.detail) {
          const r = b.getBoundingClientRect();
          cx = r.left + r.width / 2;
          cy = r.top + r.height / 2;
        }
        toggleInner(cx, cy);
      });
      stamps.push(s);
    });
  }

  let W = 0;
  let H = 0;
  let size = 0;
  function measureStage(first) {
    W = stage.clientWidth;
    H = stage.clientHeight;
    size = stamps[0] ? stamps[0].el.offsetWidth : 0;
    const vh = innerHeight;
    stamps.forEach((s, i) => {
      if (first) {
        // a few in the first screen, the rest spread down through the manifesto
        const band = i < 3 ? Math.min(H, vh) : H;
        s.x = s.fx * (W - size);
        s.y = (i < 3 ? 60 : vh * 0.6) + s.fy * Math.max(1, band - size - (i < 3 ? 120 : vh * 0.6));
      }
      s.x = Math.min(Math.max(0, s.x), Math.max(0, W - size));
      s.y = Math.min(Math.max(0, s.y), Math.max(0, H - size));
      s.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
    });
  }

  let running = false;
  let last = 0;
  function tick(now) {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    const maxX = W - size;
    const maxY = H - size;
    stamps.forEach((s) => {
      const k = s.slow ? 0.2 : 1;
      s.x += s.vx * dt * k;
      s.y += s.vy * dt * k;
      if (s.x < 0 || s.x > maxX) { s.vx *= -1; s.x = Math.min(Math.max(0, s.x), maxX); }
      if (s.y < 0 || s.y > maxY) { s.vy *= -1; s.y = Math.min(Math.max(0, s.y), maxY); }
      s.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
    });
    requestAnimationFrame(tick);
  }
  function setRunning(on) {
    if (reduced || on === running) return;
    running = on;
    last = 0;
    if (on) requestAnimationFrame(tick);
  }

  function toggleInner(cx, cy, force) {
    if (!inner) return;
    const open = typeof force === "boolean" ? force : !hero.classList.contains("is-open");
    if (open === hero.classList.contains("is-open")) return;
    const r = inner.getBoundingClientRect();
    const at = `${(((cx - r.left) / r.width) * 100).toFixed(2)}% ${(((cy - r.top) / r.height) * 100).toFixed(2)}%`;
    inner.style.transition = "none";
    inner.style.clipPath = `circle(${open ? "0%" : "150%"} at ${at})`;
    void inner.offsetWidth;
    inner.style.transition = "";
    inner.style.clipPath = `circle(${open ? "150%" : "0%"} at ${at})`;
    hero.classList.toggle("is-open", open);
    inner.setAttribute("aria-hidden", String(!open));
    stamps.forEach((s) => s.el.setAttribute("aria-pressed", String(open)));
  }
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && hero.classList.contains("is-open")) toggleInner(innerWidth / 2, innerHeight / 2, false);
  });

  /* ---------- wiring ---------- */
  function layout(first) {
    fit();
    placeInner();
    splitEls.forEach(lineIndex);
    collectParallax();
    measureStage(first);
    parallax();
  }
  if (stampLayer) buildStamps();
  layout(true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout(false));
  addEventListener("load", () => layout(false));
  onResize(() => layout(false));
  onScroll(parallax);

  new IntersectionObserver((entries) => entries.forEach((en) => setRunning(en.isIntersecting && !document.hidden))).observe(stage);
  document.addEventListener("visibilitychange", () => {
    const r = stage.getBoundingClientRect();
    setRunning(!document.hidden && r.bottom > 0 && r.top < innerHeight);
  });
})();
