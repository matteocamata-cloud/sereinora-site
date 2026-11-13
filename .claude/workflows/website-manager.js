export const meta = {
  name: 'website-manager',
  description: 'Sereinora website manager: inspect the site from seven angles, verify every finding, apply safe fixes, report in plain English',
  whenToUse: 'Weekly, before any publish, or when the founder asks "check the website". Pass args {today:"YYYY-MM-DD", fix:true|false}.',
  phases: [
    { title: 'Inspect', detail: 'seven independent inspectors, read-only' },
    { title: 'Verify', detail: 'skeptics try to refute each medium/high finding' },
    { title: 'Fix', detail: 'one fixer applies safe mechanical fixes, reruns QA' },
    { title: 'Report', detail: 'plain-English report for the founder' },
  ],
}

// ---------------------------------------------------------------------------
// Inputs. Date.now() is unavailable in workflows, so the date comes in via args.
const TODAY = (args && args.today) || 'UNKNOWN-DATE'
const DO_FIX = !(args && args.fix === false)

const CONTEXT = `You are part of Sereinora's website manager. Repo: the current working directory (a static site served by GitHub Pages from main; live at https://sereinora.com). Today is ${TODAY}.
Follow CLAUDE.md strictly. You are READ-ONLY in this phase: do not edit, commit or push anything.
Known false positives to ignore: axe colour-contrast warnings on /elements/ (reveal animation; passes once in view); legacy pages /place-studies/001/ and /decisions/hotel-sound-handover/ are intentionally kept online with noindex and are not part of the sales funnel.
Bot blocking: ascap.com, bmi.com, sesac.com, law.justia.com and ftc.gov often answer 403/202 to scripts while working in browsers. A 403/429/202 from those is NOT a broken link; only 404/410/5xx/DNS failures are. When in doubt, check https://archive.org/wayback/available?url=<url>.
Report only real, specific problems with evidence (file path, line or URL, exact text). No style opinions, no vague advice. Empty findings are a valid answer.`

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'one line, plain English' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'], description: 'high = hurts trust, sales, legal safety or breaks something now' },
          page: { type: 'string', description: 'URL path or file' },
          evidence: { type: 'string', description: 'exact text, command output, HTTP status or line number' },
          fix: { type: 'string', description: 'precise change to make' },
          fix_type: { type: 'string', enum: ['safe-mechanical', 'new-copy', 'founder-decision', 'info'], description: 'safe-mechanical = no change to visible wording or claims (links, meta, sitemap, images, code, header/footer sync); new-copy = changes visible wording; founder-decision = prices, names, legal or strategy' },
        },
        required: ['title', 'severity', 'page', 'evidence', 'fix', 'fix_type'],
      },
    },
    checked: { type: 'string', description: 'what you actually checked, so gaps are visible' },
  },
  required: ['findings', 'checked'],
}

const VERDICT = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['refuted', 'reason'],
}

