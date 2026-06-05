/*
Fix record_swipe_and_update_taste after the 20260528000000 migration was already
applied remotely. The previous body could resolve bare song_id in the ON CONFLICT
clause as either an output column variable or public.swipes.song_id.
*/

drop function if exists public.record_swipe_and_update_taste(text, text, text, double precision);

create function public.record_swipe_and_update_taste(
  p_song_id   text,
  p_source    text,
  p_direction text,
  p_alpha     double precision default 0.10
)
returns table (
  out_recorded        boolean,
  out_profile_updated boolean,
  out_song_id         text,
  out_source          text,
  out_direction       text,
  out_energy          double precision,
  out_danceability    double precision,
  out_valence         double precision,
  out_acousticness    double precision,
  out_speechiness     double precision,
  out_swipe_count     integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid          uuid;
  v_inserted_id  uuid;
  v_recorded     boolean := false;
  v_updated      boolean := false;
  v_song         record;
  v_profile      record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_source is null or p_source not in ('DISCOVER', 'EXPLORE') then
    raise exception 'p_source must be DISCOVER or EXPLORE, got %', p_source;
  end if;
  if p_direction is null or p_direction not in ('YES', 'NO') then
    raise exception 'p_direction must be YES or NO, got %', p_direction;
  end if;
  if p_alpha <= 0 or p_alpha > 1 then
    raise exception 'p_alpha must be > 0 and <= 1, got %', p_alpha;
  end if;

  select s.energy, s.danceability, s.valence, s.acousticness, s.speechiness
  into v_song
  from public.top_tracks s
  where s.spotify_track_id = p_song_id;

  if not found then
    raise exception 'Song % not found', p_song_id;
  end if;

  if v_song.energy is null
    or v_song.danceability is null
    or v_song.valence is null
    or v_song.acousticness is null
    or v_song.speechiness is null
  then
    raise exception 'Song % has one or more null feature values', p_song_id;
  end if;

  insert into public.swipes (user_id, song_id, source, direction)
  values (v_uid, p_song_id, p_source, p_direction)
  on conflict on constraint swipes_unique_user_song do nothing
  returning id into v_inserted_id;

  v_recorded := v_inserted_id is not null;

  if v_recorded and p_direction = 'YES' then
    insert into public.taste_profiles (user_id)
    values (v_uid)
    on conflict (user_id) do nothing;

    update public.taste_profiles tp
    set
      energy       = public.calculate_new_weight(tp.energy,       v_song.energy::double precision,       p_alpha),
      danceability = public.calculate_new_weight(tp.danceability, v_song.danceability::double precision, p_alpha),
      valence      = public.calculate_new_weight(tp.valence,      v_song.valence::double precision,      p_alpha),
      acousticness = public.calculate_new_weight(tp.acousticness, v_song.acousticness::double precision, p_alpha),
      speechiness  = public.calculate_new_weight(tp.speechiness,  v_song.speechiness::double precision,  p_alpha),
      swipe_count  = tp.swipe_count + 1,
      updated_at   = now()
    where tp.user_id = v_uid;

    v_updated := true;
  end if;

  select tp.energy, tp.danceability, tp.valence, tp.acousticness, tp.speechiness, tp.swipe_count
  into v_profile
  from public.taste_profiles tp
  where tp.user_id = v_uid;

  return query select
    v_recorded,
    v_updated,
    p_song_id,
    p_source,
    p_direction,
    v_profile.energy,
    v_profile.danceability,
    v_profile.valence,
    v_profile.acousticness,
    v_profile.speechiness,
    v_profile.swipe_count;
end;
$$;

revoke execute on function public.record_swipe_and_update_taste(text, text, text, double precision)
  from public;
revoke execute on function public.record_swipe_and_update_taste(text, text, text, double precision)
  from anon;
grant execute on function public.record_swipe_and_update_taste(text, text, text, double precision)
  to authenticated;

/*
AI-use trail: Added a follow-up migration for the already-applied swipe RPC.
It recreates record_swipe_and_update_taste with out_* return columns and uses
ON CONFLICT ON CONSTRAINT swipes_unique_user_song to avoid ambiguous song_id
resolution inside PL/pgSQL.
*/
