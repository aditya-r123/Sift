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
