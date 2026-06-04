import { supabase } from './supabase.js';
import type { Song } from './songs.js';

export type CardMedia = {
  title?: string;
  artist?: string;
  album?: string;
  releaseYear?: number | null;
  durationMs?: number | null;
  coverImage?: string;
};

type TopTrackRow = {
  spotify_track_id: string;
  rank: number;
  name: string;
  artist: string;
  album: string;
  release_year: number | null;
  duration_ms: number | null;
  cover_url: string | null;
  energy: number | null;
  danceability: number | null;
  valence: number | null;
  acousticness: number | null;
  speechiness: number | null;
};

export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function songColor(seed: string): string {
  const palette = ['#14b8a6', '#ef4444', '#8b5cf6', '#f97316', '#2563eb', '#db2777', '#059669'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

function tagsForTrack(track: TopTrackRow): string[] {
  const tags: string[] = [];
  if (track.rank <= 50) tags.push('Popular');
  if ((track.energy ?? 0) >= 0.7) tags.push('Energy');
  if ((track.danceability ?? 0) >= 0.7) tags.push('Danceability');
  if ((track.valence ?? 0) >= 0.65) tags.push('Upbeat');
  if ((track.acousticness ?? 1) <= 0.2) tags.push('Produced');
  if ((track.speechiness ?? 0) >= 0.12) tags.push('Vocal');
  return tags.length > 0 ? tags : ['Discover'];
}

function trackToSong(track: TopTrackRow, media: CardMedia = {}): Song {
  return {
    id: track.spotify_track_id,
    title: media.title || track.name,
    artist: media.artist || track.artist,
    album: media.album || track.album,
    releaseYear: media.releaseYear ?? track.release_year,
    durationMs: media.durationMs ?? track.duration_ms,
    tags: tagsForTrack(track),
    color: songColor(track.spotify_track_id),
    coverImage: media.coverImage || track.cover_url || undefined,
  };
}

export function mergeSongMedia(song: Song, media: CardMedia | undefined): Song {
  if (!media) return song;
  return {
    ...song,
    title: media.title || song.title,
    artist: media.artist || song.artist,
    album: media.album || song.album,
    releaseYear: media.releaseYear ?? song.releaseYear,
    durationMs: media.durationMs ?? song.durationMs,
    coverImage: media.coverImage || song.coverImage,
  };
}

export async function loadCardCoverMedia(trackIds: string[]): Promise<Map<string, CardMedia>> {
  const media = new Map<string, CardMedia>();
  const chunkSize = 50;
  try {
    for (let i = 0; i < trackIds.length; i += chunkSize) {
      const ids = trackIds.slice(i, i + chunkSize);
      const res = await fetch(`/api/tracks?ids=${encodeURIComponent(ids.join(','))}`);
      if (!res.ok) throw new Error(`Track cover metadata unavailable (${res.status})`);
      const data = (await res.json()) as { tracks?: Array<CardMedia & { id?: string }> };
      for (const track of data.tracks ?? []) {
        if (track.id) media.set(track.id, track);
      }
    }
    return media;
  } catch (error) {
    console.warn('Failed to load track cover media:', error);
    return media;
  }
}

export async function loadGeneratedSongs(limit = 100): Promise<Song[]> {
  const { data, error } = await supabase
    .from('top_tracks')
    .select('spotify_track_id, rank, name, artist, album, release_year, duration_ms, cover_url, energy, danceability, valence, acousticness, speechiness')
    .order('rank', { ascending: true })
    .limit(limit);
  if (error) throw error;

  const tracks = (data ?? []) as TopTrackRow[];
  if (tracks.length === 0) return [];

  return tracks.map((track) => trackToSong(track));
}
