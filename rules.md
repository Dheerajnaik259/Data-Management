# Antigravity Rules — SMM Ops Tool

These rules apply to every task in this workspace. Follow them exactly.
When something isn't covered, ask a clarifying question instead of guessing.

## Grounding
- `PROJECT_PLAN.md` is the source of truth for scope, screens, and features.
  Do not add features listed under "Non-Goals" (offline mode, cameramen
  logins, public booking, payment gateway integration, calendar view,
  GST/tax fields, cameraman ratings, activity log).
- `DATA_MODEL.md` is the source of truth for every Firestore field name and
  type. Never invent, rename, or guess a field. If a needed field isn't
  listed, stop and ask rather than adding one silently.
- `DESIGN_SYSTEM.md` is the source of truth for all visual styling. Match it
  exactly — colors, fonts, spacing, component patterns. Do not introduce new
  colors, fonts, or component patterns not listed there.

## Enums / configurable options
- `status`, `category`, and `type` fields (client status, shoot status,
  deliverable type, expense category) must always be read live from the
  `settings` collection, never hardcoded as a fixed list in a component.
- Build one generic settings-list editor component, reused for every
  configurable list — do not build a separate editor per list.

## Firestore & security
- All reads/writes are restricted to exactly two account UIDs (admin +
  founder) via `firestore.rules` — never add public read/write rules.
- No signup screen. `users` accounts and their `role` field are created
  manually in the Firebase console only.
- Use one shared `useRealtimeSync` (or equivalent) Firestore `onSnapshot`
  listener hook, reused across Clients/Cameramen/Shoots — do not duplicate
  listener logic per screen.

