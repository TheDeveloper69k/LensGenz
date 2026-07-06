-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query) once per project.
-- Express uses the service-role key for all DB access, so Row Level Security stays off;
-- Express is the sole authorization layer (see server/middleware/auth.js and admin.js).

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('article', 'gallery', 'magazine', 'other')),
  title text not null,
  description text,
  body_html text,
  category text,
  cover_image_url text,
  file_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0
);

create index if not exists posts_status_idx on posts(status);
create index if not exists posts_type_idx on posts(type);
create index if not exists posts_author_idx on posts(author_id);
create index if not exists post_images_post_idx on post_images(post_id);

-- Storage: create a bucket named "content" (Storage -> New bucket) and mark it Public,
-- so uploaded covers/PDFs/gallery images are viewable via their public URL.
