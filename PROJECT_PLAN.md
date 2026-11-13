# ERP Mpixel Media — Project Plan

## Product purpose

An internal operations system for a social-media management and video-production agency. The app coordinates clients, freelance crew, shoots, deliverables, expenses, payments, documents, and approvals.

## Current product scope

| Area | Current functionality |
|---|---|
| Authentication | Supabase Auth; profiles map users to application roles |
| Roles | Founder (`founder`, `founder_ceo`, `founder_coo`), Admin, and Social Media Manager |
| Operations | Client, cameraman, shoot, expense, and client communication records |
| Schedule | Monthly shoot calendar with date markers, previews, day agenda, and shoot-detail links |
| Governance | Admin/Social Media Manager submissions (role- and collection-limited); Founder review, notes, resubmission, and notifications |
| Routine shoot work | Payment status and crew check-in updates through guarded database operations |
| Dashboards | Role-specific operations, approval, payment, and cashflow summaries |
| Financial tools | Receivables, crew payouts, overdue indicators, configurable grace period, CSV exports, PDF invoices and payout vouchers |
| Documents | Database-generated, persisted sequential numbers for paid invoices/vouchers; unpaid previews are drafts |
| Communication | WhatsApp drafts for shoot scheduling and payment follow-up; users must send messages themselves |
| Settings | Team invitations and role management for Admin; operational settings and option lists; Founder business/invoice profile |
| Recovery | Admin soft-delete and restore; Founder-only permanent deletion of recycled records with MFA |
| Shared UI | Responsive navigation, keyboard-accessible drawer, keyboard shortcut help, confirmations, loading/empty states, toasts, and notifications |

The app's growth chart reports paid client receipts against paid crew payouts and logged expenses as a cashflow/net-position view. It is not a profit calculation.

Horizontal trackpad gestures navigate browser history within the app. They are not calendar gestures and are suppressed for primarily vertical movement, editable controls, and horizontally scrollable content.

## Routes

The route tree is in `src/App.tsx`: `/login`, `/`, `/shoots`, `/shoots/:id`, `/schedule`, `/clients`, `/clients/:id`, `/cameramen`, `/cameramen/:id`, `/payments`, `/invoices`, `/expenses`, `/settings`, `/approvals`, and `/recycle-bin`. Social Media Manager access is limited by the app and database policy. Unknown routes redirect to `/`.

## Main workflows

### Change request and review

1. An authorized Admin or Social Media Manager submits an allowed create/edit/delete request.
2. The request is stored in `change_requests`; a pending notification is attempted separately.
3. A Founder with an AAL2 (MFA-authenticated) Supabase session approves or rejects the pending request.
4. The `review_change_request` database RPC applies an approved change, records the review result, and inserts the outcome notification in one transaction.
5. The requester can revise and resubmit an eligible request.

Pending/resubmission notification delivery is best-effort and logged if it fails; it is not part of the request write transaction.

### Shoot operations and finance

Routine payment and crew check-in updates use `update_shoot_operational`; they do not authorize changing assignment membership or payout amounts. Paid invoices and vouchers receive stable numbers from the database RPC. Retrying number assignment returns an existing number for the same document.

### Record recovery

Admins soft-delete and restore records using guarded database operations. Permanent deletion is limited to Founders with AAL2 and applies only to records already in the recycle bin. Related live records can prevent deletion.

### Scheduling messages

Founder scheduling and Founder approval of an Admin request can open prefilled WhatsApp drafts. A user must have WhatsApp available, allow pop-ups, and press Send. No message is sent automatically.

## Technology and data

- React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4
- Supabase Auth, PostgreSQL, RLS, Realtime, and Storage
- jsPDF/jsPDF-AutoTable, Vitest, and Testing Library
- Bootstrap SQL in `supabase/schema.sql`; ordered production migrations in `supabase/migrations/`

See [DATA_MODEL.md](DATA_MODEL.md) for roles, tables, RPCs, and migration notes.

## Verify changes

```bash
npm run lint
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

The latest local checks recorded on 2026-11-13 passed: TypeScript check, 26 unit tests, production build, and production dependency audit (zero reported vulnerabilities). These checks do not substitute for database integration tests or browser acceptance testing.

## Release status and known gaps

There is no hosting-provider configuration in the repository. Before production, run the complete migration chain and role-specific RLS/RPC checks in staging, review the data retention implications of audit snapshots, verify backup/restore, and configure hosting headers/CSP and Supabase Auth settings. See [FUNCTIONALITY_AUDIT.md](FUNCTIONALITY_AUDIT.md) and [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md).

## Not implemented

Monthly retainer quotas, contract-renewal alerts, an AI operational assistant, and an external sales/testimonial showcase are proposals only. See [FUTURE_SCOPE.md](FUTURE_SCOPE.md).
