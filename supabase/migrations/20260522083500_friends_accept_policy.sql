-- The previous friends_update_addressee policy had only a `using` clause.
-- Postgres reuses `using` as `with check` when no explicit check is provided,
-- which made the policy require status = 'pending' AFTER the update — blocking
-- the very accept it was meant to allow. Split the clauses so the addressee
-- can flip a pending row to accepted, and nothing else.

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
