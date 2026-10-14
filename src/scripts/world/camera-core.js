/**
 * Camera math for the "world" artwork — pure functions, no imports.
 *
 * This file is used twice: imported by the controller, and inlined (with `export` stripped) into the
 * tiny bootstrap script that positions the art before the first paint. Keep it dependency-free.
 *
 * Conventions
 *   world units: the artwork is W x H units (1210 x 900) whatever the image resolution
 *   frame:  {x, y, w, h} in CSS pixels — where the camera rectangle must be framed on screen
 *   spec:   {rect: [x, y, w, h], fit, align: [ax, ay], zoom, portrait?, maxScale?}
 *   camera: {s, tx, ty} — screen = (tx + worldX * s, ty + worldY * s)
 *   view:   [cx, cy, w] — world point at the viewport centre + viewport width in world units
 *           (the representation used for smooth zoom/pan interpolation)
 */

/** Use the portrait overrides on frames that are clearly taller than wide (phones). */
export function resolveSpec(spec, frame) {
  if (spec.portrait && frame.h > frame.w * 1.05) return Object.assign({}, spec, spec.portrait);
  return spec;
}

/** Fit the spec's rectangle into the frame. */
export function computeCamera(frame, spec) {
  var r = spec.rect;
  var fit = spec.fit || 'contain';
  var align = spec.align || [0.5, 0.5];
  var sx = frame.w / r[2];
  var sy = frame.h / r[3];
  var s = (fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy)) * (spec.zoom || 1);
  if (spec.maxScale && s > spec.maxScale) s = spec.maxScale;
  var left = r[0] - (frame.w / s - r[2]) * align[0];
  var top = r[1] - (frame.h / s - r[3]) * align[1];
  return { s: s, tx: frame.x - left * s, ty: frame.y - top * s };
}

export function cameraToView(cam, vw, vh) {
  return [(vw / 2 - cam.tx) / cam.s, (vh / 2 - cam.ty) / cam.s, vw / cam.s];
}

export function viewToCamera(view, vw, vh) {
  var s = vw / view[2];
  return { s: s, tx: vw / 2 - view[0] * s, ty: vh / 2 - view[1] * s };
}

export function cameraTransform(cam) {
  return 'translate(' + cam.tx.toFixed(2) + 'px,' + cam.ty.toFixed(2) + 'px) scale(' + cam.s.toFixed(5) + ')';
}

/** Read {s, tx, ty} back from a computed `transform` value ("matrix(a, b, c, d, e, f)"). */
export function parseMatrix(value) {
  if (!value || value === 'none') return null;
  var m = value.match(/matrix(3d)?\(([^)]+)\)/);
  if (!m) return null;
  var n = m[2].split(',').map(Number);
  if (m[1]) return { s: n[0], tx: n[12], ty: n[13] };
  return { s: n[0], tx: n[4], ty: n[5] };
}

export function frameOf(el) {
  var b = el.getBoundingClientRect();
  return { x: b.left, y: b.top, w: b.width || 1, h: b.height || 1 };
}

/** Smallest image tier sharp enough for this camera (tiers sorted by width). */
export function pickTier(tiers, unitsW, s, dpr) {
  var need = unitsW * s * Math.min(dpr || 1, 2);
  for (var i = 0; i < tiers.length; i++) if (tiers[i].w >= need * 0.9) return tiers[i];
  return tiers[tiers.length - 1];
}
