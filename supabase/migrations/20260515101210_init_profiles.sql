/*
[GenAI Use] Prompt:
In supabase/migrations/ create the initial migration that backs user profiles:
1. Add a 'profiles' table keyed by id uuid referencing auth.users(id) on delete cascade, with display_name text, avatar_url text, and created_at / updated_at timestamptz defaulting to now().
2. Enable RLS and add owner-only policies: a user may SELECT, INSERT, and UPDATE only the row whose id equals auth.uid() (the UPDATE policy needs both using and with check).
3. Add a 'handle_new_user()' trigger function (security definer, search_path = '') that, for each new auth.users row, inserts a profiles row using the new id and a display_name resolved from raw_user_meta_data in the order display_name -> full_name -> name.
4. Attach it as an after-insert, for-each-row trigger 'on_auth_user_created' on auth.users.
Use schema-qualified names like public.profiles.
*/

/* [GenAI Use] LLM Response Start*/
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function public.handle_new_user()
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
/* [GenAI Use] LLM Response End*/
