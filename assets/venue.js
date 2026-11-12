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
})();
