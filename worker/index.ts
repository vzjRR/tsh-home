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
 * - med.tsh87.com: Al Ghafri Medical Solutions' new home. Its current build
 *   (the "tsh" Pages project's /medical route) turns out to only render its
 *   real content for Host: tsh87.com exactly - every other hostname it sees,
 *   including a genuine, fully-activated custom domain pointed straight at
 *   it, gets a placeholder page instead. Neither an explicit Host header
 *   override nor Cloudflare's resolveOverride mechanism can work around
 *   that from here (the header override is silently dropped, and
 *   resolveOverride isn't supported against Pages projects - both tried and
 *   confirmed). So this host answers with a plain holding response until
 *   that app's own configuration is updated to recognize med.tsh87.com too.
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

const MEDICAL_HOLDING_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Al Ghafri Medical Solutions</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; background: #0b0b0b; color: #eee; margin: 0;
         display: flex; min-height: 100vh; align-items: center; justify-content: center; text-align: center; }
  main { max-width: 32rem; padding: 2rem; }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
</style>
</head>
<body>
<main>
<h1>Al Ghafri Medical Solutions</h1>
<p>This platform is moving to this address. Please check back shortly.</p>
</main>
</body>
</html>
`;

export default {
  async fetch(request: Request, env: Env, ctx: MinimalExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (url.hostname === MEDICAL_HOST) {
      return new Response(MEDICAL_HOLDING_PAGE, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
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
