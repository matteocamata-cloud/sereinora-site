const body = document.body;
const stateLabel = document.querySelector('.frame-state b');
const sections = [...document.querySelectorAll('[data-atmosphere]')].filter((node) => node !== body);

const observer = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

  if (!visible) return;
  body.dataset.atmosphere = visible.target.dataset.atmosphere;
  if (stateLabel) stateLabel.textContent = visible.target.dataset.label;
  visible.target.classList.add('is-present');
}, { threshold: [0.3, 0.55, 0.75] });

sections.forEach((section) => observer.observe(section));

let scrollFrame;

function updateSectionProgress() {
  const viewportHeight = window.innerHeight;
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / (viewportHeight + rect.height)));
    section.style.setProperty('--progress', progress.toFixed(3));
    section.style.setProperty('--content-shift', `${((0.5 - progress) * 14).toFixed(2)}px`);
    section.style.setProperty('--arrival-shift', `${(progress * 2.6).toFixed(2)}%`);
    section.style.setProperty('--media-shift', `${((progress - 0.5) * 3.2).toFixed(2)}%`);
    section.style.setProperty('--spaces-shift', `${(43 + progress * 5).toFixed(2)}%`);
  });
  scrollFrame = undefined;
}

function requestProgressUpdate() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(updateSectionProgress);
}

updateSectionProgress();
window.addEventListener('scroll', requestProgressUpdate, { passive: true });
window.addEventListener('resize', requestProgressUpdate);

const player = document.querySelector('#featured-player');
const playerFrame = player?.querySelector('.player-frame');
const listenButton = document.querySelector('.featured .listen-button');
const closeButton = player?.querySelector('.close-player');
const worldPlayer = document.querySelector('#world-player');
const worldPlayerFrame = worldPlayer?.querySelector('.player-frame');
const worldPlayerTitle = worldPlayer?.querySelector('#world-player-title');
const worldPlayerLabel = worldPlayer?.querySelector('[data-world-label]');
const worldCloseButton = worldPlayer?.querySelector('.close-player');

const catalogSection = document.querySelector('.elements-catalog');
const catalogSequence = document.querySelector('[data-release-catalog]');

function catalogEntry(release) {
  const article = document.createElement('article');
  article.className = `element-work element-work-${release.release_id}`;

  const link = document.createElement('a');
  link.className = 'element-work-link';
  const worldTargets = { water: '#water-world', air: '#air-world', fire: '#fire-world', land: '#land' };
  link.href = worldTargets[release.release_id];
  link.setAttribute('aria-label', `Enter ${release.element_name} — ${release.public_title}`);

  const figure = document.createElement('figure');
  const image = document.createElement('img');
  image.src = release.collection_artwork_9x16;
  image.alt = `${release.element_name}, from the Sereinora Elements collection`;
  image.loading = 'lazy';
  figure.append(image);

  const copy = document.createElement('div');
  copy.className = 'element-work-copy';
  const index = document.createElement('p');
  index.className = 'element-index';
  index.textContent = String(release.collection_order).padStart(2, '0');
  const title = document.createElement('h3');
  title.textContent = release.element_name;
  const subtitle = document.createElement('p');
  subtitle.className = 'element-title';
  subtitle.textContent = release.public_title;
  const action = document.createElement('span');
  action.className = 'element-action';
  action.textContent = 'Enter world ↓';
  copy.append(index, title, subtitle, action);

  link.append(figure, copy);
  article.append(link);
  return article;
}

function renderLatestRelease(releases) {
  document.querySelectorAll('.latest-release').forEach((label) => label.remove());
  const latest = releases.filter((release) => release.latest_release === true);
  if (latest.length !== 1) return;
  const world = document.querySelector(`[data-release-id="${CSS.escape(latest[0].release_id)}"]`);
  const titleGroup = world?.querySelector('.fire-title-group, .world-title-group');
  if (!titleGroup) return;
  const label = document.createElement('p');
  label.className = 'latest-release';
  label.textContent = 'Latest release';
  titleGroup.prepend(label);
}

async function loadCatalog() {
  if (!catalogSection || !catalogSequence) return;
  try {
    const response = await fetch('/catalog/releases.json', { cache: 'no-cache' });
    if (!response.ok) return;
    const catalog = await response.json();
    const releases = Array.isArray(catalog.releases) ? catalog.releases : [];
    if (!releases.length) return;
    catalogSequence.replaceChildren(...releases.map(catalogEntry));
    renderLatestRelease(releases);
    catalogSection.hidden = false;
    sections.push(catalogSection);
    observer.observe(catalogSection);
    requestProgressUpdate();
  } catch {
    // Fail closed: the canonical homepage remains intact when catalog state is unavailable.
  }
}

loadCatalog();

function stopFire() {
  if (playerFrame) playerFrame.replaceChildren();
}

function stopWorld() {
  if (worldPlayerFrame) worldPlayerFrame.replaceChildren();
}

function closeOtherPlayer(activePlayer) {
  for (const dialog of [player, worldPlayer]) {
    if (dialog && dialog !== activePlayer && dialog.open) dialog.close();
  }
}

listenButton?.addEventListener('click', () => {
  if (!player || !playerFrame) return;
  closeOtherPlayer(player);
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${playerFrame.dataset.videoId}?autoplay=1&rel=0&modestbranding=1`;
  iframe.title = `${listenButton.dataset.releaseId} — ${listenButton.dataset.title} by Sereinora`;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  playerFrame.replaceChildren(iframe);
  player.showModal();
});

closeButton?.addEventListener('click', () => {
  stopFire();
  player?.close();
});
player?.addEventListener('close', stopFire);
player?.addEventListener('click', (event) => {
  if (event.target === player) player.close();
});

document.querySelectorAll('.world-listen').forEach((button) => {
  button.addEventListener('click', () => {
    if (!worldPlayer || !worldPlayerFrame) return;
    closeOtherPlayer(worldPlayer);
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${button.dataset.videoId}?autoplay=1&rel=0&modestbranding=1`;
    iframe.title = `${button.dataset.releaseId} — ${button.dataset.title} by Sereinora`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    worldPlayerFrame.replaceChildren(iframe);
    if (worldPlayerTitle) worldPlayerTitle.textContent = button.dataset.title;
    if (worldPlayerLabel) worldPlayerLabel.textContent = `I — Elements / ${button.dataset.releaseId}`;
    worldPlayer.showModal();
  });
});

worldCloseButton?.addEventListener('click', () => {
  stopWorld();
  worldPlayer?.close();
});
worldPlayer?.addEventListener('close', stopWorld);
worldPlayer?.addEventListener('click', (event) => {
  if (event.target === worldPlayer) worldPlayer.close();
});
