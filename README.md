# Neural Odyssey — hyruuk.github.io

Personal website of **Yann Harel**, cognitive neuroscientist — live at **https://hyruuk.github.io**.

The home page is an illustrated panorama of games, brains, music and dreams. Each part of it is a *place*
(Videogames, Neuroimaging, Brain–computer interfaces, Neuro-AI, Music, Consciousness & flow, Art & creativity):
click one and the camera flies there, revealing a collage of every project sharing that theme. The right-hand menu
gives the same projects by type (Research & Publications, Data & Code, Art & Music). English and French.

**To edit the site, read [docs/EDITING.md](docs/EDITING.md).** In short: edit Markdown/YAML files on github.com or
locally, or add items with the *New item* issue form / `npm run add`; every push to `main` is published in ~2 minutes.

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321 — the region editor is at /dev/regions/
npm run ci         # what GitHub runs before publishing: form check, unit tests, type check, build + link check
```

Requires Node ≥ 22.12.

## How it's built

- [Astro 7](https://astro.build) static site, TypeScript, plain CSS (no UI framework), deployed with GitHub Actions to
  GitHub Pages.
- Content: Markdown + YAML in `src/content/` with schemas in `src/content.config.ts` — a typo in a place or room fails
  the build with a readable message, and nothing broken is ever published.
- Navigation: Astro's `<ClientRouter />` with a **custom swap** that only replaces `#page`: the artwork (`#world`)
  and the music player (`#player`) are never touched, so the camera keeps flying and the music keeps playing.
- Camera: every page declares a place → `<html data-camera>`; flights use van Wijk & Nuij smooth zoom
  (`d3-interpolate`'s `interpolateZoom`) sampled into Web Animations keyframes (transform + opacity only).
- Artwork: extracted from the design mockup, upscaled ×4 with Real-ESRGAN, served as AVIF/WebP tiers
  (`npm run world`).

```
src/
  content/        projects/<slug>/{en,fr}.md · keywords.yaml · publications.yaml · events.yaml · pages/
  data/           site.yaml · world.yaml · regions.yaml · hyruuk.yaml · timeline.yaml
  views/          one file per kind of page (shared by English and French routes in pages/)
  components/     World (the art), Panel, Hyruuk, ProjectTile, Composition, Player…
  scripts/        world/ (camera), router/swap.ts, lifecycle.ts, player.ts
  styles/         tokens · global · world · layout · transitions
scripts/          add-item, sync-forms, spotify-liked, check-dist, world/ (artwork pipeline)
tests/            unit (vitest) · e2e (Playwright)
docs/EDITING.md   the user guide
CLAUDE.md         architecture invariants for AI-assisted sessions
```

## Credits

Design and artwork concept by Yann Harel. Fonts: Geist and Geist Mono (SIL OFL). Paper figures, when used as covers,
are credited on their project page.
