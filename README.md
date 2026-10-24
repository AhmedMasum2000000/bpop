# B-POP Tags — website

Editorial one-page site for **B-POP Tags (Bangla Pop Tags)** — curating pop-culture & the underground scene.

Static HTML/CSS/JS, no build step and no dependencies. Open `index.html` directly, or run it with Node (18+):

```bash
npm install      # nothing to download — there are no dependencies
npm run dev      # local server at http://localhost:5173 (PORT env var to change)
npm run build    # copies the site into dist/ for hosts that want a build folder
npm run preview  # serves dist/
```

Any static server works too, e.g. `python3 -m http.server 8000`.

## Structure

| Path | What |
| --- | --- |
| `index.html` | Home: loader, hero/about, Highlight, Guest, Other Episodes, Personality, footer, fixed bottom nav |
| `story.html?id=…` | Story detail page, rendered from the same data |
| `js/data.js` | **All content** — highlights, guests, episodes, team, links. Edit this to update the site. |
| `js/core.js` | Shared helpers (`window.BP`): scroll/resize loop, reveal observer, marquees, parallax |
| `js/<section>.js` | One script per section: shell (loader/nav), hero, highlight, guest, episodes, personality |
| `css/<section>.css` | One stylesheet per section, plus `base.css` (tokens, shared utilities) and `story.css` |
| `scripts/` | Zero-dependency `serve.mjs` (dev server) and `build.mjs` (copies site into `dist/`) used by the npm scripts |
| `assets/` | Logo, mascot, tagline, and post artwork (`assets/posts/pNN.jpg`, cropped from the Instagram grid) |

## To do before launch

- Replace the placeholder team names in `js/data.js` (`team`).
- Swap the post thumbnails for full-resolution artwork (same filenames).
- Add per-story body copy and direct Instagram post links if wanted.

Deploys as-is to GitHub Pages, Netlify, Vercel or any static host.
