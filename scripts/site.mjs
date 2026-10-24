// Renders every page of the site from content/posts.json + content/articles/*.json.
// Used live by scripts/serve.mjs (each request is rendered fresh) and by scripts/build.mjs (static export).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(ROOT_DIR, p), "utf8");

const COLORS = { music: "#FF8FCB", art: "#5ED3B8", "pop-culture": "#F08A4B", events: "#C6F432", film: "#7FB3FF" };
const pad = (n) => String(n).padStart(2, "0");
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const strip = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/* ---------- content ---------- */

export function loadContent() {
  const data = JSON.parse(read("content/posts.json"));
  const site = data.site;
  site.url = (process.env.SITE_URL || site.url || "https://ahmedmasum2000000.github.io/bpop/").replace(/\/?$/, "/");
  const artDir = join(ROOT_DIR, "content/articles");
  const articles = {};
  if (existsSync(artDir))
    for (const f of readdirSync(artDir))
      if (f.endsWith(".json")) {
        try {
          articles[f.slice(0, -5)] = JSON.parse(readFileSync(join(artDir, f), "utf8"));
        } catch (e) {
          console.warn(`Skipping invalid article ${f}: ${e.message}`);
        }
      }
  const cats = Object.fromEntries(data.categories.map((c) => [c.slug, { ...c, color: COLORS[c.slug] || "#FF2EA6" }]));
  // oldest post is #01
  const chrono = data.posts.slice().sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code));
  const posts = chrono.map((p, i) => {
    const a = articles[p.slug] || {};
    const fallback = strip(p.caption.replace(/#\w+/g, "").replace(/https?:\/\/\S+/g, ""));
    return {
      ...p,
      no: i + 1,
      cat: cats[p.category],
      seoTitle: a.seoTitle || p.title,
      description: a.metaDescription || clip(fallback || p.title, 155),
      keywords: a.keywords || [],
      titleBn: a.titleBn || "",
      summaryBn: a.summaryBn || "",
      lede: a.lede || clip(fallback, 220),
      body: a.body || "",
      faq: Array.isArray(a.faq) ? a.faq : [],
      related: Array.isArray(a.related) ? a.related : [],
    };
  });
  const bySlug = Object.fromEntries(posts.map((p) => [p.slug, p]));
  const newest = posts.slice().reverse();
  return { site, cats, categories: data.categories.map((c) => cats[c.slug]), posts, newest, bySlug };
}

/* ---------- helpers ---------- */

const abs = (site, path) => site.url + path.replace(/^\//, "");
const postPath = (slug) => `posts/${slug}/`;
const topicPath = (slug) => `topics/${slug}/`;

// Minimal, safe markdown: ## headings, - lists, paragraphs, **bold**, *italic*, [text](url | post:slug | topic:slug | home:)
function markdown(src, ctx) {
  const inline = (t) =>
    esc(t)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, target) => {
        const href = resolveLink(target, ctx);
        if (!href) return text;
        const ext = /^https?:/.test(href);
        return `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  const out = [];
  for (const block of String(src || "").replace(/\r/g, "").split(/\n{2,}/)) {
    const b = block.trim();
    if (!b) continue;
    if (/^#{2,3} /.test(b)) out.push(`<h2>${inline(b.replace(/^#{2,3} /, ""))}</h2>`);
    else if (/^[-*] /m.test(b) && b.split("\n").every((l) => /^[-*] /.test(l.trim())))
      out.push(`<ul>${b.split("\n").map((l) => `<li>${inline(l.trim().slice(2))}</li>`).join("")}</ul>`);
    else out.push(`<p>${inline(b).replace(/\n/g, "<br>")}</p>`);
  }
  return out.join("\n");
}

function resolveLink(target, ctx) {
  const t = target.replace(/&amp;/g, "&");
  if (t.startsWith("post:")) return ctx.C.bySlug[t.slice(5)] ? ctx.root + postPath(t.slice(5)) : "";
  if (t.startsWith("topic:")) return ctx.C.cats[t.slice(6)] ? ctx.root + topicPath(t.slice(6)) : "";
  if (t === "home:" || t === "home") return ctx.root || "./";
  if (/^https?:\/\//.test(t)) return t;
  return "";
}

// Instagram caption -> HTML with @handles, URLs and #tags linked
function captionHtml(text) {
  return esc(text)
    .replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener nofollow">${u}</a>`)
    .replace(/(^|[\s(])@([A-Za-z0-9_.]*[A-Za-z0-9_])/g, (m, pre, h) => `${pre}<a href="https://www.instagram.com/${h}/" target="_blank" rel="noopener">@${h}</a>`)
    .replace(/(^|\s)#(\w+)/g, (m, pre, t) => `${pre}<a href="https://www.instagram.com/explore/tags/${t}/" target="_blank" rel="noopener nofollow">#${t}</a>`)
    .replace(/\n/g, "<br>");
}

const rgb = (hex) => { const h = hex.replace("#", ""); return [0, 2, 4].map((k) => parseInt(h.substr(k, 2), 16)); };
const mix = (hex, a) => "rgb(" + rgb(hex).map((v) => Math.round(v * a + 255 * (1 - a))).join(",") + ")";

const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

/* ---------- shell (header / nav / footer) reused from story.html ---------- */

function shell(root) {
  const src = read("story.html");
  const fonts = (src.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]+>/) || [""])[0];
  const top = src.slice(src.indexOf("<!-- LOADER -->"), src.indexOf('<main id="top">'));
  const afterMain = src.slice(src.indexOf("</main>") + 7);
  const bottom = afterMain.slice(0, afterMain.indexOf("<script"));
  const fix = (html) =>
    html.replace(/(src|href)="(?!https?:|#|mailto:|data:|\/|")([^"]*)"/g, (m, attr, url) => `${attr}="${root}${url}"`);
  return { fonts, top: fix(top), bottom: fix(bottom) };
}

function page({ C, root, path, title, description, image, type = "website", head = "", body, bodyClass = "", ld = [], extraCss = [], scripts = [] }) {
  const { site } = C;
  const sh = shell(root);
  const url = abs(site, path);
  const img = abs(site, image || "assets/mascot.png");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${esc(url)}" />
  <meta name="bp-root" content="${root}" />
  <meta property="og:site_name" content="${esc(site.name)}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:image" content="${esc(img)}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:locale:alternate" content="bn_BD" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(img)}" />
  ${head}
  <link rel="icon" href="${root}assets/logo.png" />
  <link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="${root}feed.xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  ${sh.fonts}
  <link rel="stylesheet" href="${root}css/base.css" />
  <link rel="stylesheet" href="${root}css/shell.css" />
  <link rel="stylesheet" href="${root}css/story.css" />
  <link rel="stylesheet" href="${root}css/post.css" />
  ${extraCss.map((c) => `<link rel="stylesheet" href="${root}${c}" />`).join("\n  ")}
  ${ld.map(jsonLd).join("\n  ")}
</head>
<body class="is-loading page-story ${bodyClass}">
  ${sh.top}
  <main id="top">
${body}
  </main>
  ${sh.bottom}
  <script src="${root}js/posts.js"></script>
  <script src="${root}js/data.js"></script>
  <script src="${root}js/core.js"></script>
  <script src="${root}js/shell.js"></script>
  ${scripts.map((s) => `<script src="${root}${s}"></script>`).join("\n  ")}
</body>
</html>
`;
}

const orgLd = (C) => ({
  "@type": "Organization",
  "@id": C.site.url + "#org",
  name: C.site.name,
  alternateName: [C.site.nameBn, "Bangla Pop Tags", "bpop.tags"],
  url: C.site.url,
  logo: abs(C.site, "assets/logo.png"),
  sameAs: [C.site.instagram, C.site.linktree],
});

const crumbsLd = (C, items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(C.site, path) })),
});

function crumbs(root, items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">
      <a class="crumbs__back" href="${root || "./"}"><span aria-hidden="true">←</span> Back to home</a>
      <ol>${items
        .map(([name, href], i) =>
          i === items.length - 1 ? `<li aria-current="page"><span>${esc(name)}</span></li>` : `<li><a href="${href}">${esc(name)}</a></li>`
        )
        .join("")}</ol>
    </nav>`;
}

function card(p, root, { lede = true } = {}) {
  return `<li class="pcard" style="--pc:${p.cat.color}">
        <a class="pcard__link" href="${root}${postPath(p.slug)}">
          <span class="pcard__img"><img src="${root}${p.image}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="320" height="320"></span>
          <span class="pcard__meta"><span>#${pad(p.no)}</span><span>${esc(p.cat.name)}</span><time datetime="${p.date}">${fmtDate(p.date)}</time></span>
          <span class="pcard__title">${esc(p.title)}</span>
          ${p.titleBn ? `<span class="pcard__bn" lang="bn">${esc(p.titleBn)}</span>` : ""}
          ${lede ? `<span class="pcard__lede">${esc(p.lede)}</span>` : ""}
        </a>
      </li>`;
}

function topicNav(C, root, active) {
  return `<nav class="topics" aria-label="Topics">
      <p class="topics__label">Explore topics <span lang="bn">বিষয়</span></p>
      <ul>${C.categories
        .map((c) => {
          const n = C.posts.filter((p) => p.category === c.slug).length;
          return `<li><a href="${root}${topicPath(c.slug)}" style="--pc:${c.color}"${c.slug === active ? ' aria-current="page"' : ""}>${esc(c.name)} <sup>${n}</sup></a></li>`;
        })
        .join("")}<li><a href="${root}stories/" style="--pc:#fff"${active === "*" ? ' aria-current="page"' : ""}>All stories <sup>${C.posts.length}</sup></a></li></ul>
    </nav>`;
}

/* ---------- pages ---------- */

export function renderPost(C, slug) {
  const p = C.bySlug[slug];
  if (!p) return null;
  const root = "../../";
  const ctx = { C, root };
  const i = C.posts.indexOf(p);
  const prev = C.posts[i - 1] || C.posts[C.posts.length - 1];
  const next = C.posts[i + 1] || C.posts[0];
  let related = p.related.map((s) => C.bySlug[s]).filter((r) => r && r !== p);
  for (const r of C.newest) if (related.length < 3 && r !== p && r.category === p.category && !related.includes(r)) related.push(r);
  related = related.slice(0, 3);
  const title = `${p.seoTitle} | ${C.site.name}`;
  const path = postPath(p.slug);
  const color = p.cat.color;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.title,
      alternativeHeadline: p.titleBn || undefined,
      description: p.description,
      image: [abs(C.site, p.image)],
      datePublished: p.date,
      dateModified: p.date,
      inLanguage: ["en", "bn"],
      articleSection: p.cat.name,
      keywords: [...p.keywords, ...p.hashtags].join(", "),
      url: abs(C.site, path),
      mainEntityOfPage: abs(C.site, path),
      isBasedOn: p.instagram,
      author: { "@id": C.site.url + "#org" },
      publisher: orgLd(C),
    },
    crumbsLd(C, [["Home", ""], [p.cat.name, topicPath(p.category)], [p.title, path]]),
  ];
  if (p.faq.length)
    ld.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });

  const head = [
    `<meta name="keywords" content="${esc([...p.keywords, "B-POP Tags", "Bangla Pop Tags"].join(", "))}" />`,
    `<meta property="article:published_time" content="${p.date}" />`,
    `<meta property="article:section" content="${esc(p.cat.name)}" />`,
    ...p.hashtags.slice(0, 8).map((t) => `<meta property="article:tag" content="${esc(t)}" />`),
  ].join("\n  ");

  const people = p.handles.length
    ? `<section class="pblock" aria-labelledby="ppl-${p.no}">
          <h2 id="ppl-${p.no}" class="pblock__h">Tagged in this post <span lang="bn">ট্যাগ</span></h2>
          <ul class="handles">${p.handles
            .map((h) => `<li><a href="https://www.instagram.com/${esc(h)}/" target="_blank" rel="noopener">@${esc(h)}</a></li>`)
            .join("")}</ul>
        </section>`
    : "";

  const faq = p.faq.length
    ? `<section class="pblock faq" aria-labelledby="faq-${p.no}">
          <h2 id="faq-${p.no}" class="pblock__h">FAQ <span lang="bn">প্রশ্নোত্তর</span></h2>
          ${p.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n          ")}
        </section>`
    : "";

  const body = `
    <article class="story post" id="story" style="--c:${color};--main:${mix(color, 0.5)};--light:${mix(color, 0.2)}">
      ${crumbs(root, [["Home", root || "./"], [p.cat.name, root + topicPath(p.category)], [p.title]])}
      <header class="story__head">
        <p class="story__meta"><a href="${root}${topicPath(p.category)}">${esc(p.cat.name)}</a><span aria-hidden="true">—</span><time datetime="${p.date}">${fmtDate(p.date)}</time>${p.cat.nameBn ? `<span aria-hidden="true">/</span><span class="bn" lang="bn">${esc(p.cat.nameBn)}</span>` : ""}</p>
        <p class="story__no"><span class="mk">#${pad(p.no)}</span></p>
        <h1 class="story__title"><span class="mk">${esc(p.title)}</span></h1>
        ${p.titleBn ? `<p class="story__bn" lang="bn"><span class="mk">${esc(p.titleBn)}</span></p>` : ""}
        <div class="story__listen">
          <p class="story__listenLabel" lang="bn">পড়ুন</p>
          <ul class="story__pills">
            <li><a class="pill pill--ig" href="${esc(p.instagram)}" target="_blank" rel="noopener">VIEW POST ON INSTAGRAM ↗</a></li>
            <li><button class="pill" type="button" id="sShare">SHARE</button></li>
            <li><a class="pill" href="${root || "./"}">← HOME</a></li>
          </ul>
        </div>
      </header>
      <div class="story__body">
        <div class="prose">
          <p class="post__lede">${esc(p.lede)}</p>
          <figure class="prose__fig">
            <a href="${esc(p.instagram)}" target="_blank" rel="noopener" aria-label="Open this post on Instagram">
              <img src="${root}${p.image}" alt="${esc(p.title)} — B-POP Tags Instagram post" width="640" height="640" fetchpriority="high">
            </a>
            <figcaption>${p.titleBn ? `<span class="bn" lang="bn">${esc(p.titleBn)}</span>` : ""}#${pad(p.no)} · ${esc(p.cat.name)} · Posted on Instagram, ${fmtDate(p.date)}<br><a href="${esc(p.instagram)}" target="_blank" rel="noopener">Open the original post on Instagram ↗</a></figcaption>
          </figure>
          ${p.body ? markdown(p.body, ctx) : ""}
          ${p.summaryBn ? `<h2 lang="bn">সংক্ষেপে</h2>\n          <p class="bn" lang="bn">${esc(p.summaryBn)}</p>` : ""}
          <section class="pblock" aria-labelledby="cap-${p.no}">
            <h2 id="cap-${p.no}" class="pblock__h">Original caption <span lang="bn">মূল ক্যাপশন</span></h2>
            <blockquote class="caption" cite="${esc(p.instagram)}"><p>${captionHtml(p.caption)}</p>
              <footer>— <a href="${esc(C.site.instagram)}" target="_blank" rel="noopener">@bpop.tags</a> on <a href="${esc(p.instagram)}" target="_blank" rel="noopener">Instagram</a>, ${fmtDate(p.date)}</footer></blockquote>
          </section>
          ${people}
          ${faq}
          <p class="prose__credit">TEXT: B-POP Tags editorial<br>
            <a class="pill pill--ig" href="${esc(p.instagram)}" target="_blank" rel="noopener">VIEW POST ON INSTAGRAM ↗</a></p>
        </div>
      </div>
    </article>

    <section class="readnext" aria-labelledby="rn-${p.no}">
      <h2 id="rn-${p.no}" class="readnext__h">Read next <span lang="bn">আরও পড়ুন</span></h2>
      <ul class="pgrid">${related.map((r) => card(r, root, { lede: false })).join("")}</ul>
      <p class="readnext__more"><a href="${root}${topicPath(p.category)}">More in ${esc(p.cat.name)} →</a> <a href="${root}stories/">All stories →</a></p>
      <nav class="pn" aria-label="Previous and next story">
        <a class="pn__prev" href="${root}${postPath(prev.slug)}" rel="prev"><small>← Previous</small><span>#${pad(prev.no)} ${esc(prev.title)}</span></a>
        <a class="pn__next" href="${root}${postPath(next.slug)}" rel="next"><small>Next →</small><span>#${pad(next.no)} ${esc(next.title)}</span></a>
      </nav>
    </section>
    ${topicNav(C, root, p.category)}

    <a class="snext" href="${root}${postPath(next.slug)}" aria-label="Next story: ${esc(next.title)}">
      <div class="snext__band"><p>NEXT STORY</p></div>
      <div class="snext__bg" style="--nc:${next.cat.color};--non:var(--ink)">
        <div class="snext__row">
          <div class="snext__id">
            <p class="snext__no">#${pad(next.no)}</p>
            <p class="snext__kind">${esc(next.cat.name.toUpperCase())}</p>
          </div>
          <p class="snext__desc"><span>${esc(next.lede)}</span></p>
        </div>
        <div class="snext__big" aria-hidden="true"><span class="tick"><span>${esc(next.title)}&ensp;·&ensp;${esc(next.title)}&ensp;·&ensp;</span></span></div>
      </div>
    </a>`;

  return page({ C, root, path, title, description: p.description, image: p.image, type: "article", head, body, bodyClass: "page-post", ld, scripts: ["js/post.js"] });
}

export function renderTopic(C, slug) {
  const c = C.cats[slug];
  if (!c) return null;
  const root = "../../";
  const list = C.newest.filter((p) => p.category === slug);
  const path = topicPath(slug);
  const title = `${c.name}: Bangladesh's ${c.name.replace(/ & /, " and ")} Scene | ${C.site.name}`;
  const description = clip(`${c.blurb} ${list.length} stories from B-POP Tags on Dhaka and Bangladesh's underground.`, 158);
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: c.name,
      description,
      url: abs(C.site, path),
      isPartOf: { "@type": "WebSite", name: C.site.name, url: C.site.url },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: list.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(C.site, postPath(p.slug)), name: p.title })),
      },
    },
    crumbsLd(C, [["Home", ""], [c.name, path]]),
  ];
  const body = `
    <section class="hub" style="--c:${c.color}">
      ${crumbs(root, [["Home", root || "./"], [c.name]])}
      <header class="hub__head">
        <p class="hub__kicker">Topic <span lang="bn">বিষয়</span> · ${list.length} stories</p>
        <h1 class="hub__title">${esc(c.name)}</h1>
        <p class="hub__bn" lang="bn">${esc(c.nameBn)}</p>
        <p class="hub__blurb">${esc(c.blurb)}</p>
      </header>
      <ul class="pgrid">${list.map((p) => card(p, root)).join("")}</ul>
    </section>
    ${topicNav(C, root, slug)}`;
  return page({ C, root, path, title, description, image: list[0] && list[0].image, body, bodyClass: "page-hub", ld });
}

