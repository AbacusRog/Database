-- Run AFTER lockdown-ifk-register.sql. Nothing here changes data (each block rolls back).
-- Expected: Piers Cave login sees 0 rows; Roger and Nirmala see the register.

-- 1. piers cave (should be 0 / 0)
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"3339ba26-5237-4438-8791-6d8332d9b526","role":"authenticated"}', true);
select 'piers cave' as who, (select count(*) from public.companies) as companies, (select count(*) from public.people) as people;
rollback;

-- 2. nirmala (should be more than 0)
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15a13e5d-0238-4013-9a46-0744bed476d2","role":"authenticated"}', true);
select 'nirmala' as who, (select count(*) from public.companies) as companies, (select count(*) from public.people) as people;
rollback;

-- 3. roger (should be more than 0)
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ad3fffca-696a-4b54-84d4-507d0b29acac","role":"authenticated"}', true);
select 'roger' as who, (select count(*) from public.companies) as companies, (select count(*) from public.people) as people;
rollback;
