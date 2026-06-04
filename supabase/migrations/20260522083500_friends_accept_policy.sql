drop policy if exists "friends_update_addressee" on public.friends;

create policy "friends_update_addressee"
  on public.friends for update
  using (
    (select auth.uid()) = addressee_id
    and status = 'pending'
  )
  with check (
    (select auth.uid()) = addressee_id
    and status = 'accepted'
  );
