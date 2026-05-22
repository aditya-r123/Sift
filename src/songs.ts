import likedat from './pages/imports/like_dat.png';

export interface Song {
  id: string;
  title: string;
  artist: string;
  tags: string[];
  color: string;
  coverImage?: string;
}

export const songs: Song[] = [
  {
    id: '1',
    title: 'Like Dat',
    artist: 'Kodak Black',
    tags: ['On Repeat', 'Energy', 'Danceability', 'BPM'],
    color: '#ef4444',
    coverImage: likedat,
  },
  {
    id: '2',
    title: 'Digits',
    artist: 'Young Thug',
    tags: ['Energy', 'BPM', 'Hip-Hop'],
    color: '#14b8a6',
  },
  {
    id: '3',
    title: 'Magnolia',
    artist: 'Playboi Carti',
    tags: ['Hip-Hop', 'BPM', 'Energy', 'Danceability'],
    color: '#f97316',
  },
  {
    id: '4',
    title: '10 Purple Summers',
    artist: '03 Greedo',
    tags: ['Hip-Hop', 'BPM', 'Energy', 'Danceability'],
    color: '#8b5cf6',
  },
  {
    id: '5',
    title: 'Boss My Life Up',
    artist: 'Kodak Black',
    tags: ['Hip-Hop', 'BPM', 'Energy', 'Danceability'],
    color: '#14b8a6',
  },
  {
    id: '6',
    title: 'Goosebumps',
    artist: 'Travis Scott',
    tags: ['Hip-Hop', 'Chill', 'On Repeat', 'BPM'],
    color: '#7c3aed',
  },
  {
    id: '7',
    title: 'Love Sosa',
    artist: 'Chief Keef',
    tags: ['Hip-Hop', 'Energy', 'BPM'],
    color: '#dc2626',
  },
  {
    id: '8',
    title: 'Nights',
    artist: 'Frank Ocean',
    tags: ['R&B', 'Chill', 'On Repeat'],
    color: '#0891b2',
  },
  {
    id: '9',
    title: 'Redbone',
    artist: 'Childish Gambino',
    tags: ['R&B', 'Chill', 'Danceability'],
    color: '#b45309',
  },
  {
    id: '10',
    title: 'XO Tour Llif3',
    artist: 'Lil Uzi Vert',
    tags: ['Hip-Hop', 'Energy', 'On Repeat', 'BPM'],
    color: '#9333ea',
  },
  {
    id: '11',
    title: 'Lucid Dreams',
    artist: 'Juice WRLD',
    tags: ['Hip-Hop', 'Chill', 'On Repeat'],
    color: '#2563eb',
  },
  {
    id: '12',
    title: 'Mask Off',
    artist: 'Future',
    tags: ['Hip-Hop', 'BPM', 'Energy'],
    color: '#059669',
  },
  {
    id: '13',
    title: 'Bad and Boujee',
    artist: 'Migos',
    tags: ['Hip-Hop', 'Energy', 'Danceability', 'BPM'],
    color: '#db2777',
  },
  {
    id: '14',
    title: 'Sicko Mode',
    artist: 'Travis Scott',
    tags: ['Hip-Hop', 'Energy', 'BPM', 'On Repeat'],
    color: '#1d4ed8',
  },
  {
    id: '15',
    title: 'Rockstar',
    artist: 'Post Malone',
    tags: ['Hip-Hop', 'Energy', 'On Repeat'],
    color: '#6d28d9',
  },
  {
    id: '16',
    title: 'Congratulations',
    artist: 'Post Malone',
    tags: ['Hip-Hop', 'Chill', 'On Repeat'],
    color: '#0e7490',
  },
  {
    id: '17',
    title: 'DNA.',
    artist: 'Kendrick Lamar',
    tags: ['Hip-Hop', 'Energy', 'BPM'],
    color: '#b91c1c',
  },
  {
    id: '18',
    title: 'HUMBLE.',
    artist: 'Kendrick Lamar',
    tags: ['Hip-Hop', 'Energy', 'Danceability', 'BPM'],
    color: '#92400e',
  },
  {
    id: '19',
    title: 'No Role Modelz',
    artist: 'J. Cole',
    tags: ['Hip-Hop', 'Chill', 'On Repeat'],
    color: '#166534',
  },
  {
    id: '20',
    title: 'Power',
    artist: 'Kanye West',
    tags: ['Hip-Hop', 'Energy', 'On Repeat', 'BPM'],
    color: '#c2410c',
  },
];
