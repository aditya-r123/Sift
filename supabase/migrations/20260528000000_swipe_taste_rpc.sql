/*
[GenAI Use] Prompt
In supabase/migrations/ create one new migration for the recommendation swipe/taste update RPC.
Do not run Supabase commands or edit app code; only add a new SQL migration file after inspecting the existing swipes, songs, and taste_profiles migrations.
1. Add 'public.calculate_new_weight(current, song_feature, alpha)' using:
   new_weight = (1 - alpha) * current + alpha * song_feature.
   Validate all inputs are in range, do not round, and revoke execute from public/anon.
2. Add 'public.record_swipe_and_update_taste(p_song_id text, p_source text, p_direction text, p_alpha double precision default 0.10)'.
   It must use 'auth.uid()' only, reject unauthenticated users, validate source/direction/alpha, load the top_tracks row, reject missing songs or null audio features, and insert a swipe with 'song_id = p_song_id'.
3. Make swipe recording (so first swipe wins), with 'ON CONFLICT DO NOTHING' so duplicate swipe requests do not update taste again.
   NO swipes should only be recorded; YES swipes should create a neutral taste profile if needed, update all five taste values using the helper function, increment swipe_count, and set updated_at.
4. Return whether the swipe was recorded, whether the profile was updated, the song/source/direction, the five updated taste values, and swipe_count.
5. Use 'security definer', 'search_path = ''', schema-qualified names, revoke execute from public/anon, grant execute only to authenticated, and keep existing swipes policies unchanged.
6. Add SQL comments explaining that the app maps right/left swipes to YES/NO, only YES updates taste, swipe_count counts newly recorded YES learning events, and duplicate swipe requests are safe.
*/

/* [GenAI Use] LLM Response Start*/
-- new_weight = (1 - alpha) * current + alpha * song_feature
create or replace function public.calculate_new_weight(
  p_current       double precision,
  p_song_feature  double precision,
  p_alpha         double precision
)
returns double precision
language plpgsql
immutable strict
as $$
begin
  if p_current < 0 or p_current > 1 then
    raise exception 'p_current must be between 0 and 1, got %', p_current;
  end if;
  if p_song_feature < 0 or p_song_feature > 1 then
    raise exception 'p_song_feature must be between 0 and 1, got %', p_song_feature;
  end if;
  if p_alpha <= 0 or p_alpha > 1 then
    raise exception 'p_alpha must be > 0 and <= 1, got %', p_alpha;
  end if;

  return (1.0 - p_alpha) * p_current + p_alpha * p_song_feature;
end;
$$;

revoke execute on function public.calculate_new_weight(double precision, double precision, double precision)
  from public;
revoke execute on function public.calculate_new_weight(double precision, double precision, double precision)
  from anon;

-- RPC: record a swipe and  update the taste profile on YES swipes.

drop function if exists public.record_swipe_and_update_taste(uuid, text, text, double precision);

create or replace function public.record_swipe_and_update_taste(
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
  -- Authenticate
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Validate inputs
  if p_source is null or p_source not in ('DISCOVER', 'EXPLORE') then
    raise exception 'p_source must be DISCOVER or EXPLORE, got %', p_source;
  end if;
  if p_direction is null or p_direction not in ('YES', 'NO') then
    raise exception 'p_direction must be YES or NO, got %', p_direction;
  end if;
  if p_alpha <= 0 or p_alpha > 1 then
    raise exception 'p_alpha must be > 0 and <= 1, got %', p_alpha;
  end if;

  -- Load song and verify features are populated
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

  -- First-swipe-wins: insert the swipe, skip silently on duplicate.
  insert into public.swipes (user_id, song_id, source, direction)
  values (v_uid, p_song_id, p_source, p_direction)
  on conflict on constraint swipes_unique_user_song do nothing
  returning id into v_inserted_id;

  v_recorded := v_inserted_id is not null;

  -- Only update taste on a newly recorded YES swipe
  if v_recorded and p_direction = 'YES' then
    -- Ensure a neutral taste_profiles row exists
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

  -- Load current profile for the return payload
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
/* [GenAI Use] LLM Response End*/
