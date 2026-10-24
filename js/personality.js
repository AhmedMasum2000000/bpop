// PERSONALITY — title reveal + scroll-cycled photo, then the credit-sheet stage:
// rotated names over a grayscale background that switches to a member's photo on hover,
// and thick white strokes that bend under the cursor and spring back.
(() => {
  const { D, $, $$, reduced, observe, onScroll, onResize } = window.BP;
  const sec = $("#personality");
  if (!sec) return;
  const head = $("#personalityHead");
  const thumb = $("#personalityThumb");
  const stage = $("#personalityStage");
  const bg = $("#personalityBg");
  const list = $("#personalityNames");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- title: reveal + photo that changes with scroll ---------- */
  const shots = ["p22", "p27", "p23", "p05", "p14", "p29", "p12", "p20"];
  thumb.innerHTML = shots
    .map((n) => `<div class="pe-thumb__img"><img src="assets/posts/${n}.jpg" alt="" loading="lazy" decoding="async"></div>`)
    .join("");
  const layers = $$(".pe-thumb__img", thumb);
  let shot = 0, zTop = 1;
  layers[0].style.zIndex = ++zTop;
  observe(head);
  onScroll(() => {
    if (reduced || !head.classList.contains("is-in")) return;
    const r = head.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight) return;
    const k = Math.max(0, Math.floor((innerHeight - r.top) / 300)) % layers.length;
    if (k === shot) return;
    shot = k;
    const el = layers[k];
    el.style.zIndex = ++zTop;
    if (!el.animate) return;
    const ease = "cubic-bezier(.22,1,.36,1)";
    el.animate([{ clipPath: "inset(50%)" }, { clipPath: "inset(0%)" }], { duration: 700, easing: ease });
    el.firstElementChild.animate([{ transform: "scale(1.2)" }, { transform: "scale(1)" }], { duration: 900, easing: ease });
  });

  /* ---------- stage layout ----------
     Positions are in design units: desktop 1440 × 950, mobile 375 × 830 (see --u in CSS).
     Each entry: name / role / bio = [x, y, rotate°], line = [x, y, length, rotate°];
     m* = the mobile equivalents, mmax = mobile wrap width for the name. */
  const SPOTS = [
    { name: [262, 60, 5], role: [96, 116, -18], bio: [60, 180, 7], line: [88, 248, 960, -1.4],
      mname: [20, 24, 3], mrole: [44, 116, -12], mbio: [156, 96, 6], mline: [16, 170, 342, 7], mmax: 300 },
    { name: [168, 306, -3], role: [920, 330, 9], bio: [640, 398, 3.5], line: [150, 470, 600, 7],
      mname: [20, 232, -8], mrole: [262, 300, 12], mbio: [20, 300, 4], mline: [20, 358, 200, 6] },
    { name: [962, 352, 83], role: [1290, 706, -48], bio: [1272, 150, 97], line: [1186, 22, 760, 84],
      mname: [190, 548, 84], mrole: [264, 378, -55], mbio: [168, 500, 94], mline: [228, 424, 170, 87] },
    { name: [10, 548, 17], role: [56, 650, -8], bio: [196, 700, 4], line: [528, 812, 300, -56],
      mname: [18, 404, 8], mrole: [140, 470, -6], mbio: [20, 506, 4], mline: [14, 574, 200, 5], mmax: 200 },
    { name: [672, 566, -20], role: [1000, 774, 8], bio: [900, 410, -6], line: [930, 548, 190, -20],
      mname: [16, 616, 10], mrole: [140, 714, -6], mbio: [16, 748, 3], mline: [206, 800, 150, -30], mmax: 230, dmax: 560 },
  ];
  const ETC = { role: [112, 794, -7.5], line: [58, 770, 400, 2] };

  const vars = (d, m, w, mw) =>
    `--x:${d[0]};--y:${d[1]};--r:${d[d.length - 1]}deg;--mx:${m[0]};--my:${m[1]};--mr:${m[m.length - 1]}deg` +
    (w ? `;--w:${w};--mw:${mw}` : "");

  list.innerHTML = D.team
    .map((m, k) => {
      const s = SPOTS[k % SPOTS.length];
      return `<li class="pn pn--${(k % SPOTS.length) + 1}" data-k="${k}"${s.mmax || s.dmax ? ` style="--mmax:${s.mmax || 330};--dmax:${s.dmax || 2000}"` : ""}>
        <span class="pn__line" style="${vars(s.line, s.mline, s.line[2], s.mline[2])}" aria-hidden="true"></span>
        <h3 class="pn__name" style="${vars(s.name, s.mname)}">${esc(m.name)}</h3>
        <p class="pn__role" style="${vars(s.role, s.mrole)}">${esc(m.role)}</p>
        ${m.bio ? `<p class="pn__bio" style="${vars(s.bio, s.mbio)}">${esc(m.bio)}</p>` : ""}
      </li>`;
    })
    .join("");
  const etc = $(".pn--etc", stage);
  etc.querySelector(".pn__line").setAttribute("style", vars(ETC.line, ETC.line, ETC.line[2], ETC.line[2]));
  etc.querySelector(".pn__role").setAttribute("style", vars(ETC.role, ETC.role));

  // small credit text, built from the team list
  const credits = D.team.filter((m) => m.credit && m.credit !== "Featuring").map((m) => `${esc(m.credit)}: ${esc(m.name)}`);
  $("#personalityCredit").innerHTML =
    `Presented by B-POP Tags — Bangla Pop Tags, Dhaka<br>${credits.join(" / ")} / ` +
    `Featuring: the artists, crews and spaces we've tagged, and more`;

  /* ---------- background: base illustration, member photo while a name is hovered ---------- */
  bg.innerHTML =
    `<img class="is-base" src="assets/mascot.png" alt="" loading="lazy" decoding="async">` +
    D.team.map((m) => (m.img ? `<img src="${esc(m.img)}" alt="" loading="lazy" decoding="async">` : "<span></span>")).join("");
  const photos = [...bg.children].slice(1);
  $$(".pn__name", list).forEach((el) => {
    const k = +el.parentElement.dataset.k;
    const on = () => { photos.forEach((p, j) => p.classList.toggle("is-on", j === k && p.tagName === "IMG")); bg.classList.toggle("has-hover", photos[k] && photos[k].tagName === "IMG"); };
    const off = () => { photos[k] && photos[k].classList.remove("is-on"); bg.classList.remove("has-hover"); };
    el.addEventListener("pointerenter", on);
    el.addEventListener("pointerleave", off);
  });

  /* ---------- strokes that bend under the cursor / finger and spring back ----------
     Mouse: the stroke follows the pointer while it is near. Touch screens get the same
     string physics driven by the finger (touch + scroll) and by the page's own scroll
     speed, and each stroke draws itself in the first time it enters the viewport. */
  if (reduced) return;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const N = 64;                 // points per stroke
  const REACH = fine ? 70 : 56; // px either side of the stroke that grabs it
  const lines = $$(".pn__line", stage).map((el) => {
    el.innerHTML = `<svg aria-hidden="true" preserveAspectRatio="none"><path/></svg>`;
    el.classList.add("is-svg");
    return { el, svg: el.firstChild, path: el.firstChild.firstChild, a: 0, L: 0, H: 10, A: 46,
      d: new Float32Array(N), v: new Float32Array(N), grab: null };
  });

  // angle from the rendered transform, so it is right for both the desktop (--r) and
  // mobile (--mr) layouts; viewBox in CSS px so the stroke keeps its real weight
  function size() {
    lines.forEach((ln) => {
      ln.L = ln.el.offsetWidth;
      ln.H = ln.el.offsetHeight || 10;
      ln.A = 4.6 * ln.H;                          // max bend: 46px desktop, 23px mobile
      let a = 0;
      try { const m = new DOMMatrixReadOnly(getComputedStyle(ln.el).transform); a = Math.atan2(m.b, m.a); } catch (_) {}
      ln.a = a;
      ln.svg.setAttribute("viewBox", `0 0 ${ln.L || 1} ${ln.H}`);
      draw(ln);
    });
  }
  function draw(ln) {
    const step = ln.L / (N - 1), c = ln.H / 2;
    let p = `M0 ${c + ln.d[0]}`;
    for (let i = 1; i < N - 1; i++) {
      const x = i * step, y = c + ln.d[i];
      const nx = x + step / 2, ny = c + (ln.d[i] + ln.d[i + 1]) / 2;
      p += ` Q${x.toFixed(1)} ${y.toFixed(2)} ${nx.toFixed(1)} ${ny.toFixed(2)}`;
    }
    p += ` L${ln.L} ${c + ln.d[N - 1]}`;
    ln.path.setAttribute("d", p);
  }

  let mx = -1e4, my = -1e4, raf = 0, near = false, touching = false;
  function aim() {
    near = false;
    lines.forEach((ln) => {
      const b = ln.el.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const dx = mx - cx, dy = my - cy, c = Math.cos(ln.a), s = Math.sin(ln.a);
      const u = dx * c + dy * s + ln.L / 2;      // along the stroke
      const w = -dx * s + dy * c;                // across it
      ln.grab = u > 0 && u < ln.L && Math.abs(w) < REACH ? { u, w } : null;
      if (ln.grab) near = true;
    });
  }
  function tick() {
    let moving = false;
    lines.forEach((ln) => {
      if (!ln.L) return;
      const step = ln.L / (N - 1), d = ln.d, v = ln.v, g = ln.grab, A = ln.A;
      for (let i = 1; i < N - 1; i++) {
        let f = -0.05 * d[i] + 0.35 * (d[i - 1] + d[i + 1] - 2 * d[i]);
        if (g) {
          const t = (i * step - g.u) / 46;
          f += Math.exp(-t * t) * (Math.max(-A, Math.min(A, g.w)) - d[i]) * 0.22;
        }
        v[i] = (v[i] + f) * 0.86;
      }
      for (let i = 1; i < N - 1; i++) {
        d[i] = Math.max(-1.4 * A, Math.min(1.4 * A, d[i] + v[i]));
        if (Math.abs(v[i]) > 0.02 || Math.abs(d[i]) > 0.05) moving = true;
      }
      draw(ln);
    });
    raf = moving || near ? requestAnimationFrame(tick) : 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const inView = () => { const r = stage.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  // a sideways kick shaped like a plucked string (zero at both ends)
  const kick = (ln, amt) => {
    for (let i = 1; i < N - 1; i++) ln.v[i] += amt * Math.sin((Math.PI * i) / (N - 1));
  };

  // mouse
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !inView()) return;
    mx = e.clientX; my = e.clientY;
    aim();
    if (near) wake();
  }, { passive: true });
  stage.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    lines.forEach((ln) => (ln.grab = null)); near = false; wake();
  });

  // finger: passive listeners, so they never hold up the page scroll
  const feel = (e) => {
    const t = e.touches[0];
    if (!t) return;
    touching = true;
    mx = t.clientX; my = t.clientY;
    aim();
    wake();
  };
  const letGo = (e) => {
    if (e.touches.length) return;
    touching = false; mx = my = -1e4;
    lines.forEach((ln) => (ln.grab = null)); near = false; wake();
  };
  stage.addEventListener("touchstart", feel, { passive: true });
  stage.addEventListener("touchmove", feel, { passive: true });
  stage.addEventListener("touchend", letGo, { passive: true });
  stage.addEventListener("touchcancel", letGo, { passive: true });

  // scrolling: re-aim under a resting finger / mouse, and on touch screens let the
  // strokes lag behind the page so they sway with the scroll speed
  let lastY = scrollY;
  onScroll(() => {
    const y = scrollY, dy = y - lastY;
    lastY = y;
    if (near || touching) { aim(); wake(); }
    if (fine || !dy || !inView()) return;
    const k = Math.max(-40, Math.min(40, dy)) * 0.03;
    lines.forEach((ln) => {
      if (!ln.L) return;
      const b = ln.el.getBoundingClientRect();
      if (b.bottom < 0 || b.top > innerHeight) return;
      const c = Math.cos(ln.a);
      kick(ln, -k * (c < 0 ? -1 : 1) * Math.max(0.5, Math.abs(c)));
    });
    wake();
  });

  // touch screens: draw each stroke in as it arrives, then give it a pluck
  if (!fine && "IntersectionObserver" in window) {
    stage.classList.add("is-draw");
    const io = new IntersectionObserver((ens) => {
      ens.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const ln = lines.find((l) => l.el === en.target);
        en.target.classList.add("is-in");
        if (ln) setTimeout(() => { kick(ln, ln.A * 0.55); wake(); }, 650);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    lines.forEach((ln, k) => { ln.el.style.setProperty("--dl", `${(k % 3) * 0.08}s`); io.observe(ln.el); });
  }

  size();
  onResize(size);
})();
