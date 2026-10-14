/**
 * Page transitions for Astro's <ClientRouter />.
 *
 * No View Transitions: their full-page snapshots pause rendering while the DOM is updated and kept
 * the browser busy during camera flights (BaseLayout disables them). Instead:
 *   1. on click (astro:before-preparation) the old page content fades out — the header stays, and
 *      so does the rail when the next page has one too — while the camera starts flying
 *      (world/controller.ts) and the next page downloads
 *   2. once both are done, only #page is replaced. Astro's default swap replaces the whole <body>
 *      and moves `transition:persist` elements across; moving an <iframe> reloads it in browsers
 *      without Element.moveBefore() (Safari), which would stop the Spotify player. #world (the art)
 *      and #player are never touched — the art keeps flying and the music keeps playing.
 *   3. the incoming page starts hidden (data-entering); the camera controller reveals it during the flight.
 */
import { prefetch } from 'astro:prefetch';
import { swapFunctions, type TransitionBeforePreparationEvent, type TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { placeOf } from '../world/places';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let keepRail = false;
let navigations = 0;

function reifyMedia(root: Element) {
  // Elements parsed by DOMParser come from an inert document: re-create media so they can play.
  for (const media of root.querySelectorAll('video, audio')) {
    const fresh = document.createElement(media.localName);
    for (const attr of media.attributes) fresh.setAttribute(attr.name, attr.value);
    fresh.innerHTML = media.innerHTML;
    media.replaceWith(fresh);
  }
}

/**
 * Scripts rendered outside #page (e.g. after a layout) would be lost by our partial swap: append the
 * ones the live document has never seen, so the router runs them like any other new script.
 */
function adoptStrayScripts(newDocument: Document) {
  const key = (s: HTMLScriptElement) => (s.src ? new URL(s.src, location.href).href : s.textContent ?? '');
  const live = new Set([...document.scripts].map(key));
  for (const s of newDocument.querySelectorAll<HTMLScriptElement>('body script')) {
    if (s.closest('#page, #world, #player')) continue;
    if (!live.has(key(s))) document.body.append(s);
  }
}

// touch screens have no hover: start downloading a page as soon as a finger lands on its link
document.addEventListener(
  'touchstart',
  (e) => {
    const a = (e.target as Element).closest?.('a[href]');
    if (a instanceof HTMLAnchorElement && a.origin === location.origin && a.dataset.astroPrefetch !== 'false' && !a.target) {
      prefetch(a.href, { ignoreSlowConnection: true });
    }
  },
  { passive: true },
);

document.addEventListener('astro:before-preparation', (event) => {
  const ev = event as TransitionBeforePreparationEvent;
  const page = document.getElementById('page');
  if (!page) return;
  // videos of the old page stop now: decoding frames during the flight costs GPU time
  page.querySelectorAll('video').forEach((v) => v.pause());
  const dest = placeOf(ev.to);
  keepRail = !!dest && dest.stage !== 'home' && !!page.querySelector(':scope > .panel--rail');
  const fading = [...page.children].filter(
    (el) => !el.matches('.site-header, .skip-link') && !(keepRail && el.matches('.panel--rail')) && getComputedStyle(el).opacity !== '0',
  );
  const anims = fading.map((el) =>
    el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: reduced.matches ? 100 : 220, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }),
  );
  const faded = Promise.all(anims.map((a) => a.finished.catch(() => {})));
  // a navigation cancelled without another one taking over (rare): bring the old content back
  const id = ++navigations;
  ev.signal.addEventListener('abort', () => setTimeout(() => id === navigations && anims.forEach((a) => a.cancel()), 100));
  // swap only once the old content is gone (the download usually takes longer anyway)
  const load = ev.loader;
  ev.loader = async () => {
    await Promise.all([load(), faded]);
  };
});

document.addEventListener('astro:before-swap', (event) => {
  const ev = event as TransitionBeforeSwapEvent;
  const newPage = ev.newDocument.getElementById('page');
  const oldPage = document.getElementById('page');
  if (!newPage || !oldPage) return; // not one of our pages: keep Astro's default swap

  newPage.setAttribute('data-entering', '');
  newPage.toggleAttribute('data-keep-rail', keepRail);
  keepRail = false;
  navigations++;
  ev.swap = () => {
    swapFunctions.deselectScripts(ev.newDocument);
    swapFunctions.swapRootAttributes(ev.newDocument);
    swapFunctions.swapHeadElements(ev.newDocument);
    const restoreFocus = swapFunctions.saveFocus();
    oldPage.replaceWith(newPage);
    reifyMedia(newPage);
    adoptStrayScripts(ev.newDocument);
    restoreFocus();
    // failsafe: never leave the content hidden if the camera controller fails to reveal it
    window.setTimeout(() => newPage.removeAttribute('data-entering'), 3500);
  };
});
