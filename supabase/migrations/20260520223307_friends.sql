/*
[GenAI Use] Prompt:
In supabase/migrations/ create a migration that adds a one-way (directional) friends feature, where a row (user_id, friend_id) means user_id follows friend_id and removing one side does not affect the reciprocal row:
1. Add a 'friends' table with user_id and friend_id (both uuid not null referencing auth.users(id) on delete cascade), created_at timestamptz default now(), a composite primary key (user_id, friend_id), and a check constraint preventing self-follows (user_id <> friend_id).
2. Index both user_id and friend_id.
3. Enable RLS and add policies so a user may SELECT, INSERT, and DELETE only rows where user_id = auth.uid().
4. Add a 'profiles_select_authenticated' policy that lets any authenticated user read all profiles rows so they can search for friends by display name, and add an index on lower(display_name) for those lookups.
*/

/* [GenAI Use] LLM Response Start*/
create table public.friends (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint friends_no_self check (user_id <> friend_id)
);

create index friends_user_id_idx on public.friends (user_id);
create index friends_friend_id_idx on public.friends (friend_id);

alter table public.friends enable row level security;

create policy "friends_select_own"
  on public.friends for select
  using ((select auth.uid()) = user_id);

create policy "friends_insert_own"
  on public.friends for insert
  with check ((select auth.uid()) = user_id);

create policy "friends_delete_own"
  on public.friends for delete
  using ((select auth.uid()) = user_id);

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create index profiles_display_name_lower_idx
  on public.profiles (lower(display_name));
/* [GenAI Use] LLM Response End*/