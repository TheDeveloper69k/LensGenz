const express = require('express');
const { supabase } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/stats', async (req, res) => {
  const [{ count: pending }, { count: approved }, { count: rejected }, { count: users }] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);
  res.json({ pending, approved, rejected, users });
});

router.get('/posts', async (req, res) => {
  const { status = 'pending' } = req.query;
  const { data, error } = await supabase
    .from('posts')
    .select('*, post_images(id, image_url, sort_order), profiles(display_name, email)')
    .eq('status', status)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/posts/:id/approve', async (req, res) => {
  const { data, error } = await supabase
    .from('posts')
    .update({ status: 'approved', rejection_reason: null, approved_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/posts/:id/reject', async (req, res) => {
  const { reason } = req.body;
  const { data, error } = await supabase
    .from('posts')
    .update({ status: 'rejected', rejection_reason: reason || 'No reason given', approved_at: null })
    .eq('id', req.params.id)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/posts/:id', async (req, res) => {
  const { error } = await supabase.from('posts').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

router.get('/users', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (req.params.id === req.profile.id && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot demote yourself' });
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', req.params.id)
    .select('id, email, display_name, role')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
