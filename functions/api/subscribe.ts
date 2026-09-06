/**
 * POST /api/subscribe — the newsletter.
 *
 * One field, one row. Re-subscribing an address that previously unsubscribed
 * reactivates it rather than failing, and an address that is already active is
 * answered as a success — the caller learns nothing about who is on the list.
 */

import {
  clean,
  fail,
  hashIp,
  isEmail,
  looksAutomated,
  MAX,
  notifyTelegram,
  ok,
  overLimit,
  readBody,
  token,
  type Env,
  type PagesFunction,
} from '../_lib';

const BACK = '/#newsletter';
const DONE = '/newsletter/subscribed';

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const body = await readBody(request);

  if (looksAutomated(body)) return ok(request, DONE);

  const email = clean(body.email, MAX.email).toLowerCase();
  const source = clean(body.source, 60) || 'site';

  if (!isEmail(email)) return fail(request, 400, 'email', BACK);
  if (!env.DB) return fail(request, 503, 'unavailable', BACK);

  const ipHash = await hashIp(request, env.IP_SALT);

  if (await overLimit(env.DB, 'subscribers', ipHash, 5, 60)) {
    return fail(request, 429, 'rate', BACK);
  }

  const createdAt = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO subscribers (email, created_at, status, unsubscribed_at, unsubscribe_token, source, ip_hash)
       VALUES (?1, ?2, 'active', NULL, ?3, ?4, ?5)
       ON CONFLICT(email) DO UPDATE SET status = 'active', unsubscribed_at = NULL`,
    )
      .bind(email, createdAt, token(), source, ipHash)
      .run();
  } catch {
    return fail(request, 500, 'store', BACK);
  }

  waitUntil(notifyTelegram(env, `New subscriber — tsh87.com\n${email} (${source})`));

  return ok(request, DONE);
};

/**
 * GET /api/subscribe?email=&token= — the unsubscribe link.
 *
 * Both parts must match, so a known address alone is not enough to remove
 * someone. The row is kept and marked, not deleted, so a later re-subscribe
 * is not silently undone by a stale link.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const email = clean(url.searchParams.get('email') ?? '', MAX.email).toLowerCase();
  const supplied = clean(url.searchParams.get('token') ?? '', 64);
  const left = new URL('/newsletter/unsubscribed', request.url).href;

  if (!email || !supplied || !env.DB) return Response.redirect(left, 303);

  try {
    await env.DB.prepare(
      `UPDATE subscribers
          SET status = 'unsubscribed', unsubscribed_at = ?1
        WHERE email = ?2 AND unsubscribe_token = ?3`,
    )
      .bind(new Date().toISOString(), email, supplied)
      .run();
  } catch {
    /* the confirmation page is the same either way */
  }

  return Response.redirect(left, 303);
};
