/**
 * The Worker entry point.
 *
 * Everything that isn't `/api/contact` or `/api/subscribe` is a static asset,
 * served straight from the `ASSETS` binding (the built `dist/`). The two form
 * routes are handled by the same logic that used to run as Cloudflare Pages
 * Functions — `functions/api/*.ts` — unchanged, just called directly instead
 * of through the Pages Functions router.
 *
 * This file exists instead of Pages because keeping `/medical` on the
 * existing production Worker while this site owns everything else requires
 * two Workers with distinct Route patterns on the same zone — Pages custom
 * domains cannot be split by path. See README.md § Deployment.
 */

import { onRequestGet as contactGet, onRequestPost as contactPost } from '../functions/api/contact';
import { onRequestGet as subscribeGet, onRequestPost as subscribePost } from '../functions/api/subscribe';
import type { Env as FormEnv, PagesContext } from '../functions/_lib';

/**
 * Just the two things actually used from `@cloudflare/workers-types`,
 * declared locally rather than imported. That package's ambient globals
 * redefine DOM types (Element, Request, …) program-wide — referencing it
 * anywhere would break type-checking for the browser-side scripts under
 * `src/scripts/`, which share this project's one tsconfig.
 */
interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface Env extends FormEnv {
  /** Workers Assets binding — the built `dist/` directory. */
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env, ctx: MinimalExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    const context: PagesContext<Env> = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };

    if (pathname === '/api/contact') {
      return request.method === 'POST' ? contactPost(context) : contactGet(context);
    }

    if (pathname === '/api/subscribe') {
      return request.method === 'POST' ? subscribePost(context) : subscribeGet(context);
    }

    return env.ASSETS.fetch(request);
  },
};
