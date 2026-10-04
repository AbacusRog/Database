-- Read-only checks to run AFTER lockdown-teamspirits.sql.
-- Run each block separately in the Supabase SQL Editor.

-- 1) What an anonymous visitor can now see. Expect every number to be 0
--    (or "permission denied" for the CIS tables, which is also fine).
set local role anon;
select
  (select count(*) from public.companies)           as companies_visible,
  (select count(utr) from public.companies)         as utrs_visible,
  (select count(*) from public.people)              as people_visible,
  (select count(*) from public.company_directors)   as directors_visible;

-- 2) Which functions anon can still run. Expect all false.
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_can_run,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as signed_in_can_run
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('set_contractor_hmrc_password', 'get_contractor_hmrc_password',
                    'is_admin', 'admin_add_user_role', 'admin_list_user_roles', 'has_cis_access')
order by p.proname;

-- 3) Who currently has CIS access. Expect only the people who should.
select u.email, cr.role
from public.cis_user_roles cr
join auth.users u on u.id = cr.user_id
order by u.email;

-- 4) Security advisor: after applying, the anon_security_definer_function_executable
--    findings should be gone (Dashboard -> Advisors -> Security Advisor).
