import { expect, type Page, test } from '@playwright/test';

const ROUTES = ['/', '/explore/', '/explore/videogames/', '/explore/music/', '/projects/', '/projects/cneuromod-mario/', '/research/', '/code/', '/art-music/', '/about/', '/contact/', '/brains-and-games/'];

/** Fail the test on any console error. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // "Transition was aborted…": Chrome skipping a view transition (e.g. viewport resize) is not a site error
  page.on('console', (m) => m.type() === 'error' && !/Transition was aborted/.test(m.text()) && errors.push(m.text()));
  return errors;
}

/**
 * Stub Spotify's iFrame API so the player can be tested offline. play() reports playback shortly after,
 * like the real embed; with window.__spotify.manual set, the test sends the embed's reports itself
 * (__spotify.emit) and counts the tracks the player loads (__spotify.loads).
 */
async function stubSpotify(page: Page) {
  await page.route('https://open.spotify.com/embed/iframe-api/v1', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.onSpotifyIframeApiReady({ createController(el, opts, cb) {
        const f = document.createElement('iframe'); f.dataset.stub = '1'; el.replaceWith(f);
        const ls = {}; const emit = (ev, data) => (ls[ev] || []).forEach((fn) => fn({ data }));
        const spotify = (window.__spotify = { manual: false, loads: 0, emit });
        const c = { loadEntity(){ spotify.loads++; }, loadUri(){}, pause(){}, resume(){},
          play(){
            emit('playback_started', {});
            if (!spotify.manual) setTimeout(() => emit('playback_update', { isPaused: false, isBuffering: false, position: 1000, duration: 30000 }), 50);
          },
          addListener(ev, fn){ (ls[ev] ||= []).push(fn); if (ev === 'ready') setTimeout(() => fn({}), 10); } };
        cb(c);
      } });`,
    }),
  );
}

/** Largest difference of any colour channel between two screenshots of the same size (0–255). */
async function pixelDiff(page: Page, a: Buffer, b: Buffer) {
  const blank = await page.context().newPage();
  const diff = await blank.evaluate(async (urls) => {
    const pixels = (src: string) =>
      new Promise<Uint8ClampedArray>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
          const g = c.getContext('2d')!;
          g.drawImage(img, 0, 0);
          resolve(g.getImageData(0, 0, c.width, c.height).data);
        };
        img.src = src;
      });
    const [pa, pb] = await Promise.all(urls.map(pixels));
    let max = pa.length === pb.length ? 0 : 255;
    for (let i = 0; i < Math.min(pa.length, pb.length); i++) max = Math.max(max, Math.abs(pa[i] - pb[i]));
    return max;
  }, [a, b].map((buf) => `data:image/png;base64,${buf.toString('base64')}`));
  await blank.close();
  return diff;
}

/** Touch screens preview a place on the first tap and enter it on the second. */
async function clickPlace(page: Page, kw: string) {
  const area = page.locator(`a.hotspot[data-kw="${kw}"] .hotspot-area`);
  const touch = await page.evaluate(() => matchMedia('(hover: none), (pointer: coarse)').matches);
  await area.click({ force: true });
  if (touch) await area.click({ force: true });
}

/** Wait until the page transition is over and the new content is revealed. */
async function settle(page: Page) {
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-astro-transition') && !document.getElementById('page')?.hasAttribute('data-entering'));
}

const cameraScale = (page: Page) =>
  page.evaluate(() => {
    const m = getComputedStyle(document.querySelector('.world-camera')!).transform.match(/matrix\(([^,]+)/);
    return m ? Number(m[1]) : NaN;
  });

test('every page answers in English and French', async ({ request }) => {
  for (const route of ROUTES) {
    for (const path of [route, route === '/' ? '/fr/' : `/fr${route}`]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }
  }
});

test('a place on the art leads to its page, and back returns home', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.waitForSelector('#world[data-loaded]');
  const homeScale = await cameraScale(page);
  await clickPlace(page, 'neuro-ai');
  await expect(page).toHaveURL(/\/explore\/neuro-ai\/$/);
  await expect(page.locator('h1')).toHaveText(/neuro-ai/i);
  await expect.poll(() => cameraScale(page), { timeout: 12_000 }).toBeGreaterThan(homeScale * 1.3); // the camera zoomed in
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => cameraScale(page), { timeout: 12_000 }).toBeCloseTo(homeScale, 2);
  expect(errors).toEqual([]);
});

test('arrow keys walk along the panorama', async ({ page }) => {
  await page.goto('/explore/music/');
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/explore\/consciousness\/$/);
  await settle(page);
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/\/explore\/music\/$/);
});

test('touch screens: every place is labelled on the map; a label enters it, the art needs two taps', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 839 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForSelector('#world[data-loaded]');
  await expect(page.locator('.place-strip')).toHaveCount(0);
  const labels = page.locator('.place-label');
  const count = await labels.count();
  expect(count).toBeGreaterThanOrEqual(7);
  // all on screen, none overlapping; places outside the picture are pinned to its edges
  await expect(page.locator('.place-label[data-kw="videogames"]')).toHaveAttribute('data-edge', 'left');
  const boxes = await labels.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom, o: Number(getComputedStyle(el).opacity) };
    }),
  );
  for (const [i, a] of boxes.entries()) {
    expect(a.o).toBeGreaterThan(0.5);
    expect(a.l).toBeGreaterThanOrEqual(0);
    expect(a.r).toBeLessThanOrEqual(412);
    for (const b of boxes.slice(i + 1)) expect(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t).toBe(true);
  }
  // a tap on the art spotlights a place first…
  await page.locator('a.hotspot[data-kw="music"]').dispatchEvent('click');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#world')).toHaveAttribute('data-armed', 'music');
  // …while a label enters its place at once
  await page.locator('.place-label[data-kw="videogames"]').tap();
  await expect(page).toHaveURL(/\/explore\/videogames\/$/);
  await ctx.close();
});

test('the camera starts flying on click, before the next page has arrived', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#world[data-loaded]');
  // the places map (/world/places.json) is loaded once the browser is idle
  await page.waitForFunction(() => performance.getEntriesByType('resource').some((e) => e.name.endsWith('/world/places.json')));
  await page.waitForTimeout(300);
  await page.route('**/code/', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.locator('.room--code').first().click();
  await expect(page.locator('#world')).toHaveAttribute('data-flying', '', { timeout: 1000 });
  await expect(page).toHaveURL(/\/$/); // still on the old page
  await expect(page).toHaveURL(/\/code\/$/, { timeout: 5000 });
  await expect(page.locator('h1')).toHaveText(/code/i);
});

test('WebGL draws the world once ready (where available)', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const gl = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
  test.skip(!gl, 'no WebGL 2 in this browser');
  await expect(page.locator('#world')).toHaveAttribute('data-gl-done', '', { timeout: 15_000 });
  await page.locator('.room--research').click();
  await expect(page).toHaveURL(/\/research\/$/);
  await settle(page);
  await expect.poll(() => cameraScale(page), { timeout: 12_000 }).toBeGreaterThan(1.2);
  expect(errors).toEqual([]);
});

test('HYRUUK draws a new expansion on click', async ({ page }) => {
  await page.goto('/');
  const text = page.locator('.hyruuk__text');
  await page.waitForTimeout(1200);
  const before = await text.innerText();
  expect(before).toMatch(/^Harel Yann's R\S+ U\S+ of U\S+ K\S+$/);
  for (let i = 0; i < 3; i++) {
    await page.locator('.hyruuk__btn').click();
    await page.waitForTimeout(900);
    if ((await text.innerText()) !== before) break;
  }
  expect(await text.innerText()).not.toBe(before);
});

test('the DFA fader moves, and that is all it does', async ({ page }) => {
  const errors = watchErrors(page);
  // no HYRUUK scramble on arrival: a new draw can wrap differently and shift the page on phones
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const fader = page.getByRole('slider', { name: 'DFA' });
  await fader.focus();
  const state = () =>
    page.evaluate(() => {
      const world = document.getElementById('world')!;
      const player = document.getElementById('player')!;
      return { url: location.href, scroll: scrollY, flying: world.hasAttribute('data-flying'), armed: world.dataset.armed ?? '', player: player.dataset.state, playerHidden: player.hidden };
    });
  const before = await state();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await expect(fader).toHaveValue('73');
  await page.waitForTimeout(400);
  expect(await state()).toEqual(before);
  expect(errors).toEqual([]);
});

test('reduced motion: the camera jumps instead of flying', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForSelector('#world[data-loaded]');
  await clickPlace(page, 'music');
  await expect(page).toHaveURL(/\/explore\/music\/$/);
  await page.waitForTimeout(150);
  const running = await page.evaluate(() => document.querySelector('.world-camera')!.getAnimations().length);
  expect(running).toBe(0);
  await expect(page.locator('h1')).toBeVisible();
});

test('works without the View Transitions API', async ({ page }) => {
  await page.addInitScript(() => {
    // @ts-expect-error simulate an older browser
    delete Document.prototype.startViewTransition;
  });
  await page.goto('/');
  await page.locator('.room--research').click();
  await expect(page).toHaveURL(/\/research\/$/);
  await expect(page.locator('h1')).toHaveText(/research/i);
});

test('the music player survives navigation', async ({ page }) => {
  await stubSpotify(page);
  await page.goto('/');
  await page.locator('.sound-toggle').first().click();
  const iframe = page.locator('#player iframe[data-stub]');
  await expect(iframe).toBeAttached();
  await page.evaluate(() => ((document.querySelector('#player iframe') as HTMLElement & { _mark?: number })._mark = 42));
  const mobile = (page.viewportSize()?.width ?? 1536) < 1024;
  const steps: [string, RegExp][] = mobile
    ? [['.room--research', /\/research\/$/], ['.brand', /\/$/], ['.room--art-music', /\/art-music\/$/], ['.brand', /\/$/]]
    : [['.room--research', /\/research\/$/], ['.top-nav a[href="/about/"]', /\/about\/$/], ['.lang-switch', /\/fr\/about\/$/], ['.brand', /\/fr\/$/]];
  for (const [sel, url] of steps) {
    await page.locator(sel).first().click();
    await expect(page).toHaveURL(url);
    await settle(page);
  }
  expect(await page.evaluate(() => (document.querySelector('#player iframe') as HTMLElement & { _mark?: number })?._mark)).toBe(42);
  await expect(page.locator('#player')).toBeVisible();
});

test('the wave invites to play music until it has been used once', async ({ page }) => {
  await stubSpotify(page);
  await page.goto('/');
  const player = page.locator('#player');
  await expect(player).not.toHaveAttribute('data-known');
  await expect(page.locator('.sound-hint').first()).toBeAttached();
  await page.locator('.sound-toggle').first().click();
  await expect(player).toHaveAttribute('data-known', '');
  await page.reload();
  await expect(player).toHaveAttribute('data-known', '');
});

test('the music wave loops without a jump', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'same geometry everywhere: one desktop pixel grid is enough');
  await page.emulateMedia({ reducedMotion: 'reduce' }); // the wave stands still: the test moves it
  await stubSpotify(page);
  await page.goto('/');
  await page.locator('.sound-toggle').first().click();
  await page.mouse.move(0, 0);
  const wave = page.locator('.panel--full .wave');
  await expect(wave.locator('.wave__live')).toHaveCSS('opacity', '1');
  await wave.evaluate((el: HTMLElement) => (el.style.background = '#000')); // the world behind it moves
  // each loop slides the wave by one period, then starts over: its last frame must be its first
  const at = async (transform: string) => {
    await wave.locator('.wave__run').evaluate((el: HTMLElement, t) => (el.style.transform = t), transform);
    return wave.screenshot();
  };
  expect(await pixelDiff(page, await at('translateX(-20%)'), await at('none'))).toBeLessThanOrEqual(8); // compositing noise: ≤ 1
});

test('the music wave runs on through page changes', async ({ page }) => {
  await stubSpotify(page);
  await page.goto('/research/');
  await page.locator('.sound-toggle:visible').first().click();
  await expect(page.locator('#player')).toHaveAttribute('data-state', 'playing');
  const loopStart = () => page.evaluate(() => Number(document.querySelector('#page .wave__run')!.getAnimations()[0].startTime) % 1100);
  const before = await loopStart();
  await page.locator('#page a[href^="/projects/"]:not([href="/projects/"]):visible').first().click();
  await expect(page).toHaveURL(/\/projects\/.+\/$/);
  await settle(page);
  // the new page's wave is at full height at once (no new swell), and its loop goes on in step
  expect(await page.evaluate(() => document.querySelector('#page .wave__live')!.getAnimations().length)).toBe(0);
  expect(await loopStart()).toBe(before);
});

test('the music wave keeps running while the next track loads', async ({ page }) => {
  await stubSpotify(page);
  await page.goto('/');
  await page.locator('.sound-toggle').first().click();
  const player = page.locator('#player');
  await expect(player).toHaveAttribute('data-state', 'playing');
  await page.evaluate(() => {
    const w = window as unknown as { __spotify: { manual: boolean }; __states: string[] };
    w.__spotify.manual = true;
    w.__states = [];
    const p = document.getElementById('player')!;
    new MutationObserver(() => w.__states.push(p.dataset.state!)).observe(p, { attributeFilter: ['data-state'] });
  });
  type Report = { isPaused: boolean; isBuffering: boolean; position: number; duration: number };
  const report = (data: Report) => page.evaluate((d) => (window as unknown as { __spotify: { emit: (ev: string, d: Report) => void } }).__spotify.emit('playback_update', d), data);
  const loads = () => page.evaluate(() => (window as unknown as { __spotify: { loads: number } }).__spotify.loads);
  // what Firefox's embed reports around a track change (recorded from the real one)
  await report({ isPaused: false, isBuffering: false, position: 30000, duration: 30000 }); // end of the track
  await expect.poll(loads).toBe(1); // the next one is requested
  await report({ isPaused: true, isBuffering: false, position: 0, duration: 29713 });
  await report({ isPaused: false, isBuffering: false, position: 29713, duration: 29713 }); // not playing yet
  await report({ isPaused: true, isBuffering: true, position: 0, duration: 29713 });
  await page.waitForTimeout(1200);
  await report({ isPaused: false, isBuffering: false, position: 1150, duration: 29713 }); // sound
  expect(await page.evaluate(() => (window as unknown as { __states: string[] }).__states)).toEqual([]); // never stopped
  expect(await loads()).toBe(1); // and no track skipped
});

test('looping figures play on screen and can be paused', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/projects/saflow/');
  const wrap = page.locator('.figure .loop-video').first();
  await wrap.scrollIntoViewIfNeeded();
  const btn = wrap.locator('.loop-video__toggle');
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await btn.click();
  await expect(wrap).toHaveAttribute('data-paused', '');
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  expect(await wrap.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  expect(errors).toEqual([]);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('content and links are there', async ({ page }) => {
    await page.goto('/explore/neuroimaging/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.tile').first()).toBeVisible();
    await page.goto('/');
    await expect(page.locator('.hyruuk__text')).toContainText("Harel Yann's");
  });
});
