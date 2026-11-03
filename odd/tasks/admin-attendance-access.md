# Administrator-only attendance and access monitoring
Branch: `feat/admin-attendance-access`. Delivery: ask-on-risk; local implementation only, no remote deployment authorized. Runner: `node --test tests/*.test.cjs`.
Two independent units run concurrently with disjoint frontend/backend surfaces. Forecast: approximately 600 authored lines including tests; chain choice is required before commits if the forecast is confirmed.

## Specs
- S1: "solo puedan ver las asistencias el administrador" and "Piensa que eso solo lo verá los administradores nadie más." Restrict attendance reads and rendering to verified administrators, including superadministrators; deny anonymous and student database reads.
- S2: "que asigne una ip a un usario". Clarification: "¿Quieres que la IP se vincule automáticamente al usuario cuando inicie sesión, dejando los accesos anónimos en «IPs sin usuario registrado»?" Answer: "si". Associate access automatically with the authenticated account; preserve existing hashed-IP storage, not raw addresses.
- S3: "un apartado de ips sin usuario resgistrado" and "Piensa que eso solo lo verá los administradores nadie más." Show associated users and a separate unassociated-IP section only to administrators; protect logs and blocked-IP lists in the database too.

## Tasks
- T1 [S1-S3] delegated frontend: pending; app.js, index.html and frontend tests. Writer trigger: independent UI/auth unit running concurrently with backend unit. RED/GREEN and commit pending.
- T2 [S1-S3] delegated backend: pending; follow-up SQL migration, backend checks, deployment notes. Writer trigger: independent database unit running concurrently with frontend unit. RED/GREEN and commit pending.
- T3 [S1-S3] independent security verification: pending after own checks. Risk items 1, 2, 3: schema, authorization, shared session/role helpers.

## Log
- L1 User request: "Necesito que en esta página modifiques que solo puedan ver las asistencias el administrador y además que asigne una ip a un usario y un apartado de ips sin usuario resgistrado. Piensa que eso solo lo verá los administradores nadie más."
- L2 User clarification: "si" to automatic login association and separate anonymous access.
- L3 Baseline: b7781a122c9592ebeb247ed111d58ede6d769dc7. Untracked `.claude/` is pre-existing and must remain untouched. Supabase is active; initial schemas conflict on access-log policies. CodeGraph initialization failed with access denied. No PostgreSQL, Deno or Supabase CLI found; live RLS verification unavailable without additional tooling/authorization.
- L4 Interface decision: keep existing browser-computed IP hashes as untrusted telemetry, not authorization. New `record_access(p_ip_hash text, p_ua text)` RPC returns `{blocked: boolean}` and derives user_id only from `auth.uid()`. Append a new event on startup and successful login, never reassign historic anonymous events by shared IP. Admin query selects `user_id` and `profile:profiles(username, display_name)`; user_id references profiles. Group IPs with any associated event separately from IPs with no association. Shared networks may contain multiple users.
- L5 Role decision: server-owned profiles.role is authoritative; prevent student self-promotion, never trust user_metadata or saved local role. Preserve normal admin and superadmin access. Use role helper RPC `current_user_role()` for verified frontend role. Guard sensitive DOM/cache after logout and late async responses. No raw IP storage or fabricated historic account associations.
- L6 Engram project resolves correctly but reads/writes fail unknown_project; mirror pending. RDD mode command reports off but exits with repository access denied; no review has started or been enabled.
