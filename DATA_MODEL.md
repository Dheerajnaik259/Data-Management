# SMM Ops Tool — Data Model (source of truth)

Do not invent, rename, or guess field names. If a field you need isn't listed
here, stop and ask rather than adding one silently. Firestore collection and
field names below are exact and case-sensitive.

## Roles

There are two account roles, stored on each `users` document:

| Role | Who | Permissions |
|---|---|---|
| `admin` | You (the operator, first employee) | Enters and edits all day-to-day data (clients, cameramen, shoots, expenses) — these submissions go into a pending queue for the founder to approve. Exclusively controls deletion: soft-delete, restore, and permanent hard-delete are admin-only and apply immediately, with no approval step. |
| `founder` | Your friend — highest authority | Full read access to everything, including the recycle bin. Reviews and approves/rejects everything the admin submits — this is the founder's core role. Founder's own edits (if made) apply directly with no approval needed, since founder is the final authority. Founder cannot delete, restore, or hard-delete — that stays with admin regardless of founder's seniority. |

Summary of the day-to-day flow: **you handle the data, founder approves it.
Deletion is entirely yours and doesn't need anyone's sign-off.**

**v1 scope note:** only these two roles exist for now. Once the company is
fully established, more roles (e.g. a second operations hire, a
view-only accountant) may be added. Treat `role` as an open string field,
not a hardcoded two-value enum — don't write logic like `role === 'admin'
? X : Y` in a way that breaks if a third role appears. Prefer permission
checks like `canApprove(role)` / `canDelete(role)` that read from a small
role-permissions map, so adding a role later is a config change, not a
rewrite. This is a forward-looking note, not a v1 feature — do not build
a role-management UI or a third role now, just don't paint the code into
a corner.

## Soft delete / Recycle Bin

Applies to: `clients`, `cameramen`, `shoots`, `expenses`.

| Field | Type | Notes |
|---|---|---|
| deletedAt | timestamp \| null | null = active record. Set = soft-deleted, shown in Recycle Bin. |
| deletedBy | reference \| null | the admin user who deleted it (only admin can set this) |

Rules:
- "Delete" in the UI never removes a document directly — it sets `deletedAt`
  (and `deletedBy`). Only `admin` role can perform this action.
- Soft-deleted records are excluded from all normal lists, search, totals,
  and ledgers.
- **Recycle Bin** screen lists soft-deleted records across all four
  collections, with two actions, both admin-only:
  - **Restore** — sets `deletedAt` and `deletedBy` back to `null`.
  - **Delete Permanently** — actually removes the Firestore document. This
    is the only true hard-delete path in the app.
- Auto-purge: records with `deletedAt` older than 30 days may be permanently
  removed automatically (implement as a scheduled Cloud Function if/when
  built; not required for v1, safe to defer).
- The `founder` role has read-only visibility into the Recycle Bin (can see
  what's been deleted, cannot restore or hard-delete).

## Change approval workflow

New collection: `changeRequests`

| Field | Type | Notes |
|---|---|---|
| targetCollection | string | e.g. `clients`, `shoots`, `cameramen`, `expenses` |
| targetDocId | reference \| null | null if this request is a "create new" |
| action | string (enum) | `create`, `edit` — never `delete` (deletion is admin-only, not part of this flow) |
| proposedData | object | the fields being added/changed |
| requestedBy | reference | the `admin` user who submitted it |
| requestedAt | timestamp | |
| status | string (enum) | `pending`, `approved`, `rejected` |
| reviewedBy | reference \| null | the `founder` who approved/rejected |
| reviewedAt | timestamp \| null | |
| reviewNote | string | optional, founder's reason if rejected |
| revisionCount | number | starts at 0, increments each time admin edits and resubmits |

Rules:
- When `admin` adds or edits a client, cameraman, shoot, or expense, write a
  `changeRequests` doc instead of writing directly to the target collection.
  This is the normal, everyday path for data entry.
- Deletion never goes through this queue — soft-delete, restore, and
  hard-delete are all direct `admin` actions with no approval step. See the
  Soft delete / Recycle Bin section above.
- The UI should clearly show admin-submitted items as "Pending approval"
  wherever they'd otherwise appear (e.g. a greyed-out row or a badge), so
  it's clear the record isn't live yet.
- `founder` sees a **Pending Approvals** screen listing all `status:
  pending` requests, with Approve / Reject actions.
- On Approve: apply `proposedData` to the target document (create or update
  it), set `status: approved`, `reviewedBy`, `reviewedAt`.
- On Reject: leave the target document untouched, set `status: rejected`,
  `reviewedBy`, `reviewedAt`, optional `reviewNote`. The request stays
  visible to `admin` as rejected — it is NOT deleted.
- **Edit & resubmit:** if a request is `pending` or `rejected`, `admin` can
  edit `proposedData` and resubmit it. Resubmitting always resets `status`
  to `pending` and clears `reviewedBy`/`reviewedAt`/`reviewNote`, and
  increments `revisionCount`. Admin can never set `status` to `approved`
  directly — that transition is founder-only, always.
- Rejected requests should show an **Edit & Resubmit** action in the admin's
  view (e.g. on the Shoots/Clients/etc. list, or in the Pending Approvals
  screen filtered to "Rejected"), pre-filling the form with the previous
  `proposedData` so admin isn't starting from scratch.
- `founder`'s own adds/edits (if the founder ever makes one directly) bypass
  this flow entirely and write directly — the queue only exists to give the
  founder final say over the admin's data entry.
- **Nothing moves until approved.** A still-pending `clients` or
  `cameramen` create request is NOT selectable when creating a new shoot —
  it must not appear in the client/cameraman picker on the Shoot form until
  the founder approves it. If you need to schedule a shoot for a brand-new
  client today, submit the client first; the shoot itself has to wait for
  that approval before it can reference them. Don't build a workaround
  (e.g. referencing a pending client by a temporary ID) — this is
  intentional friction, not a bug to route around.

## Collection: `notifications`
One document per notification, targeted at a single user. Powers the bell
icon / unread badge in the header.

| Field | Type | Notes |
|---|---|---|
| recipientId | reference | the `users` doc this notification is for |
| type | string (enum) | `pending_approval`, `approved`, `rejected`, `resubmitted` |
| relatedChangeRequestId | reference | → `changeRequests` |
| message | string | short human-readable text, e.g. "New client submission needs review" |
| read | boolean | default `false` |
| createdAt | timestamp | |

Rules:
- When `admin` creates or resubmits a `changeRequests` doc, also create a
  `notifications` doc with `recipientId` = founder's uid, `type:
  pending_approval`, referencing that request. This is what tells the
  founder "this and that need to be reviewed."
- When `founder` approves or rejects a request, also create a
  `notifications` doc with `recipientId` = admin's uid, `type: approved` or
  `rejected`, so admin knows the outcome without having to check manually.
- Header bell icon shows a live unread count (`read == false` for the
  signed-in user's `recipientId`) via a realtime listener, same pattern as
  `useRealtimeSync`.
- Clicking a notification marks it `read: true` and navigates to the
  relevant item (e.g. the specific pending request in **Pending
  Approvals**).
- Provide a "Mark all as read" action in the notification dropdown.
- Preferred implementation: generate these via a Cloud Function trigger on
  `changeRequests` writes, so a notification is created reliably even if
  the acting user's client has a bug or drops connection mid-write. If
  Cloud Functions aren't set up yet, writing the notification doc directly
  alongside the `changeRequests` write from the client is an acceptable
  stopgap for v1 — just keep both writes in the same client action so they
  don't drift out of sync.
- **Deliberately scoped to the approval queue only.** Marking a payment
  paid, marking a cameraman checked-in, or any other instant/direct action
  (see "Payment confirmation & locking") does NOT create a notification —
  that's on purpose, not a gap. The entire point of those actions being
  instant is that they don't need ceremony; the result is already visible
  immediately in the UI (the locked "✓ Paid" summary) without a separate
  alert. Notifications exist specifically to solve "something is waiting
  on you and you might not know it" — which only applies to the approval
  queue, not to actions that already took effect.

## Collection: `settings`
One document per configurable option list. Referenced by every enum field
below — never hardcode dropdown option values in components.

| Field | Type | Notes |
|---|---|---|
| key | string | e.g. `clientStatus`, `shootStatus`, `deliverableTypes`, `expenseCategories` |
| label | string | display name in Settings UI |
| options | array<object> | see below |
| editable | boolean | default true |

`options[]` item:
| Field | Type | Notes |
|---|---|---|
| value | string | stored value referenced by records |
| order | number | display order |
| archived | boolean | soft-delete; hidden from new-entry pickers, kept for old records |

Seeded defaults (editable in-app, not fixed in code):
- `clientStatus`: `active`, `inactive`
- `shootStatus`: `scheduled`, `done`
- `deliverableTypes`: `reel`, `story`, `photo set`
- `expenseCategories`: `travel`, `equipment`, `software`, `other`

## Collection: `clients`
| Field | Type | Notes |
|---|---|---|
| name | string | |
| phone | string | required — this is what the WhatsApp one-tap link is built from |
| email | string | required — this is what the automated shoot-scheduled email is sent to |
| notes | string | optional |
| status | string (enum) | value from `settings.clientStatus` |
| contractLink | string | optional |
| createdAt | timestamp | |
| deletedAt | timestamp \| null | soft-delete, see Recycle Bin section |
| deletedBy | reference \| null | |

### Sub-collection: `clients/{clientId}/communicationLog`
| Field | Type | Notes |
|---|---|---|
| clientId | reference | |
| date | timestamp | |
| note | string | |
| loggedBy | reference | which user (admin or founder) logged it |

## Collection: `cameramen`
| Field | Type | Notes |
|---|---|---|
| name | string | |
| phone | string | |
| email | string | optional, contact info |
| rate | number | default rate, editable per shoot |
| notes | string | optional |
| contractLink | string | optional |
| unavailability | array<object> | blackout dates this person isn't available, see below |
| createdAt | timestamp | |
| deletedAt | timestamp \| null | soft-delete, see Recycle Bin section |
| deletedBy | reference \| null | |

`unavailability[]` item:
| Field | Type | Notes |
|---|---|---|
| date | date | a single unavailable day |
| reason | string | optional, e.g. "another booking," "personal" |

## Collection: `shoots`
| Field | Type | Notes |
|---|---|---|
| clientId | reference | → `clients` |
| date | date | |
| callTime | string | optional, general shoot start/call time, e.g. `"09:00 AM"` — a simple display string, not a full timestamp, since it's just for coordination, not calculations |
| location | string | |
| status | string (enum) | value from `settings.shootStatus` |
| clientAmount | number | amount billed to client for this shoot, in ₹ |
| clientPaid | boolean | |
| clientPaidAt | timestamp \| null | set when `clientPaid` becomes true; cleared if unmarked. Powers the "✓ Paid on [date]" locked summary AND the dashboard growth chart — without this, there's no way to know WHEN revenue actually came in, only whether |
| clientInvoiceNumber | string \| null | assigned the first time the client invoice is generated (see Invoice Numbering below); `null` until then |
| assignments | array<object> | one entry per cameraman on this shoot |
| assignedCameramanIds | array<reference> | flat list mirroring `assignments[].cameramanId`, kept in sync on every write to `assignments`. Exists purely so the Cameraman page can efficiently query "which shoots is this person on" via `array-contains` — Firestore can't query cheaply into an array of objects, only a flat array of IDs |
| deliverables | array<object> | see below |
| deletedAt | timestamp \| null | soft-delete, see Recycle Bin section |
| deletedBy | reference \| null | |

`assignments[]` item:
| Field | Type | Notes |
|---|---|---|
| cameramanId | reference | → `cameramen` |
| amount | number \| null | payout for this person on this shoot; `null` when first assigned — the rate is entered separately, later, on the Cameraman page (see "Cameraman rate assignment flow" below), not at shoot-scheduling time |
| paid | boolean | must stay `false` while `amount` is `null` — see rules below |
| paidAt | timestamp \| null | set when `paid` becomes true; cleared if unmarked — same purpose as `shoots.clientPaidAt` |
| payoutVoucherNumber | string \| null | assigned the first time this person's payout voucher is generated; `null` until then |
| callTime | string \| null | optional per-person override of the shoot's general `callTime` — e.g. one person called earlier for setup |
| checkedInAt | timestamp \| null | when this person's arrival was marked — set manually by admin on the day; `null` until marked |

`deliverables[]` item:
| Field | Type | Notes |
|---|---|---|
| type | string (enum) | value from `settings.deliverableTypes` |
| count | number | |
| fileLink | string | |

## Cameraman rate assignment flow

Scheduling a shoot and setting a cameraman's payout for it are two
separate steps, not one — the rate often isn't settled yet when the shoot
is booked.

- **At shoot creation:** admin picks which cameraman(s) are on the shoot
  (checked against `cameramen.unavailability` as a soft warning, not a
  hard block). Each new `assignments[]` entry is created with `amount:
  null`. This whole thing — client, date, cameramen picked, deliverables —
  goes through `changeRequests` for founder approval as usual, same as any
  other shoot creation.
- **Automatically visible on the Cameraman page:** because
  `assignedCameramanIds` is kept in sync with `assignments[].cameramanId`,
  `CameramanDetail` can query `shoots` where `assignedCameramanIds
  array-contains {cameramanId}` in real time — a newly assigned shoot
  shows up there immediately, no manual refresh or separate step needed.
- **A "Pending Rate" section on CameramanDetail** lists that person's
  assignments where `amount == null` (filtered client-side after the
  query above, since Firestore can't filter on a field inside an array of
  objects). Admin enters the rate there — pre-filled with `cameramen.rate`
  as a starting suggestion, but editable per shoot.
- **Setting the rate is still a `changeRequests` edit, not a direct
  write** — even though `firestore.rules` technically permits admin to
  write the whole `assignments` array directly (that carve-out exists for
  toggling `paid`/`checkedInAt` on an already-agreed amount, not for
  introducing a new payout figure). The UI must always route "set rate"
  through a changeRequest for founder approval, since determining a new
  payout amount is data entry, not confirming an already-known fact —
  treat the direct-write door as existing for a different purpose, not an
  invitation to skip approval here.
- **A cameraman's assignment cannot be marked paid while `amount` is
  `null`** — disable the "Mark Cameraman Paid" action until a rate exists.
  There's nothing to confirm as paid if the amount was never set.

**Invoices are not a stored collection.** They are rendered on-demand from a
shoot's existing data (client/cameraman info + amount + paid date) once
`clientPaid` or an assignment's `paid` is true. Downloadable/printable as PDF.
The invoice/voucher NUMBER, however, must be stable — see Invoice Numbering.

## Collection: `counters`
Powers sequential, gap-free invoice/voucher numbers even with two people
using the app at once. One document per year, created lazily the first time
it's needed.

Document ID pattern: `invoices_{YYYY}` (e.g. `invoices_2026`)

| Field | Type | Notes |
|---|---|---|
| clientInvoiceNext | number | next sequence number to assign for a client invoice this year, starts at 1 |
| payoutVoucherNext | number | next sequence number to assign for a payout voucher this year, starts at 1 |

**Invoice numbering rules:**
- Client invoice format: `INV-{YYYY}-{clientInvoiceNext, zero-padded to 4
  digits}` — e.g. `INV-2026-0001`.
- Payout voucher format: `RCP-{YYYY}-{payoutVoucherNext, zero-padded to 4
  digits}` — e.g. `RCP-2026-0001`.
- Implement number generation as a **Cloud Function** (callable, triggered
  by the "Generate Invoice"/"Generate Voucher" button), not a direct client
  write. The function reads `counters/invoices_{YYYY}` inside a Firestore
  transaction (creating it with both fields at 1 if missing), assigns the
  current value, increments it, and writes the result to
  `shoots.clientInvoiceNumber` or the matching
  `assignments[].payoutVoucherNumber` — all atomically, using the Admin
  SDK, which is why `firestore.rules` denies direct client writes to
  `counters`. This is the one place in the app where a small backend
  function is the right call, unlike everything else which is a direct
  client-to-Firestore write.
- Once generated, the number is never regenerated — re-downloading or
  re-printing later reuses the stored number.
- The year in the number is the year the invoice was FIRST generated, not
  the shoot date — a shoot from December that's invoiced in January uses
  the new year's counter.

## Client shoot notifications

When a shoot is actually created (i.e. once the founder approves it — a
still-pending shoot never triggers this, matching the "nothing moves until
approved" rule), the client should be told their shoot is scheduled, by
email automatically and by WhatsApp with a one-tap send.

**Email — fully automated:**
- Add `shoots.clientNotifiedAt: timestamp | null` — set once the
  confirmation email has been sent; `null` until then. Purely for
  debugging/audit ("did this actually send"), not shown prominently in the
  UI.
- Implement via a Firestore-triggered Cloud Function (`onCreate` on
  `shoots/{shootId}`) that writes a document to a `mail` collection in the
  shape expected by Firebase's **Trigger Email** extension (SMTP-based —
  works with a Gmail account or any SMTP provider, no separate email
  service to build). The extension handles the actual sending; the
  function's only job is composing the message and writing that one
  document, then setting `clientNotifiedAt`.
- Email content: client name, shoot date, `callTime` (if set), and
  `location` — a short, plain confirmation, not a full invoice.
- If `clients.email` is missing for some reason, skip sending and log it
  rather than throwing — don't let a missing email block shoot creation
  itself (email is required at Add Client time per the field definition
  above, so this should be rare, but shouldn't be a hard failure point).

**WhatsApp — one-tap send, not automated:**
- No Cloud Function, no API, no cost. A "Send WhatsApp Reminder" button on
  the Shoot Detail screen builds a link in the form
  `https://wa.me/{clients.phone}?text={url-encoded prefilled message}` and
  opens it — this opens WhatsApp (app or web) with the message already
  typed into the chat with that client; admin or founder still taps Send
  themselves.
