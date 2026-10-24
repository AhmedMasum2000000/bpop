// Static export of the dynamic site.
// 1. Writes every generated page (index.html from templates/home.html, posts/, topics/, stories/, sitemap.xml,
//    robots.txt, feed.xml, 404.html, js/posts.js) into the repo root, so the repo itself is the finished site
//    (Hostinger Git deploy, GitHub Pages from a branch, any static host).
// 2. Copies the whole site into dist/ with the home page fully server-rendered (best for SEO).
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT_DIR, loadContent, routes, renderHome } from "./site.mjs";

const C = loadContent();
const write = (base, file, body) => {
  const out = join(base, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, body);
};

// generated folders are rebuilt from scratch so deleted posts disappear
for (const d of ["posts", "topics", "stories"]) rmSync(join(ROOT_DIR, d), { recursive: true, force: true });
const pages = routes(C);
for (const [file, render] of pages) write(ROOT_DIR, file, render());
write(ROOT_DIR, "index.html", renderHome(C));

const dist = join(ROOT_DIR, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const name of ["story.html", "css", "js", "assets", "posts", "topics", "stories", "sitemap.xml", "robots.txt", "feed.xml", "404.html", ".nojekyll", ".htaccess"]) {
  const src = join(ROOT_DIR, name);
  if (existsSync(src)) cpSync(src, join(dist, name), { recursive: true });
}
write(dist, "index.html", renderHome(C));

console.log(`Rendered ${pages.length} files (${C.posts.length} posts, ${C.categories.length} topics) into the repo root and dist/`);
