export type ApiErrorResponse = {
  error: string;
};

export type AuthStatusResponse = {
  authenticated: boolean;
};

export type SwipeDirection = "YES" | "NO";

export type FeedSource = "DISCOVER" | "EXPLORE" | "FRIEND";

export type SongCard = {
  id: string;
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  previewUrl?: string;
  friendLabel?: string;
  explanation?: string;
};

export type TasteProfile = {
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  bpmTarget?: number;
  genreWeights?: Record<string, number>;
};
