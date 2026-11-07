# ERP Mpixel Media — Project Plan

## Purpose

An internal operational application for managing social media and video-production agency work: clients, freelance crew, shoots, deliverables, expenses, payments, documents, and change approvals.

## Implemented scope

The following features are present in the current source:

| Area | Implemented functionality |
|---|---|
| Authentication and roles | Supabase Auth; Admin and Founder roles; protected application routes |
| Core operations | Client, cameraman, shoot, and expense records; detail pages; shoot assignment and deliverable editors |
| Schedule and navigation | Monthly shoot calendar with date markers, hover/click event previews (client, location, and call time), day agenda, and links to shoot details; horizontal two-finger trackpad gestures navigate backward/forward through in-app history |
| Governance | Admin change requests, Founder review, review notes, resubmission, and notifications |
| Routine operations | Payment/payout status and crew check-in updates through operational actions |
| Dashboards | Admin dispatch and follow-up views; Founder approval summary, cashflow, client margin ranking, and growth chart |
| Financial tools | Payment ledger, overdue indicators, configurable grace period, PDF invoices and payout vouchers with persisted, lock-safe document numbering for paid records, CSV exports |
| Communication and files | Prefilled WhatsApp client confirmations and crew call sheets open after a shoot is scheduled (or approved for Admin submissions); the user sends each message in WhatsApp. Also includes payment reminders, client communication log, and Supabase Storage integration for file links |
| Administration | Settings and password update; soft-delete, restore, and permanent deletion for Admin |
| UI support | Responsive route layout with compact desktop icon rail and grouped full-label mobile navigation; keyboard-accessible drawer; command palette, keyboard shortcut help, loading and empty states, confirmations, and notifications |

The shared UI uses the black Liquid Glass system documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). The Founder growth chart is a cashflow/net-position view based on paid client receipts, paid crew payouts, and logged expenses; it should not be described as profit.

Trackpad navigation is a web-app history interaction, not a calendar gesture. It ignores predominantly vertical wheel movement, form controls, and elements that can scroll horizontally.

## Routes

The current route tree is defined in `src/App.tsx`: `/login`, `/`, `/shoots`, `/shoots/:id`, `/schedule`, `/clients`, `/clients/:id`, `/cameramen`, `/cameramen/:id`, `/payments`, `/invoices`, `/expenses`, `/settings`, `/approvals`, and `/recycle-bin`.

## Key workflows

### Admin change request

1. Admin proposes an addition or edit to an operational record.
2. The app creates a pending `change_requests` record and notifies the Founder.
3. Founder reviews the request and approves or rejects it, optionally including a note.
4. Admin sees the status and can revise and resubmit a rejected request.

### Routine payment and crew updates

Payment statuses and crew check-in information are operational changes, not full record edits. The database procedure restricts direct shoot updates to these allowed fields and does not permit changing assignment membership or payout details through that path.

### Record recovery

Admin soft deletion sets `deleted_at` and `deleted_by` on the record. Admin can restore it or permanently delete it from the Recycle Bin. The current model does not use a separate deleted-record snapshot table.

### Shoot scheduling messages

1. A direct Founder schedule opens prefilled WhatsApp drafts for the selected client and each assigned crew member after the shoot is saved.
2. An Admin submission does not message recipients while it is still awaiting approval. When a Founder approves a scheduled shoot request, the drafts open then.
3. WhatsApp Web or the installed WhatsApp app must be signed in, recipient phone numbers must include country codes, pop-ups must be allowed, and a user must press Send for each recipient. The app does not send messages in the background.

### Retired projects and content production

These modules are no longer part of the application. A destructive database cleanup script is available at `supabase/migrations/proposed/202611070002_remove_projects_production.sql`. Back up any data that must be retained and review the script before running it manually.


## Technology and data

- React 19, TypeScript 5.8, Vite 6, React Router 7
- Tailwind CSS 4 and the shared CSS system in `src/index.css`
- Supabase Auth, PostgreSQL, Realtime, Row Level Security, and Storage
- jsPDF/jsPDF-AutoTable; Vitest and Testing Library
- Bootstrap SQL in `supabase/schema.sql`; subsequent changes in ordered `supabase/migrations/`

## Verification and release

Run the project checks after code changes:

```bash
npm run lint
npm test
npm run build
```

The source-based status and remaining database/browser verification items are tracked in [FUNCTIONALITY_AUDIT.md](FUNCTIONALITY_AUDIT.md).

The repository contains no verified deployment configuration in this plan. A production rollout should be treated as an external release task: stage and apply database migrations first, validate RLS/RPC behavior for both roles, then deploy the matching frontend and configure Supabase Auth URLs and hosting security headers.

## Not in the current build

Monthly retainer quotas, contract-renewal alerts, an AI operational assistant, and a sales/pitch showcase are proposals only. See [FUTURE_SCOPE.md](FUTURE_SCOPE.md).
