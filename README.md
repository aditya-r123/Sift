# Sift

Sift is a socially-driven music discovery app. Users swipe on short song previews to evaluate new music, build a personalized taste profile, see a friend-influenced feed, explore music outside their usual taste, and export their liked songs to a Spotify playlist. It is fully deployed (frontend on Vercel, data and auth on Supabase), so this README focuses on the API rather than local setup.

## Project layout

```text
src/              Browser UI (Vite + React) and app pages.
server/index.ts   Express API (Spotify OAuth, sessions, media, static UI).
supabase/         Database migrations and local Supabase config.
scripts/          One-off maintenance scripts (e.g. seed-top-tracks).
```

---

# API Documentation

The API has two layers:

1. **HTTP API** — a Node/Express server (`server/index.ts`) the browser talks to. It proxies Spotify, RapidAPI, iTunes, and Deezer so third-party credentials never reach the client.
2. **Database RPC API** — Postgres functions on Supabase that the frontend calls directly via `supabase.rpc(...)`. These hold the recommendation and taste-profile logic and are authorized by Supabase Auth and row-level security (RLS).

For each endpoint, **Syntax** lists the parameters, **Semantics** explains the behavior, and **Errors** lists expected failure modes.

---

## Part 1 — HTTP API (Express)

### Cross-cutting behavior

- **Auth model:** no JWT or bearer token. A signed, HTTP-only cookie session (`sift_sess`, 7-day expiry, `secure` in production) holds `access_token`, `refresh_token`, and `token_expiry` after Spotify OAuth. Spotify-backed routes use a `guard` middleware.
- **`guard`:** refreshes the Spotify token if missing or expiring within 60 seconds; if no valid refresh token exists, returns `401 { "error": "Unauthorized" }`.
- **Body limit:** JSON capped at 32 KB.
- **Error shape:** `{ "error": string }` unless a route documents additional fields. Status comes from the underlying error, otherwise `500` or `502` for upstream-provider failures.
- **Track ID validation:** a valid Spotify track ID matches `^[A-Za-z0-9_-]{15,}$`; invalid IDs are rejected with `400`.

### `GET /health`

- **Syntax:** none.
- **Semantics:** liveness probe; returns `200 { "ok": true }`.
- **Errors:** none.

### `GET /api/oauth-redirect-uri`

- **Syntax:** none. Response is `no-store`.
- **Semantics:** debug helper echoing the configured `SPOTIFY_REDIRECT_URI` plus a hint about `localhost` vs `127.0.0.1` mismatches.
- **Response:** `{ redirect_uri: string|null, alternate_localhost_vs_loopback: string }`.
- **Errors:** none.

### `GET /auth/login`

- **Syntax:** `show_dialog` query parameter, optional string. `"false"` suppresses Spotify's re-consent dialog; otherwise it is forced.
- **Semantics:** starts the Spotify Authorization Code flow. Generates a random `state`, stores it on the session for CSRF protection, and redirects to Spotify `/authorize`. Scopes: `user-read-email`, `user-read-private`, `user-top-read`, `user-read-recently-played`, `playlist-read-private`, `playlist-read-collaborative`, `playlist-modify-private`.
- **Errors:** `500` plain text if `SPOTIFY_CLIENT_ID` or `SPOTIFY_REDIRECT_URI` is missing.

### `GET /auth/callback`

- **Syntax:** Spotify-provided query parameters: `code`, `state`, and optional `error`.
- **Semantics:** completes OAuth by validating `state`, exchanging `code` for tokens, storing them on the session, then redirecting to the app at `.../#/connected`.
- **Errors:** redirects with a `#/error=<reason>` fragment. Denied consent uses Spotify's reason; missing `code` or bad `state` uses `invalid_state_or_code`; exchange failure uses `token_exchange_failed`.

### `GET /auth/logout`

- **Syntax:** none.
- **Semantics:** clears the cookie session and redirects to `PUBLIC_APP_ORIGIN` or `/`. This clears only Sift's session, not Spotify's own login.
- **Errors:** none.

### `GET /api/auth-status`

- **Syntax:** none. This route is not guarded and is safe when logged out.
- **Semantics:** reports whether the caller has a usable Spotify connection; attempts a token refresh and clears the session if refresh fails.
- **Response:** `{ spotifyConnected: boolean }`.
- **Errors:** none surfaced; refresh failures become `spotifyConnected: false`.

### `GET /api/me` guarded

- **Syntax:** none. Tokens come from the session.
- **Semantics:** proxies Spotify `GET /me`.
- **Response:** `{ user: <Spotify user object> }`.
- **Errors:** `401` if not connected; otherwise upstream Spotify status or `500`.

