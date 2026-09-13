-- Keeps a history of "Mark completed" actions on due dates, so completing
-- a task doesn't just silently overwrite the old date — and adds an undo
-- path for the most recent completion per (company, task), in case one
-- gets marked done by mistake.
--
-- Run this once in the Supabase SQL Editor. Safe alongside your existing
-- data — this only adds a new table.

create table if not exists company_due_date_completions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  task_type text not null check (task_type in ('year_end', 'confirmation_statement', 'vat_return')),
  previous_due_date date not null,
  new_due_date date not null,
  completed_at timestamptz not null default now(),
  completed_by_email text,
  undone_at timestamptz,
  undone_by_email text
);

create index if not exists company_due_date_completions_lookup_idx
  on company_due_date_completions (company_id, task_type, completed_at desc);

alter table company_due_date_completions enable row level security;

-- Same permission model as the due dates themselves: any signed-in user
-- can view and manage the history, not just admins.
create policy select_authenticated on company_due_date_completions for select to authenticated using (true);
create policy write_authenticated_insert on company_due_date_completions for insert to authenticated with check (true);
create policy write_authenticated_update on company_due_date_completions for update to authenticated using (true) with check (true);
