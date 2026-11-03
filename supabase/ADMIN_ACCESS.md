# Activate administrator-only attendance and access monitoring

Apply `migrations/005_admin_attendance_and_access.sql` before publishing the matching frontend. The local implementation does **not** apply this migration or change the hosted site automatically.

## Before applying

1. Back up the database and test on an isolated Supabase/database copy. Existing deployments may use either original `001` schema; do not run both or reapply them.
2. Audit `public.profiles`: real administrator accounts must already have `role = 'admin'` or `'superadmin'` and the correct `auth.users.id`. Fix missing or incorrect roles through a trusted owner/service-role provisioning path. Metadata-only roles will no longer authorize access.
3. Verify that migrations `003` and `004` are present. Run `005` as the database owner; it runs in a transaction and replaces all policies on the four sensitive tables.

Do not trust existing profile roles without an audit: prior deployments authorized from user-editable metadata. Review unexpected privileged profiles before relying on them. New client-side role changes require an existing trusted administrator; owner/service-role provisioning remains available.

## Verify, then publish

Local structural safeguards:

```powershell
node --test tests/backend-access.test.cjs
```

Actual PostgreSQL/RLS regression suite, on the isolated copy after `005`:

```text
psql <authorized-local-connection> -v ON_ERROR_STOP=1 -f supabase/tests/admin_attendance_access.sql
```

The SQL suite creates test users, checks anonymous/student/admin/superadmin behavior, attempts forged roles and rejected writes, and rolls back fixtures. Use a database-owner connection and an isolated database; no production connection is implied by this command. The Node checks inspect SQL structure only and do **not** establish that RLS runs correctly. PostgreSQL/Supabase CLI was unavailable during local authoring, so the SQL suite remains unexecuted until run in that environment.

After successful database checks, publish the matching static frontend using the project's normal authorized hosting workflow. Check student and anonymous profiles, both administrator roles, login association, logout, blocked hashes and administrator attendance creation/editing. Database deployment and publishing require separate authorization.

## Data and permissions

| Area | Behavior |
| --- | --- |
| Attendance sessions and records | Only authenticated profile roles `admin` and `superadmin` may read/write. |
| Access logs and blocked hashes | Same administrator-only access; anonymous/student direct table operations are denied. |
| `record_access(p_ip_hash, p_ua)` | Anonymous/authenticated callers may append validated telemetry. The server assigns `auth.uid()` and the timestamp; callers cannot supply another account. |
| Missing authenticated profile | Recording fails rather than silently labeling an authenticated account anonymous. |
| Historical logs | `user_id` stays null; later logins create separate events, never rewrite old shared-IP events. |
| Account deletion | The foreign key sets `user_id` null while preserving the historic access event. |

The RPC returns only `{ "blocked": true/false }`, never logs, names, or blocked lists. It does not log an access for a blocked submitted hash. Role helpers use database profile roles and a pinned empty function search path, not `user_metadata`. The self-profile update policy no longer recursively reads its own RLS-protected table.

### IP telemetry limitations

The existing frontend computes a SHA-256 IP hash; raw addresses are not stored. A browser can falsify a submitted hash or bypass a frontend block, so this is **telemetry, not an enforceable network security boundary**. Use trusted server/gateway IP inspection if enforceable IP blocking is required. Multiple users can share one public IP; an IP association is not proof that a particular person made every request. Grouped associated hashes can therefore display multiple accounts; the unregistered section contains hashes with no associated account in the fetched history.

Historical events cannot reliably be assigned to accounts retroactively. Deleted accounts may leave unassociated historical events. The frontend preserves these limits rather than claiming a unique device/person identity.

## Rollback boundary

Back up policy definitions before applying. Rolling the frontend back does not safely restore the old permissive policies: keep the new database confidentiality restrictions. A database-owner rollback must be deliberate, preserve access logs and their nullable `user_id` data, and restore only audited policies/functions. Never restore the prior unrestricted attendance/log access as a shortcut.
