create or replace function public.set_initial_taste_profile(
  p_energy        double precision,
  p_danceability  double precision,
  p_valence       double precision,
  p_acousticness  double precision,
  p_speechiness   double precision
)
returns table (
  out_energy        double precision,
  out_danceability  double precision,
  out_valence       double precision,
  out_acousticness  double precision,
  out_speechiness   double precision,
  out_swipe_count   integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_energy       is null or p_energy       < 0 or p_energy       > 1
     or p_danceability is null or p_danceability < 0 or p_danceability > 1
     or p_valence      is null or p_valence      < 0 or p_valence      > 1
     or p_acousticness is null or p_acousticness < 0 or p_acousticness > 1
     or p_speechiness  is null or p_speechiness  < 0 or p_speechiness  > 1
  then
    raise exception 'All features must be between 0 and 1';
  end if;

  insert into public.taste_profiles (
    user_id, energy, danceability, valence, acousticness, speechiness, swipe_count, updated_at
  )
  values (
    v_uid, p_energy, p_danceability, p_valence, p_acousticness, p_speechiness, 0, now()
  )
  on conflict (user_id) do update
  set
    energy       = excluded.energy,
    danceability = excluded.danceability,
    valence      = excluded.valence,
    acousticness = excluded.acousticness,
    speechiness  = excluded.speechiness,
    swipe_count  = 0,
    updated_at   = now();

  return query
    select tp.energy, tp.danceability, tp.valence, tp.acousticness, tp.speechiness, tp.swipe_count
    from public.taste_profiles tp
    where tp.user_id = v_uid;
end;
$$;

revoke execute on function public.set_initial_taste_profile(
  double precision, double precision, double precision, double precision, double precision
) from public;
revoke execute on function public.set_initial_taste_profile(
  double precision, double precision, double precision, double precision, double precision
) from anon;
grant execute on function public.set_initial_taste_profile(
  double precision, double precision, double precision, double precision, double precision
) to authenticated;
