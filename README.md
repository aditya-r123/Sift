# SiftV0

## Project layout

```text
client/           Browser UI, Vite, Tailwind.
server/src/       Express app (`app.ts`), entry (`index.ts`), users, MongoDB helpers.
server/data/      Local JSON user store (`users.json`, gitignored; auto-created).
shared/           TypeScript contracts for client/server.
```

### Prerequisites

- [Node.js](https://nodejs.org/) **18.x or newer** (includes `npm`).

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

   Minimum for sign-in plus Spotify linking: **`SPOTIFY_CLIENT_ID`**, **`SPOTIFY_CLIENT_SECRET`**, **`SPOTIFY_REDIRECT_URI`**, and **`SESSION_SECRET`**. Leave optional keys empty if you do not need that feature yet.

3. **Start the app** using one of the modes below.

**Production-like (single origin — recommended for a quick sanity check)**  
Express serves both the API and the Vite-built static files:

```bash
npm run build && npm start
```

Open **http://127.0.0.1:3001** (or set **`PORT`** in `.env`).  
OAuth callbacks use the API port (**3001** by default); keep **`SPOTIFY_REDIRECT_URI`** aligned with **`PORT`** and with your Spotify app’s Redirect URIs.

**Development (Vite hot reload + API)**  
Runs the frontend dev server with a proxy to the API:

```bash
npm run dev
```

- Frontend: **http://127.0.0.1:5173** (Vite proxies `/api` and `/auth` to the API server.)
- API: **http://127.0.0.1:3001** (or your **`PORT`**)

Set **`PUBLIC_APP_ORIGIN=http://127.0.0.1:5173`** in `.env` so redirects and cookie/session helpers target the URL you actually open in the browser.  
**Important:** **`SPOTIFY_REDIRECT_URI`** must still point at the API (e.g. `http://127.0.0.1:3001/auth/callback`), not port 5173, because Spotify sends the authorization code to Express.

Optional checks:

- **http://127.0.0.1:3001/health** — liveness plus Mongo ping when **`MONGODB_URI`** is set.

```bash
npm run typecheck   # TypeScript, no emit
```

### Troubleshooting

- **`Port 3001 is already in use`** — Stop whatever is listening (e.g. `lsof -nP -iTCP:3001 -sTCP:LISTEN`), or use another **`PORT`** in `.env` and the same host/port in **`SPOTIFY_REDIRECT_URI`** plus your Spotify Redirect URIs.
- **Google Sign-In fails or `redirect_uri_mismatch`** — The redirect URL sent to Google is always on the **API** port (default **3001**), e.g. `http://127.0.0.1:3001/auth/google/callback`. Add that **exact** string to **Google Cloud Console → Credentials → your OAuth 2.0 Client → Authorized redirect URIs**. It does **not** use port **5173**. When unsure, start the server and check **`GET /api/oauth-redirect-uri`** (`google_redirect_uri`). Keep **`localhost` vs `127.0.0.1`** consistent with how you browse (session cookie): either use **`http://127.0.0.1:5173`** for the app with **`PUBLIC_APP_ORIGIN=http://127.0.0.1:5173`**, or only use **`localhost`** everywhere and add matching redirect URIs in Google for **`http://localhost:3001/auth/google/callback`**.
- **`npm start` exits with module not found** — Run **`npm install`** from the repo root; dependencies include **`tsx`** and **`mongodb`**.

### Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `SPOTIFY_CLIENT_ID` | For Spotify OAuth | Spotify Developer Dashboard. |
| `SPOTIFY_CLIENT_SECRET` | For Spotify OAuth | |
| `SPOTIFY_REDIRECT_URI` | For Spotify OAuth | Example: `http://127.0.0.1:3001/auth/callback`; must match Dashboard exactly (**127.0.0.1** vs **localhost** matters). |
| `PUBLIC_APP_ORIGIN` | Recommended | Origin you open in the browser (see dev vs **`npm start`** above). |
| `SESSION_SECRET` | Recommended | Long random string; cookies use `dev-secret-change-me` if unset. |
| `PORT` | Optional | API port (default **3001**). |
| `MONGODB_URI` | Optional | Atlas **`mongodb+srv://…`** or local URI; **`/health`** reports status when set. |
| `MONGODB_DB` | Optional | Database name (default **sift**). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | For **Sign in with Google**; omit both to disable those routes until configured. |
| `GOOGLE_REDIRECT_URI` | Optional | Override Google **Authorized redirect URI**. Defaults to **`http://127.0.0.1:<PORT>/auth/google/callback`** (the **API** server, not the Vite port). Must match [Google Cloud Console](https://console.cloud.google.com/apis/credentials) exactly. |
| `API_PUBLIC_ORIGIN` | Optional | If set, used as the public base URL of the API for OAuth callbacks (when **`GOOGLE_REDIRECT_URI`** is unset). Use when the API is not at **`127.0.0.1:<PORT>`**. |
| `RAPIDAPI_KEY` | Optional | Tap-a-track insights; app works without it. |
| `RAPIDAPI_HOST` / `RAPIDAPI_FEATURES_PATH` | Optional | See RapidAPI section below. |

Example **`.env`** skeleton (same content as `.env.example`):

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/auth/callback
PUBLIC_APP_ORIGIN=http://127.0.0.1:3001
SESSION_SECRET=
PORT=3001

MONGODB_URI=
MONGODB_DB=sift

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Optional; defaults to http://127.0.0.1:<PORT>/auth/google/callback (API port — not Vite)
GOOGLE_REDIRECT_URI=
# Optional; public URL of the API if not http://127.0.0.1:<PORT>
API_PUBLIC_ORIGIN=

RAPIDAPI_KEY=
RAPIDAPI_HOST=
RAPIDAPI_FEATURES_PATH=
```

## Spotify Web API keys

Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), **Create app** (or pick an existing app), then note **Client ID** and **Client Secret** (reveal/copy from **Settings**). Under **Redirect URIs**, add the exact callback URLs you’ll use—for local **`npm start`** (+ default port) append `http://127.0.0.1:3001/auth/callback` (prefer **127.0.0.1** over **localhost** so cookies match the Spotify redirect). If you change **`PORT`** or **`SPOTIFY_REDIRECT_URI`**, add the matching URI and click **Save**.

## RapidAPI keys (optional — tap-a-track “insights”)

If you don’t configure RapidAPI, the rest of the app still works.

At [rapidapi.com](https://rapidapi.com), search for something like extended Spotify audio-features (or whichever API you subscribed to), subscribe to that API, open the **Endpoints** pane, copy **X-RapidAPI-Key** into **`RAPIDAPI_KEY`** and note **X-RapidAPI-Host** for **`RAPIDAPI_HOST`**. Leave **`RAPIDAPI_FEATURES_PATH`** empty unless your provider needs a specific path—the server falls back automatically.

## MongoDB (optional)

Provide **`MONGODB_URI`** when you want the server to connect (ping on startup and in **`GET /health`**). **`MONGODB_DB`** selects the database name (default **`sift`**). Never commit secrets; `.env` is gitignored.
