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
