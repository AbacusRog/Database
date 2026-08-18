-- IFK Group Company Register — database schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).

create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- People: a single table for anyone who can appear as a director, PSC, or
-- shareholder. The same person is stored once and referenced from each role,
-- so "Imran Kasmani" is one row even though he is a director/PSC/shareholder
-- on several companies.
-- ---------------------------------------------------------------------------
create table if not exists people (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists people_name_trgm_idx on people using gin (full_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company_number text,
  notes text,
  utr text,
  vat_number text,
  incorporation_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_name_trgm_idx on companies using gin (name gin_trgm_ops);
create index if not exists companies_number_idx on companies (company_number);

-- ---------------------------------------------------------------------------
-- Role junction tables. Each links one company to one person.
-- Shareholders carry a share count; PSC and directors carry optional notes
-- (e.g. "resigned 2024-01-01") for future use.
-- ---------------------------------------------------------------------------
create table if not exists company_directors (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (company_id, person_id)
);

create table if not exists company_pscs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (company_id, person_id)
);

create table if not exists company_shareholders (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  shares numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (company_id, person_id)
);

create index if not exists company_directors_company_idx on company_directors (company_id);
create index if not exists company_directors_person_idx on company_directors (person_id);
create index if not exists company_pscs_company_idx on company_pscs (company_id);
create index if not exists company_pscs_person_idx on company_pscs (person_id);
create index if not exists company_shareholders_company_idx on company_shareholders (company_id);
create index if not exists company_shareholders_person_idx on company_shareholders (person_id);

-- ---------------------------------------------------------------------------
-- Due dates: one anchor date per (company, task). The recurrence itself
-- isn't stored — year-end and confirmation statement recur every 12 months,
-- VAT return every 3 months, and the app computes the next occurrence from
-- this anchor date whenever it renders. That means a date is entered once
-- and never needs manual re-entry as each deadline passes; the "next due"
-- shown always rolls forward automatically.
-- ---------------------------------------------------------------------------
create table if not exists company_due_dates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  task_type text not null check (task_type in ('year_end', 'confirmation_statement', 'vat_return')),
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, task_type)
);

create index if not exists company_due_dates_company_idx on company_due_dates (company_id);

-- ---------------------------------------------------------------------------
-- Access control: who's an admin. Absence from this table means "not
-- admin" — there's no need for an explicit "everyone else" row. Used to
-- restrict Company Authentication Code below to admins only, for view,
-- add, amend, and delete alike.
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

-- ---------------------------------------------------------------------------
-- Authentication Code lives in its own admin-only table rather than as a
-- column on companies — a column there would be readable by any signed-in
-- user regardless of what the app chooses to display.
-- ---------------------------------------------------------------------------
create table if not exists company_authentication_codes (
  company_id uuid primary key references companies(id) on delete cascade,
  authentication_code text,
  updated_at timestamptz not null default now()
);

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
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists companies_set_updated_at on companies;
create trigger companies_set_updated_at before update on companies
  for each row execute function set_updated_at();

drop trigger if exists people_set_updated_at on people;
create trigger people_set_updated_at before update on people
  for each row execute function set_updated_at();

drop trigger if exists company_due_dates_set_updated_at on company_due_dates;
create trigger company_due_dates_set_updated_at before update on company_due_dates
  for each row execute function set_updated_at();

drop trigger if exists company_authentication_codes_set_updated_at on company_authentication_codes;
create trigger company_authentication_codes_set_updated_at before update on company_authentication_codes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Default here: sign-in is required to view OR edit anything. Nobody sees
-- any company, director, PSC, or shareholder data without logging in first.
--
-- If you'd rather let anyone with the link view (and only gate editing),
-- see the "public read" block commented out at the bottom — run that
-- instead of the "select_authenticated" policies below.
-- ---------------------------------------------------------------------------
alter table people enable row level security;
alter table companies enable row level security;
alter table company_directors enable row level security;
alter table company_pscs enable row level security;
alter table company_shareholders enable row level security;
alter table company_due_dates enable row level security;
alter table user_roles enable row level security;
alter table company_authentication_codes enable row level security;

-- Signed-in users can read
create policy select_authenticated on people for select to authenticated using (true);
create policy select_authenticated on companies for select to authenticated using (true);
create policy select_authenticated on company_directors for select to authenticated using (true);
create policy select_authenticated on company_pscs for select to authenticated using (true);
create policy select_authenticated on company_shareholders for select to authenticated using (true);
create policy select_authenticated on company_due_dates for select to authenticated using (true);

-- Admin only, both to view and to write — see the note above each table
create policy select_admin_only on user_roles for select to authenticated using (is_admin());
create policy write_admin_only_insert on user_roles for insert to authenticated with check (is_admin());
create policy write_admin_only_update on user_roles for update to authenticated using (is_admin()) with check (is_admin());
create policy write_admin_only_delete on user_roles for delete to authenticated using (is_admin());

create policy select_admin_only on company_authentication_codes for select to authenticated using (is_admin());
create policy write_admin_only_insert on company_authentication_codes for insert to authenticated with check (is_admin());
create policy write_admin_only_update on company_authentication_codes for update to authenticated using (is_admin()) with check (is_admin());
create policy write_admin_only_delete on company_authentication_codes for delete to authenticated using (is_admin());

-- Signed-in users can write
create policy write_authenticated_insert on people for insert to authenticated with check (true);
create policy write_authenticated_update on people for update to authenticated using (true) with check (true);
create policy write_authenticated_delete on people for delete to authenticated using (true);

create policy write_authenticated_insert on companies for insert to authenticated with check (true);
create policy write_authenticated_update on companies for update to authenticated using (true) with check (true);
create policy write_authenticated_delete on companies for delete to authenticated using (true);

create policy write_authenticated_insert on company_directors for insert to authenticated with check (true);
create policy write_authenticated_update on company_directors for update to authenticated using (true) with check (true);
create policy write_authenticated_delete on company_directors for delete to authenticated using (true);

create policy write_authenticated_insert on company_pscs for insert to authenticated with check (true);
create policy write_authenticated_update on company_pscs for update to authenticated using (true) with check (true);
create policy write_authenticated_delete on company_pscs for delete to authenticated using (true);

create policy write_authenticated_insert on company_shareholders for insert to authenticated with check (true);
create policy write_authenticated_update on company_shareholders for update to authenticated using (true) with check (true);
create policy write_authenticated_delete on company_shareholders for delete to authenticated using (true);

create policy write_authenticated_insert on company_due_dates for insert to authenticated with check (true);
create policy write_authenticated_update on company_due_dates for update to authenticated using (true) with check (true);
create policy write_authenticated_delete on company_due_dates for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- OPTIONAL: public read (anyone with the link can view; only editing is
-- gated). To use this instead: skip the six "select_authenticated" policies
-- above, and run this block instead:
--
-- create policy select_public on people for select using (true);
-- create policy select_public on companies for select using (true);
-- create policy select_public on company_directors for select using (true);
-- create policy select_public on company_pscs for select using (true);
-- create policy select_public on company_shareholders for select using (true);
-- create policy select_public on company_due_dates for select using (true);
--
-- (And drop the select_authenticated policies first: drop policy select_authenticated on companies; etc.)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Bootstrap: make yourself the first admin (there's no other way in, since
-- granting access via the app requires already being an admin). Replace
-- the email below with the one you sign in with, then run just this block
-- after you've signed in at least once.
-- ---------------------------------------------------------------------------
insert into user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com'
on conflict (user_id) do update set role = 'admin';
