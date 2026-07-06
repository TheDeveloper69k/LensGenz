// One-off helper: creates a "LensGenz Editorial" demo author (if needed) and a
// handful of approved sample posts so the home/explore pages have content to show.
// Safe to re-run — it skips seeding if sample posts already exist.
require('dotenv').config();
const { supabase } = require('../server/lib/supabase');

const SEED_EMAIL = 'editorial@lensgenz.local';

const cover = (seed) => `https://picsum.photos/seed/${seed}/900/700`;

const SAMPLE_POSTS = [
  {
    type: 'article',
    title: 'The Alchemy of a Slow Morning',
    description: 'Why the first unhurried hour of the day changes everything that follows.',
    category: 'Lifestyle',
    cover_image_url: cover('lg-morning'),
    body_html:
      '<p>There is a particular kind of light that only exists before 8am — softer, more forgiving, uninterested in your inbox.</p>' +
      '<h2>Start before you\'re ready</h2>' +
      '<p>Most mornings we rush into the day fully armed with plans. But the mornings worth remembering are the ones we let arrive slowly: tea steeping a minute too long, a window cracked open, no phone in reach.</p>' +
      '<blockquote>Slowness is not the absence of ambition. It is the presence of attention.</blockquote>' +
      '<p>Try it tomorrow — five extra minutes before anything else begins.</p>',
  },
  {
    type: 'article',
    title: '76 Real Luxuries No One Can Take From You',
    description: 'A running list of the small, free, extraordinary things worth noticing.',
    category: 'Wellness',
    cover_image_url: cover('lg-luxuries'),
    body_html:
      '<p>Not all luxury comes with a price tag. Some of it just requires paying attention.</p>' +
      '<ul><li>The smell of rain before it lands</li><li>A text back within the hour</li><li>Finding a song you forgot you loved</li><li>Silence that isn\'t awkward</li></ul>' +
      '<p>What would you add to this list?</p>',
  },
  {
    type: 'article',
    title: 'How to Feel Soft in a Hard World',
    description: 'A gentle argument for staying tender even when it would be easier not to.',
    category: 'Culture',
    cover_image_url: cover('lg-soft'),
    body_html:
      '<p>Cynicism is easy. It asks nothing of you. Softness, on the other hand, takes real courage — it means staying open after you\'ve had every reason to close.</p>' +
      '<h3>Three small practices</h3><p>Say thank you out loud. Let yourself be moved by something small. Ask a real question and wait for the real answer.</p>',
  },
  {
    type: 'gallery',
    title: 'The Summer of Orange',
    description: 'A photo series chasing the last warm light of the season.',
    category: 'Photography',
    cover_image_url: cover('lg-orange-cover'),
    images: [cover('lg-orange-1'), cover('lg-orange-2'), cover('lg-orange-3'), cover('lg-orange-4')],
  },
  {
    type: 'gallery',
    title: 'Summertime Reveries',
    description: 'Quiet afternoons, open windows, and everything in between.',
    category: 'Travel',
    cover_image_url: cover('lg-reveries-cover'),
    images: [cover('lg-reveries-1'), cover('lg-reveries-2'), cover('lg-reveries-3')],
  },
  {
    type: 'magazine',
    title: 'LensGenz Issue No. 1 — A Season of Slow Pages',
    description: 'Our very first community issue: stories, photo essays, and the people behind them.',
    category: 'Culture',
    cover_image_url: cover('lg-issue-1'),
  },
];

async function ensureSeedAuthor() {
  const { data: existing } = await supabase.from('profiles').select('*').eq('email', SEED_EMAIL).single();
  if (existing) return existing;

  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email: SEED_EMAIL,
    password: `seed-${Math.random().toString(36).slice(2)}-${Date.now()}`,
    email_confirm: true,
  });
  if (authError) throw new Error(`Could not create seed author: ${authError.message}`);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({ id: created.user.id, email: SEED_EMAIL, display_name: 'LensGenz Editorial' })
    .select('*')
    .single();
  if (profileError) throw new Error(`Could not create seed profile: ${profileError.message}`);
  return profile;
}

async function main() {
  const { data: alreadySeeded } = await supabase.from('posts').select('id').eq('title', SAMPLE_POSTS[0].title).limit(1);
  if (alreadySeeded && alreadySeeded.length) {
    console.log('Sample content already exists — skipping (delete those posts first if you want to reseed).');
    return;
  }

  const author = await ensureSeedAuthor();
  console.log(`Seeding as ${author.display_name} (${author.email})`);

  for (const post of SAMPLE_POSTS) {
    const { images, ...postFields } = post;
    const { data: inserted, error } = await supabase
      .from('posts')
      .insert({
        ...postFields,
        author_id: author.id,
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      console.error(`Failed to insert "${post.title}":`, error.message);
      continue;
    }

    if (images?.length) {
      const rows = images.map((image_url, i) => ({ post_id: inserted.id, image_url, sort_order: i }));
      await supabase.from('post_images').insert(rows);
    }

    console.log(`Created: ${post.title}`);
  }

  console.log('Done.');
}

main();
