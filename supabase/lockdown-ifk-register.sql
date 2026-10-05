-- TeamSpirits: restrict the IFK register tables to admins + users with the 'ifk' app.
-- Written 2026-10-05.
--
-- WHY: these tables allowed ANY signed-in user to read, add, change and delete rows.
-- The Piers Cave, MJ Brooks, Genesis and Carglass logins now exist on this project, so
-- they could have read or edited the IFK register (UTRs, VAT numbers, officers) by
-- calling the API directly.
--
-- AFTER THIS: only admins (user_roles) and users with an app_access row for 'ifk' can
-- use these tables. Roger is an admin. Nirmala is given the 'ifk' app below.
-- The IFK app itself needs no code change.
--
-- Run in the TeamSpirits SQL editor. Safe to re-run. Undo: lockdown-ifk-register-rollback.sql
-- Check: lockdown-ifk-register-verify.sql

begin;

-- Nirmala keeps access to the register
insert into public.app_access (user_id, app)
select u.id, 'ifk'
from auth.users u
where lower(u.email) = 'nirmala.e@staywellsolutions.co.uk'
  and not exists (select 1 from public.app_access a where a.user_id = u.id and a.app = 'ifk');

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'people', 'company_directors', 'company_pscs',
    'company_shareholders', 'company_due_dates'
  ] loop
    execute format('drop policy if exists select_authenticated on public.%I', t);
    execute format('drop policy if exists write_authenticated_insert on public.%I', t);
    execute format('drop policy if exists write_authenticated_update on public.%I', t);
    execute format('drop policy if exists write_authenticated_delete on public.%I', t);
    execute format('drop policy if exists ifk_access on public.%I', t);
    execute format(
      'create policy ifk_access on public.%I for all to authenticated '
      'using (public.is_admin() or public.has_app(''ifk'')) '
      'with check (public.is_admin() or public.has_app(''ifk''))',
      t
    );
  end loop;
end $$;

-- company_due_date_completions has no delete policy today; keep it that way.
drop policy if exists select_authenticated on public.company_due_date_completions;
drop policy if exists write_authenticated_insert on public.company_due_date_completions;
drop policy if exists write_authenticated_update on public.company_due_date_completions;
drop policy if exists ifk_select on public.company_due_date_completions;
drop policy if exists ifk_insert on public.company_due_date_completions;
drop policy if exists ifk_update on public.company_due_date_completions;
create policy ifk_select on public.company_due_date_completions for select to authenticated
  using (public.is_admin() or public.has_app('ifk'));
create policy ifk_insert on public.company_due_date_completions for insert to authenticated
  with check (public.is_admin() or public.has_app('ifk'));
create policy ifk_update on public.company_due_date_completions for update to authenticated
  using (public.is_admin() or public.has_app('ifk'))
  with check (public.is_admin() or public.has_app('ifk'));

commit;
