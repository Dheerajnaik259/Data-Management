# ERP Mpixel Media — Future Scope

This file separates the shipped functionality from ideas that are **not implemented in the current build**. Proposed work should be prioritized with the business owner and validated against the current database authorization model before implementation.

## Current build baseline

The app already includes role-specific dashboards, client/cameraman/shoot/expense management, approval requests, payment and payout tracking, WhatsApp reminders/call sheets, invoices and vouchers, CSV exports, client communication history, settings, and recycle-bin operations. See [README.md](README.md) and [PROJECT_PLAN.md](PROJECT_PLAN.md) for the routes and implemented workflows.

## Potential future features

### Monthly retainer and content-quota tracking

- Track each client's monthly contract quota (for example, a set number of reels and stories).
- Show completed versus planned deliverables for the current period.
- Define whether contract changes require Founder approval before adding fields or approval behavior.

### Deliverable production workflow

- Add per-deliverable stages such as editing, client review, revision, and published.
- Define ownership, timestamps, client visibility, and history/audit requirements before extending the current deliverable JSON model.

### Contract expiry and renewal reminders

- Add contract end dates and configurable renewal notice windows.
- Surface upcoming renewals to the appropriate role and avoid introducing duplicate notification schedules.

### AI-assisted operational entry

- Explore conversational search and draft creation for clients, shoots, assignments, and expenses.
- Require a review/confirmation step before every mutation and send Admin changes through the existing approval workflow.
- Do not give an assistant access to credentials, privileged settings, or unrestricted database operations.

### Agency packages and testimonial showcase

- Consider a Founder-managed catalogue of service packages, deliverables, and pricing.
- Consider storing approved testimonials and client outcome metrics.
- Keep external-facing presentation data separate from operational records and provide an explicit review step before sharing it.

## Planning guardrails

- Treat this list as proposals, not committed delivery dates or current capabilities.
- Document any schema additions and migration/backfill requirements in `DATA_MODEL.md`.
- Define role permissions, RLS policies, and validation rules before UI implementation.
- Keep operational and financial records private; agree retention, audit, and backup requirements before expanding access.
