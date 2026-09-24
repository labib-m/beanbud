# Bean Bud

A cafe notebook. Log visits with ratings, drinks and private notes, see friends' visits in a feed, and compare notes on cafes you've both been to.

Vite + React + TypeScript on the front end, Supabase (Postgres, Auth, one Edge Function) on the back end, deployed on Vercel. Accounts are a username and a PIN. There is no email anywhere in the app.

## Layout

| Folder | What's in it |
| --- | --- |
| `app/` | The web app (this is the folder Vercel builds) |
| `supabase/migrations/` | Database schema, security policies and functions, in order |
| `supabase/tests/` | SQL scripts that check the security rules, `save_visit()`, the PIN limiter and the cafe directory; Node tests for the app's and function's logic |
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
2. `supabase/migrations/20260919000100_save_visit.sql`
3. `supabase/migrations/20260919000200_profile_avatar.sql`
4. `supabase/migrations/20260919000300_pin_attempts.sql`
5. `supabase/migrations/20260920000100_cafe_cleanup.sql`
6. `supabase/migrations/20260920000200_save_visit_cafe_edit.sql`
7. `supabase/migrations/20260920000300_cafe_directory.sql` (undoes 5 and 6, which were a stop-gap)
8. `supabase/migrations/20260920000400_save_visit_update_details.sql`
9. `supabase/migrations/20260922000100_push_subscriptions.sql` (needed for push notifications — see that section below)

Then run the checks in `supabase/tests/`. Each ends with `ALL CHECKS PASSED`. They test the **latest** rules, so run them after all the migrations: `rls_check.sql`, `save_visit_check.sql`, `pin_attempts_check.sql`, `cafe_directory_check.sql`, `save_visit_update_check.sql`.

## Cafes, the directory and page history

- **Every cafe is in the shared directory** and has its own page (`/cafes/<id>`), listed A to Z under Feed → Directory.
- **A new cafe needs an address and a map link** before the first visit there can be saved. Picking an existing cafe from the dropdown fills everything in, so later visits are quick.
- **Each cafe has a permanent readable code** such as `DOSE_DHA_BAN` (name, city, neighbourhood; a clash gets a number, e.g. `DOSE2_DHA_BAN`).
- **Anyone signed in can use "Edit cafe"** to change a cafe's address and map link (both must stay filled in). Name, city and neighbourhood identify the cafe and are fixed.
- **Correcting a cafe while logging a visit.** For an existing cafe the address and map link are pre-filled in the visit form and can be changed there. An emptied box never erases what is saved: it comes back, and if you save with it blank the visit still saves and the directory is untouched. A real change asks you to confirm before it updates the shared page ("Update the directory and save", "Save my visit only", or "Keep editing"); if you confirm, it is recorded in the cafe's page history under your name, and that visit is logged under the updated details.
- **Every edit is recorded** in the cafe's page history: who, when, old and new value. A database trigger writes it, so no code path can skip it. Clients cannot write, change or delete history.
- **Past entries never change.** Each visit remembers which version of the cafe's details it was logged under; new visits use the newest.
- **Cafes are never deleted** when their visits are, so the directory grows from what people log.
- **Every cafe has an overall star rating**, shown beside its name on its page: the average of every rated visit's overall score, from every person (a visit's own overall is the average of the criteria its author rated). Visits nobody rated are left out. The page also lists the latest **ratings** (rated drinks) and the latest logs.
- **Public notes** are an optional field on a visit, separate from the private note, and appear on the cafe's page.
- When you type a new cafe, the form suggests existing cafes with the same map link or a very similar name in the same city ("Is it one of these?"). It only suggests.

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

**New accounts get walked through this automatically.** Right after someone on an iPhone or iPad creates an account, a one-time pop-up (`app/src/components/AddToHomeScreenGuide.tsx`) shows the Share → Add to Home Screen steps and warns them they'll need to sign in again with their username and PIN the first time they open the new icon (a real limitation: a browser tab and a Home Screen icon are separate, unconnected sessions on iOS). It never shows to an existing person signing in, on Android or desktop, or a second time on the same device — the logic behind that is pure and tested in `app/src/lib/addToHomeScreen.ts` / `supabase/tests/add_to_home_screen.test.mjs`.

## Push notifications

When someone logs or edits a visit, everyone else who has turned notifications on gets a push: "*Name* logged *Cafe*", tapping it opens that cafe's page. It uses the open web-push standard, not Apple or Google's own notification service, so there is nothing to register with either company.

**Real constraints, not bugs:**
- On iPhone, this only works for someone who added the app to their **home screen** (iOS 16.4+) and tapped **Turn on** for notifications from inside it. Visiting the plain website in a Safari tab can never receive one — that's an Apple rule, not a Bean Bud setting.
- If someone deletes and re-adds the home-screen icon, or clears Safari's site data, they need to tap **Turn on** again.
- There's no reliable delivery receipt. A subscription the push service reports as gone (the person uninstalled, or it expired) is quietly forgotten; nothing retries it.

