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

-- Signed-in users can read
create policy select_authenticated on people for select to authenticated using (true);
create policy select_authenticated on companies for select to authenticated using (true);
create policy select_authenticated on company_directors for select to authenticated using (true);
create policy select_authenticated on company_pscs for select to authenticated using (true);
create policy select_authenticated on company_shareholders for select to authenticated using (true);

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

-- ---------------------------------------------------------------------------
-- OPTIONAL: public read (anyone with the link can view; only editing is
-- gated). To use this instead: skip the five "select_authenticated" policies
-- above, and run this block instead:
--
-- create policy select_public on people for select using (true);
-- create policy select_public on companies for select using (true);
-- create policy select_public on company_directors for select using (true);
-- create policy select_public on company_pscs for select using (true);
-- create policy select_public on company_shareholders for select using (true);
--
-- (And drop the select_authenticated policies first: drop policy select_authenticated on companies; etc.)
-- ---------------------------------------------------------------------------
