/**
 * Renders the Open Graph card to `public/og.png` (1200×630) from the same
 * type and palette as the site, so the share preview is the site rather than
 * a stock graphic. Re-run after changing the name, role or palette:
 *
 *   npm run og
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

/** The brand mark, inlined so the card needs nothing but this file. */
const markPath = 'src/assets/brand/logo.webp';
const mark = existsSync(markPath)
  ? `data:image/webp;base64,${(await readFile(markPath)).toString('base64')}`
  : null;

const MIME = {
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const publicDir = join(process.cwd(), 'public');

// Mirrors `site.role` and the first of `site.disciplines` in src/data/site.ts.
// Keep them in step; this script cannot import the TypeScript module.
const NAME_TOP = 'TALAL';
const NAME_BOTTOM = 'AL GHAFRI';
const ROLE = 'Software Development · Systems Engineering';
const META = ['Software Development', 'Discord Systems', 'FiveM Platforms', 'Web & API'];
const DOMAIN = 'tsh87.com';
const HANDLE = 'vzjRR';

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Geist';src:url('/fonts/geist-latin-variable.woff2') format('woff2-variations');font-weight:100 900}
@font-face{font-family:'Geist Mono';src:url('/fonts/geist-mono-latin-variable.woff2') format('woff2-variations');font-weight:100 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#050505;color:#EDEDED;font-family:'Geist',sans-serif;overflow:hidden}
.card{position:relative;width:1200px;height:630px;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px);background-size:96px 96px;-webkit-mask-image:radial-gradient(120% 90% at 50% 0%,#000 0%,transparent 72%)}
.row{position:relative;display:flex;align-items:center;justify-content:space-between;gap:24px}
.mono{font-family:'Geist Mono',monospace;font-size:15px;letter-spacing:.16em;text-transform:uppercase;font-weight:450}
.quiet{color:#6B6B6B}
.rule{height:1px;background:rgba(255,255,255,.09);position:relative;margin:26px 0}
.name{position:relative;line-height:.86;letter-spacing:-.045em;text-transform:uppercase}
.name b{display:block;font-size:148px;font-weight:600;color:#F5F5F5}
.name i{display:block;font-size:148px;font-weight:200;font-style:normal;color:#9B9B9B}
.role{position:relative;color:#DFC063;margin-top:34px;margin-bottom:8px}
.meta{position:relative;display:flex;gap:14px;flex-wrap:wrap}
.chip{border:1px solid rgba(255,255,255,.09);border-radius:2px;padding:8px 12px;font-family:'Geist Mono',monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6B6B6B}
.mark{position:relative;display:flex;align-items:center;gap:14px}
.seal{position:relative;height:96px;width:auto;object-fit:contain}
.dot{width:7px;height:7px;border-radius:99px;background:#DFC063;box-shadow:0 0 0 4px rgba(201,162,39,.09)}
</style></head><body>
<div class="card">
  <div class="grid"></div>
  <div class="row">
    <span class="mono quiet">Muscat, Oman · GMT+4</span>
    ${mark ? `<img class="seal" src="${mark}" alt="">` : `<span class="mono quiet">${HANDLE}</span>`}
  </div>
  <div>
    <div class="rule"></div>
    <h1 class="name"><b>${NAME_TOP}</b><i>${NAME_BOTTOM}</i></h1>
    <p class="role mono">${ROLE}</p>
  </div>
  <div class="row">
    <div class="meta">${META.map((m) => `<span class="chip">${m}</span>`).join('')}</div>
    <div class="mark"><span class="dot"></span><span class="mono">${DOMAIN}</span></div>
  </div>
</div>
</body></html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
    return;
  }
  const file = join(publicDir, normalize(decodeURIComponent(url.pathname)));
  if (!existsSync(file) || !file.startsWith(publicDir)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
});

await new Promise((resolve) => server.listen(4322, resolve));

const bundled = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(bundled) ? { executablePath: bundled } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

await page.goto('http://localhost:4322/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(publicDir, 'og.png') });

await browser.close();
server.close();

console.log('wrote public/og.png (1200×630)');
