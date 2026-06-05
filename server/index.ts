import crypto from "node:crypto";

import { existsSync, writeFileSync } from "node:fs";
import cookieSession from "cookie-session";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface HttpError extends Error {
  status?: number;
  body?: unknown;
  attemptedUrl?: string;
}

type TopTrackMediaLookupRow = {
  spotify_track_id: string;
  name: string;
  artist: string;
  album: string | null;
  release_year: number | null;
  duration_ms: number | null;
  cover_url: string | null;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

/** Load `.env` from repo root so Spotify vars work even when `cwd` is not the project folder. */
dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config();

/** Vite emits `public/`. Locally this is `{repoRoot}/public`; bundled on Vercel, `cwd`/`public` is typical. */
function resolveWebRoot(): string {
  const fromCwd = path.join(process.cwd(), "public");
  const fromRepo = path.join(repoRoot, "public");
  for (const dir of [fromCwd, fromRepo]) {
    const indexPath = path.join(dir, "index.html");
    if (existsSync(indexPath)) return path.resolve(dir);
  }
  return path.resolve(fromCwd);
}

const SPOTIFY_CLIENT_ID = String(process.env.SPOTIFY_CLIENT_ID ?? "").trim();
const SPOTIFY_CLIENT_SECRET = String(process.env.SPOTIFY_CLIENT_SECRET ?? "").trim();
const SPOTIFY_REDIRECT_URI = String(process.env.SPOTIFY_REDIRECT_URI ?? "").trim();

const SESSION_SECRET = String(process.env.SESSION_SECRET ?? "").trim();
const PUBLIC_APP_ORIGIN = String(process.env.PUBLIC_APP_ORIGIN ?? "").trim();
const NODE_ENV = process.env.NODE_ENV;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
const RAPIDAPI_FEATURES_PATH = process.env.RAPIDAPI_FEATURES_PATH;
const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL ?? "").trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

