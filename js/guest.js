// GUEST — counting header with scroll-swapped images, a two-column grid of coloured tiles that cut away on
// hover to reveal the guest's artwork, and a black VIEW ALL / CLOSE marquee bar that opens the rest of the grid.
(() => {
  const { D, $, $$, reduced, onScroll, storyUrl, fillMarquee } = window.BP;
  const grid = $("#guestGrid");
  if (!grid) return;
  const SHOWN = 6; // tiles visible before VIEW ALL
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const guests = D.guests;

  // ---------- tiles ----------
  grid.innerHTML = guests
    .map((g, i) => {
      const name = g.name.filter(Boolean).map(esc).join("<br>");
      const nos = esc(g.nos);
      const plain = nos.replace(/^#/, "");
      return `
    <li class="gt${i >= SHOWN ? " is-extra" : ""}" style="--c:${esc(g.color)}">
      <a class="gt__link" href="${storyUrl(g.id)}">
        <div class="gt__card">
          <div class="gt__cols">
            <div class="gt__main">
              <p class="gt__nos gt__nos--sp">${nos},</p>
              <h3 class="gt__name">${name}</h3>
              <p class="gt__credit" lang="bn">গেস্ট : ${esc(g.nameBn || g.name.join(" "))}</p>
              <p class="gt__body">${esc(g.body)}</p>
            </div>
            <div class="gt__side">
              <p class="gt__nos gt__nos--pc">${nos},</p>
              <p class="gt__vert" lang="bn">${esc(g.bn)}</p>
            </div>
          </div>
          <div class="gt__strip" aria-hidden="true"><span class="marquee__track"></span></div>
        </div>
        <div class="gt__under" aria-hidden="true">
          <img class="gt__bg" src="${esc(g.img)}" alt="" loading="lazy" decoding="async">
          <img class="gt__pic" src="${esc(g.img)}" alt="" loading="lazy" decoding="async">
          <p class="gt__big">${plain},<br>${name}</p>
        </div>
      </a>
    </li>`;
    })
    .join("");
  $$(".gt__strip .marquee__track", grid).forEach((t, i) => {
    fillMarquee(t, "STORY DETAIL.", 6);
    t.style.animationDelay = -(i * 2.3) + "s";
  });

  // ---------- VIEW ALL / CLOSE ----------
  const more = $("#guestMore");
  const track = $(".gs-more__track", more);
  track.classList.add("marquee__track");
  const setLabel = (open) => fillMarquee(track, open ? "CLOSE" : "VIEW ALL", 8);
  if (guests.length > SHOWN) {
    setLabel(false);
    more.setAttribute("aria-label", "View all guests");
    more.addEventListener("click", () => {
      const open = !grid.classList.contains("is-open");
      grid.classList.toggle("is-open", open);
      more.setAttribute("aria-expanded", String(open));
      more.setAttribute("aria-label", open ? "Show fewer guests" : "View all guests");
      setLabel(open);
      // after closing, keep the bar on screen instead of leaving the reader below the shortened grid
      const b = more.getBoundingClientRect();
      if (!open && b.top < 0) scrollTo({ top: scrollY + b.top - innerHeight * 0.6, behavior: "auto" });
    });
  } else {
    // nothing hidden: the bar becomes a link to the full archive on Instagram
    setLabel(false);
    more.setAttribute("aria-label", "View all on Instagram");
    more.addEventListener("click", () => open(D.links.instagram, "_blank", "noopener"));
  }

  // ---------- header: counter + scroll-swapped images ----------
  const head = $("#gsHead");
  const count = $("#guestCount");
  count.textContent = reduced ? guests.length : 0;

  function scrollImages(box, srcs, step) {
    // each frame is one image, or a strip of several (keeps the wide header crisp with portrait artwork)
    box.innerHTML = srcs
      .map((s) => `<span class="gs-frame">${[].concat(s).map((x) => `<img src="${esc(x)}" alt="" decoding="async">`).join("")}</span>`)
      .join("");
    const imgs = [...box.children];
    let cur = -1, z = 1;
    const show = (i) => {
      if (i === cur) return;
      const prev = imgs[cur], next = imgs[i];
      imgs.forEach((im) => im !== prev && im !== next && im.classList.remove("is-on", "is-prev"));
      if (prev) prev.classList.replace("is-on", "is-prev");
      next.classList.remove("is-on", "is-prev");
      next.style.zIndex = ++z;
      void next.offsetWidth;
      next.classList.add("is-on");
      cur = i;
    };
    return { show, update: () => show(Math.floor(scrollY / step) % imgs.length) };
  }
  const strips = guests.map((g, i) => [g.img, guests[(i + 3) % guests.length].img, guests[(i + 5) % guests.length].img]);
  const wide = scrollImages($("#gsWide"), strips, 250);
  const tall = scrollImages($("#gsTall"), ["assets/posts/p20.jpg", "assets/posts/p25.jpg", "assets/posts/p12.jpg", "assets/posts/p23.jpg", "assets/posts/p29.jpg", "assets/posts/p05.jpg"], 160);

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

  let on = false;
  new IntersectionObserver(
    (entries, io) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      head.classList.add("is-in");
      on = true;
      wide.show(0);
      tall.show(0);
      countUp(count, guests.length);
      io.disconnect();
    }),
    { threshold: 0.35 }
  ).observe(head);
  onScroll(() => {
    if (!on || reduced) return;
    wide.update();
    tall.update();
  });
})();
