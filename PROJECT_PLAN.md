# SMM Ops Tool — Project Plan

Internal admin tool for managing clients, freelance cameramen, and payments for the social media marketing / promo video business.

## Problem

Currently tracked manually (spreadsheet-style). Need a real-time, login-gated tool for the two account holders to manage clients, freelance camera crew assignments, and payments (both directions) from phone or laptop.

## Roles

Two accounts, two different permission levels — not a flat "founders only" model:

- **Admin** (the operator, first employee) — handles day-to-day data entry: adding/editing clients, cameramen, shoots, expenses. These submissions go into a pending queue rather than applying immediately. Exclusively controls deletion — soft-delete, restore, and permanent hard-delete are all admin actions that apply immediately, with no approval step.
- **Founder** — highest authority. Reviews and approves or rejects everything the admin submits; this approval is the founder's core role in the app. Founder's own edits, if made directly, apply immediately with no queue. Cannot delete, restore, or hard-delete — that stays with admin regardless of seniority.

In short: **admin handles the data, founder approves it. Deletion is entirely admin's call and needs no sign-off.**

## Scope

- Email + password login, restricted to exactly two accounts (admin + founder), no public sign-up
- Password reset — a "Forgot password" link on Login triggers Firebase Auth's built-in reset-email flow; no custom reset UI/backend needed
- Client management (contact, notes, status)
- Freelance cameramen — added as hired per job (not a fixed roster), with contact + rate
- Shoots — the core work unit, linking a client to one or more cameramen
- Cameraman scheduling — blackout/unavailable dates per cameraman, a call time per shoot (with per-person overrides), and marking crew checked-in on shoot day
- Cameraman rate assignment — assigning a cameraman to a shoot and setting their payout for it are separate steps: cameramen are added at shoot-scheduling time with no rate, and the rate is entered afterward on the Cameraman page, where it shows up automatically as a "Pending Rate" item
- Payments tracked on both sides: client → business (incoming), business → cameramen (outgoing)
- Invoice generation — a simple invoice/receipt document for a shoot once client payment or cameraman payout is marked paid
- Real-time sync — both founders see live updates, like a shared spreadsheet
- Search & filter — across clients, cameramen, and shoots (essential once data volume grows)
- Overdue highlighting — payments pending past a set number of days are visually flagged, not just a paid/unpaid toggle
- Client ledger — total billed/paid per client over time
- Cameraman ledger — total paid per freelancer over time
- Export to CSV — pull any list (clients, shoots, payments) out as a spreadsheet
- Expense tracking — costs beyond cameraman payouts (travel, equipment, editing software, etc.)
- Contracts/agreements storage — attach or record the agreed terms per client and per cameraman
- Deliverables tracking — what was actually shot/delivered per shoot (content type, count, link to files), separate from the payment side
- Communication log — running log of client interactions per client, not just a static notes field
- Admin-configurable options — every dropdown/enum in the app (client status, shoot status, deliverable types, expense categories, etc.) is editable in-app, not hardcoded — add, rename, reorder, or retire options without a code change
- Recycle bin — deleting a client, cameraman, shoot, or expense soft-deletes it (admin-only action, no approval needed); restore or permanent hard-delete both live in a Recycle Bin screen, also admin-only
- Change approval queue — the admin's day-to-day data entry (adds/edits) sits as "pending" until the founder approves it; founder's own edits (if any) apply immediately with no approval step. **Exception:** marking a payment paid and marking a cameraman checked-in are immediate, direct actions for either role (behind a confirm dialog, not an approval queue) since they're routine operational updates, not new data entry
- Notifications — a bell icon with unread count tells the founder what's waiting for review, and tells the admin when something they submitted was approved or rejected
- Client shoot confirmation — once a shoot is approved/created, the client gets an automated confirmation email (date, time, location); a "Send WhatsApp Reminder" button opens WhatsApp pre-filled with the same details for a one-tap manual send (no paid API, no template approval needed)
- Dashboard growth chart — revenue-over-time line chart with a 1M/6M/1Y/All range switcher, tracking when payments actually landed (not shoot date), similar to a stock price chart

