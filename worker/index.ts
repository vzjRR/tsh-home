/**
 * The Worker entry point for tsh87.com — the personal site.
 *
 * Everything that isn't `/api/contact` or `/api/subscribe` is a static asset,
 * served straight from the `ASSETS` binding (the built `dist/`). The two form
 * routes are handled by the same logic that used to run as Cloudflare Pages
 * Functions - `functions/api/*.ts` - unchanged, just called directly instead
 * of through the Pages Functions router.
 *
 * `/medical*` is a courtesy 301 to med.tsh87.com for old links. That is the
 * only thing this Worker knows about the medical platform — it holds no
 * medical content and never proxies it; med.tsh87.com is its own Cloudflare
 * Pages site, unrelated to this one.
 */

const MEDICAL_HOME = 'https://med.tsh87.com/';

import { onRequestGet as contactGet, onRequestPost as contactPost } from '../functions/api/contact';
import { onRequestGet as subscribeGet, onRequestPost as subscribePost } from '../functions/api/subscribe';
import type { Env as FormEnv, PagesContext } from '../functions/_lib';

/**
 * Just the two things actually used from `@cloudflare/workers-types`,
 * declared locally rather than imported. That package's ambient globals
 * redefine DOM types (Element, Request, …) program-wide - referencing it
 * anywhere would break type-checking for the browser-side scripts under
 * `src/scripts/`, which share this project's one tsconfig.
 */
interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface Env extends FormEnv {
  /** Workers Assets binding - the built `dist/` directory. */
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env, ctx: MinimalExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    const context: PagesContext<Env> = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };

    if (pathname === '/medical' || pathname.startsWith('/medical/')) {
      return Response.redirect(MEDICAL_HOME, 301);
    }

    if (pathname === '/api/contact') {
      return request.method === 'POST' ? contactPost(context) : contactGet(context);
    }

    if (pathname === '/api/subscribe') {
      return request.method === 'POST' ? subscribePost(context) : subscribeGet(context);
    }

    return env.ASSETS.fetch(request);
  },
};
