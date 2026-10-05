-- Undo lockdown-ifk-register.sql: any signed-in user can use the IFK register again.
-- (Leaves Nirmala's 'ifk' app_access row in place; it is harmless.)
begin;

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'people', 'company_directors', 'company_pscs',
    'company_shareholders', 'company_due_dates'
  ] loop
    execute format('drop policy if exists ifk_access on public.%I', t);
    execute format('drop policy if exists select_authenticated on public.%I', t);
    execute format('drop policy if exists write_authenticated_insert on public.%I', t);
    execute format('drop policy if exists write_authenticated_update on public.%I', t);
    execute format('drop policy if exists write_authenticated_delete on public.%I', t);
    execute format('create policy select_authenticated on public.%I for select to authenticated using (true)', t);
    execute format('create policy write_authenticated_insert on public.%I for insert to authenticated with check (true)', t);
    execute format('create policy write_authenticated_update on public.%I for update to authenticated using (true) with check (true)', t);
    execute format('create policy write_authenticated_delete on public.%I for delete to authenticated using (true)', t);
  end loop;
end $$;

drop policy if exists ifk_select on public.company_due_date_completions;
drop policy if exists ifk_insert on public.company_due_date_completions;
drop policy if exists ifk_update on public.company_due_date_completions;
drop policy if exists select_authenticated on public.company_due_date_completions;
drop policy if exists write_authenticated_insert on public.company_due_date_completions;
drop policy if exists write_authenticated_update on public.company_due_date_completions;
create policy select_authenticated on public.company_due_date_completions for select to authenticated using (true);
create policy write_authenticated_insert on public.company_due_date_completions for insert to authenticated with check (true);
create policy write_authenticated_update on public.company_due_date_completions for update to authenticated using (true) with check (true);

commit;
