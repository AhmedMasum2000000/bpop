// OTHER EPISODES — title reveal + scroll-cycled photo, then a board of episode cards.
// Default: cards are scattered over the board and can be dragged (mouse / pen).
// Grid button: cards glide into a 3-col (2-col on mobile) grid paged 12 at a time.
(() => {
  const { D, $, $$, reduced, pad, storyUrl, observe, onScroll, onResize } = window.BP;
  const sec = $("#episodes");
  if (!sec) return;
  const head = $("#episodesHead");
  const thumb = $("#episodesThumb");
  const board = $("#episodeBoard");
  const track = $("#episodeTrack");
  const btnGrid = $("#epToggle");
  const btnNext = $("#epNext");
  const btnPrev = $("#epPrev");
  const cursor = $("#epCursor");
  const PER = 12;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ARROW = btnNext.querySelector(".ep-arrow").outerHTML;

  /* ---------- title: reveal + photo that changes with scroll ---------- */
  const shots = ["p34", "p21", "p06", "p33", "p14", "p35", "p27", "p32", "p03", "p22"];
  thumb.innerHTML = shots
    .map((n) => `<div class="ep-thumb__img"><img src="assets/posts/${n}.jpg" alt="" loading="lazy" decoding="async"></div>`)
    .join("");
  const layers = $$(".ep-thumb__img", thumb);
  let shot = 0, zTop = 1;
  layers[0].style.zIndex = ++zTop;
  function showShot(k) {
    const el = layers[k];
    el.style.zIndex = ++zTop;
    if (reduced || !el.animate) return;
    const ease = "cubic-bezier(.22,1,.36,1)";
    el.animate([{ clipPath: "inset(50%)" }, { clipPath: "inset(0%)" }], { duration: 700, easing: ease });
    el.firstElementChild.animate([{ transform: "scale(1.2)" }, { transform: "scale(1)" }], { duration: 900, easing: ease });
  }
  observe(head);
  onScroll(() => {
    if (reduced || !head.classList.contains("is-in")) return;
    const r = head.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight) return;
    const k = Math.max(0, Math.floor((innerHeight - r.top) / 300)) % layers.length;
    if (k !== shot) { shot = k; showShot(k); }
  });

  /* ---------- cards ---------- */
  const eps = D.episodes.slice().sort((a, b) => a.no - b.no);
  $("#epCount").textContent = eps.length;

  const card = (e) => {
    const no = pad(e.no);
    return `<li class="ep-slot"><article class="ep" data-href="${storyUrl(e.ref || e.id)}">
      <div class="ep__in">
        <div class="ep__main">
          <p class="ep__head"><span class="ep__no">#${no}</span><span class="ep__tag${e.outline ? " ep__tag--o" : ""}" lang="bn">${esc(e.tag)}</span></p>
          ${e.bn ? `<h3 class="ep__bn" lang="bn">${esc(e.bn)}</h3>` : ""}
          <p class="ep__en">${esc(e.title)}</p>
        </div>
        ${e.body ? `<p class="ep__desc">${esc(e.body)}</p>` : ""}
      </div>
      <a class="ep__go" href="${storyUrl(e.ref || e.id)}" data-cursor="OPEN" aria-label="Open #${no}: ${esc(e.title)}">${ARROW}</a>
    </article></li>`;
  };
  let html = "";
  for (let p = 0; p < eps.length; p += PER) html += `<ul class="episodes__page">${eps.slice(p, p + PER).map(card).join("")}</ul>`;
  track.innerHTML = html;

  const pagesEl = $$(".episodes__page", track);
  const cards = $$(".ep", track);
  const pos = cards.map(() => ({ x: 0, y: 0 }));
  const pages = pagesEl.length;
  let grid = false, page = 0, z = cards.length + 1, lastW = 0, lastPointer = "mouse";

  const put = (i) => { cards[i].style.transform = `translate3d(${pos[i].x}px, ${pos[i].y}px, 0)`; };

  // Let the cards glide for one transition (toggles only — not drags or resizes).
  let animT;
  function glide(ms = 1300) {
    if (reduced) return;
    board.classList.add("is-anim");
    clearTimeout(animT);
    animT = setTimeout(() => board.classList.remove("is-anim"), ms);
  }

  // Scatter: stratified random spots so even a few dozen cards blanket the board,
  // spilling a little past every edge like a pile of paper.
  function scatter(spread = 0.18) {
    const W = board.clientWidth, H = board.clientHeight;
    const cw = cards[0].offsetWidth, ch = cards[0].offsetHeight;
    const n = cards.length;
    const cols = Math.max(2, Math.round(Math.sqrt((n * W) / H)));
    const rows = Math.ceil(n / cols);
    const cellW = (W - cw * 0.4) / cols, cellH = (H - ch * 0.45) / rows;
    const cells = shuffle([...Array(cols * rows).keys()]).slice(0, n);
    const stack = shuffle([...Array(n).keys()]);
    cards.forEach((c, i) => {
      const li = c.parentElement;
      const k = cells[i];
      const x = -cw * 0.3 + ((k % cols) + Math.random()) * cellW;
      const y = -ch * 0.25 + (Math.floor(k / cols) + Math.random()) * cellH;
      pos[i] = { x: x - li.offsetLeft, y: y - li.offsetTop };
      c.style.zIndex = stack[i] + 1;
      c.style.transitionDelay = reduced ? "" : `${(Math.random() * spread).toFixed(3)}s`;
      put(i);
    });
    z = n + 1;
  }

  function lineUp() {
    cards.forEach((c, i) => {
      pos[i] = { x: 0, y: 0 };
      c.style.zIndex = "";
      c.style.transitionDelay = reduced ? "" : `${((i % PER) * 0.025).toFixed(3)}s`;
      put(i);
    });
  }

  function setPage(p) {
    page = Math.max(0, Math.min(pages - 1, p));
    track.style.transform = page ? `translate3d(${-100 * page}%, 0, 0)` : "";
    btnPrev.disabled = page <= 0;
    btnNext.disabled = page >= pages - 1;
    // off-screen pages shouldn't take focus while the grid is paged
    pagesEl.forEach((ul, k) => { ul.inert = grid && k !== page; });
  }

  // grid icon: nine dots that jump to random offsets (hover, or while in grid mode)
  const dots = $$(".ep-btn__dots i", btnGrid);
  const shuffleDots = () => dots.forEach((d) => {
    d.style.setProperty("--rx", `${Math.round(Math.random() * 200 - 100)}%`);
    d.style.setProperty("--ry", `${Math.round(Math.random() * 200 - 100)}%`);
  });
  shuffleDots();

  function setGrid(on) {
    grid = on;
    board.classList.toggle("is-grid", on);
    btnGrid.setAttribute("aria-pressed", String(on));
    btnGrid.setAttribute("aria-label", on ? "Scatter the episodes again" : "Line the episodes up in a grid");
    btnNext.hidden = btnPrev.hidden = !on;
    shuffleDots();
    glide();
    setPage(0);
    on ? lineUp() : scatter();
    dealt = true;
    float();
  }
  btnGrid.addEventListener("click", () => setGrid(!grid));
  btnNext.addEventListener("click", () => setPage(page + 1));
  btnPrev.addEventListener("click", () => setPage(page - 1));

  // drag. Mouse / pen: press and drag. Touch: a sideways swipe picks the card up at
  // once, or press-and-hold lifts it for any direction; a plain vertical swipe keeps
  // scrolling the page (cards are `touch-action: pan-y`) and a tap opens the story.
  board.addEventListener("pointerdown", (e) => { lastPointer = e.pointerType; }, true);
  cards.forEach((c, i) => {
    let id = null, sx = 0, sy = 0, ox = 0, oy = 0, hold = 0;
    let touch = false, armed = false, dragging = false, skipClick = false;
    const lift = () => {
      dragging = true;
      c.style.zIndex = ++z;
      c.classList.add("is-drag");
      if (touch) c.classList.add("is-lift");
      cursor.classList.add("is-down");
    };
    c.addEventListener("pointerdown", (e) => {
      if (grid || !e.isPrimary || e.target.closest("a")) return;
      touch = e.pointerType === "touch";
      if (!touch && e.button !== 0) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; ox = pos[i].x; oy = pos[i].y;
      armed = dragging = skipClick = false;
      clearTimeout(hold);
      if (!touch) {
        e.preventDefault();
        c.setPointerCapture(id);
        lift();
        return;
      }
      hold = setTimeout(() => {
        if (id === null || dragging) return;
        armed = true;
        c.style.zIndex = ++z;
        c.classList.add("is-lift");
        if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) {}
      }, 300);
    });
    c.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragging) {
        if (!touch) return;
        if (armed || (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2)) {
          try { c.setPointerCapture(id); } catch (_) {}
          lift();
        } else {
          if (Math.abs(dx) + Math.abs(dy) > 12) clearTimeout(hold);   // the page is scrolling
          return;
        }
      }
      const li = c.parentElement, W = board.clientWidth, H = board.clientHeight;
      const x = Math.max(60 - c.offsetWidth, Math.min(W - 60, li.offsetLeft + ox + dx));
      const y = Math.max(60 - c.offsetHeight, Math.min(H - 60, li.offsetTop + oy + dy));
      pos[i] = { x: x - li.offsetLeft, y: y - li.offsetTop };
      put(i);
    });
    // once a touch drag (or a held card) owns the finger, keep the page still
    c.addEventListener("touchmove", (e) => { if ((dragging || armed) && e.cancelable) e.preventDefault(); }, { passive: false });
    const end = (e) => {
      if (e.pointerId !== id) return;
      clearTimeout(hold);
      if (dragging || armed) skipClick = true;
      id = null; armed = dragging = false;
      c.classList.remove("is-drag", "is-lift");
      cursor.classList.remove("is-down");
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    c.addEventListener("contextmenu", (e) => { if (touch && (armed || dragging || skipClick)) e.preventDefault(); });
    // touch taps anywhere on a card, and clicks in grid mode, open the story
    c.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      if (skipClick) { skipClick = false; return; }
      if (grid || lastPointer === "touch") location.href = c.dataset.href;
    });
    // keyboard: bring a buried card to the front when its link gets focus
    c.addEventListener("focusin", () => { if (!grid) c.style.zIndex = ++z; });
  });

  /* ---------- touch screens: deal the cards out on entry, then let them float ----------
     Phones get no hover/drag cursor, so the motion has to come from the page itself:
     the cards start lined up and are thrown across the board the first time it scrolls
     into view, and while scrolling each card drifts at its own rate like loose paper. */
  const touchUI = !matchMedia("(hover: hover) and (pointer: fine)").matches;
  let dealt = !touchUI || reduced;
  if (touchUI) board.classList.add("is-touch");
  const drift = cards.map(() => (Math.random() * 2 - 1) * (0.45 + Math.random() * 0.55));
  function float() {
    if (!touchUI || reduced) return;
    const r = board.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) return;
    const p = (innerHeight - r.top) / (innerHeight + r.height) - 0.5;   // -.5 … .5 across the pass
    const amp = Math.min(70, innerHeight * 0.09);
    cards.forEach((c, i) => {
      c.style.translate = grid || !dealt ? "" : `0 ${(p * 2 * amp * drift[i]).toFixed(1)}px`;
    });
  }
  if (!dealt && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((ens) => {
      if (!ens.some((en) => en.isIntersecting)) return;
      io.disconnect();
      dealt = true;
      if (grid) return;
      glide(2200);
      scatter(0.7);
      float();
    }, { rootMargin: "0px 0px -25% 0px" });
    io.observe(board);
  } else dealt = true;
  onScroll(float);

  /* ---------- cursor badge (fine pointers) ---------- */
  if (!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    board.classList.add("has-cursor");
    const label = cursor.firstElementChild;
    let mx = 0, my = 0, tx = 0, ty = 0, cx = 0, cy = 0, inside = false, raf = 0, hover = null;
    const aim = () => { const r = board.getBoundingClientRect(); tx = mx - r.left; ty = my - r.top; };
    const tick = () => {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const say = () => {
      const t = hover && hover.closest("[data-cursor]");
      const txt = t ? t.dataset.cursor : cursor.classList.contains("is-down") ? "DROP" : grid ? "OPEN" : "DRAG";
      if (label.textContent !== txt) label.textContent = txt;
    };
    board.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY; hover = e.target;
      aim();
      if (!inside) { inside = true; cx = tx; cy = ty; cursor.classList.add("is-on"); }
      say();
      if (!raf) raf = requestAnimationFrame(tick);
    });
    board.addEventListener("pointerdown", say);
    board.addEventListener("pointerup", () => requestAnimationFrame(say));
    board.addEventListener("pointerleave", () => { inside = false; cursor.classList.remove("is-on"); });
    onScroll(() => { if (inside) { aim(); if (!raf) raf = requestAnimationFrame(tick); } });
  }

  /* ---------- init + resize ---------- */
  function layout() {
    const W = board.clientWidth;
    if (W === lastW) return;            // ignore mobile URL-bar height jitter
    lastW = W;
    if (grid) setPage(page); else if (dealt) scatter(); else lineUp();
    float();
  }
  layout();
  onResize(layout);
})();
