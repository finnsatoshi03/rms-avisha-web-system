begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
declare
  incoming_role text;
  normalized_role text;
  canonical_user_id uuid;
begin
  incoming_role := lower(coalesce(new.raw_user_meta_data->>'role', ''));

  normalized_role := case
    when incoming_role = '' then null
    when incoming_role = 'dev' or incoming_role like '%dev%' then 'dev'
    when incoming_role = 'admin' or incoming_role like '%admin%' then 'admin'
    when incoming_role = 'manager' or incoming_role like '%manager%' then 'manager'
    when incoming_role = 'technician' or incoming_role like '%technician%' then 'technician'
    else null
  end;

  select u.id
    into canonical_user_id
  from public.users u
  where lower(coalesce(u.email, '')) = lower(coalesce(new.email, ''))
    and u.id <> new.id
    and coalesce(u.deleted, false) = false
    and u.migrated_to is null
  order by u.created_at asc, u.id asc
  limit 1;

  insert into public.users (
    id,
    email,
    role,
    avatar,
    fullname,
    deleted,
    migrated_to,
    created_at
  )
  values (
    new.id,
    new.email,
    coalesce(normalized_role, 'technician'),
    new.raw_user_meta_data->>'avatar',
    new.raw_user_meta_data->>'fullname',
    canonical_user_id is not null,
    canonical_user_id,
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = coalesce(normalized_role, public.users.role, 'technician'),
    avatar = coalesce(excluded.avatar, public.users.avatar),
    fullname = coalesce(excluded.fullname, public.users.fullname),
    deleted = case
      when canonical_user_id is not null then true
      else coalesce(public.users.deleted, false)
    end,
    migrated_to = canonical_user_id;

  return new;
end;
$function$;

commit;
