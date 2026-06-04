/*
[GenAI Use] Prompt:
In supabase/migrations/ create a migration for the seeded catalog of top tracks that powers the Discover / recommendation feeds:
1. Add a 'top_tracks' table keyed by spotify_track_id text primary key, with rank int not null, name / artist / album text not null, release_year int (nullable), duration_ms int not null, the audio features energy, danceability, valence, acousticness and speechiness as real (nullable), and fetched_at timestamptz default now().
2. Enable RLS and add a single policy 'top_tracks_public_read' allowing SELECT to everyone (using true), since the catalog is non-sensitive shared data.
*/
/* [GenAI Use] LLM Response Start*/
create table public.top_tracks (
  spotify_track_id text primary key,
  rank int not null,
  name text not null,
  artist text not null,
  album text not null,
  release_year int,
  duration_ms int not null,
  energy real,
  danceability real,
  valence real,
  acousticness real,
  speechiness real,
  fetched_at timestamptz not null default now()
);

alter table public.top_tracks enable row level security;

create policy "top_tracks_public_read"
  on public.top_tracks for select
  using (true);
