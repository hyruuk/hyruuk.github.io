/**
 * Music player: random tracks from the Liked Songs list (public/data/liked-tracks.json) played
 * through Spotify's embed (iFrame API). The wave buttons (.sound-toggle) live in the swapped page;
 * the player lives in #player, which is never swapped — so playback survives navigation.
 *
 * Spotify rules we cannot change: visitors not logged in to Spotify (or whose browser hides that login
 * from other sites: Firefox, Safari, Brave) hear 30-second previews, chained here like a radio; a small
 * note then suggests logging in inside the player. Some browsers (Safari) need a tap in the embed.
 */
type Track = { id: string; name: string; artists: string };
type PlaybackUpdate = { data: { isPaused: boolean; isBuffering: boolean; duration: number; position: number } };
type EmbedController = {
  loadUri?: (uri: string) => void;
  loadEntity?: (uri: string) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  addListener: (event: string, cb: (e: PlaybackUpdate) => void) => void;
};
type IFrameAPI = {
  createController: (el: HTMLElement, options: Record<string, unknown>, cb: (c: EmbedController) => void) => void;
};

/** Remember (on this device only) that the visitor found the music, to stop the wave's idle cue. */
const KNOWN_KEY = 'neural-odyssey:sound-known';
const HINTED_KEY = 'neural-odyssey:sound-hinted';

const player = document.getElementById('player');
if (player) init(player);

