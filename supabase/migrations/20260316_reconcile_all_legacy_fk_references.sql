begin;

create temporary table tmp_user_legacy_map (
  legacy_user_id uuid primary key,
  canonical_user_id uuid not null
) on commit drop;

insert into tmp_user_legacy_map (legacy_user_id, canonical_user_id)
select id, migrated_to
from public.users
where migrated_to is not null;

delete from public.user_auth_links l
using tmp_user_legacy_map m
where l.user_id = m.legacy_user_id
  and exists (
    select 1
    from public.user_auth_links x
    where x.auth_user_id = l.auth_user_id
      and x.user_id = m.canonical_user_id
  );

update public.user_auth_links l
set user_id = m.canonical_user_id
from tmp_user_legacy_map m
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
      'update %I.%I t set %I = m.canonical_user_id from tmp_user_legacy_map m where t.%I = m.legacy_user_id',
      fk.schema_name,
      fk.table_name,
      fk.column_name,
      fk.column_name
    );
  end loop;
end
$$;

commit;
