/*
In supabase/migrations/ Create a new migration that:
1. Adds a `songs` table: id (uuid), spotify_track_id (text unique), title, artist, artwork_url, plus energy, danceability, valence, acousticness, speechiness as numeric(4,3) constrained to [0,1].
2. Edits `swipes`: add source column (text, CHECK in ('DISCOVER','EXPLORE')), migrate existing directions 'right'->'YES' and 'left'->'NO', then add a CHECK constraint enforcing YES/NO.
3. RLS: users read/write their own swipes and taste_profile; songs table is readable by all authenticated users.
*/


create table public.songs (
  id                uuid primary key default gen_random_uuid(),
  spotify_track_id  text not null unique,
  title             text,
  artist            text,
  artwork_url       text,
  energy            numeric(4,3) check (energy between 0 and 1),
  danceability      numeric(4,3) check (danceability between 0 and 1),
  valence           numeric(4,3) check (valence between 0 and 1),
  acousticness      numeric(4,3) check (acousticness between 0 and 1),
  speechiness       numeric(4,3) check (speechiness between 0 and 1)
);

alter table public.songs enable row level security;

create policy "songs_select_authenticated"
  on public.songs for select
  to authenticated
  using (true);


alter table public.swipes add column source text;
update public.swipes set source = 'DISCOVER' where source is null;
alter table public.swipes alter column source set not null;
alter table public.swipes
  add constraint swipes_source_check check (source in ('DISCOVER', 'EXPLORE'));

update public.swipes set direction = 'YES' where direction = 'right';
update public.swipes set direction = 'NO'  where direction = 'left';
alter table public.swipes drop constraint swipes_direction_check;
alter table public.swipes
  add constraint swipes_direction_check check (direction in ('YES', 'NO'));
