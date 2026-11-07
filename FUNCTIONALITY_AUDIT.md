# Functionality Audit

## Scope and limitations

Reviewed the current application routes, approval flow, invoice/voucher generation paths, shoot calendar, app-level trackpad navigation, and related documentation. Projects and Content Production are not part of the current frontend. This audit does not claim live Supabase or role-based verification; the destructive database cleanup remains a separate manual step.

## Implemented and checked

| Area | Result |
|---|---|
| Schedule | Monthly calendar marks shoot dates. Hover or click a shoot marker to preview client, location, and call time; use the preview action or day agenda to open shoot details. |
| Trackpad navigation | Horizontal two-finger wheel gestures navigate backward/forward through visited in-app routes. Predominantly vertical gestures, form controls, and horizontally scrollable elements are excluded. |
| Shoot WhatsApp drafts | Direct scheduling opens prefilled WhatsApp drafts for the selected client and assigned crew; an Admin's pending request opens drafts only when a Founder approves it. Messages are not sent automatically and require a manual Send action in WhatsApp. |
| Liquid Glass styling | Shared surfaces use layered translucent fills, backdrop blur/saturation, edge highlights, restrained ambient color, and eased motion; reduced-motion preferences are respected. |
| Change-request deletion | UI calls `delete_change_request(p_cr_id uuid)`. The idempotent migration `202611070002_delete_change_request_rpc.sql` installs the guarded function when it is missing; confirm it is applied to the configured Supabase project if deletion still reports a schema-cache error. |
| Document numbers | Paid invoice and payout document paths now use the existing row-locked, idempotent `assign_invoice_number` RPC. Unpaid previews are explicitly marked as drafts. |
| Retired modules | Projects and Content Production were removed from the frontend. A manual Supabase cleanup script is available; it has not been executed. |
| Verification | Latest `npm run lint`, `npm test` (10 tests), and `npm run build` passed after the UI and navigation changes. A browser-generated horizontal wheel event moved between in-app history entries; physical trackpad hardware behavior is not independently verified. |

## Open verification and follow-up

1. **Projects and Content Production database cleanup is pending.** Back up records that need to be retained, inspect the SQL, and run it manually only if deleting these feature records and related approval requests is intended.
2. **Legacy notifications are best-effort.** Existing helpers create or update a legacy change request, then attempt notification delivery separately and log a warning on failure. A request can therefore persist without the intended notification. Consider moving those legacy operations into atomic database procedures or adding a durable retry/outbox.
3. **Legacy approval application is not atomic.** The existing client/cameraman/shoot/expense approval path applies the target record and updates the request in separate operations. A failure between those operations can leave a changed record with a still-pending request. Validate and address this in a separately reviewed migration before treating legacy approval as transactionally guaranteed.
4. **Database behavior needs role-based integration tests.** Test Admin direct-write denial, Admin submission, Founder approval/rejection/resubmission, and notification delivery against a disposable Supabase database.
5. **Calendar and invoice behavior need acceptance checks.** Automated tests do not cover calendar viewport interactions or concurrent invoice-number requests. Calendar events rely on shoot data loading successfully from Supabase.

## Safety status

No Supabase cleanup SQL was executed and no database data was changed during this removal. Database cleanup remains a manual, destructive step.
