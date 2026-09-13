-- Fixes admin_add_user_role() in two ways:
--  1. Matches emails case-insensitively, so a stored/typed casing mismatch
--     doesn't cause a false "no account found".
--  2. Clarifies the error message. This app has no public sign-up, so
--     "no account found" doesn't mean someone forgot to log in — it means
--     nobody has created a login for them yet. That has to happen first,
--     in Supabase → Authentication → Users → Add user (the same way your
--     own original account was set up), before they can be granted admin.
--
-- Safe to run any time — this only replaces the function definition, no
-- data is touched.

create or replace function admin_add_user_role(target_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  if not is_admin() then
    raise exception 'Only admins can grant access.';
  end if;

  select id into target_user_id from auth.users where lower(email) = lower(target_email);

  if target_user_id is null then
    raise exception 'No account found for that email. This app has no public sign-up, so create their login first in Supabase → Authentication → Users → Add user, then try again.';
  end if;

  insert into user_roles (user_id, role)
  values (target_user_id, 'admin')
  on conflict (user_id) do update set role = 'admin';
end;
$$;

grant execute on function admin_add_user_role(text) to authenticated;
