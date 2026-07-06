(async function () {
  await LG.requireAdmin();
  const listEl = document.getElementById('queueList');
  listEl.innerHTML = '<div class="skeleton" style="height:120px;margin-bottom:16px"></div><div class="skeleton" style="height:120px"></div>';

  async function load() {
    try {
      const posts = await LG.api('/api/admin/posts?status=pending');
      render(posts);
    } catch (err) {
      listEl.innerHTML = `<div class="empty-state">${LG.escapeHtml(err.message)}</div>`;
    }
  }

  function render(posts) {
    if (!posts.length) {
      listEl.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>The queue is empty — nice work.</p></div>';
      return;
    }

    listEl.innerHTML = posts
      .map((p) => {
        const meta = LG.TYPE_META[p.type] || LG.TYPE_META.other;
        const extra =
          p.type === 'gallery'
            ? `${(p.post_images || []).length} image(s)`
            : p.type === 'magazine'
            ? p.file_url ? `<a href="${LG.escapeHtml(p.file_url)}" target="_blank" rel="noopener">View PDF ↗</a>` : 'No file'
            : (p.description || '').slice(0, 120);

        return `
        <div class="review-card" data-id="${p.id}">
          <div class="thumb">${p.cover_image_url ? `<img src="${LG.escapeHtml(p.cover_image_url)}" />` : ''}</div>
          <div>
            <span class="badge badge-pending" style="margin-bottom:6px">${meta.label}</span>
            <h3 style="margin-bottom:4px">${LG.escapeHtml(p.title)}</h3>
            <div class="meta-line">By ${LG.escapeHtml(p.profiles?.display_name || 'Unknown')} (${LG.escapeHtml(p.profiles?.email || '')}) · ${LG.formatDate(p.created_at)}</div>
            <div class="meta-line">${extra}</div>
          </div>
          <div class="review-actions">
            <a href="${meta.href}?id=${p.id}" target="_blank" class="btn btn-sm btn-ghost">Preview</a>
            <button class="btn btn-sm btn-primary" data-approve="${p.id}">Approve</button>
            <button class="btn btn-sm btn-danger" data-reject="${p.id}">Reject</button>
          </div>
        </div>`;
      })
      .join('');

    listEl.querySelectorAll('[data-approve]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await LG.api(`/api/admin/posts/${btn.dataset.approve}/approve`, { method: 'POST' });
          load();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      })
    );

    listEl.querySelectorAll('[data-reject]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const reason = prompt('Reason for rejecting this submission (shown to the author):');
        if (reason === null) return;
        btn.disabled = true;
        try {
          await LG.api(`/api/admin/posts/${btn.dataset.reject}/reject`, { method: 'POST', body: { reason } });
          load();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      })
    );
  }

  load();
})();