for (const [val, key] of [
  [SPOTIFY_CLIENT_ID, "SPOTIFY_CLIENT_ID"],
  [SPOTIFY_CLIENT_SECRET, "SPOTIFY_CLIENT_SECRET"],
  [SPOTIFY_REDIRECT_URI, "SPOTIFY_REDIRECT_URI"],
  [SESSION_SECRET, "SESSION_SECRET"],
] as const) {
  if (!val) console.error(`Missing env: ${key}. Copy .env.example to .env and fill values.`);
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

app.use(express.json({ limit: "32kb" }));

app.set("trust proxy", 1);

app.use(
  cookieSession({
    name: "sift_sess",
    keys: SESSION_SECRET ? [SESSION_SECRET] : ["dev-secret-change-me"],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
    httpOnly: true,
    secure: NODE_ENV === "production",
  })
);

type SessionShape = NonNullable<express.Request["session"]>;

function appOrigin(): string {
  return PUBLIC_APP_ORIGIN || `http://127.0.0.1:${PORT}`;
}

function hasSpotifySession(session: SessionShape | null | undefined): boolean {
  return typeof session?.access_token === "string" && session.access_token.length > 0;
}

async function fetchSpotify(path: string, session: SessionShape | null | undefined) {
  if (!session?.access_token) {
    throw new Error("Unauthorized");
  }
  const url = path.startsWith("http") ? path : `https://api.spotify.com/v1/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const errObj = body as { error?: { message?: string } };
    const errMsg = typeof errObj?.error?.message === "string" ? errObj.error.message : res.statusText;
    const e = new Error(errMsg || "Spotify API error") as HttpError;
    e.status = res.status;
    e.body = body;
    throw e;
  }
  return body;
}

async function refreshIfNeeded(session: SessionShape) {
  const now = Math.floor(Date.now() / 1000);
  if (session.access_token && session.token_expiry && session.token_expiry > now + 60) return;
  if (!session.refresh_token || !SPOTIFY_CLIENT_SECRET) throw new Error("Need re-login");

  const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: session.refresh_token,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: params,
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Token refresh failed");
  }
  session.access_token = data.access_token;
  session.token_expiry = now + (data.expires_in || 3600);
  if (data.refresh_token) session.refresh_token = data.refresh_token;
  persistDevTokens(session);
}

function persistDevTokens(session: SessionShape | null | undefined): void {
  if (NODE_ENV === "production") {
    console.log("[persistDevTokens] skipped: NODE_ENV=production");
    return;
  }
  if (!session?.access_token || !session?.refresh_token) {
    console.log("[persistDevTokens] skipped: missing tokens on session", {
      hasAccess: !!session?.access_token,
      hasRefresh: !!session?.refresh_token,
    });
    return;
  }
  const target = path.join(repoRoot, ".tokens.json");
  try {
    writeFileSync(
      target,
      JSON.stringify(
        {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          token_expiry: session.token_expiry,
        },
        null,
        2
      )
    );
    console.log(`[persistDevTokens] wrote ${target}`);
  } catch (e) {
    console.error(`[persistDevTokens] failed to write ${target}:`, e);
  }
}

const DEFAULT_RAPID_HOST = "spotify-extended-audio-features-api.p.rapidapi.com";

function normalizedEnvPresent(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

async function fetchExtendedAudioFeatures(trackId: string): Promise<{ body: unknown; attemptedUrl: string }> {
  if (!normalizedEnvPresent(RAPIDAPI_KEY || "")) {
    const e = new Error("RapidAPI key not configured (set RAPIDAPI_KEY in .env)") as HttpError;
    e.status = 503;
    throw e;
  }
  const key = RAPIDAPI_KEY!.trim();
  const host = normalizedEnvPresent(RAPIDAPI_HOST || "") ? RAPIDAPI_HOST!.trim() : DEFAULT_RAPID_HOST;
  const configuredPath =
    typeof RAPIDAPI_FEATURES_PATH === "string" && normalizedEnvPresent(RAPIDAPI_FEATURES_PATH)
      ? RAPIDAPI_FEATURES_PATH.trim().replace(/^\/+|\/+$/g, "")
      : null;
  const pathCandidates = configuredPath ? [configuredPath] : ["v1/audio-features", "audio-features"];
  let lastErr: HttpError | null = null;
  for (const pathSeg of pathCandidates) {
    const attemptedUrl = `https://${host}/${pathSeg}/${encodeURIComponent(trackId)}`;
    const res = await fetch(attemptedUrl, {
      headers: {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": host,
      },
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    if (res.ok) return { body, attemptedUrl };
    const b = body as { message?: string; error?: string };
    const msg =
      typeof b?.message === "string" ? b.message : typeof b?.error === "string" ? b.error : res.statusText;
    const err = new Error(msg || "RapidAPI error") as HttpError;
    err.status = res.status === 429 ? 429 : res.status >= 400 && res.status < 500 ? res.status : 502;
    err.body = body;
    err.attemptedUrl = attemptedUrl;
    lastErr = err;
    if (res.status === 404 && !configuredPath && pathCandidates.indexOf(pathSeg) < pathCandidates.length - 1)
      continue;
    throw err;
  }
  throw lastErr || new Error("RapidAPI request failed");
}

const SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-top-read",
  "user-read-recently-played",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

app.get("/health", (_, res) => res.json({ ok: true }));

app.get("/api/oauth-redirect-uri", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const u = SPOTIFY_REDIRECT_URI || "";
  res.json({
    redirect_uri: u || null,
    alternate_localhost_vs_loopback:
      u.includes("127.0.0.1") && !u.includes("localhost")
        ? "If your dashboard only lists http://localhost:3001/auth/callback, either add BOTH URIs there or change SPOTIFY_REDIRECT_URI to match dashboard exactly."
        : u.includes("localhost") && !u.includes("127.0.0.1")
          ? "If your dashboard lists 127.0.0.1 only, align .env SPOTIFY_REDIRECT_URI or add localhost to the whitelist."
          : "Spotify rejects OAuth when redirect_uri is not identical to one entry in Redirect URIs (including http vs https, host, port, path, trailing slashes). Click Save after editing.",
  });
});

app.get("/auth/login", (req, res) => {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI) {
    return res.status(500).send("Server missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI");
  }
  const state = crypto.randomBytes(16).toString("hex");
  if (req.session) req.session.oauth_state = state;
  /** Spotify cookies outlive `/auth/logout` (that only clears this app).
   * `show_dialog=true` skips silent re-link of the currently logged-in Spotify account; see Spotify’s `show_dialog`.
   * Use `/auth/login?show_dialog=false` for quieter dev retries on a single Spotify account only. */
  const override = typeof req.query.show_dialog === "string";
  const showDialog = override ? req.query.show_dialog !== "false" : true;

  const authorize = new URL("https://accounts.spotify.com/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", SPOTIFY_CLIENT_ID);
  authorize.searchParams.set("scope", SCOPES);
  authorize.searchParams.set("redirect_uri", SPOTIFY_REDIRECT_URI);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("show_dialog", showDialog ? "true" : "false");
  res.redirect(authorize.toString());
});

