// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * tsh87.com — static output. No server runtime, no database, no client
 * framework: the page is HTML with a few kilobytes of progressive enhancement.
 */
export default defineConfig({
  site: 'https://tsh87.com',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
