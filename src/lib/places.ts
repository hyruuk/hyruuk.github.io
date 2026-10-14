/**
 * Every page is a place in the world: this resolves the camera (where the art is framed),
 * the stage (which part of the screen frames it) and the look (how dimmed/blurred it is).
 */
import { type CameraSpec, regions, world } from './data';

export type Place =
  | { kind: 'home' }
  | { kind: 'keyword'; id: string }
  | { kind: 'project'; keyword: string }
  | { kind: 'named'; id: string };

export interface ResolvedPlace {
  stage: 'home' | 'focus' | 'backdrop';
  look: 'full' | 'focus' | 'backdrop' | 'deep';
  /** JSON for <html data-camera> — read by the bootstrap script and the camera controller */
  camera: string;
}

function serialize(spec: CameraSpec) {
  return JSON.stringify({
    rect: spec.rect,
    fit: spec.fit,
    align: spec.align,
    zoom: spec.zoom,
    portrait: spec.portrait,
    maxScale: world.maxScale,
  });
}

export function resolvePlace(place: Place): ResolvedPlace {
  let spec: CameraSpec;
  switch (place.kind) {
    case 'home':
      spec = { ...world.cameras.home, stage: 'home', look: 'full' } as CameraSpec;
      break;
    case 'keyword': {
      const r = regions[place.id];
      const base = r?.camera ?? world.cameras.overview;
      spec = { ...base, stage: 'focus', look: 'focus' } as CameraSpec;
      break;
    }
    case 'project': {
      // a little wider than the place view, behind the page content
      const r = regions[place.keyword];
      const base = r?.camera ?? world.cameras.overview;
      spec = { ...base, zoom: (base.zoom ?? 1) * 0.85, stage: 'backdrop', look: 'backdrop' } as CameraSpec;
      break;
    }
    case 'named': {
      const base = world.cameras[place.id] ?? world.cameras.overview;
      spec = { ...base, stage: base.stage ?? 'backdrop', look: base.look ?? 'backdrop' } as CameraSpec;
      break;
    }
  }
  return { stage: spec.stage, look: spec.look, camera: serialize(spec) };
}
