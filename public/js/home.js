(async function () {
  const articleGrid = document.getElementById('articleGrid');
  const galleryGrid = document.getElementById('galleryGrid');
  const magazineGrid = document.getElementById('magazineGrid');

  LG.skeletonCards(articleGrid);
  LG.skeletonCards(galleryGrid);
  LG.skeletonCards(magazineGrid);

  try {
    const featured = await LG.api('/api/posts/featured', { auth: false });
    LG.renderCards(articleGrid, featured.article, 'No articles published yet — be the first to submit one.');
    LG.renderCards(galleryGrid, featured.gallery, 'No galleries published yet.');
    LG.renderCards(magazineGrid, featured.magazine, 'No magazines published yet.');
  } catch (err) {
    [articleGrid, galleryGrid, magazineGrid].forEach((grid) => {
      if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Couldn't load content right now.</div>`;
    });
  }

  document.getElementById('newsletterForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const original = btn.textContent;
    btn.textContent = 'Subscribed!';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = original; btn.disabled = false; e.target.reset(); }, 2200);
  });
})();
