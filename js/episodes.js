(() => {
  const { D, $, pad, storyUrl, onResize } = window.BP;
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

  function layout() {
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

  layout();
  onResize(layout);
})();
