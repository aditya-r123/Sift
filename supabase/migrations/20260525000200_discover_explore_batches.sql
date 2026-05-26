/*
Create a new migration in supabase/migrations/ that adds two Postgres functions: get_discover_batch and get_explore_batch.

== get_discover_batch(p_user_id uuid, p_limit int default 5) ==

Returns a set of songs for Discover feed.

1. Load taste_profiles for p_user_id. If no row exists, treat all five feature preferences as 0.5.
2. Build a CTE of all top_tracks NOT swiped by this user.
3. Compute weighted squared Euclidean distance per candidate:
    d2 = 0.35*(u.energy - s.energy)^2 + 0.25*(u.danceability - s.danceability)^2 + 0.20*(u.valence - s.valence)^2 + 0.15*(u.acousticness - s.acousticness)^2 + 0.05*(u.speechiness - s.speechiness)^2
4. Rank candidates by d2 ascending.
5. Return (p_limit - 1) closest songs as "exploit" picks.
6. Return 1 "wildcard" song sampled from ranks 50-500.
If fewer than 500 candidates exist, fall back to: LEAST(50, total/4) .. LEAST(500, total)
If fewer than ~10 candidates total, just return all of them by distance.
7. Shuffle the final p_limit rows so the wildcard isn't always last.

Return columns: track-identifying + feature columns from top_tracks, plus `is_wildcard boolean` so the frontend can optionally show a badge.



== get_explore_batch(p_user_id uuid, p_limit int default 5) ==

Returns songs away from taste profile, inverting one randomly-chosen axis.

1. Load taste_profiles with same 0.5 fallback.
2. Pick a random axis from {energy, danceability, valence, acousticness, speechiness} ONCE at the start of the function.
3. Construct a target vector where the chosen axis = (1 - user.axis) and all other axes = user.axis (unchanged).
4. Compute the same weighted distance formula against this target vector.
5. Anti-join against swipes.
6. Return p_limit songs with smallest distance to the inverted target.
7. Include an `inverted_axis` text column in every returned row (same value across the batch) so the frontend can display the label.
*/