### `GET /api/top-artists` guarded

- **Syntax:** `time_range` query parameter, optional `short_term` | `medium_term` | `long_term`, default `medium_term`; `limit` query parameter, optional number, max 50, default 20.
- **Semantics:** proxies Spotify `GET /me/top/artists`.
- **Response:** raw Spotify paging object.
- **Errors:** `401` if not connected; otherwise upstream Spotify status or `500`.

### `GET /api/top-tracks` guarded

- **Syntax:** `time_range` and `limit` as above.
- **Semantics:** proxies Spotify `GET /me/top/tracks`.
- **Response:** raw Spotify paging object.
- **Errors:** same as `/api/top-artists`.

### `GET /api/recently-played` guarded

- **Syntax:** `limit` query parameter, optional number, max 50, default 20.
- **Semantics:** proxies Spotify `GET /me/player/recently-played`.
- **Response:** raw Spotify object.
- **Errors:** same as `/api/top-artists`.

### `GET /api/taste-seed` guarded

- **Syntax:** none.
- **Semantics:** computes a seed taste profile for a new user. Fetches the top 10 Spotify tracks, requests extended audio features for each from RapidAPI sequentially, and averages `energy`, `danceability`, `valence`, `acousticness`, and `speechiness` over tracks with complete in-range values. The client forwards these to `set_initial_taste_profile`.
- **Response:** `{ energy, danceability, valence, acousticness, speechiness, sampleSize }` when at least one track resolves; `{ sampleSize: 0 }` when none do.
- **Errors:** `401` if not connected; `503` if `RAPIDAPI_KEY` is unconfigured; otherwise upstream status. Individual track failures are skipped silently.

### `GET /api/tracks`

- **Syntax:** `ids` query parameter, required string: comma-separated list of 1-50 valid Spotify track IDs.
- **Semantics:** resolves card display media: cover art, album, release year, duration, and 30-second preview URL. Reads `top_tracks`, then fills missing cover/preview from Deezer first and iTunes second, with bounded concurrency. Resolved covers are written back to `top_tracks` asynchronously.
- **Response:** `{ tracks: [{ id, title, artist, album, releaseYear, durationMs, coverImage, previewUrl }] }`.
- **Errors:** `400` if `ids` is empty, exceeds 50, or has an invalid ID; `500` unexpected.

### `GET /api/track-insights/:trackId` guarded

- **Syntax:** `trackId` path parameter, required valid Spotify track ID.
- **Semantics:** fetches the RapidAPI extended-audio-features payload for one track, powering the track-insights modal.
- **Response:** `{ source: "rapidapi", attemptedUrl?, data }`. `attemptedUrl` appears only outside production.
- **Errors:** `400` invalid ID; `503` if RapidAPI is unconfigured; `429` if rate-limited; otherwise upstream status, default `502`.

### `POST /api/liked-songs-playlist` guarded

- **Syntax:** JSON body: `trackIds` required string array, de-duplicated and validated; `name` optional string, trimmed, max 100 chars, default `Sift Liked Songs`.
- **Semantics:** creates a private Spotify playlist and adds tracks in batches of 100, verifying each batch's `snapshot_id`. This powers manual export from the Liked Songs tab.
- **Response:** `{ playlistId, playlistUrl, trackCount, addedTrackCount }`.
- **Errors:** `400` if no valid IDs; `502` if Spotify returns no playlist ID or does not confirm/add all tracks; `401`/`403` include `reconnectSpotify: true` and may include `playlistId`/`playlistUrl` if already created.

### `POST /api/liked-songs-playlist/:playlistId/tracks` guarded

- **Syntax:** `playlistId` path parameter matching `^[A-Za-z0-9]{15,}$`; JSON body `trackIds` required string array.
- **Semantics:** appends tracks to an existing Sift-created playlist in batches of 100, each verified.
- **Response:** `{ trackCount, addedTrackCount }`.
- **Errors:** `400` invalid playlist ID or empty/invalid track list; `401`/`403` include `reconnectSpotify: true`; otherwise upstream status, default `500`.

### `GET *` SPA fallback

Any non-`/api`, non-`/auth` path serves the built `index.html`. Unmatched `/api/*` or `/auth/*` return `404` plain text `Not found`.

### Server environment variables

