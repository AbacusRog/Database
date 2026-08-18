-- Restricts Company Authentication Code to admin users only — for view,
-- add, amend, and delete. Enforced by Postgres itself (Row Level Security),
-- not just by what the app chooses to display, so it holds even against a
-- direct API request from a signed-in but non-admin account.
--
-- Run this once in the Supabase SQL Editor. Safe alongside your existing
-- data — it moves the authentication_code column into its own table and
-- migrates any values already entered.

-- ---------------------------------------------------------------------------
-- Who's an admin. Absence from this table means "not admin" — there's no
-- need for an explicit "everyone else" row.
-- ---------------------------------------------------------------------------
create table if not exists user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- security definer so this can be used inside RLS policies on other tables
-- without those policies needing their own read access to user_roles.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function is_admin() to authenticated;

alter table user_roles enable row level security;

create policy select_admin_only on user_roles for select to authenticated using (is_admin());
create policy write_admin_only_insert on user_roles for insert to authenticated with check (is_admin());
create policy write_admin_only_update on user_roles for update to authenticated using (is_admin()) with check (is_admin());
create policy write_admin_only_delete on user_roles for delete to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- Authentication Code, moved out of companies into its own admin-only
-- table. Leaving it as a column on companies would defeat the point —
-- anyone signed in could still read it there regardless of what the app
-- chooses to show on screen.
-- ---------------------------------------------------------------------------
create table if not exists company_authentication_codes (
  company_id uuid primary key references companies(id) on delete cascade,
  authentication_code text,
  updated_at timestamptz not null default now()
);

insert into company_authentication_codes (company_id, authentication_code)
select id, authentication_code from companies
where authentication_code is not null
on conflict (company_id) do nothing;

alter table companies drop column if exists authentication_code;

drop trigger if exists company_authentication_codes_set_updated_at on company_authentication_codes;
create trigger company_authentication_codes_set_updated_at before update on company_authentication_codes
  for each row execute function set_updated_at();

alter table company_authentication_codes enable row level security;

create policy select_admin_only on company_authentication_codes for select to authenticated using (is_admin());
create policy write_admin_only_insert on company_authentication_codes for insert to authenticated with check (is_admin());
create policy write_admin_only_update on company_authentication_codes for update to authenticated using (is_admin()) with check (is_admin());
create policy write_admin_only_delete on company_authentication_codes for delete to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- RPCs for the in-app "Manage access" screen. The client can never query
-- auth.users directly (Supabase blocks that for good reason), so these two
-- functions do it server-side instead, each re-checking is_admin() itself —
-- not just relying on the app's UI to hide the button from non-admins.
-- ---------------------------------------------------------------------------
create or replace function admin_list_user_roles()
returns table (user_id uuid, email text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can view this.';
  end if;

  return query
    select ur.user_id, u.email::text, ur.created_at
    from user_roles ur
    join auth.users u on u.id = ur.user_id
    order by ur.created_at;
end;
$$;

grant execute on function admin_list_user_roles() to authenticated;

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

  select id into target_user_id from auth.users where email = target_email;

  if target_user_id is null then
    raise exception 'No account found for that email — they need to have signed in at least once first.';
  end if;

  insert into user_roles (user_id, role)
  values (target_user_id, 'admin')
  on conflict (user_id) do update set role = 'admin';
end;
$$;

grant execute on function admin_add_user_role(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Bootstrap: make yourself the first admin (there's no other way in, since
-- every path above requires already being one). Replace the email below
-- with the one you sign in with, then run just this block.
-- ---------------------------------------------------------------------------
insert into user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com'
on conflict (user_id) do update set role = 'admin';
