# B-POP Tags — website

Editorial one-page site for **B-POP Tags (Bangla Pop Tags)** — curating pop-culture & the underground scene.

Static HTML/CSS/JS, no build step and no dependencies. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
```

## Structure

| Path | What |
| --- | --- |
| `index.html` | Home: loader, hero/about, Highlight, Guest, Other Episodes, Personality, footer, fixed bottom nav |
| `story.html?id=…` | Story detail page, rendered from the same data |
| `js/data.js` | **All content** — highlights, guests, episodes, team, links. Edit this to update the site. |
| `js/core.js` | Shared helpers (`window.BP`): scroll/resize loop, reveal observer, marquees, parallax |
| `js/<section>.js` | One script per section: shell (loader/nav), hero, highlight, guest, episodes, personality |
| `css/<section>.css` | One stylesheet per section, plus `base.css` (tokens, shared utilities) and `story.css` |
| `assets/` | Logo, mascot, tagline, and post artwork (`assets/posts/pNN.jpg`, cropped from the Instagram grid) |

## To do before launch

- Replace the placeholder team names in `js/data.js` (`team`).
- Swap the post thumbnails for full-resolution artwork (same filenames).
- Add per-story body copy and direct Instagram post links if wanted.

Deploys as-is to GitHub Pages, Netlify, Vercel or any static host.
