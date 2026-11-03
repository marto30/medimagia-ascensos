const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Structural checks only: execute the SQL suite for database/RLS behavior.
const migration = () => fs.readFileSync(path.join(__dirname,
  '../supabase/migrations/005_admin_attendance_and_access.sql'), 'utf8');

test('roles come from protected profiles rather than user-controlled metadata', () => {
  const sql = migration();
  assert.match(sql, /FUNCTION public\.current_user_role\(\)[\s\S]*FROM public\.profiles/);
  assert.doesNotMatch(sql, /auth\.jwt\(\)/);
  assert.match(sql, /CREATE TRIGGER protect_profile_role/);
  assert.match(sql, /DROP POLICY IF EXISTS "Users can update own profile \(name only\)"/);
});

test('all historical sensitive-table policies are replaced and anonymous grants revoked', () => {
  const sql = migration();
  for (const table of ['attendance_sessions', 'attendance_records', 'access_logs', 'blocked_ips']) {
    assert.ok(sql.includes(`'${table}'`));
  }
  assert.match(sql, /FROM pg_catalog\.pg_policies/);
  assert.match(sql, /DROP POLICY %I ON public\.%I/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.%I FROM anon/);
  assert.match(sql, /FOR ALL TO authenticated[\s\S]*public\.is_admin\(\)/);
});

test('recording binds the authenticated identity and server timestamp through a narrow RPC', () => {
  const sql = migration();
  assert.match(sql, /user_id UUID REFERENCES public\.profiles\(id\) ON DELETE SET NULL/);
  assert.match(sql, /FUNCTION public\.record_access\(p_ip_hash TEXT, p_ua TEXT\)/);
  assert.match(sql, /v_user_id UUID := auth\.uid\(\)/);
  assert.match(sql, /VALUES \(p_ip_hash, pg_catalog\.now\(\), p_ua, v_user_id\)/);
  assert.match(sql, /\^\[0-9a-f\]\{64\}\$/);
  assert.match(sql, /char_length\(p_ua\) > 100/);
  assert.match(sql, /RETURN pg_catalog\.jsonb_build_object\('blocked', TRUE\)/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.record_access\(TEXT, TEXT\) FROM PUBLIC/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.record_access\(TEXT, TEXT\) TO anon, authenticated/);
  for (const definition of sql.matchAll(/SECURITY DEFINER([^;]*?)(?:AS \$\$)/g)) {
    assert.match(definition[1], /SET search_path = ''/);
  }
});
