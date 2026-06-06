import { useEffect, useRef, useState } from 'react';
import { recordSwipeAndUpdateTaste } from '../recommendations.js';
import type { Song } from '../types.js';
import {
  loadExploreRecommendationSongs,
  loadGeneratedSongs,
  mergeSongMedia,
  streamCardCoverMedia,
} from '../trackCards.js';
import { supabase } from '../supabase.js';
import { emitLikedChange } from '../likedEvents.js';
import { SwipeCard } from '../components/SwipeCard.js';
import { DeckLoader } from '../components/DeckLoader.js';

const BATCH_SIZE = 15;

type ExitingCard = { song: Song; direction: 'left' | 'right'; fromX: number; uid: number };

export function ExplorePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [exitingCards, setExitingCards] = useState<ExitingCard[]>([]);
  const exitUidRef = useRef(0);
  const mediaRefreshKey = useRef('');
  const mediaAliveRef = useRef(true);
  const loadedUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    mediaAliveRef.current = true;
    return () => {
      mediaAliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailableCards() {
      return loadGeneratedSongs();
    }

    async function init(userId: string | null) {
      setLoading(true);
      try {
        const recommended = userId ? await loadExploreRecommendationSongs(userId, BATCH_SIZE) : [];
        const cards = recommended.length > 0 ? recommended : await loadAvailableCards();
        if (!cancelled) {
          setSongs(cards);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.warn('Failed to load Explore recommendations:', error);
        try {
          const cards = await loadAvailableCards();
          if (!cancelled) {
            setSongs(cards);
            setCurrentIndex(0);
          }
        } catch (fallbackError) {
          console.warn('Failed to load explore cards:', fallbackError);
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
  }, []);

  useEffect(() => {
    const key = songs.map((song) => song.id).join(',');
    if (key === mediaRefreshKey.current) return;
    mediaRefreshKey.current = key;

    const songsMissingMedia = songs.filter((song) => !song.coverImage);
    if (songsMissingMedia.length === 0) return;

    void streamCardCoverMedia(
      songsMissingMedia.map((song) => song.id),
      (mediaById) => {
        setSongs((current) => current.map((song) => mergeSongMedia(song, mediaById.get(song.id))));
      },
      { shouldContinue: () => mediaAliveRef.current && mediaRefreshKey.current === key }
    );
  }, [songs]);

  const removeCard = async (direction: 'left' | 'right', fromX = 0) => {
    if (currentIndex < songs.length) {
      const song = songs[currentIndex];
      const uid = (exitUidRef.current += 1);
      setExitingCards((cards) => [...cards, { song, direction, fromX, uid }]);
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      const userId = meId;
      if (userId) {
        // Optimistically tell the Liked Songs tab so its count and mini-cards update in real time.
        if (direction === 'right') {
          emitLikedChange({ kind: 'added', song, source: 'EXPLORE', swipedAt: new Date().toISOString() });
        }
        const { error } = await recordSwipeAndUpdateTaste(song.id, 'EXPLORE', direction);
        if (error) console.warn('Failed to record Explore swipe:', error.message);
      }

      if (userId && nextIndex >= songs.length) {
        setLoading(true);
        try {
          const nextBatch = await loadExploreRecommendationSongs(userId, BATCH_SIZE);
          setSongs(nextBatch);
          setCurrentIndex(0);
        } catch (error) {
          console.warn('Failed to load next Explore recommendations:', error);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (loading || currentIndex >= songs.length) return;
      event.preventDefault();
      void removeCard(event.key === 'ArrowRight' ? 'right' : 'left');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading, currentIndex, songs, meId]);

  const visibleCards = songs.slice(currentIndex, currentIndex + 3);

  return (
    <div className="sift-feed-page">
      <div className="sift-feed-panel">
        <div className="sift-feed-heading">
          <div>
            <p>Fresh picks</p>
            <h1>Explore</h1>
          </div>
        </div>
        <div className="sift-deck-frame">
          {loading ? (
            <DeckLoader />
          ) : visibleCards.length === 0 && exitingCards.length === 0 ? (
            <div className="sift-empty"><p>No more songs to explore!</p></div>
          ) : (
            visibleCards.map((song, index) => (
              <SwipeCard
                key={song.id}
                song={song}
                index={index}
                onSwipe={removeCard}
                isTop={index === 0}
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
