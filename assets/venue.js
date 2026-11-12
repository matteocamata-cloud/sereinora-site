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

  /* Language picker: opens the page through Google Translate in the chosen language.
     Nothing is loaded from Google unless the visitor picks a language. */
  const langBtn = doc.querySelector('.lang-btn');
  if (langBtn) {
    const CODES = 'af sq am ar hy as ay az bm eu be bn bho bs bg ca ceb ny zh-CN zh-TW co hr cs da dv doi nl eo et ee tl fi fr fy gl ka de el gn gu ht ha haw iw hi hmn hu is ig ilo id ga it ja jw kn kk km rw gom ko kri ku ckb ky lo la lv ln lt lg lb mk mai mg ms ml mt mi mr mni-Mtei lus mn my ne no or om ps fa pl pt pa qu ro ru sm sa gd nso sr st sn sd si sk sl so es su sw sv tg ta tt te th ti ts tr tk ak uk ur ug uz vi cy xh yi yo zu'.split(' ');
    const BCP = { iw: 'he', jw: 'jv', gom: 'kok', 'mni-Mtei': 'mni', 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', tl: 'fil' };
    const proxied = location.hostname.endsWith('.translate.goog');
    const params = new URLSearchParams(location.search);
    const current = proxied ? params.get('_x_tr_tl') : 'en';
    const name = (code, inLang) => {
      try { return new Intl.DisplayNames([inLang], { type: 'language' }).of(BCP[code] || code) || code; } catch { return code; }
    };
    const path = location.pathname + location.hash;
    const urlFor = (code) => code === 'en'
      ? 'https://sereinora.com' + path
      : 'https://sereinora-com.translate.goog' + location.pathname + '?_x_tr_sl=en&_x_tr_tl=' + encodeURIComponent(code) + '&_x_tr_hl=' + encodeURIComponent(code) + '&_x_tr_pto=wapp' + location.hash;
    if (proxied && current) {
      langBtn.querySelector('span').textContent = current.split('-')[0].toUpperCase();
      langBtn.setAttribute('aria-label', 'Language: ' + name(current, 'en') + '. Choose another language');
    }
    let panel = null;
    const build = () => {
      const items = [['en', 'English', 'English'], ...CODES.map((c) => [c, name(c, BCP[c] || c), name(c, 'en')])]
        .sort((a, b) => (a[0] === 'en' ? -1 : b[0] === 'en' ? 1 : a[2].localeCompare(b[2])));
      panel = doc.createElement('div');
      panel.className = 'lang-panel';
      panel.id = 'lang-panel';
      panel.hidden = true;
      panel.setAttribute('translate', 'no');
      panel.innerHTML = '<section class="lang-box" role="dialog" aria-modal="true" aria-labelledby="lang-title">' +
        '<div class="lang-head"><h2 id="lang-title">Read this site in your language</h2><button class="lang-close" type="button" aria-label="Close">×</button></div>' +
        '<p class="lang-note">Machine translation by Google Translate in over 130 languages. Choosing a language opens this page through Google, whose privacy policy applies. The English original is the reference version: legal terms, figures and prices can be mistranslated, so check them in English before relying on them.</p>' +
        '<input class="lang-search" type="search" placeholder="Search languages" aria-label="Search languages">' +
        '<ul class="lang-list"></ul></section>';
      const list = panel.querySelector('.lang-list');
      for (const [code, own, en] of items) {
        const li = doc.createElement('li');
        const a = doc.createElement('a');
        a.href = urlFor(code);
        a.lang = BCP[code] || code;
        a.dataset.search = (own + ' ' + en + ' ' + code).toLowerCase();
        a.append(own);
        if (own !== en) { const s = doc.createElement('small'); s.textContent = en; a.append(s); }
        if (code === current) a.setAttribute('aria-current', 'true');
        li.append(a);
        list.append(li);
      }
      const search = panel.querySelector('.lang-search');
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        list.querySelectorAll('a').forEach((a) => { a.parentElement.hidden = q && !a.dataset.search.includes(q); });
      });
      const close = () => { panel.hidden = true; langBtn.focus(); };
      panel.querySelector('.lang-close').addEventListener('click', close);
      panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
      panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      doc.body.append(panel);
    };
    langBtn.addEventListener('click', () => {
      if (!panel) build();
      panel.hidden = false;
      panel.querySelector('.lang-search').focus();
    });
  }

  /* Sereinora assistant: the "Ask a question" button on every page (config in assets/assistant.js). */
  const sa = doc.createElement('script');
  sa.src = '/assets/assistant.js';
  sa.defer = true;
  doc.head.appendChild(sa);
})();
