import { useEffect, useRef, useState } from 'react';
import { recordSwipeAndUpdateTaste } from '../recommendations.js';
import { songs as fallbackSongs, type Song } from '../songs.js';
import {
  loadCardCoverMedia,
  loadExploreRecommendationSongs,
  loadGeneratedSongs,
  mergeSongMedia,
} from '../trackCards.js';
import { supabase } from '../supabase.js';
import { SwipeCard } from '../components/SwipeCard.js';

const BATCH_SIZE = 15;

export function ExplorePage() {
  const [songs, setSongs] = useState<Song[]>(fallbackSongs);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const mediaRefreshKey = useRef('');
  const loadedUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function loadFallbackCards() {
      const generated = await loadGeneratedSongs();
      return generated.length > 0 ? generated : fallbackSongs;
    }

    async function init(userId: string | null) {
      setLoading(true);
      try {
        const cards = userId ? await loadExploreRecommendationSongs(userId, BATCH_SIZE) : await loadFallbackCards();
        if (!cancelled) {
          setSongs(cards);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.warn('Failed to load Explore recommendations:', error);
        try {
          const cards = await loadFallbackCards();
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
    let cancelled = false;

    async function refreshMissingMedia() {
      const songsMissingMedia = songs.filter((song) => !song.coverImage);
      if (songsMissingMedia.length === 0) return;

      const key = songsMissingMedia.map((song) => song.id).join(',');
      if (key === mediaRefreshKey.current) return;

      const mediaById = await loadCardCoverMedia(songsMissingMedia.map((song) => song.id));
      if (cancelled || mediaById.size === 0) return;
      mediaRefreshKey.current = key;

      setSongs((current) => current.map((song) => mergeSongMedia(song, mediaById.get(song.id))));
    }

    void refreshMissingMedia();

    return () => {
      cancelled = true;
    };
  }, [songs]);

  const removeCard = async (direction: 'left' | 'right') => {
    if (currentIndex < songs.length) {
      const song = songs[currentIndex];
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      const userId = meId;
      if (userId) {
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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-lg px-6 -mt-8">
        <h1 className="text-3xl font-bold text-white mb-8">Explore</h1>
        <div className="h-[520px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500 text-lg">Loading…</p>
            </div>
          ) : visibleCards.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500 text-lg">No more songs to explore!</p>
            </div>
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
        </div>
      </div>
    </div>
  );
}