function init(player: HTMLElement) {
  try {
    if (localStorage.getItem(KNOWN_KEY)) player.dataset.known = '';
    if (sessionStorage.getItem(HINTED_KEY)) player.dataset.hinted = '';
  } catch {
    /* storage can be unavailable (private mode, blocked cookies): the cue just shows again */
  }
  // the "♪ play music" hint plays once per visit (its CSS animation lasts ~10 s)
  window.setTimeout(() => {
    player.dataset.hinted = '';
    try {
      sessionStorage.setItem(HINTED_KEY, '1');
    } catch {
      /* ignore */
    }
  }, 11000);

  const host = player.querySelector<HTMLElement>('.player__embed')!;
  let tracks: Track[] | null = null;
  let ready: Promise<EmbedController> | null = null;
  let controller: EmbedController | null = null;
  const recent: string[] = [];
  let advancing = false; // changing tracks: the embed reports "paused" meanwhile, the wave keeps running
  let stall = 0;
  let lastPosition = 0;
  let lastDuration = 0;

  const setState = (state: 'idle' | 'loading' | 'playing' | 'paused' | 'closed') => {
    if (player.dataset.state === state) return; // the embed repeats its state every second
    player.dataset.state = state;
    player.hidden = state === 'idle' || state === 'closed';
    syncToggles();
    alignLoops();
  };

  /**
   * Every page brings its own panel, so the wave's looping animations (breathing, running wave, colour
   * bar) would restart at each navigation and the wave would skip: run them all on the document's clock.
   */
  function alignLoops() {
    document.querySelectorAll('.sound').forEach((el) => {
      for (const a of el.getAnimations({ subtree: true })) {
        if (a.effect?.getTiming().iterations === Infinity) a.startTime = 0;
      }
    });
  }

  /**
   * Waiting for sound (start, resume, next track): the wave runs meanwhile. If nothing plays for a while
   * (Safari can wait for a tap inside the embed), show the music as paused.
   */
  function expectSound() {
    window.clearTimeout(stall);
    stall = window.setTimeout(() => {
      advancing = false;
      if (player.dataset.state === 'playing' || player.dataset.state === 'loading') setState('paused');
    }, 12000);
  }

  function advance(delay: number) {
    advancing = true;
    expectSound();
    window.setTimeout(() => {
      if (advancing) void next();
    }, delay);
  }

  function syncToggles() {
    const on = player.dataset.state === 'playing' || player.dataset.state === 'loading';
    document.querySelectorAll<HTMLButtonElement>('.sound-toggle').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', (on ? btn.dataset.labelOff : btn.dataset.labelOn) ?? '');
    });
  }

  function syncLabels() {
    const fr = document.documentElement.lang === 'fr';
    player.querySelectorAll<HTMLElement>('[data-label-en]').forEach((el) => {
      const label = (fr ? el.dataset.labelFr : el.dataset.labelEn) ?? '';
      if (el.tagName === 'BUTTON') el.setAttribute('aria-label', label);
      else el.textContent = label;
    });
  }

  async function loadTracks(): Promise<Track[]> {
    if (tracks) return tracks;
    const res = await fetch('/data/liked-tracks.json');
    if (!res.ok) throw new Error(`liked-tracks.json: HTTP ${res.status}`);
    tracks = (await res.json()) as Track[];
    return tracks;
  }

  function randomTrack(list: Track[]): Track {
    for (let i = 0; i < 20; i++) {
      const t = list[Math.floor(Math.random() * list.length)];
      if (!recent.includes(t.id)) {
        recent.push(t.id);
        if (recent.length > Math.min(50, list.length - 1)) recent.shift();
        return t;
      }
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  function loadApi(): Promise<IFrameAPI> {
    const w = window as unknown as { __spotifyApi?: IFrameAPI; onSpotifyIframeApiReady?: (api: IFrameAPI) => void };
    if (w.__spotifyApi) return Promise.resolve(w.__spotifyApi);
    return new Promise((resolve, reject) => {
      w.onSpotifyIframeApiReady = (api) => {
        w.__spotifyApi = api;
        resolve(api);
      };
      const s = document.createElement('script');
      s.src = 'https://open.spotify.com/embed/iframe-api/v1';
      s.async = true;
      s.onerror = () => reject(new Error('Spotify iFrame API failed to load'));
      player.append(s); // not in <head>: the router rewrites the head on every navigation
    });
  }

  function onUpdate(e: PlaybackUpdate) {
    const { isPaused, isBuffering, duration, position } = e.data;
    // Spotify serves 30-second previews when it can't see a login (not logged in, or the browser keeps
    // the site's Spotify iframe separate from spotify.com). Only then do we show the hint.
    if (duration > 0) player.toggleAttribute('data-preview', duration <= 31000);
    const nearEnd = duration > 0 && position >= duration - 900;
    const justEnded = isPaused && position === 0 && lastDuration > 0 && lastPosition >= lastDuration - 2500;
    lastPosition = position;
    lastDuration = duration;
    if (player.dataset.state === 'closed') return;
    if (!isPaused && !isBuffering && duration > 0 && !nearEnd) {
      // sound for real: while it loads a track, the embed says "playing" and "paused" in turn (Firefox),
      // and it reports a new track at its very end before starting it
      window.clearTimeout(stall);
      advancing = false;
      setState('playing');
    } else if ((nearEnd || justEnded) && !advancing && player.dataset.state !== 'paused') {
      advance(nearEnd ? 900 : 0);
    } else if (isPaused && player.dataset.state === 'playing' && !advancing && !nearEnd) {
      setState('paused'); // paused inside the embed
    }
  }

  function ensureController(first: Track): Promise<EmbedController> {
    ready ??= (async () => {
      const api = await loadApi();
      const mount = document.createElement('div');
      host.replaceChildren(mount);
      return new Promise<EmbedController>((resolve) => {
        api.createController(mount, { uri: `spotify:track:${first.id}`, width: '100%', height: 80 }, (c) => {
          controller = c;
          c.addListener('ready', () => resolve(c));
          c.addListener('playback_update', onUpdate);
        });
      });
    })();
    return ready;
  }

  async function load(t: Track) {
    const c = await ensureController(t);
    const uri = `spotify:track:${t.id}`;
    if (c.loadEntity) c.loadEntity(uri);
    else c.loadUri?.(uri);
    c.play();
  }

  async function next() {
    const list = await loadTracks();
    await load(randomTrack(list));
  }

  /** Paused or closed by the visitor: a track change under way must not start the music again. */
  function halt(state: 'paused' | 'closed') {
    controller?.pause();
    advancing = false;
    window.clearTimeout(stall);
    setState(state);
  }

  async function start() {
    setState('loading');
    expectSound();
    try {
      const list = await loadTracks();
      const first = randomTrack(list);
      const c = await ensureController(first);
      c.play();
    } catch (err) {
      console.error(err);
      setState('idle');
    }
  }

  // fetch our own track list as soon as the visitor shows intent, so the click starts faster
  // (nothing is requested from Spotify before the click)
  const warm = (e: Event) => {
    if ((e.target as Element).closest?.('.sound-toggle')) void loadTracks().catch(() => {});
  };
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm);

  document.addEventListener('click', (e) => {
    const toggle = (e.target as Element).closest?.('.sound-toggle');
    if (!toggle) return;
    if (!('known' in player.dataset)) {
      player.dataset.known = '';
      try {
        localStorage.setItem(KNOWN_KEY, '1');
      } catch {
        /* ignore */
      }
    }
    const state = player.dataset.state;
    if (!controller) void start();
    else if (state === 'playing' || state === 'loading') halt('paused');
    else {
      setState('loading');
      expectSound();
      controller.resume();
    }
  });

  player.querySelector('.player__next')?.addEventListener('click', () => advance(0));
  player.querySelector('.player__close')?.addEventListener('click', () => halt('closed'));

  document.addEventListener('astro:after-swap', () => {
    syncLabels();
    syncToggles();
    alignLoops();
  });
  syncLabels();
  alignLoops();
}
