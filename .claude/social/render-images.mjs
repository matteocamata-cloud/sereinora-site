import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';
const F = new URL('../../assets/fonts', import.meta.url).href; // repo fonts
// Usage: node .claude/social/render-images.mjs  (PNGs/PDF go to $OUT or a temp folder; never commit them)
const OUT = process.env.OUT || `${tmpdir()}/sereinora-social/images`;
const DIR = `${OUT}/../render`;
mkdirSync(OUT, { recursive: true }); mkdirSync(DIR, { recursive: true });
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BASE = `@font-face{font-family:"Source Serif 4";src:url(${F}/source-serif-4.woff2) format("woff2");font-weight:200 900}
@font-face{font-family:"Mona Sans";src:url(${F}/mona-sans.woff2) format("woff2");font-weight:200 900}
@font-face{font-family:"Bodoni Moda";src:url(${F}/bodoni-moda.woff2) format("woff2");font-weight:400 700}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f7f1e7;color:#10243a;font-family:"Mona Sans",Arial,sans-serif}
.brand{font:500 46px/1 "Bodoni Moda",Georgia,serif;letter-spacing:.05em}
.kicker{font:600 22px "Mona Sans";letter-spacing:.2em;text-transform:uppercase;color:#684832}
h1{font-family:"Source Serif 4",Georgia,serif;font-weight:600;letter-spacing:-.015em;line-height:1.08}
.rule{height:1px;background:#d3c6b0}
.foot{display:flex;justify-content:space-between;font:500 22px "Mona Sans";color:#43536a}`;

