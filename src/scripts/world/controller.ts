/**
 * The world camera: flies over the artwork from one page's place to the next.
 *
 * Flow of a navigation (see CLAUDE.md for the invariants):
 *   1. a link is clicked → astro:before-preparation: if the destination is in the places map
 *      (places.ts) the flight starts at once, while the next page downloads and the old content
 *      fades out (router/swap.ts)
 *   2. our custom swap replaces #page only — the art (#world) stays put
 *   3. astro:after-swap → the new <html data-camera/data-stage/data-look> is checked against the
 *      flight (started now if the map didn't know the page, re-aimed if it guessed wrong)
 *   4. the new content (hidden by data-entering) is revealed as the camera slows down
 *
 * Two renderers play the same flight (same maths, motion.ts):
 *   - WebGL (gl/renderer.ts, in a worker when possible): takes over once its textures are loaded
 *   - the CSS layers, animated with WAAPI: first paint, and the fallback without WebGL
 */
import { prefetch } from 'astro:prefetch';
import { cameraToView, cameraTransform, computeCamera, frameOf, pickTier, resolveSpec } from './camera-core.js';
import { type GLHandle, startGL, supportsGL } from './gl/client';
import type { FromRenderer, Rest } from './gl/renderer';
import {
  type Cam,
  camOf,
  type Flight,
  flightAt,
  flightDuration,
  type Look,
  LOOK_EASING,
  lookEase,
  now,
  pathOf,
  smootherstep,
  starsOf,
  travel,
  type View,
} from './motion';
import { loadPlaces, type PlaceInfo, placeKey, placeOf } from './places';

type Tier = { w: number; avif: string; webp: string };
type Active = Flight & { path: (t: number) => View };

const world = document.getElementById('world');

if (world) init(world);

