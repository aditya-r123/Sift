/*
[GenAI Use] Prompt:
In supabase/migrations/ create a migration that replaces the one-way follow model with a bidirectional friend request/accept system, where the requester sends an invite and the addressee can accept or decline, and either side can delete the row to cancel, decline, or unfriend:
1. Drop the existing friends_with_emails view and the friends table, then recreate 'friends' with id uuid primary key default gen_random_uuid(), requester_id and addressee_id (uuid not null referencing auth.users(id) on delete cascade), status text not null default 'pending' check in ('pending','accepted'), created_at timestamptz default now(), a unique constraint on (requester_id, addressee_id), and a check preventing self-requests (requester_id <> addressee_id).
2. Index requester_id and addressee_id.
3. Enable RLS and add policies: either party may SELECT or DELETE a row; only the requester may INSERT (status defaults to pending); only the addressee may UPDATE, and only while status = 'pending' (to accept).
4. Recreate the 'friends_with_emails' dashboard view joining the new requester/addressee columns to auth.users emails and profiles display names, and revoke all on it from anon and authenticated so it stays off the PostgREST API.
*/

/* [GenAI Use] LLM Response Start*/
drop view if exists public.friends_with_emails;
drop table if exists public.friends;

create table public.friends (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users (id) on delete cascade,
  addressee_id  uuid not null references auth.users (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  constraint friends_unique_pair unique (requester_id, addressee_id),
  constraint friends_no_self check (requester_id <> addressee_id)
);

create index friends_requester_idx on public.friends (requester_id);
create index friends_addressee_idx on public.friends (addressee_id);

alter table public.friends enable row level security;

create policy "friends_select_own"
  on public.friends for select
  using (
    (select auth.uid()) = requester_id
    or (select auth.uid()) = addressee_id
  );

create policy "friends_insert_own"
  on public.friends for insert
  with check ((select auth.uid()) = requester_id);

create policy "friends_update_addressee"
  on public.friends for update
  using (
    (select auth.uid()) = addressee_id
    and status = 'pending'
  );

create policy "friends_delete_own"
  on public.friends for delete
  using (
    (select auth.uid()) = requester_id
    or (select auth.uid()) = addressee_id
  );

create or replace view public.friends_with_emails as
select
  f.id,
  f.requester_id,
  ur.email          as requester_email,
  pr.display_name   as requester_display_name,
  f.addressee_id,
  ua.email          as addressee_email,
  pa.display_name   as addressee_display_name,
  f.status,
  f.created_at
from public.friends f
left join auth.users  ur on ur.id = f.requester_id
left join auth.users  ua on ua.id = f.addressee_id
left join public.profiles pr on pr.id = f.requester_id
left join public.profiles pa on pa.id = f.addressee_id;

revoke all on public.friends_with_emails from anon, authenticated;
/* [GenAI Use] LLM Response End*/
