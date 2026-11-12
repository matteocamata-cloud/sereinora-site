/* Sereinora assistant: a quiet "Ask a question" button that opens a chat panel.
   Loaded by venue.js only when an endpoint is configured. No dependencies, no cookies.
   The conversation is kept in this browser tab only (sessionStorage) and cleared when the tab closes. */
(() => {
  'use strict';
  // Set after deploying the Worker (see assistant/README.md). Empty = built-in answers only.
  const AI_ENDPOINT = '';
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const ENDPOINT = (local && new URLSearchParams(location.search).get('assistant')) || AI_ENDPOINT;
  const AI = Boolean(ENDPOINT);
  if (document.querySelector('.sa-launch')) return;
  const doc = document;
  const KEY = 'sereinora-assistant-v1';
  const MAX = 1500;
  const STARTERS = [
    'What does the Venue Music Audit include?',
    'I got a letter from BMI. What should I do?',
    'Can I play Spotify in my bar?',
    'Does my music service cover live music or a DJ?',
  ];

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

  // Turn plain text into text nodes plus safe links (https URLs and the contact address only).
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


  // Built-in answers from the site's own wording, used whenever the AI service cannot reply,
  // so a visitor always gets an answer and a next step.
  const LOCAL = [
    [/lawsuit|sued|court|attorney|lawyer|deadline|settle/i, 'If a letter or message mentions a lawsuit, a lawyer, a court or a deadline, please speak to a US attorney first, without waiting. If useful, the PRO Letter Pack ($295, 48 hours) gives your attorney a factual inventory: https://sereinora.com/audit/'],
    [/letter|invoice|notice|bmi|ascap|sesac|gmr|global music/i, 'This page explains what a letter from BMI, ASCAP, SESAC or GMR means and what to do in the next seven days: https://sereinora.com/answers/pro-letter/ The PRO Letter Pack ($295, delivered in 48 hours) sets out what they are asking, what you actually play, and the questions to put back to them.'],
    [/spotify|apple music|youtube|pandora|stream|playlist/i, 'Personal Spotify, Apple Music and YouTube accounts are limited by their own terms to personal, non-commercial use. The legal options, with sources: https://sereinora.com/answers/spotify-for-business/'],
    [/exempt|exemption|small business|square f|sq ?ft|\btvs?\b|television|radio|speaker|screen/i, 'US law has a narrow exemption for certain radio and TV broadcasts, with size and equipment limits. The rules, with the statute: https://sereinora.com/answers/small-business-exemption/'],
    [/live|band|\bdjs?\b|karaoke|musician|perform/i, 'For live music, DJs and karaoke, all four PROs say the license sits with the venue, and music services usually cover background music only. Details and sources: https://sereinora.com/answers/live-music-dj-karaoke/'],
    [/license cost|fee|rate|cost of (a )?licen|how much.*licen|licen.*how much|pay (ascap|bmi)/i, 'Each PRO charges separately; ASCAP and BMI base fees mainly on occupancy and how music is used. ASCAP’s published 2026 rates and the other factors: https://sereinora.com/answers/music-license-cost/'],
    [/which pro|all four|need (ascap|bmi|sesac|gmr)|both|split/i, 'Each PRO licenses only its own members’ songs, and many songs are split between several of them: https://sereinora.com/answers/ascap-bmi-sesac-gmr/'],
    [/refund|late|guarantee/i, 'If we miss the delivery date we confirmed in writing, you get a full refund. The delivery clock starts when we have your payment and the documents we asked for.'],
    [/pay|payment|card|invoice|order|buy|book|start|request/i, 'Email contact@sereinora.com (or use the buttons on https://sereinora.com/audit/). We reply with a written confirmation of scope and price, and instructions for paying. Work starts once payment is confirmed.'],
    [/price|cost|how much|\$|fee/i, 'Venue Music Audit: $495 per venue, delivered in 5 business days. Group Audit: $1,950 for up to 10 venues, 10 business days. PRO Letter Pack: $295 for one PRO letter, 48 hours. Details: https://sereinora.com/audit/'],
    [/include|report|sample|what do (i|you) get|deliver/i, 'The report has six sections: a music use map, a license table, the exposure range, savings to verify, ten actions in order, and volume and daypart rules. Read a full fictional sample: https://sereinora.com/sample/'],
    [/who|about|founder|law firm|legit|trust|company/i, 'Sereinora is an independent service, not a law firm, independent of ASCAP, BMI, SESAC, GMR and every music service. More: https://sereinora.com/about/'],
    [/check|free|quiz|test/i, 'The free Music Exposure Check takes about two minutes and runs entirely in your browser: https://sereinora.com/check/'],
  ];
  function localAnswer(q) {
    const hit = LOCAL.find(([re]) => re.test(q));
    return (hit ? hit[1] : 'Here is the best place to start: the free two-minute check at https://sereinora.com/check/, the cited answers at https://sereinora.com/answers/, or the audits and prices at https://sereinora.com/audit/.') +
      '\n\nFor anything specific to your venue, email contact@sereinora.com and we will reply in writing. General information, not legal advice.';
  }

  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { history = []; }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-24))); } catch { /* private mode */ } };

  // ---- Markup
  const launch = el('button', { class: 'sa-launch', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'sa-panel' },
    el('span', { class: 'sa-launch-mark', 'aria-hidden': 'true', text: '?' }), el('span', { text: 'Ask a question' }));
  const log = el('div', { class: 'sa-log', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions text' });
  const starters = el('div', { class: 'sa-starters', role: 'group', 'aria-label': 'Suggested questions' },
    ...STARTERS.map((q) => el('button', { type: 'button', text: q, onclick: () => ask(q) })));
  const input = el('textarea', { id: 'sa-input', rows: '2', maxlength: String(MAX), placeholder: AI ? 'Ask any question, in any language' : 'Ask a question', 'aria-label': 'Your question' });
  const sendBtn = el('button', { class: 'sa-send', type: 'submit', text: 'Send' });
  const form = el('form', { class: 'sa-form' }, input, sendBtn);
  const closeBtn = el('button', { class: 'sa-close', type: 'button', 'aria-label': 'Close the assistant', text: '×' });
  const panel = el('section', { class: 'sa-panel', id: 'sa-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'sa-title', hidden: '' },
    el('header', { class: 'sa-head' },
      el('div', {}, el('p', { class: 'sa-kicker', text: AI ? 'AI assistant' : 'Quick answers' }), el('h2', { id: 'sa-title', text: 'Ask Sereinora' })),
      closeBtn),
    el('p', { class: 'sa-note' },
      AI ? 'Answers come from this site’s pages and can be wrong. General information, not legal advice. Please don’t share personal or confidential details. Messages are sent to Anthropic to write the reply; Sereinora does not keep them. '
         : 'Answers come from this site’s pages. General information, not legal advice. Nothing you type leaves your browser. ',
      el('a', { href: '/privacy/', text: 'Privacy' })),
    log, starters, form,
    el('p', { class: 'sa-foot' }, 'Prefer a person? ', el('a', { href: 'mailto:contact@sereinora.com', text: 'contact@sereinora.com' })));
  doc.body.append(launch, panel);

  function bubble(role, text) {
    const b = el('div', { class: 'sa-msg sa-' + role });
    if (role === 'assistant') b.append(linkify(text)); else b.textContent = text;
    log.append(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }
  for (const m of history) bubble(m.role, m.content);
  starters.hidden = history.length > 0;

  const open = (state) => {
    panel.hidden = !state;
    launch.setAttribute('aria-expanded', String(state));
    launch.hidden = state && window.matchMedia('(max-width: 560px)').matches;
    if (state) { input.focus(); log.scrollTop = log.scrollHeight; } else launch.focus();
  };
  launch.addEventListener('click', () => open(panel.hidden));
  closeBtn.addEventListener('click', () => open(false));
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) open(false); });

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
    if (AI) try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }) });
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
    } catch { /* handled below with a built-in answer */ }
    out.classList.remove('sa-typing');
    out.removeAttribute('aria-busy');
    if (!text) {
      // The AI service did not answer (offline, busy or rate-limited): answer from the site instead.
      text = localAnswer(q);
      out.replaceChildren(linkify(text));
      out.classList.add('sa-local');
    }
    history.push({ role: 'assistant', content: text });
    save();
    busy = false; sendBtn.disabled = false;
    input.focus();
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); const q = input.value; input.value = ''; ask(q); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });
})();
