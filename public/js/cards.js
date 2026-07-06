window.LG = window.LG || {};
LG.observeReveals = LG.observeReveals || function noopObserveReveals() {};

LG.TYPE_META = {
  article: { label: 'Article', glyph: '✎', href: '/article.html' },
  gallery: { label: 'Gallery', glyph: '⌗', href: '/gallery.html' },
  magazine: { label: 'Magazine', glyph: '▤', href: '/magazine.html' },
  other: { label: 'Feature', glyph: '✦', href: '/article.html' },
};

LG.escapeHtml = function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
};

LG.formatDate = function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

LG.placeholderCover = function placeholderCover(seed) {
  const hue = Array.from(String(seed || 'lg')).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(150deg, hsl(${hue},55%,72%), hsl(${(hue + 40) % 360},60%,60%))`;
};

LG.postCard = function postCard(post) {
  const meta = LG.TYPE_META[post.type] || LG.TYPE_META.other;
  const href = `${meta.href}?id=${post.id}`;
  const author = post.profiles?.display_name || 'Contributor';
  const cover = post.cover_image_url
    ? `<img src="${LG.escapeHtml(post.cover_image_url)}" alt="${LG.escapeHtml(post.title)}" loading="lazy" />`
    : `<div style="width:100%;height:100%;background:${LG.placeholderCover(post.id)}"></div>`;

  return `
    <a class="card" href="${href}">
      <div class="card-media">
        ${cover}
        <span class="type-tag">${meta.glyph} ${meta.label}</span>
      </div>
      <div class="card-body">
        <h3>${LG.escapeHtml(post.title)}</h3>
        <p>${LG.escapeHtml(post.description || '')}</p>
        <div class="card-meta">
          <span>${LG.escapeHtml(author)}</span>
          <span>${LG.formatDate(post.approved_at || post.created_at)}</span>
        </div>
      </div>
    </a>`;
};

LG.renderCards = function renderCards(container, posts, emptyMessage) {
  if (!container) return;
  if (!posts || !posts.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">🗒️</div><p>${LG.escapeHtml(emptyMessage || 'Nothing here yet.')}</p></div>`;
    return;
  }
  container.innerHTML = posts.map(LG.postCard).join('');
};

LG.skeletonCards = function skeletonCards(container, count = 4) {
  if (!container) return;
  container.innerHTML = Array.from({ length: count })
    .map(() => '<div class="skeleton" style="aspect-ratio:4/3.6"></div>')
    .join('');
};
