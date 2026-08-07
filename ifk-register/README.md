# IFK Group Company Register

A searchable, editable register of companies — company numbers, directors,
persons with significant control (PSC), and shareholders. Built with:

- **Supabase** — Postgres database, auth, and API (no backend server to run)
- **React + Vite + TypeScript + Tailwind** — the frontend, talks to Supabase directly
- **Cloudflare Pages** — static hosting, auto-deploys from GitHub
- **GitHub** — source control and the trigger for deploys

Anyone with the link can search and view the register. Adding, editing, or
deleting a company, director, PSC, or shareholder requires signing in.

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

Right now: **anyone with the link can view; only signed-in users can edit.**

If you'd rather make the whole register private (login required just to
*view* it too), open `supabase/schema.sql` — there's a commented-out block
near the bottom with the two SQL commands to run instead (drop the public
read policies, add authenticated-only read policies). Run those in the SQL
Editor and it takes effect immediately, no redeploy needed.

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
