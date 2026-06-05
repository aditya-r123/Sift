export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  releaseYear?: number | null;
  durationMs?: number | null;
  features?: {
    energy?: number | null;
    danceability?: number | null;
    valence?: number | null;
    acousticness?: number | null;
    speechiness?: number | null;
  };
  tags: string[];
  color: string;
  coverImage?: string;
  previewUrl?: string;
}
