import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Heart, Pause, Play, Trash2 } from 'lucide-react';
import { type Song } from '../types.js';
import { loadTrackPreview } from '../trackCards.js';
import { tagStyle } from './SwipeCard.js';

export type LikedSong = Song & {
  swipedAt: string | null;
  source: string | null;
};

let activeAudio: HTMLAudioElement | null = null;

function sourceLabel(source: string): string {
  const s = source.toLowerCase();
  if (s === 'discover') return 'Discovered';
  if (s === 'explore') return 'Explored';
  return s;
}

function formatLikedDate(value: string | null): string {
  if (!value) return 'Saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type LikedSongMiniCardProps = {
  isRemoving?: boolean;
  onRemove?: (song: LikedSong) => void;
  song: LikedSong;
};

export function LikedSongMiniCard({ isRemoving = false, onRemove, song }: LikedSongMiniCardProps) {
  const meta = [song.album, song.releaseYear].filter(Boolean).join(' · ');
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

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        if (activeAudio === audio) activeAudio = null;
      }
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;
    if (audio.paused) {
      if (activeAudio && activeAudio !== audio) activeAudio.pause();
      activeAudio = audio;
      void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <article className={`liked-card bg-[#1a1a1a] rounded-2xl p-3 flex gap-3 border border-white/5 hover:bg-[#222] transition-colors min-w-0${isRemoving ? ' liked-card-removing' : ''}`}>
      <div className="relative w-20 aspect-square flex-shrink-0">
        {song.coverImage ? (
          <img
            src={song.coverImage}
            alt={`${song.title} cover`}
            className="h-full w-full rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="h-full w-full rounded-xl flex items-center justify-center"
            style={{ backgroundColor: song.color }}
          >
            <Heart className="w-8 h-8 text-white/65" />
          </div>
        )}
        <button
          type="button"
          onClick={togglePlay}
          disabled={!previewUrl}
          aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
          className="absolute inset-0 m-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75 disabled:opacity-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-px" />}
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

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-white font-semibold truncate">{song.title}</h3>
            <p className="text-gray-400 text-sm truncate">{song.artist}</p>
            {meta && <p className="text-gray-500 text-xs truncate mt-0.5">{meta}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Heart className="w-4 h-4 text-teal-400 fill-current mt-1" />
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(song)}
                disabled={isRemoving}
                aria-label={`Remove ${song.title} from liked songs`}
                title="Remove from liked songs"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-red-300 hover:bg-red-400/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {song.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={`sift-tag ${tagStyle(tag)}`}>
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-3">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{formatLikedDate(song.swipedAt)}</span>
          {song.source && <span className="text-purple-300">· {sourceLabel(song.source)}</span>}
        </div>
      </div>
    </article>
  );
}
