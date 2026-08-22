# Taff Desk CRM — Multi-tenant Admin Dashboard

Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn-style UI + MySQL. Built
so you can sell it as a product: one deployment, one **Super Admin**, and as many
independent **Admin** tenants (your clients) as you want — each with their own
isolated customers, appointments, quotations, products/stock, analytics, team, and
even their own dashboard color/name.

## Role hierarchy

```
Super Admin
  └─ creates & manages Admins (activate/deactivate, reset password, remove)
     Controls the global/default branding (color + name) shown on the login screen.
     Has no business data of their own.

Admin  (a tenant / one client's business)
  └─ everything below is scoped to this Admin only:
     Customers, Appointments, Quotations, Products & Stock, Analytics
  └─ creates & manages Executives (their team's login accounts)
  └─ can set their OWN dashboard color + name — isolated, doesn't affect
     any other Admin or the global default

Executive  (a "user" created by an Admin — belongs to that Admin's tenant)
  └─ Gets exactly the modules their Admin grants them — Customers, Appointments,
     Quotations, Products & Stock, Analytics — any combination, set per member
  └─ No access to Team, Settings → Appearance, or another tenant's data
```

Every business table carries a `tenant_id` (the owning Admin's id). All API routes
filter by it, so one Admin's data — and now their branding — is never visible to
another Admin or their executives. This was verified end-to-end against a real
MySQL instance: tenant color/name isolation, and executive permission boundaries
(blocked before a grant, working immediately after, re-login required to refresh
the session like any JWT-based permission change).

## What's new in this update

- **Balance Sheet** *(Admin only, never Executive)* — a proper mini-ledger:
  Cash, Bank, Creditor, and Debtor accounts each get an opening balance
  entered **once**; every change after that is a logged increase/decrease
  transaction, so the balance is always dynamically computed, never hand-edited.
  Raw Material value is pulled live from Products × current stock — no manual
  entry. Capital/Equity is always the computed balancing figure (Total Assets
  − Creditors), so the two sides of the sheet are mathematically guaranteed to
  tally, with a live "Balanced" indicator.
- **CSV import for Appointments** and **CSV import + export for Products**
  (Appointments import matches existing customers by phone, then by name).
- **Per-tenant Settings** — accent color and dashboard name are no longer global.
  Super Admin controls the default (used on the login screen and as the fallback);
  each Admin can override just their own view from Settings → Appearance, and it
  never touches anyone else's.
- **Granular Executive permissions** — instead of a fixed executive role, Admins
  now pick exactly which modules (Customers / Appointments / Quotations /
  Products & Stock / Analytics) each team member can access, from Team → Edit
  permissions. Fully isolated per member — and the sidebar now correctly shows
  only what each Executive was actually granted.
- **Analytics: enquiry tracking** — log how many enquiries a specific post
  generated (`Post reference` + `Enquiries` fields), and entries are now editable,
  not just add/delete.
- **Pagination + date filters everywhere** — Customers, Appointments, Quotations,
  Products, and Analytics all support day/month/year filtering, a rows-per-page
  picker (remembered per module, per browser), and tabs that show live counts.
- **Collapsible sidebar** — a toggle in the topbar shrinks the desktop sidebar to
  icon-only width; the mobile drawer is unaffected. Preference is remembered.
- **Full English UI** — every label, toast, and error message in the app is in
  English.

## Modules (parity with your PHP CRM, plus upgrades)

- **Customers** — add/edit/delete, product, phone, email, address, notes, status
  (lead/active/inactive), visited flag, search, date filter, pagination, CSV
  export + import
- **Appointments** — add/edit/delete, linked to a customer, date/time, remarks,
  status (pending/completed/cancelled), tabs for All/Today/Tomorrow/Past with
  counts, date filter, pagination, CSV export + import
- **Quotations** — send a quotation against an appointment (auto-marks that
  appointment **completed**), accept/reject status, tabs with counts, date filter,
  pagination
- **Products & Stock** *(Admin, or Executives granted "products")* — product
  catalog with SKU/price, stock in/out transactions, running stock level, In
  Stock/Out of Stock tabs with counts, date filter, pagination, CSV export + import
- **Analytics** *(Admin, or Executives granted "analytics")* — per-executive,
  per-platform performance log including **enquiries generated per post**,
  add/edit/delete, manageable platform list, date filter, pagination
- **Balance Sheet** *(Admin only — hard-restricted, never Executive-accessible
  even with permissions granted)* — Cash/Bank/Creditor/Debtor ledger accounts
  with one-time opening balances and a running transaction log, Fixed Assets
  register, Raw Material value pulled live from Products, and an always-tallied
  two-column Assets/Liabilities view
- **Team** *(Admin only)* — create/deactivate/reset-password/remove Executives,
  and set exactly which modules each one can access
- **Admins** *(Super Admin only)* — create/deactivate/reset-password/remove
  Admins; deleting an Admin cascades and removes their entire tenant's data
- **Settings** — Profile (any role) + Appearance (Super Admin & Admin, isolated
  per tenant): accent color (presets or custom hex), light/dark/system theme,
  dashboard/product name
- Fully responsive, with a collapsible desktop sidebar and a mobile drawer

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · hand-wired shadcn-style
components (Radix UI primitives) · react-hook-form + zod · **PostgreSQL** via
**node-postgres (`pg`)**, deployed on **Vercel** with **Neon** ·
jose (JWT sessions, embeds role + tenant + permissions) · bcryptjs · next-themes ·
sonner · papaparse (CSV import)

## Getting started (local development)

### 1. Create the database

**Fresh install** — create an empty Postgres database (e.g. `crm_db`) and import the schema:

```bash
psql "$DATABASE_URL" -f sql/schema.postgres.sql
```

(A local Postgres example: `psql postgres://postgres:postgres@localhost:5432/crm_db -f sql/schema.postgres.sql`)

**Migrating from the MySQL version of Tafftech CRM?** See "Migrating from MySQL"
below — the schema is different enough (placeholders, `ENUM` → `CHECK`,
`AUTO_INCREMENT` → `SERIAL`, etc.) that there's no simple ALTER-table path;
easiest is to start fresh on Postgres and re-enter/re-import your data.

### 2. Configure the connection

```bash
cp .env.example .env.local
```

Set `DATABASE_URL` to your Postgres connection string. For local development
that's usually `postgres://postgres:postgres@localhost:5432/crm_db`; for Neon
it looks like `postgresql://user:password@ep-xxxx.neon.tech/crm_db?sslmode=require`
(see the deployment guide below for exactly where to get this).

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo logins (seeded by schema.postgres.sql)

| Role         | Email                       | Password        |
|--------------|------------------------------|------------------|
| Super Admin  | superadmin@novacrm.com       | superadmin123    |
| Admin        | admin@novacrm.com            | admin123         |
| Executive    | executive@novacrm.com        | executive123     |

Change these passwords from **Settings → Profile** immediately after logging in
on a real deployment — or reset/remove them entirely from the Super Admin's
**Admins** page / an Admin's **Team** page.

---

## Deploying to Vercel (free) with Neon (free Postgres)

This is the full path from "I have this code" to "it's live on the internet",
written for someone who hasn't done this before. It's all free — Vercel's
Hobby plan and Neon's Free plan both require no credit card.

### Step 1 — Put the code on GitHub

Vercel deploys from a Git repository, so the project needs to live on GitHub
(GitLab/Bitbucket also work, but GitHub is the simplest path).

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click **New repository** (the **+** icon, top right → New repository).
3. Name it something like `nova-crm`, keep it **Private** (recommended, since
   this contains your business logic), and click **Create repository**.
4. On your computer, inside the unzipped `crm` folder, run:
   ```bash
   git init
   git add .
   git commit -m "Tafftech CRM"
   git branch -M main
   git remote add origin https://github.com/<your-username>/nova-crm.git
   git push -u origin main
   ```
   (Replace `<your-username>` with your actual GitHub username. GitHub will
   show you this exact command on the empty repository's page after step 3.)

### Step 2 — Create a Neon Postgres database

1. Go to [neon.tech](https://neon.tech) and sign up for a free account (you can
   sign up directly with your GitHub account — one click, no separate password).
2. Click **Create a project**. Give it a name (e.g. `nova-crm`), pick a region
   close to you or your customers, and click **Create**.
3. Once the project is created, Neon shows a **Connection string** on the
   dashboard. Neon actually gives you two variants — look for a toggle or
   dropdown labeled **Pooled connection** / **Direct connection**. **Use the
   pooled one** (its hostname contains `-pooler`, e.g. `ep-cool-name-12345
   -pooler.ap-southeast-1.aws.neon.tech`) — it routes through Neon's built-in
   PgBouncer, which matters because Vercel can spin up many separate function
   instances under load, and the pooled connection lets them all share the
   database's connection limit instead of exhausting it. It looks like:
   ```
   postgresql://neondb_owner:AbC123xyz@ep-cool-name-12345-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   Copy this — this is your `DATABASE_URL`. Keep this tab open, you'll need it
   again in Step 4.
4. Still in Neon, open the **SQL Editor** (left sidebar). Paste the entire
   contents of `sql/schema.postgres.sql` into it and click **Run**. This
   creates every table and seeds the three demo accounts. You only do this once.

   *(Alternative: if you have `psql` installed locally, you can instead run
   `psql "<connection-string-from-step-3>" -f sql/schema.postgres.sql` from
   your terminal — same result.)*

Neon's free plan gives you 3 projects, 10 GB of storage, and scales to zero
when idle (the database "wakes up" automatically on the first request after
being idle — the very first request after a quiet period may take a second
or two longer, that's normal and expected on the free tier).

### Step 3 — Import the project into Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (again, one click with
   your GitHub account is easiest — this also lets Vercel see your repos).
2. Click **Add New...** → **Project**.
3. Find your `nova-crm` repository in the list and click **Import**.
4. Vercel will auto-detect this as a Next.js project — you don't need to
   change the build settings.
5. **Don't click Deploy yet** — first expand **Environment Variables** (still
   on this same screen) and add:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | the Neon connection string from Step 2.3 |
   | `JWT_SECRET` | any long random string (see below for how to generate one) |

   To generate a strong `JWT_SECRET`, run this on your computer and paste the
   output:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
6. Now click **Deploy**. Vercel builds and deploys the app — this takes
   1-2 minutes the first time.
7. Once it's done, Vercel gives you a live URL like
   `https://nova-crm-yourname.vercel.app`. Open it — you should land on the
   login page. Log in with the Super Admin demo account, then immediately
   change its password from Settings → Profile.

That's it — the app is live, backed by a real Postgres database, for ₹0/$0.

### Keeping it updated

Any time you push a new commit to the `main` branch on GitHub, Vercel
automatically rebuilds and redeploys — no manual steps needed after the
first setup.

### A note on cold starts

Both Vercel's free serverless functions and Neon's free-tier database scale
to zero when idle. This means the *first* request after a period of no
traffic can take a couple of seconds longer than usual while everything
wakes up — completely normal, and every subsequent request is fast. If this
ever becomes a problem (e.g. you have paying clients relying on it daily),
upgrading either plan removes this — but plenty of small businesses run
comfortably on the free tier.

---

## Migrating from MySQL (if you were running the earlier version)

Tafftech CRM originally shipped with a MySQL/XAMPP setup (`sql/schema.sql`,
`sql/migration_v2.sql`, `sql/migration_v3.sql` — still included in this
project for reference). This version runs on Postgres instead, which is a
better fit for Vercel's serverless hosting. Because so much syntax differs
between the two databases (placeholders, `ENUM` types, auto-increment,
date functions), there's no automatic one-command migration — the
recommended path is:

1. Set up the new Postgres database using `sql/schema.postgres.sql` (as above).
2. If you have real customer/appointment/product data in your old MySQL
   database you need to keep, export each table to CSV from phpMyAdmin
   (Export → CSV) and use the in-app **Import** buttons on the Customers,
   Appointments, and Products pages to bring that data into the new database
   (these already handle the column mapping for you).
3. For the Admins/Team/Balance Sheet data — which don't have an import UI —
   you can either re-create them by hand (fastest if it's just a handful of
   accounts), or ask for a one-off custom export/import script if you have a
   large amount of this data specifically.



## Adding your first real client

1. Log in as Super Admin.
2. Go to **Admins → Add admin** — this is your client's tenant owner account.
3. They log in, and from **Team** they create Executive accounts for their staff —
   picking exactly which modules each one can use (Customers, Appointments,
   Quotations, Products & Stock, Analytics, in any combination).
4. From **Settings → Appearance** they can set their own dashboard color and
   name — it only affects their own tenant.

Everything they and their team create stays inside that one tenant, invisible to
every other Admin.

## SQL you can run directly (no app restart needed)

```sql
-- Deactivate any account without deleting it:
UPDATE admins SET status = 'inactive' WHERE email = 'someone@example.com';

-- Manually reset a password (bcrypt hash — generate one with `node -e
-- "console.log(require('bcryptjs').hashSync('newpassword', 10))"` from the
-- project folder, then paste the output below):
UPDATE admins SET password = '<bcrypt-hash-here>' WHERE email = 'someone@example.com';

-- Grant/restrict an executive's module access directly:
UPDATE admins SET permissions = '["customers","appointments"]'
  WHERE email = 'exec@example.com' AND role = 'executive';

-- See every tenant's data footprint at a glance:
SELECT ad.name, ad.email,
  (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = ad.id) AS customers,
  (SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = ad.id) AS appointments,
  (SELECT COUNT(*) FROM admins e WHERE e.tenant_id = ad.id AND e.role='executive') AS team_size
FROM admins ad WHERE ad.role = 'admin';

-- Check or reset a tenant's own branding override:
SELECT * FROM settings WHERE tenant_id = <admin_id>;
DELETE FROM settings WHERE tenant_id = <admin_id>;  -- reverts them to the global default

-- Permanently delete a tenant and everything in it (cascades via FKs):
DELETE FROM admins WHERE id = <admin_id> AND role = 'admin';
```

## Environment variables

```
DATABASE_URL=postgres://user:password@host:5432/dbname   # your Neon (or any Postgres) connection string
JWT_SECRET=replace-this-with-a-long-random-string          # required before production
```

## Project structure

```
sql/schema.postgres.sql → run this once (locally or in Neon's SQL Editor) to create + seed everything
sql/schema.sql, sql/migration_v2.sql, sql/migration_v3.sql
                         → the original MySQL/XAMPP versions, kept for reference only
src/
  middleware.ts          → role- and permission-based route protection
  lib/
    db.ts                 → Postgres (pg) connection pool + query helpers, tuned for serverless
    auth.ts               → JWT session (role, tenantId, permissions) + canAccess()
    settings.ts            → tenant-aware branding (global default + per-tenant override)
    query-helpers.ts       → shared date-filter + pagination SQL builders
    balance-sheet.ts       → shared Balance Sheet totals computation
  app/
    (dashboard)/           → protected shell: sidebar (permission-filtered, collapsible) + topbar
      dashboard/            → overview stats (tenant-scoped)
      customers/, appointments/, quotations/ → Admin + permitted Executives
      products/, analytics/                   → Admin + permitted Executives
      balance-sheet/, team/                   → Admin only, always
      admins/                                 → Super Admin only
      settings/                               → Profile (all) + Appearance (Super Admin/Admin)
    api/                    → one route folder per resource, all tenant- and permission-scoped
  components/
    ui/                    → shadcn-style primitives, plus DateFilter and PaginationBar
    <feature>/              → per-module list + form dialog components
```
