import { useCallback, useEffect, useRef, useState } from 'react';
import { recordSwipeAndUpdateTaste, scoreSavedSwipe } from '../recommendations.js';
import { supabase } from '../supabase.js';
import type { Song } from '../types.js';
import {
  loadDiscoverRecommendationSongs,
  loadGeneratedSongs,
  mergeSongMedia,
  streamCardCoverMedia,
} from '../trackCards.js';
import { SwipeCard } from '../components/SwipeCard.js';
import { DeckLoader } from '../components/DeckLoader.js';

const BATCH_SIZE = 15;

type ExitingCard = { song: Song; direction: 'left' | 'right'; fromX: number; uid: number };

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
  const [sourceSongs, setSourceSongs] = useState<Song[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Song[]>([]);
  const [batchSwipes, setBatchSwipes] = useState<Record<string, 'left' | 'right'>>({});
  const [tagScores, setTagScores] = useState<Record<string, number>>({});
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const mediaRefreshKey = useRef('');
  const mediaAliveRef = useRef(true);
  const loadedUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    mediaAliveRef.current = true;
    return () => {
      mediaAliveRef.current = false;
    };
  }, []);

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
      let cards: Song[] = [];
      try {
        cards = await loadGeneratedSongs();
      } catch (error) {
        console.warn('Failed to load Discover cards:', error);
      }

      if (!userId) {
        setSourceSongs(cards);
        setLoading(false);
        startBatch(cards, new Set(), {});
        return;
      }

      try {
        const batch = await loadDiscoverRecommendationSongs(userId, BATCH_SIZE);
        if (!cancelled) {
          setSourceSongs(cards);
          setSeenIds(new Set());
          setTagScores({});
          if (batch.length > 0) {
            setCurrentBatch(batch);
            setBatchSwipes({});
          } else {
            startBatch(cards, new Set(), {});
          }
        }
      } catch (error) {
        console.warn('Failed to load Discover recommendations:', error);

        try {
          const { data, error: swipesError } = await supabase
            .from('swipes')
            .select('song_id, direction')
            .eq('user_id', userId);
          if (swipesError) throw swipesError;

          const seen = new Set<string>();
          const scores: Record<string, number> = {};

          for (const row of data ?? []) {
            seen.add(row.song_id as string);
            const song = cards.find((s) => s.id === row.song_id);
            if (song) {
              const delta = scoreSavedSwipe(row.direction as string);
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
          // swipe history unavailable, just start fresh
          if (!cancelled) {
            setSourceSongs(cards);
            startBatch(cards, new Set(), {});
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function loadForSession(userId: string | null) {
      setMeId(userId);
      if (loadedUserIdRef.current === userId) return;
      loadedUserIdRef.current = userId;
      void init(userId);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      loadForSession(data.session?.user.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      loadForSession(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [startBatch]);

  useEffect(() => {
    // Only the on-screen batch needs covers; catalog songs get theirs once they become a batch.
    // Keyed on the batch identity (a ref, not effect cleanup) so the progressive cover updates this
    // stream applies don't cancel it — only a genuinely new batch supersedes it.
    const key = currentBatch.map((song) => song.id).join(',');
    if (key === mediaRefreshKey.current) return;
    mediaRefreshKey.current = key;

    const songsMissingMedia = currentBatch.filter(
      (song, index) => !song.coverImage && currentBatch.findIndex((candidate) => candidate.id === song.id) === index
    );
    if (songsMissingMedia.length === 0) return;

    void streamCardCoverMedia(
      songsMissingMedia.map((song) => song.id),
      (mediaById) => {
        setCurrentBatch((current) => current.map((song) => mergeSongMedia(song, mediaById.get(song.id))));
      },
      { shouldContinue: () => mediaAliveRef.current && mediaRefreshKey.current === key }
    );
  }, [currentBatch]);

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
        const { error } = await recordSwipeAndUpdateTaste(song.id, 'DISCOVER', direction);
        if (error) console.warn('Failed to record Discover swipe:', error.message);
      }

      if (Object.keys(nextBatchSwipes).length >= batch.length) {
        if (userId) {
          try {
            const nextBatch = await loadDiscoverRecommendationSongs(userId, BATCH_SIZE);
            setCurrentBatch(nextBatch);
            setBatchSwipes({});
          } catch (error) {
            console.warn('Failed to load next Discover recommendations:', error);
            startBatch(source, nextSeen, nextScores);
          }
        } else {
          startBatch(source, nextSeen, nextScores);
        }
      }
    },
    [meId, startBatch]
  );

  const [topIndex, setTopIndex] = useState(0);
  const [exitingCards, setExitingCards] = useState<ExitingCard[]>([]);
  const exitUidRef = useRef(0);

  useEffect(() => {
    setTopIndex(0);
  }, [currentBatch]);

  const handleSwipe = useCallback(
    (song: Song, direction: 'left' | 'right', fromX = 0) => {
      const uid = (exitUidRef.current += 1);
      setExitingCards((cards) => [...cards, { song, direction, fromX, uid }]);
      setTopIndex((i) => i + 1);
      void recordSwipe(song, direction);
    },
    [recordSwipe]
  );

  // Arrow keys mirror swiping/clicking: Left = pass, Right = like.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const top = currentBatch[topIndex];
      if (!top) return;
      event.preventDefault();
      handleSwipe(top, event.key === 'ArrowRight' ? 'right' : 'left');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentBatch, topIndex, handleSwipe]);

  if (loading) {
    return (
      <div className="sift-feed-page">
        <DeckLoader />
      </div>
    );
  }

  const visibleCards = currentBatch.slice(topIndex, topIndex + 3);

  return (
    <div className="sift-feed-page">
      <div className="sift-feed-panel">
        <div className="sift-feed-heading">
          <div>
            <p>For you</p>
            <h1>Discover</h1>
          </div>
        </div>
        <div className="sift-deck-frame">
          {visibleCards.length === 0 && exitingCards.length === 0 ? (
            <DeckLoader />
          ) : (
            visibleCards.map((song, index) => (
              <SwipeCard
                key={song.id}
                song={song}
                index={index}
                isTop={index === 0}
                onSwipe={(direction, fromX) => handleSwipe(song, direction, fromX)}
              />
            ))
          )}
          {exitingCards.map((card) => (
            <SwipeCard
              key={`exit-${card.uid}`}
              song={card.song}
              index={0}
              isTop={false}
              exitDirection={card.direction}
              initialX={card.fromX}
              onExitComplete={() => setExitingCards((cards) => cards.filter((c) => c.uid !== card.uid))}
              onSwipe={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
