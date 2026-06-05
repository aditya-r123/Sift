create table public.taste_profiles (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  energy        double precision not null default 0.5
                  check (energy >= 0 and energy <= 1),
  danceability  double precision not null default 0.5
                  check (danceability >= 0 and danceability <= 1),
  valence       double precision not null default 0.5
                  check (valence >= 0 and valence <= 1),
  acousticness  double precision not null default 0.5
                  check (acousticness >= 0 and acousticness <= 1),
  speechiness   double precision not null default 0.5
                  check (speechiness >= 0 and speechiness <= 1),
  swipe_count   integer not null default 0
                  check (swipe_count >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.taste_profiles enable row level security;

create policy "taste_profiles_select_own"
  on public.taste_profiles for select
  using ((select auth.uid()) = user_id);

-- Extend the existing trigger function to also seed a neutral taste profile
-- row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  );

  insert into public.taste_profiles (user_id)
  values (new.id);

  return new;
end;
$$;

insert into public.taste_profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;
