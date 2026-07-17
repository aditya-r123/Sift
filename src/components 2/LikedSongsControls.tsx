import { Search } from 'lucide-react';

export type LikedSongsSortMode = 'newest' | 'oldest' | 'song' | 'artist' | 'year';

type LikedSongsControlsProps = {
  artists: string[];
  artistFilter: string;
  onArtistFilterChange: (artist: string) => void;
  onQueryChange: (query: string) => void;
  onSortModeChange: (mode: LikedSongsSortMode) => void;
  onYearFilterChange: (year: string) => void;
  query: string;
  sortMode: LikedSongsSortMode;
  yearFilter: string;
  years: number[];
};

export function LikedSongsControls({
  artists,
  artistFilter,
  onArtistFilterChange,
  onQueryChange,
  onSortModeChange,
  onYearFilterChange,
  query,
  sortMode,
  yearFilter,
  years,
}: LikedSongsControlsProps) {
  return (
    <section className="mb-5">
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search songs, artists, albums, or years..."
          className="w-full bg-[#1a1a1a] text-white placeholder-gray-500 rounded-2xl pl-11 pr-4 py-3 outline-none border border-transparent focus:border-[#2a2a2a]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 inline-block">Artist</span>
          <select
            value={artistFilter}
            onChange={(e) => onArtistFilterChange(e.target.value)}
            className="w-full bg-[#1a1a1a] text-white rounded-2xl px-4 py-3 outline-none border border-transparent focus:border-[#2a2a2a]"
          >
            <option value="all">All artists</option>
            {artists.map((artist) => (
              <option key={artist} value={artist}>
                {artist}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 inline-block">Year</span>
          <select
            value={yearFilter}
            onChange={(e) => onYearFilterChange(e.target.value)}
            className="w-full bg-[#1a1a1a] text-white rounded-2xl px-4 py-3 outline-none border border-transparent focus:border-[#2a2a2a]"
          >
            <option value="all">All years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 inline-block">Sort</span>
          <select
            value={sortMode}
            onChange={(e) => onSortModeChange(e.target.value as LikedSongsSortMode)}
            className="w-full bg-[#1a1a1a] text-white rounded-2xl px-4 py-3 outline-none border border-transparent focus:border-[#2a2a2a]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="song">Song A-Z</option>
            <option value="artist">Artist A-Z</option>
            <option value="year">Year newest</option>
          </select>
        </label>
      </div>
    </section>
  );
}
