import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Heart, X, Play, Pause } from 'lucide-react';
import { type Song } from '../songs.js';
import { formatDuration, loadTrackPreview } from '../trackCards.js';

/** Color-code a tag by its category so genres, audio features, moods and recommendation sources read at a glance. */
function tagStyle(tag: string): string {
  const t = tag.toLowerCase();
  // Recommendation / source tags (where the card came from).
  if (
    t.startsWith('friend') ||
    t.startsWith('matches') ||
    t.startsWith('opposite') ||
    ['discover', 'wildcard', 'taste match', 'explore'].includes(t)
  ) {
    return 'bg-blue-500/15 text-blue-300';
  }
  // Genre tags.
  if (
    ['hip-hop', 'rap', 'r&b', 'pop', 'rock', 'indie', 'jazz', 'soul', 'electronic', 'edm', 'country', 'metal', 'classical', 'reggae', 'latin'].includes(t)
  ) {
    return 'bg-purple-500/15 text-purple-300';
  }
  // Audio-feature tags.
  if (['energy', 'danceability', 'bpm', 'produced', 'vocal', 'acoustic', 'tempo', 'instrumental'].includes(t)) {
    return 'bg-teal-500/15 text-teal-300';
  }
  // Mood / listening-habit tags.
  if (['chill', 'on repeat', 'upbeat', 'popular', 'happy', 'sad', 'mellow'].includes(t)) {
    return 'bg-amber-500/15 text-amber-300';
  }
  return 'bg-[#2a2a2a] text-gray-400';
}

/**
 * Shared card used by both the Discover and Explore feeds so the two pages stay identical:
 * draggable swipe, single-line scrollable title/metadata, audio preview controls, and pass/like buttons.
 */
export function SwipeCard({
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

  const meta = [song.album, song.releaseYear, formatDuration(song.durationMs)].filter(Boolean).join(' · ');

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
      <div className="w-full h-full bg-[#1a1a1a] rounded-3xl p-6 flex flex-col items-center overflow-hidden shadow-2xl">
        <div className="card-scroll-x w-full h-8 shrink-0">
          {song.tags.length > 0 && (
            <div className="flex gap-1.5 w-max items-center h-6">
              {song.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`text-[10px] leading-none px-2 py-1 rounded-full whitespace-nowrap ${tagStyle(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center min-h-0 py-3">
          {song.coverImage ? (
            <img
              src={song.coverImage}
              alt={`${song.title} cover`}
              className="w-48 h-48 rounded-2xl shadow-lg object-cover"
            />
          ) : (
            <div
              className="w-48 h-48 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: song.color }}
            >
              <div className="w-24 h-24 bg-white/20 rounded-2xl" />
            </div>
          )}
        </div>

        <div className="w-full shrink-0">
          <div className="card-scroll-x text-center mb-1">
            <h3 className="text-white font-bold text-2xl inline-block">{song.title}</h3>
          </div>
          <p className="text-gray-400 text-base text-center truncate">{song.artist}</p>
          <div className="card-scroll-x text-center mt-1 h-5">
            {meta.length > 0 && <p className="text-sm text-gray-500 inline-block">{meta}</p>}
          </div>
        </div>

        {isTop && <AudioPreview song={song} />}

        {isTop && (
          <div className="flex justify-center gap-6 mt-3 shrink-0">
            <button
              type="button"
              onClick={() => onSwipe('left')}
              className="w-12 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center transition-colors"
              aria-label="Pass"
            >
              <X className="w-6 h-6 text-gray-300" />
            </button>
            <button
              type="button"
              onClick={() => onSwipe('right')}
              className="w-12 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center transition-colors"
              aria-label="Like"
            >
              <Heart className="w-6 h-6 text-green-400" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Play / pause control backed by a 30s preview, lazily fetched when the card becomes active. */
function AudioPreview({ song }: { song: Song }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(song.previewUrl);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setPreviewUrl(song.previewUrl);
  }, [song.id, song.previewUrl]);

  useEffect(() => {
    if (previewUrl) return;
    let cancelled = false;
    void loadTrackPreview(song.id).then((url) => {
      if (!cancelled && url) setPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [song.id, previewUrl]);

  // Pause whenever the card goes away (unmount).
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;
    if (audio.paused) {
      void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center mt-3 shrink-0"
      // Keep the button press from starting a card drag.
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={togglePlay}
        disabled={!previewUrl}
        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
        className="w-11 h-11 rounded-full bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-blue-400" />
        ) : (
          <Play className="w-5 h-5 text-blue-400 translate-x-px" />
        )}
      </button>
      <audio
        ref={audioRef}
        src={previewUrl}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </div>
  );
}
