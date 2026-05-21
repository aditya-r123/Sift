-- Human-readable view over public.friends for the Supabase Table Editor.
-- The base table stores UUIDs (correct for foreign keys + survives email changes);
-- this view joins to auth.users so the dashboard shows emails alongside the ids.
--
-- Access is revoked from anon/authenticated so the view is NOT exposed via the
-- PostgREST API — only the service role (used by the dashboard / server-side)
-- can read it. App code keeps using the friends table directly.

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