## Non-Goals (for this version)

- Offline mode — not needed, always-online usage assumed
- Cameramen logins — freelancers don't get accounts
- Public booking — will live on a separate official website, built later
- Online payment processing (no payment gateway — invoices are records, not payment collection)
- Calendar view, GST/tax fields, cameraman ratings, activity log — good future additions, not essential for v1

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (web app) | Works in any browser, phone or laptop, no install needed |
| Backend / Database | Firebase Firestore | Real-time sync out of the box — matches the "live spreadsheet" feel |
| Auth | Firebase Authentication (email + password) | Simple, secure, only manually-created accounts can log in |
| Hosting | Firebase Hosting (or Vercel) | Free tier is enough for 2 users |
| Invoice generation | Client-side PDF library (e.g. jsPDF or react-pdf) | Generate invoice PDFs in-browser, no separate backend service needed |

No offline storage layer needed since offline mode was dropped. No native app — browser-based covers phone + laptop use without app-store overhead.

## Data Model

See `DATA_MODEL.md` for the full, current schema — collections, fields,
roles, the approval workflow, recycle bin, invoice numbering, and payment
locking are all specced there and kept as the single source of truth.
This file intentionally does not duplicate it, to avoid two schemas
drifting out of sync.
## Screens

1. **Login** — email + password, with a "Forgot password?" link that sends a Firebase Auth reset email
2. **Dashboard** — leads with a role-aware "Needs Your Attention" feed (overdue payments, pending approvals/resubmissions, pending cameraman rates, ranked by urgency, not scattered sections); upcoming/today's shoots; a revenue growth chart with 1M/6M/1Y/All range switcher
3. **Clients** — list (searchable/filterable), add, edit; each client has a ledger view (billed/paid over time), a contract link field, and a communication log. Add/edit requires name, phone, and email (email is what the automated shoot confirmation goes to)
4. **Cameramen** — list (searchable/filterable), add, edit; each cameraman has a ledger view (total paid over time), a contract link field, an unavailability/blackout-date editor, and a **Pending Rate** section listing shoots they're assigned to where a payout amount hasn't been set yet
5. **Shoots** — main workspace: list of jobs (searchable/filterable); add new shoot (pick client, date, call time, location, add one or more cameramen — no rate entered here, that's set later per-cameraman on the Cameramen page, log deliverables); once created, an automated confirmation email goes to the client and a "Send WhatsApp Reminder" button is available; mark client paid / mark each cameraman paid (disabled until that cameraman's rate is set); once marked paid, generate/download invoice (client-side or cameraman-side)
6. **Payments view** — filtered view of everything with pending money on either side, overdue ones flagged, so nothing gets missed
7. **Invoices** — list of all generated invoices (client + cameraman), searchable by shoot/date/name, re-downloadable anytime
8. **Expenses** — log and list of business costs outside client/cameraman payments, optionally linked to a shoot
9. **Settings** — panel where every configurable list (client status, shoot status, deliverable types, expense categories) can be managed: add, rename, reorder, or archive an option; archived options stay on old records but drop out of pickers for new entries
10. **Recycle Bin** — admin-only screen listing soft-deleted clients, cameramen, shoots, and expenses; Restore and Delete Permanently actions (both admin-only, no approval needed); founder can view this list read-only
11. **Pending Approvals** — lists data-entry submitted by the admin; founder reviews and Approves or Rejects each one; rejected items stay visible to admin with an Edit & Resubmit action that reopens the form pre-filled with the previous submission

**Notifications:** a bell icon in the header (present on every screen) shows a live unread count. Submitting or resubmitting a change notifies the founder ("this and that need review"); approving or rejecting notifies the admin back. Clicking a notification jumps straight to the relevant item in Pending Approvals and marks it read.

Every list screen (Clients, Cameramen, Shoots, Expenses) supports export to CSV.

## Open Items for Later

- Public booking site — separate future project, not part of this build
- Automated invoicing/payments — not in scope yet

