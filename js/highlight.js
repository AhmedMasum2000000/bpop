(() => {
  const { D, $, fillMarquee, observe, storyUrl } = window.BP;
  const strokes = [
    "M-50,330 C180,120 320,120 460,260 S760,520 920,300 S1180,60 1300,180",
    "M-40,120 L380,60 L760,140 L1040,40 L1280,200 L1060,560 L-40,600",
    "M-60,420 C120,300 260,520 420,400 S700,160 860,320 S1120,560 1300,360",
    "M1300,520 C1000,600 780,420 640,520 S280,640 120,460 S-40,180 140,80",
    "M-60,250 Q160,40 380,250 T820,250 T1300,250",
  ];
  const list = $("#highlightList");
  list.innerHTML = D.highlights
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
  list.querySelectorAll(".hl__pill .marquee__track").forEach((t) => fillMarquee(t, "STORY DETAIL&nbsp;·&nbsp;", 6));
  const count = $("#hlCount");
  count.textContent = D.highlights.length;
  const rows = [...list.querySelectorAll(".hl")];
  observe(rows);
  const hlIo = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.isIntersecting && (count.textContent = en.target.dataset.index)),
    { rootMargin: "-45% 0px -45% 0px" }
  );
  rows.forEach((el) => hlIo.observe(el));
})();
