import { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import albumCover from './imports/seasons.png';

interface Song {
  id: string;
  title: string;
  artist: string;
  tags: string[];
  color: string;
}

const initialSongs: Song[] = [
  {
    id: '1',
    title: 'Seasons',
    artist: 'wave to earth',
    tags: ['Alternative', 'Energy', 'rnb', 'BPM'],
    color: '#ef4444',
  },
  {
    id: '2',
    title: 'In a Good Way',
    artist: 'Faye Webster',
    tags: ['R&B', 'Indie'],
    color: '#14b8a6',
  },
  {
    id: '3',
    title: 'Love Affair',
    artist: 'Umi',
    tags: ['Indie', 'R&B'],
    color: '#f97316',
  },
  {
    id: '4',
    title: 'Butterfly Dust',
    artist: 'Meaningful Stone',
    tags: ['Dream Pop', 'Indie'],
    color: '#8b5cf6',
  },
  {
    id: '5',
    title: 'Kerosene',
    artist: 'Crystal Castles',
    tags: ['Ambient', 'Electronic'],
    color: '#14b8a6',
  },
];

export function ExplorePage() {
  const [songs, setSongs] = useState(initialSongs);
  const [currentIndex, setCurrentIndex] = useState(0);

  const removeCard = (direction: 'left' | 'right') => {
    if (currentIndex < songs.length) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const visibleCards = songs.slice(currentIndex, currentIndex + 3);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-lg px-6 -mt-8">
        <h1 className="text-3xl font-bold text-white mb-8">Explore</h1>
        <div className="h-[520px] relative">
          {visibleCards.length === 0 ? (
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

function SwipeCard({
  song,
  index,
  onSwipe,
  isTop,
}: {
  song: Song;
  index: number;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event: PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onSwipe(info.offset.x > 0 ? 'right' : 'left');
    }
  };

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
      <div className="w-full h-full bg-[#1a1a1a] rounded-3xl p-8 flex flex-col shadow-2xl">
        <div>
          {song.tags.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {song.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs text-gray-400 px-3 py-1.5 bg-[#2a2a2a] rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center">
          {song.id === '1' ? (
            <img
              src={albumCover}
              alt={`${song.title} cover`}
              className="w-64 h-64 rounded-3xl shadow-lg object-cover"
            />
          ) : (
            <div
              className="w-64 h-64 rounded-3xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: song.color }}
            >
              <div className="w-32 h-32 bg-white/20 rounded-2xl" />
            </div>
          )}
        </div>

        <div className="text-center">
          <h3 className="text-white font-bold text-3xl mb-2">{song.title}</h3>
          <p className="text-gray-400 text-lg">{song.artist}</p>
        </div>
      </div>
    </motion.div>
  );
}
