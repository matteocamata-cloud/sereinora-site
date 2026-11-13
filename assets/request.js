/* Request an audit (/request/). Composes an email from the visitor's answers.
   Nothing is sent or stored by this page: "Open my email to send" opens the visitor's own email app
   (mailto:), "Copy request" copies the same text. No cookies, no storage, no network requests.
   Prices are the published ones only (see /audit/). They change only with the founder's approval,
   and then here and on /audit/ together. Never describe a price difference as a discount or a saving. */
(() => {
  'use strict';
  const doc = document;
  const form = doc.getElementById('req-form');
  if (!form) return;

  const TO = 'contact@sereinora.com';
  const MAX_URL = 1800;          // keep the mailto link short enough for every common email app
  const NOTE_MAX = 1500;
  const VENUES_MAX = 50;
  const GROUP_MAX = 10;          // the Group Audit covers up to 10 venues
  const PRICE = { venue: 495, group: 1950, letter: 295 };

  const SERVICES = {
    venue: { name: 'Venue Music Audit' },
    group: { name: 'Group Audit' },
    letter: { name: 'PRO Letter Pack' },
    unsure: { name: 'Not sure yet' },
  };
  const TYPES = { restaurant: 'Restaurant', bar: 'Bar', hotel: 'Hotel', other: 'Other' };
  const USES = {
    service: 'Business music service', personal: 'Personal streaming account', live: 'Live music',
    dj: 'DJ or karaoke', tv: 'TVs or radio', social: 'Videos with music on social media', unsure: 'Not sure',
  };
  const LETTERS = { no: 'No', yes: 'Yes', legal: 'Yes, and it mentions a lawsuit, a lawyer or a deadline' };
  const TERMS_EMAIL = 'Prices are in US dollars and exclude any license fees. Scope and price are confirmed in writing before any work starts.';
  const SHORTENED = '[Shortened to fit an email link.]';

  const $ = (id) => doc.getElementById(id);
  const fallback = $('req-fallback');
  const venues = $('venues');
  const business = $('business');
  const city = $('city');
  const who = $('who');
  const note = $('note');
  const deadline = $('deadline');
  const deadlineField = $('deadline-field');
  const legal = $('legal-note');
  const est = $('estimate');
  const errorsBox = $('req-errors');
  const statusBox = $('req-status');
  const preview = $('req-preview');
  const previewText = $('req-text');
  const mailLink = $('req-mailto');
  const copyBtn = $('req-copy');
  const count = $('note-count');
  const countLive = $('note-live');

  if (fallback) fallback.hidden = true;
  form.hidden = false;

  const one = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value || '';
  const many = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const usd = (n) => '$' + n.toLocaleString('en-US');
  const el = (tag, cls, text) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  /* Preselect the service from ?service=venue|group|letter */
  const asked = new URLSearchParams(location.search).get('service');
  if (asked && SERVICES[asked]) {
    const r = form.querySelector(`input[name="service"][value="${asked}"]`);
    if (r) r.checked = true;
  }

  /* ---------- Estimate: published prices only ---------- */
  function venueCount() {
    const raw = venues.value.trim();
    if (!/^\d+$/.test(raw)) return NaN;
    return parseInt(raw, 10);
  }

  // Returns { rows: [{ name, detail, price, lower }], says: [sentences], brief: one line for the email }
  function estimate(service, n) {
    const rows = [];
    const says = [];
    let brief = '';
    if (service === 'letter') {
      rows.push({ name: 'PRO Letter Pack', detail: 'per letter, delivered in 48 hours', price: usd(PRICE.letter) });
      brief = `PRO Letter Pack, ${usd(PRICE.letter)} per letter.`;
    } else if (!Number.isInteger(n) || n < 1) {
      says.push('Enter the number of venues to see the estimate.');
      brief = 'None (number of venues not given).';
    } else if (n > GROUP_MAX) {
      says.push('The Group Audit covers up to 10 venues. Write to us and we will confirm scope and price in writing.');
      brief = 'More than 10 venues: the Group Audit covers up to 10 venues, so scope and price are to be confirmed in writing.';
    } else if (n === 1 && service !== 'group') {
      rows.push({ name: 'Venue Music Audit', detail: '1 venue, delivered in 5 business days', price: usd(PRICE.venue) });
      brief = `Venue Music Audit, ${usd(PRICE.venue)} for 1 venue.`;
    } else {
      const separate = n * PRICE.venue;
      const sepRow = n === 1
        ? { name: 'Venue Music Audit', detail: '1 venue, delivered in 5 business days', price: usd(separate) }
        : { name: 'Separate Venue Music Audits', detail: `${n} × ${usd(PRICE.venue)}`, price: usd(separate) };
      const groupRow = { name: 'Group Audit', detail: 'up to 10 venues, delivered in 10 business days', price: usd(PRICE.group) };
      const sepName = n === 1 ? 'the Venue Music Audit' : 'separate Venue Music Audits';
      const sepBrief = n === 1 ? `Venue Music Audit ${usd(separate)}` : `Separate Venue Music Audits ${n} × ${usd(PRICE.venue)} = ${usd(separate)}`;
      const groupBrief = `Group Audit ${usd(PRICE.group)} (up to 10 venues)`;
      if (separate < PRICE.group) {
        sepRow.lower = true;
        rows.push(sepRow, groupRow);
        says.push(`For ${n} ${n === 1 ? 'venue' : 'venues'}, ${sepName} (${usd(separate)}) ${n === 1 ? 'is' : 'are'} lower than the Group Audit (${usd(PRICE.group)}).`);
        if (n > 1) says.push('The Group Audit adds one spend table across the group and a single music-licensing standard for every venue.');
        brief = `${sepBrief}, lower than the ${groupBrief}.`;
      } else if (separate > PRICE.group) {
        groupRow.lower = true;
        rows.push(groupRow, sepRow);
        says.push(`Separate Venue Music Audits for ${n} venues would be ${n} × ${usd(PRICE.venue)} = ${usd(separate)}, which is higher.`);
        brief = `${groupBrief}. ${sepBrief} would be higher.`;
      } else {
        rows.push(groupRow, sepRow);
        says.push(`For ${n} venues, both come to ${usd(PRICE.group)}.`);
        brief = `${groupBrief} or ${sepBrief}: the same.`;
      }
    }
    const plain = rows.map((r) => `${r.name}: ${r.price} (${r.detail})`).concat(says).join('\n');
    return { rows, says, plain, brief };
  }

  let lastEstimate = '';
  function renderEstimate() {
    const e = estimate(one('service'), venueCount());
    if (e.plain === lastEstimate) return e;
    lastEstimate = e.plain;
    const frag = doc.createDocumentFragment();
    for (const r of e.rows) {
      const row = el('div', 'est-row' + (r.lower ? ' lower' : ''));
      const line = el('div', 'est-line');
      const name = el('span', 'est-name', r.name);
      if (r.lower) name.append(' ', el('span', 'est-tag', 'Lower'));
      const lead = el('span', 'leader');
      lead.setAttribute('aria-hidden', 'true');
      line.append(name, ' ', lead, ' ', el('span', 'est-price', r.price));
      row.append(line, ' ', el('span', 'est-detail', r.detail));
      frag.append(row);
    }
    for (const s of e.says) frag.append(el('p', 'est-say', s));
    est.replaceChildren(frag);
    return e;
  }

  /* ---------- PRO letter: lawsuit, lawyer or deadline ---------- */
  function renderLetter() {
    const v = one('letter');
    deadlineField.hidden = !(v === 'yes' || v === 'legal');
    if (v === 'legal') {
      if (!legal.firstChild) {
        const p = el('p', 'note');
        p.append(el('strong', '', 'Because a lawsuit, a lawyer or a deadline is involved, please speak to a licensed attorney first, without waiting.'),
          ' If useful, the PRO Letter Pack ($295) can give your attorney a factual inventory.');
        legal.append(p);
      }
    } else if (legal.firstChild) {
      legal.replaceChildren();
    }
  }

  /* ---------- Character counter ---------- */
  let lastBand = 0;
  function renderCount() {
    const used = note.value.length;
    const left = NOTE_MAX - used;
    count.textContent = `${used.toLocaleString('en-US')} of ${NOTE_MAX.toLocaleString('en-US')} characters`;
    count.classList.toggle('near', left <= 100);
    const band = left <= 0 ? 2 : left <= 100 ? 1 : 0;   // announce only when crossing a threshold
    if (band !== lastBand) {
      countLive.textContent = band === 2 ? 'No characters left.' : band === 1 ? `${left} characters left.` : '';
      lastBand = band;
    }
  }

  /* ---------- Compose the email ---------- */
  function answers() {
    return {
      service: one('service') || 'unsure',
      venues: venues.value.trim(),
      business: clean(business.value),
      city: clean(city.value),
      type: one('type'),
      who: clean(who.value),
      uses: many('uses'),
      letter: one('letter'),
      deadline: deadlineField.hidden ? '' : deadline.value,
      note: note.value.replace(/\r\n?/g, '\n').trim(),
    };
  }

  function longDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
  }

  function compose(a, noteText) {
    const svc = SERVICES[a.service] || SERVICES.unsure;
    const subject = `Audit request: ${svc.name}, ${a.business || 'business name not given'}`;
    const e = estimate(a.service, venueCount());
    // Kept compact on purpose: every character counts towards the mailto length limit.
    const L = [
      'Audit request from sereinora.com/request/',
      '',
      `Service: ${svc.name}`,
      `Number of venues: ${a.venues || 'not given'}`,
      `Business name: ${a.business || 'not given'}`,
      `Venue city and state: ${a.city || 'not given'}`,
      `Venue type: ${TYPES[a.type] || 'not given'}`,
      `Name and role: ${a.who || 'not given'}`,
      `Music uses: ${a.uses.length ? a.uses.map((u) => USES[u]).join('; ') : 'not given'}`,
      `Letter from a PRO: ${LETTERS[a.letter] || 'not answered'}`,
    ];
    if (a.deadline) L.push(`Deadline in the letter: ${longDate(a.deadline)}`);
    L.push('', 'Anything else:', noteText || 'Nothing to add.');
    L.push('', `Estimate shown: ${e.brief}`, TERMS_EMAIL);
    return { subject, body: L.join('\n') };
  }

  // RFC 6068: , : ; $ / @ may stay unencoded in a mailto query, which leaves more room for the note.
  const enc = (s) => encodeURIComponent(s).replace(/%(2C|3A|3B|24|2F|40)/g, (m) => decodeURIComponent(m));
  const mailto = (m) => `mailto:${TO}?subject=${enc(m.subject)}&body=${enc(m.body.replace(/\n/g, '\r\n'))}`;

  // The full text goes to the preview and the clipboard. The mailto link stays under MAX_URL:
  // if needed, "Anything else" is shortened (and the email says so).
  function build() {
    const a = answers();
    const full = compose(a, a.note);
    let url = mailto(full);
    let cut = 0;
    if (url.length > MAX_URL && a.note) {
      const chars = Array.from(a.note);
      const shorten = (k) => chars.slice(0, k).join('').trimEnd() + '… ' + SHORTENED;
      let lo = 0, hi = chars.length - 1, best = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (mailto(compose(a, shorten(mid))).length <= MAX_URL) { best = mid; lo = mid + 1; } else hi = mid - 1;
      }
      url = mailto(compose(a, shorten(best)));
      cut = chars.length - best;
    }
    const text = `To: ${TO}\nSubject: ${full.subject}\n\n${full.body}`;
    return { url, text, cut, tooLong: url.length > MAX_URL };
  }

  /* ---------- Validation ---------- */
  const FIELDS = [
    [venues, 'venues-err', () => {
      const n = venueCount();
      return Number.isInteger(n) && n >= 1 && n <= VENUES_MAX ? ''
        : 'Enter a whole number of venues from 1 to 50. For more than 50, enter 50 and give the total under Anything else.';
    }, 'Number of venues'],
    [business, 'business-err', () => (clean(business.value) ? '' : 'Enter the business name.'), 'Business name'],
    [city, 'city-err', () => (clean(city.value) ? '' : 'Enter the venue city and state, for example Austin, TX.'), 'Venue city and state'],
  ];

  function setError(input, errId, msg) {
    $(errId).textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function validate() {
    const bad = [];
    for (const [input, errId, check, label] of FIELDS) {
      const msg = check();
      setError(input, errId, msg);
      if (msg) bad.push([input, label]);
    }
    errorsBox.replaceChildren();
    if (!bad.length) return true;
    const p = el('p', '', bad.length === 1 ? 'One answer needs attention:' : `${bad.length} answers need attention:`);
    const ul = el('ul');
    for (const [input, label] of bad) {
      const a = el('a', '', label);
      a.href = '#' + input.id;
      a.addEventListener('click', (ev) => { ev.preventDefault(); input.focus(); });
      const li = el('li');
      li.append(a);
      ul.append(li);
    }
    errorsBox.append(p, ul);
    bad[0][0].focus();
    return false;
  }

  /* ---------- Output ---------- */
  let shown = false;
  function renderOutput() {
    const r = build();
    previewText.value = r.text;
    mailLink.href = r.url;
    if (!preview.hidden) {   // show the whole email without an inner scrollbar
      previewText.style.height = 'auto';
      previewText.style.height = (previewText.scrollHeight + 2) + 'px';
    }
    return r;
  }

  function say(lines) {
    statusBox.replaceChildren(...lines.map((t) => el('p', '', t)));
  }

  function lengthNotes(r) {
    const out = [];
    if (r.cut) out.push(`Your note under Anything else was too long for an email link, so the email leaves out the last ${r.cut.toLocaleString('en-US')} characters and says so. Copy request copies the full text.`);
    if (r.tooLong) out.push('This request is long for an email link. If your email app opens without all of it, use Copy request and paste it into the email.');
    return out;
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    preview.hidden = false;
    shown = true;
    const r = renderOutput();
    say(['Your email app should open with the request. Check it, then send it to ' + TO + '.',
      'If nothing opens, use Copy request and paste it into any email, or copy the text below.'].concat(lengthNotes(r)));
    window.location.href = r.url;
  });

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = el('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      doc.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = doc.execCommand('copy'); } catch (__) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  const copyLabel = copyBtn.textContent;
  let copyTimer = 0;
  copyBtn.addEventListener('click', async () => {
    if (!validate()) return;
    preview.hidden = false;
    shown = true;
    const r = renderOutput();
    const ok = await copyText(r.text);
    if (ok) {
      copyBtn.textContent = 'Copied';
      copyBtn.dataset.done = '1';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copyBtn.textContent = copyLabel; delete copyBtn.dataset.done; }, 2200);
      say(['Request copied. Paste it into an email to ' + TO + '.']);
    } else {
      previewText.focus();
      previewText.select();
      say(['Copying did not work in this browser. The text below is selected: copy it, then paste it into an email to ' + TO + '.']);
    }
  });

  /* ---------- Keep everything in step with the answers ---------- */
  function update(ev) {
    renderEstimate();
    renderLetter();
    renderCount();
    // Clear a field's error as soon as it is fixed
    if (ev && ev.target) {
      for (const [input, errId, check] of FIELDS) {
        if (input === ev.target && input.hasAttribute('aria-invalid') && !check()) setError(input, errId, '');
      }
      if (errorsBox.firstChild && FIELDS.every(([input]) => !input.hasAttribute('aria-invalid'))) errorsBox.replaceChildren();
    }
    if (shown) renderOutput();
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  window.addEventListener('pageshow', () => update());
  update();
})();
