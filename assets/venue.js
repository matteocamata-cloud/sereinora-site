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

    /* Hover reads a bar without clicking (mouse and pen only; touch keeps tap) */
    segs.forEach(s => s.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') show(s); }));

    /* Time scrubber: a hairline that follows the pointer and reads the hour */
    const grid = map.querySelector('.dm-grid');
    const tracks = [...map.querySelectorAll('.dm-track')];
    if (grid && tracks.length && window.matchMedia('(hover:hover)').matches) {
      const line = doc.createElement('div');
      line.className = 'dm-scrub';
      line.setAttribute('aria-hidden', 'true');
      line.appendChild(doc.createElement('span'));
      map.appendChild(line);
      const label = line.firstChild;
      const fmt = f => {
        const mins = Math.round((10 * 60 + f * 16 * 60) / 15) * 15;
        let h = Math.floor(mins / 60) % 24; const m = mins % 60;
        const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
        return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
      };
      map.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        const mr = map.getBoundingClientRect();
        const a = tracks[0].getBoundingClientRect();
        const z = tracks[tracks.length - 1].getBoundingClientRect();
        const inside = e.clientX >= a.left && e.clientX <= a.right && e.clientY >= a.top - 24 && e.clientY <= z.bottom + 8;
        line.classList.toggle('on', inside);
        if (!inside) return;
        const f = (e.clientX - a.left) / a.width;
        line.style.left = (e.clientX - mr.left) + 'px';
        line.style.top = (a.top - mr.top - 22) + 'px';
        line.style.height = (z.bottom - a.top + 22) + 'px';
        label.textContent = fmt(f);
      });
      map.addEventListener('pointerleave', () => line.classList.remove('on'));
    }
  }

  /* Hero light: a soft glow follows the pointer across the night hero */
  const heroV3 = doc.querySelector('.hero.v3');
  if (heroV3 && window.matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches) {
    let raf = 0;
    heroV3.addEventListener('pointermove', e => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = heroV3.getBoundingClientRect();
        heroV3.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(2) + '%');
        heroV3.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(2) + '%');
        heroV3.classList.add('lit');
      });
    });
    heroV3.addEventListener('pointerleave', () => heroV3.classList.remove('lit'));
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

  /* Language picker: translates the page in place with Google's website translator, on sereinora.com.
     Nothing loads from Google until the visitor picks a language (or opens a ?lang= link). The choice is
     kept in Google's "googtrans" cookie so the next page opens in the same language; English clears it.
     If Google's script cannot load, the menu explains how to use the browser's own translator. */
  const langBtn = doc.querySelector('.lang-btn');
  if (langBtn) {
    // English first, then alphabetical by English name. Codes are Google Translate's.
    const LANGS = [
      ['en', 'English', 'English'], ['ar', 'العربية', 'Arabic'], ['bn', 'বাংলা', 'Bengali'],
      ['zh-CN', '中文（简体）', 'Chinese, Simplified'], ['zh-TW', '中文（繁體）', 'Chinese, Traditional'],
      ['nl', 'Nederlands', 'Dutch'], ['fr', 'Français', 'French'], ['de', 'Deutsch', 'German'], ['el', 'Ελληνικά', 'Greek'],
      ['ht', 'Kreyòl ayisyen', 'Haitian Creole'], ['iw', 'עברית', 'Hebrew'], ['hi', 'हिन्दी', 'Hindi'],
      ['id', 'Bahasa Indonesia', 'Indonesian'], ['it', 'Italiano', 'Italian'], ['ja', '日本語', 'Japanese'], ['ko', '한국어', 'Korean'],
      ['ms', 'Bahasa Melayu', 'Malay'], ['fa', 'فارسی', 'Persian'], ['pl', 'Polski', 'Polish'], ['pt', 'Português', 'Portuguese'],
      ['ru', 'Русский', 'Russian'], ['es', 'Español', 'Spanish'], ['sw', 'Kiswahili', 'Swahili'], ['sv', 'Svenska', 'Swedish'],
      ['tl', 'Tagalog', 'Tagalog (Filipino)'], ['th', 'ไทย', 'Thai'], ['tr', 'Türkçe', 'Turkish'], ['uk', 'Українська', 'Ukrainian'],
      ['ur', 'اردو', 'Urdu'], ['vi', 'Tiếng Việt', 'Vietnamese'],
    ];
    const known = (c) => LANGS.some((l) => l[0] === c);
    const host = location.hostname;
    const cookieDomain = host.includes('.') ? ';domain=.' + host.replace(/^www\./, '') : '';
    const readCookie = () => { const m = doc.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/); return m ? decodeURIComponent(m[1]) : 'en'; };
    const writeCookie = (code) => {
      const gone = ';path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
      doc.cookie = 'googtrans=' + gone; if (cookieDomain) doc.cookie = 'googtrans=' + gone + cookieDomain;
      if (code !== 'en') { const v = 'googtrans=/en/' + code + ';path=/;SameSite=Lax'; doc.cookie = v; if (cookieDomain) doc.cookie = v + cookieDomain; }
    };
    const params = new URLSearchParams(location.search);
    const asked = params.get('lang');
    if (asked && known(asked)) writeCookie(asked);
    let current = known(readCookie()) ? readCookie() : 'en';
    doc.querySelectorAll('.brand, .foot-brand').forEach((el) => el.setAttribute('translate', 'no'));

    const menu = doc.createElement('div');
    menu.className = 'lang-menu';
    menu.id = 'lang-panel';
    menu.hidden = true;
    menu.setAttribute('translate', 'no');
    const note = doc.createElement('p');
    note.className = 'lang-note';
    note.setAttribute('role', 'status');
    note.textContent = 'Pages are translated automatically by Google. The English version is the reference.';
    const list = doc.createElement('ul');
    for (const [code, own, en] of LANGS) {
      const a = doc.createElement('a');
      a.href = location.pathname + '?lang=' + code + location.hash;
      a.lang = code === 'iw' ? 'he' : code;
      a.dataset.lang = code;
      a.append(own);
      if (own !== en) { const sm = doc.createElement('small'); sm.textContent = en; a.append(sm); }
      const li = doc.createElement('li');
      li.append(a);
      list.append(li);
    }
    menu.append(list, note);
    langBtn.after(menu);
    langBtn.setAttribute('aria-expanded', 'false');

    const label = () => {
      const cur = LANGS.find((l) => l[0] === current) || LANGS[0];
      langBtn.querySelector('span').textContent = current === 'en' ? 'EN' : current.split('-')[0].replace('iw', 'he').toUpperCase();
      langBtn.setAttribute('aria-label', 'Language: ' + cur[2] + '. Read this site in another language');
      list.querySelectorAll('a').forEach((a) => (a.dataset.lang === current ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    };
    const setOpen = (open) => {
      menu.hidden = !open;
      langBtn.setAttribute('aria-expanded', String(open));
      if (open) menu.querySelector('[aria-current], a').focus();
    };
    const fail = () => {
      note.textContent = 'Translation could not load right now. Your browser can translate this page: in Chrome or Edge, right-click and choose Translate; in Safari, use the aA button in the address bar.';
      note.classList.add('is-error');
      setOpen(true);
    };
    let loading = null;
    const apply = (code) => {
      const sel = doc.querySelector('select.goog-te-combo');
      if (!sel) return false;
      sel.value = code;
      sel.dispatchEvent(new Event('change'));
      return true;
    };
    const translateTo = (code) => {
      if (apply(code)) return;
      if (loading) return;
      const holder = doc.createElement('div');
      holder.id = 'gt-host';
      holder.hidden = true;
      doc.body.append(holder);
      window.__srGt = () => {
        new window.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'gt-host');
        let tries = 0;
        const t = setInterval(() => { if (apply(current) || ++tries > 50) clearInterval(t); }, 200);
      };
      loading = doc.createElement('script');
      loading.src = 'https://translate.google.com/translate_a/element.js?cb=__srGt';
      loading.onerror = fail;
      doc.head.append(loading);
      setTimeout(() => { if (!(window.google && window.google.translate)) fail(); }, 10000);
    };

    label();
    if (current !== 'en') translateTo(current);
    list.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-lang]');
      if (!a) return;
      e.preventDefault();
      const code = a.dataset.lang;
      writeCookie(code);
      if (code === 'en') { location.href = location.pathname + location.hash; return; }
      current = code;
      label();
      setOpen(false);
      translateTo(code);
    });
    langBtn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(menu.hidden); });
    doc.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target !== langBtn) setOpen(false); });
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