app.get("/auth/callback", async (req, res) => {
  const frontend = appOrigin();
  try {
    const err = typeof req.query.error === "string" ? req.query.error : "";
    if (err) {
      res.redirect(`${frontend}/#/error=${encodeURIComponent(err)}`);
      return;
    }
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code || state !== req.session?.oauth_state) {
      res.redirect(`${frontend}/#/error=${encodeURIComponent("invalid_state_or_code")}`);
      return;
    }
    if (req.session) req.session.oauth_state = undefined;

    const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    });
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: params,
    });
    const tokens = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!tokenRes.ok) {
      throw new Error(typeof tokens?.error === "string" ? tokens.error : "token_exchange_failed");
    }
    if (req.session) {
      req.session.access_token = tokens.access_token;
      req.session.refresh_token = tokens.refresh_token;
      req.session.token_expiry = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600);
      persistDevTokens(req.session);
    }
    res.redirect(`${frontend}/#/connected`);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "unknown";
    res.redirect(`${frontend}/#/error=${encodeURIComponent(String(msg || "unknown"))}`);
  }
});

app.get("/auth/logout", (req, res) => {
  req.session = null;
  const base = String(PUBLIC_APP_ORIGIN || "").trim().replace(/\/$/, "");
  const target = base ? `${base}/` : "/";
  res.redirect(302, target);
});

async function guard(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    if (req.session) await refreshIfNeeded(req.session);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/api/me", guard, async (req, res) => {
  try {
    const user = await fetchSpotify("me", req.session);
    res.json({ user });
  } catch (e) {
    const err = e as HttpError;
    const status = typeof err.status === "number" ? err.status : 500;
    res.status(status).json({ error: err.message || String(e) });
  }
});

app.get("/api/top-artists", guard, async (req, res) => {
  try {
    const time_range = typeof req.query.time_range === "string" ? req.query.time_range : "medium_term";
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const path = `me/top/artists?limit=${limit}&time_range=${encodeURIComponent(time_range)}`;
    const data = await fetchSpotify(path, req.session);
    res.json(data);
  } catch (e) {
    const err = e as HttpError;
    const status = typeof err.status === "number" ? err.status : 500;
    res.status(status).json({ error: err.message || String(e) });
  }
});

app.get("/api/top-tracks", guard, async (req, res) => {
  try {
    const time_range = typeof req.query.time_range === "string" ? req.query.time_range : "medium_term";
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const path = `me/top/tracks?limit=${limit}&time_range=${encodeURIComponent(time_range)}`;
    const data = await fetchSpotify(path, req.session);
    res.json(data);
  } catch (e) {
    const err = e as HttpError;
    const status = typeof err.status === "number" ? err.status : 500;
    res.status(status).json({ error: err.message || String(e) });
  }
});

app.get("/api/recently-played", guard, async (req, res) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const data = await fetchSpotify(`me/player/recently-played?limit=${limit}`, req.session);
    res.json(data);
  } catch (e) {
    const err = e as HttpError;
    const status = typeof err.status === "number" ? err.status : 500;
    res.status(status).json({ error: err.message || String(e) });
  }
});

