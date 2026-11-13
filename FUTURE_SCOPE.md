# ERP Mpixel Media — Future Scope

Everything in this document is a proposal, not a feature in the current application. Prioritize with the business owner and review database authorization, migrations, and operational costs before implementation.

## Current baseline

The app currently supports role-aware operations for clients, freelance crew, shoots, expenses, approvals, payments, invoices/vouchers, CSV exports, a monthly shoot calendar, client communication history, WhatsApp drafts, settings, and recycle-bin workflows. WhatsApp messages require a person to send them. See [README.md](README.md) and [PROJECT_PLAN.md](PROJECT_PLAN.md) for active scope.

## Candidate features

### Monthly retainer and content quotas

- Track each client's monthly contract quota and completed/planned deliverables.
- Define ownership, period boundaries, historical corrections, and which changes require Founder approval.

### Contract expiry and renewal reminders

- Store contract end dates and configurable renewal notice windows.
- Define recipient, notification channel, duplicate suppression, and retry behavior.

### AI-assisted operations

- Explore conversational search and draft creation for clients, shoots, assignments, and expenses.
- Require a human confirmation for every mutation and preserve the existing request/review authorization flow.
- Do not expose service-role credentials, unrestricted database operations, or privileged settings to an assistant.

### Agency packages and testimonial showcase

- Consider a Founder-managed catalogue of service packages, deliverables, and pricing.
- Consider storing approved testimonials and client outcome metrics.
- Keep any external-facing content separate from private operational records and require explicit review before publication.

## Planning requirements

- Do not list proposals as shipped functionality or promise delivery dates here.
- Update [DATA_MODEL.md](DATA_MODEL.md) and add a forward-only migration for any schema change.
- Define roles, RLS, RPC checks, validation, audit impact, and rollback/recovery before building UI.
- Agree retention and backup requirements before adding personal or financial data.
