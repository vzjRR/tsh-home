/**
 * Behaviour, accessibility and form QA.
 *
 * Drives a real browser against a running site and asserts the things a
 * screenshot cannot: keyboard handling, the mobile menu, reduced motion, the
 * no-JavaScript path, and both form endpoints end to end.
 *
 *   npx wrangler pages dev            # in one shell — serves dist/ + functions/
 *   node scripts/qa.mjs               # in another
 *   node scripts/qa.mjs --url http://127.0.0.1:8788
 *
 * Form checks are skipped automatically when the endpoints are not running, so
 * the suite is still useful against a plain static server.
 */

import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const urlFlag = args.indexOf('--url');
const BASE = urlFlag >= 0 ? args[urlFlag + 1] : 'http://127.0.0.1:8788';

const bundled = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(bundled) ? { executablePath: bundled } : {});

const results = [];
const check = (name, passed) => results.push({ name, passed });
const unique = () => `qa${Date.now()}${Math.floor(Math.random() * 9999)}@example.com`;

const page = async (options = {}) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  return { context, page: await context.newPage() };
};

/* ---------------------------------------------------------- mobile menu -- */
{
  const { context, page: p } = await page({ viewport: { width: 390, height: 844 } });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  const menu = p.locator('[data-menu]');
  const toggle = p.locator('[data-menu-toggle]');
  const hidden = () => menu.evaluate((e) => getComputedStyle(e).visibility === 'hidden');

  check('menu starts closed', await hidden());
  await toggle.click();
  await p.waitForTimeout(400);
  check('menu opens', !(await hidden()));
  check('aria-expanded tracks it', (await toggle.getAttribute('aria-expanded')) === 'true');
  check('page scroll is locked', await p.evaluate(() => document.documentElement.style.overflow === 'hidden'));
  check('the page behind goes inert', await p.evaluate(() => document.querySelector('main')?.hasAttribute('inert')));
  check('focus moves into the menu', await p.evaluate(() => document.activeElement?.hasAttribute('data-menu-link')));
  await p.keyboard.press('Escape');
  // Visibility is held until the fade finishes (--dur-3), so wait past it.
  await p.waitForTimeout(700);
  check('Escape closes it', await hidden());
  check('scroll is released', await p.evaluate(() => document.documentElement.style.overflow === ''));
  check('focus returns to the toggle', await p.evaluate(() => document.activeElement?.hasAttribute('data-menu-toggle')));
  await context.close();
}

/* ------------------------------------------------------------- keyboard -- */
{
  const { context, page: p } = await page();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.keyboard.press('Tab');
  check('skip link is the first stop', (await p.evaluate(() => document.activeElement?.className ?? '')).includes('skip-link'));
  check('focus ring is drawn', (await p.evaluate(() => getComputedStyle(document.activeElement, ':focus-visible').outlineWidth)) !== '0px');
  await context.close();
}

/* --------------------------------------------------------- deep linking -- */
{
  const { context, page: p } = await page();
  await p.goto(`${BASE}/#work-serverstats`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  check('a deep link opens the work row', await p.locator('#work-serverstats details').evaluate((e) => e.open));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.locator('a[href="#work-enclave-tickets"]').first().click();
  await p.waitForTimeout(350);
  check('an evidence link expands its row', await p.locator('#work-enclave-tickets details').evaluate((e) => e.open));
  await context.close();
}

/* --------------------------------------------------------- document QA -- */
{
  const { context, page: p } = await page();
  for (const path of ['/', '/contact']) {
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    const levels = await p.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => +h.tagName[1]));
    let jumps = 0;
    for (let i = 1; i < levels.length; i += 1) if (levels[i] - levels[i - 1] > 1) jumps += 1;
    check(`${path} — exactly one h1`, levels.filter((l) => l === 1).length === 1);
    check(`${path} — no skipped heading levels`, jumps === 0);
  }
  await context.close();
}

/* ------------------------------------------------- no source references -- */
{
  const { context, page: p } = await page();
  const found = [];
  for (const path of ['/', '/contact', '/contact/sent', '/newsletter/subscribed', '/newsletter/unsubscribed']) {
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.href));
    const text = await p.evaluate(() => document.body.innerText);
    links.filter((h) => /github|gitlab|bitbucket/i.test(h)).forEach((h) => found.push(`${path} → ${h}`));
    if (/github|repositor|source code/i.test(text)) found.push(`${path} → body text`);
  }
  check(`no repository or source reference on any page${found.length ? ` (${found.join(', ')})` : ''}`, found.length === 0);
  await context.close();
}

