/**
 * Starts the WebGL renderer of the world (renderer.ts): in a worker on an OffscreenCanvas when the
 * browser allows it, otherwise on the main thread. The canvas is inserted in #world before `before`
 * (so the hotspots stay above it) and stays invisible until the controller hands over to it.
 */
import type { FromRenderer, ToRenderer } from './renderer';

export type InitData = Omit<Extract<ToRenderer, { type: 'init' }>, 'type' | 'canvas'>;

export interface GLHandle {
  send(m: ToRenderer): void;
  canvas: HTMLCanvasElement;
  mode: 'worker' | 'main';
  stop(): void;
}

export const supportsGL = () => typeof WebGL2RenderingContext !== 'undefined' && typeof createImageBitmap === 'function';

function makeCanvas(world: HTMLElement, before: Element | null) {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-gl';
  canvas.setAttribute('aria-hidden', 'true');
  world.insertBefore(canvas, before);
  return canvas;
}

export async function startGL(
  world: HTMLElement,
  before: Element | null,
  init: () => InitData,
  onEvent: (m: FromRenderer, from: GLHandle) => void,
  useWorker: boolean,
): Promise<GLHandle | null> {
  if (useWorker && 'transferControlToOffscreen' in HTMLCanvasElement.prototype && typeof Worker === 'function') {
    const canvas = makeCanvas(world, before);
    try {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      const off = canvas.transferControlToOffscreen();
      const handle: GLHandle = {
        send: (m) => worker.postMessage(m),
        canvas,
        mode: 'worker',
        stop: () => {
          worker.terminate();
          canvas.remove();
        },
      };
      worker.onmessage = (e: MessageEvent<FromRenderer>) => onEvent(e.data, handle);
      worker.onerror = () => onEvent({ type: 'fail', reason: 'worker error' }, handle);
      worker.postMessage({ type: 'init', canvas: off, ...init() } satisfies ToRenderer, [off]);
      return handle;
    } catch {
      canvas.remove(); // a canvas handed to a worker can't get a context here: start over below
    }
  }
  try {
    const { createRenderer } = await import('./renderer');
    const canvas = makeCanvas(world, before);
    let handle: GLHandle;
    const send = createRenderer((m) => queueMicrotask(() => onEvent(m, handle)));
    handle = { send, canvas, mode: 'main', stop: () => canvas.remove() };
    send({ type: 'init', canvas, ...init() });
    return handle;
  } catch {
    return null;
  }
}
