-- Records which way each user swiped on each song for the Discover page.
-- Used to skip already-seen songs and build per-user tag affinity scores.

create table public.swipes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  song_id    text not null,
  direction  text not null check (direction in ('left', 'right')),
  swiped_at  timestamptz not null default now(),
  constraint swipes_unique_user_song unique (user_id, song_id)
);

create index swipes_user_id_idx on public.swipes (user_id);

alter table public.swipes enable row level security;

create policy "swipes_select_own"
  on public.swipes for select
  using ((select auth.uid()) = user_id);

create policy "swipes_insert_own"
  on public.swipes for insert
  with check ((select auth.uid()) = user_id);

-- Allows upsert so re-swiping a song just overwrites the direction.
create policy "swipes_update_own"
  on public.swipes for update
  using ((select auth.uid()) = user_id);
