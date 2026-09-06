-- Enforce profiles.status on admin access, and stop non-admins from
-- changing the role column (dispatcher previously had the same DB-level
-- access as admin, including on the profiles table itself).

create or replace function private.has_admin_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'dispatcher')
      and status = 'active'
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and status = 'active'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

create or replace function private.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not private.is_admin() then
    raise exception 'Only admins may change a profile role';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_profile_role_change() from public;

drop trigger if exists profiles_guard_role_change on public.profiles;
create trigger profiles_guard_role_change
before update on public.profiles
for each row execute function private.guard_profile_role_change();
