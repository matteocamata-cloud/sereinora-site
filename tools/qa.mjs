// Full-site quality check, run before every publish.
// Serves the repo locally, opens every page at 375 px and 1280 px, and fails on:
// console errors, failed same-site requests, horizontal scroll, broken internal links,
// missing title/description/canonical, or a commercial page without the legal footer.
// Usage: node tools/qa.mjs            (optionally --shots DIR to save screenshots)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally

const root = new URL('..', import.meta.url).pathname;
const shotsArg = process.argv.indexOf('--shots');
const shots = shotsArg > -1 ? process.argv[shotsArg + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

function resolveFile(urlPath) {
  let p = join(root, decodeURIComponent(urlPath.split('?')[0].split('#')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  return existsSync(p) ? p : null;
}

const server = createServer((req, res) => {
  const file = resolveFile(req.url);
  if (!file) { res.writeHead(404, { 'content-type': 'text/html' }); res.end(readFileSync(join(root, '404.html'))); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

function pages(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'tools' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...pages(p));
    else if (name.endsWith('.html')) out.push('/' + relative(root, p).split(sep).join('/').replace(/index\.html$/, ''));
  }
  return out.sort();
}

const failures = [];
const fail = (page, msg) => failures.push(`${page}: ${msg}`);
const browser = await chromium.launch();

for (const page of pages(root)) {
  for (const width of [375, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const tab = await ctx.newPage();
    tab.on('console', (m) => { if (m.type() === 'error') fail(page, `${width}px console error: ${m.text()}`); });
    tab.on('pageerror', (e) => fail(page, `${width}px script error: ${e.message}`));
    tab.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400 && !r.url().endsWith('/favicon.ico')) fail(page, `${width}px ${r.status()} ${r.url().slice(base.length)}`); });
    await tab.goto(base + page, { waitUntil: 'networkidle' });
    const info = await tab.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      canonical: document.querySelector('link[rel="canonical"]')?.href || '',
      venue: !!document.querySelector('link[href="/assets/venue.css"]'),
      legal: document.body.innerText.includes('not legal advice'),
      h1: document.querySelectorAll('h1').length,
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      ids: [...document.querySelectorAll('[id]')].map((e) => e.id),
    }));
    if (info.overflow > 1) fail(page, `${width}px horizontal scroll (${info.overflow}px)`);
    if (width === 1280) {
      if (!info.title) fail(page, 'no <title>');
      if (info.venue && !info.description) fail(page, 'no meta description');
      if (info.venue && !info.canonical && page !== '/404.html') fail(page, 'no canonical link');
      if (info.venue && !info.legal) fail(page, 'commercial page without "not legal advice" text');
      if (info.venue && info.h1 !== 1) fail(page, `${info.h1} <h1> elements (want 1)`);
      for (const href of info.links) {
        if (/^(mailto:|tel:|https?:|\/\/)/.test(href)) continue;
        const [path, hash] = href.split('#');
        if (path === '' && hash && !info.ids.includes(hash)) { fail(page, `anchor #${hash} not found`); continue; }
        if (path === '') continue;
        const abs = new URL(path, base + page).pathname;
        if (!resolveFile(abs)) fail(page, `broken link ${href}`);
      }
    }
    if (shots) await tab.screenshot({ path: join(shots, `${page.replace(/\//g, '_') || '_'}-${width}.png`), fullPage: true });
    await ctx.close();
  }
  console.log(`checked ${page}`);
}

await browser.close();
server.close();
if (failures.length) { console.log(`\n${failures.length} problem(s):`); for (const f of [...new Set(failures)]) console.log('  ' + f); process.exit(1); }
console.log('\nAll pages pass.');
