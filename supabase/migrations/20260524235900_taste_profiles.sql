/*
[GenAI Use] Prompt
In supabase/migrations/ create a new migration that:
1. Adds a 'taste_profiles' table with one row per auth user: user_id references auth.users(id), five preference fields defaulting to 0.5 and constrained to [0,1], swipe_count defaulting to 0 and constrained to >= 0, plus created_at and updated_at timestamps.
2. Document that swipe_count only counts YES swipes used to update the taste profile, not NO/pass swipes.
3. Enable RLS and allow authenticated users to SELECT only their own taste profile, but do not allow direct client INSERT or UPDATE since future writes will go through a database function/RPC.
4. Update the existing new-user trigger function so new auth users automatically get a neutral taste profile, and backfill neutral taste profiles for existing users without overwriting existing rows.
5. Use schema-qualified names like public.taste_profiles and keep the trigger function’s security/search-path style consistent with the existing profiles migration.
*/

/* [GenAI Use] LLM Response Start*/
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
/* [GenAI Use] LLM Response End*/