**Set it up once, in this order:**

**1. Generate a VAPID key pair** (the signature that proves a notification came from this app, not stored anywhere but Supabase and your own notes):

```bash
npx web-push generate-vapid-keys
```

It prints a **Public Key** and a **Private Key**. The public one is fine to share; paste it as `VITE_VAPID_PUBLIC_KEY` in `.env.local` (and in Vercel, see Deploy below). Keep the private one only for the next step — never put it in `.env.local`, Vercel, or anywhere in the app.

**2. Deploy the Edge Function.** Create a function named exactly `send-push` and paste in `supabase/functions/send-push/index.ts`. Redeploy it whenever that file changes. **Turn OFF "Verify JWT"** for it, same reason as `pin-auth`: the caller here is Supabase's own webhook, not a signed-in person, and the function checks its own secret instead (next step).

**3. Secrets** (Edge Functions → Secrets), four more:

| Secret | What it is |
| --- | --- |
| `VAPID_PUBLIC_KEY` | The public key from step 1 (yes, the same value as `VITE_VAPID_PUBLIC_KEY`). |
| `VAPID_PRIVATE_KEY` | The private key from step 1. **If it is lost, everyone has to turn notifications on again** — there's no recovering old subscriptions without it. |
| `VAPID_SUBJECT` | `mailto:` plus an email of yours. The push standard requires it; push services may use it to contact you if something's misbehaving. It is never shown to users. |
| `PUSH_WEBHOOK_SECRET` | A long random string (`openssl rand -hex 32 \| pbcopy`, same as the others). Proves the request calling this function really is your database, not a stranger who found the URL. |

**4. Database Webhooks** (Database → Webhooks → Create a new hook) — up to **four** of these (each optional), all pointed at the same function:

- Name: `send-push-on-visit` (or anything).
  Table: `visits`. Events: **Insert** and **Update**.
  Type: **Supabase Edge Functions**, function: `send-push`.
  HTTP Headers: add one, `x-webhook-secret` = the same value as `PUSH_WEBHOOK_SECRET` above.
- Name: `send-push-on-announcement` (or anything).
  Table: `announcements`. Events: **Insert** only.
  Type: **Supabase Edge Functions**, function: `send-push`.
  HTTP Headers: same as above, `x-webhook-secret` = `PUSH_WEBHOOK_SECRET`.
- Name: `send-push-on-support-message` (or anything).
  Table: `support_messages`. Events: **Insert** only.
  Type: **Supabase Edge Functions**, function: `send-push`.
  HTTP Headers: same as above. This one notifies only the admin (`is_admin`), when someone sends a message from You → Contact.
- Name: `send-push-on-reaction` (or anything).
  Table: `reactions`. Events: **Insert** only.
  Type: **Supabase Edge Functions**, function: `send-push`.
  HTTP Headers: same as above. This one notifies only the owner of a log when someone else reacts to it (not for switching a reaction, and never for reacting to your own log).

**5. Database migration.** Run `supabase/migrations/20260922000100_push_subscriptions.sql` in the SQL editor — it creates the table that remembers who has notifications on.

**6. Turn it on**, on the You screen. Each device (each phone, each home-screen icon) is its own subscription.

**Anyone whose notifications are off gets a floating reminder.** A banner (`app/src/components/NotificationsBanner.tsx`) floats above the tab bar on every screen, saying to turn notifications on, for as long as they're off or blocked — new or long-time person, it doesn't matter. It isn't dismissible; it rechecks the real status on every page you open, so it disappears the moment they're turned on (from the banner's own button, or from You) and comes back if they're ever turned off again. It also hides itself where push isn't possible at all (for example a plain Safari tab on iOS, before the person has added the Home Screen icon). The logic is pure and tested in `app/src/lib/notifBanner.ts` / `supabase/tests/notif_banner.test.mjs`.

## How access works

- Everyone signed in can read cafes, visits, drinks and profiles.
- You can only create, edit or delete your own visits and drinks, and your own profile.
- Notes live in a separate table and only their owner can read them.
- Blocked updates and deletes change zero rows without raising an error, so the app checks how many rows changed.
- **Deleting your account** (You → Edit profile → Delete my account, at the bottom) is permanent. It removes your Supabase Auth login, which the database cascades from there on its own: your profile, every visit, drink, private and public note, and any push subscriptions all go with it. Cafes you added stay in the shared directory (only your name is cleared from them), since cafes belong to everyone, not to whoever first logged them.

## Deploy

**Vercel** (Project Settings):
- Root Directory: `app`
- Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`

Then complete the sign-in setup above.

The migrations were applied by hand in the SQL editor. If Supabase's GitHub integration is set to deploy migrations on push, turn that off or it will try to re-run them.
