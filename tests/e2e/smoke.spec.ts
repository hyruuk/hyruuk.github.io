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

/** Stub Spotify's iFrame API so the player can be tested offline. */
async function stubSpotify(page: Page) {
  await page.route('https://open.spotify.com/embed/iframe-api/v1', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.onSpotifyIframeApiReady({ createController(el, opts, cb) {
        const f = document.createElement('iframe'); f.dataset.stub = '1'; el.replaceWith(f);
        const ls = {}; const c = { loadEntity(){}, loadUri(){}, pause(){}, resume(){},
          play(){ (ls.playback_started||[]).forEach(fn => fn({ data: {} })); },
          addListener(ev, fn){ (ls[ev] ||= []).push(fn); if (ev === 'ready') setTimeout(() => fn({}), 10); } };
        cb(c);
      } });`,
    }),
  );
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
  await expect.poll(() => cameraScale(page), { timeout: 5000 }).toBeGreaterThan(homeScale * 1.3); // the camera zoomed in
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => cameraScale(page), { timeout: 5000 }).toBeCloseTo(homeScale, 2);
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

test('touch screens: a place chip previews the place, a second tap enters it', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 839 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForSelector('#world[data-loaded]');
  const chip = page.locator('.place-strip a[data-kw="videogames"]');
  const before = await cameraScale(page);
  await chip.tap();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#world')).toHaveAttribute('data-armed', 'videogames');
  await expect.poll(() => cameraScale(page), { timeout: 5000 }).not.toBeCloseTo(before, 2);
  await chip.tap();
  await expect(page).toHaveURL(/\/explore\/videogames\/$/);
  await ctx.close();
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
