begin;

alter table public.users
  add column if not exists must_change_password boolean;

update public.users
set must_change_password = false
where must_change_password is null;

alter table public.users
  alter column must_change_password set default false,
  alter column must_change_password set not null;

commit;
