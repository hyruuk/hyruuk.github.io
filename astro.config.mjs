// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import devTools from './integrations/dev-tools.mjs';

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
  // Links are prefetched on hover; the world hotspots (SVG links) are prefetched by hand.
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', fr: 'fr' } },
      filter: (page) => !page.includes('/dev/'),
    }),
    devTools(),
  ],
  devToolbar: { enabled: false },
});
