import { describe, expect, it } from 'vitest';
import { cameraToView, computeCamera, parseMatrix, pickTier, resolveSpec, viewToCamera } from '../../src/scripts/world/camera-core.js';

const frame = { x: 0, y: 0, w: 1209, h: 1024 };

describe('camera math', () => {
  it('fits the whole world in the home stage like the mockup (right edge on the divider)', () => {
    const c = computeCamera(frame, { rect: [0, 0, 1210, 900], fit: 'contain', align: [1, 0.55] });
    expect(c.s).toBeCloseTo(1209 / 1210, 4);
    expect(c.tx + 1210 * c.s).toBeCloseTo(1209, 3); // right edge of the art = right edge of the stage
    expect(c.ty).toBeGreaterThan(60); // vertically centred-ish with room for the header
  });

  it('cover fills the frame and zoom multiplies the scale', () => {
    const c = computeCamera({ x: 0, y: 0, w: 600, h: 900 }, { rect: [400, 300, 200, 300], fit: 'cover' });
    expect(c.s).toBeCloseTo(3);
    const z = computeCamera({ x: 0, y: 0, w: 600, h: 900 }, { rect: [400, 300, 200, 300], fit: 'cover', zoom: 0.5 });
    expect(z.s).toBeCloseTo(1.5);
  });

  it('centres the rectangle in the frame by default', () => {
    const f = { x: 100, y: 50, w: 800, h: 600 };
    const c = computeCamera(f, { rect: [500, 400, 100, 100], fit: 'contain' });
    const cx = c.tx + 550 * c.s;
    const cy = c.ty + 450 * c.s;
    expect(cx).toBeCloseTo(f.x + f.w / 2);
    expect(cy).toBeCloseTo(f.y + f.h / 2);
  });

  it('caps the scale with maxScale', () => {
    const c = computeCamera({ x: 0, y: 0, w: 1000, h: 1000 }, { rect: [0, 0, 10, 10], fit: 'cover', maxScale: 4 });
    expect(c.s).toBe(4);
  });

  it('uses portrait overrides on tall frames only', () => {
    const spec = { rect: [0, 0, 1210, 900], portrait: { rect: [470, 80, 520, 820] } };
    expect(resolveSpec(spec, { x: 0, y: 0, w: 390, h: 500 }).rect).toEqual([470, 80, 520, 820]);
    expect(resolveSpec(spec, { x: 0, y: 0, w: 1400, h: 900 }).rect).toEqual([0, 0, 1210, 900]);
  });

  it('round-trips camera ↔ view (the representation used for the flights)', () => {
    const cam = { s: 2.3, tx: -812.5, ty: -140.25 };
    const back = viewToCamera(cameraToView(cam, 1440, 900), 1440, 900);
    expect(back.s).toBeCloseTo(cam.s, 6);
    expect(back.tx).toBeCloseTo(cam.tx, 6);
    expect(back.ty).toBeCloseTo(cam.ty, 6);
  });

  it('reads computed transforms back', () => {
    expect(parseMatrix('matrix(2, 0, 0, 2, -10, 25)')).toEqual({ s: 2, tx: -10, ty: 25 });
    expect(parseMatrix('none')).toBeNull();
  });

  it('picks the smallest sharp-enough image tier', () => {
    const tiers = [1210, 1815, 2420, 3630, 4840].map((w) => ({ w }));
    expect(pickTier(tiers, 1210, 1, 1).w).toBe(1210);
    expect(pickTier(tiers, 1210, 1, 2).w).toBe(2420);
    expect(pickTier(tiers, 1210, 3, 2).w).toBe(4840);
  });
});