- Message content mirrors the email: shoot date, call time, location.
- This can be tapped any number of times (e.g. resend as a day-before
  reminder) — no state needs to be tracked for it, unlike the email.

## Collection: `expenses`
| Field | Type | Notes |
|---|---|---|
| description | string | |
| amount | number | |
| date | date | |
| shootId | reference | optional, → `shoots` |
| category | string (enum) | value from `settings.expenseCategories` |
| createdAt | timestamp | |
| deletedAt | timestamp \| null | soft-delete, see Recycle Bin section |
| deletedBy | reference \| null | |

Expenses are NOT tied to client or cameraman payments — separate ledger.

## Collection: `users`
Exactly 2 documents, created manually in the Firebase console. No in-app
signup screen. Do not build a signup flow.

| Field | Type | Notes |
|---|---|---|
| role | string (enum) | `admin` or `founder` — see Roles section above |
| name | string | display name |
| email | string | matches Firebase Auth account |

## Payment confirmation & locking

Marking a client or cameraman payment as paid — and marking a cameraman
checked-in on shoot day — is treated as a deliberate, confirmed action, not
a casual toggle, but it is NOT gated behind founder approval. This is an
intentional exception to the general rule that admin's edits queue for
review: these are routine operational updates, often the founder directly
telling admin "that payment cleared" or the admin confirming crew arrived
on set — requiring a changeRequest here would just be the founder
approving their own report back to themselves. Both `admin` and `founder`
can do these directly, immediately, same as deletion already works.

