-- Adds due-date tracking (Year-End, Confirmation Statement, VAT Return) to
-- an existing project. Safe to run alongside your current data — this only
-- adds a new table, it doesn't touch companies/people/roles.
--
-- Run this once in the Supabase SQL Editor.

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

drop trigger if exists company_due_dates_set_updated_at on company_due_dates;
create trigger company_due_dates_set_updated_at before update on company_due_dates
  for each row execute function set_updated_at();

alter table company_due_dates enable row level security;

create policy select_authenticated on company_due_dates for select to authenticated using (true);
create policy write_authenticated_insert on company_due_dates for insert to authenticated with check (true);
create policy write_authenticated_update on company_due_dates for update to authenticated using (true) with check (true);
create policy write_authenticated_delete on company_due_dates for delete to authenticated using (true);

-- If your project is set up for public read (see make-private.sql), also run:
-- create policy select_public on company_due_dates for select using (true);
