alter table public.friends replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'friends'
  ) then
    alter publication supabase_realtime add table public.friends;
  end if;
end $$;
