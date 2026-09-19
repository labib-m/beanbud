# Bean Bud

A cafe notebook. Log visits with ratings, drinks and private notes, see friends' visits in a feed, and compare notes on cafes you've both been to.

Vite + React + TypeScript on the front end, Supabase (Postgres, Auth, one Edge Function) on the back end, deployed on Vercel.

## Layout

| Folder | What's in it |
| --- | --- |
| `app/` | The web app (this is the folder Vercel builds) |
| `supabase/migrations/` | Database schema, security policies and functions, in order |
| `supabase/tests/` | SQL scripts that check the security policies and `save_visit()` |
| `supabase/functions/` | Edge Function for signing in with a username |
| `design/` | Visual spec and screens |
| `beanbud.html` | The original single-file prototype, kept for reference |

## Run it locally

```bash
cd app
cp .env.example .env.local   # then fill in your Supabase URL and anon key
npm install
npm run dev
```

Open http://localhost:5173. Use the **anon** (public) key only. Never put the `service_role` key in the app, in `.env.local` or in Vercel.

## Database setup (once per Supabase project)

Run these in the Supabase SQL editor, in order, pasting each whole file:

1. `supabase/migrations/20260919000000_initial_schema.sql`
2. `supabase/tests/rls_check.sql` (should end with `ALL CHECKS PASSED`)
3. `supabase/migrations/20260919000100_save_visit.sql`
4. `supabase/tests/save_visit_check.sql` (should end with `ALL CHECKS PASSED`)
5. `supabase/migrations/20260919000200_profile_avatar.sql`

Then create an Edge Function named exactly `sign-in-with-username` and paste in `supabase/functions/sign-in-with-username/index.ts`. Leave JWT verification on.

### How access works

- Everyone signed in can read cafes, visits, drinks and profiles.
- You can only create, edit or delete your own visits and drinks, and your own profile.
- Notes live in a separate table and only their owner can read them.
- Blocked updates and deletes change zero rows without raising an error, so the app checks how many rows changed.

## Deploy

**Vercel** (Project Settings):
- Root Directory: `app`
- Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Supabase** (Authentication → URL Configuration):
- Site URL: your Vercel address
- Redirect URLs: `https://your-address.vercel.app/**` and `http://localhost:5173/**`

**Edge Function secret:** `ALLOWED_ORIGINS` = your Vercel address, with no trailing slash.

The migrations were applied by hand in the SQL editor. If Supabase's GitHub integration is set to deploy migrations on push, turn that off or it will try to re-run them.
