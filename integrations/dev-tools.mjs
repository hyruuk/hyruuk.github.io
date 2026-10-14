/**
 * Local Astro integration: adds developer-only pages while `npm run dev` is running.
 * They are never part of the production build.
 *
 *   /dev/regions/  — click on the artwork to draw the clickable regions (see docs/EDITING.md)
 */
export default function devTools() {
  return {
    name: 'hyruuk-dev-tools',
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (command !== 'dev') return;
        injectRoute({ pattern: '/dev/regions', entrypoint: './src/dev/regions.astro' });
      },
    },
  };
}
