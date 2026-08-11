# IFK Group Company Register

A searchable, editable register of companies — company numbers, directors,
persons with significant control (PSC), and shareholders. Built with:

- **Supabase** — Postgres database, auth, and API (no backend server to run)
- **React + Vite + TypeScript + Tailwind** — the frontend, talks to Supabase directly
- **Cloudflare Pages** — static hosting, auto-deploys from GitHub
- **GitHub** — source control and the trigger for deploys

Sign-in is required for everything — no company, director, PSC, or
shareholder data is visible until you log in. Once signed in, that same
account can also add, edit, and delete.

Each company also tracks three recurring compliance dates — Year-End,
Confirmation Statement, and VAT Return — set once each and shown on a
sortable "Due dates" page (sort by date, company, or task). You enter a
date once; the app works out the next occurrence itself (annually for
Year-End and Confirmation Statement, quarterly for VAT Return), so nothing
needs re-entering as each deadline passes.

---

## 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com), sign in, and create a new project
   (pick any name/region; note the database password it generates — you likely
   won't need it again, but keep it somewhere safe).
2. Once the project is ready, open **SQL Editor** in the left sidebar.
3. Open `supabase/schema.sql` from this repo, copy the whole file, paste it
   into a new query, and click **Run**. This creates the tables and the
   security rules.
4. Open `supabase/seed.sql` the same way and run it. This loads the five
   companies from your original spreadsheet (Team Spirits Airport Operations,
   Team Spirits Group, IFK Holdings, Staywell Solutions, ISR Property
   Investments) with their directors, PSC, and shareholders.

   **Already have this project set up from before?** Don't re-run
   `schema.sql` — it'll error on policies that already exist. Just run
   `supabase/make-private.sql` and/or `supabase/add-due-dates.sql` instead,
   whichever features you're adding — see the note at the top of each file.
5. Go to **Project Settings → Data API**. Copy the **Project URL** and the
   **anon public** key — you'll need both in step 3 below. (The anon key is
   safe to put in frontend code; it only grants what the RLS policies you
   just created allow.)

### Create your login (for editing)

The register itself has no public sign-up page — that's deliberate, so
strangers can't create edit access. You add editors from the Supabase
dashboard instead:

1. Go to **Authentication → Users** in Supabase.
2. Click **Add user → Create new user**.
3. Enter your email and a password, and tick **Auto Confirm User** (so you
   don't need an email confirmation step).
4. Repeat for anyone else who should be able to edit.

That's the account you'll use to click **Sign in to edit** on the live site.

---

## 2. Run it locally (optional, but useful to check everything works)

You'll need [Node.js](https://nodejs.org) (v18+) installed.

```bash
cd ifk-register
npm install
cp .env.example .env.local
```

Edit `.env.local` and paste in the Project URL and anon key from step 1:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Then:

```bash
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). You should see the
five companies. Try the search box, then sign in with the account you created
above and try adding a company or a director.

---

## 3. Push to GitHub

```bash
cd ifk-register
git init
git add .
git commit -m "Initial commit: IFK Group Company Register"
```

Create a new **empty** repository on GitHub (no README/license, so it stays
empty), then:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

`.env.local` is in `.gitignore` and won't be pushed — your Supabase keys stay
out of the repo. That's expected; you'll set them directly in Cloudflare
Pages next.

---

## 4. Deploy on Cloudflare Pages

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages →
   Connect to Git**, and authorize/select your GitHub repo.
2. Set the build configuration:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Before the first deploy, add the environment variables (**Settings →
   Environment variables**, for both Production and Preview):
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click **Save and Deploy**.

Cloudflare will build and give you a `*.pages.dev` URL. From now on, every
push to `main` redeploys automatically. You can attach a custom domain later
under **Custom domains** on the Pages project.

---

## Changing who can view the register

Right now: **sign-in is required for everything — viewing included.**

If you'd rather let anyone with the link view (and only gate editing), open
`supabase/schema.sql` — there's a commented-out "public read" block near the
bottom with the SQL to run instead. Or, on an already-running project, the
reverse migration is in the comments at the bottom of
`supabase/make-private.sql`.

## Notes on the data model

Directors, PSC, and shareholders all point to one shared `people` table —
so if "Imran Kasmani" is a director on three companies, he's one row, not
three. When you add someone in the app, it first checks for an existing
person with that exact name before creating a new one, so watch for typos
creating accidental duplicates (e.g. "Imran Kasmani" vs "Imran Kasmani ").
If duplicates do slip in, you can merge/clean them up directly in the
Supabase **Table Editor**.

Removing a person from a company's director/PSC/shareholder list only
removes that link, not the person record itself — so their history on other
companies is untouched. There's no in-app "delete this person everywhere"
action by design; do that from the Supabase Table Editor if you ever need it.

Due dates work the same way regardless of when you look: each is stored as
a single anchor date (`supabase/schema.sql` → `company_due_dates`), and the
app rolls it forward by the task's recurrence — 12 months for Year-End and
Confirmation Statement, 3 months for VAT Return — until it lands on today
or later. That means you never have to re-enter a date after a deadline
passes; the "next due" date just advances on its own the next time anyone
loads the page. If you ever need to see the date exactly as entered rather
than the computed next occurrence, it's the raw `due_date` column in that
table.

## If search or the relationship map ever comes back empty

Both features depend on the nested query in `src/hooks/useCompanies.ts`
successfully pulling directors/PSC/shareholders alongside each company. That
query uses explicit relationship hints (`company_directors!company_id`,
`people!person_id`, etc.) so PostgREST can't misresolve which foreign key to
follow. If you ever restructure the schema — renaming a column, adding a
second foreign key between two of these tables — that query will need the
hints updated to match, or embedding will silently return empty arrays for
the affected role instead of erroring.
