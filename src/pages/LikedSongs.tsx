import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, SlidersHorizontal } from 'lucide-react';
import { LikedSongMiniCard, type LikedSong } from '../components/LikedSongMiniCard.js';
import { LikedSongsControls, type LikedSongsSortMode } from '../components/LikedSongsControls.js';
import { supabase } from '../supabase.js';
import { songs as fallbackSongs, type Song } from '../songs.js';
import { loadCardCoverMedia, loadGeneratedSongs, type CardMedia } from '../trackCards.js';

type SwipeRow = {
  song_id: string;
  swiped_at: string | null;
  source?: string | null;
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
        const [generated, swipes] = await Promise.all([
          loadGeneratedSongs().catch(() => []),
          supabase
            .from('swipes')
            .select('song_id, swiped_at, source')
            .eq('user_id', userId)
            .eq('direction', 'YES')
            .order('swiped_at', { ascending: false }),
        ]);

        if (swipes.error) throw swipes.error;

        const catalog = generated.length > 0 ? generated : fallbackSongs;
        const songById = new Map(catalog.map((song) => [song.id, song]));
        const rows = (swipes.data ?? []) as SwipeRow[];
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
          <div className="inline-flex items-center gap-2 text-teal-300 text-sm bg-[#14211f] border border-teal-500/20 rounded-full px-3 py-2 self-start sm:self-auto">
            <Heart className="w-4 h-4 fill-current" />
            Swipe archive
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

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
                <LikedSongMiniCard key={`${song.id}-${song.swipedAt ?? ''}`} song={song} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
