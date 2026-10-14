/**
 * Looping videos (src/components/LoopVideo.astro) and animated tile covers.
 *
 * - LoopVideo: plays while at least a quarter of it is on screen, pauses otherwise; the button
 *   pauses/resumes it for good (WCAG 2.2.2). With reduced motion it never starts by itself.
 * - Tiles with a cover video play it on hover/focus only (desktop), over the still cover.
 */
import { onPage } from './lifecycle';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');

function play(v: HTMLVideoElement) {
  if (v.preload !== 'auto') v.preload = 'auto';
  return v.play();
}

onPage((signal) => {
  const videos = document.querySelectorAll<HTMLVideoElement>('#page video[data-loop-video]');
  if (!videos.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement;
        const pausedByUser = v.closest('.loop-video')?.hasAttribute('data-paused');
        if (e.isIntersecting && !pausedByUser && !reduced.matches) play(v).catch(() => {});
        else v.pause();
      }
    },
    { threshold: 0.25 },
  );
  videos.forEach((v) => {
    if (reduced.matches) setPaused(v.closest('.loop-video')!, true);
    io.observe(v);
  });
  document.addEventListener(
    'click',
    (e) => {
      const btn = (e.target as Element).closest?.('.loop-video__toggle');
      if (!btn) return;
      const wrap = btn.closest<HTMLElement>('.loop-video')!;
      const v = wrap.querySelector('video')!;
      const paused = !wrap.hasAttribute('data-paused');
      setPaused(wrap, paused);
      if (paused) v.pause();
      else play(v).catch(() => {});
    },
    { signal },
  );
  return () => io.disconnect();
});

function setPaused(wrap: HTMLElement, paused: boolean) {
  wrap.toggleAttribute('data-paused', paused);
  const btn = wrap.querySelector<HTMLButtonElement>('.loop-video__toggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(paused));
  btn.setAttribute('aria-label', (paused ? btn.dataset.labelPlay : btn.dataset.labelPause) ?? '');
}

/* ---------- tiles: play the cover video on hover / keyboard focus ---------- */

function tileVideo(target: EventTarget | null) {
  const tile = (target as Element | null)?.closest?.<HTMLElement>('.tile');
  const v = tile?.querySelector<HTMLVideoElement>('.tile__video');
  return tile && v ? { tile, v } : null;
}

function start(target: EventTarget | null) {
  if (reduced.matches) return;
  const hit = tileVideo(target);
  if (!hit || !hit.v.paused) return;
  play(hit.v)
    .then(() => hit.tile.classList.add('is-playing'))
    .catch(() => {});
}

function stop(target: EventTarget | null, related: EventTarget | null) {
  const hit = tileVideo(target);
  if (!hit || hit.tile.contains(related as Node | null)) return;
  hit.v.pause();
  hit.tile.classList.remove('is-playing');
}

document.addEventListener('pointerover', (e) => fine.matches && start(e.target));
document.addEventListener('pointerout', (e) => stop(e.target, e.relatedTarget));
document.addEventListener('focusin', (e) => start(e.target));
document.addEventListener('focusout', (e) => stop(e.target, e.relatedTarget));
