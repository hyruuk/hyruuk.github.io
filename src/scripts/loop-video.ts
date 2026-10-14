/**
 * Looping videos (src/components/LoopVideo.astro) and animated tile covers.
 *
 * - LoopVideo: plays while at least a quarter of it is on screen, pauses otherwise; the button
 *   pauses/resumes it for good (WCAG 2.2.2). With reduced motion it never starts by itself.
 * - Tiles with a cover video play it while visible (never with reduced motion or data saver), over the
 *   still cover.
 * Videos only start once the camera has landed: starting a video decoder mid-flight stalls the GPU.
 */
import { onPage } from './lifecycle';
import { whenLanded } from './world/landing';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function play(v: HTMLVideoElement) {
  if (v.preload !== 'auto') v.preload = 'auto';
  return v.play();
}

onPage((signal) => {
  const videos = document.querySelectorAll<HTMLVideoElement>('#page video[data-loop-video]');
  if (!videos.length) return;
  let io: IntersectionObserver | null = null;
  videos.forEach((v) => reduced.matches && setPaused(v.closest('.loop-video')!, true));
  whenLanded(() => {
    io = new IntersectionObserver(
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
    videos.forEach((v) => io!.observe(v));
  }, signal);
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
  return () => io?.disconnect();
});

function setPaused(wrap: HTMLElement, paused: boolean) {
  wrap.toggleAttribute('data-paused', paused);
  const btn = wrap.querySelector<HTMLButtonElement>('.loop-video__toggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(paused));
  btn.setAttribute('aria-label', (paused ? btn.dataset.labelPlay : btn.dataset.labelPause) ?? '');
}

/* ---------- tiles: cover animations play by themselves while visible ---------- */

onPage((signal) => {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const videos = document.querySelectorAll<HTMLVideoElement>('#page .tile__video');
  if (!videos.length || reduced.matches || saveData) return;
  let io: IntersectionObserver | null = null;
  whenLanded(() => {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          const tile = v.closest('.tile');
          if (e.isIntersecting) {
            play(v)
              .then(() => tile?.classList.add('is-playing'))
              .catch(() => {});
          } else v.pause();
        }
      },
      { threshold: 0.35 },
    );
    videos.forEach((v) => io!.observe(v));
  }, signal);
  return () => io?.disconnect();
});