## Future Roadmap: Crew Portal (Phase 2, not v1)

Not part of this build — considered as a future idea, deliberately not
specced here. If/when this becomes real, revisit in a fresh discussion
rather than building off outdated assumptions.

## All Tasks This Tool Handles

**Client management**
- Add/edit client records with contact info and status
- Log every client conversation/agreement as a running communication history
- Store or link the contract/agreed terms per client
- See total billed and paid per client over time (client ledger)

**Crew management**
- Add freelance cameramen as they're hired, with contact and rate
- Store or link agreed terms per cameraman
- See total paid per cameraman over time (cameraman ledger)
- Track blackout/unavailable dates per cameraman, and mark crew checked-in on shoot day
- Set a cameraman's payout per shoot from their own page, in a "Pending Rate" list — separate step from being added to the shoot

**Shoot / job management**
- Create a shoot record: client, date, call time, location
- Assign any number of cameramen to a shoot (no rate set at this point) — each gets an optional call-time override
- Record what was actually delivered per shoot (content type, count, file link)

**Client communication**
- Automated confirmation email to the client once a shoot is created
- One-tap WhatsApp reminder (pre-filled message, manual send, no API)

**Money — incoming**
- Track amount billed to client per shoot
- Mark client payments as paid/pending, behind a confirm dialog — once marked, it locks and applies immediately, no approval wait
- Auto-flag overdue client payments
- Generate a client invoice once paid, with a real sequential invoice number

**Money — outgoing**
- Track payout owed to each cameraman per shoot
- Mark cameraman payments as paid/pending, same confirm-and-lock behavior as client payments
- Auto-flag overdue payouts
- Generate a payout invoice/receipt per cameraman, with a real sequential voucher number
- Log other business expenses (travel, equipment, software) not tied to client or cameraman payments

**Oversight**
- Dashboard summary of upcoming work, pending money (in, out, and expenses), and a revenue growth chart (1M/6M/1Y/All)
- Search and filter across every list
- Export any list to CSV for spreadsheet-style analysis outside the app
- Full invoice archive, searchable

**Approval & data integrity**
- Admin's day-to-day data entry queues for founder approval; rejected items can be edited and resubmitted
- Notifications tell each person what's waiting on them
- Deleting anything soft-deletes it to a Recycle Bin first; restore or permanent delete are admin-only

**Admin / configuration**
- Manage every dropdown/enum in the app (client status, shoot status, deliverable types, expense categories) from one Settings screen
- Add, rename, reorder, or archive options without touching code
- Archived options remain visible on historical records but are hidden from pickers for new entries

## Folder Structure

