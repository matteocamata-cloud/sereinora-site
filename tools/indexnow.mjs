// Tells search engines that support IndexNow (Bing, Yandex, Seznam, Naver and others) about every URL
// in sitemap.xml. Run after each publish, once the site is live:  node tools/indexnow.mjs
// The key file /95cfccb5e7fc64375bd765d8f7fb179c.txt must stay published at the site root.
import { readFileSync } from 'node:fs';
const KEY = '95cfccb5e7fc64375bd765d8f7fb179c';
const root = new URL('..', import.meta.url).pathname;
const urls = [...readFileSync(root + 'sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: 'sereinora.com', key: KEY, keyLocation: `https://sereinora.com/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urls.length} URLs`);
if (![200, 202].includes(res.status)) console.log(await res.text());
