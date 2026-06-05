import { CalendarDays, Heart, Trash2 } from 'lucide-react';
import { type Song } from '../types.js';

export type LikedSong = Song & {
  swipedAt: string | null;
  source: string | null;
};

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

  return (
    <article className="bg-[#1a1a1a] rounded-2xl p-3 flex gap-3 border border-white/5 hover:bg-[#222] transition-colors min-w-0">
      {song.coverImage ? (
        <img
          src={song.coverImage}
          alt={`${song.title} cover`}
          className="w-20 aspect-square rounded-xl object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div
          className="w-20 aspect-square rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: song.color }}
        >
          <Heart className="w-8 h-8 text-white/65" />
        </div>
      )}

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
            <span key={tag} className="text-[11px] text-gray-400 px-2 py-1 bg-[#2a2a2a] rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-3">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{formatLikedDate(song.swipedAt)}</span>
          {song.source && <span>· {song.source.toLowerCase()}</span>}
        </div>
      </div>
    </article>
  );
}
