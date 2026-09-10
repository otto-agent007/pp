-- Role-boundary follow-ups from the 2026-09-10 security review.
--
-- Both gaps below are reachable only by an already-signed-in staff account
-- (dispatcher or admin) going around the app through PostgREST with their own
-- JWT. They are latent on the live project today, which has no dispatcher
-- accounts, so this migration is preventative: it closes them before the first
-- dispatcher exists rather than after.

-- 1. profiles INSERT and DELETE were keyed on private.has_admin_access(), which
--    is true for dispatchers as well as admins, while the role guard added on
--    2026-09-06 only fires BEFORE UPDATE. A dispatcher could therefore delete
--    any profile row and re-insert it with role = 'admin', side-stepping the
--    guard entirely, or simply delete every admin. Narrow both to
--    private.is_admin(). The app never writes profiles with an end-user JWT --
--    technician invites and status changes all go through service-role routes,
--    which bypass RLS -- so nothing in the product loses access here.
drop policy if exists "admins insert profiles" on public.profiles;
create policy "admins insert profiles"
on public.profiles
for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "admins delete profiles" on public.profiles;
create policy "admins delete profiles"
on public.profiles
for delete
to authenticated
using ((select private.is_admin()));

-- 2. The UPDATE policy still admits dispatchers, and the existing guard watched
--    only the role column, leaving status unprotected: a dispatcher could set
--    every admin to 'inactive', after which private.is_admin() is false for
--    everyone and no role can be changed again without the service role. Guard
--    role and status together, on INSERT as well as UPDATE.
--
--    Service-role callers are exempt: they carry no user JWT, so auth.uid() is
--    null. That is the app's own trusted write path (technician invites,
--    deactivation), it already bypasses RLS, and triggers would otherwise block
--    it. anon has no policy on profiles at all, so it can never reach here.
create or replace function private.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if (select private.is_admin()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role in ('admin', 'dispatcher') then
      raise exception 'Only admins may create an admin or dispatcher profile';
    end if;

    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only admins may change a profile role';
  end if;

  if new.status is distinct from old.status then
    raise exception 'Only admins may change a profile status';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_profile_role_change() from public;

drop trigger if exists profiles_guard_role_change on public.profiles;
create trigger profiles_guard_role_change
before insert or update on public.profiles
for each row execute function private.guard_profile_role_change();

-- 3. customer_portal_access_tokens and its audit-events table still carried
--    `for all to authenticated using (has_admin_access())`, the same policy
--    shape removed from customer_portal_sessions on 2026-09-06. Token hashes
--    are unsalted SHA-256 of a caller-chosen secret, so a staff member could
--    insert a row hashing their own string and hold a valid portal grant for
--    any customer with no audit event and no rate limit, revive a revoked
--    token, extend an expiry, or delete the audit rows recording any of it.
--    Every application read and write of both tables goes through the
--    service-role routes under apps/web/app/api/portal/, so dropping the
--    authenticated-role policies removes the bypass without removing function.
drop policy if exists "Admins and dispatchers can manage portal access tokens"
  on public.customer_portal_access_tokens;

drop policy if exists "admins manage portal access token events"
  on public.customer_portal_access_token_events;
