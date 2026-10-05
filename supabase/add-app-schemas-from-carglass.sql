-- Structure for the apps moving from the "Carglass" Supabase project onto TeamSpirits.
-- Each app gets its own schema so its table names cannot clash with the IFK register's
-- tables in public. Tables keep their old names so each app only needs to say which
-- schema to use. Safe to re-run. Contains no data: data is copied separately.
--
-- Access: a TeamSpirits admin (public.user_roles role = 'admin') can use every app;
-- anyone else needs a row in public.app_access naming the app.

-- 1. Who may use which app ---------------------------------------------------
create table if not exists public.app_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null,
  primary key (user_id, app)
);
alter table public.app_access enable row level security;
-- No policies: only the service role (and the functions below) can read it.

create or replace function public.has_app(p_app text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.app_access where user_id = auth.uid() and app = p_app) $$;

-- 2. Schemas -------------------------------------------------------------------
create schema if not exists pierscave;
create schema if not exists carglass;
create schema if not exists mjb;
create schema if not exists genesis;

-- 3. Piers Cave register -------------------------------------------------------
create table if not exists pierscave.companies (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  previous_names text,
  company_number text not null unique,
  incorporation_date date,
  registered_office text,
  sic_code text,
  status text not null default 'Active',
  utr text,
  vat_number text,
  authentication_code text,
  vat_stagger text,
  year_end_day integer,
  year_end_month integer,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists pierscave.people (
  id uuid not null default gen_random_uuid() primary key,
  full_name text not null,
  dob_month_year text,
  nationality text,
  country_of_residence text,
  occupation text,
  correspondence_address text,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists pierscave.company_officers (
  id uuid not null default gen_random_uuid() primary key,
  company_id uuid not null references pierscave.companies(id) on delete cascade,
  person_id uuid not null references pierscave.people(id) on delete cascade,
  role text not null default 'Director',
  appointed_on date,
  resigned_on date,
  status text not null default 'Active',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_officers_company on pierscave.company_officers (company_id);
create index if not exists idx_officers_person on pierscave.company_officers (person_id);
create table if not exists pierscave.company_pscs (
  id uuid not null default gen_random_uuid() primary key,
  company_id uuid not null references pierscave.companies(id) on delete cascade,
  person_id uuid not null references pierscave.people(id) on delete cascade,
  nature_of_control text,
  notified_on date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pscs_company on pierscave.company_pscs (company_id);
create index if not exists idx_pscs_person on pierscave.company_pscs (person_id);
create table if not exists pierscave.company_shareholders (
  id uuid not null default gen_random_uuid() primary key,
  company_id uuid not null references pierscave.companies(id) on delete cascade,
  person_id uuid not null references pierscave.people(id) on delete cascade,
  share_class text not null default 'Ordinary',
  shares_held integer,
  currency text not null default 'GBP',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_shareholders_company on pierscave.company_shareholders (company_id);
create index if not exists idx_shareholders_person on pierscave.company_shareholders (person_id);
create table if not exists pierscave.due_dates (
  id uuid not null default gen_random_uuid() primary key,
  company_id uuid references pierscave.companies(id) on delete cascade,
  person_id uuid references pierscave.people(id) on delete cascade,
  task_type text not null check (task_type in ('VAT','Year-End Accounts','Confirmation Statement','Personal Tax')),
  due_date date not null,
  due_by date not null,
  amount text,
  note text,
  flag text,
  filed boolean not null default false,
  created_at timestamptz not null default now(),
  check ((company_id is not null and person_id is null) or (company_id is null and person_id is not null))
);
create index if not exists idx_due_dates_due_by on pierscave.due_dates (due_by);

-- Only admins may see or change a company's authentication code.
create or replace function pierscave.protect_authentication_code()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then new.authentication_code := old.authentication_code; end if;
  return new;
end $$;
create or replace function pierscave.protect_authentication_code_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then new.authentication_code := null; end if;
  return new;
end $$;
drop trigger if exists trg_protect_auth_code on pierscave.companies;
create trigger trg_protect_auth_code before update on pierscave.companies
  for each row execute function pierscave.protect_authentication_code();
drop trigger if exists trg_protect_auth_code_insert on pierscave.companies;
create trigger trg_protect_auth_code_insert before insert on pierscave.companies
  for each row execute function pierscave.protect_authentication_code_insert();

create or replace view pierscave.companies_view with (security_invoker = true) as
  select id, name, previous_names, company_number, incorporation_date, registered_office, sic_code, status,
         utr, vat_number,
         case when public.is_admin() then authentication_code else null::text end as authentication_code,
         vat_stagger, year_end_day, year_end_month, notes, created_at
  from pierscave.companies c;

-- 4. Carglass timesheets -------------------------------------------------------
create table if not exists carglass.employees (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  annual_wage numeric(12,2) not null,
  working_days_per_year numeric(6,2) not null default 253,
  working_hours_per_day numeric(6,2) not null default 8.5,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  start_date date,
  holiday_entitlement_days numeric(6,2) not null default 28,
  leave_date date,
  address text,
  ni_number text,
  date_of_birth date,
  email text
);
create table if not exists carglass.pay_periods (
  id uuid not null default gen_random_uuid() primary key,
  year integer not null,
  month integer not null check (month >= 1 and month <= 12),
  created_at timestamptz not null default now(),
  unique (year, month)
);
create table if not exists carglass.timesheets (
  id uuid not null default gen_random_uuid() primary key,
  employee_id uuid not null references carglass.employees(id) on delete cascade,
  pay_period_id uuid not null references carglass.pay_periods(id) on delete cascade,
  days_worked numeric(6,2) not null default 0,
  extra_hours numeric(6,2) not null default 0,
  missing_hours numeric(6,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  holiday_days numeric(6,2) not null default 0,
  full_month boolean not null default false,
  annual_wage numeric(12,2),
  working_days_per_year numeric(6,2),
  working_hours_per_day numeric(6,2),
  unique (employee_id, pay_period_id)
);
create table if not exists carglass.adjustment_types (
  id uuid not null default gen_random_uuid() primary key,
  label text not null,
  kind text not null check (kind in ('addition','deduction')),
  created_at timestamptz not null default now(),
  unique (label, kind)
);
create table if not exists carglass.adjustments (
  id uuid not null default gen_random_uuid() primary key,
  timesheet_id uuid not null references carglass.timesheets(id) on delete cascade,
  kind text not null check (kind in ('addition','deduction')),
  label text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create table if not exists carglass.holiday_balances (
  id uuid not null default gen_random_uuid() primary key,
  employee_id uuid not null references carglass.employees(id) on delete cascade,
  year integer not null,
  days_taken numeric(6,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (employee_id, year)
);

-- 5. Invoice apps ----------------------------------------------------------------
create table if not exists genesis.invoices (
  id text not null primary key,
  invoice_number text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists invoices_invoice_number_idx on genesis.invoices (invoice_number);
create table if not exists mjb.mjb_invoices (
  id text not null primary key,
  invoice_number text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists mjb_invoices_invoice_number_idx on mjb.mjb_invoices (invoice_number);

-- 6. Row-level security and access ------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('pierscave','companies','pierscave'), ('pierscave','people','pierscave'),
      ('pierscave','company_officers','pierscave'), ('pierscave','company_pscs','pierscave'),
      ('pierscave','company_shareholders','pierscave'), ('pierscave','due_dates','pierscave'),
      ('carglass','employees','carglass'), ('carglass','pay_periods','carglass'),
      ('carglass','timesheets','carglass'), ('carglass','adjustment_types','carglass'),
      ('carglass','adjustments','carglass'), ('carglass','holiday_balances','carglass'),
      ('genesis','invoices','genesis'), ('mjb','mjb_invoices','mjb')
    ) as t(sch, tbl, app)
  loop
    execute format('alter table %I.%I enable row level security', r.sch, r.tbl);
    execute format('drop policy if exists "app access" on %I.%I', r.sch, r.tbl);
    execute format(
      'create policy "app access" on %I.%I for all to authenticated using (public.is_admin() or public.has_app(%L)) with check (public.is_admin() or public.has_app(%L))',
      r.sch, r.tbl, r.app, r.app);
  end loop;
end $$;

do $$
declare s text;
begin
  foreach s in array array['pierscave','carglass','mjb','genesis'] loop
    execute format('grant usage on schema %I to authenticated, service_role', s);
    execute format('grant select, insert, update, delete on all tables in schema %I to authenticated, service_role', s);
    execute format('alter default privileges in schema %I grant select, insert, update, delete on tables to authenticated, service_role', s);
  end loop;
end $$;
