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
