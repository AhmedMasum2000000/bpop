(() => {
  const { D, $, reduced, onScroll } = window.BP;
  const bg = $("#personalityBg");
  const imgs = ["p06", "p14", "p21", "p33", "p27"].map((n) => {
    const im = document.createElement("img");
    im.src = `assets/posts/${n}.jpg`;
    im.alt = "";
    im.loading = "lazy";
    bg.appendChild(im);
    return im;
  });
  let i = 0;
  imgs[0].classList.add("is-on");
  if (!reduced)
    setInterval(() => {
      imgs[i].classList.remove("is-on");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("is-on");
    }, 3200);

  // name positions (% of stage) and rotation, roughly a scattered credit sheet
  const spots = [
    { x: 8, y: 8, r: 3, line: { x: 10, y: 30, w: 38, r: 4 } },
    { x: 4, y: 34, r: 18, line: { x: 30, y: 62, w: 30, r: -38 } },
    { x: 92, y: 4, r: 90 },
    { x: 56, y: 70, r: -22, line: { x: 54, y: 52, w: 28, r: -62 } },
  ];
  $("#personalityNames").innerHTML = D.team
    .map((m, k) => {
      const s = spots[k % spots.length];
      const line = s.line
        ? `<span class="pn__rule" style="left:${s.line.x}%;top:${s.line.y}%;width:${s.line.w}%;transform:rotate(${s.line.r}deg)"></span>`
        : "";
      return `<div class="pn" style="left:${s.x}%;top:${s.y}%;transform:rotate(${s.r}deg)">
        <span class="pn__name">${m.name}</span><span class="pn__role">${m.role}</span></div>${line}`;
    })
    .join("");

  const title = $(".personality__title");
  onScroll(() => {
    if (reduced) return;
    const r = title.getBoundingClientRect();
    title.style.setProperty("--px", `${(r.top - innerHeight) * 0.5}px`);
  });
})();
