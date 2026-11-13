/* Sereinora venue site — progressive enhancement only. Every page works without this file. */
(() => {
  'use strict';
  const doc = document;

  /* Mobile menu */
  const btn = doc.querySelector('.menu-btn');
  const nav = doc.getElementById('site-nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    doc.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  /* Day map: choose a segment, read what it means */
  const map = doc.querySelector('[data-daymap]');
  if (map) {
    const note = map.querySelector('#dm-note');
    const segs = [...map.querySelectorAll('.seg')];
    segs.forEach((s, i) => s.style.setProperty('--i', i));
    const show = seg => {
      segs.forEach(s => s.setAttribute('aria-pressed', String(s === seg)));
      note.className = 'dm-note';
      note.style.borderLeftColor = getComputedStyle(seg).backgroundColor;
      note.querySelector('strong').textContent = seg.dataset.title;
      note.querySelector('span').textContent = seg.dataset.text;
    };
    segs.forEach(s => s.addEventListener('click', () => show(s)));
    const first = map.querySelector('.seg[data-default]') || segs[0];
    if (first) show(first);
  }

  /* Copy buttons (for people without a mail app configured) */
  doc.querySelectorAll('[data-copy]').forEach(b => {
    const label = b.textContent;
    b.addEventListener('click', async () => {
      const text = b.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const ta = doc.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        doc.body.appendChild(ta); ta.select();
        try { doc.execCommand('copy'); } catch (__) { /* nothing more to try */ }
        ta.remove();
      }
      b.dataset.done = '1'; b.textContent = 'Copied';
      setTimeout(() => { b.textContent = label; delete b.dataset.done; }, 2200);
    });
  });

  /* Mobile sticky CTA: appears after the hero, hides near the footer */
  const sticky = doc.querySelector('.sticky-cta');
  const hero = doc.querySelector('[data-hero]');
  const foot = doc.querySelector('.site-footer');
  if (sticky && hero && 'IntersectionObserver' in window) {
    doc.body.classList.add('has-sticky');
    let heroOut = false, footIn = false;
    const apply = () => sticky.classList.toggle('show', heroOut && !footIn);
    new IntersectionObserver(([e]) => { heroOut = !e.isIntersecting; apply(); }).observe(hero);
    if (foot) new IntersectionObserver(([e]) => { footIn = e.isIntersecting; apply(); }).observe(foot);
  }

  /* Language picker: the languages most spoken at home in the US, opened through Google Translate.
     Nothing is loaded from Google unless the visitor picks a language. */
  const langBtn = doc.querySelector('.lang-btn');
  if (langBtn) {
    // Order follows U.S. Census Bureau, "Language Use in the United States: 2019" (ACS-50), Table 1.
    const LANGS = [
      ['en', 'English', 'English'], ['es', 'Español', 'Spanish'], ['zh-CN', '中文（简体）', 'Chinese, Simplified'],
      ['zh-TW', '中文（繁體）', 'Chinese, Traditional'], ['fr', 'Français', 'French'], ['tl', 'Tagalog', 'Tagalog (Filipino)'],
      ['vi', 'Tiếng Việt', 'Vietnamese'], ['ar', 'العربية', 'Arabic'], ['ko', '한국어', 'Korean'], ['ru', 'Русский', 'Russian'],
      ['de', 'Deutsch', 'German'], ['hi', 'हिन्दी', 'Hindi'], ['pt', 'Português', 'Portuguese'], ['ht', 'Kreyòl ayisyen', 'Haitian Creole'],
      ['it', 'Italiano', 'Italian'], ['ur', 'اردو', 'Urdu'], ['pl', 'Polski', 'Polish'], ['fa', 'فارسی', 'Persian'],
    ];
    const proxied = location.hostname.endsWith('.translate.goog');
    const current = proxied ? new URLSearchParams(location.search).get('_x_tr_tl') || 'en' : 'en';
    const urlFor = (code) => code === 'en'
      ? 'https://sereinora.com' + location.pathname + location.hash
      : 'https://sereinora-com.translate.goog' + location.pathname + '?_x_tr_sl=en&_x_tr_tl=' + code + '&_x_tr_hl=' + code + '&_x_tr_pto=wapp' + location.hash;
    const cur = LANGS.find((l) => l[0] === current);
    if (cur && current !== 'en') {
      langBtn.querySelector('span').textContent = current.split('-')[0].toUpperCase();
      langBtn.setAttribute('aria-label', 'Language: ' + cur[2] + '. Choose another language');
    }
    const menu = doc.createElement('div');
    menu.className = 'lang-menu';
    menu.id = 'lang-panel';
    menu.hidden = true;
    menu.setAttribute('translate', 'no');
    const list = doc.createElement('ul');
    for (const [code, own, en] of LANGS) {
      const a = doc.createElement('a');
      a.href = urlFor(code);
      a.lang = code;
      a.append(own);
      if (own !== en) { const s = doc.createElement('small'); s.textContent = en; a.append(s); }
      if (code === current) a.setAttribute('aria-current', 'true');
      const li = doc.createElement('li');
      li.append(a);
      list.append(li);
    }
    menu.append(list);
    langBtn.after(menu);
    langBtn.setAttribute('aria-expanded', 'false');
    const setOpen = (open) => {
      menu.hidden = !open;
      langBtn.setAttribute('aria-expanded', String(open));
      if (open) menu.querySelector('[aria-current], a').focus();
    };
    langBtn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(menu.hidden); });
    doc.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) setOpen(false); });
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); langBtn.focus(); } });
  }

  /* Print / save as PDF buttons */
  doc.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));

  /* Sereinora assistant: the "Ask a question" button on every page (config in assets/assistant.js). */
  const sa = doc.createElement('script');
  sa.src = '/assets/assistant.js';
  sa.defer = true;
  doc.head.appendChild(sa);
})();