app.get("/api/auth-status", async (req, res) => {
  let spotifyConnected = hasSpotifySession(req.session);
  try {
    if (spotifyConnected && req.session) {
      await refreshIfNeeded(req.session);
      spotifyConnected = hasSpotifySession(req.session);
    }
  } catch (error) {
    console.error(error);
    spotifyConnected = hasSpotifySession(req.session);
  }
  res.json({ spotifyConnected });
});

function isPlausibleTrackId(id: string): boolean {
  return typeof id === "string" && /^[A-Za-z0-9_-]{15,}$/.test(id);
}

type TrackCardMedia = {
  id: string;
  title: string;
  artist: string;
  album: string;
  releaseYear: number | null;
  durationMs: number | null;
  coverImage: string;
  previewUrl: string;
};

/** Run an async mapper over items with a bounded concurrency so we don't burst-hit (and get throttled by) iTunes. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) || 0 }, worker));
  return results;
}

/** In-memory cache of iTunes lookups (cover + preview) keyed by Spotify track id, to avoid repeat network calls. */
const itunesMediaCache = new Map<string, { coverImage: string; previewUrl: string }>();

/** In-memory cache of resolved 30s preview URLs keyed by Spotify track id. */
const previewUrlCache = new Map<string, string>();

function normalizeComparable(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function highResolutionITunesArtwork(url: string): string {
  return url.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, "/600x600bb.$1");
}

type ITunesSearchResult = {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  releaseDate?: string;
  previewUrl?: string;
};

function scoreITunesResult(row: TopTrackMediaLookupRow, result: ITunesSearchResult): number {
  const rowTitle = normalizeComparable(row.name);
  const rowArtist = normalizeComparable(row.artist);
  const rowAlbum = normalizeComparable(row.album ?? "");
  const resultTitle = normalizeComparable(result.trackName ?? "");
  const resultArtist = normalizeComparable(result.artistName ?? "");
  const resultAlbum = normalizeComparable(result.collectionName ?? "");
  let score = 0;

  if (resultTitle === rowTitle) score += 50;
  else if (resultTitle.includes(rowTitle) || rowTitle.includes(resultTitle)) score += 20;

  for (const artistPart of rowArtist.split(" ").filter((part) => part.length > 2)) {
    if (resultArtist.includes(artistPart)) score += 4;
  }

  if (rowAlbum && resultAlbum === rowAlbum) score += 20;
  else if (rowAlbum && (resultAlbum.includes(rowAlbum) || rowAlbum.includes(resultAlbum))) score += 8;

  if (row.duration_ms && result.trackTimeMillis) {
    const delta = Math.abs(row.duration_ms - result.trackTimeMillis);
    if (delta < 1500) score += 20;
    else if (delta < 5000) score += 10;
  }

  if (row.release_year && result.releaseDate?.startsWith(String(row.release_year))) score += 5;

  return score;
}

async function searchITunesBest(
  row: TopTrackMediaLookupRow,
  term: string
): Promise<ITunesSearchResult | undefined> {
  const params = new URLSearchParams({ term, entity: "song", limit: "12" });
  const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
  if (!res.ok) return undefined;

  const data = (await res.json().catch(() => ({}))) as { results?: ITunesSearchResult[] };
  const best = (data.results ?? [])
    .map((result) => ({ result, score: scoreITunesResult(row, result) }))
    .sort((a, b) => b.score - a.score)[0];

  // Lower-than-cover threshold: a confident title/artist match is enough to trust the preview/art.
  if (!best || best.score < 30) return undefined;
  return best.result;
}

