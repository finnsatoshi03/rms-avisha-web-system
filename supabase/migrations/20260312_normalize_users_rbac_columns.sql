begin;

alter table public.users
  add column if not exists branch_id integer,
  add column if not exists created_at timestamp with time zone;

update public.users u
set created_at = coalesce(u.created_at, au.created_at, now())
from auth.users au
where au.id = u.id
  and u.created_at is null;

update public.users
set branch_id = case
  when lower(coalesce(email, '')) = 'manager.taytay@rmsavisha.com' then 1
  when lower(coalesce(email, '')) = 'manager.pasig@rmsavisha.com' then 2
  when coalesce(role, '') ilike '%taytay%' then 1
  when coalesce(role, '') ilike '%pasig%' then 2
  else null
end
where branch_id is null;

update public.users
set role = case
  when lower(coalesce(email, '')) in ('avisha@email.com', 'admin@admin.com', 'dev@dev.com') then 'admin'
  when lower(coalesce(email, '')) in ('manager.taytay@rmsavisha.com', 'manager.pasig@rmsavisha.com') then 'manager'
  when coalesce(role, '') ilike '%admin%' then 'admin'
  when coalesce(role, '') ilike '%manager%' then 'manager'
  else 'technician'
end;

update public.users
set deleted = false
where deleted is null;

alter table public.users
  alter column role set not null,
  alter column deleted set default false,
  alter column deleted set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'manager', 'technician'));

alter table public.users
  drop constraint if exists users_branch_id_check;

alter table public.users
  add constraint users_branch_id_check
  check (branch_id is null or branch_id in (1, 2));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_branch_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_branch_id_fkey
      foreign key (branch_id)
      references public.branches(id);
  end if;
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
declare
  incoming_role text;
  normalized_role text;
begin
  incoming_role := lower(coalesce(new.raw_user_meta_data->>'role', ''));

  normalized_role := case
    when incoming_role = '' then null
    when incoming_role = 'admin' or incoming_role like '%admin%' then 'admin'
    when incoming_role = 'manager' or incoming_role like '%manager%' then 'manager'
    when incoming_role = 'technician' or incoming_role like '%technician%' then 'technician'
    else null
  end;

  insert into public.users (id, email, role, avatar, fullname, deleted, created_at)
  values (
    new.id,
    new.email,
    coalesce(normalized_role, 'technician'),
    new.raw_user_meta_data->>'avatar',
    new.raw_user_meta_data->>'fullname',
    false,
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = coalesce(normalized_role, public.users.role, 'technician'),
    avatar = coalesce(excluded.avatar, public.users.avatar),
    fullname = coalesce(excluded.fullname, public.users.fullname),
    deleted = coalesce(public.users.deleted, false);

  return new;
end;
$function$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'on_new_user'
      and n.nspname = 'auth'
      and c.relname = 'users'
      and not t.tgisinternal
  ) then
    create trigger on_new_user
      after insert or update on auth.users
      for each row execute function public.handle_new_user();
  end if;
end
$$;

commit;
