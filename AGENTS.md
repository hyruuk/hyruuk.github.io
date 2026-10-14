# Working on this site (CLAUDE.md / AGENTS.md)

Personal website of Yann Harel (they/them in prose; site bios are first person). User guide: `docs/EDITING.md`.
Design: the artwork is a world map; pages are places on it (keywords = "places", types = "rooms"); bilingual EN/FR;
persistent Spotify player; HYRUUK generative acronym in the home panel.

## Commands

- `npm run dev` — dev server (background mode is available: `astro dev --background`, stop with `astro dev stop`);
  region editor at `/dev/regions/` (dev only, injected by `integrations/dev-tools.mjs`).
- `npm run ci` — sync-forms check + vitest + `astro check` + build + `scripts/check-dist.mjs` (what CI runs).
- `npm run e2e` — Playwright smoke tests against `astro preview` (build first). `ALL_BROWSERS=1` adds Firefox,
  WebKit and a mobile profile (always on in CI).
- `npm run add` / `scripts/add-item.mjs` — add items (also used by `.github/workflows/add-item.yml`).
- After editing `src/content/keywords.yaml`: `npm run sync:forms`.
- Astro docs: https://docs.astro.build (this is Astro 7: content layer only, Zod 4 from `astro/zod`).

## Architecture invariants (do not break)

1. **Body = `#world` + `#page` + `#player`.** The router swap (`src/scripts/router/swap.ts`) replaces **only
   `#page`**. Never rely on `transition:persist` for `#world`/`#player` (Safari has no `moveBefore()`: a moved iframe
   reloads → the Spotify player would stop).
2. **Never give `#world` a `view-transition-name`** (named groups paint above all content). The camera is animated by
   `src/scripts/world/controller.ts` with WAAPI, outside the View Transition.
3. **No runtime state on `<html>`**: Astro rewrites its attributes on every swap. `<html data-camera/data-stage/
   data-look/data-kind>` are *static per page* (set by `BaseLayout`). Runtime state lives on `#world` / `#player`.
4. **`#world` and `#player` markup must be identical on every page** (the entry page's copy lives all session).
   Language-dependent text in them uses `data-label-en` / `data-label-fr` (and `data-href-*`), synced after swaps.
5. **Page scripts run once.** Per-page setup goes through `onPage()` (`src/scripts/lifecycle.ts`), which re-runs on
   every page load and aborts its `signal` on `astro:before-swap`. Put a view's `<script>` **inside** `<BaseLayout>`
   (scripts after the layout end up outside `#page`; `adoptStrayScripts` is only a safety net).
6. **Animate only `transform` and `opacity`.** Blur = crossfade to the pre-blurred image (`.world-blur`). No animated
   `filter`/`backdrop-filter`.
7. One element per `view-transition-name` at a time. The header is named `site-header` (keep its group short: clicks
   are ignored while a View Transition runs).
8. Astro 7 `compressHTML: 'jsx'` drops whitespace between inline elements — use `{' '}` when needed.
9. YAML flow mappings/sequences: **quote values containing commas** (labels, authors).
10. Never generate `/over.run/`, `/cookiecutter-neuroscience/`, `/unf-montreal.ca/` (other sites on the same domain;
    `check-dist` enforces it). Links to them need `data-astro-reload` or `target="_blank"`.
11. Touch screens: hotspots and place-strip chips work in two taps (preview, then enter). Keep `#page > .main--home`
    transparent to pointer events or phones can't tap the art.

## World layers, media, sound (2026-10)

- `#world` layers, back to front: `.world-stars` (CSS starfield outside the camera, parallax: the controller animates it
  in sync with each flight; star tiles `public/world/stars*.webp`), then inside `.world-camera`: `.world-aura`
  (blurred mirrored extension of the art with the faint flux lines baked in, 2.5×), `.world-lqip`, the art (soft eased
  mask on every side), `.world-blur`. Aura and stars are built by `scripts/world/build-assets.mjs` (`--only=aura`
  rebuilds just them). **Keep these layers plain raster images**: an SVG `<img>` (re-rasterised at every zoom step)
  and a starfield of ~25 CSS radial gradients made flights drop to a few frames per second in Firefox.
- Flights: van Wijk–Nuij path (rho 1.2), "smootherstep" easing, 900–1700 ms, keyframes every ~10 ms. New content is
  revealed at 72 % of the flight (as the camera slows); sharper art tiers are decoded during the flight but only swapped
  in once it lands (a mid-flight swap of a 4,000-px image stutters). `will-change: transform` only while flying.
- Covers/figures: `cover`, `coverFocus`, `coverVideo`, `figures[]` (schema in `src/content.config.ts`); videos live
  in `public/media/<slug>/` (validated at build). `LoopVideo.astro` + `src/scripts/loop-video.ts`: in-view autoplay,
  pause button, nothing for reduced motion; tile videos autoplay muted while ≥35 % visible (not with reduced motion or
  Save-Data). Keep loops short and light (< ~1 MB): pixel-art clips are upscaled ×2–3 with nearest-neighbour.
- Sound cue: `#player[data-known]` (localStorage) stops the wave's idle breathing; `[data-hinted]` (sessionStorage)
  limits the "♪ play music" hint to once per visit. The Spotify iFrame API has no volume control (only
  play/pause/resume/seek), so audio fades are impossible with it. `#player[data-preview]` = 30 s previews.

## Data model

- `projects/<slug>/en.md` (canonical, full schema) + optional `fr.md` (title/summary/coverAlt + body).
- Publications/events point to projects (`projects: [slug]`); projects never list them (reverse lookup in
  `src/lib/content.ts`). Integrity of references is checked at build (`checkIntegrity`).
- Places: `keywords.yaml` (+ `match:` words for auto-placement) and `src/data/regions.yaml` (polygons, label, camera,
  in world units 1210 × 900). Rooms: `research | code | art-music` (+ `kind: community` without room).
- Cameras for non-place pages: `src/data/world.yaml`. Resolution: `src/lib/places.ts`. Math: `camera-core.js`
  (dependency-free; also inlined into the first-paint bootstrap in `World.astro`).

## Content notes

- Facts come from the CV and verified public sources (DOIs checked against Crossref/DataCite). Don't invent
  collaborators' first names, roles or dates; leave `# TODO(Yann)` comments instead.
- French text avoids gendered forms where possible (Yann reviews FR).
- Never publish the phone number or home address from the CV.
