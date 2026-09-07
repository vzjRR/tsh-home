/**
 * The Worker entry point.
 *
 * This one script answers two Workers Custom Domain hostnames:
 *
 * - tsh87.com / www.tsh87.com: the portfolio itself. Everything that isn't
 *   the /medical redirect below or /api/contact`/`/api/subscribe is a static
 *   asset, served straight from the `ASSETS` binding (the built `dist/`). The
 *   two form routes are handled by the same logic that used to run as
 *   Cloudflare Pages Functions - `functions/api/*.ts` - unchanged, just
 *   called directly instead of through the Pages Functions router. Any
 *   request under `/medical` here is an old link - redirect it, with that
 *   prefix stripped, to med.tsh87.com rather than letting it 404.
 *
 * - med.tsh87.com: Al Ghafri Medical Solutions. It's staying on its current
 *   build - the "tsh" Pages project's /medical route - just needs to appear
 *   at this subdomain's root instead of nested under /medical. So this host
 *   proxies straight to that Pages project, rewriting "/" to "/medical" and
 *   passing every other path through unchanged (its static assets are
 *   already domain-root-relative, so they resolve correctly either way).
 *   The Host header sent upstream is forced to tsh87.com - the Next.js app
 *   only renders the real page for that Host, and shows a placeholder for
 *   anything else (including its own tsh-5hp.pages.dev hostname).
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
const MEDICAL_ORIGIN = 'tsh-5hp.pages.dev';
const MEDICAL_ORIGIN_HOST = 'tsh87.com';

export default {
  async fetch(request: Request, env: Env, ctx: MinimalExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (url.hostname === MEDICAL_HOST) {
      const upstream = new URL(request.url);
      upstream.protocol = 'https:';
      upstream.hostname = MEDICAL_ORIGIN;
      upstream.port = '';
      if (upstream.pathname === '/') upstream.pathname = '/medical';
      const headers = new Headers(request.headers);
      headers.set('host', MEDICAL_ORIGIN_HOST);
      return fetch(upstream.toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: 'manual',
      });
    }

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
