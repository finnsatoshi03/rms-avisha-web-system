-- Phase 2.2: fix auth_rls_initplan advisor warnings (docs/OPTIMIZATION_PLAN.md)
-- Wraps auth.uid() in (select auth.uid()) so it's evaluated once per query
-- instead of once per row. Semantics are identical.
-- Applied to production 2026-07-12 via Management API. Idempotent.

alter policy dev_admin_full_access on public.clients
  using (exists (select 1 from users u where u.id = (select auth.uid()) and u.role = any (array['dev','admin'])))
  with check (exists (select 1 from users u where u.id = (select auth.uid()) and u.role = any (array['dev','admin'])));

alter policy manager_read_create_update on public.clients
  using (exists (select 1 from users u where u.id = (select auth.uid()) and u.role = 'manager'))
  with check (exists (select 1 from users u where u.id = (select auth.uid()) and u.role = 'manager'));

alter policy technician_create on public.clients
  with check (exists (select 1 from users u where u.id = (select auth.uid()) and u.role = 'technician'));

alter policy technician_read on public.clients
  using (exists (select 1 from users u where u.id = (select auth.uid()) and u.role = 'technician'));

alter policy technician_update on public.clients
  using (exists (select 1 from users u where u.id = (select auth.uid()) and u.role = 'technician'))
  with check (exists (select 1 from users u where u.id = (select auth.uid()) and u.role = 'technician'));

alter policy admin_manage_onboardings on public.feature_onboardings
  using (exists (select 1 from users u where u.id = (select auth.uid()) and u.role = any (array['dev','admin'])))
  with check (exists (select 1 from users u where u.id = (select auth.uid()) and u.role = any (array['dev','admin'])));

alter policy user_own_onboarding_insert on public.user_onboarding_status
  with check (user_id = (select auth.uid()));

alter policy user_own_onboarding_read on public.user_onboarding_status
  using (user_id = (select auth.uid()));

alter policy user_own_onboarding_update on public.user_onboarding_status
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
