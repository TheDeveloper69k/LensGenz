const express = require('express');
const multer = require('multer');
const sanitizeHtml = require('sanitize-html');
const { randomUUID } = require('crypto');
const { supabase, STORAGE_BUCKET } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 12 },
  fileFilter(req, file, cb) {
    if (file.fieldname === 'cover' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('Cover must be an image'));
    }
    if (file.fieldname === 'file' && file.mimetype !== 'application/pdf') {
      return cb(new Error('Magazine file must be a PDF'));
    }
    if (file.fieldname === 'images' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('Gallery images must be images'));
    }
    cb(null, true);
  },
});

const SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'blockquote',
    'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'span',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
    span: ['class'],
  },
  allowedSchemes: ['http', 'https', 'data'],
};

async function uploadBuffer(file, folder) {
  const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
  const path = `${folder}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const uploadFields = upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'images', maxCount: 10 },
]);

// ---- Public reads ----

router.get('/', async (req, res) => {
  const { type, category, q, page = 1, limit = 12 } = req.query;
  const from = (Number(page) - 1) * Number(limit);
  const to = from + Number(limit) - 1;

  let query = supabase
    .from('posts')
    .select('id, type, title, description, category, cover_image_url, author_id, created_at, approved_at, profiles(display_name)', { count: 'exact' })
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .range(from, to);

  if (type) query = query.eq('type', type);
  if (category) query = query.eq('category', category);
  if (q) query = query.ilike('title', `%${q}%`);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ posts: data, total: count });
});

router.get('/featured', async (req, res) => {
  const types = ['article', 'gallery', 'magazine'];
  const results = {};
  for (const type of types) {
    const { data } = await supabase
      .from('posts')
      .select('id, type, title, description, category, cover_image_url, approved_at, profiles(display_name)')
      .eq('status', 'approved')
      .eq('type', type)
      .order('approved_at', { ascending: false })
      .limit(4);
    results[type] = data || [];
  }
  res.json(results);
});

router.get('/mine', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, post_images(id, image_url, sort_order)')
    .eq('author_id', req.profile.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, post_images(id, image_url, sort_order), profiles(display_name, avatar_url)')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Post not found' });

  if (data.status !== 'approved') {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(404).json({ error: 'Post not found' });
    const { data: userData } = await supabase.auth.getUser(token);
    const isOwner = userData?.user?.id === data.author_id;
    if (!isOwner) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData?.user?.id).single();
      if (profile?.role !== 'admin') return res.status(404).json({ error: 'Post not found' });
    }
  }

  res.json(data);
});

// ---- Authenticated writes ----

router.post('/', requireAuth, uploadFields, async (req, res) => {
  try {
    const { type, title, description, category, bodyHtml } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'type and title are required' });
    if (!['article', 'gallery', 'magazine', 'other'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const files = req.files || {};
    let coverUrl = null;
    let fileUrl = null;

    if (files.cover?.[0]) coverUrl = await uploadBuffer(files.cover[0], 'covers');
    if (files.file?.[0]) fileUrl = await uploadBuffer(files.file[0], 'files');

    if (type === 'magazine' && !fileUrl) {
      return res.status(400).json({ error: 'A PDF file is required for magazine submissions' });
    }
    if (type === 'gallery' && !(files.images?.length)) {
      return res.status(400).json({ error: 'At least one image is required for gallery submissions' });
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        author_id: req.profile.id,
        type,
        title,
        description: description || null,
        category: category || null,
        body_html: bodyHtml ? sanitizeHtml(bodyHtml, SANITIZE_OPTIONS) : null,
        cover_image_url: coverUrl,
        file_url: fileUrl,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (files.images?.length) {
      const urls = await Promise.all(files.images.map((f) => uploadBuffer(f, 'gallery')));
      const rows = urls.map((url, i) => ({ post_id: post.id, image_url: url, sort_order: i }));
      await supabase.from('post_images').insert(rows);
    }

    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, uploadFields, async (req, res) => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.author_id !== req.profile.id) return res.status(403).json({ error: 'Not your post' });
    if (existing.status === 'approved') {
      return res.status(400).json({ error: 'Approved posts cannot be edited' });
    }

    const { title, description, category, bodyHtml } = req.body;
    const updates = {
      status: 'pending',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    };
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (bodyHtml !== undefined) updates.body_html = sanitizeHtml(bodyHtml, SANITIZE_OPTIONS);

    const files = req.files || {};
    if (files.cover?.[0]) updates.cover_image_url = await uploadBuffer(files.cover[0], 'covers');
    if (files.file?.[0]) updates.file_url = await uploadBuffer(files.file[0], 'files');

    const { data: updated, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (files.images?.length) {
      const urls = await Promise.all(files.images.map((f) => uploadBuffer(f, 'gallery')));
      const rows = urls.map((url, i) => ({ post_id: updated.id, image_url: url, sort_order: i }));
      await supabase.from('post_images').insert(rows);
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { data: existing, error: fetchError } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !existing) return res.status(404).json({ error: 'Post not found' });
  if (existing.author_id !== req.profile.id && req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Not your post' });
  }

  const { error } = await supabase.from('posts').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

router.delete('/:id/images/:imageId', requireAuth, async (req, res) => {
  const { data: existing, error: fetchError } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !existing) return res.status(404).json({ error: 'Post not found' });
  if (existing.author_id !== req.profile.id) return res.status(403).json({ error: 'Not your post' });

  const { error } = await supabase.from('post_images').delete().eq('id', req.params.imageId).eq('post_id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

module.exports = router;
