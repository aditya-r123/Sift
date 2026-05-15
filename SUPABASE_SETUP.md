# Supabase Auth Setup

This branch (`supabase-test`) moves Sift account sign-in/sign-up to **Supabase Auth**.
Supabase handles email/password, password hashing, sessions (JWT), and Google OAuth.
The Express server no longer does account auth — it only handles Spotify.

There is **no database table to create**: Supabase Auth stores every account in its
built-in `auth.users` table automatically. Email/password and Google users both land there.

Follow the steps in order. Total time ~15-20 min.

---

## 1. Create a Supabase project

1. Go to https://supabase.com and sign in (free tier is fine).
2. Click **New project**. Pick an org, name it (e.g. `sift`), set a database password
   (you won't need it for this feature — just store it somewhere), choose a region, create.
3. Wait ~2 min for it to provision.

## 2. Get your API keys → put them in `.env`

1. In the project, go to **Project Settings** (gear icon) → **API**.
2. Copy these two values:
   - **Project URL** → `https://<project-ref>.supabase.co`
   - **anon / public** key (under "Project API keys") — a long JWT string.
3. Open the repo's `.env` file and fill in:

   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<the anon public key>
   ```

   The `anon` key is **safe to expose** in the browser bundle — it's public by design,
   and Supabase's Row Level Security protects your data. Do **not** use the `service_role`
   key here.

> The `VITE_` prefix is required — Vite only exposes env vars with that prefix to the
> browser. `vite.config.ts` was updated with `envDir: ".."` so Vite reads this same
> root `.env` file.

## 3. Configure URL settings (redirect allowlist)

Supabase only redirects OAuth logins back to URLs you allowlist.

1. Go to **Authentication** → **URL Configuration**.
2. **Site URL**: set to your production URL (for now you can use
   `http://127.0.0.1:3001` if you have no deploy yet; update later).
3. **Redirect URLs**: click **Add URL** and add each of these:
   - `http://127.0.0.1:5173` — Vite dev server
   - `http://127.0.0.1:3001` — local Express server (`npm start` after a build)
   - `http://localhost:5173` and `http://localhost:3001` — in case you use `localhost`
   - your production URL when you deploy (e.g. `https://sift.vercel.app`)
4. Save.

## 4. Email / password sign-up

Email auth is enabled by default. One decision to make:

1. Go to **Authentication** → **Providers** (or **Sign In / Up** → **Email**).
2. Find **Confirm email**:
   - **OFF** → after sign-up the user is logged in immediately and their name/email
     appears right away. Best for development/demo.
   - **ON** → after sign-up the user must click a link in a confirmation email before
     they can sign in. More secure for production.
3. The frontend handles both: if confirmation is required, the sign-up form shows
   "Account created. Check your email to confirm…". For a smooth demo, turn it **OFF**.

> Note: the free tier's built-in email sender is rate-limited and only sends to a few
> addresses. If you keep confirmation ON for production, configure a custom SMTP provider
> under **Authentication** → **Emails** → **SMTP Settings**.

## 5. Google OAuth

This has two halves: a Google Cloud OAuth client, and enabling it in Supabase.

### 5a. Create the Google OAuth client

1. Go to https://console.cloud.google.com/.
2. Create a project (top bar project selector → **New Project**) or pick an existing one.
3. Go to **APIs & Services** → **OAuth consent screen**:
   - User type: **External** → Create.
   - App name: `Sift`. User support email: your email. Developer contact: your email.
   - On the **Scopes** step you can leave defaults (email/profile/openid are added
     automatically by the flow).
   - On **Test users**, add the Google accounts you'll log in with while the app is in
     "Testing" mode (anyone not listed will be blocked until you publish the app).
   - Save through to the end.
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application type: **Web application**.
   - Name: `Sift Web`.
   - **Authorized redirect URIs** → Add URI. This must be the **Supabase callback URL**:
     ```
     https://<project-ref>.supabase.co/auth/v1/callback
     ```
     (You can copy the exact URL from Supabase in step 5b — it's shown on the Google
     provider page.)
   - Create.
5. Copy the **Client ID** and **Client secret** that pop up.

### 5b. Enable Google in Supabase

1. In Supabase: **Authentication** → **Providers** → **Google**.
2. Toggle **Enable Sign in with Google** on.
3. Paste the **Client ID** and **Client Secret** from step 5a.
4. The page shows a **Callback URL (for OAuth)** — confirm it matches the redirect URI
   you put in Google (step 5a-4). If you hadn't added it yet, copy it now and add it
   in the Google Cloud Console.
5. Save.

That's it — no Google code in this repo. The "Continue with Google" button calls
`supabase.auth.signInWithOAuth({ provider: 'google' })`, which routes through Supabase.

---

## 6. Run it locally

```
npm install        # @supabase/supabase-js was added
npm run dev        # Vite on 127.0.0.1:5173 + Express on 3001
```

Open http://127.0.0.1:5173. You should see the sign-in page. Test:
- **Sign up** with email/password → name/email chip appears top-right.
- **Sign in** with the same credentials after a refresh.
- **Continue with Google** → Google account picker → back into the app, signed in.
- **Sign out** (top-right) clears the session.

To test the production-style single-server build:

```
npm run build && npm start   # Express serves the built UI on 3001
```

## 7. Deploying (Vercel)

1. In the Vercel project → **Settings** → **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   These are read at **build time** and baked into the browser bundle, so a redeploy is
   needed after changing them.
2. In Supabase **Authentication** → **URL Configuration**, add your Vercel URL to both
   **Site URL** and **Redirect URLs**.
3. The Spotify env vars (`SPOTIFY_*`, `SESSION_SECRET`, `RAPIDAPI_*`) are unchanged.

---

## What changed in the code

- **Added** `src/supabase.ts` — the Supabase browser client.
- **Added** `src/vite-env.d.ts` types for the `VITE_SUPABASE_*` env vars.
- **`src/main.ts`** — sign-in/sign-up forms and the Google button now call Supabase Auth;
  `supabase.auth.onAuthStateChange` drives the UI; the top-right chip is filled from the
  Supabase session (`user_metadata.display_name` / Google's `name`, plus email).
- **`src/index.html`** — the Google `<a href="/auth/google">` became a `<button>`.
- **`server/index.ts`** — removed `/api/auth/signup`, `/api/auth/signin`, `/auth/google`,
  `/auth/google/callback`, and the account gate on `/auth/login`. `/api/auth-status` now
  only reports `spotifyConnected`.
- **Removed** `server/users.ts` (the old JSON-file user store) — Supabase is the store now.

Spotify connection is untouched and still independent: connect it from the app after
signing in.
