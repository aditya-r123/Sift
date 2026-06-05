import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Heart, X, Play, Pause } from 'lucide-react';
import { type Song } from '../types.js';
import { formatDuration, loadTrackPreview } from '../trackCards.js';

const FEATURE_ROWS = [
  { key: 'energy', label: 'Energy', color: 'var(--c-energy)' },
  { key: 'danceability', label: 'Dance', color: 'var(--c-dance)' },
  { key: 'valence', label: 'Mood', color: 'var(--c-valence)' },
  { key: 'acousticness', label: 'Acoustic', color: 'var(--c-acoustic)' },
  { key: 'speechiness', label: 'Speech', color: 'var(--c-speech)' },
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
  const rotate = useTransform(x, [-260, 0, 260], [-18, 0, 18]);
  const opacity = useTransform(x, [-360, -220, 0, 220, 360], [0, 1, 1, 1, 0]);
  const keepOpacity = useTransform(x, [36, 112], [0, 1]);
  const skipOpacity = useTransform(x, [-112, -36], [1, 0]);
  const keepScale = useTransform(x, [36, 112], [0.9, 1]);
  const skipScale = useTransform(x, [-112, -36], [1, 0.9]);
  const activeAnimation = useRef<{ stop: () => void } | null>(null);
  const exitingRef = useRef(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    return () => activeAnimation.current?.stop();
  }, []);

  const stopActiveAnimation = useCallback(() => {
    activeAnimation.current?.stop();
    activeAnimation.current = null;
  }, []);

  const springHome = useCallback(
    async (velocity = 0) => {
      stopActiveAnimation();
      const controls = animate(x, 0, {
        type: 'spring',
        stiffness: 520,
        damping: 38,
        mass: 0.7,
        velocity,
      });
      activeAnimation.current = controls;
      await controls;
      if (activeAnimation.current === controls) activeAnimation.current = null;
    },
    [stopActiveAnimation, x]
  );

  const completeSwipe = useCallback(
    async (direction: 'left' | 'right', velocity = 0) => {
      if (exitingRef.current) return;
      exitingRef.current = true;
      setIsExiting(true);
      stopActiveAnimation();
      const viewport = typeof window === 'undefined' ? 900 : window.innerWidth;
      const target = direction === 'right' ? viewport + 260 : -viewport - 260;
      const controls = animate(x, target, {
        type: 'spring',
        stiffness: 220,
        damping: 26,
        mass: 0.85,
        velocity,
      });
      activeAnimation.current = controls;
      await controls;
      onSwipe(direction);
    },
    [onSwipe, stopActiveAnimation, x]
  );

  const handleDragEnd = (_event: PointerEvent, info: PanInfo) => {
    if (isExiting) return;
    const projectedX = info.offset.x + info.velocity.x * 0.16;
    if (Math.abs(projectedX) > 112) {
      void completeSwipe(projectedX > 0 ? 'right' : 'left', info.velocity.x);
      return;
    }
    void springHome(info.velocity.x);
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
      dragElastic={0.16}
      dragMomentum={false}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1,
        zIndex: 10 - index,
        scale: 1 - index * 0.05,
      }}
      onDragEnd={handleDragEnd}
      onDragStart={stopActiveAnimation}
      animate={{
        scale: 1 - index * 0.05,
        y: index * 10,
      }}
      transition={{
        type: 'spring',
        stiffness: 360,
        damping: 32,
        mass: 0.8,
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
              aria-hidden="true"
            >
              <span className="sift-cover-fallback-initial">{song.title.charAt(0) || '♪'}</span>
            </div>
          )}
        </div>

        <div className="sift-card-copy">
          <h3>{song.title}</h3>
          <p className="sift-artist">{song.artist}</p>
          {meta.length > 0 && <p className="sift-meta">{meta}</p>}
        </div>

        {isTop && <AudioPreview song={song} />}

        {features.length > 0 && (
          <div className="sift-feature-stack" aria-label="Audio profile">
            {features.map((feature) => (
              <div key={feature.key} className="sift-feature" aria-label={`${feature.label} ${feature.value}`}>
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

        {isTop && (
          <div className="sift-card-actions">
            <button
              type="button"
              onClick={() => void completeSwipe('left')}
              className="sift-action no"
              aria-label="Pass"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => void completeSwipe('right')}
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
