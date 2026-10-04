-- Read-only checks to run AFTER lockdown-teamspirits.sql.
-- The SQL Editor runs everything you paste as one batch, so each block below
-- puts the role back to normal when it finishes. You can run the whole file or
-- one block at a time; the editor shows the result of the LAST query only, so
-- running one block at a time (select it, then Run) is the clearest way.

-- 1) What an anonymous visitor can now see. Expect every number to be 0.
begin;
set local role anon;
select
  (select count(*) from public.companies)           as companies_visible,
  (select count(utr) from public.companies)         as utrs_visible,
  (select count(vat_number) from public.companies)  as vat_numbers_visible,
  (select count(*) from public.people)              as people_visible,
  (select count(*) from public.company_directors)   as directors_visible;
rollback;

-- 2) Which functions anon can still run. Expect anon_can_run = false on every row.
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_can_run,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as signed_in_can_run
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('set_contractor_hmrc_password', 'get_contractor_hmrc_password',
                    'is_admin', 'admin_add_user_role', 'admin_list_user_roles', 'has_cis_access')
order by p.proname;

-- 3) Who currently has CIS access. Expect only roger@abacusconsultancy.co.uk.
select u.email, cr.role
from public.cis_user_roles cr
join auth.users u on u.id = cr.user_id
order by u.email;

-- 4) Policies now on the protected tables. Expect select_authenticated on the
--    register tables and cis_access_only on the cis_* tables (no select_public,
--    no authenticated_full_access).
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and (tablename in ('companies', 'people', 'company_directors', 'company_pscs', 'company_shareholders')
       or tablename like 'cis\_%' escape '\')
order by tablename, policyname;
