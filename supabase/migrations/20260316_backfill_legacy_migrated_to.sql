begin;

with canonical as (
  select
    u.id,
    lower(coalesce(u.email, '')) as email_key
  from public.users u
  where u.deleted = false
    and u.migrated_to is null
)
update public.users legacy
set migrated_to = canonical.id
from canonical
where legacy.deleted = true
  and legacy.migrated_to is null
  and legacy.id <> canonical.id
  and lower(coalesce(legacy.email, '')) = canonical.email_key;

commit;
