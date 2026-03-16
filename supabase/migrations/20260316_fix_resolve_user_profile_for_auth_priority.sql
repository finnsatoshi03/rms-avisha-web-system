begin;

drop function if exists public.resolve_user_profile_for_auth(uuid);

create or replace function public.resolve_user_profile_for_auth(
  p_auth_user_id uuid default auth.uid()
)
returns table(
  id uuid,
  email text,
  fullname text,
  avatar text,
  role text,
  branch_id integer,
  shared_manager boolean,
  deleted boolean,
  migrated_to uuid,
  must_change_password boolean,
  created_at timestamp with time zone,
  migrated_email text,
  migration_status text,
  migration_completed_at timestamp with time zone
)
language sql
stable
security definer
set search_path = 'public'
as $function$
  with linked_user as (
    select u.*
    from public.user_auth_links l
    join public.users u
      on u.id = l.user_id
    where l.auth_user_id = p_auth_user_id
      and coalesce(u.deleted, false) = false
      and u.migrated_to is null
    order by l.is_primary desc, l.created_at asc
    limit 1
  ),
  direct_active_user as (
    select u.*
    from public.users u
    where u.id = p_auth_user_id
      and coalesce(u.deleted, false) = false
      and u.migrated_to is null
    limit 1
  ),
  direct_any_user as (
    select u.*
    from public.users u
    where u.id = p_auth_user_id
    limit 1
  )
  select
    l.id,
    l.email,
    l.fullname,
    l.avatar,
    l.role,
    l.branch_id,
    l.shared_manager,
    l.deleted,
    l.migrated_to,
    l.must_change_password,
    l.created_at,
    l.migrated_email,
    l.migration_status,
    l.migration_completed_at
  from linked_user l

  union all

  select
    d.id,
    d.email,
    d.fullname,
    d.avatar,
    d.role,
    d.branch_id,
    d.shared_manager,
    d.deleted,
    d.migrated_to,
    d.must_change_password,
    d.created_at,
    d.migrated_email,
    d.migration_status,
    d.migration_completed_at
  from direct_active_user d
  where not exists (select 1 from linked_user)

  union all

  select
    da.id,
    da.email,
    da.fullname,
    da.avatar,
    da.role,
    da.branch_id,
    da.shared_manager,
    da.deleted,
    da.migrated_to,
    da.must_change_password,
    da.created_at,
    da.migrated_email,
    da.migration_status,
    da.migration_completed_at
  from direct_any_user da
  where not exists (select 1 from linked_user)
    and not exists (select 1 from direct_active_user)

  limit 1;
$function$;

commit;
