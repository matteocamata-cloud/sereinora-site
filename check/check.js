'use strict';
/* Music Exposure Check. Runs entirely in the browser; nothing is stored or sent.
   Every finding carries the source it relies on. Rules of thumb, not legal advice. */
(() => {
  const form = document.getElementById('exposure-form');
  const out = document.getElementById('result');
  if (!form || !out) return;
  const TO = 'contact@sereinora.com';
  form.hidden = false;

  const SRC = {
    s110: ['17 U.S.C. §110(5)', 'https://www.law.cornell.edu/uscode/text/17/110'],
    s504: ['17 U.S.C. §504(c)', 'https://www.law.cornell.edu/uscode/text/17/504'],
    bhfs: ['Brownstein, Nov. 2026', 'https://www.bhfs.com/insight/music-licensing-under-the-microscope/'],
    cco: ['U.S. Copyright Office, Music Marketplace (2015)', 'https://www.copyright.gov/policy/musiclicensingstudy/copyright-and-the-music-marketplace.pdf'],
    sesac: ['SESAC, what is a PRO?', 'https://www.sesac.com/what-is-a-performing-rights-organization-pro/'],
    ccfaq: ['Pandora CloudCover licensing FAQ', 'https://help.cloudcovermusic.com/en/articles/6961602-faq-licensing'],
    spotify: ['Spotify terms, section 3', 'https://www.spotify.com/us/legal/end-user-agreement/'],
    apple: ['Apple Media Services terms, section F', 'https://www.apple.com/legal/internet-services/itunes/us/terms.html'],
    youtube: ['YouTube terms', 'https://www.youtube.com/t/terms'],
  };

  const one = name => (form.querySelector(`input[name="${name}"]:checked`) || {}).value;
  const many = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function assess(a) {
    const f = [];
    let points = 0;
    const add = (title, text, src = []) => f.push({ title, text, src });
    const majorPros = a.pro.filter(p => p !== 'unknown');
    const live = a.live !== 'none' || a.dj === 'yes';
    const foodSmall = a.type === 'food' && a.size !== 'large';
    const otherSmall = a.type !== 'food' && a.size === 'small';

    if (a.letter === 'legal') {
      points += 5;
      add('Talk to a US attorney first.', 'A letter that mentions a lawsuit, a lawyer or a deadline needs legal advice. An audit can give your attorney the facts, but it does not replace one.');
    } else if (a.letter === 'yes') {
      points += 2;
      add('A PRO has already contacted you.', 'In October 2026, ASCAP-affiliated publishers and songwriters filed infringement suits against hospitality businesses in several states, and several complaints reportedly allege repeated licensing contact before suit. Respond on time and with facts: what you play, where, and under which license.', ['bhfs']);
    }
    if (a.src.includes('personal')) {
      points += 3;
      add('Personal streaming accounts are not business licenses.', 'Spotify grants “personal, non-commercial use”, Apple allows “personal, noncommercial purposes” only, and YouTube bars publicly streaming music from its service. Playing a personal plan to customers goes beyond those terms.', ['spotify', 'apple', 'youtube']);
    }
    if (a.src.includes('owned')) {
      points += 2;
      add('Owning a recording is not a performance license.', 'Bars and restaurants that play music for customers generally take performance licenses from the PROs that represent the songs, whatever the source of the recording.', ['cco']);
    }
    if (live && majorPros.length === 0) {
      points += 3;
      add('Live music, DJs or karaoke with no direct PRO licenses.', 'Business music services generally cover the recorded music they supply, not live performances, cover artists, DJs or karaoke.', ['ccfaq']);
    } else if (live && majorPros.length > 0 && majorPros.length < 4) {
      points += 2;
      add(`Partial coverage: you pay ${majorPros.join(', ')}.`, 'Each PRO licenses its own members’ works, so one PRO’s license does not cover songs represented by another. Live sets, DJs and karaoke can draw on all catalogs.', ['sesac', 'cco']);
    }
    if (a.src.includes('service') && majorPros.length > 0 && !live) {
      points += 1;
      add('You may be paying twice for background music.', 'Some music services state that their license covers the recorded music they supply for public areas. If that is all you play, a direct PRO license may overlap. Ask each provider in writing before you cancel anything.', ['ccfaq']);
    }
    if (a.src.includes('radio') && (foodSmall || otherSmall) && !live && !a.src.includes('personal') && !a.src.includes('owned')) {
      add('You may qualify for the small-business exemption.', '17 U.S.C. §110(5)(B) can exempt certain licensed radio and TV broadcasts in food and drink venues under 3,750 sq ft and other businesses under 2,000 sq ft, with no direct charge to hear them. It does not cover streaming, recordings or live music.', ['s110']);
    } else if (a.src.includes('radio') && a.size === 'large') {
      points += 1;
      add('Broadcasts in a larger venue depend on your equipment.', 'At or above the size limits, the exemption applies only with no more than 6 speakers in total (4 per room) and, for video, no more than 4 screens (1 per room, none over 55 inches).', ['s110']);
    }
    if (a.pro.includes('unknown')) {
      points += 1;
      add('You do not know which licenses you hold.', 'This is the most common starting point. An inventory of what you pay and what you play usually settles it.');
    }
    if (a.social === 'yes') {
      points += 1;
      add('Music in videos you post is a separate question.', 'Music added to a video you post online is a different use from music played in your room. Check the platform’s music terms, or use music cleared for that use.');
    }
    if (a.type === 'fitness') {
      add('Fitness classes have their own licensing questions.', 'Fitness classes are a separate music use. This check does not cover them. Ask your music provider and each PRO what their license covers for classes.');
    }
    if (a.spend === 'gt5k' || a.units !== '1') points += 1;
    if (!f.length) add('No obvious gap from these answers.', 'Keep your license and service contracts together and re-check when you add live music, DJs or new rooms.');

    const level = points >= 5 ? 'high' : points >= 2 ? 'medium' : 'low';
    return { level, findings: f };
  }

  const answers = () => ({
    type: one('type'), size: one('size'), src: many('src'), live: one('live'), dj: one('dj'),
    pro: many('pro'), letter: one('letter'), social: one('social'), units: one('units'), spend: one('spend'),
  });

  const LABEL = {
    type: { food: 'Restaurant, bar or café', hotel: 'Hotel', retail: 'Store', fitness: 'Gym or studio', other: 'Other' },
    size: { small: 'Under 2,000 sq ft', mid: '2,000 to 3,749 sq ft', large: '3,750+ sq ft' },
    level: { high: 'Several risk signals', medium: 'Some risk signals', low: 'Few risk signals' },
  };

  // Plain-English answer text, read from the visible option labels (first line only, no hints).
  const said = name => {
    const picked = [...form.querySelectorAll(`input[name="${name}"]:checked`)]
      .map(i => {
        const span = i.closest('label')?.querySelector('span');
        return span ? [...span.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : i.value;
      });
    return picked.join('; ') || 'not answered';
  };

  function summary(a, r) {
    return [
      'Hello Sereinora,', '', a.letter === 'no' ? 'Here is my Music Exposure Check. Please tell me which audit fits and when you could deliver it.' : 'Here is my Music Exposure Check. I received a letter from a performing rights organization and would like the PRO Letter Pack. Please tell me when you could deliver it.', '',
      `Result: ${LABEL.level[r.level]}`,
      `Venue type: ${said('type')}`, `Size: ${said('size')}`,
      `Background music: ${said('src')}`, `Live music: ${said('live')}`, `DJs or karaoke: ${said('dj')}`,
      `Licenses paid directly: ${a.pro.length ? said('pro') : 'none'}`, `PRO contact in last 12 months: ${said('letter')}`,
      `Social videos with music: ${said('social')}`, `Venues operated: ${said('units')}`, `Yearly music spend per venue: ${said('spend')}`,
      '', ...(a.letter === 'no' ? [] : ['Which PRO sent it:', 'Date of the letter:', 'Please attach a photo or PDF of the letter.', '']), 'Business name:', 'Venue address (city, state):', 'My name and role:',
    ].join('\n');
  }

  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (__) { /* nothing more to try */ }
      ta.remove();
    }
    const label = btn.textContent;
    btn.textContent = 'Copied. Paste it into an email';
    setTimeout(() => { btn.textContent = label; }, 2600);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const a = answers();
    const r = assess(a);
    const group = a.units !== '1';
    const offer = a.letter === 'legal'
      ? '<p>Because a legal deadline is involved, start with a US attorney. If useful, our <a href="/audit/#letter">PRO Letter Pack</a> ($295, 48 hours) gives your attorney a factual inventory.</p>'
      : a.letter === 'yes'
        ? '<p><strong>Next step:</strong> the <a href="/audit/#letter">PRO Letter Pack</a> ($295, 48 hours): what they are asking, what you actually play, and the questions to put back to them.' + ((a.live !== 'none' || a.dj === 'yes') ? ' The Letter Pack covers the letter. To compare your live music and DJ nights with the licenses you hold, see the <a href="/audit/#venue">Venue Music Audit</a> ($495).' : '') + ' Read first: <a href="/answers/pro-letter/">what to do when a PRO letter arrives</a>.</p>'
        : group
          ? '<p><strong>Next step:</strong> a <a href="/audit/#group">Group Audit</a> ($1,950 for up to 10 venues): one table of what every venue plays, pays and is missing.</p>'
          : '<p><strong>Next step:</strong> a <a href="/audit/#venue">Venue Music Audit</a> ($495, 5 business days): every music use, every license, the overlaps and the gaps, in writing. <a href="/sample/">See a sample report</a>.</p>';
    const text = summary(a, r);
    const mail = `mailto:${TO}?subject=${encodeURIComponent(a.letter === 'no' ? 'Music Exposure Check: audit request' : 'Music Exposure Check: PRO Letter Pack request')}&body=${encodeURIComponent(text)}`;
    out.innerHTML =
      `<h2>Your result</h2><p><span class="signal ${r.level}">${LABEL.level[r.level]}</span></p>` +
      r.findings.map(f =>
        `<div class="finding"><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p>` +
        (f.src.length ? `<p class="src">Source: ${f.src.map(k => `<a href="${SRC[k][1]}">${esc(SRC[k][0])}</a>`).join('; ')}</p>` : '') + '</div>').join('') +
      offer +
      '<div class="result-actions"><a class="btn" id="mail-link" href="' + mail + '">Email my answers to Sereinora</a>' +
      '<button class="btn ghost" type="button" id="copy-answers">Copy my answers</button>' +
      '<button class="btn ghost" type="button" id="print-result">Print or save as PDF</button></div>' +
      '<p class="small muted" style="margin-top:14px">Opening your email app sends nothing until you press send. If no email app opens, use “Copy my answers” and paste them into a message to ' + TO + '. This result is general information based on rules of thumb, not legal advice.</p>';
    out.hidden = false;
    out.querySelector('#copy-answers').addEventListener('click', ev => copy(text, ev.currentTarget));
    out.querySelector('#print-result').addEventListener('click', () => window.print());
    out.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    out.focus({ preventScroll: true });
  });
})();
