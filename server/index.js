require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const postsRouter = require('./routes/posts');
const profileRouter = require('./routes/profile');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  helmet({
    // relaxed for the CDN scripts/fonts (Supabase JS, Quill, Google Fonts) and cross-origin
    // Supabase Storage images/PDFs the plain-JS frontend loads directly.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use('/api/posts', (req, res, next) => (req.method === 'GET' ? next() : writeLimiter(req, res, next)));

app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  });
});

app.use('/api/posts', postsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRouter);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') return res.status(400).json({ error: err.message });
  if (err) return res.status(500).json({ error: err.message || 'Server error' });
  next();
});

app.listen(PORT, () => {
  console.log(`LensGenz server running at http://localhost:${PORT}`);
});
