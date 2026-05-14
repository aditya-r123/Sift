# SiftV0

## Project layout

```text
client/   Browser UI, Vite config, Tailwind styles, and frontend assets.
server/   Express API, Spotify/RapidAPI integrations, auth/session logic, and future database modules.
shared/   TypeScript contracts and constants shared by client and server.
```

This refactor preserves the existing app behavior while giving future work clear ownership boundaries.

## Spotify Web API keys

Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), **Create app** (or pick an existing app), then note **Client ID** and **Client Secret** (reveal/copy from **Settings**). Under **Redirect URIs**, add the exact callback URLs you’ll use—for local dev append `http://127.0.0.1:3001/auth/callback` (prefer **127.0.0.1** over **localhost** so cookies match the Spotify redirect).

## RapidAPI keys (optional — tap-a-track “insights”)

If you don’t configure RapidAPI, the rest of the app still works.

At [rapidapi.com](https://rapidapi.com), search for something like extended Spotify audio-features (or whichever API you subscribed to), subscribe to that API, open the **Endpoints** pane, copy **X-RapidAPI-Key** into **`RAPIDAPI_KEY`** and note **X-RapidAPI-Host** for **`RAPIDAPI_HOST`**. Leave **`RAPIDAPI_FEATURES_PATH`** empty unless your provider needs a specific path—the server falls back automatically.

## Run locally

Create **`.env`** in the project root:

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/auth/callback
PUBLIC_APP_ORIGIN=http://127.0.0.1:3001
SESSION_SECRET=
RAPIDAPI_KEY=
RAPIDAPI_HOST=
RAPIDAPI_FEATURES_PATH=
```

Set **`SESSION_SECRET`** to any long random string so production-like cookies behave sensibly locally.

Then:

```bash
npm install
npm run build && npm start
```

Open `http://127.0.0.1:3001`.

Optional (Vite HMR): run `npm run dev`, open `http://127.0.0.1:5173`, and set `PUBLIC_APP_ORIGIN=http://127.0.0.1:5173` in `.env`.
