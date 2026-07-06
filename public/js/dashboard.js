(async function () {
  const profile = await LG.requireAuth();
  document.getElementById('welcomeTitle').textContent = `Welcome back, ${profile.display_name}`;

  const listEl = document.getElementById('mySubmissions');
  listEl.innerHTML = '<div class="skeleton" style="height:220px"></div>';

  try {
    const posts = await LG.api('/api/posts/mine');
    renderStats(posts);
    renderTable(posts);
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state">Couldn't load your submissions.</div>`;
  }

  function renderStats(posts) {
    const count = (s) => posts.filter((p) => p.status === s).length;
    document.getElementById('statPending').textContent = count('pending');
    document.getElementById('statApproved').textContent = count('approved');
    document.getElementById('statRejected').textContent = count('rejected');
    document.getElementById('statTotal').textContent = posts.length;
  }

  function renderTable(posts) {
    if (!posts.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="icon">📝</div><p>You haven't submitted anything yet.</p><a href="/submit.html" class="btn btn-primary" style="margin-top:14px">Submit your first piece</a></div>`;
      return;
    }

    const rows = posts
      .map((p) => {
        const meta = LG.TYPE_META[p.type] || LG.TYPE_META.other;
        const canEdit = p.status !== 'approved';
        const canView = p.status === 'approved';
        return `
        <tr>
          <td><strong>${LG.escapeHtml(p.title)}</strong>${p.status === 'rejected' && p.rejection_reason ? `<div class="rejection-note">${LG.escapeHtml(p.rejection_reason)}</div>` : ''}</td>
          <td>${meta.glyph} ${meta.label}</td>
          <td><span class="badge badge-${p.status}">${p.status}</span></td>
          <td>${LG.formatDate(p.created_at)}</td>
          <td>
            <div class="row-actions">
              ${canView ? `<a class="btn btn-sm btn-ghost" href="${meta.href}?id=${p.id}">View</a>` : ''}
              ${canEdit ? `<a class="btn btn-sm btn-outline" href="/edit-submission.html?id=${p.id}">Edit</a>` : ''}
              <button class="btn btn-sm btn-danger" data-delete="${p.id}">Delete</button>
            </div>
          </td>
        </tr>`;
      })
      .join('');

    listEl.innerHTML = `
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    listEl.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this submission permanently?')) return;
        btn.disabled = true;
        try {
          await LG.api(`/api/posts/${btn.dataset.delete}`, { method: 'DELETE' });
          const posts = await LG.api('/api/posts/mine');
          renderStats(posts);
          renderTable(posts);
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      });
    });
  }
})();