## Roles, delete, and approval — enforce exactly
- Two roles: `admin` (operator, handles data entry) and `founder` (highest
  authority, approves the admin's work). Both can read everything.
- `admin`'s adds/edits to `clients` / `cameramen` / `shoots` / `expenses`
  must write to `changeRequests` as `status: pending` — never write the
  target collection directly, except to change `deletedAt`/`deletedBy`
  (soft delete/restore, see below), or on `shoots` specifically,
  `clientPaid`/`assignments` for marking paid/checked-in (see "Forms and
  confirmations" below) — both are deliberate, named exceptions, not a
  general loophole.
- Only `admin` can soft-delete, restore, or permanently hard-delete a
  record — and these actions apply immediately with NO approval step, even
  though founder approves everything else the admin does. Never expose
  delete/restore/hard-delete controls to the `founder` role in the UI.
- Approving/rejecting a pending `changeRequests` document is `founder`-only
  — do not expose Approve/Reject controls to the admin role; the admin
  submits, the founder decides.
- `admin` can edit and resubmit a `pending` or `rejected` changeRequest at
  any time — resubmitting only ever moves `status` back to `pending`, never
  to `approved`. Show an "Edit & Resubmit" action on rejected items, and
  pre-fill the form with the previous `proposedData`.
- Every list/search/ledger query on `clients`/`cameramen`/`shoots`/
  `expenses` must exclude `deletedAt != null` records, except the Recycle
  Bin screen itself.
- `founder`'s own direct edits (if any) bypass the queue and apply
  immediately — the queue exists only to give founder oversight of the
  admin's data entry, not the reverse.
- **Nothing moves until approved:** a still-pending `clients` or
  `cameramen` create request must NOT appear in the client/cameraman
  picker when creating a new shoot. If a shoot needs a brand-new client,
  the client approval has to clear first — do not build a workaround that
  lets a shoot reference a pending, not-yet-approved entity.
- **v1 has exactly two roles** (`admin`, `founder`), but treat `role` as an
  open string, not a hardcoded two-value enum — use a small
  role-permissions lookup (e.g. `canApprove(role)`, `canDelete(role)`)
  rather than inline `role === 'admin'` checks scattered through the code,
  so a third role can be added later as a config change, not a rewrite. Do
  not build any role-management UI or a third role now — this is a
  forward-looking constraint on how the code is structured, not a v1
  feature.

## Notifications
- Every `changeRequests` create/resubmit must produce a `notifications` doc
  addressed to the founder (`type: pending_approval`). Every approve/reject
  must produce one addressed to admin (`type: approved`/`rejected`). Don't
  let a status change happen with no paired notification.
- Header bell icon = live unread count via realtime listener on
  `notifications` filtered to the signed-in user's `recipientId`. Build one
  shared component, not a per-screen implementation.
- Clicking a notification marks it read and navigates to the relevant
  Pending Approvals item.
- Deliberately scoped to the approval queue only — instant actions (mark
  paid, mark checked-in, delete/restore) do NOT generate a notification.
  That's intentional, not a gap to fix.

## UI: modern interaction patterns
- This is a daily-use tool for two people, not a marketing site — build
  for speed and repeated use. See `DESIGN_SYSTEM.md` → "Modern
  interaction patterns" for the full list; the short version:
  Cmd/Ctrl+K command palette for navigation and quick actions, toast
  feedback on every write (not silent saves or static banners),
  optimistic UI updates (don't wait for round-trip before reflecting an
  action), keyboard shortcuts (`/` search, `N` new-in-context, `Esc`
  close), dense tables over sparse cards, skeleton loaders not spinners.
- Every clickable element (cards, table rows, buttons, sidebar items,
  icon buttons, links, inputs) needs the hover/focus feedback defined in
  `DESIGN_SYSTEM.md` → "Hover, focus & elevation" — elevation-on-hover for
  cards, cursor pointer + row tint for clickable rows, tooltips on
  icon-only buttons and truncated text, underline-on-hover for links, a
  consistent 150ms transition throughout. This applies everywhere, not
  just a few showcase screens — check it screen by screen, not just once.
- Dashboard leads with a single ranked "Needs Your Attention" feed
  (overdue payments, pending approvals/resubmissions, pending cameraman
  rates) merged and sorted by urgency — not scattered into separate
  sections the person has to scan independently. Role-aware: founder's
  feed leads with approvals, admin's leads with resubmissions/pending
  rates. See `DATA_MODEL.md` → "Dashboard 'Needs Your Attention' feed."

## UI: pending state and instant-vs-queued convention
- Desktop/laptop only — do not build mobile breakpoints or a hamburger
  nav as a priority. Optimize for mouse + keyboard, denser tables, and
  hover states, per `DESIGN_SYSTEM.md` → "Platform target."
- Any row still in the approval queue (a pending `changeRequests`) must
  look visibly different in its list — reduced opacity + a muted amber
  "Pending" tag — not just discoverable via the separate Pending Approvals
  screen. Rejected items get their own muted brick-red tag.
- Sidebar items with something waiting (Cameramen pending rates, Pending
  Approvals count) get a small badge, same pattern as the notification
  bell — don't make the bell the only place this surfaces.
- Use the lock/checkmark vs. clock icon convention from
  `DESIGN_SYSTEM.md` consistently everywhere the instant-vs-queued
  distinction matters — don't invent a different treatment per screen.
- None of these — Pending tags, badges, queue icons — use the terracotta
  accent color. Reserve terracotta for primary actions only; see
  `DESIGN_SYSTEM.md` → "Explicitly avoid."

## Password reset
- Use Firebase Auth's built-in `sendPasswordResetEmail` — do not build a
  custom reset flow, custom token, or custom email sender.
- Login screen needs a "Forgot password?" link that calls it and shows a
  simple "check your email" confirmation. No new Firestore fields needed.

## Invoice numbering
- Formats: client invoice `INV-{YYYY}-{4-digit seq}`, payout voucher
  `RCP-{YYYY}-{4-digit seq}` — sequence resets to 0001 each calendar year.
- Number generation is a Cloud Function (Admin SDK, runs inside a Firestore
  transaction against `counters/invoices_{YYYY}`), never a direct client
  write — `firestore.rules` denies client writes to `counters` on purpose.
- Once assigned, store the number on `shoots.clientInvoiceNumber` or the
  matching `assignments[].payoutVoucherNumber` and never regenerate it —
  re-downloading reuses the stored number.

## Forms and confirmations — do not skip
- Every "Add X" / "Schedule Shoot" / "Log Expense" button must open a real
  form through `Modal.jsx` with actual fields wired to actual state and a
  working submit handler. An empty/blank panel on click is a bug, not an
  acceptable placeholder — verify each button actually renders its form
  before considering a screen finished.
- "Mark Client Paid," "Mark Cameraman Paid," and marking a cameraman
  checked-in must go through `ConfirmDialog.jsx` before writing
  `clientPaid` / `assignments[].paid` / `assignments[].checkedInAt`. After
  confirmed, render that payment as a locked, read-only summary, not a
  still-editable toggle/amount field. Unlike other admin edits, these ARE
  direct, immediate writes for both admin and founder — they do NOT go
  through `changeRequests`, by design (see `DATA_MODEL.md` → "Payment
  confirmation & locking"). Reversal is a second confirmed action, also
  direct/immediate, not routed through approval either.

## Client shoot notifications
- `clients.email` and `clients.phone` are both required fields on the Add
  Client form — email powers the automated confirmation, phone powers the
  WhatsApp link.
- Email is fully automated: a Cloud Function triggers on `onCreate` of
  `shoots/{shootId}` (which only fires once the shoot is actually approved
  and created — never for a still-pending changeRequest), composes a
  short confirmation (client name, date, call time, location), writes it
  to the `mail` collection in the shape the Firebase Trigger Email
  extension expects, and sets `shoots.clientNotifiedAt`. Do not build a
  custom SMTP client or email service — use the Trigger Email extension.
- WhatsApp is intentionally NOT automated — no API, no cost, no template
  approval. It's a "Send WhatsApp Reminder" button on Shoot Detail that
  opens `https://wa.me/{clients.phone}?text={url-encoded message}` in a
  new tab/window; the signed-in user still taps Send themselves inside
  WhatsApp. Don't try to send this programmatically or integrate a
  WhatsApp Business API — that was explicitly declined.
- If `clients.email` is somehow missing, log it and skip the send —
  never let a missing email block shoot creation itself.

## Dashboard growth chart
- Aggregate `shoots.clientAmount` grouped by `clientPaidAt` (not `date`),
  filtered to `clientPaid == true` only — this tracks realized revenue,
  not billed-but-unpaid amounts.
- Range picker: `1M` (bucket by day), `6M` (by week), `1Y` (by month),
  `All` (by month, from earliest `clientPaidAt`).
- Single terracotta line, no second series (expenses/profit) unless
  explicitly asked for later — see `DATA_MODEL.md` → "Dashboard growth
  chart" for the full spec.
- Client-side aggregation over the existing real-time `shoots` listener —
  no new collection, no Cloud Function, unless data volume later makes
  that too slow (not expected at current scale).

## Cameraman rate assignment flow
- Adding a cameraman to a shoot and setting their rate for it are separate
  steps. At shoot creation, each `assignments[]` entry gets `amount:
  null`. The rate is entered later, on `CameramanDetail`, in a "Pending
  Rate" section listing that person's assignments where `amount == null`.
- Maintain `shoots.assignedCameramanIds` (flat array of `cameramanId`,
  mirroring `assignments[].cameramanId`) on every write to `assignments`
  — this is what lets `CameramanDetail` query "shoots this person is on"
  via `array-contains`, since Firestore can't query into an array of
  objects directly.
- Setting a rate is a `changeRequests` edit, submitted through the UI, NOT
  a direct write — even though `firestore.rules`' operational-fields
  carve-out technically permits admin to write the whole `assignments`
  array directly. That carve-out exists only for toggling
  `paid`/`checkedInAt` on an amount that's already been approved. Do not
  use it as a shortcut to skip approval when entering a new rate — this is
  a UI-level policy the rules can't strictly enforce, so get it right in
  the form logic.
- Disable "Mark Cameraman Paid" while that assignment's `amount` is `null`
  — there's nothing to confirm as paid yet.

## Before writing code
- For any non-trivial task, write an implementation plan first (files to be
  touched, new dependencies, logic changes) and wait for approval before
  applying edits.
- If a task requires a Firestore field, UI color, or component pattern not
  defined in `DATA_MODEL.md` or `DESIGN_SYSTEM.md`, ask before proceeding —
  do not silently invent one to fill the gap.

## Verification
- After UI changes, take a screenshot and compare against
  `DESIGN_SYSTEM.md` before declaring the task done.
- After data-model changes, re-check `DATA_MODEL.md` for field name/type
  consistency across every file touched.
- Specifically test hover/focus states, not just the resting screenshot —
  a screenshot alone won't show whether a card elevates on hover or a
  button has the right cursor. Interact with the screen, don't just look
  at it once static.