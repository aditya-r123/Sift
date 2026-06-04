alter table public.top_tracks
  add column if not exists cover_url text,
  add column if not exists preview_url text;