export function renderArchive(C) {
  const root = "../";
  const path = "stories/";
  const title = `All Stories: Bangladesh Pop Culture & Underground Scene | ${C.site.name}`;
  const description = clip(`Every B-POP Tags story — ${C.posts.length} tags on Dhaka's music, rave, art, fashion, film and events, from the newest to issue #01.`, 158);
  const groups = C.categories.map((c) => ({ c, list: C.newest.filter((p) => p.category === c.slug) }));
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "All stories",
      url: abs(C.site, path),
      mainEntity: {
        "@type": "ItemList",
        itemListElement: C.newest.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(C.site, postPath(p.slug)), name: p.title })),
      },
    },
    crumbsLd(C, [["Home", ""], ["All stories", path]]),
  ];
  const body = `
    <section class="hub" style="--c:#FF2EA6">
      ${crumbs(root, [["Home", root], ["All stories"]])}
      <header class="hub__head">
        <p class="hub__kicker">Archive <span lang="bn">আর্কাইভ</span> · ${C.posts.length} stories</p>
        <h1 class="hub__title">All Stories</h1>
        <p class="hub__bn" lang="bn">সব গল্প</p>
        <p class="hub__blurb">${esc(C.site.tagline)}. Every post we've tagged, by topic.</p>
      </header>
      ${groups
        .map(
          ({ c, list }) => `<section class="hub__group" style="--pc:${c.color}">
        <h2 class="hub__gh"><a href="${root}${topicPath(c.slug)}">${esc(c.name)}</a> <span lang="bn">${esc(c.nameBn)}</span></h2>
        <ul class="pgrid">${list.map((p) => card(p, root, { lede: false })).join("")}</ul>
      </section>`
        )
        .join("\n      ")}
    </section>
    ${topicNav(C, root, "*")}`;
  return page({ C, root, path, title, description, image: "assets/mascot.png", body, bodyClass: "page-hub", ld });
}

