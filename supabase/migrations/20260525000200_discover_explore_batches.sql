drop function if exists public.get_discover_batch(uuid, int);
drop function if exists public.get_explore_batch(uuid, int);

create function public.get_discover_batch(
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
  match_type       text,
  top_match_axis   text,
  recommended_by   text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  u_energy       numeric := 0.5;
  u_danceability numeric := 0.5;
  u_valence      numeric := 0.5;
  u_acousticness numeric := 0.5;
  u_speechiness  numeric := 0.5;
begin

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'p_user_id (%) does not match authenticated user (%)', p_user_id, auth.uid();
  end if;

  select coalesce(tp.energy,       0.5),
         coalesce(tp.danceability, 0.5),
         coalesce(tp.valence,      0.5),
         coalesce(tp.acousticness, 0.5),
         coalesce(tp.speechiness,  0.5)
    into u_energy, u_danceability, u_valence, u_acousticness, u_speechiness
    from public.taste_profiles tp
   where tp.user_id = p_user_id;

  return query
  with my_friends as (
    select case when f.requester_id = p_user_id
                then f.addressee_id
                else f.requester_id
           end as friend_id
      from public.friends f
     where f.status = 'accepted'
       and (f.requester_id = p_user_id or f.addressee_id = p_user_id)
  ),
  friend_swipes as (
    select sw.song_id,
           sw.user_id as friend_user_id,
           sw.swiped_at,
           row_number() over (partition by sw.song_id order by sw.swiped_at desc) as rn_per_song
      from public.swipes sw
     where sw.direction = 'YES'
       and sw.user_id in (select friend_id from my_friends)
       and exists (
         select 1 from public.top_tracks tt
          where tt.spotify_track_id = sw.song_id
       )
       and not exists (
         select 1 from public.swipes sw_me
          where sw_me.user_id = p_user_id and sw_me.song_id = sw.song_id
       )
  ),
  chosen_friend as (
    select fs.song_id, fs.friend_user_id, fs.swiped_at
      from friend_swipes fs
     where fs.rn_per_song = 1
     order by fs.swiped_at desc
     limit 1
  ),
  friend_row as (
    select tt.spotify_track_id, tt.name, tt.artist,
           tt.energy, tt.danceability, tt.valence, tt.acousticness, tt.speechiness,
           'friend_like'::text as match_type,
           null::text          as top_match_axis,
           pr.display_name     as recommended_by
      from chosen_friend cf
      join public.top_tracks tt on tt.spotify_track_id = cf.song_id
      join public.profiles   pr on pr.id = cf.friend_user_id
  ),
  candidates as (
    select s.spotify_track_id, s.name, s.artist,
           s.energy, s.danceability, s.valence, s.acousticness, s.speechiness,
           0.35 * (u_energy       - s.energy)       ^ 2 as d_energy,
           0.25 * (u_danceability - s.danceability) ^ 2 as d_dance,
           0.20 * (u_valence      - s.valence)      ^ 2 as d_valence,
           0.15 * (u_acousticness - s.acousticness) ^ 2 as d_acoust,
           0.05 * (u_speechiness  - s.speechiness)  ^ 2 as d_speech
      from public.top_tracks s
     where not exists (
       select 1
         from public.swipes sw
        where sw.user_id = p_user_id
          and sw.song_id = s.spotify_track_id
     )
       and not exists (
         select 1 from chosen_friend cf where cf.song_id = s.spotify_track_id
       )
  ),
  scored as (
    select c.*,
           (c.d_energy + c.d_dance + c.d_valence + c.d_acoust + c.d_speech) as d2,
           case least(c.d_energy, c.d_dance, c.d_valence, c.d_acoust, c.d_speech)
             when c.d_energy  then 'energy'
             when c.d_dance   then 'danceability'
             when c.d_valence then 'valence'
             when c.d_acoust  then 'acousticness'
             when c.d_speech  then 'speechiness'
           end as top_match_axis
      from candidates c
  ),
  ranked as (
    select s.*,
           row_number() over (order by s.d2 asc nulls last) as rk
      from scored s
  ),
  stats as (
    select count(*)::int as total,
           (select count(*) from chosen_friend)::int as friend_count
      from ranked
  ),
  slots as (
    select case when st.friend_count > 0 then 1 else 0 end as friend_slot,
           case when st.total >= 10        then 1 else 0 end as wildcard_slot,
           greatest(p_limit
             - (case when st.friend_count > 0 then 1 else 0 end)
             - (case when st.total >= 10        then 1 else 0 end), 0) as exploit_n
      from stats st
  ),
  exploit as (
    select r.spotify_track_id, r.name, r.artist,
           r.energy, r.danceability, r.valence, r.acousticness, r.speechiness,
           'exploit'::text as match_type,
           r.top_match_axis,
           null::text      as recommended_by
      from ranked r cross join slots sl
     where r.rk <= sl.exploit_n
  ),
  wildcard as (
    select r.spotify_track_id, r.name, r.artist,
           r.energy, r.danceability, r.valence, r.acousticness, r.speechiness,
           'wildcard'::text as match_type,
           r.top_match_axis,
           null::text       as recommended_by
      from ranked r cross join slots sl cross join stats st
     where sl.wildcard_slot = 1
       and r.rk between greatest(1, least(50, st.total / 4))
                    and least(500, st.total)
       and r.rk > sl.exploit_n
     order by random()
     limit 1
  ),
  combined as (
    select * from exploit
    union all
    select * from wildcard
    union all
    select * from friend_row
  )
  select c.spotify_track_id, c.name, c.artist,
         c.energy, c.danceability, c.valence, c.acousticness, c.speechiness,
         c.match_type, c.top_match_axis, c.recommended_by
    from combined c
   order by random()
   limit p_limit;
end;
$$;

create function public.get_explore_batch(
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
  match_type       text,
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
         'opposite'::text as match_type,
         v_axis           as inverted_axis
    from candidates c
   order by c.d2 asc nulls last
   limit p_limit;
end;
$$;

revoke execute on function public.get_discover_batch(uuid, int) from public;
revoke execute on function public.get_discover_batch(uuid, int) from anon;
grant  execute on function public.get_discover_batch(uuid, int) to authenticated;

revoke execute on function public.get_explore_batch(uuid, int) from public;
revoke execute on function public.get_explore_batch(uuid, int) from anon;
grant  execute on function public.get_explore_batch(uuid, int) to authenticated;

