'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const TO = 'contact@sereinora.com';
  const FR = {
    skip: 'Aller au formulaire',
    navSend: 'Décrire une situation', navReceive: 'Ce que vous recevez', navGuide: 'Guide de passation',
    eyebrow: 'Pour les lieux / Diagnostic d’ambiance',
    h1a: 'Une décision sonore qui revient sans cesse.', h1b: 'Une première lecture écrite, gratuite.',
    lede: 'Pour les hôtels, restaurants et lieux — en particulier les groupes qui exploitent plusieurs sites — où la musique, le volume ou le silence se redécident à chaque service.',
    intro: 'Décrivez une situation datée. Nous répondons par écrit avec une première lecture indépendante : manque de décision claire, point que votre prestataire actuel devrait déjà couvrir, question pour un acousticien, ou rien à changer. Garder votre dispositif actuel est une réponse valable.',
    heroCta: 'Décrire votre situation ↓',
    heroSmall: 'Gratuit. Pas d’audio, de mesures, de résultats clients ni de promesses de performance. Cette page n’enregistre et n’envoie rien ; c’est vous qui envoyez le message.',
    tocTitle: 'Sur cette page', toc1: 'Ce que vous recevez', toc2: 'Décrire une situation', toc3: 'Si davantage est utile', toc4: 'Limites et confidentialité',
    s1eyebrow: '01 / Ce que vous recevez', s1h: 'Une page, par écrit, sous cinq jours ouvrés.',
    d1t: 'Notre lecture de la situation.', d1: 'Manque de décision, fonctionnement du prestataire, question de spécialiste ou rien à changer — avec la raison.',
    d2t: 'Trois questions pour votre prestataire ou votre équipe.', d2: 'Pour vérifier si ce que vous payez déjà règle le problème.',
    d3t: 'Si une mission payante vaudrait la peine.', d3: 'Et, tout aussi clairement, quand elle ne la vaudrait pas.',
    receiveSmall: 'La première lecture repose uniquement sur ce que vous envoyez. Ce n’est ni un diagnostic, ni un devis, ni un classement de prestataires.',
    s2eyebrow: '02 / Décrire une situation', s2h: 'Commencez par un espace et un moment récent.',
    s2p: 'Les réponses inconnues sont acceptées — écrivez « inconnu ». Merci de ne pas inclure de noms de clients, d’enregistrements ni d’informations confidentielles.',
    lSites: 'Combien de sites exploitez-vous ?', oSites1: 'Un site', oSites2: '2 à 3 sites', oSites3: '4 à 10 sites', oSites4: 'Plus de 10',
    lVenue: 'Type de lieu', oV1: 'Hôtel', oV2: 'Restaurant ou bar', oV3: 'Club privé ou lieu de nuit', oV4: 'Boutique ou showroom', oV5: 'Spa ou bien-être', oV6: 'Autre',
    lRoom: 'Quel espace ?', phRoom: 'ex. lounge du lobby, rez-de-chaussée',
    lMoments: 'Jusqu’à trois moments qu’il doit servir', phMoments: 'ex. petit-déjeuner · travail l’après-midi · verre du soir',
    lEvent: 'Une situation récente : ce qui s’est passé, quand, et ce que cela a provoqué', phEvent: 'ex. mardi 4 nov., 19h30 — la réception a baissé la musique pour les arrivées ; le bar l’a remontée ; deux clients ont demandé à changer de place.',
    lCurrent: 'Qu’est-ce qui est en place aujourd’hui ?', phCurrent: 'ex. plateforme d’un prestataire, playlist, habitude de l’équipe — ou inconnu',
    lOwner: 'Qui décide aujourd’hui, et qui peut modifier pendant le service ?', phOwner: 'ex. le directeur fixe le réglage ; les chefs de service le changent ; personne ne le rétablit',
    lTiming: 'Une date d’ouverture, de rénovation ou de changement ?', phTiming: 'ex. réouverture en mars 2027 — ou aucune',
    lSender: 'Votre nom, fonction et société (facultatif)',
    bCompose: 'Ouvrir dans ma messagerie', bCopy: 'Copier le texte à la place',
    lPreview: 'Votre message (modifiable dans votre messagerie)',
    formSmall: 'Ouvrir votre messagerie n’envoie rien. Le message part vers contact@sereinora.com seulement quand vous cliquez sur envoyer.',
    fallback: '<strong>Écrivez-nous directement :</strong> à <a href="mailto:contact@sereinora.com?subject=Diagnostic%20d%E2%80%99ambiance">contact@sereinora.com</a>, avec le nombre de sites, l’espace, jusqu’à trois moments, une situation datée et sa conséquence, ce qui est en place et qui décide.',
    s3eyebrow: '03 / Si davantage est utile', s3h: 'Une mission payante bornée — seulement si la première lecture la justifie.',
    s3p1: 'L’Independent Atmosphere Decision Brief porte sur un espace, jusqu’à trois moments d’exploitation, votre prestataire actuel et l’option de ne rien changer. Il fournit des recommandations écrites, un responsable des exceptions proposé et des critères de comparaison, avec un tour de relecture et de correction.',
    s3p2: 'Pour les groupes, nous pouvons étudier si les mêmes règles doivent s’appliquer à plusieurs sites. Honoraires et délais sont fixés après une revue du périmètre ; rien n’est engagé en envoyant une situation.',
    s3cta: 'Lire le périmètre du brief ↗',
    s4h: 'Limites et confidentialité.',
    lim1: 'Pas de fourniture de musique, de licences, de mesures acoustiques, de matériel ni d’installation. Le bruit, le traitement des espaces et la conception du matériel relèvent d’un spécialiste qualifié.',
    lim2: 'Aucun résultat client n’est revendiqué et aucun résultat n’est garanti. Place Study 001 est un exemple fictif.',
    lim3: 'Cette page n’a aucun formulaire qui envoie des données, ni cookies ni mesure d’audience. Elle n’enregistre rien. Ce que vous envoyez par e-mail sert uniquement à préparer votre première lecture.',
    lim4: 'Diffuser de la musique dans un lieu commercial implique des obligations de droits ; ce diagnostic ne les règle pas.',
    privacy: 'Confidentialité', terms: 'Conditions'
  };
  const EN = {};
  document.querySelectorAll('[data-i18n]').forEach(el => { EN[el.dataset.i18n] = el.innerHTML; });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { EN[el.dataset.i18nPh] = el.placeholder; });
  let lang = 'en';

  const MSG = {
    en: { subject: 'Atmosphere Decision Check — first read request', intro: 'Hello Sereinora,\n\nPlease send a written first read for this situation.\n',
      rows: ['Sites operated', 'Type of place', 'Room or space', 'Moments it serves', 'Recent situation and consequence', 'In place today', 'Who decides / who overrides', 'Opening or change date', 'From'],
      unknown: 'unknown', copied: 'Copied. Paste it into an email to contact@sereinora.com.', opened: 'Your email app should open with this message. Nothing is sent until you press send.', copyFail: 'Copy was blocked by your browser. Select the text below and copy it manually.' },
    fr: { subject: 'Diagnostic d’ambiance — demande de première lecture', intro: 'Bonjour Sereinora,\n\nMerci de m’envoyer une première lecture écrite pour cette situation.\n',
      rows: ['Sites exploités', 'Type de lieu', 'Espace', 'Moments servis', 'Situation récente et conséquence', 'En place aujourd’hui', 'Qui décide / qui modifie', 'Date d’ouverture ou de changement', 'De la part de'],
      unknown: 'inconnu', copied: 'Copié. Collez-le dans un e-mail à contact@sereinora.com.', opened: 'Votre messagerie devrait s’ouvrir avec ce message. Rien n’est envoyé avant que vous cliquiez sur envoyer.', copyFail: 'La copie a été bloquée par votre navigateur. Sélectionnez le texte ci-dessous et copiez-le.' }
  };
  const fieldIds = ['sites', 'venue', 'room', 'moments', 'event', 'current', 'owner', 'timing', 'sender'];

  function value(id) {
    const el = $(id);
    if (el.tagName === 'SELECT') return el.options[el.selectedIndex].text;
    return el.value.trim();
  }
  function compose() {
    const m = MSG[lang];
    const sep = lang === 'fr' ? ' : ' : ': ';
    const lines = fieldIds.map((id, i) => `${m.rows[i]}${sep}${value(id) || m.unknown}`);
    return m.intro + '\n' + lines.join('\n') + '\n';
  }
  function refresh() { $('preview').value = compose(); }

  function applyLang(next) {
    lang = next;
    const dict = next === 'fr' ? FR : EN;
    document.documentElement.lang = next;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = dict[el.dataset.i18n]; if (v) el.innerHTML = v; });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { const v = dict[el.dataset.i18nPh]; if (v) el.placeholder = v; });
    const t = $('lang-toggle');
    t.textContent = next === 'fr' ? 'EN' : 'FR';
    t.setAttribute('aria-label', next === 'fr' ? 'Read in English' : 'Lire en français');
    document.title = next === 'fr' ? 'Diagnostic d’ambiance — une première lecture gratuite — Sereinora' : 'Atmosphere Decision Check — a free first read — Sereinora';
    $('form-status').textContent = '';
    refresh();
  }

  $('check-form').hidden = false;
  $('form-fallback').hidden = true;
  $('lang-toggle').hidden = false;
  $('lang-toggle').addEventListener('click', () => applyLang(lang === 'fr' ? 'en' : 'fr'));
  fieldIds.forEach(id => { $(id).addEventListener('input', refresh); $(id).addEventListener('change', refresh); });

  $('compose').addEventListener('click', () => {
    const m = MSG[lang];
    const href = `mailto:${TO}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(compose())}`;
    $('form-status').textContent = m.opened;
    window.location.href = href;
  });
  $('copy').addEventListener('click', async () => {
    const m = MSG[lang];
    const text = `To: ${TO}\nSubject: ${m.subject}\n\n${compose()}`;
    try { await navigator.clipboard.writeText(text); $('form-status').textContent = m.copied; }
    catch { $('preview').focus(); $('preview').select(); $('form-status').textContent = m.copyFail; }
  });

  let initial = 'en';
  try { if (new URLSearchParams(location.search).get('lang') === 'fr' || (navigator.language || '').toLowerCase().startsWith('fr')) initial = 'fr'; } catch {}
  applyLang(initial);
})();
