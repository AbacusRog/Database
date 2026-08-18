# IFK Group Company Register

A searchable, editable register of companies — company numbers, directors,
persons with significant control (PSC), and shareholders. Built with:

- **Supabase** — Postgres database, auth, and API (no backend server to run)
- **React + Vite + TypeScript + Tailwind** — the frontend, talks to Supabase directly
- **Cloudflare Pages** — static hosting, auto-deploys from GitHub
- **GitHub** — source control and the trigger for deploys

Sign-in is required for everything — no company, director, PSC, or
shareholder data is visible until you log in. Once signed in, that same
account can also add, edit, and delete. The app opens straight into the
**Due dates** page.

Each company also tracks reference details (UTR, Authentication Code, VAT
Number, Incorporation Date) and three compliance dates — Year-End,
Confirmation Statement, and VAT Return. Each date is entered once as a
plain "Due date"; the app computes the actual statutory filing deadline
("Due by") from it — 9 months after for Year-End, 14 days after for
Confirmation Statement, 1 month + 7 days after for VAT Return. Nothing
auto-advances: when a cycle passes, whoever maintains the register updates
the Due date field by hand for the next one. The one exception is a
newly-incorporated company's first Year-End, which the app calculates
automatically from its Incorporation Date (see "First Year-End" below).

Every "Due by" date is colour-coded — red within 1 month, amber within 2
months, green otherwise — both in each company's detail view and on the
sortable Due dates page.

Authentication Code is restricted to admins only — for viewing, adding,
amending, and deleting alike — enforced by the database itself, not just
hidden in the interface. Everyone else sees it marked as restricted.
Admins manage who has that access from the in-app "Manage access" screen
(only visible to admins), which appears in the header once you're one.

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
   whichever incremental migration matches what you're adding instead —
   `supabase/make-private.sql`, `supabase/add-due-dates.sql`,
   `supabase/add-company-details.sql`, or
   `supabase/add-authentication-code-access-control.sql` — see the note at
   the top of each file. The last one also needs you to edit its bootstrap
   line at the bottom with your own email before running it, so you become
   the first admin — there's no other way in otherwise.
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

Due dates are stored as a single "Due date" per (company, task) in
`company_due_dates` — exactly what was typed in, never auto-advanced. The
"Due by" shown everywhere is computed from that value on the fly (9 months
after for Year-End, 14 days after for Confirmation Statement, 1 month + 7
days after for VAT Return); it isn't stored anywhere. When a deadline
passes, update the Due date field by hand for the next cycle — Year-End
and Confirmation Statement typically annually, VAT Return quarterly.

The one automatic exception: saving a company's Incorporation Date (in
"Company details") auto-calculates its first Year-End — the last day of
the month containing the first anniversary of incorporation, e.g.
incorporated 18 Aug 2026 → first Year-End 31 Aug 2027 — but only if no
Year-End has been entered yet, and only for companies incorporated after
31 Aug 2025. It's a one-time starting suggestion, not something that
recalculates later; it never overwrites a Year-End someone has already
entered.

The red/amber/green colouring on "Due by" dates is based on calendar
months, not a fixed day count — "due within 1 month" means the same thing
whether that month is 28 or 31 days long. See `trafficLight()` in
`src/lib/dueDates.ts` if you ever need to adjust the thresholds.

## If search or the relationship map ever comes back empty

Both features depend on the nested query in `src/hooks/useCompanies.ts`
successfully pulling directors/PSC/shareholders alongside each company. That
query uses explicit relationship hints (`company_directors!company_id`,
`people!person_id`, etc.) so PostgREST can't misresolve which foreign key to
follow. If you ever restructure the schema — renaming a column, adding a
second foreign key between two of these tables — that query will need the
hints updated to match, or embedding will silently return empty arrays for
the affected role instead of erroring.
