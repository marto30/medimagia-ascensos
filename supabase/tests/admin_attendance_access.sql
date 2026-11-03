-- Run AFTER migration 005 as the database owner in a disposable/local database.
-- ON_ERROR_STOP makes the first failed assertion abort; all fixtures roll back.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA admin_access_test;
GRANT USAGE ON SCHEMA admin_access_test TO anon, authenticated;
CREATE FUNCTION admin_access_test.assert(ok BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Assertion failed: %', message; END IF;
END;
$$;
CREATE FUNCTION admin_access_test.raises(command TEXT, expected_state TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE command;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_state THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Expected SQLSTATE % from %', expected_state, command;
END;
$$;

INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data) VALUES
  ('50500000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'access-student@example.invalid', '{}', '{}'),
  ('50500000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'access-admin@example.invalid', '{}', '{}'),
  ('50500000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'access-superadmin@example.invalid', '{}', '{}'),
  ('50500000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'access-orphan@example.invalid', '{}', '{}');
INSERT INTO public.profiles (id, username, display_name, role) VALUES
  ('50500000-0000-0000-0000-000000000001', 'access-test-student', 'Access student', 'student'),
  ('50500000-0000-0000-0000-000000000002', 'access-test-admin', 'Access admin', 'admin'),
  ('50500000-0000-0000-0000-000000000003', 'access-test-superadmin', 'Access superadmin', 'superadmin');
INSERT INTO public.students (id, profile_id, name, username, source_firestore_id) VALUES
  ('50500000-0000-0000-0000-000000000010', '50500000-0000-0000-0000-000000000001',
   'Access test student', 'access-test-student', 'admin-access-test');
INSERT INTO public.attendance_sessions (id, session_date, title) VALUES
  ('50500000-0000-0000-0000-000000000020', CURRENT_DATE, 'Access test class');
INSERT INTO public.attendance_records (session_id, student_id, attended) VALUES
  ('50500000-0000-0000-0000-000000000020', '50500000-0000-0000-0000-000000000010', TRUE);
INSERT INTO public.access_logs (ip_hash, ts, ua) VALUES (repeat('c',64), now(), 'admin-access-test');
INSERT INTO public.blocked_ips (ip_hash, blocked_at) VALUES (repeat('b',64), now());

-- Snapshot every sensitive row; rejected commands must not change any data.
CREATE TEMP TABLE before_denials AS
SELECT md5(string_agg(row_data, '' ORDER BY row_data)) AS digest FROM (
  SELECT 'sessions' || row_to_json(t)::TEXT AS row_data FROM public.attendance_sessions t UNION ALL
  SELECT 'records' || row_to_json(t)::TEXT FROM public.attendance_records t UNION ALL
  SELECT 'logs' || row_to_json(t)::TEXT FROM public.access_logs t UNION ALL
  SELECT 'blocks' || row_to_json(t)::TEXT FROM public.blocked_ips t
) s;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
SELECT set_config('request.jwt.claim.sub', '', TRUE);
SELECT admin_access_test.raises('SELECT * FROM public.attendance_sessions', '42501');
SELECT admin_access_test.raises('SELECT * FROM public.attendance_records', '42501');
SELECT admin_access_test.raises('SELECT * FROM public.access_logs', '42501');
SELECT admin_access_test.raises('SELECT * FROM public.blocked_ips', '42501');
SELECT admin_access_test.raises($q$INSERT INTO public.access_logs(ip_hash) VALUES (repeat('a',64))$q$, '42501');
SELECT admin_access_test.raises('DELETE FROM public.attendance_sessions', '42501');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"50500000-0000-0000-0000-000000000001","role":"authenticated","user_metadata":{"role":"superadmin"}}', TRUE);
SELECT set_config('request.jwt.claim.sub', '50500000-0000-0000-0000-000000000001', TRUE);
SELECT admin_access_test.assert(public.current_user_role() = 'student', 'forged metadata must not promote student');
SELECT admin_access_test.assert(NOT public.is_admin() AND NOT public.is_superadmin(), 'shared helpers reject forged role');
SELECT admin_access_test.assert((SELECT count(*) = 0 FROM public.attendance_sessions), 'student cannot read sessions');
SELECT admin_access_test.assert((SELECT count(*) = 0 FROM public.attendance_records), 'student cannot read records');
SELECT admin_access_test.assert((SELECT count(*) = 0 FROM public.access_logs), 'student cannot read logs');
SELECT admin_access_test.assert((SELECT count(*) = 0 FROM public.blocked_ips), 'student cannot read blocks');
SELECT admin_access_test.raises($q$INSERT INTO public.attendance_sessions(session_date) VALUES (CURRENT_DATE)$q$, '42501');
SELECT admin_access_test.raises($q$INSERT INTO public.attendance_records(session_id,student_id) VALUES ('50500000-0000-0000-0000-000000000020','50500000-0000-0000-0000-000000000010')$q$, '42501');
SELECT admin_access_test.raises($q$INSERT INTO public.access_logs(ip_hash,user_id) VALUES (repeat('a',64),'50500000-0000-0000-0000-000000000002')$q$, '42501');
SELECT admin_access_test.raises($q$INSERT INTO public.blocked_ips(ip_hash) VALUES (repeat('d',64))$q$, '42501');
SELECT admin_access_test.raises($q$UPDATE public.profiles SET role='admin' WHERE id=auth.uid()$q$, '42501');
SELECT admin_access_test.raises($q$SELECT public.record_access(repeat('a',64),'test','50500000-0000-0000-0000-000000000002'::UUID)$q$, '42883');
UPDATE public.attendance_sessions SET title = 'forbidden';
DELETE FROM public.attendance_records;
UPDATE public.access_logs SET user_id = auth.uid();
DELETE FROM public.blocked_ips;
-- Preserve the legitimate self-profile update supported by the original schema.
UPDATE public.profiles SET display_name = 'Updated access student' WHERE id = auth.uid();
SELECT admin_access_test.assert((SELECT display_name='Updated access student' AND role='student' FROM public.profiles WHERE id=auth.uid()), 'self-name update remains allowed');

RESET ROLE;
SELECT admin_access_test.assert(
  (SELECT digest FROM before_denials) = (SELECT md5(string_agg(row_data, '' ORDER BY row_data)) FROM (
    SELECT 'sessions' || row_to_json(t)::TEXT AS row_data FROM public.attendance_sessions t UNION ALL
    SELECT 'records' || row_to_json(t)::TEXT FROM public.attendance_records t UNION ALL
    SELECT 'logs' || row_to_json(t)::TEXT FROM public.access_logs t UNION ALL
    SELECT 'blocks' || row_to_json(t)::TEXT FROM public.blocked_ips t
  ) s), 'rejected and invisible-row mutations preserve all sensitive data');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
SELECT set_config('request.jwt.claim.sub', '', TRUE);
SELECT admin_access_test.assert(public.record_access(repeat('a',64),'admin-access-anon') = '{"blocked":false}'::JSONB, 'anonymous narrow logging works');
SELECT admin_access_test.assert(public.record_access(repeat('b',64),'admin-access-blocked') = '{"blocked":true}'::JSONB, 'block response reveals no list or identities');
SELECT admin_access_test.raises($q$SELECT public.record_access('not-a-hash','test')$q$, '22023');
SELECT admin_access_test.raises($q$SELECT public.record_access(NULL,'test')$q$, '22023');
SELECT admin_access_test.raises($q$SELECT public.record_access(repeat('A',64),'test')$q$, '22023');
SELECT admin_access_test.raises($q$SELECT public.record_access(repeat('a',64),repeat('x',101))$q$, '22023');
RESET ROLE;
SELECT admin_access_test.assert((SELECT count(*)=1 AND bool_and(user_id IS NULL) FROM public.access_logs WHERE ua='admin-access-anon'), 'anonymous identity remains null');
SELECT admin_access_test.assert((SELECT count(*)=0 FROM public.access_logs WHERE ua='admin-access-blocked'), 'blocked attempts never insert');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"50500000-0000-0000-0000-000000000001","role":"authenticated"}', TRUE);
SELECT set_config('request.jwt.claim.sub', '50500000-0000-0000-0000-000000000001', TRUE);
SELECT admin_access_test.assert(public.record_access(repeat('a',64),'admin-access-signed-in') = '{"blocked":false}'::JSONB, 'authenticated logging works');
RESET ROLE;
SELECT admin_access_test.assert((SELECT count(*)=1 AND bool_and(user_id='50500000-0000-0000-0000-000000000001'::UUID AND ts >= transaction_timestamp()) FROM public.access_logs WHERE ua='admin-access-signed-in'), 'identity and timestamp come from server');
SELECT admin_access_test.assert((SELECT user_id IS NULL FROM public.access_logs WHERE ua='admin-access-anon'), 'login must not relabel historic anonymous events');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"50500000-0000-0000-0000-000000000004","role":"authenticated"}', TRUE);
SELECT set_config('request.jwt.claim.sub', '50500000-0000-0000-0000-000000000004', TRUE);
SELECT admin_access_test.raises($q$SELECT public.record_access(repeat('a',64),'admin-access-orphan')$q$, '42501');
RESET ROLE;
SELECT admin_access_test.assert((SELECT count(*)=0 FROM public.access_logs WHERE ua='admin-access-orphan'), 'missing profile must not become an anonymous event');

-- Both administrator roles retain reads, embedded identity access and normal CRUD.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"50500000-0000-0000-0000-000000000002","role":"authenticated"}', TRUE);
SELECT set_config('request.jwt.claim.sub', '50500000-0000-0000-0000-000000000002', TRUE);
SELECT admin_access_test.assert(public.current_user_role()='admin' AND public.is_admin() AND NOT public.is_superadmin(), 'admin helper regression');
SELECT admin_access_test.assert((SELECT count(*)=1 FROM public.attendance_sessions WHERE id='50500000-0000-0000-0000-000000000020'), 'admin reads sessions');
SELECT admin_access_test.assert((SELECT count(*)=1 FROM public.attendance_records WHERE session_id='50500000-0000-0000-0000-000000000020'), 'admin reads records');
SELECT admin_access_test.assert((SELECT count(*)=1 FROM public.blocked_ips WHERE ip_hash=repeat('b',64)), 'admin reads blocks');
SELECT admin_access_test.assert((SELECT count(*)=1 FROM public.access_logs l JOIN public.profiles p ON p.id=l.user_id WHERE l.ua='admin-access-signed-in' AND p.username='access-test-student'), 'admin reads account associations');
INSERT INTO public.attendance_sessions(id,session_date,title) VALUES ('50500000-0000-0000-0000-000000000021',CURRENT_DATE,'Admin created');
INSERT INTO public.attendance_records(session_id,student_id,attended) VALUES ('50500000-0000-0000-0000-000000000021','50500000-0000-0000-0000-000000000010',TRUE);
UPDATE public.attendance_records SET attended=FALSE WHERE session_id='50500000-0000-0000-0000-000000000021';
SELECT admin_access_test.assert((SELECT NOT attended FROM public.attendance_records WHERE session_id='50500000-0000-0000-0000-000000000021'), 'admin edits attendance');
DELETE FROM public.attendance_sessions WHERE id='50500000-0000-0000-0000-000000000021';
SELECT admin_access_test.assert((SELECT count(*)=0 FROM public.attendance_records WHERE session_id='50500000-0000-0000-0000-000000000021'), 'admin delete cascade preserved');
INSERT INTO public.blocked_ips(ip_hash,blocked_at) VALUES (repeat('d',64),now());
DELETE FROM public.blocked_ips WHERE ip_hash=repeat('d',64);
DELETE FROM public.access_logs WHERE ua='admin-access-anon';
SELECT admin_access_test.assert((SELECT count(*)=0 FROM public.access_logs WHERE ua='admin-access-anon'), 'admin clears logs');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"50500000-0000-0000-0000-000000000003","role":"authenticated"}', TRUE);
SELECT set_config('request.jwt.claim.sub', '50500000-0000-0000-0000-000000000003', TRUE);
SELECT admin_access_test.assert(public.is_admin() AND public.is_superadmin(), 'superadmin helpers retain authority');
SELECT admin_access_test.assert((SELECT count(*)=1 FROM public.attendance_sessions WHERE id='50500000-0000-0000-0000-000000000020'), 'superadmin reads attendance');
SELECT admin_access_test.assert((SELECT count(*)=1 FROM public.access_logs WHERE ua='admin-access-signed-in'), 'superadmin reads access logs');
SELECT admin_access_test.assert((SELECT count(*)=1 FROM public.blocked_ips WHERE ip_hash=repeat('b',64)), 'superadmin reads blocks');
RESET ROLE;
ROLLBACK;
\echo 'Administrator attendance/access SQL checks passed; fixtures rolled back.'
