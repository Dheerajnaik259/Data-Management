# ERP Mpixel Media — Data Model

This document describes the current Supabase model. The bootstrap definition is `supabase/schema.sql`; the ordered files in `supabase/migrations/` change its roles, policies, and behavior. The bootstrap file alone is not the current production schema.

## Roles

The current role values are `admin`, `founder`, `founder_ceo`, `founder_coo`, and `social_media_manager`. Founder variants share Founder-level privileges. The early bootstrap enum and two-profile limit are changed by later migrations; do not infer current roles from `schema.sql` alone.

| Capability | Founder (all variants) | Admin | Social Media Manager |
|---|---:|---:|---:|
| Read operational records | Yes | Yes | Client, crew, and shoot rows under RLS; app routes are narrower |
| Create/edit managed records directly | Yes | No | No |
| Submit create/edit/delete request | No | Yes | Clients and shoots only |
| Review and approve/reject requests | Yes, AAL2 required | No | No |
| Update payment and operational shoot fields | Yes | Yes | Operational check-in fields only |
| Manage team invitations and assign Admin/SMM roles | No | Yes | No |
| Manage option lists and operational settings | Yes | Yes | No |
| Edit business/invoice profile | Yes, AAL2 required | No | No |
| Soft-delete/restore | No | Yes | No |
| Permanently delete recycled records | Yes, AAL2 required | No | No |
| Read/manage expenses | Yes | Yes | No |

Database RLS, triggers, and RPCs are the authorization boundary. UI permission checks alone do not secure data.

## Tables

All tables below are in `public`. SQL uses `snake_case`; TypeScript interfaces in `src/types.ts` generally use `camelCase`.

### `profiles`

Maps a Supabase Auth UUID to `email`, `name`, and `role`, with a `created_at` timestamp. Role changes are guarded; only a Founder can change Founder-level roles, and the last Founder cannot be demoted or removed. An early bootstrap operator-count limit is removed by a later role migration.

### `clients`

`id`, required `name`, `phone`, `email`, `notes`, `status`, `contract_link`, `created_at`, nullable `deleted_at`, and nullable `deleted_by`. Status options come from settings. Contract links are constrained to empty/null or HTTPS for new/updated rows.

### `cameramen`

`id`, required `name`, `phone`, `rate`, `notes`, `contract_link`, `unavailability` JSONB, `created_at`, nullable `deleted_at`, and nullable `deleted_by`. Rate cannot be negative for new/updated rows.

### `shoots`

| Field | Meaning |
|---|---|
| `id`, `client_id` | Shoot UUID and required client reference |
| `date`, `call_time`, `location`, `status` | Scheduling and status data |
| `client_amount`, `client_paid`, `client_paid_at` | Receivable and payment status |
| `client_invoice_number` | Persisted invoice number, assigned when a paid invoice is generated |
| `assignments` | JSON array of crew IDs, payout amounts/status, check-in data, and voucher numbers |
| `assigned_cameraman_ids` | UUID-array mirror derived from `assignments` for database filtering |
| `deliverables` | JSON array of deliverable type/count/file-link objects |
| `client_notified_at` | Optional client-notification timestamp |
| `created_at`, `deleted_at`, `deleted_by` | Creation and recycle-bin metadata |

Assignment membership is synchronized to `assigned_cameraman_ids` by a trigger. The hardening migration validates assignment structure and nonnegative amounts. Client amounts cannot be negative; a paid client payment requires a timestamp. Deliverable links must be empty/null or HTTPS.

### `expenses`

`id`, required `description`, nonnegative `amount`, `date`, optional `shoot_id`, required `category`, `created_at`, nullable `deleted_at`, and nullable `deleted_by`. Social Media Managers cannot read or access expense files.

### `communication_logs`

Client contact history with `id`, `client_id`, `date`, `note`, optional `logged_by`, `logged_by_name`, and `created_at`. Client deletion cascades to its communication log.

### `settings`

One row per setting, keyed by `id` and unique `key`; includes `label`, `editable`, and JSONB `options`. Option-list keys include `clientStatus`, `shootStatus`, `deliverableTypes`, and `expenseCategories`. `operationalSettings` stores the payment grace period and WhatsApp templates; `businessProfile` stores business/invoice identity and payment details. The business profile is Founder-only and requires AAL2 to change.

### `change_requests`

Stores `id`, `target_collection`, nullable `target_doc_id`, `action` (`create`, `edit`, or `delete`), `proposed_data`, `requested_by`, `requested_at`, `status`, reviewer identity/time, `review_note`, and `revision_count`. The hardening migration adds requester/reviewer name and role snapshots so history remains readable if profile details later change.

### `notifications`

Stores recipient, notification `type`, optional related request, message, read state, and creation time. Approval/rejection outcome notifications are inserted by the review RPC in the same transaction. Submission and resubmission notifications are attempted separately and may be deferred if insertion fails.

### `counters`

One row per year with independent client-invoice and payout-voucher counters. Numbers use `INV-YYYY-NNNN` and `RCP-YYYY-NNNN`. The RPC locks the shoot row, checks payment state, persists the number, and returns an existing number on retries.

### `audit_log`

Created by the production-hardening migration. Stores actor, timestamp, table/action, row ID, and full `old_data`/`new_data` JSON snapshots for configured tables including profiles, clients, shoots, expenses, settings, requests, notifications, and communication logs. Read access is Founder-only. Snapshots can contain personal/business data; define retention and access controls before production.

## Guarded database operations

- `is_operator()`, `is_admin()`, `is_founder()`, and `can_submit_collection(text)` support RLS and authorization.
- `review_change_request(uuid, boolean, text)` locks a pending request, checks Founder role and AAL2, validates fields, applies an allowed change, updates the request, and inserts its outcome notification transactionally.
- `resubmit_change_request(...)` validates the request owner, status, and revision before resubmission.
- `update_shoot_operational(uuid, jsonb)` restricts routine changes; it does not authorize changing crew membership or payout amounts.
- `set_record_deleted(text, uuid, boolean)` is Admin-only for soft-delete and restore.
- `hard_delete_record(text, uuid)` is Founder-only, requires AAL2, and only deletes records already in the recycle bin. Related active records can prevent deletion.
- `assign_invoice_number(text, uuid, integer)` creates stable paid-document numbers.
- `valid_http_link`, deliverable/assignment constraints, and profile triggers guard supported data invariants.

## Storage and migrations

The private Storage bucket is `smm-ops-files`. The hardening migration sets a 100 MiB limit, allowed PDF/JPEG/PNG/MP4 types, and path/role policies. Use signed URLs; do not make this bucket public.

Apply migrations in filename order, only once per database. For existing projects, use migration history to identify unapplied files. Never apply `supabase/migrations/proposed/` automatically. The proposed Projects/Content Production cleanup is destructive and requires separate review and backup.
