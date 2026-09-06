/**
 * Visual QA harness.
 *
 * Serves `dist/`, walks the breakpoints the site is designed against, and
 * records a full-page screenshot of each along with anything the page said to
 * the console, any request that failed, and any element wider than the
 * viewport. Run `npm run build` first.
 *
 *   node scripts/screenshots.mjs [--url http://host] [--out .qa]
 *
 * Point --url at `wrangler pages dev` to capture the pages with their
 * endpoints live; otherwise it serves dist/ itself.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROUTES = ['/', '/contact'];

const BREAKPOINTS = [
  { name: '320-small-phone', width: 320, height: 720 },
  { name: '375-iphone-se', width: 375, height: 812 },
  { name: '390-iphone-14', width: 390, height: 844 },
  { name: '430-iphone-pro-max', width: 430, height: 932 },
  { name: '768-tablet', width: 768, height: 1024 },
  { name: '1024-tablet-landscape', width: 1024, height: 768 },
  { name: '1280-laptop', width: 1280, height: 800 },
  { name: '1440-desktop', width: 1440, height: 900 },
  { name: '1920-desktop-large', width: 1920, height: 1080 },
  { name: '2560-ultrawide', width: 2560, height: 1200 },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

function serve(root, port = 4321) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path.endsWith('/')) path += 'index.html';
    let file = join(root, path);
    if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
    // A route like /contact resolves to a directory; serve its index.
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file) || !file.startsWith(root)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};

const out = argOf('--out', '.qa');
const externalUrl = argOf('--url', null);
const root = join(process.cwd(), 'dist');

const server = externalUrl ? null : await serve(root);
const base = externalUrl ?? 'http://localhost:4321';

await mkdir(out, { recursive: true });

// The image ships its own Chromium; prefer it over Playwright's expected
// revision so the harness never needs a browser download.
const bundled = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(
  existsSync(bundled) ? { executablePath: bundled } : {},
);
const report = [];

for (const route of ROUTES) {
  const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-');

  for (const bp of BREAKPOINTS) {
  const context = await browser.newContext({
    viewport: { width: bp.width, height: bp.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const messages = [];
  const failures = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') messages.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => messages.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => failures.push(`${req.url()} — ${req.failure()?.errorText}`));

  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });

  // Settle entrance animations and force every reveal so the capture shows
  // the page as a reader who has scrolled through it would see it.
  await page.evaluate(async () => {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.setAttribute('data-revealed', ''));
    await new Promise((r) => setTimeout(r, 400));
  });

  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const wide = [];
    document.querySelectorAll('body *').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      if (rect.right > docWidth + 1 || rect.left < -1) {
        wide.push(
          `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} → ${Math.round(rect.left)}…${Math.round(rect.right)} (doc ${docWidth})`,
        );
      }
    });
    return {
      wide: wide.slice(0, 12),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: docWidth,
    };
  });

  const brokenImages = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
  );

  await page.screenshot({ path: join(out, `${slug}-${bp.name}.png`), fullPage: true });

  report.push({
    breakpoint: `${slug} @ ${bp.name}`,
    width: bp.width,
    horizontalOverflow: overflow.scrollWidth > overflow.clientWidth,
    scrollWidth: overflow.scrollWidth,
    clientWidth: overflow.clientWidth,
    overflowingElements: overflow.wide,
    brokenImages,
    console: messages,
    requestFailures: failures,
  });

  await context.close();
  }
}

await browser.close();
if (server) server.close();

await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));

let problems = 0;
for (const row of report) {
  const issues = [
    row.horizontalOverflow ? `overflow ${row.scrollWidth}>${row.clientWidth}` : null,
    row.overflowingElements.length ? `${row.overflowingElements.length} wide elements` : null,
    row.brokenImages.length ? `${row.brokenImages.length} broken images` : null,
    row.console.length ? `${row.console.length} console messages` : null,
    row.requestFailures.length ? `${row.requestFailures.length} failed requests` : null,
  ].filter(Boolean);
  if (issues.length) problems += 1;
  console.log(`${issues.length ? '✗' : '✓'} ${row.breakpoint.padEnd(36)} ${issues.join(' · ') || 'clean'}`);
  row.overflowingElements.forEach((e) => console.log(`    ${e}`));
  row.console.forEach((e) => console.log(`    ${e}`));
  row.requestFailures.forEach((e) => console.log(`    ${e}`));
}

console.log(`\n${report.length - problems}/${report.length} captures clean · screenshots in ${out}/`);