/* -------------------------------------------------------- reduced motion -- */
{
  const { context, page: p } = await page({ reducedMotion: 'reduce' });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  check('nothing stays hidden under reduced motion',
    (await p.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => +getComputedStyle(e).opacity < 0.99).length)) === 0);
  check('counters show their final value', (await p.locator('[data-count]').first().textContent())?.trim() === '13');
  await context.close();
}

/* ------------------------------------------------------------- no script -- */
{
  const { context, page: p } = await page({ javaScriptEnabled: false });
  await p.goto(BASE, { waitUntil: 'load' });
  const visible = await p.evaluate(() => {
    const els = [...document.querySelectorAll('[data-reveal]')];
    return [els.filter((e) => +getComputedStyle(e).opacity > 0.99).length, els.length];
  });
  check(`all content renders without JavaScript (${visible[0]}/${visible[1]})`, visible[0] === visible[1]);
  check('the work index is still readable', (await p.locator('.index__row').count()) === 11);
  await context.close();
}

/* ------------------------------------------------------------ contact UI -- */
{
  const { context, page: p } = await page();
  await p.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  await p.locator('[data-contact-form] [data-submit]').click();
  await p.waitForTimeout(300);
  check('an empty submit is refused with a message',
    (await p.locator('[data-contact-form] [data-form-status]').getAttribute('data-state')) === 'error');
  check('the offending field is marked', (await p.locator('#contact-name').getAttribute('aria-invalid')) === 'true');
  check('focus lands on it', await p.evaluate(() => document.activeElement?.id === 'contact-name'));
  await p.fill('#contact-name', 'QA Person');
  await p.waitForTimeout(150);
  check('the mark clears once corrected', (await p.locator('#contact-name').getAttribute('aria-invalid')) === null);
  await context.close();
}

/* ---------------------------------------------------- work reference link -- */
{
  const { context, page: p } = await page();
  await p.goto(`${BASE}/contact?ref=serverstats`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  check('the referenced work is named on the form', (await p.locator('[data-ref-note]').textContent())?.trim() === 'ServerStats');
  check('the subject is preselected', (await p.locator('#contact-topic').inputValue()) === 'work');
  check('the reference travels with the submission', (await p.locator('[data-ref]').inputValue()) === 'serverstats');
  await context.close();
}

/* --------------------------------------------------------------- endpoints -- */
const endpointsUp = await fetch(`${BASE}/api/contact`, { method: 'GET', redirect: 'manual' })
  .then((r) => r.status === 303)
  .catch(() => false);

if (!endpointsUp) {
  check('SKIPPED — endpoints not running (start `npx wrangler pages dev`)', true);
} else {
  const { context, page: p } = await page();
  await p.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  await p.fill('#contact-name', 'QA Person');
  await p.fill('#contact-email', unique());
  await p.fill('#contact-message', 'A real submission driven through the browser, long enough to pass validation.');
  await p.locator('[data-contact-form] [data-submit]').click();
  await p
    .waitForFunction(() => document.querySelector('[data-form-status]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 })
    .catch(() => {});
  check('the contact form submits in place and confirms',
    (await p.locator('[data-contact-form] [data-form-status]').getAttribute('data-state')) === 'ok');
  check('the form is cleared afterwards', (await p.locator('#contact-message').inputValue()) === '');

  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.fill('#newsletter-email', unique());
  await p.locator('[data-subscribe-form] [data-submit]').click();
  await p
    .waitForFunction(() => document.querySelector('[data-subscribe-form] [data-form-status]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 })
    .catch(() => {});
  check('the newsletter subscribes in place',
    (await p.locator('[data-subscribe-form] [data-form-status]').getAttribute('data-state')) === 'ok');
  await context.close();

  // The no-JavaScript path is the one that has to survive: an ordinary post,
  // answered with a redirect.
  const noJs = await page({ javaScriptEnabled: true });
  const form = new URLSearchParams({
    email: unique(),
    ts: '1',
  });
  const response = await fetch(`${BASE}/api/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    redirect: 'manual',
  });
  check('a plain form post is answered with a redirect',
    response.status === 303 && (response.headers.get('location') ?? '').includes('/newsletter/subscribed'));

  const rejected = await fetch(`${BASE}/api/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email: 'not-an-address', ts: '1' }),
  });
  check('a malformed address is rejected', rejected.status === 400);

  const trapped = await fetch(`${BASE}/api/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email: unique(), company: 'SpamCo', ts: '1' }),
  });
  check('a filled honeypot is accepted but discarded', trapped.status === 200);
  await noJs.context.close();
}

await browser.close();

const passed = results.filter((r) => r.passed).length;
for (const r of results) console.log(`${r.passed ? '✓' : '✗'} ${r.name}`);
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
