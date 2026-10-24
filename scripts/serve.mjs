// Dynamic server: every page is rendered on request from content/posts.json + content/articles/,
// so edits to the content show up on refresh. Static files (css, js, assets) are served from disk.
// Usage: node scripts/serve.mjs [root]   (PORT and HOST env vars are respected)
// With a root argument (e.g. `dist`) it serves that folder as plain static files instead.
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { ROOT_DIR, loadContent, renderHome, renderPost, renderTopic, renderArchive, render404, renderPostsJs, renderSitemap, renderRobots, renderFeed } from "./site.mjs";

const staticOnly = Boolean(process.argv[2]);
const root = resolve(ROOT_DIR, process.argv[2] || ".");
const port = Number(process.env.PORT) || 5173;
const host = process.env.HOST || "0.0.0.0";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

// Dynamic routes -> [content-type, html] or a redirect
function dynamic(pathname) {
  const C = loadContent();
  let m;
  if (pathname === "/" || pathname === "/index.html") return [types[".html"], renderHome(C)];
  if (pathname === "/js/posts.js") return [types[".js"], renderPostsJs(C)];
  if (pathname === "/sitemap.xml") return [types[".xml"], renderSitemap(C)];
  if (pathname === "/robots.txt") return [types[".txt"], renderRobots(C)];
  if (pathname === "/feed.xml") return [types[".xml"], renderFeed(C)];
  if (pathname === "/stories" || pathname === "/topics" || pathname === "/topics/" || pathname === "/posts" || pathname === "/posts/") return { redirect: "/stories/" };
  if (pathname === "/stories/" || pathname === "/stories/index.html") return [types[".html"], renderArchive(C)];
  if ((m = pathname.match(/^\/(posts|topics)\/([a-z0-9-]+)(\/|\/index\.html)?$/))) {
    if (!m[3]) return { redirect: `/${m[1]}/${m[2]}/` };
    const html = m[1] === "posts" ? renderPost(C, m[2]) : renderTopic(C, m[2]);
    return html ? [types[".html"], html] : { notFound: true };
  }
  return null;
}

async function resolveFile(pathname) {
  const file = normalize(join(root, pathname));
  // never serve anything outside the site root
  if (file !== root && !file.startsWith(root + sep)) return null;
  try {
    const s = await stat(file);
    if (s.isDirectory()) {
      const index = join(file, "index.html");
      return (await stat(index)).isFile() ? index : null;
    }
    return s.isFile() ? file : null;
  } catch {
    return null;
  }
}

function send(res, status, type, body) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-cache" });
  res.end(body);
}

createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", "http://x").pathname);
  } catch {
    return send(res, 400, types[".txt"], "Bad request");
  }
  try {
    if (!staticOnly) {
      const d = dynamic(pathname);
      if (d && d.redirect) {
        res.writeHead(301, { Location: d.redirect });
        return res.end();
      }
      if (d && !d.notFound) return send(res, 200, d[0], d[1]);
      if (d && d.notFound) return send(res, 404, types[".html"], render404(loadContent()));
    }
    const file = await resolveFile(pathname);
    if (file) {
      res.writeHead(200, { "Content-Type": types[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
      return createReadStream(file).pipe(res);
    }
    if (staticOnly) {
      const nf = await resolveFile("/404.html");
      if (nf) {
        res.writeHead(404, { "Content-Type": types[".html"] });
        return createReadStream(nf).pipe(res);
      }
      return send(res, 404, types[".txt"], "Not found");
    }
    return send(res, 404, types[".html"], render404(loadContent()));
  } catch (e) {
    console.error(e);
    return send(res, 500, types[".txt"], "Server error");
  }
}).listen(port, host, () => {
  console.log(`B-POP Tags ${staticOnly ? "static preview" : "dynamic server"} at http://localhost:${port}/  (${root})`);
});
