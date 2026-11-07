# ERP Mpixel Media

ERP Mpixel Media is a React web application for the day-to-day operations of a social media management and video production agency. It manages clients, freelance cameramen, shoots, deliverables, expenses, payment tracking, invoices, and approval workflows.

## Current features

- **Role-gated dashboards:** Admin operations view with daily/tomorrow shoot dispatch, payment follow-ups, crew payouts, and submission status; Founder view with approvals, cashflow, and client profitability.
- **Operations:** Client, cameraman, shoot, and expense records; shoot assignments and deliverables; client communication logs; cameraman availability. Scheduling a shoot opens prefilled WhatsApp drafts for the client and assigned crew (after Founder approval for Admin submissions); a person must still press Send in WhatsApp.
- **Schedule:** Monthly shoot calendar with date markers, hover/click previews, and links to shoot details. Horizontal two-finger trackpad gestures navigate backward/forward through visited app pages; horizontal scrolling inside content and form controls is left alone.
- **Payments and documents:** Receivables and crew payouts, overdue indicators, WhatsApp reminders/call sheets, CSV exports, and downloadable PDF invoices and payout vouchers. Paid documents use persisted, concurrency-safe database numbers; unpaid previews are explicitly marked as drafts.
- **Approvals and recovery:** Admin change requests with Founder review notes and resubmission; Admin recycle-bin restore and permanent deletion.
- **Settings and access:** Configurable status/category lists, payment grace period and WhatsApp templates, Founder-managed company/invoice profile, and self-service password updates.
- **Dashboard chart:** Income and outflow trends based on shoot payments and expenses.

## Technology

- React 19, TypeScript, Vite 6, React Router 7
- Tailwind CSS 4 and the shared CSS design system in `src/index.css`
- Supabase Auth, PostgreSQL, Realtime, Row Level Security, and Storage
- jsPDF and jsPDF-AutoTable for PDFs; Lucide React for icons
- Vitest and Testing Library for tests

## Requirements

- Node.js 20 or later
- npm
- A Supabase project configured with this application's schema and migrations

## Local setup

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/Dheerajnaik259/Data-Management.git
   cd Data-Management
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` in the project root:

   ```env
   VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```

4. Configure the database:
   - For a **new** Supabase project, apply `supabase/schema.sql`.
   - For an **existing** project, back up and test first, then apply only the unapplied files in `supabase/migrations/` in filename order. Do not rerun the bootstrap schema against a live database.
   - The payment-status migration `202611070001_lock_paid_payments.sql` installs the shoot payment RPC and makes confirmed paid statuses irreversible. Apply it if the database reports that `update_shoot_operational` is missing.
   - Apply `202611070002_delete_change_request_rpc.sql` if deleting approval requests reports that `delete_change_request` is missing.
   - Refresh the app after applying a migration. If the function remains missing, confirm the SQL was run in the same Supabase project configured in `.env.local` and that the API schema cache has refreshed.
   - Create and verify the required Supabase Auth profiles and policies before using the application.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`.

## Development checks

```bash
npm run lint       # TypeScript check (tsc --noEmit)
npm test           # Vitest suite
npm run build      # Production Vite build
```

`npm run preview` serves a production build locally. `npm run clean` removes generated `dist` output and a root `server.js` file if present.

## Application routes

| Route | Purpose |
|---|---|
| `/login` | Sign in |
| `/` | Role-specific dashboard |
| `/shoots`, `/shoots/:id` | Shoot schedule and details |
| `/schedule` | Monthly shoot calendar with event previews and links to shoot details |
| `/clients`, `/clients/:id` | Client list and profile |
| `/cameramen`, `/cameramen/:id` | Crew roster and profile |
| `/payments` | Receivables and crew payouts |
| `/invoices` | PDF invoices and payout vouchers |
| `/expenses` | Operating expenses |
| `/settings` | Operational and account settings |
| `/approvals` | Change-request review and status |
| `/recycle-bin` | Deleted-record recovery and purge |

Unknown routes redirect to `/`.

## Project layout

- `src/routes/` — route-level screens
- `src/components/` — shared layout, forms, dashboard, and interface components
- `src/context/` — authentication, data, theme, and toast state
- `src/supabase/` — Supabase configuration, auth, data access, and file operations
- `src/utils/` — permissions, dates, currency, WhatsApp, PDFs, CSV, and business helpers
- `supabase/schema.sql` — fresh-database schema and bootstrap policies
- `supabase/migrations/` — ordered updates for existing databases
- `supabase/migrations/proposed/` — unapproved schema proposals; never apply automatically

## Security notes

The browser uses the Supabase anon/publishable key. Never put a service-role key or other privileged credential in a `VITE_*` variable. UI role checks are not a security boundary: retain and test the database Row Level Security policies and guarded RPCs for each role. Review migrations in staging before deploying matching client code, configure Supabase Auth URLs for the deployed domain, and keep `.env.local` out of source control.

## Documentation

- [Project plan](PROJECT_PLAN.md) — implemented scope and delivery status
- [Functionality audit](FUNCTIONALITY_AUDIT.md) — verified behavior, known limitations, and required rollout checks
- [Data model](DATA_MODEL.md) — database tables, fields, roles, and authorization
- [Design system](DESIGN_SYSTEM.md) — current visual tokens and UI conventions
- [Future scope](FUTURE_SCOPE.md) — proposed features not present in the current build
- [Workspace rules](rules.md) — implementation and documentation ground rules

## License

Private and proprietary software for internal agency operations.
