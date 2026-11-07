# Workspace Rules — ERP Mpixel Media

These rules keep implementation, security, and documentation aligned with the current source.

## Sources of truth

- `PROJECT_PLAN.md` describes current product scope and distinguishes shipped features from proposals.
- `DATA_MODEL.md` describes the database model. Confirm exact table, column, and permission details in `supabase/schema.sql`, its migrations, and `src/types.ts` before changing them.
- `DESIGN_SYSTEM.md` describes current visual conventions. Shared CSS tokens in `src/index.css` take precedence over prose examples.
- Do not describe a proposed roadmap item as implemented.

## Settings and configurable options

- Client statuses, shoot statuses, deliverable types, and expense categories are loaded from rows in the Supabase `settings` table; do not hardcode the selectable option lists in feature forms.
- Operational defaults live in the `operationalSettings` row, including payment grace days and WhatsApp message templates. Use the existing `parseOperationalSettings()` helper.
- Company and invoice identity data live in the `businessProfile` settings row. Only the Founder may edit that profile.

## Data access and approvals

- Supabase PostgreSQL is the source of persisted application data. `DataContext` and the Supabase data helpers provide application state and Realtime synchronization.
- Admin additions and edits to managed operational records use the change-request workflow. Founder review determines whether the proposed data is applied.
- Admin recycle-bin operations are direct operational actions. Payment status and crew check-in updates use the guarded operational-update path.
- Founder direct writes, Admin restrictions, and role-specific access must remain enforced by RLS and restricted database functions. Frontend checks are not a security boundary.
- Apply existing database changes through ordered migrations. Do not rerun `schema.sql` over a live database.

## Existing helpers

- Build WhatsApp messages with helpers in `src/utils/whatsapp.ts`.
- Generate invoices and payout vouchers with `src/utils/pdfGenerator.ts` and the existing invoice-number RPC.
- Reuse shared currency/date formatters, permission helpers, dialogs, slide-overs, empty states, loading indicators, and keyboard-shortcut components.

## Development verification

Use the package scripts for validation:

```bash
npm run lint
npm test
npm run build
```

For authorization or schema changes, also test the complete migration chain and RLS/RPC behavior in a staging Supabase project for both roles.
