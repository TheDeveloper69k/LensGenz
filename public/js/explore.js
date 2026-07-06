(function () {
  const grid = document.getElementById('resultsGrid');
  const tabs = document.getElementById('typeTabs');
  const chips = document.getElementById('categoryChips');
  const search = document.getElementById('searchInput');
  const loadMoreWrap = document.getElementById('loadMoreWrap');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  const params = new URLSearchParams(window.location.search);
  let state = { type: params.get('type') || '', category: params.get('category') || '', q: params.get('q') || '', page: 1 };
  const LIMIT = 12;
  let allPosts = [];

  if (state.type) {
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.type === state.type));
  }
  if (state.q) search.value = state.q;

  function renderChips() {
    const allChip = `<button class="category-chip${state.category ? '' : ' active'}" data-category="">✨ All Categories</button>`;
    const catChips = LG.CATEGORIES.map(
      (c) => `<button class="category-chip${state.category === c.key ? ' active' : ''}" data-category="${c.key}" style="--chip-accent:${c.accent}">${c.icon} ${c.key}</button>`
    ).join('');
    chips.innerHTML = allChip + catChips;
  }

  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-chip');
    if (!btn) return;
    state.category = btn.dataset.category;
    chips.querySelectorAll('.category-chip').forEach((b) => b.classList.toggle('active', b === btn));
    LG.applyCategoryTheme(state.category);
    load(true);
  });

  async function load(reset) {
    if (reset) { state.page = 1; allPosts = []; LG.skeletonCards(grid, 8); }
    const qs = new URLSearchParams({ page: state.page, limit: LIMIT });
    if (state.type) qs.set('type', state.type);
    if (state.category) qs.set('category', state.category);
    if (state.q) qs.set('q', state.q);

    try {
      const { posts, total } = await LG.api(`/api/posts?${qs}`, { auth: false });
      allPosts = reset ? posts : allPosts.concat(posts);
      LG.renderCards(grid, allPosts, 'Nothing matches yet — try a different filter or be the first to submit.');
      loadMoreWrap.style.display = allPosts.length < total ? 'block' : 'none';
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Couldn't load results.</div>`;
    }
  }

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    tabs.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.type = btn.dataset.type;
    load(true);
  });

  let searchTimer;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = search.value.trim(); load(true); }, 350);
  });

  loadMoreBtn.addEventListener('click', () => { state.page += 1; load(false); });

  renderChips();
  LG.applyCategoryTheme(state.category);
  load(true);
})();
