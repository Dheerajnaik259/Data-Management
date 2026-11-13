# Functionality and Release Audit

## Scope

This is a source and local-check review of the current application. It is not a live penetration test, database integration test, or production-readiness certification. Supabase project settings and production data were not independently inspected.

## Implemented behavior reviewed

| Area | Current behavior |
|---|---|
| Roles and routes | Founder, Admin, and Social Media Manager roles have different capabilities; database RLS/RPCs are required in addition to UI checks. |
| Managed records | Admin and Social Media Manager submissions are restricted by role/collection; Founder writes directly and reviews change requests. |
| Approval transaction | The `review_change_request` RPC locks the pending request and applies the record change, request status, and outcome notification in one database transaction. It requires a Founder AAL2 session. |
| Request notifications | Creation and resubmission persist first, then attempt notification insertion separately. Failures are logged and do not roll back the request. |
| Recycle bin | Admin can soft-delete/restore; only a Founder with AAL2 can permanently delete a recycled record. Related live records may block deletion. |
| Payment documents | Invoice and payout numbers are assigned through the persisted database counter RPC after payment, and retries reuse existing numbers. Unpaid previews are drafts. |
| Links and exports | HTTPS URL handling and CSV formula-prefix escaping are implemented in shared utilities. |
| Storage | The hardening migration configures a private bucket, MIME/size limits, role-based object policies, and the app uses signed URLs for access. Live policy behavior still needs role-based verification. |
| Scheduling | The monthly calendar previews shoots and links to details. Horizontal trackpad history navigation is implemented at app level; physical-device behavior has not been independently tested. |
| WhatsApp | The app opens prefilled drafts; a person must review and send each message. |
| Retired modules | Projects and Content Production are absent from current app routes. A separate destructive SQL proposal remains under `supabase/migrations/proposed/`; it is not an active migration and has not been executed. |

## Local verification recorded

On 2026-11-13, the following commands passed locally:

- `npm run lint` — TypeScript check
- `npm test` — 6 test files, 26 tests passed
- `npm run build` — production bundle built
- `npm audit --omit=dev --audit-level=high` — zero production vulnerabilities reported

The operator reported that the production-hardening SQL returned “Success. No rows returned” in Supabase on 2026-11-13. The Supabase project, migration history, and resulting policies were not independently inspected, so confirm the intended project and resulting state before relying on it.

## Remaining release checks

1. **Database integration and permissions:** In a disposable/staging project, test direct-write denials and allowed workflows using real Founder, Admin, and Social Media Manager sessions. Include MFA/AAL2-required actions, failed approvals, role changes, storage access, and constraints.
2. **Migration/data review:** Check legacy data against new constraints, verify applied migration history, and review the full approval and deletion behavior before production. Do not run the proposed cleanup SQL as part of normal migration deployment.
3. **Storage acceptance:** Verify signed URLs expire as expected and that each role can access only its intended paths and file types.
4. **Notifications:** Pending and resubmission notifications are best-effort; consider a durable transactional outbox/retry if delivery must be guaranteed.
5. **Scale:** Data subscriptions currently reload records and include a 30-second polling fallback. Evaluate server-side pagination and narrower Realtime subscriptions as record volume grows.
6. **Audit/retention:** Audit rows retain full old/new row snapshots for several tables, potentially including personal and business data. Define access, retention, and purge policy before production use.
7. **Product QA:** Complete responsive/mobile, keyboard/screen-reader, calendar, invoice concurrency, and role-based end-to-end acceptance checks.
8. **Deployment operations:** Choose a host, configure security headers/CSP, Auth URL allowlists, backups, and a tested restore procedure.

## Safety notes

Do not treat a successful local build or SQL Editor message as proof of production readiness. Use separate staging and production projects, back up before database changes, and never expose service-role credentials in browser variables or source control.
