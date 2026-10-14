/**
 * Flight maths shared by the camera controller (main thread) and the WebGL renderer (worker), so
 * both compute exactly the same camera at the same instant.
 *
 * A flight is a van Wijk–Nuij zoom/pan path between two views, played with "smootherstep" easing.
 * Times are absolute (performance.timeOrigin + performance.now()), which a worker shares with the page.
 */
import { interpolateZoom } from 'd3-interpolate';
import { viewToCamera } from './camera-core.js';

export type View = [number, number, number];
export type Cam = { s: number; tx: number; ty: number };
export type Look = { dim: number; vignette: number; blur: number };

// d3-interpolate implements interpolateZoom.rho(), but @types/d3-interpolate does not declare it
const zoomPath = (interpolateZoom as typeof interpolateZoom & { rho: (rho: number) => typeof interpolateZoom }).rho(1.2);

export const now = () => performance.timeOrigin + performance.now();

/**
 * "Smootherstep": zero speed *and* zero acceleration at both ends, so the camera eases out of rest
 * and settles without a jolt; its peak speed is ~1.9× the average.
 */
export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of progress (used for the looks: dim, vignette, blur). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const x = (u: number) => ((ax * u + bx) * u + cx) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 6; i++) {
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= (x(u) - t) / d;
    }
    u = Math.min(1, Math.max(0, u));
    return ((ay * u + by) * u + cy) * u;
  };
}

export const lookEase = cubicBezier(0.45, 0, 0.2, 1);
export const LOOK_EASING = 'cubic-bezier(.45,0,.2,1)';

export interface Flight {
  a: View;
  b: View;
  /** viewport (CSS px) the views refer to */
  vw: number;
  vh: number;
  t0: number;
  duration: number;
  lookA: Look;
  lookB: Look;
}

/** How long a flight between two views takes (ms). */
export function flightDuration(a: View, b: View) {
  return Math.min(1700, Math.max(900, zoomPath(a, b).duration * 0.85));
}

/** Rough "distance" between two views: 0 = same place. */
export function travel(a: View, b: View) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.max(a[2], b[2]) + Math.abs(Math.log(a[2] / b[2]));
}

export function pathOf(f: Pick<Flight, 'a' | 'b'>) {
  return zoomPath(f.a, f.b) as (t: number) => View;
}

const mixLook = (a: Look, b: Look, k: number): Look => ({
  dim: a.dim + (b.dim - a.dim) * k,
  vignette: a.vignette + (b.vignette - a.vignette) * k,
  blur: a.blur + (b.blur - a.blur) * k,
});

/** Camera view and look of a flight at absolute time `t`. */
export function flightAt(f: Flight, path: (t: number) => View, t: number): { view: View; look: Look; done: boolean } {
  const k = f.duration > 0 ? Math.min(1, Math.max(0, (t - f.t0) / f.duration)) : 1;
  return { view: k >= 1 ? f.b : path(smootherstep(k)), look: mixLook(f.lookA, f.lookB, lookEase(k)), done: k >= 1 };
}

export const camOf = (view: View, vw: number, vh: number): Cam => viewToCamera(view, vw, vh);

/**
 * The far starfield drifts slowly as the camera travels (parallax) and barely grows when it zooms.
 * Returns a translation (CSS px) and a scale about the centre of the star layer.
 */
export function starsOf(view: View, unitsW: number, unitsH: number) {
  return {
    tx: -(view[0] - unitsW / 2) * 0.14,
    ty: -(view[1] - unitsH / 2) * 0.14,
    s: Math.pow(unitsW / view[2], 0.07),
  };
}