const INSPECTORS = [
  {
    key: 'qa',
    prompt: `Run the site's own checks and report every failure:
1. node tools/sync-chrome.mjs --check
2. node tools/qa.mjs   (serves the repo locally; opens every page at 375 and 1280 px)
3. python3 -c "import xml.dom.minidom;xml.dom.minidom.parse('sitemap.xml')"; then compare sitemap.xml against every index.html page that uses /assets/venue.css (each public commercial page must be listed; noindex pages must not be).
4. Validate every <script type="application/ld+json"> block parses as JSON.
Each failure is one finding with the exact output line as evidence.`,
  },
  {
    key: 'live',
    prompt: `Check that the live site matches main and works:
1. git log -1 --format=%H origin/main (git fetch origin main first).
2. For every page in sitemap.xml plus /404.html, /robots.txt, /check/check.js, /assets/venue.css: curl -sL -o /dev/null -w '%{http_code} %{size_download} %{time_total}' with a cache-busting ?v=${TODAY} query. Report non-200s, pages over 1.5 MB total weight, or over 3 s.
3. Compare the live HTML of /, /audit/ and one answer page with the files in the repo (ignore whitespace). A mismatch means the deploy is stale or failed.
4. Check https://sereinora.com redirects from http and from www.`,
  },
  {
    key: 'sources',
    prompt: `Check every external link cited on the site still works and still says what we quote.
1. Extract all external hrefs from all .html files (exclude sereinora.com, fonts, youtube embeds). De-duplicate.
2. curl each with a browser User-Agent, -L, 20 s timeout. Classify: OK / BOT-BLOCKED (403, 429, 202 from a known bot-blocking site) / BROKEN (404, 410, 5xx, DNS, TLS).
3. For BROKEN and for BOT-BLOCKED links on ascap.com, bmi.com and sesac.com, check the Wayback availability API to see whether the page still exists.
4. For each answer page, pick the three most important quoted phrases (text inside “ ” next to a link) and confirm the phrase still appears on the source page (or its latest Wayback snapshot). A quote that no longer appears is a high-severity finding.
Report only BROKEN links and missing quotes as findings; list counts in "checked".`,
  },
  {
    key: 'rules',
    prompt: `Read every commercial page (all index.html files that use /assets/venue.css, plus check/check.js) as a strict compliance reviewer for CLAUDE.md. Flag, with exact quoted text:
- anything that reads as legal advice ("you must", "you are required", "you don't need", "you are exempt"), promises savings or outcomes, or suggests Sereinora negotiates with PROs or clears rights;
- any legal or numeric claim without a source link in the same paragraph or list item;
- prices that are not exactly $495 (5 business days), $1,950 for up to 10 venues (10 business days), $295 (48 hours);
- refund wording that differs from: "If we miss the delivery date we confirmed in writing, you get a full refund. The delivery clock starts when we have your payment and the documents we asked for.";
- a missing "not legal advice" line; any founder name, personal location or registration claim; the sample report not labelled fictional;
- styles the founder rejected: slogan headings, fear selling, huge figures used as a hook, clickbait questions, sticky bars, gimmicks;
- claims of card payment or a "secure payment link" (payments are not live yet).`,
  },
  {
    key: 'freshness',
    prompt: `Find content that is stale or about to go stale, relative to today (${TODAY}):
- every "Last reviewed" date older than 90 days;
- facts tied to a year or date that will expire: ASCAP's "calendar year 2026" rates (stale on 2027-01-01), the October 2026 lawsuits and the Brownstein alert, NRA/AHLA figures from July 2025, provider prices "checked November 12, 2026" (re-check them now on the provider pricing pages: Pandora CloudCover, Mood Media, Rockbot);
- the footer copyright year;
- statute figures: re-read 17 U.S.C. §110(5)(B) and §504(c) on law.cornell.edu and confirm every figure on the site still matches (3,750 / 2,000 sq ft, 6 speakers / 4 per room, 4 screens / 1 per room / 55 inches, $750 to $30,000, $150,000, $200).
For each stale item give the exact page, current text and what the source says today.`,
  },
  {
    key: 'conversion',
    prompt: `Act as a skeptical US bar owner arriving from Google on /answers/music-license-cost/ and then the homepage. Walk the funnel: answer page -> /check/ (fill it in with Playwright as a 4,200 sq ft bar with weekly live music, a DJ, ASCAP only, a PRO letter) -> result -> "Email my answers" link -> /audit/ -> /sample/.
Report concrete friction only: a dead end, a missing next step, a confusing label, a mailto link that breaks, a mismatch between what a page promises and what the next page delivers, a trust gap (an unanswered "who are you?" question). Each finding must name the exact element and the exact fix. Do not propose new prices or new claims.`,
  },
  {
    key: 'growth',
    prompt: `Find the next search opportunities for US restaurant, bar and hotel owners.
1. List the existing /answers/ pages and their titles.
2. Using web search, find 5 real questions owners ask about music licensing that no existing page answers (e.g. TVs in bars, jukeboxes, hotel music, PRO letters by name, music on hold, fitness classes in hotels). Prefer questions where an authoritative primary source exists (statute, PRO FAQ, provider terms).
3. For each: the question as an owner would type it, why it matters commercially, and 2 primary source URLs you actually opened.
Return each as a finding with severity "low" and fix_type "new-copy". Also flag any missing internal links between existing answer pages as "safe-mechanical".`,
  },
]

// ---------------------------------------------------------------------------
phase('Inspect')
log(`Website manager run for ${TODAY}. Fix mode: ${DO_FIX ? 'safe fixes on' : 'report only'}.`)

const verifyOne = (f, inspectorKey, i) => {
  const n = f.severity === 'high' ? 2 : 1
  return parallel(Array.from({ length: n }, (_, k) => () =>
    agent(`${CONTEXT}

A website inspector ("${inspectorKey}") reported this problem. Your job is to REFUTE it if you can. Re-check it yourself from scratch (open the file, run the command, fetch the URL). It is refuted if the evidence is wrong, the page is fine, it is a known false positive, it is a bot-block not a broken link, or the "problem" does not actually conflict with CLAUDE.md. If it is real, say so plainly.

Finding: ${JSON.stringify(f, null, 2)}`,
      { label: `verify:${inspectorKey}:${i}:${k}`, phase: 'Verify', schema: VERDICT, effort: 'medium' })
  )).then(votes => {
    const v = votes.filter(Boolean)
    // Dropped only when a majority of verifiers refute it (a 1-1 split on a high finding is kept).
    const kept = v.length === 0 || v.filter(x => !x.refuted).length >= Math.ceil(v.length / 2)
    return { ...f, inspector: inspectorKey, verified: v.length > 0, kept, verdicts: v.map(x => x.reason) }
  })
}