export function render404(C) {
  const root = "./";
  // absolute root so the 404 works at any depth on static hosts
  const absRoot = new URL(C.site.url).pathname;
  const body = `
    <section class="hub" style="--c:#FF2EA6">
      ${crumbs(absRoot, [["Home", absRoot], ["Not found"]])}
      <header class="hub__head">
        <p class="hub__kicker">404</p>
        <h1 class="hub__title">Off the grid</h1>
        <p class="hub__bn" lang="bn">এই পাতাটি খুঁজে পাওয়া যায়নি</p>
        <p class="hub__blurb">This page isn't on our radar. Try the latest stories below.</p>
      </header>
      <ul class="pgrid">${C.newest.slice(0, 6).map((p) => card(p, absRoot, { lede: false })).join("")}</ul>
    </section>`;
  return page({ C, root: absRoot || root, path: "404.html", title: `Page not found | ${C.site.name}`, description: C.site.tagline, body, bodyClass: "page-hub" }).replace(
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    '<meta name="robots" content="noindex" />'
  );
}

// Home: index.html is the template. Server fills <!--BP:HEAD--> and the #archive section.
export function renderHome(C) {
  let html = read("index.html");
  const { site } = C;
  const desc = `${site.name} (${site.nameBn}) — ${site.tagline}. ${C.posts.length} stories on Dhaka's music, rave, art, fashion, film and events.`;
  const head = `<link rel="canonical" href="${esc(site.url)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta property="og:url" content="${esc(site.url)}" />
  <meta property="og:image" content="${esc(abs(site, "assets/mascot.png"))}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="feed.xml" />
  ${jsonLd({ "@context": "https://schema.org", "@graph": [orgLd(C), { "@type": "WebSite", "@id": site.url + "#site", name: site.name, url: site.url, inLanguage: ["en", "bn"], publisher: { "@id": site.url + "#org" } }, { "@type": "ItemList", name: "Latest stories", itemListElement: C.newest.slice(0, 20).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(site, postPath(p.slug)), name: p.title })) }] })}`;
  html = html.replace("<!--BP:HEAD-->", head);
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(clip(desc, 158))}" />`);
  html = html.replace(/(<section class="archive" id="archive"[^>]*)data-ssr="0"([^>]*>)[\s\S]*?(<\/section><!--\/archive-->)/, (m, a, b, c) => `${a}data-ssr="1"${b}\n${archiveInner(C, "")}\n    ${c}`);
  return html;
}

