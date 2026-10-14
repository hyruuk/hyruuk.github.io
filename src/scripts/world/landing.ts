/**
 * Run `fn` once the world camera is at rest: right away if it is, a moment after it lands otherwise.
 * Heavy page work (starting videos…) waits for this: done mid-flight, it makes the flight stutter.
 */
export function whenLanded(fn: () => void, signal?: AbortSignal) {
  const world = document.getElementById('world');
  if (!world || !('flying' in world.dataset)) {
    fn();
    return;
  }
  document.addEventListener('world:landed', () => window.setTimeout(() => !signal?.aborted && fn(), 300), { once: true, signal });
}