const results = await pipeline(
  INSPECTORS,
  insp => agent(`${CONTEXT}\n\n${insp.prompt}`, { label: `inspect:${insp.key}`, phase: 'Inspect', schema: FINDINGS }),
  (res, insp) => {
    if (!res) return { key: insp.key, checked: 'inspector failed', findings: [] }
    const toVerify = res.findings.filter(f => f.severity !== 'low')
    const low = res.findings.filter(f => f.severity === 'low').map(f => ({ ...f, inspector: insp.key, verified: false, kept: true, verdicts: [] }))
    if (low.length) log(`${insp.key}: ${low.length} low-severity item(s) kept without verification`)
    return parallel(toVerify.map((f, i) => () => verifyOne(f, insp.key, i)))
      .then(v => ({ key: insp.key, checked: res.checked, findings: [...v.filter(Boolean), ...low] }))
  },
)

const all = results.filter(Boolean).flatMap(r => r.findings)
const confirmed = all.filter(f => f.kept)
const refuted = all.filter(f => !f.kept)
log(`${all.length} finding(s): ${confirmed.length} kept, ${refuted.length} refuted by verifiers.`)

// ---------------------------------------------------------------------------
phase('Fix')
const safe = confirmed.filter(f => f.fix_type === 'safe-mechanical')
let fixReport = { applied: [], skipped: [], qa_passed: null, files_changed: [] }
if (DO_FIX && safe.length) {
  fixReport = await agent(`${CONTEXT.replace('You are READ-ONLY in this phase: do not edit, commit or push anything.', 'You MAY edit files in the working tree in this phase, but do NOT commit, push or merge.')}

Apply these verified, safe, mechanical fixes. Safe means: no change to visible wording, claims, prices or legal text. If a fix would change visible wording, skip it and say why. After editing: run node tools/sync-chrome.mjs (if header/footer partials changed) then node tools/sync-chrome.mjs --check and node tools/qa.mjs. If QA fails because of your edit, revert that edit.

Fixes:
${JSON.stringify(safe.map(({ title, page, evidence, fix }) => ({ title, page, evidence, fix })), null, 2)}`,
    {
      label: 'fixer', phase: 'Fix',
      schema: {
        type: 'object',
        properties: {
          applied: { type: 'array', items: { type: 'string' } },
          skipped: { type: 'array', items: { type: 'string' } },
          qa_passed: { type: 'boolean' },
          files_changed: { type: 'array', items: { type: 'string' } },
        },
        required: ['applied', 'skipped', 'qa_passed', 'files_changed'],
      },
    }) || fixReport
} else {
  log(DO_FIX ? 'No safe fixes to apply.' : 'Report-only mode: fixes not applied.')
}

// ---------------------------------------------------------------------------
phase('Report')
const report = await agent(`You write the website manager's report for Sereinora's founder. The founder is not technical: use plain words, no code terms, no file paths unless needed to locate a page. Style: short headings, bullets, honest ratings out of 10, no flattery. Lead with status.

Structure exactly:
# Website manager report, ${TODAY}
**Status:** one line, with an honest overall rating out of 10.
## Fixed automatically
## Needs your approval (new wording)  — for each: page, what is wrong, the exact replacement text proposed (draft it; respect CLAUDE.md: no legal advice, cite sources, no promises).
## Needs your decision
## Next pages worth writing  — the growth ideas, each with its source links.
## What was checked  — one line per inspector, from "checked".
## Dismissed after double-checking  — one line each, so nothing is hidden.

Data:
CONFIRMED: ${JSON.stringify(confirmed, null, 1)}
FIX RESULT: ${JSON.stringify(fixReport)}
REFUTED: ${JSON.stringify(refuted.map(f => ({ title: f.title, page: f.page, why: f.verdicts })), null, 1)}
CHECKED: ${JSON.stringify(results.filter(Boolean).map(r => ({ inspector: r.key, checked: r.checked })), null, 1)}`,
  { label: 'report', phase: 'Report' })

return { report, confirmed, refuted, fixReport }