- No new fields are needed for this beyond `clientPaidAt`/`assignments[].paidAt`
  themselves — the rest is built on the existing `shoots.clientPaid` and
  `assignments[].paid` booleans, plus UI/rules behavior.
- **Marking paid or checked-in:** clicking "Mark Client Paid," "Mark
  Cameraman Paid," or marking someone checked-in opens a confirmation
  dialog before writing anything. Only on explicit confirm does the write
  happen — but once confirmed, it applies immediately and directly, for
  either role, without going through `changeRequests`.
- **After confirmed:** the UI renders that payment as a locked summary
  (e.g. "✓ Paid on 14 Aug 2026"), not an editable toggle or amount field.
  `clientAmount` (or the relevant `assignments[].amount`) should visually
  read as locked too, not freely editable, once its payment is marked paid.
- **Reversing/correcting:** there is no silent "un-click" — reversal is its
  own deliberate action ("Unmark as Paid" / "Edit Locked Amount"), itself
  behind a second confirmation. Like the original marking, this reversal is
  ALSO a direct, immediate action for either role — not routed through
  `changeRequests`. The confirmation dialog is the safeguard against
  accidental clicks; founder approval isn't, for this specific action.
- Invoice numbers already generated (`clientInvoiceNumber` /
  `payoutVoucherNumber`) are NOT cleared by a reversal — if a payment is
  unmarked and re-marked later, it reuses the same invoice number rather
  than generating a new one, consistent with "never regenerate an assigned
  number" in the Invoice Numbering rules above.
