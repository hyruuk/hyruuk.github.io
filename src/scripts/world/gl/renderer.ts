/**
 * WebGL renderer of the world: draws the whole art layer stack (starfield, aura, painting with its
 * soft edges, blurred backdrop, dim, vignette, grain) in ONE pass over a full-screen canvas.
 *
 * Why: moving a 4,840-px painting with CSS transforms makes the browser re-rasterise and re-decode it
 * at every new zoom level; those 50–200 ms jobs on the GPU thread are what made flights stutter.
 * Here the images are uploaded once as mipmapped textures and a flight only changes a few numbers.
 *
 * Runs in a worker on an OffscreenCanvas when possible (src/scripts/world/gl/worker.ts) so page work on
 * the main thread (fetching, swapping, layout) never delays a frame; otherwise on the main thread.
 * The layers reproduce src/styles/world.css exactly (same maths), so the hand-over from the CSS layers
 * is invisible. Messages: see ToRenderer / FromRenderer.
 */
import { cameraToView } from '../camera-core.js';
import { type Cam, camOf, type Flight, flightAt, type Look, lookEase, now, pathOf, starsOf, type View } from '../motion';

export type Tier = { w: number; url: string };

export type ToRenderer =
  | {
      type: 'init';
      canvas?: OffscreenCanvas | HTMLCanvasElement;
      cssW: number;
      cssH: number;
      dpr: number;
      units: [number, number];
      tiers: Tier[];
      /** art width wanted now, and the most this device should ever load */
      want: number;
      cap: number;
      aura: string;
      blur: string;
      stars: string;
      twinkle: string;
      rest: Rest;
    }
  | { type: 'size'; cssW: number; cssH: number; dpr: number; rest?: Rest }
  | { type: 'rest'; rest: Rest }
  | { type: 'fly'; flight: Flight }
  | { type: 'art'; want: number };

export type FromRenderer = { type: 'ready' } | { type: 'fail'; reason: string } | { type: 'lost' } | { type: 'art'; w: number };

/** The camera at rest, optionally with a look transition (for jumps without a flight). */
export type Rest = { cam: Cam; vw: number; vh: number; look: Look; lookFrom?: Look; t0?: number; lookDuration?: number };

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Mirrors src/styles/world.css: #world background, .world-stars, .world-aura, .world-img (+ mask),
// .world-blur, .world-dim, .world-vignette, .world-grain — composited in sRGB like the browser does.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res;      // canvas size (device px)
uniform vec2 u_css;      // canvas size (CSS px)
uniform vec2 u_units;    // artwork size (world units)
uniform vec3 u_cam;      // s, tx, ty: screen = t + world * s
uniform vec3 u_star;     // tx, ty, s of the star layer
uniform vec3 u_look;     // dim, vignette, blur
uniform sampler2D u_art, u_aura, u_blur, u_stars, u_twinkle;
out vec4 o;
const vec3 BG = vec3(6.0, 13.0, 20.0) / 255.0;

vec4 over(vec4 top, vec4 under) { return top + under * (1.0 - top.a); }

// eased soft edge of the painting: alpha 0 -> .18 -> .5 -> .82 -> 1 at the given distances from the edge
float edge(float t, vec4 x) {
  if (t <= 0.0) return 0.0;
  if (t < x.x) return 0.18 * t / x.x;
  if (t < x.y) return mix(0.18, 0.5, (t - x.x) / (x.y - x.x));
  if (t < x.z) return mix(0.5, 0.82, (t - x.y) / (x.z - x.y));
  if (t < x.w) return mix(0.82, 1.0, (t - x.z) / (x.w - x.z));
  return 1.0;
}

