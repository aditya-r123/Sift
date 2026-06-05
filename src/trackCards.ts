import { supabase } from './supabase.js';
import type { Song } from './songs.js';

export type CardMedia = {
  title?: string;
  artist?: string;
  album?: string;
  releaseYear?: number | null;
  durationMs?: number | null;
  coverImage?: string;
  previewUrl?: string;
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

type RecommendationRow = {
  spotify_track_id: string;
  name: string;
  artist: string;
  energy: number | null;
  danceability: number | null;
  valence: number | null;
  acousticness: number | null;
  speechiness: number | null;
  match_type?: string | null;
  top_match_axis?: string | null;
  recommended_by?: string | null;
  inverted_axis?: string | null;
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

function trackToSong(track: TopTrackRow, media: CardMedia = {}, extraTags: string[] = []): Song {
  return {
    id: track.spotify_track_id,
    title: media.title || track.name,
    artist: media.artist || track.artist,
    album: media.album || track.album,
    releaseYear: media.releaseYear ?? track.release_year,
    durationMs: media.durationMs ?? track.duration_ms,
    tags: uniqueTags([...extraTags, ...tagsForTrack(track)]),
    color: songColor(track.spotify_track_id),
    coverImage: media.coverImage || track.cover_url || undefined,
  };
}

function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.filter((tag) => tag.trim().length > 0))];
}

function recommendationTags(row: RecommendationRow): string[] {
  const tags: string[] = [];
  if (row.match_type === 'friend_like') tags.push(row.recommended_by ? `Friend: ${row.recommended_by}` : 'Friend Pick');
  if (row.match_type === 'wildcard') tags.push('Wildcard');
  if (row.match_type === 'exploit') tags.push('Taste Match');
  if (row.match_type === 'opposite') tags.push('Explore');
  if (row.top_match_axis) tags.push(`Matches ${humanizeAxis(row.top_match_axis)}`);
  if (row.inverted_axis) tags.push(`Opposite ${humanizeAxis(row.inverted_axis)}`);
  return tags;
}

function humanizeAxis(axis: string): string {
  return axis
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function recommendationRowToTrack(row: RecommendationRow, index: number): TopTrackRow {
  return {
    spotify_track_id: row.spotify_track_id,
    rank: index + 1,
    name: row.name,
    artist: row.artist,
    album: '',
    release_year: null,
    duration_ms: null,
    cover_url: null,
    energy: row.energy,
    danceability: row.danceability,
    valence: row.valence,
    acousticness: row.acousticness,
    speechiness: row.speechiness,
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
    previewUrl: media.previewUrl || song.previewUrl,
  };
}

export async function loadTrackPreview(trackId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`/api/tracks?ids=${encodeURIComponent(trackId)}`);
    if (!res.ok) return undefined;
    const data = (await res.json()) as { tracks?: Array<CardMedia & { id?: string }> };
    return data.tracks?.find((track) => track.id === trackId)?.previewUrl || undefined;
  } catch (error) {
    console.warn('Failed to load track preview:', error);
    return undefined;
  }
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

async function loadTopTracksByIds(trackIds: string[]): Promise<Map<string, TopTrackRow>> {
  const tracksById = new Map<string, TopTrackRow>();
  if (trackIds.length === 0) return tracksById;

  const { data, error } = await supabase
    .from('top_tracks')
    .select('spotify_track_id, rank, name, artist, album, release_year, duration_ms, cover_url, energy, danceability, valence, acousticness, speechiness')
    .in('spotify_track_id', trackIds);

  if (error) {
    console.warn('Failed to load recommended card details:', error.message);
    return tracksById;
  }

  for (const track of (data ?? []) as TopTrackRow[]) {
    tracksById.set(track.spotify_track_id, track);
  }

  return tracksById;
}

async function recommendationRowsToSongs(rows: RecommendationRow[]): Promise<Song[]> {
  const trackIds = rows.map((row) => row.spotify_track_id);
  const [tracksById, mediaById] = await Promise.all([loadTopTracksByIds(trackIds), loadCardCoverMedia(trackIds)]);

  return rows.map((row, index) => {
    const track = tracksById.get(row.spotify_track_id) ?? recommendationRowToTrack(row, index);
    return trackToSong(track, mediaById.get(row.spotify_track_id), recommendationTags(row));
  });
}

export async function loadDiscoverRecommendationSongs(userId: string, limit = 5): Promise<Song[]> {
  const { data, error } = await supabase.rpc('get_discover_batch', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) throw error;

  return recommendationRowsToSongs((data ?? []) as RecommendationRow[]);
}

export async function loadExploreRecommendationSongs(userId: string, limit = 5): Promise<Song[]> {
  const { data, error } = await supabase.rpc('get_explore_batch', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) throw error;

  return recommendationRowsToSongs((data ?? []) as RecommendationRow[]);
}