```
smm-ops-tool/
├── public/
│   └── index.html
├── src/
│   ├── main.jsx                    # app entry point
│   ├── App.jsx                     # root component, routing
│   ├── firebase/
│   │   ├── config.js                # Firebase project config/init
│   │   ├── auth.js                  # login/logout helpers
│   │   └── firestore.js             # Firestore read/write helpers
│   ├── routes/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Clients.jsx
│   │   ├── ClientDetail.jsx         # profile + ledger + communication log
│   │   ├── Cameramen.jsx
│   │   ├── CameramanDetail.jsx      # profile + ledger
│   │   ├── Shoots.jsx
│   │   ├── ShootDetail.jsx          # assignments, deliverables, payments
│   │   ├── Payments.jsx             # pending/overdue across everything
│   │   ├── Invoices.jsx
│   │   ├── Expenses.jsx
│   │   ├── Settings.jsx             # admin panel for all configurable lists
│   │   ├── RecycleBin.jsx           # admin-only actions; founder read-only
│   │   └── PendingApprovals.jsx     # both roles can approve/reject
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   └── ProtectedRoute.jsx   # blocks access unless logged in
│   │   ├── dashboard/
│   │   │   ├── GrowthChart.jsx      # revenue-over-time line chart, 1M/6M/1Y/All range picker — see DATA_MODEL.md "Dashboard growth chart"
│   │   │   └── AttentionFeed.jsx    # merged, ranked "Needs Your Attention" list — see DATA_MODEL.md "Dashboard Needs Your Attention feed"
│   │   ├── clients/
│   │   │   ├── ClientForm.jsx
│   │   │   ├── ClientList.jsx
│   │   │   └── CommunicationLog.jsx
│   │   ├── cameramen/
│   │   │   ├── CameramanForm.jsx
│   │   │   ├── CameramanList.jsx
│   │   │   ├── UnavailabilityEditor.jsx # blackout-date list, checked (soft warning, not hard block) when assigning to a shoot
│   │   │   └── PendingRateList.jsx  # shoots this cameraman is on where amount is still null; entering a rate here submits a changeRequest, not a direct write
│   │   ├── shoots/
│   │   │   ├── ShootForm.jsx
│   │   │   ├── ShootList.jsx
│   │   │   ├── AssignmentEditor.jsx # picks cameramen for a shoot — no rate field here, that's set later on the Cameraman page
│   │   │   ├── DeliverablesEditor.jsx
│   │   │   └── WhatsAppReminderButton.jsx # builds the wa.me link, opens it, no API
│   │   ├── payments/
│   │   │   ├── PaymentStatusToggle.jsx  # wraps ConfirmDialog before marking paid; renders as locked/read-only once paid
│   │   │   └── OverdueBadge.jsx
│   │   ├── invoices/
│   │   │   ├── InvoiceGenerator.jsx # builds the PDF
│   │   │   └── InvoiceList.jsx
│   │   ├── expenses/
│   │   │   ├── ExpenseForm.jsx
│   │   │   └── ExpenseList.jsx
│   │   ├── settings/
│   │   │   ├── SettingsListEditor.jsx # generic add/rename/reorder/archive editor, reused for every configurable list
│   │   │   └── SettingsList.jsx       # overview of all configurable lists, links into each editor
│   │   ├── changeRequests/
│   │   │   ├── PendingApprovalCard.jsx # shows proposed data + Approve/Reject buttons
│   │   │   └── ApprovalActions.jsx     # shared approve/reject handlers, used by PendingApprovals screen and any inline "pending" badges elsewhere
│   │   ├── notifications/
│   │   │   ├── NotificationBell.jsx    # header icon + live unread count
│   │   │   └── NotificationDropdown.jsx
│   │   ├── recycleBin/
│   │   │   ├── RecycleBinList.jsx
│   │   │   └── RestoreButton.jsx
│   │   └── common/
│   │       ├── SearchBar.jsx
│   │       ├── FilterDropdown.jsx     # reads options live from settings, not hardcoded
│   │       ├── ExportCsvButton.jsx
│   │       ├── LedgerSummary.jsx     # reusable for client + cameraman ledgers
│   │       ├── Modal.jsx             # slide-over panel shell, used by ClientForm/CameramanForm/ShootForm/ExpenseForm — every "Add X" / "Schedule Shoot" button must open its form through THIS component, never a blank/unwired panel
│   │       ├── ConfirmDialog.jsx     # reusable Yes/No confirmation, used for irreversible actions: Mark Paid, Approve/Reject, Delete, Restore
│   │       ├── CommandPalette.jsx    # Cmd/Ctrl+K global search + quick actions
│   │       ├── Toast.jsx             # action feedback, replaces static banners/silent saves
│   │       └── SkeletonLoader.jsx    # content-shaped loading placeholder, used instead of spinners
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useClients.js
│   │   ├── useCameramen.js
│   │   ├── useShoots.js
│   │   ├── useExpenses.js
│   │   ├── useSettings.js            # live-loads configurable option lists by key, e.g. useSettings('shootStatus')
│   │   ├── useChangeRequests.js      # pending/approved/rejected requests, role-aware
│   │   ├── useNotifications.js       # unread count + list for the signed-in user
│   │   ├── useKeyboardShortcuts.js   # global listener for /, N, Esc, Cmd/Ctrl+K
│   │   └── useRealtimeSync.js        # generic Firestore live-listener hook
│   ├── utils/
│   │   ├── csvExport.js
│   │   ├── whatsappLink.js           # builds the wa.me?text= URL for the reminder button
│   │   ├── invoicePdf.js             # jsPDF/react-pdf invoice template logic
│   │   ├── overdueCheck.js           # date-diff logic for overdue flagging
│   │   └── formatCurrency.js
│   └── styles/
│       └── (global styles / Tailwind config, if used)
├── functions/                         # Cloud Functions — the only server-side code in this project
│   ├── index.js                       # exports all functions below
│   ├── generateInvoiceNumber.js       # callable; transaction against counters/{year}, see DATA_MODEL.md "Invoice numbering rules"
│   ├── sendShootConfirmation.js       # onCreate trigger on shoots/{id}; writes to `mail` collection for the Trigger Email extension
│   ├── sendChangeRequestNotification.js # onCreate/onUpdate trigger on changeRequests/{id}; writes `notifications` docs
│   └── package.json                   # separate dependency tree from the frontend
├── .env.local                        # Firebase keys (not committed)
├── firebase.json                     # Firebase Hosting/Firestore rules config
├── firestore.rules                   # security rules — restrict to the admin + founder UIDs
├── package.json
└── README.md
```

