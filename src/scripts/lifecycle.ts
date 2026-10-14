/**
 * Page lifecycle with client-side navigation.
 *
 * Bundled scripts run ONCE per visit (the router swaps pages without reloading). Anything that
 * must happen on every page goes through `onPage(init)`:
 *   - `init` runs when a page is shown (first load, then after every navigation)
 *   - its `signal` aborts when the page is left — pass it to addEventListener to clean up
 *   - it may also return a cleanup function
 */
type Init = (signal: AbortSignal) => void | (() => void);

const inits: Init[] = [];
let controller: AbortController | null = null;
let cleanups: (() => void)[] = [];
let initialDone = false;
let navigating = false;

function teardown() {
  controller?.abort();
  for (const fn of cleanups) {
    try {
      fn();
    } catch (err) {
      console.error(err);
    }
  }
  cleanups = [];
}

function runAll() {
  teardown();
  controller = new AbortController();
  for (const init of inits) runOne(init);
}

function runOne(init: Init) {
  try {
    const cleanup = init(controller!.signal);
    if (typeof cleanup === 'function') cleanups.push(cleanup);
  } catch (err) {
    console.error(err);
  }
}

function initial() {
  if (initialDone) return;
  initialDone = true;
  runAll();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initial, { once: true });
else queueMicrotask(initial);

document.addEventListener('astro:before-preparation', () => (navigating = true));
document.addEventListener('astro:before-swap', teardown);
document.addEventListener('astro:page-load', () => {
  // Astro also fires this on the initial window "load"; we already initialised at DOMContentLoaded.
  if (!navigating) return;
  navigating = false;
  runAll();
});

export function onPage(init: Init) {
  inits.push(init);
  if (initialDone && controller && !navigating) runOne(init);
}