- `firestore.rules` enforces this via `isOnlyChangingShootOperationalFields()`
  — admin can write `clientPaid`, `assignments` (which carries `paid` and
  `checkedInAt`), and the delete fields directly on `shoots`, without the
  broader direct-write access founder has. Everything else on `shoots`
  (client, date, location, amounts being changed for reasons other than
  marking paid, etc.) still requires the normal `changeRequests` flow for
  admin.

## Dashboard "Needs Your Attention" feed

Instead of separate scattered widgets (overdue payments here, pending
approvals there, pending cameraman rates somewhere else), the Dashboard
leads with ONE ranked list merging everything that actually needs a
decision or action today. This replaces scanning five sections to figure
out what to do — it should just be obvious from the top of the dashboard.

- **Sources merged into one feed, each client-side, no new collection:**
  - Overdue client payments (`shoots` where `clientPaid == false` and
    days-since-shoot exceeds the overdue threshold)
  - Overdue cameraman payouts (`assignments[]` where `paid == false` and
    `amount != null`, same overdue logic)
  - Pending `changeRequests` awaiting the signed-in user's action (founder
    sees items needing approval; admin sees their own rejected items
    needing resubmission)
  - Cameramen with a pending rate (`assignments[].amount == null` on an
    upcoming/recent shoot)
