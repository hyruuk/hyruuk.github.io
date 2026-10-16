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
2. **No View Transitions.** `BaseLayout` hides `document.startViewTransition` before the router loads: its
   full-page snapshots paused rendering mid-flight. Page transitions are ours: `swap.ts` fades the old content out on
   click (header kept, rail kept between inner pages), the controller reveals the new one. Don't add `transition:*`
   directives or `view-transition-name`s.
3. **No runtime state on `<html>`**: Astro rewrites its attributes on every swap. `<html data-camera/data-stage/
   data-look/data-kind>` are *static per page* (set by `BaseLayout`). Runtime state lives on `#world` / `#player`.
4. **`#world` and `#player` markup must be identical on every page** (the entry page's copy lives all session).
   Language-dependent text in them uses `data-label-en` / `data-label-fr` (and `data-href-*`), synced after swaps.
5. **Page scripts run once.** Per-page setup goes through `onPage()` (`src/scripts/lifecycle.ts`), which re-runs on
   every page load and aborts its `signal` on `astro:before-swap`. Put a view's `<script>` **inside** `<BaseLayout>`
   (scripts after the layout end up outside `#page`; `adoptStrayScripts` is only a safety net).
6. **Animate only `transform` and `opacity`, of HTML boxes** (not SVG children: those repaint every frame), and
   no `filter`/`backdrop-filter`/`box-shadow` animations — anything that repaints per frame costs GPU time that a
   flight needs. Blur = crossfade to the pre-blurred image (`.world-blur` / the renderer's blur texture).
7. **Nothing heavy mid-flight**: videos start after `world:landed` (`whenLanded()`, `src/scripts/world/landing.ts`),
   sharper art loads only at rest, and hidden incoming content must not get its own GPU layer (no 3D transforms,
   `will-change` or pending CSS animations under `#page[data-entering]`): each one is rasterised mid-flight.
8. Astro 7 `compressHTML: 'jsx'` drops whitespace between inline elements — use `{' '}` when needed.
9. YAML flow mappings/sequences: **quote values containing commas** (labels, authors).
10. Never generate `/over.run/`, `/cookiecutter-neuroscience/`, `/unf-montreal.ca/` (other sites on the same domain;
    `check-dist` enforces it). Links to them need `data-astro-reload` or `target="_blank"`.
11. Touch screens: the art takes two taps (spotlight, then enter); the place labels on the map are links (one tap),
    all shown, with places outside the picture pinned to its edge (‹ ›). Keep `#page > .main--home` transparent to
    pointer events or phones can't tap the art.

## World layers, media, sound (2026-10)

- **Two renderers, same picture.** The CSS layers (back to front: `.world-stars` starfield with parallax, then in
  `.world-camera` `.world-aura` (blurred mirrored extension with the flux lines baked in, 2.5×), `.world-lqip`, the art
  with its soft eased mask, `.world-blur`; then `.world-dim`, `.world-vignette`, `.world-grain`) paint the first frame
  and are the fallback. Once its textures are loaded, a **WebGL 2 canvas** (`src/scripts/world/gl/renderer.ts`, in a
  worker on an OffscreenCanvas when possible, else on the main thread) draws the same stack in one pass and the CSS
  layers stop being painted (`#world[data-gl-done]`). Its shader mirrors `world.css`: **change both together**.
  Why: scaling a 4,840-px image with CSS transforms made Chrome re-rasterise and re-decode it at every zoom level
  (50–200 ms GPU stalls); textures are uploaded once. Hotspots (`.world-spots`) and labels stay HTML/SVG above it.
- Assets: `scripts/world/build-assets.mjs` (`--only=aura` rebuilds aura and stars). Keep the CSS layers plain raster
  images (an SVG `<img>` or dozens of CSS gradients made Firefox drop to a few fps).
- **Flights start on click**: `integrations/places-map.mjs` writes `dist/world/places.json` (every page's
  `data-camera/stage/look`, read from the built pages); on `astro:before-preparation` the controller flies there while
  the page downloads, and re-aims on `astro:after-swap` if needed (in `astro dev` there's no map: flights start on
  swap). One `.world-frame[data-stage]` per stage, so the next page's framing is known before it arrives.
- Flight maths (`src/scripts/world/motion.ts`, shared with the worker): van Wijk–Nuij path (rho 1.2), smootherstep,
  900–1700 ms, absolute times so worker and page agree. New content is revealed at 88 % of the flight (painting it
  stalls the GPU for a few frames: invisible only when the camera is slow); only on-screen elements fade in.
- Links are prefetched on hover/focus (all of them, `prefetchAll`) and on touch-start; file links opt out with
  `data-astro-prefetch="false"`.
- Measuring: headless Chrome can use the real GPU (`--enable-gpu --no-sandbox --use-gl=angle --use-angle=gl-egl
  --ozone-platform=headless`, plus `--disable-accelerated-video-decode`, or video decoding crashes its GPU process);
  count displayed frames with `Display::DrawAndSwap` trace events (page rAF doesn't see worker or compositor frames).
- Covers/figures: `cover`, `coverFocus`, `coverVideo`, `figures[]` (schema in `src/content.config.ts`); videos live
  in `public/media/<slug>/` (validated at build). `LoopVideo.astro` + `src/scripts/loop-video.ts`: in-view autoplay,
  pause button, nothing for reduced motion; tile videos autoplay muted while ≥35 % visible (not with reduced motion or
  Save-Data). Keep loops short and light (< ~1 MB): pixel-art clips are upscaled ×2–3 with nearest-neighbour.
- Sound cue: `#player[data-known]` (localStorage) stops the wave's idle breathing; `[data-hinted]` (sessionStorage)
  limits the "♪ play music" hint to once per visit. The Spotify iFrame API has no volume control (only
  play/pause/resume/seek), so audio fades are impossible with it. `#player[data-preview]` = 30 s previews.
- **The running wave must never jump** (e2e tests guard each point):
  - Its 125 % width sits on an HTML box (`.wave__run`), never on the `<svg>`: the global `svg { max-width: 100% }`
    squeezed it back into the window, the spare period showed, and the wave snapped back at every loop. The path
    is whole periods only, from trough to trough.
  - Its swell is a CSS *transition*, so the new panel that each page brings shows it at full height instead of
    swelling again.
  - `alignLoops()` (`player.ts`) puts every infinite animation in `.sound` on the document clock, so a new panel
    keeps the same phase.
  - The state turns `playing` only on real playback (`!isPaused && !isBuffering`, not at a track's end). While a
    track loads, Firefox's embed reports "paused" and a stale "end of track", so a track change keeps the state
    (`advancing`), and a 12 s failsafe shows "paused" if nothing plays.
- **DFA fader** (`src/components/Dfa.astro`, home panel only, riding the foot of the divider; bottom-right on phones):
  a mixer fader that Does Fuck All, on purpose (studio joke). Keep it wired to nothing — no script, no listener, no
  animation — and don't explain it on the site. The e2e test checks that moving it changes nothing else.

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
