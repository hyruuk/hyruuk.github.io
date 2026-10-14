// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import devTools from './integrations/dev-tools.mjs';
import placesMap from './integrations/places-map.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://hyruuk.github.io',
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    locales: ['en', 'fr'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  // Every page link is prefetched on hover/focus (pages are ~10–20 kB gzipped), and on touch-start on
  // phones (src/scripts/router/swap.ts); the world hotspots (SVG links) are prefetched by hand.
  // Links to files opt out with data-astro-prefetch="false".
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', fr: 'fr' } },
      filter: (page) => !page.includes('/dev/'),
    }),
    devTools(),
    placesMap(),
  ],
  devToolbar: { enabled: false },
});
