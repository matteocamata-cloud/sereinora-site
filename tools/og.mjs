// Generates on-brand share images (1200x630) for every commercial page and the app icons,
// then points each page's og:image / twitter:image at its own picture.
// Usage: node tools/og.mjs    (re-run after adding a page or changing a title)
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally

const root = new URL('..', import.meta.url).pathname;
const TYPES = { '.woff2': 'font/woff2', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'access-control-allow-origin': '*' });
  res.end(readFileSync(p));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

function pages(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || ['tools', 'node_modules', 'assistant', 'assets'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...pages(p));
    else if (name === 'index.html') out.push(p);
  }
  return out;
}
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/<[^>]+>/g, '');

const FONTS = `
@font-face{font-family:"Source Serif 4";src:url(${base}/assets/fonts/source-serif-4.woff2) format("woff2");font-weight:200 900}
@font-face{font-family:"Mona Sans";src:url(${base}/assets/fonts/mona-sans.woff2) format("woff2");font-weight:200 900}
@font-face{font-family:"Bodoni Moda";src:url(${base}/assets/fonts/bodoni-moda.woff2) format("woff2");font-weight:400 700}`;
const card = (kicker, title) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#f7f1e7;color:#10243a;font-family:"Mona Sans",Arial,sans-serif;position:relative;overflow:hidden}
.frame{position:absolute;inset:28px;border:1.5px solid #10243a}
.frame::after{content:"";position:absolute;inset:7px;border:1px solid #10243a}
.in{position:absolute;inset:80px 96px 76px;display:flex;flex-direction:column}
.brand{font:500 44px/1 "Bodoni Moda",Georgia,serif;letter-spacing:.05em}
.kicker{margin-top:auto;font:600 19px "Mona Sans";letter-spacing:.2em;text-transform:uppercase;color:#684832}
h1{margin-top:18px;font:600 ${title.length > 60 ? 54 : 64}px/1.08 "Source Serif 4",Georgia,serif;letter-spacing:-.015em;max-width:960px}
.rule{margin-top:34px;height:1px;background:#d3c6b0}
.foot{margin-top:18px;display:flex;justify-content:space-between;font:500 20px "Mona Sans";color:#43536a}
</style></head><body><div class="frame"></div><div class="in">
<div class="brand">Sereinora</div><div class="kicker">${esc(kicker)}</div><h1>${esc(title)}</h1><div class="rule"></div>
<div class="foot"><span>Music-license audits for restaurants, bars and hotels</span><span>sereinora.com</span></div></div></body></html>`;
const icon = (size, pad) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{margin:0}body{width:${size}px;height:${size}px;background:#10243a;display:grid;place-items:center}
span{font:500 ${Math.round(size * (pad ? 0.5 : 0.66))}px/1 "Bodoni Moda",Georgia,serif;color:#f7f1e7;transform:translateY(-3%)}
</style></head><body><span>S</span></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
mkdirSync(join(root, 'assets/og'), { recursive: true });
let count = 0;
for (const file of pages(root)) {
  let html = readFileSync(file, 'utf8');
  if (!html.includes('/assets/venue.css') || !html.includes('property="og:image"')) continue;
  const rel = relative(root, file).split(sep).join('/').replace(/index\.html$/, '');
  const slug = rel.replace(/\/$/, '').replace(/\//g, '-') || 'home';
  const h1 = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, 'Sereinora'])[1]).replace(/\s+/g, ' ').trim();
  const crumbs = rel.startsWith('answers/') && rel !== 'answers/' ? 'Answers' : rel === '' ? 'For restaurants, bars and hotels' : decode((html.match(/<title>([^|<]*)/) || [, ''])[1]).split(':')[0].trim();
  await page.setContent(card(crumbs, h1), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(root, `assets/og/${slug}.png`) });
  const url = `https://sereinora.com/assets/og/${slug}.png`;
  html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${url}">`)
    .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${esc(h1)}">`);
  if (!html.includes('name="twitter:image"')) html = html.replace('<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:image" content="${url}">`);
  else html = html.replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${url}">`);
  writeFileSync(file, html);
  count++;
}
for (const [name, size, pad] of [['apple-touch-icon.png', 180, false], ['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(icon(size, pad), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(root, 'assets', name) });
}
await browser.close();
server.close();
console.log(`share images: ${count} pages; icons: 4`);
