import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Heart, ListPlus, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { LikedSongMiniCard, type LikedSong } from '../components/LikedSongMiniCard.js';
import { LikedSongsControls, type LikedSongsSortMode } from '../components/LikedSongsControls.js';
import { supabase } from '../supabase.js';
import type { Song } from '../types.js';
import { loadCardCoverMedia, loadSongsByIds, type CardMedia } from '../trackCards.js';

type SwipeRow = {
  song_id: string;
  swiped_at: string | null;
  source?: string | null;
};

type PlaylistCreateResult = {
  playlistId?: string;
  playlistUrl?: string;
  trackCount?: number;
  addedTrackCount?: number;
  error?: string;
  reconnectSpotify?: boolean;
};

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message) return obj.message;
  }
  return 'Unknown error';
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function toLikedSong(song: Song, row: SwipeRow): LikedSong {
  return { ...song, swipedAt: row.swiped_at, source: row.source ?? null };
}

function applyMedia(song: LikedSong, media: CardMedia | undefined): LikedSong {
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

export function LikedSongsPage() {
  const [meId, setMeId] = useState<string | null>(null);
  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [artistFilter, setArtistFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sortMode, setSortMode] = useState<LikedSongsSortMode>('newest');
  const [playlistCreating, setPlaylistCreating] = useState(false);
  const [playlistResult, setPlaylistResult] = useState<PlaylistCreateResult | null>(null);
  const [removingSongIds, setRemovingSongIds] = useState<Set<string>>(() => new Set());
  const [removeMessage, setRemoveMessage] = useState<string | null>(null);
  const mediaRefreshKey = useRef('');

  useEffect(() => {
    let cancelled = false;

    async function load(userId: string | null) {
      setLoading(true);
      setError(null);
      if (!userId) {
        setLikedSongs([]);
        setLoading(false);
        return;
      }

      try {
        const swipes = await supabase
          .from('swipes')
          .select('song_id, swiped_at, source')
          .eq('user_id', userId)
          .eq('direction', 'YES')
          .order('swiped_at', { ascending: false });

        if (swipes.error) throw swipes.error;

        const rows = (swipes.data ?? []) as SwipeRow[];
        const catalog = await loadSongsByIds(rows.map((row) => row.song_id));
        const songById = new Map(catalog.map((song) => [song.id, song]));
        const next = rows.flatMap((row) => {
          const song = songById.get(row.song_id);
          return song ? [toLikedSong(song, row)] : [];
        });

        if (!cancelled) setLikedSongs(next);
      } catch (e) {
        if (!cancelled) {
          setError(errorMessage(e));
          setLikedSongs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const id = data.session?.user.id ?? null;
      setMeId(id);
      void load(id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setMeId(id);
      void load(id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshMissingMedia() {
      const songsMissingMedia = likedSongs.filter((song) => !song.coverImage);
      if (songsMissingMedia.length === 0) return;

      const key = songsMissingMedia.map((song) => song.id).join(',');
      if (key === mediaRefreshKey.current) return;

      const mediaById = await loadCardCoverMedia(songsMissingMedia.map((song) => song.id));
      if (cancelled || mediaById.size === 0) return;
      mediaRefreshKey.current = key;

      setLikedSongs((current) => current.map((song) => applyMedia(song, mediaById.get(song.id))));
    }

    void refreshMissingMedia();

    return () => {
      cancelled = true;
    };
  }, [likedSongs]);

  const artists = useMemo(
    () => Array.from(new Set(likedSongs.map((song) => song.artist))).sort(compareText),
    [likedSongs]
  );

  const years = useMemo(
    () =>
      Array.from(new Set(likedSongs.map((song) => song.releaseYear).filter((year): year is number => typeof year === 'number')))
        .sort((a, b) => b - a),
    [likedSongs]
  );

  const filteredSongs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = likedSongs.filter((song) => {
      const matchesSearch =
        !q ||
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        (song.album ?? '').toLowerCase().includes(q) ||
        String(song.releaseYear ?? '').includes(q);
      const matchesArtist = artistFilter === 'all' || song.artist === artistFilter;
      const matchesYear = yearFilter === 'all' || String(song.releaseYear ?? '') === yearFilter;
      return matchesSearch && matchesArtist && matchesYear;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'song') return compareText(a.title, b.title);
      if (sortMode === 'artist') return compareText(a.artist, b.artist) || compareText(a.title, b.title);
      if (sortMode === 'year') return (b.releaseYear ?? 0) - (a.releaseYear ?? 0) || compareText(a.title, b.title);

      const aTime = a.swipedAt ? new Date(a.swipedAt).getTime() : 0;
      const bTime = b.swipedAt ? new Date(b.swipedAt).getTime() : 0;
      return sortMode === 'oldest' ? aTime - bTime : bTime - aTime;
    });
  }, [artistFilter, likedSongs, query, sortMode, yearFilter]);

  async function createSpotifyPlaylist() {
    if (playlistCreating || likedSongs.length === 0) return;
    setPlaylistCreating(true);
    setPlaylistResult(null);
    try {
      const res = await fetch('/api/liked-songs-playlist', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Sift Liked Songs',
          trackIds: likedSongs.map((song) => song.id),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as PlaylistCreateResult;
      if (!res.ok) {
        setPlaylistResult({
          ...payload,
          error: payload.error || res.statusText,
        });
        return;
      }
      setPlaylistResult(payload);
    } catch (e) {
      setPlaylistResult({ error: errorMessage(e) });
    } finally {
      setPlaylistCreating(false);
    }
  }

  async function retryAddTracksToPlaylist(playlistId: string) {
    if (playlistCreating || likedSongs.length === 0) return;
    setPlaylistCreating(true);
    try {
      const res = await fetch(`/api/liked-songs-playlist/${encodeURIComponent(playlistId)}/tracks`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackIds: likedSongs.map((song) => song.id),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as PlaylistCreateResult;
      if (!res.ok) {
        setPlaylistResult((current) => ({
          ...current,
          ...payload,
          error: payload.error || res.statusText,
        }));
        return;
      }
      setPlaylistResult((current) => ({
        playlistId,
        playlistUrl: current?.playlistUrl,
        trackCount: payload.trackCount,
        addedTrackCount: payload.addedTrackCount,
      }));
    } catch (e) {
      setPlaylistResult((current) => ({
        ...current,
        error: errorMessage(e),
      }));
    } finally {
      setPlaylistCreating(false);
    }
  }

  async function removeLikedSong(song: LikedSong) {
    if (!meId || removingSongIds.has(song.id)) return;

    setError(null);
    setRemoveMessage(null);
    setRemovingSongIds((current) => new Set(current).add(song.id));
    setLikedSongs((current) => current.filter((candidate) => candidate.id !== song.id));

    try {
      const { error } = await supabase
        .from('swipes')
        .delete()
        .eq('user_id', meId)
        .eq('song_id', song.id)
        .eq('direction', 'YES');

      if (error) throw error;
      setRemoveMessage(`${song.title} was removed from Liked Songs and can show up again in Discover or Explore.`);
    } catch (e) {
      setLikedSongs((current) => (current.some((candidate) => candidate.id === song.id) ? current : [song, ...current]));
      setError(`Could not remove ${song.title}: ${errorMessage(e)}`);
    } finally {
      setRemovingSongIds((current) => {
        const next = new Set(current);
        next.delete(song.id);
        return next;
      });
    }
  }

  const playlistSucceeded =
    !!playlistResult?.playlistUrl &&
    !playlistResult.error &&
    (playlistResult.addedTrackCount ?? playlistResult.trackCount ?? 0) > 0;

  if (!meId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Liked Songs</h1>
          <p className="text-gray-400">Sign in to see songs you have swiped right on.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Liked Songs</h1>
            <p className="text-gray-400">
              {likedSongs.length === 1 ? '1 right-swipe saved' : `${likedSongs.length} right-swipes saved`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center gap-2 text-teal-300 text-sm bg-[#14211f] border border-teal-500/20 rounded-full px-3 py-2">
              <Heart className="w-4 h-4 fill-current" />
              Swipe archive
            </div>
            <button
              type="button"
              onClick={() => void createSpotifyPlaylist()}
              disabled={playlistCreating || likedSongs.length === 0}
              className="inline-flex items-center gap-2 text-white text-sm bg-[#1a1a1a] hover:bg-[#222] border border-white/10 rounded-full px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ListPlus className="w-4 h-4" />
              {playlistCreating ? 'Creating...' : 'Make playlist'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        {removeMessage && (
          <div className="mb-4 rounded-2xl border border-teal-400/20 bg-teal-950/30 px-4 py-3">
            <p className="text-sm text-teal-200">{removeMessage}</p>
          </div>
        )}
        {playlistResult?.error && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-950/30 px-4 py-3">
            <p className="text-sm text-red-300">{playlistResult.error}</p>
            {(playlistResult.reconnectSpotify || playlistResult.playlistId) && (
              <div className="flex flex-wrap gap-3 mt-3">
                {playlistResult.reconnectSpotify && (
                  <a
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-sm text-white bg-[#2a2a2a] hover:bg-[#333] rounded-full px-3 py-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reconnect Spotify
                  </a>
                )}
                {playlistResult.playlistId && (
                  <button
                    type="button"
                    onClick={() => void retryAddTracksToPlaylist(playlistResult.playlistId!)}
                    disabled={playlistCreating}
                    className="inline-flex items-center gap-2 text-sm text-white bg-[#2a2a2a] hover:bg-[#333] rounded-full px-3 py-2 disabled:opacity-50"
                  >
                    <ListPlus className="w-4 h-4" />
                    {playlistCreating ? 'Adding...' : 'Retry adding songs'}
                  </button>
                )}
                {playlistResult.playlistUrl && (
                  <a href={playlistResult.playlistUrl} className="inline-flex items-center gap-2 text-sm text-red-200 hover:text-white py-2">
                    <ExternalLink className="w-4 h-4" />
                    Open empty playlist
                  </a>
                )}
              </div>
            )}
          </div>
        )}
        {playlistSucceeded && playlistResult?.playlistUrl && (
          <div className="mb-4 rounded-2xl border border-teal-400/20 bg-teal-950/30 px-4 py-3">
            <p className="text-sm text-teal-200">
              Created Spotify playlist with {playlistResult.addedTrackCount ?? playlistResult.trackCount ?? likedSongs.length} songs.
            </p>
            <a href={playlistResult.playlistUrl} className="inline-flex items-center gap-2 text-sm text-teal-300 hover:text-teal-100 mt-2">
              <ExternalLink className="w-4 h-4" />
              Open Spotify playlist
            </a>
          </div>
        )}

        <LikedSongsControls
          artists={artists}
          artistFilter={artistFilter}
          onArtistFilterChange={setArtistFilter}
          onQueryChange={setQuery}
          onSortModeChange={setSortMode}
          onYearFilterChange={setYearFilter}
          query={query}
          sortMode={sortMode}
          yearFilter={yearFilter}
          years={years}
        />

        <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
          <SlidersHorizontal className="w-4 h-4" />
          <span>
            {filteredSongs.length === likedSongs.length
              ? `${filteredSongs.length} songs`
              : `${filteredSongs.length} of ${likedSongs.length} songs`}
          </span>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : likedSongs.length === 0 ? (
          <p className="text-gray-500 text-sm">No right-swipes yet. Like songs in Discover or Explore to build this list.</p>
        ) : filteredSongs.length === 0 ? (
          <p className="text-gray-500 text-sm">No liked songs match your filters.</p>
        ) : (
          <div className="overflow-y-scroll pr-2" style={{ maxHeight: '62vh', scrollbarGutter: 'stable' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredSongs.map((song) => (
                <LikedSongMiniCard
                  key={`${song.id}-${song.swipedAt ?? ''}`}
                  isRemoving={removingSongIds.has(song.id)}
                  song={song}
                  onRemove={removeLikedSong}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
