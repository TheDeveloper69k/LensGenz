(async function () {
  const id = new URLSearchParams(window.location.search).get('id');
  const root = document.getElementById('postRoot');
  if (!id) { root.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>No post specified.</p></div>`; return; }

  root.innerHTML = `<div class="skeleton" style="aspect-ratio:16/7;border-radius:var(--radius-lg);margin-bottom:32px"></div><div class="skeleton" style="height:14px;width:120px;margin-bottom:14px"></div><div class="skeleton" style="height:36px;width:70%;margin-bottom:14px"></div><div class="skeleton" style="height:16px;width:200px;margin-bottom:36px"></div>`;

  try {
    const post = await LG.api(`/api/posts/${id}`, { auth: true }).catch(() => LG.api(`/api/posts/${id}`, { auth: false }));
    document.title = `${post.title} — LensGenz`;
    renderPost(post);
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><div class="icon">🚫</div><p>${LG.escapeHtml(err.message || "This post isn't available.")}</p><a href="/explore.html" class="btn btn-outline" style="margin-top:14px">Back to Explore</a></div>`;
  }

  function statusBanner(post) {
    if (post.status === 'approved') return '';
    if (post.status === 'pending') return `<div class="form-error" style="background:#fbeed9;color:var(--amber)">This post is awaiting review and is only visible to you.</div>`;
    return `<div class="form-error">Rejected — ${LG.escapeHtml(post.rejection_reason || 'no reason given')}. Only visible to you.</div>`;
  }

  function renderPost(post) {
    const meta = LG.TYPE_META[post.type] || LG.TYPE_META.other;
    const author = post.profiles?.display_name || 'Contributor';
    const cover = post.cover_image_url
      ? `<img src="${LG.escapeHtml(post.cover_image_url)}" alt="${LG.escapeHtml(post.title)}" style="width:100%;height:100%;object-fit:cover" />`
      : `<div style="width:100%;height:100%;background:${LG.placeholderCover(post.id)}"></div>`;

    let body = '';
    if (post.type === 'article' || (post.type === 'other' && post.body_html)) {
      body = `<div class="prose page-in">${post.body_html || '<p>' + LG.escapeHtml(post.description || '') + '</p>'}</div>`;
    } else if (post.type === 'gallery') {
      const images = (post.post_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
      body = `<div class="grid grid-3 reveal-stagger" id="galleryImages">${images
        .map((img) => `<a class="card" href="${img.image_url}" target="_blank" rel="noopener"><div class="card-media" style="aspect-ratio:1/1"><img src="${LG.escapeHtml(img.image_url)}" loading="lazy" /></div></a>`)
        .join('')}</div>`;
      if (!images.length) body = `<p class="muted">No images were uploaded for this gallery.</p>`;
    } else if (post.type === 'magazine') {
      body = `
        <div class="page-in" style="background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
          ${post.file_url ? `<iframe src="${LG.escapeHtml(post.file_url)}" style="width:100%;height:70vh;border:none" title="${LG.escapeHtml(post.title)}"></iframe>` : '<p class="muted" style="padding:24px">No file uploaded.</p>'}
        </div>
        ${post.file_url ? `<a href="${LG.escapeHtml(post.file_url)}" download class="btn btn-primary" style="margin-top:20px">Download PDF</a>` : ''}`;
    } else {
      body = `<p class="page-in">${LG.escapeHtml(post.description || '')}</p>${post.file_url ? `<a href="${LG.escapeHtml(post.file_url)}" class="btn btn-outline" style="margin-top:10px">View attachment</a>` : ''}`;
    }

    root.innerHTML = `
      ${statusBanner(post)}
      <div class="card-media page-in" style="aspect-ratio:16/7;border-radius:var(--radius-lg);margin-bottom:32px;box-shadow:var(--shadow)">
        ${cover}
        <span class="type-tag">${meta.glyph} ${meta.label}</span>
      </div>
      <p class="eyebrow page-in">${LG.escapeHtml(post.category || meta.label)}</p>
      <h1 class="page-in">${LG.escapeHtml(post.title)}</h1>
      <div class="page-in" style="display:flex;gap:16px;align-items:center;color:var(--charcoal-soft);font-size:0.9rem;margin-bottom:36px">
        <span class="avatar-pill"><span class="dot">${(author[0] || 'U').toUpperCase()}</span>${LG.escapeHtml(author)}</span>
        <span>${LG.formatDate(post.approved_at || post.created_at)}</span>
      </div>
      ${body}
      <div style="margin-top:56px;padding-top:32px;border-top:1px solid var(--border)">
        <a href="/explore.html" class="btn btn-ghost">← Back to Explore</a>
      </div>`;

    LG.observeReveals(root);
  }
})();