**Notes for the build:**
- `firestore.rules` is where access control actually gets enforced — restrict all read/write to the two account UIDs (admin + founder), not just the login screen.
- `useRealtimeSync.js` is the core pattern reused across Clients/Cameramen/Shoots — one Firestore `onSnapshot` listener hook, not duplicated per screen.
- Detail pages (`ClientDetail`, `CameramanDetail`, `ShootDetail`) hold the ledger, communication log, deliverables, and invoice-generation UI — the list pages stay simple.
- No dropdown/enum value is hardcoded in a component. Every status, category, or type picker (`FilterDropdown`, `ClientForm` status field, `ShootForm` status field, `DeliverablesEditor` type field, `ExpenseForm` category field) reads its options live from `settings` via `useSettings`, so editing a list in the Settings screen updates every picker across the app immediately, with no redeploy.
- `SettingsListEditor.jsx` is a single generic component parameterized by `settings` key — built once, reused for every configurable list, so adding a brand-new list later (e.g. a "referral source" list) means adding a `settings` document, not new UI code.
- Archiving an option (rather than deleting it) preserves referential integrity: old records that used the value still render correctly, they just can't be picked again.
- Every "Add Client" / "Add Cameraman" / "Schedule Shoot" / "Log Expense" button must open its form via `Modal.jsx` and actually render the corresponding `*Form.jsx` component — a button that opens an empty panel (no form fields) is a wiring bug, not acceptable, and should be caught in review before calling a screen done.
- "Mark Client Paid" and "Mark Cameraman Paid" are irreversible-feeling actions, not simple toggles: clicking them opens `ConfirmDialog.jsx` ("Mark this as paid? This locks the amount from further edits.") before anything is written. Once confirmed, the amount and paid state render as a locked, non-editable summary (e.g. "✓ Paid on 14 Aug 2026") instead of an editable toggle/input — see `DATA_MODEL.md` → "Payment confirmation & locking" for exactly how reversal works if a correction is genuinely needed.
- `functions/` is the ONLY place server-side code lives — three Cloud Functions total (invoice numbering, shoot-confirmation email, change-request notifications), each detailed in `DATA_MODEL.md`. Nothing else in this app should need a backend function; if a task seems to need one beyond these three, stop and check `DATA_MODEL.md`/`.agent/rules.md` before adding one.
- This file's "Data Model" section is intentionally just a pointer — `DATA_MODEL.md` is the only place field/collection definitions live. Never re-describe schema here; edit `DATA_MODEL.md` instead, so there's exactly one source of truth.

## IP / Patent Note

Business-process / internal-tooling software like this is generally hard to patent unless there's a genuinely novel technical mechanism involved — worth a conversation with an actual patent attorney before treating that as a project goal. Doesn't block building the tool either way.