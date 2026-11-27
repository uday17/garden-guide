# 🌱 Gardening — The Complete Gardening Handbook

A free, richly designed static website that takes someone from *“I have never grown anything”* to
confident, season-aware gardener. Built with plain HTML, CSS and JavaScript — no build step, no
framework, no tracking.

**Live site:** https://uday17.github.io/garden-guide/

---

## What is inside

| Page | What it covers |
| --- | --- |
| `index.html` | Learning paths, the six pillars of plant care, a five-step quick start |
| `basics.html` | Light, water, pots and tools, potting your first plant, first four weeks, climate zones, glossary |
| `soil.html` | Texture, six ground soils with %, pH, compost, **9 potting media with indoor/outdoor percentages**, mixes and amendments |
| `plants.html` | Filterable library of **50+ plants** — indoor, climbers & creepers, succulents, herbs, vegetables, flowers, fruit, trees & shrubs |
| `india-states.html` | State flower and state tree of all 28 Indian states and 8 union territories, searchable by region |
| `care.html` | Watering masterclass, feeding (NPK), pruning techniques, repotting, pest & disease table, five-season calendar, symptom-based troubleshooting |
| `advanced.html` | Propagation, pruning as design, integrated pest management, soil food web, watering systems, growing under cover, hydroponics, record keeping |
| `planner.html` | Saved task checklist, plant shortlist and notes (all stored in `localStorage`) |
| `404.html` | Friendly not-found page |

### Features

- **Plant library** with live search (`/` shortcut), category chips, indoor/outdoor filter, difficulty
  filter and “add to my plan” shortlist.
- **Seasonal calendar** with accessible tabs (Spring / Summer / Monsoon / Autumn / Winter).
- **Location plant finder** on the Care page — uses browser geolocation or a city/landmark search with free Open-Meteo weather and OpenStreetMap place lookup (no keys, nothing stored), then ranks plants for the current temperature.
- **Plant Health Assistant** on the Care page — upload a photo, answer four questions, and get an on-device colour analysis plus a likely cause, action plan and guide links. Follow-up chat answers common care questions. Nothing is uploaded.
- **Benefit notes** — every one of the 55 plants has a “Benefits & uses” entry, shown in the library and on home-page previews.
- **Plant photographs** — all 55 plants have a local, optimised photo with an inline source/licence link; full attribution in `CREDITS.md`.
- **Interactive planner** — progress bar, checklists, wishlist and autosaving notes.
- **Dark / light theme** that respects `prefers-color-scheme` and remembers your choice.
- **Responsive** from 320 px phones to wide desktops, with a collapsible mobile nav.
- **Accessible**: skip link, semantic landmarks, labelled controls, visible focus rings, `aria-*`
  state on every interactive widget, reduced-motion support.
- **Zero dependencies at runtime** — only optional Google Fonts; all illustrations are inline SVG.

## Project structure

```
garden-guide/
├── index.html          # Home
├── basics.html         # Beginner guide
├── soil.html           # Soil & compost
├── plants.html         # Filterable plant library
├── india-states.html   # State flowers & trees of India
├── care.html           # Ongoing care & seasons
├── advanced.html       # Advanced techniques
├── planner.html        # Personal planner
├── 404.html
├── CREDITS.md           # photo sources, authors and licences
├── assets/
│   ├── css/style.css   # Design system + components
│   ├── images/          # 55 locally stored plant photos (600 px)
│   └── js/
│       ├── app.js          # Theme, nav, filters, tabs, planner
│       ├── plant-benefits.js # Benefits and uses for all 55 plants
│       ├── local-plants.js # Location + temperature plant finder
│       ├── plant-doctor.js # On-device photo analysis + care rules
│       ├── plants-data.js  # 55 plant records
│       └── plant-images.js # photo path + attribution per plant
└── .github/workflows/deploy.yml
```

## Run it locally

No tooling required — open `index.html` in a browser.

Or serve it over HTTP (recommended, so relative paths behave exactly like production):

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Deployment

Publishing is automated with **GitHub Actions → GitHub Pages**:

1. Every push to `main` triggers `.github/workflows/deploy.yml`.
2. The workflow checks that all required files exist, then uploads the repository root as a Pages
   artifact.
3. The `deploy` job publishes it to the `github-pages` environment.

Pages must be configured once with **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Manual run: **Actions → Deploy to GitHub Pages → Run workflow**.

## Editing the plant library

Add an object to `window.PLANTS` in `assets/js/plants-data.js`:

```js
{
  name: "Lemon Balm",
  botanical: "Melissa officinalis",
  category: "Herbs",        // Indoor | Climbers & Creepers | Succulents & Cacti | Herbs |
                            // Vegetables | Flowers | Fruit | Trees & Shrubs
  difficulty: 1,            // 1 easy · 2 moderate · 3 demanding
  light: "Part shade",
  water: "Every 2–3 days",
  height: "40–70 cm",
  glyph: "🌿",
  tint: "#dcefdc",          // card background tint
  tip: "One practical care note."
}
```

The `where` (indoor/outdoor) value is derived automatically from the category at the bottom of the file.

## Content notes

- Advice is written for temperate and subtropical climates; adjust months for your region.
- Hardiness zones are mentioned but not tabulated — always check a local source.
- Many common houseplants are toxic to pets; the library flags this generally, not per species.

## License

MIT — see [LICENSE](LICENSE). Content is educational; verify plant toxicity and local regulations
before planting anything invasive.
