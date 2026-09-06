/**
 * Shared helpers for the form endpoints.
 *
 * These run as Cloudflare Pages Functions. Files prefixed with `_` are not
 * routed, so this module is importable but never reachable over HTTP.
 */

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface Env {
  /** D1 binding. Without it the endpoints answer 503 rather than losing data. */
  DB?: D1Database;
  /** Salt for the stored IP hash. Set it; do not rely on the fallback. */
  IP_SALT?: string;
  /** Both optional. Set them and every submission also arrives on Telegram. */
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

export interface PagesContext<E = Env> {
  request: Request;
  env: E;
  waitUntil(promise: Promise<unknown>): void;
}

export type PagesFunction<E = Env> = (context: PagesContext<E>) => Response | Promise<Response>;

/* ------------------------------------------------------------------ input -- */

/** Reads a body as JSON or as a form post, so the endpoint works with and
 *  without JavaScript. */
export async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]),
    );
  }
  const form = await request.formData().catch(() => new FormData());
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) out[key] = typeof value === 'string' ? value : '';
  return out;
}

/** True when the caller wants JSON back rather than a redirect. */
export function wantsJson(request: Request): boolean {
  return (
    (request.headers.get('accept') ?? '').includes('application/json') ||
    (request.headers.get('content-type') ?? '').includes('application/json')
  );
}

/* ------------------------------------------------------------- validation -- */

export const MAX = { name: 120, email: 254, message: 4000, topic: 40 };

/**
 * Deliberately permissive: this decides whether a reply could plausibly be
 * delivered, not whether the address is RFC-complete.
 */
export function isEmail(value: string): boolean {
  if (value.length < 6 || value.length > MAX.email) return false;
  if (/\s/.test(value)) return false;
  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@')) return false;
  const domain = value.slice(at + 1);
  return (
    domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.') && domain.length > 3
  );
}

/** Strips control characters, collapses blank-line runs, trims, truncates. */
export function clean(value: string | undefined, limit: number): string {
  return (value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, limit);
}

/**
 * Two traps, neither of which a person can trip: a field placed out of reach
 * that only a script fills, and a submission that arrived faster than the form
 * can be read.
 */
export function looksAutomated(body: Record<string, string>): boolean {
  if (clean(body.company, 200).length > 0) return true;
  const rendered = Number(body.ts);
  if (Number.isFinite(rendered) && rendered > 0 && Date.now() - rendered < 2500) return true;
  return false;
}

/* ------------------------------------------------------------------ crypto -- */

export async function hashIp(request: Request, salt: string | undefined): Promise<string> {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const data = new TextEncoder().encode(`${salt ?? 'tsh87-unsalted'}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export function token(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* -------------------------------------------------------------- responses -- */

export function ok(request: Request, redirectTo: string, payload: Record<string, unknown> = {}) {
  if (wantsJson(request)) return Response.json({ ok: true, ...payload });
  return Response.redirect(new URL(redirectTo, request.url).href, 303);
}

export function fail(request: Request, status: number, error: string, backTo: string) {
  if (wantsJson(request)) return Response.json({ ok: false, error }, { status });
  const url = new URL(backTo, request.url);
  url.searchParams.set('error', error);
  return Response.redirect(url.href, 303);
}

/* ------------------------------------------------------------ rate limits -- */

/** Counts this sender's rows in the window and refuses past the limit. */
export async function overLimit(
  db: D1Database,
  table: 'messages' | 'subscribers',
  ipHash: string,
  limit: number,
  windowMinutes: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ip_hash = ?1 AND created_at > ?2`)
    .bind(ipHash, since)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= limit;
}

/* ---------------------------------------------------------------- telegram -- */

/** Best effort. A failed notification must never fail the submission. */
export async function notifyTelegram(env: Env, text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true,
      }),
    });
  } catch {
    /* a dropped notification is not a dropped message */
  }
}
