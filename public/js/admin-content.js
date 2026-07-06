(async function () {
  await LG.requireAdmin();
  const listEl = document.getElementById('contentList');
  const tabs = document.getElementById('statusTabs');
  let status = 'approved';

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    tabs.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    status = btn.dataset.status;
    load();
  });

  async function load() {
    listEl.innerHTML = '<div class="skeleton" style="height:200px"></div>';
    try {
      const posts = await LG.api(`/api/admin/posts?status=${status}`);
      render(posts);
    } catch (err) {
      listEl.innerHTML = `<div class="empty-state">${LG.escapeHtml(err.message)}</div>`;
    }
  }

  function render(posts) {
    if (!posts.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>No ${status} content.</p></div>`;
      return;
    }
    const rows = posts
      .map((p) => {
        const meta = LG.TYPE_META[p.type] || LG.TYPE_META.other;
        return `
        <tr>
          <td><strong>${LG.escapeHtml(p.title)}</strong></td>
          <td>${meta.glyph} ${meta.label}</td>
          <td>${LG.escapeHtml(p.profiles?.display_name || 'Unknown')}</td>
          <td>${LG.formatDate(p.created_at)}</td>
          <td>
            <div class="row-actions">
              <a class="btn btn-sm btn-ghost" href="${meta.href}?id=${p.id}" target="_blank">View</a>
              ${status === 'approved' ? `<button class="btn btn-sm btn-outline" data-unpublish="${p.id}">Unpublish</button>` : ''}
              <button class="btn btn-sm btn-danger" data-delete="${p.id}">Delete</button>
            </div>
          </td>
        </tr>`;
      })
      .join('');

    listEl.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Title</th><th>Type</th><th>Author</th><th>Date</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;

    listEl.querySelectorAll('[data-unpublish]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Unpublish this post? It will move to Rejected and disappear from the public site.')) return;
        btn.disabled = true;
        try {
          await LG.api(`/api/admin/posts/${btn.dataset.unpublish}/reject`, { method: 'POST', body: { reason: 'Unpublished by admin' } });
          load();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      })
    );

    listEl.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Permanently delete this post?')) return;
        btn.disabled = true;
        try {
          await LG.api(`/api/admin/posts/${btn.dataset.delete}`, { method: 'DELETE' });
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
