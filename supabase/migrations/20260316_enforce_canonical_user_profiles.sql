begin;

alter table public.users
  add column if not exists migrated_to uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_migrated_to_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_migrated_to_check
      check (migrated_to is null or migrated_to <> id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_migrated_to_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_migrated_to_fkey
      foreign key (migrated_to)
      references public.users(id);
  end if;
end
$$;

create index if not exists users_migrated_to_idx
  on public.users (migrated_to);

create temporary table tmp_user_canonical_map (
  legacy_user_id uuid primary key,
  canonical_user_id uuid not null
) on commit drop;

with candidates as (
  select
    u.id,
    lower(u.email) as email_key,
    u.created_at,
    exists (
      select 1
      from public.user_auth_links l
      where l.user_id = u.id
        and l.auth_user_id <> u.id
        and l.is_primary = true
    ) as has_primary_external_auth,
    (
      select count(*)
      from public.joborders j
      where j.technician_id = u.id
         or j.order_received = u.id
    ) as joborder_reference_count
  from public.users u
  where u.email is not null
),
ranked as (
  select
    c.*,
    row_number() over (
      partition by c.email_key
      order by
        c.has_primary_external_auth desc,
        c.joborder_reference_count desc,
        c.created_at asc,
        c.id asc
    ) as row_rank,
    count(*) over (partition by c.email_key) as email_count
  from candidates c
)
insert into tmp_user_canonical_map (legacy_user_id, canonical_user_id)
select
  legacy.id,
  canonical.id
from ranked legacy
join ranked canonical
  on canonical.email_key = legacy.email_key
 and canonical.row_rank = 1
where legacy.email_count > 1
  and legacy.row_rank > 1
  and legacy.id <> canonical.id;

update public.users u
set
  migrated_to = m.canonical_user_id,
  deleted = true
from tmp_user_canonical_map m
where u.id = m.legacy_user_id
  and (
    u.migrated_to is distinct from m.canonical_user_id
    or u.deleted is distinct from true
  );

delete from public.user_auth_links l
using tmp_user_canonical_map m
where l.user_id = m.legacy_user_id
  and exists (
    select 1
    from public.user_auth_links x
    where x.auth_user_id = l.auth_user_id
      and x.user_id = m.canonical_user_id
  );

update public.user_auth_links l
set user_id = m.canonical_user_id
from tmp_user_canonical_map m
where l.user_id = m.legacy_user_id;

do $$
declare
  fk record;
begin
  for fk in
    select
      ns.nspname as schema_name,
      cls.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class cls
      on cls.oid = con.conrelid
    join pg_namespace ns
      on ns.oid = cls.relnamespace
    join unnest(con.conkey) as ck(attnum)
      on true
    join pg_attribute att
      on att.attrelid = con.conrelid
     and att.attnum = ck.attnum
    where con.contype = 'f'
      and con.confrelid = 'public.users'::regclass
      and array_length(con.conkey, 1) = 1
      and ns.nspname = 'public'
      and cls.relname <> 'user_auth_links'
      and not (cls.relname = 'users' and att.attname = 'migrated_to')
  loop
    execute format(
      'update %I.%I t set %I = m.canonical_user_id from tmp_user_canonical_map m where t.%I = m.legacy_user_id',
      fk.schema_name,
      fk.table_name,
      fk.column_name,
      fk.column_name
    );
  end loop;
end
$$;

update auth.users au
set banned_until = '9999-12-31 23:59:59+00'::timestamptz
where exists (
  select 1
  from public.user_auth_links self_link
  where self_link.auth_user_id = au.id
    and self_link.user_id = au.id
    and exists (
      select 1
      from public.user_auth_links replacement_link
      where replacement_link.user_id = self_link.user_id
        and replacement_link.auth_user_id <> self_link.auth_user_id
    )
);

commit;
