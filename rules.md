# Workspace Rules — ERP Mpixel Media

These conventions keep source, database behavior, and documentation aligned.

## Documentation and sources of truth

- `README.md` is the setup and operator-facing project overview.
- `PROJECT_PLAN.md` describes current product scope and distinguishes it from proposals.
- `DATA_MODEL.md` describes current data and authorization; verify exact behavior against `supabase/schema.sql`, ordered migrations, and `src/types.ts`.
- `FUNCTIONALITY_AUDIT.md` records verification and unresolved release checks; date test claims and do not claim live verification without evidence.
- `DESIGN_SYSTEM.md` describes conventions; tokens/classes in `src/index.css` take precedence over prose.
- `FUTURE_SCOPE.md` is proposals only.
- Update directly related documentation when behavior changes. Do not claim a proposed or unverified capability is implemented.

## Roles, data, and authorization

- Current roles: Founder (`founder`, `founder_ceo`, `founder_coo`), Admin, and Social Media Manager.
- Supabase PostgreSQL is the persisted-data source. `DataContext` and Supabase helpers manage client state and synchronization.
- Admin/Social Media Manager managed-record submissions are role- and collection-limited; Founders review requests and write directly.
- Admin can soft-delete/restore; permanent deletion is Founder-only and requires AAL2. Founder approvals/rejections and business-profile changes also require AAL2.
- Admin can manage team invitations/assignable roles and operational options. Do not let role changes bypass database guards or demote/remove the last Founder.
- RLS, guarded RPCs, constraints, and triggers are the authorization boundary. Frontend checks are not sufficient.
- Treat audit snapshots as sensitive data; avoid logging secrets and define retention before production.
- Use ordered, forward-only migrations for existing databases. Never rerun `supabase/schema.sql` on a live database or apply `supabase/migrations/proposed/` automatically.

## Configurable settings and helpers

- Load client/shoot statuses, deliverable types, and expense categories from `settings`; do not hardcode form option lists.
- Use `parseOperationalSettings()` for payment grace period and WhatsApp templates.
- Business/invoice identity is stored in the `businessProfile` settings row and is Founder-only.
- Build WhatsApp messages with `src/utils/whatsapp.ts`.
- Generate PDFs with `src/utils/pdfGenerator.ts` and persisted numbers through the invoice-number RPC.
- Reuse shared permissions, currency/date formatters, dialogs, loading/empty states, and UI components.
- Keep horizontal trackpad history handling centralized at the app shell.

## Validation

Run the relevant checks after source changes:

```bash
npm run lint
npm test
npm run build
```

For dependency updates, run the production dependency audit. For schema or authorization changes, test the complete migration chain and real role sessions in staging; include AAL2 flows and storage policies.
