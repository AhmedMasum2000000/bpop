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
    { name: [232, 34, 5], role: [112, 82, -18], bio: [60, 150, 7], line: [88, 222, 960, -1.4],
      mname: [20, 22, 3], mrole: [36, 116, -14], mbio: [158, 102, 6], mline: [16, 176, 342, 7], mmax: 300 },
    { name: [168, 292, -3], role: [960, 352, 9], bio: [650, 380, 3.5], line: [150, 452, 600, 7],
      mname: [26, 226, -8], mrole: [262, 298, 10], mbio: [22, 292, 5], mline: [190, 380, 170, -42] },
    { name: [962, 352, 83], role: [1290, 706, -48], bio: [1272, 150, 97], line: [1186, 22, 760, 84],
      mname: [168, 500, 82], mrole: [300, 682, -58], mbio: [196, 404, 94], mline: [244, 400, 280, 82] },
    { name: [10, 538, 17], role: [56, 642, -8], bio: [196, 694, 4], line: [640, 808, 400, -53],
      mname: [12, 430, 14], mrole: [22, 386, -6], mbio: [30, 512, 4], mline: [14, 580, 220, 5] },
    { name: [490, 648, -14], role: [1010, 770, 9], bio: [900, 420, -6], line: [690, 575, 440, -14],
      mname: [14, 640, 13], mrole: [186, 742, -6], mbio: [150, 600, -4], mline: [10, 722, 170, -14], mmax: 360 },
  ];
  const ETC = { role: [112, 792, -7.5], line: [58, 768, 420, 2] };

  const vars = (d, m, w, mw) =>
    `--x:${d[0]};--y:${d[1]};--r:${d[d.length - 1]}deg;--mx:${m[0]};--my:${m[1]};--mr:${m[m.length - 1]}deg` +
    (w ? `;--w:${w};--mw:${mw}` : "");

  list.innerHTML = D.team
    .map((m, k) => {
      const s = SPOTS[k % SPOTS.length];
      return `<li class="pn pn--${(k % SPOTS.length) + 1}" data-k="${k}"${s.mmax ? ` style="--mmax:${s.mmax}"` : ""}>
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

  /* ---------- strokes that bend under the cursor (desktop, fine pointer) ---------- */
  const desk = matchMedia("(min-width: 768px)");
  if (reduced || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const N = 64;                 // points per stroke
  const REACH = 70;             // px either side of the stroke that grabs it
  const lines = $$(".pn__line", stage).map((el) => {
    el.innerHTML = `<svg aria-hidden="true" preserveAspectRatio="none"><path/></svg>`;
    const r = parseFloat(getComputedStyle(el).getPropertyValue("--r")) || 0;
    return { el, svg: el.firstChild, path: el.firstChild.firstChild, a: (r * Math.PI) / 180, L: 0,
      d: new Float32Array(N), v: new Float32Array(N), grab: null };
  });

  function size() {
    lines.forEach((ln) => {
      ln.L = ln.el.offsetWidth;
      ln.svg.setAttribute("viewBox", `0 0 ${ln.L} 10`);
      draw(ln);
    });
  }
  function draw(ln) {
    const step = ln.L / (N - 1);
    let p = `M0 ${5 + ln.d[0]}`;
    for (let i = 1; i < N - 1; i++) {
      const x = i * step, y = 5 + ln.d[i];
      const nx = x + step / 2, ny = 5 + (ln.d[i] + ln.d[i + 1]) / 2;
      p += ` Q${x.toFixed(1)} ${y.toFixed(2)} ${nx.toFixed(1)} ${ny.toFixed(2)}`;
    }
    p += ` L${ln.L} ${5 + ln.d[N - 1]}`;
    ln.path.setAttribute("d", p);
  }

  let mx = -1e4, my = -1e4, raf = 0, near = false;
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
      const step = ln.L / (N - 1), d = ln.d, v = ln.v, g = ln.grab;
      for (let i = 1; i < N - 1; i++) {
        let f = -0.05 * d[i] + 0.35 * (d[i - 1] + d[i + 1] - 2 * d[i]);
        if (g) {
          const t = (i * step - g.u) / 46;
          f += Math.exp(-t * t) * (Math.max(-46, Math.min(46, g.w)) - d[i]) * 0.22;
        }
        v[i] = (v[i] + f) * 0.86;
      }
      for (let i = 1; i < N - 1; i++) {
        d[i] += v[i];
        if (Math.abs(v[i]) > 0.02 || Math.abs(d[i]) > 0.05) moving = true;
      }
      draw(ln);
    });
    raf = moving || near ? requestAnimationFrame(tick) : 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !desk.matches) return;
    const r = stage.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    mx = e.clientX; my = e.clientY;
    aim();
    if (near) wake();
  }, { passive: true });
  stage.addEventListener("pointerleave", () => { lines.forEach((ln) => (ln.grab = null)); near = false; wake(); });
  onScroll(() => { if (near) { aim(); wake(); } });
  size();
  onResize(size);
})();