// Square post card, framed like the site's share images
const square = ({ kicker, title, body = '', list = [], foot }) => `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}
body{width:1200px;height:1200px;position:relative;overflow:hidden}
.frame{position:absolute;inset:36px;border:1.5px solid #10243a}.frame::after{content:"";position:absolute;inset:8px;border:1px solid #10243a}
.in{position:absolute;inset:110px 120px 100px;display:flex;flex-direction:column}
.kicker{margin-top:auto}
h1{margin-top:22px;font-size:${title.length > 50 ? 78 : 88}px}
.body{margin-top:34px;font:400 36px/1.4 "Mona Sans";color:#24364d;max-width:920px}
ol{margin-top:34px;list-style:none;counter-reset:q}
ol li{counter-increment:q;position:relative;padding-left:64px;margin-top:22px;font:500 34px/1.35 "Mona Sans";color:#10243a}
ol li::before{content:counter(q);position:absolute;left:0;top:-2px;font:600 40px/1.2 "Source Serif 4";color:#684832}
.rule{margin-top:auto}.foot{margin-top:24px}
</style></head><body><div class="frame"></div><div class="in"><div class="brand">Sereinora</div>
<div class="kicker">${esc(kicker)}</div><h1>${esc(title)}</h1>
${body ? `<p class="body">${esc(body)}</p>` : ''}${list.length ? `<ol>${list.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>` : ''}
<div class="rule" style="margin-top:56px"></div><div class="foot"><span>${esc(foot[0])}</span><span>${esc(foot[1])}</span></div></div></body></html>`;

const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}
body{width:1128px;height:191px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
.c{text-align:center}.t{font:600 30px/1.2 "Source Serif 4";letter-spacing:-.01em}
.s{margin-top:10px;font:500 15px "Mona Sans";letter-spacing:.2em;text-transform:uppercase;color:#684832}
.l{position:absolute;left:0;right:0;bottom:16px;height:1px;background:#d3c6b0}.l2{top:16px;bottom:auto}
</style></head><body><div class="l"></div><div class="l l2"></div><div class="c"><div class="t">Music-license audits for restaurants, bars and hotels</div>
<div class="s">Written · Sourced · Not legal advice · sereinora.com</div></div></body></html>`;

const logo = `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}
body{width:400px;height:400px;background:#10243a;display:grid;place-items:center}
span{font:500 264px/1 "Bodoni Moda",Georgia,serif;color:#f7f1e7;transform:translateY(-3%)}</style></head><body><span>S</span></body></html>`;

// Holiday carousel: 6 portrait slides, 1080x1350, one PDF
const slides = [
  { k: 'Holiday music · 1 of 6', h: 'Do restaurants and bars need a license to play Christmas music?', p: ['In most cases, yes. Holiday songs follow the same rules as the rest of your playlist.'], src: 'sereinora.com/answers/holiday-music/' },
  { k: 'Same rules · 2 of 6', h: 'Holiday songs are licensed like any other music', p: ['US copyright law gives the owner of a musical work the exclusive right “to perform the copyrighted work publicly”.', 'Neither that right nor the law’s definition of “publicly” treats seasonal music differently from music played the rest of the year.'], src: 'Sources: 17 U.S.C. §106(4); 17 U.S.C. §101' },
  { k: 'Still in copyright · 3 of 6', h: 'Many favorites are recent', p: ['ASCAP’s 2025 chart of its 25 most-played holiday songs includes:', '“White Christmas” (1941)<br>“Sleigh Ride” (1948)<br>“Rudolph the Red-Nosed Reindeer” (1949)<br>“All I Want for Christmas Is You” (1994)', 'All were written after the public-domain cutoff on the next slide.'], src: 'Source: ASCAP’s 2025 holiday charts, as reported by BroadwayWorld, Dec. 11, 2025' },
  { k: 'Old carols · 4 of 6', h: 'Three layers, looked at separately', p: ['<b>The song.</b> The U.S. Copyright Office: “all works published in the United States before January 1, 1931, are in the public domain”.', '<b>The arrangement.</b> A “musical arrangement” is a derivative work, with its own copyright in the new material.', '<b>The recording.</b> A recording usually contains two works: the song and the recorded sounds. Duke’s example: the song “Georgia on My Mind” (1930) is now free to perform, “But the later recordings by Ray Charles and by Tiny Tim are still copyrighted”.'], src: 'Sources: Circular 15A; 17 U.S.C. §§101, 103(b); Duke, Public Domain Day 2026' },
  { k: 'Playlists, parties, TVs · 5 of 6', h: 'The rest of the season', p: ['<b>Personal streaming.</b> Spotify grants permission for “personal, non-commercial use”. A holiday playlist on a personal plan is under the same terms as any other.', '<b>Parties, bands and DJs.</b> SESAC: “Paying the band does not cover you for that; your business must have authorization.”', '<b>Radio and TV.</b> A narrow exemption covers certain broadcasts, within size and equipment limits.'], src: 'Sources: Spotify End User Agreement §3; SESAC FAQ; 17 U.S.C. §110(5)(B)' },
  { k: 'Next step · 6 of 6', h: 'Whether a track is free to play depends on facts rarely printed on the playlist', p: ['For a firm answer on a specific track, ask a licensed copyright attorney.', 'For a picture of your whole venue, the free Music Exposure Check takes about two minutes and runs in your browser.'], src: 'Full page, with every source: sereinora.com/answers/holiday-music/' },
];
const carousel = `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}
@page{size:1080px 1350px;margin:0}
.s{width:1080px;height:1350px;position:relative;overflow:hidden;page-break-after:always;background:#f7f1e7}
.frame{position:absolute;inset:32px;border:1.5px solid #10243a}.frame::after{content:"";position:absolute;inset:8px;border:1px solid #10243a}
.in{position:absolute;inset:100px 100px 90px;display:flex;flex-direction:column}
.kicker{margin-top:70px}
h1{margin-top:20px;font-size:70px}
.p{margin-top:30px;font:400 34px/1.42 "Mona Sans";color:#24364d}.p b{color:#10243a;font-weight:650}
.rule{margin-top:auto}.foot{margin-top:22px;font-size:20px;gap:24px}.foot span:last-child{white-space:nowrap}.src{max-width:760px}
</style></head><body>${slides.map((s) => `<section class="s"><div class="frame"></div><div class="in"><div class="brand">Sereinora</div>
<div class="kicker">${s.k}</div><h1>${s.h}</h1>${s.p.map((x) => `<p class="p">${x}</p>`).join('')}
<div class="rule"></div><div class="foot"><span class="src">${s.src}</span><span>Not legal advice</span></div></div></section>`).join('')}</body></html>`;

const jobs = [
  ['logo-400x400', logo, 400, 400],
  ['linkedin-cover-1128x191', cover, 1128, 191],
  ['post2-spotify-1200x1200', square({ kicker: 'Answers', title: 'Can I play Spotify in my restaurant or bar?', body: 'Not with a personal account. What the terms of Spotify, Apple and YouTube say, and what the legal options look like.', foot: ['General information, not legal advice', 'sereinora.com'] }), 1200, 1200],
  ['post6-check-1200x1200', square({ kicker: 'Free Music Exposure Check', title: 'Three questions about the music in your venue', list: ['Where does the background music come from?', 'Any live music, DJs or karaoke?', 'Which PRO licenses do you pay directly?'], foot: ['Runs in your browser. Nothing is stored or sent.', 'sereinora.com/check/'] }), 1200, 1200],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, html, w, h] of jobs) {
  writeFileSync(`${DIR}/${name}.html`, html);
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`file://${DIR}/${name}.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const over = await page.evaluate(() => [...document.querySelectorAll('.in')].map((e) => e.scrollHeight > e.clientHeight + 1));
  console.log(name, 'overflow:', over.join(','));
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
writeFileSync(`${DIR}/carousel.html`, carousel);
await page.setViewportSize({ width: 1080, height: 1350 });
await page.goto(`file://${DIR}/carousel.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
console.log('carousel overflow:', (await page.evaluate(() => [...document.querySelectorAll('.in')].map((e) => e.scrollHeight > e.clientHeight + 1))).join(','));
await page.pdf({ path: `${OUT}/post5-holiday-carousel.pdf`, width: '1080px', height: '1350px', printBackground: true });
for (let i = 0; i < slides.length; i++) {
  await page.locator('section.s').nth(i).screenshot({ path: `${OUT}/post5-holiday-slide-${i + 1}.png` });
}
await browser.close();
