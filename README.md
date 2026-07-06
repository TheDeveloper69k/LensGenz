# LensGenz

A community publishing platform: members submit articles, photo galleries, and PDF
magazines; admins review each submission; approved work is published for everyone
to read.

- **Frontend**: plain HTML/CSS/JS, no build step (served as static files by Express).
- **Backend**: Node.js + Express.
- **Database / Auth / Storage**: Supabase (Postgres + Auth + Storage).

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In **Project Settings → API**, copy the **Project URL**, the **anon public** key,
   and the **service_role** key (keep this one secret).
3. In **SQL Editor**, paste and run the contents of [server/db/schema.sql](server/db/schema.sql).
4. In **Storage**, create a new bucket named `content` and mark it **Public**.
5. In **Authentication → Providers**, make sure **Email** is enabled. For local
   testing you can turn off "Confirm email" under Authentication → Settings so
   new accounts can log in immediately.
6. In **Authentication → URL Configuration**, add `http://localhost:3000/reset-password.html`
   (and your production URL's equivalent once deployed) to **Redirect URLs** —
   otherwise the "forgot password" email link will be rejected by Supabase.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from
step 1. Leave `SUPABASE_STORAGE_BUCKET` as `content` unless you named the bucket
something else.

## 3. Install and run

```bash
npm install
npm run dev      # nodemon, auto-restarts on changes
# or: npm start
```

Visit `http://localhost:3000`.

## 4. Create your first admin

Sign up for a normal account through the site first (`/signup.html`), then
promote it:

```bash
npm run create-admin -- you@example.com
```

Log out and back in — the nav will now show an **Admin** link to
`/admin/index.html`.

## How it works

- Users sign up/log in via Supabase Auth in the browser. Every authenticated
  request to our own API carries a `Bearer` token that Express verifies
  server-side (`server/middleware/auth.js`) — the browser never talks to
  Postgres directly.
- Submitting a post (`/submit.html`) uploads files through Express (`multer`)
  to Supabase Storage, sanitizes any rich-text HTML, and inserts a `posts` row
  with `status = 'pending'`.
- Admins review the queue at `/admin/queue.html` and approve or reject
  (with a reason) each submission. Only `approved` posts show up on the
  public site (`/`, `/explore.html`).
- Users manage their own submissions — including editing and resubmitting a
  rejected one — from `/dashboard.html`.
- `/forgot-password.html` triggers Supabase's password-reset email; the link
  it sends lands on `/reset-password.html`, which detects the recovery
  session and lets the user set a new password.

## Project layout

```
server/           Express app, routes, Supabase client, DB schema
scripts/          create-admin.js — promote a user to admin by email
public/           Static frontend (plain HTML/CSS/JS)
  css/            style.css (design system), dashboard.css (dashboard layout)
  js/             shared client-side modules (api calls, auth, cards, forms)
  admin/          admin dashboard pages
```