vec4 glow(vec2 rel, vec2 c, vec2 r, vec4 col) {
  float a = col.a * clamp(1.0 - length((rel - c) / r) / 0.7, 0.0, 1.0);
  return vec4(col.rgb * a, a);
}

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) * (u_css / u_res);
  vec4 col = vec4(BG, 1.0);

  // starfield: a box 12% larger than the screen on every side, moved about its centre
  vec2 c = 0.5 * u_css;
  vec2 q = c + (p - c - u_star.xy) / u_star.z + 0.12 * u_css;
  col = over(texture(u_stars, q / 512.0), col);
  col = over(texture(u_twinkle, q / 640.0), col);
  vec2 rel = q / (1.24 * u_css);
  col = over(glow(rel, vec2(0.78, 0.86), vec2(0.34, 0.28), vec4(0.0, 157.0, 241.0, 12.75) / 255.0), col);
  col = over(glow(rel, vec2(0.88, 0.18), vec2(0.30, 0.26), vec4(238.0, 100.0, 158.0, 12.75) / 255.0), col);
  col = over(glow(rel, vec2(0.12, 0.78), vec2(0.38, 0.30), vec4(114.0, 115.0, 238.0, 17.85) / 255.0), col);

  // the painting's world
  vec2 w = (p - u_cam.yz) / u_cam.x;
  vec2 ua = (w + 0.75 * u_units) / (2.5 * u_units);
  float inAura = step(0.0, ua.x) * step(ua.x, 1.0) * step(0.0, ua.y) * step(ua.y, 1.0);
  col = over(texture(u_aura, ua) * inAura, col);

  vec2 u = w / u_units;
  float inArt = step(0.0, u.x) * step(u.x, 1.0) * step(0.0, u.y) * step(u.y, 1.0);
  float m = inArt
    * edge(min(u.y, 1.0 - u.y), vec4(0.03, 0.065, 0.10, 0.14))
    * edge(min(u.x, 1.0 - u.x), vec4(0.025, 0.055, 0.09, 0.125));
  col.rgb = mix(col.rgb, texture(u_art, u).rgb, m);
  col.rgb = mix(col.rgb, texture(u_blur, u).rgb, m * u_look.z);

  // dim, then vignette (radial over linear, both in the background colour)
  col.rgb = mix(col.rgb, BG, u_look.x);
  vec2 v = p / u_css;
  float lin = v.y < 0.22 ? 0.55 * (1.0 - v.y / 0.22) : (v.y > 0.78 ? 0.6 * (v.y - 0.78) / 0.22 : 0.0);
  float rad = 0.92 * clamp((length((v - vec2(0.3, 0.5)) / vec2(1.2, 0.9)) - 0.4) / 0.6, 0.0, 1.0);
  col.rgb = mix(col.rgb, BG, (rad + lin * (1.0 - rad)) * u_look.y);

  // a whisper of film grain (also dithers the dark gradients)
  col.rgb = mix(col.rgb, vec3(1.0), 0.03 * hash(floor(p)));
  o = vec4(col.rgb, 1.0);
}`;

type GL = WebGL2RenderingContext;
const raf: (cb: () => void) => void =
  typeof requestAnimationFrame === 'function' ? (cb) => requestAnimationFrame(cb) : (cb) => setTimeout(cb, 16);

async function bitmap(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return createImageBitmap(await res.blob(), { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'default' });
}

/** Creates the renderer; `post` sends messages back to the page. Returns the message handler. */
export function createRenderer(post: (m: FromRenderer) => void) {
  let gl: GL | null = null;
  let canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  let prog: WebGLProgram | null = null;
  const loc: Record<string, WebGLUniformLocation | null> = {};
  const tex: Record<string, WebGLTexture> = {};
  let units: [number, number] = [1210, 900];
  let css = { w: 1, h: 1 };
  let tiers: Tier[] = [];
  let cap = Infinity;
  let maxTex = 4096;
  let artW = 0;
  let rest: Rest | null = null;
  let flight: { f: Flight; path: (t: number) => View } | null = null;
  let ready = false;
  let lost = false;
  let looping = false;
  /**
   * Big texture uploads wait until the camera has landed and the page content has faded in: an upload
   * stalls the GPU for a frame or two, invisible only when nothing moves.
   */
  const pending: (() => void)[] = [];
  const flushPending = () => setTimeout(() => {
    if (!flight) while (pending.length) pending.shift()!();
  }, 1200);

  function compile(type: number, src: string) {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? 'shader');
    return s;
  }

  function setup() {
    const g = gl!;
    prog = g.createProgram()!;
    g.attachShader(prog, compile(g.VERTEX_SHADER, VERT));
    g.attachShader(prog, compile(g.FRAGMENT_SHADER, FRAG));
    g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(prog) ?? 'link');
    g.useProgram(prog);
    for (const n of ['u_res', 'u_css', 'u_units', 'u_cam', 'u_star', 'u_look']) loc[n] = g.getUniformLocation(prog, n);
    ['u_art', 'u_aura', 'u_blur', 'u_stars', 'u_twinkle'].forEach((n, i) => g.uniform1i(g.getUniformLocation(prog!, n), i));
    g.bindVertexArray(g.createVertexArray());
    g.disable(g.DEPTH_TEST);
    g.disable(g.BLEND);
    maxTex = g.getParameter(g.MAX_TEXTURE_SIZE);
  }

  function upload(name: string, unit: number, img: ImageBitmap, repeat: boolean) {
    const g = gl!;
    const t = tex[name] ?? g.createTexture()!;
    tex[name] = t;
    g.activeTexture(g.TEXTURE0 + unit);
    g.bindTexture(g.TEXTURE_2D, t);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, g.RGBA, g.UNSIGNED_BYTE, img);
    g.generateMipmap(g.TEXTURE_2D);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    const wrap = repeat ? g.REPEAT : g.CLAMP_TO_EDGE;
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, wrap);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, wrap);
    img.close();
  }

  /** Largest allowed tier that is at least `want` wide (or the largest allowed one). */
  function pickArt(want: number) {
    const ok = tiers.filter((t) => t.w <= Math.min(cap, maxTex));
    const list = ok.length ? ok : tiers.slice(0, 1);
    return list.find((t) => t.w >= want * 0.9) ?? list[list.length - 1];
  }

  function resize(cssW: number, cssH: number, dpr: number) {
    css = { w: Math.max(1, cssW), h: Math.max(1, cssH) };
    const w = Math.max(1, Math.round(css.w * dpr));
    const h = Math.max(1, Math.round(css.h * dpr));
    if (canvas && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function state(t: number): { cam: Cam; view: View; look: Look; moving: boolean } | null {
    if (flight) {
      const at = flightAt(flight.f, flight.path, t);
      const { vw, vh } = flight.f;
      if (at.done) {
        rest = { cam: camOf(flight.f.b, vw, vh), vw, vh, look: flight.f.lookB };
        flight = null;
        if (pending.length) flushPending();
      }
      return { cam: camOf(at.view, vw, vh), view: at.view, look: at.look, moving: !at.done };
    }
    if (!rest) return null;
    let look = rest.look;
    let moving = false;
    if (rest.lookFrom && rest.lookDuration && rest.t0 !== undefined) {
      const k = Math.min(1, Math.max(0, (t - rest.t0) / rest.lookDuration));
      const e = lookEase(k);
      const a = rest.lookFrom;
      look = { dim: a.dim + (look.dim - a.dim) * e, vignette: a.vignette + (look.vignette - a.vignette) * e, blur: a.blur + (look.blur - a.blur) * e };
      moving = k < 1;
    }
    return { cam: rest.cam, view: cameraToView(rest.cam, rest.vw, rest.vh) as View, look, moving };
  }

  function draw() {
    if (!gl || !ready || lost) return false;
    const s = state(now());
    if (!s) return false;
    const g = gl;
    const st = starsOf(s.view, units[0], units[1]);
    g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
    g.uniform2f(loc.u_res, g.drawingBufferWidth, g.drawingBufferHeight);
    g.uniform2f(loc.u_css, css.w, css.h);
    g.uniform2f(loc.u_units, units[0], units[1]);
    g.uniform3f(loc.u_cam, s.cam.s, s.cam.tx, s.cam.ty);
    g.uniform3f(loc.u_star, st.tx, st.ty, st.s);
    g.uniform3f(loc.u_look, s.look.dim, s.look.vignette, s.look.blur);
    g.drawArrays(g.TRIANGLES, 0, 3);
    return s.moving;
  }

  function frame() {
    looping = false;
    if (draw()) kick();
  }

  /** Schedule a frame (one per display refresh while something moves). */
  function kick() {
    if (looping) return;
    looping = true;
    raf(frame);
  }

  /** Redraw now (same task as a resize, so the canvas is never shown cleared). */
  function redraw() {
    if (draw()) kick();
  }

  async function init(m: Extract<ToRenderer, { type: 'init' }>) {
    canvas = m.canvas ?? null;
    units = m.units;
    tiers = m.tiers;
    cap = m.cap;
    rest = m.rest;
    let step = 'context';
    try {
      gl = (canvas?.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      }) ?? null) as GL | null;
      if (!gl) throw new Error('no webgl2');
      canvas!.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        lost = true;
        post({ type: 'lost' });
      });
      step = 'shaders';
      setup();
      resize(m.cssW, m.cssH, m.dpr);
      const art = pickArt(m.want);
      step = `images (${art.w})`;
      const [a, au, bl, s1, s2] = await Promise.all([bitmap(art.url), bitmap(m.aura), bitmap(m.blur), bitmap(m.stars), bitmap(m.twinkle)]);
      step = 'upload';
      upload('art', 0, a, false);
      upload('aura', 1, au, false);
      upload('blur', 2, bl, false);
      upload('stars', 3, s1, true);
      upload('twinkle', 4, s2, true);
      artW = art.w;
      ready = true;
      redraw();
      post({ type: 'ready' });
    } catch (err) {
      const e = err as Error;
      post({ type: 'fail', reason: `${step}: ${e?.name ?? ''} ${e?.message ?? String(err)}`.trim() });
    }
  }

  async function upgradeArt(want: number) {
    const t = pickArt(want);
    if (!ready || t.w <= artW) return;
    const target = t.w;
    artW = target; // claim it now so repeated requests don't load it twice
    try {
      const img = await bitmap(t.url);
      const apply = () => {
        if (lost) return img.close();
        upload('art', 0, img, false);
        redraw();
        post({ type: 'art', w: target });
      };
      if (flight) pending.push(apply);
      else apply();
    } catch {
      /* keep the current texture */
    }
  }

  return function handle(m: ToRenderer) {
    switch (m.type) {
      case 'init':
        void init(m);
        break;
      case 'size':
        resize(m.cssW, m.cssH, m.dpr);
        if (m.rest) {
          flight = null;
          rest = m.rest;
        }
        redraw();
        break;
      case 'rest':
        flight = null;
        rest = m.rest;
        redraw();
        break;
      case 'fly':
        flight = { f: m.flight, path: pathOf(m.flight) };
        kick();
        break;
      case 'art':
        void upgradeArt(m.want);
        break;
    }
  };
}
