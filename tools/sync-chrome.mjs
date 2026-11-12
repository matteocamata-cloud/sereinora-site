// Keeps the header and footer identical on every commercial page.
// Source of truth: tools/partials/header.html and tools/partials/footer.html.
// Usage:  node tools/sync-chrome.mjs          (rewrite pages)
//         node tools/sync-chrome.mjs --check  (report drift, exit 1 if any)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const header = readFileSync(join(root, 'tools/partials/header.html'), 'utf8').trimEnd();
const footer = readFileSync(join(root, 'tools/partials/footer.html'), 'utf8').trimEnd();
const check = process.argv.includes('--check');

// Nav links that get aria-current="page" when the page sits under them.
const NAV = ['/check/', '/audit/', '/sample/', '/answers/', '/about/'];

function pages(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'tools' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...pages(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

function urlPath(file) {
  const rel = relative(root, file).split(sep).join('/');
  return '/' + rel.replace(/index\.html$/, '');
}

function headerFor(path) {
  const current = NAV.filter((n) => path.startsWith(n)).sort((a, b) => b.length - a.length)[0];
  if (!current) return header;
  return header.replace(`<a href="${current}">`, `<a href="${current}" aria-current="page">`);
}

let drift = 0;
for (const file of pages(root)) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('/assets/venue.css')) continue; // only shared-style pages
  const path = urlPath(file);
  const next = html
    .replace(/<header class="site-header">[\s\S]*?<\/header>/, headerFor(path))
    .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, footer);
  const problems = [];
  if (!/<header class="site-header">/.test(html)) problems.push('no header');
  if (!/<footer class="site-footer">/.test(html)) problems.push('no footer');
  if (!next.includes('not legal advice')) problems.push('missing "not legal advice" line');
  if (problems.length) { console.log(`PROBLEM ${path}: ${problems.join(', ')}`); drift++; continue; }
  if (next !== html) {
    drift++;
    if (check) console.log(`DRIFT   ${path}`);
    else { writeFileSync(file, next); console.log(`UPDATED ${path}`); }
  }
}
console.log(drift ? `${drift} page(s) ${check ? 'differ' : 'updated'}.` : 'All pages match.');
process.exit(check && drift ? 1 : 0);
