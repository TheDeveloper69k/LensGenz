(async function () {
  await LG.requireAuth();

  const editId = new URLSearchParams(window.location.search).get('id');
  const form = document.getElementById('submitForm');
  const msg = document.getElementById('formMsg');
  const submitBtn = document.getElementById('submitBtn');
  const typeSelector = document.getElementById('typeSelector');
  let selectedType = 'article';

  const quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Write your story…',
    modules: {
      toolbar: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline', 'blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
    },
  });

  function selectType(type) {
    selectedType = type;
    typeSelector.querySelectorAll('.type-option').forEach((el) => el.classList.toggle('selected', el.dataset.type === type));
    document.querySelectorAll('#typeFields [data-for]').forEach((el) => {
      el.style.display = el.dataset.for === type ? 'block' : 'none';
    });
  }

  typeSelector.addEventListener('click', (e) => {
    const opt = e.target.closest('.type-option');
    if (opt) selectType(opt.dataset.type);
  });

  // ---- Dropzones ----
  function wireDropzone(dropEl, inputEl, previewEl, { multiple = false, existingChip = null } = {}) {
    let files = [];

    function render() {
      const chips = files.map(
        (f, i) => `<div class="file-chip" data-idx="${i}">📄 ${LG.escapeHtml(f.name)} <button type="button" data-remove="${i}">✕</button></div>`
      );
      previewEl.innerHTML = (existingChip ? existingChip() : '') + chips.join('');
      previewEl.querySelectorAll('[data-remove]').forEach((btn) => {
        btn.addEventListener('click', () => {
          files.splice(Number(btn.dataset.remove), 1);
          render();
        });
      });
    }

    dropEl.addEventListener('click', () => inputEl.click());
    inputEl.addEventListener('change', () => {
      const picked = Array.from(inputEl.files || []);
      files = multiple ? files.concat(picked) : picked;
      render();
    });
    ['dragover', 'dragleave', 'drop'].forEach((evt) =>
      dropEl.addEventListener(evt, (e) => {
        e.preventDefault();
        dropEl.classList.toggle('drag', evt === 'dragover');
      })
    );
    dropEl.addEventListener('drop', (e) => {
      const dropped = Array.from(e.dataTransfer.files || []);
      files = multiple ? files.concat(dropped) : dropped;
      render();
    });

    return { getFiles: () => files, render };
  }

  const cover = wireDropzone(document.getElementById('coverDrop'), document.getElementById('coverInput'), document.getElementById('coverPreview'));
  const images = wireDropzone(document.getElementById('imagesDrop'), document.getElementById('imagesInput'), document.getElementById('imagesPreview'), { multiple: true });
  const pdfFile = wireDropzone(document.getElementById('fileDrop'), document.getElementById('fileInput'), document.getElementById('filePreview'));
  const otherFile = wireDropzone(document.getElementById('otherDrop'), document.getElementById('otherInput'), document.getElementById('otherPreview'));

  // ---- Edit mode: prefill ----
  if (editId) {
    submitBtn.textContent = 'Save Changes';
    document.querySelector('h1').textContent = 'Edit Submission';
    try {
      const post = await LG.api(`/api/posts/${editId}`);
      if (post.status === 'approved') {
        msg.innerHTML = '<div class="form-error">Approved posts cannot be edited.</div>';
        form.style.display = 'none';
        return;
      }
      selectType(post.type);
      form.title.value = post.title;
      form.description.value = post.description || '';
      form.category.value = post.category || '';
      if (post.body_html) quill.root.innerHTML = post.body_html;
      if (post.rejection_reason) {
        msg.innerHTML = `<div class="rejection-note">Previously rejected: ${LG.escapeHtml(post.rejection_reason)}. Editing will resubmit for review.</div>`;
      }
    } catch (err) {
      msg.innerHTML = `<div class="form-error">${err.message}</div>`;
      form.style.display = 'none';
      return;
    }
  } else {
    selectType('article');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.innerHTML = '';

    if (selectedType === 'magazine' && !pdfFile.getFiles().length && !editId) {
      msg.innerHTML = '<div class="form-error">Please attach a PDF for your magazine.</div>';
      return;
    }
    if (selectedType === 'gallery' && !images.getFiles().length && !editId) {
      msg.innerHTML = '<div class="form-error">Please add at least one image for your gallery.</div>';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting…';

    const fd = new FormData();
    fd.set('type', selectedType);
    fd.set('title', form.title.value);
    fd.set('description', form.description.value);
    fd.set('category', form.category.value);
    if (selectedType === 'article' || selectedType === 'other') fd.set('bodyHtml', quill.root.innerHTML);

    if (cover.getFiles()[0]) fd.set('cover', cover.getFiles()[0]);
    if (selectedType === 'magazine' && pdfFile.getFiles()[0]) fd.set('file', pdfFile.getFiles()[0]);
    if (selectedType === 'other' && otherFile.getFiles()[0]) fd.set('file', otherFile.getFiles()[0]);
    if (selectedType === 'gallery') images.getFiles().forEach((f) => fd.append('images', f));

    try {
      await LG.api(editId ? `/api/posts/${editId}` : '/api/posts', { method: editId ? 'PUT' : 'POST', body: fd });
      msg.innerHTML = '<div class="form-success">Submitted! Redirecting to your dashboard…</div>';
      setTimeout(() => (window.location.href = '/dashboard.html'), 1200);
    } catch (err) {
      msg.innerHTML = `<div class="form-error">${err.message}</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? 'Save Changes' : 'Submit for Review';
    }
  });
})();
