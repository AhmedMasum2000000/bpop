// Copies the static site into dist/ for hosts that expect a build output folder.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "dist");
const entries = ["index.html", "story.html", "css", "js", "assets", ".nojekyll"];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const name of entries) {
  const src = join(root, name);
  if (existsSync(src)) cpSync(src, join(out, name), { recursive: true });
}
console.log(`Built static site into ${out}`);
