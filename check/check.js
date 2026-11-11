'use strict';
(() => {
  const form = document.getElementById('exposure-form');
  const out = document.getElementById('result');
  const TO = 'contact@sereinora.com';
  form.hidden = false;

  const one = name => (form.querySelector(`input[name="${name}"]:checked`) || {}).value;
  const many = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function assess(a) {
    const f = [];
    let points = 0;
    const majorPros = a.pro.filter(p => p !== 'unknown');
    const live = a.live !== 'none' || a.dj === 'yes';
    const foodSmall = a.type === 'food' && a.size !== 'large';
    const otherSmall = a.type !== 'food' && a.size === 'small';

    if (a.letter === 'legal') {
      points += 5;
      f.push(['Talk to a US attorney first.', 'A letter that mentions a lawsuit, a lawyer or a deadline needs legal advice. An audit can support your attorney with facts, but it does not replace them.']);
    } else if (a.letter === 'yes') {
      points += 2;
      f.push(['A PRO has already contacted you.', 'PROs usually follow up and some cases end in court. Respond on time and with facts: what you actually play, where, and under which license.']);
    }
    if (a.src.includes('personal')) {
      points += 3;
      f.push(['Personal streaming accounts are not business licenses.', 'Personal Spotify, Apple Music or YouTube plans are for personal, non-commercial use. Playing them in a venue is generally not covered by your subscription.']);
    }
    if (a.src.includes('owned')) {
      points += 2;
      f.push(['Owning the recording is not a performance license.', 'Downloads, CDs and vinyl played in public usually still need PRO licenses for the songs.']);
    }
    if (live && majorPros.length === 0) {
      points += 3;
      f.push(['Live music, DJs or karaoke with no direct PRO licenses.', 'Business music services cover recorded background music, not performances by bands, DJs or karaoke. This is the use most often targeted in PRO enforcement.']);
    } else if (live && majorPros.length > 0 && majorPros.length < 4) {
      points += 2;
      f.push([`Partial coverage: you pay ${majorPros.join(', ')}.`, 'One PRO\'s license does not cover songs represented by another. Live sets, DJs and karaoke draw on all catalogues.']);
    }
    if (a.src.includes('service') && majorPros.length > 0 && !live) {
      points += 1;
      f.push(['You may be paying twice for background music.', 'Many business music services include PRO licensing for the recorded background music they supply. If that is all you play, direct PRO licenses may overlap. Check what each license actually covers before cancelling anything.']);
    }
    if (a.src.includes('radio') && (foodSmall || otherSmall) && !live && !a.src.includes('personal') && !a.src.includes('owned')) {
      f.push(['You may qualify for the small-business exemption.', 'US copyright law (17 U.S.C. §110(5)(B)) exempts radio and TV broadcasts in food and drink venues under 3,750 sq ft and other businesses under 2,000 sq ft, with no cover charge. It does not cover streaming, downloads or live music.']);
    } else if (a.src.includes('radio') && a.size === 'large') {
      points += 1;
      f.push(['Broadcasts in a larger venue depend on your equipment.', 'Above the size limits, the exemption only applies within limits on speakers (6 in total, 4 per room) and TVs (4 in total, 1 per room, 55 inch maximum).']);
    }
    if (a.pro.includes('unknown')) {
      points += 1;
      f.push(['You do not know which licenses you hold.', 'This is the most common starting point. An inventory of what you pay and what you play usually settles it.']);
    }
    if (a.social === 'yes') {
      points += 1;
      f.push(['Social videos are a separate right.', 'Venue PRO licenses do not cover music in your marketing or social posts. Use music cleared for that use.']);
    }
    if (a.type === 'fitness') {
      f.push(['Fitness classes have their own licensing questions.', 'Music used to choreograph classes can need licensing beyond background music. This check does not cover that in detail.']);
    }
    if (a.spend === 'gt5k' || a.units !== '1') points += 1;
    if (!f.length) f.push(['No obvious gap from these answers.', 'Keep your license and service contracts together and re-check when you add live music, DJs or new rooms.']);

    const level = points >= 5 ? 'high' : points >= 2 ? 'medium' : 'low';
    return { level, findings: f };
  }

  function answers() {
    return {
      type: one('type'), size: one('size'), src: many('src'), live: one('live'), dj: one('dj'),
      pro: many('pro'), letter: one('letter'), social: one('social'), units: one('units'), spend: one('spend')
    };
  }

  function summary(a, r) {
    const labels = {
      type: { food: 'Restaurant/bar/café', hotel: 'Hotel', retail: 'Store', fitness: 'Gym/studio', other: 'Other' },
      size: { small: '< 2,000 sq ft', mid: '2,000–3,749 sq ft', large: '3,750+ sq ft' }
    };
    return [
      'Hello Sereinora,', '', 'Here is my Music Exposure Check. Please tell me which audit fits and when you could deliver it.', '',
      `Result: ${r.level.toUpperCase()}`,
      `Venue type: ${labels.type[a.type]}`, `Size: ${labels.size[a.size]}`,
      `Background music: ${a.src.join(', ') || 'not answered'}`, `Live music: ${a.live}`, `DJs/karaoke: ${a.dj}`,
      `Licenses paid directly: ${a.pro.join(', ') || 'none'}`, `PRO contact in last 12 months: ${a.letter}`,
      `Social videos with music: ${a.social}`, `Venues operated: ${a.units}`, `Yearly music spend per venue: ${a.spend}`,
      '', 'Business name:', 'Venue address (city, state):', 'My name and role:'
    ].join('\n');
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const a = answers();
    const r = assess(a);
    const group = a.units !== '1';
    const offer = a.letter === 'legal'
      ? '<p>Because a legal deadline is involved, start with a US attorney. If useful, our <a href="/audit/#letter">PRO Letter Pack</a> ($295, 48 hours) gives your attorney a factual inventory.</p>'
      : a.letter === 'yes'
        ? '<p><strong>Next step:</strong> the <a href="/audit/#letter">PRO Letter Pack</a> ($295, 48 hours) — what they are asking, what you actually play, and the questions to put back to them.</p>'
        : group
          ? '<p><strong>Next step:</strong> a <a href="/audit/#group">Group Audit</a> ($1,950 for up to 10 venues) — one table of what every venue plays, pays and is missing.</p>'
          : '<p><strong>Next step:</strong> a <a href="/audit/#venue">Venue Music Audit</a> ($495, 5 business days) — every music use, every license, the overlaps and the gaps, in writing.</p>';
    const mail = `mailto:${TO}?subject=${encodeURIComponent('Music Exposure Check — audit request')}&body=${encodeURIComponent(summary(a, r))}`;
    out.innerHTML =
      `<p><span class="level ${r.level}">${r.level} exposure</span></p>` +
      r.findings.map(([t, d]) => `<div class="finding"><strong>${esc(t)}</strong>${esc(d)}</div>`).join('') +
      offer +
      `<p><a class="button" href="${mail}">Email my answers to Sereinora</a></p>` +
      '<p class="small">Opening your email app sends nothing until you press send. This result is general information based on rules of thumb, not legal advice.</p>';
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