export function archiveInner(C, root) {
  return `      <div class="archive__head">
        <h2 class="archive__title">All Tags <span lang="bn">সব ট্যাগ</span></h2>
        <p class="archive__sub">${C.posts.length} stories · newest first</p>
      </div>
      ${topicNav(C, root, "")}
      <ul class="pgrid">${C.newest.map((p) => card(p, root, { lede: false })).join("")}</ul>`;
}

export function renderPostsJs(C) {
  const data = {
    categories: C.categories.map(({ slug, name, nameBn, color }) => ({ slug, name, nameBn, color })),
    posts: C.posts.map((p) => ({
      slug: p.slug, no: p.no, date: p.date, category: p.category, title: p.title, titleBn: p.titleBn,
      lede: p.lede, summaryBn: p.summaryBn, image: p.image, instagram: p.instagram,
    })),
  };
  return `// Generated from content/posts.json by scripts/site.mjs — do not edit by hand.\nwindow.BPOP_POSTS = ${JSON.stringify(data)};\n`;
}

export function renderSitemap(C) {
  const urls = [
    ["", C.newest[0].date, "1.0"],
    ["stories/", C.newest[0].date, "0.8"],
    ...C.categories.map((c) => [topicPath(c.slug), (C.newest.find((p) => p.category === c.slug) || C.newest[0]).date, "0.8"]),
    ...C.newest.map((p) => [postPath(p.slug), p.date, "0.7"]),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(([path, date, pr]) => {
    const p = C.posts.find((x) => postPath(x.slug) === path);
    return `  <url><loc>${esc(abs(C.site, path))}</loc><lastmod>${date}</lastmod><priority>${pr}</priority>${p ? `<image:image><image:loc>${esc(abs(C.site, p.image))}</image:loc></image:image>` : ""}</url>`;
  })
  .join("\n")}
</urlset>
`;
}

export const renderRobots = (C) => `User-agent: *\nAllow: /\n\nSitemap: ${abs(C.site, "sitemap.xml")}\n`;

export function renderFeed(C) {
  const items = C.newest
    .map(
      (p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${esc(abs(C.site, postPath(p.slug)))}</link>
    <guid isPermaLink="true">${esc(abs(C.site, postPath(p.slug)))}</guid>
    <pubDate>${new Date(p.date + "T00:00:00Z").toUTCString()}</pubDate>
    <category>${esc(p.cat.name)}</category>
    <description>${esc(p.description)}</description>
  </item>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${esc(C.site.name)}</title>
  <link>${esc(C.site.url)}</link>
  <description>${esc(C.site.tagline)}</description>
  <language>en</language>
${items}
</channel>
</rss>
`;
}

// Every generated route: [output path, renderer]
export function routes(C) {
  return [
    ["js/posts.js", () => renderPostsJs(C)],
    ["stories/index.html", () => renderArchive(C)],
    ["sitemap.xml", () => renderSitemap(C)],
    ["robots.txt", () => renderRobots(C)],
    ["feed.xml", () => renderFeed(C)],
    ["404.html", () => render404(C)],
    ...C.categories.map((c) => [`topics/${c.slug}/index.html`, () => renderTopic(C, c.slug)]),
    ...C.posts.map((p) => [`posts/${p.slug}/index.html`, () => renderPost(C, p.slug)]),
  ];
}