| Variable | Purpose |
| --- | --- |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` | Spotify OAuth credentials and callback URL. |
| `SESSION_SECRET` | Signs the `sift_sess` cookie. |
| `PUBLIC_APP_ORIGIN` | Origin used for OAuth redirects and logout. |
| `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, `RAPIDAPI_FEATURES_PATH` | RapidAPI extended-audio-features access. |
| `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY` | Supabase access for the `top_tracks` media cache. |
| `PORT`, `NODE_ENV` | Listening port and environment. |

---

## Part 2 — Database RPC API (Supabase / Postgres functions)

Called from the browser via `supabase.rpc(name, args)`. Authorization is enforced inside each function through `auth.uid()` and table RLS.

### `record_swipe_and_update_taste`

From `src/recommendations.ts`; `SECURITY DEFINER`.

- **Syntax:** `p_song_id` text, required Spotify track ID; `p_source` text, required origin feed such as `DISCOVER` or `EXPLORE`; `p_direction` text, required `YES` or `NO`; `p_alpha` double precision, optional default `0.10`, must be `> 0` and `<= 1`.
- **Semantics:** central swipe write. Records the swipe with first-swipe-wins semantics. On `YES`, creates a neutral profile if needed and nudges all five features toward the song via `new_weight = (1 - alpha) * current + alpha * song_feature`, increments `swipe_count`, and updates `updated_at`. `NO` is recorded but does not change the profile.
- **Returns:** `out_recorded`, `out_profile_updated`, `out_song_id`, `out_source`, `out_direction`, `out_energy`, `out_danceability`, `out_valence`, `out_acousticness`, `out_speechiness`, `out_swipe_count`.
- **Errors:** unauthenticated caller; invalid `p_source`, `p_direction`, or `p_alpha`; missing song; song with null audio features.

### `set_initial_taste_profile`

Seeded by `GET /api/taste-seed`.

- **Syntax:** `p_energy`, `p_danceability`, `p_valence`, `p_acousticness`, `p_speechiness`; all double precision, required, each in `[0, 1]`.
- **Semantics:** overwrites the user's taste profile with seed features computed from their Spotify top tracks.
- **Returns:** `out_energy`, `out_danceability`, `out_valence`, `out_acousticness`, `out_speechiness`, `out_swipe_count`.
- **Errors:** unauthenticated caller; out-of-range values rejected by `taste_profiles` constraints.

### `get_discover_batch`

From `src/trackCards.ts`.

- **Syntax:** `p_user_id` UUID, required and must equal `auth.uid()`; `p_limit` int, optional default `5`.
- **Semantics:** builds the Discover feed. Loads the taste profile, scores not-yet-swiped `top_tracks` by weighted squared-Euclidean distance across five audio features, returns close matches plus one wildcard, injects one recently liked song from an accepted friend, and excludes already-swiped tracks.
- **Returns:** `spotify_track_id`, `name`, `artist`, five audio features, `match_type`, `top_match_axis`, and `recommended_by`.
- **Errors:** exception if `p_user_id` does not match the authenticated user.

### `get_explore_batch`

From `src/trackCards.ts`; `SECURITY INVOKER`.

- **Syntax:** `p_user_id` UUID, required and must equal `auth.uid()`; `p_limit` int, optional default `5`.
- **Semantics:** builds the Explore feed. Loads the taste profile, picks one of the five axes at random, inverts it while holding the others, and returns tracks closest to that inverted target.
- **Returns:** `spotify_track_id`, `name`, `artist`, five audio features, `match_type`, and `inverted_axis`.
- **Errors:** RLS/auth enforced on the underlying tables.

### `calculate_new_weight` internal

- **Syntax:** `p_current`, `p_song_feature`, `p_alpha`; all double precision.
- **Semantics:** pure helper for `new_weight = (1 - alpha) * current + alpha * song_feature`, used by `record_swipe_and_update_taste`. Execute is revoked from `public` and `anon`.
- **Errors:** raises if `current` or `song_feature` is outside `[0, 1]`, or `alpha` is outside `(0, 1]`.

---

## Part 3 — Direct table access (Supabase client, under RLS)

The frontend also reads/writes a few tables directly. All access is constrained by RLS so a user only sees or changes rows they are permitted to.

- **`profiles`** — read in `Friends.tsx` to search for and display users.
- **`friends`** — read/written in `Friends.tsx` to send, accept, decline, and list relationships; subscribed via Supabase real-time for live request/accept updates.
- **`swipes`** — read in `Discover.tsx` and `LikedSongs.tsx` to list recorded swipes, including the liked-songs library; subscribed for real-time liked-song updates. Writes go through `record_swipe_and_update_taste`, not direct inserts.
- **`top_tracks`** — read in `trackCards.ts` for catalog data; also read/written by the server's `/api/tracks` media cache.