function init(world: HTMLElement) {
  const root = document.documentElement;
  const cam = world.querySelector<HTMLElement>('.world-camera')!;
  const spots = world.querySelector<HTMLElement>('.world-spots')!;
  const stars = world.querySelector<HTMLElement>('.world-stars');
  const img = world.querySelector<HTMLImageElement>('.world-img')!;
  const source = world.querySelector<HTMLSourceElement>('.world-picture source');
  const hotspotLayer = world.querySelector<HTMLElement>('.hotspot-layer');
  const labelsLayer = world.querySelector<HTMLElement>('.world-labels');
  const frames: Record<string, HTMLElement> = {};
  world.querySelectorAll<HTMLElement>('.world-frame').forEach((el) => (frames[el.dataset.stage!] = el));
  const layers = {
    dim: world.querySelector<HTMLElement>('.world-dim')!,
    vignette: world.querySelector<HTMLElement>('.world-vignette')!,
    blur: world.querySelector<HTMLElement>('.world-blur')!,
  };
  const looks: Record<string, Look> = JSON.parse(world.dataset.looks!);
  const tiers: Tier[] = JSON.parse(world.dataset.tiers!);
  const assets: { aura: string; blur: string; stars: string; twinkle: string } = JSON.parse(world.dataset.layers!);
  const W = Number(world.dataset.unitsW);
  const H = Number(world.dataset.unitsH);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(hover: none), (pointer: coarse)');

  /* ---------- state ---------- */

  const here = (): PlaceInfo => ({ camera: root.dataset.camera ?? '', stage: root.dataset.stage ?? 'backdrop', look: root.dataset.look ?? 'full' });
  /** where the camera is going (or is) */
  let aim: PlaceInfo = here();
  let restCam: Cam = camFor(aim);
  let restLook: Look = lookOf(aim.look);
  /** a look change without a flight (a jump), still fading */
  let lookFade: { from: Look; t0: number; duration: number } | null = null;
  let flight: Active | null = null;
  let landTimer = 0;
  let domAnims: Animation[] = [];
  let snapNext = false;
  /** the place a flight started at click time is heading to (checked once the page has arrived) */
  let expected: string | null = null;
  let enterX = 0;
  let revealTimer = 0;
  let currentTier = Number(world.dataset.tier || 0);
  let gl: GLHandle | null = null;
  let glState: 'off' | 'starting' | 'ready' | 'on' = 'off';

  function camFor(p: PlaceInfo): Cam {
    const f = frameOf(frames[p.stage] ?? frames.backdrop);
    return computeCamera(f, resolveSpec(JSON.parse(p.camera || `{"rect":[0,0,${W},${H}]}`), f));
  }
  function lookOf(name?: string): Look {
    return looks[name || 'full'] ?? looks.full;
  }

  /** What is on screen right now. */
  function shown(): { cam: Cam; look: Look } {
    const t = now();
    if (flight) {
      const at = flightAt(flight, flight.path, t);
      return { cam: camOf(at.view, flight.vw, flight.vh), look: at.look };
    }
    if (lookFade) {
      const k = lookEase(Math.min(1, (t - lookFade.t0) / lookFade.duration));
      const a = lookFade.from;
      const b = restLook;
      return { cam: restCam, look: { dim: a.dim + (b.dim - a.dim) * k, vignette: a.vignette + (b.vignette - a.vignette) * k, blur: a.blur + (b.blur - a.blur) * k } };
    }
    return { cam: restCam, look: restLook };
  }

  /* ---------- CSS renderer (first paint, fallback) ---------- */

  const starCss = (view: View) => {
    const s = starsOf(view, W, H);
    return `translate(${s.tx.toFixed(1)}px,${s.ty.toFixed(1)}px) scale(${s.s.toFixed(4)})`;
  };

  function domStop() {
    domAnims.forEach((a) => a.cancel());
    domAnims = [];
  }

  /** CSS layers at rest (kept up to date behind the WebGL canvas too, in case it is lost). */
  function domRest(c: Cam, look: Look, from?: Look, duration = 0) {
    domStop();
    const t = cameraTransform(c);
    cam.style.transform = t;
    spots.style.transform = t;
    if (stars) stars.style.transform = starCss(cameraToView(c, innerWidth, innerHeight) as View);
    for (const [key, el] of Object.entries(layers) as [keyof Look, HTMLElement][]) {
      el.style.opacity = String(look[key]);
      if (from && duration && glState !== 'on' && from[key] !== look[key]) {
        domAnims.push(el.animate([{ opacity: String(from[key]) }, { opacity: String(look[key]) }], { duration, easing: LOOK_EASING }));
      }
    }
  }

  /** The flight as WAAPI keyframes (~100 per second: WAAPI interpolates linearly between them). */
  function domFly(f: Active) {
    domStop();
    const steps = Math.max(24, Math.round(f.duration / 10));
    const camFrames: Keyframe[] = [];
    const starFrames: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
      const view = f.path(smootherstep(i / steps));
      camFrames.push({ transform: cameraTransform(camOf(view, f.vw, f.vh)) });
      starFrames.push({ transform: starCss(view) });
    }
    const opts: KeyframeAnimationOptions = { duration: f.duration, easing: 'linear', fill: 'forwards' };
    domAnims.push(cam.animate(camFrames, opts));
    if (stars) domAnims.push(stars.animate(starFrames, opts));
    for (const [key, el] of Object.entries(layers) as [keyof Look, HTMLElement][]) {
      domAnims.push(el.animate([{ opacity: String(f.lookA[key]) }, { opacity: String(f.lookB[key]) }], { duration: f.duration, easing: LOOK_EASING, fill: 'forwards' }));
    }
  }

  /* ---------- the flight ---------- */

  /** Move the camera to a place. Returns the flight duration (0 = jump). */
  function flyTo(p: PlaceInfo): number {
    const to = camFor(p);
    const look = lookOf(p.look);
    const vw = innerWidth;
    const vh = innerHeight;
    const cur = shown();
    const a = cameraToView(cur.cam, vw, vh) as View;
    const b = cameraToView(to, vw, vh) as View;
    aim = p;
    restCam = to;
    restLook = look;
    enterX = Math.sign(b[0] - a[0]) * 28;
    clearTimeout(landTimer);
    if (glState === 'on' && !('glDone' in world!.dataset)) showGL(true);

    if (reduced.matches || snapNext || travel(a, b) < 0.003) {
      snapNext = false;
      flight = null;
      delete world!.dataset.flying;
      const duration = reduced.matches ? 0 : 280;
      lookFade = duration ? { from: cur.look, t0: now(), duration } : null;
      domRest(to, look, cur.look, duration);
      if (glState === 'on') gl!.send({ type: 'rest', rest: restMsg(cur.look, duration) });
      settle();
      landed();
      return 0;
    }

    lookFade = null;
    const duration = flightDuration(a, b);
    const f: Active = { a, b, vw, vh, t0: now(), duration, lookA: cur.look, lookB: look, path: pathOf({ a, b }) };
    flight = f;
    world!.dataset.flying = '';
    if (glState === 'on') {
      domRest(to, look); // hidden behind the canvas: keep them where the camera is going
      const { path: _path, ...plain } = f;
      gl!.send({ type: 'fly', flight: plain });
      landTimer = window.setTimeout(land, duration);
    } else {
      domFly(f);
      landTimer = window.setTimeout(land, duration + 20); // WAAPI starts on the next frame
    }
    return duration;
  }

  function land() {
    if (!flight) return;
    flight = null;
    delete world!.dataset.flying;
    domRest(restCam, restLook);
    settle();
    landed();
    if (glState === 'ready') activateGL();
  }

  /** The camera is at rest: work held back during the flight can start (see landing.ts). */
  function landed() {
    document.dispatchEvent(new Event('world:landed'));
  }

  /** After the camera stops: sharper image if needed, labels, hotspots. */
  function settle() {
    placeLabels(restCam);
    syncHotspots();
    scheduleTier();
  }

  /* ---------- image tiers ---------- */

  let tierTimer = 0;
  /** A sharper version of the art when zoomed in — loaded only while the camera rests. */
  function scheduleTier() {
    clearTimeout(tierTimer);
    tierTimer = window.setTimeout(() => {
      if (flight) return;
      if (glState === 'on' || glState === 'ready') gl!.send({ type: 'art', want: W * restCam.s * glDpr() });
      else void ensureTier(restCam.s);
    }, 700);
  }

  async function ensureTier(s: number) {
    const t = pickTier(tiers, W, s, devicePixelRatio);
    if (t.w <= currentTier) return;
    const avif = (img.currentSrc || '').endsWith('.avif');
    const pre = new Image();
    pre.decoding = 'async';
    pre.src = avif ? t.avif : t.webp;
    try {
      await pre.decode();
    } catch {
      return;
    }
    if (t.w <= currentTier || flight) return; // settle() asks again once landed
    currentTier = t.w;
    world!.dataset.tier = String(t.w);
    if (source) source.srcset = t.avif;
    img.src = t.webp;
  }

  /* ---------- WebGL renderer ---------- */

  const glDpr = () => Math.min(devicePixelRatio || 1, 2);
  /** phones: at most the 3,630-px art (≈ 50 MB of video memory with its mipmaps) */
  const deviceCap = () => (touch.matches && Math.min(screen.width, screen.height) < 820 ? 3630 : Infinity);

  function restMsg(from?: Look, duration = 0): Rest {
    const r: Rest = { cam: restCam, vw: innerWidth, vh: innerHeight, look: restLook };
    if (from && duration) Object.assign(r, { lookFrom: from, t0: now(), lookDuration: duration });
    return r;
  }

  function startRenderer(useWorker = true) {
    if (!supportsGL() || glState !== 'off') return;
    glState = 'starting';
    const avif = (img.currentSrc || '').endsWith('.avif');
    void startGL(
      world!,
      spots,
      () => ({
        cssW: world!.clientWidth,
        cssH: world!.clientHeight,
        dpr: glDpr(),
        units: [W, H],
        tiers: tiers.map((t) => ({ w: t.w, url: avif ? t.avif : t.webp })),
        want: currentTier || W * restCam.s * glDpr(), // the image already loaded (cached) first
        cap: deviceCap(),
        ...assets,
        rest: restMsg(),
      }),
      onGL,
      useWorker,
    ).then((h) => {
      if (!h && glState === 'starting') glState = 'off';
    });
  }

  function onGL(m: FromRenderer, h: GLHandle) {
    if (m.type === 'ready') {
      gl = h;
      glState = 'ready';
      if (!flight) activateGL();
    } else if (m.type === 'fail' || m.type === 'lost') {
      console.info(`[world] WebGL renderer (${h.mode}) ${m.type === 'lost' ? 'lost' : `unavailable: ${m.reason}`}`);
      const retry = m.type === 'fail' && h.mode === 'worker'; // e.g. no WebGL in workers: try the main thread
      h.stop();
      if (gl === h) gl = null;
      const wasOn = glState === 'on';
      glState = 'off';
      delete world!.dataset.gl;
      delete world!.dataset.glDone;
      if (wasOn) {
        // the CSS layers take over where the camera is going
        clearTimeout(landTimer);
        if (flight) land();
        else domRest(restCam, restLook);
      }
      if (retry) startRenderer(false);
    }
  }

  function activateGL() {
    if (!gl || glState !== 'ready') return;
    gl.send({ type: 'rest', rest: restMsg() }); // the camera may have moved while the textures loaded
    glState = 'on';
    domStop();
    requestAnimationFrame(() => requestAnimationFrame(() => showGL(false)));
    scheduleTier();
  }

  /** Show the canvas (a short crossfade over identical pictures), then stop painting the CSS layers. */
  function showGL(instant: boolean) {
    if (glState !== 'on') return;
    world!.dataset.gl = '';
    if (instant) world!.dataset.glDone = '';
    else window.setTimeout(() => glState === 'on' && (world!.dataset.glDone = ''), 400);
  }

  /* ---------- hotspots & labels (home page) ---------- */

  function syncHotspots() {
    const fr = root.lang === 'fr';
    const isHome = root.dataset.stage === 'home';
    world!.querySelectorAll<HTMLElement>('a.hotspot, a.place-label').forEach((a) => {
      const href = fr ? a.dataset.hrefFr : a.dataset.hrefEn;
      const label = fr ? a.dataset.labelFr : a.dataset.labelEn;
      if (href) a.setAttribute('href', href);
      if (label) a.setAttribute('aria-label', label);
    });
    labelsLayer?.querySelectorAll<HTMLElement>('.place-label__name').forEach((el) => {
      el.textContent = (fr ? el.dataset.labelFr : el.dataset.labelEn) ?? '';
    });
    if (hotspotLayer) hotspotLayer.inert = !isHome;
    if (labelsLayer) labelsLayer.inert = !isHome;
  }

  /** Forget an armed place (touch screens). */
  function disarm() {
    world!.querySelectorAll('a.hotspot.armed').forEach((x) => x.classList.remove('armed'));
    delete world!.dataset.armed;
  }

  /**
   * Labels follow their place on the art. On touch screens they are the way into each place: all
   * of them are shown, places outside the picture are pinned to its edge (‹ ›) and labels never overlap.
   */
  function placeLabels(c: Cam) {
    if (!labelsLayer) return;
    const vw = labelsLayer.clientWidth || innerWidth;
    const pin = touch.matches && root.dataset.stage === 'home';
    const fr = frameOf(frames.home ?? frames.backdrop);
    const boxes: { el: HTMLElement; x: number; y: number; w: number; h: number }[] = [];
    labelsLayer.querySelectorAll<HTMLElement>('.place-label').forEach((el) => {
      const ax = c.tx + Number(el.dataset.x) * c.s;
      let y = c.ty + Number(el.dataset.y) * c.s;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const half = w / 2 + 8;
      let edge = '';
      if (pin) {
        // the arrow only for places really outside the picture; the others are just kept on screen
        if (ax < 0) edge = 'left';
        else if (ax > vw) edge = 'right';
        y = Math.min(Math.max(y, fr.y + h / 2 + 6), fr.y + fr.h - h / 2 - 6);
        el.removeAttribute('data-offscreen');
      } else {
        el.toggleAttribute('data-offscreen', ax < 0 || ax > vw || y < 0 || y > innerHeight);
      }
      if (edge) el.dataset.edge = edge;
      else delete el.dataset.edge;
      boxes.push({ el, x: Math.min(Math.max(ax, half), Math.max(half, vw - half)), y, w, h });
    });
    if (pin) {
      // nudge overlapping labels apart, top to bottom
      boxes.sort((a, b) => a.y - b.y);
      const placed: typeof boxes = [];
      for (const b of boxes) {
        for (let guard = 0; guard < boxes.length; guard++) {
          const hit = placed.find((p) => Math.abs(p.x - b.x) < (p.w + b.w) / 2 + 6 && Math.abs(p.y - b.y) < (p.h + b.h) / 2 + 4);
          if (!hit) break;
          b.y = hit.y + (hit.h + b.h) / 2 + 4;
        }
        placed.push(b);
      }
    }
    for (const b of boxes) b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)`;
  }

  // prefetch a place while the pointer rests on it (Astro's prefetch only handles HTML links)
  const prefetchHotspot = (e: Event) => {
    const a = (e.target as Element).closest?.('a.hotspot');
    const href = a?.getAttribute('href');
    if (href) prefetch(href);
  };
  world.addEventListener('pointerover', prefetchHotspot);
  world.addEventListener('focusin', prefetchHotspot);

  // touch screens: a first tap on the art spotlights a place, a second tap enters it (labels enter at once)
  world.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a.hotspot') as SVGAElement | null;
    if (!a || !touch.matches) return;
    if (a.classList.contains('armed')) return; // second tap: let the router navigate
    e.preventDefault();
    disarm();
    a.classList.add('armed');
    world.dataset.armed = a.dataset.kw ?? '';
  });
  document.addEventListener('click', (e) => {
    if (world.dataset.armed && !(e.target as Element).closest?.('#world')) disarm();
  });

  /* ---------- router hooks ---------- */

  // iOS swipe-back already animates the page: jump instead of flying on top of it.
  // (capture: runs before the router's own popstate listener starts the navigation)
  addEventListener(
    'popstate',
    (e) => {
      if ((e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition) snapNext = true;
    },
    { capture: true },
  );

  // the flight starts on click, while the next page downloads
  document.addEventListener('astro:before-preparation', (e) => {
    const dest = placeOf((e as Event & { to: URL }).to);
    disarm();
    expected = dest ? placeKey(dest) : null;
    if (dest) flyTo(dest);
  });

  document.addEventListener('astro:after-swap', () => {
    const page = document.getElementById('page');
    disarm();
    const real = here();
    if (placeKey(real) !== expected) flyTo(real); // the map didn't know this page (or guessed wrong)
    expected = null;
    page?.style.setProperty('--enter-x', `${enterX}px`);
    clearTimeout(revealTimer);
    const reveal = () => {
      if (!page) return;
      // only what is on screen fades in: every animated element costs a GPU layer mid-flight
      const vh = innerHeight;
      page.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top > vh || r.bottom < 0) el.classList.add('reveal--now');
      });
      page.removeAttribute('data-entering');
      const active = document.activeElement;
      if (!active || active === document.body || world.contains(active)) {
        page.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
      }
    };
    // reveal the new content as the camera settles: painting it costs the GPU a few frames, which
    // only show when the camera still moves fast (at 88 % of a flight it moves at < 1/5 of its top speed)
    const wait = flight ? flight.t0 + flight.duration * 0.88 - now() : 0;
    if (wait > 0) revealTimer = window.setTimeout(reveal, wait);
    else requestAnimationFrame(reveal);
  });

  /* ---------- resize ---------- */

  let raf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const to = camFor(aim);
      const same = Math.abs(to.s / restCam.s - 1) < 1e-4 && Math.abs(to.tx - restCam.tx) < 0.5 && Math.abs(to.ty - restCam.ty) < 0.5;
      const size = { type: 'size' as const, cssW: world.clientWidth, cssH: world.clientHeight, dpr: glDpr() };
      if (same) {
        // e.g. a phone's address bar showing or hiding: the place on screen didn't move, keep flying
        if (gl && glState !== 'off') gl.send(size);
        if (!flight) settle();
        return;
      }
      // the stage changed (window resized, phone rotated): jump to the new framing
      clearTimeout(landTimer);
      flight = null;
      lookFade = null;
      delete world.dataset.flying;
      restCam = to;
      restLook = lookOf(aim.look);
      domRest(restCam, restLook);
      if (gl && glState !== 'off') gl.send({ ...size, rest: restMsg() });
      settle();
      landed();
    });
  });

  /* ---------- first load ---------- */

  domRest(restCam, restLook);
  settle();
  world.dataset.ready = '';
  if (document.fonts?.ready) void document.fonts.ready.then(() => !flight && placeLabels(restCam));

  // once the art is on screen and the browser is idle: the places map, then the WebGL renderer
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 400));
  const boot = () =>
    idle(() => {
      void loadPlaces();
      if (!flight) startRenderer();
      else document.addEventListener('world:landed', () => startRenderer(), { once: true });
    });
  if (img.complete && img.naturalWidth) boot();
  else {
    img.addEventListener('load', boot, { once: true });
    img.addEventListener('error', () => void loadPlaces(), { once: true });
  }
}
