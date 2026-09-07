/**
 * The Worker entry point.
 *
 * Al Ghafri Medical Solutions used to live at `tsh87.com/medical` and now has
 * its own subdomain, `med.tsh87.com`, with the platform itself at that
 * subdomain's root rather than nested under /medical. Any request under
 * `/medical` here is an old link - redirect it to the same path with the
 * `/medical` prefix stripped, on the new domain, rather than letting it 404.
 *
 * Everything else that isn't that redirect or `/api/contact`/`/api/subscribe`
 * is a static asset, served straight from the `ASSETS` binding (the built
 * `dist/`). The two form routes are handled by the same logic that used to run
 * as Cloudflare Pages Functions - `functions/api/*.ts` - unchanged, just called
 * directly instead of through the Pages Functions router.
 */

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

const MEDICAL_HOST = 'med.tsh87.com';

export default {
  async fetch(request: Request, env: Env, ctx: MinimalExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const context: PagesContext<Env> = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };

    if (pathname === '/medical' || pathname.startsWith('/medical/')) {
      const remainder = pathname.slice('/medical'.length) || '/';
      const target = new URL(`${remainder}${url.search}`, `https://${MEDICAL_HOST}`);
      return Response.redirect(target.href, 301);
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
