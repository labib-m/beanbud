# Bean Bud

A cafe notebook. Log visits with ratings, drinks and private notes, see friends' visits in a feed, and compare notes on cafes you've both been to.

Vite + React + TypeScript on the front end, Supabase (Postgres, Auth, one Edge Function) on the back end, deployed on Vercel. Accounts are a username and a PIN. There is no email anywhere in the app.

## Layout

| Folder | What's in it |
| --- | --- |
| `app/` | The web app (this is the folder Vercel builds) |
| `supabase/migrations/` | Database schema, security policies and functions, in order |
| `supabase/tests/` | SQL scripts that check the security policies, `save_visit()` and the PIN limiter, plus a Node test for the function's logic |
| `supabase/functions/` | Edge Function `pin-auth`: create account, sign in, change PIN, developer reset |
| `tools/` | `reset-pin.mjs`: give someone a temporary PIN |
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
6. `supabase/migrations/20260919000300_pin_attempts.sql`
7. `supabase/tests/pin_attempts_check.sql` (should end with `ALL CHECKS PASSED`)

## Sign-in setup

People create an account with a **username, a 4-digit PIN and an invite code**, and sign in with the username and PIN. It happens inside the app, so it works from an iPhone home-screen icon. There is no email, no SMTP and no reset link. (Supabase needs every account to have an email, so accounts get a made-up address like `u-…@users.beanbud.invalid` that can never receive mail. Nobody sees it.)

**1. Edge Function.** Create a function named exactly `pin-auth` and paste in `supabase/functions/pin-auth/index.ts`. Redeploy it whenever that file changes.

**Turn OFF "Verify JWT"** for this function (its settings, "Enforce JWT Verification"). Newer Supabase projects sign signed-in users' tokens with asymmetric keys (ES256), and the built-in gate only understands the older kind. It rejects them with `UNAUTHORIZED_ASYMMETRIC_JWT` before the function runs, so a signed-in person could never save a PIN. This is safe: the function does its own checks. Sign-in and sign-up are meant to be public, `set-pin` validates the caller's token with Supabase Auth, and `admin-reset-pin` needs the admin key.

**2. Secrets** (Edge Functions → Secrets). Three, all yours to keep safe:

| Secret | What it is |
| --- | --- |
| `PIN_PEPPER` | A long random string. It turns a PIN into the real password, so a guessed PIN is useless outside the function. **If it is lost or changed, every PIN stops working.** Keep a private backup. |
| `INVITE_CODE` | The phrase new people must type to create an account. Pick anything memorable, 8 or more characters. If it is not set, sign-up is closed. Change it any time to stop new sign-ups with the old one. |
| `ADMIN_KEY` | A long random string that lets you reset someone's PIN. If it is not set, resets are switched off. |

Generate the two random ones without displaying them (run each, then paste into Supabase):

```bash
openssl rand -hex 32 | pbcopy
```

**3. Switch off public sign-up.** Authentication → Sign In / Providers → turn OFF "Allow new users to sign up". This is essential. Without it, anyone holding the public key could create an account directly and skip the invite code. The function still creates accounts because it uses the admin API. Leave the Email provider itself enabled (PIN sign-in is built on it).

**4. Nothing else.** No SMTP, no email templates, no redirect URLs are needed.

### If someone forgets their PIN

They contact you. Reset it from your computer:

```bash
node tools/reset-pin.mjs theirusername
```

It asks for your `ADMIN_KEY` (typing is hidden), picks a random temporary PIN and prints it. Tell them privately. When they sign in with it, the app makes them choose their own straight away. For an older account with no username, use their email in place of the username.

### PIN security

- The PIN is never stored. It is turned into a long password with `PIN_PEPPER`, so it cannot be guessed by calling Supabase's login directly.
- Every guess goes through `pin-auth`, and each attempt is counted in the database before it is checked. 5 wrong tries lock that username for 15 minutes, doubling on each further lock up to 24 hours. Guessing the invite code (10 tries) and the admin key (5 tries) are throttled the same way.
- Wrong username and wrong PIN give the same answer.
- The PIN length is one constant in `supabase/functions/pin-auth/index.ts`, one in `app/src/data/auth.ts` and one in `tools/reset-pin.mjs` (`PIN_LENGTH`). Change all three together to use 6 digits.
- With no email there is no self-service recovery. That is the trade for having no email to send, land in spam or be rate-limited.

Run the function's logic tests with:

```bash
node --test supabase/tests/pin_auth.test.mjs
```

## Add to the iPhone home screen

Open the live site in Safari, tap Share, then **Add to Home Screen**. Open it from the new icon and create your account or sign in there. It stays signed in on that phone. If an older shortcut exists, delete it and add it again so it picks up the app icon and full-screen mode.

## How access works

- Everyone signed in can read cafes, visits, drinks and profiles.
- You can only create, edit or delete your own visits and drinks, and your own profile.
- Notes live in a separate table and only their owner can read them.
- Blocked updates and deletes change zero rows without raising an error, so the app checks how many rows changed.

## Deploy

**Vercel** (Project Settings):
- Root Directory: `app`
- Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Then complete the sign-in setup above.

The migrations were applied by hand in the SQL editor. If Supabase's GitHub integration is set to deploy migrations on push, turn that off or it will try to re-run them.
