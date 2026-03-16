begin;

create or replace function public.resolve_migrated_login_hint(
  p_login_email text
)
returns table(
  legacy_auth_user_id uuid,
  legacy_email text,
  canonical_user_id uuid,
  canonical_email text,
  migrated_email text
)
language sql
stable
security definer
set search_path = 'public', 'auth'
as $function$
  with normalized as (
    select lower(trim(coalesce(p_login_email, ''))) as login_email
  ),
  legacy_auth as (
    select au.id, au.email
    from auth.users au
    join normalized n
      on lower(coalesce(au.email, '')) = n.login_email
    where au.banned_until is not null
      and au.banned_until > now()
    order by au.created_at asc
    limit 1
  ),
  legacy_profile as (
    select u.*
    from legacy_auth la
    join public.users u
      on u.id = la.id
    limit 1
  ),
  canonical_profile as (
    select c.*
    from legacy_profile lp
    join public.users c
      on c.id = coalesce(lp.migrated_to, lp.id)
    limit 1
  )
  select
    lp.id as legacy_auth_user_id,
    la.email as legacy_email,
    cp.id as canonical_user_id,
    cp.email as canonical_email,
    coalesce(cp.migrated_email, cp.email) as migrated_email
  from legacy_auth la
  join legacy_profile lp
    on true
  join canonical_profile cp
    on true
  where coalesce(cp.migrated_email, cp.email) is not null
    and lower(coalesce(cp.migrated_email, cp.email))
      <> lower(coalesce(la.email, ''));
$function$;

grant execute on function public.resolve_migrated_login_hint(text)
  to anon, authenticated, service_role;

update public.users u
set must_change_password = false
where u.must_change_password = true
  and coalesce(u.deleted, false) = false
  and u.migrated_to is null
  and u.migration_status = 'completed'
  and exists (
    select 1
    from public.user_auth_links l
    join auth.users au
      on au.id = l.auth_user_id
    where l.user_id = u.id
      and l.auth_user_id <> u.id
      and l.is_primary = true
      and au.email_confirmed_at is not null
      and lower(coalesce(au.email, ''))
        = lower(coalesce(u.migrated_email, u.email, ''))
  );

commit;
