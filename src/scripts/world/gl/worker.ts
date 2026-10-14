/**
 * The world's WebGL renderer, running off the main thread on an OffscreenCanvas: page work (fetching,
 * swapping, layout, scripts) can't delay a frame of a camera flight. See renderer.ts.
 */
import { createRenderer, type FromRenderer, type ToRenderer } from './renderer';

const scope = self as unknown as { postMessage(m: FromRenderer): void; onmessage: ((e: MessageEvent<ToRenderer>) => void) | null };
const handle = createRenderer((m) => scope.postMessage(m));
scope.onmessage = (e) => handle(e.data);
