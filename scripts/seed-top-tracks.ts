import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SPOTIFY_CLIENT_ID = (process.env.SPOTIFY_CLIENT_ID ?? "").trim();
const SPOTIFY_CLIENT_SECRET = (process.env.SPOTIFY_CLIENT_SECRET ?? "").trim();
const RAPIDAPI_KEY = (process.env.RAPIDAPI_KEY ?? "").trim();
const RAPIDAPI_HOST = (process.env.RAPIDAPI_HOST ?? "spotify-extended-audio-features-api.p.rapidapi.com").trim();
const RAPIDAPI_FEATURES_PATH = (process.env.RAPIDAPI_FEATURES_PATH ?? "v1/audio-features").trim().replace(/^\/+|\/+$/g, "");
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

// Default: Spotify "Top 50 - Global" editorial chart. Override with `npm run seed:top-tracks -- <playlistId>`.
const DEFAULT_PLAYLIST_ID = "37i9dQZEVXbMDoHDwVN2tF";
const playlistId = (process.argv[2] ?? DEFAULT_PLAYLIST_ID).trim();
const HOW_MANY = 20;

function requireEnv(name: string, value: string) {
  if (!value) throw new Error(`Missing env: ${name}`);
}
requireEnv("SPOTIFY_CLIENT_ID", SPOTIFY_CLIENT_ID);
requireEnv("SPOTIFY_CLIENT_SECRET", SPOTIFY_CLIENT_SECRET);
requireEnv("RAPIDAPI_KEY", RAPIDAPI_KEY);
requireEnv("VITE_SUPABASE_URL", SUPABASE_URL);
requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);

type PlaylistTrack = {
  id: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; release_date: string };
};
type PlaylistResponse = { items: { track: PlaylistTrack | null }[] };
type AudioFeatures = {
  energy?: number;
  danceability?: number;
  valence?: number;
  acousticness?: number;
  speechiness?: number;
};

async function getSpotifyAppToken(): Promise<string> {
  const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) throw new Error(`Spotify token failed: ${json.error ?? res.statusText}`);
  return json.access_token;
}

async function getTopTracks(token: string, id: string, limit: number): Promise<PlaylistTrack[]> {
  const url = `https://api.spotify.com/v1/playlists/${encodeURIComponent(id)}/tracks?limit=${limit}&fields=items(track(id,name,duration_ms,artists(name),album(name,release_date)))`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify playlist fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as PlaylistResponse;
  return json.items.map((i) => i.track).filter((t): t is PlaylistTrack => !!t && !!t.id);
}

async function getAudioFeatures(trackId: string): Promise<AudioFeatures> {
  const url = `https://${RAPIDAPI_HOST}/${RAPIDAPI_FEATURES_PATH}/${encodeURIComponent(trackId)}`;
  const res = await fetch(url, {
    headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`RapidAPI ${res.status} for ${trackId}: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(text) as AudioFeatures & { data?: AudioFeatures };
  return parsed.data ?? parsed;
}

function yearFromReleaseDate(d: string | undefined): number | null {
  if (!d) return null;
  const y = parseInt(d.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

async function main() {
  console.log(`Fetching top ${HOW_MANY} tracks from playlist ${playlistId}…`);
  const token = await getSpotifyAppToken();
  const tracks = (await getTopTracks(token, playlistId, HOW_MANY)).slice(0, HOW_MANY);
  console.log(`Got ${tracks.length} tracks. Fetching audio features (1 RapidAPI request per track)…`);

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    process.stdout.write(`  [${i + 1}/${tracks.length}] ${t.name} — ${t.artists.map((a) => a.name).join(", ")}… `);
    try {
      const f = await getAudioFeatures(t.id);
      rows.push({
        spotify_track_id: t.id,
        rank: i + 1,
        name: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        album: t.album.name,
        release_year: yearFromReleaseDate(t.album.release_date),
        duration_ms: t.duration_ms,
        energy: f.energy ?? null,
        danceability: f.danceability ?? null,
        valence: f.valence ?? null,
        acousticness: f.acousticness ?? null,
        speechiness: f.speechiness ?? null,
      });
      console.log("ok");
    } catch (e) {
      console.log(`FAILED: ${(e as Error).message}`);
    }
  }

  if (rows.length === 0) throw new Error("No rows to insert.");

  console.log(`Upserting ${rows.length} rows into public.top_tracks…`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("top_tracks").upsert(rows, { onConflict: "spotify_track_id" });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

  console.log(`Done. Inserted/updated ${rows.length} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
