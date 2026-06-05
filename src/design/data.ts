export type TrackFriend = { name: string; note: string };

export type TrackFeats = {
  energy: number;
  dance: number;
  valence: number;
  acoustic: number;
  instr: number;
};

export type SiftTrack = {
  id: string;
  cover: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  bpm: number;
  key: string;
  dur: string;
  feats: TrackFeats;
  genres: string[];
  friend: TrackFriend | null;
};

export type SiftFriend = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  tone: string;
  recent: number;
  last: string;
  lastCover: string;
  mutuals: number;
  status: string;
};

export type GenreWeight = { name: string; weight: number };

export type SiftProfile = {
  name: string;
  handle: string;
  initials: string;
  joined: string;
  swipes: number;
  kept: number;
  streak: number;
  taste: TrackFeats & { bpm: number };
  genres: GenreWeight[];
  topArtists: string[];
  topArtistCovers: string[];
  recent: string[];
};

export const TRACKS: SiftTrack[] = [
  {
    id: "t1",
    cover: "dawn",
    title: "Softland",
    artist: "Ouri & Vesper",
    album: "Coastal",
    year: 2024,
    bpm: 92,
    key: "A min",
    dur: "0:24",
    feats: { energy: 46, dance: 52, valence: 74, acoustic: 30, instr: 12 },
    genres: ["indie pop", "dream pop"],
    friend: null,
  },
  {
    id: "t2",
    cover: "neongrid",
    title: "Night / Drive",
    artist: "Korbel",
    album: "After Hours",
    year: 2025,
    bpm: 124,
    key: "F# min",
    dur: "0:30",
    feats: { energy: 88, dance: 91, valence: 64, acoustic: 6, instr: 42 },
    genres: ["synthwave", "dance-pop"],
    friend: { name: "Maya", note: "on repeat all week" },
  },
  {
    id: "t3",
    cover: "arch",
    title: "Slow Hours",
    artist: "June Halland",
    album: "Slow Hours",
    year: 2023,
    bpm: 76,
    key: "C maj",
    dur: "0:22",
    feats: { energy: 24, dance: 35, valence: 58, acoustic: 82, instr: 8 },
    genres: ["folk", "singer-songwriter"],
    friend: null,
  },
  {
    id: "t4",
    cover: "cherry",
    title: "Double Take",
    artist: "PARTY ROOM",
    album: "Single",
    year: 2025,
    bpm: 118,
    key: "G maj",
    dur: "0:28",
    feats: { energy: 80, dance: 85, valence: 88, acoustic: 18, instr: 6 },
    genres: ["pop", "hyperpop"],
    friend: { name: "Theo", note: "pop perfection" },
  },
  {
    id: "t5",
    cover: "ocean",
    title: "drift.",
    artist: "Lior Sand",
    album: "EP—04",
    year: 2024,
    bpm: 88,
    key: "D min",
    dur: "0:30",
    feats: { energy: 34, dance: 40, valence: 46, acoustic: 60, instr: 55 },
    genres: ["ambient", "electronic"],
    friend: null,
  },
  {
    id: "t6",
    cover: "granular",
    title: "Letters From Abroad",
    artist: "Anya & The Cassettes",
    album: "Letters",
    year: 2022,
    bpm: 84,
    key: "E min",
    dur: "0:26",
    feats: { energy: 30, dance: 42, valence: 52, acoustic: 74, instr: 18 },
    genres: ["indie folk"],
    friend: null,
  },
  {
    id: "t7",
    cover: "riso",
    title: "Youth / 03",
    artist: "Komodo",
    album: "YOUTH",
    year: 2024,
    bpm: 104,
    key: "B min",
    dur: "0:25",
    feats: { energy: 64, dance: 58, valence: 38, acoustic: 22, instr: 20 },
    genres: ["post-punk", "alt rock"],
    friend: { name: "Rin", note: "reminds me of you" },
  },
  {
    id: "t8",
    cover: "vinyl",
    title: "Paragon",
    artist: "Paragon Records",
    album: `B-Sides 12"`,
    year: 1979,
    bpm: 110,
    key: "Bb maj",
    dur: "0:30",
    feats: { energy: 58, dance: 62, valence: 70, acoustic: 48, instr: 30 },
    genres: ["soul", "funk"],
    friend: null,
  },
  {
    id: "t9",
    cover: "type",
    title: "Midnight Four",
    artist: "m4",
    album: "m4 — '24'",
    year: 2024,
    bpm: 140,
    key: "A min",
    dur: "0:30",
    feats: { energy: 92, dance: 76, valence: 42, acoustic: 4, instr: 64 },
    genres: ["techno", "minimal"],
    friend: null,
  },
  {
    id: "t10",
    cover: "wash",
    title: "Honeysuckle",
    artist: "Jules Bramble",
    album: "Honeysuckle",
    year: 2023,
    bpm: 96,
    key: "F maj",
    dur: "0:24",
    feats: { energy: 48, dance: 54, valence: 80, acoustic: 42, instr: 14 },
    genres: ["R&B", "soul"],
    friend: { name: "Sam", note: "play this for me later" },
  },
  {
    id: "t11",
    cover: "stripe",
    title: "Velvet",
    artist: "Cold Roses",
    album: "Side A",
    year: 1997,
    bpm: 108,
    key: "D maj",
    dur: "0:28",
    feats: { energy: 62, dance: 55, valence: 60, acoustic: 50, instr: 28 },
    genres: ["indie rock"],
    friend: null,
  },
  {
    id: "t12",
    cover: "field",
    title: "Single (radio edit)",
    artist: "Field Study",
    album: "Field Study 11",
    year: 2025,
    bpm: 98,
    key: "E maj",
    dur: "0:22",
    feats: { energy: 55, dance: 50, valence: 54, acoustic: 36, instr: 22 },
    genres: ["indie pop"],
    friend: null,
  },
];

