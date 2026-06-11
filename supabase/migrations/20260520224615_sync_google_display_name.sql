/*
[GenAI Use] Prompt:
In supabase/migrations/ create a migration that makes profiles.display_name reliable for OAuth (e.g. Google) users, given that raw_user_meta_data is refreshed on each login and earlier signups may have no profile row or a null display_name:
1. Insert profile rows for any auth.users that have none yet, resolving display_name from raw_user_meta_data in the order display_name -> full_name -> name, with on conflict (id) do nothing.
2. Backfill existing profiles whose display_name is null but whose auth.users metadata has a usable name, also setting updated_at = now().
3. Add a 'handle_user_metadata_update()' trigger function (security definer, search_path = '') that recomputes that same coalesced name and, only when it is non-null and is distinct from the current value, updates the matching profiles row.
4. Drop any existing on_auth_user_updated trigger, then recreate it as an after-update-of raw_user_meta_data, for-each-row trigger on auth.users.
Keep the coalesce order so an explicit display_name set at email/password signup still wins over a later-attached OAuth name.
*/

/* [GenAI Use] LLM Response Start*/
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
/* [GenAI Use] LLM Response End*/
