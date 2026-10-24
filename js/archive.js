// "All Tags" archive on the home page. The server/build renders it into the HTML (data-ssr="1");
// when the raw index.html is served as-is (data-ssr="0") it is built here from js/posts.js instead.
(() => {
  const sec = document.getElementById("archive");
  const P = window.BPOP_POSTS;
  if (!sec || sec.dataset.ssr === "1" || !P || !Array.isArray(P.posts)) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const cats = Object.fromEntries(P.categories.map((c) => [c.slug, c]));
  const newest = P.posts.slice().sort((a, b) => b.date.localeCompare(a.date) || b.no - a.no);
  const count = (slug) => P.posts.filter((p) => p.category === slug).length;
  sec.innerHTML = `
      <div class="archive__head">
        <h2 class="archive__title">All Tags <span lang="bn">সব ট্যাগ</span></h2>
        <p class="archive__sub">${P.posts.length} stories · newest first</p>
      </div>
      <nav class="topics" aria-label="Topics">
        <p class="topics__label">Explore topics <span lang="bn">বিষয়</span></p>
        <ul>${P.categories.map((c) => `<li><a href="topics/${c.slug}/" style="--pc:${c.color}">${esc(c.name)} <sup>${count(c.slug)}</sup></a></li>`).join("")}<li><a href="stories/" style="--pc:#fff">All stories <sup>${P.posts.length}</sup></a></li></ul>
      </nav>
      <ul class="pgrid">${newest
        .map((p) => {
          const c = cats[p.category] || { name: p.category, color: "#FF2EA6" };
          return `<li class="pcard" style="--pc:${c.color}">
        <a class="pcard__link" href="posts/${p.slug}/">
          <span class="pcard__img"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="320" height="320"></span>
          <span class="pcard__meta"><span>#${pad(p.no)}</span><span>${esc(c.name)}</span><time datetime="${p.date}">${fmt(p.date)}</time></span>
          <span class="pcard__title">${esc(p.title)}</span>
          ${p.titleBn ? `<span class="pcard__bn" lang="bn">${esc(p.titleBn)}</span>` : ""}
        </a>
      </li>`;
        })
        .join("")}</ul>`;
  sec.dataset.ssr = "client";
})();