/** Resolve cover art + 30s preview for a track from iTunes, with an in-memory cache and a title+artist fallback query. */
async function findITunesMedia(
  row: TopTrackMediaLookupRow
): Promise<{ coverImage: string; previewUrl: string }> {
  const cached = itunesMediaCache.get(row.spotify_track_id);
  if (cached) return cached;

  const queries = [
    [row.name, row.artist, row.album ?? ""].filter(Boolean).join(" "),
    [row.name, row.artist].filter(Boolean).join(" "),
  ];

  let result: ITunesSearchResult | undefined;
  for (const term of queries) {
    if (!term) continue;
    result = await searchITunesBest(row, term);
    if (result?.artworkUrl100 || result?.previewUrl) break;
  }

  const media = {
    coverImage: result?.artworkUrl100 ? highResolutionITunesArtwork(result.artworkUrl100) : "",
    previewUrl: result?.previewUrl ?? "",
  };
  if (media.coverImage || media.previewUrl) itunesMediaCache.set(row.spotify_track_id, media);
  return media;
}

type DeezerSearchResult = {
  title?: string;
  artist?: { name?: string };
  album?: { cover_big?: string; cover_xl?: string };
  preview?: string;
};

const deezerMediaCache = new Map<string, { coverImage: string; previewUrl: string }>();

/**
 * Deezer is a free, un-throttled source for both album art (stable 1000x1000 URLs) and 30s previews.
 * It's the primary fallback because iTunes aggressively rate-limits (429), which is why most covers were missing.
 */
async function findDeezerMedia(row: TopTrackMediaLookupRow): Promise<{ coverImage: string; previewUrl: string }> {
  const cached = deezerMediaCache.get(row.spotify_track_id);
  if (cached) return cached;
  const empty = { coverImage: "", previewUrl: "" };

  try {
    const params = new URLSearchParams({
      q: [row.name, row.artist].filter(Boolean).join(" "),
      limit: "8",
    });
    const res = await fetch(`https://api.deezer.com/search?${params.toString()}`);
    if (!res.ok) return empty;

    const data = (await res.json().catch(() => ({}))) as { data?: DeezerSearchResult[] };
    const rowTitle = normalizeComparable(row.name);
    const rowArtist = normalizeComparable(row.artist);

    let best: DeezerSearchResult | undefined;
    let bestScore = -1;
    for (const result of data.data ?? []) {
      const resultTitle = normalizeComparable(result.title ?? "");
      const resultArtist = normalizeComparable(result.artist?.name ?? "");
      let score = 0;
      if (resultTitle === rowTitle) score += 50;
      else if (resultTitle.includes(rowTitle) || rowTitle.includes(resultTitle)) score += 20;
      for (const part of rowArtist.split(" ").filter((p) => p.length > 2)) {
        if (resultArtist.includes(part)) score += 4;
      }
      if (score > bestScore) {
        bestScore = score;
        best = result;
      }
    }

    if (!best || bestScore < 20) return empty;
    const media = {
      coverImage: best.album?.cover_xl || best.album?.cover_big || "",
      previewUrl: best.preview || "",
    };
    if (media.coverImage || media.previewUrl) deezerMediaCache.set(row.spotify_track_id, media);
    return media;
  } catch (error) {
    console.warn("Failed to load Deezer media:", error);
    return empty;
  }
}

