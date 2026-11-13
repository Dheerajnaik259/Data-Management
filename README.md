# ERP Mpixel Media

ERP Mpixel Media is an internal operations app for a social-media management and video-production agency. It manages clients, freelance camera crew, shoots, deliverables, expenses, payments, invoices, and approval workflows.

## What the app does

- Role-aware dashboards for Founders, Admins, and Social Media Managers.
- Client, crew, shoot, expense, and communication-history workflows.
- A monthly shoot calendar, shoot detail pages, and assignment/check-in tracking.
- Change requests for managed records, with Founder approval and review notes.
- Payment and crew-payout tracking; persisted invoice and voucher numbers for paid items.
- CSV exports, PDF invoices and payout vouchers, and private Supabase Storage links. Client-invoice GST is optional and remains off until a Founder configures a verified GSTIN and accountant-confirmed rate; intra-state CGST/SGST versus inter-state IGST can be selected on the invoice.
- WhatsApp message drafts for scheduling and payment follow-up. The app does not send WhatsApp messages; a person reviews and sends each draft.
- Configurable status/category lists and operational templates, team invitations, and password updates.
- Record recovery: Admins can soft-delete and restore records; Founders can permanently delete recycled records with an MFA-authenticated session.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for implemented scope and [FUNCTIONALITY_AUDIT.md](FUNCTIONALITY_AUDIT.md) for verification and remaining release checks.

## Technology

- React 19, TypeScript, Vite 8, React Router 7
- Tailwind CSS 4 and the shared styles in `src/index.css`
- Supabase Auth, PostgreSQL, Row Level Security, Realtime, and Storage
- jsPDF and jsPDF-AutoTable; Lucide React
- Vitest and Testing Library

## Requirements

- Node.js 20.19+ (or 22.12+) and npm
- A Supabase project configured with this app's schema and ordered migrations

## Local setup

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/Dheerajnaik259/Data-Management.git
   cd Data-Management
   ```

2. Install the locked dependencies:

   ```bash
   npm ci
   ```

3. Create `.env.local` in the project root:

   ```env
   VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-or-publishable-key"
   ```

   These browser variables are public. Never put a Supabase service-role key or other privileged secret in a `VITE_*` variable.

4. Configure Supabase:
   - For a new project, apply `supabase/schema.sql`, then the production migrations in `supabase/migrations/` in filename order.
   - For an existing project, back up first and apply only migrations not already installed. Do not rerun `schema.sql` on an existing database.
   - Never automatically apply files in `supabase/migrations/proposed/`. They are unapproved, potentially destructive proposals, not part of the production migration chain.
   - Apply and verify migrations in a separate staging project before production. Enable MFA for Founder accounts before applying the production-hardening migration; approval/rejection, permanent deletion, and business-profile changes require an AAL2 session.
   - Restrict Auth signup/invitation and redirect settings to the intended operators and deployed domains. Confirm the database project matches `.env.local`.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`. Vite binds to localhost by default.

## Development commands

```bash
npm run lint       # TypeScript check (tsc --noEmit)
npm test           # Vitest suite
npm run build      # Production build
npm run preview    # Serve the production build locally
npm run clean      # Remove generated dist output
```

Only expose the development server to another device on a trusted network, for example with `npm run dev -- --host`.

## Routes

| Route | Screen |
|---|---|
| `/login` | Sign in |
| `/` | Role-specific dashboard |
| `/shoots`, `/shoots/:id` | Shoot list and details |
| `/schedule` | Monthly shoot calendar |
| `/clients`, `/clients/:id` | Client list and profile |
| `/cameramen`, `/cameramen/:id` | Crew list and profile |
| `/payments` | Receivables and crew payouts |
| `/invoices` | Invoice and payout-voucher PDFs |
| `/expenses` | Operating expenses |
| `/settings` | Account, team, and operational settings |
| `/approvals` | Change requests and review status |
| `/recycle-bin` | Restore or permanently delete records, according to role |

Unknown routes redirect to `/`. Social Media Manager route access is narrower than Admin/Founder access.

## Repository map

- `src/routes/` — route-level screens
- `src/components/` — shared layout and UI
- `src/context/` — auth, application data, theme, and toast state
- `src/supabase/` — Supabase auth, data, team, and storage helpers
- `src/utils/` — permissions, formatting, PDF, CSV, and business helpers
- `supabase/schema.sql` — bootstrap schema
- `supabase/migrations/` — ordered production migrations
- `supabase/migrations/proposed/` — unapproved proposals; do not apply automatically

## Security and operations

Frontend role checks are not a security boundary. Database access must remain protected by RLS and guarded RPCs. The production-hardening migration adds database-side audit logging and validation, private-bucket policies, and MFA checks for high-impact Founder actions. Review the migration chain and test each role in staging before production.

Before launch, configure Supabase Auth policies, backups and a restore drill, and hosting security headers/CSP. The hosting provider is not currently specified in this repository. Follow [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md); do not put credentials in issues, logs, or chat.

## Documentation

- [Project plan](PROJECT_PLAN.md) — current product scope and workflows
- [Functionality audit](FUNCTIONALITY_AUDIT.md) — checked behavior and release gaps
- [Data model](DATA_MODEL.md) — tables, roles, and database operations
- [Design system](DESIGN_SYSTEM.md) — CSS tokens and UI conventions
- [Future scope](FUTURE_SCOPE.md) — proposals not in the current build
- [Workspace rules](rules.md) — implementation and maintenance conventions
- [Operations runbook](OPERATIONS_RUNBOOK.md) — release, recovery, and access procedures

## License

Private and proprietary software for internal agency operations.