create or replace function public.get_discover_batch(
  p_user_id uuid,
  p_limit   int default 5
)
returns table (
  spotify_track_id text,
  name             text,
  artist           text,
  energy           real,
  danceability     real,
  valence          real,
  acousticness     real,
  speechiness      real,
  is_wildcard      boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  u_energy       numeric := 0.5;
  u_danceability numeric := 0.5;
  u_valence      numeric := 0.5;
  u_acousticness numeric := 0.5;
  u_speechiness  numeric := 0.5;
begin
  select coalesce(tp.energy,       0.5),
         coalesce(tp.danceability, 0.5),
         coalesce(tp.valence,      0.5),
         coalesce(tp.acousticness, 0.5),
         coalesce(tp.speechiness,  0.5)
    into u_energy, u_danceability, u_valence, u_acousticness, u_speechiness
    from public.taste_profiles tp
   where tp.user_id = p_user_id;

  return query
  with candidates as (
    select s.spotify_track_id, s.name, s.artist,
           s.energy, s.danceability, s.valence, s.acousticness, s.speechiness,
           ( 0.35 * (u_energy       - s.energy)       ^ 2
           + 0.25 * (u_danceability - s.danceability) ^ 2
           + 0.20 * (u_valence      - s.valence)      ^ 2
           + 0.15 * (u_acousticness - s.acousticness) ^ 2
           + 0.05 * (u_speechiness  - s.speechiness)  ^ 2
           ) as d2
      from public.top_tracks s
     where not exists (
       select 1
         from public.swipes sw
        where sw.user_id = p_user_id
          and sw.song_id = s.spotify_track_id
     )
  ),
  ranked as (
    select c.*,
           row_number() over (order by c.d2 asc nulls last) as rk
      from candidates c
  ),
  stats as (
    select count(*)::int as total from ranked
  ),
  exploit as (
    select r.spotify_track_id, r.name, r.artist,
           r.energy, r.danceability, r.valence, r.acousticness, r.speechiness,
           false as is_wildcard
      from ranked r cross join stats st
     where (st.total <  10 and r.rk <= p_limit)
        or (st.total >= 10 and r.rk <= greatest(p_limit - 1, 0))
  ),
  wildcard as (
    select r.spotify_track_id, r.name, r.artist,
           r.energy, r.danceability, r.valence, r.acousticness, r.speechiness,
           true as is_wildcard
      from ranked r cross join stats st
     where st.total >= 10
       and r.rk between greatest(1, least(50, st.total / 4))
                    and least(500, st.total)
       and r.rk > greatest(p_limit - 1, 0)
     order by random()
     limit 1
  ),
  combined as (
    select * from exploit
    union all
    select * from wildcard
  )
  select c.spotify_track_id, c.name, c.artist,
         c.energy, c.danceability, c.valence, c.acousticness, c.speechiness,
         c.is_wildcard
    from combined c
   order by random()
   limit p_limit;
end;
$$;

create or replace function public.get_explore_batch(
  p_user_id uuid,
  p_limit   int default 5
)
returns table (
  spotify_track_id text,
  name             text,
  artist           text,
  energy           real,
  danceability     real,
  valence          real,
  acousticness     real,
  speechiness      real,
  inverted_axis    text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  u_energy       numeric := 0.5;
  u_danceability numeric := 0.5;
  u_valence      numeric := 0.5;
  u_acousticness numeric := 0.5;
  u_speechiness  numeric := 0.5;
  t_energy       numeric;
  t_danceability numeric;
  t_valence      numeric;
  t_acousticness numeric;
  t_speechiness  numeric;
  axes           text[] := array['energy','danceability','valence','acousticness','speechiness'];
  v_axis         text;
begin
  select coalesce(tp.energy,       0.5),
         coalesce(tp.danceability, 0.5),
         coalesce(tp.valence,      0.5),
         coalesce(tp.acousticness, 0.5),
         coalesce(tp.speechiness,  0.5)
    into u_energy, u_danceability, u_valence, u_acousticness, u_speechiness
    from public.taste_profiles tp
   where tp.user_id = p_user_id;

  v_axis := axes[1 + floor(random() * array_length(axes, 1))::int];

  t_energy       := u_energy;
  t_danceability := u_danceability;
  t_valence      := u_valence;
  t_acousticness := u_acousticness;
  t_speechiness  := u_speechiness;

  case v_axis
    when 'energy'       then t_energy       := 1 - u_energy;
    when 'danceability' then t_danceability := 1 - u_danceability;
    when 'valence'      then t_valence      := 1 - u_valence;
    when 'acousticness' then t_acousticness := 1 - u_acousticness;
    when 'speechiness'  then t_speechiness  := 1 - u_speechiness;
  end case;

  return query
  with candidates as (
    select s.spotify_track_id, s.name, s.artist,
           s.energy, s.danceability, s.valence, s.acousticness, s.speechiness,
           ( 0.35 * (t_energy       - s.energy)       ^ 2
           + 0.25 * (t_danceability - s.danceability) ^ 2
           + 0.20 * (t_valence      - s.valence)      ^ 2
           + 0.15 * (t_acousticness - s.acousticness) ^ 2
           + 0.05 * (t_speechiness  - s.speechiness)  ^ 2
           ) as d2
      from public.top_tracks s
     where not exists (
       select 1
         from public.swipes sw
        where sw.user_id = p_user_id
          and sw.song_id = s.spotify_track_id
     )
  )
  select c.spotify_track_id, c.name, c.artist,
         c.energy, c.danceability, c.valence, c.acousticness, c.speechiness,
         v_axis as inverted_axis
    from candidates c
   order by c.d2 asc nulls last
   limit p_limit;
end;
$$;