async function coverMediaFromTopTracks(ids: string[]): Promise<TrackCardMedia[]> {
  if (!supabaseAdmin || ids.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("top_tracks")
    .select("spotify_track_id, name, artist, album, release_year, duration_ms, cover_url")
    .in("spotify_track_id", ids);
  if (error) {
    console.warn("Failed to read top_tracks for iTunes cover lookup:", error.message);
    return [];
  }

  // Bounded concurrency keeps us under external rate limits — bursting all lookups at once is why covers were going missing.
  return mapWithConcurrency((data ?? []) as TopTrackMediaLookupRow[], 6, async (row) => {
    let coverImage = row.cover_url || "";
    let previewUrl = previewUrlCache.get(row.spotify_track_id) ?? "";

    // Deezer first: reliable, un-throttled, returns cover + preview in one call.
    if (!coverImage || !previewUrl) {
      const deezer = await findDeezerMedia(row);
      if (!coverImage) coverImage = deezer.coverImage;
      if (!previewUrl) previewUrl = deezer.previewUrl;
    }

    // iTunes as a secondary source only for whatever Deezer couldn't resolve.
    if (!coverImage || !previewUrl) {
      const itunes = await findITunesMedia(row);
      if (!coverImage) coverImage = itunes.coverImage;
      if (!previewUrl) previewUrl = itunes.previewUrl;
    }

    if (previewUrl) previewUrlCache.set(row.spotify_track_id, previewUrl);

    return {
      id: row.spotify_track_id,
      title: row.name,
      artist: row.artist,
      album: row.album ?? "",
      releaseYear: row.release_year,
      durationMs: row.duration_ms,
      coverImage,
      previewUrl,
    };
  });
}

async function cacheTrackMedia(tracks: TrackCardMedia[]): Promise<void> {
  if (!supabaseAdmin || tracks.length === 0) return;

  let failures = 0;
  await Promise.all(
    tracks.map(async (track) => {
      const media: { cover_url?: string } = {};
      if (track.coverImage) media.cover_url = track.coverImage;
      if (Object.keys(media).length === 0) return;

      const { error } = await supabaseAdmin.from("top_tracks").update(media).eq("spotify_track_id", track.id);
      if (error) failures++;
    })
  );
  if (failures > 0) {
    console.warn(`Failed to cache Spotify media for ${failures} track(s)`);
  }
}

app.get("/api/tracks", async (req, res) => {
  try {
    const rawIds = typeof req.query.ids === "string" ? req.query.ids : "";
    const ids = rawIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0 || ids.length > 50 || ids.some((id) => !isPlausibleTrackId(id))) {
      res.status(400).json({ error: "Provide 1-50 valid Spotify track IDs in the ids query param" });
      return;
    }

    const cardMedia = await coverMediaFromTopTracks(ids);

    void cacheTrackMedia(cardMedia);

    res.json({
      tracks: cardMedia,
    });
  } catch (e) {
    const err = e as HttpError;
    const status = typeof err.status === "number" ? err.status : 500;
    res.status(status).json({ error: err.message || String(e) });
  }
});

app.get("/api/track-insights/:trackId", guard, async (req, res) => {
  try {
    const raw = typeof req.params.trackId === "string" ? req.params.trackId.trim() : "";
    if (!isPlausibleTrackId(raw)) {
      res.status(400).json({ error: "Invalid track id" });
      return;
    }
    const { body, attemptedUrl } = await fetchExtendedAudioFeatures(raw);
    res.json({
      source: "rapidapi",
      attemptedUrl: process.env.NODE_ENV === "production" ? undefined : attemptedUrl,
      data: body,
    });
  } catch (e) {
    const err = e as HttpError;
    const status = typeof err.status === "number" ? err.status : 502;
    res.status(status).json({
      error: err.message || String(e),
      attemptedUrl: NODE_ENV !== "production" && typeof err.attemptedUrl === "string" ? err.attemptedUrl : undefined,
    });
  }
});

/** Built UI (`vite build`). Vercel ignores `express.static` for this app bundle; SPA fallback uses `sendFile` from traced `public/**` (`vercel.json` includeFiles). */
const webRoot = resolveWebRoot();
app.use(express.static(webRoot));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/auth") || req.path.startsWith("/api")) {
    res.status(404).type("text").send("Not found");
    return;
  }
  res.sendFile(path.join(webRoot, "index.html"), (err) => {
    if (err) next(err);
  });
});

export default app;

const startedDirectly =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (startedDirectly) {
  const server = app.listen(PORT, () => {
    console.log(`API + static: http://127.0.0.1:${PORT}`);
    if (SPOTIFY_REDIRECT_URI) {
      console.log(`Spotify redirect_uri (must match Dashboard exactly): ${SPOTIFY_REDIRECT_URI}`);
    }
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other process: lsof -nP -iTCP:${PORT} -sTCP:LISTEN\n` +
          `If you change PORT, update SPOTIFY_REDIRECT_URI and Spotify Dashboard to match (e.g. http://127.0.0.1:${PORT}/auth/callback).`
      );
      process.exit(1);
    }
    throw err;
  });
}
