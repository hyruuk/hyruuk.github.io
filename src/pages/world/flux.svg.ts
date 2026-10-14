/**
 * /world/flux.svg — faint luminous lines that continue the artwork's "neural flux" into the void
 * around it, so the picture reads as the visible part of an infinite universe.
 * Generated once at build time (deterministic), drawn in world units around the 1210 × 900 art:
 * the SVG covers four times the art in each direction and is positioned by World.astro.
 */
import type { APIRoute } from 'astro';
import { seeded } from '../../lib/compose';

const W = 1210;
const H = 900;
const X0 = -1.5 * W;
const Y0 = -1.5 * H;
const VW = 4 * W;
const VH = 4 * H;

function wave(rand: () => number) {
  const y0 = Y0 + 250 + rand() * (VH - 500);
  const a = 30 + rand() * 170;
  const lambda = 450 + rand() * 1000;
  const phi = rand() * Math.PI * 2;
  const slope = (rand() - 0.5) * 0.3;
  const a2 = a * (0.2 + rand() * 0.4);
  const lambda2 = lambda * (0.3 + rand() * 0.3);
  const pts: [number, number][] = [];
  for (let x = X0; x <= X0 + VW; x += 110) {
    pts.push([x, y0 + slope * (x - W / 2) + a * Math.sin((2 * Math.PI * x) / lambda + phi) + a2 * Math.sin((2 * Math.PI * x) / lambda2 + phi * 1.7)]);
  }
  // Catmull-Rom → cubic Bézier, for smooth curves at any zoom
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[Math.max(0, k - 1)];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[Math.min(pts.length - 1, k + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

export const GET: APIRoute = () => {
  const rand = seeded('neural-odyssey-flux');
  const palette = ['#42b1e6', '#009df1', '#8b8bf3', '#a978f1', '#ee649e', '#dc67e6', '#9fd8ff', '#5ad1c8'];
  const lines = Array.from({ length: 16 }, (_, i) => {
    const width = (0.7 + rand() * 1.1).toFixed(2);
    const opacity = (0.18 + rand() * 0.35).toFixed(2);
    return `<path d="${wave(rand)}" stroke="${palette[i % palette.length]}" stroke-width="${width}" stroke-opacity="${opacity}"/>`;
  }).join('');
  const motes = Array.from({ length: 90 }, () => {
    const x = (X0 + rand() * VW).toFixed(0);
    const y = (Y0 + rand() * VH).toFixed(0);
    const r = (0.6 + rand() * 1.6).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${palette[Math.floor(rand() * palette.length)]}" fill-opacity="${(0.25 + rand() * 0.5).toFixed(2)}"/>`;
  }).join('');
  // hidden where the painting already is, visible around it, fading out far away
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${X0} ${Y0} ${VW} ${VH}" width="${VW}" height="${VH}"><defs><radialGradient id="r" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${H / 2}" r="${1.9 * W}" gradientTransform="translate(${W / 2} ${H / 2}) scale(1 0.78) translate(${-W / 2} ${-H / 2})"><stop offset="0" stop-color="#000"/><stop offset=".2" stop-color="#000"/><stop offset=".3" stop-color="#fff"/><stop offset=".58" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="m" maskUnits="userSpaceOnUse" x="${X0}" y="${Y0}" width="${VW}" height="${VH}"><rect x="${X0}" y="${Y0}" width="${VW}" height="${VH}" fill="url(#r)"/></mask></defs><g mask="url(#m)" fill="none" stroke-linecap="round">${lines}${motes}</g></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
