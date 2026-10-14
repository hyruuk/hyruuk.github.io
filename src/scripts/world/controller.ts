/**
 * The world camera: flies over the artwork from one page's place to the next.
 *
 * Flow of a navigation (see CLAUDE.md for the invariants):
 *   1. the router fetches the next page; the View Transition captures the old screen
 *   2. our custom swap (router/swap.ts) replaces #page only — the art (#world) stays put
 *   3. astro:after-swap → we read the new <html data-camera>, compute the target camera and fly
 *      there along a smooth zoom/pan path (van Wijk & Nuij, via d3-interpolate's interpolateZoom),
 *      animating only `transform` and `opacity` so it runs on the compositor
 *   4. the new page's content (hidden by data-entering) is revealed during the flight
 */
import { prefetch } from 'astro:prefetch';
import { interpolateZoom } from 'd3-interpolate';

// d3-interpolate implements interpolateZoom.rho(), but @types/d3-interpolate does not declare it
const zoomPath = (interpolateZoom as typeof interpolateZoom & { rho: (rho: number) => typeof interpolateZoom }).rho(1.2);
import {
  cameraToView,
  cameraTransform,
  computeCamera,
  frameOf,
  parseMatrix,
  pickTier,
  resolveSpec,
  viewToCamera,
} from './camera-core.js';

type Cam = { s: number; tx: number; ty: number };
type Look = { dim: number; vignette: number; blur: number };
type Tier = { w: number; avif: string; webp: string };

const world = document.getElementById('world');

if (world) init(world);

