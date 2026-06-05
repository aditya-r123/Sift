create policy "swipes_delete_own"
  on public.swipes for delete
  using ((select auth.uid()) = user_id);
