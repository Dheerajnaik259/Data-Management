# Operations Runbook

## Deploy

1. Use a pull request and require the CI workflow to pass before merging.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment platform's environment settings for the intended Supabase environment. Never put a service-role key in a `VITE_*` variable.
3. Build and deploy the reviewed commit. Verify sign-in, a read-only dashboard load, and one non-destructive workflow after deployment.
4. Apply database migrations to staging first. Production migrations must be reviewed, backed up, and applied by an authorized operator using the project's approved Supabase workflow.

## Roll back

- For a frontend regression, redeploy the last known-good build. Do not assume a code rollback also reverses a database migration.
- For a database issue, stop writes if data integrity is at risk. Prefer a reviewed forward-fix; restore a backup only after the owner confirms the recovery point and expected data loss.

## Backups and recovery

- The Supabase project owner must enable a backup plan appropriate to the subscription and verify it is running.
- Test restoration into a separate scratch project before relying on a backup. Never experiment with recovery on production.
- Record the backup timestamp, restore duration, and any missing storage objects after each drill.

## Access and account recovery

- Keep public signups disabled. Invite operators through the authorized team workflow and require MFA for every Founder account.
- To remove an operator, disable/delete the Auth user in the Supabase dashboard and confirm its profile is removed. Review active sessions and stored credentials as part of offboarding.
- Do not share accounts. Keep the current project owner and escalation contact in the private operations record.

## Key rotation

1. Rotate Supabase keys or database credentials in the Supabase dashboard.
2. Update the matching deployment secret immediately and redeploy.
3. Revoke the old credential only after production and staging have been verified with the new one.
4. If a credential was committed, rotate it even if the commit was later removed; removing a file does not erase Git history.

## Incident escalation

Pause deployments and avoid destructive database changes. Preserve relevant timestamps and error messages, then contact the Supabase project owner and the deployment owner through the private operations channel.
