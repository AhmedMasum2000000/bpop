(() => {
  const D = window.BPOP;
  const $ = (s, el = document) => el.querySelector(s);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const storyUrl = (id) => `story.html?id=${encodeURIComponent(id)}`;

  // External links
  document.querySelectorAll("[data-link]").forEach((a) => (a.href = D.links[a.dataset.link]));
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // Marquees: fill track with two copies so the -50% loop is seamless
  function fillMarquee(track, text, copies = 12) {
    const t = text || track.dataset.text;
    let html = "";
    for (let i = 0; i < copies; i++) html += `<span>${t}</span>`;
    track.innerHTML = html + html;
  }

  // ---------- Loader ----------
  const loader = $("#loader");
  const row = $("#loaderRow");
  const cells = window.innerWidth < 700 ? 6 : 16;
  const counters = [];
  for (let i = 0; i < cells; i++) {
    const s = document.createElement("span");
    s.textContent = "0%";
    row.appendChild(s);
    counters.push({ el: s, speed: 0.7 + Math.random() * 0.6 });
  }
  const t0 = performance.now();
  const dur = reduced ? 200 : 1600;
  function tickLoader(now) {
    const p = Math.min(1, (now - t0) / dur);
    counters.forEach((c) => {
      const v = Math.min(100, Math.round(Math.pow(p, c.speed) * 100));
      c.el.textContent = v + "%";
    });
    if (p < 1) requestAnimationFrame(tickLoader);
    else
      setTimeout(() => {
        loader.classList.add("is-done");
        document.body.classList.remove("is-loading");
        document.body.classList.add("is-ready");
        setTimeout(() => loader.remove(), 1000);
      }, 250);
  }
  requestAnimationFrame(tickLoader);

  // ---------- Highlights ----------
  const strokes = [
    "M-50,330 C180,120 320,120 460,260 S760,520 920,300 S1180,60 1300,180",
    "M-40,120 L380,60 L760,140 L1040,40 L1280,200 L1060,560 L-40,600",
    "M-60,420 C120,300 260,520 420,400 S700,160 860,320 S1120,560 1300,360",
    "M1300,520 C1000,600 780,420 640,520 S280,640 120,460 S-40,180 140,80",
    "M-60,250 Q160,40 380,250 T820,250 T1300,250",
  ];
  const hlList = $("#highlightList");
  hlList.innerHTML = D.highlights
    .map(
      (h, i) => `
    <a class="hl" href="${storyUrl(h.id)}" data-index="${i + 1}">
      <svg class="hl__stroke" viewBox="0 0 1240 640" preserveAspectRatio="none" aria-hidden="true">
        <path d="${strokes[i % strokes.length]}" stroke="${h.color}" pathLength="1"/>
      </svg>
      <span class="hl__no">#${h.no}</span>
      <h3 class="hl__title"><span class="hl__guest">${h.guest}</span>${h.title}<span class="hl__bn">${h.bn}</span></h3>
      <figure class="hl__img"><img src="${h.img}" alt="${h.title}" loading="lazy"></figure>
      <div class="hl__pill marquee"><div class="marquee__track"></div></div>
    </a>`
    )
    .join("");
  hlList.querySelectorAll(".hl__pill .marquee__track").forEach((t) => fillMarquee(t, "STORY DETAIL&nbsp;·&nbsp;", 6));
  $("#hlCount").textContent = D.highlights.length;

  // ---------- Guests ----------
  const grid = $("#guestGrid");
  grid.innerHTML = D.guests
    .map(
      (g) => `
    <a class="g" href="${storyUrl(g.id)}" style="background:${g.color}" data-img="${g.img}">
      <div class="g__name">${g.name[0]}<br>${g.name[1] || "&nbsp;"}</div>
      <div class="g__nos">${g.nos}</div>
      <div class="g__bn">গেস্ট : ${g.bn}</div>
      <p class="g__body">${g.body}</p>
      <div class="g__strip marquee"><div class="marquee__track"></div></div>
    </a>`
    )
    .join("");
  grid.querySelectorAll(".g__strip .marquee__track").forEach((t, i) => {
    fillMarquee(t, "STORY DETAIL&nbsp;·&nbsp;", 8);
    t.style.animationDuration = 14 + (i % 3) * 4 + "s";
    if (i % 2) t.style.animationDirection = "reverse";
  });
  $("#guestCount").textContent = D.guests.length;
  fillMarquee($(".viewall .marquee__track"));

  const hover = $("#guestHover");
  let hx = 0, hy = 0, cx = 0, cy = 0, hoverRaf = 0;
  function followHover() {
    cx += (hx - cx) * 0.18;
    cy += (hy - cy) * 0.18;
    hover.style.left = cx + "px";
    hover.style.top = cy + "px";
    hoverRaf = Math.abs(hx - cx) + Math.abs(hy - cy) > 0.5 ? requestAnimationFrame(followHover) : 0;
  }
  grid.addEventListener("pointermove", (e) => {
    hx = e.clientX + 120;
    hy = e.clientY;
    if (!hoverRaf) hoverRaf = requestAnimationFrame(followHover);
  });
  grid.querySelectorAll(".g").forEach((g) => {
    g.addEventListener("pointerenter", (e) => {
      hover.src = g.dataset.img;
      if (!hover.classList.contains("is-on")) {
        cx = hx = e.clientX + 120;
        cy = hy = e.clientY;
      }
      hover.classList.add("is-on");
    });
    g.addEventListener("pointerleave", () => hover.classList.remove("is-on"));
  });

  // ---------- Other episodes (draggable collage) ----------
  const board = $("#episodeBoard");
  board.innerHTML = D.episodes
    .map(
      (e) => `
    <a class="ep" href="${storyUrl(e.id)}" draggable="false">
      <div class="ep__head">#${pad(e.no)}<span class="ep__tag">${e.tag}</span></div>
      <div class="ep__body"><p class="ep__title">${e.title}</p><img src="${e.img}" alt="" loading="lazy"></div>
      <span class="ep__go">→</span>
    </a>`
    )
    .join("");
  const eps = [...board.querySelectorAll(".ep")];
  function layoutEpisodes() {
    const W = board.clientWidth, H = board.clientHeight;
    const cw = eps[0].offsetWidth, ch = eps[0].offsetHeight;
    const cols = Math.max(2, Math.min(Math.floor(W / (cw * 0.75)), Math.ceil(eps.length / 3)));
    const rows = Math.ceil(eps.length / cols);
    eps.forEach((el, i) => {
      const r = i % rows, c = Math.floor(i / rows);
      // deterministic jitter so the collage looks scattered but stable
      const jx = Math.sin(i * 12.9898) * 0.5, jy = Math.cos(i * 78.233) * 0.5;
      const x = (c / Math.max(1, cols - 1)) * (W - cw) + jx * cw * 0.35;
      const y = (r / Math.max(1, rows - 1)) * (H - ch) + jy * ch * 0.4;
      el.style.left = Math.max(0, Math.min(W - cw, x)) + "px";
      el.style.top = Math.max(0, Math.min(H - ch, y)) + "px";
      el.style.zIndex = i + 1;
    });
  }
  let z = 100;
  eps.forEach((el) => {
    let sx, sy, ox, oy, moved = false, id = null;
    el.addEventListener("pointerdown", (e) => {
      id = e.pointerId;
      el.setPointerCapture(id);
      sx = e.clientX; sy = e.clientY;
      ox = el.offsetLeft; oy = el.offsetTop;
      moved = false;
      el.style.zIndex = ++z;
      el.classList.add("is-drag");
    });
    el.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      const W = board.clientWidth - el.offsetWidth, H = board.clientHeight - el.offsetHeight;
      el.style.left = Math.max(0, Math.min(W, ox + dx)) + "px";
      el.style.top = Math.max(0, Math.min(H, oy + dy)) + "px";
    });
    const end = () => { id = null; el.classList.remove("is-drag"); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("click", (e) => { if (moved) e.preventDefault(); });
  });

  // ---------- Personality ----------
  const bg = $("#personalityBg");
  const bgImgs = ["p06", "p14", "p21", "p33", "p27"].map((n) => {
    const im = document.createElement("img");
    im.src = `assets/posts/${n}.jpg`;
    im.alt = "";
    im.loading = "lazy";
    bg.appendChild(im);
    return im;
  });
  let bgi = 0;
  bgImgs[0].classList.add("is-on");
  if (!reduced)
    setInterval(() => {
      bgImgs[bgi].classList.remove("is-on");
      bgi = (bgi + 1) % bgImgs.length;
      bgImgs[bgi].classList.add("is-on");
    }, 3200);

  // name positions (% of stage) and rotation, roughly a scattered credit sheet
  const spots = [
    { x: 8, y: 8, r: 3, line: { x: 10, y: 30, w: 38, r: 4 } },
    { x: 4, y: 34, r: 18, line: { x: 30, y: 62, w: 30, r: -38 } },
    { x: 92, y: 4, r: 90 },
    { x: 56, y: 70, r: -22, line: { x: 54, y: 52, w: 28, r: -62 } },
  ];
  $("#personalityNames").innerHTML = D.team
    .map((m, i) => {
      const s = spots[i % spots.length];
      const line = s.line
        ? `<span class="pn__rule" style="left:${s.line.x}%;top:${s.line.y}%;width:${s.line.w}%;transform:rotate(${s.line.r}deg)"></span>`
        : "";
      return `<div class="pn" style="left:${s.x}%;top:${s.y}%;transform:rotate(${s.r}deg)">
        <span class="pn__name">${m.name}</span><span class="pn__role">${m.role}</span></div>${line}`;
    })
    .join("");

  // ---------- Scroll effects ----------
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
  document.querySelectorAll(".reveal, .hl").forEach((el) => io.observe(el));

  // highlight counter follows the row in view
  const hlCount = $("#hlCount");
  const hlIo = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.isIntersecting && (hlCount.textContent = en.target.dataset.index)),
    { rootMargin: "-45% 0px -45% 0px" }
  );
  hlList.querySelectorAll(".hl").forEach((el) => hlIo.observe(el));

  // active nav link
  const navLinks = [...document.querySelectorAll(".bnav__links a")];
  const secIo = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id));
      }),
    { rootMargin: "-50% 0px -50% 0px" }
  );
  document.querySelectorAll("main section[id]").forEach((s) => secIo.observe(s));

  const speedEls = [...document.querySelectorAll("[data-speed]")];
  const pTitle = $(".personality__title");
  const progress = $("#progress");
  let ticking = false;
  function onScroll() {
    ticking = false;
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    progress.style.width = (scrollY / Math.max(1, max)) * 100 + "%";
    if (reduced) return;
    speedEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${mid * parseFloat(el.dataset.speed)}px, 0)`;
    });
    const r = pTitle.getBoundingClientRect();
    pTitle.style.setProperty("--px", `${(r.top - vh) * 0.5}px`);
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  addEventListener("load", () => { layoutEpisodes(); onScroll(); });
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layoutEpisodes(); onScroll(); }, 150); });
  layoutEpisodes();
  onScroll();
})();
