/**
 * Custom page swap for Astro's <ClientRouter />.
 *
 * Astro's default swap replaces the whole <body> and moves `transition:persist` elements across.
 * Moving an <iframe> reloads it in browsers without Element.moveBefore() (Safari), which would
 * stop the Spotify player. So only #page is replaced: #world (the art) and #player are never
 * touched — the art keeps flying and the music keeps playing.
 *
 * The incoming page starts hidden (data-entering); the camera controller reveals it during the flight.
 */
import { swapFunctions, type TransitionBeforeSwapEvent } from 'astro:transitions/client';

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

document.addEventListener('astro:before-swap', (event) => {
  const ev = event as TransitionBeforeSwapEvent;
  const newPage = ev.newDocument.getElementById('page');
  const oldPage = document.getElementById('page');
  if (!newPage || !oldPage) return; // not one of our pages: keep Astro's default swap

  newPage.setAttribute('data-entering', '');
  // Chrome skips a transition when the viewport changes mid-way (e.g. mobile URL bar): harmless,
  // the page still swaps and the camera still flies — don't let it surface as an error.
  ev.viewTransition?.ready?.catch(() => {});
  ev.viewTransition?.finished?.catch(() => {});
  ev.swap = () => {
    swapFunctions.deselectScripts(ev.newDocument);
    swapFunctions.swapRootAttributes(ev.newDocument);
    swapFunctions.swapHeadElements(ev.newDocument);
    const restoreFocus = swapFunctions.saveFocus();
    oldPage.replaceWith(newPage);
    reifyMedia(newPage);
    adoptStrayScripts(ev.newDocument);
    restoreFocus();
  };
});