- **Sort by urgency, not by type** — e.g. most-overdue-first across all
  categories, not grouped into separate sections the person has to scan
  independently. A small icon/tag per row indicates which category it is
  (payment, approval, rate).
- **Role-aware:** founder's feed leads with pending approvals (their job);
  admin's feed leads with rejected items needing resubmission and pending
  rates (their job). Overdue payments show for both, since either can act
  on them per the "instant action" rules already defined.
- Each row's action button uses the lock/checkmark vs. clock icon
  convention from `DESIGN_SYSTEM.md` depending on whether clicking it acts
  immediately (mark paid) or opens something that still needs approval
  (resubmit).

## Dashboard growth chart

A revenue-over-time line chart on the Dashboard, with switchable time
ranges (1M / 6M / 1Y / All), similar to a stock/price chart's range picker.

- **Data source:** aggregate `shoots.clientAmount` grouped by
  `clientPaidAt` (NOT `date` — the chart tracks when revenue actually came
  in, not when the shoot happened; a shoot done in July but paid in August
  counts toward August). Only shoots where `clientPaid == true` contribute
  — pending/unpaid amounts don't appear on this chart at all, since it's
  about realized growth, not billed-but-uncollected amounts.
- **Range picker:** four options — `1M`, `6M`, `1Y`, `All` — control the
  x-axis window and the bucket size:
  - `1M` → bucket by day
  - `6M` → bucket by week
  - `1Y` → bucket by month
  - `All` → bucket by month, x-axis starts at the earliest `clientPaidAt`
    in the data
