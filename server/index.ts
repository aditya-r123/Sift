import crypto from "node:crypto";

import { existsSync, writeFileSync } from "node:fs";
import cookieSession from "cookie-session";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface HttpError extends Error {
  status?: number;
  body?: unknown;
  attemptedUrl?: string;
}

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
