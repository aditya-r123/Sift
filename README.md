# SiftV0

## Project layout

```text
src/              Browser UI (Vite + React), pages, and design prototype.
server/index.ts   Express API (Spotify OAuth, sessions, static UI).
supabase/         Database migrations and local Supabase config.
scripts/          One-off maintenance scripts (e.g. seed-top-tracks).
```

### Prerequisites

- [Node.js](https://nodejs.org/) **22.x or newer** (includes `npm`).

### Run locally

1. **Clone the repo** and install dependencies:

   ```bash
   cd Sift
   npm install
   ```

2. **Configure environment.** Copy the example file and edit values:

   ```bash
   cp .env.example .env
   ```

   Minimum for sign-in plus Spotify linking: **`VITE_SUPABASE_URL`**, **`VITE_SUPABASE_ANON_KEY`**, **`SPOTIFY_CLIENT_ID`**, **`SPOTIFY_CLIENT_SECRET`**, **`SPOTIFY_REDIRECT_URI`**, and **`SESSION_SECRET`**.

3. **Start the app** using one of the modes below.

**Production-like (single origin — recommended for a quick sanity check)**  
Express serves both the API and the Vite-built static files:

```bash
npm run build && npm start
```

Open **http://127.0.0.1:3001** (or set **`PORT`** in `.env`).  
OAuth callbacks use the API port (**3001** by default); keep **`SPOTIFY_REDIRECT_URI`** aligned with **`PORT`** and with your Spotify app's Redirect URIs.

**Development (Vite hot reload + API)**  
Runs the frontend dev server with a proxy to the API:

```bash
npm run dev
```

- Frontend: **http://127.0.0.1:5173** (Vite proxies `/api` and `/auth` to the API server.)
- API: **http://127.0.0.1:3001** (or your **`PORT`**)
- Design prototype: **http://127.0.0.1:5173/design.html**

Set **`PUBLIC_APP_ORIGIN=http://127.0.0.1:5173`** in `.env` so redirects and cookie/session helpers target the URL you actually open in the browser.  
**Important:** **`SPOTIFY_REDIRECT_URI`** must still point at the API (e.g. `http://127.0.0.1:3001/auth/callback`), not port 5173, because Spotify sends the authorization code to Express.

Optional checks:

- **http://127.0.0.1:3001/health** — liveness check.

```bash
npm run typecheck   # TypeScript, no emit
```

### Troubleshooting

- **`Port 3001 is already in use`** — Stop whatever is listening (e.g. `lsof -nP -iTCP:3001 -sTCP:LISTEN`), or use another **`PORT`** in `.env` and the same host/port in **`SPOTIFY_REDIRECT_URI`** plus your Spotify Redirect URIs.
- **`npm start` exits with module not found** — Run **`npm install`** from the repo root.

### Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_SUPABASE_URL` | For account auth | Supabase Dashboard → Project Settings → API. |
| `VITE_SUPABASE_ANON_KEY` | For account auth | Public anon key (safe in the browser). |
| `SUPABASE_SERVICE_ROLE_KEY` | For scripts only | Server-side seeding; never expose to the browser. |
| `SPOTIFY_CLIENT_ID` | For Spotify OAuth | Spotify Developer Dashboard. |
| `SPOTIFY_CLIENT_SECRET` | For Spotify OAuth | |
| `SPOTIFY_REDIRECT_URI` | For Spotify OAuth | Example: `http://127.0.0.1:3001/auth/callback`; must match Dashboard exactly (**127.0.0.1** vs **localhost** matters). |
| `PUBLIC_APP_ORIGIN` | Recommended | Origin you open in the browser (see dev vs **`npm start`** above). |
| `SESSION_SECRET` | Recommended | Long random string; cookies use `dev-secret-change-me` if unset. |
| `PORT` | Optional | API port (default **3001**). |
| `RAPIDAPI_KEY` | Optional | Tap-a-track insights; app works without it. |
| `RAPIDAPI_HOST` / `RAPIDAPI_FEATURES_PATH` | Optional | See RapidAPI section below. |

Example **`.env`** skeleton (same content as `.env.example`):

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/auth/callback
PUBLIC_APP_ORIGIN=http://127.0.0.1:3001
SESSION_SECRET=
PORT=3001

RAPIDAPI_KEY=
RAPIDAPI_HOST=
RAPIDAPI_FEATURES_PATH=
```

## Spotify Web API keys

Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), **Create app** (or pick an existing app), then note **Client ID** and **Client Secret** (reveal/copy from **Settings**). Under **Redirect URIs**, add the exact callback URLs you'll use—for local dev append `http://127.0.0.1:3001/auth/callback` (prefer **127.0.0.1** over **localhost** so cookies match the Spotify redirect).

## RapidAPI keys (optional — tap-a-track "insights")

If you don't configure RapidAPI, the rest of the app still works.

At [rapidapi.com](https://rapidapi.com), search for something like extended Spotify audio-features (or whichever API you subscribed to), subscribe to that API, open the **Endpoints** pane, copy **X-RapidAPI-Key** into **`RAPIDAPI_KEY`** and note **X-RapidAPI-Host** for **`RAPIDAPI_HOST`**. Leave **`RAPIDAPI_FEATURES_PATH`** empty unless your provider needs a specific path—the server falls back automatically.
