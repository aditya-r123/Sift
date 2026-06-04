import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
dotenv.config({ path: path.join(repoRoot, ".env") });

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!SUPABASE_URL) throw new Error("Missing env: VITE_SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

// Usage: npm run seed:top-tracks -- [path/to/playlist.csv]
const DEFAULT_CSV = path.join(os.homedir(), "Downloads", "Top_500_Most_Streamed_Songs_on_Spotify.csv");
const csvPath = (process.argv[2] ?? DEFAULT_CSV).trim();

function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function yearFromDate(d: string): number | null {
  const y = parseInt(d.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

function toFloatOrNull(s: string): number | null {
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function trackIdFromUri(uri: string): string | null {
  const m = uri.match(/^spotify:track:([A-Za-z0-9]+)$/);
  return m ? m[1] : null;
}

async function main() {
  console.log(`Reading ${csvPath}…`);
  const text = readFileSync(csvPath, "utf8");
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV has no data rows.");
  const header = rows[0];
  const idx = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`CSV missing column "${name}"`);
    return i;
  };
  const optionalIdx = (name: string) => {
    const i = header.indexOf(name);
    return i >= 0 ? i : null;
  };
  const cols = {
    uri: idx("Track URI"),
    name: idx("Track Name"),
    album: idx("Album Name"),
    artist: idx("Artist Name(s)"),
    release: idx("Release Date"),
    duration: idx("Duration (ms)"),
    danceability: idx("Danceability"),
    energy: idx("Energy"),
    speechiness: idx("Speechiness"),
    acousticness: idx("Acousticness"),
    valence: idx("Valence"),
    coverUrl: optionalIdx("Cover URL"),
  };

  const dataRows = rows.slice(1).filter((r) => r.length > 1 && r[cols.uri]?.length);
  console.log(`Parsed ${dataRows.length} data rows.`);

  const seen = new Set<string>();
  const toInsert: Record<string, unknown>[] = [];
  let skippedNoId = 0;
  let skippedDupe = 0;
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const trackId = trackIdFromUri(r[cols.uri]);
    if (!trackId) {
      skippedNoId++;
      continue;
    }
    if (seen.has(trackId)) {
      skippedDupe++;
      continue;
    }
    seen.add(trackId);
    const row: Record<string, unknown> = {
      spotify_track_id: trackId,
      rank: i + 1,
      name: r[cols.name],
      artist: r[cols.artist],
      album: r[cols.album],
      release_year: yearFromDate(r[cols.release]),
      duration_ms: parseInt(r[cols.duration], 10),
      energy: toFloatOrNull(r[cols.energy]),
      danceability: toFloatOrNull(r[cols.danceability]),
      valence: toFloatOrNull(r[cols.valence]),
      acousticness: toFloatOrNull(r[cols.acousticness]),
      speechiness: toFloatOrNull(r[cols.speechiness]),
    };
    if (cols.coverUrl !== null) row.cover_url = r[cols.coverUrl] || null;
    toInsert.push(row);
  }

  if (skippedNoId) console.log(`  (skipped ${skippedNoId} rows with no parseable Track URI)`);
  if (skippedDupe) console.log(`  (skipped ${skippedDupe} duplicate Track URIs within the CSV)`);

  console.log(`Upserting up to ${toInsert.length} rows into public.top_tracks…`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Supabase has a payload-size cap; chunk to be safe on big CSVs.
  const CHUNK = 500;
  let upserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("top_tracks")
      .upsert(slice, { onConflict: "spotify_track_id" })
      .select("spotify_track_id");
    if (error) throw new Error(`Supabase upsert failed at offset ${i}: ${error.message}`);
    upserted += data?.length ?? 0;
  }
  console.log(`Done. Upserted ${upserted} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