export const FRIENDS: SiftFriend[] = [
  {
    id: "f1",
    name: "Maya Cheng",
    handle: "@mayachng",
    initials: "MC",
    tone: "#ffd6a5",
    recent: 42,
    last: "Night / Drive",
    lastCover: "neongrid",
    mutuals: 8,
    status: "active 2m",
  },
  {
    id: "f2",
    name: "Theo Park",
    handle: "@_theopark",
    initials: "TP",
    tone: "#cdd9ff",
    recent: 31,
    last: "Double Take",
    lastCover: "cherry",
    mutuals: 12,
    status: "active 14m",
  },
  {
    id: "f3",
    name: "Rin Asakura",
    handle: "@rinasa",
    initials: "RA",
    tone: "#ffd1e1",
    recent: 27,
    last: "Youth / 03",
    lastCover: "riso",
    mutuals: 5,
    status: "1h ago",
  },
  {
    id: "f4",
    name: "Sam Okafor",
    handle: "@samok",
    initials: "SO",
    tone: "#d1f0d6",
    recent: 24,
    last: "Honeysuckle",
    lastCover: "wash",
    mutuals: 9,
    status: "3h ago",
  },
  {
    id: "f5",
    name: "Jules Bramble",
    handle: "@bramble",
    initials: "JB",
    tone: "#eddfc6",
    recent: 18,
    last: "Slow Hours",
    lastCover: "arch",
    mutuals: 3,
    status: "yesterday",
  },
  {
    id: "f6",
    name: "Lior Sand",
    handle: "@liorsand",
    initials: "LS",
    tone: "#bce5f0",
    recent: 14,
    last: "drift.",
    lastCover: "ocean",
    mutuals: 2,
    status: "2d ago",
  },
];

export const PROFILE: SiftProfile = {
  name: "Aditya Rao",
  handle: "@aditya",
  initials: "AR",
  joined: "May 2026",
  swipes: 248,
  kept: 71,
  streak: 12,
  taste: {
    energy: 64,
    dance: 71,
    valence: 58,
    acoustic: 38,
    instr: 22,
    bpm: 112,
  },
  genres: [
    { name: "indie pop", weight: 0.94 },
    { name: "dream pop", weight: 0.81 },
    { name: "synthwave", weight: 0.72 },
    { name: "R&B", weight: 0.65 },
    { name: "hyperpop", weight: 0.41 },
    { name: "folk", weight: 0.33 },
    { name: "techno", weight: 0.28 },
  ],
  topArtists: ["Ouri & Vesper", "Korbel", "Jules Bramble", "m4"],
  topArtistCovers: ["dawn", "neongrid", "wash", "type"],
  recent: ["t2", "t10", "t7", "t4", "t1"],
};

export const SIFT_DATA = { TRACKS, FRIENDS, PROFILE };
