/* Sereinora assistant: the "Ask a question" button on every page.
   - Built-in mode (no AI_ENDPOINT): answers from the site's own text, searched in the browser. Nothing leaves the browser.
   - AI mode: streams answers from the Sereinora Worker (Claude), and falls back to built-in answers if it cannot reply.
   - A small, page-aware prompt appears once per visit after the visitor has spent time on the page. It never opens the
     chat by itself and can be dismissed.
   No dependencies, no cookies. The conversation is kept in this browser tab only (sessionStorage). */
(() => {
  'use strict';
  // Set after deploying the Worker (see assistant/README.md). Empty = built-in answers only.
  const AI_ENDPOINT = '';
  const doc = document;
  const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const ENDPOINT = (isLocal && new URLSearchParams(location.search).get('assistant')) || AI_ENDPOINT;
  const AI = Boolean(ENDPOINT);
  if (doc.querySelector('.sa-launch')) return;
  const KEY = 'sereinora-assistant-v2';
  const NUDGE_KEY = 'sereinora-assistant-nudged';
  const MAX = 1500;
  const MAIL = 'contact@sereinora.com';
  const path = location.pathname;

  // ---------- Page-aware starters and prompts
  const PAGES = [
    [/^\/answers\/pro-letter/, 'Got a letter from a PRO? Ask what it means for your venue.',
      ['What should I do in the first seven days?', 'Do I have to pay what the letter asks?', 'What does the PRO Letter Pack include?']],
    [/^\/answers\/spotify/, 'Questions about streaming in your venue? Ask here.',
      ['Is a business music service enough for my bar?', 'What does a music service usually cover?', 'How much do business music services cost?']],
    [/^\/answers\/small-business-exemption/, 'Not sure if the exemption fits your venue? Ask here.',
      ['What are the size limits?', 'Does the exemption cover streaming?', 'How many TVs and speakers are allowed?']],
    [/^\/answers\/live-music/, 'Live nights, a DJ or karaoke? Ask how licensing works.',
      ['Who is responsible when a band plays?', 'Does my music service cover a DJ?', 'Does the DJ’s subscription cover my venue?']],
    [/^\/answers\/ascap-bmi-sesac-gmr/, 'Wondering which licenses apply to you? Ask here.',
      ['Why isn’t one PRO license enough?', 'How do I look up who represents a song?', 'How are SESAC and GMR different?']],
    [/^\/answers\/music-license-cost/, 'Questions about license fees? Ask here.',
      ['What sets the ASCAP fee?', 'How much does BMI charge?', 'What do venues pay in total?']],
    [/^\/audit/, 'Not sure which audit fits? Ask before you write to us.',
      ['Which audit fits a group of 3 venues?', 'What do you need from me?', 'What if the report is late?']],
    [/^\/check/, 'Questions about your result? Ask here.',
      ['What does my result mean?', 'Which audit fits my answers?', 'Is this check legal advice?']],
    [/^\/sample/, 'Questions about the sample report? Ask here.',
      ['Is this a real client?', 'What will my report contain?', 'How long does an audit take?']],
    [/^\/help/, 'Can’t find something in the guide? Ask here.',
      ['How do I pay?', 'When does the delivery clock start?', 'What if the report is late?']],
    [/^\/coverage/, 'Is your venue outside the US? Ask here.',
      ['Do you cover my country?', 'Can I use the check outside the US?', 'Which country comes next?']],
    [/^\/about/, 'Questions about Sereinora? Ask here.',
      ['Are you a law firm?', 'Who prepares the audit?', 'Are you connected to ASCAP or BMI?']],
    [/./, 'Questions about music licensing for your venue? Ask anytime.',
      ['What does the Venue Music Audit include?', 'I got a letter from BMI. What should I do?', 'Can I play Spotify in my bar?']],
  ];
  const [, NUDGE, STARTERS] = PAGES.find(([re]) => re.test(path));

  // ---------- Built-in answers
  // 1) Curated answers for the most important intents (exact site wording, checked first).
  const CURATED = [
    [/lawsuit|sued|summons|court|attorney|lawyer|deadline|settle|demanda|abogad|tribunal|plazo|avocat|procès/i, 'If a letter or message mentions a lawsuit, a lawyer, a court or a deadline, please speak to a licensed attorney first, without waiting. If useful, the PRO Letter Pack ($295, delivered in 48 hours) gives your attorney a factual inventory: https://sereinora.com/audit/'],
    [/\b(countr(y|ies)|international|abroad|outside the (us|u\.s\.|united states)|canada|uk|united kingdom|england|ireland|australia|new zealand|europe|france|germany|spain|italy|mexico|where do you work)\b/i, 'Audits currently cover venues in the United States; more countries are coming. We do not apply US rules to a venue in another country. Tell us where your venue is at ' + MAIL + ': we add countries where venues ask for us, and we will write to you when we cover yours. See https://sereinora.com/coverage/.'],
    [/\b(refund|late)\b/i, 'If we miss the delivery date we confirmed in writing, you get a full refund. The delivery clock starts when we have your payment and the documents we asked for.'],
    [/\b(pay|payment|card|order|buy|book)\b/i, 'Use the short request form at https://sereinora.com/request/ or email ' + MAIL + '. We reply with a written confirmation of scope and price, and instructions for paying. Work starts once payment is confirmed.'],
    [/\b(group|chain|several|multiple)\b|\b([2-9]|10|two|three|four|five|six|seven|eight|nine|ten)\s+(bars|restaurants|venues|locations|hotels|sites|places)\b/i, 'For 2 to 10 venues, the Group Audit costs $1,950 and is delivered in 10 business days: everything in the Venue Audit for each venue, one spend table across the group, a single music-licensing standard for every venue, and where to consolidate services and licenses. https://sereinora.com/audit/'],
    [/^(?!.*(licen|ascap|bmi|sesac|gmr|fee|rate|pro\b)).*(how much|price|pricing|cost|cu[aá]nto|precio|costo|cuesta|combien|prix|tarif|多少钱|价格|giá|magkano|presyo)/i, 'Venue Music Audit: $495 per venue, delivered in 5 business days. Group Audit: $1,950 for up to 10 venues, 10 business days. PRO Letter Pack: $295 for one PRO letter, 48 hours. Details: https://sereinora.com/audit/'],
    [/\b(law firm|legal advice|human|real person|robot|chatbot)\b|\bai\b/i, 'Sereinora is not a law firm, and this assistant gives general information from the site’s pages, not legal advice. For anything specific to your venue, email ' + MAIL + ' and a person replies in writing.'],
    [/\b(tvs?|televisions?|radio|sports? bar|game day|screens?|speakers?)\b/i, 'US law has a narrow exemption for playing certain radio and TV broadcasts. It depends on the venue’s size (under 3,750 gross sq ft for food and drink venues) and, above that, on the number of speakers and screens. The rules, with the statute: https://sereinora.com/answers/small-business-exemption/'],
    [/\b(how long|how fast|how quickly|turnaround|when will|delivery time|days)\b/i, 'The Venue Music Audit is delivered in 5 business days, the Group Audit (up to 10 venues) in 10 business days, and the PRO Letter Pack in 48 hours. The delivery clock starts when we have your payment and the documents we asked for. https://sereinora.com/audit/'],
    [/\b(need from me|what do you need|documents?|have ready|prepare|intake|information do you)\b/i, 'None of it needs to be perfect: your music service contract (or just its name and plan), any invoices, license agreements or letters from ASCAP, BMI, SESAC or GMR, a list of rooms where music plays and who controls it, your live music, DJ and karaoke nights, the approximate floor area with the number of TVs and speakers, and whether you post videos with music. https://sereinora.com/audit/'],
    [/\b(damages|penalt|fine|fined|liable|liability|what can happen|consequence|unlicensed|without a licen)/i, 'Where a song is played without the right license, US law allows statutory damages of $750 to $30,000 per work, and up to $150,000 if a court finds the infringement willful (17 U.S.C. §504(c): https://www.law.cornell.edu/uscode/text/17/504). That range describes the law, not the likely outcome for any venue.'],
    [/\b(what|who)\b.*\b(pros?|ascap|bmi|sesac|gmr|performing rights?)\b/i, 'ASCAP, BMI, SESAC and GMR are the US performing rights organizations (PROs). They license the public performance of songs on behalf of songwriters and publishers, and each licenses only the works of its own members, so one PRO’s license does not cover another’s songs. More, with sources: https://sereinora.com/answers/ascap-bmi-sesac-gmr/'],
  ];
  // 2) Search across every section of the site (assets/assistant-index.json, built from the pages).
  const STOP = new Set('a an the and or but if of to in on at for from by with about as is are was were be been am i me my we our you your it its this that these those do does did can could should would will what which who how when where why there their them they he she his her not no yes so than then just also any all some more most very have has had get got need needs want into over under up out please'.split(' '));
  const SYN = { song: 'music', songs: 'music', tune: 'music', tunes: 'music', playlist: 'music', fee: 'cost', fees: 'cost', price: 'cost', prices: 'cost', charge: 'cost', charges: 'cost', pay: 'cost', paying: 'cost', expensive: 'cost', tv: 'television', tvs: 'television', dj: 'dj', djs: 'dj', bar: 'venue', restaurant: 'venue', hotel: 'venue', pub: 'venue', club: 'venue', exempt: 'exemption', letters: 'letter', notice: 'letter', invoice: 'letter', spotify: 'spotify', streaming: 'stream' };
  const stem = (w) => w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w;
  const terms = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}$]+/gu, ' ').split(' ')
    .filter((w) => w && !STOP.has(w)).map((w) => stem(SYN[w] || w));
  let INDEX = null;
  const loadIndex = () => INDEX || (INDEX = fetch('/assets/assistant-index.json').then((r) => r.json()).then((rows) => {
    const df = new Map();
    const docs = rows.map((r) => {
      const tf = new Map();
      for (const w of terms(r.t)) tf.set(w, (tf.get(w) || 0) + 1);
      const head = new Set(terms(r.h));
      new Set([...tf.keys(), ...head]).forEach((w) => df.set(w, (df.get(w) || 0) + 1));
      return { ...r, tf, head, len: r.t.length };
    });
    return { docs, df, n: docs.length };
  }).catch(() => ({ docs: [], df: new Map(), n: 1 })));
  const clean = (t) => t.replace(/\s*\(https:\/\/sereinora\.com[^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  const snippet = (t) => {
    const prot = clean(t).replace(/\bU\.S\./g, 'U\u2024S\u2024').replace(/\b(Inc|No|St|vs|e\.g|i\.e)\./g, '$1\u2024');
    const sentences = (prot.match(/[^.!?]+[.!?]+(\s|$)/g) || [prot]).map((x) => x.replace(/\u2024/g, '.'));
    let out = '';
    for (const s of sentences) { if ((out + s).length > 420 && out) break; out += s; }
    return out.trim();
  };
  async function builtIn(q) {
    const cur = CURATED.find(([re]) => re.test(q));
    const { docs, df, n } = await loadIndex();
    const qt = [...new Set(terms(q))];
    const idf = (w) => Math.log(1 + n / (df.get(w) || n / 8));
    const totalIdf = qt.reduce((t, w) => t + idf(w), 0) || 1;
    const scored = docs.map((d) => {
      let s = 0, covered = 0;
      for (const w of qt) {
        const f = d.tf.get(w) || 0;
        if (f || d.head.has(w)) covered += idf(w);
        s += idf(w) * (f ? (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.len / 500)) : 0) + (d.head.has(w) ? idf(w) * 1.5 : 0);
      }
      if (/^\/(privacy|terms)/.test(d.u)) s *= 0.6;
      if (d.u.startsWith('/sample')) s *= 0.7; // fictional example: last resort
      if (d.u.startsWith('/answers/')) s *= 1.25;
      return [s, d, covered / totalIdf];
    }).filter(([s, , c]) => s > 1.5 && c >= 0.5).sort((a, b) => b[0] - a[0]);
    const parts = [];
    if (cur) parts.push(cur[1]);
    const best = scored[0] && scored[0][1];
    if (best && (!cur || scored[0][2] >= 0.85)) {
      parts.push(`From “${best.h}”: ${snippet(best.t)}\nRead more: https://sereinora.com${best.u}`);
      const other = scored.find(([, d]) => d.u !== best.u);
      if (other && !cur && other[0] > scored[0][0] * 0.6) parts.push(`Also useful: https://sereinora.com${other[1].u}`);
    }
    const foreign = /[^\u0000-\u024f\s\d.,;:!?¿¡'"()$%-]/.test(q) || /\b(el|la|los|las|que|qué|cómo|como|para|una|est|les|des|pour|của|là|ang|mga|ist|und|não|uma)\b/i.test(q);
    if (!parts.length && foreign) parts.push('Quick answers work best in English. To read this site in your language, use the language button at the top of the page. You can also write to contact@sereinora.com.');
    if (!parts.length) parts.push('Good question. Sereinora’s pages don’t cover that, so I can’t give you a reliable answer here. Sereinora helps restaurants, bars and hotels understand their music licenses: the free two-minute check is at https://sereinora.com/check/ and cited answers are at https://sereinora.com/answers/.');
    parts.push(`For anything specific to your venue, email ${MAIL} and we will reply in writing. General information, not legal advice.`);
    return parts.join('\n\n');
  }

  // ---------- Helpers
  const css = doc.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/assets/assistant.css';
  doc.head.appendChild(css);
  const el = (tag, attrs = {}, ...kids) => {
    const n = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const k of kids) if (k) n.append(k);
    return n;
  };
  const LINK = /(https:\/\/[^\s<>"')\]]+)|(contact@sereinora\.com)/g;
  function linkify(text) {
    const frag = doc.createDocumentFragment();
    let last = 0;
    for (const m of text.matchAll(LINK)) {
      let url = m[0];
      const trail = url.match(/[.,;:!?]+$/);
      if (trail) url = url.slice(0, -trail[0].length);
      frag.append(text.slice(last, m.index));
      const isMail = !m[1];
      const a = el('a', { href: isMail ? 'mailto:' + url : url, text: url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '') });
      if (!isMail && !/^https:\/\/(www\.)?sereinora\.com\//.test(url + '/')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      frag.append(a);
      last = m.index + url.length;
    }
    frag.append(text.slice(last));
    return frag;
  }
  const store = {
    get: (k, d) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  let history = store.get(KEY, []);
  const save = () => store.set(KEY, history.slice(-24));

  // ---------- Markup
  const launch = el('button', { class: 'sa-launch', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'sa-panel' },
    el('span', { class: 'sa-launch-mark', 'aria-hidden': 'true', text: '?' }), el('span', { class: 'sa-launch-text', text: 'Ask a question' }));
  const nudgeText = el('button', { class: 'sa-nudge-text', type: 'button', text: NUDGE });
  const nudgeClose = el('button', { class: 'sa-nudge-close', type: 'button', 'aria-label': 'Dismiss', text: '×' });
  const nudge = el('div', { class: 'sa-nudge', role: 'status', hidden: '' }, nudgeText, nudgeClose);
  const log = el('div', { class: 'sa-log', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions text' });
  const starters = el('div', { class: 'sa-starters', role: 'group', 'aria-label': 'Suggested questions' },
    ...STARTERS.map((q) => el('button', { type: 'button', text: q, onclick: () => ask(q) })));
  const emailLink = el('a', { class: 'sa-act', href: 'mailto:' + MAIL, text: 'Email this conversation' });
  const actions = el('div', { class: 'sa-actions', hidden: '' },
    el('a', { class: 'sa-act', href: '/check/', text: 'Free 2-minute check' }),
    el('a', { class: 'sa-act', href: '/request/', text: 'Request an audit' }),
    emailLink);
  const input = el('textarea', { id: 'sa-input', rows: '2', maxlength: String(MAX), placeholder: AI ? 'Ask any question, in any language' : 'Ask a question', 'aria-label': 'Your question' });
  const sendBtn = el('button', { class: 'sa-send', type: 'submit', text: 'Send' });
  const form = el('form', { class: 'sa-form' }, input, sendBtn);
  const closeBtn = el('button', { class: 'sa-close', type: 'button', 'aria-label': 'Close the assistant', text: '×' });
  const panel = el('section', { class: 'sa-panel', id: 'sa-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'sa-title', hidden: '' },
    el('header', { class: 'sa-head' },
      el('div', {}, el('p', { class: 'sa-kicker', text: AI ? 'AI assistant · Day and night' : 'Quick answers · Day and night' }), el('h2', { id: 'sa-title', text: 'Ask Sereinora' })),
      closeBtn),
    el('p', { class: 'sa-note' },
      AI ? 'Answers come from this site’s pages and can be wrong. General information, not legal advice. Please don’t share personal or confidential details. Messages are sent to Anthropic to write the reply; Sereinora does not keep them. '
         : 'Answers come from this site’s pages. General information, not legal advice. Nothing you type leaves your browser. ',
      el('a', { href: '/privacy/', text: 'Privacy' })),
    log, starters, actions, form,
    el('p', { class: 'sa-foot' }, 'Prefer a person? ', el('a', { href: 'mailto:' + MAIL, text: MAIL }), ' We reply in writing.'));
  doc.body.append(nudge, launch, panel);

  function bubble(role, text, local) {
    const b = el('div', { class: 'sa-msg sa-' + role + (local ? ' sa-local' : '') });
    if (role === 'assistant') b.append(linkify(text)); else b.textContent = text;
    log.append(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }
  function refreshEmail() {
    const lines = history.map((m) => (m.role === 'user' ? 'Me: ' : 'Assistant: ') + m.content.replace(/\s+/g, ' ').trim());
    let transcript = lines.join('\n\n');
    if (transcript.length > 1600) transcript = '…' + transcript.slice(-1600);
    const body = `Hello Sereinora,\n\nI used the assistant on your site and would like a written answer for my venue. Our conversation:\n\n${transcript}\n\nVenue name, city and state:\nMy name and role:\n`;
    emailLink.href = `mailto:${MAIL}?subject=${encodeURIComponent('Question from the Sereinora assistant')}&body=${encodeURIComponent(body)}`;
    actions.hidden = !history.some((m) => m.role === 'assistant');
  }
  for (const m of history) bubble(m.role, m.content, m.local);
  starters.hidden = history.length > 0;
  refreshEmail();

  // ---------- Open, close, nudge
  const hideNudge = () => { nudge.hidden = true; };
  const open = (state) => {
    hideNudge();
    store.set(NUDGE_KEY, true);
    panel.hidden = !state;
    launch.setAttribute('aria-expanded', String(state));
    launch.hidden = state && window.matchMedia('(max-width: 560px)').matches;
    if (state) { input.focus(); log.scrollTop = log.scrollHeight; } else launch.focus();
  };
  launch.addEventListener('click', () => open(panel.hidden));
  closeBtn.addEventListener('click', () => open(false));
  nudgeText.addEventListener('click', () => open(true));
  nudgeClose.addEventListener('click', () => { hideNudge(); store.set(NUDGE_KEY, true); });
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) open(false); });

  // One gentle, page-specific prompt per visit: after 25 seconds or most of the page read, never over an open menu.
  if (!store.get(NUDGE_KEY, false) && !history.length) {
    let shown = false;
    const show = () => {
      if (shown || !panel.hidden || doc.querySelector('.nav.open, .lang-menu:not([hidden])')) return;
      shown = true;
      store.set(NUDGE_KEY, true);
      nudge.hidden = false;
      setTimeout(hideNudge, 15000);
    };
    setTimeout(show, 25000);
    window.addEventListener('scroll', () => {
      const h = doc.documentElement;
      if (h.scrollTop + innerHeight > h.scrollHeight * 0.6 && performance.now() > 8000) show();
    }, { passive: true });
  }

  // ---------- Asking
  let busy = false;
  async function ask(q) {
    q = q.trim().slice(0, MAX);
    if (!q || busy) return;
    busy = true; sendBtn.disabled = true; starters.hidden = true;
    bubble('user', q);
    history.push({ role: 'user', content: q });
    save();
    const out = bubble('assistant', '');
    out.classList.add('sa-typing');
    out.setAttribute('aria-busy', 'true');
    let text = '';
    if (AI) {
      try {
        const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }) });
        if (!res.body) throw new Error('no body');
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 2);
            if (!line.startsWith('data:')) continue;
            let ev;
            try { ev = JSON.parse(line.slice(5)); } catch { continue; }
            if (ev.t) { text += ev.t; out.classList.remove('sa-typing'); out.replaceChildren(linkify(text)); log.scrollTop = log.scrollHeight; }
          }
        }
      } catch { /* answered below from the site */ }
    }
    let local = false;
    if (!text) {
      // Built-in mode, or the AI service did not answer: answer from the site's own text.
      text = await builtIn(q);
      local = true;
      out.classList.add('sa-local');
      out.replaceChildren(linkify(text));
    }
    out.classList.remove('sa-typing');
    out.removeAttribute('aria-busy');
    history.push({ role: 'assistant', content: text, local });
    save();
    refreshEmail();
    log.scrollTop = log.scrollHeight;
    busy = false; sendBtn.disabled = false;
    input.focus();
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); const q = input.value; input.value = ''; ask(q); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });
})();
