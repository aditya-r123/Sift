-- Make profiles.display_name reliable for Google-auth users.
--
-- The init migration's INSERT trigger reads full_name / name from
-- raw_user_meta_data, but:
--   1. anyone who signed up before that trigger existed has no profile row
--      (or a row with display_name = null);
--   2. when a Google user signs in again, Supabase refreshes
--      raw_user_meta_data, but profiles wasn't being kept in sync.
--
-- This migration backfills existing rows and adds an UPDATE trigger so
-- profiles.display_name follows whatever name Google (or any provider) hands
-- back. The coalesce order — display_name → full_name → name — means an
-- explicit display_name set at email/password signup still wins over a
-- later-attached OAuth name.

-- 1. Create any missing profile rows (auth.users that have no profile yet).
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'display_name',
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  )
from auth.users u
on conflict (id) do nothing;

-- 2. Backfill existing profile rows whose display_name is null but whose
--    auth.users metadata has a name we can use.
update public.profiles p
set
  display_name = coalesce(
    u.raw_user_meta_data ->> 'display_name',
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  ),
  updated_at = now()
from auth.users u
where p.id = u.id
  and p.display_name is null
  and coalesce(
    u.raw_user_meta_data ->> 'display_name',
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  ) is not null;

-- 3. Keep profiles.display_name in sync on subsequent auth.users updates
--    (Google sign-in refreshes raw_user_meta_data on each login).
create or replace function public.handle_user_metadata_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_name text;
begin
  resolved_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  );

  if resolved_name is null then
    return new;
  end if;

  update public.profiles
  set
    display_name = resolved_name,
    updated_at   = now()
  where id = new.id
    and display_name is distinct from resolved_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.handle_user_metadata_update();
