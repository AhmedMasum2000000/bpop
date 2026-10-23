// HIGHLIGHT — split title with an image that changes as you scroll, a counting #, and story rows framed by
// thick outline strokes that draw in, wobble away from the cursor and leave a trail of post artwork behind it.
(() => {
  const { D, $, $$, reduced, observe, onScroll, onResize, storyUrl, fillMarquee } = window.BP;
  const section = $("#highlight");
  const list = $("#highlightList");
  if (!section || !list) return;

  const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isDesk = () => innerWidth >= 768;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- title ----------
  const head = $("#hlHead");
  const count = $("#hlCount");
  const media = $("#hlMedia");
  const total = D.highlights.length;
  count.textContent = reduced ? total : 0;

  // image stack that swaps every `step` px of scroll; the newest image opens from the centre on top
  function scrollImages(box, srcs, step) {
    box.innerHTML = srcs.map((s) => `<img src="${esc(s)}" alt="" decoding="async">`).join("");
    const imgs = [...box.children];
    let cur = -1, z = 1;
    const show = (i) => {
      if (i === cur) return;
      const prev = imgs[cur], next = imgs[i];
      imgs.forEach((im) => im !== prev && im !== next && (im.className = ""));
      if (prev) prev.className = "is-prev";
      next.className = "";
      next.style.zIndex = ++z;
      void next.offsetWidth;
      next.className = "is-on";
      cur = i;
    };
    return { show, update: () => show(Math.floor(scrollY / step) % imgs.length) };
  }
  const headImgs = scrollImages(media, D.highlights.map((h) => h.img).concat(["assets/posts/p09.jpg", "assets/posts/p20.jpg"]), 180);

  function countUp(el, to, dur = 1000) {
    if (reduced) return (el.textContent = to);
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  let headOn = false;
  new IntersectionObserver(
    (entries, io) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      head.classList.add("is-in");
      headOn = true;
      headImgs.show(0);
      countUp(count, total);
      io.disconnect();
    }),
    { threshold: 0.35 }
  ).observe(head);

  // ---------- outline shapes (B-POP originals, drawn in a 1000 x 1000 box, stretched to each row) ----------
  const burst = (() => {
    const outer = [492, 468, 500, 452, 496, 478, 470, 500, 458, 490, 474, 500, 462];
    const inner = [330, 352, 318, 342, 334, 326, 346, 330, 352, 320, 340, 330, 346];
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? inner[(i - 1) / 2] : outer[i / 2];
      pts.push([500 + r * Math.cos(a), 500 + r * Math.sin(a)]);
    }
    return pts;
  })();
  const SHAPES = [
    // A: tilted five-sided frame
    { pts: [[150, 25], [925, 165], [988, 840], [185, 985], [22, 590]] },
    // B: zig-zag crown
    { pts: [[45, 190], [300, 30], [520, 150], [800, 15], [980, 260], [920, 600], [975, 960], [610, 880], [300, 995], [40, 860], [110, 520]] },
    // C: soft blob
    { d: "M260,60 C560,-20 860,40 955,230 C1030,380 950,560 985,730 C1015,900 800,1000 540,955 C330,920 120,1010 40,820 C-25,660 70,520 25,350 C-10,190 90,100 260,60 Z" },
    // D: sticker starburst
    { pts: burst },
    // E: wavy cloud
    { d: "M110,190 C250,50 400,180 560,100 C720,20 900,70 955,250 C1000,410 905,520 960,690 C1010,850 860,990 680,945 C520,905 410,1000 250,955 C80,905 -5,770 55,610 C105,470 -15,330 110,190 Z" },
  ];
  const VARIANTS = ["a", "b", "c", "d", "e"];
  const SVGNS = "http://www.w3.org/2000/svg";

  // sample a curve once in its 1000-box so it can be stretched to any size later
  const probe = document.createElementNS(SVGNS, "path");
  const probeSvg = document.createElementNS(SVGNS, "svg");
  probeSvg.setAttribute("width", "0");
  probeSvg.setAttribute("height", "0");
  probeSvg.style.position = "absolute";
  probeSvg.appendChild(probe);
  document.body.appendChild(probeSvg);
  SHAPES.forEach((s) => {
    if (!s.d) return;
    probe.setAttribute("d", s.d);
    const L = probe.getTotalLength();
    s.pts = [];
    for (let i = 0; i < 400; i++) {
      const p = probe.getPointAtLength((i / 400) * L);
      s.pts.push([p.x, p.y]);
    }
    s.smooth = true;
  });
  probeSvg.remove();

  // resample a closed polygon (in px) to evenly spaced points; corners of hard shapes are kept exactly
  function resample(pts, gap, keepCorners) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (keepCorners) {
        const n = Math.max(1, Math.round(len / gap));
        for (let k = 0; k < n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
      } else out.push([x0, y0]);
    }
    return out;
  }

  // ---------- rows ----------
  list.innerHTML = D.highlights
    .map((h, i) => {
      const v = VARIANTS[i % VARIANTS.length];
      const lines = (h.lines && h.lines.length ? h.lines : [h.title]).map((l) => `<span class="hl__ln">${esc(l)}</span>`).join("");
      const bn = (h.bnLines && h.bnLines.length ? h.bnLines : [h.bn]).map(esc).join("<br>");
      const isGuest = (h.role || "Guest") === "Guest";
      const creditBn = isGuest ? `গেস্ট : ${esc(h.guestBn || h.guest)}` : esc(h.guestBn || h.guest);
      const creditEn = isGuest ? `Guest: ${esc(h.guest)}` : esc(h.guest);
      const url = storyUrl(h.id);
      return `
    <article class="hl hl--${v}" style="--c:${esc(h.color)}" data-i="${i}">
      <div class="hl__frame" aria-hidden="true"><svg class="hl__stroke" xmlns="${SVGNS}"><path/></svg></div>
      <div class="hl__inner">
        <p class="hl__no">#${esc(h.no)}</p>
        <h3 class="hl__title"><a href="${url}">${lines}</a></h3>
        <div class="hl__lower">
          <div class="hl__meta">
            <p class="hl__credit"><span class="hl__credit-bn" lang="bn">${creditBn}</span><span class="hl__credit-en">${creditEn}</span></p>
            <span class="hl__rule" aria-hidden="true"></span>
            <p class="hl__bn" lang="bn">${bn}</p>
          </div>
          <div class="hl__side">
            <div class="hl__body">${h.bnBody ? `<p lang="bn">${esc(h.bnBody)}</p>` : ""}<p>${esc(h.body)}</p></div>
            <a class="hl__pill" href="${url}" aria-label="Story detail: ${esc(h.title)}"><span class="marquee__track" aria-hidden="true"></span></a>
          </div>
        </div>
      </div>
      <div class="hl__trail" aria-hidden="true"></div>
    </article>`;
    })
    .join("");
  $$(".hl__pill .marquee__track", list).forEach((t) => fillMarquee(t, "STORY DETAIL.", 4));

  const rows = $$(".hl", list).map((el, i) => {
    const shape = SHAPES[i % SHAPES.length];
    const svg = $(".hl__stroke", el);
    return { el, svg, path: $("path", svg), shape, i, W: 0, H: 0, n: 0, rx: null, ry: null, x: null, y: null, vx: null, vy: null, drawn: false, visible: false, settled: true, trail: null };
  });

  function build(r) {
    const W = r.svg.clientWidth, H = r.svg.clientHeight;
    if (!W || !H) return;
    r.W = W; r.H = H;
    r.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const px = r.shape.pts.map(([x, y]) => [(x / 1000) * W, (y / 1000) * H]);
    const pts = resample(px, 14, !r.shape.smooth);
    const n = pts.length;
    r.n = n;
    r.settled = true;
    r.rx = new Float32Array(n); r.ry = new Float32Array(n);
    r.x = new Float32Array(n); r.y = new Float32Array(n);
    r.vx = new Float32Array(n); r.vy = new Float32Array(n);
    pts.forEach(([x, y], k) => { r.rx[k] = r.x[k] = x; r.ry[k] = r.y[k] = y; });
    draw(r);
    if (!r.drawn && !reduced) {
      const L = r.path.getTotalLength();
      r.path.style.strokeDasharray = `${L} ${L}`;
      r.path.style.strokeDashoffset = L;
    }
  }
  function draw(r) {
    let d = "";
    for (let k = 0; k < r.n; k++) d += (k ? "L" : "M") + r.x[k].toFixed(1) + "," + r.y[k].toFixed(1);
    r.path.setAttribute("d", d + "Z");
  }
  function drawIn(r) {
    if (r.drawn) return;
    r.drawn = true;
    if (reduced) return;
    r.svg.classList.add("is-drawing");
    void r.path.getBoundingClientRect();
    r.path.style.strokeDashoffset = 0;
    const done = () => {
      r.svg.classList.remove("is-drawing");
      r.path.style.strokeDasharray = "";
      r.path.style.strokeDashoffset = "";
    };
    r.path.addEventListener("transitionend", done, { once: true });
    setTimeout(done, 2200);
  }
  const buildAll = () => rows.forEach(build);
  buildAll();
  onResize(buildAll);
  addEventListener("load", buildAll, { once: true });

  // draw strokes in as each row arrives
  const rowIo = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      const r = rows[+en.target.dataset.i];
      r.visible = en.isIntersecting;
      if (en.isIntersecting && en.intersectionRatio > 0.12) drawIn(r);
    }),
    { threshold: [0, 0.12, 0.3] }
  );
  rows.forEach((r) => rowIo.observe(r.el));

  // ---------- cursor wobble: points near the pointer are pushed away, then spring back ----------
  let raf = 0;
  const RADIUS = 230, PUSH = 2.4, SPRING = 0.075, DAMP = 0.84;
  let lastX = 0, lastY = 0;
  function poke(cx, cy) {
    const speed = Math.min(60, Math.hypot(cx - lastX, cy - lastY));
    lastX = cx; lastY = cy;
    if (speed < 0.5) return;
    let hit = false;
    rows.forEach((r) => {
      if (!r.visible || !r.n || !r.drawn) return;
      const b = r.svg.getBoundingClientRect();
      const mx = cx - b.left, my = cy - b.top;
      if (mx < -RADIUS || my < -RADIUS || mx > b.width + RADIUS || my > b.height + RADIUS) return;
      for (let k = 0; k < r.n; k++) {
        const dx = r.x[k] - mx, dy = r.y[k] - my;
        const dist = Math.hypot(dx, dy);
        if (dist > RADIUS || dist < 0.01) continue;
        const f = Math.pow(1 - dist / RADIUS, 2) * PUSH * (speed / 12);
        r.vx[k] += (dx / dist) * f;
        r.vy[k] += (dy / dist) * f;
        r.settled = false;
        hit = true;
      }
    });
    if (hit && !raf) raf = requestAnimationFrame(step);
  }
  function step() {
    let active = false;
    rows.forEach((r) => {
      if (!r.n || r.settled) return;
      let e = 0;
      for (let k = 0; k < r.n; k++) {
        r.vx[k] = (r.vx[k] + (r.rx[k] - r.x[k]) * SPRING) * DAMP;
        r.vy[k] = (r.vy[k] + (r.ry[k] - r.y[k]) * SPRING) * DAMP;
        r.x[k] += r.vx[k];
        r.y[k] += r.vy[k];
        e += Math.abs(r.vx[k]) + Math.abs(r.vy[k]) + Math.abs(r.rx[k] - r.x[k]) + Math.abs(r.ry[k] - r.y[k]);
      }
      if (e > 0.02 * r.n) active = true;
      else {
        r.x.set(r.rx); r.y.set(r.ry); r.vx.fill(0); r.vy.fill(0);
        r.settled = true;
      }
      draw(r);
    });
    raf = active ? requestAnimationFrame(step) : 0;
  }

  // ---------- image trail ----------
  function makeTrail(r, srcs) {
    const box = $(".hl__trail", r.el);
    const imgs = srcs.map((s) => {
      const im = new Image();
      im.alt = "";
      im.decoding = "async";
      im.loading = "lazy";
      im.src = s;
      box.appendChild(im);
      return im;
    });
    let k = 0, z = 1, lx = -1e4, ly = -1e4;
    return (x, y, gap) => {
      if (Math.hypot(x - lx, y - ly) < gap) return;
      lx = x; ly = y;
      const im = imgs[k++ % imgs.length];
      im.getAnimations().forEach((a) => a.cancel());
      im.style.left = x + "px";
      im.style.top = y + "px";
      im.style.zIndex = ++z;
      const rot = (Math.random() * 14 - 7).toFixed(1);
      const t = (s) => `translate(-50%, -50%) rotate(${rot}deg) scale(${s})`;
      im.animate(
        [
          { opacity: 1, transform: t(0.55) },
          { opacity: 1, transform: t(1), offset: 0.22 },
          { opacity: 1, transform: t(1), offset: 0.62 },
          { opacity: 0, transform: t(0.9) },
        ],
        { duration: 1150, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" }
      );
    };
  }

  if (!reduced) {
    rows.forEach((r) => {
      const h = D.highlights[r.i];
      r.trail = makeTrail(r, h.trail && h.trail.length ? h.trail : [h.img]);
    });

    if (canHover) {
      addEventListener("pointermove", (e) => poke(e.clientX, e.clientY), { passive: true });
      rows.forEach((r) =>
        r.el.addEventListener("pointermove", (e) => {
          const b = r.el.getBoundingClientRect();
          r.trail(e.clientX - b.left, e.clientY - b.top, isDesk() ? 110 : 80);
        })
      );
    } else {
      // touch screens: scrolling walks a virtual cursor through the row that is in the middle of the screen
      onScroll(() => {
        const mid = innerHeight * 0.55;
        rows.forEach((r) => {
          if (!r.visible) return;
          const b = r.el.getBoundingClientRect();
          const y = mid - b.top;
          if (y < 40 || y > b.height - 40) return;
          const x = b.width * (0.5 + 0.34 * Math.sin(scrollY / 140 + r.i * 1.7));
          r.trail(x, y, 150);
        });
      });
    }
  }

  // ---------- scroll-driven header image ----------
  onScroll(() => {
    if (headOn && !reduced) headImgs.update();
  });
})();
