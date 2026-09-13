# Supabase setup

Run these two files in your Supabase project's **SQL Editor**, in order:

1. `schema.sql` — creates the tables (`companies`, `people`, `company_directors`,
   `company_pscs`, `company_shareholders`) and the security rules (anyone can
   view, only signed-in users can edit).
2. `seed.sql` — loads the five companies from `IFK_Companies.xlsx`. Safe to
   re-run; it skips anything already there.

Both are plain SQL — paste the whole file into a new query and click **Run**.
