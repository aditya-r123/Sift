import { CalendarDays, Heart } from 'lucide-react';
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

export function LikedSongMiniCard({ song }: { song: LikedSong }) {
  const meta = [song.album, song.releaseYear].filter(Boolean).join(' · ');

  return (
    <article className="bg-[#1a1a1a] rounded-2xl p-3 flex gap-3 border border-white/5 hover:bg-[#222] transition-colors min-w-0">
      {song.coverImage ? (
        <img
          src={song.coverImage}
          alt={`${song.title} cover`}
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div
          className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
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
          <Heart className="w-4 h-4 text-teal-400 fill-current flex-shrink-0 mt-1" />
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
