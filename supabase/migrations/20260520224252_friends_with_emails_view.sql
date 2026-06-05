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
