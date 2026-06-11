/*
[GenAI Use] Prompt:
In supabase/migrations/ create a migration that adds a dashboard-only view over public.friends so the Supabase Table Editor can show emails and names instead of raw UUIDs:
1. Create or replace a view `friends_with_emails` that selects user_id, friend_id and created_at from public.friends and left-joins auth.users twice (for user_email and friend_email) and public.profiles twice (for user_display_name and friend_display_name).
2. Revoke all privileges on the view from anon and authenticated so it is NOT exposed through the PostgREST API — only the service role (dashboard / server-side) can read it; app code keeps querying the friends table directly.
3. Add a comment on the view describing it as a read-only join to auth.users / profiles for the Table Editor, not exposed via the public API.
*/

/* [GenAI Use] LLM Response Start*/
create or replace view public.friends_with_emails as
select
  f.user_id,
  u.email       as user_email,
  pu.display_name as user_display_name,
  f.friend_id,
  fu.email      as friend_email,
  pf.display_name as friend_display_name,
  f.created_at
from public.friends f
left join auth.users u   on u.id  = f.user_id
left join auth.users fu  on fu.id = f.friend_id
left join public.profiles pu on pu.id = f.user_id
left join public.profiles pf on pf.id = f.friend_id;

revoke all on public.friends_with_emails from anon, authenticated;

comment on view public.friends_with_emails is
  'Read-only view joining friends rows to auth.users / profiles so the Supabase Table Editor shows emails and display names. Not exposed via the public API.';
/* [GenAI Use] LLM Response End*/
