(() => {
  const { D, $, fillMarquee, storyUrl } = window.BP;
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

  // image preview that trails the cursor
  const hover = $("#guestHover");
  let hx = 0, hy = 0, cx = 0, cy = 0, raf = 0;
  const follow = () => {
    cx += (hx - cx) * 0.18;
    cy += (hy - cy) * 0.18;
    hover.style.left = cx + "px";
    hover.style.top = cy + "px";
    raf = Math.abs(hx - cx) + Math.abs(hy - cy) > 0.5 ? requestAnimationFrame(follow) : 0;
  };
  grid.addEventListener("pointermove", (e) => {
    hx = e.clientX + 120;
    hy = e.clientY;
    if (!raf) raf = requestAnimationFrame(follow);
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
})();