- **Line(s):** a single terracotta line for total revenue is enough for
  v1. Do not add a second series (e.g. expenses or profit) unless
  explicitly asked — keep this chart answering one question ("is revenue
  growing") rather than becoming a multi-metric dashboard chart.
- **No new backend work required** — this is a client-side aggregation
  over `shoots` (filtered `clientPaid == true`, grouped by `clientPaidAt`)
  using the existing real-time listener, not a new collection or a Cloud
  Function. If the client-side aggregation becomes slow once there's a lot
  of history, revisit with a `dailyRevenueSummary` rollup collection then
  — not needed at current/expected data volumes.
- Follows `DESIGN_SYSTEM.md` → Charts: terracotta solid line, no area-fill
  gradient, ₹ formatted with Indian comma grouping on the y-axis.

## Rules for working with this model
1. Every enum-typed field (`status`, `category`, `type`) must read its
   options live from the matching `settings` document — never hardcode a
   list of options inside a component.
2. Archiving a `settings` option (not deleting it) is how options are
   retired — existing records keep the archived value, it just disappears
   from pickers for new entries.
3. A shoot can have any number of cameramen via `assignments`, each paid
   independently. The client is billed once per shoot via `clientAmount`.
4. Do not add offline storage, cameramen login/auth, public booking, payment
   gateway integration, calendar view, revenue dashboard, GST/tax fields,
   cameraman ratings, or an activity log — these are explicit non-goals for
   this version.
5. All normal queries on `clients`, `cameramen`, `shoots`, `expenses` must
   filter out `deletedAt != null` records. Never query these collections
   without that filter except on the Recycle Bin screen itself.
6. Never write directly to `clients`, `cameramen`, `shoots`, or `expenses`
   from an `admin`-role add/edit UI action — always go through
   `changeRequests`. `founder`-role direct edits (if any) write directly.
   **Exception:** on `shoots` specifically, admin CAN write `clientPaid`
   and `assignments` (which carries `paid`/`checkedInAt`) directly, no
   approval needed — see "Payment confirmation & locking."
7. Deletion, restore, and permanent hard-delete are always `admin`-only and
   apply immediately with no approval step, even though founder has final
   say on everything else.
8. Approving or rejecting a `changeRequests` document is a `founder`-only
   action — do not expose Approve/Reject controls to the admin role.
9. `admin` may edit and resubmit a `pending` or `rejected` changeRequest at
   any time. Resubmitting can only ever move `status` back to `pending` —
   `admin` can never write `status: approved` under any circumstance.
10. Every `changeRequests` create/resubmit and every approve/reject must be
    paired with a `notifications` write for the other party — don't let a
    change to `changeRequests` happen silently with no notification.