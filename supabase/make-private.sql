-- Restricts viewing to signed-in users only. Previously anyone with the link
-- could view the register and only editing required sign-in; after this,
-- nothing is visible — not even the company list — until you log in.
--
-- Run this once in the Supabase SQL Editor on your existing project. It's
-- safe even though schema.sql already ran once; this only touches the read
-- (select) policies, not your tables or data.

drop policy if exists select_public on people;
drop policy if exists select_public on companies;
drop policy if exists select_public on company_directors;
drop policy if exists select_public on company_pscs;
drop policy if exists select_public on company_shareholders;

create policy select_authenticated on people for select to authenticated using (true);
create policy select_authenticated on companies for select to authenticated using (true);
create policy select_authenticated on company_directors for select to authenticated using (true);
create policy select_authenticated on company_pscs for select to authenticated using (true);
create policy select_authenticated on company_shareholders for select to authenticated using (true);

-- To undo this later (go back to public read + sign-in-to-edit), run:
--
-- drop policy if exists select_authenticated on people;
-- drop policy if exists select_authenticated on companies;
-- drop policy if exists select_authenticated on company_directors;
-- drop policy if exists select_authenticated on company_pscs;
-- drop policy if exists select_authenticated on company_shareholders;
--
-- create policy select_public on people for select using (true);
-- create policy select_public on companies for select using (true);
-- create policy select_public on company_directors for select using (true);
-- create policy select_public on company_pscs for select using (true);
-- create policy select_public on company_shareholders for select using (true);
