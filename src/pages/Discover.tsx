import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Heart, X } from 'lucide-react';
import { supabase } from '../supabase.js';
import { songs, type Song } from '../songs.js';
import { formatDuration, loadCardCoverMedia, loadGeneratedSongs, mergeSongMedia } from '../trackCards.js';

const BATCH_SIZE = 5;

function pickNextBatch(
  sourceSongs: Song[],
  seenIds: Set<string>,
  tagScores: Record<string, number>
): Song[] {
  const unseen = sourceSongs.filter((s) => !seenIds.has(s.id));
  if (unseen.length === 0) return [];

  const scored = unseen.map((s) => ({
    song: s,
    score: s.tags.reduce((sum, tag) => sum + (tagScores[tag] ?? 0), 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, BATCH_SIZE).map((s) => s.song);
}

export function DiscoverPage() {
  const [meId, setMeId] = useState<string | null>(null);
  const [sourceSongs, setSourceSongs] = useState<Song[]>(songs);
  const [currentBatch, setCurrentBatch] = useState<Song[]>([]);
  const [batchSwipes, setBatchSwipes] = useState<Record<string, 'left' | 'right'>>({});
  const [tagScores, setTagScores] = useState<Record<string, number>>({});
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const mediaRefreshKey = useRef('');

  // ref so recordSwipe always sees the latest state without stale closures
  const stateRef = useRef({ seenIds, tagScores, batchSwipes, currentBatch, sourceSongs });
  stateRef.current = { seenIds, tagScores, batchSwipes, currentBatch, sourceSongs };

  const startBatch = useCallback(
    (source: Song[], seen: Set<string>, scores: Record<string, number>) => {
      const batch = pickNextBatch(source, seen, scores);
      setCurrentBatch(batch);
      setBatchSwipes({});
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function init(userId: string | null) {
      let cards = songs;
      try {
        const generated = await loadGeneratedSongs();
        if (generated.length > 0) cards = generated;
      } catch (error) {
        console.warn('Failed to load generated cards:', error);
      }

      if (!userId) {
        setSourceSongs(cards);
        setLoading(false);
        startBatch(cards, new Set(), {});
        return;
      }

      try {
        const { data, error } = await supabase
          .from('swipes')
          .select('song_id, direction')
          .eq('user_id', userId);
        if (error) throw error;

        const seen = new Set<string>();
        const scores: Record<string, number> = {};

        for (const row of data ?? []) {
          seen.add(row.song_id as string);
          const song = cards.find((s) => s.id === row.song_id);
          if (song) {
            const delta = row.direction === 'right' ? 1 : -0.5;
            for (const tag of song.tags) {
              scores[tag] = (scores[tag] ?? 0) + delta;
            }
          }
        }

        if (!cancelled) {
          setSourceSongs(cards);
          setSeenIds(seen);
          setTagScores(scores);
          startBatch(cards, seen, scores);
        }
      } catch {
        // swipe history unavailable — just start fresh
        if (!cancelled) {
          setSourceSongs(cards);
          startBatch(cards, new Set(), {});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const id = data.session?.user.id ?? null;
      setMeId(id);
      void init(id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setMeId(id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [startBatch]);

  useEffect(() => {
    let cancelled = false;

    async function refreshMissingMedia() {
      const songsMissingMedia = sourceSongs.filter((song) => !song.coverImage);
      if (songsMissingMedia.length === 0) return;

      const key = songsMissingMedia.map((song) => song.id).join(',');
      if (key === mediaRefreshKey.current) return;

      const mediaById = await loadCardCoverMedia(songsMissingMedia.map((song) => song.id));
      if (cancelled || mediaById.size === 0) return;
      mediaRefreshKey.current = key;

      setSourceSongs((current) => current.map((song) => mergeSongMedia(song, mediaById.get(song.id))));
      setCurrentBatch((current) => current.map((song) => mergeSongMedia(song, mediaById.get(song.id))));
    }

    void refreshMissingMedia();

    return () => {
      cancelled = true;
    };
  }, [sourceSongs]);

  const recordSwipe = useCallback(
    async (song: Song, direction: 'left' | 'right') => {
      const { seenIds: currentSeen, tagScores: currentScores, batchSwipes: currentBatch, currentBatch: batch, sourceSongs: source } =
        stateRef.current;

      const nextSeen = new Set(currentSeen);
      nextSeen.add(song.id);

      const delta = direction === 'right' ? 1 : -0.5;
      const nextScores = { ...currentScores };
      for (const tag of song.tags) {
        nextScores[tag] = (nextScores[tag] ?? 0) + delta;
      }

      const nextBatchSwipes = { ...currentBatch, [song.id]: direction };

      setSeenIds(nextSeen);
      setTagScores(nextScores);
      setBatchSwipes(nextBatchSwipes);

      const userId = meId;
      if (userId) {
        supabase
          .from('swipes')
          .upsert({ user_id: userId, song_id: song.id, direction })
          .then(({ error }) => {
            if (error) console.warn('Failed to save swipe:', error.message);
          });
      }

      if (Object.keys(nextBatchSwipes).length >= batch.length) {
        startBatch(source, nextSeen, nextScores);
      }
    },
    [meId, startBatch]
  );

  const [topIndex, setTopIndex] = useState(0);

  useEffect(() => {
    setTopIndex(0);
  }, [currentBatch]);

  const handleSwipe = useCallback(
    (song: Song, direction: 'left' | 'right') => {
      setTopIndex((i) => i + 1);
      void recordSwipe(song, direction);
    },
    [recordSwipe]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  const visibleCards = currentBatch.slice(topIndex, topIndex + 3);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-lg px-6 -mt-8">
        <h1 className="text-3xl font-bold text-white mb-8">Discover</h1>
        <div className="h-[520px] relative">
          {visibleCards.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500 text-lg">You've heard it all!</p>
            </div>
          ) : (
            visibleCards.map((song, index) => (
              <SwipeCard
                key={song.id}
                song={song}
                index={index}
                isTop={index === 0}
                onSwipe={(direction) => handleSwipe(song, direction)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SwipeCard({
  song,
  index,
  isTop,
  onSwipe,
}: {
  song: Song;
  index: number;
  isTop: boolean;
  onSwipe: (direction: 'left' | 'right') => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_event: PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onSwipe(info.offset.x > 0 ? 'right' : 'left');
    }
  };

  return (
    <motion.div
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1,
        zIndex: 10 - index,
        scale: 1 - index * 0.05,
      }}
      onDragEnd={handleDragEnd}
      animate={{
        scale: 1 - index * 0.05,
        y: index * 10,
      }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="w-full h-full bg-[#1a1a1a] rounded-3xl p-8 flex flex-col shadow-2xl">
        <div>
          {song.tags.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {song.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-gray-400 px-3 py-1.5 bg-[#2a2a2a] rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center">
          {song.coverImage ? (
            <img
              src={song.coverImage}
              alt={`${song.title} cover`}
              className="w-64 h-64 rounded-3xl shadow-lg object-cover"
            />
          ) : (
            <div
              className="w-64 h-64 rounded-3xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: song.color }}
            >
              <div className="w-32 h-32 bg-white/20 rounded-2xl" />
            </div>
          )}
        </div>

        <div className="text-center">
          <h3 className="text-white font-bold text-3xl mb-2">{song.title}</h3>
          <p className="text-gray-400 text-lg">{song.artist}</p>
          {[song.album, song.releaseYear, formatDuration(song.durationMs)].filter(Boolean).length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {[song.album, song.releaseYear, formatDuration(song.durationMs)].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {isTop && (
          <div className="flex justify-center gap-6 mt-6">
            <button
              type="button"
              onClick={() => onSwipe('left')}
              className="w-14 h-14 rounded-full bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center transition-colors"
              aria-label="Pass"
            >
              <X className="w-6 h-6 text-gray-300" />
            </button>
            <button
              type="button"
              onClick={() => onSwipe('right')}
              className="w-14 h-14 rounded-full bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center transition-colors"
              aria-label="Like"
            >
              <Heart className="w-6 h-6 text-teal-400" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
