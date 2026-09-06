// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * tsh87.com — static pages, no client framework: HTML with a few kilobytes of
 * progressive enhancement. The only server-side code is `functions/`, the two
 * Cloudflare Pages Functions behind the contact form and the newsletter.
 */
export default defineConfig({
  site: 'https://tsh87.com',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      // Confirmation pages are destinations of a form post, not content.
      filter: (page) => !/\/(contact\/sent|newsletter\/(subscribed|unsubscribed))\/?$/.test(page),
    }),
  ],
  build: { inlineStylesheets: 'auto' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
