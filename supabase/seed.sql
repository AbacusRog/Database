-- IFK Group Company Register — seed data generated from IFK_Companies.xlsx
-- Safe to re-run: uses ON CONFLICT to avoid duplicates.

-- 1. People
insert into people (full_name) values
  ('Imran Kasmani'),
  ('Jojo Blankson'),
  ('Omar Kasmani'),
  ('Rhys Bowen'),
  ('Serena Barwick'),
  ('Shazia Arif'),
  ('Yaseen Dhuka')
on conflict do nothing;

-- 2. Companies
insert into companies (name, company_number) values
  ('Team Spirits Airport Operations Limited', '7131646'),
  ('Team Spirits Group Ltd', '10725948'),
  ('IFK Holdings', '13395914'),
  ('Staywell Solutions Ltd', '16113402'),
  ('ISR Property Investments Limited', '17358260')
on conflict do nothing;

-- 3. Directors
insert into company_directors (company_id, person_id)
select c.id, p.id
from (values
  ('Team Spirits Airport Operations Limited'::text, 'Imran Kasmani'::text),
  ('Team Spirits Airport Operations Limited'::text, 'Shazia Arif'::text),
  ('Team Spirits Group Ltd'::text, 'Imran Kasmani'::text),
  ('IFK Holdings'::text, 'Imran Kasmani'::text),
  ('Staywell Solutions Ltd'::text, 'Imran Kasmani'::text),
  ('Staywell Solutions Ltd'::text, 'Jojo Blankson'::text),
  ('Staywell Solutions Ltd'::text, 'Yaseen Dhuka'::text),
  ('Staywell Solutions Ltd'::text, 'Omar Kasmani'::text),
  ('ISR Property Investments Limited'::text, 'Imran Kasmani'::text),
  ('ISR Property Investments Limited'::text, 'Rhys Bowen'::text),
  ('ISR Property Investments Limited'::text, 'Serena Barwick'::text)
) as v(company_name, person_name)
join companies c on c.name = v.company_name
join people p on p.full_name = v.person_name
on conflict do nothing;

-- 4. Persons with significant control
insert into company_pscs (company_id, person_id)
select c.id, p.id
from (values
  ('Team Spirits Airport Operations Limited'::text, 'Shazia Arif'::text),
  ('Team Spirits Group Ltd'::text, 'Imran Kasmani'::text),
  ('IFK Holdings'::text, 'Imran Kasmani'::text),
  ('Staywell Solutions Ltd'::text, 'Imran Kasmani'::text),
  ('ISR Property Investments Limited'::text, 'Imran Kasmani'::text)
) as v(company_name, person_name)
join companies c on c.name = v.company_name
join people p on p.full_name = v.person_name
on conflict do nothing;

-- 5. Shareholders (with share counts)
insert into company_shareholders (company_id, person_id, shares)
select c.id, p.id, v.shares
from (values
  ('Team Spirits Airport Operations Limited'::text, 'Shazia Arif'::text, 200::numeric),
  ('Team Spirits Group Ltd'::text, 'Imran Kasmani'::text, 100::numeric),
  ('IFK Holdings'::text, 'Imran Kasmani'::text, 100::numeric),
  ('Staywell Solutions Ltd'::text, 'Imran Kasmani'::text, 30::numeric),
  ('Staywell Solutions Ltd'::text, 'Yaseen Dhuka'::text, 30::numeric),
  ('Staywell Solutions Ltd'::text, 'Omar Kasmani'::text, 30::numeric),
  ('ISR Property Investments Limited'::text, 'Imran Kasmani'::text, 50::numeric),
  ('ISR Property Investments Limited'::text, 'Rhys Bowen'::text, 19::numeric),
  ('ISR Property Investments Limited'::text, 'Serena Barwick'::text, 31::numeric)
) as v(company_name, person_name, shares)
join companies c on c.name = v.company_name
join people p on p.full_name = v.person_name
on conflict do nothing;
