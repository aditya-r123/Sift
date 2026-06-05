import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Heart, X, Play, Pause } from 'lucide-react';
import { type Song } from '../types.js';
import { formatDuration, loadTrackPreview } from '../trackCards.js';

const FEATURE_ROWS = [
  { key: 'energy', label: 'Energy', color: 'var(--c-energy)' },
  { key: 'danceability', label: 'Dance', color: 'var(--c-dance)' },
  { key: 'valence', label: 'Mood', color: 'var(--c-valence)' },
  { key: 'acousticness', label: 'Acoustic', color: 'var(--c-acoustic)' },
] as const;

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
    return 'tag-source';
  }
  // Genre tags.
  if (
    ['hip-hop', 'rap', 'r&b', 'pop', 'rock', 'indie', 'jazz', 'soul', 'electronic', 'edm', 'country', 'metal', 'classical', 'reggae', 'latin'].includes(t)
  ) {
    return 'tag-genre';
  }
  // Audio-feature tags.
  if (['energy', 'danceability', 'bpm', 'produced', 'vocal', 'acoustic', 'tempo', 'instrumental'].includes(t)) {
    return 'tag-feature';
  }
  // Mood / listening-habit tags.
  if (['chill', 'on repeat', 'upbeat', 'popular', 'happy', 'sad', 'mellow'].includes(t)) {
    return 'tag-mood';
  }
  return 'tag-default';
}

function featurePercent(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

/**
 * Shared card used by both the Discover and Explore feeds so the two pages stay identical:
 * draggable swipe, KEEP/SKIP stamps, feature bars, audio preview controls, and pass/like buttons.
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
  const keepOpacity = useTransform(x, [30, 115], [0, 1]);
  const skipOpacity = useTransform(x, [-115, -30], [1, 0]);
  const keepScale = useTransform(x, [30, 115], [0.86, 1]);
  const skipScale = useTransform(x, [-115, -30], [1, 0.86]);

  const handleDragEnd = (_event: PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onSwipe(info.offset.x > 0 ? 'right' : 'left');
    }
  };

  const meta = [song.album, song.releaseYear, formatDuration(song.durationMs)].filter(Boolean).join(' · ');
  const features = FEATURE_ROWS.map((feature) => ({
    ...feature,
    value: featurePercent(song.features?.[feature.key]),
  })).filter((feature) => feature.value !== null);

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
      className="sift-swipe-shell absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="sift-swipe-card">
        <motion.div className="swipe-stamp keep" style={{ opacity: keepOpacity, scale: keepScale }}>
          KEEP
        </motion.div>
        <motion.div className="swipe-stamp skip" style={{ opacity: skipOpacity, scale: skipScale }}>
          SKIP
        </motion.div>

        <div className="sift-tag-strip">
          {song.tags.length > 0 && (
            <div className="flex gap-1.5 w-max items-center">
              {song.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`sift-tag ${tagStyle(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="sift-cover-stage">
          {song.coverImage ? (
            <img
              src={song.coverImage}
              alt={`${song.title} cover`}
              className="sift-cover-image"
            />
          ) : (
            <div
              className="sift-cover-fallback"
              style={{ backgroundColor: song.color }}
            >
              <div className="sift-cover-fallback-mark" />
            </div>
          )}
        </div>

        <div className="sift-card-copy">
          <h3>{song.title}</h3>
          <p className="sift-artist">{song.artist}</p>
          {meta.length > 0 && <p className="sift-meta">{meta}</p>}
        </div>

        {features.length > 0 && (
          <div className="sift-feature-grid" aria-label="Audio profile">
            {features.map((feature) => (
              <div key={feature.key} className="sift-feature">
                <div className="sift-feature-label">
                  <span>{feature.label}</span>
                  <span>{feature.value}</span>
                </div>
                <div className="sift-feature-bar">
                  <span style={{ width: `${feature.value ?? 0}%`, background: feature.color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {isTop && <AudioPreview song={song} />}

        {isTop && (
          <div className="sift-card-actions">
            <button
              type="button"
              onClick={() => onSwipe('left')}
              className="sift-action no"
              aria-label="Pass"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => onSwipe('right')}
              className="sift-action yes"
              aria-label="Like"
            >
              <Heart className="w-6 h-6" />
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
  const [progress, setProgress] = useState(0);
  const bars = useMemo(
    () => Array.from({ length: 42 }, (_, i) => 0.28 + 0.72 * Math.abs(Math.sin(i * 0.58) * 0.55 + Math.cos(i * 0.23) * 0.45)),
    []
  );

  useEffect(() => {
    setPreviewUrl(song.previewUrl);
    setProgress(0);
    setIsPlaying(false);
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
  const activeBars = Math.max(0, Math.min(bars.length, Math.round(progress * bars.length)));

  return (
    <div
      className="sift-preview"
      // Keep the button press from starting a card drag.
      onPointerDown={(event) => event.stopPropagation()}
      data-no-drag
    >
      <button
        type="button"
        onClick={togglePlay}
        disabled={!previewUrl}
        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
        className="sift-preview-button"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 translate-x-px" />
        )}
      </button>
      <div className={`sift-wave ${isPlaying ? 'is-playing' : ''}`} aria-hidden="true">
        {bars.map((height, index) => (
          <span
            key={index}
            style={{
              height: `${Math.max(0.18, Math.min(1, height)) * 100}%`,
              opacity: index <= activeBars ? 1 : 0.28,
              animationDelay: `${(index % 7) * 0.07}s`,
            }}
          />
        ))}
      </div>
      <audio
        ref={audioRef}
        src={previewUrl}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 30;
          setProgress(Math.max(0, Math.min(1, audio.currentTime / duration)));
        }}
      />
    </div>
  );
}
