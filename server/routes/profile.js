const express = require('express');
const { supabase } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Called once after signup/login to make sure a profiles row exists.
router.post('/sync', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired token' });

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (existing) return res.json(existing);

  const displayName =
    req.body.displayName || data.user.email?.split('@')[0] || 'Member';

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, email: data.user.email, display_name: displayName })
    .select('*')
    .single();

  if (insertError) return res.status(500).json({ error: insertError.message });
  res.status(201).json(created);
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.profile);
});

router.put('/me', requireAuth, async (req, res) => {
  const { displayName, avatarUrl } = req.body;
  const updates = {};
  if (displayName) updates.display_name = displayName;
  if (avatarUrl) updates.avatar_url = avatarUrl;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', req.profile.id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
