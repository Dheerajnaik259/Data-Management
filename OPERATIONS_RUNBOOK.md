# Operations Runbook

This app uses Supabase for authentication, PostgreSQL, Realtime, and private file storage. The production hosting provider is not selected/configured in this repository; complete provider-specific steps after choosing a host.

## Release

1. Review the intended commit and require the repository CI checks to pass.
2. Build the reviewed frontend with `npm ci` and `npm run build`.
3. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host for the correct environment. These are browser-visible values; never expose a service-role key through a `VITE_*` variable.
4. Keep staging and production in separate Supabase projects. Apply pending migrations to staging first, test real role access and key workflows, and back up production before applying approved migrations.
5. Apply only unapplied files from `supabase/migrations/` in filename order. Never apply `supabase/migrations/proposed/` as part of routine deployment; the Projects/Content Production cleanup proposal is destructive.
6. Enable MFA for Founder accounts before applying the hardening migration and verify AAL2 approval, permanent deletion, and business-profile behavior.
7. Deploy the matching frontend. Verify login, dashboard reads, role-limited access, approvals, storage links, and one non-destructive operational action.
8. Configure Supabase Auth URL allowlists for the deployed domain and hosting security headers/CSP for the actual asset and API origins.

## Supabase account and access

- Disable public signups if access should be invitation-only. Restrict redirect URLs to approved environments.
- Configure email confirmation, password protections/leaked-password checks, rate limits, and session settings appropriate to the organization.
- Require MFA for operators as an organizational policy; the database specifically requires AAL2 for Founder approval/rejection, permanent deletion, and business-profile edits.
- Admin manages team invitations and assignable Admin/Social Media Manager roles. Founders are not assignable through the normal team invite flow.
- Maintain at least one other Founder before removing/demoting a Founder. Confirm account-offboarding effects before disabling an Auth user; profile triggers can prevent removing the last Founder.
- Review current sessions during offboarding. Do not share accounts or credentials.

## Rollback and incident response

- For frontend regressions, redeploy the last known-good build. A frontend rollback does not reverse database changes.
- For database integrity risk, pause writes and alert the Supabase/project owner. Prefer a reviewed forward-fix.
- Restore a backup only after the owner confirms the recovery point, expected data loss, and restoration target.
- Preserve timestamps and error messages. Do not include passwords, tokens, service-role keys, or sensitive customer data in tickets/chat.

## Backups and recovery

- Enable a backup plan appropriate to the Supabase subscription and data-retention requirements.
- Test restoration into a separate scratch project, not production.
- Record backup timestamp, restore duration, application verification results, and any missing Storage objects.
- Audit logs contain full old/new row snapshots for selected tables; define their retention and access policy.

## Credential rotation

1. Identify which Supabase credential is affected and rotate it in Supabase.
2. Update the matching environment secret and redeploy/restart the relevant service.
3. Verify staging and production before revoking the old credential.
4. If a privileged credential was committed, rotate it even if the file or commit was later removed; Git history may retain it.

## Deployment host checklist

After selecting a host, add and verify HTTPS enforcement, security headers, a least-privilege CSP, SPA route fallback, environment separation, and deployment rollback. Do not copy a CSP without confirming the app's Supabase, font, and asset origins.
