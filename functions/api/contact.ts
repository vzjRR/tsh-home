/**
 * POST /api/contact — the contact form.
 *
 * Accepts a JSON body or an ordinary form post, so the form works whether or
 * not the page's JavaScript ran. Messages are stored in D1; a Telegram
 * notification is sent when the bot credentials are configured.
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
  type Env,
  type PagesFunction,
} from '../_lib';

const BACK = '/contact';
const SENT = '/contact/sent';

const TOPICS = new Set(['project', 'work', 'collaboration', 'other']);

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const body = await readBody(request);

  // Answer bots exactly as we answer people: they learn nothing from the reply.
  if (looksAutomated(body)) return ok(request, SENT);

  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email).toLowerCase();
  const message = clean(body.message, MAX.message);
  const topicRaw = clean(body.topic, MAX.topic);
  const topic = TOPICS.has(topicRaw) ? topicRaw : 'other';
  const ref = clean(body.ref, 80);

  if (name.length < 2) return fail(request, 400, 'name', BACK);
  if (!isEmail(email)) return fail(request, 400, 'email', BACK);
  if (message.length < 10) return fail(request, 400, 'message', BACK);

  if (!env.DB) return fail(request, 503, 'unavailable', BACK);

  const ipHash = await hashIp(request, env.IP_SALT);

  if (await overLimit(env.DB, 'messages', ipHash, 3, 60)) {
    return fail(request, 429, 'rate', BACK);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO messages (id, created_at, name, email, topic, message, status, ip_hash, user_agent, notified)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'new', ?7, ?8, 0)`,
    )
      .bind(
        id,
        createdAt,
        name,
        email,
        ref ? `${topic}:${ref}` : topic,
        message,
        ipHash,
        clean(request.headers.get('user-agent') ?? '', 300),
      )
      .run();
  } catch {
    return fail(request, 500, 'store', BACK);
  }

  waitUntil(
    notifyTelegram(
      env,
      [
        'New message — tsh87.com',
        `From: ${name} <${email}>`,
        `Topic: ${topic}${ref ? ` (${ref})` : ''}`,
        '',
        message.slice(0, 1200),
      ].join('\n'),
    ),
  );

  return ok(request, SENT, { id });
};

/** A GET here is someone poking at the endpoint, not a browser mistake. */
export const onRequestGet: PagesFunction<Env> = ({ request }) =>
  Response.redirect(new URL(BACK, request.url).href, 303);