function init(world: HTMLElement) {
  const root = document.documentElement;
  const cam = world.querySelector<HTMLElement>('.world-camera')!;
  const frameEl = world.querySelector<HTMLElement>('.world-frame')!;
  const img = world.querySelector<HTMLImageElement>('.world-img')!;
  const source = world.querySelector<HTMLSourceElement>('.world-picture source');
  const hotspotLayer = world.querySelector<HTMLElement>('.hotspot-layer');
  const labelsLayer = world.querySelector<HTMLElement>('.world-labels');
  const layers = {
    dim: world.querySelector<HTMLElement>('.world-dim')!,
    vignette: world.querySelector<HTMLElement>('.world-vignette')!,
    blur: world.querySelector<HTMLElement>('.world-blur')!,
  };
  const looks: Record<string, Look> = JSON.parse(world.dataset.looks!);
  const tiers: Tier[] = JSON.parse(world.dataset.tiers!);
  const unitsW = Number(world.dataset.unitsW);
  const unitsH = Number(world.dataset.unitsH);
  const stars = world.querySelector<HTMLElement>('.world-stars');
  let starAnim: Animation | null = null;
  /** Far-away stars drift slowly as the camera travels (parallax), and barely grow when it zooms. */
  const starTransform = (view: number[]) =>
    `translate(${(-(view[0] - unitsW / 2) * 0.14).toFixed(1)}px,${(-(view[1] - unitsH / 2) * 0.14).toFixed(1)}px) scale(${Math.pow(unitsW / view[2], 0.07).toFixed(4)})`;
  const placeStars = (c: Cam) => {
    if (stars) stars.style.transform = starTransform(cameraToView(c, innerWidth, innerHeight));
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(hover: none), (pointer: coarse)');

  let flight: Animation | null = null;
  let layerAnims: Animation[] = [];
  let snapNext = false;
  let currentTier = Number(world.dataset.tier || 0);
  let revealTimer = 0;

  const spec = () => JSON.parse(root.dataset.camera || '{"rect":[0,0,1210,900]}');
  let previewSpec: Record<string, unknown> | null = null; // home-page preview of a place (touch screens)
  const target = (): Cam => {
    const f = frameOf(frameEl);
    return computeCamera(f, resolveSpec(previewSpec ?? spec(), f));
  };
  const current = (): Cam => parseMatrix(getComputedStyle(cam).transform) ?? target();
  const lookNow = (): Look => looks[root.dataset.look || 'full'] ?? looks.full;

  /* ---------- looks: dim / vignette / blurred backdrop ---------- */

  function applyLook(look: Look, duration: number) {
    layerAnims.forEach((a) => a.cancel());
    layerAnims = [];
    for (const [key, el] of Object.entries(layers) as [keyof Look, HTMLElement][]) {
      const to = String(look[key]);
      const from = getComputedStyle(el).opacity;
      el.style.opacity = from;
      if (!duration || from === to) {
        el.style.opacity = to;
        continue;
      }
      const a = el.animate([{ opacity: from }, { opacity: to }], { duration, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'both' });
      a.finished
        .then(() => {
          el.style.opacity = to;
          a.cancel();
        })
        .catch(() => {});
      layerAnims.push(a);
    }
  }

  /* ---------- the flight ---------- */

  /**
   * "Smootherstep": zero speed *and* zero acceleration at both ends, so the camera eases out of rest
   * and settles without a jolt; its peak speed is ~1.9× the average (a cubic ease-in-out peaks at 3×,
   * which made the middle of a flight feel rushed).
   */
  const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

  /** Move the camera to the current page's place. Returns the flight duration (0 = instant). */
  function fly(): number {
    const to = target();
    const from = current();
    flight?.cancel();
    flight = null;
    starAnim?.cancel();
    starAnim = null;
    cam.style.transform = cameraTransform(from);
    placeStars(from);
    const vw = innerWidth;
    const vh = innerHeight;

    const a = cameraToView(from, vw, vh);
    const b = cameraToView(to, vw, vh);
    const travel = Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.max(a[2], b[2]) + Math.abs(Math.log(a[2] / b[2]));
    root.style.setProperty('--enter-x', `${Math.sign(b[0] - a[0]) * 28}px`);

    if (reduced.matches || snapNext || travel < 0.003) {
      snapNext = false;
      cam.style.transform = cameraTransform(to);
      applyLook(lookNow(), reduced.matches ? 0 : 280);
      settle(to);
      return 0;
    }

    const path = zoomPath(a as [number, number, number], b as [number, number, number]);
    const duration = Math.min(1700, Math.max(900, path.duration * 0.85));
    // ~100 samples per second, smooth on 120 Hz screens too (WAAPI interpolates linearly between them)
    const steps = Math.max(24, Math.round(duration / 10));
    const keyframes: Keyframe[] = [];
    const starFrames: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
      const view = path(ease(i / steps));
      keyframes.push({ transform: cameraTransform(viewToCamera(view, vw, vh)) });
      starFrames.push({ transform: starTransform(view) });
    }
    const f = cam.animate(keyframes, { duration, easing: 'linear', fill: 'both' });
    if (stars) {
      const sa = stars.animate(starFrames, { duration, easing: 'linear', fill: 'both' });
      starAnim = sa;
      sa.finished
        .then(() => {
          if (starAnim !== sa) return;
          stars.style.transform = String(starFrames[starFrames.length - 1].transform);
          sa.cancel();
          starAnim = null;
        })
        .catch(() => {});
    }
    flight = f;
    world!.dataset.flying = '';
    f.finished
      .then(() => {
        if (flight !== f) return;
        cam.style.transform = cameraTransform(to);
        f.cancel();
        flight = null;
        delete world!.dataset.flying;
        settle(to);
      })
      .catch(() => {});
    applyLook(lookNow(), duration);
    // load a sharper tier early when zooming in, so it is ready when the flight lands
    void ensureTier(to.s);
    return duration;
  }

  /** After the camera stops: sharper image if needed, labels, hotspots. */
  function settle(c: Cam) {
    void ensureTier(c.s);
    placeLabels(c);
    if (!starAnim) placeStars(c);
    syncHotspots();
  }

  /* ---------- image tiers ---------- */

  async function ensureTier(s: number) {
    const t = pickTier(tiers, unitsW, s, devicePixelRatio);
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
    if (t.w <= currentTier) return;
    currentTier = t.w;
    world!.dataset.tier = String(t.w);
    if (source) source.srcset = t.avif;
    img.src = t.webp;
  }

  /* ---------- hotspots & labels (home page) ---------- */

  function syncHotspots() {
    const fr = root.lang === 'fr';
    const isHome = root.dataset.stage === 'home';
    world!.querySelectorAll<SVGAElement>('a.hotspot').forEach((a) => {
      const href = fr ? a.dataset.hrefFr : a.dataset.hrefEn;
      const label = fr ? a.dataset.labelFr : a.dataset.labelEn;
      if (href) a.setAttribute('href', href);
      if (label) a.setAttribute('aria-label', label);
    });
    labelsLayer?.querySelectorAll<HTMLElement>('[data-label-en]').forEach((el) => {
      el.textContent = (fr ? el.dataset.labelFr : el.dataset.labelEn) ?? '';
    });
    if (hotspotLayer) hotspotLayer.inert = !isHome;
  }

  /** Forget a previewed / armed place (touch screens). */
  function disarm() {
    world!.querySelectorAll('a.hotspot.armed').forEach((x) => x.classList.remove('armed'));
    delete world!.dataset.armed;
  }

  function placeLabels(c: Cam) {
    if (!labelsLayer) return;
    const vw = innerWidth;
    const vh = innerHeight;
    labelsLayer.querySelectorAll<HTMLElement>('.place-label').forEach((el) => {
      const ax = c.tx + Number(el.dataset.x) * c.s;
      const y = c.ty + Number(el.dataset.y) * c.s;
      // a place whose anchor is off screen shows no label; the others are kept fully on screen
      el.toggleAttribute('data-offscreen', ax < 0 || ax > vw || y < 0 || y > vh);
      const half = el.offsetWidth / 2 + 8;
      const x = Math.min(Math.max(ax, half), Math.max(half, vw - half));
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
  }

  // prefetch a place while the pointer rests on it (Astro's prefetch only handles HTML links)
  const prefetchHotspot = (e: Event) => {
    const a = (e.target as Element).closest?.('a.hotspot');
    const href = a?.getAttribute('href');
    if (href) prefetch(href);
  };
  world.addEventListener('pointerover', prefetchHotspot);
  world.addEventListener('focusin', prefetchHotspot);

  // touch screens: first tap previews a place (spotlight + label), second tap enters it
  world.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a.hotspot') as SVGAElement | null;
    if (!a || !touch.matches) return;
    if (a.classList.contains('armed')) return; // second tap: let the router navigate
    e.preventDefault();
    world.querySelectorAll('a.hotspot.armed').forEach((x) => x.classList.remove('armed'));
    a.classList.add('armed');
    world.dataset.armed = a.dataset.kw ?? '';
  });
  document.addEventListener('click', (e) => {
    if (!world.dataset.armed || (e.target as Element).closest?.('#world, .place-strip')) return;
    disarm();
    endPreview();
  });

  /** Touch screens, home page: fly to a place to preview it (from the place strip). */
  function preview(kw: string) {
    const a = world!.querySelector<SVGAElement>(`a.hotspot[data-kw="${CSS.escape(kw)}"]`);
    if (!a?.dataset.rect || root.dataset.stage !== 'home') return;
    const [rx, ry, rw, rh] = a.dataset.rect.split(',').map(Number);
    const units = Number(world!.dataset.unitsW);
    // a little margin around the place, kept inside the artwork
    const w = Math.min(units, rw * 1.3);
    const x = Math.max(0, Math.min(units - w, rx - rw * 0.15));
    previewSpec = { rect: [x, Math.max(0, ry - rh * 0.1), w, rh * 1.2], fit: 'contain', maxScale: 4 };
    world!.querySelectorAll('a.hotspot.armed').forEach((x) => x.classList.remove('armed'));
    a.classList.add('armed');
    world!.dataset.armed = kw;
    fly();
  }
  function endPreview() {
    if (!previewSpec) return;
    previewSpec = null;
    fly();
  }
  document.addEventListener('world:preview', (e) => preview((e as CustomEvent<{ kw: string }>).detail.kw));
  document.addEventListener('world:unpreview', () => {
    disarm();
    endPreview();
  });

  /* ---------- router hooks ---------- */

  addEventListener('popstate', (e) => {
    // iOS swipe-back already animates the page: snap instead of flying on top of it
    if ((e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition) snapNext = true;
  });

  document.addEventListener('astro:after-swap', () => {
    const page = document.getElementById('page');
    previewSpec = null;
    disarm();
    const duration = fly();
    clearTimeout(revealTimer);
    const reveal = () => {
      page?.removeAttribute('data-entering');
      const active = document.activeElement;
      if (!active || active === document.body || world.contains(active)) {
        page?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
      }
    };
    if (!duration) reveal();
    else revealTimer = window.setTimeout(reveal, duration * 0.55);
  });

  /* ---------- resize ---------- */

  let raf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (flight) {
        flight.cancel();
        flight = null;
        delete world.dataset.flying;
      }
      starAnim?.cancel();
      starAnim = null;
      const to = target();
      cam.style.transform = cameraTransform(to);
      settle(to);
    });
  });

  /* ---------- first load ---------- */

  const start = current();
  settle(start);
  world.dataset.ready = '';
}
